#!/usr/bin/env bash
# Repo and build hygiene (checklist A). Read only, except the build output in dist/.
# Usage: bash qa/tools/repo-hygiene.sh            (from the repo root)
# Writes qa/build.log, qa/audit.json and qa/hygiene-summary.md.
set -uo pipefail
mkdir -p qa
OUT=qa/hygiene-summary.md
: > "$OUT"
say() { echo "$*" >> "$OUT"; }
flag() { say "- **$1** ($2) $3"; }

say "# Repo and build hygiene"
say ""
say "$(date '+%Y-%m-%d %H:%M'), branch $(git branch --show-current 2>/dev/null), commit $(git rev-parse --short HEAD 2>/dev/null)"
say ""

# A1 install: lockfile present and in sync with package.json
if [ ! -f package-lock.json ]; then flag A1 High "No package-lock.json"; fi
if ! npm ls --depth=0 >/dev/null 2>qa/npm-ls.err; then flag A1 High "npm ls reports problems: $(head -c 300 qa/npm-ls.err | tr '\n' ' ')"; fi
NODE_PIN=$( (cat .nvmrc 2>/dev/null; node -e 'try{const e=require("./package.json").engines;if(e&&e.node)console.log(e.node)}catch{}') | head -1)
[ -z "$NODE_PIN" ] && flag A1 Polish "Node version not pinned (.nvmrc or engines.node); Vercel may build on a different major"

# A2/A3 build: zero errors, zero warnings
echo "Building (npm run build)..."
if [ ! -d node_modules ]; then
  flag A2 Check "Not tested: dependencies are not installed. Run npm ci, then re-run this script"
elif npm run build > qa/build.log 2>&1; then
  WARN=$(grep -ciE "\bwarn(ing)?\b|\[WARN\]|deprecated" qa/build.log || true)
  if [ "$WARN" -gt 0 ]; then flag A3 High "Build passes with $WARN warning line(s). First: $(grep -iE "\bwarn(ing)?\b|\[WARN\]|deprecated" qa/build.log | head -3 | tr '\n' ' ' | cut -c1-300)"; fi
else
  flag A2 Blocker "Build fails. Tail of qa/build.log: $(tail -5 qa/build.log | tr '\n' ' ' | cut -c1-300)"
fi
if [ -d node_modules/@astrojs/check ]; then
  if ! npx astro check > qa/astro-check.log 2>&1; then flag A3 High "astro check reports errors: $(grep -E 'error' qa/astro-check.log | head -3 | tr '\n' ' ' | cut -c1-300)"; fi
else
  say "- (info) @astrojs/check is not installed, so type checks were skipped"
fi

# A4/A5 leftovers in shipped code
CL=$(grep -rnE "console\.(log|debug)\(|debugger;" src --include=*.astro --include=*.ts --include=*.tsx --include=*.js --include=*.jsx --include=*.mjs 2>/dev/null | grep -v "^src/sanity/" | grep -vE "//.*console" || true)
[ -n "$CL" ] && flag A4 High "console.log or debugger in src: $(echo "$CL" | head -5 | cut -c1-120 | tr '\n' ';')"
TD=$(grep -rnE "\b(TODO|FIXME|XXX|HACK)\b" src 2>/dev/null || true)
[ -n "$TD" ] && flag A5 Polish "$(echo "$TD" | wc -l | tr -d ' ') TODO/FIXME comment(s) in src: $(echo "$TD" | head -3 | cut -c1-120 | tr '\n' ';')"

# A6 npm audit, runtime dependencies only
npm audit --omit=dev --json > qa/audit.json 2>/dev/null
CRIT=$(node -e 'const a=require("./qa/audit.json");console.log(a.metadata?.vulnerabilities?.critical||0)' 2>/dev/null || echo "?")
HIGH=$(node -e 'const a=require("./qa/audit.json");console.log(a.metadata?.vulnerabilities?.high||0)' 2>/dev/null || echo "?")
[ "$CRIT" != "0" ] && flag A6 High "npm audit: $CRIT critical in runtime dependencies"
[ "$HIGH" != "0" ] && flag A6 Polish "npm audit: $HIGH high in runtime dependencies (static output limits exposure; check which ship to the browser)"

# A8 secrets: nothing in git, nothing in the built output
TRACKED_ENV=$(git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v "\.env\.example$" || true)
[ -n "$TRACKED_ENV" ] && flag A8 Blocker "Env file tracked in git: $TRACKED_ENV"
for d in dist .vercel/output/static; do
  [ -d "$d" ] || continue
  # Sanity tokens start with sk and are long; also catch common secret names
  HIT=$(grep -rlE "sk[A-Za-z0-9]{70,}|SANITY_API_(READ|WRITE)_TOKEN|RESEND_API_KEY|re_[A-Za-z0-9]{20,}|VERCEL_AUTOMATION_BYPASS" "$d" 2>/dev/null | head -5 || true)
  [ -n "$HIT" ] && flag A8 Blocker "Possible secret in built files: $HIT (open each and check; never paste the value)"
done
PUBTOK=$(grep -rnE "PUBLIC_[A-Z_]*(TOKEN|SECRET|KEY)" src .env.example 2>/dev/null | grep -v "PUBLIC_GA4\|PUBLIC_SANITY_PROJECT\|PUBLIC_SANITY_DATASET" || true)
[ -n "$PUBTOK" ] && flag A8 Blocker "A token or key in a PUBLIC_ variable ships to the browser: $(echo "$PUBTOK" | head -3 | cut -c1-120 | tr '\n' ';')"
grep -qE "^\.env" .gitignore 2>/dev/null || flag A8 High ".env files are not in .gitignore"

# A9/A10/A11/A12 config, printed for review
say ""
say "## Config to review"
say ""
say '```'
grep -nE "site:|trailingSlash|output:|integrations|sitemap\(|redirects|apiVersion|projectId|dataset|useCdn|perspective|stega|token" astro.config.* src/lib/sanity* src/sanity/*.ts sanity.cli.ts studio/sanity.cli.ts 2>/dev/null | cut -c1-160 >> "$OUT"
say '```'
SITE=$(grep -oE "site:\s*['\"][^'\"]+['\"]" astro.config.* 2>/dev/null | head -1)
case "$SITE" in
  *example.com*|"") flag A10 Blocker "astro.config site is missing or still example.com ($SITE)";;
  *vercel.app*) flag A10 Blocker "astro.config site points at vercel.app ($SITE)";;
esac
grep -q "SITE_URL" astro.config.* 2>/dev/null && say "- (info) site comes from SITE_URL; confirm it is set for Production in Vercel"
grep -qE "trailingSlash" astro.config.* 2>/dev/null || flag A11 Polish "trailingSlash is not set in astro.config (Astro default is 'ignore'; pick one and match the links)"
grep -qE "@astrojs/sitemap" package.json || flag A12 High "@astrojs/sitemap is not installed"
grep -qE "apiVersion:\s*['\"](v1|vX)['\"]" -r src astro.config.* 2>/dev/null && flag A9 High "Sanity apiVersion is v1 or vX; pin a date"

# A7 production env vars (names only)
say ""
say "## Vercel production env var names"
say ""
if [ -f .vercel/project.json ]; then
  npx -y vercel@64.2.0 env ls production 2>/dev/null | awk '$1 ~ /^[A-Z][A-Z0-9_]+$/ {print "- " $1}' >> "$OUT" || say "- could not list (run npx vercel@64.2.0 login)"
else
  say "- Repo not linked to Vercel (.vercel/project.json missing). Run npx vercel@64.2.0 link"
fi
echo "Hygiene done. See $OUT"
