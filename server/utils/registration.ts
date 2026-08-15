// Atomic user registration (HOR-77). All four writes happen inside one
// interactive transaction: if any of them fails, the users row rolls back
// with the rest, so a failed sign-up can never leave an orphaned account and
// the same email can retry cleanly. The shared "user_read" scope is upserted
// inside the transaction — a pre-existing row is left untouched by the upsert,
// so an unrelated registration failure never removes it.

export interface RegistrationInput {
  email: string;
  first_name: string;
  last_name: string;
  town: string;
  countyId: number;
  address: string;
  mobile: string;
  hashedPassword: string;
  zip_code: string;
  farmname: string;
}

export interface RegisteredUser {
  id: number;
  email: string;
}

// Minimal structural view of the Prisma client (or a test double). Matches
// both the root client and the transaction client Prisma passes to
// $transaction callbacks.
export interface RegistrationTx {
  users: {
    upsert(args: {
      where: { email: string };
      update: Record<string, never>;
      create: {
        email: string;
        first_name: string;
        last_name: string;
        town: string;
        countyId: number;
        address: string;
        mobile: string;
        password: string;
        zip_code: string;
        farmname: string;
      };
    }): Promise<RegisteredUser>;
  };
  user_roles: {
    upsert(args: {
      where: { role_name_user_id: { role_name: string; user_id: number } };
      update: Record<string, never>;
      create: { role_name: string; user_id: number };
    }): Promise<{ id: number }>;
  };
  scopes: {
    upsert(args: {
      where: { scope_name: string };
      update: Record<string, never>;
      create: { scope_name: string; description: string };
    }): Promise<{ id: number }>;
  };
  user_role_scope: {
    upsert(args: {
      where: { role_id_scope_id: { role_id: number; scope_id: number } };
      update: Record<string, never>;
      create: {
        role: { connect: { id: number } };
        scope: { connect: { id: number } };
      };
    }): Promise<{ id: number }>;
  };
}

export interface RegistrationDb {
  $transaction<T>(fn: (tx: RegistrationTx) => Promise<T>): Promise<T>;
}

export async function registerUser(
  db: RegistrationDb,
  input: RegistrationInput
): Promise<RegisteredUser> {
  return db.$transaction(async (tx) => {
    const user = await tx.users.upsert({
      where: { email: input.email },
      update: {},
      create: {
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        town: input.town,
        countyId: input.countyId,
        address: input.address,
        mobile: input.mobile,
        password: input.hashedPassword,
        zip_code: input.zip_code,
        farmname: input.farmname
      }
    });

    // The role is unique per user, not globally — compound selector.
    const userRole = await tx.user_roles.upsert({
      where: { role_name_user_id: { role_name: "User", user_id: user.id } },
      update: {},
      create: { role_name: "User", user_id: user.id }
    });

    const scope = await tx.scopes.upsert({
      where: { scope_name: "user_read" },
      update: {},
      create: {
        scope_name: "user_read",
        description: "General user permission, read only."
      }
    });

    await tx.user_role_scope.upsert({
      where: {
        role_id_scope_id: { role_id: userRole.id, scope_id: scope.id }
      },
      update: {},
      create: {
        role: { connect: { id: userRole.id } },
        scope: { connect: { id: scope.id } }
      }
    });

    return user;
  });
}
