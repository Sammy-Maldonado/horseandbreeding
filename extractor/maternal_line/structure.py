"""Structural classification of a source walk: lots, Dam sections, nesting.

Tables open lots (identity text only — the pedigree is never rebuilt here),
``Nth Dam`` paragraphs open sections, every other meaningful node becomes an
item. Relative indentation plus ``dam of`` markers build the descendant
hierarchy; anything unexpected is kept and reported. Every meaningful node is
accounted in the ledger exactly once, and ``build`` fails loudly otherwise.
"""

from __future__ import annotations

import re
from dataclasses import replace
from typing import Optional

from maternal_line.accounting import SourceLedger
from maternal_line.grammar import parse_item
from maternal_line.model import (
    ERROR,
    EXPLICITLY_AMBIGUOUS,
    EXPLICITLY_UNSUPPORTED,
    PARSED,
    PRESERVED_UNPARSED,
    DamSection,
    ErrorRecord,
    Finding,
    Lot,
    LotIdentity,
    ParsedItem,
    Provenance,
    Relation,
    Segment,
    Structures,
)

DAM_HEADING = re.compile(r"^\s*(\d{1,2})\s*(st|nd|rd|th)\s+dam\b\s*[:.\-–—]?\s*", re.I)
LOT_NUMBER = re.compile(r"^\s*lot\s*(?:no\.?|number|#)?\s*[:.]?\s*(\d+)\b", re.I)


def ordinal_label(number: int) -> str:
    if 10 <= number % 100 <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


