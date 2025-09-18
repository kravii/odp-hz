#!/bin/bash

# Script to migrate MySQL database for baremetal server fields
# This script adds the new fields for pool assignment and monitoring

set -e

echo "Starting MySQL database migration for baremetal server fields..."

# Check if we're in the right directory
if [ ! -f "backend/config/database.js" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check if mysql command is available
if ! command -v mysql &> /dev/null; then
    echo "Error: mysql command not found. Please install MySQL client."
    exit 1
fi

# Database connection parameters (update these according to your setup)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-dc_management}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-rootpassword}

echo "Connecting to MySQL database: $DB_NAME on $DB_HOST:$DB_PORT"

# Test database connection
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Cannot connect to MySQL database. Please check your credentials."
    echo "You can set environment variables:"
    echo "  export DB_HOST=your_host"
    echo "  export DB_PORT=your_port"
    echo "  export DB_NAME=your_database"
    echo "  export DB_USER=your_user"
    echo "  export DB_PASSWORD=your_password"
    exit 1
fi

echo "Running migration on database: $DB_NAME"

# Run the migration
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/database/migrations/add_baremetal_fields_mysql.sql

if [ $? -eq 0 ]; then
    echo "✅ MySQL database migration completed successfully!"
    echo "Added fields:"
    echo "  - pool_type (ENUM: 'vm', 'k8s', 'none')"
    echo "  - pool_id (INT, nullable)"
    echo "  - monitoring_enabled (BOOLEAN)"
    echo "  - packages_installed (JSON)"
    echo ""
    echo "You can now use the new baremetal server functionality!"
    
    # Show the updated schema
    echo ""
    echo "Updated servers table schema:"
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE servers;"
else
    echo "❌ Database migration failed!"
    exit 1
fi