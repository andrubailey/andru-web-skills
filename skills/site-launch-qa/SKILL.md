---
name: site-launch-qa
description: Launch QA for Andru Bailey's Astro + Sanity + Vercel client sites, with a heavy focus on SEO and AEO (being the builder Google, ChatGPT, Perplexity and AI Overviews find and recommend). Runs in three phases: a deep pre-launch audit on the Vercel preview with safe auto-fixes on a branch, an approval list and a dated report; a launch-day check on the production domain; and a 2-week follow-up with Search Console and AI answer re-tests. Use it whenever Andru says a build is approved, asks to QA, audit, launch-check or "get ready to launch" a client site, asks whether a site is ready to go live, says it's launch day, or asks for the 2-week check, even if he doesn't name the skill. Also use it to resume a launch in progress (a repo with qa/launch-state.json). Replaces framer-launch-qa.
---

# Site Launch QA

Get a client's site as close to perfect as possible before it goes live, then confirm it landed. The sites are Astro + Sanity on Vercel, built for custom home builders (homes around $1M and up). The job has two halves: the site has to work flawlessly for a buyer, and it has to be the builder that search engines and AI answer engines understand and recommend for the client's service areas. Most of this skill is the second half, because that is where launch QA usually stops short.

It runs in Claude Code inside the client's repo, in three phases:

| Phase | Where | When |
|---|---|---|
| **Pre-launch** | The Vercel preview of a QA branch | When the client approves the build |
| **Launch day** | The production domain | The day the domain points at Vercel |
| **2-week check** | Production, Search Console, AI engines | About 14 days after launch |

## Rules that do not bend

These protect the client, Andru's reputation and the live site. Each one has bitten someone before.

- **Never deploy to production, never push to `main`, never change DNS or domains.** All code fixes go on a branch; Andru merges. A broken production deploy or a domain change can take a live business offline, and on Andru's own site paid ads run to `/go`.
- **Never invent client content.** No reviews, stats, awards, license numbers, build times, prices or facts about a home that the client did not supply. A made-up fact on a builder's site is a legal and trust problem, and AI engines will repeat it. Missing content goes to "Needs client input".
- **Forms: ask first, submit once.** List the forms, ask Andru, submit each once with labeled test data, say exactly which ones were submitted. Never submit anything on andrubailey.com or through its `/go` funnel.
- **Never claim an AI answer or a search result you did not see.** If a prompt could not be run, write "not run" and why. A baseline that was guessed is worse than none, because the 2-week comparison depends on it.
- **No prices that are not already public.** Do not add prices to pages, schema (`priceRange`, `Offer`) or `llms.txt` unless the client already publishes them. On andrubailey.com, none of Andru's own fees appear anywhere public, including published Sanity documents.
- **Secrets stay secret.** Never print a token. The preview bypass secret is only ever sent to the preview's own host (the scripts handle this). Content edits use `--with-user-token`, so no Sanity token is stored.
- **No em dashes** anywhere: site copy, alt text, meta, schema, reports, chat. Use a comma, colon, period or parentheses.
- **Copy in Andru's voice.** Anything written for the site or the client (meta titles and descriptions, FAQ rewrites, the client summary) is drafted with the `andru-voice` skill and goes on the approval list, never straight onto the site.
- **Andru often works over Remote Control.** Put every question and its choices in plain text in the message, numbered, with a recommended answer, so he can reply "1 yes, 2 b".

## 0. Which phase

Read `qa/launch-state.json` (shape in [references/state.md](references/state.md)). An argument wins over detection: `/site-launch-qa pre-launch`, `launch-day` or `two-week`.

- No state file: **pre-launch**.
- Pre-launch done, and the production domain now serves this Vercel project (`curl -sI https://<domain>` shows `server: Vercel` and the page matches the preview): **launch day**.
- Pre-launch done but the domain still serves the old site: say so, show the open items from the last pre-launch round, and offer a re-test round (round 2) instead.
- Launch day done, 12 or more days ago: **2-week check**. Fewer than 12 days: say how many are left and offer to run it early or set a reminder.

Say which phase you detected in one line before starting.

## 1. Checklist of record

[references/checklist.md](references/checklist.md) is the master list: IDs, severities, phases, fix rules and the launch gate. Read it every run. Then read the project's `qa/LAUNCH-QA.md` (copied from [assets/LAUNCH-QA.md](assets/LAUNCH-QA.md) on the first run): project-specific checks (P1, P2 ...), items marked N/A with a reason, and High items the client has accepted. Both together are the checklist for this site.

