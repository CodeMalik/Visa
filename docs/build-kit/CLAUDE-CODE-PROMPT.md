# The prompt — paste this into Claude Code

Open Claude Code in the project folder containing these files, then paste
everything between the lines.

---

You are building a production page for a live WordPress site that gets real
traffic from brides making an expensive, irreversible purchase decision. Treat
accuracy as the primary requirement and visual polish as secondary. A page that
looks beautiful and states a wrong size is a failure.

## Read first, in this order

1. `BUILD-ORDER.md` — the work order. It overrides everything else.
2. `ADSENSE-COMPLIANCE.md` — binding constraints on content and ad placement.
3. `SPEC.md` — the full design rationale. Read §4, §6, §9, §12 closely.
4. `data/brands.json` — the real, verified size chart data.

Then run `python3 validate_brands.py data/brands.json` and read its output
before writing any code. It should report 3 brands and exactly 2 warnings.

## Before you write any code

Ask me the six environment questions in `BUILD-ORDER.md` §1 as a single batch,
and wait for my answers. Do not assume a theme, a PHP version, or how I deploy.
Do not start scaffolding while you wait.

After I answer, show me a short implementation plan — file list, the integration
route you chose and why, and anything in the spec you think is wrong. I want
your disagreement before the code, not after. Then wait for my go-ahead.

## Non-negotiable rules

1. **Never invent, interpolate or "correct" a size chart value.** Every number
   comes from `data/brands.json`. Four brands are deliberately excluded and
   listed with reasons — do not fill them in from memory or from aggregator
   sites. Two values are flagged as suspected source typos; store and display
   them exactly as published. The validator will keep warning about them. That
   is correct behaviour.
2. **No number on screen without its source.** Brand name, source link and
   capture date are visible wherever chart data is shown.
3. **No measurement leaves the browser.** No analytics, no network request, no
   localStorage of body measurements. Only unit preference and last brand may
   be stored, wrapped in try/catch.
4. **No ad code anywhere on the page.** Leave commented slots in the editorial
   section only, never inside or adjacent to the tool. See
   `ADSENSE-COMPLIANCE.md` §2 — this is a Google policy constraint, not taste.
5. **No framework, no build step, no runtime network requests, no third-party
   scripts.** Vanilla HTML, CSS, JS. Page weight under 150 KB including data.
6. **Enforce the editorial guardrails in `SPEC.md` §9.** No weight, BMI, goal
   size, flattering, slimming, body-shape labels, or any phrasing that frames
   the output as a statement about the person rather than about the garment.
   Grep the finished page for the forbidden terms before you call it done.
7. **If a required fact is missing, stop and ask me.** Never proceed on a guess.

## Scope — build exactly this

Phase 1 only, as fenced in `BUILD-ORDER.md` §2. Three measurements, three
brands, the straddle table, the alteration readout, the out-of-range path, the
measuring guidance, the caveats, the copy-summary button, the internal links and
the JSON-LD.

Do **not** build regional size conversion or hollow-to-hem/petite/tall. The data
for both is missing or incompatible across brands — building them now would
produce confidently wrong output. If you think you can source them, tell me; do
not silently add them.

## Self-verification — do this before reporting done

Your implementation must reproduce this table exactly, for a body measuring
36 / 30 / 40 inches:

| Brand | bust → | waist → | hips → | Recommended | Straddle |
|---|---|---|---|---|---|
| Azazie | WD10 | WD10 | WD10 | WD10 | 1 |
| Maggie Sottero | 8 | 12 | 10 | 12 | 3 |
| Allure Bridals | 8 | 10 | 8 | 10 | 2 |

Write this as an actual test — a small JS test file or a browser console
assertion I can re-run — not a manual check. If your output disagrees, your
calculation is wrong, not the fixture.

Also verify: a 62-inch bust against Allure must produce the out-of-range path
described in `BUILD-ORDER.md` §4 — a designed route to custom sizing and
extended-range brands, never the top size and never an error state.

Then work through the acceptance checklist in `BUILD-ORDER.md` §8 and report
each item pass or fail honestly. Do not mark an item passed because the code
looks right — check it. For the storage and network items, tell me exactly how
you verified.

## What a top-tier result looks like here

- The straddle table is the centrepiece of the result, not a footnote. The user
  should immediately see that her three measurements map to three different
  sizes and which one decided the answer. That insight is the product.
- The explanation that bridal sizes run larger appears **above** the result, so a
  woman seeing an unexpectedly high number reads the reason before the number.
- The out-of-range path reads as a designed route, not a failure. A plus-size
  bride must not feel like an edge case the tool did not plan for.
- The editorial content around the tool stands on its own as a useful article.
- Everything is keyboard operable and screen-reader announced, with a real
  `<label>` per input and `aria-live` on the result.
- The code is boring, readable and dependency-free. No cleverness.

## What failure looks like

- Any size chart number that cannot be traced to `data/brands.json`.
- A bare calculator with no surrounding content.
- An ad slot inside the tool.
- A result that says "you are a size X".
- A spinner that never resolves when the data file fails to load.
- Reporting the acceptance checklist as passed without actually testing it.

## Deliverables

The file structure in `BUILD-ORDER.md` §7, plus a `README.md` covering install
steps, how to update a brand chart, and the next data-review date (2027-04-13).

Work in small commits with clear messages. Show me the result before I deploy —
nothing goes to production without my review.

---

## Follow-up prompts worth having ready

**If it starts coding before asking the questions:**
> Stop. You skipped the six environment questions in BUILD-ORDER.md §1. Ask them
> and wait for my answers before writing anything further.

**If a size chart number appears that you cannot find in the data file:**
> Where exactly in data/brands.json did this value come from? Quote the line. If
> it is not there, remove it and tell me what you were trying to fill.

**To pressure-test the result before deploying:**
> Review your own build against ADSENSE-COMPLIANCE.md and SPEC.md §9 as if you
> were rejecting it. Give me the three strongest reasons this page should not go
> live, then fix whichever are real.

**Before going live:**
> Run the full acceptance checklist in BUILD-ORDER.md §8 again from scratch. For
> each item tell me how you verified it, not whether you think it passes.
