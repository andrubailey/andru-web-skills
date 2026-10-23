---
tags: [site-launch-qa]
max_turns: 120
timeout_seconds: 2400
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

The Ridgeline Custom Homes build is approved, so run the pre-launch QA on it. The repo is in ./ridgeline. I'm away from my desk, so don't wait on me: do the whole pre-launch pass, fix what's safe, put everything else on the approval list, and write the report and the client summary.

Setup for this one: there's no Vercel preview or git remote yet. Start the stand-in preview with `node serve.mjs` inside ridgeline/ (it serves http://localhost:4600 the way the Vercel preview will). dist/ is the current build of src/ and there's no npm install for the site, so if you fix something in src/, make the same change in dist/. Production will be https://ridgelinehomes.test. The inputs in qa/launch-inputs.json are confirmed. Don't submit the contact form, and skip the AI answer prompts and PageSpeed Insights this round since the site isn't public yet.

Input files: ridgeline/
