# GHIN → Ball Rack sync

Read-only export of **your** GHIN score history into local files the rack page loads. The live GitHub Pages site never talks to GHIN.

Login follows [chrisdecali/golf-reports](https://github.com/chrisdecali/golf-reports): `POST /golfer_login.json` (email or GHIN# + password + Firebase pre-auth) → Bearer token, then GET `scores.json` and `handicap_history.json`. **Scores are never posted.**

## Credentials

Never in HTML, JS, or committed config.

1. Env: `GHIN_EMAIL` + `GHIN_PASSWORD` (fallback `GHIN_BEARER` + `GHIN_ID`)
2. Local `~/.ghin_creds.json` (chmod 600, gitignored)
3. Interactive prompt if stdin is a TTY

```bash
export GHIN_EMAIL='you@example.com'   # or GHIN number
export GHIN_PASSWORD='...'
python3 scripts/sync_ghin.py
```

Optional: copy `scripts/.env.example` to `scripts/.env` (gitignored) and source it.

## What it writes

Default output directory: `assets/data/`

| File | Purpose |
| --- | --- |
| `scorebook.json` | **What the rack fetches.** Sanitized SCOREBOOK (`course`/`date`/`score`/`differential`, optional `detail`/`tee`/`holes`/`notes`) plus a redacted handicap profile. |
| `ghin_scores.csv` | Posted scores (golf-reports columns, including `score_id`). |
| `ghin_handicap_history.csv` | Handicap index over time. |
| `ghin_hole_scores.csv` | Per-hole rows when GHIN included them. |

The empty `scorebook.json` in this repo is the schema. After a real sync, commit that file only if you want those rounds public on the site. Unmapped GHIN courses stay in the CSV only.

## Offline / fixtures (no GHIN login)

```bash
python3 scripts/sync_ghin.py --offline \
  --scores-json scripts/fixtures/ghin_scores.json \
  --profile-json scripts/fixtures/ghin_profile.json \
  --history-json scripts/fixtures/ghin_handicap_history.json
```

Fixtures are labeled fake data for tests — not Sam’s scores.

## Course names

The sync script maps GHIN `course_name` onto exact `BALLS[].name` (and optional `detail`). The rack joins with `course === ball.name`. If a name does not match, add it to `scripts/ghin-course-aliases.json`.

## Tests

```bash
python3 -m unittest scripts.test_sync_ghin
node scripts/test_rack_scores.js
```
