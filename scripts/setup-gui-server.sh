#!/bin/bash

# Internal DC Management System - GUI Server Setup Script
# This script automates the setup of the GUI server (central management interface)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Configuration variables
DOMAIN_NAME="${DOMAIN_NAME:-your-domain.com}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-dcpassword123}"
MYSQL_DATABASE="${MYSQL_DATABASE:-dc_management}"
MYSQL_USER="${MYSQL_USER:-dcuser}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-dcpass123}"
JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-change-this-in-production}"
HETZNER_API_TOKEN="${HETZNER_API_TOKEN:-your-hetzner-api-token}"
HETZNER_SSH_KEY_PATH="${HETZNER_SSH_KEY_PATH:-/path/to/private/key}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/your/webhook/url}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-admin123}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    error "sudo is required but not installed. Please install sudo first."
fi

log "Starting GUI Server Setup for Internal DC Management System"

# Step 1: Update system packages
log "Step 1: Updating system packages"
sudo dnf update -y

# Step 2: Install essential packages
log "Step 2: Installing essential packages"
sudo dnf install -y curl wget vim git htop net-tools firewalld

# Step 3: Configure firewall
log "Step 3: Configuring firewall"
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Open required ports
sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
sudo firewall-cmd --permanent --add-port=80/tcp    # HTTP
sudo firewall-cmd --permanent --add-port=443/tcp   # HTTPS
sudo firewall-cmd --permanent --add-port=3000/tcp  # Frontend
sudo firewall-cmd --permanent --add-port=3001/tcp  # Backend API
sudo firewall-cmd --permanent --add-port=3306/tcp  # MySQL
sudo firewall-cmd --permanent --add-port=9090/tcp  # Prometheus
sudo firewall-cmd --permanent --add-port=3001/tcp  # Grafana
sudo firewall-cmd --reload

# Step 4: Install Node.js
log "Step 4: Installing Node.js 18.x"
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node_version=$(node --version)
npm_version=$(npm --version)
log "Node.js version: $node_version"
log "npm version: $npm_version"

# Step 5: Install MySQL
log "Step 5: Installing MySQL 8.0"
sudo dnf install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Get temporary root password
temp_password=$(sudo grep 'temporary password' /var/log/mysqld.log | awk '{print $NF}')
log "Temporary MySQL root password: $temp_password"

# Step 6: Secure MySQL installation
log "Step 6: Securing MySQL installation"
sudo mysql -u root -p"$temp_password" --connect-expired-password <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';
CREATE DATABASE $MYSQL_DATABASE;
CREATE USER '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

# Step 7: Clone repository
log "Step 7: Cloning repository"
if [ ! -d "internal-dc-management" ]; then
    git clone <repository-url> internal-dc-management
fi

cd internal-dc-management

# Step 8: Setup backend
log "Step 8: Setting up backend"
cd backend
npm install

# Create environment file
cat > .env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$MYSQL_DATABASE
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD

# Server Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=$JWT_SECRET

# Hetzner Configuration
HETZNER_API_TOKEN=$HETZNER_API_TOKEN
HETZNER_SSH_KEY_PATH=$HETZNER_SSH_KEY_PATH
HETZNER_SSH_USER=root

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your-channel-id
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

# Monitoring Configuration
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# VM Configuration
VM_DEFAULT_USER=acceldata
VM_DEFAULT_SSH_KEY_PATH=/path/to/vm/ssh/key
VM_IP_RANGE_START=10.0.1.1
VM_IP_RANGE_END=10.0.1.254

# Kubernetes Configuration
K8S_CLUSTER_NAME=dc-cluster
K8S_VERSION=1.28.0
RANCHER_URL=https://rancher.$DOMAIN_NAME
RANCHER_TOKEN=your-rancher-token

# Storage Configuration
STORAGE_POOL_PATH=/mnt/storage-pool
MAX_STORAGE_PER_SERVER=1536
EOF

# Step 9: Initialize database
log "Step 9: Initializing database"
mysql -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE < database/init.sql

# Step 10: Setup frontend
log "Step 10: Setting up frontend"
cd ../frontend
npm install
npm run build

