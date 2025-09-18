#!/bin/bash

# Script to migrate SQLite database for baremetal server fields
# This script adds the new fields for pool assignment and monitoring

set -e

echo "Starting SQLite database migration for baremetal server fields..."

# Check if we're in the right directory
if [ ! -f "backend/config/database.js" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check if SQLite is available
if ! command -v sqlite3 &> /dev/null; then
    echo "Error: sqlite3 command not found. Please install SQLite."
    exit 1
fi

# Set database path
DB_PATH="./backend/database.sqlite"

# Check if database exists, if not create it
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found. Creating new database..."
    # Create the database by running the SQLite init script
    sqlite3 "$DB_PATH" < backend/database/init_sqlite.sql
    echo "Database created successfully!"
fi

echo "Running migration on database: $DB_PATH"

# Run the migration
sqlite3 "$DB_PATH" < backend/database/migrations/add_baremetal_fields_sqlite.sql

if [ $? -eq 0 ]; then
    echo "✅ SQLite database migration completed successfully!"
    echo "Added fields:"
    echo "  - pool_type (TEXT: 'vm', 'k8s', 'none')"
    echo "  - pool_id (INTEGER, nullable)"
    echo "  - monitoring_enabled (INTEGER: 0 or 1)"
    echo "  - packages_installed (TEXT: JSON array)"
    echo ""
    echo "You can now use the new baremetal server functionality!"
    
    # Show the updated schema
    echo ""
    echo "Updated servers table schema:"
    sqlite3 "$DB_PATH" ".schema servers"
else
    echo "❌ Database migration failed!"
    exit 1
fi