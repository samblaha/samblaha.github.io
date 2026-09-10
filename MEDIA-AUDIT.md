# Media audit inventory

Audit of `main` after PR #9 (Night Bench). **Docs only** — no assets added, no redesign.

Checked: every `_projects/*.md` front-matter + body path, every file under `assets/projects/`, arcade/rack media refs, Giscus placeholders. Method: path cross-check against disk (not a visual QA pass).

There is **no `_posts/` collection**. Builds live in `_projects/` (Jekyll collection → `/p/:name/`). Images/video live in `assets/projects/<slug>/`. Cards and Open Graph use front-matter `hero` only; inline `![…](…)` and `<video>` do not fill the card.

---

## Assignable checklist

### Critical

| ID | Gap | Paths | Why it matters |
| --- | --- | --- | --- |
| C1 | **OpenPage has zero media** (planning hint confirmed). No `assets/projects/laser-timing-gates/` (and no `openpage/` folder either). No `hero`, `hero_alt`, or `gallery`. | `_projects/laser-timing-gates.md` · expected dir `assets/projects/laser-timing-gates/` (or a renamed slug folder) | Newest-but-one build (2025-12-20). Homepage/portfolio cards use the ✦ fallback. No `og:image`. In-progress hardware with nothing to look at. |
| C2 | **OpenPage slug ≠ title.** File is leftover `laser-timing-gates`; content is DIY Ereader / OpenPage. URL is `/p/laser-timing-gates/`. | `_projects/laser-timing-gates.md` → `/p/laser-timing-gates/` · also cited in `README.md`, `_projects/_TEMPLATE.md` | Confusing catalog URL. Rename file (and asset folder) when photos land, or the new images will sit under a wrong slug. |
| C3 | **QRNG screenshot exists but is not the card hero.** `hero.png` is only referenced inline in the body. Front-matter has no `hero` / `hero_alt`. | File on disk: `assets/projects/quantum-random-number-generator/hero.png` · post: `_projects/quantum-random-number-generator.md` | Cards + social tags skip it (`_includes/project-card.html`, `_includes/head.html`). One-line front-matter fix: `hero: "/assets/projects/quantum-random-number-generator/hero.png"`. |

### Nice-to-have

| ID | Gap | Paths | Notes |
| --- | --- | --- | --- |
| N1 | **Stub copy** — short imported write-ups, not placeholders/TODOs, but thin. | `_projects/retro-pi.md` (~56 words) · `_projects/delta-3d-printer.md` (~56) · `_projects/kali-macbook.md` (~74) | Photos exist. Expand build notes, not media. |
| N2 | **Short copy, media OK.** | `_projects/quantum-random-number-generator.md` (~106) · `_projects/caesar-cipher.md` (~138) · `_projects/golf-ball-printer.md` (~138) | QRNG / Caesar / golf printer have images or video. Copy is the gap. |
| N3 | **Guppy: hero only.** No gallery / in-use shots. | `_projects/guppy.md` · `assets/projects/guppy/hero.jpg` | Single 1600×1370 still. |
| N4 | **QRNG screenshot is tiny.** | `assets/projects/quantum-random-number-generator/hero.png` (365×236, 13 KB) | Fine as a terminal grab; weak as a card/OG image even after C3. |
| N5 | **Virtual rack: no photo of the real case.** Hero is a generated SVG. Copy says the grid was transcribed from a photo; that photo is not in the repo. | `_projects/virtual-ball-rack.md` · `assets/projects/virtual-ball-rack/hero.svg` | Logo SVGs are complete (see rack section). A real-case still would be gallery/hero, not a missing logo. |
| N6 | **Golf printer: no still gallery** beyond hero + video posters. | `_projects/golf-ball-printer.md` · videos `printing.mp4`, `printing-2.mp4` | Videos and posters exist. Extra stills optional. |
| N7 | **No site-wide OG/Twitter image.** Pages without `hero` (home, arcade, portfolio, OpenPage, QRNG) emit `twitter:card=summary` and no `og:image`. | `_includes/head.html` | Optional default under e.g. `assets/` once a brand still exists. |
| N8 | **OpenPage empty `demo:`.** | `_projects/laser-timing-gates.md` (`demo: ""`) | Empty string is ignored by the layout. Drop the key or fill it. |
| N9 | **OpenPage has no `log:`** despite `status: In progress`. | `_projects/laser-timing-gates.md` | Template supports dated `log:` entries; none used on any post. |
| N10 | **Homepage contact is a placeholder.** | `_layouts/home.html` (`mailto:email@example.com`) | Not media. |

