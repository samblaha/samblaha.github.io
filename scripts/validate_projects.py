#!/usr/bin/env python3
"""Validate project metadata and physical garage-slot assignments."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ROOT / "_projects"
SLOTS = {"openpage", "guppy", "delta", "pentest", "golf"}


def frontmatter(text: str) -> str:
    parts = text.split("---", 2)
    return parts[1] if len(parts) == 3 else ""


def scalar(meta: str, key: str) -> str:
    match = re.search(rf"^{re.escape(key)}:\s*[\"']?([^\n\"']+)", meta, re.MULTILINE)
    return match.group(1).strip() if match else ""


def main() -> int:
    failures: list[str] = []
    slots: dict[str, str] = {}

    for path in sorted(PROJECTS.glob("*.md")):
        if path.name == "_TEMPLATE.md":
            continue
        meta = frontmatter(path.read_text(encoding="utf-8"))
        for key in ("title", "date", "summary", "status"):
            if not scalar(meta, key):
                failures.append(f"{path.name}: missing {key}")

        hero = scalar(meta, "hero")
        if hero and hero.startswith("/") and not (ROOT / hero.lstrip("/")).exists():
            failures.append(f"{path.name}: hero does not exist: {hero}")

        slot = scalar(meta, "garage_slot")
        if slot:
            if slot not in SLOTS:
                failures.append(f"{path.name}: unknown garage_slot '{slot}'")
            elif slot in slots:
                failures.append(f"{path.name}: garage_slot '{slot}' already used by {slots[slot]}")
            else:
                slots[slot] = path.name

    if failures:
        print("Project validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"Validated {len(list(PROJECTS.glob('*.md'))) - 1} projects and {len(slots)} garage slots.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
