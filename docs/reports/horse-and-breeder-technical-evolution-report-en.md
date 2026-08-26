# Horse & Breeder — Technical Evolution Report

**Language:** English
**Audience:** Marcus (business owner of the catalogue process), future developers, and anyone taking over this project technically or commercially.
**Nature of this document:** A synthesised technical history and handover narrative. It is **not** a changelog and **not** a status board.
**Generated:** 2026-08-25, from the repository, the Architecture Decision Records, the Linear work record, and the live local environment.
**Versioned:** 2026-08-26 under **HOR-132**, with the package-manager state re-read after **HOR-124**. Corrections are marked in place; no historical statement was rewritten.

---

## 1. How to read this report

This report explains what Horse & Breeder is, what it looked like when the current
engineering effort adopted it, everything that was rebuilt or hardened since, and exactly
where the work stands today.

Two habits run through the whole document, and they matter more than any individual fact.

**First: every technical term is defined the first time it appears.** If a word is
introduced without explanation, that is a defect in this report, not something the reader
is expected to already know. Product names — Nuxt, Vue, Prisma, MariaDB, Tailwind, Stripe —
are kept exactly as their makers spell them, because they are names, not concepts.

**Second: claims are labelled by how strongly they are supported.** The project's own
working rules forbid stating that something is finished merely because code for it exists.
This report uses the following vocabulary, and uses it strictly.

| Label | What it means |
|---|---|
| **IMPLEMENTED** | The code exists and is merged into the stable branch |
| **VERIFIED** | Implemented *and* checked by a test, a measurement, or a recorded manual regression |
| **RELEASED** | Verified *and* published under a version tag |
| **PLANNED** | Agreed and written down as work, not started |
| **DEFERRED** | Deliberately postponed, with recorded evidence for the postponement |
| **ACCEPTED RISK** | A known problem consciously not being fixed now, with reasons |
| **UNKNOWN / NEEDS REVALIDATION** | The available evidence is not sufficient to make a claim |

Where this report and a source document disagree, the disagreement is stated openly rather
than smoothed over. Three such disagreements are recorded — see section 26.

---

## 2. What Horse & Breeder is — the business problem

### The manual process being replaced

Horse & Breeder exists to solve one specific, expensive, repetitive job.

When a sport-horse auction is prepared, every horse in the sale needs a **catalogue page**.
A catalogue page is a single sheet that shows, for one young horse:

1. A **pedigree table** — its parents, grandparents and further ancestors.
2. **Maternal-line write-ups** — a paragraph of prose for its mother (the "1st Dam"), its
   grandmother on the mother's side ("2nd Dam"), its great-grandmother ("3rd Dam"), and
   deeper where the records exist.
3. **Notable offspring and competition results** for each of those mares.
4. A **professional PDF** clean enough to hand to an auction house.

The prose in point 2 is the expensive part. It is written once, by hand, and then copied
again and again. Every foal out of the same mare needs the same paragraph about that mare.
Every foal out of the same *family* needs the same paragraph about the grandmother.
Historically this was done by opening old Word catalogues, finding the right paragraph, and
pasting it into the new document.

Two measurements taken from a real, validated catalogue sample show the scale of the
duplication:

- Approximately **37% of the text inside a single catalogue was duplicated content**.
- The literal marker `(SEE ABOVE)` — a human shorthand meaning *"this paragraph already
  appeared earlier in this document, do not repeat it"* — appeared **19 times** in that one
  catalogue.

These figures are the empirical justification for the whole design. They are measurements,
not targets.

An auction of 25 to 50 foals therefore means hours of copying, and every copy is an
opportunity to paste the wrong mare's history into the wrong horse's page.

### What Marcus needs

Marcus is the non-technical business operator. He prepares the catalogues, supplies the
Word and Excel source files, reviews the cases the system cannot resolve, and produces the
final PDFs. What he needs from this system is:

- to search for a horse, or upload the auction's Excel file;
- to get correct pedigree pages back automatically;
- to be shown only the cases that genuinely need a human decision;
- to receive a PDF he is willing to put his name on;
- and to do all of that without learning any technical vocabulary.

### What is being built

The goal is a **reusable, traceable pipeline** that replaces repeated manual copy-and-paste,
so that a whole auction of roughly 25 to 50 foals is processed in **minutes rather than
hours**.

The central design idea is the **canonical write-up library**: one approved paragraph per
identified mare, stored once against that mare's database identity, and reused by every foal
in her line. `(SEE ABOVE)` stops being a note a human writes and becomes a reference the
system resolves.

---

## 3. The target transformation chain

This is the pipeline the product is being built towards. It is the reference against which
every later section measures progress.

```txt
Word catalogue ingestion
  -> structured maternal-line data
  -> canonical write-up library
  -> horse identity resolution
  -> pedigree + write-up assembly
  -> professional PDF
  -> batch generation from auction Excel
  -> human review only for unresolved cases
```

The same chain, expressed as the flow Marcus actually performs:

```txt
search a horse   OR   upload the auction Excel
  -> pedigree table assembled from the verified parent relationships
  -> maternal-line write-ups pulled from the canonical library by walking the mother chain
  -> professional PDF, single or batch
  -> a review queue containing only the missing, ambiguous and conflicting cases
```

Three domain rules govern that chain permanently, and no engineering decision may break
them.

- **The pedigree chain is defined by two database fields** — `dam_id` (mother) and `sire_id`
  (father) on the `storehorse` table. Those two, and nothing else, define ancestry.
- **The maternal line is walked through `dam_id`.** A separate field called `mareline_id`
  groups horses into maternal families for convenience; it is a grouping label, not the
  chain, and must never be used as a substitute for it.
- **The Word archive is the source of truth for historical write-ups** — not the text fields
  in the database. The database's own text columns hold only fragments: the
  `competition_history` table has the right shape but holds only about **454 rows**, and
  approximately **79 horses** carry partial text in a `remarks` field. The real prose lives
  in the Word files.

Six business rules follow from those invariants and are binding on every future
implementation.

| Rule | Statement |
|---|---|
| **BR-001** | Ancestry comes from `dam_id` and `sire_id`, never from name text |
| **BR-002** | The maternal line is traversed through `dam_id` |
| **BR-003** | A mare has at most one canonical write-up, keyed to her `horse_id` |
| **BR-004** | An ambiguous identity match is never resolved automatically |
| **BR-005** | A conflicting write-up is never overwritten silently |
| **BR-006** | An Excel row is never silently dropped |

---

## 4. Initial technical state at adoption

This section describes what was actually inherited. Nothing is called "legacy" or
"obsolete" here unless the evidence supports it.

### 4.1 The application itself

The inherited product was a working **Nuxt 3** application. Nuxt is a framework for building
web applications on top of **Vue**, the library that renders the user interface in the
browser. Nuxt also ships a server engine called **Nitro**, which is where this project's
server-side business logic lives, under a directory named `server/`.

The application was not a prototype. It contained a real pedigree browser, a search
function, a family-tree view, a maternal-family view, user accounts, and a marketplace
section for horses offered for sale. The inventory counted **45 tracked API endpoint files**
and a component library of comparable size.

The decisive judgement made at adoption — recorded as **ADR-001** — was this: the project
had stalled not because the front end was inadequate, but because **the historical Word data
had never been transformed into structured, reusable data**. The missing capability was
never the user interface. Rewriting the application from scratch would therefore have
destroyed working software in order to solve a problem the rewrite would not have touched.

**The decision was: adopt and modernise. Never rewrite.** That decision is binding and is
the single most important architectural fact in this report.

An older **PHP and MySQL** version of the site exists and is kept in the repository under a
directory named `_legacy/`. It is **read-only reference material**. It is never imported and
never executed.

### 4.2 The database

The reference database is called `hbold`. It is a **MariaDB-family** database — MariaDB is
an open-source database server in the MySQL family, and the dump originated from one, so a
MariaDB server was chosen locally to stay close to the source.

Its measured state:

| Fact | Value |
|---|---|
| Tables in a clean restore | **30** |
| Horse records in `storehorse` | **59,903** (exact, verified by direct count) |
| Storage engine mix | **24 tables on MyISAM**, the remainder on InnoDB |
| Database default character set | `latin1`, with explicit per-table character sets |
| Data recency | up to approximately **2024** |

**MyISAM and InnoDB** are two ways MariaDB can physically store a table. InnoDB is the
modern one: it supports transactions (all-or-nothing groups of changes) and enforces foreign
keys (guarantees that a reference to another row actually points at a real row). MyISAM
supports neither. Inheriting 24 MyISAM tables meant inheriting a database that could not, at
the storage level, enforce its own relationships.

There was also a **counting trap** in the reference dump that has already produced one wrong
conclusion during this project, and is recorded here so it produces no more. The dump
contains **seven separate `INSERT INTO storehorse` blocks**. Any process that applies only
the first block sees roughly **8,700 rows** and concludes the table is small. The correct,
verified figure is **59,903**.

There was **no migration history at all**. A migration history is the ordered list of schema
changes that lets a database be rebuilt reproducibly from scratch. None existed — no
tracking table, and the single migration file present in the repository dated from October
2024, had never been applied, and could not be applied against the real schema.

### 4.3 Schema drift

The application's data model is declared in a file called `prisma/schema.prisma`. **Prisma**
is the ORM — the layer that translates between database tables and application objects.

That declaration and the reference database did not match:

- The schema declared **41 models**; `hbold` contained **30 tables**.
- **Eleven models existed only in code**, backing authentication, sellers and analytics
  features that had been built but never shipped to this dataset.
- Four models differed at the column level. `storehorse` alone was missing six columns:
  `status`, `currency`, `age`, `ad_title`, `created_at` and `seller_id` — a coherent
  marketplace feature set that never reached this data.

The critical judgement here — recorded as **ADR-003** — is that this drift is evidence
`hbold` **predates** the application schema. It is **not** evidence that the code-only
models are junk. Deleting them would silently delete working capability. Schema removal
therefore requires evidence, a dedicated work item, tests, and an approved rollback plan.

There was also **capacity drift**: a column that exists but is the wrong size. The
`users.password` column was `varchar(50)` in the database while the schema declared 100
characters. Password hashing produces a 60-character value. The consequence was concrete and
total: **every attempt to register a new user was rejected.**

### 4.4 Authentication and security

This was the weakest area of the inherited system, and it is worth being precise about why.

- **Access tokens were signed with a guessable fallback secret.** The signing key was read
  from an environment variable, but the code fell back to a hard-coded default string when
  that variable was absent. Anyone who knew the default could forge a valid session.
- **Refresh tokens were stored in clear text.** A refresh token is a long-lived credential
  used to obtain new short-lived access tokens. These were persisted in the database as
  readable text. Anyone with a copy of the database had every user's credentials.
- **A second table persisted every access token in clear text as well.**
- **Neither table was ever read.** Both were write-only. There was no revocation, no audit
  and no reader anywhere in the codebase — so the storage bought nothing and cost
  everything.
- **A shared API key was inlined into the public browser bundle.** The key travelled to
  every visitor. Measured: **36 occurrences across 20 source files**, and **36 occurrences
  across 19 files in the built public output**. Meanwhile **30 handlers called the
  validation function and discarded its result** — the gate did nothing at all.
- **A role table had a global uniqueness constraint on the role name**, which meant only one
  user in the entire system could hold the role `User`.
- **One endpoint accepted a password in the URL query string and returned the stored
  password hash in its response.**
- **Failures were returned as HTTP 200.** The status code said success while the body said
  failure, so no caller could reliably detect an error.

### 4.5 Front-end and styling

- **Tailwind CSS 3**, wired through a Nuxt module. Tailwind is a styling system built from
  small utility classes applied directly in markup. The project used **1,128 class bindings
  across 62 components**, all static — no dynamic class construction anywhere.
- A `tailwind.config.js` file existed but was the **untouched generator stub**. No custom
  design tokens, no `@apply`, no `@layer`, no `theme()` calls. The project used Tailwind's
  defaults and nothing else.
- **PrimeVue**, a user-interface component library, was wired in through a deprecated Nuxt
  module.
- **Quill** (a rich-text editor) and **html2pdf** (a browser PDF generator) were declared as
  dependencies.
- A **legacy polyfill layer** — `node-fetch`, `core-js`, `regenerator-runtime` — was loaded
  at runtime to provide browser features that modern engines already ship natively.
- **crypto-js** encrypted numeric horse identifiers inside URL paths, using a passphrase
  supplied through a browser-visible environment variable.

### 4.6 Payments

Stripe was integrated for a premium subscription offer. Three faults mattered:

- **The client sent the amount to charge.** The browser told the server how much money to
  take. A modified request could have set any price.
- A **test payment-method token was hard-coded** into the server path.
- The **entire Stripe error object was logged** on failure. That object contains a field that
  includes the payment's client secret.

The pricing user interface offered *Monthly* and *Annually* subscriptions, while the
implementation created a **one-time charge** with no recurring billing and no record of who
had paid for what.

### 4.7 Tooling, tests and process

| Area | State at adoption |
|---|---|
| Package manager | Mixed; standardised to **pnpm** as one of the first actions (ADR-004) |
| Node.js runtime | Below the current Long Term Support line |
| Automated tests | A minimal harness; the earliest recorded baseline is **3 files, 28 tests** |
| Continuous Integration | Present, but needed hardening to become a real merge gate |
| Release process | Manual |
| Documented architecture decisions | None |

---

## 5. Modernisation strategy and philosophy

The engineering approach is as much a part of this project's value as the code. It is
summarised here because it explains *why* the work looks the way it does.

### Adopt, do not rewrite

Established in ADR-001 and never revisited. The application is the product base. Rewriting
would have thrown away verified working behaviour to solve a data problem the rewrite would
not have addressed.

### One concern at a time

Modernisation was executed as **ten sequential stages, A through J**, and the sequencing was
deliberate: external tooling first, then the runtime, then metadata hygiene, then dead-weight
removal, then the contained data layer, then contained single-library upgrades, then the
framework itself (the pivot), then CSS, then payments, and finally the deferred and
architecturally heavy tail.

The binding rules were: **one stage at a time**; a stage does not begin merely because the
previous one finished; and **the next stage never starts automatically**.

### Measure the artefact, do not trust the release notes

Two durable lessons were learned the hard way and written down.

> *A breaking-change sweep scoped by file extension is not a sweep.*

> *A breaking-change matrix built from release notes is not a breaking-change analysis —
> measure the artefact the build actually emits.*

Both came from real near-misses. Release notes correctly omit changes that did not happen
between the majors they document — and a default can move in a **patch** release, which no
major-version upgrade guide will ever mention.

### A version upgrade does not change the design

This is a binding, general rule, recorded in ADR-009. When a dependency upgrade would alter
how the application looks, that is **a decision for the product owner, not a finding for an
engineer to absorb**. The measurement is presented; the decision is made; the baseline then
moves with the decision. An old value is never restored merely to make a comparison pass.

### Nothing is deleted without proof

Every removal in this project passed a **safe-deletion gate**: prove zero consumers across
source, generated output and version-control history; prove that no advisory, licence or
capability depends on it; and only then delete. The gate was applied to dependencies, to
database tables and to code alike.

### Data is preserved by default

No production data change without approval. No database reset. Backups verified before any
irreversible operation. Where a removal touched persisted data, the gate was raised, not
lowered.

### Research from primary sources, LTS first

Dependency targets are re-validated **at the start of each stage**, from primary sources —
the Context7 documentation service first, corroborated against official release pages and
registry data. Numbers from an earlier audit are treated as a snapshot, never as an
instruction. **Pre-release versions are forbidden** — no alpha, beta, release candidate,
nightly, canary or preview. Node.js stays on a **Long Term Support** line.

### Every change travels the same road

```txt
issue branch  ->  DEV  ->  QA  ->  main
```

Three Pull Requests, **merge commits only**, each with its own genuinely green `Test / Build`
check. No stage may be skipped. "No checks reported" is never treated as a pass.

### Architecture decisions are recorded, not remembered

Sixteen Architecture Decision Records exist. An accepted ADR is binding until superseded by
another ADR — never by an edit to the original.

### The work record is kept separate from the knowledge

The Linear issue tracker holds the detailed execution record — what was done, what was run,
what was proven. The durable documents hold the knowledge that must survive without any
session context. The two are never copied into each other.
---

## 6. The Modernisation Programme — Stages A to J

Ten stages, executed strictly in order, each with its own Linear work item, its own branch,
its own promotion chain and its own green Continuous Integration check.

