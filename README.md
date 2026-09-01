# Blaha Labs (GitHub Pages + Jekyll)

A loud, TVA-toned "Workshop Pop" portfolio where every project is a blog post. **Projects are a Jekyll collection**—each project is one Markdown file in `_projects/`.

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
1. Duplicate the template:
   - Copy `_projects/_TEMPLATE.md` → `_projects/<your-slug>.md`
2. Edit the frontmatter at the top:
   - `title`, `date` (YYYY-MM-DD), `summary`, `tags`
   - Optional: `status`, `hero`, `hero_alt`, `hero_caption`, `gallery`, `repo`, `demo`, `comments`
   - Optional structured extras: `specs`, `parts`, `log` (see below)
3. Add images (optional):
   - Put them under `/assets/projects/<your-slug>/`
   - Reference them with root-relative paths like `/assets/projects/<your-slug>/hero.jpg`
4. Commit + push.

## What a project post gets for free
- **Header**: status sticker (`In progress` pulses, `Shipped` gets a check), date, reading time, clickable tags that filter the homepage.
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

## Notes
- Project URLs are automatically generated from filenames:
  - `_projects/laser-timing-gates.md` → `/p/laser-timing-gates/`
- Homepage projects grid is sorted **newest first** by `date`, with tag filters (deep-linkable: `/?tag=hardware#projects`).
- Missing optional fields won’t break rendering (no hero/status/repo/demo/gallery is fine).
- Comments use giscus; see `GISCUS-SETUP.md` to finish wiring the repo and category IDs.
