---
name: builder-site-teardown
description: Evidence-based teardown of a custom home builder's website against a fixed rubric, producing observations, numbers and screenshots rather than opinions. Use when Andru says "tear down [builder]", "teardown for [client]", "audit [url]", or needs findings for a Craft Audit, an ad, or a prospecting video.
---

# Builder Site Teardown

The engine underneath section 3 of the blueprint. One pass over a builder's web presence that produces evidence: what is there, what it measures, what a buyer sees. Judgment comes later and belongs to Andru.

The rule that makes this useful: **every finding is an observation, a reason it matters, and a severity.** A finding without a measurement or a screenshot behind it is an opinion, and opinions do not survive a ninety minute conversation with the person who paid for the site.

## 0. Inputs

Required: the site URL, the city or market, what he builds, the price band.

Helpful if available: admin access to the site, the Fit Call notes, the questionnaire answers, the photography invoice.

If the price band is unknown, find it from the project pages or say it is unknown. Do not infer it from how the site looks.

## 1. Inventory

```bash
curl -s https://SITE/sitemap.xml | grep -o "<loc>[^<]*" | sed 's/<loc>//' | sort -u
```

If there is no sitemap, crawl the nav. Record:

- Platform (look at the response headers, the generator meta, asset paths)
- Full page list with slugs
- How many finished homes have their own page, and how many are in a grid with no page
- Date signals: copyright year, newest project, newest post, newest review
- Whether the site is CMS driven or hand built, because that decides whether he can add a home himself today

## 2. Measure

```bash
for p in / /about /projects /contact; do
  curl -s -o /dev/null -w "$p %{http_code} %{time_total}s %{size_download}b\n" "https://SITE$p"
done
```

Record page weight, the largest images and their dimensions, HTTPS and certificate state, redirect chains, broken internal links, missing viewport meta, and whether the phone number is a tel link. Where a real performance number matters, run a Lighthouse pass and quote the numbers rather than describing them.

Screenshot every page at **390px** and **1440px**. The 390px one is the one that matters; builders read on a phone from a job site.

## 3. Walk it as a buyer

Phone first, from the homepage, in this order, and count:

- What the homepage proves in the first five seconds, written as one sentence
- Taps from landing to seeing a finished home
- Taps from landing to a way to contact him
- Whether any home shows a before, a constraint, or a named person, or only finished rooms
- Whether a buyer can tell what he builds, where, and roughly at what level

Count the taps. A number is arguable; "the navigation is confusing" is not.

## 4. The inquiry path

Find every route in: forms, phone, email, chat, social, Google profile. For each, record whether it works and what happens after.

**Do not submit a form on a live site you do not own without Andru's explicit go-ahead.** It reaches a real person's inbox. If he approves it, say who it is and why in the message body, and record what came back and how long it took.

## 5. Proof of craft

What a buyer at this price band is looking for and whether it is on the site: photography quality and consistency, any signal about who shot it, named people, the process explained, materials and trades, awards and press, reviews with dates, and whether anything on the site is dated this year.

Never state photo rights as a fact. Record what is visible, mark the rest unknown, and leave it for the audit conversation.

## 6. Local and discovery

Google Business Profile: category, service areas, photo count and recency, posts, reviews with dates and whether they are answered. Title tags and meta descriptions per page. Name, address and phone consistency between the site and the profile. Structured data present or absent. Whether any page could plausibly rank for the way a buyer in that market searches.

## 7. Agent dependence

Specific to this niche and usually the most expensive finding: is there any route by which a buyer who has not met an agent could find him, understand him, and contact him. Write down what that route is, or that there is not one.

## 8. Score the rubric

Eight dimensions, each with a severity drawn from the same set section 3 of the blueprint uses:

| Severity | Means |
|---|---|
| Costing you work | A buyer is being lost at this point today |
| Holding you back | Not losing work, but capping what he can win |
| Worth fixing | Real, cheap, not urgent |
| Fine | Say so. A teardown with nothing positive reads as a hit job |

Dimensions: first impression, finished homes, proof of craft, inquiry path, mobile, speed, local and discovery, agent dependence.

## 9. Deliverable

`audits/{builder}/TEARDOWN.md`, dated, plus the screenshots beside it:

```markdown
# Teardown: {Builder} | {date}
{url} | {market} | {price band} | {platform}

## Summary
One paragraph. What the site is doing for him and what it is not.

## Findings
| # | Dimension | Observation | Why it matters | Severity | Evidence |

## Measurements
| Metric | Value | Note |

## Buyer walk
| Question | Answer |

## What is working
Deliberate section. If it is empty, say why.

## Unknowns
What could not be determined and what would settle it.
```

## 10. Report

Tell Andru: the three findings most likely to become the three things, the one measurement a builder will react to hardest, and what is in Unknowns that he should ask about directly.

Do not write the three things here. That is `craft-audit-prep` and it needs his language from the call.

House rules: no em dashes, no adjective without a measurement behind it, never guess at rights or money, never submit a form or contact a builder without Andru's go-ahead.
