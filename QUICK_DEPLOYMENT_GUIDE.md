# 🚀 Quick Deployment Guide - Baremetal Server Management

## ✅ What's Been Updated

I've updated your codebase to work with **MySQL** (not SQLite) and added comprehensive baremetal server management functionality.

### Key Changes Made:
1. **Database Config**: Updated `backend/config/database.js` to use MySQL
2. **Migration Script**: Created MySQL migration for baremetal fields
3. **Backend API**: Enhanced server management with pool assignment and monitoring
4. **Frontend GUI**: Updated Servers page with new functionality
5. **Dashboard**: Enhanced with baremetal server statistics

## 🎯 Quick Deployment Steps

### Step 1: Database Migration
```bash
# Set your MySQL credentials (update as needed)
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=dc_management
export DB_USER=root
export DB_PASSWORD=your_mysql_password

# Run the migration
./scripts/migrate-mysql-baremetal.sh
```

### Step 2: Update Environment Variables
Create/update `backend/.env`:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dc_management
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=production
```

### Step 3: Restart Backend
```bash
# Stop current backend
pkill -f "node server.js" || pkill -f "nodemon"

# Start backend
cd backend
npm start
```

### Step 4: Test the New Functionality

#### Add a Baremetal Server:
1. Go to **Servers** page in your UI
2. Click **"Add Server"**
3. Fill in server details:
   - Hostname: `baremetal-01`
   - IP Address: `192.168.1.100`
   - Total CPU: `8`
   - Total Memory: `32`
   - Total Storage: `500`
4. **Pool Assignment**:
   - Select Pool Type: `VM Pool` or `K8s Pool`
   - Choose a pool from dropdown
5. **Monitoring Setup**:
   - Check "Enable Monitoring"
   - Select packages: Prometheus, Grafana, Node Exporter, Docker
6. Click **"Add Server"**

#### Alternative: Assign Pool Later
1. Select server from table
2. Click Actions menu (three dots)
3. Select **"Assign to Pool"**
4. Choose pool type and specific pool

#### Alternative: Setup Monitoring Later
1. Select server from table
2. Click Actions menu
3. Select **"Setup Monitoring"**
4. Choose packages to install

## 🔧 New Features Available

### 1. Enhanced Add Server Form
- Pool assignment (VM or K8s)
- Monitoring package selection
- SSH credential configuration

### 2. Pool Assignment
- Assign servers to VM pools for virtual machines
- Assign servers to Kubernetes pools for containers
- Track resource allocation

### 3. Monitoring Setup
- Install Prometheus (port 9090)
- Install Grafana (port 3000)
- Install Node Exporter (port 9100)
- Install Docker and Kubectl
- Automatic service configuration

### 4. Dashboard Integration
- "Baremetal with Monitoring" statistics card
- Enhanced server status with pool information
- Real-time monitoring status

## 📁 Files Modified/Created

### Modified Files:
- `backend/config/database.js` - Updated to MySQL
- `backend/models/Server.js` - Added pool and monitoring fields
- `backend/routes/servers.js` - Enhanced API endpoints
- `frontend/src/pages/Servers/Servers.js` - Enhanced GUI
- `frontend/src/pages/Dashboard/Dashboard.js` - Dashboard integration

### New Files:
- `backend/services/monitoringService.js` - Monitoring service
- `backend/database/migrations/add_baremetal_fields_mysql.sql` - MySQL migration
- `scripts/migrate-mysql-baremetal.sh` - Migration script
- `scripts/verify-baremetal-setup.sh` - Verification script
- `docs/DEPLOYMENT_STEPS.md` - Detailed deployment guide

## 🚨 Important Notes

1. **Database**: The code is now configured for MySQL, not SQLite
2. **SSH Access**: Monitoring setup requires SSH access to target servers
3. **Firewall**: Monitoring ports (9090, 3000, 9100) need to be open
4. **Credentials**: Ensure SSH credentials are correct for monitoring setup

## 🔍 Verification

Run the verification script to check your setup:
```bash
./scripts/verify-baremetal-setup.sh
```

## 📚 Monitoring Endpoints

After successful setup:
- **Prometheus**: `http://server-ip:9090`
- **Grafana**: `http://server-ip:3000` (admin/admin)
- **Node Exporter**: `http://server-ip:9100/metrics`

## 🆘 Troubleshooting

### Database Issues:
```bash
# Test MySQL connection
mysql -h localhost -u root -p dc_management -e "SELECT 1;"

# Check servers table
mysql -h localhost -u root -p dc_management -e "DESCRIBE servers;"
```

### Backend Issues:
```bash
# Check if backend is running
ps aux | grep "node server.js"

# Check backend logs
tail -f backend/logs/app.log
```

### Frontend Issues:
- Check browser console for errors
- Verify API endpoints are accessible
- Check network tab for failed requests

## 🎉 You're Ready!

Once you complete these steps, you'll have:
- ✅ Full baremetal server management
- ✅ Pool assignment functionality
- ✅ Automated monitoring setup
- ✅ Enhanced dashboard with real-time status
- ✅ Comprehensive server tracking

The system is now ready to manage your baremetal infrastructure with full pool assignment and monitoring capabilities!