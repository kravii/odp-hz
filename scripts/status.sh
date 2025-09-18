#!/bin/bash

# DC Management System Status Script
echo "DC Management System Status"
echo "=========================="

# Check backend
if pgrep -f "node server.js" > /dev/null; then
    echo "Backend:  RUNNING (PID: $(pgrep -f "node server.js"))"
    echo "  URL:    http://172.30.0.2:3001"
    echo "  Health: $(curl -s http://localhost:3001/health | grep -o '"status":"[^"]*"' || echo 'UNKNOWN')"
else
    echo "Backend:  STOPPED"
fi

echo ""

# Check frontend
if pgrep -f "craco start" > /dev/null; then
    echo "Frontend: RUNNING (PID: $(pgrep -f "craco start"))"
    echo "  URL:    http://172.30.0.2:3000"
else
    echo "Frontend: STOPPED"
fi

echo ""
echo "Logs:"
echo "  Backend:  /workspace/logs/backend.log"
echo "  Frontend: /workspace/logs/frontend.log"