/*
 * Wedding Dress Size Calculator
 *
 * Runs entirely in the browser. It makes no network requests and never
 * stores or sends a measurement. The only things kept in localStorage are
 * the unit choice and the last brand chosen.
 *
 * Every chart value comes from data/brands.json, which the plugin prints
 * into the page as <script type="application/json" id="wdsc-data">.
 */
(function () {
  'use strict';

  var CM_PER_INCH = 2.54;
  var FIELDS = ['bust', 'waist', 'hips'];
  var LABELS = { bust: 'Bust', waist: 'Waist', hips: 'Hips' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // The Knot: a gown can typically be taken in about two sizes.
  var MAX_SIZES_TO_TAKE_IN = 2;

  /* ------------------------------------------------------------------ */
  /* Calculation. No DOM access here; the Node tests load this part.     */
  /* ------------------------------------------------------------------ */

  function convert(value, from, to) {
    if (from === to) {
      return value;
    }
    var out = from === 'in' ? value * CM_PER_INCH : value / CM_PER_INCH;
    // Round away floating-point noise so 91.44 cm compares as exactly 36 in.
    return Math.round(out * 1000) / 1000;
  }

  function parseMeasurement(text) {
    var cleaned = String(text).trim().replace(',', '.');
    if (!/^\d*\.?\d+$/.test(cleaned)) {
      return NaN;
    }
    return parseFloat(cleaned);
  }

  // Index of the first row (smallest size) whose value is >= the measurement,
  // or -1 when the measurement is larger than the chart's largest size.
  // brand.sizes is published smallest to largest; never re-sort it by label.
  function sizeIndexFor(value, field, brand) {
    for (var i = 0; i < brand.sizes.length; i++) {
      if (brand.sizes[i][field] >= value) {
        return i;
      }
    }
    return -1;
  }

  // body: { bust, waist, hips } in `unit` ('in' or 'cm').
  function calculate(body, unit, brand) {
    var chartBody = {};
    var index = {};
    var beyond = [];

    FIELDS.forEach(function (field) {
      chartBody[field] = convert(body[field], unit, brand.units);
      index[field] = sizeIndexFor(chartBody[field], field, brand);
      if (index[field] === -1) {
        beyond.push(field);
      }
    });

    var result = {
      brand: brand,
      unit: unit,
      body: body,
      chartBody: chartBody,
      index: index,
      beyond: beyond,
      largest: brand.sizes[brand.sizes.length - 1]
    };

    if (beyond.length > 0) {
      result.status = 'beyond_chart';
      return result;
    }

    var recommendedIndex = Math.max(index.bust, index.waist, index.hips);
    var distinct = [];
    FIELDS.forEach(function (field) {
      if (distinct.indexOf(index[field]) === -1) {
        distinct.push(index[field]);
      }
    });

    result.status = 'ok';
    result.recommendedIndex = recommendedIndex;
    result.recommended = brand.sizes[recommendedIndex].size;
    result.straddle = distinct.length;
    result.sizeFor = {};
    result.deciding = [];
    result.alteration = {};
    result.belowChart = [];

    FIELDS.forEach(function (field) {
      var chartValue = brand.sizes[recommendedIndex][field];
      var sizesToTakeIn = recommendedIndex - index[field];
      result.sizeFor[field] = brand.sizes[index[field]].size;
      if (index[field] === recommendedIndex) {
        result.deciding.push(field);
      }
      result.alteration[field] = {
        chartValue: chartValue,
        ease: Math.round((chartValue - chartBody[field]) * 1000) / 1000,
        sizesToTakeIn: sizesToTakeIn,
        moreThanUsual: sizesToTakeIn > MAX_SIZES_TO_TAKE_IN
      };
      if (chartBody[field] < brand.sizes[0][field]) {
        result.belowChart.push(field);
      }
    });

    return result;
  }

  // Other brands whose charts cover all three measurements.
  function chartsThatFit(body, unit, brands, excludeId) {
    var fits = [];
    brands.forEach(function (brand) {
      if (brand.brand_id === excludeId) {
        return;
      }
      var r = calculate(body, unit, brand);
      if (r.status === 'ok') {
        fits.push({ brand: brand, size: r.recommended });
      }
    });
    return fits;
  }

  var core = {
    convert: convert,
    parseMeasurement: parseMeasurement,
    sizeIndexFor: sizeIndexFor,
    calculate: calculate,
    chartsThatFit: chartsThatFit
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = core;
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Browser                                                             */
  /* ------------------------------------------------------------------ */

  var root = document.getElementById('wdsc');
  if (!root) {
    return;
  }

  var STORE_UNIT = 'wdsc-unit';
  var STORE_BRAND = 'wdsc-brand';

  var db;
  var config;
  try {
    db = JSON.parse(document.getElementById('wdsc-data').textContent);
    config = JSON.parse(document.getElementById('wdsc-config').textContent);
    if (!db || !Array.isArray(db.brands) || db.brands.length === 0) {
      throw new Error('No brands in chart data');
    }
  } catch (err) {
    // Plain message and links to the brands' own charts. Never a spinner.
    document.documentElement.classList.add('wdsc-failed');
    window.wdscReady = true;
    return;
  }

  var form = root.querySelector('.wdsc-form');
  var brandSelect = document.getElementById('wdsc-brand');
  var resultBox = document.getElementById('wdsc-result');
  var inputs = {};
  FIELDS.forEach(function (field) {
    inputs[field] = document.getElementById('wdsc-' + field);
  });
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasResult = false;
  var lastSummary = '';

  /* --- storage: unit and brand only, always wrapped ------------------ */

  function readStored(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // Storage unavailable (private mode, disabled). The tool works without it.
    }
  }

  /* --- formatting ---------------------------------------------------- */

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(value) {
    return String(Math.round(value * 10) / 10);
  }

  function formatDate(iso) {
    var parts = iso.split('-');
    return parseInt(parts[2], 10) + ' ' + MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
  }

  function unitLabel(unit) {
    return unit === 'in' ? 'in' : 'cm';
  }

  // A chart value shown in the user's unit, with the published value
  // alongside when the brand publishes in the other unit.
  function chartValueText(value, brand, unit) {
    if (brand.units === unit) {
      return num(value) + ' ' + unitLabel(unit);
    }
    return num(convert(value, brand.units, unit)) + ' ' + unitLabel(unit) +
      ' (published as ' + num(value) + ' ' + unitLabel(brand.units) + ')';
  }

  function sizeName(size) {
    return 'size ' + size;
  }

  function listText(items) {
    if (items.length <= 1) {
      return items.join('');
    }
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function link(href, text, external) {
    if (external) {
      return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(text) +
        '<span class="wdsc-sr"> (opens in a new tab)</span></a>';
    }
    return '<a href="' + esc(href) + '">' + esc(text) + '</a>';
  }

  function sourceLine(brand) {
    return '<p class="wdsc-source">Source: ' +
      link(brand.source_url, brand.brand_name + ' size chart', true) +
      ' &middot; ' + esc(brand.chart_label) + ' &middot; checked ' + esc(formatDate(brand.captured)) + '</p>';
  }

  function findBrand(id) {
    for (var i = 0; i < db.brands.length; i++) {
      if (db.brands[i].brand_id === id) {
        return db.brands[i];
      }
    }
    return null;
  }

  function currentUnit() {
    var checked = root.querySelector('input[name="wdsc-unit"]:checked');
    return checked ? checked.value : 'in';
  }

  /* --- validation ---------------------------------------------------- */

  function setMessage(field, kind, text) {
    var box = document.getElementById('wdsc-' + field + '-msg');
    var input = field === 'brand' ? brandSelect : inputs[field];
    box.textContent = text || '';
    box.className = 'wdsc-msg' + (kind ? ' wdsc-msg-' + kind : '');
    box.hidden = !text;
    if (kind === 'error') {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  function readForm() {
    var unit = currentUnit();
    var body = {};
    var firstInvalid = null;

    FIELDS.forEach(function (field) {
      var raw = inputs[field].value;
      var value = parseMeasurement(raw);
      // After a unit switch the box shows a rounded value; use the exact
      // conversion so a measurement on a chart line stays on that line.
      if (inputs[field].getAttribute('data-shown') === raw.trim()) {
        value = parseFloat(inputs[field].getAttribute('data-exact'));
      }
      if (raw.trim() === '') {
        setMessage(field, 'error', 'Enter your ' + field + ' measurement.');
        firstInvalid = firstInvalid || inputs[field];
      } else if (!(value > 0)) {
        setMessage(field, 'error', 'Enter a number, for example 36 or 36.5.');
        firstInvalid = firstInvalid || inputs[field];
      } else {
        setMessage(field, '', '');
        body[field] = value;
      }
    });

    // Gentle checks. They never block the result.
    FIELDS.forEach(function (field) {
      var value = body[field];
      if (value === undefined) {
        return;
      }
      if (unit === 'in' && value > 90) {
        setMessage(field, 'check', 'Double-check this one: it looks like it might be in centimetres. Switch the units above if so.');
      } else if (unit === 'cm' && value < 40) {
        setMessage(field, 'check', 'Double-check this one: it looks like it might be in inches. Switch the units above if so.');
      }
    });
    if (body.waist !== undefined && body.bust !== undefined &&
        convert(body.waist, unit, 'in') > convert(body.bust, unit, 'in') + 20) {
      setMessage('waist', 'check', 'Double-check this one: it is much larger than the bust measurement. Measure at the narrowest point of the torso.');
    }

    var brand = findBrand(brandSelect.value);
    if (!brand) {
      setMessage('brand', 'error', 'Choose a brand. Bridal sizing is not standardised, so the same measurements match different sizes on different designers’ charts.');
      firstInvalid = firstInvalid || brandSelect;
    } else {
      setMessage('brand', '', '');
    }

    return { unit: unit, body: body, brand: brand, firstInvalid: firstInvalid };
  }

  /* --- result rendering ---------------------------------------------- */

  function contextNote() {
    var street = db.street_size_context;
    var source = street ? ' (' + link(street.url, street.source, true) + ')' : '';
    return '<div class="wdsc-context"><p><strong>Before the number:</strong> bridal sizes run roughly three sizes larger than everyday clothing sizes' +
      source + '. A higher number than usual is a quirk of an old sizing system. It describes the dress, not you.</p></div>';
  }

  function straddleTable(r) {
    var rows = FIELDS.map(function (field) {
      var deciding = r.status === 'ok' && r.deciding.indexOf(field) !== -1;
      var beyond = r.beyond.indexOf(field) !== -1;
      var maps;
      var chart;
      if (beyond) {
        maps = 'Beyond this chart';
        chart = 'Largest size ' + esc(r.largest.size) + ': ' + chartCell(r.largest[field], r.brand, r.unit);
      } else {
        var row = r.brand.sizes[r.index[field]];
        maps = 'Size ' + esc(row.size);
        chart = chartCell(row[field], r.brand, r.unit);
      }
      if (deciding) {
        maps += '<span class="wdsc-mark"><span class="wdsc-arrow" aria-hidden="true">&rarr;</span> sets the size</span>';
      }
      return '<tr' + (deciding ? ' class="wdsc-deciding"' : '') + '>' +
        '<th scope="row">' + LABELS[field] + '</th>' +
        '<td>' + esc(num(r.body[field]) + ' ' + unitLabel(r.unit)) + '</td>' +
        '<td class="wdsc-maps">' + maps + '</td>' +
        '<td>' + chart + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="wdsc-table-wrap"><table class="wdsc-straddle">' +
      '<caption>Where each measurement lands on the ' + esc(r.brand.brand_name) + ' chart</caption>' +
      '<thead><tr><th scope="col"><span class="wdsc-sr">Measurement</span></th><th scope="col">Yours</th>' +
      '<th scope="col">Matches</th><th scope="col">Chart at that size</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  // Chart value for a table cell: user's unit, plus the published value
  // underneath when the brand publishes in the other unit.
  function chartCell(value, brand, unit) {
    if (brand.units === unit) {
      return esc(num(value) + ' ' + unitLabel(unit));
    }
    return esc(num(convert(value, brand.units, unit)) + ' ' + unitLabel(unit)) +
      '<span class="wdsc-published">published as ' + esc(num(value) + ' ' + unitLabel(brand.units)) + '</span>';
  }

  function straddleMessage(r) {
    var brand = r.brand;
    if (r.straddle === 1) {
      return '<p>All three measurements match the same size on this chart, so expect only the normal fitting adjustments.</p>';
    }
    var takeIn = FIELDS.filter(function (f) { return r.deciding.indexOf(f) === -1; });
    if (r.straddle === 2) {
      return '<p>Your measurements match two sizes on this chart. ' + esc(sizeName(r.recommended)) +
        ' fits your ' + esc(listText(r.deciding)) + '; the ' + esc(listText(takeIn)) +
        ' would be taken in at fitting.</p>';
    }
    var custom = brand.custom_sizing_available ?
      esc(brand.brand_name) + ' also offers custom sizing, which may be worth pricing against alterations.' :
      esc(brand.brand_name) + ' does not list custom sizing. Made-to-measure from another designer, or a skilled seamstress, may be worth pricing.';
    return '<div class="wdsc-note"><p>Your three measurements each match a different size on this chart. Whichever size you order, ' +
      'the dress will need altering in more than one place. ' + custom + '</p></div>';
  }

  function alterationList(r) {
    var u = unitLabel(r.unit);
    var items = FIELDS.map(function (field) {
      var a = r.alteration[field];
      var chartText = chartValueText(a.chartValue, r.brand, r.unit);
      var ease = convert(a.ease, r.brand.units, r.unit);
      var text;
      if (Math.abs(ease) < 0.05) {
        text = 'matches the ' + sizeName(r.recommended) + ' chart measurement (' + chartText + ') exactly.';
      } else {
        text = 'the ' + sizeName(r.recommended) + ' chart measures ' + chartText + ', about ' + num(ease) + ' ' + u + ' more than yours.';
      }
      if (r.deciding.indexOf(field) !== -1) {
        text += ' This is the measurement that sets the size.';
      } else if (a.sizesToTakeIn > 0) {
        text += ' About ' + a.sizesToTakeIn + (a.sizesToTakeIn === 1 ? ' size' : ' sizes') + ' to take in.';
      }
      if (a.moreThanUsual) {
        text += ' That is more than the roughly two sizes a gown can usually be taken in, so ask a seamstress before ordering, or price custom sizing.';
      }
      return '<li><strong>' + LABELS[field] + ':</strong> ' + esc(text) + '</li>';
    }).join('');

    var below = '';
    if (r.belowChart.length) {
      below = '<p>Your ' + esc(listText(r.belowChart)) + (r.belowChart.length === 1 ? ' is' : ' are') +
        ' smaller than the smallest size on this chart. Taking in is a routine alteration.</p>';
    }
    return '<h4>What this means for alterations</h4><ul class="wdsc-alter">' + items + '</ul>' + below +
      '<p>' + link(config.links.alterations, 'What wedding dress alterations usually cost') + '</p>';
  }

  function brandAdvice(r) {
    if (r.straddle < 2 || !db.sizing_rule || !db.sizing_rule.support) {
      return '';
    }
    return db.sizing_rule.support.filter(function (s) {
      return s.url === r.brand.source_url;
    }).map(function (s) {
      return '<blockquote class="wdsc-quote"><p>“' + esc(s.says) + '”</p><footer>' +
        link(s.url, s.source, true) + '</footer></blockquote>';
    }).join('');
  }

  function ruleSentence() {
    var knot = null;
    (db.sizing_rule && db.sizing_rule.support || []).forEach(function (s) {
      if (s.url.indexOf('theknot.com') !== -1) {
        knot = s;
      }
    });
    var cite = knot ? ' (' + link(knot.url, knot.source, true) + ')' : '';
    return '<p class="wdsc-rule">Why the largest size: a gown can typically be taken in about two sizes but let out by only one' +
      cite + ', so the size that fits your largest measurement keeps every alteration possible.</p>';
  }

  function caveats(brand) {
    return '<h4>Before you order</h4><ul class="wdsc-caveats">' +
      '<li>This is a starting point, not a guarantee of fit.</li>' +
      '<li>It applies to the ' + esc(brand.brand_name) + ' chart only. Other designers size differently.</li>' +
      '<li>Confirm against the current ' + esc(brand.brand_name) + ' chart before ordering. Charts change.</li>' +
      '<li>Nothing you entered was saved or sent anywhere.</li></ul>';
  }

  function nextSteps(r) {
    var links = [
      link('#wdsc-how-to-measure', 'How to measure for a wedding dress'),
      link(config.links.alterations, 'Wedding dress alterations cost guide')
    ];
    if (r.status === 'beyond_chart') {
      links.push(link(config.links.plusSize, 'Plus-size wedding dress guide'));
    }
    links.push(link(config.links.secondhand, 'Buying a wedding dress secondhand or online'));
    return '<h4>Next steps</h4><ul class="wdsc-next"><li>' + links.join('</li><li>') + '</li></ul>';
  }

  function copyBlock() {
    return '<div class="wdsc-copy"><button type="button" class="wdsc-button wdsc-button-secondary" data-wdsc-copy>Copy a summary</button>' +
      '<span class="wdsc-copy-status" role="status"></span>' +
      '<p class="wdsc-small">Plain text to paste into a message to your seamstress, a friend or a seller.</p></div>';
  }

  function renderOk(r) {
    var brand = r.brand;
    var html = contextNote() +
      '<h3 class="wdsc-result-title" tabindex="-1">On the ' + esc(brand.brand_name) + ' chart, ' + esc(sizeName(r.recommended)) +
      ' fits all three of your measurements</h3>' +
      '<p class="wdsc-headline">Size <strong class="wdsc-size">' + esc(r.recommended) + '</strong></p>' +
      sourceLine(brand) +
      straddleTable(r) +
      straddleMessage(r) +
      ruleSentence() +
      brandAdvice(r) +
      alterationList(r) +
      caveats(brand) +
      nextSteps(r) +
      copyBlock();
    resultBox.innerHTML = html;
    lastSummary = summaryOk(r);
  }

  function renderBeyond(r) {
    var brand = r.brand;
    var lines = r.beyond.map(function (field) {
      return '<li>Your ' + field + ' measurement (' + esc(num(r.body[field]) + ' ' + unitLabel(r.unit)) + ') is larger than the ' +
        esc(LABELS[field].toLowerCase()) + ' measurement of the largest size on this chart (size ' + esc(r.largest.size) +
        ': ' + esc(chartValueText(r.largest[field], brand, r.unit)) + ').</li>';
    }).join('');

    var fits = chartsThatFit(r.body, r.unit, db.brands, brand.brand_id);
    var fitHtml;
    if (fits.length) {
      fitHtml = '<p>These charts in this calculator do extend to your measurements:</p><ul class="wdsc-routes">' +
        fits.map(function (f) {
          return '<li><strong>' + esc(f.brand.brand_name) + ':</strong> ' + esc(sizeName(f.size)) + ' on its chart. ' +
            '<button type="button" class="wdsc-linkbutton" data-wdsc-brand="' + esc(f.brand.brand_id) + '">See the ' +
            esc(f.brand.brand_name) + ' result</button></li>';
        }).join('') + '</ul>';
    } else {
      fitHtml = '<p>None of the charts currently in this calculator extends to these measurements. We are adding more designers.</p>';
    }

    var customBrands = db.brands.filter(function (b) { return b.custom_sizing_available; });
    var custom = customBrands.length ?
      '<li><strong>Custom sizing.</strong> ' + customBrands.map(function (b) {
        return link(b.source_url, b.brand_name, true);
      }).join(', ') + (customBrands.length === 1 ? ' offers' : ' offer') + ' custom sizing.</li>' : '';

    var html = contextNote() +
      '<h3 class="wdsc-result-title" tabindex="-1">The ' + esc(brand.brand_name) + ' chart stops at size ' + esc(r.largest.size) + '</h3>' +
      '<p>The published ' + esc(brand.brand_name) + ' chart does not go far enough for these measurements, so it has no size to suggest. ' +
      'That is where this designer’s chart ends. It is a limit of the chart, and it says nothing about you.</p>' +
      '<ul class="wdsc-beyond">' + lines + '</ul>' +
      sourceLine(brand) +
      straddleTable(r) +
      '<h4>Routes that work</h4>' + fitHtml +
      '<ul class="wdsc-routes">' + custom +
      '<li><strong>Made-to-measure or a seamstress.</strong> A dressmaker can make a gown to your measurements, or adapt one from another designer.</li>' +
      '<li>' + link(config.links.plusSize, 'Our plus-size wedding dress guide') + ' covers designers and fit in more depth.</li></ul>' +
      caveats(brand) +
      nextSteps(r) +
      copyBlock();
    resultBox.innerHTML = html;
    lastSummary = summaryBeyond(r, fits);
  }

  /* --- copy summary -------------------------------------------------- */

  function measurementsLine(r) {
    var u = unitLabel(r.unit);
    return 'Measurements: bust ' + num(r.body.bust) + ' ' + u + ', waist ' + num(r.body.waist) + ' ' + u +
      ', hips ' + num(r.body.hips) + ' ' + u;
  }

  function summaryHeader(r) {
    return [
      'Wedding dress size, ' + r.brand.brand_name + ' chart (checked ' + formatDate(r.brand.captured) + ')',
      'Chart: ' + r.brand.source_url,
      measurementsLine(r)
    ];
  }

  function summaryOk(r) {
    var u = unitLabel(r.unit);
    var lines = summaryHeader(r);
    lines.push(FIELDS.map(function (f) {
      return LABELS[f] + ' matches size ' + r.sizeFor[f] + (r.deciding.indexOf(f) !== -1 ? ' (sets the size)' : '');
    }).join('; '));
    lines.push('Size that fits all three: ' + r.recommended);
    lines.push('At size ' + r.recommended + ' the chart measures more than mine by: ' + FIELDS.map(function (f) {
      return f + ' ' + num(convert(r.alteration[f].ease, r.brand.units, r.unit)) + ' ' + u;
    }).join(', '));
    lines.push('A starting point only. Confirm against the brand’s current chart before ordering.');
    lines.push(config.pageUrl);
    return lines.join('\n');
  }

  function summaryBeyond(r, fits) {
    var lines = summaryHeader(r);
    lines.push('The ' + r.brand.brand_name + ' chart stops at size ' + r.largest.size + ', which is smaller than my ' +
      listText(r.beyond) + (r.beyond.length === 1 ? ' measurement.' : ' measurements.'));
    fits.forEach(function (f) {
      lines.push(f.brand.brand_name + ' chart: size ' + f.size + ' fits all three.');
    });
    lines.push(config.pageUrl);
    return lines.join('\n');
  }

  function copySummary(button) {
    var status = button.parentNode.querySelector('.wdsc-copy-status');
    function done(ok) {
      status.textContent = ok ? 'Copied.' : 'Copy did not work in this browser. Select the result text instead.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastSummary).then(function () { done(true); }, function () { done(fallbackCopy()); });
    } else {
      done(fallbackCopy());
    }
  }

  function fallbackCopy() {
    var area = document.createElement('textarea');
    area.value = lastSummary;
    area.setAttribute('readonly', '');
    area.className = 'wdsc-offscreen';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  /* --- wiring -------------------------------------------------------- */

  function run(scroll) {
    var input = readForm();
    if (input.firstInvalid) {
      // Never leave an old result on screen next to changed inputs.
      resultBox.innerHTML = '';
      hasResult = false;
      input.firstInvalid.focus();
      return;
    }
    var r = calculate(input.body, input.unit, input.brand);
    if (r.status === 'ok') {
      renderOk(r);
    } else {
      renderBeyond(r);
    }
    hasResult = true;
    if (scroll) {
      resultBox.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function setUnit(unit, convertValues) {
    var previous = root.getAttribute('data-unit') || 'in';
    root.setAttribute('data-unit', unit);
    root.querySelectorAll('.wdsc-unit-label').forEach(function (el) {
      el.textContent = '(' + unitLabel(unit) + ')';
    });
    if (convertValues && previous !== unit) {
      FIELDS.forEach(function (field) {
        var input = inputs[field];
        var value = parseMeasurement(input.value);
        if (input.getAttribute('data-shown') === input.value.trim()) {
          value = parseFloat(input.getAttribute('data-exact'));
        }
        if (value > 0) {
          var exact = convert(value, previous, unit);
          input.value = num(exact);
          input.setAttribute('data-exact', String(exact));
          input.setAttribute('data-shown', input.value);
        }
      });
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    run(true);
  });

  root.querySelectorAll('input[name="wdsc-unit"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      setUnit(radio.value, true);
      writeStored(STORE_UNIT, radio.value);
      if (hasResult) {
        run(false);
      }
    });
  });

  brandSelect.addEventListener('change', function () {
    if (findBrand(brandSelect.value)) {
      writeStored(STORE_BRAND, brandSelect.value);
    }
    if (hasResult) {
      run(false);
    }
  });

  resultBox.addEventListener('click', function (event) {
    var copyButton = event.target.closest('[data-wdsc-copy]');
    if (copyButton) {
      copySummary(copyButton);
      return;
    }
    var brandButton = event.target.closest('[data-wdsc-brand]');
    if (brandButton) {
      brandSelect.value = brandButton.getAttribute('data-wdsc-brand');
      writeStored(STORE_BRAND, brandSelect.value);
      run(true);
      var title = resultBox.querySelector('.wdsc-result-title');
      if (title) {
        title.focus();
      }
    }
  });

  // Restore the two remembered preferences. Measurements are never remembered.
  var storedUnit = readStored(STORE_UNIT);
  if (storedUnit === 'in' || storedUnit === 'cm') {
    var radio = root.querySelector('input[name="wdsc-unit"][value="' + storedUnit + '"]');
    if (radio) {
      radio.checked = true;
    }
  }
  setUnit(currentUnit(), false);
  var storedBrand = readStored(STORE_BRAND);
  if (storedBrand && findBrand(storedBrand)) {
    brandSelect.value = storedBrand;
  }

  window.wdscReady = true;
}());
