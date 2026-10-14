// Page checks against the rendered shortcode and the shipped files.
// Run with: npm test   (needs php on the PATH)
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const PLUGIN = path.join(ROOT, 'wedding-dress-size-calculator');
const db = require('../wedding-dress-size-calculator/data/brands.json');

function render(pluginDir) {
  const out = spawnSync('php', ['-d', 'display_errors=1', '-d', 'error_reporting=-1',
    path.join(__dirname, 'render-page.php'), pluginDir], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  assert.doesNotMatch(out.stdout, /(Warning|Notice|Deprecated|Fatal error):/);
  return out.stdout;
}

// Only what the plugin outputs, without the test harness around it.
function pluginMarkup(page) {
  const start = page.indexOf('<div class="wdsc');
  const end = page.lastIndexOf('</main>');
  return page.slice(start, end);
}

const page = render(PLUGIN);
const markup = pluginMarkup(page);
const js = fs.readFileSync(path.join(PLUGIN, 'assets/calculator.js'), 'utf8');
const css = fs.readFileSync(path.join(PLUGIN, 'assets/calculator.css'), 'utf8');
const php = fs.readFileSync(path.join(PLUGIN, 'wedding-dress-size-calculator.php'), 'utf8') +
  fs.readFileSync(path.join(PLUGIN, 'templates/calculator.php'), 'utf8');

// BUILD-ORDER §5 / SPEC §9. Word boundaries so "close" is not "lose" and
// "appear" is not "pear".
const FORBIDDEN = [
  /\bweight\b/i, /\bBMI\b/i, /\bbody[\s-]?fat\b/i, /\bgoal size\b/i, /\btarget size\b/i,
  /\bslimming\b/i, /\bflattering\b/i, /\bhide\b/i, /\bhides\b/i, /\bdisguise\b/i,
  /\bproblem areas?\b/i, /\bpear\b/i, /\bapple\b/i, /\bhourglass\b/i, /\blose\b/i,
  /before\s*\/\s*after/i, /\btransformation\b/i, /size you want to be/i,
];

test('no forbidden term in markup, copy, alt text, aria labels, JS, CSS or code comments', () => {
  const sources = { 'rendered markup': markup, 'calculator.js': js, 'calculator.css': css, 'PHP source': php };
  const hits = [];
  for (const [name, text] of Object.entries(sources)) {
    for (const re of FORBIDDEN) {
      const m = text.match(re);
      if (m) hits.push(`${name}: "${m[0]}"`);
    }
  }
  assert.deepEqual(hits, []);
});

test('no result is phrased as "you are a size"', () => {
  for (const text of [markup, js]) {
    assert.doesNotMatch(text, /you(?:'|’|\\u2019)?re a size|you are (a )?size|your size is/i);
  }
});

test('no ad, analytics or third-party code anywhere', () => {
  const banned = /adsbygoogle|googlesyndication|doubleclick|googletagmanager|google-analytics|gtag\(|fbq\(|_gaq|dataLayer/i;
  for (const text of [markup, js, php]) {
    assert.doesNotMatch(text, banned);
  }
  // The only external script is our own file; everything else is inline or data.
  const scripts = [...page.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
  const withSrc = scripts.filter((attrs) => /\bsrc=/.test(attrs));
  assert.deepEqual(withSrc.map((a) => a.match(/src="([^"]+)"/)[1]), ['plugin/assets/calculator.js']);
  assert.doesNotMatch(markup, /<iframe|<img\b/i);
});

test('ad slots exist only as comments in the article, after the tool', () => {
  const slots = [...markup.matchAll(/<!-- AD SLOT[^>]*-->/g)].map((m) => m.index);
  assert.equal(slots.length, 2);
  const toolEnd = markup.indexOf('</section>', markup.indexOf('class="wdsc-tool"'));
  const article = markup.indexOf('<article class="wdsc-article">');
  for (const at of slots) {
    assert.ok(at > toolEnd && at > article, 'ad slot must sit inside the article, after the tool');
  }
  // Not directly after the tool: at least one full article section comes first.
  assert.ok(markup.indexOf('id="wdsc-why"') < slots[0]);
});

test('calculator.js makes no network request', () => {
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|new\s+Image\b|importScripts|\.src\s*=/);
});

test('only unit and brand are ever written to storage', () => {
  assert.doesNotMatch(js, /sessionStorage|indexedDB|document\.cookie/);
  const setItems = [...js.matchAll(/localStorage\.setItem\(/g)];
  assert.equal(setItems.length, 1, 'all writes go through writeStored()');
  const writes = [...js.matchAll(/writeStored\(([^,]+),/g)].map((m) => m[1].trim());
  assert.ok(writes.length > 0);
  for (const key of writes) {
    assert.ok(key === 'STORE_UNIT' || key === 'STORE_BRAND' || key === 'key', `unexpected storage key ${key}`);
  }
  assert.match(js, /try \{\s*return window\.localStorage\.getItem/);
  assert.match(js, /try \{\s*window\.localStorage\.setItem/);
});

test('measurement inputs have real labels, decimal keypad and no name attribute', () => {
  for (const field of ['bust', 'waist', 'hips']) {
    assert.match(markup, new RegExp(`<label for="wdsc-${field}">`));
    const input = markup.match(new RegExp(`<input [^>]*id="wdsc-${field}"[^>]*>`))[0];
    assert.match(input, /inputmode="decimal"/);
    assert.match(input, /autocomplete="off"/);
    // No name: even a stray native form submit cannot put a measurement in a URL.
    assert.doesNotMatch(input, /\bname=/);
  }
  assert.match(markup, /<label for="wdsc-brand">/);
  assert.match(markup, /id="wdsc-result"[^>]*aria-live="polite"/);
});

test('brand selector lists the three brands with no default selection', () => {
  const select = markup.match(/<select id="wdsc-brand"[\s\S]*?<\/select>/)[0];
  const options = [...select.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(options, ['', 'azazie', 'maggie-sottero', 'allure-bridals']);
  assert.doesNotMatch(select, /selected/);
});

test('every brand on the page shows its source link and capture date', () => {
  const index = markup.match(/<table class="wdsc-index">[\s\S]*?<\/table>/)[0];
  for (const brand of db.brands) {
    const row = index.match(new RegExp(`<th scope="row">${brand.brand_name}</th>[\\s\\S]*?</tr>`))[0];
    assert.ok(row.includes(`href="${brand.source_url}"`), `${brand.brand_name} source link`);
    assert.ok(row.includes(`datetime="${brand.captured}"`), `${brand.brand_name} capture date`);
  }
  // The result source line in the browser is checked by tests/browser-check.js.
});

test('worked example in the page copy matches the verified fixture', () => {
  const expected = {
    azazie: ['WD10', 'WD10', 'WD10', 'WD10'],
    'maggie-sottero': ['8', '12', '10', '12'],
    'allure-bridals': ['8', '10', '8', '10'],
  };
  for (const [id, cells] of Object.entries(expected)) {
    const row = markup.match(new RegExp(`<tr data-brand="${id}">([\\s\\S]*?)</tr>`))[1];
    const values = [...row.matchAll(/<td[^>]*>\s*(?:<strong>)?([^<\s]+)/g)].map((m) => m[1]);
    assert.deepEqual(values, cells, id);
  }
});

test('flagged source values are shown as published, with a note', () => {
  assert.match(markup, /size 24 hips is published as 56\.6 in/);
  assert.match(markup, /size 20 hips is published as 49\.6 in/);
  const notes = markup.match(/<ul class="wdsc-chart-notes">[\s\S]*?<\/ul>/)[0];
  assert.equal((notes.match(/may be a typo at the source/g) || []).length, 2);
});

test('excluded brands are named as not included, with no chart data', () => {
  for (const ex of db.excluded_brands) {
    const name = ex.brand_name.replace(/'/g, '&#039;');
    assert.ok(markup.includes(name) || markup.includes(ex.brand_name), ex.brand_name);
  }
  const select = markup.match(/<select id="wdsc-brand"[\s\S]*?<\/select>/)[0];
  for (const ex of db.excluded_brands) {
    assert.ok(!select.includes(ex.brand_name), `${ex.brand_name} must not be selectable`);
  }
});

test('fallback chart links match the data file', () => {
  const fallback = php.match(/function wdsc_fallback_charts\(\) \{[\s\S]*?\n\}/)[0];
  const urls = [...fallback.matchAll(/'url' => '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(urls, db.brands.map((b) => b.source_url));
});

test('JSON-LD: WebApplication, FAQPage and BreadcrumbList, FAQ matches the visible FAQ', () => {
  const blocks = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
  assert.deepEqual(blocks.map((b) => b['@type']), ['WebApplication', 'FAQPage', 'BreadcrumbList']);

  const app = blocks[0];
  assert.equal(app.applicationCategory, 'UtilitiesApplication');
  assert.equal(app.offers.price, '0');
  assert.equal(app.url, 'https://weddingguestdresses.fashion/wedding-dress-size-calculator/');

  const faqSection = markup.match(/<section id="wdsc-faq"[\s\S]*?<\/section>/)[0];
  const visible = [...faqSection.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((m) =>
    m[1].replace(/&#039;/g, "'").trim());
  const questions = blocks[1].mainEntity.map((q) => q.name);
  assert.deepEqual(questions, visible);
  assert.ok(questions.length >= 6 && questions.length <= 8);
  for (const q of blocks[1].mainEntity) {
    assert.doesNotMatch(q.acceptedAnswer.text, /<|opens in a new tab/);
  }

  const crumbs = blocks[2].itemListElement;
  assert.deepEqual(crumbs.map((c) => c.position), [1, 2]);
});

test('chart data reaches the page byte-for-byte', () => {
  const embedded = markup.match(/<script type="application\/json" id="wdsc-data">([\s\S]*?)<\/script>/)[1];
  const raw = fs.readFileSync(path.join(PLUGIN, 'data/brands.json'), 'utf8');
  assert.equal(embedded.replace(/<\\\//g, '</'), raw);
});

test('page weight stays well under 150 KB', () => {
  const bytes = Buffer.byteLength(markup) + Buffer.byteLength(js) + Buffer.byteLength(css);
  assert.ok(bytes < 150 * 1024, `${bytes} bytes`);
  test.diagnostic?.(`plugin markup + JS + CSS = ${(bytes / 1024).toFixed(1)} KB`);
  console.log(`# page weight: markup ${(Buffer.byteLength(markup) / 1024).toFixed(1)} KB, ` +
    `JS ${(Buffer.byteLength(js) / 1024).toFixed(1)} KB, CSS ${(Buffer.byteLength(css) / 1024).toFixed(1)} KB, ` +
    `total ${(bytes / 1024).toFixed(1)} KB`);
});

test('colour tokens meet 4.5:1 contrast for text', () => {
  const token = (name) => css.match(new RegExp(`--wdsc-${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const pairs = [
    ['text', '#ffffff'], ['muted', '#ffffff'], ['accent', '#ffffff'], ['error', '#ffffff'],
    ['muted', token('surface')], ['text', token('surface')], ['accent', token('surface')],
    ['accent', token('accent-tint')], ['muted', token('accent-tint')], ['text', token('accent-tint')],
    ['on-accent', token('accent')],
  ];
  for (const [fg, bg] of pairs) {
    const r = ratio(token(fg), bg);
    assert.ok(r >= 4.5, `${fg} on ${bg}: ${r.toFixed(2)}`);
  }
  // Input borders are non-text UI: 3:1.
  assert.ok(ratio(token('line'), '#ffffff') >= 3);
});

test('broken chart data renders the plain fallback, never a blank tool', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wdsc-'));
  fs.cpSync(PLUGIN, tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'data/brands.json'), '{ not json');
  const broken = pluginMarkup(render(tmp));
  fs.rmSync(tmp, { recursive: true, force: true });

  assert.match(broken, /<div class="wdsc wdsc-failed"/);
  assert.doesNotMatch(broken, /<form/);
  for (const b of db.brands) {
    assert.ok(broken.includes(`href="${b.source_url}"`), `fallback link for ${b.brand_name}`);
  }
});

test('validator still passes and still reports exactly the 2 known warnings', () => {
  const out = spawnSync('python3', ['-I', path.join(ROOT, 'tools/validate_brands.py'),
    path.join(PLUGIN, 'data/brands.json')], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /brands: 3/);
  assert.match(out.stdout, /WARNINGS \(2\)/);
  assert.match(out.stdout, /maggie-sottero: hips at size 24 is 56\.6in/);
  assert.match(out.stdout, /allure-bridals: hips at size 20 is 49\.6in/);
  assert.match(out.stdout, /structure OK/);
});