| Stage | Concern | Work item(s) | State |
|---|---|---|---|
| **A** | GitHub Actions major versions | HOR-42 | **Done** |
| **B** | Node.js runtime and pnpm tooling | HOR-50 | **Done** |
| **C** | `package.json` metadata hygiene | HOR-54 | **Done** |
| **D** | Remove the deprecated PrimeVue Nuxt module | HOR-55 | **Done** |
| **E** | Prisma client major — client only | HOR-58 | **Done** |
| **F** | Six contained single-library majors | HOR-59 … HOR-64 | **Done** |
| **G** | Nuxt framework major — the pivot | HOR-67, HOR-68 | **Done** |
| **H** | Tailwind CSS major migration | HOR-69 | **Done** |
| **I** | Stripe integration modernisation | HOR-72 | **Done** |
| **J** | The deferred, ADR-heavy tail | HOR-83 (+ ten children) | **Done** |

Status: **all ten stages RELEASED.**

### Stage A — Continuous Integration tooling (HOR-42)

| | |
|---|---|
| **BEFORE** | The four GitHub Actions used by the build and release workflows sat on older majors |
| **CHANGE** | Each moved to its latest supported major, verified against the action's own official releases rather than assumed |
| **AFTER** | Workflow hygiene only. No application, dependency, schema, database or environment change. What the workflows *do* was unchanged. A real run's logs were checked for Node.js deprecation warnings |
| **WHY IT MATTERS** | It ran first deliberately: it is independent of everything else, and it de-risks the Continuous Integration system that every later stage depends on for proof |

### Stage B — Runtime and package manager (HOR-50)

| | |
|---|---|
| **BEFORE** | Node.js and pnpm below the supported lines; two declarations, in `package.json` and the Continuous Integration workflow, disagreed with what the project should run on |
| **CHANGE** | Exactly two declarations moved: `packageManager` and the workflow's `node-version`. Nothing else |
| **AFTER** | The lockfile required no change — the frozen install stayed valid. No application dependency was updated. Gate passed at **3 files, 28 tests** |
| **WHY IT MATTERS** | Every later stage needed a supported, stable foundation. This is also where the numbers stopped being hard-coded into documentation: version numbers live in `package.json` and the workflow, and are never repeated in prose |

The historical values Stage B adopted on 2026-08-08 were Node.js 24.19.0 and pnpm 11.20.0.
They are recorded as *what that issue adopted on that date* — a historical fact, not
standing policy. The versions in force today are whatever the executable files declare now.

### Stage C — Metadata hygiene (HOR-54)

| | |
|---|---|
| **BEFORE** | **Twenty-five direct dependencies declared a version floor below the version that already resolved.** The project had never declared which Node.js runtime it supports |
| **CHANGE** | Each floor raised to the version already installed. `engines.node` added. Lockfile `specifier:` lines synchronised by pnpm, never hand-edited |
| **AFTER** | **No resolved version moved.** The installed tree is identical before and after: 51 direct dependencies, none added, none removed, not one resolved version different |
| **WHY IT MATTERS** | A declared floor that lags the resolved version is a promise the repository does not keep. It tells a fresh install that a version nobody verified is acceptable, and it hides which upgrades a later stage still has to make |

One consequence was recorded deliberately rather than discovered later: pnpm enforces
`engines` **hard** for the project itself. An incompatible Node.js runtime now fails the
install rather than warning. That is the intended effect — it is the reason the field is
worth adding — but it is a real behavioural change inside a stage otherwise labelled
hygiene.

### Stage D — Remove the deprecated PrimeVue module (HOR-55)

| | |
|---|---|
| **BEFORE** | A Nuxt module deprecated by its own publisher, dragging in a **second, older major of PrimeVue** alongside the supported one, so two majors of the same library resolved at once |
| **CHANGE** | **One dependency removed.** The commit touches `package.json` and the lockfile and **no source file** |
| **AFTER** | Package count fell by exactly two — the module and the older major it carried. Nothing added, no resolved version changed. Eight routes answered `200` after removal |
| **WHY IT MATTERS** | The conclusion came from the **real dependency graph**, not a text search. The audit had offered "wire the supported module *or* confirm the resolver path"; the repository proved the second, so there was nothing to wire and the configuration was deliberately left untouched |

Three findings were raised here and **recorded rather than repaired**, because fixing them
inside a dependency issue would have made that issue's diff impossible to review as an
upgrade. The most important was the shared API key inlined into the browser bundle — acted
on later by HOR-56 under ADR-007.

### Stage E — Prisma client major (HOR-58)

| | |
|---|---|
| **BEFORE** | The Prisma client one major behind, with the schema, the reference database and the compatibility layer between them all in place |
| **CHANGE** | **Two dependency lines.** No source, test, configuration, workflow, schema or asset file touched |
| **AFTER** | The schema proven **byte-identical** before and after and again when read back from the stable branch. The reference database not modified in any way. Gate passed at **4 files, 61 tests** |
| **WHY IT MATTERS** | This is the *contained* data-layer move: the client major that can be crossed without a driver adapter, without a generator change and without touching the database. That is what let it land ahead of the framework pivot rather than inside it |

Two things this stage recorded are worth carrying forward.

**A latent breaking change.** `Bytes` fields stop being typed as Node's `Buffer` and become
`Uint8Array`. Three schema fields are affected and only one is reachable from application
code. A read-only count established that **no row currently carries a value in it**, so no
response shape changed that day. The risk is latent, not absent — and it became active work
two stages later.

**An expectation closed by evidence.** The audit anticipated a full-text-search preview-flag
cleanup here. That configuration **does not exist in this repository**. The item was closed
as a verified no-op and recorded rather than quietly dropped, so the gap between the audit's
expectation and reality stays traceable.

### Stage F — Six contained library majors (HOR-59 … HOR-64)

One work item, one branch, one commit series and one three-Pull-Request chain **each**,
strictly one at a time. No Pull Request carried two libraries.

| Library | Work item | Outcome |
|---|---|---|
| `primeicons` | HOR-59 | **Removed** |
| `dotenv` | HOR-60 | **Removed** |
| `uuid` | HOR-61 | One major crossed |
| `nodemailer` | HOR-62 | One major crossed |
| `bcrypt` | HOR-63 | One major crossed |
| `@heroicons/vue` | HOR-64 | One major crossed |

| | |
|---|---|
| **BEFORE** | Six libraries behind their current majors, entangled enough that a single "upgrade the dependencies" change would have been unreviewable |
| **CHANGE** | Six independent crossings, sequenced so the largest source diff — the icon library, whose major renamed the package entry points and reached fifteen component files — went last |
| **AFTER** | Each crossing reviewable and revertible on its own. Two of the six were **removed rather than upgraded**. Two remain below their current line, deliberately deferred to Stage J |
| **WHY IT MATTERS** | This is the stage's durable lesson: sometimes the honest answer to *"which major should we adopt?"* is *"none — this dependency should not be here."* A modernisation stage that cannot reach that conclusion will keep upgrading things the project does not need |

The icon package was removed because its next major **relicenses from an open-source licence
to a commercial one**. The decision was made not to adopt that licence, and equally not to
pin the old major merely to retain the open one. The dependency was then exhaustively proven
unused — across import paths, style entry points, build configuration and rendered output,
not by a name search — and removed. A blocked library stopped the stage rather than being
skipped for the next one, which is exactly what happened here.

### Stage G — The Nuxt framework major (HOR-67, HOR-68)

The pivot. Every earlier stage existed to de-risk this one.

| | |
|---|---|
| **BEFORE** | Nuxt 3, with a content module that served nothing, and a component importing a package the project never declared — resolving only because pnpm hoists |
| **CHANGE** | The framework major crossed in a single work item. The router major crossed with it, and the head-management library crossed transitively. The build toolchain — the bundler major and the renamed server package — moved underneath the framework rather than by decision. **Vue itself did not move** |
| **AFTER** | **The source diff is three lines across two files.** Every data-layer assertion identical across the major; pedigree, maternal-line, progeny and search responses matching node for node |
| **WHY IT MATTERS** | A framework major is proven safe by comparing behaviour before and after. That comparison is only meaningful when it is small enough to read |

Three things made this stage what it is.

**The content module was closed first, by removal.** The unmaintained version had no
supported upgrade path that did not require an embedded database, a connector layer, content
collections and a new configuration file. A four-layer audit — source, dependency graph,
build output and running routes — confirmed the module served **zero documents**. It was
removed rather than migrated. None of that infrastructure was worth introducing to serve
nothing.

**The default relocation was refused — ADR-008.** The new framework major relocates
application code by default. Adopting that default would have moved nearly every directory
in the repository in the same change that swapped the framework. It was refused through
supported configuration, and the rule was made general: **a framework major migration never
doubles as a repository directory reorganisation.** The reason is verification, not
preference — a diff of hundreds of renames hides the handful of lines that actually changed
the framework, and any regression becomes unattributable.

**One difference appeared and was chased to a cause rather than accepted.** Every
server-rendered page came back dramatically smaller after the upgrade. That looks exactly
like server rendering having silently broken, so it was investigated as though it had: the
markup was counted, headings, navigation and images confirmed present, and the linked
stylesheet fetched and measured. The framework major changed **how CSS is delivered** —
from inlined in the server-rendered HTML to an external stylesheet — and the missing bytes
are accounted for almost exactly by the sheet now served separately. No content was lost.
It is recorded because it is benign but **not invisible**: an external stylesheet is a
render-blocking request on first paint where inlined CSS was not.

This stage also produced the sweep lesson: the one build-time constant the audit initially
missed was found only when the sweep was re-run **without an extension filter**.

### Stage H — Tailwind CSS major (HOR-69)

| | |
|---|---|
| **BEFORE** | Tailwind 3 through a Nuxt module, plus a `tailwind.config.js` that was the untouched generator stub and a vendor-prefixing tool declared directly |
| **CHANGE** | The Tailwind major crossed. The Nuxt module **removed** — its stable line cannot resolve the new major and still depends on the previous framework's toolkit. Tailwind's own first-party build-tool integration **added**, exactly as its installation guide prescribes. The vendor-prefixing tool **removed as a direct dependency**, because the framework's builder already depends on it and applies it by default. The configuration file and the style-processing block both deleted — the new major configures in CSS and detects its own source files |
| **AFTER** | Same visual output, delivered by a supported integration with three fewer moving parts |
| **WHY IT MATTERS** | There was no module-versus-plugin choice to make. The module's stable line pinned the previous major, so keeping it would have meant not upgrading at all |

Stage H produced the second durable lesson, and it is stronger than Stage G's:

> A breaking-change matrix built from release notes is not a breaking-change analysis.
> **Measure the artefact the build actually emits.**

Release notes correctly omit changes that did not happen between the majors they document —
and a default can move in a **patch** release, which no major-version upgrade guide will
ever mention. The measurement that mattered here compared the built stylesheet before and
after, because this project *links* its stylesheet rather than inlining it, so comparing
served HTML would have proven nothing.

### Stage I — Stripe modernisation (HOR-72)

Covered in full in section 14.

### Stage J — The deferred, ADR-heavy tail (HOR-83, ten children)

Authorised after the v1.3.1 release cycle closed and started on **2026-08-17**. Ten
children, US-089 through US-098, each with its own work item and its own promotion chain.

| Child | Work item | What it did |
|---|---|---|
| US-089 | HOR-84 | Mail library major crossed |
| US-090 | HOR-85 | Removed two unused browser PDF generators and their entire advisory-carrying chain |
| US-091 | HOR-86 | Removed the unused rich-text editor and its wrapper |
| US-092 | HOR-87 | Removed the legacy polyfill layer |
| US-093 | HOR-88 | Identifier library majors crossed |
| US-094 | HOR-89 | PrimeVue **removed rather than migrated** |
| US-095 | HOR-90 | Removed the URL identifier encryption and replaced it with validated plain numeric identifiers |
| US-096 | HOR-91 | Prisma major crossed to the driver-adapter architecture — ADR-015 |
| US-097 | HOR-92 | Database server moved to the next Long Term Support line — ADR-016 |
| US-098 | HOR-93 | Closing sweep: final removals, transitive refresh, advisory reduction |

Each is described where it belongs: dependency removals in section 15, the data layer in
section 10, the database in section 11, the identifier change in section 12, and the
advisory outcome in section 16.

**Stage J is complete. All ten children are in the stable branch, which closes the
programme: every stage from A to J is Done.** Two items remain deliberately open *outside*
the stage, and both are tracked — see section 26.

---

## 7. Runtime, package manager and build tooling

### The package manager decision

**pnpm is the only package manager**, recorded in ADR-004. This is not a preference; it is
an invariant. The rule that makes it durable is that `package.json` holds the pinned version
as its **single source of truth**, and that number is never duplicated into a second place
that then drifts. The Continuous Integration setup step deliberately takes **no version
input at all** — it reads the pinned value from `package.json` — so the build and the
developer machine cannot disagree.

That rule was tested inside Stage C, when adding a second pnpm declaration was considered
and rejected precisely because it would have recreated the drift ADR-004 exists to prevent.

### The runtime rule

Node.js stays on a **Long Term Support** line — a release series that receives fixes for
years rather than months. A *Current* release is explicitly excluded even when it is newer.
Since Stage C the rule is not documentation but something the toolchain enforces: the
declared engine range has a floor at the adopted runtime and a ceiling that keeps a Current
release from creeping in through a contributor's machine.

### What is verified today

Read from the executable sources on 2026-08-25; the package-manager row re-read on
2026-08-26, after **HOR-124**:

| Declaration | Source of truth | Current value |
|---|---|---|
| Node.js range | `package.json` → `engines.node` | `^24.19.0` |
| Node.js in Continuous Integration | `.github/workflows/ci.yml` | `24.19.0` |
| Package manager | `package.json` → `packageManager` | `pnpm@11.23.0` (tracked) |
| Module system | `package.json` → `type` | `module` |

> **Updated 2026-08-26.** When this report was first generated, the working tree carried an
> **uncommitted** change raising `packageManager` to `pnpm@11.23.0` that belonged to no work
> item. **HOR-124** has since formalised it: the value is committed, promoted to `main` and
> governed by ADR-004. The row above is the value `main` declares. No Continuous Integration
> change was needed, because the setup step reads the pin from `package.json` — the rule
> described above doing exactly what it exists to do.

### The build chain

| Layer | What it does | Current version |
|---|---|---|
| **Vite** | Bundles and serves the browser code | 8.2.1 |
| **Rollup** | The module bundler Vite builds on | 4.62.2 |
| **Nitro** | The server engine Nuxt produces and runs | 2.13.4 |
| **h3** | The HTTP layer Nitro uses to handle requests | 1.15.11 |
| **Unhead** | Manages page titles and metadata; **transitive only, never declared** | 3.3.1 |

The last row is a deliberate decision, not an omission. A component once imported
head-management functions from a package the project never declared, which resolved only
because pnpm hoists dependencies. When the library crossed a major that accident became a
decision. **The import was deleted rather than the package declared** — the function is a
framework auto-import, so the correct number of direct dependencies is zero. Declaring the
package to make the accident legitimate would have written it into `package.json`
permanently.

---

## 8. Nuxt and Vue modernisation

### What moved and what did not

| Package | Current version | Note |
|---|---|---|
| `nuxt` | **4.5.2** | The framework the whole application runs on |
| `vue` | **3.5.41** | Did not cross a major; moved a minor line later, in Stage J |
| `vue-router` | **5.2.0** | Crossed a major with the framework, as its target required |

Vue was deliberately **not** moved during the framework major. One major is enough for one
work item.

### The structural decision — ADR-008

The framework major relocates application code by default: source directories move under a
new parent. The project **opted out**, through supported configuration rather than a
compatibility shim.

Concretely, the configuration keeps the source root at the repository root and points the
application directory explicitly, so the repository structure stayed flat. The framework's
broader "compatibility version" switch was considered and **rejected** — it is a shim that
holds old behaviour, whereas the goal was to adopt the new framework and decline only the
directory move.

The rule was then generalised so it applies to the next framework major too:

> **A framework major migration never doubles as a repository directory reorganisation.**

Adopting a new layout remains legitimate work. It is *separate* work, with no version change
in it.

### What the audit proved before the version changed

The migration audit classified every use of a changed interface **against the repository**,
not against release notes. The result was that the framework's most-discussed breaking
changes had nothing in this codebase to break: no page-metadata declarations, no shared
state composable, no payload access, and no deep mutation of fetched data — so the change
making fetched data a shared shallow reference was inert here.

The single non-composable router import keeps its signature across the router major.

**That is why a framework major produced a three-line source diff.** Not luck: an audit run
*before* the version changed rather than after the build broke.

### Current front-end surface

| Item | Count |
|---|---|
| Vue components | **44** |
| Vue pages (routes) | **21** |
| Server API endpoint files (excluding tests) | **44** |
| Server middleware files | **2** |

---

## 9. Tailwind CSS modernisation

