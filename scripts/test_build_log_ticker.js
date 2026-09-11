#!/usr/bin/env node
/**
 * Offline tests for the homepage CH2 build-log ticker — no browser, no network.
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
  fs.readFileSync(path.join(repo, 'assets/js/build-log-ticker.js'), 'utf8'),
  ctx,
);

const Log = ctx.BlahaBuildLog;
assert.ok(Log, 'BlahaBuildLog should export on globalThis');

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
  assert.strictEqual(Log.parseProjects('{nope').length, 0);
  assert.strictEqual(Log.parseProjects(null).length, 0);
  assert.strictEqual(
    Log.parseProjects([{ title: 'Nope' }, { title: 'Still nope', date: '2020-01-01' }]).length,
    0,
  );
});

test('sorts newest → oldest and keeps status/tag', () => {
  const parsed = Log.parseProjects([
    {
      id: 'old',
      title: 'Older',
      url: '/p/old/',
      date: '2019-03-01',
      status: 'In progress',
      tags: ['Hardware'],
    },
    {
      id: 'new',
      title: 'Newer',
      url: '/p/new/',
      date: '2024-01-01',
      status: 'Shipped',
      tag: 'Web',
    },
  ]);
  assert.strictEqual(parsed.map((p) => p.id).join(','), 'new,old');
  assert.strictEqual(parsed[0].year, '2024');
  assert.strictEqual(parsed[0].tag, 'Web');
  assert.strictEqual(parsed[1].tag, 'Hardware');
  assert.strictEqual(parsed[1].status, 'In progress');
});

test('status labels stamp WIP / SHIP / LOG from the write-up', () => {
  assert.strictEqual(Log.statusCode('In progress'), 'WIP');
  assert.strictEqual(Log.statusTone('In progress'), 'wip');
  assert.strictEqual(Log.statusCode('Shipped'), 'SHIP');
  assert.strictEqual(Log.statusTone('Shipped'), 'ship');
  assert.strictEqual(Log.statusCode(''), 'LOG');
  assert.strictEqual(Log.statusTone(''), 'log');
  assert.strictEqual(Log.statusCode('Prototype'), 'PROTOTYP');
  assert.doesNotMatch(Log.statusCode('Shipped'), /star|score|fake/i);
});

test('every rendered item needs title, url, and date', () => {
  assert.strictEqual(Log.renderItem({ title: 'Nope' }), '');
  assert.strictEqual(Log.renderItem({ title: 'Nope', url: '/p/nope/' }), '');
  const html = Log.renderItem({
    title: 'Virtual Golf Ball Rack',
    url: '/p/virtual-ball-rack/',
    date: '2026-09-02',
    year: '2026',
    status: 'Shipped',
    tag: 'Golf',
  });
  assert.ok(html.includes('href="/p/virtual-ball-rack/"'));
  assert.ok(html.includes('Virtual Golf Ball Rack'));
  assert.ok(html.includes('datetime="2026-09-02"'));
  assert.ok(html.includes('>2026<'));
  assert.ok(html.includes('SHIP'));
  assert.ok(html.includes('Golf'));
  assert.ok(html.includes('ticker__stamp--ship'));
});

test('loop duration scales with the log and reduced-motion stays still', () => {
  assert.strictEqual(Log.loopSeconds(0), 0);
  assert.ok(Log.loopSeconds(10) >= 18);
  assert.ok(Log.loopSeconds(10) <= 72);
  assert.strictEqual(Log.shouldAnimate(10, true), false);
  assert.strictEqual(Log.shouldAnimate(10, false), true);
  assert.strictEqual(Log.shouldAnimate(0, false), false);
});

test('items match real _projects on disk, newest first', () => {
  const files = loadRepoProjects();
  assert.ok(files.length >= 8, 'expected logged builds in _projects/');
  const parsed = Log.parseProjects(files);
  assert.strictEqual(parsed.length, files.length);
  parsed.forEach(function (project) {
    assert.ok(project.title, project.id + ' needs a title');
    assert.ok(project.url, project.id + ' needs a url');
    assert.ok(project.date, project.id + ' needs a date');
    assert.ok(project.url.startsWith('/p/'), project.id + ' should use /p/ permalinks');
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(project.date), project.id + ' date should be ISO');
  });
  assert.strictEqual(parsed[0].id, 'virtual-ball-rack');
  assert.strictEqual(parsed[0].year, '2026');
  assert.strictEqual(parsed[parsed.length - 1].id, 'retro-pi');
  const open = parsed.find((p) => p.id === 'laser-timing-gates');
  assert.ok(open && Log.statusCode(open.status) === 'WIP');
  const rack = parsed.find((p) => p.id === 'virtual-ball-rack');
  assert.strictEqual(Log.statusCode(rack.status), 'SHIP');
  assert.strictEqual(rack.tag, 'Golf');
  const ids = parsed.map((p) => p.id);
  assert.ok(!ids.includes('_TEMPLATE'));
  const seq = Log.renderSeq(parsed);
  files.forEach(function (file) {
    assert.ok(seq.includes(Log.escapeHtml(file.title)), 'ticker should include ' + file.title);
    assert.ok(seq.includes(file.url), 'ticker should link ' + file.url);
  });
});

test('home layout feeds site.projects into CH2 and keeps the strip interactive', () => {
  const home = fs.readFileSync(path.join(repo, '_layouts/home.html'), 'utf8');
  const js = fs.readFileSync(path.join(repo, 'assets/js/build-log-ticker.js'), 'utf8');
  const css = fs.readFileSync(path.join(repo, 'assets/css/site.css'), 'utf8');
  const copper = fs.readFileSync(path.join(repo, 'assets/js/copper-trace.js'), 'utf8');
  const rail = fs.readFileSync(path.join(repo, '_layouts/project.html'), 'utf8');
  assert.ok(home.includes('data-build-log'));
  assert.ok(home.includes('id="build-log-data"'));
  assert.ok(home.includes('/assets/js/build-log-ticker.js'));
  assert.ok(home.includes('CH2 · BUILD LOG'));
  assert.ok(home.includes('Scrolling build log of logged projects'));
  assert.ok(home.includes('latest_projects'));
  assert.ok(home.includes('{{ project.url }}'));
  assert.doesNotMatch(home, /class="ticker"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(home, /HARDWARE ✦ FIRMWARE ✦ 3D PRINTING/);
  assert.ok(css.includes('.ticker__stamp'));
  assert.ok(css.includes('buildLogScroll'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(/\.ticker \{[\s\S]*?overflow: hidden/.test(css));
  assert.ok(css.includes('.ticker__seq[aria-hidden="true"]'));
  assert.ok(copper.includes('[data-build-log]'));
  assert.ok(rail.includes('id="build-rail"'), 'project build-rail stays put');
  assert.doesNotMatch(js, /ghin|password|api[_-]?key|secret/i);
  assert.doesNotMatch(home, /nixie|jumper netlist|noise-floor/i);
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
