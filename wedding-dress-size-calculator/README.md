# Wedding Dress Size Calculator (WordPress plugin)

A bridal size calculator for weddingguestdresses.fashion. The visitor enters bust, waist and hips and chooses a designer. The page then shows:

- which size on that designer's published chart fits all three measurements
- where each measurement lands (the straddle table)
- what would need taking in
- a designed route when the measurements go beyond the chart

It also prints the surrounding article (why bridal sizes run larger, how to measure, different-size advice, chart index, FAQ) and JSON-LD.

- **Shortcode:** `[wedding_dress_size_calculator]`
- **Requires:** WordPress 5.8+, PHP 7.4+
- **Runs in the browser.** It makes no network requests and uses no analytics, ads or third-party scripts. It never stores or sends a measurement. Only the unit choice and the last brand chosen are kept in `localStorage`.
- **Weight:** about 75 KB in total (markup, JS and CSS, including the chart data).
- **Next chart data review: 13 April 2027** (every six months; see below). Keep this date in your own records, not on the page.

## Files

```
wedding-dress-size-calculator/
  wedding-dress-size-calculator.php   plugin, shortcode, schema, asset loading
  templates/calculator.php            tool markup and article
  assets/calculator.css               styles, scoped to .wdsc
  assets/calculator.js                calculation and interface
  data/brands.json                    size charts, as published by each brand
  README.md
```

The repository also holds `tests/` and `tools/validate_brands.py`. They are for development and are not uploaded to WordPress.

## Install (live site, no staging)

There is no staging site, so the page goes up as a **draft** and is checked in preview before anyone can see it. Installing the plugin on its own changes nothing on the site: it only does something on a page that contains the shortcode.

1. **Upload the plugin.** Go to *Plugins → Add New → Upload Plugin*, choose `wedding-dress-size-calculator.zip` and click *Activate*. Or upload the `wedding-dress-size-calculator` folder to `wp-content/plugins/` by SFTP and activate it.
2. **Create the page as a draft.**
   - *Pages → Add New*. Title: `Wedding Dress Size Calculator`. Permalink slug: `wedding-dress-size-calculator`.
   - Keep the default page template, so your Elementor header (ID 35) and footer (ID 20) wrap it.
   - Click *Edit with Elementor*, drag in one **Shortcode** widget and enter `[wedding_dress_size_calculator]`. Do not add anything between the widget and the page title.
   - Leave the page title visible. It is the page's H1; the plugin starts at H2.
   - *Save Draft*, not *Publish*.
3. **Set up Rank Math on the page.**
   - SEO title: `Wedding Dress Size Calculator — Find Your Bridal Size by Brand`
   - Meta description: `Enter your measurements and get your bridal size on a specific designer's chart, with the alterations it implies. Free, nothing saved.`
   - In the page's Rank Math *Schema* tab, do not add FAQ or WebApplication schema. The plugin already outputs both, and duplicates confuse Google.
   - BreadcrumbList: if Rank Math breadcrumbs are enabled, the plugin leaves breadcrumb schema to Rank Math. If they are off, the plugin adds its own.
4. **Performance plugins.** If you use WP Rocket, LiteSpeed Cache, Autoptimize or similar:
   - Exclude `wedding-dress-size-calculator/assets/calculator.js` from "Delay JavaScript execution". The tool still recovers if it is delayed, but visitors would briefly see the fallback first.
   - Do not let a plugin rewrite `<script type="application/json">` blocks.
5. **Preview the draft and check it** on your phone and on a computer:
   - [ ] Enter 36 / 30 / 40 inches and choose each brand in turn. The answers must be Azazie **WD10**, Maggie Sottero **12** and Allure Bridals **10**.
   - [ ] Choose Allure and enter bust 62. You should see "The Allure Bridals chart stops at size 30", with routes to other options and no size.
   - [ ] Open DevTools → Network and run a calculation. No new request should appear.
   - [ ] DevTools → Application → Local Storage should contain only `wdsc-unit` and `wdsc-brand`.
   - [ ] The page has one H1 (the page title), and the header and footer look right.
