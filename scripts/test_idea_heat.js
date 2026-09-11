#!/usr/bin/env node
/**
 * Offline tests for homepage Idea Box heat — no browser, no network.
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
  fs.readFileSync(path.join(repo, 'assets/js/idea-heat.js'), 'utf8'),
  ctx,
);

const Heat = ctx.BlahaIdeaHeat;
assert.ok(Heat, 'BlahaIdeaHeat should export on globalThis');

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
    hero: pick('hero'),
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

const NOW = new Date('2026-09-11T00:00:00Z');

test('corrupt JSON and missing fields are skipped', () => {
  assert.strictEqual(Heat.parseProjects('{nope').length, 0);
  assert.strictEqual(Heat.parseProjects(null).length, 0);
  assert.strictEqual(
    Heat.parseProjects([{ title: 'Nope' }, { title: 'Still nope', date: '2020-01-01' }]).length,
    0,
  );
});

test('hero paths count as present; empty and false do not', () => {
  const parsed = Heat.parseProjects([
    { title: 'Guppy', url: '/p/guppy/', date: '2024-03-10', hero: '/assets/projects/guppy/hero.jpg' },
    { title: 'OpenPage', url: '/p/open/', date: '2025-12-20', hero: '' },
    { title: 'Gap', url: '/p/gap/', date: '2024-01-01', hero: false },
  ]);
  assert.strictEqual(parsed[0].hero, true);
  assert.strictEqual(parsed[1].hero, false);
  assert.strictEqual(parsed[2].hero, false);
});

test('backlog is only in-progress or media-gap — never invented titles', () => {
  const shipped = {
    id: 'guppy',
    title: 'Guppy',
    url: '/p/guppy/',
    date: '2024-03-10',
    status: 'Shipped',
    hero: true,
  };
  const wip = {
    id: 'laser-timing-gates',
    title: 'DIY Ereader - OpenPage',
    url: '/p/laser-timing-gates/',
    date: '2025-12-20',
    status: 'In progress',
    hero: false,
  };
  assert.strictEqual(Heat.isBacklog(shipped), false);
  assert.strictEqual(Heat.baseHeat(shipped, NOW), 0);
  assert.strictEqual(Heat.reasons(wip).join(','), 'in-progress,media-gap');
  assert.ok(Heat.isBacklog(wip));
  assert.ok(Heat.baseHeat(wip, NOW) >= 70);
});

test('media-gap shipped work glows warmer than a complete log, cooler than iron-on', () => {
  const gap = {
    id: 'quantum-random-number-generator',
    title: 'Quantum Random Number Generator',
    url: '/p/quantum-random-number-generator/',
    date: '2024-03-10',
    status: 'Shipped',
    hero: false,
  };
  const wip = {
    id: 'laser-timing-gates',
    title: 'DIY Ereader - OpenPage',
    url: '/p/laser-timing-gates/',
    date: '2025-12-20',
    status: 'In progress',
    hero: false,
  };
  const gapHeat = Heat.baseHeat(gap, NOW);
  const wipHeat = Heat.baseHeat(wip, NOW);
  assert.ok(gapHeat > 24, 'media gap should register');
  assert.ok(wipHeat > gapHeat, 'open iron should outrank a cold joint');
  assert.strictEqual(Heat.band(wipHeat), 'iron');
  assert.strictEqual(Heat.band(gapHeat), 'warm');
});

test('local +heat adds a bounded glow and serializes as a toggle', () => {
  assert.strictEqual(Heat.applyVotes(80, true) - Heat.applyVotes(80, false), Heat.VOTE_GLOW);
  assert.ok(Heat.applyVotes(99, true) <= 99);
  const votes = Heat.parseVotes('{"laser-timing-gates":1,"nope":0,"guppy":false}');
  assert.strictEqual(votes['laser-timing-gates'], 1);
  assert.ok(!votes.nope);
  assert.ok(!votes.guppy);
  assert.strictEqual(Heat.parseVotes('{nope}').laser, undefined);
  const scored = Heat.scoreBacklog(
    [
      {
        id: 'laser-timing-gates',
        title: 'OpenPage',
        url: '/p/laser-timing-gates/',
        date: '2025-12-20',
        status: 'In progress',
        hero: false,
      },
    ],
    { 'laser-timing-gates': 1 },
    NOW,
  );
  assert.strictEqual(scored[0].voted, true);
  assert.ok(scored[0].heat > scored[0].base);
});

test('reason labels stay in bench voice', () => {
  assert.strictEqual(Heat.reasonLabel('in-progress'), 'Iron still on');
  assert.strictEqual(Heat.reasonLabel('media-gap'), 'Media gap');
  assert.strictEqual(Heat.bandLabel(83), 'IRON');
  assert.strictEqual(Heat.bandLabel(40), 'WARM');
});

test('repo backlog matches unfinished / stub posts on disk', () => {
  const files = loadRepoProjects();
  assert.ok(files.length >= 8, 'expected logged builds in _projects/');
  const parsed = Heat.parseProjects(files);
  assert.strictEqual(parsed.length, files.length);
  const backlog = Heat.scoreBacklog(parsed, {}, NOW);
  const ids = backlog.map(function (item) {
    return item.id;
  });
  assert.ok(ids.includes('laser-timing-gates'), 'OpenPage slug should glow');
  assert.ok(ids.includes('quantum-random-number-generator'), 'QRNG has no front-matter hero');
  assert.ok(!ids.includes('guppy'));
  assert.ok(!ids.includes('virtual-ball-rack'));
  assert.ok(!ids.includes('_TEMPLATE'));
  const open = parsed.find(function (p) {
    return p.id === 'laser-timing-gates';
  });
  const qrng = parsed.find(function (p) {
    return p.id === 'quantum-random-number-generator';
  });
  const guppy = parsed.find(function (p) {
    return p.id === 'guppy';
  });
  assert.ok(open && Heat.isInProgress(open.status) && open.hero === false);
  assert.ok(qrng && qrng.hero === false && !Heat.isInProgress(qrng.status));
  assert.ok(guppy && guppy.hero === true);
  backlog.forEach(function (item) {
    assert.ok(parsed.some(function (p) {
      return p.id === item.id;
    }), 'heat chip must already exist in _projects/');
    assert.ok(item.url.startsWith('/p/'));
  });
});

test('home layout wires the IR cam without filling fake giscus IDs', () => {
  const home = fs.readFileSync(path.join(repo, '_layouts/home.html'), 'utf8');
  const giscus = fs.readFileSync(path.join(repo, '_includes/giscus.html'), 'utf8');
  const js = fs.readFileSync(path.join(repo, 'assets/js/idea-heat.js'), 'utf8');
  const css = fs.readFileSync(path.join(repo, 'assets/css/site.css'), 'utf8');
  const copper = fs.readFileSync(path.join(repo, 'assets/js/copper-trace.js'), 'utf8');
  assert.ok(home.includes('data-idea-heat'));
  assert.ok(home.includes('id="idea-heat-data"'));
  assert.ok(home.includes('/assets/js/idea-heat.js'));
  assert.ok(home.includes('CH3 · IR CAM'));
  assert.ok(home.includes('data-heat-vote'));
  assert.ok(css.includes('.idea-heat'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(copper.includes('[data-idea-heat]'));
  assert.ok(giscus.includes('assign giscus_repo_id = ""'));
  assert.ok(giscus.includes('assign giscus_category_id = ""'));
  assert.ok(giscus.includes('giscus_repo_id != ""'));
  assert.ok(giscus.includes('giscus_category_id != ""'));
  assert.doesNotMatch(giscus, /data-repo-id="R_/);
  assert.doesNotMatch(giscus, /data-category-id="DIC_/);
  assert.ok(giscus.includes('Project Ideas'));
  assert.doesNotMatch(js, /ghin|password|api[_-]?key|secret/i);
  assert.doesNotMatch(home, /build-log ticker|nixie|jumper netlist|noise-floor/i);
});

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
