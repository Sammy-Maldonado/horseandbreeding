# CLAUDE.md — horseandbreeder (Horse & Breeder)

## What this project is

Horse & Breeder is a pedigree-catalogue business for sport-horse auctions in Ireland,
owned by Marcus O'Donnell. For each foal sold at auction, a one-page document is
produced: a genealogical table (pedigree tree) on top, and below it the written
competition history of the maternal line ("1st Dam, 2nd Dam, 3rd Dam, 4th Dam" —
each mare and her notable offspring).

**The problem:** the pedigree table is generated automatically from a database, but
ALL the text below it is assembled by hand — copy-pasted from thousands of old Word
documents accumulated over years. ~20 auctions/year × 25–50 foals × 5–15 min/page,
€50/page (~€25–50k/year). The manual work burned Marcus out and the business stalled
last year.

**The goal:** a modern web app where Marcus logs in, searches a horse (or uploads the
auction Excel), and generates a professional PDF: pedigree tree + dam write-ups +
competition results — automatically. Human review only for new families.

## Business context (do not lose this)

- Sammy (this repo's owner) is negotiating a **50/50 partnership** on the IT business
  only. Marcus's construction company ("The Mastic Man Limited") is explicitly OUT of
  scope. The legal entity of the horse business is still unconfirmed.
- Previous developer (Ismael) built ~60-70% of a Nuxt rewrite but it stalled —
  the missing piece was never the code, it was **the data**: nobody solved extracting
  the write-ups from the Word archive into the database. That extraction is Sammy's
  core value-add. Do not repeat the previous mistake (endless rewrite, no data).

## Architecture decisions (agreed, do not relitigate)

1. **Adopt and modernise the existing Nuxt app** (was `hbnuxt_copy`). Do NOT rewrite
   from scratch. Refactor, clean, and finish it.
2. **Keep the database engine (MySQL) and the good table names** (`storehorse`,
   `competition_history`, etc.) to make data migration easy. Refactor the Prisma
   schema starting FROM the existing one: remove junk models (`marcustest`,
   `storehorse_new`, dirty defaults), keep the sound relational core, add new models.
3. **The pedigree chain is sacred:** `storehorse.dam_id` / `sire_id` self-relations
   already work and rebuild the maternal line correctly (validated against real
   catalogue data). `mareline_id` groups maternal families (Marcus fills it manually).
4. **New pieces to build:** (a) Word extractor that parses historical catalogues into
   structured data; (b) a write-up library (one canonical text per mare, reused by
   every foal in her line — never duplicated); (c) modern PDF generation ("2026"
   professional style); (d) clean review UI for new families.
5. Stack stays: **Nuxt 3 + TypeScript + Prisma + MySQL + Tailwind**. Server logic in
   Nitro (`server/api`). Consider replacing PrimeVue with Nuxt UI or shadcn-vue during
   the UI modernisation. Word extractor lives as a separate module (Python
   prototype, tracked at `extractor/parse_dams.py`).

### Reusable assets already in the Nuxt app (verified — do not rebuild blindly)

- ~45 API endpoints in `server/api/`, incl. `pedigree.post.ts`,
  `family-tree-of-horse-by-id.post.ts`, `mareline.post.ts`, `progeny.post.ts`,
  `report-horses-ids.post.ts`, full auth (login/sign-up/JWT/refresh), search, Stripe.
- Components: `Pedigree.vue`, `HorseFamilyTree.vue`, `MarelineTree.vue`,
  `RecursiveCompetitionHistory.vue` (renders the dam write-up section).
- Prisma schema: ~40 models, sound relational core (`storehorse` self-relations
  dam/sire + inverse offspring). Junk to remove: `marcustest`, `storehorse_new`,
  dirty defaults. Audit each asset before reuse; refactor, don't rewrite.

## Key domain knowledge

- Auction input: an Excel per auction with columns **name, age, sire, dam, colour, sex** (25–50 foals). Format is stable per Marcus.
- Reference sites (credentials live in .env / password manager, NEVER here or in code):
  - Old PHP site: horseandbreeder.com (works, generates pedigree tables)
  - New Nuxt site (unfinished): http://138.68.65.22 (/report returns "No data" — never populated)
- "Dam" = mother; "sire" = father. 1st Dam = the foal's mother, 2nd Dam = grandmother,
  and so on up the maternal line.
- Write-up entry format (very regular, parseable):
  `NAME: sj 1.40m (year)(rider)(COUNTRY) year: pl Nth Event Class Height, ... dam of: ... Approved KWPN. etc.`
  - `sj/dr/ev` = discipline (showjumping/dressage/eventing); height like `1.40m`
    signals level; bold/caps = notable horse (bold has human noise — height is the
    more reliable signal); `dam of:` introduces offspring (can nest); `(SEE ABOVE)`
    = reuse reference; `etc.` closes entries.
- **The same mare's text is reused across many foals** (validated: 37% of a real
  catalogue was duplicated text; "(SEE ABOVE)" appeared 19×). The library must store
  each mare ONCE, keyed to her `horse_id`; foals inherit texts by walking `dam_id`.
- Identity resolution (Word name → `horse_id`): normalised name match resolves ~92%
  of maternal-line heads; ambiguity is broken with birthyear, then sire/dam names.
  Distant offspring often aren't in the DB (fine — they live only as library text).

## Data reality (validated 2026-07)

- `hbold` dump: `storehorse` has **~56,395 rows** (careful: the dump has MULTIPLE
  INSERT blocks — a parser reading only the first block sees ~8.7k and draws wrong
  conclusions; this mistake was already made once).
