#!/usr/bin/env node
/**
 * Offline tests for the About-station career scope — no browser, no network.
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
  fs.readFileSync(path.join(repo, 'assets/js/career-scope.js'), 'utf8'),
  ctx,
);

const Scope = ctx.BlahaCareerScope;
assert.ok(Scope, 'BlahaCareerScope should export on globalThis');

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
  assert.strictEqual(Scope.parseProjects('{nope').length, 0);
  assert.strictEqual(Scope.parseProjects(null).length, 0);
  assert.strictEqual(
    Scope.parseProjects([{ title: 'Nope' }, { title: 'Still nope', date: '2020-01-01' }]).length,
    0,
  );
});

test('sorts oldest → newest and keeps status/tag', () => {
  const parsed = Scope.parseProjects([
    {
      id: 'new',
      title: 'Newer',
      url: '/p/new/',
      date: '2024-01-01',
      status: 'Shipped',
      tag: 'Web',
    },
    {
      id: 'old',
      title: 'Older',
      url: '/p/old/',
      date: '2019-03-01',
      status: 'In progress',
      tags: ['Hardware'],
    },
  ]);
  assert.strictEqual(parsed.map((p) => p.id).join(','), 'old,new');
  assert.strictEqual(parsed[0].year, '2019');
  assert.strictEqual(parsed[0].hot, true);
  assert.strictEqual(parsed[0].tag, 'Hardware');
  assert.strictEqual(parsed[1].hot, false);
});

test('same-day builds get distinct timebase positions', () => {
  const parsed = Scope.parseProjects([
    { id: 'guppy', title: 'Guppy', url: '/p/guppy/', date: '2024-03-10' },
    { id: 'qrng', title: 'Quantum', url: '/p/qrng/', date: '2024-03-10' },
    { id: 'early', title: 'Early', url: '/p/early/', date: '2019-01-01' },
  ]);
  const axis = Scope.axisFor(parsed, Date.UTC(2024, 5, 1));
  const laid = Scope.layout(parsed, axis);
  const ts = laid.map((p) => p.t);
  assert.ok(ts[0] < ts[1] && ts[1] < ts[2], 'positions should increase');
  assert.notStrictEqual(laid[1].t, laid[2].t);
  assert.ok(laid[0].t >= Scope.EDGE - 0.001);
  assert.ok(laid[laid.length - 1].t <= 1 - Scope.EDGE + 0.001);
});

test('nearestIndex picks the closest blip', () => {
  const laid = [
    { t: 0.1, id: 'a' },
    { t: 0.5, id: 'b' },
    { t: 0.9, id: 'c' },
  ];
  assert.strictEqual(Scope.nearestIndex(0.12, laid), 0);
  assert.strictEqual(Scope.nearestIndex(0.61, laid), 1);
  assert.strictEqual(Scope.nearestIndex(0.99, laid), 2);
  assert.strictEqual(Scope.nearestIndex(0.5, []), -1);
});

test('readout is year · title · status plus a clipped summary', () => {
  const view = Scope.readout({
    year: '2019',
    title: 'Retro Pi Game Emulator',
    status: 'Shipped',
    tag: 'Raspberry Pi',
    summary: 'A Raspberry Pi retro gaming console.',
    url: '/p/retro-pi/',
  });
  assert.strictEqual(view.line, '2019 · Retro Pi Game Emulator · Shipped');
  assert.strictEqual(view.kicker, '2019 · Raspberry Pi');
  assert.strictEqual(view.href, '/p/retro-pi/');
  assert.ok(view.summary.includes('Raspberry Pi'));
});

test('trace samples peak near laid-out blips', () => {
  const laid = [{ t: 0.25, hot: false }, { t: 0.8, hot: true }];
  const samples = Scope.sampleTrace(laid, 201);
  const at = function (t) {
    return samples[Math.round(t * 200)];
  };
  assert.ok(at(0.25) > at(0.5), 'first spike should rise above the trough');
  assert.ok(at(0.8) > at(0.5), 'second spike should rise above the trough');
  assert.ok(at(0.8) >= at(0.25), 'in-progress spike is at least as tall');
});

test('markers match real _projects on disk, oldest → newest', () => {
  const files = loadRepoProjects();
  assert.ok(files.length >= 8, 'expected logged builds in _projects/');
  const parsed = Scope.parseProjects(files);
  assert.strictEqual(parsed.length, files.length);
  assert.strictEqual(parsed[0].id, 'retro-pi');
  assert.strictEqual(parsed[0].year, '2019');
  assert.strictEqual(parsed[parsed.length - 1].id, 'virtual-ball-rack');
  parsed.forEach(function (project) {
    assert.ok(project.url.startsWith('/p/'), project.id + ' should use /p/ permalinks');
    assert.ok(project.title, project.id + ' needs a title');
    assert.ok(project.date, project.id + ' needs a date');
  });
  const laid = Scope.layout(parsed, Scope.axisFor(parsed, Date.UTC(2026, 8, 11)));
  for (let i = 1; i < laid.length; i += 1) {
    assert.ok(laid[i].t >= laid[i - 1].t, 'time axis must be non-decreasing');
  }
  const openPage = parsed.find((p) => p.id === 'laser-timing-gates');
  assert.ok(openPage && openPage.hot, 'OpenPage should stay In progress');
});

test('home layout drives the scope from site.projects, not invented jobs', () => {
  const home = fs.readFileSync(path.join(repo, '_layouts/home.html'), 'utf8');
  const about = home.split('id="about"')[1] || '';
  assert.ok(home.includes('data-career-scope'));
  assert.ok(home.includes('id="career-scope-data"'));
  assert.ok(home.includes('/assets/js/career-scope.js'));
  assert.ok(home.includes('career_projects = site.projects | sort: "date"'));
  assert.ok(about.includes('{{ project.url }}'));
  assert.doesNotMatch(about, /LinkedIn|Google|Meta|employer|résumé company/i);
  const js = fs.readFileSync(path.join(repo, 'assets/js/career-scope.js'), 'utf8');
  const css = fs.readFileSync(path.join(repo, 'assets/css/site.css'), 'utf8');
  const copper = fs.readFileSync(path.join(repo, 'assets/js/copper-trace.js'), 'utf8');
  assert.doesNotMatch(js, /ghin|password|api[_-]?key|secret/i);
  assert.ok(css.includes('.career-scope'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(copper.includes('.career-scope__stage'));
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
