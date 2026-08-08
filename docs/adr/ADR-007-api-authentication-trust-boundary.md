# ADR-007: API Authentication Trust Boundary

**Status:** Accepted
**Date:** 2026-08-08
**Deciders:** Sammy Maldonado

---

## Context

The application gates `/api` with a shared credential. `server/middleware/validateApiKey.ts`
compares the incoming `api-key` request header against `process.env.VITE_API_KEY`, and the
browser supplies that header by reading `import.meta.env.VITE_API_KEY`.

Both sides therefore hold **the same value**.

### The credential is public

Vite exposes every `VITE_`-prefixed variable to client source code and **statically
replaces** `import.meta.env.*` at build time. The official Vite documentation states it
without qualification:

> Sensitive information like API keys should not be included in `VITE_*` variables, as
> their values are bundled into your source code.

Measured on this repository:

| Measurement | Value |
|---|---|
| Source occurrences of `import.meta.env.VITE_API_KEY` | 36, across 20 client files |
| Occurrences of the resulting literal in `.output/public` after `pnpm build` | 36, across 19 files |
| Distinct literal values in the client bundle | 1 |

The credential the server validates against is shipped verbatim to every visitor. The
gate admits anyone who has loaded the site. It is obfuscation, not authentication.

### There is no intermediary to hold a secret

The browser calls `/api/...` on the **same-origin Nitro server that served the page**.
No proxy, gateway, or second backend sits between them, and no server-to-server caller
sends the header. A shared secret has no legitimate place in that path: either both ends
are the same trust domain, or the value must never reach the browser.

### Real authentication already exists and is unaffected

The project already carries per-user authentication that does not depend on the shared
key:

```txt
Authorization: Bearer <jwt>
  → server/utils/verifyToken.ts
  → server/middleware/auth.ts   attaches event.context.user (never rejects)
  → handler calls ensureHasRoleAndScope(...)   ← the actual enforcement
```

Five routes enforce it. `validateApiKey.ts` exempts exactly those five, plus `login` and
`refresh-token`. The remaining **38 of 45** routes are gated by the public string alone.

### The gate is partly inert already

Thirty handlers additionally call `await validateApiKey(event)` from inside the handler
body and discard the return value. Because the middleware **returns** a rejection object
rather than throwing, those in-handler calls block nothing. Only the automatic
`server/middleware/` registration blocks anything at all.

---

## Decision

**No credential that the server validates may be known to the browser.**

Access to `/api` is governed by an explicit, per-route classification. Every route sits in
exactly one of four levels:

| Level | Meaning | Mechanism |
|---|---|---|
| **Public** | Callable by anyone, with no credential | No check |
| **Authenticated** | Requires a valid JWT identifying a user, any role | `event.context.user` must be present |
| **Role-scoped** | Requires a valid JWT plus a named role and scope | `ensureHasRoleAndScope(...)` |
| **Server-only** | Not routable from the browser at all | Rejected before the handler runs |

Consequences that follow directly:

- The shared `api-key` header is removed from the client, from the middleware, and from
  `runtimeConfig`. `VITE_API_KEY` stops being an authentication mechanism.
- Routes classified **Public** are public *by decision*, recorded here — not by accident.
- The five **Role-scoped** routes keep their existing enforcement, unchanged.
- The fake gate is removed only once every route is classified and every route needing
  real protection has it.

### Scope of this decision

This ADR governs **who may call each endpoint**. It does not govern whether a given
handler's internal logic is correct. Defects found inside handler bodies during the audit
are recorded as findings in the issue and addressed by their own issues.

---

## The classification matrix

All 45 routes in `server/api/`, classified from observed behaviour and observed callers.

### Role-scoped — 5 routes, enforcement unchanged

| Route | Role / scope | Client caller |
|---|---|---|
| `addHorse.post` | `Admin`\|`Seller` + `create_horses` | `pages/sell.vue` |
| `add-full-horse-details.post` | `Admin` + `create_horses` | `pages/add.vue` |
| `report-horses-ids.post` | `Admin`\|`Seller` + `create_horses` | `pages/report.vue` |
| `uploadImages.post` | `Admin`\|`Seller` + `create_horses` | `components/uploadImage.vue` |
| `user-info.post` | `Admin`\|`Seller` + `create_horses` | none |

### Public — credential exchange, 2 routes

These authenticate their own caller by construction and cannot require a prior credential.

| Route | Why public |
|---|---|
| `login.post` | Exchanges email and password for tokens |
| `refresh-token.post` | Exchanges a refresh token for an access token |

### Public — self-service account and submission flows, 6 routes

Each is reached from a page that has no login step. Requiring a JWT would break the flow
it exists to serve.

| Route | Client caller | Note |
|---|---|---|
| `sign-up.post` | `pages/register.vue` | Account creation |
| `user.post` | `components/RegisterUser.vue` | Account creation, premium flow |
| `user.put` | `components/RegisterUser.vue` | Verifies the existing password itself before updating |
| `user-by-email-pass.get` | `components/RegisterUser.vue` | Finding: takes credentials in the query string and returns the stored password hash |
| `vendor.post` | `pages/vendor.vue` | Anonymous vendor submission form |
| `create-payment-intent.post` | `components/StripePeyment.vue` | Finding: accepts `amount` and `currency` from the client |

