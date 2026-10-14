# Build Order — Wedding Dress Size Calculator (Phase 1)

**Read this before `wedding-dress-size-calculator-spec.md`.** The spec is the design;
this file is the work order. Where they disagree, this file wins.

**Target:** weddingguestdresses.fashion (WordPress)
**Data:** `data/brands.json` — real, sourced, already verified. Use it as-is.
**Prepared:** 13 October 2026

---

## 0. Hard rules — read first

1. **Never invent a size chart value.** Every number the calculator uses must come
   from `data/brands.json`. If you think a brand is missing, it is missing on
   purpose — see `excluded_brands` in that file. Do not fill gaps from memory,
   from an aggregator site, or by interpolating.
2. **Never "fix" a chart value.** Two entries are flagged in `data_quality` as
   suspected source typos (Maggie Sottero size 24 hips `56.6`, Allure size 20
   hips `49.6`). They are stored exactly as published. Leave them. `validate_brands.py`
   will flag them on every run; that is intended behaviour, not a bug to silence.
3. **Never state a number on screen without its source.** Every chart shown to a
   user displays the brand name, source link and capture date.
4. **If a required fact is missing, stop and ask.** Do not proceed on a guess.
5. **Do not add analytics, tracking pixels, A/B tooling or external scripts.** None.
6. **Do not collect, store or transmit any measurement.** No localStorage, no
   network request, no analytics payload. Unit preference and last-used brand
   are the only things that may be stored locally.

---

## 1. Questions to ask before writing code

Ask these as one batch, then wait. Do not assume.

1. **Theme:** what theme is active, and does a child theme already exist? (The spec
   assumes a child-theme page template.)
2. **PHP version** on the host.
3. **Is Elementor managing the page templates?** If Elementor Theme Builder owns the
   single/page template, the custom template route needs a different hook.
4. **Deployment:** SFTP, cPanel file manager, Git, or a staging site first?
5. **Is there a staging environment,** or does this go straight to production?
6. **Confirm the URL slug** `/wedding-dress-size-calculator/` is free.

---

## 2. Phase 1 scope — build exactly this, nothing more

**In scope:**
- Three measurement inputs: bust, waist, hips. All required.
- Unit toggle: inches / centimetres.
- Brand selector: the three brands in `brands.json`. No default selection.
- Size recommendation using the size-to-largest rule.
- The straddle table showing which size each measurement maps to and which one
  decides the result.
- Alteration-load readout: how far each measurement sits from the recommended size.
- Out-of-range path (see §4).
- Measuring guidance per field.
- Caveats block and the "nothing is saved" statement.
- Result-summary copy button (plain text, no email capture).
- Internal links out to the posts named in spec §12.
- JSON-LD: WebApplication, FAQPage, BreadcrumbList.

**Explicitly cut from Phase 1** — do not build these, they need data we do not have:
- Regional US/UK/EU/AU conversion. No mapping table exists yet. Omit the control entirely.
- Hollow-to-hem / petite / tall. Azazie's length values had unit-labelling problems
  and were deliberately excluded; Maggie Sottero measures from the natural waist,
  not the hollow, so the two are not interchangeable. Building this now would mix
  two incompatible measurement systems.
- Secondhand mode.
- Street-size context is **optional**: if included, render it only as the labelled
  approximation in `street_size_context` with its source link visible. If that
  feels thin, leave it out.

---

## 3. Calculation — authoritative

Implement spec §6 exactly. Restated with the pieces that matter:

```
sizeFor(measurement, field, brand):
    return the FIRST row in brand.sizes where row[field] >= measurement
    if none        -> OUT_OF_RANGE

recommended = the LARGEST of sizeFor(bust), sizeFor(waist), sizeFor(hips)
straddle    = count of DISTINCT sizes among those three
```

- Compare in the brand's own units. Convert the user's input to the brand's units
  for comparison; display back in the user's chosen unit. 1 in = 2.54 cm.
- `brand.sizes` is ordered smallest to largest. Do not re-sort by size label —
  Azazie's labels are strings (`WD0`…`WD30`) and will sort wrong lexically.
- straddle 1 → clean fit message. straddle 2 → normal, name the area to be taken in.
  straddle 3 → flag that this body will need significant alteration at any size and
  surface the custom-sizing note (Azazie offers it; the other two do not —
  see `custom_sizing_available`).

### Test fixture — these are verified, assert against them

Body **36 / 30 / 40 inches**:

