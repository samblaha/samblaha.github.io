#!/usr/bin/env python3
"""
sync_ghin.py — READ-ONLY GHIN → Virtual Ball Rack export.

Logs into GHIN the same way chrisdecali/golf-reports does (email or GHIN# +
password), pulls score history + handicap-index history, and writes local files
the rack page loads. Never posts a score.

Credentials (never written into this repo or any frontend file):
    env GHIN_EMAIL + GHIN_PASSWORD
    fallback env GHIN_BEARER + GHIN_ID
    optional local ~/.ghin_creds.json (chmod 600, gitignored)
    TTY prompt if still missing

    Do not put a password in HTML, JS, committed JSON, or git.

Usage (from the repo root):
    python3 scripts/sync_ghin.py
    python3 scripts/sync_ghin.py --offline \\
        --scores-json scripts/fixtures/ghin_scores.json \\
        --profile-json scripts/fixtures/ghin_profile.json \\
        --history-json scripts/fixtures/ghin_handicap_history.json

Outputs:
    assets/data/scorebook.json     sanitized SCOREBOOK the live rack fetches
    golf-data/*.csv                local dumps (gitignored; not the Pages tree)
"""

from __future__ import annotations

import argparse
import csv
import getpass
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

GHIN_BASE = "https://api2.ghin.com/api/v1"
AUTH_URL = f"{GHIN_BASE}/golfer_login.json"
# Public GHIN web-app Firebase key (same as golf-reports). Not a user secret.
FIREBASE_URL = "https://firebaseinstallations.googleapis.com/v1/projects/ghin-mobile-app/installations"
FIREBASE_KEY = "AIzaSyBxgTOAWxiud0HuaE5tN-5NTlzFnrtyz-I"
FIREBASE_APPID = "1:884417644529:web:47fb315bc6c70242f72650"
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/148 Safari/537.36"
)
DELAY_S = 0.6
_RETRY_CODES = (500, 502, 503, 504)

SCHEMA = "ghin-rack-scorebook/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
CREDS_PATH = os.path.expanduser("~/.ghin_creds.json")
DEFAULT_SCOREBOOK_DIR = os.path.join(REPO_ROOT, "assets", "data")
DEFAULT_CSV_DIR = os.path.join(REPO_ROOT, "golf-data")
RACK_ROUND_KEYS = ("course", "date", "score", "differential", "detail", "tee", "holes", "notes")

SCORE_COLS = [
    "played_at", "course_name", "holes", "adjusted_gross_score", "course_rating",
    "slope_rating", "differential", "score_type", "status", "used", "exceptional",
    "posted_at", "score_id",
]
HIST_COLS = ["date", "handicap_index", "low_hi", "is_low_hi"]
HOLE_SCORE_COLS = [
    "played_at", "course_name", "hole_number", "par", "raw_score",
    "adjusted_gross_score", "stroke_allocation", "putts", "fairway_hit", "gir_flag",
]


# ---------------------------------------------------------------------------
# HTTP — login POST + read-only GET. No score-posting endpoints.
# ---------------------------------------------------------------------------

def _post(url: str, body: dict, headers: Optional[dict] = None) -> Optional[Any]:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", UA)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        time.sleep(DELAY_S)
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"  POST {url.rsplit('/', 1)[-1]} -> HTTP {e.code}", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"  POST {url.rsplit('/', 1)[-1]} -> {type(e).__name__}", file=sys.stderr)
    return None


def _firebase_preauth() -> str:
    """Mint a Firebase Installations token if GHIN rejects a placeholder."""
    import base64
    fid = base64.urlsafe_b64encode(os.urandom(17)).decode().rstrip("=")[:22]
    d = _post(
        FIREBASE_URL,
        {"appId": FIREBASE_APPID, "authVersion": "FIS_v2", "sdkVersion": "w:0.5.7", "fid": fid},
        {"x-goog-api-key": FIREBASE_KEY},
    )
    return ((d or {}).get("authToken") or {}).get("token") or "nonblank"


