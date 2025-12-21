# Portfolio (GitHub Pages + Jekyll)

An Apple-ish minimal portfolio with “Liquid Glass” vibes. **Projects are a Jekyll collection**—each project is one Markdown file in `_projects/`.

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
   - Optional: `status`, `hero`, `gallery`, `repo`, `demo`
3. Add images (optional):
   - Put them under `/assets/projects/<your-slug>/`
   - Reference them with root-relative paths like `/assets/projects/<your-slug>/hero.jpg`
4. Commit + push.

## Notes
- Project URLs are automatically generated from filenames:
  - `_projects/laser-timing-gates.md` → `/p/laser-timing-gates/`
- Homepage projects grid is sorted **newest first** by `date`.
- Missing optional fields won’t break rendering (no hero/status/repo/demo/gallery is fine).


