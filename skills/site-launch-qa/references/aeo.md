# AEO: what matters, and how sure we are

AEO here means being the builder that Google (including AI Overviews and AI Mode), ChatGPT, Perplexity, Copilot and Claude find, understand and name for the client's areas. Andru asked for honesty about what is proven, so every recommendation carries one of these labels, and the report uses them too:

- **Documented:** the company running the engine says so in its own docs.
- **Measured:** independent studies or log analysis show it.
- **Plausible:** follows from how these systems work, with little direct proof.
- **No evidence:** cheap to do, but nothing shows it helps.

Last reviewed October 2026. Re-check anything marked Documented if a run finds the vendor's docs have changed.

## The short version

AI answer engines mostly work like search engines with a writer on top: they search an index (their own, Google's or Bing's), read the pages they find, and summarize. So nearly all of AEO is ordinary technical and local SEO done thoroughly, plus content that answers questions in plain text. The site-side checks below are what this skill can control. Third-party signals (reviews, Houzz, local news, association directories, Reddit threads) carry a lot of weight in AI answers but are outside this skill; mention them in the client summary as what comes next.

## What to check, with the evidence

| Check | Why | Evidence |
|---|---|---|
| Pages are indexed by Google and eligible for a snippet (G1, E series) | Google says AI Overviews and AI Mode have no extra technical requirements beyond normal Search eligibility, and no special schema is needed | **Documented** (Google Search Central, "AI features and your website") |
| Content is in the server-rendered HTML (G1) | GPTBot, ClaudeBot and PerplexityBot fetch HTML but do not run JavaScript, so content rendered only by client JavaScript is invisible to them | **Measured** (Vercel and MERJ crawler analysis, December 2024; Google's own crawler does render) |
| AI search crawlers allowed in robots.txt (G6) | OpenAI says sites that block OAI-SearchBot will not be shown in ChatGPT search answers; Anthropic and Perplexity document their own bots the same way | **Documented** (OpenAI, Anthropic, Perplexity bot docs) |
| Google-Extended and other training bots | Blocking Google-Extended does not change Google Search or AI Overviews (those use Googlebot). Allowing training bots is the default because a builder wants models to already know the name | Effect on Search: **Documented**. Benefit of allowing training: **Plausible** |
| No firewall or challenge page blocking bots (G9) | A crawler that gets a challenge page indexes nothing | **Documented** (each bot's docs list the user agent and IP ranges to allow) |
| Bing indexing and Bing Webmaster Tools (G8) | Copilot runs on Bing; ChatGPT search draws on third-party search providers including Bing | Copilot: **Documented**. ChatGPT and Bing: **Measured / reported** |
| Structured data that matches the page (F series) | Google uses it to understand entities and for rich results, and requires it to match visible content | Rich results and the policy: **Documented**. Direct effect on AI answers: **Plausible** |
| FAQ markup | Valid and machine-readable, but Google shows FAQ rich results only for government and health sites since 2023 | **Documented** |
| Self-serving review markup is removed (F7) | Not eligible for stars since 2019; can read as manipulation | **Documented** |
| Name, address, phone and service areas identical everywhere (G4, H2) | Consistency is a long-standing local ranking signal; AI engines cross-check entities across sources | Local: **Measured** (industry ranking factor surveys). AI: **Plausible** |
| Google Business Profile complete, categories right, reviews flowing (H4 to H13) | Local pack and Maps rank on relevance, distance and prominence, and reviews feed prominence. AI Overviews for local searches often show the local pack | **Documented** (Google Business Profile help) |
| FAQ and page copy answer the question in the first sentence (G2, G3) | Answer engines quote passages. A study of generative engines found that adding concrete statistics, quotations and cited sources raised a page's visibility in AI answers, by up to about 40 percent in its benchmark | **Measured** in a lab setting (Aggarwal et al., "GEO: Generative Engine Optimization", 2023), not on live engines for local builders |
| Facts as text, not images (G10) | Crawlers read text; numbers inside a JPEG are not read | **Plausible**, close to certain |
| About page with the founder, history, license and associations (G5) | Engines need a named, verifiable entity to recommend; Google's guidance on helpful content stresses who is behind a site | **Documented** as a quality signal for Google. Effect on AI answers: **Plausible** |
| A page per service area with real substance (H1) | Gives engines a page that matches "custom home builder in [town]". Town-swapped template pages are doorway pages and break Google's spam policies | Spam policy: **Documented**. Ranking benefit of genuine area pages: **Measured** (local SEO practice) |
| `llms.txt` (G7) | Google says Search ignores it. Log studies in 2026 show AI bots almost never fetch it, and a 90-day test on ten sites found no measurable change | **No evidence**. Low cost when generated from Sanity, so it is optional and never gates launch |
| IndexNow | Pings Bing and others when pages change; Google does not use it | **Documented** (Bing). Optional |
| Freshness (dates on posts and homes, updated pages) | Engines prefer current sources for time-sensitive questions | **Plausible** |

## What good looks like on a builder site

**A FAQ answer.**
- Weak: "Every home is different. Contact us to discuss your timeline."
- Strong: "Most of our homes take 10 to 14 months from permit to keys. Lake lots with steep grades usually add one to three months for site work."

The strong one answers first, gives a number and names the condition that changes it. It is also what the builder would say on the phone. Draft rewrites only from facts the client gave (the blueprint, the client note, existing copy); if the number is not known, it goes to "Needs client input".

**A home page an AI can describe.** In text: the home's name and town or community, size, beds and baths, style, year finished, build time, what made it hard (a lot that dropped eleven feet, a lake setback), and who built it. Photos carry the feeling; text carries the facts.

**A community or area page.** Who builds there and how many homes they have built there, the lot types, what building there involves (septic, HOA review, lake permits), drive times, and links to every home in it. Not a paragraph with the town name swapped.

## Robots.txt AI crawler policy (default: allow all)

Name the crawlers explicitly even though `*` already allows them, so the policy is visible and a later edit to `*` does not silently block them. Andrubailey.com's `public/robots.txt` is the model:

```
User-agent: *
Allow: /

User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
Allow: /

Sitemap: https://<domain>/sitemap-index.xml
```

If a client asks to keep their work out of AI training, block only the training bots (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot) and keep the search and user bots allowed. Record the decision in `qa/LAUNCH-QA.md`. Either way the policy goes on the approval list.

Previews must not be crawlable at all: on Vercel previews the site starter's `robots.txt` route disallows everything, and Vercel adds `X-Robots-Tag: noindex`.
