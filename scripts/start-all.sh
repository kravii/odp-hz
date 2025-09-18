#!/bin/bash

# DC Management System Startup Script
echo "Starting DC Management System..."

# Create logs directory
mkdir -p /workspace/logs

# Start backend
echo "Starting backend..."
/workspace/scripts/start-backend.sh

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
/workspace/scripts/start-frontend.sh

echo ""
echo "DC Management System started!"
echo "Frontend: http://172.30.0.2:3000"
echo "Backend:  http://172.30.0.2:3001"
echo ""
echo "Login credentials:"
echo "Username: admin"
echo "Password: password"