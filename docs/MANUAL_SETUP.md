# Manual Setup Guide for Internal DC Management System

This guide provides step-by-step instructions for manually setting up the Internal DC Management System on Hetzner baremetal servers running Rocky Linux 9.

## Prerequisites

- Access to Hetzner baremetal servers (Rocky Linux 9)
- Private SSH key for server access
- MySQL database server
- Domain name for the application (optional)

## Table of Contents

1. [Server Preparation](#server-preparation)
2. [Database Setup](#database-setup)
3. [Backend Installation](#backend-installation)
4. [Frontend Installation](#frontend-installation)
5. [Infrastructure Setup](#infrastructure-setup)
6. [Monitoring Setup](#monitoring-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Service Configuration](#service-configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Server Preparation

### 1. Update System Packages

```bash
# Update all packages
sudo dnf update -y

# Install essential packages
sudo dnf install -y curl wget vim git htop net-tools
```

### 2. Configure Firewall

```bash
# Enable and start firewalld
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
```

### 3. Install Node.js and npm

```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

### 4. Install Docker (for VM provisioning)

```bash
# Install Docker
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

### 5. Install Virtualization Tools

```bash
# Install KVM and libvirt
sudo dnf install -y qemu-kvm libvirt virt-install bridge-utils

# Start and enable libvirt
sudo systemctl start libvirtd
sudo systemctl enable libvirtd

# Add user to libvirt group
sudo usermod -aG libvirt $USER
```

## Database Setup

### 1. Install MySQL

```bash
# Install MySQL 8.0
sudo dnf install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Secure MySQL installation
sudo mysql_secure_installation
```

### 2. Create Database and User

```bash
# Login to MySQL as root
sudo mysql -u root -p

# Create database and user
CREATE DATABASE dc_management;
CREATE USER 'dcuser'@'localhost' IDENTIFIED BY 'dcpass123';
GRANT ALL PRIVILEGES ON dc_management.* TO 'dcuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Initialize Database Schema

```bash
# Import database schema
mysql -u dcuser -p dc_management < /path/to/backend/database/init.sql
```

## Backend Installation

### 1. Clone and Setup Backend

```bash
# Clone the repository
git clone <repository-url>
cd internal-dc-management/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit environment variables
vim .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dc_management
DB_USER=dcuser
DB_PASSWORD=dcpass123

# Server Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Hetzner Configuration
HETZNER_API_TOKEN=your-hetzner-api-token
HETZNER_SSH_KEY_PATH=/path/to/private/key
HETZNER_SSH_USER=root

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your-channel-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Monitoring Configuration
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
GRAFANA_PASSWORD=admin123

# VM Configuration
VM_DEFAULT_USER=acceldata
VM_DEFAULT_SSH_KEY_PATH=/path/to/vm/ssh/key
VM_IP_RANGE_START=10.0.1.1
VM_IP_RANGE_END=10.0.1.254

# Kubernetes Configuration
K8S_CLUSTER_NAME=dc-cluster
K8S_VERSION=1.28.0
RANCHER_URL=https://rancher.your-domain.com
RANCHER_TOKEN=your-rancher-token

# Storage Configuration
STORAGE_POOL_PATH=/mnt/storage-pool
MAX_STORAGE_PER_SERVER=1536
```

### 3. Create Systemd Service

```bash
# Create systemd service file
sudo tee /etc/systemd/system/dc-backend.service > /dev/null <<EOF
[Unit]
Description=DC Management Backend
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/internal-dc-management/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable dc-backend
sudo systemctl start dc-backend
```

## Frontend Installation

### 1. Setup Frontend

```bash
# Navigate to frontend directory
cd /path/to/internal-dc-management/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Install Nginx

```bash
# Install Nginx
sudo dnf install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/conf.d/dc-frontend.conf > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/internal-dc-management/frontend/build;
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
```

## Infrastructure Setup

### 1. Setup VM Provisioning

```bash
# Create VM storage directory
sudo mkdir -p /var/lib/libvirt/images
sudo chown root:root /var/lib/libvirt/images
sudo chmod 755 /var/lib/libvirt/images

# Create storage pool
sudo mkdir -p /mnt/storage-pool
sudo chown root:root /mnt/storage-pool
sudo chmod 755 /mnt/storage-pool

# Setup network bridge
sudo tee /etc/sysconfig/network-scripts/ifcfg-br0 > /dev/null <<EOF
DEVICE=br0
TYPE=Bridge
BOOTPROTO=static
IPADDR=10.0.1.1
NETMASK=255.255.255.0
ONBOOT=yes
EOF

# Restart network
sudo systemctl restart NetworkManager
```

### 2. Setup Kubernetes Cluster

```bash
# Install Kubernetes tools
sudo dnf install -y kubectl kubeadm kubelet

# Setup Kubernetes repository
sudo tee /etc/yum.repos.d/kubernetes.repo > /dev/null <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF

# Install Kubernetes packages
sudo dnf install -y kubelet kubeadm kubectl

# Enable kubelet
sudo systemctl enable kubelet
```

## Monitoring Setup

### 1. Install Prometheus

```bash
# Create Prometheus user
sudo useradd --no-create-home --shell /bin/false prometheus

# Create directories
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

# Create systemd service
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
```

### 2. Install Node Exporter

```bash
# Create node_exporter user
sudo useradd --no-create-home --shell /bin/false node_exporter

# Download and install Node Exporter
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xzf node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
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
```

### 3. Install Grafana

```bash
# Install Grafana
sudo dnf install -y https://dl.grafana.com/enterprise/release/grafana-enterprise-10.0.0-1.x86_64.rpm

# Start and enable Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Set admin password
sudo grafana-cli admin reset-admin-password admin123
```

## SSL/TLS Configuration

### 1. Install Certbot

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Service Configuration

### 1. Configure Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/dc-management > /dev/null <<EOF
/path/to/internal-dc-management/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

### 2. Setup Backup Script

```bash
# Create backup script
sudo tee /usr/local/bin/backup-dc.sh > /dev/null <<EOF
#!/bin/bash

BACKUP_DIR="/backup/dc-management"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u dcuser -p dc_management > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /path/to/internal-dc-management

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

# Make script executable
sudo chmod +x /usr/local/bin/backup-dc.sh

# Add to crontab
echo "0 2 * * * /usr/local/bin/backup-dc.sh" | sudo crontab -
```

## Testing

### 1. Test Backend API

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test database connection
curl http://localhost:3001/api/servers
```

### 2. Test Frontend

```bash
# Test frontend
curl http://localhost:80
```

### 3. Test Monitoring

```bash
# Test Prometheus
curl http://localhost:9090

# Test Node Exporter
curl http://localhost:9100/metrics

# Test Grafana
curl http://localhost:3000
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check MySQL status
   sudo systemctl status mysqld
   
   # Check database connection
   mysql -u dcuser -p dc_management
   ```

2. **Backend Service Issues**
   ```bash
   # Check backend logs
   sudo journalctl -u dc-backend -f
   
   # Check backend status
   sudo systemctl status dc-backend
   ```

3. **Frontend Issues**
   ```bash
   # Check Nginx status
   sudo systemctl status nginx
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Monitoring Issues**
   ```bash
   # Check Prometheus status
   sudo systemctl status prometheus
   
   # Check Node Exporter status
   sudo systemctl status node_exporter
   ```

### Log Locations

- Backend logs: `/path/to/internal-dc-management/backend/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/messages`
- Service logs: `sudo journalctl -u service-name`

### Performance Tuning

1. **MySQL Optimization**
   ```bash
   # Edit MySQL configuration
   sudo vim /etc/my.cnf
   
   # Add performance settings
   [mysqld]
   innodb_buffer_pool_size = 1G
   innodb_log_file_size = 256M
   max_connections = 200
   ```

2. **Node.js Optimization**
   ```bash
   # Set Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

3. **Nginx Optimization**
   ```bash
   # Edit Nginx configuration
   sudo vim /etc/nginx/nginx.conf
   
   # Add performance settings
   worker_processes auto;
   worker_connections 1024;
   ```

## Security Considerations

1. **Firewall Configuration**
   - Only open necessary ports
   - Use fail2ban for SSH protection

2. **SSL/TLS**
   - Use strong SSL certificates
   - Enable HSTS headers

3. **Database Security**
   - Use strong passwords
   - Limit database access

4. **Application Security**
   - Keep packages updated
   - Use environment variables for secrets
   - Implement rate limiting

## Maintenance

### Regular Tasks

1. **System Updates**
   ```bash
   sudo dnf update -y
   ```

2. **Database Maintenance**
   ```bash
   mysqlcheck -u dcuser -p --optimize dc_management
   ```

3. **Log Cleanup**
   ```bash
   sudo logrotate /etc/logrotate.d/dc-management
   ```

4. **Backup Verification**
   ```bash
   /usr/local/bin/backup-dc.sh
   ```

This manual setup guide provides comprehensive instructions for deploying the Internal DC Management System. Follow each section carefully and test each component before proceeding to the next step.