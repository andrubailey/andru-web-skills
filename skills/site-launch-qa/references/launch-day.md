# Launch day

Run on the production domain once Andru has pointed it at Vercel and merged the QA branch. Never change DNS, domains or Vercel settings yourself; when something there is wrong, tell Andru exactly what to change and where. Every check below is read only.

## 1. Confirm what is live

- `curl -sI https://<domain>` shows `server: Vercel`, and the home page title matches the preview.
- `npx -y vercel@64.2.0 ls` shows a Production deployment from `main` at or after the QA branch's last commit. If the QA fixes are not on `main` yet, stop and tell Andru: the launch is running the old build.

## 2. Plumbing

```bash
node qa/tools/plumbing.mjs --domain <domain> --preview <latest preview URL> --old-urls qa/old-urls.txt --map qa/redirect-map.json
```

Covers E9 (variants, hops, SSL on apex and www), E7 (no noindex on production, previews still noindex), E6 (robots), G9 (bots get 200), E10 (old URLs). On Vercel, `http://www` takes two hops (https on the same host first); that one is expected.

## 3. Crawl production

```bash
node qa/tools/seo-audit.mjs --origin https://<domain> --prod https://<domain>
node qa/tools/schema-check.mjs
npx -y linkinator https://<domain> --recurse --skip "facebook.com|instagram.com|linkedin.com" --format CSV > qa/links-production.csv
```

Check against the pre-launch results: canonicals and sitemap now on the production origin and returning 200 directly (E4, E5, E16), no page unexpectedly noindex (E15), schema URLs on production (F10), zero broken links (E17). Run the Rich Results Test on the live home page and one home page (URL tab now works).

## 4. Analytics

Open the home page and contact page in the built-in browser and confirm one GA4 `page_view` each (read the network requests for `collect?...en=page_view`). Ask Andru to open GA4 Realtime and confirm he sees the visit. Do not submit a form on launch day unless Andru asks; the pre-launch submissions already proved delivery. If the conversion is a thank-you page, load that page directly once and ask Andru to confirm the key event in GA4 DebugView or Realtime.

## 5. Speed on production

```bash
node qa/tools/lighthouse.mjs qa/key-pages.txt --psi --runs 3
```

PageSpeed Insights runs on Google's servers against the live CDN, so this is the score of record. Expect production to differ from the preview where tracking only loads in production (analytics, ad pixels): compare the two tables and name the script behind any drop. If the PSI quota is used up and there is no `PSI_API_KEY`, use local Lighthouse and say so in the report.

## 6. Walk Andru through submissions

These need his Google and Microsoft logins, so he does them; give him numbered steps in plain text:

1. **Search Console** (search.google.com/search-console). If the domain property is not there yet: Add property, Domain, copy the TXT record, add it at the DNS host (he does this; it does not change where the site points), Verify. Then:
   - Sitemaps: submit `https://<domain>/sitemap-index.xml` (or `sitemap.xml`, whichever the site serves).
   - URL Inspection: paste each key page URL, then Request indexing. List the exact URLs for him: home, About, Contact, each service area page, the two or three best homes.
   - Users and permissions: the client as owner, Andru as full user.
2. **Bing Webmaster Tools** (bing.com/webmasters): Sign in, Import from Google Search Console (fastest; it brings the site and sitemap), or add the site and verify. Then submit the sitemap and use URL Submission for the same key pages.
3. **Google Business Profile:** change the website link to the new domain with the UTM tags from the GBP checklist (H8), and post an update with a finished home.
4. **Optional, IndexNow:** only if the site already has the key file set up.

Record in `launch-state.json` what he confirms he submitted and when.

## 7. Report and reminder

Append the launch-day section (template in report-templates.md) to the latest `qa/LAUNCH-QA-*.md`, update `launch-state.json`, and commit on a branch for Andru to merge (or on `main` only if he says so). Verdict:

- **LIVE AND CLEAN:** everything above passes.
- **LIVE WITH ISSUES:** live and indexable, with items to fix this week (list them with owners).
- **ROLL BACK:** the site is broken, unindexable or losing leads (forms down, noindex on production, the domain on the wrong project). Tell Andru immediately what you see; the rollback itself is his call and his action.

Then offer to set a reminder for the 2-week check (a scheduled task or a calendar event, whichever Andru prefers), due 14 days after launch.
