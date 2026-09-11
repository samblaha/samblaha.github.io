# GHIN → Ball Rack sync

Read-only export of **your** GHIN score history into local files the rack page loads. The live GitHub Pages site never talks to GHIN.

Login follows [chrisdecali/golf-reports](https://github.com/chrisdecali/golf-reports): email or GHIN# + password, then GET profile / scores / handicap history. **Scores are never posted.**

## Credentials

Env vars or an interactive prompt only. Do not put a password, email, or GHIN number in HTML, JS, or committed config.

```bash
export GHIN_EMAIL='you@example.com'   # or GHIN number
export GHIN_PASSWORD='...'
python3 scripts/sync_ghin.py
```

Or run `python3 scripts/sync_ghin.py` in a terminal and type them when asked.

Optional: copy `scripts/.env.example` to `scripts/.env` (gitignored) and source it.

## What it writes

Default output directory: `assets/data/`

| File | Purpose |
| --- | --- |
| `ghin-scores.json` | **What the rack fetches.** Rounds + redacted handicap profile. |
| `ghin_scores.csv` | Posted scores (golf-reports columns). |
| `ghin_handicap_history.csv` | Handicap index over time. |
| `ghin_hole_scores.csv` | Per-hole rows when GHIN included them. |

The empty `ghin-scores.json` in this repo is the schema. After a real sync, commit that file only if you want those rounds public on the site.

## Offline / fixtures (no GHIN login)

```bash
python3 scripts/sync_ghin.py --offline \
  --scores-json scripts/fixtures/ghin_scores.json \
  --profile-json scripts/fixtures/ghin_profile.json \
  --history-json scripts/fixtures/ghin_handicap_history.json
```

Fixtures are labeled fake data for tests — not Sam’s scores.

## Course names

The script maps GHIN `course_name` onto `BALLS[].name` in `assets/js/rack-data.js`. If a name does not match, add it to `scripts/ghin-course-aliases.json`.

## Tests

```bash
python3 -m unittest scripts.test_sync_ghin
node scripts/test_rack_scores.js
```
