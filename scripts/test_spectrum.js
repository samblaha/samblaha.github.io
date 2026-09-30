#!/usr/bin/env node
/**
 * Offline tests for homepage CH3 spectrum — no browser, no network.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const repo = path.resolve(__dirname, '..');
const ctx = { console, Date, Math, JSON, Object, Array, String, Number, Boolean };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(repo, 'assets/js/spectrum.js'), 'utf8'),
  ctx,
);

const Spec = ctx.BlahaSpectrum;
assert.ok(Spec, 'BlahaSpectrum should export on globalThis');

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

function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

test('energies clamp junk to a quiet face', () => {
  const quiet = Spec.energies(null);
  assert.strictEqual(quiet.scroll, 0);
  assert.strictEqual(quiet.pointer, 0);
  assert.strictEqual(quiet.pulse, 0);
  assert.strictEqual(quiet.x, 0.5);
  const hot = Spec.energies({ scroll: 9, pointer: -2, pulse: true, x: 2 });
  assert.strictEqual(hot.scroll, 1);
  assert.strictEqual(hot.pointer, 0);
  assert.strictEqual(hot.pulse, 1);
  assert.strictEqual(hot.x, 1);
});

test('scroll energy lives in the low bins, clicks sparkle high', () => {
  const n = 48;
  const rumble = Spec.shapeAt(n, 'scroll', 0.5);
  const spark = Spec.shapeAt(n, 'pulse', 0.5);
  assert.ok(rumble[0] > rumble[n - 1], 'scroll should be bass-heavy');
  assert.ok(spark[n - 1] > spark[0], 'pulse should prefer the highs');
  assert.ok(rumble[0] > spark[0]);
});

test('pointer lobe follows pointer X like a VFO', () => {
  const low = Spec.shapeAt(48, 'pointer', 0);
  const high = Spec.shapeAt(48, 'pointer', 1);
  assert.ok(argmax(low) < argmax(high));
  assert.ok(argmax(low) < 20);
  assert.ok(argmax(high) > 28);
});

test('inject saturates, decay lets the phosphor fade', () => {
  const bins = Spec.zeros(4);
  Spec.inject(bins, [1, 1, 1, 1], 0.4);
  assert.strictEqual(bins[0], 0.4);
  Spec.inject(bins, [1, 0, 0, 0], 1);
  assert.strictEqual(bins[0], 1);
  const faded = Spec.decay(bins.slice(), 0.2, 0.2);
  assert.ok(faded[0] < 1);
  assert.ok(faded[0] > 0.3);
});

test('peak hold lingers after the live trace drops', () => {
  const state = Spec.createState(8);
  Spec.step(state, { pulse: true, x: 1 }, 0.016, { reduced: false });
  assert.ok(state.peaks[7] >= state.bins[7]);
  assert.ok(state.peaks[7] > 0.5);
  Spec.step(state, {}, 0.45, { reduced: false });
  assert.ok(state.peaks[7] > state.bins[7], 'hold should outlive the live bin');
  assert.ok(state.sweep > 0);
});

test('reduced motion holds a still peak face with no sweep', () => {
  const state = Spec.createState(8);
  Spec.step(state, { pulse: true, x: 1 }, 0.016, { reduced: true });
  const held = state.peaks[7];
  assert.ok(held > 0.5);
  state.bins.forEach(function (value, i) {
    assert.strictEqual(value, state.peaks[i]);
  });
  assert.strictEqual(state.sweep, 0);
  Spec.step(state, {}, 0.4, { reduced: true });
  assert.strictEqual(state.sweep, 0);
  state.bins.forEach(function (value, i) {
    assert.strictEqual(value, state.peaks[i]);
  });
  assert.ok(state.peaks[7] < held, 'peaks may leak gently');
  assert.ok(state.peaks[7] > held * 0.9, 'must not thrash away');
});

test('wheel/pointer velocity maps onto 0–1 energy', () => {
  assert.strictEqual(Spec.velocityEnergy(0, 0.016, 1600), 0);
  assert.strictEqual(Spec.velocityEnergy(100, 0, 1600), 0);
  assert.ok(Spec.velocityEnergy(800, 0.016, 1600) > 0.5);
  assert.strictEqual(Spec.velocityEnergy(99999, 0.016, 1600), 1);
});

test('peak readout talks in dB, silence is −∞', () => {
  assert.ok(!isFinite(Spec.peakDb(Spec.zeros(8))));
  assert.strictEqual(Spec.formatPeak(Number.NEGATIVE_INFINITY), 'PK −∞');
  assert.strictEqual(Spec.formatPeak(0), 'PK 0');
  assert.strictEqual(Spec.formatPeak(-12.2), 'PK -12');
  assert.strictEqual(Spec.dbHeight(0), 0);
  assert.strictEqual(Spec.dbHeight(1), 1);
  assert.ok(Spec.dbHeight(0.1) > 0.2);
  assert.ok(Spec.dbHeight(0.1) < Spec.dbHeight(0.5));
});

test('garage home seats CH3 without secrets, mics, or network', () => {
  const home = fs.readFileSync(path.join(repo, '_layouts/home.html'), 'utf8');
  const js = fs.readFileSync(path.join(repo, 'assets/js/spectrum.js'), 'utf8');
  const css = fs.readFileSync(path.join(repo, 'assets/css/garage.css'), 'utf8');
  assert.ok(home.includes('data-garage'));
  assert.ok(home.includes('CH3 · SPECTRUM'));
  assert.ok(home.includes('data-spectrum'));
  assert.ok(home.includes('/assets/js/spectrum.js'));
  assert.ok(home.includes('tabindex="0"'));
  assert.doesNotMatch(home, /data-idea-heat|CH3 · IR CAM|ghin|password|api[_-]?key/i);
  assert.doesNotMatch(
    js,
    /ghin|password|api[_-]?key|secret|getUserMedia|webkitGetUserMedia|AudioContext|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/i,
  );
  assert.ok(js.includes('prefers-reduced-motion'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(css.includes('.spectrum'));
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
