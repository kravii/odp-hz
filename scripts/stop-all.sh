#!/bin/bash

# DC Management System Stop Script
echo "Stopping DC Management System..."

# Stop frontend
/workspace/scripts/stop-frontend.sh

# Stop backend
/workspace/scripts/stop-backend.sh

echo "DC Management System stopped!"