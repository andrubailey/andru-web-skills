---
name: framer-launch-qa
description: Run a deep pre-launch QA round on a Framer site (live URL plus the Framer project via MCP), auto-fix safe issues, and write a launch-readiness report. Use when asked to QA, audit, launch-check, or pre-launch review a Framer site.
---

# Framer Launch QA

Run a full QA round on a Framer site so it is ready to publish. Audit the **live site** (staging or production URL) with scripts and screenshots, and the **Framer project** through the Framer MCP. Fix what is safe to fix, then write a dated report.

## 0. Checklist of record

Look for `FRAMER-LAUNCH-QA.md` in the project root or `qa/`. If the project has none, use [FRAMER-LAUNCH-QA.md](FRAMER-LAUNCH-QA.md) shipped with this skill and offer to copy it into the project so it can be customized. If found, it is the checklist of record: use its IDs, severities, targets, and any **Project-specific checks** Andru added. If not found, use the condensed checklist at the end of this skill (same IDs) and offer to create the full file in `qa/`.

## 1. Intake

Collect only what is missing (check the checklist's Project inputs table, the conversation, and project files first). Ask in one message:

- Staging URL and production domain (is the domain connected yet?)
- Old site URL, if this replaces an existing site (needed for redirect checks)
- Is the Framer MCP plugin open in the project right now?
- Form destinations (email, webhook, CRM) and analytics tool
- Pages or sections out of scope, and the Figma file if there is one
- QA round number (look for previous `qa/QA-REPORT-*.md` files; if found, read the latest and re-test its open items first)

## 2. Tooling check

- **Framer MCP:** list its tools. If they do not respond, remind Andru to open the MCP plugin inside the Framer project. If it stays unavailable, run a live-only audit and list every fix as manual.
- **Live-site tools** (install into a `qa/` working folder if missing):
  ```bash
  mkdir -p qa && cd qa && npm init -y >/dev/null && npm i -D playwright axe-core && npx playwright install chromium webkit
  ```
  Lighthouse and linkinator run through `npx`.

## 3. Page inventory

1. Pull `https://<site>/sitemap.xml` and list every URL.
2. Crawl the nav and footer for pages missing from the sitemap.
3. Compare with the Pages panel and CMS collections from the Framer MCP (catches unpublished, orphaned, or leftover test pages; checklist A1, A2).
4. Pick 1 to 2 representative CMS detail pages per collection. Write the final list to `qa/urls.txt`.

## 4. Automated live-site passes

Run these against the staging URL (or production once the domain is connected). Save all output under `qa/`.

**a. Scan script** (overflow, placeholders, em dashes, meta, H1s, alt text, broken images, dead links, staging links, stuck appear effects, console errors, full-page screenshots at 7 widths).

Copy `scripts/qa-scan.mjs` from this skill folder into the project as `qa/qa-scan.mjs`, then run it from the project folder:

```bash
node qa/qa-scan.mjs qa/urls.txt
```


Treat `elementsPastViewport` as "review": Framer tickers and carousels overflow on purpose; only real layout breaks count. For Safari rendering (B14), re-run key pages with `webkit` in place of `chromium`.

**b. Links** (C7, C8):
```bash
npx linkinator https://<site> --recurse --format CSV > qa/links.csv
```

**c. Lighthouse, mobile** on home plus the 2 to 3 key pages (E1 to E6, F1):
```bash
npx lighthouse https://<site>/<page> --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=qa/lighthouse/<page> --chrome-flags="--headless=new" --quiet
```

**d. axe** on each page at 1440 and 390 (F1): in a Playwright script, `page.addScriptTag({ path: 'qa/node_modules/axe-core/axe.min.js' })` then `page.evaluate(() => axe.run())`. Report critical and serious violations.

**e. Domain, SEO plumbing, redirects** (D7 to D12):
```bash
for u in http://<domain> http://www.<domain> https://www.<domain>; do echo "== $u"; curl -sIL "$u" | grep -iE "^(HTTP|location)"; done
curl -s https://<domain>/robots.txt
curl -s https://<domain>/sitemap.xml | grep -o "<loc>[^<]*" | sed 's/<loc>//'
curl -s -o /dev/null -w "404 test: %{http_code}\n" https://<domain>/qa-should-404
# Old-site redirects: one old path per line in qa/old-urls.txt
while read p; do curl -s -o /dev/null -w "$p -> %{http_code} %{redirect_url}\n" "https://<domain>$p"; done < qa/old-urls.txt
```
If the old site is still live, build `qa/old-urls.txt` from its sitemap.

## 5. Framer project pass (MCP)

Read the project structure, page XML, components, and CMS through the Framer MCP and check:

- A1 to A10 project hygiene (pages, slugs, components and variants, styles, fonts, locales)
- D4 heading tags set on text layers (visual size does not set the tag), D5 alt text, D2 CMS SEO fields
- C11, C12 CMS items: empty fields, missing images, drafts, slugs, references
- Text content across all pages for C1 to C4 (placeholders, typos, em dashes, casing)

Anything the MCP cannot reach (Site Settings: domains, redirects, custom code, favicon, social image, badge, password; page SEO panel if not exposed) goes to "Needs Andru" with the exact place in Framer to change it.

## 6. Visual review

Read the screenshots in `qa/shots/` for every page at every width and judge them like a senior designer: B1 to B15 (clipping, overlap, spacing rhythm, crops, type scale, orphans, alignment, consistency across pages, match with Figma). Also test interactive behavior with Playwright or the browser: mobile menu open/close/link tap, anchor offsets under the sticky nav, hover states, modals, carousels, accordions, keyboard tab order (F3).

**Forms (C10):** submit each form once with clearly labeled test data ("QA TEST, please ignore", name "QA Test"). Tell Andru which forms were submitted so he can confirm receipt at the destination. Never submit more than once per form per round.

## 7. Log findings

For every FAIL record: checklist ID, severity (Blocker / High / Polish), page, breakpoint(s), evidence (screenshot path, scan field, Lighthouse metric), and the fix. Merge duplicates (one component bug that shows on 8 pages is one finding listing the pages).

## 8. Auto-fix

**Apply directly through the Framer MCP, then log in "Fixed by Claude":**
- Spelling and grammar typos (not rewording)
- Em dashes in copy: swap for a comma, colon, period, or parentheses with the least change in meaning
- Missing or wrong heading tags (one H1 per page, logical levels)
- Alt text on meaningful images; empty alt on decorative ones
- Links pointing at staging or the editor: repoint to the production-relative path
- Dead `#` links where the correct target is unambiguous
- Copyright year

**Batch into one approval list and ask before applying:**
- Any copy change beyond mechanical fixes, including new meta titles and descriptions (draft them for approval)
- Layout, spacing, sizing, or breakpoint changes (use the `framer-breakpoints` skill for responsive fixes when available)
- Component or variant changes that ripple across pages
- Deleting pages, layers, or CMS items; changing slugs (slug changes need redirects)
- CMS content that is missing (never invent client content, testimonials, stats, or logos)

**Never:** publish the site, change domain or DNS settings, change the plan, or remove password protection. After fixes, ask Andru to publish (to staging if available), then re-run the affected checks and update the re-test log.

## 9. Report

Write `qa/QA-REPORT-YYYY-MM-DD.md` using the report template in `FRAMER-LAUNCH-QA.md` (sections: Verdict, Summary counts, Lighthouse table, Fixed by Claude, Needs Andru, Needs client input, Passed, Re-test log). Verdict rules:

- **READY TO PUBLISH:** zero open Blockers and zero open High (or High items accepted by the client)
- **READY AFTER FIXES:** only a few quick open items, each with a clear fix
- **NOT READY:** open Blockers needing real work or client input

Close with a short chat summary: verdict, counts, the top 3 open items, and what Andru needs to do next.

## House rules

- No em dashes in anything written for Andru: site copy, meta descriptions, and the report itself.
- Keep fixes minimal and faithful to the approved design and copy.
- Be specific: every finding names a page, breakpoint, and element, never "some spacing issues".

## Condensed checklist (fallback when FRAMER-LAUNCH-QA.md is absent)

Severity: B = Blocker, H = High, P = Polish. Widths: 1920, 1440, 1280, 1200, 1024, 900, 810, 768, 600, 430, 390, 375, 360. Browsers: Chrome, Safari (macOS + iOS), Firefox, Edge.

- **A Hygiene:** A1 only intended pages (H) | A2 clean slugs (H) | A3 correct home (B) | A4 no layer debris (P) | A5 components and variants consistent (H) | A6 text/color styles used (P) | A7 fonts load and licensed (H) | A8 plan supports domain, badge off (B) | A9 password off for production (B) | A10 locales complete (H)
- **B Visual:** B1 no horizontal scroll (B) | B2 no clipping or overlap (B) | B3 in-between widths hold (H) | B4 type scale, line length, orphans (P) | B5 spacing rhythm (P) | B6 image crops and sharpness (H) | B7 nav and mobile menu work (B) | B8 sticky nav clears anchors (H) | B9 hover/focus/pressed states (H) | B10 appear effects reliable, nothing stuck invisible (B) | B11 overlays, carousels, accordions on touch (H) | B12 footer links, current year (H) | B13 favicon (H) | B14 Safari rendering (H) | B15 matches Figma (H)
- **C Content:** C1 no placeholders (B) | C2 spelling, names (B) | C3 no em dashes (H) | C4 consistent casing, numbers (P) | C5 contact info, tel/mailto (B) | C6 every CTA works (B) | C7 no broken links, anchors land (B) | C8 no staging/editor links (B) | C9 external links new tab (P) | C10 forms submit and deliver (B) | C11 CMS items complete (B) | C12 no accidental CMS drafts (H) | C13 social proof real and approved (B) | C14 legal pages (H)
- **D SEO/tech:** D1 unique titles and descriptions (H) | D2 CMS SEO fields (H) | D3 social image 1200x630 (H) | D4 one H1, logical headings (H) | D5 alt text (H) | D6 site language (P) | D7 domain, SSL, http/www redirects (B) | D8 canonical to production (B) | D9 sitemap correct (H) | D10 robots and noindex correct (B) | D11 old-URL 301s (B) | D12 custom 404 (H) | D13 analytics fires once, conversions (B) | D14 Search Console ready (H) | D15 custom code valid (H) | D16 structured data (P) | D17 no console errors (H)
- **E Performance (Lighthouse mobile):** E1 Perf 90+ (80 min) | E2 Best Practices 95+ | E3 SEO 100 | E4 LCP under 2.5s | E5 CLS under 0.1 | E6 TBT under 200ms | E7 image source sizes | E8 video compression, poster, muted | E9 lean fonts (P) | E10 lazy embeds (P) | E11 heavy effects on mobile (all H unless marked)
- **F Accessibility:** F1 Lighthouse A11y 95+, zero critical/serious axe (H) | F2 AA contrast incl. text on images (H) | F3 keyboard nav and visible focus (H) | F4 descriptive link/button names (H) | F5 labeled inputs (H) | F6 200% zoom (P) | F7 no flashing, no sound autoplay (H) | F8 captions (P)
- **G Launch gate:** all Blockers PASS or FIXED and re-tested; High PASS, FIXED, or client-accepted; Polish fixed or logged; report saved in `qa/`.
