# qa/launch-state.json

The memory between phases. Pre-launch writes it, launch day and the 2-week check read and extend it. Keep it valid JSON, committed on the QA branch (and on `main` once Andru merges). Update it at the end of every phase and every re-test round.

```json
{
  "version": 1,
  "site": "https://smithhomes.com",
  "client": "Smith Homes",
  "repo": "~/Sites/smith-homes",
  "phases": {
    "preLaunch": {
      "rounds": [
        {
          "round": 1,
          "date": "2026-11-02",
          "preview": "https://smith-homes-git-qa-launch-2026-11-02-andrubailey.vercel.app",
          "branch": "qa/launch-2026-11-02",
          "commit": "a1b2c3d",
          "verdict": "READY AFTER FIXES",
          "counts": { "blocker": { "found": 4, "fixed": 3, "open": 1 }, "high": { "found": 19, "fixed": 12, "open": 7 }, "polish": { "found": 9, "fixed": 4, "open": 5 } },
          "report": "qa/LAUNCH-QA-2026-11-02.md"
        }
      ]
    },
    "launchDay": { "date": null, "domain": null, "verdict": null, "searchConsoleSubmitted": false, "bingSubmitted": false, "indexingRequested": [] },
    "twoWeek": { "date": null, "report": null }
  },
  "findings": [
    {
      "id": "E2",
      "sev": "High",
      "page": "/communities/lake-lanier",
      "breakpoint": null,
      "element": "meta description",
      "issue": "Missing meta description",
      "evidence": "qa/seo.json pages[/communities/lake-lanier].description = null",
      "fix": "Drafted description sent for approval (item 3)",
      "status": "open",
      "owner": "Andru",
      "fixedIn": null,
      "retest": [{ "date": "2026-11-03", "result": "PASS" }]
    }
  ],
  "approvals": [
    { "n": 3, "ids": ["E2"], "item": "Meta description for Lake Lanier", "status": "approved", "date": "2026-11-02", "applied": "a4f5e6d" }
  ],
  "accepted": [
    { "id": "I1", "page": "/homes/the-ridge", "what": "Performance 93 because of the client's drone video", "acceptedBy": "client, by email", "date": "2026-11-03" }
  ],
  "formsSubmitted": [
    { "form": "Contact page", "destination": "JobTread", "date": "2026-11-02", "label": "QA TEST, please ignore", "confirmedBy": null }
  ],
  "lighthouse": {
    "preLaunch": [{ "page": "/", "performance": 97, "accessibility": 100, "bestPractices": 100, "seo": 100, "lcp": 1.9, "cls": 0.01, "tbt": 40, "source": "Lighthouse 12.8.2 local, median of 3" }],
    "launchDay": []
  },
  "ai": { "prompts": "qa/ai-prompts.md", "baseline": { "date": "2026-11-02", "file": "qa/ai-baseline-2026-11-02.md" }, "followUp": null },
  "reminders": [{ "what": "2-week check", "due": "2026-11-20", "how": "scheduled task" }]
}
```

Status values: `open`, `fixed` (by Claude, re-tested), `approved` (on the approval list, yes, not yet applied), `applied` (approved and re-tested), `accepted` (client accepted the risk; must also be in `accepted`), `needs-client`, `wontfix` (Andru decided; record why), `na`.
