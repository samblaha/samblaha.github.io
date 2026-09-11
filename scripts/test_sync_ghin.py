"""Offline tests for scripts/sync_ghin.py — no network, no credentials."""
from __future__ import annotations

import csv
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import sync_ghin as sg  # noqa: E402

FIXTURES = os.path.join(HERE, "fixtures")
RACK_DATA = os.path.join(REPO, "assets", "js", "rack-data.js")


def _load(name: str):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return json.load(f)


class ParseFixtures(unittest.TestCase):
    def test_score_row_count_dedupes_buckets(self):
        rows = sg.build_scores(_load("ghin_scores.json"))
        ids = {r["score_id"] for r in rows}
        self.assertEqual(ids, {"score-001", "score-002"})
        self.assertEqual(len(rows), 2)

    def test_score_fields(self):
        rows = sg.build_scores(_load("ghin_scores.json"))
        by_id = {r["score_id"]: r for r in rows}
        s1 = by_id["score-001"]
        self.assertEqual(s1["played_at"], "2026-06-08")
        self.assertEqual(s1["course_name"], "WindRose Golf Club")
        self.assertEqual(s1["adjusted_gross_score"], 98)
        self.assertEqual(s1["differential"], 23.1)
        self.assertEqual(s1["holes"], 18)

    def test_hole_score_row_count(self):
        rows = sg.build_hole_scores(_load("ghin_scores.json"))
        self.assertEqual(len(rows), 18)
        self.assertEqual({r["score_id"] for r in rows}, {"score-001"})

    def test_null_hole_details_produce_no_rows(self):
        rows = sg.build_hole_scores(_load("ghin_scores.json"))
        self.assertEqual([r for r in rows if r["score_id"] == "score-002"], [])

    def test_history(self):
        rows = sg.build_history(_load("ghin_handicap_history.json"))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["date"], "2026-06-15")
        self.assertEqual(rows[0]["handicap_index"], "12.4")

    def test_profile_redacts_pii(self):
        prof = sg.build_profile(_load("ghin_profile.json"))
        blob = json.dumps(prof)
        self.assertEqual(prof["handicap_index"], "12.4")
        self.assertEqual(prof["low_hi"], "11.2")
        self.assertNotIn("should-not-appear@example.com", blob)
        self.assertNotIn("REDACT", blob)
        self.assertNotIn("0000000", blob)
        self.assertNotIn("email", blob)
        self.assertNotIn("ghin", blob.lower())
        self.assertNotIn("first_name", blob)


