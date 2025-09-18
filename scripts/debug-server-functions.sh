#!/bin/bash

# Debug script for server functions

set -e

echo "🔍 Debugging Server Functions..."
echo "================================"

# Check if we're in the right directory
if [ ! -f "backend/routes/servers.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📊 Checking backend status..."
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Backend is running"
    BACKEND_PID=$(pgrep -f "node server.js")
    echo "   PID: $BACKEND_PID"
else
    echo "❌ Backend is not running"
    echo "   Start with: cd backend && npm start"
fi

echo ""
echo "🗄️ Checking database connection..."
if command -v mysql &> /dev/null; then
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_NAME=${DB_NAME:-dc_management}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-rootpassword}
    
    if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database connection successful"
        
        # Check if baremetal fields exist
        echo "🔧 Checking baremetal fields..."
        FIELD_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW COLUMNS FROM servers LIKE 'pool_type';" 2>/dev/null | wc -l)
        if [ "$FIELD_COUNT" -eq 2 ]; then
            echo "✅ Baremetal fields exist"
        else
            echo "❌ Baremetal fields missing - run migration"
        fi
        
        # Check servers count
        SERVER_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM servers;" 2>/dev/null | tail -n 1)
        echo "📈 Servers in database: $SERVER_COUNT"
        
        # Check pools count
        VM_POOL_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM vm_pools;" 2>/dev/null | tail -n 1)
        K8S_POOL_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as count FROM k8s_pools;" 2>/dev/null | tail -n 1)
        echo "📦 VM Pools: $VM_POOL_COUNT, K8s Pools: $K8S_POOL_COUNT"
        
    else
        echo "❌ Database connection failed"
        echo "   Check your database credentials and ensure MySQL is running"
    fi
else
    echo "❌ MySQL client not found"
fi

echo ""
echo "🌐 Checking API endpoints..."
if command -v curl &> /dev/null; then
    # Test basic API
    if curl -s http://localhost:5000/api/servers > /dev/null 2>&1; then
        echo "✅ API is responding"
    else
        echo "❌ API is not responding"
        echo "   Check if backend is running on port 5000"
    fi
else
    echo "⚠️ curl not found - cannot test API endpoints"
fi

echo ""
echo "📁 Checking file modifications..."
if grep -q "Op.or" backend/routes/servers.js; then
    echo "✅ Sequelize query fix applied"
else
    echo "❌ Sequelize query fix missing"
fi

if grep -q "auth.*assign-pool" backend/routes/servers.js; then
    echo "✅ Authentication fix applied"
else
    echo "❌ Authentication fix missing"
fi

if grep -q "console.log.*Assigning pool" frontend/src/pages/Servers/Servers.js; then
    echo "✅ Frontend debugging added"
else
    echo "❌ Frontend debugging missing"
fi

echo ""
echo "🔍 Recent backend logs (last 20 lines)..."
if [ -f "backend/logs/app.log" ]; then
    tail -20 backend/logs/app.log
else
    echo "❌ No log file found at backend/logs/app.log"
fi

echo ""
echo "🎯 Next steps:"
echo "1. If backend is not running: cd backend && npm start"
echo "2. If database fields missing: ./scripts/migrate-mysql-baremetal.sh"
echo "3. If API not responding: check port 5000 and firewall"
echo "4. Test functions in UI and check browser console for errors"
echo "5. Check backend logs for detailed error messages"

echo ""
echo "📞 For detailed debugging:"
echo "- Backend logs: tail -f backend/logs/app.log"
echo "- Browser console: F12 → Console tab"
echo "- Network tab: F12 → Network tab (check API calls)"