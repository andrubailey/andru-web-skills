# Report templates

No em dashes in any of these. Every finding names the page, the breakpoint (and browser, when it matters) and the element.

## 1. `qa/LAUNCH-QA-YYYY-MM-DD.md` (for Andru)

```markdown
# Launch QA: {Client} | {YYYY-MM-DD} | Pre-launch, round {n}

**Verdict:** READY TO LAUNCH / READY AFTER FIXES / NOT READY
**Tested:** {preview URL} (branch `{branch}`, commit `{sha}`), production domain {domain}
**Scope:** {n} pages, widths 1440 to 360 plus a 320 reflow check, Chromium and WebKit
**Tools:** Playwright, axe-core, Lighthouse 12.8.2 (median of 3), Schema.org validator, Rich Results Test, curl, Sanity CLI{, PageSpeed Insights}

{Two or three sentences: where the site stands and the one thing that decides launch.}

## Summary

| Severity | Found | Fixed by Claude | Approved and applied | Open |
|---|---|---|---|---|
| Blocker | | | | |
| High | | | | |
| Polish | | | | |

## Launch gate

| Condition | Status |
|---|---|
| Lighthouse mobile 95 / 100 / 100 / 100 on every key page | PASS / FAIL ({pages}) |
| Zero schema errors | |
| Zero broken links | |
| Zero console errors | |
| Unique title and description on every indexable page | |
| Zero open Blocker and High | |

## Lighthouse (mobile, median of 3)

| Page | Perf | A11y | Best Pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|

## SEO and AEO scorecard

One line per area, with the state and the evidence label from references/aeo.md where it applies.

| Area | Status | Notes |
|---|---|---|
| Indexing setup (canonicals, sitemap, robots, noindex on previews) | | |
| Titles and descriptions | {n} of {n} unique and in range | |
| Structured data | {types}, {errors} errors | |
| Server-rendered content (what AI crawlers see) | | Measured |
| AI crawler access and policy | | Documented |
| FAQ answers | {n} direct, {n} need rewrites | |
| Home and area pages answer buyer questions | | |
| Name, address, phone consistency | | |
| Service area pages | {n} of {n} blueprint areas | |
| About page (people, history, license) | | |
| Google Business Profile | checklist handed to Andru | |
| llms.txt | present / absent (optional, no evidence) | No evidence |
| AI answer baseline | {n} prompts, builder named in {n} | See qa/ai-baseline-{date}.md |

## Fixed by Claude

| ID | Page / breakpoint | Issue | Change | Commit |
|---|---|---|---|---|

## Approval list

| # | ID | Sev | Page | Change proposed | Recommendation | Status |
|---|---|---|---|---|---|---|

## Needs Andru

Things only Andru can do (Vercel settings, GBP, Search Console, DNS on launch day, confirming form deliveries).

| ID | Sev | What | Where | How |
|---|---|---|---|---|

## Needs client input

Phrased so Andru can forward it as is.

| ID | Page | Question or missing content |
|---|---|---|

## Old URLs tested

Every old URL from `qa/old-urls.txt`, with where it ends up, so a passing redirect is shown, not just a failing one.

| Old URL | Result | Lands on | Hops |
|---|---|---|---|

## Forms submitted

| Form | Page | Destination | Date | Test label | Confirmed received |
|---|---|---|---|---|---|

## Passed

{Checklist IDs that passed, grouped by area}

## Not applicable

{IDs and why}

## Re-test log

| Date | Round | IDs re-tested | Result |
|---|---|---|---|
```

## 2. `qa/CLIENT-LAUNCH-SUMMARY.md` (for the client)

One page, in Andru's voice (use the `andru-voice` skill), written to the builder by first name. Plain words, short sentences. No checklist IDs, no "SEO" without saying what it means, no scores without a plain meaning next to them. Do not oversell: a new site is not ranking yet on launch day, and the summary should say so.

```markdown
# {Builder}: your site before launch

{First name},

{One or two sentences: the site is ready (or what is left), in his terms.}

## What I checked

- {Every page on phones, tablets and computers, in Chrome and Safari}
- {That every button, link and form goes where it should}
- {Speed: how fast pages load on a phone, with the result in plain terms}
- {That Google and the AI tools buyers use (ChatGPT, Perplexity, Google's AI answers) can read every page and understand who you are, where you build and what you build}

## Where you stand on search at launch

{Honest starting line. Example: "Right now, when someone asks ChatGPT who builds custom homes on Lake Lanier, it names two other builders and not you. That is normal for a site that is not live yet. Google and the AI tools need a few weeks to read the new site."}

## What you can do this month

{Two or three things only he can do, each one line: ask the last five clients for a Google review with this link, send photos of the Hill house, confirm the license number.}

## What I check in two weeks

- {Whether Google has found and listed every page}
- {The first searches people used to find you}
- {The same AI questions again, to see what changed}

{Sign-off as Andru}
```

## 3. Launch-day section (appended to the latest report)

```markdown
## Launch day: {YYYY-MM-DD}

**Verdict:** LIVE AND CLEAN / LIVE WITH ISSUES / ROLL BACK
| Check | Result |
|---|---|
| Domain variants and redirects | |
| SSL (apex and www) | |
| Canonicals and sitemap on the production domain | |
| robots.txt and no noindex on production | |
| Old-site redirects ({n} tested) | |
| Structured data on production | |
| GA4 page views and the form conversion | |
| PageSpeed Insights (mobile) | |
| Search Console: sitemap submitted, indexing requested for {pages} | |
| Bing Webmaster Tools | |
| GBP website link updated | |
```

## 4. `qa/TWO-WEEK-CHECK-YYYY-MM-DD.md` and the client follow-up

Andru's version: Search Console coverage (indexed, not indexed and why), crawl errors, top queries and pages, Core Web Vitals once field data exists, the AI prompt comparison table, GBP views and clicks, GA4 sessions and conversions, and what to fix. The client version (`qa/CLIENT-TWO-WEEK-NOTE.md`) is five to eight sentences in Andru's voice: what Google has picked up, the first searches that found them, what changed in the AI answers, and the one thing to do next.
