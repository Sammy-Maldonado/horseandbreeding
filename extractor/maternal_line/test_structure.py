"""Structural classification on real .docx structure: lots, Dam sections, nesting."""

import unittest

from maternal_line.extraction import extract_document
from maternal_line.fixture_docx import build_docx_bytes
from maternal_line.model import (
    EXPLICITLY_AMBIGUOUS,
    EXPLICITLY_UNSUPPORTED,
    PARSED,
    PRESERVED_UNPARSED,
)

LOT_TABLE = ("table", [["Lot 12", "ZEPHYR MOON"], ["bay mare", "born 2019"]])


def extract(blocks):
    return extract_document(build_docx_bytes(blocks), document_id="fixture.docx")


class LotBoundaryTest(unittest.TestCase):
    def test_each_top_level_table_opens_a_lot(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "AURORA LAKE: sj 1.40m"),
            ("table", [["Lot 13", "NORTHERN GALE"]]),
            ("p", "1st Dam"),
            ("p", "BRISK WIND: sj 1.30m"),
        ])
        self.assertEqual(len(doc.lots), 2)
        self.assertEqual([lot.lot_order for lot in doc.lots], [1, 2])
        self.assertEqual(doc.lots[0].sections[0].items[0].subject.name, "AURORA LAKE")
        self.assertEqual(doc.lots[1].sections[0].items[0].subject.name, "BRISK WIND")

    def test_lot_identity_text_is_read_from_the_table_without_rebuilding_pedigree(self):
        doc = extract([
            ("table", [["Lot 12", "ZEPHYR MOON"], ["Sire: NORTHERN GALE", "Dam: AURORA LAKE"]]),
            ("p", "1st Dam"),
        ])
        identity = doc.lots[0].identity
        self.assertEqual(identity.status, PARSED)
        self.assertEqual(identity.lot_number, 12)
        self.assertEqual(identity.first_cell_text, "Lot 12")
        self.assertEqual(identity.cells, [["Lot 12", "ZEPHYR MOON"], ["Sire: NORTHERN GALE", "Dam: AURORA LAKE"]])
        self.assertIn("ZEPHYR MOON", identity.text)
        serialised = doc.to_dict()["lots"][0]["identity"]
        for forbidden in ("sire", "sire_id", "dam_id", "pedigree", "ancestry"):
            self.assertNotIn(forbidden, serialised)

    def test_lot_without_lot_number_still_preserves_identity_text(self):
        doc = extract([("table", [["ZEPHYR MOON", "bay mare 2019"]]), ("p", "1st Dam")])
        identity = doc.lots[0].identity
        self.assertEqual(identity.status, PARSED)
        self.assertIsNone(identity.lot_number)
        self.assertEqual(identity.first_cell_text, "ZEPHYR MOON")

    def test_empty_lot_table_is_reported_not_invented(self):
        doc = extract([("table", [["", ""]]), ("p", "1st Dam"), ("p", "AURORA LAKE: sj 1.40m")])
        identity = doc.lots[0].identity
        self.assertEqual(identity.status, EXPLICITLY_UNSUPPORTED)
        self.assertIsNone(identity.lot_number)
        codes = [f.code for f in doc.report.structures.unsupported]
        self.assertIn("LOT_IDENTITY_MISSING", codes)

    def test_paragraphs_before_the_first_table_are_preserved_as_document_preamble(self):
        doc = extract([("p", "Spring Auction 2026 — maternal lines"), LOT_TABLE, ("p", "1st Dam")])
        self.assertEqual(len(doc.preamble), 1)
        self.assertEqual(doc.preamble[0].status, PRESERVED_UNPARSED)
        self.assertEqual(doc.preamble[0].provenance.scope, "document")
        self.assertEqual(doc.preamble[0].text, "Spring Auction 2026 — maternal lines")


