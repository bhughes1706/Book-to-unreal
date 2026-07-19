#!/usr/bin/env python3
"""Create a stable paragraph ledger without changing the source prose."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


def read_source(source: str) -> tuple[str, str]:
    if source == "-":
        return sys.stdin.read(), "stdin"

    path = Path(source)
    if path.suffix.lower() == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise SystemExit(
                "DOCX input requires python-docx; use the project .venv."
            ) from exc
        document = Document(path)
        return "\n\n".join(paragraph.text for paragraph in document.paragraphs), str(path)

    return path.read_text(encoding="utf-8-sig"), str(path)


def anchor(text: str, length: int = 120) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    return normalized if len(normalized) <= length else normalized[:length].rstrip()


def paragraph_chunks(text: str) -> list[tuple[str, int, int]]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    chunks: list[tuple[str, int, int]] = []
    cursor = 0
    for separator in re.finditer(r"\n[ \t]*\n+", normalized):
        raw = normalized[cursor : separator.start()]
        stripped = raw.strip()
        if stripped:
            leading = raw.find(stripped)
            start = cursor + leading
            chunks.append((stripped, start, start + len(stripped)))
        cursor = separator.end()
    raw = normalized[cursor:]
    stripped = raw.strip()
    if stripped:
        leading = raw.find(stripped)
        start = cursor + leading
        chunks.append((stripped, start, start + len(stripped)))
    return chunks


def build_ledger(text: str, source_name: str) -> dict[str, Any]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    chunks = paragraph_chunks(normalized)
    paragraphs = []
    for index, (paragraph, start, end) in enumerate(chunks, start=1):
        paragraphs.append(
            {
                "id": f"P{index:03d}",
                "text": paragraph,
                "word_count": len(re.findall(r"\b[\w’'-]+\b", paragraph)),
                "char_count": len(paragraph),
                "start_offset": start,
                "end_offset": end,
                "opening_anchor": anchor(paragraph),
                "closing_anchor": anchor(paragraph[-120:]),
            }
        )

    return {
        "source": source_name,
        "sha256": hashlib.sha256(normalized.encode("utf-8")).hexdigest(),
        "char_count": len(normalized),
        "word_count": sum(item["word_count"] for item in paragraphs),
        "paragraph_count": len(paragraphs),
        "opening_anchor": anchor(chunks[0][0]) if chunks else "",
        "closing_anchor": anchor(chunks[-1][0][-120:]) if chunks else "",
        "paragraphs": paragraphs,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="TXT/Markdown/DOCX path, or - for stdin")
    parser.add_argument("--output", type=Path, help="Write JSON to this path")
    args = parser.parse_args()

    text, source_name = read_source(args.source)
    ledger = build_ledger(text, source_name)
    serialized = json.dumps(ledger, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8")
    else:
        sys.stdout.write(serialized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
