#!/usr/bin/env node
/**
 * Offline tests for rack-scores.js — no browser, no GHIN network.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const repo = path.resolve(__dirname, "..");
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(repo, "assets/js/rack-data.js"), "utf8")
    + "\nthis.BALLS = BALLS; this.RACK_COLS = RACK_COLS; this.RACK_ROWS = RACK_ROWS;",
  ctx,
);
vm.runInContext(
  fs.readFileSync(path.join(repo, "assets/js/rack-scores.js"), "utf8"),
  ctx,
);

function assertEmptyScorebook() {
  assert.ok(Array.isArray(ctx.SCOREBOOK), "SCOREBOOK should be an array");
  assert.strictEqual(ctx.SCOREBOOK.length, 0);
}

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log("ok  -", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL -", name);
    console.error("     ", err && err.message ? err.message : err);
  }
}

test("empty export keeps SCOREBOOK empty", () => {
  ctx.applyGhinExport({ rounds: [] });
  assertEmptyScorebook();
  assert.strictEqual(ctx.scoresForBall(ctx.BALLS[0]).length, 0);
  assert.strictEqual(ctx.handicapIndex(), null);
});

test("missing file shaped payload is safe", () => {
  ctx.applyGhinExport(null);
  assertEmptyScorebook();
  ctx.applyGhinExport({});
  assertEmptyScorebook();
});

test("exact course match", () => {
  ctx.applyGhinExport({
    rounds: [
      { course: "Muirfield Village Golf Club", date: "2025-07-12", score: 84, tee: "White", differential: 12.4 },
    ],
  });
  const ball = ctx.BALLS.find((b) => b.name === "Muirfield Village Golf Club");
  const scores = ctx.scoresForBall(ball);
  assert.strictEqual(scores.length, 1);
  assert.strictEqual(scores[0].score, 84);
  assert.ok(ctx.latestScoreLine(scores).includes("Posted 84"));
});

test("fuzzy GC abbreviation matches rack name", () => {
  ctx.applyGhinExport({
    rounds: [{ course: "Muirfield Village GC", date: "2025-07-12", score: 84 }],
  });
  const ball = ctx.BALLS.find((b) => b.name === "Muirfield Village Golf Club");
  assert.strictEqual(ctx.scoresForBall(ball).length, 1);
});

test("Barefoot Norman does not also hit Fazio", () => {
  ctx.applyGhinExport({
    rounds: [{ course: "Barefoot Resort Norman Course", date: "2025-05-01", score: 90 }],
  });
  const norman = ctx.BALLS.find((b) => b.name === "Barefoot Resort & Golf" && b.detail === "Norman Course");
  const fazio = ctx.BALLS.find((b) => b.name === "Barefoot Resort & Golf" && b.detail === "Fazio Course");
  assert.strictEqual(ctx.scoresForBall(norman).length, 1);
  assert.strictEqual(ctx.scoresForBall(fazio).length, 0);
});

test("New Albany Links vs Country Club stay distinct", () => {
  ctx.applyGhinExport({
    rounds: [
      { course: "New Albany Links Golf Club", date: "2025-01-01", score: 80 },
      { course: "New Albany Country Club", date: "2025-01-02", score: 81 },
    ],
  });
  const links = ctx.BALLS.find((b) => b.name === "New Albany Links Golf Club");
  const nacc = ctx.BALLS.find((b) => b.name === "New Albany Country Club");
  assert.strictEqual(ctx.scoresForBall(links).length, 1);
  assert.strictEqual(ctx.scoresForBall(links)[0].score, 80);
  assert.strictEqual(ctx.scoresForBall(nacc).length, 1);
  assert.strictEqual(ctx.scoresForBall(nacc)[0].score, 81);
});

test("unmatched fixture courses do not attach to random balls", () => {
  ctx.applyGhinExport({
    rounds: [{ course: "WindRose Golf Club", date: "2026-06-08", score: 98 }],
  });
  const hits = ctx.BALLS.filter((b) => ctx.scoresForBall(b).length);
  assert.strictEqual(hits.length, 0);
});

test("handicap index from profile", () => {
  ctx.applyGhinExport({
    profile: { handicap_index: "12.4", low_hi: "11.2", rev_date: "2026-06-15" },
    rounds: [],
  });
  assert.strictEqual(ctx.handicapIndex(), "12.4");
  assert.strictEqual(ctx.GHIN_PROFILE.low_hi, "11.2");
});

test("course_aliases remap GHIN names", () => {
  ctx.applyGhinExport({
    course_aliases: { "OSU Scarlet": "Ohio State University Golf Club" },
    rounds: [{ course: "OSU Scarlet", date: "2025-06-03", score: 88 }],
  });
  const ball = ctx.BALLS.find((b) => b.name === "Ohio State University Golf Club");
  assert.strictEqual(ctx.scoresForBall(ball).length, 1);
});

test("empty committed scorebook file parses", () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(repo, "assets/data/ghin-scores.json"), "utf8"),
  );
  ctx.applyGhinExport(raw);
  assertEmptyScorebook();
  assert.strictEqual(ctx.handicapIndex(), null);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