## 2. Intake (first pre-launch run)

The keywords, service areas and priorities come from the client's Craft Audit blueprint. Collect them into `qa/launch-inputs.json` (shape in [assets/launch-inputs.example.json](assets/launch-inputs.example.json)) and ask Andru only for what is missing.

Where to look, in order:
1. **The blueprint.** A TypeScript file in `~/Sites/andrubailey-astro-blueprints/src/blueprints/<slug>.ts` (rendered at `andrubailey.com/blueprints/<slug>`), or a URL Andru gives. Its fields have no dedicated SEO block, so read the text: service areas and neighborhoods (often in quick wins and the GBP channel notes), home types and the buyer (`snapshot`), competitors (`snapshot.strip`), the three things and priorities, the GBP state (`channels`), what the homes pages need (`homes`).
2. **The client note** in `~/Web Design Business/Clients/<Client>.md`: domain, old site, contacts, Vercel and Sanity IDs.
3. **The repo:** `CLAUDE.md`, `astro.config.*`, `.vercel/project.json`, `vercel.json`, Sanity site settings (name, phone, email, address, social links).
4. **The old site**, if one exists. Its sitemap only lists what it lists today, so also pull every URL the Wayback Machine has archived (free, no key):
   ```bash
   curl -s "https://web.archive.org/cdx/search/cdx?url=<old-domain>/*&output=txt&fl=original&collapse=urlkey&limit=2000&filter=statuscode:200" \
     | sed -E 's#^https?://(www\.)?<old-domain>##; s#\?.*$##; s#/$##' \
     | grep -v -E '\.(js|css|png|jpe?g|webp|gif|svg|woff2?|json|ico|xml|txt|mp4|pdf)$' | sed 's#^$#/#' | sort -u > qa/old-urls.txt
   ```
   Old Framer and Webflow sites often have pages nobody remembers (old proposals, drafts, renamed slugs). Each one gets a decision on the approval list: redirect it, or let it 404. Private pages that the archive has kept public (proposals with prices, client drafts) go to "Needs Andru": the site cannot remove them; archive.org takes removal requests from the site owner.

Then write a short intake summary for Andru: what you found and where, then one numbered list of what is missing. Typical gaps: production domain and the www or apex choice, preview URL, old site URL, each form and where it delivers, GA4 ID, GBP URL, the founder's full name and history, which reviews and stats the client approved, photo rights, target searches the blueprint does not cover. Record each value's source in the inputs file. Do not start the audit until Andru confirms the inputs, because every SEO and AEO check is measured against them.

## 3. Setup

