"""End-to-end extraction: serialised contract, zero-loss invariant, determinism, errors."""

import json
import unittest
from unittest import mock

from maternal_line import EXTRACTOR_VERSION, OUTPUT_CONTRACT_VERSION
from maternal_line.accounting import SourceAccountingError
from maternal_line.extraction import extract_document, extract_to_json
from maternal_line.fixture_docx import build_docx_bytes
from maternal_line.model import (
    ACCOUNTING_STATUSES,
    ERROR,
    EXPLICITLY_AMBIGUOUS,
    EXPLICITLY_UNSUPPORTED,
    PARSED,
    PRESERVED_UNPARSED,
)
from maternal_line.source_walk import walk_source

# One fixture exercising every Baseline B structure class with invented content.
RICH_FIXTURE = [
    ("p", "Spring Auction — maternal lines"),
    ("table", [["Lot 12", "ZEPHYR MOON"], ["bay mare", "born 2019"]]),
    ("p", "2024: pl 1st CSI1* Riverbend 1.20m, 2025: won CSI2* Ashgrove 1.30m"),
    ("p", "Full brother to a Grand Prix horse"),
    ("p", "1st Dam"),
    ("p", "AURORA LAKE: sj 1.40m (2010)(Ilse Vandenberg)(NED) 2018: pl 1st CSI2* Riverbend 1.40m, "
          "2019: pl 3rd CSI3* Ashgrove 1.45m. 2020: competed at CSI4* Söderby etc. Approved KWPN, Approved HOLST dam of:",
     {"indent": 5, "bold": ["1.40m"]}),
    ("p", "FOAL A: sj 1.35m (2016)(Łucja Nowák)(POL) 2023: pl,2nd CSI2* Riverbend dam of:", {"indent": 14}),
    ("p", "GRANDFOAL: CCI4*-L (2021) 2025: pl1st CCI4*-L Ashgrove", {"indent": 25}),
    ("p", "FOAL B: sj1.30m (2017) dam of: LATE FOAL: sj 1m (2022), Breeze, Comet etc.", {"indent": 14}),
    ("p", "Full sister to NORTHERN STAR", {"indent": 5}),
    ("p", "2nd Dam: BRISK WIND: SJ 1.40M (2001) 2009: 2nd CSI2* Riverbend, 2010: pl 1st"),
    ("p", "3rd Dam"),
    ("p", "CALM HARBOUR: zq 9.9x 2001: pl 1st Riverbend"),
    ("p", "3rd Dam"),
    ("p", "CALM HARBOUR: (SEE ABOVE)"),
    ("p", "4th Dam continued on the following page"),
    ("p", ""),
    ("table", [["", ""]]),
    ("p", "1st Dam"),
    ("p", "QUIET RIVER: dr 1.20m", {"indent": 5}),
    ("p", "ODD INDENT: sj 1.10m", {"indent": 40}),
]


def collect_node_ids(payload):
    """Every node_id reachable in the serialised structure tree (not the ledger)."""
    found = []

    def visit_item(item):
        found.append(item["node_id"])
        for descendant in item["descendants"]:
            if descendant["relation"]["source"] == "indented":
                visit_item(descendant)

    for item in payload["preamble"]:
        visit_item(item)
    for lot in payload["lots"]:
        found.append(lot["node_id"])
        for item in lot["items"]:
            visit_item(item)
        for section in lot["sections"]:
            found.append(section["node_id"])
            for item in section["items"]:
                if item["node_id"] != section["node_id"]:
                    visit_item(item)
                else:
                    for descendant in item["descendants"]:
                        if descendant["relation"]["source"] == "indented":
                            visit_item(descendant)
    return found


