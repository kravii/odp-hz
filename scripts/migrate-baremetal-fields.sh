#!/bin/bash

# Script to migrate database for baremetal server fields
# This script adds the new fields for pool assignment and monitoring

set -e

echo "Starting database migration for baremetal server fields..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check if database is running
if ! docker-compose ps | grep -q "database.*Up"; then
    echo "Starting database container..."
    docker-compose up -d database
    sleep 10
fi

# Get database container name
DB_CONTAINER=$(docker-compose ps -q database)

if [ -z "$DB_CONTAINER" ]; then
    echo "Error: Database container not found"
    exit 1
fi

echo "Running migration on database container: $DB_CONTAINER"

# Run the migration
docker exec -i $DB_CONTAINER mysql -u root -prootpassword datacenter_management < backend/database/migrations/add_baremetal_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "Added fields:"
    echo "  - pool_type (ENUM: 'vm', 'k8s', 'none')"
    echo "  - pool_id (INT, nullable)"
    echo "  - monitoring_enabled (BOOLEAN)"
    echo "  - packages_installed (JSON)"
    echo ""
    echo "You can now use the new baremetal server functionality!"
else
    echo "❌ Database migration failed!"
    exit 1
fi