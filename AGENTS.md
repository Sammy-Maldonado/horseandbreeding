# AGENTS.md — Horse & Breeder

This repository uses **`CLAUDE.md` as the authoritative execution contract** for all
coding agents.

## Before performing any work

1. Read [CLAUDE.md](CLAUDE.md) completely.
2. Read the assigned Linear issue and its parent EPIC.
3. Read the specialised documents relevant to the area being changed.
4. Do not modify code, configuration, documentation, or data before the corresponding
   Linear issue is moved to `In Progress`.
5. If instructions conflict, required information is missing, or a decision would expand
   scope — stop and ask Sammy before proceeding.

## Specialised documents

| Topic | Document |
|---|---|
| Functional requirements | [docs/requirements/automation-mvp.md](docs/requirements/automation-mvp.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| Git workflow | [docs/git-workflow.md](docs/git-workflow.md) |
| Local environment | [docs/runbooks/local-development.md](docs/runbooks/local-development.md) |

`CLAUDE.md` links the remaining domain, data, and architecture references.

---

`CLAUDE.md` is authoritative. **Do not duplicate project rules, domain knowledge,
commands, or work status in this file.**
