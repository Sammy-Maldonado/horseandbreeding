"""Entry grammar for maternal-line write-up paragraphs.

Pure string parsing: no python-docx, no document structure. ``parse_item``
turns one paragraph's text into a ParsedItem whose segments cover the text
with explicit statuses, so anything the grammar does not understand is
preserved and reported instead of silently dropped.

Grammar reference: docs/domain/writeup-grammar.md.
"""

from __future__ import annotations

import re
from typing import Optional

from maternal_line.model import (
    EXPLICITLY_AMBIGUOUS,
    PARSED,
    PRESERVED_UNPARSED,
    Approval,
    DescendantMarker,
    EtcMarker,
    Level,
    ParsedItem,
    Relation,
    Result,
    SeeAbove,
    Segment,
    Subject,
)

MIN_YEAR, MAX_YEAR = 1900, 2100

DAM_OF = re.compile(r"\bdam\s+of\b\s*[:;]?", re.I)
SEE_ABOVE = re.compile(r"\(\s*see\s+above\s*\)|\bsee\s+above\b", re.I)
ETC = re.compile(r"\betc\.?(?=$|[\s,;)])", re.I)
# "Approved KWPN", "approved kwpn", "Approved KWPN/SBS", "Approved KWPN, BWP and SBS".
# Continuation studbooks must be upper case so that ", Approved BWP" starts a new match.
APPROVAL = re.compile(
    r"\b(?i:approved)\s+([A-Za-z]{2,12})\b((?:\s*(?:,|/|&|(?i:\band\b))\s*[A-Z]{2,12}\b)*)"
)
STUDBOOK = re.compile(r"[A-Za-z]{2,12}")
YEAR = re.compile(r"(?<![\d.])(\d{4})(?!\d)")
RESULT_FOLLOW = re.compile(r"\s*:|\s+(?:pl\b|pl\d|won\b|competed\b|\d+(?:st|nd|rd|th)\b)", re.I)
RESULT = re.compile(
    r"^(\d{4})\s*:?\s*"
    r"(?:pl\s*,?\s*(\d+)\s*(st|nd|rd|th)?\b|(won)\b|(competed\s+at)\b|(\d+(?:st|nd|rd|th))\b)?"
    r"\s*(.*)$",
    re.I | re.S,
)
DETAIL_END = re.compile(r"[,;.]\s+(?=[a-z])")
LEVEL_HEIGHT = re.compile(r"(?<![A-Za-z])(sj|dr|ev)\s*(\d(?:[.,]\d{1,2})?)\s*m(?![A-Za-z])", re.I)
LEVEL_FEI = re.compile(
    r"(?<![A-Za-z])(cci|cic|cnc|cdi|csio|csi|cdn|ccn)\s*(\d)?\s*(\*+)?(?:\s*-\s*([A-Za-z]))?(?![A-Za-z*])",
    re.I,
)
PAREN = re.compile(r"\(([^()]*)\)")
SIRE_NOTE = re.compile(r"^(?:v\.|by|by:)\s*(.+)$", re.I)
COUNTRY = re.compile(r"^[A-Z]{2,3}$")
SIBLING_FIRST = re.compile(r"([^\d:,;.()]{1,80}?)\s*:")
SIBLING_NEXT = re.compile(r"(?<=[,;.])\s*([^\d:,;.()]{1,80}?)\s*:")
NOT_A_NAME = re.compile(r"^(pl|won|competed at|dam of|approved)\b", re.I)
HAS_LETTER = re.compile(r"[^\W\d_]")
STRIP_CHARS = " \t,;.:"
MARKER_KINDS = {"etc", "see_above", "descendant_marker"}


def normalise(text: str) -> str:
    return " ".join(text.split())


def parse_item(text: str, raw_text: Optional[str] = None) -> ParsedItem:
    """Parse one paragraph of write-up text into a ParsedItem (pure function)."""
    raw_text = text if raw_text is None else raw_text
    text = normalise(text)
    item = ParsedItem(kind="free_text", status=PRESERVED_UNPARSED, raw_text=raw_text, text=text)
    if not text:
        item.status_reason = "empty text"
        return item
    _Parser(item, text, 0).run()
    return item


