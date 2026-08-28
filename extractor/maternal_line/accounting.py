"""Source ledger: the set-based zero-silent-loss invariant.

Every meaningful source node id registered at walk time must be accounted
exactly once with one of the contract statuses. Count equality is not enough:
the ledger compares sets and reports missing, duplicate and unknown ids.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

from maternal_line.model import ACCOUNTING_STATUSES


class SourceAccountingError(RuntimeError):
    """Raised when extraction finishes without accounting every source node."""


@dataclass
class LedgerEntry:
    node_id: str
    status: str
    reason: Optional[str] = None
    location: Optional[str] = None
    block_index: Optional[int] = None


@dataclass
class LedgerVerification:
    missing: list
    duplicates: list
    unknown: list

    @property
    def complete(self) -> bool:
        return not (self.missing or self.duplicates or self.unknown)


class SourceLedger:
    def __init__(self, meaningful_ids: Iterable[str]):
        self._expected = list(dict.fromkeys(meaningful_ids))
        self._expected_set = set(self._expected)
        self._entries: list = []

    def account(
        self,
        node_id: str,
        status: str,
        reason: Optional[str] = None,
        location: Optional[str] = None,
        block_index: Optional[int] = None,
    ) -> LedgerEntry:
        if status not in ACCOUNTING_STATUSES:
            raise ValueError(
                f"{status!r} is not an accounting status; expected one of {ACCOUNTING_STATUSES}"
            )
        entry = LedgerEntry(node_id, status, reason, location, block_index)
        self._entries.append(entry)
        return entry

    def entries(self) -> list:
        return list(self._entries)

    def verify(self) -> LedgerVerification:
        counts: dict = {}
        for entry in self._entries:
            counts[entry.node_id] = counts.get(entry.node_id, 0) + 1
        missing = [node_id for node_id in self._expected if counts.get(node_id, 0) == 0]
        duplicates = [node_id for node_id in self._expected if counts.get(node_id, 0) > 1]
        unknown = list(dict.fromkeys(
            entry.node_id for entry in self._entries if entry.node_id not in self._expected_set
        ))
        return LedgerVerification(missing=missing, duplicates=duplicates, unknown=unknown)

    def totals(self) -> dict:
        verification = self.verify()
        totals = {"meaningful_source_nodes": len(self._expected)}
        for status in ACCOUNTING_STATUSES:
            totals[status] = sum(1 for entry in self._entries if entry.status == status)
        totals["unaccounted"] = len(verification.missing)
        return totals

    def assert_complete(self) -> LedgerVerification:
        verification = self.verify()
        if verification.complete:
            return verification
        problems = []
        if verification.missing:
            problems.append(f"missing={verification.missing}")
        if verification.duplicates:
            problems.append(f"duplicate={verification.duplicates}")
        if verification.unknown:
            problems.append(f"unknown={verification.unknown}")
        raise SourceAccountingError("source accounting incomplete: " + ", ".join(problems))
