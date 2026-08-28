"""
Maternal-line extractor for historical Word (.docx) auction catalogues.

Pipeline (see docs/domain/writeup-grammar.md):

    DOCX SOURCE WALK        source_walk.py   -> SourceNode + provenance
    STRUCTURAL CLASSIFY     structure.py     -> lots, Dam sections, items, nesting
    GRAMMAR PARSING         grammar.py       -> subject head, results, descendants
    SOURCE ACCOUNTING       accounting.py    -> per-node ledger (no silent loss)
    EXTRACTION REPORT       extraction.py    -> report + serialisable document
    JSON SERIALISATION      cli.py           -> UTF-8 bytes, deterministic exit codes

The extractor owns Word catalogue -> structured extraction only. It never
resolves identities against the database, never persists anything and never
rebuilds sire/dam ancestry from the Word table (ADR-017, AI-002).
"""

EXTRACTOR_VERSION = "1.0.0"
OUTPUT_CONTRACT_VERSION = "1"
