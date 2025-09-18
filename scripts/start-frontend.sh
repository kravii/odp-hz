#!/bin/bash

# DC Management Frontend Startup Script
cd /workspace/frontend

# Check if already running
if pgrep -f "craco start" > /dev/null; then
    echo "Frontend is already running"
    exit 1
fi

# Start the frontend
echo "Starting DC Management Frontend..."
nohup npm start > /workspace/logs/frontend.log 2>&1 &
echo $! > /workspace/logs/frontend.pid

echo "Frontend started with PID $(cat /workspace/logs/frontend.pid)"
echo "Logs: /workspace/logs/frontend.log"
echo "Access: http://172.30.0.2:3000"