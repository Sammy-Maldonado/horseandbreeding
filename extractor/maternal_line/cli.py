"""Command-line entry: ``python extractor/parse_dams.py <catalogue.docx> [-o out.json]``.

Output is UTF-8 JSON written as bytes, independent of the console code page.
Every fatal failure exits with a distinct non-zero code and one clear line on
stderr; a partial or zero-byte output file is never left behind.
"""

from __future__ import annotations

import os
import sys
from typing import Optional

from maternal_line.accounting import SourceAccountingError
from maternal_line.extraction import extract_from_walk, serialise
from maternal_line.source_walk import walk_source

EXIT_OK = 0
EXIT_USAGE = 2
EXIT_INPUT = 3
EXIT_ACCOUNTING = 4
EXIT_OUTPUT = 5
EXIT_INTERNAL = 6

USAGE = "usage: parse_dams.py <catalogue.docx> [-o OUTPUT.json]"


def main(argv: Optional[list] = None) -> int:
    _configure_stderr()
    args = list(sys.argv[1:] if argv is None else argv)
    if args and args[0] in ("-h", "--help"):
        sys.stdout.write(USAGE + "\n")
        return EXIT_OK
    source, output = None, None
    index = 0
    while index < len(args):
        arg = args[index]
        if arg in ("-o", "--output"):
            if index + 1 >= len(args):
                return _usage_error("missing value for -o/--output")
            output = args[index + 1]
            index += 2
            continue
        if arg.startswith("-"):
            return _usage_error(f"unknown option {arg}")
        if source is not None:
            return _usage_error("exactly one input document is expected")
        source = arg
        index += 1
    if source is None:
        return _usage_error("no input document given")
    if not os.path.isfile(source):
        return _fail(EXIT_INPUT, f"Input file not found: {source}")
    try:
        walk = walk_source(source)
    except Exception as exc:  # python-docx / zipfile / XML failures: the input is unreadable
        return _fail(EXIT_INPUT, f"Cannot read {source} as a .docx document ({type(exc).__name__}: {exc})")
    try:
        payload = serialise(extract_from_walk(walk).to_dict())
    except SourceAccountingError as exc:
        return _fail(EXIT_ACCOUNTING, f"Extraction refused: {exc}")
    except Exception as exc:
        return _fail(EXIT_INTERNAL, f"Extraction failed ({type(exc).__name__}: {exc})")
    data = payload.encode("utf-8")
    try:
        _write(data, output)
    except OSError as exc:
        return _fail(EXIT_OUTPUT, f"Cannot write output ({type(exc).__name__}: {exc})")
    return EXIT_OK


def _write(data: bytes, output: Optional[str]) -> None:
    if output is None:
        stream = getattr(sys.stdout, "buffer", None)
        if stream is None:  # a text-only stdout: still emit UTF-8, never the console code page
            sys.stdout.write(data.decode("utf-8"))
        else:
            stream.write(data)
        sys.stdout.flush()
        return
    temporary = output + ".tmp"
    with open(temporary, "wb") as handle:
        handle.write(data)
    os.replace(temporary, output)


def _configure_stderr() -> None:
    reconfigure = getattr(sys.stderr, "reconfigure", None)
    if reconfigure is not None:
        try:
            reconfigure(errors="backslashreplace")
        except (ValueError, OSError):
            pass


def _usage_error(message: str) -> int:
    return _fail(EXIT_USAGE, f"{message}\n{USAGE}")


def _fail(code: int, message: str) -> int:
    sys.stderr.write(f"parse_dams: {message}\n")
    sys.stderr.flush()
    return code
