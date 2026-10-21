#!/bin/bash

INPUT=$(cat)

if command -v jq >/dev/null 2>&1; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
elif command -v node >/dev/null 2>&1; then
  COMMAND=$(node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j?.tool_input?.command||d)}catch(e){process.stdout.write(d)}})' <<< "$INPUT")
elif command -v python >/dev/null 2>&1; then
  COMMAND=$(python -c 'import sys, json; data=sys.stdin.read(); (lambda j: print(j.get("tool_input", {}).get("command", data) if isinstance(j, dict) else data))(json.loads(data) if data.strip().startswith("{") else {})' 2>/dev/null <<< "$INPUT")
fi

if [ -z "$COMMAND" ]; then
  COMMAND="$INPUT"
fi

DANGEROUS_PATTERNS=(
  "git push"
  "git reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git restore \."
  "push --force"
  "reset --hard"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