class DamHeadingTest(unittest.TestCase):
    def test_ordinary_headings_are_case_insensitive_and_ordered(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"), ("p", "A: sj 1.40m"),
            ("p", "2nd Dam:"), ("p", "B: sj 1.30m"),
            ("p", "3RD DAM"), ("p", "C: sj 1.20m"),
            ("p", "7th Dam."), ("p", "D: sj 1.10m"),
        ])
        sections = doc.lots[0].sections
        self.assertEqual([s.ordinal for s in sections], [1, 2, 3, 7])
        self.assertEqual([s.ordinal_label for s in sections], ["1st", "2nd", "3rd", "7th"])
        self.assertEqual([s.occurrence for s in sections], [1, 1, 1, 1])
        self.assertEqual([s.section_order for s in sections], [1, 2, 3, 4])
        self.assertEqual(sections[2].heading_raw, "3RD DAM")
        self.assertEqual([s.items[0].subject.name for s in sections], ["A", "B", "C", "D"])
        self.assertEqual(sections[0].status, PARSED)

    def test_merged_heading_and_entry_both_survive(self):
        doc = extract([LOT_TABLE, ("p", "4th Dam ZEPHYR MOON: sj 1.40m (2001)(Ilse Vandenberg)(NED) 2010: pl 1st CSI2* Riverbend")])
        section = doc.lots[0].sections[0]
        self.assertEqual(section.ordinal, 4)
        self.assertIn("MERGED_HEADING", section.flags)
        self.assertEqual(section.heading_raw, "4th Dam ZEPHYR MOON: sj 1.40m (2001)(Ilse Vandenberg)(NED) 2010: pl 1st CSI2* Riverbend")
        self.assertEqual(section.heading_text, "4th Dam")
        entry = section.items[0]
        self.assertEqual(entry.subject.name, "ZEPHYR MOON")
        self.assertEqual(entry.subject.birth_year, 2001)
        self.assertEqual(entry.status, PARSED)
        self.assertEqual(entry.provenance.structure, "MERGED_HEADING_ENTRY")
        self.assertEqual(entry.node_id, section.node_id)

    def test_merged_heading_with_colon_separator(self):
        doc = extract([LOT_TABLE, ("p", "2nd Dam: AURORA LAKE: sj 1.30m")])
        section = doc.lots[0].sections[0]
        self.assertEqual(section.ordinal, 2)
        self.assertEqual(section.items[0].subject.name, "AURORA LAKE")

    def test_merged_heading_remainder_without_entry_grammar_is_explicitly_ambiguous(self):
        doc = extract([LOT_TABLE, ("p", "4th Dam continued on the following page")])
        section = doc.lots[0].sections[0]
        self.assertEqual(section.ordinal, 4)
        self.assertEqual(section.items[0].status, EXPLICITLY_AMBIGUOUS)
        self.assertEqual(section.items[0].text, "continued on the following page")
        self.assertIn("MERGED_HEADING", section.flags)

    def test_repeated_ordinal_keeps_separate_occurrences(self):
        doc = extract([
            LOT_TABLE,
            ("p", "3rd Dam"), ("p", "A: sj 1.40m"),
            ("p", "3rd Dam"), ("p", "B: sj 1.30m"),
        ])
        sections = doc.lots[0].sections
        self.assertEqual([(s.ordinal, s.occurrence) for s in sections], [(3, 1), (3, 2)])
        self.assertEqual([s.items[0].subject.name for s in sections], ["A", "B"])
        self.assertNotIn("REPEATED_ORDINAL", sections[0].flags)
        self.assertIn("REPEATED_ORDINAL", sections[1].flags)
        self.assertEqual(sections[1].status, EXPLICITLY_AMBIGUOUS)
        self.assertEqual(sections[0].status, PARSED)
        codes = [f.code for f in doc.report.structures.ambiguous]
        self.assertIn("REPEATED_DAM_ORDINAL", codes)

    def test_heading_paragraph_does_not_leak_into_entries(self):
        doc = extract([LOT_TABLE, ("p", "1st Dam"), ("p", "A: sj 1.40m")])
        self.assertEqual(len(doc.lots[0].sections[0].items), 1)