class CourseMatch(unittest.TestCase):
    def test_normalize_gc_abbreviation(self):
        a = sg.normalize_course("Muirfield Village Golf Club")
        b = sg.normalize_course("Muirfield Village GC")
        self.assertEqual(a, b)

    def test_match_exact_rack_name(self):
        balls = sg.load_rack_balls(RACK_DATA)
        self.assertGreater(len(balls), 50)
        name, detail = sg.match_ball("Muirfield Village Golf Club", balls, {})
        self.assertEqual(name, "Muirfield Village Golf Club")

    def test_match_alias(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, detail = sg.match_ball(
            "OSU Scarlet", balls,
            {"OSU Scarlet": "Ohio State University Golf Club"},
        )
        self.assertEqual(name, "Ohio State University Golf Club")

    def test_match_barefoot_norman_detail(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, detail = sg.match_ball("Barefoot Resort Norman Course", balls, {})
        self.assertEqual(name, "Barefoot Resort & Golf")
        self.assertEqual(detail, "Norman Course")

    def test_dye_club_not_confused_with_barefoot_norman(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, detail = sg.match_ball("Barefoot Resort Norman Course", balls, {})
        self.assertNotEqual(name, "The Dye Club at Barefoot Resort")

    def test_new_albany_links_does_not_steal_country_club(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, _ = sg.match_ball("New Albany Links Golf Club", balls, {})
        self.assertEqual(name, "New Albany Links Golf Club")
        name2, _ = sg.match_ball("New Albany Country Club", balls, {})
        self.assertEqual(name2, "New Albany Country Club")

    def test_unknown_course_stays_unmapped(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, detail = sg.match_ball("WindRose Golf Club", balls, {})
        self.assertIsNone(name)
        self.assertIsNone(detail)

    def test_special_balls_are_not_mapped(self):
        balls = sg.load_rack_balls(RACK_DATA)
        name, _ = sg.match_ball("Custom Photo Ball", balls, {})
        self.assertIsNone(name)


class ExportWrite(unittest.TestCase):
    def test_empty_export_schema(self):
        empty = sg.empty_export()
        self.assertEqual(empty["schema"], sg.SCHEMA)
        self.assertEqual(empty["rounds"], [])
        self.assertIsNone(empty["profile"]["handicap_index"])

    def test_write_outputs_offline_fixture(self):
        data = {
            "scores": _load("ghin_scores.json"),
            "profile": _load("ghin_profile.json"),
            "history": _load("ghin_handicap_history.json"),
        }
        balls = sg.load_rack_balls(RACK_DATA)
        with tempfile.TemporaryDirectory() as td:
            counts = sg.write_outputs(td, data, balls, {})
            self.assertEqual(counts["scores"], 2)
            self.assertEqual(counts["revisions"], 2)
            self.assertEqual(counts["index"], "12.4")
            self.assertEqual(counts["hole_scores"], 18)

            path = os.path.join(td, "ghin-scores.json")
            with open(path, encoding="utf-8") as f:
                export = json.load(f)
            blob = json.dumps(export)
            self.assertNotIn("should-not-appear@example.com", blob)
            self.assertNotIn("REDACT", blob)
            self.assertEqual(export["schema"], sg.SCHEMA)
            self.assertEqual(len(export["rounds"]), 2)
            self.assertEqual(export["profile"]["handicap_index"], "12.4")
            # Fixture courses are not on the rack — names stay as GHIN sent them.
            courses = {r["course"] for r in export["rounds"]}
            self.assertIn("WindRose Golf Club", courses)

            with open(os.path.join(td, "ghin_scores.csv"), encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            self.assertEqual(len(rows), 2)

    def test_mapped_round_uses_rack_name(self):
        data = {
            "scores": {
                "recent_scores": {
                    "scores": [{
                        "id": "x1",
                        "played_at": "2026-07-12",
                        "course_name": "Muirfield Village GC",
                        "number_of_holes": 18,
                        "adjusted_gross_score": 84,
                        "differential": 12.4,
                        "tee_name": "White",
                    }]
                }
            },
            "profile": None,
            "history": None,
        }
        balls = sg.load_rack_balls(RACK_DATA)
        export = sg.build_export(data, balls, {})
        self.assertEqual(len(export["rounds"]), 1)
        r = export["rounds"][0]
        self.assertEqual(r["course"], "Muirfield Village Golf Club")
        self.assertEqual(r["score"], 84)
        self.assertEqual(r["tee"], "White")
        self.assertEqual(r["date"], "2026-07-12")

    def test_committed_scorebook_is_empty_schema(self):
        path = os.path.join(REPO, "assets", "data", "ghin-scores.json")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data["rounds"], [])
        self.assertIsNone(data["profile"]["handicap_index"])
        self.assertEqual(data["schema"], sg.SCHEMA)


class ReadOnlyGuard(unittest.TestCase):
    def test_script_has_no_score_posting(self):
        with open(os.path.join(HERE, "sync_ghin.py"), encoding="utf-8") as f:
            src = f.read()
        lower = src.lower()
        self.assertNotIn("post_score", lower)
        self.assertNotIn("post_round", lower)
        self.assertNotIn("submit_score", lower)
        self.assertIn("READ-ONLY", src)
        self.assertIn("/golfers/{ghin}/scores.json", src)
        self.assertIn("golfer_login.json", src)
        self.assertIn('method="GET"', src)


if __name__ == "__main__":
    unittest.main()
