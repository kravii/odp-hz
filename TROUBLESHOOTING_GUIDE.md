# 🔧 Troubleshooting Guide - Server Functions Not Working

## 🚨 Step-by-Step Debugging

### Step 1: Check Backend Status
```bash
# Check if backend is running
ps aux | grep "node server.js"

# If not running, start it
cd backend
npm start
```

### Step 2: Check Database
```bash
# Test database connection
mysql -h localhost -u root -p dc_management -e "SELECT 1;"

# Check if baremetal fields exist
mysql -h localhost -u root -p dc_management -e "DESCRIBE servers;"
```

### Step 3: Test API Endpoints
```bash
# Run the test script
./scripts/test-api-endpoints.sh

# Or test manually
curl http://localhost:5000/api/servers
curl http://localhost:5000/api/servers/pools/available
```

### Step 4: Check Browser Console
1. Open your browser
2. Go to the Servers page
3. Press F12 to open Developer Tools
4. Go to Console tab
5. Try to use Assign Pool, Setup Monitoring, or Health Check
6. Look for error messages

### Step 5: Check Network Tab
1. In Developer Tools, go to Network tab
2. Try the functions again
3. Look for failed API calls (red entries)
4. Click on failed requests to see error details

## 🐛 Common Issues & Solutions

### Issue 1: "Network Error" or "Failed to fetch"
**Cause**: Backend not running or wrong port
**Solution**:
```bash
# Check if backend is running
ps aux | grep "node server.js"

# Start backend
cd backend
npm start

# Check port
netstat -tlnp | grep 5000
```

### Issue 2: "401 Unauthorized" Error
**Cause**: Authentication token missing or expired
**Solution**:
1. Check browser console for auth errors
2. Log out and log back in
3. Check if token exists: F12 → Application → Local Storage → token

### Issue 3: "404 Not Found" Error
**Cause**: API endpoint doesn't exist
**Solution**:
```bash
# Check if routes are loaded
curl http://localhost:5000/api/servers

# Check backend logs
tail -f backend/logs/app.log
```

### Issue 4: "500 Internal Server Error"
**Cause**: Backend code error
**Solution**:
```bash
# Check backend logs
tail -f backend/logs/app.log

# Look for specific error messages
grep -i "error" backend/logs/app.log | tail -10
```

### Issue 5: "Pool not found" Error
**Cause**: No pools exist in database
**Solution**:
```bash
# Check pools
mysql -h localhost -u root -p dc_management -e "SELECT * FROM vm_pools;"
mysql -h localhost -u root -p dc_management -e "SELECT * FROM k8s_pools;"

# If empty, create default pools
mysql -h localhost -u root -p dc_management -e "
INSERT IGNORE INTO vm_pools (name, description, status) 
VALUES ('default-vm-pool', 'Default VM pool', 'active');
INSERT IGNORE INTO k8s_pools (name, description, cluster_name, status) 
VALUES ('default-k8s-pool', 'Default K8s pool', 'dc-cluster', 'active');"
```

### Issue 6: "Cannot connect to server" Error
**Cause**: SSH connection failed
**Solution**:
1. Check server IP address
2. Verify SSH port (default 22)
3. Check SSH user (default root)
4. Test SSH manually: `ssh root@server_ip`

## 🔍 Detailed Debugging

### Check Backend Logs
```bash
# Real-time logs
tail -f backend/logs/app.log

# Search for specific errors
grep -i "assign.*pool" backend/logs/app.log
grep -i "monitoring" backend/logs/app.log
grep -i "health.*check" backend/logs/app.log
```

### Check Frontend Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for these debug messages:
   - `Assigning pool: {id: X, poolData: {...}}`
   - `Setting up monitoring: {id: X, monitoringData: {...}}`
   - `Running health check for server: X`

### Check Network Requests
1. Go to Network tab in Developer Tools
2. Try the functions
3. Look for these API calls:
   - `POST /api/servers/X/assign-pool`
   - `POST /api/servers/X/setup-monitoring`
   - `POST /api/servers/X/health-check`
4. Check response status and error messages

## 🧪 Manual Testing

### Test Assign Pool
```bash
# Get auth token from browser (F12 → Application → Local Storage)
TOKEN="your_jwt_token_here"

# Test assign pool
curl -X POST http://localhost:5000/api/servers/1/assign-pool \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"poolType": "vm", "poolId": 1}'
```

### Test Setup Monitoring
```bash
curl -X POST http://localhost:5000/api/servers/1/setup-monitoring \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packages": ["prometheus", "node-exporter"]}'
```

### Test Health Check
```bash
curl -X POST http://localhost:5000/api/servers/1/health-check \
  -H "Authorization: Bearer $TOKEN"
```

## 📋 Checklist

- [ ] Backend is running (`ps aux | grep "node server.js"`)
- [ ] Database is accessible (`mysql -h localhost -u root -p dc_management -e "SELECT 1;"`)
- [ ] Baremetal fields exist (`DESCRIBE servers;`)
- [ ] Pools exist (`SELECT * FROM vm_pools; SELECT * FROM k8s_pools;`)
- [ ] API responds (`curl http://localhost:5000/api/servers`)
- [ ] Authentication token exists (browser → F12 → Application → Local Storage)
- [ ] No JavaScript errors in browser console
- [ ] No failed network requests in Network tab
- [ ] Backend logs show no errors

## 🆘 Still Not Working?

If nothing above works, please provide:

1. **Exact error message** from browser console
2. **Backend log output** when you try the functions
3. **Network tab screenshot** showing failed requests
4. **Database status** (servers count, pools count)
5. **Backend status** (running/not running, port)

## 🚀 Quick Fix Commands

```bash
# Restart everything
pkill -f "node server.js"
cd backend && npm start

# Check database
mysql -h localhost -u root -p dc_management -e "DESCRIBE servers;"

# Test API
curl http://localhost:5000/api/servers

# Run debug script
./scripts/debug-server-functions.sh
```

Let me know what specific error messages you're seeing and I can help you fix them! 🔧