### Public — reference and catalogue reads, 30 routes

Read-only pedigree, horse and reference data that the public site renders for anonymous
visitors. No page in the application guards any of it: there is no `middleware/`
directory and no `definePageMeta` in any page.

`areas`, `breeder`, `colors`, `colors-sexes-studbooks`, `counties`, `diciplinevalues`,
`edit-horse-by-id`, `family-tree-of-horse-by-id`, `familyHorseStore`,
`filter-horses-by-name`, `filter-horses-by-name-sex`, `find-many-disciplines`, `gender`,
`horse`, `horse-sells`, `horse-sells-count`, `horses-suggested-for-sale`, `mareline`,
`pagination-horses-by-name`, `pagination-horses-by-name-sex`, `pedigree`,
`pedigree-detail`, `progeny`, `search`, `search-pages`, `store-horse-info-id`,
`storeHorseById`, `storehorseNames`, `storehorses`, `studbook`.

Notes:

- `edit-horse-by-id` performs only reads despite its name, and returns the same
  `storehorse` data the public pedigree pages already render.
- `storehorses` returns breeder contact details. It backs the public breeder profile
  pages, which exist to display them.

### Server-only — 2 routes

Not reachable from the browser. Neither has any client caller in the repository.

| Route | Why |
|---|---|
| `send-email.post` | Sends mail from the project's SMTP account using `to`, `subject` and `text` taken from the request body. Reachable from the browser it is an open mail relay. |
| `events.post` | Echoes the request body and logs it. A debug endpoint with no caller. |

### Authenticated — 0 routes

The level is defined because the model needs it, and because a future route may sit
between "anyone" and "a specific role". No current route belongs here.

---

## Rationale

- **A secret the browser holds is not a secret.** Renaming the variable, moving it to
  `runtimeConfig`, or obfuscating the header would leave the same value in the same
  bundle. The only correct fix is that the browser stops knowing it.
- **The classification is what makes removal safe.** Deleting the gate without a matrix
  would be a change with unknown blast radius. With the matrix, every route's exposure is
  a recorded decision that can be reviewed, tested and revisited.
- **It does not weaken anything.** The 38 routes the gate nominally protected are already
  callable by anyone who loaded the site. Removing the gate changes what is *claimed*, not
  what is *true*. The two routes where that gap actually matters — `send-email` and
  `events` — gain real protection in the same change.
- **It uses what the project already has.** JWT with roles and scopes is present, tested
  and working. No new identity provider, library, gateway or backend is introduced.
- **It follows the official guidance.** Vite's own documentation forbids exactly this
  pattern; Nuxt's `runtimeConfig` keeps server-only values off the client by design.
- **It keeps public browsing intact.** Anonymous visitors continue to search pedigrees,
  open mare lines and view progeny, exactly as today. No product behaviour changes.

---

## Consequences

### Positive

- No server-validated credential is shipped to the browser.
- Every `/api` route's exposure is explicit, recorded and reviewable.
- The open mail relay and the debug echo endpoint stop being reachable from outside.
- Thirty inert in-handler `validateApiKey` calls are removed, so no code implies a
  protection that does not exist.
- Future routes have a stated question to answer — which of the four levels — instead of
  inheriting a gate that never worked.

### Negative

- The application no longer *appears* to protect 38 endpoints. They were never protected,
  but the change makes that visible, and anyone reading the code will now see it plainly.
- Public routes carry no rate limiting. The shared key never provided any either, but it
  read as though it might.
- Handler-internal defects surfaced by the audit remain open until their own issues run.
- Adding a genuinely private endpoint now requires a deliberate choice rather than an
  automatic default.

---

## Alternatives Considered

### Rename `VITE_API_KEY` to `API_KEY` or `NUXT_API_KEY` — Rejected

Cosmetic. The client still needs the value to build the header, so the value still ends up
in the bundle. Renaming a variable does not move a trust boundary.

### Extend JWT authentication to every `/api` route — Rejected

Internally consistent, but it would stop anonymous visitors from browsing pedigrees, mare
lines and progeny. That is a change to product behaviour, not a security fix, and nothing
in [automation-mvp.md](../requirements/automation-mvp.md) requires it. NFR-004 requires
that *protected* endpoints be authenticated — it does not declare these endpoints
protected.

### Keep a shared secret, but server-only, behind a proxy or BFF — Rejected

A server-only credential is only meaningful when a server-side caller uses it. The audit
found none: no server-to-server caller sends the header, and the browser talks to the
same-origin Nitro server directly. It would add an indirection layer to protect a boundary
that does not exist.

### Delete the gate and classify nothing — Rejected

Truthful about the present, careless about the future. It would leave `send-email`
reachable as an open relay and leave the next developer with no statement of which routes
are public on purpose.

---

## Review Triggers

Revisit this decision when:

- an external, non-browser consumer of the API appears — a mobile client, a partner
  integration, or a scheduled job — since that is the first case where a server-only
  credential becomes meaningful;
- any route classified **Public** starts returning data that is not intended for anonymous
  visitors;
- user accounts gain a per-user data surface, which would populate the currently empty
  **Authenticated** level;
- rate limiting or abuse protection is introduced, since the public surface is the natural
  place for it;
- the Automation MVP introduces endpoints that handle client documents, which are private
  by [NFR-005](../requirements/automation-mvp.md).