def ghin_login(email_or_ghin: str, password: str) -> tuple[Optional[str], Optional[str]]:
    """Email/GHIN# + password -> (golfer_user_token ~12h, golfer_id)."""
    for preauth in ("nonblank", None):
        tok = preauth if preauth else _firebase_preauth()
        d = _post(AUTH_URL, {"token": tok, "user": {
            "email_or_ghin": email_or_ghin, "password": password, "remember_me": True,
        }})
        gu = (d or {}).get("golfer_user") if isinstance(d, dict) else None
        if gu and gu.get("golfer_user_token"):
            return gu["golfer_user_token"], str(gu.get("golfer_id") or "")
    return None, None


def _with_retry(fn, attempts: int = 3, base_delay: float = 2.0):
    for i in range(attempts):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            if e.code not in _RETRY_CODES or i == attempts - 1:
                raise
        except (urllib.error.URLError, TimeoutError, OSError):
            if i == attempts - 1:
                raise
        time.sleep(base_delay * (2 ** i))


def ghin_get(path: str, token: str, params: Optional[dict] = None, soft: bool = False) -> Any:
    q = dict(params or {})
    q.setdefault("source", "GHINcom")
    url = f"{GHIN_BASE}{path}?{urllib.parse.urlencode(q)}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", UA)

    def _go():
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8"))

    try:
        time.sleep(DELAY_S)
        return _with_retry(_go)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            sys.exit("Error: 401 Unauthorized — GHIN login was rejected. Check email/password.")
        if soft:
            print(f"  {path} -> HTTP {e.code}", file=sys.stderr)
            return None
        sys.exit(f"Error: HTTP {e.code} for {path}")
    except Exception as e:  # noqa: BLE001
        if soft:
            print(f"  {path} -> {type(e).__name__}", file=sys.stderr)
            return None
        sys.exit(f"Error: {type(e).__name__} for {path}: {e}")


def fetch(token: str, ghin: str) -> dict:
    prof = ghin_get(
        "/golfers/search.json", token,
        {"golfer_id": ghin, "status": "Active", "per_page": "10", "page": "1"},
        soft=True,
    )
    scores = ghin_get(f"/golfers/{ghin}/scores.json", token, soft=True)
    hist = ghin_get(
        f"/golfers/{ghin}/handicap_history.json", token,
        {"rev_count": "0", "include_hidden": "false"},
        soft=True,
    )
    return {"profile": prof, "scores": scores, "history": hist}


# ---------------------------------------------------------------------------
# Parse GHIN payloads (field names vary slightly by endpoint)
# ---------------------------------------------------------------------------

def _g(d: dict, *names, default=None):
    for n in names:
        if isinstance(d, dict) and d.get(n) is not None:
            return d.get(n)
    return default


def _scores_list(scores: Any) -> list[dict]:
    """Merge GHIN buckets (recent / revision / 9-hole), dedupe by id."""
    if isinstance(scores, list):
        return scores
    if not isinstance(scores, dict):
        return []
    out, seen = [], set()
    for k in ("recent_scores", "revision_scores", "9_hole_score", "scores", "results"):
        v = scores.get(k)
        if isinstance(v, dict):
            v = v.get("scores")
        if not isinstance(v, list):
            continue
        for s in v:
            sid = s.get("id") if isinstance(s, dict) else None
            if sid is not None and sid in seen:
                continue
            if sid is not None:
                seen.add(sid)
            out.append(s)
    return out


def build_scores(scores: Any) -> list[dict]:
    rows = []
    for s in _scores_list(scores):
        rows.append({
            "played_at": (_g(s, "played_at", "date_played", default="") or "")[:10],
            "course_name": _g(s, "course_name", "course_display_value", default=""),
            "holes": _g(s, "number_of_holes", "holes"),
            "adjusted_gross_score": _g(s, "adjusted_gross_score", "score"),
            "course_rating": _g(s, "course_rating"),
            "slope_rating": _g(s, "slope_rating"),
            "differential": _g(s, "differential"),
            "score_type": _g(s, "score_type_display_full", "score_type"),
            "status": _g(s, "status"),
            "used": 1 if _g(s, "used") in (True, "true", 1, "1") else (0 if _g(s, "used") is not None else ""),
            "exceptional": 1 if _g(s, "exceptional") in (True, "true", 1) else 0,
            "posted_at": (_g(s, "posted_at", default="") or "")[:10],
            "score_id": _g(s, "id", "score_id"),
            "tee": _g(s, "tee_name", "tee", "tee_set_name", "tee_set"),
        })
    rows.sort(key=lambda r: r.get("played_at") or "", reverse=True)
    return rows


