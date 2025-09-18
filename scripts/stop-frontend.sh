#!/bin/bash

# DC Management Frontend Stop Script
echo "Stopping DC Management Frontend..."

if [ -f /workspace/logs/frontend.pid ]; then
    PID=$(cat /workspace/logs/frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "Frontend stopped (PID: $PID)"
    else
        echo "Frontend process not found"
    fi
    rm -f /workspace/logs/frontend.pid
else
    echo "No PID file found, killing any running frontend processes..."
    pkill -f "craco start"
fi