class LotLevelContentTest(unittest.TestCase):
    def test_meaningful_pre_dam_paragraphs_survive_as_lot_level_items(self):
        doc = extract([
            LOT_TABLE,
            ("p", "2024: pl 1st CSI1* Riverbend 1.20m, 2025: pl 2nd CSI2* Ashgrove 1.30m"),
            ("p", "Full brother to a Grand Prix horse"),
            ("p", "1st Dam"),
            ("p", "A: sj 1.40m"),
        ])
        lot = doc.lots[0]
        self.assertEqual(len(lot.items), 2)
        self.assertEqual(lot.items[0].kind, "result_record")
        self.assertEqual(lot.items[0].status, PARSED)
        self.assertEqual(len(lot.items[0].results), 2)
        self.assertEqual(lot.items[0].provenance.scope, "lot")
        self.assertEqual(lot.items[1].status, PRESERVED_UNPARSED)
        self.assertEqual(lot.items[1].text, "Full brother to a Grand Prix horse")
        self.assertEqual(len(lot.sections[0].items), 1)

    def test_pre_dam_entry_with_name_is_parsed_at_lot_level(self):
        doc = extract([LOT_TABLE, ("p", "ZEPHYR MOON: sj 1.20m (2019) dam of:"), ("p", "1st Dam")])
        self.assertEqual(doc.lots[0].items[0].subject.name, "ZEPHYR MOON")
        self.assertTrue(doc.lots[0].items[0].descendant_marker.trailing)

    def test_no_colon_paragraph_after_heading_is_preserved_not_dropped(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "A: sj 1.40m"),
            ("p", "Full sister to AURORA LAKE"),
            ("p", "B: sj 1.30m"),
        ])
        items = doc.lots[0].sections[0].items
        self.assertEqual([i.kind for i in items], ["entry", "free_text", "entry"])
        self.assertEqual(items[1].status, PRESERVED_UNPARSED)
        self.assertEqual(items[1].text, "Full sister to AURORA LAKE")

    def test_result_only_continuation_paragraph_is_kept_as_sibling_record(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "A: sj 1.40m 2018: pl 1st CSI2* Riverbend"),
            ("p", "2019: pl 2nd CSI3* Ashgrove"),
        ])
        items = doc.lots[0].sections[0].items
        self.assertEqual(items[1].kind, "result_record")
        self.assertEqual(items[1].results[0].year, 2019)
        self.assertEqual(len(items[0].results), 1)


