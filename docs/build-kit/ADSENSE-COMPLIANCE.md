# AdSense Compliance Constraints — Size Calculator Page

Checked against Google's own Publisher Policies and AdSense eligibility pages,
13 October 2026. Sources at the bottom. These are binding on the build.

---

## Verdict

Built as specified, this page **helps** an AdSense application. Built as a bare
calculator, it **hurts** it. The difference is the surrounding content.

Google requires content that is "high-quality, original, and attract[s] an
audience." A working calculator with sourced, per-brand data is strongly original —
far better evidence than another listicle. But Google's Publisher Policies also
prohibit ads on **"screens without publisher-content or with low-value content."**
A page that is only a form and a number is exactly that screen.

---

## Three binding rules

### 1. The page must carry real content, not just the tool

The calculator alone does not qualify as publisher content. Spec §12's surrounding
sections are **mandatory for AdSense**, not optional polish:

- Why bridal sizes run larger than street sizes (sourced)
- How to measure correctly, per measurement
- What to do when measurements span sizes
- Brand chart index with source links and capture dates
- FAQ (6–8 real questions)

Target: the written content should stand on its own as a useful article even if the
calculator were removed. If it cannot, the page is not ready to carry ads.

### 2. No ads inside or adjacent to the tool

Google prohibits ads that **"overlay or are adjacent to navigational or other
action items and may lead to unintended ad interactions."** The Calculate button,
the unit toggle and the brand selector are all action items.

Therefore:
- **No ad unit inside the calculator card.**
- **No ad between the form and the result.** A user who just submitted is reaching
  toward where the result appears; an ad there is an accidental-click trap.
- **No ad immediately beside or beneath the Calculate button.**
- Ads only below the fold, inside the editorial content, separated from the tool.
- No interstitials, no exit-intent overlays, no anchor ad covering the result area.
- The page must not become a screen where ads outweigh publisher content.

Build the page with **no ad code at all** for now. Leave clearly commented slots in
the editorial section only. Ad code goes in after approval.

### 3. The privacy policy must disclose Google's advertising cookies

This is a stated Google requirement and it is currently **unmet on the live site** —
it was the P0-1 finding in the October audit and has not been fixed.

Google requires a privacy policy that discloses data collection, sharing and usage
tied to Google products, **including cookies, web beacons and IP addresses**, and
that states third parties may place and read cookies or use web beacons on the site.

The live policy at `/privacy-policy/` names none of this. It does not mention
Google, AdSense, DoubleClick, personalised advertising, GDPR, CCPA, or any opt-out
link, and it does not name the analytics provider.

**This is a site-level blocker and no amount of calculator quality fixes it.**
It is out of scope for this build but must be fixed before applying.

---

## What the tool must NOT do (policy and trust)

- **No measurement data sent anywhere.** No analytics payload, no network request,
  no localStorage of body measurements. Beyond the privacy promise in the spec, it
  keeps the page out of any data-disclosure obligation it would otherwise create.
- **No email gate on the result.** A result locked behind a form makes a dead-end
  screen and destroys the link-earning case for the page.
- **No auto-redirects, no popups, no forced interaction** to see the result.
- **Do not copy brand chart presentation wholesale.** The data is factual and
  attributed; the layout, explanation and commentary must be original. Google
  prohibits screens that reproduce others' content "without adding value."

---

## Why this page is a net positive for the application

- Original functionality nobody else in the niche offers.
- Visible sourcing with capture dates — a strong quality signal.
- Serves a real user need with an answer not available elsewhere.
- Gives 10+ existing posts a genuine internal link destination.
- Fixes the dead `href="#"` "Guides" nav item, which reads as an unfinished site.

Apply **after** this page is live and the privacy policy is fixed, not before.

---

## Sources

- [Google Publisher Policies](https://support.google.com/adsense/answer/9335564) —
  low-value content screens, ads adjacent to action items, privacy policy and
  third-party cookie disclosure requirements. Captured 13 Oct 2026.
- [AdSense eligibility requirements](https://support.google.com/adsense/answer/9724) —
  "high-quality, original" content requirement; applicant must control the site.
  Captured 13 Oct 2026.

Policies change. Re-read both pages before applying.