def build_hole_scores(scores: Any) -> list[dict]:
    if not isinstance(scores, dict) and not isinstance(scores, list):
        return []
    rows: list[dict] = []
    seen: set = set()
    for s in _scores_list(scores):
        if not isinstance(s, dict):
            continue
        sid = s.get("id")
        if sid is not None and sid in seen:
            continue
        if sid is not None:
            seen.add(sid)
        played_at = (_g(s, "played_at", "date_played", default="") or "")[:10]
        course_name = _g(s, "course_name", "course_display_value", default="")
        for hd in (s.get("hole_details") or []):
            if not isinstance(hd, dict):
                continue
            rows.append({
                "score_id": sid,
                "played_at": played_at,
                "course_name": course_name,
                "hole_number": _g(hd, "hole_number", "hole"),
                "par": _g(hd, "par"),
                "raw_score": _g(hd, "raw_score", "gross_score", "score"),
                "adjusted_gross_score": _g(hd, "adjusted_gross_score", "adjusted_score"),
                "stroke_allocation": _g(hd, "stroke_allocation", "handicap_stroke"),
                "putts": _g(hd, "putts", "number_of_putts"),
                "fairway_hit": _g(hd, "fairway_hit"),
                "gir_flag": _g(hd, "gir_flag", "green_in_regulation"),
            })
    rows.sort(key=lambda r: (r.get("played_at") or "", r.get("hole_number") or 0), reverse=False)
    rows.sort(key=lambda r: r.get("played_at") or "", reverse=True)
    return rows


def build_history(hist: Any) -> list[dict]:
    revs = hist
    if isinstance(hist, dict):
        revs = _g(hist, "handicap_revisions", "revisions", "handicap_history", default=[])
    rows = []
    for r in (revs or []):
        rows.append({
            "date": (_g(r, "revision_date", "date", "rev_date", default="") or "")[:10],
            "handicap_index": _g(r, "display", "handicap_index", "value"),
            "low_hi": _g(r, "low_hi", "low_handicap_index", "low_hi_display"),
            "is_low_hi": 1 if _g(r, "is_low_hi") in (True, "true", 1) else 0,
        })
    rows.sort(key=lambda r: r.get("date") or "", reverse=True)
    return rows


def build_profile(prof: Any) -> dict:
    """Public-safe profile: performance fields only. Drop name / email / GHIN#."""
    g = prof
    if isinstance(prof, dict):
        gl = _g(prof, "golfers", "golfer", default=None)
        if isinstance(gl, list) and gl:
            g = gl[0]
        elif isinstance(gl, dict):
            g = gl
    g = g or {}
    idx = _g(g, "hi_display", "handicap_index", "hi_value")
    if idx in (999, 999.0, "999", "999.0"):
        idx = "NH"
    return {
        "handicap_index": idx,
        "low_hi": _g(g, "low_hi", "low_hi_display"),
        "low_hi_date": _g(g, "low_hi_date"),
        "rev_date": _g(g, "rev_date"),
    }


# ---------------------------------------------------------------------------
# Match GHIN course names onto BALLS[] from rack-data.js
# ---------------------------------------------------------------------------

_NOISE = {
    "the", "at", "and", "a", "golf", "club", "country", "course", "links",
    "resort", "of",
}


