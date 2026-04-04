#!/bin/bash
cd /home/z/my-project
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q 3000; then
    rm -rf .next
    npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
    NEXT_PID=$!
    echo "$(date): Started next dev PID=$NEXT_PID" >> /home/z/my-project/dev.log
  fi
  sleep 3
  # Keep alive with a request
  curl -s --max-time 2 http://127.0.0.1:3000/ > /dev/null 2>&1
done
