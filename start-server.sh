#!/bin/bash
cd /home/z/my-project
while true; do
  next dev -p 3000 2>&1 | tee dev.log
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