Tailwind is the styling system: instead of writing separate style sheets, developers apply
small single-purpose classes directly in markup. `p-4` means padding, `text-red-600` means
red text. The classes come from a fixed palette of design tokens.

### The measurement that shaped the decision

Before anything changed, the usage was measured rather than assumed:

| Measurement | Value |
|---|---|
| Class bindings across the component library | **1,128** |
| Components carrying them | **62** |
| Dynamic class construction | **none** — every binding static |
| Custom design tokens, `@apply`, `@layer`, `theme()` calls | **none** |
| `tailwind.config.js` | present, but the **untouched generator stub** |

That last row is the important one. The project used Tailwind's defaults and nothing else,
which meant the migration's entire risk lived in one question: **did the defaults change?**

### They did — and the change was measured, not guessed

Comparing the built stylesheet before and after:

| Measurement | Value |
|---|---|
| Palette tokens that differ | **35 of 43** |
| Mean perceptual colour difference | **ΔE 4.22** |
| Tokens at ΔE ≥ 5 (a difference most people can see side by side) | **15** |
| Worst single shift | **ΔE 16.08**, on `indigo-600` |
| Focus-ring call sites affected | **82** |

*ΔE is a standard measure of how different two colours look to a human eye. Below about 2
is imperceptible in normal use; 5 and above is clearly visible when the two are shown
together.*

This measurement is the reason Stage H's lesson is written the way it is. **None of these
shifts appear in the major-version upgrade guide**, because some of them landed in patch
releases of the previous major.

### The decision, and the rule it produced — ADR-009

Two decisions were recorded.

**Decision 1: change the integration.** The Nuxt module was removed and Tailwind's own
first-party build-tool integration adopted. There was no real choice: the module's stable
line pinned the previous major, so keeping it meant not upgrading at all.

**Decision 2, and it is the binding one:**

> **A version upgrade does not change the design.**

When an upgrade would alter appearance, the measurement is presented and **the product owner
decides**. Stage H held the existing appearance behind a compatibility layer so that the
build-tooling change could be verified on its own terms.

### The compatibility layer was then retired deliberately — HOR-70

Holding old values forever is not modernisation, it is a permanent shim. Once the tooling
change was proven, the appearance question was put on its own terms and the **native
defaults were adopted**: the compatibility layer was deleted, **142 lines** removed. The
official appearance of Horse & Breeder is now **Tailwind 4 native**, and the baseline moved
with the decision.

The corresponding durable rule is:

> When a new default is adopted, the baseline moves with it. **An old value is never
> restored merely to make a comparison pass.**

### What the verification does and does not cover — stated plainly

The verification was **structural**: declared token values compared, rendered class
attributes compared route by route, built stylesheets compared byte for byte.

**No pixel rendering was compared.** No screenshots were taken and no browser rendering was
diffed. The evidence proves that the declarations and the markup are what they should be. It
does **not** prove that every page looks identical at the pixel level, and this report does
not claim that it does.

Current versions: `tailwindcss` **4.3.3**, `@tailwindcss/vite` **4.3.3**.
---

## 10. Prisma and data-access modernisation

**Prisma** is the ORM — the layer that sits between the application and the database. The
developer writes a schema describing tables and their relationships; Prisma generates a
typed client the application calls instead of writing raw SQL.

This is one of the most consequential areas in the whole project, because it is where
application code, the versioned schema, and a twelve-year-old reference database meet.

### 10.1 The founding rule — ADR-003

The schema declared **41 models**; the reference database contained **30 tables**. Eleven
models existed only in code.

The tempting move — delete the models that are "not in the database" — was refused, and the
refusal was made binding:

> **Absence from the reference database is evidence that the database predates the
> application schema. It is not evidence that the model is obsolete.**

Two operational rules follow.

**Never run a schema-introspection pull against the versioned schema.** The command that
reads a live database and regenerates the schema file rewrites that file **in place** and
silently drops every model the database does not contain. Running it once would have
destroyed eleven models' worth of working capability in a single command. The safe forms —
printing the result to the terminal, or pointing the command at a throwaway file containing
only the generator and datasource blocks — are the only permitted ones.

**Any schema removal requires a full gate:** confirmed evidence, a dedicated work item,
explicit acceptance criteria, tests, and an approved migration and rollback plan.

### 10.2 Migration history — ADR-012

There was no migration history at all. The project could not be rebuilt reproducibly.

The response was a **baseline**, not a rewrite:

- The single pre-existing migration file, dated October 2024, had never been applied and
  could not be applied against the real schema. It was **archived unmodified** rather than
  deleted, so its existence stays traceable.
- A new baseline migration was created as a **faithful, structure-only** capture of the
  30-table database, **preserving all 24 MyISAM tables exactly as they were**. A baseline
  that quietly modernised storage engines would have been a migration pretending to be a
  baseline.
- Storage-engine modernisation was then staged separately. **Wave 1 converted exactly one
  table** — `users`, the authentication table — to InnoDB, because that was the table the
  authentication work actually needed transactions for.

There are **six applied migrations** today:

```txt
0_init                                          the faithful 30-table baseline
20260815092729_users_engine_innodb              Wave 1: one table to InnoDB
20260815092730_modernise_auth_foundation        authentication schema foundation
20260815101514_modern_auth_sessions             rotating refresh sessions; drops access_tokens
20260815161716_storehorse_height_varchar12      capacity reconciliation
20260819120000_storehorse_status_active_backfill  the ADR-014 correction
```

### 10.3 Capacity drift — ADR-011

A distinct failure mode was identified and named: a column that **exists** but is the wrong
**size**.

The `users.password` column was `varchar(50)`. Password hashing produces a **60-character**
value. Every registration attempt was rejected — a total outage of a core function, caused
by ten missing characters.

The rule established is that capacity drift is repaired through **versioned SQL patches**
kept under `db/patches/`, reviewed like code, never through an ad-hoc console command. One
such patch exists today, and it carries a README explaining what the directory is for.

Height was reconciled the same way later, as a proper versioned migration.

### 10.4 The driver-adapter migration — ADR-015

The most architecturally significant data-layer change in the project.

| | |
|---|---|
| **BEFORE** | Prisma 6, with the previous generator emitting the client into the installed-packages directory, and a package-manager setting in `.npmrc` forcing a flat installation layout to make that resolve |
| **CHANGE** | Prisma **7.9.1**. The generator changed to the one that emits a real client into a versioned-but-ignored output directory. A **driver adapter** and the underlying database driver were added, both pinned. All **44 client-owning server files** rewired |
| **AFTER** | The schema diff is **two lines**. The residual difference between schema and database is **byte-identical before and after** — the same 19 deferred statements |
| **WHY IT MATTERS** | A driver adapter means Prisma no longer ships its own database connector; the project supplies one explicitly. That makes connection behaviour visible and configurable instead of hidden |

Several details are worth carrying forward.

**The generated client is deterministic.** It emits to a directory excluded from version
control, and regeneration produces a **hash-identical** result. The build cannot drift
between machines.

**The configuration file loads environment variables itself** and declares its datasource
**conditionally**, so that client generation works in a clean Continuous Integration
environment where no database exists. This is the difference between a build that works on
one laptop and a build that works anywhere.

**The connection pool was set to previous-version parity, not to new defaults** —
connection limit 10, connect timeout 5 seconds, acquire timeout 10 seconds, idle timeout
300 seconds. A driver-adapter migration is not the place to also change how many database
connections the application opens.

**The latent `Bytes` change became active.** The new major returns `Uint8Array` where the
previous one returned `Buffer`. One endpoint's raw SQL was affected. Rather than change that
endpoint's response shape, a small utility restores the previous shape at the boundary, and
a test locks the contract. The risk Stage E recorded as latent was met exactly where it was
predicted.

**The per-request client topology was deliberately preserved.** Roughly 44 server modules
each construct their own client, and about 20 disconnect per request. That is not the shape
a greenfield project would choose. A shared adapter or a client singleton was **explicitly
rejected for this work item**, because changing connection topology inside a major upgrade
would have made any regression unattributable. It is recorded as a known characteristic, not
smuggled in as a fix.

**A package-manager setting was closed out.** The flat-installation setting in `.npmrc`
existed only to make the old generator's output resolve. Once the generator changed, the
setting was audited for other consumers, found to have none, and deleted.

**A platform-specific defect was fixed properly.** On Windows, the generated client's
compatibility shim produced an invalid-file-URL error under the server engine. It is guarded
by a narrow build-time transform in the project configuration rather than by a global
workaround.

Thirteen new tests were added. The suite moved from 34 files / 425 tests to **36 files / 438
tests**.

### 10.5 Current state, verified

| Package | Version |
|---|---|
| `prisma` | 7.9.1 |
| `@prisma/client` | 7.9.1 |
| `@prisma/adapter-mariadb` | 7.9.1 |
| `@prisma/config` | 7.9.1 |
| `mariadb` (driver) | 3.4.5, pinned exactly |

The schema declares a datasource of the MySQL family and generates through the modern
client generator into an ignored output directory.

> **Reported honestly — a documentation drift finding.** The schema file today declares
> **40 models**, not 41. The difference is the historical access-token table, dropped by
> migration under ADR-013 as described in section 12. Two documents —
> `docs/architecture/existing-assets.md` §6 and `docs/data/hbold-baseline.md` §6 — still
> state 41. **This report does not correct them**, because correcting them is outside its
> change boundary. It records the discrepancy so the next person does not have to rediscover
> it. See section 26.

---

## 11. Database modernisation

### 11.1 The engine decision — ADR-002

The reference dump came from a MySQL-family server. The decision was to **stay in that
family** and to **keep the existing table and column names**, however inconsistent they look.

Names like `storehorse`, `diciplinevalues` (a real spelling in the schema) and
`users_has_storehorse` are not tidy. Renaming them would mean touching every query, every
model and every migration in the same change — and would break the one thing that lets the
reference dump restore at all. **The names are a compatibility contract, not a style
choice.**

### 11.2 What the reference database actually contains

Verified figures:

| Fact | Value |
|---|---|
| Base tables after reconciliation | **42** = 30 legacy + 11 code-only + 1 migration-tracking table |
| `storehorse` rows | **59,903** |
| `storehorse` storage engine | MyISAM |
| `storehorse` character set | `latin1` |
| `users` rows | **661** (identifiers 1 to 728) |
| `users` storage engine | InnoDB, converted in Wave 1 |
| `competition_history` rows | **≈ 454** |
| `storehorse.remarks` populated | **≈ 79 horses**, partial text only |
| Data recency | up to approximately **2024** |

The last three rows are the business case for this entire project restated as data. The
table designed to hold competition history has the right shape and is **essentially empty**.
**Filling it from the Word archive is the core work of the product.**

Whether a more recent copy of the database exists is **UNKNOWN**. It is tracked as HOR-32
and is **BLOCKED awaiting Marcus**.

### 11.3 The residual difference — exactly 19 statements

After reconciliation, the difference between the versioned schema and the live database is
a known, enumerated list of **19 SQL statements**:

- **17 foreign-key constraints** that touch MyISAM tables. MyISAM cannot enforce foreign
  keys, so these cannot be applied without converting the tables. Two of them would hard-fail
  outright on the current data.
- **2 composite primary keys** that cannot be created because the data contains duplicates:
  `storehorse_has_approvedby` has **52 duplicate pairs**, and `studbook_has_storehorse` has
  **16,696**.

That count was **20** until the height reconciliation removed one.

The rule attached to this list is the reason it is worth writing down:

> **Anything outside this list appearing in the residual difference is a defect, not an
> accepted drift.**

That turns a vague "the schema and database don't quite match" into a precise, checkable
gate. Every migration since has been verified against it, and the driver-adapter migration
and the server upgrade both proved it **byte-identical before and after**.

### 11.4 The `storehorse.status` incident — ADR-006 and ADR-014

This is the most instructive failure in the project's history, and it is recorded rather
than buried.

**Act one — the compatibility layer (ADR-006).** The schema declared a `status` column that
the reference database did not have. Every query filtering on it failed with an unknown-column
error. A compatibility layer was built: it detects at runtime whether the column exists and
contributes nothing to the filter when it does not. That layer let development continue
against a database that could not be modified.

**Act two — the outage (ADR-014).** A later migration added the column properly — as
`INTEGER NULL`, **with no backfill**. All **59,903 existing rows** received `NULL`. Because
active horses are selected by `status = 1`, and `NULL` equals nothing in SQL, **every
pedigree, search and report query returned empty**. A total core-pipeline outage, caused by
a nullable column with no default.

**Act three — the correction.** Two statements, applied as a versioned migration:

```sql
UPDATE storehorse SET status = 1 WHERE status IS NULL;
ALTER TABLE storehorse MODIFY status INTEGER NOT NULL DEFAULT 1;
```

Every row became active; the column can no longer be null; new rows default to active. The
compatibility probe was then retired, because the condition it existed to survive was gone.
**ADR-014 supersedes ADR-006.**

The semantics are now explicit: `status = 1` means an active horse, `status = -1` means a
marketplace listing.

Three defects were found while correcting this and **recorded rather than silently fixed**,
because each is a behaviour question rather than a migration one: the two status values are
mutually exclusive partitions of the table; the horse-edit endpoint omits `status` from its
update guard; and the pedigree and progeny endpoints never filter by `status` at all.

### 11.5 The Long Term Support server migration — ADR-016

| | |
|---|---|
| **BEFORE** | MariaDB **10.11 LTS**, supported to February 2028 |
| **CHANGE** | MariaDB **12.3 LTS**, supported to **June 2029**, migrated **side by side** and never in place |
| **AFTER** | Live server line verified through the application's own adapter path: **12.3.2** |
| **WHY IT MATTERS** | The runway roughly doubled, and the migration proved the reference data survives a major server crossing untouched |

The candidates were mapped rather than assumed:

| Candidate | Support ends | Verdict |
|---|---|---|
| 10.11 LTS | 2028-02-16 | The starting point |
| 11.4 LTS | 2029-05-29 | Ends before 12.3 — no advantage |
| 11.8 LTS | 2028-06-04 | Shortest runway of the LTS options |
| **12.3 LTS** | **2029-06-12** | **Chosen** — longest maintained runway |
| 13.x | rolling | Excluded: not a Long Term Support line |

The verification was unusually thorough, and deliberately so — this is the project's data.

- A **464-line before-and-after invariant matrix**, identical except for two explained
  server-level facts: newer servers changed the default character set and collation at the
  *server* level, and the newer server exposes an alias for the transaction-isolation
  setting. Neither touches this database's own declared defaults.
- **Full-table checksums identical across all 41 tables.**
- The residual difference **byte-identical** — the same 19 statements.
- A **disposable 9-test runtime probe** through the new Prisma client: reads, pagination,
  compound unique lookups, registration, the duplicate-key error path, a `Bytes` round trip,
  an interactive-transaction rollback, and refresh-token rotation. All green.
- An **18-query production regression battery**, hash-identical between the two server
  lines.
- The cutover itself: stop the old container and rename it, bring up the canonical one on
  the new series tag with a **named** volume and the same credentials, and verify the server
  version **through the application adapter path** rather than through a database console —
  because what matters is what the application sees.
- **The rollback was tested live**, not merely documented: swapped back to the old server,
  verified, swapped forward again.

Throughout, `hbold` was **never mutated**: 59,903 horses, identical checksums, and the
`latin1` database default preserved.

One operational detail is worth knowing. The local setup deliberately does **not** ask the
server to create the database, because on newer servers the default character set changed.
The database must come from restoring the reference dump, whose creation statement carries
the correct `latin1` default explicitly.

### 11.6 Verified live state

```txt
container  hb-mysql                  image mariadb:12.3    running
container  hb-mysql-1011-rollback    image mariadb:10.11   stopped, retained
server version reported              12.3.2-MariaDB-ubu2404
```

---

## 12. Authentication and security modernisation

This is the section a future developer should read first, and the one where the difference
between the inherited system and the current one is largest.

### 12.1 What was inherited, drawn plainly

```txt
BEFORE

  browser ──── login ────► server
                             │
                             ├─ sign a token with:
                             │    SECRET from environment
                             │    ...or the literal string "your_jwt_secret"
                             │       if the environment variable is missing
                             │
                             ├─ store the refresh token IN CLEAR TEXT
                             │
                             └─ store every access token IN CLEAR TEXT
                                  in a second table

  neither table was ever read by anything
```

Six concrete faults:

1. **A guessable fallback signing secret.** If the environment variable was absent, the code
   signed with a hard-coded default. Anyone knowing that default could mint a valid session
   for any user.
2. **Refresh tokens persisted in clear text.** A refresh token is a long-lived credential.
   Anyone with a database copy had every user's credentials.
