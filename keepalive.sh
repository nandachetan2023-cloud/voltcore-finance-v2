#!/bin/bash
# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q 3000; then
    rm -rf .next
    npx next dev -p 3000 > "$SCRIPT_DIR/dev.log" 2>&1 &
    NEXT_PID=$!
    echo "$(date): Started next dev PID=$NEXT_PID" >> "$SCRIPT_DIR/dev.log"
  fi
  sleep 3
  # Keep alive with a request
  curl -s --max-time 2 http://127.0.0.1:3000/ > /dev/null 2>&1
done