- `competition_history` exists with the right shape but is nearly empty (~454 rows)
  — it was designed but never populated. Filling it (from Word extraction) is the job.
- `storehorse.remarks` holds only fragmentary test data (79 horses with real text,
  none complete). The real source of truth for write-ups is the Word archive.
- `hbold` data ends at 2024. A **newer DB copy may exist** behind the Vue site —
  confirm with Marcus before assuming `hbold` is the latest.
- Old PHP site (horseandbreeder.com) generates the pedigree table via
  `exportPedigree.php` (HTML styled as Word). It works; treat as read-only reference
  in `_legacy/`, never as build target.

## Working rules

- **TDD (gentle-ai workflow — see Development guidelines below).** Non-negotiable
  for parser logic, identity resolution, and pedigree assembly.
- Small, focused commits. Prefer reverting to a known-good state over piling fixes
  onto a broken direction (owner's explicit preference).
- Ask before destructive schema changes or data migrations; always back up first.
- Owner communicates in Spanish; code, comments, and commits in English.
- Marcus is non-technical: any UI copy must be plain English, zero jargon.
- Credentials must never be hardcoded (the legacy code has hardcoded DB creds and an
  authorised-emails list — that pattern must not survive the refactor). Use `.env`,
  which exists but must never be committed.
- Linear is the source of truth for work items. See "Linear workflow (mandatory)".

## Linear workflow (mandatory)

Linear is the source of truth for work items. These rules are binding — they apply
before any change to code, configuration or documentation.

1. **Every logical unit of work has its own issue.** No change lands without one.
2. **Do not duplicate.** If an issue already covers exactly the work, use it.
3. **If none exists, create it** under the relevant EPIC (setup work → `HOR-1`).
4. **Move the issue to `In Progress` BEFORE making any change.**
5. **Move to `Done` only after** all acceptance criteria are met, the corresponding
   verifications have actually been run, and the result is recorded in the issue
   (files changed, commands run, results, decisions, blockers).
6. **Never mark `Done` what depends on someone else.** If it waits on Sammy, Marcus
   or external material, leave it blocked or `In Progress` and document exactly
   what is missing. A falsely-closed issue is worse than an open one.
7. **Do not bundle unrelated work into one issue** to move faster.
8. **One issue per commit**; every commit message carries its `HOR-X` identifier.

## Development guidelines (gentle-ai TDD workflow)

This project follows the gentle-ai / Gentleman Programming AI-driven workflow
(Red-Green-Refactor with phase commits). The developer decides; the AI executes.

### Phase cycle per user story

1. **PLAN** — read the Linear story + acceptance criteria before any code.
2. **RED** — write failing tests (Vitest) that encode the acceptance criteria:
   happy path, edge cases, error states. Commit: `test: add <feature> tests (RED)`.
3. **GREEN** — write the MINIMAL code to pass all tests. No extras beyond what the
   current tests require. Commit: `feat: implement <feature> (GREEN)`.
4. **REFACTOR / QUALITY** — security pass (no exposed secrets, input validation,
   auth on every endpoint) and accessibility pass on UI (semantic HTML, keyboard,
   contrast). If issues found: update tests FIRST, then fix.
   Commits: `fix: ...` / `refactor: ...`.

### Hard rules

- NEVER write implementation code without a concrete failing test.
- NEVER modify code for a security/a11y finding without first updating the tests
  to capture it (tests always reflect current requirements).
- One commit per phase; conventional commits (`feat|fix|test|docs|refactor|chore`);
  NEVER mention Claude/AI in commit messages.
- **Scope Rule** for structure: code used by 2+ features → shared/global; used by
  1 feature → stays local to that feature. Structure must scream functionality
  (e.g. `features/pedigree-report/`, `features/writeup-library/`,
  `features/word-extractor/`), not technical grouping.
- Container/Presentational: containers hold logic and share the feature's name;
  presentational components are pure UI via props.
- Linear stories play the role of PROJECT_SPECS: every story must carry concrete
  acceptance criteria; tests derive from them, not from imagination.

## Repo layout (target)

- `/` — Nuxt app (adopted from hbnuxt_copy): `pages/`, `components/`, `server/api/`,
  `prisma/`, `composables/`.
- `/extractor/` — Word → structured data module (Python; `parse_dams.py` prototype).
- `/_legacy/` — old PHP site + `hbold_backup.sql` dump, read-only reference. Never
  import from here at runtime.
- `CLAUDE.md` — this file. Keep it updated when decisions change.

## Commands

- `pnpm dev` — dev server
- `pnpm build` / `pnpm preview`
- `pnpm prisma migrate dev` / `pnpm prisma studio`

The project uses **pnpm** (pinned via `packageManager`). Dependency install
scripts are blocked by default; anything that legitimately needs one must be
declared in `pnpm-workspace.yaml` under `allowBuilds`.
### Extractor (Python, separate from the Node toolchain)

```
pip install -r extractor/requirements.txt
python extractor/parse_dams.py <catalogue.docx> > out.json
```

Only dependency is `python-docx` (pinned in `extractor/requirements.txt`);
everything else the prototype uses is standard library. Verified on Python 3.14.5.

## Current state / next steps

- Extractor prototype validated on a real 2026 catalogue (44 foals, 704 unique
  horses, 1,048 results extracted).
- Awaiting from Marcus: 2–3 more sample Word docs (format-consistency check) and,
  later, the full Word archive; also the current/live DB copy if it differs from
  `hbold`.
- Work plan lives in Linear: project **`horseandbreeder`**, team **`horseandbreeding`**,
  issue prefix **`HOR-`**. See "Linear workflow (mandatory)".