def normalize_course(name: str) -> str:
    """Lowercase, expand GC/CC, strip punctuation. Keep words for exact compare."""
    s = (name or "").lower().replace("&", " and ")
    s = re.sub(r"\bg\.?c\.?\b", "golf club", s)
    s = re.sub(r"\bc\.?c\.?\b", "country club", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def significant_tokens(name: str) -> list[str]:
    return [t for t in normalize_course(name).split() if t and t not in _NOISE]


def load_rack_balls(path: str) -> list[dict]:
    """Parse name/detail/special from rack-data.js (one ball object per line)."""
    balls = []
    if not os.path.isfile(path):
        return balls
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "name:" not in line:
                continue
            nm = re.search(r'\bname:\s*"([^"]*)"', line)
            if not nm:
                continue
            dt = re.search(r'\bdetail:\s*"([^"]*)"', line)
            special = bool(re.search(r'\bspecial:\s*"', line))
            balls.append({
                "name": nm.group(1),
                "detail": dt.group(1) if dt else "",
                "special": special,
            })
    return balls


def load_aliases(path: str) -> dict[str, str]:
    if not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    aliases = data.get("aliases", data) if isinstance(data, dict) else {}
    out = {}
    for k, v in (aliases or {}).items():
        if str(k).startswith("_"):
            continue
        if isinstance(v, str) and v.strip():
            out[k] = v
    return out


def match_ball(course_name: str, balls: list[dict], aliases: dict[str, str]) -> tuple[Optional[str], Optional[str]]:
    """Return (BALLS.name, BALLS.detail-or-None) when the GHIN course maps uniquely."""
    raw = (course_name or "").strip()
    if not raw or not balls:
        return None, None
    if raw in aliases:
        target = aliases[raw]
        hits = [b for b in balls if b["name"] == target and not b.get("special")]
        if len(hits) == 1:
            return hits[0]["name"], hits[0]["detail"] or None
        if hits:
            return hits[0]["name"], None
        return target, None

    hay = normalize_course(raw)
    hay_tokens = set(significant_tokens(raw))
    if not hay:
        return None, None

    playable = [b for b in balls if not b.get("special")]

    def detail_hit(ball: dict) -> bool:
        detail = ball.get("detail") or ""
        if not detail:
            return False
        dn = normalize_course(detail)
        if dn and dn in hay:
            return True
        dt = set(significant_tokens(detail))
        return bool(dt) and dt.issubset(hay_tokens)

    def pick(hits: list[dict]) -> tuple[Optional[str], Optional[str]]:
        if not hits:
            return None, None
        detailed = [b for b in hits if detail_hit(b)]
        if len(detailed) == 1:
            return detailed[0]["name"], detailed[0]["detail"] or None
        names = {b["name"] for b in hits}
        if len(names) == 1:
            only = hits[0]["name"]
            if len(hits) == 1:
                return only, hits[0]["detail"] or None
            return only, None
        if len(detailed) == 0 and len(hits) == 1:
            return hits[0]["name"], hits[0]["detail"] or None
        return None, None

    exact = [b for b in playable if normalize_course(b["name"]) == hay]
    if exact:
        return pick(exact)

    equal = [b for b in playable if set(significant_tokens(b["name"])) == hay_tokens and hay_tokens]
    if equal:
        return pick(equal)

    contained = []
    for b in playable:
        nt = set(significant_tokens(b["name"]))
        if not nt:
            continue
        if nt.issubset(hay_tokens) or hay_tokens.issubset(nt):
            contained.append(b)
    return pick(contained)


def _json_num(v):
    if v is None or v == "":
        return None
    return v


def build_rack_rounds(score_rows: list[dict], hole_rows: list[dict],
                      balls: list[dict], aliases: dict[str, str]) -> list[dict]:
    """Sanitized SCOREBOOK rows. Only rounds mapped onto BALLS[].name.

    Public fields: course/date/score/differential, plus optional
    detail/tee/holes/notes. No score_id, GHIN#, name, email, or hole_by_hole.
    hole_rows is accepted so the CSV writer can still emit per-hole data;
    it is not copied into the public JSON.
    """
    del hole_rows  # CSV-only; never shipped in scorebook.json
    rounds = []
    for s in score_rows:
        course, detail = match_ball(s.get("course_name") or "", balls, aliases)
        if not course:
            continue
        rec: dict[str, Any] = {
            "course": course,
            "date": s.get("played_at") or "",
            "score": _json_num(s.get("adjusted_gross_score")),
        }
        diff = _json_num(s.get("differential"))
        if diff is not None:
            rec["differential"] = diff
        if detail:
            rec["detail"] = detail
        if s.get("tee"):
            rec["tee"] = s.get("tee")
        holes = _json_num(s.get("holes"))
        if holes is not None:
            rec["holes"] = holes
        rounds.append({k: rec[k] for k in RACK_ROUND_KEYS if k in rec})
    return rounds


def empty_export() -> dict:
    return {
        "schema": SCHEMA,
        "_comment": (
            "Empty sanitized SCOREBOOK for the ball rack. Run python3 scripts/sync_ghin.py "
            "to fill this file. Committing a filled copy publishes those scores on the "
            "live site. No name, email, or GHIN number belongs in this file."
        ),
        "source": "ghin-export",
        "synced_at": None,
        "profile": {
            "handicap_index": None,
            "low_hi": None,
            "low_hi_date": None,
            "rev_date": None,
        },
        "rounds": [],
    }


def build_export(data: dict, balls: list[dict], aliases: dict[str, str],
                 synced_at: Optional[str] = None) -> dict:
    from datetime import datetime, timezone
    scores = build_scores(data.get("scores"))
    holes = build_hole_scores(data.get("scores"))
    prof = build_profile(data.get("profile"))
    rounds = build_rack_rounds(scores, holes, balls, aliases)
    export = empty_export()
    export["_comment"] = (
        "Local GHIN export for the ball rack. Generated by scripts/sync_ghin.py. "
        "Redacted: name, email, GHIN number are never written here. "
        "Committing this file publishes the rounds on the live GitHub Pages site."
    )
    export["synced_at"] = synced_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    export["profile"] = prof
    export["rounds"] = rounds
    return export


def write_csv(path: str, cols: list[str], rows: list[dict]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in cols})
    os.replace(tmp, path)