6. **Publish.**
7. **After publishing:**
   - Run the URL through [Rich Results Test](https://search.google.com/test/rich-results) (expect WebApplication, FAQ and Breadcrumb).
   - Run it through [PageSpeed Insights](https://pagespeed.web.dev/) on mobile.
   - Check that the page appears in Rank Math's `page-sitemap.xml`.

**To take it down:** set the page back to Draft. Deactivating the plugin while the page is live would show the raw shortcode text, so draft the page first.

## Changing the accent colour

Edit one line near the top of `assets/calculator.css`:

```css
--wdsc-accent: #7a2e4f;   /* restrained plum */
```

Keep the contrast against white at 4.5:1 or higher. `npm test` checks this.

## Updating a brand's size chart

The data is the product, so every change follows the same steps.

1. **Keep the old version.** Copy `data/brands.json` to `data/archive/brands-YYYY-MM-DD.json`, using the date of the version being replaced. The plugin never loads the archive.
2. **Open the brand's `source_url`** and compare every row: size label, bust, waist and hips.
3. **Edit only what the brand's chart shows.**
   - Store values in the brand's own units, exactly as published.
   - Never round, average, interpolate or "fix" a value. If a value looks wrong, keep it as published and add a note to that brand's `data_quality`.
   - Keep `sizes` in the brand's own order, smallest to largest.
4. **Set `captured`** to the date you checked the chart (`YYYY-MM-DD`), even if nothing changed. The page shows this date.
5. **Validate:**
   ```
   python3 tools/validate_brands.py wedding-dress-size-calculator/data/brands.json
   npm test
   npm run test:browser
   ```
   The validator currently reports exactly **2 warnings**: Maggie Sottero size 24 hips `56.6` and Allure size 20 hips `49.6`. Both are suspected typos at the source, stored as published. This is expected. Change them only once the brand confirms the correct value.
6. **Upload the new `brands.json`** to `wp-content/plugins/wedding-dress-size-calculator/data/` and clear any page cache. The data is printed into the page, so a cached page keeps showing the old charts until the cache is cleared.

If a brand changes its chart, the worked example (36 / 30 / 40 in) on the page updates by itself, because it is calculated from the data. The tests in `tests/` hold the verified fixture for 13 October 2026. If a brand's chart has really changed, re-verify the new answers by hand against the brand's chart before updating the fixture.

### Adding a brand

Add a brand only when it publishes its own retrievable chart. Not a retailer's copy, and not an aggregator site.

- Record `brand_id`, `brand_name`, `chart_label`, `source_url`, `captured`, `units`, `notes`, `custom_sizing_available` and the full size range, including the plus range.
- Remove the brand from `excluded_brands`.
- Add its chart URL to `wdsc_fallback_charts()` in `wedding-dress-size-calculator.php`. A test checks this list matches the data.
- Update the brand list in `tests/calculator.test.js`.

These brands are excluded today, with reasons in `brands.json`: David's Bridal, BHLDN, Essense of Australia, Morilee and Lulus. Lulus uses everyday clothing sizes, not bridal sizes, and must be labelled separately if it is ever added.

### Review schedule

Every six months, re-open each `source_url`, follow the steps above and set the next date. **Next review: 2027-04-13.**

## Tests

There are no dependencies to install. `npm test` needs Node 18+, PHP and Python 3. The browser checks also need Playwright with Chromium.

```
npm test               # calculation fixture, page guardrails, schema, contrast, validator
npm run test:browser   # real Chromium: UI fixture, network, storage, keyboard, no-JS, 360 px
```

What they cover:

- **`tests/calculator.test.js`:** the verified 36 / 30 / 40 fixture for all three brands, the same body entered in centimetres, the Allure 62 in bust route, the published-order walk, and that the two flagged values are unchanged.
- **`tests/page.test.js`:** renders the real shortcode through `tests/render-page.php` and checks:
  - the forbidden-term list (SPEC §9) across markup, JS, CSS and PHP comments
  - no ad, analytics or third-party code, and ad slots only in the article
  - the storage keys
  - labels and `inputmode` on every field
  - a source link and capture date for each brand
  - the JSON-LD
  - the chart data reaching the page byte for byte
  - page weight and contrast
  - the broken-data fallback
  - the validator output
- **`tests/browser-check.js`:**
  - the fixture through the real interface
  - the out-of-range route
  - the network log after load
  - `localStorage`, `sessionStorage`, cookies and IndexedDB contents
  - storage disabled
  - keyboard-only use
  - the live region
  - no sideways scroll at 360 px
  - copy summary
  - JavaScript off, bad data, a failed script, a delayed script, and reduced motion

## Ads

The page contains **no ad code**. Two HTML comments mark the only places ad code may go after AdSense approval, both inside the article and well below the tool. Never place an ad inside the calculator card, between the form and the result, or next to the button (`docs/build-kit/ADSENSE-COMPLIANCE.md` §2).

**Before applying to AdSense:** the site's `/privacy-policy/` must disclose Google's advertising cookies, web beacons and IP use, and third-party cookies. This is a site-level blocker that this plugin does not fix (`ADSENSE-COMPLIANCE.md` §3).

## Site tasks outside this plugin

These are WordPress admin work and are not done by the plugin:

- [ ] Add the calculator to the main menu. Make "Guides" a dropdown with the calculator as its first item, so it no longer points to `#`.
- [ ] Add a contextual in-body link to the calculator from at least 10 of these posts. Suggested sentences (link the bold text to `/wedding-dress-size-calculator/`):

| Post | Suggested sentence |
|---|---|
| how-to-choose-wedding-dress-body-type | Once you have a style in mind, our **wedding dress size calculator** shows which size fits on the designer's own chart. |
| plus-size-wedding-dresses-that-flatter | Check your measurements against each designer's full size range with our **wedding dress size calculator**. |
| affordable-wedding-dresses-under-500 | Ordering online? Use the **wedding dress size calculator** to find the size on that brand's chart before you buy. |
| modest-wedding-dresses-with-sleeves | Sleeved styles fit closely through the bust, so check your size with our **wedding dress size calculator**. |
| wedding-dress-alterations-cost-guide | To see what would need taking in before you order, try our **wedding dress size calculator**. |
| how-many-wedding-dress-fittings-do-you-need | Start from the right size: our **wedding dress size calculator** shows where each measurement lands. |
| wedding-dress-shopping-timeline-checklist | Take your measurements early and run them through our **wedding dress size calculator**. |
| secondhand-wedding-dress-buying-guide | Compare a listed size with your measurements using our **wedding dress size calculator**. |
| davids-bridal-vs-azazie-comparison | The same measurements can match different sizes at each brand; our **wedding dress size calculator** shows the difference. |
| rent-wedding-dress-vs-buying-real-cost | Whether you rent or buy, our **wedding dress size calculator** helps you pick the size to try first. |
| best-wedding-dress-fabric-beach-wedding | Before ordering, check your size on the designer's chart with our **wedding dress size calculator**. |
| what-to-wear-under-wedding-dress | Wearing these, take your measurements and enter them in our **wedding dress size calculator**. |

## Not built in Phase 1 (on purpose)

- **Regional US/UK/EU/AU conversion.** No sourced conversion table exists yet.
- **Hollow-to-hem, petite and tall.** Azazie's length values had unit problems, and Maggie Sottero measures from the natural waist, so the two systems can't be mixed.
- **Secondhand mode.**
- **A numeric street-size mapping.** Only The Knot's "roughly three sizes" statement is sourced, and the page shows it as an approximation.
