import { describe, expect, it } from "vitest";

import { registerUser, type RegistrationDb, type RegistrationInput } from "./registration";

// In-memory fake with real transaction semantics: a snapshot is taken when the
// transaction starts and restored if the callback throws, mirroring the
// rollback Prisma performs. No database connection is involved.
interface UserRow {
  id: number;
  email: string;
  password: string;
  [key: string]: unknown;
}
interface RoleRow { id: number; role_name: string; user_id: number }
interface ScopeRow { id: number; scope_name: string; description: string }
interface RoleScopeRow { id: number; role_id: number; scope_id: number }

function makeFakeDb() {
  const state = {
    users: [] as UserRow[],
    user_roles: [] as RoleRow[],
    scopes: [] as ScopeRow[],
    user_role_scope: [] as RoleScopeRow[],
    nextId: 1
  };
  const failures = { user_role_scope: 0 };

  const tx = {
    users: {
      upsert: async ({ where, create }: any): Promise<UserRow> => {
        const existing = state.users.find((u) => u.email === where.email);
        if (existing) return existing;
        const row = { id: state.nextId++, ...create };
        state.users.push(row);
        return row;
      }
    },
    user_roles: {
      upsert: async ({ where, create }: any): Promise<RoleRow> => {
        const key = where.role_name_user_id;
        const existing = state.user_roles.find(
          (r) => r.role_name === key.role_name && r.user_id === key.user_id
        );
        if (existing) return existing;
        const row = { id: state.nextId++, ...create };
        state.user_roles.push(row);
        return row;
      }
    },
    scopes: {
      upsert: async ({ where, create }: any): Promise<ScopeRow> => {
        const existing = state.scopes.find((s) => s.scope_name === where.scope_name);
        if (existing) return existing;
        const row = { id: state.nextId++, ...create };
        state.scopes.push(row);
        return row;
      }
    },
    user_role_scope: {
      upsert: async ({ where, create }: any): Promise<RoleScopeRow> => {
        if (failures.user_role_scope > 0) {
          failures.user_role_scope--;
          throw new Error("simulated mid-flow failure");
        }
        const key = where.role_id_scope_id;
        const existing = state.user_role_scope.find(
          (rs) => rs.role_id === key.role_id && rs.scope_id === key.scope_id
        );
        if (existing) return existing;
        const row = {
          id: state.nextId++,
          role_id: create.role?.connect?.id ?? create.role_id,
          scope_id: create.scope?.connect?.id ?? create.scope_id
        };
        state.user_role_scope.push(row);
        return row;
      }
    }
  };

  const db: RegistrationDb = {
    $transaction: async (fn) => {
      const snapshot = structuredClone({
        users: state.users,
        user_roles: state.user_roles,
        scopes: state.scopes,
        user_role_scope: state.user_role_scope,
        nextId: state.nextId
      });
      try {
        return await fn(tx as never);
      } catch (err) {
        state.users = snapshot.users;
        state.user_roles = snapshot.user_roles;
        state.scopes = snapshot.scopes;
        state.user_role_scope = snapshot.user_role_scope;
        state.nextId = snapshot.nextId;
        throw err;
      }
    }
  };

  return { db, state, failures };
}

const input: RegistrationInput = {
  email: "atomic@example.test",
  first_name: "Atomic",
  last_name: "Test",
  town: "Testtown",
  countyId: 1,
  address: "1 Test Rd",
  mobile: "0000000",
  hashedPassword: "$2b$10$fakefakefakefakefakefakefakefakefakefakefakefakefakef",
  zip_code: "0000",
  farmname: "Atomic Farm"
};

describe("registerUser", () => {
  it("creates the user, role, scope and role-scope link on success", async () => {
    const { db, state } = makeFakeDb();

    const user = await registerUser(db, input);

    expect(state.users).toHaveLength(1);
    expect(state.users[0].email).toBe(input.email);
    expect(user.id).toBe(state.users[0].id);
    expect(state.user_roles).toEqual([
      expect.objectContaining({ role_name: "User", user_id: user.id })
    ]);
    expect(state.scopes).toEqual([
      expect.objectContaining({ scope_name: "user_read" })
    ]);
    expect(state.user_role_scope).toHaveLength(1);
  });

  it("leaves no users row behind when a later write fails (PARTIAL_USER_REMAINS=false)", async () => {
    const { db, state, failures } = makeFakeDb();
    failures.user_role_scope = 1;

    await expect(registerUser(db, input)).rejects.toThrow("simulated mid-flow failure");

    expect(state.users).toHaveLength(0);
    expect(state.user_roles).toHaveLength(0);
    expect(state.user_role_scope).toHaveLength(0);
  });

  it("allows the same email to register successfully after a failed attempt", async () => {
    const { db, state, failures } = makeFakeDb();
    failures.user_role_scope = 1;
    await expect(registerUser(db, input)).rejects.toThrow();

    const user = await registerUser(db, input);

    expect(state.users).toHaveLength(1);
    expect(state.users[0].email).toBe(input.email);
    expect(user.id).toBe(state.users[0].id);
    expect(state.user_role_scope).toHaveLength(1);
  });

  it("does not delete a pre-existing shared scope when a registration fails", async () => {
    const { db, state, failures } = makeFakeDb();
    // A previous, unrelated registration already created the shared scope.
    await registerUser(db, { ...input, email: "first@example.test" });
    expect(state.scopes).toHaveLength(1);
    const sharedScopeId = state.scopes[0].id;

    failures.user_role_scope = 1;
    await expect(registerUser(db, input)).rejects.toThrow();

    expect(state.scopes).toHaveLength(1);
    expect(state.scopes[0].id).toBe(sharedScopeId);
  });

  it("reuses the shared scope instead of duplicating it", async () => {
    const { db, state } = makeFakeDb();

    await registerUser(db, { ...input, email: "a@example.test" });
    await registerUser(db, { ...input, email: "b@example.test" });

    expect(state.scopes).toHaveLength(1);
    expect(state.users).toHaveLength(2);
    expect(state.user_roles).toHaveLength(2);
    expect(state.user_role_scope).toHaveLength(2);
  });
});
