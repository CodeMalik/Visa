// Real-browser checks with Playwright (Chromium).
// Run with: npm run test:browser
// Needs php and Playwright. The page is the real shortcode output from
// tests/render-page.php, served from a local server.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const PLUGIN = path.join(__dirname, '..', 'wedding-dress-size-calculator');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

let server;
let base;
let browser;
const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdsc-site-'));

test.before(async () => {
  const out = spawnSync('php', [path.join(__dirname, 'render-page.php'), PLUGIN], { encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  fs.writeFileSync(path.join(siteDir, 'index.html'), out.stdout);
  fs.symlinkSync(PLUGIN, path.join(siteDir, 'plugin'));

  server = http.createServer((req, res) => {
    let file = path.join(siteDir, decodeURIComponent(req.url.split('?')[0]));
    if (file.endsWith('/')) file += 'index.html';
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
  const executablePath = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  browser = await chromium.launch(executablePath ? { executablePath } : {});
});

test.after(async () => {
  await browser.close();
  server.close();
  fs.rmSync(siteDir, { recursive: true, force: true });
});

async function openPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options.context });
  if (options.init) {
    await context.addInitScript(options.init);
  }
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => requests.push(r.url()));
  if (options.route) {
    await page.route('**/*', options.route);
  }
  await page.goto(base, { waitUntil: 'load' });
  return { page, context, errors, requests };
}

async function calculate(page, brand, bust, waist, hips) {
  await page.selectOption('#wdsc-brand', brand);
  await page.fill('#wdsc-bust', String(bust));
  await page.fill('#wdsc-waist', String(waist));
  await page.fill('#wdsc-hips', String(hips));
  await page.click('.wdsc-form .wdsc-button');
  await page.waitForSelector('#wdsc-result .wdsc-result-title');
}

async function straddle(page) {
  return page.$$eval('#wdsc-result .wdsc-straddle tbody tr', (rows) => rows.map((tr) => ({
    field: tr.querySelector('th').textContent.trim(),
    matches: tr.querySelector('.wdsc-maps').firstChild.textContent.trim(),
    deciding: tr.classList.contains('wdsc-deciding'),
    mark: (tr.querySelector('.wdsc-mark') || { textContent: '' }).textContent.trim(),
  })));
}

const FIXTURE = [
  { id: 'azazie', sizes: ['WD10', 'WD10', 'WD10'], recommended: 'WD10', straddle: 1 },
  { id: 'maggie-sottero', sizes: ['8', '12', '10'], recommended: '12', straddle: 3 },
  { id: 'allure-bridals', sizes: ['8', '10', '8'], recommended: '10', straddle: 2 },
];

