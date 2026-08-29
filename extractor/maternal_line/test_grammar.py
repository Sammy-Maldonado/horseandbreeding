"""Entry grammar: subject head, results, levels, approvals, descendants, markers.

Pure-string tests. Structural (.docx) behaviour lives in test_structure.py.
"""

import unittest

from maternal_line.grammar import parse_item
from maternal_line.model import (
    EXPLICITLY_AMBIGUOUS,
    PARSED,
    PRESERVED_UNPARSED,
)

CANONICAL = (
    "ZEPHYR MOON: sj 1.40m (2010)(Ilse Vandenberg)(NED) "
    "2018: pl 1st CSI2* Riverbend 1.40m, 2019: pl 3rd CSI3* Ashgrove 1.45m, Approved KWPN"
)


def result_tuples(item):
    return [(r.year, r.placing, r.detail) for r in item.results]


class CanonicalEntryTest(unittest.TestCase):
    def test_canonical_entry_is_fully_parsed(self):
        item = parse_item(CANONICAL)
        self.assertEqual(item.kind, "entry")
        self.assertEqual(item.status, PARSED)
        self.assertEqual(item.subject.name, "ZEPHYR MOON")
        self.assertEqual(item.subject.level.code, "sj")
        self.assertEqual(item.subject.level.height_m, 1.40)
        self.assertEqual(item.subject.level.raw, "sj 1.40m")
        self.assertEqual(item.subject.birth_year, 2010)
        self.assertEqual(item.subject.rider, "Ilse Vandenberg")
        self.assertEqual(item.subject.country, "NED")
        self.assertEqual([a.code for a in item.subject.approvals], ["KWPN"])
        self.assertEqual(result_tuples(item), [
            (2018, "1st", "CSI2* Riverbend 1.40m"),
            (2019, "3rd", "CSI3* Ashgrove 1.45m"),
        ])
        self.assertEqual(item.unparsed_segments, [])

    def test_raw_text_is_never_destroyed_by_parsing(self):
        item = parse_item(CANONICAL)
        self.assertEqual(item.text, CANONICAL)
        self.assertEqual([seg.offset for seg in item.segments], sorted(seg.offset for seg in item.segments))
        covered = " ".join(seg.text for seg in item.segments)
        for token in ("ZEPHYR MOON", "sj 1.40m", "(2010)", "(Ilse Vandenberg)", "(NED)",
                      "2018: pl 1st CSI2* Riverbend 1.40m", "2019: pl 3rd CSI3* Ashgrove 1.45m",
                      "Approved KWPN"):
            self.assertIn(token, covered)

    def test_name_is_text_before_first_colon_with_head_notes_separated(self):
        item = parse_item("ZEPHYR MOON (v. NORTHERN GALE): sj 1.40m")
        self.assertEqual(item.subject.name, "ZEPHYR MOON")
        self.assertEqual(item.subject.name_raw, "ZEPHYR MOON (v. NORTHERN GALE)")
        self.assertEqual(item.subject.sire_note, "v. NORTHERN GALE")

    def test_birth_year_inside_head_before_colon_is_subject_birth_year(self):
        item = parse_item("ZEPHYR MOON (2011): sj 1.40m")
        self.assertEqual(item.subject.birth_year, 2011)

    def test_whitespace_is_normalised_but_raw_kept(self):
        item = parse_item("ZEPHYR  MOON:\tsj   1.40m")
        self.assertEqual(item.text, "ZEPHYR MOON: sj 1.40m")
        self.assertEqual(item.raw_text, "ZEPHYR  MOON:\tsj   1.40m")

    def test_unicode_rider_and_names(self):
        item = parse_item("HŐSÉG CSILLAG: sj 1.40m (2012)(Łucja Nowák)(POL) 2019: pl 1st CSI2* Söderby")
        self.assertEqual(item.subject.name, "HŐSÉG CSILLAG")
        self.assertEqual(item.subject.rider, "Łucja Nowák")
        self.assertEqual(item.subject.country, "POL")
        self.assertEqual(result_tuples(item), [(2019, "1st", "CSI2* Söderby")])

    def test_rider_with_hyphen_and_apostrophe(self):
        item = parse_item("ZEPHYR MOON: sj 1.40m (Anne-Marie O'Neill)(IRL)")
        self.assertEqual(item.subject.rider, "Anne-Marie O'Neill")
        self.assertEqual(item.subject.country, "IRL")