3. **Access tokens persisted in clear text too**, in a second table.
4. **Both tables were write-only.** No revocation, no audit, no reader anywhere. Pure risk,
   zero benefit.
5. **A shared API key inlined into the browser bundle** — measured at 36 occurrences across
   20 source files, and 36 across 19 files in the built public output. **30 handlers called
   the validation function and discarded its result.**
6. **A role table with a global uniqueness constraint on the role name**, so only one user
   in the entire system could hold the role `User`.

### 12.2 What replaced it — ADR-013

```txt
AFTER

  browser ──── login ────► server
                             │
                             ├─ requireJwtSecret()
                             │     absent, empty or placeholder -> THROW
                             │     no fallback exists
                             │
                             ├─ ACCESS TOKEN  (short-lived, 1 hour)
                             │     signed HS256
                             │     claims: userId, email, mobile, jti
                             │     NEVER stored anywhere
                             │
                             └─ REFRESH SESSION  (7 days)
                                   32 random bytes -> base64url -> 43 chars
                                   sent to the browser ONCE
                                   only its SHA-256 DIGEST is stored
                                   refresh_tokens.token_hash BINARY(32) UNIQUE

  refresh:  browser sends credential
            server hashes it, finds the session, and inside ONE transaction
            invalidates the old session and issues a new one
```

The design in words, for a non-technical reader:

- **An access token is a short-lived pass.** It proves who you are for one hour. It is
  signed, so the server can verify it without looking anything up — which is why it does not
  need to be stored at all. Storing it was pure liability.
- **A refresh session is a long-lived key.** It lets you get new passes for seven days
  without logging in again. The server stores only a **one-way fingerprint** of it. A
  fingerprint can confirm a key you are shown; it cannot be turned back into the key.
  **A stolen database therefore yields no usable credentials.**
- **Rotation** means each use of the long-lived key replaces it with a new one, inside a
  single all-or-nothing transaction. A reused old key is detectable rather than silently
  valid.

Specific hardening decisions:

- **No fallback secret exists.** The function that reads the signing secret **throws** if it
  is absent, empty, or still set to a placeholder. The application refuses to run insecurely
  rather than running insecurely and hoping.
- **The clear-text access-token table was dropped** by migration, under the project's
  strictest safe-deletion gate: prove nothing reads it, prove nothing writes anything anyone
  needs, prove the capability it appeared to provide is genuinely provided elsewhere, and
  only then remove. Access tokens are short-lived and stateless, so there was nothing to
  keep.
- **The role uniqueness defect was corrected**, so role names are no longer globally unique
  and more than one user can hold the same role.

### 12.3 The API trust boundary — ADR-007

The inherited "protection" was a single shared key checked by middleware. Because it was
delivered to the browser, **every visitor already had it**. It was not authentication; it
was a doorbell.

The response was not to hide the key better. It was to **classify every route** and enforce
each class on the server, where the enforcement cannot be inspected or bypassed by the
client.

All **44 routes** were classified explicitly:

| Class | Count | Meaning |
|---|---|---|
| Public reference reads | **30** | Data the site is meant to show anyone |
| Role-scoped | **5** | Requires an authenticated user holding a specific role and scope |
| Public credential exchange | **2** | Login and refresh — public by necessity |
| Public self-service | **4** | Registration and similar |
| Server-only | **2** | Never reachable from a browser |
| Authenticated | **1** | Requires a valid session, no specific role |

The binding rule is the **default**: an `/api` route that is **not classified** is treated as
**server-only** and refused before routing. A new endpoint is therefore closed until someone
deliberately opens it. That is a fail-closed design, and it is the correct one.

### 12.4 Removing security theatre — HOR-90

Numeric horse identifiers were encrypted inside URL paths using a passphrase supplied through
a **browser-visible** environment variable. The bundler inlines such variables into the
public bundle, so **the passphrase shipped to every visitor**. The encryption protected
nothing from anyone who had loaded the page — which is everyone.

It was worse than useless in a second way: the ciphertext was **not even stable**. Each call
derived its key over a fresh random salt, so the same horse produced a different URL every
time.

It was removed. The canonical URL is now the plain numeric public identifier, for example
`/pedigree/erne-alert/1003`. This was safe because it was confirmed that **the application
has never been deployed publicly**, so no external URL contract existed to break.

The removal was thorough and it closed a real bug along the way:

- **13 URL producers** dropped the encryption call.
- **9 route consumers** replaced decryption with a new identifier parser that validates the
  value against a strict numeric pattern and confirms it is a safe integer. This closed a
  genuine hole: the previous permissive parsing accepted `12abc` as the number 12.
- The invalid-identifier sentinel remained byte-identical, so downstream behaviour did not
  shift.
- The emitted artefacts were then **measured**: across the **261 files** of built public and
  server output, **zero occurrences** of the passphrase variable, the crypto library, its
  ciphertext envelope marker, or either function name.

### 12.5 Other security corrections

| Correction | Work item | What changed |
|---|---|---|
| Credential transport | HOR-98 | An endpoint accepted a password in the URL query string and returned the stored password hash in its response. Both removed |
| Status-message rendering | HOR-99 | API status messages were rendered as HTML. They are now rendered as **text**, closing a script-injection path |
| Registration atomicity | HOR-77 | Registration became a single all-or-nothing transaction |
| Internal error leakage | HOR-78 | Raw internal errors stopped being returned to clients |
| Server-rendered error payload | HOR-118 | Investigated and remediated framework error information exposed in the production server-rendered payload |
| Identifier validation | HOR-103 | Horse identifiers are validated **before** they reach the database layer |
| Recursion bound | HOR-107 | The pedigree selection depth is bounded, closing a request that returned a stack-overflow error |

### 12.6 Standing security rules

- Authentication is enforced on protected endpoints, **server-side**.
- Request bodies, parameters, query strings and uploads are validated. **Excel and Word input
  is never trusted.**
- Credentials are never hard-coded and never logged — not tokens, not database URLs, not
  private document contents.
- Internal stack traces are never returned to a client.
- Database errors are never hidden behind empty responses. **Missing, ambiguous and
  conflicting data must be explicit.**
- Real client documents live under an ignored private directory. They are never placed in
  public directories, never committed, and never quoted in documentation — including in this
  report.

---

## 13. HTTP contract, authorization and error handling

A cluster of work items turned the API from something that *reported* failures into
something that *signals* them.

### The problem

HTTP has status codes for a reason. `200` means success. A client — a browser, a script,
a monitoring tool, a future integration — decides what to do based on that number.

The inherited application returned **`200` with a failure described in the body**. Every
caller had to parse the body to discover the request had failed, and any caller that did not
treat failure as success.

### The corrections, in order

| Work item | Released in | What it fixed |
|---|---|---|
| HOR-56 | 1.1.0 | Classified `/api` access and enforced it server-side |
| HOR-95 | 1.3.3 | Role and scope authorization now returns **401** and **403** |
| HOR-96 | 1.3.4 | **Truthful HTTP status codes** — every handler that signalled failure in the body now throws |
| HOR-98 | 1.3.5 | Removed credential transport in URLs and responses |
| HOR-99 | 1.3.6 | API status messages rendered as text, not HTML |
| HOR-107 | 1.3.7 | Bounded the pedigree recursion that produced a 500 |
| HOR-103 | 1.3.8 | Validate horse identifiers before they reach the database layer |
| HOR-111 | 1.3.9 | Removed a request field the endpoint never read |
| HOR-108 | 1.3.10 | Report the real upstream failure instead of crashing on an undeclared variable |
| HOR-116 | 1.3.11 | Report a failed pedigree lookup instead of swallowing it; refuse a malformed search instead of answering 500 |
| HOR-119 | 1.3.12 | Removed an error state nothing read; read the route page as a number so paging advances by one |

### The contract now

The expected status codes are explicit:

```txt
400  the request is malformed
401  no valid session
403  authenticated, but not permitted
404  the thing does not exist
409  a conflict with existing state
422  the request is well-formed but the values are not acceptable
500  the server failed
```

The body still carries a status field for existing callers. What changed is that **the
transport status is now the truth**.

### Two related principles

**Do not hide database errors.** A missing row, an ambiguous match and a conflicting record
must each be visible as itself. An empty result that means "not found", "you are not allowed"
and "the query crashed" indiscriminately is worse than an error, because nobody can tell
which happened.

**Do not leak internals.** Truthful *to the client* means the correct status code and a
message a human can act on — not a stack trace, not a database error string, not an internal
path.

### One deliberate loose end

The shared error helper still carries wording that does not match its own status: the
fallback branch correctly returns a **500** while telling the caller "Bad request", and the
deliberate-error branch carries an internal-server-error message on what is usually a 400.

Both strings **predate** the truthful-status work and were **kept unchanged on purpose**, so
that no user-facing copy shifted inside a transport fix. It is tracked as **HOR-101**, and
the wording is to be decided with Marcus's reading in mind rather than an engineer's.

---

## 14. Stripe and payments modernisation

### The trust-boundary defect

The single most important fact about the inherited payment code:

> **The browser told the server how much money to charge.**

A modified request could set any price. The user interface offered plans; the server obeyed
whatever number arrived.

### What changed — ADR-010

```txt
BEFORE                                AFTER

browser: "charge 4900"          browser: "tier 1, monthly"
   │                                │
   ▼                                ▼
server: charges 4900            server: looks up tier 1 in its OWN catalogue
                                        computes the amount itself
                                        IGNORES any amount the client sent
```

**The server owns the amount. Permanently.** The client names a plan; the server decides
what that plan costs.

Alongside it:

- The Stripe API version is **pinned**, so the payment provider cannot change behaviour
  underneath the application without a deliberate upgrade.
- The hard-coded test payment-method token was removed.
- Error logging was narrowed. Logging the whole provider error object had been printing a
  field containing the payment's client secret.
- Three copies of the price existed. **The copy that computed the charge was removed.** Two
  display copies remain and are recorded as pre-existing duplication rather than fixed inside
  a payments work item.

### How it was proven

The trust boundary was demonstrated **end to end**, which is stronger than asserting it.

A request was sent carrying a deliberately dishonest payload — tier 1, monthly, **amount 1**,
currency usd, plan name "free". The resulting charge was **4900 minor units in EUR, Pro
Access**. The client's numbers were ignored exactly as designed.

Refusals were exercised too: **400** for a malformed tier, and **422** for an uncatalogued
tier, an unknown frequency, and a capitalised frequency value.

Key handling was audited **by structure, never by value**: both keys present, both in TEST
mode, and the built client bundle scanned across **263 files** for a secret key — **zero
occurrences**. All interaction was in TEST mode; no live key, no real card, no live charge,
and client secrets were never logged.

The test suite moved from **62 to 100 tests** across this work, all written RED before GREEN.

### What deliberately did **not** change

This is important, because it is a live product contradiction rather than a technical debt
item.

**The user interface sells *Monthly* and *Annually* subscriptions. The implementation creates
a one-time charge.** There is no customer record, no subscription, no checkout session, no
webhook, and no persistence of who paid for what. Nothing recurring exists behind a recurring
offer.

That was left untouched **on purpose**: closing it is a product decision about what is being
sold, not a technical fix to smuggle into a modernisation work item. It is tracked as
**HOR-73** and is **open**.

Also unchanged: no idempotency key on the payment call, no schema or database change, and
card payments only.

### What the verification does not cover — stated plainly

**No card was typed into the payment form in a real browser.** The final confirmation step
that happens between the browser and Stripe is therefore **not** covered by an end-to-end
browser run. Everything up to it is.

Current versions: `stripe` **22.5.0** (server), `@stripe/stripe-js` **9.14.0** (browser).
---

## 15. Dependency cleanup and safe deletion

Some of the highest-value work in this project was **deletion**. A dependency the project
does not use still ships advisories, still constrains upgrades, still has to be audited, and
still confuses whoever reads the manifest next.

### The safe-deletion gate

No dependency was ever removed because it "looked unused". Every removal proved:

1. **Zero consumers**, across source files, generated build output *and* version-control
   history — never by a literal name search, which proves nothing.
2. **No advisory, licence or capability** depends on it.
3. **No persisted data** depends on it — and where data was touched, the gate was raised.
4. The **lockfile change is fully attributable**: every entry that disappeared is accounted
   for.

### What was removed, and what it bought

| Removed | Work item | Evidence and consequence |
|---|---|---|
| Deprecated PrimeVue Nuxt module | HOR-55 | Dragged a second, older major of the same library into the tree. Package count fell by exactly two |
| Icon font package | HOR-59 | Its next major **relicensed from open source to commercial**. Neither adopting the licence nor pinning to retain the old one was acceptable, and the package was proven unused |
| Environment-file loader | HOR-60 | The framework already loads environment files. A redundant direct dependency plus its single consumer |
| Content module | HOR-67 | A four-layer audit proved it served **zero documents**. Removed rather than migrated to a version requiring an embedded database and connector infrastructure |
| Two browser PDF generators | HOR-85 | Their shared chain carried **2 critical, 7 high and 3 moderate** advisories. All erased. The live export path is the browser's own print function plus a DOCX writer |
| Rich-text editor and wrapper | HOR-86 | **Dead on arrival** in the baseline commit. The lockfile lost exactly the **31-entry** closure. Verified that no persisted content holds that editor's document format or its markup classes |
| Legacy polyfill layer | HOR-87 | Three packages, each proven independently. Before removal exactly one built chunk contained the polyfill *registering itself*, **zero chunks called it**, and there were **zero** of the transformations it exists to support. The lockfile lost exactly the eight-entry closure |
| PrimeVue itself | HOR-89 | **228 lockfile-inclusive deletions, zero additions, 19 packages out of the store.** Build size **byte-identical** |
| URL encryption library | HOR-90 | Security theatre — see section 12.4 |
| HTTP client library | HOR-93 | Every call site had already moved to the framework's own fetch |
| Form-validation module, style-processing declaration, file-storage module | HOR-93 | Each zero-consumer gated |

### Two removals worth reading twice

**PrimeVue was removed rather than migrated (HOR-89).** The plan had scheduled a major
upgrade. Re-validating at stage start — as the rules require — found that **the next major
is no longer open source**: the library, its framework module and its theme package had all
moved to a commercial licence. That changed the question from *"how do we upgrade?"* to
*"do we want this at all?"*

An exhaustive audit then proved **zero consumers**: the generated component manifest
contained only the router's own two components. Every piece of wiring was dead. The result
was 228 deletions, zero additions, and a **byte-identical build size** — the clearest
possible proof that nothing was lost.

**The polyfill removal shows what "proven" means (HOR-87).** It would have been easy to
grep for the polyfill's name, find one hit, and conclude it was used. Instead the **built
artefact** was measured: the one occurrence was the polyfill registering *itself*, and
nothing anywhere called it. That distinction is the difference between a safe removal and a
production outage.

### One deliberate keep, fully reasoned — HOR-123

`vue3-carousel` stays on the **0.4** line while **0.17** exists. This is a decision, not an
oversight, and the evidence for it was gathered in a disposable environment:

- **No security advisory names the package.** This is not a security-forced upgrade.
- Enabling continuous scrolling emits **clone slides**, which changes what a slide index
  means — and the live consumer is a **thumbnail strip** bound directly to slide index.
- The upstream recipe for that pattern moved to a different mechanism entirely.
- Slide height became required configuration; navigation-button metrics changed; the newer
  stylesheet uses native CSS nesting.
- **There is no automated visual coverage** for the affected component, and the live consumer
  is customer-facing.

The issue record is explicit on two points, and both are preserved here: **the migration is
not impossible and must not be described as such**; and a second carousel component that
*appears* to have no consumer **must not be classified for deletion on that basis** — zero
observed consumers is not deletion authorisation.

### One legitimate transitive, recorded so nobody "cleans" it

An older major of a fetch library remains in the tree. It is **not** application code — it
arrives through the build toolchain's own dependency chain. Removing it would mean removing
the framework. It is recorded here precisely so a future cleanup sweep does not mistake it
for leftovers.

---

## 16. Security advisory outcome

### Where it started and where it is

```txt
Stage J start   ────►   8 advisories   (7 high, 1 moderate)
Stage J end     ────►   1 advisory
```

Most of that reduction came from **deletion, not upgrading**. The two browser PDF generators
alone carried a chain with 2 critical, 7 high and 3 moderate advisories, and removing them
erased every one. The rest came from refreshing transitive chains during the closing sweep.

### The one that remains — an ACCEPTED RISK

| Fact | Value |
|---|---|
| Package | `deepmerge-ts` |
| Version | 7.1.5 |
| Reached through | `@prisma/config` |
| Why it cannot be moved | `@prisma/config` declares it at an **exact** version. No lockfile refresh can move it |
| Where it runs | **Toolchain only** — absent from both the client and the server build output |
| What it actually merges | The repository's **own versioned configuration file**, and nothing else |

