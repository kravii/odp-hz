#!/bin/bash

# DC Management Backend Stop Script
echo "Stopping DC Management Backend..."

if [ -f /workspace/logs/backend.pid ]; then
    PID=$(cat /workspace/logs/backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "Backend stopped (PID: $PID)"
    else
        echo "Backend process not found"
    fi
    rm -f /workspace/logs/backend.pid
else
    echo "No PID file found, killing any running backend processes..."
    pkill -f "node server.js"
fi