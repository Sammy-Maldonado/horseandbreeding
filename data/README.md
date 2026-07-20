# data/

Source material for the write-up extraction pipeline.

## Layout

```
data/
├── README.md          <- tracked
└── private/           <- NEVER tracked
    └── catalogues/
        └── <year>/
            └── <catalogue>.docx
```

## `private/` — real client documents, never upload

`data/private/` holds the real auction catalogues and dam documents supplied by
Marcus. They contain client data and unpublished commercial information.

**This repository is public. Nothing under `private/` may ever be committed.**

The directory is excluded in `.gitignore` (`data/private/`). Do not remove that
rule, do not force-add a file inside it, and do not move a real document out of
it to work on it more conveniently.

Getting a document in is a manual step: drop it under
`private/catalogues/<year>/` and confirm with `git status` that it does not
appear. If it does appear, stop and fix the ignore rule before doing anything
else.

## Test fixtures

Extractor tests must not read from `private/`. Any fixture that is committed has
to be **anonymised** — real horse names, people and results replaced — or
**explicitly approved** by the owner for publication. Anonymised fixtures live
next to the tests they serve, not here.

When in doubt, treat the document as private.
