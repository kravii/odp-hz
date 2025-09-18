#!/bin/bash

# Script to fix server creation issues

set -e

echo "🔧 Fixing server creation issues..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "backend/routes/servers.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📊 Checking database schema..."

# Test database schema
node scripts/test-database-schema.js

echo ""
echo "🔍 Checking if migration is needed..."

# Check if baremetal fields exist
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-dc_management}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-rootpassword}

# Check if pool_type field exists
FIELD_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW COLUMNS FROM servers LIKE 'pool_type';" 2>/dev/null | wc -l)

if [ "$FIELD_EXISTS" -eq 2 ]; then
    echo "✅ Baremetal fields already exist in database"
else
    echo "❌ Baremetal fields missing - running migration..."
    
    # Run the migration
    if [ -f "scripts/migrate-mysql-baremetal.sh" ]; then
        ./scripts/migrate-mysql-baremetal.sh
    else
        echo "❌ Migration script not found"
        exit 1
    fi
fi

echo ""
echo "🔄 Restarting backend service..."

# Find and kill existing backend processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

# Wait a moment
sleep 2

echo "✅ Backend processes stopped"

echo ""
echo "🎯 Next steps:"
echo "1. Start your backend service:"
echo "   cd backend && npm start"
echo ""
echo "2. Test adding a server from the UI"
echo ""
echo "3. If you still get errors, check:"
echo "   - Database connection settings in backend/.env"
echo "   - MySQL service is running"
echo "   - Database user has proper permissions"

echo ""
echo "🔍 To verify the fix:"
echo "node scripts/test-database-schema.js"