The reasoning is worth stating plainly, because "one advisory remains" sounds worse than it
is.

The vulnerable code is a deep-merge utility. In this project the only object graph it ever
merges is a configuration file that lives in the repository, under version control, written
by the team. There is no path by which untrusted input reaches it. It is not shipped to
browsers and not present in the deployed server bundle.

**It is upstream-blocked.** The fix has to come from the package that pins it.

The decision was to **accept the risk explicitly rather than silence it** — no override, no
ignore entry, no pinning trick that would make the report look clean while the package
stayed exactly where it is. A silenced advisory is one nobody revisits. An accepted one has a
reason attached and a name to check against when the upstream package moves.

---

## 17. Testing and quality system

### From almost nothing to a real gate

| Point in time | Test files | Tests |
|---|---|---|
| Earliest recorded baseline | 3 | 28 |
| After the contained data-layer stage | 4 | 61 |
| After the payments stage | — | 100 |
| Before the driver-adapter migration | 34 | 425 |
| **Verified today** | **36** | **438** |

The last row was **run, not remembered**, on 2026-08-25:

```txt
$ pnpm test
 RUN  v4.1.11
 Test Files  36 passed (36)
      Tests  438 passed (438)
   Duration  14.57s
```

### How the harness is built

**Vitest** is the test runner. It runs headless, from **one command**, in **two isolated
projects**:

| Project | File suffix | Purpose |
|---|---|---|
| **node** | `*.test.ts` | Pure, framework-free logic |
| **nuxt** | `*.nuxt.test.ts` | Tests that genuinely need the framework runtime |

The naming convention **is** the routing mechanism: the suffix is the single switch that
sends a file to exactly one project. There is no separate registry to keep in sync, so the
two cannot drift apart. Of the 36 files, **4** are framework tests.

A browser-environment simulator is installed; a second, heavier alternative is
**intentionally not** installed, so there is one way to do this rather than two.

Test files live **beside the code they protect**. A utility and its test sit in the same
directory, so a reader finds the contract next to the implementation, and a deletion that
removes one and not the other is immediately visible.

**Component and unit tests never connect to the real database.**

### The development discipline

**RED → GREEN → REFACTOR → QUALITY** is mandatory in the areas where a silent defect would
corrupt the product's output:

```txt
Word parser logic
Identity resolution
Canonical write-up rules
Pedigree and report assembly
Data migrations
Compatibility fixes affecting queries
```

The rules attached to it are what make it real: no implementation code without a concrete
failing test in those areas; tests derive from written acceptance criteria, **not from
imagination**; tests cover happy paths, edge cases, error states and regression risks; no
test calls an external network or a production service; and **real client documents are never
used as fixtures**.

### The gates

**Locally**, before any work item can be marked complete:

```txt
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

**In Continuous Integration**, the required check is named `Test / Build`. It runs on the
Pull Request event into each permanent branch, on a 15-minute timeout, with a
cancel-in-progress concurrency group and read-only repository permissions.

Two rules are binding and both exist because both have been tested by reality:

- **"No checks reported" is never a passing check.**
- **A manually triggered run is not merge authorisation.** It does not satisfy the repository
  ruleset. This was enforced during a real GitHub platform incident that dropped
  workflow-triggering events — no ruleset was relaxed, no administrative merge was used, and
  no artificial commit was created to trigger the build.

> **Reported honestly:** `lint` and `typecheck` scripts are **not configured** in this
> project. No claim is made in this report that either ran, because neither exists.

### The dependency-modernisation gate

Any framework or dependency version change must pass a heavier gate. **Automated:** frozen
install, both projects, the complete suite with **no reduction** in file or test count
against its own pre-change baseline, the production build, and a whitespace check — with the
required check green in **every one of the three promotion Pull Requests**.

**Manual regression** is described in the next section.

**Presentation regression**, where an upgrade can change appearance: capture the built
stylesheet before and after and compare **values, not versions**; compare rendered class
attributes route by route; and **state what the evidence does not cover**. Comparing served
HTML is explicitly insufficient here, because this project links its stylesheet rather than
inlining it.

---

## 18. Core product regression protection

Every dependency upgrade in this project is checked against **one real horse**.

### The regression, exactly as it runs

```txt
search "ERNE ALERT"     -> 1 row, horse_id 1003, birthyear 1997
sire                    -> ABLE ALBERT
dam                     -> SPRINTER
known ancestors         -> ABWAH, POLLY PEACHUM, ikt, UNKNOWN IKT
maternal line via dam   -> SPRINTER -> UNKNOWN IKT
mare line               -> first ancestor UNKNOWN IKT, 17 descendants
progeny                 -> 4 foals for SPRINTER; 0 for ERNE ALERT (correct)
storehorse.status error -> absent
```

Later runs, after the pedigree work matured, recorded **13 distinct ancestors** in the
pedigree view and **30 names** returned by the maternal line.

### Why one horse is enough

It is not one horse. It is **one horse chosen because it exercises the whole chain**:
identity resolution by name, the paternal relation, the maternal relation, multi-generation
traversal, maternal-family grouping, offspring lookup, and the compatibility behaviour that
caused a total outage once already.

If ERNE ALERT resolves correctly, the pipeline that the product depends on is intact. If it
does not, something fundamental broke — and the developer finds out **before** the change
reaches the stable branch, not after.

### Three binding rules about it

**It is run before and after, and the captures are compared.** Not "checked that it still
works" — compared, counter by counter. Several stages recorded results as identical *node
counts* precisely because that is a stronger claim than "it looked fine".

**It runs locally, never in Continuous Integration.** The automated build must never connect
to the local reference database.

**Its data is never turned into fixtures.** The reference database is real client data. It
stays out of the repository and out of the automated build. This is a privacy rule, not a
convenience one.

### What it proved

The status-column outage — 59,903 rows silently returning nothing — is exactly the class of
failure this regression exists to catch. Every stage since has confirmed explicitly that
**"the `storehorse.status` error did not return."**

---

## 19. Report and pedigree domain logic

### What exists today

The application already renders pedigrees, and the endpoints and components that do it are
inventoried:

| Endpoint | Role |
|---|---|
| `pedigree.post.ts` | The pedigree table |
| `pedigree-detail.post.ts` | Detail behind a pedigree entry |
| `family-tree-of-horse-by-id.post.ts` | Family-tree traversal |
| `familyHorseStore.post.ts` | Family data assembly |
| `mareline.post.ts` | Maternal-family traversal |
| `progeny.post.ts` | Offspring lookup |
| `report-horses-ids.post.ts` | Multi-horse report assembly |

| Component | Role |
|---|---|
| `Pedigree.vue`, `PedigreeCard.vue`, `PedigreeDetail.vue` | Pedigree rendering |
| `HorseFamilyTree.vue`, `GenerateHorseFamilyTree.vue` | Family-tree rendering |
| `MarelineTree.vue` | Maternal-family rendering |
| `RecursiveCompetitionHistory.vue` | **The closest existing analogue to the write-up rendering the product needs** |

That last row is the key architectural observation of the inventory: the shape of what the
product must build already exists in the application, in a component that renders nested
history recursively.

### The rules any implementation must obey

- Ancestry comes from `dam_id` and `sire_id`. **Never from matching name text.**
- The maternal line is traversed through `dam_id`. The maternal-family grouping field is a
  label, not the chain.
- **A missing identifier for a distant descendant is not an extraction error.** It must not
  trigger the creation of a speculative horse record. Horses absent from the database may
  legitimately remain **text-only descendants**.
- `(SEE ABOVE)` is a **reuse reference**, not new content.
- A mare has **at most one** canonical write-up, keyed to her `horse_id`.
- Conflicting write-ups are **preserved as variants and queued for review**, never
  overwritten.

### What has been corrected in this area

Three defects in the existing pedigree code were found and fixed:

- **HOR-107** — the pedigree selection recursed without a bound and returned a
  stack-overflow error as a 500. The depth is now bounded.
- **HOR-103** — horse identifiers reached the database layer unvalidated and crashed a
  conversion helper. They are now validated first.
- **HOR-116** — a failed pedigree lookup was swallowed instead of reported.

### What is still broken here — and it is honest to say so

**HOR-110** is open. Measured against a local production build with a non-existent horse
identifier:

```txt
/api/pedigree                     200  "[[]]"     correct
/api/familyHorseStore             200  "[]"       correct
/api/pedigree-detail              200             correct
/api/mareline                     500  Error: No horse found with dam_id: null
/api/family-tree-of-horse-by-id   500  same error
```

Two endpoints carry **private copies of the same ancestor-finding helper** that `throw`
where the others return an empty result. A **third copy** exists in the report-assembly
endpoint and must be audited in the same work item.

This is not the unbounded-recursion defect that HOR-107 fixed. It is a separate,
still-open inconsistency in how "no ancestor" is expressed — and it sits directly in the
maternal-line traversal the product depends on.

---

## 20. Automation MVP functional requirements — status

This is the section that matters most for expectation-setting, and it is the one this report
is most careful about.

The requirements document defines twelve functional requirements. **Every one of them is
currently NOT IMPLEMENTED.**

That is not an inference from reading code. It is the state of the work tracker:

| EPIC | Title | Status |
|---|---|---|
| HOR-1 | EPIC 0 — Foundation & Setup | **Done** |
| HOR-6 | EPIC 1 — Database Redesign & Migration | **Backlog** |
| HOR-10 | EPIC 2 — Word Extractor | **Backlog** |
| HOR-15 | EPIC 3 — Report Generation | **Backlog** |
| HOR-19 | EPIC 4 — Review UI & Modern UX | **Backlog** |
| HOR-23 | EPIC 5 — Hardening & Handover | **Backlog** |

Every child of EPICs 1 through 5 is also in Backlog. **All delivered work to date sits under
EPIC 0**: foundation, the ten modernisation stages, the security programme, the HTTP contract
corrections, and the bug fixes.

### Requirement by requirement

| Req | What it requires | Status |
|---|---|---|
| **FR-001** | Import a Word catalogue and produce an extraction report — document identifier, horses and sections detected, entries parsed, entries skipped, unsupported structures, ambiguous references, conflicts, errors — modifying no source file | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-002** | Parse dam sections (1st through 5th Dam and deeper), retaining heading, source order and a raw source reference | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-003** | Parse write-up entries: horse name, discipline, competition height and level, birth year, rider, country, event year, placing, event name, class, approval and studbook, `dam of:`, `(SEE ABOVE)`, `etc.` | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-004** | Resolve horse identity by cascade: normalised exact name → birth year → sire name → dam name → human review | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-005** | Create canonical write-ups: at most one per resolved mare; conflicts preserve all variants, create a review item, and never overwrite silently | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-006** | Preserve provenance: source document, section, position reference, extraction run, import timestamp, parser version | **NOT IMPLEMENTED** — EPIC 2 Backlog |
| **FR-007** | Assemble a horse report | **NOT IMPLEMENTED** — EPIC 3 Backlog. *Pedigree assembly exists in the application and is exercised by the regression; report assembly per this requirement does not* |
| **FR-008** | Generate a professional PDF, visually validated by Marcus, avoiding silent truncation | **NOT IMPLEMENTED** — EPIC 3 Backlog. *A DOCX export path and the browser print path exist; neither is this requirement* |
| **FR-009** | Import an auction Excel — name, age, sire, dam, colour, sex — preview rows, match to the database, queue not-found and review cases, **never silently drop a row**, produce batch PDFs | **NOT IMPLEMENTED** — EPIC 3 Backlog |
| **FR-010** | Review queue for missing, ambiguous and conflicting cases | **NOT IMPLEMENTED** — EPIC 4 Backlog |
| **FR-011** | Search and horse detail | **TO BE REVALIDATED IN FUNCTIONAL ROADMAP CHECKPOINT.** Search and horse detail **exist and work** in the application, and are exercised by the regression. Whether they satisfy this requirement as written has not been formally assessed against its acceptance criteria, and its EPIC is Backlog |
| **FR-012** | Repeatable ingestion — idempotent, resumable, auditable, safe to re-run | **NOT IMPLEMENTED** — EPIC 2 Backlog |

### The honest summary

The **platform** is modern, secure, tested and releasable. The **product** — the Word
extraction, the canonical write-up library, identity resolution, the review queue and batch
PDF generation — **has not been built yet.**

Those two sentences must be read together. Neither is the whole story, and neither should be
allowed to imply the other.

Two supporting facts show why the foundation work was not a detour. The
`competition_history` table has the right shape and holds **≈ 454 rows** — it is essentially
empty, and filling it from the Word archive is the core work. And the data recency question
(**HOR-32**) is **BLOCKED awaiting Marcus**: whether a database copy newer than approximately
2024 exists is **UNKNOWN**, and that answer shapes EPIC 1.
---

## 21. Release and Git workflow

### Three permanent branches

```txt
issue branch  ──►  DEV  ──►  QA  ──►  main
   (one per         │        │         │
    work item)      │        │         └─ stable, releasable
                    │        └─ functional and technical validation
                    └─ development integration
```

`DEV`, `QA` and `main` are **permanent**. They are never deleted, locally or remotely. **None
accepts a direct commit or a direct push.** No force push. No rewritten history.

Every step is a Pull Request. **No stage may be skipped.** There is no path from an issue
branch to `main`, and none from `DEV` to `main`. A hotfix branches from `main` and is
**back-propagated to `QA` and `DEV` by Pull Request** — it is never left only in `main`.

Each branch carries its work item identifier in its name, and **every commit message
includes it**. That is what makes it possible, months later, to ask why a line changed and
get an answer.

### Merge commits only — and why this is not a style preference

**Squash merge and rebase merge are forbidden.**

The reason is mechanical. Squashing rewrites a branch's commits into a *new* object that does
not exist on the source branch. The branches then diverge on identity rather than on content,
and **every later promotion reports phantom differences** — changes that are already present
but look absent. The release tool also reads conventional commits, and squashing destroys the
individual commits it needs.

A related rule follows from the same reasoning: **the three branches are not required to
share a commit hash.** Each promotion produces its own merge commit, so different hashes
across `DEV`, `QA` and `main` are the **normal, expected state**. Containment is verified by
ancestry, never by hash equality, and an empty commit is **never** created to make hashes
match.

Direct alignment between permanent branches is forbidden in every form — no fast-forward
push between them, no direct reference update through the platform API, and no reset on a
permanent branch.

### Continuous Integration as the real gate

The required check is named **`Test / Build`**. It runs on the Pull Request event into each
permanent branch. Only two workflows exist in the repository: the build check and the release
tool.

The build step chain is deliberately minimal: check out, set up the package manager **with no
version input** so it reads the pinned value from `package.json`, set up the runtime with a
dependency cache, install with a frozen lockfile, run the tests, run the build.

**Automatic closure by a Git integration is not acceptance evidence.** If an integration moves
a work item to Done, every acceptance criterion is verified independently, and the item is
returned to In Progress if any is incomplete.

### Releases

Release Please runs on the stable branch, reads the conventional commits, and opens a release
Pull Request carrying the version bump and the generated changelog. When a **human** merges
it, the tag and the release are created.

Four rules bind it: it targets `main`; it must pass `Test / Build` like any other change; it
is reviewed and merged **manually**; and it must never bypass Continuous Integration or branch
protection.

> **It is never merged without explicit authorisation from Sammy.**

After a release merges, **back-propagation is mandatory before the next promotion**. The
platform's own "update branch" button cannot do it — it is refused because the required check
is expected. The only route is a branch from `QA`, a merge of `main` into it, and a Pull
Request; then the same two steps from `QA` to `DEV`.

### The release record

Nineteen releases, from **1.0.0 on 2026-07-22** to **1.3.14 on 2026-08-24**, every tag
present.

| Version | Date | Headline |
|---|---|---|
| 1.0.0 | 2026-07-22 | Server configuration fix (HOR-31); status compatibility layer (HOR-35) |
| 1.1.0 | 2026-08-09 | **Classify `/api` access and enforce it server-side** (HOR-56) |
| 1.2.0 | 2026-08-13 | **Adopt Tailwind 4 native visual defaults** (HOR-70) |
| 1.2.1 | 2026-08-13 | **Move payment amount authority to the server** (HOR-72) |
| 1.3.0 | 2026-08-15 | **Modern access tokens and rotating digest-only refresh sessions** (HOR-76); migration baseline and InnoDB foundation (HOR-79); atomic registration (HOR-77); stop raw internal errors (HOR-78); password capacity reconciliation (HOR-74); schema defaults (HOR-80) |
| 1.3.1 | 2026-08-15 | Widen the height column (HOR-82) |
| 1.3.2 | 2026-08-19 | **Backfill `storehorse.status` and retire the capability probe** (HOR-94) |
| 1.3.3 | 2026-08-21 | Return 401 and 403 from role and scope authorization (HOR-95) |
| 1.3.4 | 2026-08-22 | **Truthful HTTP status codes** (HOR-96) |
| 1.3.5 | 2026-08-22 | Remove credential transport in URLs and responses (HOR-98) |
| 1.3.6 | 2026-08-22 | Render API status messages as text, not HTML (HOR-99) |
| 1.3.7 | 2026-08-22 | Bound the pedigree recursion (HOR-107) |
| 1.3.8 | 2026-08-22 | Validate horse identifiers before they reach the data layer (HOR-103) |
| 1.3.9 | 2026-08-22 | Drop an inert request field (HOR-111) |
| 1.3.10 | 2026-08-22 | Report the real upstream failure (HOR-108) |
| 1.3.11 | 2026-08-23 | Report a failed pedigree lookup; refuse a malformed search (HOR-116) |
| 1.3.12 | 2026-08-23 | Remove an error state nothing read; fix search paging (HOR-119) |
| 1.3.13 | 2026-08-24 | Order the post-install steps correctly (HOR-91) |
| **1.3.14** | **2026-08-24** | **Refresh vulnerable transitive dependencies** (HOR-93) |

The v1.3.14 cycle is **fully closed**: the release Pull Request was merged manually by Sammy
into `main` on 2026-08-25, and back-propagated `main` → `QA` → `DEV` under HOR-122.

### A known defect in the release notes themselves — HOR-97

The generated changelog **lists the same fix more than once per release**. This is a real,
open defect, and it is honest to name it in a report that quotes that changelog.

The root cause is precise: the platform places a Pull Request's **title** into the merge
commit's **body**, and the release tool parses the body of a `Merge pull request #N from …`
subject as if it were the real conventional commit. The duplication count therefore equals how
many of the four commits in a promotion chain carry a conventional subject **or** body.

