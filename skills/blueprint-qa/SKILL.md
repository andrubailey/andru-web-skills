---
name: blueprint-qa
description: Check a drafted Craft Audit blueprint against its nine sections, layout rules, pricing and voice before it goes to the builder, fix the mechanical problems, and flag the judgment ones. Use when Andru says "QA the blueprint", "check the [builder] blueprint", or is about to deliver one.
---

# Blueprint QA

The blueprint goes out within 48 hours of a paid session, which means it gets written fast and read closely. This is the pass between those two things.

Two rules govern everything here. **Fix the mechanical, flag the judgment.** Section order, a missing severity, a price that does not match the pricing file, an em dash: fix those. The three things, the sequence, the recommended path: those are Andru's calls, so they get flagged with a reason and left alone.

And: **never send it.** This skill checks and reports. Delivery is his.

## 0. Inputs

The draft, as markdown, a Framer CMS entry, or the private page URL. Plus the teardown and the prep brief from the same folder, because most of the checks below are traceability checks against those two.

## 1. Structure

All nine sections present, in order, named as the SOP names them:

1. The three things
2. Business and buyer snapshot
3. What your site is telling buyers
4. How your homes should be presented
5. Everything else a buyer sees
6. The sequence
7. Quick wins he can do himself
8. What needs ongoing attention
9. What it looks like if I build it

Nothing above section 1. No introduction, no scene setting, no thank you for your time. A builder who reads only the first screen has to still get his money's worth, and that is the whole reason the order is fixed.

## 2. The three things

The refund is tied to this section, so it gets checked hardest.

- Exactly three. Not two, not four, no fourth in parentheses
- Each one traceable to a quote in the prep brief or the call notes. Quote the source in the report
- Each one a thing he is losing, not a feature he is missing
- Each one specific enough that he could act on it without asking what it means
- Largest type on the page

If a thing fails any of these, flag it with the reason and stop there. Do not rewrite it.

## 3. Section 3 findings

Every finding has three parts: the observation, why it matters, and a severity from the allowed set (costing you work, holding you back, worth fixing). A finding missing its severity gets one proposed. A finding missing its why gets flagged, because the why is the part that cannot be guessed.

Every observation traceable to the teardown. Anything asserted that is not in the teardown is the thing to catch here, every time.

## 4. Sections 4 through 8

**4.** The constraint leads, not the kitchen. Homes in a defensible build order. People named where they are known.

**5.** At least one positive state if one exists in the teardown. A section that is all negative reads as a hit job on a man who just paid for it. Photography rights stated as known or explicitly unknown, never implied.

**6.** Numbered. Each item has what it is, what it protects, cost, and timing. The order has to be defensible in one sentence, and order matters more here than anything else in the document.

**7.** Free, specific enough to follow, time estimate visible on each. Not collapsed into accordions. Generosity only registers if it looks real.

**8.** Grouped by the four cadences: monthly, quarterly, per home, annually.

## 5. Section 9 and the money

- One recommended path. A menu causes stalling, so if there are options, flag it
- Scope in and scope out, both present. Scope out is what protects the four weeks
- Timeline stated as the external commitment, not the internal target
- The care tier named with a reason that points back to a specific item in section 8
- Every number checked against `07 Pricing and Payments` in the SOPs folder: build inside the range, the audit credit applied, the payment schedule correct, the care tier priced right

A number that disagrees with the pricing file is a fix, not a flag. Fix it and say what it was.

## 6. Layout rules

- **No price anywhere above section 9.** Not in a summary, not in a sticky bar, not in a card, not in an anchor nav that jumps to it. If the number is visible on load, everything above it reads as a sales document
- Three things at the top, largest type, nothing above
- Check it at 390px. Builders read this on a phone from a job site
- Indexing off on the Framer collection page. These are private documents

The indexing check is the one that is easy to forget and expensive to get wrong.

## 7. Voice

No em dashes. No marketing adjectives. No exclamation points. Short sentences. His language where section 1 and section 2 quote him.

Flag anything that sounds like a web designer wrote it for another web designer: "elevate", "leverage", "best in class", "user journey", "brand story". Builders notice.

## 8. Fabrication check

The last pass and the most important one. Every number, date, name, award, review count and rights claim in the document traced to the teardown, the questionnaire, or the call notes. Anything untraceable gets flagged as untraceable, not smoothed over.

This is a document a builder may hand to his wife, his banker, or the agent he is trying to stop depending on. One invented number in it costs more than the audit was worth.

## 9. Deliverable

`audits/{builder}/BLUEPRINT-QA.md`, dated:

```markdown
# Blueprint QA: {Builder} | {date}
Checks run: {n} | Passed: {n} | Fixed: {n} | Flagged: {n}

## Must fix before sending
Ordered by what a builder notices first.
| # | Where | Problem | Why it matters |

## Fixed
| # | Where | Was | Now |

## Flagged for Andru
Judgment calls. Not changed.
| # | Where | Concern | Why it is his call |

## Checks passed
| Check | Result |
```

## 10. Report

Tell Andru: is it sendable, the must-fix count, and the one thing he should reread himself before it goes out. If the three things do not hold up, lead with that and say so directly, because the refund is attached to them and a weak section 1 is the only failure in this document that costs money.

House rules: no em dashes, fix the mechanical, flag the judgment, never send it to the builder.