def write_json(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def write_outputs(data: dict, balls: list[dict], aliases: dict[str, str],
                  scorebook_dir: str, csv_dir: str) -> dict:
    scores = build_scores(data.get("scores"))
    holes = build_hole_scores(data.get("scores"))
    hist = build_history(data.get("history"))
    export = build_export(data, balls, aliases)
    os.makedirs(csv_dir, exist_ok=True)
    write_csv(os.path.join(csv_dir, "ghin_scores.csv"), SCORE_COLS, scores)
    write_csv(os.path.join(csv_dir, "ghin_handicap_history.csv"), HIST_COLS, hist)
    write_csv(os.path.join(csv_dir, "ghin_hole_scores.csv"), HOLE_SCORE_COLS, holes)
    write_json(os.path.join(scorebook_dir, "scorebook.json"), export)
    return {
        "scores": len(scores),
        "revisions": len(hist),
        "index": export["profile"].get("handicap_index"),
        "hole_scores": len(holes),
        "mapped": len(export["rounds"]),
        "scorebook": os.path.join(scorebook_dir, "scorebook.json"),
        "csv_dir": csv_dir,
    }


# ---------------------------------------------------------------------------
# Credentials: env vars and/or interactive prompt. Never written to the repo.
# ---------------------------------------------------------------------------

def _env(*names: str) -> Optional[str]:
    for n in names:
        v = os.environ.get(n)
        if v and v.strip():
            return v.strip()
    return None


def _read_creds_file() -> dict:
    """Optional local ~/.ghin_creds.json — never committed, never shipped to Pages."""
    if not os.path.isfile(CREDS_PATH):
        return {}
    try:
        with open(CREDS_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        sys.exit(f"Error: could not read {CREDS_PATH}: {e}")
    return data if isinstance(data, dict) else {}


def load_credentials(prompt: bool = True) -> tuple[str, str]:
    """Return (token, ghin_id). Env, then ~/.ghin_creds.json, then TTY prompt."""
    c = _read_creds_file()
    email = _env("GHIN_EMAIL", "GHIN_USER", "GHIN_USERNAME") or c.get("email") or c.get("email_or_ghin") or c.get("username")
    password = _env("GHIN_PASSWORD") or c.get("password")
    ghin = _env("GHIN_ID", "GHIN_NUMBER") or c.get("ghin_id") or c.get("ghin") or c.get("golfer_id")
    token = _env("GHIN_BEARER", "GHIN_TOKEN") or c.get("bearer_token") or c.get("token")

    if token:
        token = str(token).strip()
        for pre in ("Bearer:", "Bearer"):
            if token.startswith(pre):
                token = token[len(pre):].strip()

    if not email and prompt and sys.stdin.isatty():
        email = input("GHIN email or GHIN#: ").strip()
    if not password and prompt and sys.stdin.isatty():
        password = getpass.getpass("GHIN password: ")

    if email and password:
        fresh, gid = ghin_login(str(email), str(password))
        if fresh:
            token = fresh
            ghin = ghin or gid
        elif not token:
            sys.exit("Error: GHIN login failed. Check email/GHIN# and password.")
    if not token or not ghin:
        sys.exit(
            "Error: missing GHIN credentials.\n"
            "  export GHIN_EMAIL='you@example.com'\n"
            "  export GHIN_PASSWORD='...'\n"
            "  python3 scripts/sync_ghin.py\n"
            "Or put email/password (or bearer_token + ghin_id) in ~/.ghin_creds.json "
            "(chmod 600). Never put credentials in HTML/JS."
        )
    return token, str(ghin)


def load_json_file(path: Optional[str]) -> Any:
    if not path:
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--scorebook-dir", default=DEFAULT_SCOREBOOK_DIR,
                   help="Directory for sanitized scorebook.json (default: assets/data)")
    p.add_argument("--csv-dir", default=DEFAULT_CSV_DIR,
                   help="Directory for GHIN CSV dumps (default: golf-data/, gitignored)")
    p.add_argument("--rack-data", default=os.path.join(REPO_ROOT, "assets", "js", "rack-data.js"),
                   help="Path to rack-data.js for course-name matching")
    p.add_argument("--aliases", default=os.path.join(HERE, "ghin-course-aliases.json"),
                   help="Optional GHIN course_name → BALLS[].name map")
    p.add_argument("--offline", action="store_true",
                   help="Skip GHIN login; build from --scores-json / --profile-json / --history-json")
    p.add_argument("--scores-json", help="Offline GHIN scores payload (raw or golf-reports cache)")
    p.add_argument("--profile-json", help="Offline GHIN profile/search payload")
    p.add_argument("--history-json", help="Offline GHIN handicap_history payload")
    args = p.parse_args(argv)

    balls = load_rack_balls(args.rack_data)
    aliases = load_aliases(args.aliases)

    if args.offline or args.scores_json or args.profile_json or args.history_json:
        data = {
            "scores": load_json_file(args.scores_json),
            "profile": load_json_file(args.profile_json),
            "history": load_json_file(args.history_json),
        }
        if data["scores"] is None and data["profile"] is None and data["history"] is None:
            sys.exit("Error: --offline requires at least one of --scores-json / --profile-json / --history-json")
    else:
        token, ghin = load_credentials(prompt=True)
        data = fetch(token, ghin)

    counts = write_outputs(
        data, balls, aliases,
        scorebook_dir=args.scorebook_dir, csv_dir=args.csv_dir,
    )
    print(
        f"BUILT: ghin_scores={counts['scores']}, handicap_revisions={counts['revisions']}, "
        f"index={counts['index']}, hole_scores={counts['hole_scores']}"
    )
    print(f"Rack file -> {counts['scorebook']}")
    print(f"CSV dumps -> {counts['csv_dir']}  (gitignored; do not commit)")
    print("READ-ONLY: nothing was posted to GHIN.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
