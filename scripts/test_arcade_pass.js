#!/usr/bin/env node
/**
 * Offline tests for arcade season-pass storage — no browser, no network.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const repo = path.resolve(__dirname, '..');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(repo, 'assets/js/arcade-pass.js'), 'utf8'),
  ctx,
);

const Pass = ctx.BlahaArcadePass;
assert.ok(Pass, 'BlahaArcadePass should export on globalThis');

function memory(map) {
  const data = map || {};
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) {
      data[k] = String(v);
    },
    data: data,
  };
}

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('ok  -', name);
  } catch (err) {
    failed += 1;
    console.error('FAIL -', name);
    console.error('     ', err && err.message ? err.message : err);
  }
}

test('fresh storage is incomplete', () => {
  const store = memory();
  const pass = Pass.loadPass(store);
  assert.strictEqual(Pass.punchedCount(pass), 0);
  assert.strictEqual(pass.unlocked, false);
  assert.strictEqual(Pass.isUnlocked(store), false);
});

test('snake 70 does not punch', () => {
  const store = memory();
  const result = Pass.noteRun('snake', { score: 70 }, store);
  assert.strictEqual(result.punched.join(','), '');
  assert.strictEqual(result.complete, false);
  assert.strictEqual(Pass.loadPass(store).stamps.snake, undefined);
});

test('snake 80 punches hot iron and leaves high-score key alone', () => {
  const store = memory({ 'blaha-arcade-hs': '{"snake":999}' });
  const result = Pass.noteRun('snake', { score: 80 }, store);
  assert.strictEqual(result.punched.join(','), 'snake');
  assert.ok(result.pass.stamps.snake);
  assert.strictEqual(result.pass.stamps.snake.score, 80);
  assert.strictEqual(store.getItem('blaha-arcade-hs'), '{"snake":999}');
  assert.ok(store.getItem(Pass.PASS_KEY));
});

test('already punched stamp stays punched', () => {
  const store = memory();
  Pass.noteRun('snake', { score: 80 }, store);
  const second = Pass.noteRun('snake', { score: 120 }, store);
  assert.strictEqual(second.punched.join(','), '');
  assert.strictEqual(second.pass.stamps.snake.score, 80);
});

test('lasers 8 gates punches', () => {
  const store = memory();
  const miss = Pass.noteRun('lasers', { score: 7 }, store);
  assert.strictEqual(miss.punched.join(','), '');
  const hit = Pass.noteRun('lasers', { score: 8 }, store);
  assert.strictEqual(hit.punched.join(','), 'lasers');
});

test('chip match needs a clear in 12 moves or fewer', () => {
  const store = memory();
  assert.strictEqual(Pass.noteRun('match', { moves: 12 }, store).punched.join(','), '');
  assert.strictEqual(Pass.noteRun('match', { moves: 13, cleared: true }, store).punched.join(','), '');
  const hit = Pass.noteRun('match', { moves: 12, cleared: true }, store);
  assert.strictEqual(hit.punched.join(','), 'match');
  assert.strictEqual(hit.pass.stamps.match.moves, 12);
});

test('all three stamps unlock the lab and persist', () => {
  const store = memory();
  Pass.noteRun('snake', { score: 90 }, store);
  Pass.noteRun('lasers', { score: 11 }, store);
  const last = Pass.noteRun('match', { moves: 10, cleared: true }, store);
  assert.strictEqual(last.justUnlocked, true);
  assert.strictEqual(last.complete, true);
  const reloaded = Pass.loadPass(store);
  assert.strictEqual(reloaded.unlocked, true);
  assert.strictEqual(Pass.punchedCount(reloaded), 3);
  assert.strictEqual(Pass.isUnlocked(store), true);
});

test('corrupt JSON is treated as empty', () => {
  const store = memory();
  store.setItem(Pass.PASS_KEY, '{nope');
  const pass = Pass.loadPass(store);
  assert.strictEqual(Pass.punchedCount(pass), 0);
});

test('normalize ignores unknown stamps and does not unlock from a flag alone', () => {
  const pass = Pass.normalizePass({
    v: 9,
    unlocked: true,
    stamps: { snake: { at: 10, score: 80 }, mystery: { at: 1 } },
  });
  assert.ok(pass.stamps.snake);
  assert.strictEqual(pass.stamps.mystery, undefined);
  assert.strictEqual(pass.unlocked, false);
  assert.strictEqual(Pass.HS_KEY, 'blaha-arcade-hs');
  assert.strictEqual(Pass.PASS_KEY, 'blaha-arcade-pass');
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
