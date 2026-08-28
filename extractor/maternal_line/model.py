"""Output model of the maternal-line extractor (Word -> structured extraction).

Every dataclass here serialises to plain JSON through ``to_plain``. Nothing in
this module knows about python-docx, databases or persistence: it is the
HOR-12 output contract only. Identity resolution, canonical write-ups and
storage belong to later issues and are deliberately absent.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any, Optional

# Accounting states. Every meaningful source node ends in exactly one of these.
PARSED = "PARSED"
PRESERVED_UNPARSED = "PRESERVED_UNPARSED"
EXPLICITLY_UNSUPPORTED = "EXPLICITLY_UNSUPPORTED"
EXPLICITLY_AMBIGUOUS = "EXPLICITLY_AMBIGUOUS"
ERROR = "ERROR"

ACCOUNTING_STATUSES = (
    PARSED,
    PRESERVED_UNPARSED,
    EXPLICITLY_UNSUPPORTED,
    EXPLICITLY_AMBIGUOUS,
    ERROR,
)

# Segment-level states: a fragment of one node is either understood, kept
# verbatim, or flagged as ambiguous. Segments never carry ERROR: an exception
# marks the whole node.
SEGMENT_STATUSES = (PARSED, PRESERVED_UNPARSED, EXPLICITLY_AMBIGUOUS)


def to_plain(value: Any) -> Any:
    """Recursively convert dataclasses/lists/dicts into JSON-ready values."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        to_dict = getattr(value, "to_dict", None)
        if callable(to_dict):
            return to_dict()
        return {f.name: to_plain(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, (list, tuple)):
        return [to_plain(item) for item in value]
    if isinstance(value, dict):
        return {key: to_plain(item) for key, item in value.items()}
    return value


@dataclass
class Level:
    code: str
    raw: str
    height_m: Optional[float] = None
    stars: Optional[int] = None
    modifier: Optional[str] = None


@dataclass
class Approval:
    code: str
    raw: str


@dataclass
class Subject:
    """The horse an entry is about. Fields are never borrowed from descendants."""

    name: str
    name_raw: str
    birth_year: Optional[int] = None
    rider: Optional[str] = None
    country: Optional[str] = None
    level: Optional[Level] = None
    sire_note: Optional[str] = None
    approvals: list = field(default_factory=list)
    head_notes: list = field(default_factory=list)


@dataclass
class Result:
    year: int
    placing: Optional[str]
    placing_kind: Optional[str]
    detail: Optional[str]
    raw: str
    offset: int
    status: str = PARSED


@dataclass
class Segment:
    """A contiguous fragment of a node's text with its own accounting state."""

    index: int
    kind: str
    text: str
    status: str
    offset: int
    reason: Optional[str] = None


@dataclass
class DescendantMarker:
    raw: str
    offset: int
    trailing: bool


@dataclass
class SeeAbove:
    present: bool
    raw: Optional[str] = None
    offset: Optional[int] = None


@dataclass
class EtcMarker:
    raw: str
    offset: int
    preceding_kind: Optional[str]


@dataclass
class Relation:
    """How a descendant is attached to its parent: evidence, never a guess."""

    source: str  # "chained" (same paragraph) | "indented" (following paragraph)
    confidence: str  # "confident" | "ambiguous"
    evidence: list = field(default_factory=list)
    parent_node_id: Optional[str] = None
    chain_index: Optional[int] = None


@dataclass
class Provenance:
    document_id: str
    node_id: str
    block_index: int
    scope: str  # "document" | "lot" | "section"
    lot_order: Optional[int] = None
    section_order: Optional[int] = None
    section_ordinal: Optional[int] = None
    section_occurrence: Optional[int] = None
    item_order: Optional[int] = None
    left_indent_pt: Optional[float] = None
    leading_tabs: int = 0
    bold_spans: list = field(default_factory=list)
    all_bold: bool = False
    structure: Optional[str] = None  # e.g. "MERGED_HEADING_ENTRY"
    chain_index: Optional[int] = None
    offset: Optional[int] = None


@dataclass
class ParsedItem:
    kind: str  # entry | result_record | descendant_record | reference | free_text | error | unsupported
    status: str
    raw_text: str
    text: str
    status_reason: Optional[str] = None
    subject: Optional[Subject] = None
    results: list = field(default_factory=list)
    descendants: list = field(default_factory=list)
    descendant_marker: Optional[DescendantMarker] = None
    see_above: Optional[SeeAbove] = None
    etc_markers: list = field(default_factory=list)
    segments: list = field(default_factory=list)
    node_id: Optional[str] = None
    provenance: Optional[Provenance] = None
    relation: Optional[Relation] = None
    nesting_depth: int = 0
    offset: int = 0

    @property
    def unparsed_segments(self) -> list:
        return [segment for segment in self.segments if segment.status != PARSED]

    def iter_items(self):
        """Yield this item and every descendant (chained and indented), depth first."""
        yield self
        for descendant in self.descendants:
            yield from descendant.iter_items()

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "block_index": self.provenance.block_index if self.provenance else None,
            "kind": self.kind,
            "status": self.status,
            "status_reason": self.status_reason,
            "raw_text": self.raw_text,
            "text": self.text,
            "offset": self.offset,
            "nesting_depth": self.nesting_depth,
            "relation": to_plain(self.relation),
            "provenance": to_plain(self.provenance),
            "subject": to_plain(self.subject),
            "results": to_plain(self.results),
            "descendants": [descendant.to_dict() for descendant in self.descendants],
            "descendant_marker": to_plain(self.descendant_marker),
            "see_above": to_plain(self.see_above),
            "etc_markers": to_plain(self.etc_markers),
            "segments": to_plain(self.segments),
            "unparsed_segments": to_plain(self.unparsed_segments),
        }


@dataclass
class LotIdentity:
    status: str
    text: str
    cells: list
    first_cell_text: Optional[str]
    lot_number: Optional[int]
    reason: Optional[str] = None


@dataclass
class DamSection:
    ordinal: int
    ordinal_label: str
    occurrence: int
    section_order: int
    heading_raw: str
    heading_text: str
    node_id: str
    block_index: int
    status: str
    status_reason: Optional[str] = None
    flags: list = field(default_factory=list)
    items: list = field(default_factory=list)


@dataclass
class Lot:
    lot_order: int
    node_id: str
    block_index: int
    identity: LotIdentity
    items: list = field(default_factory=list)
    sections: list = field(default_factory=list)


@dataclass
class Finding:
    code: str
    node_id: str
    block_index: int
    location: str
    detail: str


@dataclass
class Structures:
    unsupported: list = field(default_factory=list)
    ambiguous: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


@dataclass
class ErrorRecord:
    node_id: str
    block_index: int
    location: str
    message: str
