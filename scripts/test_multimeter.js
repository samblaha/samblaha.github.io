#!/usr/bin/env node
/**
 * Offline tests for the homepage workbench DMM — no browser, no network.
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
  fs.readFileSync(path.join(repo, 'assets/js/multimeter.js'), 'utf8'),
  ctx,
);

const Dmm = ctx.BlahaMultimeter;
assert.ok(Dmm, 'BlahaMultimeter should export on globalThis');

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

function readFrontMatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const block = match[1];
  const pick = function (key) {
    const line = block.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
    if (!line) return '';
    return line[1].replace(/^["']|["']$/g, '').trim();
  };
  const tagsMatch = block.match(/^tags:\n((?:  - .+\n)+)/m);
  const tags = tagsMatch
    ? tagsMatch[1]
        .trim()
        .split('\n')
        .map(function (row) {
          return row.replace(/^\s*-\s*/, '').trim();
        })
    : [];
  return {
    id: path.basename(file, '.md'),
    title: pick('title'),
    date: pick('date'),
    summary: pick('summary'),
    status: pick('status'),
    tags: tags,
    url: '/p/' + path.basename(file, '.md') + '/',
  };
}

function loadRepoProjects() {
  const dir = path.join(repo, '_projects');
  return fs
    .readdirSync(dir)
    .filter(function (name) {
      return name.endsWith('.md') && !name.startsWith('_');
    })
    .map(function (name) {
      return readFrontMatter(path.join(dir, name));
    })
    .filter(Boolean);
}

test('corrupt JSON and missing fields are skipped', () => {
  assert.strictEqual(Dmm.parseProjects('{nope').length, 0);
  assert.strictEqual(Dmm.parseProjects(null).length, 0);
  assert.strictEqual(
    Dmm.parseProjects([{ title: 'Nope' }, { title: 'Still nope', date: '2020-01-01' }]).length,
    0,
  );
});

test('idle reading is open leads', () => {
  const idle = Dmm.idleReading();
  assert.strictEqual(idle.digits, '----');
  assert.strictEqual(idle.range, 'OPEN');
  assert.strictEqual(idle.label, 'Probe a build');
  assert.strictEqual(idle.live, 'LEADS OPEN');
  assert.strictEqual(idle.continuity, 'open');
  assert.strictEqual(idle.needle, 0);
  assert.strictEqual(Dmm.reading(null, 'year').digits, '----');
});

test('year mode shows the build year, not a fake score', () => {
  const parsed = Dmm.parseProjects([
    { id: 'rack', title: 'Virtual Golf Ball Rack', url: '/p/virtual-ball-rack/', date: '2026-09-02', status: 'Shipped', tag: 'Golf' },
    { id: 'retro', title: 'Retro Pi', url: '/p/retro-pi/', date: '2019-03-01', status: 'Shipped', tags: ['Raspberry Pi'] },
  ]);
  const view = Dmm.reading(parsed[0], 'year', parsed);
  assert.strictEqual(view.digits, '2026');
  assert.strictEqual(view.unit, 'YR');
  assert.strictEqual(view.range, 'TIME');
  assert.strictEqual(view.label, 'Virtual Golf Ball Rack');
  assert.ok(view.needle > Dmm.reading(parsed[1], 'year', parsed).needle);
});

test('status maps shipped to continuity and in-progress to an orange spike', () => {
  const shipped = Dmm.reading(
    { title: 'Rack', url: '/p/rack/', year: '2026', status: 'Shipped' },
    'status',
  );
  const hot = Dmm.reading(
    { title: 'OpenPage', url: '/p/open/', year: '2025', status: 'In progress' },
    'status',
  );
  const missing = Dmm.reading(
    { title: 'Mystery', url: '/p/mystery/', year: '2020' },
    'status',
  );
  assert.strictEqual(shipped.digits, 'CONT');
  assert.strictEqual(shipped.continuity, 'closed');
  assert.strictEqual(shipped.range, 'Shipped');
  assert.strictEqual(shipped.tone, 'laser');
  assert.strictEqual(hot.digits, 'OL');
  assert.strictEqual(hot.continuity, 'spike');
  assert.strictEqual(hot.range, 'In progress');
  assert.strictEqual(hot.tone, 'solder');
  assert.ok(hot.needle > shipped.needle);
  assert.strictEqual(missing.digits, '----');
  assert.strictEqual(missing.continuity, 'open');
  assert.ok(missing.label.includes('no status'));
});