class ZeroLossInvariantTest(unittest.TestCase):
    def setUp(self):
        self.data = build_docx_bytes(RICH_FIXTURE)
        self.doc = extract_document(self.data, document_id="rich.docx")
        self.payload = self.doc.to_dict()

    def test_every_meaningful_source_node_is_accounted_exactly_once(self):
        walk = walk_source(self.data, document_id="rich.docx")
        meaningful_ids = [node.node_id for node in walk.meaningful_nodes]
        ledger_ids = [entry["node_id"] for entry in self.payload["report"]["ledger"]]
        self.assertEqual(sorted(meaningful_ids), sorted(ledger_ids))
        self.assertEqual(len(ledger_ids), len(set(ledger_ids)))
        tree_ids = collect_node_ids(self.payload)
        self.assertEqual(sorted(tree_ids), sorted(meaningful_ids))
        self.assertEqual(len(tree_ids), len(set(tree_ids)))

    def test_accounting_totals_reconcile_and_unaccounted_is_zero(self):
        accounting = self.payload["report"]["accounting"]
        self.assertEqual(accounting["unaccounted"], 0)
        self.assertEqual(accounting["missing_node_ids"], [])
        self.assertEqual(accounting["duplicate_node_ids"], [])
        self.assertEqual(accounting["skipped_items"], 0)
        self.assertEqual(
            accounting["meaningful_source_nodes"],
            sum(accounting[status] for status in ACCOUNTING_STATUSES),
        )
        self.assertGreater(accounting["structural_nodes_excluded"], 0)
        self.assertGreater(accounting[PARSED], 0)
        self.assertGreater(accounting[PRESERVED_UNPARSED], 0)
        self.assertGreater(accounting[EXPLICITLY_UNSUPPORTED], 0)
        self.assertGreater(accounting[EXPLICITLY_AMBIGUOUS], 0)
        self.assertEqual(accounting[ERROR], 0)

    def test_ledger_entries_carry_status_reason_and_location(self):
        for entry in self.payload["report"]["ledger"]:
            self.assertIn(entry["status"], ACCOUNTING_STATUSES)
            self.assertIsInstance(entry["block_index"], int)
            self.assertIsInstance(entry["location"], str)

    def test_segment_accounting_is_exposed(self):
        segments = self.payload["report"]["accounting"]["segments"]
        self.assertEqual(
            segments["total"],
            segments[PARSED] + segments[PRESERVED_UNPARSED] + segments[EXPLICITLY_AMBIGUOUS],
        )
        self.assertGreater(segments[PRESERVED_UNPARSED], 0)

    def test_dropping_a_node_in_structuring_fails_loudly(self):
        from maternal_line import structure

        original = structure.StructureBuilder.handle_paragraph

        def drop_free_text(self, node):
            if node.text.startswith("Full sister"):
                return None  # simulated parser bug: node vanishes
            return original(self, node)

        with mock.patch.object(structure.StructureBuilder, "handle_paragraph", drop_free_text):
            with self.assertRaises(SourceAccountingError) as raised:
                extract_document(self.data, document_id="rich.docx")
        self.assertIn("missing", str(raised.exception))

    def test_double_accounting_a_node_fails_loudly(self):
        from maternal_line import structure

        original = structure.StructureBuilder.handle_paragraph

        def account_twice(self, node):
            original(self, node)
            if node.text.startswith("Full sister"):
                self.ledger.account(node.node_id, PARSED)

        with mock.patch.object(structure.StructureBuilder, "handle_paragraph", account_twice):
            with self.assertRaises(SourceAccountingError) as raised:
                extract_document(self.data, document_id="rich.docx")
        self.assertIn("duplicate", str(raised.exception))

    def test_parser_exception_becomes_error_state_with_raw_text_preserved(self):
        from maternal_line import structure

        real_parse = structure.parse_item

        def explode(text, **kwargs):
            if text.startswith("QUIET RIVER"):
                raise RuntimeError("synthetic parser failure")
            return real_parse(text, **kwargs)

        with mock.patch.object(structure, "parse_item", explode):
            doc = extract_document(self.data, document_id="rich.docx")
        payload = doc.to_dict()
        errored = [i for lot in payload["lots"] for s in lot["sections"] for i in s["items"] if i["status"] == ERROR]
        self.assertEqual(len(errored), 1)
        self.assertEqual(errored[0]["text"], "QUIET RIVER: dr 1.20m")
        self.assertIn("synthetic parser failure", errored[0]["status_reason"])
        self.assertEqual(payload["report"]["accounting"][ERROR], 1)
        self.assertEqual(payload["report"]["accounting"]["unaccounted"], 0)
        self.assertEqual(len(payload["report"]["errors"]), 1)
        self.assertNotIn("Traceback", errored[0]["status_reason"])