test('fixture 36 / 30 / 40 reproduces exactly through the real interface', async () => {
  const { page, context, errors } = await openPage();
  for (const f of FIXTURE) {
    await calculate(page, f.id, 36, 30, 40);
    const rows = await straddle(page);
    assert.deepEqual(rows.map((r) => r.matches), f.sizes.map((s) => `Size ${s}`), f.id);
    assert.equal(await page.textContent('#wdsc-result .wdsc-size'), f.recommended, f.id);
    const distinct = new Set(rows.map((r) => r.matches)).size;
    assert.equal(distinct, f.straddle, f.id);
    // Deciding rows are marked with text as well as colour.
    for (const r of rows) {
      assert.equal(r.deciding, r.matches === `Size ${f.recommended}`);
      assert.equal(r.mark.includes('sets the size'), r.deciding);
    }
    // Source and capture date sit right under the number.
    const source = await page.textContent('#wdsc-result .wdsc-source');
    assert.match(source, /Source: .+ size chart/);
    assert.match(source, /checked 13 Oct 2026/);
    // The bridal-vs-street explanation comes before the number.
    const order = await page.$eval('#wdsc-result', (el) => {
      const html = el.innerHTML;
      return html.indexOf('wdsc-context') < html.indexOf('wdsc-size');
    });
    assert.ok(order, 'context note must come before the size');
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('62 in bust on Allure gives the designed route, not the top size and not an error', async () => {
  const { page, context, errors } = await openPage();
  await calculate(page, 'allure-bridals', 62, 50, 60);
  const title = await page.textContent('#wdsc-result .wdsc-result-title');
  assert.equal(title, 'The Allure Bridals chart stops at size 30');
  assert.equal(await page.$('#wdsc-result .wdsc-size'), null, 'no size is recommended');
  const text = await page.textContent('#wdsc-result');
  assert.match(text, /a limit of the chart, and it says nothing about you/);
  assert.match(text, /Azazie: size WD30 on its chart \(source \(opens in a new tab\), checked 13 Oct 2026\)/);
  assert.ok(await page.$('#wdsc-result .wdsc-routes a[href="https://www.azazie.com/size-chart"]'));
  assert.match(text, /offers custom sizing/);
  assert.ok(await page.$('#wdsc-result a[href$="/plus-size-wedding-dresses-that-flatter/"]'));
  assert.doesNotMatch(text, /error|sorry|unfortunately|invalid/i);
  // Nothing on the result is styled as an error.
  const errorColoured = await page.$$eval('#wdsc-result *', (els) =>
    els.filter((e) => getComputedStyle(e).color === 'rgb(143, 29, 29)').length);
  assert.equal(errorColoured, 0);

  // The route works: one click to the Azazie result.
  await page.click('[data-wdsc-brand="azazie"]');
  await page.waitForFunction(() => document.querySelector('#wdsc-result .wdsc-size'));
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), 'WD30');
  assert.equal(await page.inputValue('#wdsc-brand'), 'azazie');
  assert.deepEqual(errors, []);
  await context.close();
});

test('no network request after the page loads, and none carries a measurement', async () => {
  const { page, context, requests } = await openPage();
  const atLoad = requests.length;
  await calculate(page, 'maggie-sottero', 36.5, 30.5, 40.5);
  await page.check('#wdsc-unit-cm');
  await calculate(page, 'allure-bridals', 150, 120, 160);
  await page.click('[data-wdsc-copy]').catch(() => {});
  await page.waitForTimeout(500);
  assert.equal(requests.length, atLoad, `unexpected requests: ${requests.slice(atLoad).join(', ')}`);
  // The page load itself: the HTML, our CSS and our JS, same origin only.
  const paths = requests.map((u) => new URL(u).pathname).sort();
  assert.deepEqual(paths, ['/', '/plugin/assets/calculator.css', '/plugin/assets/calculator.js']);
  for (const u of requests) {
    assert.doesNotMatch(u, /36\.5|30\.5|40\.5|150|120|160/);
  }
  await context.close();
});

test('storage holds only unit and brand, never a measurement', async () => {
  const { page, context } = await openPage();
  await calculate(page, 'maggie-sottero', 36, 30, 40);
  await page.check('#wdsc-unit-cm');
  await calculate(page, 'azazie', 95.5, 77.5, 103.5);
  const stored = await page.evaluate(async () => ({
    local: Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])),
    session: sessionStorage.length,
    cookie: document.cookie,
    idb: indexedDB.databases ? (await indexedDB.databases()).length : 0,
  }));
  assert.deepEqual(stored.local, { 'wdsc-unit': 'cm', 'wdsc-brand': 'azazie' });
  assert.equal(stored.session, 0);
  assert.equal(stored.cookie, '');
  assert.equal(stored.idb, 0);

  // On a return visit the unit and brand come back; the measurements do not.
  await page.reload();
  assert.equal(await page.isChecked('#wdsc-unit-cm'), true);
  assert.equal(await page.inputValue('#wdsc-brand'), 'azazie');
  for (const f of ['bust', 'waist', 'hips']) {
    assert.equal(await page.inputValue(`#wdsc-${f}`), '');
  }
  await context.close();
});

test('works normally with storage disabled', async () => {
  const { page, context, errors } = await openPage({
    init: () => {
      const blocked = () => { throw new DOMException('Storage disabled', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: blocked, configurable: true });
    },
  });
  await calculate(page, 'maggie-sottero', 36, 30, 40);
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '12');
  await page.check('#wdsc-unit-cm');
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '12');
  assert.deepEqual(errors, []);
  await context.close();
});

