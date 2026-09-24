# andru-web-skills

Claude skills for Andru Bailey LLC web projects, packaged as a Claude Code plugin.

## Install

In Claude Code:

```
/plugin marketplace add andrubailey/andru-web-skills
/plugin install andru-web-skills@andru-skills
```

To work on the skills locally, point the marketplace at the clone instead:

```
/plugin marketplace add ~/Web Design Business/andru-web-skills
```

## Skills

| Skill | What it does |
|---|---|
| `framer-launch-qa` | Deep pre-launch QA round on a Framer site: live-site scans, Framer project pass, safe auto-fixes, launch-readiness report |
| `framer-review-round` | Turns a client feedback round into a triaged change list, applies the safe changes, flags scope creep, drafts the reply |
| `framer-content-intake` | Turns raw client material into a page-by-page content plan plus a specific list of what is still missing |
| `framer-redirect-map` | Builds the old-URL to new-URL 301 map for a rebuild, ready to paste into Framer redirects |

## Editing

Each skill is a folder under `skills/` with a `SKILL.md`. Supporting files (checklists, scripts) live beside it and are referenced by relative path. After editing, commit and push, then run `/plugin update andru-web-skills` in Claude Code.

## Conventions used across these skills

- No em dashes in anything written for Andru or for a client site.
- Never publish, never send client-facing messages without approval, never invent client content.
- Every deliverable lands in the project folder as a dated markdown file.