class SerialisedContractTest(unittest.TestCase):
    def setUp(self):
        self.data = build_docx_bytes(RICH_FIXTURE)
        self.payload = extract_document(self.data, document_id="rich.docx").to_dict()

    def test_document_level_evidence(self):
        self.assertEqual(self.payload["extractor"]["version"], EXTRACTOR_VERSION)
        self.assertEqual(self.payload["extractor"]["output_contract_version"], OUTPUT_CONTRACT_VERSION)
        self.assertIn("python_docx", self.payload["extractor"]["runtime"])
        document = self.payload["document"]
        self.assertEqual(document["document_id"], "rich.docx")
        self.assertEqual(len(document["source_fingerprint_sha256"]), 64)
        self.assertEqual(self.payload["report"]["counts"]["lots"], 2)
        self.assertEqual(self.payload["report"]["counts"]["dam_sections"], 6)

    def test_no_persistence_or_identity_fields_are_invented(self):
        text = json.dumps(self.payload)
        for forbidden in ("horse_id", "import_timestamp", "table_name", "storehorse", "mareline_id"):
            self.assertNotIn(forbidden, text)

    def test_lot_carries_identity_items_sections_and_provenance(self):
        lot = self.payload["lots"][0]
        self.assertEqual(lot["lot_order"], 1)
        self.assertEqual(lot["identity"]["lot_number"], 12)
        self.assertEqual(lot["identity"]["status"], PARSED)
        self.assertEqual([i["kind"] for i in lot["items"]], ["result_record", "free_text"])
        self.assertEqual([s["ordinal"] for s in lot["sections"]], [1, 2, 3, 3, 4])
        self.assertEqual([s["occurrence"] for s in lot["sections"]], [1, 1, 1, 2, 1])

    def test_entry_serialisation_keeps_raw_text_provenance_and_structure(self):
        entry = self.payload["lots"][0]["sections"][0]["items"][0]
        self.assertEqual(entry["subject"]["name"], "AURORA LAKE")
        self.assertTrue(entry["raw_text"].startswith("AURORA LAKE: sj 1.40m"))
        provenance = entry["provenance"]
        self.assertEqual(provenance["document_id"], "rich.docx")
        self.assertEqual(provenance["lot_order"], 1)
        self.assertEqual(provenance["section_ordinal"], 1)
        self.assertEqual(provenance["section_occurrence"], 1)
        self.assertEqual(provenance["section_order"], 1)
        self.assertEqual(provenance["item_order"], 1)
        self.assertEqual(provenance["scope"], "section")
        self.assertEqual(provenance["left_indent_pt"], 5.0)
        self.assertEqual(provenance["bold_spans"], ["1.40m"])
        self.assertEqual([a["code"] for a in entry["subject"]["approvals"]], ["KWPN", "HOLST"])
        self.assertEqual([r["year"] for r in entry["results"]], [2018, 2019, 2020])
        self.assertEqual(entry["results"][2]["placing_kind"], "competed")
        self.assertEqual(len(entry["etc_markers"]), 1)
        self.assertTrue(entry["descendant_marker"]["trailing"])
        names = [d["subject"]["name"] for d in entry["descendants"]]
        self.assertEqual(names, ["FOAL A", "FOAL B"])
        foal_a = entry["descendants"][0]
        self.assertEqual(foal_a["relation"]["source"], "indented")
        self.assertEqual(foal_a["subject"]["rider"], "Łucja Nowák")
        self.assertEqual(foal_a["descendants"][0]["subject"]["level"]["code"], "CCI")
        foal_b = entry["descendants"][1]
        self.assertEqual(foal_b["subject"]["level"]["raw"], "sj1.30m")
        self.assertEqual(foal_b["descendants"][0]["relation"]["source"], "chained")
        self.assertEqual(foal_b["descendants"][0]["subject"]["level"]["height_m"], 1.0)
        self.assertEqual(entry["subject"]["birth_year"], 2010)
        self.assertEqual(entry["subject"]["rider"], "Ilse Vandenberg")

    def test_unknown_level_and_see_above_and_merged_heading_are_visible(self):
        sections = self.payload["lots"][0]["sections"]
        unknown_level = sections[2]["items"][0]
        self.assertIsNone(unknown_level["subject"]["level"])
        self.assertEqual([s["text"] for s in unknown_level["unparsed_segments"]], ["zq 9.9x"])
        see_above = sections[3]["items"][0]
        self.assertTrue(see_above["see_above"]["present"])
        self.assertEqual(sections[3]["status"], EXPLICITLY_AMBIGUOUS)
        merged = sections[4]
        self.assertIn("MERGED_HEADING", merged["flags"])
        self.assertEqual(merged["items"][0]["status"], EXPLICITLY_AMBIGUOUS)

    def test_second_lot_reports_missing_identity_and_unexpected_indentation(self):
        lot = self.payload["lots"][1]
        self.assertEqual(lot["identity"]["status"], EXPLICITLY_UNSUPPORTED)
        structures = self.payload["report"]["structures"]
        self.assertIn("LOT_IDENTITY_MISSING", [f["code"] for f in structures["unsupported"]])
        self.assertIn("INDENTATION_WITHOUT_DAM_OF_MARKER", [f["code"] for f in structures["ambiguous"]])

    def test_report_matches_fr001_shape(self):
        report = self.payload["report"]
        for key in ("counts", "accounting", "structures", "errors", "ledger"):
            self.assertIn(key, report)
        for key in ("lots", "dam_sections", "items", "entries", "results", "descendants"):
            self.assertIn(key, report["counts"])
        self.assertEqual(report["errors"], [])
        self.assertTrue(report["complete"])


class DeterminismTest(unittest.TestCase):
    def test_same_input_produces_identical_json(self):
        data = build_docx_bytes(RICH_FIXTURE)
        first = extract_to_json(data, document_id="rich.docx")
        second = extract_to_json(data, document_id="rich.docx")
        self.assertEqual(first, second)
        self.assertTrue(first.endswith("\n"))
        parsed = json.loads(first)
        self.assertEqual(parsed["document"]["document_id"], "rich.docx")


if __name__ == "__main__":
    unittest.main()
