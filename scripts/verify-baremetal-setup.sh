#!/bin/bash

# Script to verify baremetal server management setup

set -e

echo "🔍 Verifying Baremetal Server Management Setup..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend/config/database.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check database configuration
echo "📊 Checking database configuration..."
if grep -q "dialect: 'mysql'" backend/config/database.js; then
    echo "✅ Database configured for MySQL"
else
    echo "❌ Database not configured for MySQL"
    echo "   Please update backend/config/database.js to use MySQL"
fi

# Check if migration files exist
echo "📁 Checking migration files..."
if [ -f "backend/database/migrations/add_baremetal_fields_mysql.sql" ]; then
    echo "✅ MySQL migration file exists"
else
    echo "❌ MySQL migration file missing"
fi

if [ -f "scripts/migrate-mysql-baremetal.sh" ]; then
    echo "✅ Migration script exists"
else
    echo "❌ Migration script missing"
fi

# Check if monitoring service exists
echo "🔧 Checking monitoring service..."
if [ -f "backend/services/monitoringService.js" ]; then
    echo "✅ Monitoring service exists"
else
    echo "❌ Monitoring service missing"
fi

# Check if frontend files are updated
echo "🖥️  Checking frontend updates..."
if grep -q "poolType" frontend/src/pages/Servers/Servers.js; then
    echo "✅ Servers page updated with pool functionality"
else
    echo "❌ Servers page not updated"
fi

if grep -q "monitoringEnabled" frontend/src/pages/Servers/Servers.js; then
    echo "✅ Servers page updated with monitoring functionality"
else
    echo "❌ Servers page not updated with monitoring"
fi

if grep -q "Baremetal with Monitoring" frontend/src/pages/Dashboard/Dashboard.js; then
    echo "✅ Dashboard updated with baremetal statistics"
else
    echo "❌ Dashboard not updated"
fi

# Check if backend API files are updated
echo "🔌 Checking backend API updates..."
if grep -q "poolType" backend/models/Server.js; then
    echo "✅ Server model updated with pool fields"
else
    echo "❌ Server model not updated"
fi

if grep -q "assign-pool" backend/routes/servers.js; then
    echo "✅ Server routes updated with pool assignment"
else
    echo "❌ Server routes not updated"
fi

if grep -q "setup-monitoring" backend/routes/servers.js; then
    echo "✅ Server routes updated with monitoring setup"
else
    echo "❌ Server routes not updated with monitoring"
fi

# Check if MySQL client is available
echo "🗄️  Checking MySQL client..."
if command -v mysql &> /dev/null; then
    echo "✅ MySQL client available"
else
    echo "❌ MySQL client not found"
    echo "   Install with: sudo apt install mysql-client"
fi

# Check if Node.js dependencies are installed
echo "📦 Checking Node.js dependencies..."
if [ -f "backend/node_modules/mysql2/package.json" ]; then
    echo "✅ MySQL2 driver installed"
else
    echo "❌ MySQL2 driver not installed"
    echo "   Install with: cd backend && npm install"
fi

echo ""
echo "🎯 Summary:"
echo "==========="

# Count successful checks
success_count=$(grep -c "✅" <<< "$(bash -c 'source /dev/stdin' <<< "$(cat)" <<< "$(cat)")" 2>/dev/null || echo "0")
total_checks=$(grep -c -E "(✅|❌)" <<< "$(bash -c 'source /dev/stdin' <<< "$(cat)" <<< "$(cat)")" 2>/dev/null || echo "0")

echo "✅ Successful checks: $success_count"
echo "❌ Failed checks: $((total_checks - success_count))"

if [ $success_count -eq $total_checks ]; then
    echo ""
    echo "🎉 All checks passed! Your baremetal server management setup is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Run database migration: ./scripts/migrate-mysql-baremetal.sh"
    echo "2. Restart your backend service"
    echo "3. Test adding a baremetal server from the UI"
else
    echo ""
    echo "⚠️  Some checks failed. Please review the issues above before proceeding."
fi

echo ""
echo "📚 For detailed deployment instructions, see: docs/DEPLOYMENT_STEPS.md"