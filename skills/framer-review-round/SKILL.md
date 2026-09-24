---
name: framer-review-round
description: Turn a round of client feedback on a website into a triaged change list, apply the safe changes in the Framer project, flag scope creep, and draft the reply. Use when Andru pastes client feedback, forwards a review email, shares a Loom transcript, or says "review round for [client]".
---

# Client Review Round

Take client feedback in whatever shape it arrives and turn it into finished work plus a clear reply. The goal is that Andru reads one list, makes a few decisions, and sends one email.

## 1. Gather

- The feedback itself: pasted text, forwarded email, Loom or call transcript, a doc, or a list of comments. If it is a recording, get the transcript first.
- The project: Framer project (MCP plugin open) and the staging URL.
- The signed scope, if available, so scope creep can be named against it rather than guessed at.
- Which round this is. Look for earlier `reviews/REVIEW-*.md` files in the project folder and read the most recent one so nothing gets re-litigated.

If the feedback is vague ("the hero feels off", "make it pop"), do not guess. Put it in the Needs a decision list with two or three concrete options Andru can pick from.

## 2. Split into atomic items

Break the feedback into single changes. One sentence from a client often contains three. Give each an ID (R1, R2, R3), and record:

- Page and section
- What they asked for, in their words
- What it actually means in the build
- Whether it repeats on other pages through a shared component

Merge duplicates. If the same fix touches one component used on eight pages, that is one item.

## 3. Triage

| Bucket | Rule |
|---|---|
| **Apply now** | Mechanical and unambiguous: copy edits they wrote out, swapping an image they supplied, color or spacing tweaks within the existing system, link fixes, reordering existing sections |
| **Needs a decision** | Vague, subjective, or two readings possible. Offer options, do not guess |
| **Needs client input** | Blocked on content they have not sent: photos, bios, case study details, logos |
| **Out of scope** | Real new work: new pages, new sections, new integrations, a redesign of something already approved, a third full revision past what the scope allows |
| **Push back** | Would hurt conversion, accessibility, SEO, or performance. Say so plainly with the reason and a better alternative |

For every Out of scope item, note what the signed scope says and estimate the add. Andru decides whether to absorb it or quote it, but he should never discover it after the work is done.

## 4. Apply

Apply the "Apply now" items through the Framer MCP. Rules:

- Copy the client wrote goes in as written, except for house style (no em dashes) and obvious typos. Note any edit made to their wording.
- Keep changes inside the existing type scale, color styles, and spacing system.
- If a change breaks a smaller breakpoint, fix the breakpoint too (use the `framer-breakpoints` skill) and say so.
- Never delete a page, section, or CMS item on feedback alone. That goes in Needs a decision.
- Never publish. When the changes are in, ask Andru to publish to staging before the client looks.

## 5. Write it up

Save `reviews/REVIEW-{round}-YYYY-MM-DD.md` in the project folder:

```markdown
# Review Round {n}: {Client} | {date}

## Done ({count})
| ID | Page | Change | Note |

## Needs your decision
| ID | Page | What they asked | Options |

## Waiting on the client
| ID | Page | What we need from them |

## Outside the current scope
| ID | What it is | Scope says | Rough add |

## Recommend against
| ID | What they asked | Why | Better option |
```

## 6. Draft the reply

Draft a short client email in Andru's voice for him to review and send. Never send it directly.

Shape it as: what is now live on staging, what you need from them (numbered and specific, with a date), and anything outside scope handled as a calm, factual note with a price, not an apology. Keep it under 200 words. No em dashes. No filler like "just circling back".

End the chat summary with: items applied, items waiting on him, items waiting on the client, and anything that needs a change order.