test('switching units converts the entered values and keeps the same answer', async () => {
  const { page, context } = await openPage();
  // 38.5 in is exactly Maggie Sottero size 8 hips. A rounding slip would push it to 10.
  await calculate(page, 'maggie-sottero', 36, 28, 38.5);
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '8');
  await page.check('#wdsc-unit-cm');
  assert.equal(await page.inputValue('#wdsc-hips'), '97.8');
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '8');
  await page.check('#wdsc-unit-in');
  assert.equal(await page.inputValue('#wdsc-hips'), '38.5');
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '8');
  await context.close();
});

test('missing brand and empty fields are explained beside the field, focus moves there', async () => {
  const { page, context } = await openPage();
  await page.fill('#wdsc-bust', '36');
  await page.click('.wdsc-form .wdsc-button');
  assert.equal(await page.getAttribute('#wdsc-waist', 'aria-invalid'), 'true');
  assert.match(await page.textContent('#wdsc-waist-msg'), /Enter your waist measurement/);
  assert.match(await page.textContent('#wdsc-brand-msg'), /Bridal sizing is not standardised/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wdsc-waist');
  assert.equal(await page.textContent('#wdsc-result'), '');
  // Gentle check: a likely-cm value in inch mode is flagged but not blocked.
  await calculate(page, 'allure-bridals', 92, 76, 102);
  assert.match(await page.textContent('#wdsc-bust-msg'), /might be in centimetres/);
  assert.ok(await page.$('#wdsc-result .wdsc-result-title'));
  await context.close();
});

test('keyboard only: every control reachable, Enter calculates, focus is visible', async () => {
  const { page, context } = await openPage();
  const order = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => {
      const el = document.activeElement;
      return el.id || el.tagName.toLowerCase();
    });
    order.push(id);
    if (id === 'wdsc-brand') await page.keyboard.press('ArrowDown');
    if (id === 'wdsc-bust') await page.keyboard.type('36');
    if (id === 'wdsc-waist') await page.keyboard.type('30');
    if (id === 'wdsc-hips') await page.keyboard.type('40');
    // The unit radios draw their focus ring on the visible span beside them.
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      const shown = el.type === 'radio' ? el.nextElementSibling : el;
      return getComputedStyle(shown).outlineStyle;
    });
    if (id.startsWith('wdsc-') || id === 'button') {
      assert.notEqual(outline, 'none', `visible focus on ${id}`);
    }
    if (id === 'button') break;
  }
  for (const id of ['wdsc-unit-in', 'wdsc-brand', 'wdsc-bust', 'wdsc-waist', 'wdsc-hips', 'button']) {
    assert.ok(order.includes(id), `${id} reachable by Tab (order: ${order.join(' > ')})`);
  }
  await page.keyboard.press('Enter');
  await page.waitForSelector('#wdsc-result .wdsc-result-title');
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), 'WD10');
  // Units toggle works from the keyboard too.
  await page.focus('#wdsc-unit-in');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.isChecked('#wdsc-unit-cm'), true);
  await context.close();
});

test('result region is a polite live region with the result inside it', async () => {
  const { page, context } = await openPage();
  assert.equal(await page.getAttribute('#wdsc-result', 'aria-live'), 'polite');
  await calculate(page, 'maggie-sottero', 36, 30, 40);
  const announced = await page.$eval('#wdsc-result', (el) => el.textContent);
  assert.match(announced, /On the Maggie Sottero chart, size 12 fits all three of your measurements/);
  await context.close();
});

test('no horizontal page scroll at 360 px wide, for every brand and unit', async () => {
  const { page, context } = await openPage({ context: { viewport: { width: 360, height: 740 } } });
  for (const unit of ['in', 'cm']) {
    await page.check(`#wdsc-unit-${unit}`);
    for (const f of FIXTURE) {
      const body = unit === 'in' ? [36, 30, 40] : [91.4, 76.2, 101.6];
      await calculate(page, f.id, ...body);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(overflow, 0, `${f.id} ${unit}`);
    }
  }
  await calculate(page, 'allure-bridals', 157.5, 127, 152.4);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  // Tables fit too, so source links and capture dates are never scrolled out of view.
  const clipped = await page.$$eval('.wdsc-table-wrap', (wraps) =>
    wraps.filter((w) => w.scrollWidth > w.clientWidth + 1).map((w) => w.firstElementChild.className));
  assert.deepEqual(clipped, []);
  await context.close();
});