class IndentationNestingTest(unittest.TestCase):
    NESTED = [
        LOT_TABLE,
        ("p", "1st Dam"),
        ("p", "MARE: sj 1.30m (2005)(Ilse Vandenberg)(NED) dam of:", {"indent": 5}),
        ("p", "FOAL A: sj 1.40m (2012)(Rider Two)(BEL) dam of:", {"indent": 14}),
        ("p", "GRANDFOAL: sj 1.20m (2019)", {"indent": 25}),
        ("p", "FOAL B: sj 1.35m (2014)", {"indent": 14}),
        ("p", "OTHER MARE: sj 1.10m", {"indent": 5}),
    ]

    def test_relative_indentation_and_dam_of_markers_build_the_hierarchy(self):
        doc = extract(self.NESTED)
        items = doc.lots[0].sections[0].items
        self.assertEqual([i.subject.name for i in items], ["MARE", "OTHER MARE"])
        mare = items[0]
        self.assertEqual([d.subject.name for d in mare.descendants], ["FOAL A", "FOAL B"])
        self.assertEqual([d.subject.name for d in mare.descendants[0].descendants], ["GRANDFOAL"])
        relation = mare.descendants[0].relation
        self.assertEqual(relation.source, "indented")
        self.assertEqual(relation.confidence, "confident")
        self.assertIn("indentation", relation.evidence)
        self.assertIn("dam_of_marker", relation.evidence)
        self.assertEqual(relation.parent_node_id, mare.node_id)
        self.assertEqual(mare.descendants[0].nesting_depth, 1)
        self.assertEqual(mare.descendants[0].descendants[0].nesting_depth, 2)

    def test_subject_fields_are_not_borrowed_from_indented_descendants(self):
        doc = extract(self.NESTED)
        mare = doc.lots[0].sections[0].items[0]
        self.assertEqual(mare.subject.birth_year, 2005)
        self.assertEqual(mare.descendants[0].subject.birth_year, 2012)
        self.assertEqual(mare.descendants[0].subject.rider, "Rider Two")
        self.assertEqual(mare.descendants[0].subject.country, "BEL")

    def test_indentation_values_are_not_a_fixed_lookup_table(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "MARE: sj 1.30m dam of:", {"indent": 0}),
            ("p", "FOAL A: sj 1.40m dam of:", {"indent": 36}),
            ("p", "GRANDFOAL: sj 1.20m", {"indent": 72}),
        ])
        mare = doc.lots[0].sections[0].items[0]
        self.assertEqual(mare.descendants[0].subject.name, "FOAL A")
        self.assertEqual(mare.descendants[0].descendants[0].subject.name, "GRANDFOAL")
        self.assertEqual(mare.descendants[0].provenance.left_indent_pt, 36.0)

    def test_deeper_indentation_without_dam_of_marker_is_nested_but_reported_ambiguous(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "MARE: sj 1.30m", {"indent": 5}),
            ("p", "FOAL A: sj 1.40m", {"indent": 14}),
        ])
        mare = doc.lots[0].sections[0].items[0]
        self.assertEqual(mare.descendants[0].subject.name, "FOAL A")
        self.assertEqual(mare.descendants[0].relation.confidence, "ambiguous")
        self.assertNotIn("dam_of_marker", mare.descendants[0].relation.evidence)
        codes = [f.code for f in doc.report.structures.ambiguous]
        self.assertIn("INDENTATION_WITHOUT_DAM_OF_MARKER", codes)

    def test_indentation_shallower_than_section_baseline_is_reported_never_flattened_silently(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "MARE: sj 1.30m dam of:", {"indent": 14}),
            ("p", "FOAL A: sj 1.40m", {"indent": 25}),
            ("p", "STRAY: sj 1.00m", {"indent": 3}),
        ])
        items = doc.lots[0].sections[0].items
        self.assertEqual([i.subject.name for i in items], ["MARE", "STRAY"])
        codes = [f.code for f in doc.report.structures.warnings]
        self.assertIn("UNEXPECTED_INDENTATION", codes)
        self.assertEqual(items[1].status, PARSED)

    def test_indentation_between_known_levels_is_reported(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "MARE: sj 1.30m dam of:", {"indent": 5}),
            ("p", "FOAL A: sj 1.40m dam of:", {"indent": 14}),
            ("p", "GRANDFOAL: sj 1.20m", {"indent": 25}),
            ("p", "ODD ONE: sj 1.10m", {"indent": 20}),
        ])
        codes = [f.code for f in doc.report.structures.warnings]
        self.assertIn("UNEXPECTED_INDENTATION", codes)
        mare = doc.lots[0].sections[0].items[0]
        # Nested under the nearest shallower entry (FOAL A), but never presented as certain.
        odd = [d for d in mare.descendants[0].descendants if d.subject.name == "ODD ONE"]
        self.assertEqual(len(odd), 1)
        self.assertEqual(odd[0].relation.confidence, "ambiguous")
        self.assertIn("unexpected_indentation", odd[0].relation.evidence)
        self.assertEqual(odd[0].provenance.left_indent_pt, 20.0)

    def test_chained_and_indented_descendants_combine(self):
        doc = extract([
            LOT_TABLE,
            ("p", "1st Dam"),
            ("p", "MARE: sj 1.30m dam of: FOAL A: sj 1.40m", {"indent": 5}),
            ("p", "FOAL B: sj 1.35m", {"indent": 14}),
        ])
        mare = doc.lots[0].sections[0].items[0]
        self.assertEqual([(d.subject.name, d.relation.source) for d in mare.descendants],
                         [("FOAL A", "chained"), ("FOAL B", "indented")])


if __name__ == "__main__":
    unittest.main()
