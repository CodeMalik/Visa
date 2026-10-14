// Calculation tests. Run with: npm test   (or node --test tests/*.test.js)
// The fixture below is verified (BUILD-ORDER.md §3). If the calculator
// disagrees with it, the calculator is wrong, not the fixture.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../wedding-dress-size-calculator/assets/calculator.js');
const db = require('../wedding-dress-size-calculator/data/brands.json');

const brand = (id) => db.brands.find((b) => b.brand_id === id);

const FIXTURE = [
  { id: 'azazie', bust: 'WD10', waist: 'WD10', hips: 'WD10', recommended: 'WD10', straddle: 1 },
  { id: 'maggie-sottero', bust: '8', waist: '12', hips: '10', recommended: '12', straddle: 3 },
  { id: 'allure-bridals', bust: '8', waist: '10', hips: '8', recommended: '10', straddle: 2 },
];

test('chart data has exactly the three verified brands', () => {
  assert.deepEqual(db.brands.map((b) => b.brand_id), FIXTURE.map((f) => f.id));
});

for (const f of FIXTURE) {
  test(`fixture 36 / 30 / 40 in reproduces exactly: ${f.id}`, () => {
    const r = core.calculate({ bust: 36, waist: 30, hips: 40 }, 'in', brand(f.id));
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.sizeFor, { bust: f.bust, waist: f.waist, hips: f.hips });
    assert.equal(r.recommended, f.recommended);
    assert.equal(r.straddle, f.straddle);
  });

  test(`same body entered in cm gives the same answer: ${f.id}`, () => {
    const r = core.calculate({ bust: 91.44, waist: 76.2, hips: 101.6 }, 'cm', brand(f.id));
    assert.deepEqual(r.sizeFor, { bust: f.bust, waist: f.waist, hips: f.hips });
    assert.equal(r.recommended, f.recommended);
  });
}

test('the deciding measurement is the one at the largest size', () => {
  const maggie = core.calculate({ bust: 36, waist: 30, hips: 40 }, 'in', brand('maggie-sottero'));
  assert.deepEqual(maggie.deciding, ['waist']);
  const allure = core.calculate({ bust: 36, waist: 30, hips: 40 }, 'in', brand('allure-bridals'));
  assert.deepEqual(allure.deciding, ['waist']);
  const azazie = core.calculate({ bust: 36, waist: 30, hips: 40 }, 'in', brand('azazie'));
  assert.deepEqual(azazie.deciding, ['bust', 'waist', 'hips']);
});

test('alteration load is chart value at the recommended size minus the body', () => {
  // Maggie Sottero size 12: bust 39, waist 31, hips 41.5 (data/brands.json).
  const r = core.calculate({ bust: 36, waist: 30, hips: 40 }, 'in', brand('maggie-sottero'));
  assert.equal(r.alteration.bust.ease, 3);
  assert.equal(r.alteration.waist.ease, 1);
  assert.equal(r.alteration.hips.ease, 1.5);
  assert.equal(r.alteration.bust.sizesToTakeIn, 2);
  assert.equal(r.alteration.hips.sizesToTakeIn, 1);
});

test('a measurement equal to a chart value matches that size, not the next', () => {
  const r = core.calculate({ bust: 36, waist: 28, hips: 38.5 }, 'in', brand('maggie-sottero'));
  assert.equal(r.recommended, '8');
  assert.equal(r.straddle, 1);
});

test('62 in bust on Allure takes the beyond-chart route, never the top size', () => {
  const allure = brand('allure-bridals');
  const r = core.calculate({ bust: 62, waist: 50, hips: 60 }, 'in', allure);
  assert.equal(r.status, 'beyond_chart');
  assert.deepEqual(r.beyond, ['bust']);
  assert.equal(r.recommended, undefined);
  assert.equal(r.largest.size, '30');
  assert.equal(r.largest.bust, 59.5);

  // The route to other charts is computed from the data, not written in.
  const fits = core.chartsThatFit({ bust: 62, waist: 50, hips: 60 }, 'in', db.brands, 'allure-bridals');
  assert.deepEqual(fits.map((f) => [f.brand.brand_id, f.size]), [['azazie', 'WD30']]);
});

test('below the smallest size recommends the smallest size and says so', () => {
  const r = core.calculate({ bust: 30, waist: 22, hips: 33 }, 'in', brand('allure-bridals'));
  assert.equal(r.recommended, '0');
  assert.deepEqual(r.belowChart, ['bust', 'waist', 'hips']);
});

test('more than two sizes to take in is flagged', () => {
  // Allure: bust 36 -> size 8, hips 50 -> size 22 (hips 51.5).
  const r = core.calculate({ bust: 36, waist: 30, hips: 50 }, 'in', brand('allure-bridals'));
  assert.equal(r.recommended, '22');
  assert.equal(r.alteration.bust.moreThanUsual, true);
  assert.equal(r.alteration.hips.moreThanUsual, false);
});

test('sizes are walked in published order, not sorted by label', () => {
  // WD10 would sort before WD2 lexically; the walk must still reach WD2 first.
  const r = core.calculate({ bust: 83, waist: 66, hips: 92 }, 'cm', brand('azazie'));
  assert.equal(r.recommended, 'WD2');
});

test('suspected source typos are kept exactly as published', () => {
  assert.equal(brand('maggie-sottero').sizes.find((s) => s.size === '24').hips, 56.6);
  assert.equal(brand('allure-bridals').sizes.find((s) => s.size === '20').hips, 49.6);
});

test('measurement parsing accepts comma or period decimals', () => {
  assert.equal(core.parseMeasurement('36,5'), 36.5);
  assert.equal(core.parseMeasurement(' 36.5 '), 36.5);
  assert.equal(core.parseMeasurement('.5'), 0.5);
  assert.ok(Number.isNaN(core.parseMeasurement('36in')));
  assert.ok(Number.isNaN(core.parseMeasurement('')));
  assert.ok(Number.isNaN(core.parseMeasurement('-3')));
});