class _Parser:
    """Parses ``text`` into ``item``; every offset is ``base`` + local offset."""

    def __init__(self, item: ParsedItem, text: str, base: int):
        self.item = item
        self.text = text
        self.base = base
        self.spans: list = []  # (start, end, kind, status, reason)

    # -- top level ---------------------------------------------------------

    def run(self) -> None:
        item, text = self.item, self.text
        if DAM_OF.match(text):
            item.kind = "descendant_record"
            item.status = PARSED
            self._parse_body(0)
        else:
            colon = _first_colon(text)
            head = text[:colon].strip() if colon >= 0 else None
            if head is not None and HAS_LETTER.search(head) and not NOT_A_NAME.match(head):
                item.kind = "entry"
                item.status = PARSED
                item.subject = self._parse_head(head, text[:colon])
                self._parse_body(colon + 1)
            elif head is not None and not head:
                item.kind = "entry"
                item.status = EXPLICITLY_AMBIGUOUS
                item.status_reason = "a colon with no name before it"
                self._claim(0, len(text), "free_text", EXPLICITLY_AMBIGUOUS, item.status_reason)
            else:
                self._parse_body(0)
                self._classify_headless()
        self._finish()

    def _classify_headless(self) -> None:
        item = self.item
        if item.results:
            item.kind = "result_record"
            item.status = PARSED
            return
        content_kinds = {kind for (_, _, kind, _, _) in self.spans if kind not in MARKER_KINDS}
        if not content_kinds and (item.see_above or item.etc_markers):
            item.kind = "reference"
            item.status = PARSED
            return
        # Plain prose: keep the whole paragraph verbatim as one preserved segment.
        item.kind = "free_text"
        item.status = PRESERVED_UNPARSED
        item.status_reason = "no entry grammar recognised"
        item.subject = None
        item.descendants = []
        item.descendant_marker = None
        self.spans = [(0, len(self.text), "free_text", PRESERVED_UNPARSED, item.status_reason)]

    # -- head --------------------------------------------------------------

    def _parse_head(self, head: str, head_raw: str) -> Subject:
        subject = Subject(name=head, name_raw=head)
        name = head
        for match in PAREN.finditer(head):
            content = match.group(1).strip()
            sire = SIRE_NOTE.match(content)
            if sire and subject.sire_note is None:
                subject.sire_note = content
            elif YEAR.fullmatch(content) and subject.birth_year is None and _is_year(content):
                subject.birth_year = int(content)
            else:
                subject.head_notes.append(content)
            name = name.replace(match.group(0), " ")
        subject.name = normalise(name)
        self._claim(0, len(head_raw), "name", PARSED)
        return subject

    # -- body --------------------------------------------------------------

    def _parse_body(self, start: int) -> None:
        text = self.text
        body_start = _skip_ws(text, start)
        dam = DAM_OF.search(text, body_start)
        subject_end = dam.start() if dam else len(text)
        self._parse_subject_zone(body_start, subject_end)
        if dam:
            trailing = text[dam.end():].strip() == ""
            self.item.descendant_marker = DescendantMarker(
                raw=dam.group(0).strip(), offset=self.base + dam.start(), trailing=trailing
            )
            self._claim(dam.start(), dam.end(), "descendant_marker", PARSED)
            self._parse_descendants(dam.end())

    def _parse_subject_zone(self, lo: int, hi: int) -> None:
        text, item = self.text, self.item
        subject = item.subject
        for match in APPROVAL.finditer(text, lo, hi):
            codes = [match.group(1).upper()] + [tok.upper() for tok in STUDBOOK.findall(match.group(2))]
            raw = match.group(0)
            if subject is not None:
                subject.approvals.extend(Approval(code=code, raw=raw) for code in codes)
                self._claim(match.start(), match.end(), "approval", PARSED)
            else:
                self._claim(match.start(), match.end(), "approval", PRESERVED_UNPARSED,
                            "approval without a subject")
        self._parse_markers(lo, hi)
        starts = self._result_starts(lo, hi)
        head_end = starts[0] if starts else hi
        self._parse_head_zone(lo, head_end, subject)
        for index, start in enumerate(starts):
            next_start = starts[index + 1] if index + 1 < len(starts) else hi
            end = min([next_start] + [s for (s, _, _, _, _) in self.spans if start < s < next_start])
            self._parse_result(start, end)

    def _parse_markers(self, lo: int, hi: int) -> None:
        text, item = self.text, self.item
        for match in SEE_ABOVE.finditer(text, lo, hi):
            if self._overlaps(match.start(), match.end()):
                continue
            if item.see_above is None:
                item.see_above = SeeAbove(True, raw=match.group(0), offset=self.base + match.start())
            self._claim(match.start(), match.end(), "see_above", PARSED)
        for match in ETC.finditer(text, lo, hi):
            if self._overlaps(match.start(), match.end()):
                continue
            item.etc_markers.append(EtcMarker(raw=match.group(0), offset=self.base + match.start(),
                                              preceding_kind=None))
            self._claim(match.start(), match.end(), "etc", PARSED)

    def _result_starts(self, lo: int, hi: int) -> list:
        text = self.text
        starts = []
        for match in YEAR.finditer(text, lo, hi):
            if self._overlaps(match.start(), match.end()) or not _is_year(match.group(1)):
                continue
            follow = text[match.end():hi]
            before = text[lo:match.start()].rstrip()
            if RESULT_FOLLOW.match(follow):
                starts.append(match.start())
            elif (not before or before[-1] in ",.;") and re.match(r"\s+\S", follow):
                starts.append(match.start())
        return starts

    def _parse_head_zone(self, lo: int, hi: int, subject: Optional[Subject]) -> None:
        text = self.text
        if subject is None:
            return
        for pattern, builder in ((LEVEL_HEIGHT, _height_level), (LEVEL_FEI, _fei_level)):
            if subject.level is not None:
                break
            for match in pattern.finditer(text, lo, hi):
                if self._overlaps(match.start(), match.end()):
                    continue
                level = builder(match)
                if level is None:
                    continue
                subject.level = level
                self._claim(match.start(), match.end(), "level", PARSED)
                break
        for match in PAREN.finditer(text, lo, hi):
            if self._overlaps(match.start(), match.end()):
                continue
            content = match.group(1).strip()
            sire = SIRE_NOTE.match(content)
            if _is_year(content) and subject.birth_year is None:
                subject.birth_year = int(content)
                kind, status = "birth_year", PARSED
            elif sire and subject.sire_note is None:
                subject.sire_note = content
                kind, status = "sire_note", PARSED
            elif COUNTRY.match(content) and subject.country is None:
                subject.country = content
                kind, status = "country", PARSED
            elif content and subject.rider is None and not COUNTRY.match(content) and not _is_year(content):
                subject.rider = content
                kind, status = "rider", PARSED
            else:
                subject.head_notes.append(content)
                kind, status = "head_note", PRESERVED_UNPARSED
            self._claim(match.start(), match.end(), kind, status,
                        None if status == PARSED else "parenthesised note not understood")

    def _parse_result(self, start: int, end: int) -> None:
        text = self.text
        piece = text[start:end]
        cut = DETAIL_END.search(piece)
        if cut:
            piece = piece[:cut.start()]
        raw = piece.rstrip().rstrip(",;.").rstrip()
        match = RESULT.match(raw)
        if not match:  # cannot happen: the start was a year, but never lose text silently
            self._claim(start, start + len(raw), "result", PRESERVED_UNPARSED, "result not recognised")
            return
        year, number, suffix, won, competed, ordinal, detail = match.groups()
        if number:
            placing, kind = f"{number}{(suffix or '').lower()}", "placed"
        elif won:
            placing, kind = "won", "won"
        elif competed:
            placing, kind = None, "competed"
        elif ordinal:
            placing, kind = ordinal.lower(), "placed"
        else:
            placing, kind = None, None
        detail = detail.strip().rstrip(",;.").strip() or None
        self.item.results.append(Result(
            year=int(year), placing=placing, placing_kind=kind, detail=detail,
            raw=raw, offset=self.base + start,
        ))
        self._claim(start, start + len(raw), "result", PARSED)

    # -- descendants -------------------------------------------------------

    def _parse_descendants(self, pos: int) -> None:
        text, item = self.text, self.item
        lo = _skip_ws(text, pos)
        hi = len(text)
        if lo >= hi:
            return
        first = SIBLING_FIRST.match(text, lo)
        if first is None or NOT_A_NAME.match(first.group(1).strip()) or not HAS_LETTER.search(first.group(1)):
            # Names only, no entry grammar: keep the list verbatim. Markers here belong to this item.
            self._parse_markers(lo, hi)
            end = min([hi] + [s for (s, _, _, _, _) in self.spans if lo <= s < hi])
            listed = text[lo:end].strip(STRIP_CHARS)
            if listed:
                offset = text.index(listed, lo)
                self._claim(offset, offset + len(listed), "descendant_list", PRESERVED_UNPARSED,
                            "descendants listed without entry grammar")
            return
        # Sibling entries: each chunk is parsed on its own, so its markers belong to that child.
        limit = DAM_OF.search(text, lo)
        limit_pos = limit.start() if limit else hi
        starts = [lo]
        for match in SIBLING_NEXT.finditer(text, first.end(), limit_pos):
            name = match.group(1).strip()
            if not HAS_LETTER.search(name) or NOT_A_NAME.match(name):
                continue
            starts.append(_skip_ws(text, match.start()))
        for index, start in enumerate(starts):
            end = starts[index + 1] if index + 1 < len(starts) else hi
            chunk = text[start:end].rstrip().rstrip(",;.").rstrip()
            if not chunk:
                continue
            child = ParsedItem(kind="entry", status=PARSED, raw_text=chunk, text=chunk, offset=self.base + start)
            child.relation = Relation(source="chained", confidence="confident",
                                      evidence=["dam_of_marker", "same_paragraph"], chain_index=index)
            _Parser(child, chunk, self.base + start).run()
            item.descendants.append(child)
            self._claim(start, start + len(chunk), "descendant_entry", PARSED)

    # -- spans -------------------------------------------------------------

    def _claim(self, start: int, end: int, kind: str, status: str, reason: Optional[str] = None) -> None:
        self.spans.append((start, end, kind, status, reason))

    def _overlaps(self, start: int, end: int) -> bool:
        return any(start < e and s < end for (s, e, _, _, _) in self.spans)

    def _finish(self) -> None:
        text, item = self.text, self.item
        spans = sorted(self.spans)
        segments = []
        cursor = 0
        for start, end, kind, status, reason in spans:
            if start < cursor:  # a grammar bug, never hidden: the node becomes an explicit ERROR
                raise ValueError(f"overlapping grammar spans at offset {self.base + start} ({kind})")
            if start > cursor:
                self._gap(segments, cursor, start)
            segments.append((start, kind, text[start:end], status, reason))
            cursor = end
        if cursor < len(text):
            self._gap(segments, cursor, len(text))
        segments.sort(key=lambda seg: seg[0])
        item.segments = [
            Segment(index=i, kind=kind, text=value, status=status, offset=self.base + start, reason=reason)
            for i, (start, kind, value, status, reason) in enumerate(segments)
        ]
        for marker in item.etc_markers:
            preceding = [seg for seg in item.segments
                         if seg.offset < marker.offset and seg.kind not in MARKER_KINDS]
            marker.preceding_kind = preceding[-1].kind if preceding else None

    def _gap(self, segments: list, start: int, end: int) -> None:
        piece = self.text[start:end].strip(STRIP_CHARS)
        if not piece:
            return
        offset = self.text.index(piece, start)
        segments.append((offset, "free_text", piece, PRESERVED_UNPARSED, "text not covered by the grammar"))


# -- helpers ------------------------------------------------------------------


def _first_colon(text: str) -> int:
    depth = 0
    for index, char in enumerate(text):
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        elif char == ":" and depth == 0:
            return index
    return -1


def _skip_ws(text: str, pos: int) -> int:
    while pos < len(text) and text[pos].isspace():
        pos += 1
    return pos


def _is_year(token: str) -> bool:
    return token.isdigit() and len(token) == 4 and MIN_YEAR <= int(token) <= MAX_YEAR


def _height_level(match) -> Optional[Level]:
    code = match.group(1).lower()
    height = float(match.group(2).replace(",", "."))
    return Level(code=code, raw=match.group(0), height_m=height)


def _fei_level(match) -> Optional[Level]:
    code, digit, stars, modifier = match.groups()
    if digit is None and not stars:
        return None
    star_count = int(digit) if digit else len(stars)
    return Level(code=code.upper(), raw=match.group(0), stars=star_count,
                 modifier=modifier.upper() if modifier else None)
