"""CLI contract: Unicode-safe output, fatal exit codes, no zero-byte success."""

import json
import os
import subprocess
import sys
import tempfile
import unittest

from maternal_line.cli import EXIT_ACCOUNTING, EXIT_INPUT, EXIT_OK, EXIT_OUTPUT, EXIT_USAGE, main
from maternal_line.fixture_docx import write_docx

EXTRACTOR_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRYPOINT = os.path.join(EXTRACTOR_DIR, "parse_dams.py")

UNICODE_FIXTURE = [
    ("table", [["Lot 3", "HŐSÉG CSILLAG"]]),
    ("p", "1st Dam"),
    ("p", "ŁÓDŹ STAR: sj 1.40m (2010)(Łucja Nowák)(POL) 2019: pl 1st CSI2* Söderby"),
]


def run_cli(args, env_overrides=None):
    env = dict(os.environ)
    env.pop("PYTHONUTF8", None)
    env.update(env_overrides or {})
    return subprocess.run(
        [sys.executable, ENTRYPOINT, *args],
        capture_output=True,
        env=env,
        cwd=EXTRACTOR_DIR,
    )


class CliSuccessTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.mkdtemp(prefix="hb-cli-")
        self.path = write_docx(UNICODE_FIXTURE, directory=self.directory, name="unicode.docx")

    def test_stdout_is_utf8_json_regardless_of_console_code_page(self):
        completed = run_cli([self.path], {"PYTHONIOENCODING": "cp1252", "PYTHONLEGACYWINDOWSSTDIO": "1"})
        self.assertEqual(completed.returncode, EXIT_OK, completed.stderr)
        payload = json.loads(completed.stdout.decode("utf-8"))
        self.assertEqual(payload["lots"][0]["sections"][0]["items"][0]["subject"]["rider"], "Łucja Nowák")
        self.assertIn("HŐSÉG CSILLAG", payload["lots"][0]["identity"]["text"])
        self.assertEqual(completed.stderr, b"")

    def test_output_file_option_writes_utf8_file(self):
        out = os.path.join(self.directory, "out.json")
        completed = run_cli([self.path, "-o", out], {"PYTHONIOENCODING": "cp1252"})
        self.assertEqual(completed.returncode, EXIT_OK, completed.stderr)
        self.assertEqual(completed.stdout, b"")
        with open(out, encoding="utf-8") as handle:
            payload = json.load(handle)
        self.assertEqual(payload["document"]["document_id"], "unicode.docx")
        self.assertGreater(os.path.getsize(out), 0)

    def test_output_is_byte_for_byte_deterministic(self):
        first = run_cli([self.path]).stdout
        second = run_cli([self.path]).stdout
        self.assertEqual(first, second)
        self.assertGreater(len(first), 0)

    def test_main_returns_exit_ok_in_process(self):
        out = os.path.join(self.directory, "in_process.json")
        self.assertEqual(main([self.path, "-o", out]), EXIT_OK)
        self.assertTrue(os.path.exists(out))


class CliFailureTest(unittest.TestCase):
    def test_missing_file_is_a_deterministic_non_zero_exit_with_clear_stderr(self):
        missing = os.path.join(tempfile.gettempdir(), "does-not-exist-hb.docx")
        completed = run_cli([missing])
        self.assertEqual(completed.returncode, EXIT_INPUT)
        self.assertEqual(completed.stdout, b"")
        stderr = completed.stderr.decode("utf-8", "replace")
        self.assertIn("not found", stderr.lower())
        self.assertNotIn("Traceback", stderr)

    def test_unreadable_docx_is_a_deterministic_non_zero_exit(self):
        directory = tempfile.mkdtemp(prefix="hb-cli-bad-")
        bad = os.path.join(directory, "broken.docx")
        with open(bad, "wb") as handle:
            handle.write(b"this is not a word document")
        completed = run_cli([bad])
        self.assertEqual(completed.returncode, EXIT_INPUT)
        self.assertEqual(completed.stdout, b"")
        self.assertNotIn("Traceback", completed.stderr.decode("utf-8", "replace"))

    def test_failure_never_leaves_a_zero_byte_output_file(self):
        directory = tempfile.mkdtemp(prefix="hb-cli-bad-")
        bad = os.path.join(directory, "broken.docx")
        with open(bad, "wb") as handle:
            handle.write(b"nope")
        out = os.path.join(directory, "out.json")
        completed = run_cli([bad, "-o", out])
        self.assertEqual(completed.returncode, EXIT_INPUT)
        self.assertFalse(os.path.exists(out))

    def test_no_arguments_is_a_usage_error(self):
        completed = run_cli([])
        self.assertEqual(completed.returncode, EXIT_USAGE)
        self.assertEqual(completed.stdout, b"")

    def test_unicode_path_in_error_message_does_not_crash_on_cp1252_stderr(self):
        missing = os.path.join(tempfile.gettempdir(), "Łódź-missing.docx")
        completed = run_cli([missing], {"PYTHONIOENCODING": "cp1252"})
        self.assertEqual(completed.returncode, EXIT_INPUT)
        self.assertNotIn(b"Traceback", completed.stderr)

    def test_exit_codes_are_distinct(self):
        self.assertEqual(len({EXIT_OK, EXIT_USAGE, EXIT_INPUT, EXIT_ACCOUNTING, EXIT_OUTPUT}), 5)
        self.assertEqual(EXIT_OK, 0)


if __name__ == "__main__":
    unittest.main()
