# Wedding Dress Size Calculator — Complete Specification

**For:** weddingguestdresses.fashion
**Prepared:** 8 October 2026
**Status:** Build spec. Supersedes the standalone Bridal Size Converter prototype.
**Owner:** Anayatullah Arif

---

## 1. Why this tool, and why this niche

### The problem, stated properly

A bride measures herself at home, looks at a dress she wants online, and cannot work out what to order. This is harder than it sounds, for four reasons that compound:

1. **Bridal sizing is not street sizing.** Bridal runs on a numbering system derived from 1940s European sizing, so the number on a bridal tag is much higher than the number on a high-street tag for the same body. The Knot puts the gap at roughly three sizes — a street 12 lands near a bridal 18. ([The Knot](https://www.theknot.com/content/wedding-dress-sizes))
2. **Every designer publishes a different chart.** The same body is a 12 at one house and a 14 at another. There is no industry-standard bridal size. ([The Knot](https://www.theknot.com/content/wedding-dress-sizes))
3. **Bodies do not fit one size.** A woman is routinely a 10 in the bust, a 14 in the waist and a 12 in the hips. The chart gives her three answers and no rule for choosing.
4. **Getting it wrong is expensive and asymmetric.** A gown can usually be taken in about two sizes but let out by only one. ([The Knot](https://www.theknot.com/content/wedding-dress-sizes)) Ordering too small is often unrecoverable; ordering too large is a bill.

That fourth point is the whole reason the tool has value. The correct answer is not "your size" — it is **size to your largest measurement and alter down**, and almost nobody searching knows that rule before they order.

### Why it fits this site specifically

- Your existing content already covers cost, alterations, bustles, fit, plus-size and body type. A sizing tool sits at the exact centre of that cluster and gives all of it somewhere to link.
- It converts informational traffic into a reason to return — a reader measures once, comes back when she finds a different dress.
- It is the strongest link-earning asset available to a site in this niche. Nobody links to another "wedding dress cost" article. People do link to a working calculator, and bridal forums, Reddit threads and Facebook planning groups share them organically.
- Your audit flagged that the site has no differentiator against content-farm competitors. This is the differentiator.
- The page sitemap currently lists 6 pages, all boilerplate (Home, About, Contact, Terms, Privacy, Disclaimer). There is no utility page at all.

### Business case in one line

One page that earns links, earns return visits, and gives 15+ existing posts a natural internal link target — at zero recurring cost, since it runs entirely client-side.

---

## 2. Who uses it, and in what state of mind

| Segment | Situation | What they need from the tool |
|---|---|---|
| **Online buyer** (primary) | Buying from Azazie, Lulus, an overseas site, or a secondhand listing. No stylist. Fully self-serve. | A size to actually order, and the confidence that it is the defensible choice. |
| **Pre-appointment bride** | Has a boutique appointment booked. Nervous about the number she will hear. | Context so the bridal number does not blindside her. |
| **Secondhand / resale buyer** | Looking at a listed size on Stillwhite, Poshmark, eBay. Cannot try it. | "Will a listed size 14 fit me, and can it be altered?" |
| **Plus-size bride** | Routinely dead-ended by charts that stop at 20 and by tools that treat her as an edge case. | A chart that actually covers her range and does not make her feel like an exception. |
| **Mother / bridesmaid / friend** | Measuring on someone's behalf. | Clear measuring instructions she can follow on another person. |
| **Destination / international buyer** | US vs UK vs EU vs AU numbering confusion on top of everything else. | Unit switching and regional size equivalents. |

The emotional state matters for the copy. This user is anxious, often shopping late at night, and about to spend a lot of money on something she cannot return. The tone target is **calm, specific, and never cute**.

---

## 3. Scope

### The tool does

- Convert body measurements (bust, waist, hips, plus hollow-to-hem for length) into a recommended size **on a specific named brand's published chart**.
- Show the size each individual measurement maps to, so the user sees the straddle rather than a single opaque number.
- Apply and explain the size-to-your-largest-measurement rule.
- State the alteration consequence of the recommendation — what has to be taken in, and roughly where that sits against the take-in-two/let-out-one constraint.
- Convert between US, UK, EU and AU bridal numbering.
- Show street-size context so the bridal number is not a shock.
- Switch inches and centimetres.
- Link out to the relevant guide on your site for whatever the result implies (alterations cost, how to measure, plus-size fit, what to wear underneath).

### The tool explicitly does NOT

- **Claim to be definitive.** Output is a starting point for ordering or for a fitting, never a guarantee.
- **Give one universal "bridal size"** across brands. That number does not exist, and inventing it would be exactly the unsourced-claim problem flagged in your site audit.
- **Store, transmit or log any measurement.** Everything stays in the browser. This is both a privacy position and a trust position, and it should be stated on the page.
- **Mention weight, BMI, goal sizes, "slimming", "flattering for your shape", or anything a user could read as a comment on her body.** See §9.
- **Predict alteration pricing.** Link to the alterations cost guide instead; pricing is local and volatile.
- Require an account, email, or any gate.

---

## 4. Data model — the part that determines whether this is credible

This is the highest-risk component. Your audit's core finding was unsourced and contradictory numbers. A calculator built on invented charts would be the same failure, automated and at scale.

### Rules for size chart data

1. **Every chart is transcribed from the brand's own published size chart.** No derivation, no averaging, no "approximately".
2. **Every chart record carries provenance:** brand name, chart URL, date captured, units as published.
3. **Charts are versioned.** When a brand updates, the old version is retained with its date; the tool shows the capture date on screen.
4. **No brand is included without a retrievable public chart.** If you cannot link it, it does not ship.
5. **A chart is only included across the full range the brand publishes** — do not truncate the plus range.

### Data structure

```json
{
  "brand_id": "azazie",
  "brand_name": "Azazie",
  "chart_type": "bridal",
  "source_url": "https://www.azazie.com/...",
  "captured": "2026-10-08",
  "units": "in",
  "regional_system": "US",
  "notes": "Standard bridal chart; brand also publishes separate bridesmaid chart.",
  "sizes": [
    { "size": "0",  "bust": 32.5, "waist": 25.5, "hips": 35.5 },
    { "size": "2",  "bust": 33.5, "waist": 26.5, "hips": 36.5 }
  ],
  "length_options": [
    { "label": "Standard", "hollow_to_hem": 59 },
    { "label": "Petite",   "hollow_to_hem": 55 },
    { "label": "Tall",     "hollow_to_hem": 63 }
  ]
}
```

### Launch brand set

Start with brands you already name in existing posts, so the tool and the content reinforce each other. From your modest-sleeves roundup and comparison post, that means at minimum: **Azazie, David's Bridal, BHLDN, Lulus, Allure Bridals, Maggie Sottero, Morilee, Essense of Australia.**

Ship with whichever of those publish a retrievable chart. Six real brands beats fifteen half-sourced ones. Add a generic "Standard US bridal sizing" chart only if you can cite a published source for it — otherwise omit it entirely and say so.

### Maintenance

Charts go stale. Build a review cadence: check every source URL twice a year, update the capture date, and note changes. Put the next review date in your own records, not on the page.

---

## 5. Inputs

| Field | Type | Required | Notes |
|---|---|---|---|
| Units | Toggle: in / cm | Yes | Default inches for US traffic; remember choice in localStorage. |
| Bust | Number | Yes | Fullest part of the bust, over the bra she will actually wear. |
| Waist | Number | Yes | Natural waist — narrowest point, not where trousers sit. This is the single most commonly mismeasured field. |
| Hips | Number | Yes | Fullest part, usually 7–9 in below the natural waist. |
| Hollow to hem | Number | No | Hollow of the throat to the floor, in the shoes she will wear. Drives length/petite/tall. |
| Height | Number | No | Only used to flag petite/tall as worth considering. Never shown next to any weight or shape language. |
| Brand | Select | Yes | Drives everything. Default to "Choose a brand" — do not pre-select. |
| Regional system | Select: US / UK / EU / AU | No | Output conversion only. |

### Measurement guidance

Each field gets an inline expandable "how to measure this" with a one-line instruction and a simple diagram. Do not hide this behind a separate page — the mismeasured-waist problem is the biggest single source of wrong answers, and guidance has to sit where the error happens.

Add a visible note: **measure over the undergarments you plan to wear, and have someone else measure if possible.** Link to your "what to wear under a wedding dress" post here — that is a natural, earned internal link.

### Validation

- Accept decimals; accept comma or period.
- Range-check gently: flag implausible entries (e.g. waist > bust + 20in) with "double-check this one" rather than a hard error. Never block submission.
- If a measurement falls above the brand's largest published size, say so plainly and route to the next step (custom sizing / brands with extended ranges), rather than failing silently or showing the top size as if it fits. **This path must be designed deliberately, not treated as an error state.**

---

## 6. Calculation logic

```
INPUT: bust, waist, hips, units, brand, (hollow_to_hem)

1. Normalise all measurements to the chart's units.

2. For each of bust, waist, hips:
     Find the smallest size in the brand chart whose measurement
     is >= the user's measurement.
     If user's measurement exceeds the chart's maximum → flag OUT_OF_RANGE.
     Record size_bust, size_waist, size_hips.

3. recommended_size = MAX(size_bust, size_waist, size_hips)
     Rationale shown to user: a gown can generally be taken in about
     two sizes but let out by only one, so sizing to the largest
     measurement keeps alteration possible.

4. straddle = set of distinct sizes among the three
     If |straddle| == 1 → "clean fit" message.
     If |straddle| == 2 → normal; explain which area will need taking in.
     If |straddle| >= 3 → flag strongly: this body shape will need
       significant alteration regardless of size chosen, and a
       made-to-measure or custom option may be worth pricing.

5. alteration_load:
     For each measurement, delta = chart[recommended_size][m] - user[m]
     Report deltas in inches/cm per area.
     If any delta > the span of two chart sizes → warn that the
       recommended size may be more alteration than is practical,
       and suggest discussing custom sizing.

6. length:
     If hollow_to_hem supplied, map to Standard / Petite / Tall
     for brands that publish those options. Otherwise omit the
     section entirely — do not guess.

7. street_size_context:
     Show the approximate street-size equivalent ONLY as a labelled
     approximation with its source, never as a second hard number.
```

### Edge cases that must be handled explicitly

| Case | Behaviour |
|---|---|
| Measurement above chart maximum | Named, non-apologetic message + route to extended-range brands or custom. Never "no result". |
| Measurement below chart minimum | Recommend smallest size, note that taking in is straightforward. |
| Only bust/waist/hips given, no length | Full size result, length section hidden. |
| Brand not selected | Disable result, show "pick a brand — sizing is not standardised across designers" as the explanation, which is itself a teaching moment. |
| Two measurements tie at the top | No ambiguity — MAX handles it. |
| Chart published in cm, user in inches | Convert for comparison, display in user's chosen unit. |

---

## 7. Output design

The result is not a number. It is a short brief. Structure:

**1. The recommendation**
> Based on the [Brand] chart (captured [date]): **size [X]**

**2. Why that size — the straddle table**

| Measurement | Yours | Maps to | |
|---|---|---|---|
| Bust | 36 in | Size 10 | |
| Waist | 30 in | Size 14 | ← this one sets your size |
| Hips | 40 in | Size 12 | |

**3. The rule, stated once**
One sentence explaining size-to-largest and the take-in-two/let-out-one asymmetry, with the source linked.

**4. What this means for alterations**
> Your bust is about 2 in smaller than this size, and your hips about 1 in — both would be taken in at fitting.

Then link to the alterations cost guide.

**5. Regional equivalents** (if selected)
US 14 ≈ UK __ ≈ EU __ ≈ AU __

**6. Caveats, visible and not buried**
- This is a starting point, not a guarantee of fit.
- Sizing differs between designers — this result applies to [Brand] only.
- Confirm against the brand's current chart before ordering; charts change.
- Nothing you entered was saved or sent anywhere.

**7. Next steps** — three internal links chosen by result:
- always: how to measure / alterations cost
- if straddle ≥ 3: custom and made-to-measure options
- if out of range: plus-size fit guide and extended-range brands
- if ordering online: secondhand/online buying guide

**8. Copy / share result** — a "copy summary" button producing plain text she can paste into a message to her seamstress, her mum, or a seller. No email capture.

---

## 8. What makes this better than the competing calculators

Most existing bridal size tools do one of two things: output a single number with no reasoning, or output a "convert street to bridal" number that is wrong because it ignores the brand. Your differentiators, in order of value:

1. **Per-brand charts with visible sources and capture dates.** Nobody in this niche shows provenance. It is the whole trust argument.
2. **The straddle table.** Showing the three sizes and which one wins teaches the user something and makes the recommendation legible instead of magic.
3. **The alteration consequence.** Turns an abstract number into a decision.
4. **Plus range handled as a designed path**, not an error.
5. **No data capture, stated on the page.** Measurements are intimate. Saying plainly that nothing leaves the browser is a genuine differentiator and costs nothing.

---

## 9. Trust and editorial guardrails — non-negotiable

Sizing content sits close to body image, and bridal sizing specifically is a known source of distress because the number is unexpectedly high. Get this wrong and the tool damages the brand rather than building it.

**Required:**
- Frame every result as a garment-fitting fact, never a statement about the person. "This size matches your measurements on this chart" — not "you are a size X".
- Explain early and prominently that bridal numbers run higher than high-street numbers and that this is a quirk of an old sizing system, not a change in her body. Put this **above** the result, not after it.
- Neutral, mechanical language throughout the result area.

**Forbidden anywhere in the tool or its page copy:**
- Weight, BMI, body-fat, or any measurement beyond the garment-relevant ones.
- "Goal size", "target size", "size you want to be", countdown-to-the-wedding framing tied to body change.
- Any suggestion to change the body to fit a dress, in either direction.
- "Flattering", "slimming", "hides", "problem areas", "disguise".
- Shape-category labels applied to the person ("you are a pear").
- Any before/after or transformation imagery.

**Also:** no dark-pattern upsells, no exit-intent popups on this page, no email wall to see the result. The result must be free and immediate. A gate here would destroy the link-earning value, which is the entire business case.

---

## 10. Interface and accessibility

**Layout**
- Single column, mobile-first. The overwhelming majority of this traffic is a phone, often in bed or in a shop.
- Form and result on the same page; result appears below the form and the page auto-scrolls to it.
- No multi-step wizard. One screen, one button.
- Sticky "recalculate" affordance once a result is shown, so changing a brand is one tap.

**Mobile specifics**
- `inputmode="decimal"` on all measurement fields so the numeric keypad opens.
- Tap targets ≥ 44px.
- Unit toggle reachable with a thumb.

**Accessibility (real requirements, not decoration)**
- Every input has a real `<label>`, not a placeholder standing in for one.
- Result region is `aria-live="polite"` so screen readers announce it.
- Error and warning text is programmatically associated with its field.
- Colour contrast ≥ 4.5:1; never use colour alone to mark the deciding measurement — use the arrow/text too.
- Fully keyboard operable; visible focus states.
- Honour `prefers-reduced-motion`.

**Visual**
- Match the existing site's type and palette. Restrained — this page should feel like a reference instrument, not a quiz.
- The straddle table is the visual centrepiece. Give it room.

---

## 11. Technical specification

**Stack:** Self-contained HTML + CSS + vanilla JS. No framework, no build step, no external requests at runtime.

**Why:** Your site's measured mobile LCP was 21–34 s in the September audit. This page must not add to that problem. A dependency-free page can render in well under a second, and it is the one page on the site you fully control.

**Performance budget**
- Total page weight under 150 KB including chart data.
- No web fonts beyond what the theme already loads; no font file loaded solely for this page.
- Zero third-party scripts above the fold.
- Chart data inlined as a JS object, or fetched as one small JSON file — not one request per brand.
- No image above the fold. Measurement diagrams are inline SVG, lazy-rendered inside the expandable guidance.

**WordPress integration — pick one, in order of preference**
1. **Custom page template** in a child theme with the tool's markup. Cleanest, fastest, fully controlled. Recommended.
2. **Shortcode** registered in a small site-specific plugin, dropped into an Elementor page. Keeps the tool out of the theme and survives theme changes.
3. **Elementor HTML widget.** Works, but Elementor's own CSS/JS overhead will dominate the page weight. Acceptable only if you strip the page template down.

Avoid an `<iframe>` embed — it costs you the schema, the internal links, and the ranking signal.

**Browser support:** Current Chrome, Safari, Firefox, Edge, plus iOS Safari two versions back. No IE.

**State:** `localStorage` only, only for unit preference and last-used brand. Never measurements. Wrap in try/catch — it throws in private mode.

**Error handling:** If chart data fails to load, show a plain message and a link to the brand's chart. Never a blank page or a spinner that never resolves.

---

## 12. SEO specification

**URL:** `https://weddingguestdresses.fashion/wedding-dress-size-calculator/`
Clean, at root level, not nested under a category. Avoid "converter" in the slug — "calculator" and "size chart" carry the search intent.

**Title tag:** Wedding Dress Size Calculator — Find Your Bridal Size by Brand
**H1:** Wedding Dress Size Calculator
**Meta description:** Enter your measurements and get your bridal size on a specific designer's chart, with the alterations it implies. Free, nothing saved.

**On-page content around the tool** (the tool alone will not rank — it needs the page to be a genuine resource):
1. Tool at the top, above the fold. The user came to use it.
2. **Why bridal sizes run larger** — 150 words, sourced.
3. **How to measure correctly** — the three measurements plus hollow-to-hem, with diagrams. This section is what earns the featured snippet.
4. **What to do when your measurements span sizes** — the core rule, explained properly.
5. **Brand size chart index** — each brand with its capture date and a link to its official chart. This is also your honesty signal.
6. **FAQ** — 6–8 real questions. Candidates: *Is bridal sizing different from normal sizing? What size should I order if I'm between sizes? Can a wedding dress be made bigger? How much can a dress be taken in? What's hollow to hem? Should I order a smaller size to lose weight into?*

That last FAQ should be answered responsibly: order for the body you have, because taking in is routine and letting out is limited. That is accurate fitting advice and it is also the safe answer.

**Schema** — add properly, as JSON-LD:
- `WebApplication` (or `SoftwareApplication`) with `applicationCategory: "UtilitiesApplication"`, `offers.price: 0`
- `FAQPage` for the FAQ block
- `BreadcrumbList`
- `Organization` / `Person` author attribution

Your audit could not verify schema on existing posts. Build it correctly here from day one.

**Internal linking — both directions, this is the point**
- **Into the tool** from at least these existing posts: how-to-choose-wedding-dress-body-type, plus-size-wedding-dresses-that-flatter, affordable-wedding-dresses-under-500, modest-wedding-dresses-with-sleeves, wedding-dress-alterations-cost-guide, how-many-wedding-dress-fittings-do-you-need, wedding-dress-shopping-timeline-checklist, secondhand-wedding-dress-buying-guide, davids-bridal-vs-azazie-comparison, rent-wedding-dress-vs-buying-real-cost, best-wedding-dress-fabric-beach-wedding, what-to-wear-under-wedding-dress.
  Use a contextual in-body link, not a sidebar widget — sidebar links carry far less weight.
- **Out of the tool** to alterations cost, how to measure, plus-size fit, and secondhand buying, selected by result.
- Add it to the main navigation. This also solves the dead `href="#"` "Guides" menu item flagged in your audit — make that a dropdown with the calculator as its first entry.

**Link-earning plan** (the reason this asset exists)
- Submit to bridal subreddits and planning forums as a resource, not a promo — answer the sizing question, link as support.
- Pitch to wedding bloggers who cover budget and fit; a free no-signup tool is an easy "useful tools" inclusion.
- Reach out to the seamstresses and alterations businesses you can find locally and nationally — they have an interest in brides understanding the take-in/let-out rule.
- Include it in your Pinterest strategy; sizing infographics from the measurement section travel well.

---

## 13. Monetisation and AdSense fit

- **No ads inside the tool interface or between the form and the result.** Ad placement that interrupts a calculator is both a poor experience and a policy risk.
- Ads below the fold, inside the editorial content, are fine once you are approved.
- This page is strong AdSense evidence in itself: original functionality, clear purpose, real utility. It is the opposite of thin content.
- Affiliate: brand links in the chart index can carry affiliate tags **only** with the visible disclosure your audit found missing site-wide. The disclosure goes above the chart index, not in the footer.
- Do not let affiliate relationships influence which brands appear or which size is recommended. If that ever becomes a temptation, the tool is finished as a trust asset.

---

## 14. Analytics

Track, with no personal data:
- Tool completions (result shown) vs page views → completion rate.
- Brand selected, as a distribution. Tells you which brands to add next and which posts to write.
- Out-of-range rate. If high, your brand set under-serves plus sizes and you should add extended-range brands.
- Straddle distribution. Mostly a content signal — high 3-way straddle means a "when your measurements don't match any size" post is warranted.
- Outbound clicks to each internal guide, to see which next-step links earn their place.
- Copy-result button usage.

**Do not** send any measurement values to analytics. Track events and categories only.

---

## 15. Build phases

**Phase 1 — MVP (ship this)**
Three measurements, 4–6 sourced brands, straddle table, size-to-largest rule with explanation, in/cm toggle, measuring guidance, caveats, internal links, schema, no data storage.

**Phase 2 — +2 weeks**
Hollow-to-hem and petite/tall, regional US/UK/EU/AU conversion, copy-result button, expanded brand set, the out-of-range custom-sizing path built out properly.

**Phase 3 — later, only if usage justifies**
Secondhand mode ("here's a listed size 14 — will it work for me, and can it be altered?"). This is genuinely differentiated and nobody serves it, but it needs Phase 1 data first.

**Explicitly not planned:** accounts, saved profiles, email capture, AI chat, body-shape classification.

---

## 16. Acceptance checks

Before calling this done:

- [ ] Every brand chart has a source URL and capture date displayed on the page.
- [ ] No number appears anywhere on the page that cannot be traced to a cited chart or source.
- [ ] A body straddling three sizes produces the largest size, with all three shown.
- [ ] A measurement above the largest chart size produces a designed, respectful path — not an error.
- [ ] No measurement value appears in localStorage, any network request, or any analytics payload. Verify in DevTools.
- [ ] Page scores green on mobile Core Web Vitals in PageSpeed Insights.
- [ ] Fully operable by keyboard; result announced by screen reader.
- [ ] JSON-LD validates in Google's Rich Results Test for both WebApplication and FAQPage.
- [ ] At least 10 existing posts link to the tool contextually, in body copy.
- [ ] Tool URL appears in page-sitemap.xml.
- [ ] No word from the forbidden list in §9 appears anywhere on the page.
- [ ] The "Guides" nav item no longer points to `#`.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Brand charts change and the tool silently goes stale | Capture dates shown on page; twice-yearly review; "confirm against the current chart" caveat always visible. |
| A user orders the wrong size and blames the tool | Clear, prominent, repeated framing as a starting point; Disclaimer page covers it; never phrase output as a guarantee. |
| Tool is thin without supporting content and fails to rank | The surrounding content in §12 is mandatory, not optional. |
| Page weight undoes the performance work | Hard 150 KB budget; no framework; no third-party script. |
| Competitors clone it | They will. The defensibility is provenance, maintenance and the surrounding content — not the arithmetic. |
| Body-image harm | §9 guardrails, enforced in review before publish. |

---

## 18. Supporting content to write alongside it

Each of these links to the tool and is linked from it:

1. *How to Measure Yourself for a Wedding Dress* — the definitive version, with diagrams. Highest snippet potential.
2. *Why Wedding Dress Sizes Run Larger Than Your Normal Size* — directly answers the anxiety, sourced.
3. *What to Do When Your Measurements Are Between Sizes* — the take-in-two/let-out-one rule in full.
4. *Wedding Dress Size Charts by Brand* — the index page, maintained.
5. *Ordering a Wedding Dress Online: Sizing Without a Fitting* — serves the primary segment.

---

## Sources

- [The Knot — The Ultimate Guide to Wedding Dress Sizes](https://www.theknot.com/content/wedding-dress-sizes) — bridal vs street sizing offset, designer-to-designer variation, take-in-two/let-out-one alteration constraint.
- [Azazie — How Do I Choose the Right Size for My Wedding Dress?](https://www.azazie.com/blog/how-do-i-choose-the-right-size-for-my-wedding-dress/) — brand-side sizing guidance.

Per-brand chart sources to be captured at build time, each with its URL and capture date, per §4.