---

## Per-project inventory

Referenced files all exist unless noted. “Card hero” = front-matter `hero` (what the grid shows).

| Post | URL | Card hero | Other media | Copy | Verdict |
| --- | --- | --- | --- | --- | --- |
| `_projects/laser-timing-gates.md` **OpenPage** | `/p/laser-timing-gates/` | **none** | **none — folder missing** | Full (~359 w). Specs + parts present. | **C1, C2, N8, N9** |
| `_projects/virtual-ball-rack.md` | `/p/virtual-ball-rack/` | `hero.svg` ✓ | 71 logo SVGs via rack page | Full (~450 w) | OK (N5 optional photo) |
| `_projects/pi-pentester.md` | `/p/pi-pentester/` | `hero.jpg` ✓ | gallery `1.jpg`, `2.jpg` | Full (~251 w) | OK |
| `_projects/guppy.md` | `/p/guppy/` | `hero.jpg` ✓ | none else | OK (~228 w) | N3 extra photos |
| `_projects/quantum-random-number-generator.md` | `/p/quantum-random-number-generator/` | **none in FM** | body `hero.png` ✓ | Short (~106 w) | **C3**, N2, N4 |
| `_projects/caesar-cipher.md` | `/p/caesar-cipher/` | `hero.png` ✓ | `demo.mp4` + `demo.jpg` poster | Short (~138 w) | N2 |
| `_projects/golf-ball-printer.md` | `/p/golf-ball-printer/` | `hero.jpg` ✓ | 2× mp4 + posters | Short (~138 w) | N2, N6 |
| `_projects/kali-macbook.md` | `/p/kali-macbook/` | `hero.jpg` ✓ | gallery `1.jpg`, `2.jpg` | Stub (~74 w) | N1 |
| `_projects/delta-3d-printer.md` | `/p/delta-3d-printer/` | `hero.jpg` ✓ | gallery `1.jpg`–`3.jpg` | Stub (~56 w) | N1 |
| `_projects/retro-pi.md` | `/p/retro-pi/` | `hero.jpg` ✓ | gallery `1.jpg` | Stub (~56 w) | N1 |

Template `_projects/_TEMPLATE.md` is `published: false`. Its `/assets/projects/<slug>/…` paths are examples, not broken live links.

**No empty media folders.** Missing OpenPage dir was never created (not an empty leftover). All on-disk project assets are referenced.

---

## Arcade / rack

**Arcade** (`arcade.html`, `_includes/arcade.html`, `assets/js/arcade.js`): canvas + emoji. No image/video files expected. **No missing assets.**

**Rack** (`rack.html`, `assets/js/rack-data.js`, `assets/projects/virtual-ball-rack/logos/`):

- 78 balls, each with a `logo:` path.
- 71 unique SVG files; every referenced file exists; no orphan files.
- `assets/js/rack-scores.js` `SCOREBOOK` is **empty on purpose** (commented in-file). Not a missing image.

No arcade/rack asset work unless N5 (real-case photo) is picked up.

---

## Idea Box / Giscus (note only — out of scope)

`_includes/giscus.html`: `data-repo-id=""` and `data-category-id=""` are empty. Idea Box (`/#ideas`) and per-post comments will not load until those IDs are filled. Setup steps already live in `GISCUS-SETUP.md`. **Do not treat as a media task.**

---

## Suggested assignment order

1. **C1** — shoot/add OpenPage photos (`hero` + 1–2 gallery stills of the T5-4.7-S3).
2. **C2** — rename `_projects/laser-timing-gates.md` → something like `_projects/openpage.md` (and match the asset folder) when C1 lands, so the URL isn’t `/p/laser-timing-gates/`.
3. **C3** — add `hero` / `hero_alt` on the QRNG post (no new file required).
4. **N1** — expand the three stub posts that already have photos.
5. Everything else as time allows.

Broken live image paths: **none** (other than the OpenPage files that were never added).
