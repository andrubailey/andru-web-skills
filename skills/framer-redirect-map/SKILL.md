---
name: framer-redirect-map
description: Build the old-URL to new-URL 301 redirect map for a website rebuild, ready to paste into Framer redirect settings, and verify it after launch. Use when Andru says "redirect map for [client]", "map the old URLs", or is about to launch a site that replaces an existing one.
---

# Redirect Map

A rebuild that drops its old URLs loses rankings and sends the client's existing links to a 404 page. This builds the map before launch and proves it after.

## 1. Get the old URLs

In priority order:

1. The old site's `sitemap.xml`:
   ```bash
   curl -s https://OLDSITE/sitemap.xml | grep -o "<loc>[^<]*" | sed 's/<loc>//' | sort -u > old-urls.txt
   ```
   Follow sitemap index files to their children.
2. A crawl of the old site, for pages missing from the sitemap.
3. Google Search Console export, if the client can share it. This is the best source because it shows which URLs actually get traffic and links.
4. Anything the client links from elsewhere: Google Business Profile, email signatures, print material, ad campaigns, social bios.

Note query strings, uppercase paths, trailing slashes, and `.html` endings. Those all need handling.

## 2. Get the new URLs

Pull the new page list from the Framer project (Pages panel plus CMS collection slugs), or from the new sitemap once it is published. Save as `new-urls.txt`.

## 3. Map them

For each old URL, pick a destination in this order:

1. **Exact equivalent.** Same page, new slug.
2. **Closest parent.** The service page that absorbed three old thin pages.
3. **Section landing page.** An old blog post with no replacement goes to the blog index, not the home page.
4. **Home page.** Last resort only. A wall of redirects to home reads as a mass redirect and helps nobody.

Rules:

- Redirect to a live page, never to another redirect, and never to a 404.
- Keep it a 301 (permanent) unless the old URL is genuinely coming back.
- Old CMS URLs that have real equivalents (blog posts, project pages) map item by item, not collection to collection.
- If the old site had pages that intentionally do not exist any more (a discontinued service), that is a decision for Andru or the client, not a silent redirect to home.
- Never redirect a page that still ranks or earns traffic without a real destination. Flag it instead.

Where slugs are similar, a fuzzy match speeds up the first pass, but every row gets human eyes before it ships.

## 4. Deliverable

Save `seo/REDIRECT-MAP.md` (plus `seo/redirects.csv` for the raw pairs) in the project folder:

```markdown
# Redirect Map: {Client} | {date}

Old URLs: {n} | Mapped: {n} | Needs a decision: {n}

## Mapped
| Old path | New path | Match type | Note |

## Needs a decision
| Old path | Why | Options |

## Deliberately dropped
| Old path | Reason |
```

Format the mapped rows as source and destination paths (no domain), which is what Framer's redirect settings take. Tell Andru where to paste them: Site Settings, Redirects.

## 5. Verify after launch

Once the new site is live on the production domain:

```bash
while read p; do
  curl -s -o /dev/null -w "$p -> %{http_code} %{redirect_url}\n" "https://DOMAIN$p"
done < old-paths.txt
```

Every line should read 301 and land on a 200 page. Chase down anything that returns 200 at the old path (redirect missing), 404, or a chain of more than one hop. Add the results to the report as a verification log, and re-check once more a week later.

Also worth doing at launch: submit the new sitemap in Search Console and watch coverage for two weeks.

House rules: no em dashes, flag rather than guess, never send anything to the client without Andru's review.