It has been systematic since 1.1.0. In 1.3.0, two entries appear **four times each**. Release
1.3.2 was clean **by accident** — its Pull Requests happened to be titled in prose.

Two constraints are recorded on the fix. **It is not to change the merge method** — that
would trade a cosmetic defect for the branch-divergence problem section 21 exists to prevent.
And **historical changelog entries must not be rewritten.**

---

## 22. Architecture Decision Records — summary

Sixteen records. An accepted record is binding until **superseded by another record** — never
by an edit to the original.

| ADR | Decision | Why | Current effect |
|---|---|---|---|
| **ADR-001** | Adopt and modernise the existing application. **Never rewrite** | The project stalled on missing *data* transformation, not on an inadequate front end. A rewrite would have destroyed working software without touching the real problem | **Binding and foundational.** Every stage of the programme exists because of it |
| **ADR-002** | Stay in the MySQL/MariaDB family; **keep existing table and column names** | The reference dump only restores against these names. Renaming means touching every query, model and migration at once | **Binding.** Odd names such as `diciplinevalues` are a compatibility contract, not a style choice |
| **ADR-003** | **Preserve the Prisma schema.** Absence from the reference database is drift, not obsolescence | Eleven models existed only in code. Deleting them would have deleted working capability | **Binding.** Schema-introspection pull against the versioned schema is forbidden; removal requires a full evidence gate |
| **ADR-004** | **pnpm is the only package manager**, pinned in one place | A second declaration of the version drifts from the first | **Binding.** The Continuous Integration setup step takes no version input; it reads the pinned value |
| **ADR-005** | **Canonical mare write-up library** — one approved write-up per mare, reused across her line | ≈37% of a real catalogue was duplicated text; `(SEE ABOVE)` appeared 19 times | **Binding and not yet built.** It is the core product design; EPIC 2 is Backlog |
| **ADR-006** | Runtime compatibility layer for the missing `storehorse.status` column | Every query filtering on it failed with an unknown-column error against a database that could not be changed | **SUPERSEDED BY ADR-014.** The probe is retired |
| **ADR-007** | **Classify every `/api` route and enforce access server-side** | The shared key was inlined into the browser bundle — 36 occurrences across 20 source files — and 30 handlers discarded the validation result | **Binding.** 44 routes classified; an unclassified route defaults to **server-only** and is refused |
| **ADR-008** | **A framework major migration never doubles as a directory reorganisation** | A diff of hundreds of renames hides the lines that actually changed the framework; regressions become unattributable | **Binding.** The repository structure stays flat by supported configuration; the framework's compatibility-version shim was rejected |
| **ADR-009** | Adopt Tailwind's first-party build integration; **a version upgrade does not change the design** | 35 of 43 palette tokens shifted, mean ΔE 4.22, worst 16.08 — none of it in the upgrade guide | **Binding.** The compatibility layer was retired by HOR-70 (142 lines deleted); native defaults are now official, and the baseline moves with an adopted default |
| **ADR-010** | **The server owns the payment amount**; the provider API version is pinned | The browser previously told the server what to charge | **Binding.** Proven end to end: a dishonest client payload produced the catalogued price |
| **ADR-011** | Reconcile **capacity drift** through versioned SQL patches | A `varchar(50)` password column against a 60-character hash rejected **every** registration | **Binding.** Patches live under `db/patches/`, reviewed like code |
| **ADR-012** | **Migration baseline plus staged storage-engine modernisation** | No migration history existed; the database could not be rebuilt reproducibly | **Binding.** The baseline preserves all 24 MyISAM tables; Wave 1 converted exactly one table |
| **ADR-013** | **Stateless short-lived access tokens; rotating digest-only refresh sessions** | Tokens were signed with a guessable fallback and persisted in clear text in two write-only tables | **Binding.** 1-hour access tokens never stored; only a SHA-256 digest of the refresh credential persisted; the clear-text table dropped by migration |
| **ADR-014** | **Backfill `storehorse.status` and retire the compatibility probe** | A nullable column with no backfill left all 59,903 rows `NULL` and produced a total core-pipeline outage | **Binding. Supersedes ADR-006.** The column is `NOT NULL DEFAULT 1` |
| **ADR-015** | **Prisma 7 driver-adapter architecture**; preserve the per-request client topology | The new major needs an explicit adapter; changing connection topology inside a major upgrade would make regressions unattributable | **Binding.** Pool set to previous-version parity; the per-request shape is a recorded known characteristic, not a hidden one |
| **ADR-016** | **MariaDB 12.3 LTS, migrated side by side** | 12.3 is maintained to 2029-06-12, the longest runway of the LTS candidates | **Binding.** The pre-migration environment is retained as a stopped container; its retention is an explicit review trigger |

Two supersession facts matter and are stated once, clearly: **ADR-014 supersedes ADR-006.**
No other record in this set is superseded.

---

## 23. Milestone timeline

Curated — the changes that altered what the system *is*, not every work item.

| Date | Work item | Milestone |
|---|---|---|
| — | HOR-2 (US-001) | **Project bootstrap.** The application adopted rather than rewritten |
| — | HOR-27 (US-001b) | **pnpm standardised** as the only package manager |
| — | HOR-4 (US-002) | **Local reference database restored** — 59,903 horses available for real regression |
| — | HOR-3 (US-003) | **Test harness established** — Vitest, two isolated projects |
| — | HOR-5 (US-004) | **Security baseline** |
| — | HOR-35 | **Status compatibility layer** — the application runs against a database missing a declared column |
| — | HOR-38, HOR-39, HOR-40 | **Promotion workflow, real Continuous Integration checks, branch protection** |
| — | HOR-41 | **Release Please adopted** |
| — | HOR-46, HOR-47 | **Test harness hardened; the testing strategy written** |
| 2026-07-22 | — | **Release 1.0.0** |
| — | HOR-48 (US-055) | **The 2026 dependency modernisation audited and planned** — the origin of Stages A to J |
| — | HOR-42 | **Stage A** — Continuous Integration tooling |
| 2026-08-08 | HOR-50 | **Stage B** — runtime and package manager moved to supported lines |
| — | HOR-54 | **Stage C** — 25 dependency floors raised; the runtime range declared and enforced |
| — | HOR-55 | **Stage D** — the deprecated framework module removed; **the inlined API key discovered** |
| 2026-08-09 | HOR-56 | **Release 1.1.0 — the API trust boundary.** 44 routes classified and enforced server-side (ADR-007) |
| — | HOR-58 | **Stage E** — Prisma client major, schema byte-identical |
| — | HOR-59 … HOR-64 | **Stage F** — six contained library majors; **two removed rather than upgraded** |
| — | HOR-67, HOR-68 | **Stage G — the pivot.** Nuxt 4 crossed in a three-line source diff; **ADR-008** written |
| — | HOR-69 | **Stage H** — Tailwind 4 through its first-party integration; **ADR-009** written |
| 2026-08-13 | HOR-70 | **Release 1.2.0 — Tailwind 4 native defaults adopted**, compatibility layer deleted (142 lines) |
| 2026-08-13 | HOR-72 | **Release 1.2.1 — Stage I.** Payment amount authority moved to the server (**ADR-010**) |
| 2026-08-15 | HOR-74, HOR-76 … HOR-80 | **Release 1.3.0 — the authentication rebuild.** Modern access tokens and rotating digest-only refresh sessions (**ADR-013**); migration baseline and InnoDB foundation (**ADR-012**); capacity reconciliation (**ADR-011**) |
| 2026-08-15 | HOR-82 | **Release 1.3.1** — height reconciled; the residual difference falls from 20 statements to **19** |
| 2026-08-17 | HOR-83 | **Stage J authorised and started** — the deferred, ADR-heavy tail |
| 2026-08-19 | HOR-94 | **Release 1.3.2 — the `storehorse.status` correction** (**ADR-014**, superseding ADR-006). A total core-pipeline outage closed |
| 2026-08-21 | HOR-95 | **Release 1.3.3** — 401 and 403 returned from authorization |
| 2026-08-22 | HOR-96 | **Release 1.3.4 — truthful HTTP status codes.** Failures stop being reported as success |
| 2026-08-22 | HOR-98, HOR-99 | **Releases 1.3.5 and 1.3.6** — credential transport removed; status messages rendered as text |
| 2026-08-22 | HOR-107, HOR-103, HOR-111, HOR-108 | **Releases 1.3.7 to 1.3.10** — pedigree recursion bounded; identifiers validated; inert field dropped; real failures reported |
| 2026-08-22 | HOR-89 | **PrimeVue removed rather than migrated** — its next major is no longer open source. 228 deletions, byte-identical build |
| 2026-08-22 | HOR-90 | **URL encryption removed.** Canonical URLs become plain validated numeric identifiers; a permissive-parsing hole closed |
| 2026-08-23 | HOR-116, HOR-119 | **Releases 1.3.11 and 1.3.12** |
| — | HOR-118 (SEC-001) | **Framework error information exposure in the production server-rendered payload investigated and remediated** |
| 2026-08-24 | HOR-91 | **Release 1.3.13 — Prisma 7 driver-adapter architecture** (**ADR-015**). 44 server files rewired; schema diff two lines |
| — | HOR-92 | **MariaDB 12.3 LTS adopted side by side** (**ADR-016**). Checksums identical across all 41 tables; rollback tested live |
| 2026-08-24 | HOR-93 | **Release 1.3.14 — Stage J closes.** Advisories fall from 8 to 1; **the modernisation programme is complete** |
| 2026-08-25 | HOR-122 | v1.3.14 back-propagated `main` → `QA` → `DEV` |
| 2026-08-26 | HOR-124 | **pnpm 11.23.0 formalised as the pinned package-manager version** (**ADR-004**). One line in `package.json`; no Continuous Integration change was needed, because the setup step reads the pin from the manifest |

---

## 24. Current system architecture

```txt
                        ┌───────────────────────────────────┐
                        │            BROWSER                │
                        │  Vue 3 components · Vue Router 5  │
                        │  Tailwind 4 (linked stylesheet)   │
                        │  21 pages · 44 components         │
                        └────────────────┬──────────────────┘
                                         │  HTTP
                        ┌────────────────▼──────────────────┐
                        │        NUXT 4 · NITRO SERVER      │
                        │                                   │
                        │  middleware/apiAccessControl.ts   │
                        │     unclassified route = REFUSED  │
                        │  middleware/auth.ts               │
                        │                                   │
                        │  44 API endpoint files            │
                        │  22 server utilities              │
                        │     (each with its test beside)   │
                        └────────────────┬──────────────────┘
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
          ┌──────────▼─────────┐  ┌──────▼───────┐  ┌────────▼────────┐
          │  PRISMA 7 CLIENT   │  │    STRIPE    │  │  MAIL (SMTP)    │
          │  generated client  │  │  server owns │  │                 │
          │  + MariaDB driver  │  │  the amount  │  │                 │
          │        adapter     │  └──────────────┘  └─────────────────┘
          └──────────┬─────────┘
                     │
          ┌──────────▼──────────────────────────────────────┐
          │            MariaDB 12.3 LTS  (hb-mysql)         │
          │  hbold · 59,903 horses · 42 base tables         │
          │  6 applied migrations                           │
          │  residual difference: exactly 19 statements     │
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   extractor/   Python 3.14 · python-docx        │
          │   SEPARATE MODULE — isolated from the Node tree │
          │   (built for EPIC 2; not yet implemented)       │
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   _legacy/   old PHP + MySQL site                │
          │   READ-ONLY REFERENCE — never imported, never    │
          │   executed                                       │
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   data/private/   real client documents          │
          │   IGNORED BY GIT — never committed, never quoted │
          └─────────────────────────────────────────────────┘
```

### The structural rules the diagram encodes

- **Server-side business logic lives in Nitro**, under `server/`. It does not migrate into
  browser code.
- **The Python extractor is a separate module**, deliberately isolated from the Node
  toolchain and its dependency tree. Two ecosystems, two dependency trees, no bleed.
- **`_legacy/` is read-only reference.** Never imported at runtime.
- **Feature-specific code stays local to the feature.** Code used by two or more features may
  become shared. The structure screams functionality, not technical grouping.
- **Containers own state and orchestration; presentational components receive data and emit
  events.**
- **Real client documents live under an ignored private directory** — never in public
  directories, never in the extractor, never in `_legacy/`.

---

## 25. Current technology stack

Every version below was **read from an executable source or a live environment on
2026-08-25**, not recalled. The pnpm row was re-read on **2026-08-26**, after **HOR-124**
raised the pinned version.

| Technology | Current version | Responsibility | Why it exists here |
|---|---|---|---|
| **Node.js** | `^24.19.0` declared; `24.19.0` in Continuous Integration | The runtime everything server-side executes on | Long Term Support line, enforced by the toolchain since Stage C |
| **pnpm** | `11.23.0` (tracked) | Package manager | The only one permitted (ADR-004); pinned in exactly one place; raised from `11.20.0` by **HOR-124** on 2026-08-26 |
| **Nuxt** | **4.5.2** | Application framework — routing, rendering, server engine | Adopted, not rewritten (ADR-001); the Stage G pivot |
| **Vue** | **3.5.41** | Renders the user interface | The component model the whole front end is written in |
| **Vue Router** | **5.2.0** | Maps URLs to pages | Required by the framework major |
| **Vite** | **8.2.1** | Builds and serves browser code | Arrived with the framework major |
| **Rollup** | **4.62.2** | The bundler Vite builds on | Transitive to Vite |
| **Nitro** | **2.13.4** | The server engine; **where all server business logic lives** | Produced by the framework; keeps server logic out of browser code |
| **h3** | **1.15.11** | HTTP request handling inside Nitro | Transitive to Nitro |
| **Unhead** | **3.3.1** | Page titles and metadata | **Transitive only, deliberately never declared** |
| **Tailwind CSS** | **4.3.3** | Styling | Native defaults are the official design (ADR-009) |
| **@tailwindcss/vite** | **4.3.3** | Tailwind's first-party build integration | Replaced a module that could not resolve the new major |
| **Prisma** | **7.9.1** | ORM — schema, migrations, generated client | Schema preservation (ADR-003); driver-adapter architecture (ADR-015) |
| **@prisma/client** | **7.9.1** | The generated database client | Emitted deterministically to an ignored directory |
| **@prisma/adapter-mariadb** | **7.9.1** | Connects Prisma to the database driver | Required by the version-7 architecture |
| **mariadb** (driver) | **3.4.5**, pinned exactly | The actual database connection | Pinned deliberately under ADR-015 |
| **MariaDB server** | **12.3.2** (image `mariadb:12.3`) | The database | LTS to 2029-06-12 (ADR-016) |
| **Stripe** (server) | **22.5.0** | Payment processing | API version pinned; **the server owns the amount** (ADR-010) |
| **@stripe/stripe-js** | **9.14.0** | Browser payment form | Collects card data without it reaching this server |
| **bcrypt** | **6.0.0** | Password hashing | Produces the 60-character hash that drove ADR-011 |
| **jsonwebtoken** | **9.0.3** | Signs and verifies access tokens | ADR-013; **no fallback secret exists** |
| **jwt-decode** | **4.0.0** | Reads token claims in the browser | Reading only, never verification |
| **uuid** | **14.0.2** | Identifiers for uploaded files | Authentication identifiers use the platform's own crypto instead |
| **nodemailer** | **9.0.5** | Outbound mail | |
| **Vitest** | **4.1.11** | Test runner | One command, two isolated projects |
| **@nuxt/test-utils** | **4.1.0** | Framework test integration | Powers the 4 framework tests |
| **@vue/test-utils** | **2.4.11** | Component mounting in tests | |
| **happy-dom** | **20.11.6** | Browser environment simulation | The heavier alternative is **intentionally not installed** |
| **@headlessui/vue** | **1.7.23** | Unstyled interactive components | Survived the PrimeVue removal because it is actually used |
| **@heroicons/vue** | **2.2.0** | Icons | Its major renamed entry points and reached 15 component files |
| **vue3-carousel** | **0.4.0** | Image carousel | **Deliberately held.** See HOR-123 |
| **vue3-popper** | **1.5.0** | Tooltips and popovers | |
| **multiparty** | **4.3.0** | File upload parsing | |
| **file-saver** | **2.0.5** | Triggers browser downloads | Part of the live export path |
| **html-docx-js-typescript** | **0.1.5** | DOCX export | The live export path, with the browser's own print function |
| **prettier** | **3.9.6** | Formatting | Upgraded with **no repository-wide reformat** |
| **Python** | **3.14** line | Extractor runtime | Separate module, isolated from the Node tree |
| **python-docx** | **1.2.0** | Reads Word catalogues | Pinned to the version verified locally |