class ResultGrammarTest(unittest.TestCase):
    def test_second_result_is_never_swallowed_into_previous_detail(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend, 2019: pl 2nd CSI3* Ashgrove")
        self.assertEqual(len(item.results), 2)
        self.assertNotIn("2019", item.results[0].detail)

    def test_won_result(self):
        item = parse_item("A: sj 1.40m 2018: won CSI2* Riverbend Grand Prix")
        self.assertEqual(result_tuples(item), [(2018, "won", "CSI2* Riverbend Grand Prix")])
        self.assertEqual(item.results[0].placing_kind, "won")
        self.assertEqual(item.results[0].status, PARSED)

    def test_competed_at_result_has_no_placing(self):
        item = parse_item("A: sj 1.40m 2018: competed at CSI2* Riverbend")
        self.assertEqual(result_tuples(item), [(2018, None, "CSI2* Riverbend")])
        self.assertEqual(item.results[0].placing_kind, "competed")

    def test_bare_ordinal_result(self):
        item = parse_item("A: sj 1.40m 2018: 2nd CSI2* Riverbend")
        self.assertEqual(result_tuples(item), [(2018, "2nd", "CSI2* Riverbend")])

    def test_pl_without_space_and_pl_comma_variants(self):
        item = parse_item("A: sj 1.40m 2018: pl1st CSI2* Riverbend, 2019: pl,1st CSI3* Ashgrove")
        self.assertEqual(result_tuples(item), [
            (2018, "1st", "CSI2* Riverbend"),
            (2019, "1st", "CSI3* Ashgrove"),
        ])

    def test_placing_less_year_group(self):
        item = parse_item("A: sj 1.40m 2018: CSI2* Riverbend")
        self.assertEqual(result_tuples(item), [(2018, None, "CSI2* Riverbend")])
        self.assertEqual(item.results[0].placing_kind, None)

    def test_full_stop_separated_results(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend. 2019: pl 2nd CSI3* Ashgrove.")
        self.assertEqual(result_tuples(item), [
            (2018, "1st", "CSI2* Riverbend"),
            (2019, "2nd", "CSI3* Ashgrove"),
        ])

    def test_whitespace_separated_results(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend 2019: pl 2nd CSI3* Ashgrove")
        self.assertEqual(result_tuples(item), [
            (2018, "1st", "CSI2* Riverbend"),
            (2019, "2nd", "CSI3* Ashgrove"),
        ])

    def test_result_without_trailing_detail(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend, 2019: pl 2nd")
        self.assertEqual(result_tuples(item), [(2018, "1st", "CSI2* Riverbend"), (2019, "2nd", None)])

    def test_fault_annotation_is_preserved_in_detail(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend 1.40m (4 faults)")
        self.assertEqual(item.results[0].detail, "CSI2* Riverbend 1.40m (4 faults)")

    def test_year_without_colon_after_separator_starts_a_result(self):
        item = parse_item("A: sj 1.40m 2018 pl 1st CSI2* Riverbend, 2019 pl 2nd CSI3* Ashgrove")
        self.assertEqual(result_tuples(item), [
            (2018, "1st", "CSI2* Riverbend"),
            (2019, "2nd", "CSI3* Ashgrove"),
        ])

    def test_year_inside_detail_does_not_split_result(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st Nations Cup 2018 Riverbend")
        self.assertEqual(result_tuples(item), [(2018, "1st", "Nations Cup 2018 Riverbend")])

    def test_each_result_keeps_raw_segment_and_offset(self):
        text = "A: sj 1.40m 2018: pl 1st CSI2* Riverbend, 2019: pl 2nd CSI3* Ashgrove"
        item = parse_item(text)
        self.assertEqual(item.results[0].raw, "2018: pl 1st CSI2* Riverbend")
        self.assertEqual(item.results[1].raw, "2019: pl 2nd CSI3* Ashgrove")
        self.assertEqual(text[item.results[1].offset:].startswith("2019"), True)

    def test_unrecognised_free_text_between_head_and_results_is_preserved_and_reported(self):
        item = parse_item("A: sj 1.40m Grand Prix winner 2018: pl 1st CSI2* Riverbend")
        self.assertEqual(item.status, PARSED)
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["Grand Prix winner"])
        self.assertEqual(item.unparsed_segments[0].status, PRESERVED_UNPARSED)
        self.assertEqual(result_tuples(item), [(2018, "1st", "CSI2* Riverbend")])

    def test_free_text_tail_after_results_is_preserved(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend, full sister to AURORA LAKE")
        self.assertEqual(result_tuples(item), [(2018, "1st", "CSI2* Riverbend")])
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["full sister to AURORA LAKE"])

    def test_birth_year_in_result_detail_is_not_the_subject_birth_year(self):
        item = parse_item("A: sj 1.40m 2018: pl 1st CSI2* Riverbend (2010)")
        self.assertIsNone(item.subject.birth_year)
        self.assertEqual(item.results[0].detail, "CSI2* Riverbend (2010)")


class LevelGrammarTest(unittest.TestCase):
    def assert_level(self, text, code, **fields):
        item = parse_item(text)
        self.assertIsNotNone(item.subject.level, text)
        self.assertEqual(item.subject.level.code, code)
        for key, value in fields.items():
            self.assertEqual(getattr(item.subject.level, key), value, f"{text} -> {key}")
        return item

    def test_whole_metre_height(self):
        self.assert_level("A: sj 1m", "sj", height_m=1.0, raw="sj 1m")

    def test_uppercase_and_unspaced_showjumping(self):
        self.assert_level("A: SJ 1.40M", "sj", height_m=1.40, raw="SJ 1.40M")
        self.assert_level("A: sj1.40m", "sj", height_m=1.40, raw="sj1.40m")

    def test_dressage_and_eventing_codes(self):
        self.assert_level("A: dr 1.20m", "dr", height_m=1.20)
        self.assert_level("A: ev 1.10m", "ev", height_m=1.10)

    def test_cci_family(self):
        self.assert_level("A: CCI4*-L 2019: pl 1st Ashgrove", "CCI", stars=4, modifier="L", raw="CCI4*-L")
        self.assert_level("A: CNC1*", "CNC", stars=1)
        self.assert_level("A: CIC**", "CIC", stars=2)
        self.assert_level("A: CDI3*", "CDI", stars=3)
        self.assert_level("A: cci 2*", "CCI", stars=2, raw="cci 2*")

    def test_unknown_level_code_is_preserved_not_turned_into_absence(self):
        item = parse_item("A: zq 9.9x 2018: pl 1st CSI2* Riverbend")
        self.assertIsNone(item.subject.level)
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["zq 9.9x"])
        self.assertEqual(result_tuples(item), [(2018, "1st", "CSI2* Riverbend")])


class ApprovalGrammarTest(unittest.TestCase):
    def test_long_studbook_token(self):
        item = parse_item("A: sj 1.40m Approved HOLST")
        self.assertEqual([(a.code, a.raw) for a in item.subject.approvals], [("HOLST", "Approved HOLST")])

    def test_case_varied_approval(self):
        item = parse_item("A: sj 1.40m approved kwpn")
        self.assertEqual([(a.code, a.raw) for a in item.subject.approvals], [("KWPN", "approved kwpn")])

    def test_multiple_approvals(self):
        item = parse_item("A: sj 1.40m Approved KWPN, Approved BWP and Approved SBS")
        self.assertEqual([a.code for a in item.subject.approvals], ["KWPN", "BWP", "SBS"])

    def test_multiple_studbooks_in_one_approval(self):
        item = parse_item("A: sj 1.40m Approved KWPN/SBS")
        self.assertEqual([a.code for a in item.subject.approvals], ["KWPN", "SBS"])

    def test_approval_before_dam_of_does_not_capture_dam(self):
        item = parse_item("A: sj 1.40m Approved KWPN dam of: B: sj 1.30m")
        self.assertEqual([a.code for a in item.subject.approvals], ["KWPN"])
        self.assertEqual(item.descendants[0].subject.name, "B")


class SubjectScopingTest(unittest.TestCase):
    CHAIN = "MARE: sj 1.30m dam of: FOAL: sj 1.45m (2015)(Rider Two)(BEL) 2022: pl 1st CSI2* Riverbend Approved BWP"

    def test_descendant_birth_year_is_not_assigned_to_subject(self):
        self.assertIsNone(parse_item(self.CHAIN).subject.birth_year)

    def test_descendant_rider_is_not_assigned_to_subject(self):
        self.assertIsNone(parse_item(self.CHAIN).subject.rider)

    def test_descendant_country_is_not_assigned_to_subject(self):
        self.assertIsNone(parse_item(self.CHAIN).subject.country)

    def test_descendant_approval_is_not_assigned_to_subject(self):
        item = parse_item(self.CHAIN)
        self.assertEqual(item.subject.approvals, [])
        self.assertEqual([a.code for a in item.descendants[0].subject.approvals], ["BWP"])

    def test_descendant_results_are_not_assigned_to_subject(self):
        item = parse_item(self.CHAIN)
        self.assertEqual(item.results, [])
        self.assertEqual(result_tuples(item.descendants[0]), [(2022, "1st", "CSI2* Riverbend")])
        self.assertEqual(item.descendants[0].subject.birth_year, 2015)
        self.assertEqual(item.descendants[0].subject.rider, "Rider Two")
        self.assertEqual(item.descendants[0].subject.country, "BEL")


class DescendantGrammarTest(unittest.TestCase):
    def test_dam_of_marker_variants(self):
        for text in ("A: sj 1.40m dam of: B: sj 1.30m",
                     "A: sj 1.40m dam of B: sj 1.30m",
                     "A: sj 1.40m dam of; B: sj 1.30m",
                     "A: sj 1.40m Dam of: B: sj 1.30m"):
            item = parse_item(text)
            self.assertIsNotNone(item.descendant_marker, text)
            self.assertEqual(item.descendants[0].subject.name, "B", text)
            self.assertEqual(item.descendants[0].relation.source, "chained")

    def test_chained_dam_of_nests_three_generations(self):
        item = parse_item("A: sj 1.40m dam of: B: sj 1.35m dam of: C: sj 1.30m")
        self.assertEqual(item.subject.name, "A")
        self.assertEqual(item.descendants[0].subject.name, "B")
        self.assertEqual(item.descendants[0].descendants[0].subject.name, "C")
        self.assertEqual(item.descendants[0].descendants[0].relation.source, "chained")

    def test_sibling_descendants_in_one_chain(self):
        item = parse_item("A: sj 1.40m dam of: B: sj 1.35m 2019: pl 1st CSI2* Riverbend, C: sj 1.30m")
        self.assertEqual([d.subject.name for d in item.descendants], ["B", "C"])
        self.assertEqual(result_tuples(item.descendants[0]), [(2019, "1st", "CSI2* Riverbend")])

    def test_descendant_list_without_entry_grammar_is_preserved_not_fabricated(self):
        item = parse_item("A: sj 1.40m dam of: Breeze, Comet and Dune")
        self.assertEqual(item.descendants, [])
        listed = [seg for seg in item.segments if seg.kind == "descendant_list"]
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0].text, "Breeze, Comet and Dune")
        self.assertEqual(listed[0].status, PRESERVED_UNPARSED)

    def test_trailing_dam_of_marker_announces_following_paragraphs(self):
        item = parse_item("A: sj 1.40m dam of:")
        self.assertTrue(item.descendant_marker.trailing)
        self.assertEqual(item.descendants, [])
        self.assertEqual(item.status, PARSED)

    def test_chained_descendant_keeps_provenance_offset(self):
        text = "A: sj 1.40m dam of: B: sj 1.35m"
        item = parse_item(text)
        self.assertEqual(text[item.descendants[0].offset:], "B: sj 1.35m")


class MarkerGrammarTest(unittest.TestCase):
    def test_see_above_is_a_reference_marker_not_content(self):
        text = "AURORA LAKE: (SEE ABOVE)"
        item = parse_item(text)
        self.assertEqual(item.status, PARSED)
        self.assertTrue(item.see_above.present)
        self.assertEqual(item.see_above.offset, text.index("(SEE ABOVE)"))
        self.assertEqual(item.see_above.raw, "(SEE ABOVE)")
        self.assertEqual(item.results, [])
        self.assertEqual(item.unparsed_segments, [])

    def test_see_above_lowercase_detected(self):
        self.assertTrue(parse_item("A: (see above)").see_above.present)

    def test_etc_position_is_retained(self):
        text = "A: sj 1.40m 2018: pl 1st CSI2* Riverbend, 2019: pl 2nd CSI3* Ashgrove etc."
        item = parse_item(text)
        self.assertEqual(len(item.etc_markers), 1)
        self.assertEqual(item.etc_markers[0].offset, text.index("etc."))
        self.assertEqual(item.etc_markers[0].preceding_kind, "result")
        self.assertEqual(item.results[1].detail, "CSI3* Ashgrove")

    def test_etc_after_descendant_list(self):
        item = parse_item("A: sj 1.40m dam of: Breeze, Comet etc.")
        self.assertEqual(item.etc_markers[0].preceding_kind, "descendant_list")


class ColonLessTextTest(unittest.TestCase):
    def test_free_text_paragraph_is_preserved_unparsed(self):
        item = parse_item("Full sister to AURORA LAKE, herself a Grand Prix mare")
        self.assertEqual(item.kind, "free_text")
        self.assertEqual(item.status, PRESERVED_UNPARSED)
        self.assertIsNone(item.subject)
        self.assertEqual(item.text, "Full sister to AURORA LAKE, herself a Grand Prix mare")

    def test_result_only_paragraph_is_a_result_record_not_a_horse_named_2018(self):
        item = parse_item("2018: pl 1st CSI2* Riverbend, 2019: pl 2nd CSI3* Ashgrove")
        self.assertEqual(item.kind, "result_record")
        self.assertIsNone(item.subject)
        self.assertEqual(item.status, PARSED)
        self.assertEqual(len(item.results), 2)

    def test_dam_of_paragraph_is_a_descendant_record(self):
        item = parse_item("dam of: B: sj 1.35m, C: sj 1.30m")
        self.assertEqual(item.kind, "descendant_record")
        self.assertIsNone(item.subject)
        self.assertEqual([d.subject.name for d in item.descendants], ["B", "C"])

    def test_reference_only_paragraph(self):
        item = parse_item("(SEE ABOVE)")
        self.assertEqual(item.kind, "reference")
        self.assertEqual(item.status, PARSED)

    def test_colon_with_empty_head_is_ambiguous(self):
        item = parse_item(": sj 1.40m")
        self.assertEqual(item.status, EXPLICITLY_AMBIGUOUS)


if __name__ == "__main__":
    unittest.main()

class ChainedMarkerOwnershipTest(unittest.TestCase):
    """Markers inside a chained descendant belong to that descendant only."""

    TEXT = "FOAL B: sj 1.30m (2017) dam of: LATE FOAL: sj 1.20m (2022), Breeze, Comet etc."

    def test_etc_inside_chained_descendant_is_reported_once(self):
        item = parse_item(self.TEXT)
        child = item.descendants[0]
        self.assertEqual(child.subject.name, "LATE FOAL")
        self.assertEqual(len(child.etc_markers), 1)
        self.assertEqual(item.etc_markers, [])
        self.assertEqual([seg.text for seg in child.unparsed_segments], ["Breeze, Comet"])

    def test_see_above_inside_chained_descendant_belongs_to_the_child(self):
        item = parse_item("MARE: sj 1.40m dam of: FILLY: (SEE ABOVE)")
        self.assertIsNone(item.see_above)
        self.assertTrue(item.descendants[0].see_above.present)

    def test_segments_never_overlap_or_duplicate_text(self):
        item = parse_item(self.TEXT)
        for node in item.iter_items():
            offsets = [(seg.offset, seg.offset + len(seg.text)) for seg in node.segments]
            for (a_start, a_end), (b_start, _) in zip(offsets, offsets[1:]):
                self.assertLessEqual(a_end, b_start, node.text)


class FusedMarkerTest(unittest.TestCase):
    """Markers fused to adjacent text carry no word boundary and are not markers.

    The corpus contains typo shapes where a word runs straight into "dam of" or
    a digit runs straight off "dam of" / "see above". The grammar must neither
    recognise the fused occurrence as a marker nor fabricate descendants or
    references from it — the fused text is preserved unparsed instead.
    """

    def test_digit_fused_after_dam_of_is_not_a_descendant_marker(self):
        item = parse_item("VELVET STORM: sj 1.35m dam of3 winners")
        self.assertIsNone(item.descendant_marker)
        self.assertEqual(item.descendants, [])
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["dam of3 winners"])
        self.assertEqual(item.unparsed_segments[0].status, PRESERVED_UNPARSED)

    def test_word_fused_before_dam_of_is_not_a_descendant_marker(self):
        item = parse_item("BRONZE FERN: sj 1.30m gooddam of: LILAC POND: sj 1.20m")
        self.assertIsNone(item.descendant_marker)
        self.assertEqual(item.descendants, [])
        self.assertEqual([seg.text for seg in item.unparsed_segments],
                         ["gooddam of: LILAC POND: sj 1.20m"])

    def test_digit_fused_after_see_above_is_not_a_reference(self):
        item = parse_item("AURORA LAKE: see above2018: pl 1st CSI2* Riverbend")
        self.assertIsNone(item.see_above)
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["see above"])
        self.assertEqual(result_tuples(item), [(2018, "1st", "CSI2* Riverbend")])

    def test_word_fused_before_see_above_is_not_a_reference(self):
        item = parse_item("AURORA LAKE: winnersee above")
        self.assertIsNone(item.see_above)
        self.assertEqual([seg.text for seg in item.unparsed_segments], ["winnersee above"])
