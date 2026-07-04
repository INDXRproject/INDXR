#!/usr/bin/env bash
# Stop hook: check if wiki needs updating after non-docs file changes.
# Exits 2 (feedback to Claude) when action is needed, 0 otherwise.

INPUT=$(cat)

# Anchor to the project root so git commands work regardless of invocation cwd.
[ -n "$CLAUDE_PROJECT_DIR" ] && cd "$CLAUDE_PROJECT_DIR" 2>/dev/null

# If Claude already handled the stop hook this turn, skip.
if [ "$(printf '%s' "$INPUT" | jq -r '.stop_hook_active' 2>/dev/null)" = 'true' ]; then
  exit 0
fi

# Check if any non-docs/non-tests files changed since last commit.
CHANGED=$(git diff --name-only HEAD 2>/dev/null | grep -vE '^(docs/|tests/)' | head -1)
[ -z "$CHANGED" ] && exit 0

echo 'Controleer of de wiki bijgewerkt moet worden op basis van de zojuist gemaakte wijzigingen. Bekijk welke bestanden gewijzigd zijn via git diff --name-only HEAD, beoordeel welke wiki-paginas in docs/wiki/ geraakt worden, en update ze indien nodig. Voeg daarna een regel toe aan docs/LOG.md als dat nog niet is gebeurd.'
exit 2
