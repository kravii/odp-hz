# Baremetal Server Management - Deployment Steps

## Prerequisites
- MySQL database running
- Node.js backend running
- React frontend running
- SSH access to target servers for monitoring setup

## Step 1: Database Migration

### Option A: Using the migration script
```bash
# Set your MySQL credentials (if different from defaults)
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=dc_management
export DB_USER=root
export DB_PASSWORD=your_password

# Run the migration
./scripts/migrate-mysql-baremetal.sh
```

### Option B: Manual migration
```bash
# Connect to MySQL
mysql -u root -p dc_management

# Run the migration SQL
source backend/database/migrations/add_baremetal_fields_mysql.sql
```

## Step 2: Update Environment Variables

Create or update your `.env` file in the backend directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dc_management
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=5000
NODE_ENV=production
```

## Step 3: Restart Backend Service

```bash
# Stop the current backend
pkill -f "node server.js" || pkill -f "nodemon"

# Start the backend with new configuration
cd backend
npm start
# or for development
npm run dev
```

## Step 4: Verify Frontend is Running

Make sure your React frontend is running and can connect to the backend:

```bash
cd frontend
npm start
```

## Step 5: Test the New Functionality

### 5.1 Add a Baremetal Server
1. Open your browser and go to the Servers page
2. Click "Add Server"
3. Fill in the server details:
   - Hostname: `baremetal-01`
   - IP Address: `192.168.1.100`
   - Total CPU: `8`
   - Total Memory: `32`
   - Total Storage: `500`
   - SSH Port: `22`
   - SSH User: `root`
4. Select Pool Assignment:
   - Pool Type: `VM Pool` or `K8s Pool`
   - Select a pool from the dropdown
5. Enable Monitoring and select packages:
   - Check "Enable Monitoring"
   - Select packages: Prometheus, Grafana, Node Exporter, Docker
6. Click "Add Server"

### 5.2 Assign Server to Pool (Alternative Method)
1. Select a server from the table
2. Click the Actions menu (three dots)
3. Select "Assign to Pool"
4. Choose pool type and specific pool
5. Click "Assign to Pool"

### 5.3 Setup Monitoring (Alternative Method)
1. Select a server from the table
2. Click the Actions menu
3. Select "Setup Monitoring"
4. Choose packages to install
5. Click "Setup Monitoring"

## Step 6: Verify Dashboard Integration

1. Go to the Dashboard page
2. Check that you see:
   - "Baremetal with Monitoring" statistics card
   - Enhanced server status with pool and monitoring information
   - Server list showing pool assignments

## Troubleshooting

### Database Connection Issues
```bash
# Test MySQL connection
mysql -h localhost -u root -p dc_management -e "SELECT 1;"

# Check if tables exist
mysql -h localhost -u root -p dc_management -e "SHOW TABLES;"

# Check servers table structure
mysql -h localhost -u root -p dc_management -e "DESCRIBE servers;"
```

### Backend Issues
```bash
# Check backend logs
tail -f backend/logs/app.log

# Check if backend is running
ps aux | grep "node server.js"

# Check backend health
curl http://localhost:5000/api/health
```

### Frontend Issues
```bash
# Check if frontend is running
ps aux | grep "react-scripts"

# Check frontend logs in browser console
# Open Developer Tools (F12) and check Console tab
```

### Monitoring Setup Issues
- Ensure SSH access to target servers
- Check firewall rules for monitoring ports (9090, 3000, 9100)
- Verify server credentials are correct
- Check server logs for SSH connection errors

## Security Considerations

1. **SSH Keys**: Use SSH keys instead of passwords when possible
2. **Firewall**: Ensure monitoring ports are properly configured
3. **Authentication**: Secure monitoring endpoints with authentication
4. **Updates**: Regularly update monitoring packages

## Monitoring Endpoints

After successful setup, you can access:
- **Prometheus**: `http://server-ip:9090`
- **Grafana**: `http://server-ip:3000` (default: admin/admin)
- **Node Exporter**: `http://server-ip:9100/metrics`

## Next Steps

1. Test adding multiple servers
2. Assign servers to different pools
3. Set up monitoring on various servers
4. Monitor the dashboard for real-time status
5. Configure alerts and notifications

## Support

If you encounter any issues:
1. Check the logs in `backend/logs/`
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Check server SSH connectivity
5. Review firewall configurations