### Application surface, counted

| Item | Count |
|---|---|
| Server API endpoint files (excluding tests) | **44** |
| Server middleware files | **2** |
| Server utility modules | **22**, each with a test beside it |
| Vue components | **44** |
| Vue pages | **21** |
| Test files | **36** (4 of them framework tests) |
| Tests | **438**, all passing |
| Prisma models | **40** |
| Applied migrations | **6** |

---

## 26. Current technical debt and deferred work

Everything below is **known, recorded and tracked**. Nothing here is a surprise, and nothing
here is hidden.

### 26.1 TECHNICAL DEBT

| Item | Tracked as | Detail |
|---|---|---|
| **Release notes list each fix more than once** | **HOR-97** (Backlog) | The platform puts a Pull Request title into the merge commit body, and the release tool parses it as a real commit. Systematic since 1.1.0; two entries appear **four times** in 1.3.0. **The fix is not to change the merge method**, and historical entries must not be rewritten |
| **A write endpoint reads its input from the URL query string** | **HOR-100** (Backlog) | `server/api/vendor.post.ts` creates a row from query parameters, casts them with a type assertion that is untrue, and **runs no validation at all**. A write driven by the URL is logged by servers, proxies and browser history. The route's public classification is deliberate and not in question; the absence of validation on a public write is |
| **Two endpoints throw where their siblings return empty** | **HOR-110** (Backlog) | `/api/mareline` and `/api/family-tree-of-horse-by-id` each carry a **private copy** of the same ancestor-finding helper that throws on a missing ancestor, returning **500** where the other pedigree endpoints correctly return an empty result. A **third copy** in the report-assembly endpoint must be audited in the same work item |
| **A page crashes during server rendering on a missing horse** | **HOR-109** (Backlog) | The API layer is correct — both endpoints return `200` with an empty body. The **page** crashes, producing a **500**. More reachable since identifiers became plain numeric and hand-editable |
| **A caller posts to an endpoint that does not exist** | **HOR-102** (Backlog) | `pages/callback.vue` posts to a route with no handler. Worse than a 404: because the route is unclassified, the access-control middleware refuses it before routing. The record states plainly that **the likely correct outcome is removal, not implementation** — do not build an authentication endpoint to satisfy a caller nobody asked for |
| **Error wording does not match error meaning** | **HOR-101** (Backlog) | The shared helper's fallback branch correctly returns **500** while telling the caller "Bad request"; the deliberate branch carries an internal-server-error message on what is usually a 400. Both strings predate the truthful-status work and were **kept unchanged on purpose**. Wording to be decided with Marcus's reading in mind |
| **Swapped Share and Save icons** | **HOR-65** (Backlog) | Found during the icon-library upgrade and deliberately **not** fixed inside it, so that the upgrade's diff stayed reviewable as an upgrade |
| **Per-request database client topology** | Recorded in **ADR-015** | Roughly 44 server modules each construct their own client; about 20 disconnect per request. Explicitly **preserved**, not hidden — changing connection topology inside a major upgrade would make regressions unattributable |
| **Price displayed in two components** | Recorded under **HOR-72** | Display duplication that predates the payments stage. The third copy — the one that **computed the charge** — was removed |
| **No idempotency key on the payment call** | Recorded under **HOR-72** | Deliberately out of scope for that stage |
| **Documentation drift: model count** | *Not currently tracked* | The schema declares **40** models. `docs/architecture/existing-assets.md` §6 and `docs/data/hbold-baseline.md` §6 still state **41**. The difference is the access-token table dropped under ADR-013 |
| **Documentation drift: endpoint count and framework version** | *Not currently tracked* | `existing-assets.md` §4 states **45** endpoint files; the current count is **44**. §3 still describes the base as **Nuxt 3**; the project runs **Nuxt 4.5.2** |

### 26.2 PRODUCT WORK

| Item | Tracked as | Detail |
|---|---|---|
| **The entire Automation MVP** | HOR-6, HOR-10, HOR-15, HOR-19, HOR-23 and every child | **All Backlog.** FR-001 through FR-012 unimplemented. Word extraction, identity resolution, the canonical write-up library, provenance, report assembly, professional PDF, Excel batch import and the review queue |
| **The subscription contradiction** | **HOR-73** (Backlog, no parent) | The interface sells **Monthly and Annually**; the implementation creates a **one-time charge**. No customer record, no subscription, no checkout session, no webhook, no persistence of who paid for what. A **product decision**, not a technical fix |
| **Marketplace column drift** | **HOR-37** (Backlog) | Six columns — `status`, `currency`, `age`, `ad_title`, `created_at`, `seller_id` — form a coherent marketplace feature set that never reached this dataset. `status` has since been resolved by ADR-014; the rest remain |
| **`storehorse.status` behaviour gaps** | Recorded in **ADR-014** | The two status values are mutually exclusive partitions; the horse-edit endpoint omits `status` from its update guard; the pedigree and progeny endpoints never filter by `status` |

### 26.3 ACCEPTED RISK

| Item | Detail |
|---|---|
| **`deepmerge-ts` 7.1.5 advisory** | Reached only through `@prisma/config`, which declares it at an **exact** version, so no lockfile refresh can move it. **Toolchain only** — absent from client and server output. The only object graph it merges is the repository's own versioned configuration file. **Upstream-blocked. Accepted rather than silenced**, so it stays visible and gets rechecked when upstream moves |
| **The `Bytes` type contract** | The current Prisma major returns a byte array where the previous returned a buffer. A boundary utility restores the previous shape for the one affected endpoint, and a test locks the contract. Any **new** consumer of a `Bytes` field must handle the byte-array shape directly |
| **CSS delivery on first paint** | Since the framework major the stylesheet is **linked rather than inlined**, which makes it a render-blocking request on first paint. Benign, measured, and recorded so it is not rediscovered as a mystery. Tuning it was out of scope |
| **The pedigree data is stale** | The reference database holds data up to approximately **2024**. Whether a newer copy exists is **UNKNOWN** and tracked as **HOR-32**, which is **BLOCKED awaiting Marcus** |
| **No pixel-level visual verification exists** | The Tailwind verification was structural: token values, rendered class attributes and built stylesheets compared. **No screenshots were diffed.** This report does not claim pixel-identical rendering |
| **The final payment leg is not covered end to end** | No card has been typed into the payment form in a real browser, so the final browser-to-provider confirmation step has no end-to-end run behind it |

### 26.4 DEFERRED CLEANUP

| Item | Tracked as | Detail |
|---|---|---|
| **`vue3-carousel` 0.4 → 0.17** | **HOR-123** (Backlog) | Split out of the Stage J closing sweep with a recommendation to split. **No advisory names the package**, so this is not security-forced. Clone slides change index semantics for a thumbnail strip bound to slide index; the upstream recipe moved to a different mechanism; slide height became required; navigation metrics changed; there is **no automated visual coverage** and the consumer is customer-facing. **The migration is not impossible and must not be described as such.** A second carousel component with no observed consumer **must not be classified for deletion** on that basis |
| **The MariaDB 10.11 rollback environment** | Recorded in **ADR-016** | See section 27 |
| **The residual 19 SQL statements** | Recorded in the database baseline | 17 foreign keys touching MyISAM tables (2 would hard-fail) and 2 composite primary keys blocked by duplicate data — 52 duplicate pairs in one table, 16,696 in another. **Anything outside this list is a defect, not accepted drift** |
| **The archived October 2024 migration** | Recorded in **ADR-012** | Kept **unmodified** rather than deleted, so its existence stays traceable |
| **Schema deletion candidates** | Recorded in the asset inventory | Two apparently disused tables and some untidy column defaults are a **candidate list for a future schema proposal only** — explicitly **not** deletion authorisation |
| **Baseline facts not revalidated** | Recorded in the database baseline | The completeness of the capacity-drift table is **Not established**; the competition-history and remarks figures are **Not revalidated**; and the version-control provenance of the eleven code-only models has **no discrimination available**. All three are **UNKNOWN / NEEDS REVALIDATION** |
---

## 27. The MariaDB 10.11 rollback environment

### What it is

A **stopped Docker container** named `hb-mysql-1011-rollback`, holding the database exactly
as it was before the migration to MariaDB 12.3 LTS.

| | |
|---|---|
| Container | `hb-mysql-1011-rollback` |
| Image | `mariadb:10.11` |
| State | **Stopped, retained** — not deleted |
| Live counterpart | `hb-mysql`, image `mariadb:12.3`, running server version `12.3.2` |

### Why it exists

The migration was performed **side by side**, not in place. The new server was brought up
alongside the old one, the data was loaded into it, and the two were compared before anything
was switched. The old environment was then stopped rather than removed.

That is the difference between a migration you can undo and a migration you cannot. An
in-place upgrade rewrites the data files; if it goes wrong there is nothing left to go back
to except a backup and a restore window. A side-by-side migration keeps the previous system
intact, so the rollback is *starting a container*, not *restoring a backup*.

**The rollback was not assumed to work. It was tested live.**

### What the comparison proved

Checksums were taken on **all 41 tables** on both servers and matched **identically**. That
is the strongest available evidence that the migration moved the data and nothing else.

### The rule

> **Do not delete this container.**

Its retention is recorded in ADR-016, and the record carries an explicit **review trigger** —
the container is not kept forever by default and it is not removed casually either. Someone
decides, deliberately, when the rollback window closes.

### Why a business reader should care

The pedigree database is the asset. The application can be rebuilt; **59,903 horse records
with verified parent relationships cannot**. Keeping the previous database intact and proven
identical is the cheapest insurance available on the only thing in this project that is
genuinely irreplaceable.

---

## 28. Business impact

This section is written for Marcus. No jargon.

### What was actually bought with this work

**1. The system stopped lying about failures.**
Before this work, a broken request could come back looking like a success. The screen would
show an empty page, or a blank result, and there was no way to tell "there are no horses
matching that" apart from "the system just broke". Now a failure looks like a failure. That
sounds small. It is the difference between a problem you can report and a problem nobody
notices for six months.

**2. A total outage in the core feature was found and fixed.**
At one point **every horse search, every pedigree lookup and every report returned nothing at
all** — not an error, just emptiness — because a required piece of data was missing on all
59,903 records. This was invisible from the outside. It was caught, the cause was found, the
data was repaired, and a test now exists that would catch it happening again.

**3. Nobody can be charged the wrong amount.**
Previously, the browser told the server how much to charge. Anyone who knew how to edit a web
page could have paid a different price. Now the **server** decides the price from the
catalogue, and this was proven by sending a deliberately dishonest request and confirming the
correct amount was charged anyway.

**4. Passwords and logins were rebuilt properly.**
Login credentials used to be stored in a readable form, and the system had a weak fallback
that could be guessed. Now logins expire quickly, they are never stored on the server at all,
and the long-lived part of a session is stored only as an irreversible fingerprint — if
someone stole the database, they still could not log in as a user.

**5. Nobody can reach data they should not.**
Every one of the **44 places the system can be called from** was reviewed and classified: who
is allowed to call it, and from where. A new one that nobody classifies is **refused by
default**. The safe answer is the automatic one.

**6. The whole system is on supported, maintained software.**
Every major component — the runtime, the framework, the styling, the database layer, the
database itself, the payment library — is on a current, supported version. The database is on
a version supported until **June 2029**. This matters commercially: unsupported software
stops receiving security fixes, and at that point the choice is an emergency upgrade or an
accepted risk.

**7. Known security problems went from eight to one.**
The one that remains is in a build tool, it does not ship to anyone using the site, and it
cannot be fixed here — it has to be fixed by the people who publish it. It is recorded and
rechecked rather than hidden.

**8. There is a safety net now.**
**438 automated tests** run on every change, and no change reaches the stable version without
them passing. The specific horse record that exposed the outage above — **ERNE ALERT** — is
now a permanent test.

**9. The old database is still there, intact.**
The database was moved to a new version side by side, both copies were proven identical, and
the old one was **kept, not deleted**. If something goes wrong, going back is a matter of
minutes.

### What was NOT bought — stated plainly

**The catalogue automation product does not exist yet.**

Everything above is the **platform**: the foundation the product will be built on. The actual
work you asked for — reading the Word catalogues, matching horses to the database, building
the reusable mare write-up library, assembling pedigrees and producing the finished PDF from
an auction spreadsheet — **has not been built.** Not partially. Not nearly. It is planned in
detail and it is waiting.

That is not a failure. The foundation was genuinely broken — a completely broken core feature
was found, along with wrong prices, unsafe logins and unsupported software — and building a
product on that would have meant building it twice. But it does mean the honest answer to
"can it produce a catalogue today?" is **no**.

### One decision that is waiting on you

The pedigree data in the system currently runs to about **2024**. Whether a newer copy exists
is genuinely unknown here. **That question is recorded and blocked, waiting on you.** Every
part of the product that resolves a horse's identity depends on the answer.

### One contradiction that needs your decision

The subscription page offers **Monthly** and **Annually**. The system underneath charges a
**one-off payment** — there is no subscription, no renewal, and no record of who paid for
what. That is not a bug to fix quietly; it is a product decision about what you actually want
to sell.

---

## 29. Before / After summary

| Area | Before | Now | Business value |
|---|---|---|---|
| **Foundation** | Working application, stalled — the missing piece was data transformation, not the interface | Adopted and modernised, never rewritten | Years of working behaviour preserved instead of thrown away |
| **Runtime and package manager** | Unpinned, drifting, two managers possible | Node 24 LTS declared and **enforced**; pnpm 11 pinned in exactly one place | An incompatible machine fails the install instead of producing a subtly different build |
| **Framework** | Nuxt 3 | **Nuxt 4.5.2**, crossed in a **three-line source diff** | On a supported line, with the migration reviewable |
| **Build tooling** | Older bundler | **Vite 8**, arriving with the framework | Faster builds, supported toolchain |
| **Styling** | Tailwind 3 via a module that could not resolve the new major | **Tailwind 4.3.3** via its own first-party integration; native defaults adopted, compatibility layer deleted | One less abandoned dependency; the design is now official, not accidental |
| **Data access** | Older Prisma, no adapter | **Prisma 7.9.1** with an explicit MariaDB driver adapter; schema **byte-identical** through the client upgrade | Supported data layer with the schema demonstrably untouched |
| **Database** | MariaDB 10.11 | **MariaDB 12.3 LTS**, migrated side by side, checksums identical on all 41 tables, rollback tested live and retained | Supported to **June 2029**; the irreplaceable asset is provably intact |
| **Database rebuildability** | No migration history — could not be rebuilt reproducibly | **Baseline plus 6 applied migrations**; a documented residual difference of exactly **19 statements** | The database can be rebuilt from source, and drift is a finite named list |
| **Authentication** | Credentials stored in clear text; tokens signed with a guessable fallback | **1-hour access tokens never stored**; rotating refresh sessions stored only as a **SHA-256 digest**; no fallback secret exists | A stolen database no longer yields working logins |
| **API access control** | A shared key inlined into the browser bundle — 36 occurrences across 20 files; 30 handlers discarded the check | **All 44 routes classified**; unclassified routes **refused by default** | The safe outcome is the automatic one, not the remembered one |
| **HTTP truthfulness** | Failures returned as success; a `401` in the body of a `200` | **Real status codes**: 400, 401, 403, 404, 409, 422, 500 | Failures are reportable, monitorable and debuggable |
| **Payments** | The browser told the server what to charge | **The server owns the amount**, provider version pinned; proven with a dishonest client payload | Nobody can be charged the wrong price |
| **Core product feature** | **Total outage** — all 59,903 rows missing a required value; every search, pedigree and report silently empty | Data repaired, column `NOT NULL DEFAULT 1`, compatibility probe retired, **ERNE ALERT locked as a regression test** | The one feature the business depends on is working and protected |
| **Testing** | Minimal | **438 tests in 36 files**, two isolated projects, required on every Pull Request | Changes are provably safe before they reach the stable version |
| **Release process** | Ad hoc | **Three permanent branches, merge commits only, real CI gate, 19 tagged releases**, release Pull Requests merged manually | Every line traceable to a work item; nothing reaches stable unreviewed |
| **Known vulnerabilities** | **8** | **1**, upstream-blocked, toolchain-only, recorded as an accepted risk | Real exposure closed; the remainder visible rather than silenced |

