# Framer Launch QA Checklist

The checklist of record for a deep pre-launch QA round on a Framer site. Drop a copy of this file into each project folder (root or `qa/`) and add project-specific items at the bottom. The `framer-launch-qa` skill in Claude Code reads it automatically when present.

**Goal:** when every Blocker and High item passes, the site is ready to publish on the production domain.

---

## How to use

1. Fill in the **Project inputs** below.
2. Work top to bottom. Each item has an ID (e.g. `B3`) so the QA report can reference it.
3. Mark each item: `PASS`, `FAIL`, `FIXED`, or `N/A`.
4. Log every `FAIL` in the QA report with page, breakpoint, evidence, and fix.
5. Re-test anything fixed after the next publish.

### Severity

| Level | Meaning | Launch impact |
|---|---|---|
| **Blocker** | Broken, embarrassing, loses leads, or hurts search (broken form, placeholder text, missing redirects, horizontal scroll on phone) | Must fix before launch |
| **High** | Noticeable to visitors or the client (clipped text, weak contrast, missing meta, slow LCP) | Fix before launch unless the client signs off |
| **Polish** | Refinement (orphan words, inconsistent spacing, minor animation timing) | Fix if time allows, log the rest |

### Test matrix

- **Framer breakpoints:** Desktop 1200, Tablet 810, Phone 390
- **Widths to test:** 1920, 1440, 1280, 1200, 1024, 900, 810, 768, 600, 430, 390, 375, 360 (the in-between widths catch layouts that only look right at the exact breakpoint)
- **Browsers:** Chrome, Safari (macOS + iOS), Firefox, Edge
- **Real devices:** at least one iPhone and one Android phone before sign-off

---

## Project inputs

| Field | Value |
|---|---|
| Client / site | |
| Framer project link | |
| Staging URL (`*.framer.website` / `*.framer.app`) | |
| Production domain | |
| Old site URL (for redirects) | |
| Figma / design source | |
| Form destinations (email, webhook, CRM) | |
| Analytics tool | |
| Pages or sections out of scope | |
| QA round # / date | |

---

## A. Project hygiene (Framer canvas)

| ID | Check | Sev |
|---|---|---|
| A1 | Every page in the Pages panel is meant to ship. No "Page Copy", test pages, or abandoned drafts left published | High |
| A2 | Page slugs are lowercase, hyphenated, meaningful (`/about`, not `/page-2` or `/about-copy`) | High |
| A3 | Home page is the correct page | Blocker |
| A4 | No leftover test layers, off-canvas debris, or "Frame 42" sections inside shipped pages | Polish |
| A5 | Buttons, nav, cards, footer are component instances, with hover/pressed/active variants built consistently | High |
| A6 | Text styles and color styles used on key elements (no stray one-off font sizes or hex values in headings/buttons) | Polish |
| A7 | All fonts load; uploaded custom fonts are licensed for web; weights used actually exist | High |
| A8 | Site plan supports the custom domain and the "Made in Framer" badge is off | Blocker |
| A9 | Password protection is off for production (only on for private staging if intended) | Blocker |
| A10 | If Locales are used, every string and CMS field is translated and the locale switcher works | High |

## B. Visual and responsive

| ID | Check | Sev |
|---|---|---|
| B1 | No horizontal scroll at any tested width | Blocker |
| B2 | No clipped text (fixed-height text layers), overlapping elements, or content cut off by `overflow: hidden` | Blocker |
| B3 | In-between widths (1024, 900, 600, 430) hold up, not just exact breakpoints | High |
| B4 | Type scale steps down sensibly; body line length roughly 45 to 85 characters; no single-word orphans in headlines | Polish |
| B5 | Section padding and spacing rhythm consistent across all pages | Polish |
| B6 | Images keep aspect ratio, crop with a sensible focal point on each breakpoint, and look sharp on retina | High |
| B7 | Nav: desktop links work; mobile menu opens, closes, closes on link tap, locks page scroll, and every link is reachable | Blocker |
| B8 | Sticky nav does not cover anchor-link targets or headings | High |
| B9 | Hover, focus, and pressed states on every interactive element; pointer cursor on clickable items | High |
| B10 | Appear/scroll effects fire reliably; nothing stays stuck at opacity 0; animations are smooth on mobile | Blocker |
| B11 | Overlays, modals, carousels, tickers, tabs, accordions work with touch and close properly | High |
| B12 | Footer links and social icons correct; copyright year is current | High |
| B13 | Favicon shows in the browser tab (light and dark tab bars) | High |
| B14 | Safari check: backdrop blur, sticky elements, video autoplay, gradients, and fonts render correctly | High |
| B15 | Matches the approved design (Figma) on desktop and phone | High |

## C. Content and copy

| ID | Check | Sev |
|---|---|---|
| C1 | No placeholder content: lorem ipsum, "Title", "Heading", "Button", "Your text here", TBD, TODO, XXX, example.com, 555 numbers, stock images left in by mistake | Blocker |
| C2 | Spelling and grammar clean; client, brand, and product names spelled and capitalized consistently | Blocker |
| C3 | No em dashes in copy (house style). Replace with commas, colons, periods, or parentheses | High |
| C4 | Consistent casing (title vs sentence case) in headings and buttons; consistent numbers, dates, units | Polish |
| C5 | Contact details accurate: phone uses `tel:`, email uses `mailto:`, address and map link correct | Blocker |
| C6 | Every CTA has a working destination; primary CTA matches the sales goal; button labels are specific | Blocker |
| C7 | No broken internal or external links; anchor links land on the right section | Blocker |
| C8 | No links pointing at the staging domain (`*.framer.website`, `*.framer.app`) or the Framer editor | Blocker |
| C9 | External links open in a new tab where intended | Polish |
| C10 | Forms: every form submits, reaches the right email/webhook/CRM, shows a success state, validates required fields and email format. Test with a real submission marked "QA TEST" and confirm receipt | Blocker |
| C11 | CMS: every item has all fields filled (no blank rendered areas), images present, clean slugs, correct sort order, references resolve, list and detail pages render | Blocker |
| C12 | CMS draft items are not published unintentionally | High |
| C13 | Testimonials, logos, stats, and case study claims are real and client-approved | Blocker |
| C14 | Legal pages present as needed: privacy policy (required if forms or analytics), terms, cookie consent if tracking requires it | High |

