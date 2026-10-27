#!/usr/bin/env bash
# Set up qa/ in the client repo: copy the scripts to qa/tools, install Playwright and axe there
# (not in the site's package.json), and keep heavy output out of git.
# Usage: bash <skill>/scripts/setup.sh     (from the client repo root)
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p qa/tools
cp "$SKILL_DIR"/scripts/*.mjs "$SKILL_DIR"/scripts/*.sh qa/tools/
[ -f qa/LAUNCH-QA.md ] || cp "$SKILL_DIR/assets/LAUNCH-QA.md" qa/LAUNCH-QA.md
cat > qa/.gitignore <<'EOF'
# Regenerable output. Reports, inputs and launch-state.json are committed.
tools/
shots/
lighthouse/
round*/
*.log
*-summary.md
urls.txt
retest-urls.txt
*.json
!launch-inputs.json
!launch-state.json
EOF
cd qa/tools
[ -f package.json ] || printf '{"name":"site-launch-qa-tools","private":true,"type":"module"}\n' > package.json
# Reuse the Playwright version the site already has, so its cached browsers work
PW=$(node -e 'try{console.log(require("../../package.json").devDependencies?.playwright?.replace(/^[^\d]*/,"")||"")}catch{}')
npm i -D "playwright@${PW:-1.64.1}" axe-core@4 --silent
npx playwright install chromium webkit >/dev/null
echo "qa/tools ready (playwright ${PW:-1.64.1})"
