# Site launch checklist (master)

The checklist of record for `site-launch-qa`. Every finding in a report uses an ID from here. Project-specific checks live in the client repo's `qa/LAUNCH-QA.md` (P1, P2 ...) and are read alongside this file.

**Columns.** Sev: **B** Blocker, **H** High, **P** Polish. Phase: **Pre** (Vercel preview), **Day** (production, launch day), **2wk** (two weeks later). Fix: **Auto** (Claude fixes and logs it), **Ask** (goes on the approval list), **Andru** (only Andru or the client can do it), **Report** (record the result).

### Severity

| Level | Meaning | Launch impact |
|---|---|---|
| Blocker | Broken, embarrassing, loses leads, hides the site from search, or breaks a Google policy | Must be fixed and re-tested |
| High | A visitor, the client or a search engine would notice: missing meta, weak contrast, slow page | Fixed, or explicitly accepted by the client |
| Polish | A refinement | Fixed if time allows, otherwise logged |

### Test matrix

- **Widths:** 1440, 1280, 1024, 768, 600, 390, 360, plus a 320 reflow check (overflow only)
- **Browsers:** Chromium and WebKit (Safari's engine) in Playwright. One real iPhone check by Andru before sign-off
- **Key pages** (Lighthouse gate): home, About, Contact, Process if it exists, one page of each CMS type (one home, one community, one post), and every page the blueprint names as a priority. Listed in `qa/key-pages.txt`

---

## A. Repo and build hygiene

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| A1 | Dependencies install cleanly from the lockfile; Node version pinned (`.nvmrc` or `engines`) and matching Vercel | H | Pre | Report |
| A2 | `npm run build` passes | B | Pre | Ask |
| A3 | Build has zero warnings; `astro check` has zero errors | H | Pre | Auto when mechanical |
| A4 | No `console.log` or `debugger` in shipped code | H | Pre | Auto |
| A5 | No TODO or FIXME left in `src/` | P | Pre | Report |
| A6 | `npm audit --omit=dev`: zero critical in runtime dependencies | H | Pre | Ask |
| A7 | Production env vars set in Vercel (site URL, Sanity project and dataset, GA4, form settings) | B | Pre, Day | Andru |
| A8 | No secrets in client code: no token in a `PUBLIC_` variable, none in `dist/`, no `.env` file in git, no draft or preview token outside server-only code | B | Pre | Auto (remove), Andru (rotate) |
| A9 | Sanity client: right project ID and dataset, `apiVersion` pinned to a date, published perspective and stega off in production builds | H | Pre | Auto |
| A10 | `astro.config` `site` is the production origin (https, the chosen www or apex) | B | Pre | Auto |
| A11 | Trailing slashes consistent: `trailingSlash` set, canonicals, sitemap and internal links all use one style, the other style redirects in one hop | H | Pre | Auto |
| A12 | Integrations in use are installed and listed (sitemap, adapter, Sanity); none listed that are unused | P | Pre | Auto |
| A13 | Publishing in Sanity rebuilds production (webhook or deploy hook works) | H | Pre, Day | Andru |
| A14 | Vercel project: production branch is `main`, Git connected, preview deployments protected | H | Pre | Andru |
| A15 | Client invited to the Studio with the right role; repo, Vercel and Sanity ownership recorded in the client note | H | Day | Andru |

## B. Visual and functional

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| B1 | No horizontal scroll at any tested width | B | Pre | Ask |
| B2 | No clipped text, overlapping elements, or content cut off by `overflow: hidden` | B | Pre | Ask |
| B3 | In-between widths (1280, 1024, 600, 360) hold up, not only the design's breakpoints | H | Pre | Ask |
| B4 | Type steps down sensibly; body lines roughly 45 to 85 characters; no one-word orphans in headlines | P | Pre | Ask |
| B5 | Section spacing consistent across pages | P | Pre | Ask |
| B6 | Images load, keep their aspect ratio, crop on a sensible focal point (Sanity hotspot), and are sharp on retina | B (broken) / H | Pre | Ask |
| B7 | Nav: desktop links work; mobile menu opens, closes, closes on link tap and Escape, every link reachable | B | Pre | Ask |
| B8 | Sticky header does not cover anchor targets or headings | H | Pre | Auto (scroll-margin) |
| B9 | Hover, focus and pressed states on every interactive element; nothing important only appears on hover | H | Pre | Ask |
| B10 | Appear and scroll animations fire; nothing stays invisible; reduced motion respected | B | Pre | Ask |
| B11 | Galleries, lightboxes, accordions, carousels and tabs work with touch and keyboard, and close properly | H | Pre | Ask |
| B12 | Footer links and social icons correct; copyright year current | H | Pre | Auto (year) |
| B13 | Favicon (SVG plus a 48px-multiple PNG for Google results), apple-touch-icon | H | Pre | Auto when assets exist |
| B14 | Safari (WebKit): backdrop blur, sticky elements, video autoplay, gradients, fonts | H | Pre | Ask |
| B15 | Matches the approved design (Paper or Framer file) on desktop and phone | H | Pre | Ask |
| B16 | Every CTA and button goes where intended; no empty or `#` links | B | Pre | Auto when the target is unambiguous |
| B17 | Forms: required fields, validation messages, success and error states | B | Pre | Ask |
| B18 | Zero console errors and zero failed same-site requests on every page | H, gates launch | Pre, Day | Auto when mechanical |

## C. Content

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| C1 | No placeholder content: lorem ipsum, "Title", TBD, TODO, sample projects from the starter, example.com, 555 numbers, stock photos left in by mistake | B | Pre | Ask (never invent the replacement) |
| C2 | Spelling, grammar, names of people, places and communities correct | B | Pre | Auto (typos only) |
| C3 | No em dashes in copy, meta, alt text or schema | H | Pre | Auto |
| C4 | Consistent casing, number and date formats | P | Pre | Auto |
| C5 | Phone, email and address correct and identical everywhere; `tel:` uses +1 and digits, `mailto:` works | B | Pre | Auto (format), Ask (value) |
| C6 | Every review, testimonial, stat, award and license number is real, attributed and approved by the client; source recorded in `qa/LAUNCH-QA.md` | B | Pre | Andru |
| C7 | Legal pages present: privacy policy (required with forms or analytics) and terms; footer links to them | H | Pre | Ask |
| C8 | No links to staging, preview, `vercel.app`, the Studio or localhost | B | Pre | Auto |
| C9 | External links behave consistently; `target="_blank"` has `rel="noopener"` | P | Pre | Auto |
| C10 | Photo rights confirmed for every project photo (owned or licensed for web) | H | Pre | Andru |
| C11 | Copyright year and legal business name correct in the footer | P | Pre | Auto (year) |

## D. Sanity CMS

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| D1 | Every published document has its required fields; `npx sanity documents validate` is clean | B (rendered fields) / H | Pre | Ask |
| D2 | No orphaned drafts and no unpublished changes nobody meant to leave | H | Pre | Ask |
| D3 | No duplicate or empty slugs | B | Pre | Ask |
| D4 | No broken references | B | Pre | Ask |
| D5 | Every non-decorative image has alt text | H | Pre | Ask (drafted alt text, applied after approval) |
| D6 | Images used in cropped layouts have a hotspot | P | Pre | Ask |
| D7 | Schema validation protects the future: slug required and unique, alt required unless marked decorative, SEO title and description with length warnings, required fields on homes and communities | H | Pre | Auto |
| D8 | Studio deployed; client has an account with the right role | H | Pre | Andru |
| D9 | No test, sample or "Copy of" documents published | H | Pre | Ask |
| D10 | Public dataset leaks nothing: published documents hold nothing the client would not put on the site (internal notes, costs, old drafts of private pages) | H | Pre | Ask |

## E. Technical SEO

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| E1 | Unique title on every indexable page, about 50 to 60 characters, leads with what the page is about | H | Pre | Ask (drafted in Andru's voice) |
| E2 | Unique meta description on every indexable page, about 140 to 160 characters | H | Pre | Ask (drafted in Andru's voice) |
| E3 | One H1 per page; heading levels do not skip | H | Pre | Auto |
| E4 | Self-referencing absolute canonical on the production origin, matching the trailing slash style | B | Pre, Day | Auto |
| E5 | Sitemap lists every indexable page and CMS item on the production origin and nothing else (no noindex, redirected, 404 or utility pages); referenced in robots.txt | H | Pre, Day | Auto |
| E6 | robots.txt correct on production: allows crawling, has the Sitemap line | B | Pre, Day | Auto (structure), Ask (AI policy, see G6) |
| E7 | Previews are noindex (Vercel's `X-Robots-Tag: noindex`, plus the meta tag); production sends no noindex on indexable pages | B | Pre, Day | Auto |
| E8 | Custom 404 returns status 404, matches the site, links home | H | Pre | Auto |
| E9 | http to https and www to apex (or the reverse) end on one URL with permanent redirects in as few hops as Vercel allows; SSL valid on both hosts | B | Day | Andru |
| E10 | Every old-site URL 301s in one hop to its closest new page; no blanket redirects to the home page | B | Pre, Day | Ask |
| E11 | Open Graph and Twitter tags on every page; share image 1200x630, under 1 MB, absolute URL | H | Pre | Auto |
| E12 | No orphan pages; every home links to its community and every community lists its homes; key pages reachable within three clicks | H | Pre | Ask |
| E13 | Images: served through `astro:assets` or Sanity image params at the size shown, modern format, `width` and `height` set, descriptive file names where the pipeline allows | H | Pre | Auto |
| E14 | Below-the-fold images lazy; the LCP image eager with `fetchpriority="high"` | H | Pre | Auto |
| E15 | No accidental noindex on real pages; utility pages (thank-you, styleguide, funnels) noindex and out of the sitemap | B | Pre, Day | Auto |
| E16 | Every sitemap URL returns 200 directly | H | Pre, Day | Auto |
| E17 | Zero broken links, internal or external (bot-protected socials checked by hand) | B, gates launch | Pre, Day | Auto (internal), Ask (external) |
| E18 | `lang` on `<html>`, charset and viewport set | P | Pre | Auto |

## F. Structured data

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| F1 | Every page's JSON-LD parses; zero errors in the Schema.org validator and Google's Rich Results Test | B, gates launch | Pre, Day | Auto |
| F2 | Business node on the home page: `GeneralContractor` (the default), with `@id`, name, url, logo, image, telephone, address and `geo` (or `areaServed` only for a service-area business with a hidden address), `areaServed` for every blueprint service area, `sameAs` (GBP, Houzz, Facebook, Instagram, BBB), opening hours, founder | H | Pre | Auto (from site content) |
| F3 | WebSite node on the home page (name, url, publisher); no SearchAction unless the site has search | H | Pre | Auto |
| F4 | BreadcrumbList on every page below the home page, matching the URL path and any visible breadcrumbs | H | Pre | Auto |
| F5 | FAQPage wherever FAQs are visible, text identical to the page. Note: Google limits FAQ rich results to government and health sites, so this is for machines, not stars | H | Pre | Auto |
| F6 | Homes and communities described with real facts (CreativeWork or Article about the home, with `locationCreated`, `dateCreated`, images) | P | Pre | Auto from content |
| F7 | No self-serving review markup: no `aggregateRating` or `review` on the builder's own business node or pages. Visible testimonials stay; star markup goes | B | Pre | Auto (log removed values) |
| F8 | Schema values match the visible page and the Google Business Profile exactly: name, phone, address, hours, areas | H (B for phone) | Pre, Day | Auto (from the page), Andru (GBP) |
| F9 | Person node for the founder: name, jobTitle, image, `sameAs` (LinkedIn), `worksFor` the business `@id` | H | Pre | Auto |
| F10 | No production URLs missing, no preview URLs present, no deprecated types, no conflicting duplicate business nodes; pages that reference the business embed a short node (Google does not follow `@id` across pages) | H | Pre | Auto |

## G. AEO (AI answer engines)

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| G1 | Content is in the server-rendered HTML: headings, body copy, FAQ answers, NAP and home facts all present with `curl`, no JavaScript | B | Pre | Ask |
| G2 | Every FAQ answer is plain and direct: the first sentence answers the question, with a number, place or name where there is one | H | Pre | Ask |
| G3 | Each home and community page answers the questions a buyer asks an AI (who built it, where, size, style, build time, what made it hard, what it is like to live there) in text, not only in images | H | Pre | Ask (needs client facts) |
| G4 | Name, service areas, founder and history appear the same way on the site, in schema and on the GBP and main profiles | H | Pre, Day | Auto (site), Andru (profiles) |
| G5 | About page establishes the people and the history: founder's full name and photo, years building, license, associations (NAHB, local HBA), awards that are real | H | Pre | Ask, Needs client |
| G6 | AI crawler policy in robots.txt: default allows all, with GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended and Applebot-Extended named explicitly | H | Pre, Day | Ask |
| G7 | `llms.txt` built from Sanity (optional; never gates launch; low cost, no evidence it helps) | P | Pre | Auto when the site already has the pattern |
| G8 | Bing Webmaster Tools verified and the sitemap submitted (Bing's index feeds Copilot and is one of ChatGPT search's sources); IndexNow optional | H | Day | Andru |
| G9 | No firewall, bot protection or challenge page blocks search or AI crawlers (each user agent gets the same 200 page as a browser) | B | Pre, Day | Andru |
| G10 | Citable facts are text, not baked into images: service areas, years in business, number of homes, process steps, warranty | H | Pre | Ask |

## H. Local SEO and Google Business Profile

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| H1 | A page per blueprint service area with substance of its own (homes built there, lots, what building there involves). Swapping the town name on one template is a doorway page and breaks Google's spam policy | H | Pre | Ask |
| H2 | Address and phone on the site match the GBP character for character | B | Pre, Day | Andru |
| H3 | Contact page shows the service areas and, for a storefront business, a map or directions link | P | Pre | Ask |
| H4 to H13 | Google Business Profile checklist (`references/gbp-checklist.md`) | H | Day | Andru |

## I. Performance

| ID | Check | Target | Sev | Phase | Fix |
|---|---|---|---|---|---|
| I1 | Lighthouse mobile Performance on every key page (median of 3) | 95+ | H, gates launch | Pre, Day | Ask |
| I2 | Largest Contentful Paint | under 2.5s | H | Pre, Day | Ask |
| I3 | Cumulative Layout Shift | under 0.1 | H | Pre, Day | Auto |
| I4 | Total Blocking Time (lab) and INP (field, once there are visitors) | TBT under 200ms, INP under 200ms | H | Pre, Day, 2wk | Ask |
| I5 | Fonts self-hosted as woff2, the one or two above-the-fold files preloaded, `font-display` set | | H | Pre | Auto |
| I6 | Videos compressed (hero under about 3 MB), muted, `playsinline`, poster image, `preload="metadata"` or none | | H | Pre | Auto (attributes), Ask (re-encode) |
| I7 | Images sized for where they show; no lazy loading in the first screen | | H | Pre | Auto |
| I8 | Third-party scripts and embeds (maps, schedulers, video) load late or behind a facade | | H | Pre | Ask |
| I9 | Long cache headers on hashed assets and fonts | | P | Pre | Auto |
| I10 | Lighthouse Accessibility, Best Practices and SEO on every key page | 100 each | H, gates launch | Pre, Day | Auto when mechanical |

Ad pixels only load in production, so a preview can score 100 and production less. The Meta Pixel's third-party `fr` cookie alone caps Best Practices at about 79 and adds load time. If the client runs Meta ads, either load the pixel only on the ad landing pages or record an accepted exception in `qa/LAUNCH-QA.md`; never remove a pixel without asking, because ads depend on it.

## J. Accessibility

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| J1 | Zero critical or serious axe violations at 1440 and 390 | H, gates launch | Pre | Auto when mechanical |
| J2 | WCAG AA contrast (4.5:1 body, 3:1 large text and UI), including text over photos | H | Pre | Ask |
| J3 | Keyboard: logical tab order, visible focus on everything, skip link, menu operable and closes on Escape, no traps | H | Pre | Auto (focus styles), Ask (layout) |
| J4 | Every form field has a label (not only a placeholder), including embedded third-party forms | H | Pre | Auto (own forms), Report (embeds) |
| J5 | Works at 200% zoom and reflows at 320px without horizontal scroll | H | Pre | Ask |
| J6 | Reduced motion respected | H | Pre | Auto |
| J7 | Link and button names describe the action; icon-only buttons labeled | H | Pre | Auto |
| J8 | Alt text on meaningful images in code; empty alt on decorative ones | H | Pre | Auto |
| J9 | No flashing; no autoplay with sound; captions on video that carries information | H / P | Pre | Ask |
| J10 | Landmarks (header, nav, main, footer) and `lang` | P | Pre | Auto |

## K. Analytics and tracking

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| K1 | GA4 on production only, one `page_view` per load, nothing on previews | H | Pre, Day | Auto |
| K2 | Form submissions recorded as a GA4 key event (thank-you page view or the form tool's success event; an embedded form is cross-origin, so the site cannot see the submit directly) | H | Pre, Day | Ask |
| K3 | Search Console domain property verified (DNS TXT), owned by the client, Andru as user | H (B on launch day) | Pre, Day | Andru |
| K4 | Bing Webmaster Tools verified (import from Search Console) | H | Day | Andru |
| K5 | Each form submitted once with labeled test data, lands in the client's CRM, and the client's auto-reply (if any) arrives | B | Pre | Ask before submitting |
| K6 | `tel:` and `mailto:` clicks tracked as events | P | Pre | Ask |
| K7 | GBP website link carries UTM tags and shows up in GA4 | P | 2wk | Andru |

## L. AI answer testing

| ID | Check | Sev | Phase | Fix |
|---|---|---|---|---|
| L1 | 10 to 15 prompts built from the blueprint and confirmed by Andru, saved in `qa/ai-prompts.md` | H | Pre | Report |
| L2 | Baseline recorded for every prompt and engine: appears or not, what is said, competitors named, sources cited, date and method | H | Pre | Report |
| L3 | Re-run at the 2-week check and compared with the baseline | H | 2wk | Report |
| L4 | Nothing claimed that was not seen. A prompt not run is marked "not run", with the reason | B (rule) | All | Report |

---

## Launch gate (strict)

**READY TO LAUNCH** only when all of these hold:

- [ ] Lighthouse mobile, median of 3, every key page: Performance 95+, Accessibility 100, Best Practices 100, SEO 100 (I1, I10)
- [ ] Zero schema errors (F1), zero broken links (E17), zero console errors (B18)
- [ ] A unique title and meta description on every indexable page (E1, E2)
- [ ] Zero open Blocker items and zero open High items (High items the client accepted in writing count as closed; record the acceptance in `qa/LAUNCH-QA.md`)
- [ ] Every fix re-tested on a fresh preview
- [ ] Report saved in `qa/`

**READY AFTER FIXES:** the only open items are on the approval list or are quick fixes with a clear owner, and none needs client content.

**NOT READY:** an open Blocker needs real work or client input.
