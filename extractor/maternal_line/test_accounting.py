"""Source ledger: the set-coverage invariant behind the zero-silent-loss guarantee."""

import unittest

from maternal_line.accounting import SourceAccountingError, SourceLedger
from maternal_line.model import (
    ACCOUNTING_STATUSES,
    ERROR,
    EXPLICITLY_AMBIGUOUS,
    EXPLICITLY_UNSUPPORTED,
    PARSED,
    PRESERVED_UNPARSED,
)


class SourceLedgerTest(unittest.TestCase):
    def test_accounting_statuses_are_exactly_the_five_contract_states(self):
        self.assertEqual(
            list(ACCOUNTING_STATUSES),
            [PARSED, PRESERVED_UNPARSED, EXPLICITLY_UNSUPPORTED, EXPLICITLY_AMBIGUOUS, ERROR],
        )

    def test_complete_ledger_verifies_with_no_missing_or_duplicates(self):
        ledger = SourceLedger(["n1", "n2", "n3"])
        ledger.account("n1", PARSED, location="lot 1")
        ledger.account("n2", PRESERVED_UNPARSED, reason="free text")
        ledger.account("n3", EXPLICITLY_AMBIGUOUS, reason="repeated ordinal")
        verification = ledger.verify()
        self.assertEqual(verification.missing, [])
        self.assertEqual(verification.duplicates, [])
        self.assertEqual(verification.unknown, [])
        self.assertTrue(verification.complete)
        totals = ledger.totals()
        self.assertEqual(totals["meaningful_source_nodes"], 3)
        self.assertEqual(totals[PARSED], 1)
        self.assertEqual(totals[PRESERVED_UNPARSED], 1)
        self.assertEqual(totals[EXPLICITLY_AMBIGUOUS], 1)
        self.assertEqual(totals[EXPLICITLY_UNSUPPORTED], 0)
        self.assertEqual(totals[ERROR], 0)
        self.assertEqual(totals["unaccounted"], 0)

    def test_missing_source_node_is_detected(self):
        ledger = SourceLedger(["n1", "n2"])
        ledger.account("n1", PARSED)
        verification = ledger.verify()
        self.assertEqual(verification.missing, ["n2"])
        self.assertFalse(verification.complete)
        self.assertEqual(ledger.totals()["unaccounted"], 1)
        with self.assertRaises(SourceAccountingError) as raised:
            ledger.assert_complete()
        self.assertIn("n2", str(raised.exception))

    def test_duplicate_accounting_is_detected(self):
        ledger = SourceLedger(["n1"])
        ledger.account("n1", PARSED)
        ledger.account("n1", PRESERVED_UNPARSED)
        verification = ledger.verify()
        self.assertEqual(verification.duplicates, ["n1"])
        self.assertFalse(verification.complete)
        with self.assertRaises(SourceAccountingError):
            ledger.assert_complete()

    def test_unknown_node_accounting_is_detected(self):
        ledger = SourceLedger(["n1"])
        ledger.account("n1", PARSED)
        ledger.account("ghost", PARSED)
        self.assertEqual(ledger.verify().unknown, ["ghost"])
        with self.assertRaises(SourceAccountingError):
            ledger.assert_complete()

    def test_only_contract_statuses_are_accepted(self):
        ledger = SourceLedger(["n1"])
        with self.assertRaises(ValueError):
            ledger.account("n1", "IGNORED")
        with self.assertRaises(ValueError):
            ledger.account("n1", "DROPPED")

    def test_count_invariant_holds_over_entries(self):
        ledger = SourceLedger(["a", "b", "c", "d", "e"])
        ledger.account("a", PARSED)
        ledger.account("b", PARSED)
        ledger.account("c", EXPLICITLY_UNSUPPORTED)
        ledger.account("d", ERROR, reason="boom")
        ledger.account("e", PRESERVED_UNPARSED)
        totals = ledger.totals()
        self.assertEqual(
            totals["meaningful_source_nodes"],
            sum(totals[status] for status in ACCOUNTING_STATUSES),
        )
        entries = ledger.entries()
        self.assertEqual([e.node_id for e in entries], ["a", "b", "c", "d", "e"])
        self.assertEqual(entries[3].reason, "boom")


if __name__ == "__main__":
    unittest.main()
