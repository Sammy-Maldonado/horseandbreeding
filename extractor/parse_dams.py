#!/usr/bin/env python3
"""Maternal-line extractor entry point.

Usage:
    python extractor/parse_dams.py <catalogue.docx> [-o out.json]

The implementation lives in the ``maternal_line`` package next to this file.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from maternal_line.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
