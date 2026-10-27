# Two-week check

About 14 days after launch. Read `qa/launch-state.json` and the launch report first, so you compare against what was there at launch.

## 1. Search Console (read only)

Read it in Andru's signed-in Chrome through Claude in Chrome (only viewing reports; never change settings, remove URLs or add users). If Chrome is not available, ask him to export or paste:

- **Pages (indexing):** indexed vs not indexed, and every "why not" reason with its URLs. Expected early: some "Discovered, currently not indexed". Problems: "Excluded by noindex", "Page with redirect" for a sitemap URL, "Not found (404)", "Duplicate without user-selected canonical".
- **Sitemaps:** status Success, discovered URL count matches the sitemap.
- **Performance:** total impressions and clicks since launch, the top 20 queries and top pages. Note which blueprint searches already show impressions.
- **Experience and Enhancements:** Core Web Vitals (probably "not enough data" yet), breadcrumbs, any structured data errors.
- **Manual actions and security issues:** should both be empty.
- **Crawl stats** (Settings): crawl requests, any host or server errors.

Bing Webmaster Tools the same way: indexed pages, crawl errors, search performance.

## 2. Live site still clean

Re-run the production crawl and plumbing (`seo-audit.mjs`, `schema-check.mjs`, `plumbing.mjs` with the old URLs) and compare with launch day. Content edits in Sanity since launch can add missing alt text, empty descriptions or broken links; the D7 validation rules should have caught most of it.

## 3. AI answers again (L3)

Re-run every prompt from `qa/ai-prompts.md` with the same methods as the baseline (references/ai-answer-testing.md). Write `qa/ai-followup-YYYY-MM-DD.md` with the comparison. Do not claim movement you did not see.

## 4. Google Business Profile and analytics

Ask Andru (or read in Chrome, view only): GBP views, searches, calls and website clicks for the 14 days since launch against the 14 before, and whether the website link has the UTM tags. In GA4: sessions by source (organic, the GBP UTM, direct), the form key event count, and that previews sent no traffic.

## 5. Write it up

- `qa/TWO-WEEK-CHECK-YYYY-MM-DD.md` for Andru (template in report-templates.md), with a short list of fixes and who does each.
- `qa/CLIENT-TWO-WEEK-NOTE.md` for the client, in Andru's voice with the `andru-voice` skill: what Google has picked up, the first searches that found them, what changed in AI answers, one thing to do next (usually reviews and photos on the GBP). Offer a Gmail draft only if Andru asks; never send it.
- Update `launch-state.json` (`phases.twoWeek`, `ai.followUp`).

Suggest when the next check should be (60 or 90 days is Andru's call); AI engines and Google both take longer than two weeks to settle on a new site.