test('tag mode uses the first logged tag as the range', () => {
  const parsed = Dmm.parseProjects([
    {
      id: 'guppy',
      title: 'Guppy',
      url: '/p/guppy/',
      date: '2024-03-10',
      tags: ['Raspberry Pi', 'AI'],
    },
  ]);
  const view = Dmm.reading(parsed[0], 'tag');
  assert.strictEqual(view.range, 'Raspberry Pi');
  assert.strictEqual(view.unit, 'Ω');
  assert.strictEqual(view.digits, Dmm.lcdText('Raspberry Pi', Dmm.LCD_WIDTH));
  assert.ok(view.digits.length <= Dmm.LCD_WIDTH);
  assert.doesNotMatch(view.digits, /star|score|productiv/i);
});

test('lcdText uppercases and clips without inventing glyphs', () => {
  assert.strictEqual(Dmm.lcdText(''), '----');
  assert.strictEqual(Dmm.lcdText('Golf'), 'GOLF');
  assert.ok(Dmm.lcdText('Raspberry Pi', 8).startsWith('RASP'));
});

test('stepIndex clamps at the ends and starts from idle', () => {
  assert.strictEqual(Dmm.stepIndex(-1, 1, 6), 0);
  assert.strictEqual(Dmm.stepIndex(-1, -1, 6), 5);
  assert.strictEqual(Dmm.stepIndex(0, -1, 6), 0);
  assert.strictEqual(Dmm.stepIndex(5, 1, 6), 5);
  assert.strictEqual(Dmm.stepIndex(2, 1, 6), 3);
  assert.strictEqual(Dmm.stepIndex(0, 1, 0), -1);
});

test('needle degrees park at open and sweep without wrapping', () => {
  assert.strictEqual(Dmm.needleDeg(0), -72);
  assert.strictEqual(Dmm.needleDeg(1), 72);
  assert.ok(Dmm.needleDeg(0.5) > Dmm.needleDeg(0));
});

test('readings match real _projects on disk', () => {
  const files = loadRepoProjects();
  assert.ok(files.length >= 8, 'expected logged builds in _projects/');
  const parsed = Dmm.parseProjects(files);
  assert.strictEqual(parsed.length, files.length);
  const rack = parsed.find((p) => p.id === 'virtual-ball-rack');
  const open = parsed.find((p) => p.id === 'laser-timing-gates');
  assert.ok(rack && rack.year === '2026');
  assert.strictEqual(Dmm.reading(rack, 'year').digits, '2026');
  assert.strictEqual(Dmm.reading(rack, 'status').digits, 'CONT');
  assert.strictEqual(Dmm.reading(rack, 'tag').range, 'Golf');
  assert.ok(open && Dmm.isHot(open.status));
  assert.strictEqual(Dmm.reading(open, 'status').digits, 'OL');
  parsed.forEach(function (project) {
    assert.ok(project.url.startsWith('/p/'), project.id + ' should use /p/ permalinks');
    assert.ok(project.title, project.id + ' needs a title');
    const year = Dmm.reading(project, 'year');
    assert.strictEqual(year.digits, project.year);
  });
});

test('garage home exposes real project routes and a complete archive', () => {
  const home = fs.readFileSync(path.join(repo, '_layouts/home.html'), 'utf8');
  const js = fs.readFileSync(path.join(repo, 'assets/js/garage.js'), 'utf8');
  const css = fs.readFileSync(path.join(repo, 'assets/css/garage.css'), 'utf8');
  assert.ok(home.includes('data-garage'));
  assert.ok(home.includes('data-open-inventory'));
  assert.ok(home.includes('for project in garage_projects'));
  assert.ok(home.includes('where_exp: "project", "project.garage_slot"'));
  assert.ok(home.includes('data-project="{{ project.slug }}"'));
  assert.ok(home.includes('garage-pin--{{ project.garage_slot'));
  assert.ok(home.includes('"url": {{ project.url | jsonify }}'));
  assert.ok(js.includes('prefers-reduced-motion'));
  assert.ok(js.includes("event.key === 'Escape'"));
  assert.ok(css.includes('@media (max-width: 720px)'));
  assert.doesNotMatch(home, /arcade|constellation|star chart/i);
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
