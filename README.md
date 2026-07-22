# Horse & Breeder

Automation platform for producing pedigree catalogues for sport-horse auctions. It turns
Word catalogues and auction Excel files into structured maternal-line data, a canonical
write-up library, resolved horse identities, and professional pedigree PDFs — with human
review reserved for the cases the system cannot resolve on its own.

> **Authoritative rules live elsewhere.** This README is an entry point. It links to the
> documents that own each topic; it does not restate them. When this file and a linked
> document disagree, the linked document wins.

---

## What it does

```txt
Word catalogue ingestion
→ structured maternal-line data
→ canonical write-up library
→ horse identity resolution
→ pedigree + write-up assembly
→ professional PDF
→ batch generation from auction Excel
→ human review only for unresolved cases
```

Full scope and business rules: [docs/requirements/automation-mvp.md](docs/requirements/automation-mvp.md).

## Technology

| Layer | Technology |
|---|---|
| Application | Nuxt 3 (Vue 3), server-side logic in Nitro under `server/` |
| Data | Prisma ORM over MySQL/MariaDB |
| Extractor | Python module under `extractor/`, isolated from the Node toolchain |
| Tests | Vitest |
| Package manager | pnpm (only) |

Architecture decisions are recorded as ADRs in [docs/adr/](docs/adr/) and are binding
until superseded.

---

## Prerequisites

- **Node.js** — the version pinned in CI (`.github/workflows/ci.yml`).
- **pnpm** — the version pinned in `package.json` (`packageManager` field).

This project is **pnpm-only** ([ADR-004](docs/adr/ADR-004-pnpm-package-manager.md)). Do
not use `npm`, `yarn` or `bun`; lifecycle scripts and the lockfile assume pnpm.

## Setup

```bash
pnpm install
```

Database setup, the local `.env`, and the Python extractor are covered in the runbook:
[docs/runbooks/local-development.md](docs/runbooks/local-development.md).

Copy the environment template and fill it in — never commit a real `.env`:

```bash
cp .env.example .env
```

## Common commands

```bash
pnpm dev        # development server on http://localhost:3000
pnpm test       # run the Vitest suite
pnpm build      # production build (Nitro output)
pnpm preview    # preview the production build locally
```

`lint` and `typecheck` scripts are **not** configured; do not assume they exist.

---

## Repository layout

```txt
server/       Nitro server routes and business logic
components/   Vue components
pages/        Nuxt pages
composables/  shared client logic
prisma/       Prisma schema and migrations
extractor/    Python Word extractor (isolated from Node)
docs/         authoritative project documentation
_legacy/      read-only reference — never imported at runtime
data/private/ real client documents — git-ignored, never published
```

## Contributing — Git workflow

Every change reaches the stable branch through the promotion chain. **Nothing is committed
or pushed directly to a permanent branch**, and the platform now enforces this.

```txt
issue branch → Pull Request to DEV → Pull Request to QA → Pull Request to main
```

- `DEV`, `QA` and `main` are permanent and protected; they may hold different commits.
- Promotion Pull Requests merge with a **merge commit** — squash and rebase are forbidden.
- Every Pull Request must pass the required check **`Test / Build`** before it can merge.
- Commits are [conventional](https://www.conventionalcommits.org/) and carry the Linear
  issue ID, e.g. `docs: add project README (HOR-43)`.

The full workflow — branching, promotion, hotfixes, branch protection and cleanup — is the
authoritative [docs/git-workflow.md](docs/git-workflow.md). Read it before creating a
branch, commit, push, Pull Request, merge or release.

## Continuous integration

The `CI` workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every
Pull Request into `DEV`, `QA` and `main`. Its job **`Test / Build`** installs with
`pnpm install --frozen-lockfile`, then runs `pnpm test` and `pnpm build`. It is the
required status check on all three permanent branches.

## Releases

Releases are automated with **Release Please**
([.github/workflows/release-please.yml](.github/workflows/release-please.yml)). On every
push to `main` it derives the next version and changelog from the conventional commits and
opens a **release Pull Request**. A human reviews and merges it; nothing publishes
unattended. Details: [docs/git-workflow.md §12](docs/git-workflow.md).

---

## Documentation index

| Topic | Document |
|---|---|
| Agent execution contract | [CLAUDE.md](CLAUDE.md) |
| Functional requirements | [docs/requirements/automation-mvp.md](docs/requirements/automation-mvp.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| Git workflow, CI, releases, protection | [docs/git-workflow.md](docs/git-workflow.md) |
| Local development | [docs/runbooks/local-development.md](docs/runbooks/local-development.md) |
| Reusable technical inventory | [docs/architecture/existing-assets.md](docs/architecture/existing-assets.md) |
| Reference database baseline | [docs/data/hbold-baseline.md](docs/data/hbold-baseline.md) |
| Historical write-up grammar | [docs/domain/writeup-grammar.md](docs/domain/writeup-grammar.md) |

## Private data

Real client catalogues, Excel files and database dumps live under **`data/private/`** and
are ignored by Git. Never place them in `public/`, `assets/`, `extractor/` or `_legacy/`,
never commit them, and never quote their contents in documentation.

---

This is private software. It is not published to npm and carries no open-source licence.
