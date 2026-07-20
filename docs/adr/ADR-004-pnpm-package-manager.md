# ADR-004: pnpm Is the Official Package Manager

**Status:** Accepted
**Date:** 2026-07-20
**Deciders:** Sammy Maldonado

---

## Context

The repository is a Node project with a committed lockfile and a workspace configuration
that controls which dependencies may run install scripts.

Mixing package managers in one repository produces divergent lockfiles, inconsistent
dependency resolution, and environments that differ between contributors and agents.

The project also runs a separate Python extractor, so the boundary between toolchains
must be explicit.

Dependency install scripts are an arbitrary-code-execution surface at install time and
need a deliberate policy.

---

## Decision

**pnpm is the official and only package manager for this repository.**

Rules:

- The authoritative pnpm version is the one declared in `package.json` under
  `packageManager`. That field is the single source of truth for the version.
- `pnpm-lock.yaml` is committed and authoritative.
- Do not use npm, yarn, or bun in this repository, and do not commit their lockfiles.
- Run Node package commands from the repository root unless a documented subproject
  command explicitly says otherwise.
- Dependency install scripts are **blocked by default**. Any dependency that legitimately
  requires one must be justified and explicitly declared under `allowBuilds` in
  `pnpm-workspace.yaml`.
- Python extractor dependencies stay isolated in `extractor/requirements.txt` and are
  never mixed into the Node toolchain.
- Changing the package manager, the pinned version, or the runtime strategy requires an
  approved Linear issue.

---

## Rationale

- One package manager keeps dependency resolution reproducible.
- Pinning through `packageManager` makes the version explicit and machine-enforceable,
  and avoids duplicating a version number across documents that then drift.
- Blocking install scripts by default reduces the supply-chain execution surface, with an
  explicit, reviewable allowlist for genuine exceptions.
- Keeping Python dependencies separate prevents toolchain coupling between the Nuxt
  application and the extractor.

---

## Consequences

### Positive

- Reproducible installs across contributors and agents.
- Explicit, reviewable install-script policy.
- Clear separation between Node and Python toolchains.
- No lockfile conflicts from mixed package managers.

### Negative

- Contributors must have the pinned pnpm version available.
- A dependency that genuinely needs an install script requires an explicit allowlist
  entry and review before it works.

---

## Alternatives Considered

### npm — Rejected

The repository is already established on pnpm with a committed lockfile and a workspace
allowlist. Switching would cost a full dependency-resolution change for no benefit.

### yarn or bun — Rejected

Same cost as npm, with additional tooling migration and no requirement driving it.

### Allow all install scripts — Rejected

Removes a meaningful supply-chain control for marginal convenience.

### Pin the pnpm version in documentation — Rejected

Documentation drifts from reality. `packageManager` in `package.json` is enforceable and
stays correct.

---

## Review Triggers

Revisit when:

- pnpm no longer supports a required workflow;
- the repository adopts a workspace or monorepo layout that changes tooling needs;
- a security advisory affects the install-script policy;
- deployment tooling imposes a different package manager.
