#!/bin/bash

# Simple API test script

echo "🧪 Testing API Endpoints..."
echo "=========================="

API_BASE="http://localhost:5000"

echo "1️⃣ Testing basic API connectivity..."
if curl -s "$API_BASE/api/servers" > /dev/null 2>&1; then
    echo "✅ API is responding"
else
    echo "❌ API is not responding"
    echo "   Make sure backend is running: cd backend && npm start"
    exit 1
fi

echo ""
echo "2️⃣ Testing servers endpoint..."
SERVER_RESPONSE=$(curl -s "$API_BASE/api/servers")
if echo "$SERVER_RESPONSE" | grep -q "success"; then
    echo "✅ Servers endpoint working"
    SERVER_COUNT=$(echo "$SERVER_RESPONSE" | grep -o '"count":[0-9]*' | cut -d: -f2)
    echo "   Found $SERVER_COUNT servers"
else
    echo "❌ Servers endpoint failed"
    echo "   Response: $SERVER_RESPONSE"
fi

echo ""
echo "3️⃣ Testing pools endpoint..."
POOLS_RESPONSE=$(curl -s "$API_BASE/api/servers/pools/available")
if echo "$POOLS_RESPONSE" | grep -q "success"; then
    echo "✅ Pools endpoint working"
else
    echo "❌ Pools endpoint failed"
    echo "   Response: $POOLS_RESPONSE"
fi

echo ""
echo "4️⃣ Testing health check endpoint..."
# Get first server ID
SERVER_ID=$(echo "$SERVER_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$SERVER_ID" ]; then
    HEALTH_RESPONSE=$(curl -s -X POST "$API_BASE/api/servers/$SERVER_ID/health-check")
    if echo "$HEALTH_RESPONSE" | grep -q "success"; then
        echo "✅ Health check endpoint working"
    else
        echo "❌ Health check endpoint failed"
        echo "   Response: $HEALTH_RESPONSE"
    fi
else
    echo "⚠️ No servers found to test health check"
fi

echo ""
echo "📋 Summary:"
echo "==========="
echo "API Base URL: $API_BASE"
echo "Servers: $SERVER_COUNT"
echo "Server ID for testing: $SERVER_ID"

echo ""
echo "🔍 To test with authentication:"
echo "1. Get auth token from browser (F12 → Application → Local Storage)"
echo "2. Use: curl -H 'Authorization: Bearer YOUR_TOKEN' $API_BASE/api/servers"