class StructureBuilder:
    def __init__(self, walk):
        self.walk = walk
        self.document_id = walk.document_id
        self.ledger = SourceLedger(node.node_id for node in walk.meaningful_nodes)
        self.preamble: list = []
        self.lots: list = []
        self.structures = Structures()
        self.errors: list = []
        self.lot: Optional[Lot] = None
        self.section: Optional[DamSection] = None
        self._container: list = self.preamble
        self._reset_nesting()

    # -- driver ------------------------------------------------------------

    def build(self) -> "StructureBuilder":
        for node in self.walk.nodes:
            if not node.meaningful:
                continue
            if node.kind == "table":
                self.handle_table(node)
            elif node.kind == "paragraph":
                self.handle_paragraph(node)
            else:
                self.handle_other(node)
        self.ledger.assert_complete()
        return self

    # -- lots ----------------------------------------------------------------

    def handle_table(self, node) -> None:
        identity = self._lot_identity(node)
        lot = Lot(lot_order=len(self.lots) + 1, node_id=node.node_id, block_index=node.block_index,
                  identity=identity)
        self.lots.append(lot)
        self.lot, self.section = lot, None
        self._container = lot.items
        self._reset_nesting()
        if identity.status != PARSED:
            self._finding(self.structures.unsupported, "LOT_IDENTITY_MISSING", node, identity.reason)
        self._account(node, identity.status, identity.reason)

    def _lot_identity(self, node) -> LotIdentity:
        cells = node.cells or []
        flat = [cell for row in cells for cell in row if cell]
        first_cell = flat[0] if flat else None
        lot_number = None
        for cell in flat:
            match = LOT_NUMBER.match(cell)
            if match:
                lot_number = int(match.group(1))
                break
        if not node.text:
            return LotIdentity(EXPLICITLY_UNSUPPORTED, node.text, cells, first_cell, None,
                               reason="lot table has no identity text")
        return LotIdentity(PARSED, node.text, cells, first_cell, lot_number)

    # -- paragraphs ------------------------------------------------------------

    def handle_paragraph(self, node) -> None:
        if self.lot is None:
            item = self._parse_node(node, node.text)
            self._attach(item, node, scope="document")
            self.preamble.append(item)
            self._account(node, item.status, item.status_reason)
            return
        heading = DAM_HEADING.match(node.text)
        if heading:
            self._open_section(node, heading)
            return
        item = self._parse_node(node, node.text)
        self._place(item, node)
        self._account(node, item.status, item.status_reason)

    def handle_other(self, node) -> None:
        reason = f"unsupported body element: {node.kind}"
        item = ParsedItem(kind="unsupported", status=EXPLICITLY_UNSUPPORTED, raw_text=node.raw_text,
                          text=node.text, status_reason=reason,
                          segments=[Segment(0, "free_text", node.text, PRESERVED_UNPARSED, 0, reason)])
        scope = "document" if self.lot is None else ("section" if self.section else "lot")
        self._attach(item, node, scope=scope)
        self._container.append(item)
        self._finding(self.structures.unsupported, "UNSUPPORTED_BODY_ELEMENT", node, reason)
        self._account(node, item.status, reason)

    def _open_section(self, node, heading) -> None:
        lot = self.lot
        ordinal = int(heading.group(1))
        occurrence = 1 + sum(1 for section in lot.sections if section.ordinal == ordinal)
        heading_text = node.text[:heading.end()].strip().rstrip(":.-–—").strip()
        section = DamSection(
            ordinal=ordinal, ordinal_label=ordinal_label(ordinal), occurrence=occurrence,
            section_order=len(lot.sections) + 1, heading_raw=node.raw_text, heading_text=heading_text,
            node_id=node.node_id, block_index=node.block_index, status=PARSED,
        )
        lot.sections.append(section)
        self.section = section
        self._container = section.items
        self._reset_nesting()
        if occurrence > 1:
            section.flags.append("REPEATED_ORDINAL")
            section.status = EXPLICITLY_AMBIGUOUS
            section.status_reason = f"{section.ordinal_label} Dam appears {occurrence} times in this lot"
            self._finding(self.structures.ambiguous, "REPEATED_DAM_ORDINAL", node, section.status_reason)
        remainder = node.text[heading.end():].strip()
        if remainder:
            section.flags.append("MERGED_HEADING")
            item = self._parse_node(node, remainder)
            if item.kind == "free_text":
                item.status = EXPLICITLY_AMBIGUOUS
                item.status_reason = "merged heading remainder does not match entry grammar"
                self._finding(self.structures.ambiguous, "MERGED_HEADING_UNPARSED", node, item.status_reason)
            else:
                self._finding(self.structures.warnings, "MERGED_HEADING_ENTRY", node,
                              "Dam heading and first entry share one paragraph")
            self._place(item, node, structure="MERGED_HEADING_ENTRY")
            if section.status == PARSED and item.status != PARSED:
                section.status = item.status
                section.status_reason = item.status_reason
        self._account(node, section.status, section.status_reason)

    # -- items -----------------------------------------------------------------

    def _parse_node(self, node, text: str) -> ParsedItem:
        try:
            return parse_item(text, raw_text=node.raw_text)
        except Exception as exc:  # any parser failure becomes an explicit ERROR state
            message = f"{type(exc).__name__}: {exc}"
            self.errors.append(ErrorRecord(node.node_id, node.block_index, self._location(node), message))
            return ParsedItem(
                kind="error", status=ERROR, raw_text=node.raw_text, text=" ".join(text.split()),
                status_reason=message,
                segments=[Segment(0, "free_text", " ".join(text.split()), PRESERVED_UNPARSED, 0, "parser failure")],
            )

    def _place(self, item: ParsedItem, node, structure: Optional[str] = None) -> None:
        scope = "section" if self.section is not None else "lot"
        self._attach(item, node, scope=scope, structure=structure)
        indent = node.left_indent_pt if node.left_indent_pt is not None else 0.0
        if self._baseline is None:
            self._baseline = indent
        while self._stack and self._stack[-1][0] >= indent:
            self._stack.pop()
        unexpected = indent < self._baseline or (
            indent not in self._known and any(known > indent for known in self._known)
        )
        parent = self._stack[-1][1] if self._stack else None
        if parent is not None:
            evidence = ["indentation"]
            confidence = "confident"
            if parent.descendant_marker is not None:
                evidence.append("dam_of_marker")
            else:
                confidence = "ambiguous"
                self._finding(self.structures.ambiguous, "INDENTATION_WITHOUT_DAM_OF_MARKER", node,
                              f"indented under '{parent.text[:40]}' which has no 'dam of' marker")
            if unexpected:
                confidence = "ambiguous"
                evidence.append("unexpected_indentation")
            item.relation = Relation("indented", confidence, evidence, parent_node_id=parent.node_id)
            item.nesting_depth = parent.nesting_depth + 1
            parent.descendants.append(item)
        else:
            self._container.append(item)
        if unexpected:
            self._finding(self.structures.warnings, "UNEXPECTED_INDENTATION", node,
                          f"left indent {indent}pt; baseline {self._baseline}pt; known levels {sorted(self._known)}")
        self._known.add(indent)
        if item.subject is not None:
            self._stack.append((indent, item))
        self._attach_chain(item, node)

    def _attach(self, item: ParsedItem, node, scope: str, structure: Optional[str] = None) -> None:
        self._item_counter += 1
        section = self.section
        item.node_id = node.node_id
        item.provenance = Provenance(
            document_id=self.document_id, node_id=node.node_id, block_index=node.block_index, scope=scope,
            lot_order=self.lot.lot_order if self.lot else None,
            section_order=section.section_order if section else None,
            section_ordinal=section.ordinal if section else None,
            section_occurrence=section.occurrence if section else None,
            item_order=self._item_counter,
            left_indent_pt=node.left_indent_pt, leading_tabs=node.leading_tabs,
            bold_spans=list(node.bold_spans), all_bold=node.all_bold, structure=structure,
        )

    def _attach_chain(self, item: ParsedItem, node) -> None:
        for descendant in item.descendants:
            if descendant.relation is None or descendant.relation.source != "chained":
                continue
            descendant.node_id = node.node_id
            descendant.relation.parent_node_id = node.node_id
            descendant.nesting_depth = item.nesting_depth + 1
            descendant.provenance = replace(item.provenance, chain_index=descendant.relation.chain_index,
                                            offset=descendant.offset)
            self._attach_chain(descendant, node)

    # -- bookkeeping -----------------------------------------------------------

    def _reset_nesting(self) -> None:
        self._stack: list = []
        self._known: set = set()
        self._baseline: Optional[float] = None
        self._item_counter = 0

    def _location(self, node) -> str:
        parts = [f"block {node.block_index}"]
        if self.lot is not None:
            parts.insert(0, f"lot {self.lot.lot_order}")
            if self.section is not None:
                parts.insert(1, f"{self.section.ordinal_label} Dam ({self.section.occurrence})")
        else:
            parts.insert(0, "preamble")
        return " / ".join(parts)

    def _account(self, node, status: str, reason: Optional[str]) -> None:
        self.ledger.account(node.node_id, status, reason=reason, location=self._location(node),
                            block_index=node.block_index)

    def _finding(self, bucket: list, code: str, node, detail: Optional[str]) -> None:
        bucket.append(Finding(code=code, node_id=node.node_id, block_index=node.block_index,
                              location=self._location(node), detail=detail or ""))
