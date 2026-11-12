#!/bin/bash
pkill -f "next dev" 2>/dev/null
sleep 1
NODE_OPTIONS="--max-old-space-size=384" exec npx next dev -p 3000
