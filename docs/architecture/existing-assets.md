# Existing Reusable Assets

**Status:** Active — technical inventory
**Scope:** Assets already present in the repository that must be audited before anything is rebuilt
**Related:** [ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md) · [ADR-002](../adr/ADR-002-mysql-mariadb-and-table-names.md)

---

## 1. Purpose

The project adopts and modernises the existing application rather than rewriting it
([ADR-001](../adr/ADR-001-adopt-existing-nuxt-application.md)). This inventory records
what already exists so that work starts from an audit rather than from a blank file.

**Binding rule: audit and refactor before rewriting.** Presence in this inventory means
the asset exists and is a reuse candidate. It does not certify that it is correct,
secure, or working.

---

## 2. Verification status

Everything below was confirmed to **exist in the repository** during this inventory.

Functional correctness is a separate question. No item in this document is claimed to
work unless the "Verified behaviour" column says so explicitly. Where behaviour is
unverified, the auditing issue must establish it before reuse.

---

## 3. Application base

The adopted Nuxt 3 application is the product base.

```txt
Nuxt 3 · Vue 3 · TypeScript · Nitro · Prisma · MySQL/MariaDB · Tailwind CSS
```

Server-side business logic belongs in Nitro under `server/`.

---

## 4. API endpoints

`server/api/` contains **45 tracked endpoint files** (exact, counted during this
inventory).

Pedigree and reporting endpoints most relevant to the Automation MVP:

| File | Area |
|---|---|
| `server/api/pedigree.post.ts` | Pedigree |
| `server/api/pedigree-detail.post.ts` | Pedigree detail |
| `server/api/family-tree-of-horse-by-id.post.ts` | Family tree |
| `server/api/familyHorseStore.post.ts` | Family tree persistence |
| `server/api/mareline.post.ts` | Maternal families |
| `server/api/progeny.post.ts` | Progeny |
| `server/api/report-horses-ids.post.ts` | Report assembly input |

The remaining endpoints cover authentication (login, sign-up, JWT, refresh), search,
and billing integration. They are reuse candidates subject to the same audit rule, and
authentication and input validation must be confirmed against the security rules in
`CLAUDE.md` before any endpoint is relied on.

---

## 5. Components

| Component | Purpose | Verified behaviour |
|---|---|---|
| `components/Pedigree.vue` | Pedigree rendering | Exists; behaviour to be audited |
| `components/PedigreeCard.vue` | Pedigree presentation | Exists; behaviour to be audited |
| `components/PedigreeDetail.vue` | Pedigree detail view | Exists; behaviour to be audited |
| `components/HorseFamilyTree.vue` | Family tree rendering | Exists; behaviour to be audited |
| `components/GenerateHorseFamilyTree.vue` | Family tree generation | Exists; behaviour to be audited |
| `components/MarelineTree.vue` | Maternal family grouping view | Exists; behaviour to be audited |
| `components/RecursiveCompetitionHistory.vue` | Renders the maternal-line write-up section | Exists; behaviour to be audited |

`RecursiveCompetitionHistory.vue` is the closest existing analogue to the write-up
rendering the Automation MVP needs. Audit it before designing a replacement.

---

## 6. Data model

`prisma/schema.prisma` declares **41 models** (exact, counted during this inventory).

The relational core is sound and centres on `storehorse` self-relations:

- `storehorse.dam_id` and `storehorse.sire_id` define the pedigree chain.
- Inverse offspring relations are derived from those.
- `mareline_id` groups maternal families; it does **not** replace the pedigree chain.

Models previously flagged as cleanup candidates — `marcustest`, `storehorse_new`, and
dirty column defaults — are a **candidate list for a future schema RFC only**. They are
not authorisation to delete anything. Schema removal is governed by
[ADR-003](../adr/ADR-003-prisma-schema-preservation.md).

Schema drift against the local reference database is documented in
[hbold-baseline.md](../data/hbold-baseline.md).

---

## 7. Word extractor

```txt
extractor/parse_dams.py
extractor/requirements.txt
```

A Python prototype that parses historical `.docx` catalogues into structured data. It
is a **separate module** and stays outside the Node toolchain and dependency tree.

Its only third-party dependency is `python-docx`, pinned in
`extractor/requirements.txt`. Everything else it uses is Python standard library.

The grammar it targets is documented in
[writeup-grammar.md](../domain/writeup-grammar.md).

---

## 8. Legacy reference

`_legacy/` holds the previous PHP site and the `hbold` database dump.

Rules:

- Read-only reference material.
- **Never imported at runtime.**
- Never a build target.
- Excluded from Git except its README.

The legacy PHP site generates the pedigree table server-side and is useful as a
behavioural reference for pedigree output. It is not the platform being built.

---

## 9. Private data

Real client documents live under `data/private/` and are ignored by Git. They are never
committed, never moved into `public/`, `assets/`, `extractor/`, or `_legacy/`, and never
included in documentation.

---

## 10. Audit rule

Before reusing any asset listed here:

1. Read it.
2. Confirm what it actually does.
3. Confirm authentication and input validation where it handles external input.
4. Add tests covering the behaviour being relied on.
5. Refactor incrementally.

Rebuilding an asset from scratch instead of auditing it requires justification in the
Linear issue.

---

## 11. Open modernisation questions

These are **not decisions**. They are recorded so they are not rediscovered later, and
each requires its own Linear issue and, where durable, an ADR:

- Whether the current UI component library is retained or replaced during UI
  modernisation.
- Which parts of the existing authentication flow survive the security review.
- Whether a schema RFC consolidates the cleanup candidates listed in section 6.