1. **Branch.** `git switch -c qa/launch-<YYYY-MM-DD>` from the approved build. All fixes go here.
2. **Tools.** From the repo root: `bash <this skill>/scripts/setup.sh`. It copies the scripts to `qa/tools/`, installs Playwright and axe there (not in the site's `package.json`), copies the templates, and writes `qa/.gitignore` so screenshots and raw JSON stay out of git while reports and state are committed.
3. **Preview access.** Previews sit behind Vercel Authentication. Browser checks need the project's Protection Bypass for Automation secret in `.env.local` as `VERCEL_AUTOMATION_BYPASS_SECRET`. Do not try to read it from the Vercel API yourself; ask Andru to copy it from Vercel (Project Settings, Deployment Protection, Protection Bypass for Automation) into `.env.local`. Curl-only checks can use `npx -y vercel@64.2.0 curl <path> --deployment <url>`, which needs no secret.
4. **PageSpeed Insights.** The keyless quota is shared and often used up. A free key from Google Cloud in `.env.local` as `PSI_API_KEY` makes `--psi` reliable. Without one, use local Lighthouse and say so.
5. **Fresh preview.** Push the branch (`git push -u origin <branch>`; never main) and get its preview URL from `npx -y vercel@64.2.0 ls`. Test that URL, not an older one.
6. **Lists.** `qa/key-pages.txt` (the Lighthouse gate pages, see the checklist's test matrix) and `qa/old-urls.txt` (old site paths, if any).

## 4. Pre-launch audit

Run the scripts, then do the parts only judgment can do. The scripts produce *candidates*: read each one against the page before it becomes a finding, because heuristics misfire (a hover reveal is not a stuck animation; a 403 from Facebook is bot protection, not a dead link). Run long scripts in the background.

| Step | Run | Covers |
|---|---|---|
| a. Repo | `bash qa/tools/repo-hygiene.sh` | A1 to A12 |
| b. Crawl (no JavaScript) | `node qa/tools/seo-audit.mjs --origin <preview> --prod https://<domain>` | C1, C3, C5, C8, E1 to E18, G1, G6, G9, I5 to I8, J8 |
| c. Structured data | `node qa/tools/schema-check.mjs` | F1 to F10 |
| d. Browser | `node qa/tools/scan.mjs qa/urls.txt` | B1 to B18, I6, I7, J1, J3, J5, K1 |
| e. Lighthouse | `node qa/tools/lighthouse.mjs qa/key-pages.txt --runs 3` | I1 to I4, I10 |
| f. Sanity | from the folder with `sanity.cli.ts`: `npx sanity exec <repo>/qa/tools/sanity-audit.mjs --with-user-token`, then `npx sanity documents validate -y` | D1 to D6, D9, D10 |
| g. Old URLs | `node qa/tools/plumbing.mjs --base <preview> --old-urls qa/old-urls.txt` (and `--map qa/redirect-map.json` once a map exists) | E10 |

Then, by hand:

- **Production robots and noindex logic (E6, E7, G6).** A preview's robots.txt is the preview version, so read the source instead: the robots route (`src/pages/robots.txt.ts`) or `public/robots.txt`, and the noindex logic in the base layout. Production must allow crawling, carry the Sitemap line and the AI crawler policy; previews must disallow everything and stay noindex. If a static `public/robots.txt` serves the same file everywhere, the preview is indexable.
- **Structured data, Google's view (F1).** Run the Rich Results Test (search.google.com/test/rich-results) in the built-in browser on the home page, one home and one FAQ page. On a protected preview, use the Code tab and paste the page's JSON-LD. Save what the result page says (`get_page_text`) to `qa/rich-results-<page>.txt`, because a pass that is not saved cannot be shown later. If Google shows a CAPTCHA or will not take the code, stop, say so, and give Andru the URLs; do not try to get around it. Check the business node against [references/schema-patterns.md](references/schema-patterns.md).
- **Visual review (B1 to B15).** Read the screenshots in `qa/shots/` for every page at every width and judge them like a senior designer: clipping, overlap, crops, rhythm, orphans, Safari differences, match with the approved design file. Then test what scripts cannot: the mobile menu with a real tap, anchors under the sticky header, galleries and lightboxes, accordions, keyboard tab order on one full page, 200% browser zoom on two pages.
- **Content read-through (C, G2, G3, G5, G10, H1).** Read the text of every page (it is in `qa/seo.json`). Check names, places and facts against the blueprint and client note. Ask of each home and community page: could an AI answer "who built this, where, how big, how long, what was hard" from this text alone? Read every FAQ answer: does its first sentence answer the question? See [references/aeo.md](references/aeo.md) for what good looks like and what has evidence behind it.
- **Sanity schemas (D7).** Read the schema files (`src/sanity/schemaTypes`, or `studio/schemaTypes` in the starter). Every routable type needs a required, unique slug; every image field needs alt text required unless marked decorative; SEO title and description need length warnings; homes and communities need their key facts required. These are code, so they are auto-fixed (patterns in [references/sanity.md](references/sanity.md)).
- **Local SEO and GBP (H).** Check a page exists for each blueprint service area with real substance. Prepare the GBP checklist for Andru from [references/gbp-checklist.md](references/gbp-checklist.md), filled with this client's values.
- **Analytics and forms (K).** GA4 should be absent on the preview and present once on production (the scan logs analytics requests). Then list every form with its destination and ask Andru in one message before submitting any. On his yes, submit each once with "QA TEST, please ignore" as the name and message and `qa+<client>@andrubailey.com` (or what Andru specifies) as the email. Record each in the state file and tell Andru which to look for in the client's CRM.
- **AI answer baseline (L).** Follow [references/ai-answer-testing.md](references/ai-answer-testing.md): build 10 to 15 prompts from the blueprint, confirm them with Andru, run what you can, hand him the rest.

## 5. Log findings

Every finding gets: checklist ID, severity, page, breakpoint and browser where it matters, the element (selector or visible text), evidence (screenshot path, script field, Lighthouse audit, quoted text) and the fix. One cause that shows on eight pages is one finding listing the eight pages. Nothing vague: "the services cards' CTA is invisible on touch at 390 and 360 on `/`" is a finding; "some mobile issues" is not.

## 6. Auto-fix on the branch

Fix directly, commit in small commits with plain-English messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and log each under "Fixed by Claude":

- Typos (not rewording), em dashes (least change in meaning), heading levels
- Alt text in code where the image's meaning is clear from context; empty alt on decorative images
- Broken internal links, links to staging or preview hosts, missing canonical, Open Graph and Twitter tags
- JSON-LD built only from content already on the site or in Sanity (never from facts that are not there)
- Sitemap and robots.txt structure (not the AI crawler policy), including keeping previews out of search: a robots route that blocks everything unless `VERCEL_ENV === 'production'` and a matching noindex meta tag in the base layout. Production output must not change; build both ways to prove it
- Self-serving review markup (`aggregateRating` or `review` on the builder's own business node): remove it and log the removed values, so Andru can restore them. This one is not left for approval, because fixing anything else in that JSON-LD (a syntax error, say) would put the rating in front of Google for the first time. Visible testimonials stay exactly as they are
- Sanity schema validation rules
- The copyright year
- Mechanical performance and accessibility fixes: image `width`/`height`, lazy and eager loading, `fetchpriority`, video `muted`/`playsinline`/`poster` attributes, font preloads, focus styles, `aria-label` on icon buttons, `scroll-margin-top` under a sticky header

After fixing: `npm run build`, push the branch, wait for the new preview, re-run every check the fixes touched, and log the result in the re-test log.

## 7. Approval list

Everything else goes into one numbered list, sent once, after the audit. Group by type and give each item the finding ID, what changes, and a recommendation:

- New or rewritten copy, including the drafted titles and descriptions (draft them with `andru-voice`; show current and proposed side by side with character counts)
- New pages and layout changes
- Redirects and slug changes
- The robots.txt AI crawler policy (default: allow all, crawlers named explicitly)
- Anything touching the client's CMS content: drafted alt text for Sanity images, filled SEO fields, deleting test documents, publishing drafts

Andru answers by number. Apply what he approves. Code changes go on the branch. Sanity content changes go through a script in `qa/tools/` run with `npx sanity exec <script> --with-user-token`, which patches only the approved fields and prints what it changed. Anything for the client goes under "Needs client input" in the report, phrased so Andru can forward it.

## 8. Report, client summary and state

Write three files (templates in [references/report-templates.md](references/report-templates.md)):

1. `qa/LAUNCH-QA-YYYY-MM-DD.md` for Andru: verdict and counts, the Lighthouse table, the SEO/AEO scorecard, Fixed by Claude, Needs Andru, Needs client input, Passed, and the re-test log.
2. `qa/CLIENT-LAUNCH-SUMMARY.md` for the client: one page, plain words, Andru's voice (use `andru-voice`). What was checked, where they stand on Google and AI search at launch, what gets checked in 2 weeks. No jargon, no checklist IDs, no scores without a plain meaning next to them. Offer a Gmail draft only if Andru asks; never send it.
3. `qa/launch-state.json`: findings with status, approvals, forms submitted, Lighthouse medians, the AI baseline file, the branch and commit tested.

Verdict, from the launch gate in the checklist:
- **READY TO LAUNCH:** every gate condition holds.
- **READY AFTER FIXES:** open items are only on the approval list or are quick fixes with a clear owner, and none needs client content.
- **NOT READY:** an open Blocker needs real work or client input.

Commit the reports and state on the branch. Then close in chat with: the verdict, counts by severity, the top three open items, the approval list (if not already sent) and the one thing Andru should look at himself.

## 9. Launch day

Follow [references/launch-day.md](references/launch-day.md): domain, SSL, redirects, canonicals, sitemap, robots, noindex removed, schema, analytics, Lighthouse on production through PageSpeed Insights, then walk Andru through Search Console and Bing Webmaster Tools submissions. Update the state and append to the report.

## 10. Two-week check

Follow [references/two-week.md](references/two-week.md): Search Console coverage, indexing and first queries, crawl errors, the AI prompts re-run against the baseline, the GBP link and views, and a short follow-up for the client.

## Re-test rounds

A second pre-launch run on the same site is a re-test round: read the latest `qa/LAUNCH-QA-*.md` and the state file, re-test every open item first, then re-run the full scripts (a fix can break something else). Number the round in the report title.
