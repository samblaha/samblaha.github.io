# Blaha Labs — Digital Maker Garage

An immersive, object-led maker portfolio built with GitHub Pages and Jekyll. The homepage is a lived-in digital workshop: active builds sit on the main bench, past projects live on the archive shelf, and every object opens a real project log. **Projects are a Jekyll collection**—each project is one Markdown file in `_projects/`.

## Blender workshop

The homepage loads a Blender-authored orbital workshop from `assets/models/garage.glb`.
An atomic-age Blaha Cola machine outside the right wall opens the project selector,
and an animated engineering hologram sits above the central projector. Desktop supports constrained
camera exploration; mobile includes touch-friendly project controls. The project
index remains accessible if WebGL cannot load.

Runtime: `assets/js/garage3d/main.js` and `lab.js`. Scene source:
`assets/models/garage.blend`. See [the asset contract](assets/models/ASSET-CONTRACT.md)
for regeneration, object names, and remaining production-art work. Rebuild the
committed browser bundle with `sh scripts/build_garage_3d.sh` after runtime edits.

## Run locally (live updates)
This runs a local web server and automatically refreshes when you edit files.

1. Install Ruby + Bundler (Mac):
   - Ruby via `rbenv` or Homebrew is recommended (macOS system Ruby is often old).
2. Install gems:
   - `bundle install`
3. Start the dev server with live reload:
   - `bundle exec jekyll serve --livereload`
4. Open:
   - `http://localhost:4000`

If you run into Ruby version errors, upgrade Ruby (recommended) and then re-run the steps above.

## Add a new project in 60 seconds

1. Generate a ready-to-edit draft:
   - `python3 scripts/new_project.py "Project Name" --summary "What it is and why it matters." --tags "Hardware,AI"`
2. Add media under the generated `assets/projects/<slug>/` folder.
3. Edit the frontmatter at the top:
   - `title`, `date` (YYYY-MM-DD), `summary`, `tags`
   - Optional: `status`, `hero`, `hero_alt`, `hero_caption`, `gallery`, `repo`, `demo`, `comments`
   - Optional homepage hotspot: `garage_slot`, `garage_label`, `garage_kicker`
   - Optional structured extras: `specs`, `parts`, `log` (see below)
4. Set `published: true`, run `python3 scripts/validate_projects.py`, then commit and push.

Published projects appear automatically in the homepage archive and `/portfolio/`.
See [ADDING-PROJECTS.md](ADDING-PROJECTS.md) for slot choices and all generator options.

## What a project post gets for free
- **Header**: status sticker (`In progress` pulses, `Shipped` gets a check), date, reading time, and project tags.
- **Build-log rail**: a sticky table of contents built from your `##` headings, with scroll-tracking and numbered sections. Headings get hover anchor links.
- **Reading progress bar** across the top of the page.
- **Rich Markdown**:
  - `> blockquotes` render as sticky notes.
  - Fenced code blocks (` ```cpp `) get syntax highlighting, a language sticker, and a copy button.
  - `![caption](image.jpg)` renders as a framed figure with the alt text as the caption, and opens in a lightbox.
  - Tables, ordered lists, `<kbd>`, and `---` rules are styled to match.
- **Structured extras** (all optional, rendered only if present):
  - `specs:` key/value pairs → a spec-sheet card above the write-up.
  - `parts:` list of `{ name, note, qty, link }` → a checklist-style bill of materials.
  - `log:` list of `{ date, title, note }` → a dated timeline (newest first). Handy for in-progress builds.
- **Newer / older build** navigation at the bottom, and a per-post discussion panel (giscus, `comments: false` to hide).
- **Sharing**: Open Graph / Twitter card tags using `summary` and `hero`, plus an RSS feed at `/feed.xml`.

## GHIN score sync (Ball Rack)

The rack at `/rack/` reads **local** score data only (`assets/data/scorebook.json`). It never calls GHIN from the browser and never posts a score.

From a private machine (Python 3, stdlib only):

```bash
export GHIN_EMAIL='you@example.com'   # or GHIN number
export GHIN_PASSWORD='...'
python3 scripts/sync_ghin.py
```

Or run `python3 scripts/sync_ghin.py` in a terminal and enter credentials when prompted. Do not put a GHIN password, email, or GHIN number in HTML, JS, or committed config. See `scripts/README.md`.

The committed JSON is an empty schema so the rack stays up without credentials. After a real sync, commit `assets/data/scorebook.json` only if those rounds should be public. CSV dumps stay in gitignored `golf-data/`.

## Notes
- Project URLs are automatically generated from filenames:
  - `_projects/laser-timing-gates.md` → `/p/laser-timing-gates/`
- Homepage project objects open focused build details; the physical archive shelf opens a filterable inventory generated from the full collection.
- Tag filters live on `/portfolio/` (deep-linkable: `/portfolio/?tag=hardware#projects`). Old `/?tag=` links redirect there.
- Missing optional fields won’t break rendering (no hero/status/repo/demo/gallery is fine).
- Comments use giscus; see `GISCUS-SETUP.md` for repository setup.
