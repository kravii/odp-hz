#!/bin/bash

# DC Management Backend Startup Script
cd /workspace/backend

# Check if already running
if pgrep -f "node server.js" > /dev/null; then
    echo "Backend is already running"
    exit 1
fi

# Start the backend
echo "Starting DC Management Backend..."
nohup node server.js > /workspace/logs/backend.log 2>&1 &
echo $! > /workspace/logs/backend.pid

echo "Backend started with PID $(cat /workspace/logs/backend.pid)"
echo "Logs: /workspace/logs/backend.log"
echo "Access: http://172.30.0.2:3001"