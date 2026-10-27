---
type: llm
focus: trace
weight: 1
---

The report traces the robots.txt problem to src/pages/robots.txt.ts returning the same allow-all file on every deployment, and either fixes it so previews disallow crawling or puts that fix on the approval list
