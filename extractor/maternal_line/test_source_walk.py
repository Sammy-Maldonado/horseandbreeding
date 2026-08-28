"""DOCX source walk: node identity, provenance and meaningful/structural classification."""

import hashlib
import unittest

from maternal_line.fixture_docx import build_docx_bytes
from maternal_line.source_walk import walk_source


class SourceWalkTest(unittest.TestCase):
    def test_walk_yields_body_blocks_in_document_order(self):
        data = build_docx_bytes([
            ("p", "Catalogue preamble"),
            ("table", [["Lot 1", "ZEPHYR MOON"]]),
            ("p", "1st Dam"),
            ("p", "AURORA LAKE: sj 1.40m"),
        ])
        walk = walk_source(data, document_id="fixture.docx")
        kinds = [node.kind for node in walk.nodes]
        self.assertEqual(kinds[:4], ["paragraph", "table", "paragraph", "paragraph"])
        self.assertEqual([node.block_index for node in walk.nodes[:4]], [0, 1, 2, 3])

    def test_node_ids_are_stable_and_derived_from_fingerprint_and_position(self):
        data = build_docx_bytes([("p", "AURORA LAKE: sj 1.40m")])
        walk_a = walk_source(data, document_id="a.docx")
        walk_b = walk_source(data, document_id="b.docx")
        expected_fingerprint = hashlib.sha256(data).hexdigest()
        self.assertEqual(walk_a.fingerprint, expected_fingerprint)
        self.assertEqual(walk_a.nodes[0].node_id, f"{expected_fingerprint[:12]}:b0")
        self.assertEqual(walk_a.nodes[0].node_id, walk_b.nodes[0].node_id)
        self.assertEqual(walk_a.document_id, "a.docx")

    def test_empty_paragraphs_and_section_properties_are_structural_not_meaningful(self):
        data = build_docx_bytes([
            ("p", ""),
            ("p", "   \t "),
            ("p", "AURORA LAKE: sj 1.40m"),
        ])
        walk = walk_source(data)
        meaningful = [node for node in walk.nodes if node.meaningful]
        structural = [node for node in walk.nodes if not node.meaningful]
        self.assertEqual([node.text for node in meaningful], ["AURORA LAKE: sj 1.40m"])
        reasons = sorted({node.structural_reason for node in structural})
        self.assertEqual(reasons, ["empty_paragraph", "section_properties"])
        self.assertEqual(len(walk.meaningful_nodes), 1)
        self.assertEqual(len(walk.structural_nodes), 3)

    def test_tables_are_meaningful_and_expose_cell_text_row_major(self):
        data = build_docx_bytes([("table", [["Lot 7", "ZEPHYR MOON"], ["born 2019", "bay mare"]])])
        node = walk_source(data).nodes[0]
        self.assertTrue(node.meaningful)
        self.assertEqual(node.kind, "table")
        self.assertEqual(node.cells, [["Lot 7", "ZEPHYR MOON"], ["born 2019", "bay mare"]])
        self.assertIn("ZEPHYR MOON", node.text)

    def test_raw_text_is_preserved_and_text_is_whitespace_normalised(self):
        data = build_docx_bytes([("p", "\tAURORA  LAKE:\tsj   1.40m  ")])
        node = walk_source(data).nodes[0]
        self.assertEqual(node.raw_text, "\tAURORA  LAKE:\tsj   1.40m  ")
        self.assertEqual(node.text, "AURORA LAKE: sj 1.40m")
        self.assertEqual(node.leading_tabs, 1)

    def test_indentation_and_bold_runs_are_retained_as_formatting_evidence(self):
        data = build_docx_bytes([
            ("p", "AURORA LAKE: sj 1.40m 2018: pl 1st CSI2* Riverbend", {"indent": 14, "bold": ["1.40m"]}),
            ("p", "PLAIN MARE: sj 1.20m"),
            ("p", "ALL BOLD MARE: sj 1.50m", {"all_bold": True}),
        ])
        nodes = walk_source(data).nodes
        self.assertEqual(nodes[0].left_indent_pt, 14.0)
        self.assertEqual(nodes[0].bold_spans, ["1.40m"])
        self.assertFalse(nodes[0].all_bold)
        self.assertIsNone(nodes[1].left_indent_pt)
        self.assertEqual(nodes[1].bold_spans, [])
        self.assertTrue(nodes[2].all_bold)

    def test_unicode_text_survives_the_walk_unchanged(self):
        text = "HŐSÉG CSILLAG: sj 1.40m (2012)(Łucja Nowák)(POL) 2019: pl 1st CSI2* Söderby"
        node = walk_source(build_docx_bytes([("p", text)])).nodes[0]
        self.assertEqual(node.text, text)

    def test_walk_accepts_a_file_path(self):
        from maternal_line.fixture_docx import write_docx

        path = write_docx([("p", "AURORA LAKE: sj 1.40m")], name="walk.docx")
        walk = walk_source(path)
        self.assertEqual(walk.document_id, "walk.docx")
        self.assertEqual(walk.nodes[0].text, "AURORA LAKE: sj 1.40m")


if __name__ == "__main__":
    unittest.main()
