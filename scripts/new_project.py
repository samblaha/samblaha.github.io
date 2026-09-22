#!/usr/bin/env python3
"""Create a safe, consistent Jekyll project draft for the maker garage."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import unicodedata
from pathlib import Path


GARAGE_SLOTS = ("openpage", "guppy", "delta", "pentest", "golf")


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def used_slots(project_dir: Path) -> dict[str, Path]:
    slots: dict[str, Path] = {}
    pattern = re.compile(r'^garage_slot:\s*["\']?([a-z0-9-]+)', re.MULTILINE)
    for path in project_dir.glob("*.md"):
        if path.name == "_TEMPLATE.md":
            continue
        match = pattern.search(path.read_text(encoding="utf-8"))
        if match:
            slots[match.group(1)] = path
    return slots


def render(args: argparse.Namespace, slug: str) -> str:
    tags = [tag.strip() for tag in args.tags.split(",") if tag.strip()]
    lines = [
        "---",
        f"published: {'true' if args.publish else 'false'}",
        f"title: {yaml_string(args.title)}",
        f"date: {args.date}",
        f"summary: {yaml_string(args.summary)}",
        "tags:",
    ]
    lines.extend(f"  - {yaml_string(tag)}" for tag in tags)
    lines.extend(
        [
            f"status: {yaml_string(args.status)}",
            f"hero: {yaml_string(args.hero or f'/assets/projects/{slug}/hero.jpg')}",
            f"hero_alt: {yaml_string(args.hero_alt or f'{args.title} project')}",
        ]
    )
    if args.repo:
        lines.append(f"repo: {yaml_string(args.repo)}")
    if args.demo:
        lines.append(f"demo: {yaml_string(args.demo)}")
    if args.slot:
        lines.extend(
            [
                f"garage_slot: {yaml_string(args.slot)}",
                f"garage_label: {yaml_string(args.garage_label or args.title)}",
                f"garage_kicker: {yaml_string(args.garage_kicker or args.status)}",
            ]
        )
    lines.extend(
        [
            "comments: true",
            "---",
            "",
            "## Overview",
            "",
            "What it is, who it helps, and why it matters.",
            "",
            "## Why I built it",
            "",
            "The idea, constraint, or annoyance that started the build.",
            "",
            "## Build notes",
            "",
            "The important implementation decisions, tradeoffs, and discoveries.",
            "",
            "## Challenges",
            "",
            "What broke, what changed, and what you learned.",
            "",
            "## What’s next",
            "",
            "The next experiment or improvement.",
            "",
        ]
    )
    return "\n".join(lines)


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Create a new Blaha Labs project draft.")
    result.add_argument("title", help="Human-readable project title")
    result.add_argument("--summary", required=True, help="One-sentence project summary")
    result.add_argument("--tags", default="Hardware", help="Comma-separated tags")
    result.add_argument("--slug", help="URL/file slug; generated from the title by default")
    result.add_argument("--date", default=dt.date.today().isoformat(), help="YYYY-MM-DD")
    result.add_argument("--status", default="In progress")
    result.add_argument("--hero", help="Root-relative hero path")
    result.add_argument("--hero-alt")
    result.add_argument("--repo")
    result.add_argument("--demo")
    result.add_argument("--publish", action="store_true", help="Publish immediately; drafts are the default")
    result.add_argument("--slot", choices=GARAGE_SLOTS, help="Optional physical homepage hotspot")
    result.add_argument("--garage-label")
    result.add_argument("--garage-kicker")
    result.add_argument("--root", type=Path, help=argparse.SUPPRESS)
    return result


def main() -> int:
    args = parser().parse_args()
    root = (args.root or Path(__file__).resolve().parents[1]).resolve()
    project_dir = root / "_projects"
    project_dir.mkdir(parents=True, exist_ok=True)

    slug = slugify(args.slug or args.title)
    if not slug:
        raise SystemExit("Could not make a valid slug from that title.")

    target = project_dir / f"{slug}.md"
    if target.exists():
        raise SystemExit(f"Project already exists: {target}")

    if args.slot:
        occupied = used_slots(project_dir).get(args.slot)
        if occupied:
            raise SystemExit(
                f"Garage slot '{args.slot}' is already used by {occupied.name}. "
                "Remove that file's garage_slot first, or omit --slot."
            )

    media_dir = root / "assets" / "projects" / slug
    media_dir.mkdir(parents=True, exist_ok=True)
    target.write_text(render(args, slug), encoding="utf-8")

    state = "published" if args.publish else "draft"
    print(f"Created {state}: {target.relative_to(root)}")
    print(f"Media folder: {media_dir.relative_to(root)}")
    print("Next: add hero.jpg, replace the section prompts, then set published: true when ready.")
    if not args.slot:
        print("The project will appear automatically in the archive shelf and /portfolio/ when published.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
