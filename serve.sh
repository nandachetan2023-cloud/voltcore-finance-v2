#!/bin/bash
cd /home/z/my-project

WARMUP_APIS=(
  employees organization dashboard sites projects attendance
  leave payroll permits incidents equipment expenses purchases
  invoices subcontractors recruitment shifts training settings
  crm support knowledgebase inventory sales
  accounts-payable accounts-receivable journal-entries bank-cash
  taxation budget financial-reports finance-dashboard ledger
  downloads sync timesheet
)

warmup() {
  echo "[warmup] Pre-compiling API routes..."
  for api in "${WARMUP_APIS[@]}"; do
    RESULT=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "http://localhost:3000/api/$api" 2>/dev/null)
    if [ "$RESULT" = "200" ]; then
      echo "[warmup] ✅ /api/$api"
    else
      echo "[warmup] ⏳ /api/$api (status: $RESULT, will retry...)"
    fi
    sleep 0.5
  done
  echo "[warmup] Done. Warming page..."
  curl -s --max-time 30 -o /dev/null "http://localhost:3000/" 2>/dev/null
  echo "[warmup] All routes compiled."
}

# Start server in background
NODE_OPTIONS='--max-old-space-size=4096' npx next dev -p 3000 >> dev.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "[$(date '+%H:%M:%S')] Waiting for server..."
for i in $(seq 1 30); do
  if curl -s --max-time 2 -o /dev/null "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] Server ready!"
    break
  fi
  sleep 1
done

# Warm up all routes
sleep 2
warmup

# Keep alive
echo "[$(date '+%H:%M:%S')] VoltCore ERP ready on port 3000"
wait $SERVER_PID
echo "[$(date '+%H:%M:%S')] Server exited, restarting..."
exec "$0"