# Step 11: Install Nginx
log "Step 11: Installing Nginx"
sudo dnf install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/dc-frontend.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    root $(pwd)/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Step 12: Create systemd service for backend
log "Step 12: Creating systemd service for backend"
sudo tee /etc/systemd/system/dc-backend.service > /dev/null <<EOF
[Unit]
Description=DC Management Backend
After=network.target mysql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start backend service
sudo systemctl daemon-reload
sudo systemctl enable dc-backend
sudo systemctl start dc-backend

# Step 13: Install Prometheus
log "Step 13: Installing Prometheus"
sudo useradd --no-create-home --shell /bin/false prometheus
sudo mkdir /etc/prometheus
sudo mkdir /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# Download and install Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xzf prometheus-2.45.0.linux-amd64.tar.gz
sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/
sudo cp -r prometheus-2.45.0.linux-amd64/consoles /etc/prometheus
sudo cp -r prometheus-2.45.0.linux-amd64/console_libraries /etc/prometheus
sudo chown -R prometheus:prometheus /etc/prometheus/consoles
sudo chown -R prometheus:prometheus /etc/prometheus/console_libraries

# Create Prometheus configuration
sudo tee /etc/prometheus/prometheus.yml > /dev/null <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
EOF

# Create Prometheus systemd service
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
    --config.file /etc/prometheus/prometheus.yml \\
    --storage.tsdb.path /var/lib/prometheus/ \\
    --web.console.templates=/etc/prometheus/consoles \\
    --web.console.libraries=/etc/prometheus/console_libraries \\
    --web.listen-address=0.0.0.0:9090 \\
    --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF

# Start and enable Prometheus
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus

# Step 14: Install Node Exporter
log "Step 14: Installing Node Exporter"
sudo useradd --no-create-home --shell /bin/false node_exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xzf node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create Node Exporter systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --collector.systemd --collector.processes --collector.cpu.info

[Install]
WantedBy=multi-user.target
EOF

# Start and enable Node Exporter
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# Step 15: Install Grafana
log "Step 15: Installing Grafana"
sudo dnf install -y https://dl.grafana.com/enterprise/release/grafana-enterprise-10.0.0-1.x86_64.rpm
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
sudo grafana-cli admin reset-admin-password $GRAFANA_PASSWORD

# Step 16: Cleanup
log "Step 16: Cleaning up temporary files"
rm -rf /tmp/prometheus-2.45.0.linux-amd64*
rm -rf /tmp/node_exporter-1.6.1.linux-amd64*

# Step 17: Final verification
log "Step 17: Verifying installation"

# Check services
services=("mysqld" "dc-backend" "nginx" "prometheus" "node_exporter" "grafana-server")
for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        log "✓ $service is running"
    else
        error "✗ $service is not running"
    fi
done

# Test endpoints
log "Testing endpoints..."
if curl -s http://localhost:3001/health > /dev/null; then
    log "✓ Backend API is accessible"
else
    warning "✗ Backend API is not accessible"
fi

if curl -s http://localhost:80 > /dev/null; then
    log "✓ Frontend is accessible"
else
    warning "✗ Frontend is not accessible"
fi

if curl -s http://localhost:9090 > /dev/null; then
    log "✓ Prometheus is accessible"
else
    warning "✗ Prometheus is not accessible"
fi

if curl -s http://localhost:3000 > /dev/null; then
    log "✓ Grafana is accessible"
else
    warning "✗ Grafana is not accessible"
fi

log "GUI Server setup completed successfully!"
log "Access URLs:"
log "  Frontend: http://$DOMAIN_NAME"
log "  Backend API: http://$DOMAIN_NAME/api"
log "  Prometheus: http://$DOMAIN_NAME:9090"
log "  Grafana: http://$DOMAIN_NAME:3000 (admin/$GRAFANA_PASSWORD)"
log ""
log "Next steps:"
log "1. Configure your domain DNS to point to this server"
log "2. Set up SSL certificates with Let's Encrypt"
log "3. Configure your Hetzner API token and SSH keys"
log "4. Set up Kubernetes and VM servers using the setup scripts"
log "5. Configure monitoring and alerting"