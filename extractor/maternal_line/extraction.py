"""Orchestrates walk -> structure -> report and serialises the result."""

from __future__ import annotations

import json
import platform
from dataclasses import dataclass
from typing import Optional

import docx

from maternal_line import EXTRACTOR_VERSION, OUTPUT_CONTRACT_VERSION
from maternal_line.model import ACCOUNTING_STATUSES, PARSED, SEGMENT_STATUSES, Structures, to_plain
from maternal_line.source_walk import SourceWalk, walk_source
from maternal_line.structure import StructureBuilder


@dataclass
class Report:
    complete: bool
    counts: dict
    accounting: dict
    structures: Structures
    errors: list
    ledger: list

    def to_dict(self) -> dict:
        return {
            "complete": self.complete,
            "counts": self.counts,
            "accounting": self.accounting,
            "structures": to_plain(self.structures),
            "errors": to_plain(self.errors),
            "ledger": self.ledger,
        }


@dataclass
class ExtractedDocument:
    extractor: dict
    document: dict
    preamble: list
    lots: list
    report: Report

    def to_dict(self) -> dict:
        return {
            "extractor": self.extractor,
            "document": self.document,
            "preamble": [item.to_dict() for item in self.preamble],
            "lots": to_plain(self.lots),
            "report": self.report.to_dict(),
        }


def extract_document(source, document_id: Optional[str] = None) -> ExtractedDocument:
    return extract_from_walk(walk_source(source, document_id))


def extract_from_walk(walk: SourceWalk) -> ExtractedDocument:
    builder = StructureBuilder(walk).build()
    return ExtractedDocument(
        extractor={
            "name": "maternal_line",
            "version": EXTRACTOR_VERSION,
            "output_contract_version": OUTPUT_CONTRACT_VERSION,
            "runtime": {"python": platform.python_version(), "python_docx": docx.__version__},
        },
        document={
            "document_id": walk.document_id,
            "source_fingerprint_sha256": walk.fingerprint,
            "block_count": len(walk.nodes),
            "meaningful_block_count": len(walk.meaningful_nodes),
        },
        preamble=builder.preamble,
        lots=builder.lots,
        report=_build_report(walk, builder),
    )


def extract_to_dict(source, document_id: Optional[str] = None) -> dict:
    return extract_document(source, document_id).to_dict()


def extract_to_json(source, document_id: Optional[str] = None) -> str:
    return serialise(extract_to_dict(source, document_id))


def serialise(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=1) + "\n"


def _build_report(walk: SourceWalk, builder: StructureBuilder) -> Report:
    verification = builder.ledger.verify()
    totals = builder.ledger.totals()
    items = list(_iter_all_items(builder))
    segments = [segment for item in items for segment in item.segments]
    segment_totals = {"total": len(segments)}
    for status in SEGMENT_STATUSES:
        segment_totals[status] = sum(1 for segment in segments if segment.status == status)
    accounting = {
        "meaningful_source_nodes": totals["meaningful_source_nodes"],
        "structural_nodes_excluded": len(walk.structural_nodes),
    }
    for status in ACCOUNTING_STATUSES:
        accounting[status] = totals[status]
    accounting.update({
        "unaccounted": totals["unaccounted"],
        "missing_node_ids": verification.missing,
        "duplicate_node_ids": verification.duplicates,
        "unknown_node_ids": verification.unknown,
        "skipped_items": 0,
        "segments": segment_totals,
    })
    counts = {
        "lots": len(builder.lots),
        "dam_sections": sum(len(lot.sections) for lot in builder.lots),
        "preamble_items": len(builder.preamble),
        "items": len(items),
        "entries": sum(1 for item in items if item.subject is not None),
        "results": sum(len(item.results) for item in items),
        "descendants": sum(1 for item in items if item.relation is not None),
        "items_parsed": sum(1 for item in items if item.status == PARSED),
    }
    return Report(
        complete=verification.complete,
        counts=counts,
        accounting=accounting,
        structures=builder.structures,
        errors=builder.errors,
        ledger=[
            {
                "node_id": entry.node_id,
                "block_index": entry.block_index,
                "status": entry.status,
                "reason": entry.reason,
                "location": entry.location,
            }
            for entry in builder.ledger.entries()
        ],
    )


def _iter_all_items(builder: StructureBuilder):
    for item in builder.preamble:
        yield from item.iter_items()
    for lot in builder.lots:
        for item in lot.items:
            yield from item.iter_items()
        for section in lot.sections:
            for item in section.items:
                yield from item.iter_items()