## D. SEO and technical

| ID | Check | Sev |
|---|---|---|
| D1 | Every page has a unique title (about 50 to 60 characters) and meta description (about 140 to 160) | High |
| D2 | CMS detail pages pull title and description from CMS fields | High |
| D3 | Social share image set site-wide and on key pages (1200 x 630); preview looks right | High |
| D4 | Exactly one H1 per page; heading levels logical. In Framer, set the heading tag on the text layer (visual size does not set the tag) | High |
| D5 | Meaningful images have descriptive alt text; decorative images have empty alt | High |
| D6 | Site language set in Site Settings | Polish |
| D7 | Custom domain connected, SSL valid, `http` redirects to `https`, www and apex redirect one way to the primary | Blocker |
| D8 | Canonical tags point to the production domain, not staging | Blocker |
| D9 | `/sitemap.xml` lists every intended page and nothing that should be hidden | High |
| D10 | `robots.txt` allows indexing; no `noindex` on real pages; utility pages (thank-you, legal, search) excluded from search as intended | Blocker |
| D11 | Redirects: every old-site URL 301s to its closest new equivalent (Site Settings, Redirects). Test each one | Blocker |
| D12 | Custom 404 page exists, is on brand, and links home | High |
| D13 | Analytics installed and firing once (no duplicates); form submissions tracked as conversions where set up | Blocker |
| D14 | Search Console verification ready (meta tag or DNS) | High |
| D15 | Custom code in head/body is valid and throws no console errors | High |
| D16 | Structured data (Organization or LocalBusiness) added where relevant and validates | Polish |
| D17 | No JavaScript console errors on any page | High |

## E. Performance

Run Lighthouse in **mobile** mode on the home page plus the 2 to 3 most important pages.

| ID | Check | Target | Sev |
|---|---|---|---|
| E1 | Lighthouse Performance | 90+ (80 minimum) | High |
| E2 | Lighthouse Best Practices | 95+ | High |
| E3 | Lighthouse SEO | 100 | High |
| E4 | Largest Contentful Paint | under 2.5s | High |
| E5 | Cumulative Layout Shift | under 0.1 | High |
| E6 | Total Blocking Time | under 200ms | High |
| E7 | Source images sized sensibly (no multi-MB PNG photos; hero source roughly 500KB or less) | | High |
| E8 | Videos compressed, muted for autoplay, have a poster frame, and are light on mobile | | High |
| E9 | Font families and weights kept lean | | Polish |
| E10 | Heavy embeds (maps, schedulers, video players) load lazily | | Polish |
| E11 | Heavy effects (large blurs, many parallax layers, 3D) do not tank mobile | | High |

## F. Accessibility

| ID | Check | Sev |
|---|---|---|
| F1 | Lighthouse Accessibility 95+ and zero critical/serious axe violations | High |
| F2 | Color contrast meets WCAG AA (4.5:1 body text, 3:1 large text and UI elements), including text over images | High |
| F3 | Keyboard only: tab through every page, focus is visible, order is logical, mobile menu is operable, no traps | High |
| F4 | Links and buttons have descriptive names; icon-only buttons have labels; no "click here" | High |
| F5 | Every form input has a label (not placeholder-only) | High |
| F6 | Page zoomed to 200% keeps content readable with no loss | Polish |
| F7 | Nothing flashes; motion is not excessive; no autoplay with sound | High |
| F8 | Videos that carry information have captions | Polish |

## G. Launch gate

The site is **ready to publish** when:

- [ ] All Blockers are PASS or FIXED and re-tested
- [ ] All High items are PASS, FIXED, or explicitly accepted by the client
- [ ] Polish items are fixed or logged for a follow-up round
- [ ] Final QA report saved in `qa/`

---

## Project-specific checks

Add anything unique to this site here (integrations, gated content, booking tools, calculators, multi-language rules, client requests).

| ID | Check | Sev |
|---|---|---|
| P1 | | |

---

## QA report template

Save as `qa/QA-REPORT-YYYY-MM-DD.md`.

```markdown
# QA Report: {Site} | {YYYY-MM-DD} | Round {n}

**Verdict:** READY TO PUBLISH / READY AFTER FIXES / NOT READY
**Scope:** {URLs audited} | widths {list} | browsers {list}
**Tools:** Framer MCP, Playwright scan, Lighthouse, linkinator, axe

## Summary
| Severity | Found | Fixed by Claude | Open |
|---|---|---|---|
| Blocker | | | |
| High | | | |
| Polish | | | |

## Lighthouse (mobile)
| Page | Perf | A11y | Best Pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|

## Fixed by Claude
| ID | Page / breakpoint | Issue | Change made |
|---|---|---|---|

## Needs Andru (in Framer)
| ID | Sev | Page / breakpoint | Issue | Evidence | How to fix |
|---|---|---|---|---|---|

## Needs client input
| ID | Page | Question / missing content |
|---|---|---|

## Passed
{Checklist IDs that passed}

## Re-test log
| Date | IDs re-tested | Result |
|---|---|---|
```