| Brand | bust → | waist → | hips → | Recommended | Straddle |
|---|---|---|---|---|---|
| Azazie | WD10 | WD10 | WD10 | **WD10** | 1 |
| Maggie Sottero | 8 | 12 | 10 | **12** | 3 |
| Allure Bridals | 8 | 10 | 8 | **10** | 2 |

Three brands, three different answers for one body. If your implementation does not
reproduce this table exactly, it is wrong. This is also the single best example to
use in the page copy.

---

## 4. Out-of-range — a designed path, not an error

When any measurement exceeds the brand's largest row:

- Do **not** return the top size as though it fits.
- Do **not** show an error state, a red warning, or an apology.
- Say plainly that this brand's published chart stops at size X, and that this is a
  limit of the chart, not of the person.
- Offer the routes that exist: Azazie publishes custom sizing; brands with extended
  ranges; a seamstress or made-to-measure.
- Link to the plus-size fit post.

Test it: Allure tops out at bust 59.5 in. A 62-inch bust must produce this path, not a size.

---

## 5. Editorial guardrails — enforce in code review

Spec §9 is binding. Before shipping, grep the whole page — markup, copy, alt text,
code comments, aria-labels — for these and remove every hit:

```
weight  BMI  body fat  goal size  target size  slimming  flattering
hide    hides   disguise   problem area   pear   apple   hourglass
lose    before/after   transformation
```

Phrase every output as a garment fact: "this size matches your measurements on the
[Brand] chart" — never "you are a size X".

Put the bridal-vs-street explanation **above** the result, not below it. A user
seeing an unexpectedly high number needs the explanation before the number, not after.

---

## 6. Technical

- Self-contained: one HTML template, one CSS file, one JS file, one JSON data file.
- **No framework, no build step, no runtime network requests.**
- Total page weight under 150 KB including data.
- `inputmode="decimal"` on every measurement field.
- Result region `aria-live="polite"`; real `<label>` per input; keyboard operable;
  visible focus; contrast ≥ 4.5:1; honour `prefers-reduced-motion`.
- Never signal the deciding measurement by colour alone — use the arrow and text too.
- Wrap all storage access in try/catch; the page must render correctly with
  storage unavailable.
- If `brands.json` fails to load: plain message plus links to the three brands'
  own size charts. Never a blank page or an infinite spinner.

**Design tokens:** read the live site's CSS and match its type and palette. If the
site is unreachable, use a neutral system: near-black text on white, one restrained
accent for the deciding-measurement marker, generous whitespace, and the straddle
table as the visual centrepiece. Ask before inventing a new brand colour.

**Measurement diagrams:** inline SVG, simple line art, no rendered human figures.
If you cannot draw them cleanly, ship with text-only guidance and flag it — a bad
anatomical diagram is worse than none on a bridal site.

---

## 7. Deliverables

```
wedding-dress-size-calculator/
  page-size-calculator.php      (or the shortcode/plugin equivalent, per §1 answers)
  assets/calculator.css
  assets/calculator.js
  data/brands.json              (copy as-is — do not edit)
  README.md                     (install steps, how to update a chart, review date)
```

Plus the page content from spec §12: intro, how-to-measure, between-sizes
explanation, brand chart index with capture dates, and the FAQ.

---

## 8. Done when

- [ ] The §3 fixture table reproduces exactly.
- [ ] `python3 validate_brands.py data/brands.json` passes, still reporting its 2 warnings.
- [ ] Every brand shown on the page displays its source link and capture date.
- [ ] Out-of-range produces the §4 path for Allure at 62-inch bust.
- [ ] No measurement value in localStorage, any network request, or any analytics
      payload — verified in DevTools with the network tab open.
- [ ] No term from the §5 list appears anywhere in the page source.
- [ ] Page scores green on mobile Core Web Vitals in PageSpeed Insights.
- [ ] JSON-LD validates in Google's Rich Results Test.
- [ ] Keyboard-only operation works; result is announced by a screen reader.
- [ ] Renders correctly with JavaScript storage disabled.
- [ ] At least 10 existing posts link to the tool in body copy.
- [ ] The "Guides" nav item no longer points to `#`.

---

## 9. Known gaps — do not close these by guessing

| Gap | Status |
|---|---|
| David's Bridal, BHLDN, Essense, Morilee charts | Not retrievable automatically. Capture manually from each brand's own site. |
| Regional size conversion table | No source yet. Feature cut from Phase 1. |
| Azazie hollow-to-hem values | Source had unit-labelling problems. Re-capture manually. |
| Two suspected source typos | Flagged in `data_quality`. Confirm with the brands before changing. |
| Street-size equivalence beyond "~3 sizes" | Only The Knot's general statement is sourced. Do not build a numeric mapping on it. |
