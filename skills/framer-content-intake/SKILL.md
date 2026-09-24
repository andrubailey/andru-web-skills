---
name: framer-content-intake
description: Turn raw client material (old site, PDFs, emails, notes, transcripts) into a page-by-page content plan for a website build, plus a specific list of what is still missing. Use when Andru says "content intake for [client]", "build the content plan", or drops a pile of client material into a project.
---

# Content Intake

Turn whatever the client sent into a build-ready content plan, and turn the gaps into a short, specific ask instead of a vague "send me your content".

## 1. Collect the sources

Ask for or locate:

- The current site URL, if there is one
- Files the client sent: PDFs, brochures, decks, docs, spreadsheets
- Kickoff or discovery call transcripts and notes
- The signed scope or proposal, for the agreed page list
- Brand material: logo files, photography, fonts, colors
- Anything from the sales process worth reusing: the positioning and audience work already done

Read everything before writing anything. Pull the old site's text with a crawl rather than by hand.

## 2. Build the page map

Start from the page list in the scope. For each page, record:

- Purpose in one line (what a visitor should do or understand)
- Primary audience and where they arrive from
- The single primary CTA
- Section outline, in order

If the page list in the scope conflicts with what the content supports, say so early rather than building a page with nothing to put in it.

## 3. Fill each section

For every section, mark the content status:

- **Have:** real client material exists. Quote or adapt it, noting the source file or page.
- **Draft:** enough raw material to write it. Write a first draft in the client's voice, clearly marked as a draft for approval.
- **Missing:** nothing to work from. Do not invent it.

Never fabricate testimonials, statistics, certifications, team bios, project details, or client names. A made-up number that reaches a live site is a real problem for a real business.

## 4. Inventory the assets

List what the build needs and what exists: photography by section, logos (client and partner), team headshots, project or product photos, video, documents to link, certifications and licenses. Flag anything low resolution, watermarked, or obviously stock so it can be replaced before the build rather than during QA.

## 5. Write the deliverables

Two files in the project folder:

**`content/CONTENT-PLAN.md`**

```markdown
# Content Plan: {Client} | {date}

## Page map
| Page | Slug | Purpose | Primary CTA | Status |

## {Page name}
**Purpose:** ...
**Primary CTA:** ...

### Section 1: {name}
- Status: Have / Draft / Missing
- Source: {file, page, or transcript}
- Content: {the actual copy or draft}

## Asset inventory
| Asset | Needed for | Status | Note |

## SEO notes
| Page | Working title | Target topic | Note |
```

**`content/CLIENT-CONTENT-REQUEST.md`**: the ask, written for the client. Numbered, specific, grouped by page, with an example of what good looks like for each item, a due date, and where to send it. "Three photos of finished kitchens, landscape, at least 2000px wide" beats "photos". Keep it to one page so it does not get ignored.

## 6. Report

Tell Andru: how many sections are Have, Draft, and Missing, which pages are blocked, and the two or three things that will hold up the build if the client does not send them this week. If a page has almost nothing behind it, recommend cutting or merging it rather than padding it.

House rules: no em dashes, the client's voice not yours, never invent facts about their business.
