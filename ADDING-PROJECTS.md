# Adding projects

## Fast path

Create a safe draft with one command:

```bash
python3 scripts/new_project.py "My New Build" \
  --summary "A one-sentence explanation of what it is and why it matters." \
  --tags "Hardware,AI,3D Printing"
```

The generator creates:

- `_projects/my-new-build.md` with complete frontmatter and writing prompts.
- `assets/projects/my-new-build/` for the hero image, gallery, and videos.

Add `hero.jpg`, replace the writing prompts, and change `published: false` to
`published: true`. The project then appears automatically in both the physical
archive drawer on the homepage and `/portfolio/`. No homepage code changes are
needed.

Use `--publish` if the entry is already complete and should go live immediately.

## Featuring a project on the main bench

The approved garage image has five physical hotspots. A new project can take over
one of them with `--slot`:

```bash
python3 scripts/new_project.py "My Robot Arm" \
  --summary "A camera-guided robot arm for sorting workshop parts." \
  --tags "Robotics,Hardware,AI" \
  --slot guppy
```

Available slots are `openpage`, `guppy`, `delta`, `pentest`, and `golf`. One project
can own each slot. Before reusing a slot, remove `garage_slot`, `garage_label`, and
`garage_kicker` from its current project file.

Projects do not need a slot. Most projects should live only in the archive shelf;
reserve the five scene hotspots for the current or most representative builds.

## Useful options

```text
--slug custom-url-slug
--date 2026-09-11
--status "Shipped"
--hero /assets/projects/my-build/cover.jpg
--hero-alt "The finished prototype on the bench"
--repo https://github.com/samblaha/example
--demo https://example.com
--garage-label "Robot arm · active build"
--garage-kicker "In progress · robotics + AI"
```

Run `python3 scripts/new_project.py --help` for the complete list.

## Validate before publishing

```bash
python3 scripts/validate_projects.py
bundle exec jekyll build
```

Validation catches missing required metadata, broken hero paths, unknown garage
slots, and two projects trying to use the same physical hotspot.

## Manual path

You can still copy `_projects/_TEMPLATE.md` and fill it out by hand. The same rules
apply: the filename becomes the URL slug, published projects appear automatically
in the archive, and garage hotspot metadata is optional.