test('copy summary produces plain text with the brand, source and size', async () => {
  const { page, context } = await openPage({ context: { permissions: ['clipboard-read', 'clipboard-write'] } });
  await calculate(page, 'maggie-sottero', 36, 30, 40);
  await page.click('[data-wdsc-copy]');
  await page.waitForFunction(() => document.querySelector('.wdsc-copy-status').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /Maggie Sottero chart \(checked 13 Oct 2026\)/);
  assert.match(text, /Size that fits all three: 12/);
  assert.match(text, /Chart: https:\/\/ms-api\.maggiesottero\.com/);
  assert.doesNotMatch(text, /<[a-z]/i);
  await context.close();
});

test('JavaScript off: plain fallback with the brands\' own charts, no form', async () => {
  const { page, context } = await openPage({ context: { javaScriptEnabled: false } });
  assert.equal(await page.isVisible('.wdsc-fallback'), true);
  assert.equal(await page.isVisible('.wdsc-form'), false);
  assert.equal(await page.locator('.wdsc-fallback a[target="_blank"]').count(), 3);
  // The article still stands on its own.
  assert.equal(await page.isVisible('#wdsc-faq'), true);
  await context.close();
});

test('chart data that will not parse shows the fallback, never a spinner or blank', async () => {
  const { page, context, errors } = await openPage({
    route: async (route) => {
      if (route.request().url() === base) {
        const res = await route.fetch();
        const html = (await res.text()).replace(/(<script type="application\/json" id="wdsc-data">)[\s\S]*?(<\/script>)/, '$1{ broken$2');
        await route.fulfill({ response: res, body: html });
      } else {
        await route.continue();
      }
    },
  });
  assert.equal(await page.isVisible('.wdsc-fallback'), true);
  assert.equal(await page.isVisible('.wdsc-form'), false);
  assert.deepEqual(errors, []);
  await context.close();
});

test('script that fails to load shows the fallback once the page has loaded', async () => {
  const { page, context } = await openPage({
    route: (route) => (route.request().url().endsWith('calculator.js') ? route.abort() : route.continue()),
  });
  assert.equal(await page.isVisible('.wdsc-fallback'), true);
  assert.equal(await page.isVisible('.wdsc-form'), false);
  await context.close();
});

test('script delayed by a performance plugin: fallback first, then the tool recovers', async () => {
  // Simulates "delay JavaScript" optimisation: the script tag is held back
  // and only added after the page has finished loading.
  const { page, context, errors } = await openPage({
    route: async (route) => {
      if (route.request().url() === base) {
        const res = await route.fetch();
        const html = (await res.text()).replace('<script src="plugin/assets/calculator.js"></script>', '');
        await route.fulfill({ response: res, body: html });
      } else {
        await route.continue();
      }
    },
  });
  assert.equal(await page.isVisible('.wdsc-fallback'), true);
  await page.addScriptTag({ url: 'plugin/assets/calculator.js' });
  assert.equal(await page.isVisible('.wdsc-form'), true);
  assert.equal(await page.isVisible('.wdsc-fallback'), false);
  await calculate(page, 'maggie-sottero', 36, 30, 40);
  assert.equal(await page.textContent('#wdsc-result .wdsc-size'), '12');
  assert.deepEqual(errors, []);
  await context.close();
});

test('reduced motion: result still appears and scrolls without animation', async () => {
  const { page, context } = await openPage({ context: { reducedMotion: 'reduce' } });
  await calculate(page, 'allure-bridals', 36, 30, 40);
  const top = await page.$eval('#wdsc-result', (el) => el.getBoundingClientRect().top);
  assert.ok(top < 100, `result scrolled into view immediately (top ${top})`);
  await context.close();
});
