# AI answer testing (L1 to L4)

The point is a baseline: at launch, does each engine name the builder for the searches that matter, and who does it name instead? At the 2-week check the same prompts run again. Honesty matters more than coverage here, because a guessed baseline makes the follow-up meaningless.

## 1. Build the prompts (L1)

10 to 15 prompts, from the blueprint's service areas, home types, buyer and competitors. Write them the way a buyer types or talks, not the way an SEO writes. Cover four kinds:

| Kind | Examples |
|---|---|
| Discovery in an area | "best custom home builder in Jackson County GA", "who builds custom homes on Lake Lanier", "luxury home builders near Braselton" |
| Home type in an area | "who builds modern farmhouse homes in north Georgia", "lake house builders Lake Lanier" |
| The builder by name | "Smith Homes reviews", "is Smith Homes a good builder", "Smith Homes Jefferson GA" |
| Buyer questions | "how long does it take to build a custom home in Jackson County", "what does it cost to build on Lake Lanier" (record what is said even when no builder is named; it shows whose content the engine trusts) |

Save them in `qa/ai-prompts.md` as a numbered list, and confirm them with Andru with the intake or the approval list. Add any he wants.

## 2. Run them (L2)

For each prompt, try in this order and record which method produced each answer:

1. **Web search (Claude's own).** Run the prompt as a search. Record whether the builder's site appears in the results, its position, and which competitors and directories (Houzz, NAHB, Angi, Yelp) rank. Label it "web search results, not an AI answer".
2. **Perplexity and ChatGPT, logged out, in the built-in browser.** `https://chatgpt.com/?q=<prompt, URL-encoded>&hints=search` asks the question with search on; wait about 20 seconds, then read the page text. ChatGPT answered logged out in October 2026; Perplexity asked for a sign-up. Read the answer and its sources. If either asks for a login, shows a CAPTCHA or a bot check, stop for that engine: do not try to get around it. Do not sign in to any account.
3. **Everything else goes to Andru:** Google AI Overviews and AI Mode (results depend on location, so they should come from his browser or the client's area), ChatGPT and Perplexity if step 2 was blocked, and Copilot if wanted. Give him the prompts as a copy-paste list and ask him to paste back the answer text (or screenshots) per prompt.

Location matters: local answers change with where the search comes from. Note the method's location for each (for example "built-in browser, no location set" or "Andru's browser, Hoschton GA").

## 3. Record (L2, L4)

`qa/ai-baseline-YYYY-MM-DD.md`, one row per prompt per engine:

```markdown
| # | Prompt | Engine and method | Builder named? | What it said (short) | Others named | Builder's site cited? |
|---|---|---|---|---|---|---|
| 1 | best custom home builder in Jackson County GA | Perplexity, built-in browser, logged out | No | Lists three builders with Houzz awards | Acme Homes, Ridgeline | No (Houzz, Acme's site) |
| 1 | same | Google AI Overview | not run | Andru to run from his browser | | |
```

Rules:
- "Builder named?" is yes only if the answer you read names them. Not "probably", not "should after indexing".
- Quote or closely summarize what was said; do not characterize.
- "not run" plus the reason for anything you could not see.
- **Check every fact an engine states about the business** (city, phone, services, who it serves, prices, years) against `qa/launch-inputs.json`. A wrong city or phone is a G4 finding with the source the engine cited, because the fix is at that source (often a Google Business Profile, an old directory listing or an old profile bio), not on the site. A price the client does not publish is a finding too: find where it comes from (old site pages in the Wayback Machine, profiles, cached pages).
- Name searches ("[builder] reviews") often pull in a different person or company with a similar name. Record it; if it is the client's own old profile, that goes to "Needs client input".
- At pre-launch the new site is not indexed yet, so a "no" is expected. Say that in the client summary: this is the starting line, not a grade.

## 4. Two weeks later (L3)

Run the same prompts the same way, write `qa/ai-followup-YYYY-MM-DD.md` with the same table plus a "Change since launch" column, and summarize: prompts where the builder now appears, where the site is now cited, and new competitors. Two weeks is early for AI engines (some re-crawl slowly), so frame flat results as expected and point to the next check (Andru's call: 60 or 90 days).