---

## 30. Do not accidentally undo these decisions

Each of these was expensive to establish and is cheap to destroy by accident. This list exists
so nobody has to rediscover why.

**1. Never rewrite the application from scratch.** The project stalled on missing data
transformation, not on an inadequate interface. A rewrite destroys working software without
touching the real problem. *(ADR-001)*

**2. Never run schema introspection against the versioned Prisma schema.** It rewrites the
file in place and silently drops the models that exist only in code. Use the print form or a
throwaway schema. *(ADR-003)*

**3. Never delete a Prisma model or field just because it is absent from the reference
database.** Absence is **drift**, not obsolescence. Eleven models exist only in code, and
they are working capability. Removal needs evidence, a work item, tests, and an approved
migration and rollback plan. *(ADR-003)*

**4. Never rename a table or column to make it tidier.** The reference dump only restores
against the existing names. Odd names are a **compatibility contract**. *(ADR-002)*

**5. Never squash-merge or rebase-merge a promotion Pull Request.** It rewrites the commits
the release tool reads and makes every later promotion report differences that are not real.
This also means: **do not "fix" the duplicated changelog entries by changing the merge
method.** *(Section 21, HOR-97)*

**6. Never fast-forward, reset, or force-align the permanent branches.** Different commit
hashes across `DEV`, `QA` and `main` are **normal**. Verify containment by ancestry. Never
create an empty commit to make hashes match.

**7. Never merge a generated release Pull Request without Sammy's explicit authorisation.**

**8. Never add a second declaration of the package-manager version.** It exists in exactly
one place, and the Continuous Integration setup step takes **no version input** so it cannot
drift. *(ADR-004)*

**9. Never re-declare Unhead as a direct dependency.** The correct number of direct
dependencies on it is **zero** — the one import that existed resolved only by accident of
package hoisting and was deleted, not declared.

**10. Never reintroduce a client-supplied payment amount.** The server reads the price from
the catalogue. *(ADR-010)*

**11. Never reintroduce a fallback signing secret, and never store a refresh credential in a
readable form.** Only its SHA-256 digest is persisted. *(ADR-013)*

**12. Never leave a new API route unclassified and assume it is fine.** Unclassified means
**refused**. That default is the protection. *(ADR-007)*

**13. Never combine a framework major upgrade with a directory reorganisation.** A diff of
hundreds of renames hides the handful of lines that actually changed the framework, and
regressions become unattributable. *(ADR-008)*

**14. Never treat "no checks reported" as a passing check**, and never treat automatic work
item closure by a Git integration as acceptance evidence.

**15. Never delete the MariaDB 10.11 rollback container casually.** Its retention has a
recorded review trigger. *(ADR-016, section 27)*

**16. Never commit private client documents, environment files, database dumps, or real
source catalogues.** Real documents live in an ignored private directory and are never
quoted, never placed in public directories, and never used as test fixtures.

**17. Never import anything from the legacy directory at runtime.** It is read-only
reference.

**18. Never silence the remaining advisory.** It is accepted **visibly** so it is rechecked
when upstream moves.

**19. Never implement the endpoint that a stray page currently calls.** The record states the
likely correct outcome is **removal**, not implementation. Do not build an authentication
endpoint to satisfy a caller nobody asked for. *(HOR-102)*

**20. Never classify the second carousel component as deletable because nothing appears to
use it.** That specific conclusion is called out as unsafe. *(HOR-123)*

---

## 31. Glossary

Terms used in this report, in plain language.

| Term | What it means |
|---|---|
| **ADR (Architecture Decision Record)** | A short document recording one important technical decision and why it was made. Binding until replaced by another ADR — never by editing the original |
| **Advisory** | A published notice that a specific version of a software package has a known security weakness |
| **API (Application Programming Interface)** | The set of addresses the browser can call to ask the server for data or to make it do something |
| **Back-propagation** | Copying a change that landed on the stable branch back down to the validation and development branches, so they do not fall behind |
| **Backfill** | Filling in a value for rows that already exist, after a new column is added |
| **Bundle** | The single packaged file of browser code the build produces. Anything placed in it is readable by anyone who visits the site |
| **bcrypt** | A deliberately slow password-hashing method. Slowness is the point — it makes guessing passwords expensive |
| **Checksum** | A short fingerprint of a table's contents. Two tables with the same checksum hold the same data |
| **Continuous Integration (CI)** | Automation that builds the project and runs its tests on every proposed change, before a human merges it |
| **Conventional commits** | A commit-message format the release tool reads to decide the next version number and write the changelog |
| **Dam / Sire** | A horse's mother and father |
| **Docker container** | A packaged, isolated environment that runs a piece of software — here, the database — the same way on any machine |
| **Driver adapter** | The component that connects the data layer to the actual database driver. Required by the current Prisma major |
| **Frozen lockfile** | An install mode that refuses to change the recorded dependency versions. The build gets exactly what was reviewed, or it fails |
| **Hash / digest** | A one-way fingerprint of some data. You can produce it from the data, but you cannot recover the data from it |
| **HTTP status code** | The number a server returns describing the outcome: 200 success, 400 bad request, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict, 422 unprocessable, 500 server error |
| **Idempotent** | Safe to run more than once. Running it twice produces the same result as running it once |
| **JWT (JSON Web Token)** | A signed piece of text proving who a user is. The server can verify it without storing anything |
| **LTS (Long Term Support)** | A software version line that receives fixes for an unusually long, published period |
| **Lockfile** | The file recording the exact version of every dependency, including the ones your dependencies bring with them |
| **Maternal line** | The chain of mothers: a horse's dam, that dam's dam, and so on. Traversed through the `dam_id` relation |
| **Migration** | A versioned, reviewable script that changes the database structure, so the database can be rebuilt reproducibly |
| **MyISAM / InnoDB** | Two database storage engines. InnoDB is the modern one and supports enforced relationships between tables; MyISAM does not |
| **Nitro** | The server engine inside Nuxt. All server-side business logic lives here, never in browser code |
| **ORM (Object-Relational Mapper)** | A tool that lets application code work with database rows as typed objects. Here, Prisma |
| **Pedigree** | A horse's ancestry — the tree of dams and sires |
| **pnpm** | The package manager used here, and the only one permitted |
| **Provenance** | The record of where a piece of imported content came from, kept alongside the content |
| **Pull Request** | A proposal to merge one branch into another, reviewed and checked before it is accepted |
| **Regression** | Something that used to work and stopped working |
| **Server-side rendering (SSR)** | Building the page's HTML on the server before sending it, rather than assembling it in the browser |
| **SHA-256** | A specific one-way fingerprinting method. Used here for the stored refresh credential |
| **Storehorse** | The main database table holding horse records, including the verified `dam_id` and `sire_id` relations |
| **Tailwind** | The styling system. Design is expressed as small utility classes in the markup |
| **TDD (Test-Driven Development)** | Write the failing test first, then the smallest code that passes it, then improve the structure |
| **Transitive dependency** | A package you did not ask for, installed because something you did ask for needs it |
| **Trust boundary** | The line where untrusted input meets trusted code. Everything crossing it must be validated |
| **Write-up** | The descriptive paragraph about a mare and her produce, printed in an auction catalogue |
| **`(SEE ABOVE)`** | A catalogue convention meaning "this mare's write-up is printed earlier in this document". A **reuse reference**, never new content |

---

## 32. Chronological timeline

Dates appear only where a release, a container or a record establishes them. Where no date is
established, the entry is placed by sequence and left undated — **no date in this report is
inferred.**

### Phase 1 — Foundation *(dates not established)*

```txt
HOR-2    Application adopted, not rewritten            (ADR-001)
HOR-27   pnpm standardised as the only manager         (ADR-004)
HOR-4    Reference database restored — 59,903 horses   (ADR-002)
HOR-3    Test harness established
HOR-5    Security baseline
HOR-31   Server configuration corrected
HOR-35   storehorse.status compatibility layer         (ADR-006)
HOR-38   Promotion workflow
HOR-39   Real Continuous Integration checks
HOR-40   Branch protection
HOR-41   Release Please adopted
HOR-46   Test harness hardened
HOR-47   Testing strategy written
```

### Phase 2 — The modernisation programme

```txt
2026-07-22   Release 1.0.0
             HOR-48   The 2026 dependency audit — Stages A to J defined
             HOR-42   Stage A — Continuous Integration tooling
2026-08-08   HOR-50   Stage B — Node 24.19.0 and pnpm 11.20.0 adopted
             HOR-54   Stage C — 25 dependency floors raised; runtime range enforced
             HOR-55   Stage D — deprecated module removed; inlined API key discovered
2026-08-09   Release 1.1.0
             HOR-56   The API trust boundary — 44 routes classified   (ADR-007)
             HOR-58   Stage E — Prisma client major; schema byte-identical
             HOR-59 … HOR-64   Stage F — six library majors; two removed outright
             HOR-67   @nuxt/content removed ahead of the framework major
             HOR-68   Stage G — Nuxt 4 in a three-line source diff     (ADR-008)
             HOR-69   Stage H — Tailwind 4 via first-party integration (ADR-009)
2026-08-13   Release 1.2.0
             HOR-70   Tailwind native defaults adopted; 142 lines deleted
2026-08-13   Release 1.2.1
             HOR-72   Stage I — server owns the payment amount        (ADR-010)
```

### Phase 3 — Authentication, data integrity and truthfulness

```txt
2026-08-15   Release 1.3.0
             HOR-76   Modern access tokens; rotating digest-only refresh  (ADR-013)
             HOR-79   Migration baseline and InnoDB foundation            (ADR-012)
             HOR-74   Password capacity reconciliation                    (ADR-011)
             HOR-77   Atomic registration
             HOR-78   Internal errors no longer returned raw
             HOR-80   Schema defaults
2026-08-15   Release 1.3.1
             HOR-82   Height column widened; residual DDL 20 → 19
2026-08-17   HOR-83   Stage J authorised — the deferred, ADR-heavy tail
2026-08-19   Release 1.3.2
             HOR-94   storehorse.status backfilled; probe retired         (ADR-014)
                      A total core-pipeline outage closed
2026-08-21   Release 1.3.3
             HOR-95   401 and 403 returned from authorization
2026-08-22   Release 1.3.4
             HOR-96   Truthful HTTP status codes
2026-08-22   Releases 1.3.5 – 1.3.10
             HOR-98   Credential transport removed from URLs and responses
             HOR-99   API status messages rendered as text
             HOR-107  Pedigree recursion bounded
             HOR-103  Horse identifiers validated before the data layer
             HOR-111  Inert request field dropped
             HOR-108  Real upstream failures reported
2026-08-22   HOR-89   PrimeVue removed rather than migrated — 228 deletions
2026-08-22   HOR-90   URL encryption removed; identifiers plain and validated
2026-08-23   Releases 1.3.11 – 1.3.12
             HOR-116  Failed pedigree lookup reported; malformed search refused
             HOR-119  Unread error state removed; search paging fixed
             HOR-118  Framework error exposure in the rendered payload remediated
```

### Phase 4 — Stage J closes

```txt
2026-08-24   Release 1.3.13
             HOR-91   Prisma 7 driver-adapter architecture               (ADR-015)
                      44 server files rewired; schema diff two lines
             HOR-92   MariaDB 12.3 LTS side by side                      (ADR-016)
                      Checksums identical across all 41 tables
                      Rollback tested live and retained
2026-08-24   Release 1.3.14
             HOR-93   Vulnerable transitive dependencies refreshed
                      Advisories 8 → 1
                      THE MODERNISATION PROGRAMME IS COMPLETE
2026-08-25   HOR-122  v1.3.14 back-propagated main → QA → DEV
2026-08-26   HOR-124  pnpm 11.23.0 formalised as the pinned package manager  (ADR-004)
                      Continuous Integration reads the pin from package.json
                      One line changed; no workflow edit required
```

### Where the project stands as this report is written — 2026-08-25

```txt
EPIC 0  Foundation & Setup                Done
EPIC 1  Database Redesign & Migration     Backlog
EPIC 2  Word Extractor                    Backlog
EPIC 3  Report Generation                 Backlog
EPIC 4  Review UI & Modern UX             Backlog
EPIC 5  Hardening & Handover              Backlog
```

**The platform is complete. The product has not started.**

---

## 33. Traceability

Where each claim in this report comes from, so any statement can be checked rather than
trusted.

### Sources consulted

| Source | What was taken from it |
|---|---|
| `package.json` (tracked) | Declared version 1.3.14, pinned package manager, runtime range, module type |
| `pnpm-lock.yaml` | **Every resolved version quoted in section 25** |
| `prisma/schema.prisma` | Model count (40), field types, the `Bytes` fields |
| `prisma/migrations/` | The 6 applied migrations |
| `extractor/requirements.txt` | The Word-reading library version |
| `nuxt.config.ts` | Compatibility date, source directory configuration, build plugins |
| `.github/workflows/` | The two workflows; the `Test / Build` check; the setup steps |
| `CHANGELOG.md` | **All 19 releases and their dates** |
| `docs/adr/` | All sixteen records; the supersession of ADR-006 by ADR-014 |
| `docs/modernisation/modernisation-plan.md` | **The Stage A–J mapping and every stage detail** |
| `docs/architecture/existing-assets.md` | The asset inventory; two of the drift findings |
| `docs/data/hbold-baseline.md` | The 19 residual statements; the unrevalidated baseline facts |
| `docs/requirements/automation-mvp.md` | FR-001 … FR-012; BR-001 … BR-006 |
| `docs/testing/testing-strategy.md` | The two-project split; the regression gates |
| `docs/git-workflow.md` | Promotion rules; merge method; release handling |
| Linear | Every work item number, title and status quoted; the EPIC statuses |
| Docker | Both containers, their images and their states |
| The running database | Live server version `12.3.2-MariaDB-ubu2404` |
| `pnpm test` | **Run on 2026-08-25: 36 files, 438 tests, all passing** |
| Git | Branch state; the three permanent branch tips |

### What was verified rather than recalled

Every version number in section 25 was read from a lockfile, a manifest, a requirements file
or a live server on **2026-08-25**. None was written from memory. The test result in section
17 comes from an actual run, not from a previous record of a run.

The Stage A–J to work-item mapping was read from the modernisation plan's own headings rather
than reconstructed — a first attempt at section 9 attributed the Tailwind stage to the wrong
work item, and the primary source corrected it before it reached this page.

### What this report deliberately does not claim

- It does **not** claim any functional requirement of the Automation MVP is implemented.
- It does **not** claim pixel-identical rendering after the styling migration. No screenshots
  were compared.
- It does **not** claim the payment flow is covered end to end. The final browser-to-provider
  step has no real-card run behind it.
- It does **not** date the foundation phase. Those work items have no release or container
  establishing a date, and **no date was inferred**.
- It does **not** resolve the three documentation-drift findings in section 26.1. This task
  was documentation-only and had no authority to edit those files. **They are reported, not
  repaired.**

### Contains no private data

This report quotes no environment values, no credentials, no tokens, no connection strings,
no personal data, and no content from any real client catalogue or source document. The one
horse record named throughout — **ERNE ALERT, `horse_id` 1003** — is reference data from the
pedigree database used as a regression fixture, not private client material.
