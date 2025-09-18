# Internal DC Management System - Complete Setup Guide

This comprehensive guide provides step-by-step instructions for setting up the Internal DC Management System across multiple Hetzner baremetal servers running Rocky Linux 9.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [GUI Server Setup](#gui-server-setup)
5. [Kubernetes Server Setup](#kubernetes-server-setup)
6. [VM Server Setup](#vm-server-setup)
7. [Monitoring Setup](#monitoring-setup)
8. [Validation & Testing](#validation--testing)
9. [Troubleshooting](#troubleshooting)

## Overview

The Internal DC Management System consists of:
- **GUI Server**: Central management interface with web UI
- **Kubernetes Servers**: Dedicated servers for K8s cluster management
- **VM Servers**: Dedicated servers for virtual machine provisioning
- **Monitoring Infrastructure**: Prometheus, Grafana, and alerting systems

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GUI Server                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Frontend  │  │   Backend   │  │   Database  │            │
│  │   (React)   │  │  (Node.js)  │  │   (MySQL)  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Servers                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Master Node │  │ Master Node │  │ Master Node │            │
│  │     #1      │  │     #2      │  │     #3      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Worker Node │  │ Worker Node │  │ Worker Node │            │
│  │     #1      │  │     #2      │  │     #3      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VM Servers                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ VM Server  │  │ VM Server  │  │ VM Server  │            │
│  │     #1      │  │     #2      │  │     #3      │            │
│  │ (KVM/Libvirt)│ │ (KVM/Libvirt)│ │ (KVM/Libvirt)│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Hardware Requirements

**GUI Server:**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- Network: 1 Gbps

**Kubernetes Servers:**
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 200+ GB SSD
- Network: 1 Gbps

**VM Servers:**
- CPU: 16+ cores
- RAM: 32+ GB
- Storage: 1.5+ TB SSD
- Network: 1 Gbps

### Software Requirements

- Rocky Linux 9 (all servers)
- SSH access with private key
- Domain name (optional but recommended)
- Hetzner API token
- Slack webhook URL (for notifications)

## GUI Server Setup

The GUI server serves as the central management interface and should be set up first.

### Step 1: Initial Server Preparation

```bash
# Update system packages
sudo dnf update -y

# Install essential packages
sudo dnf install -y curl wget vim git htop net-tools firewalld

# Configure firewall
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

### Step 2: Install Node.js and npm

```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 3: Install MySQL

```bash
# Install MySQL 8.0
sudo dnf install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
-- In MySQL prompt
CREATE DATABASE dc_management;
CREATE USER 'dcuser'@'localhost' IDENTIFIED BY 'dcpass123';
GRANT ALL PRIVILEGES ON dc_management.* TO 'dcuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Clone and Setup Application

```bash
# Clone the repository
git clone <repository-url>
cd internal-dc-management

# Setup backend
cd backend
npm install
cp .env.example .env
```

### Step 5: Configure Environment Variables

Edit `backend/.env` with your configuration:

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

### Step 6: Initialize Database

```bash
# Import database schema
mysql -u dcuser -p dc_management < backend/database/init.sql
```

### Step 7: Setup Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 8: Install Nginx

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

### Step 9: Create Systemd Services

```bash
# Create backend service
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

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable dc-backend
sudo systemctl start dc-backend
```

### Step 10: Install Monitoring (Prometheus & Grafana)

```bash
# Install Prometheus
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

# Install Grafana
sudo dnf install -y https://dl.grafana.com/enterprise/release/grafana-enterprise-10.0.0-1.x86_64.rpm
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
sudo grafana-cli admin reset-admin-password admin123
```

## Kubernetes Server Setup

Follow these steps on each Kubernetes server (both master and worker nodes).

### Step 1: Initial Server Preparation

```bash
# Update system packages
sudo dnf update -y

# Install essential packages
sudo dnf install -y curl wget vim git htop net-tools

# Disable firewall and SELinux
sudo systemctl stop firewalld
sudo systemctl disable firewalld
sudo setenforce 0
sudo sed -i "s/^SELINUX=enforcing$/SELINUX=disabled/" /etc/selinux/config

# Disable swap
sudo swapoff -a
sudo sed -i "/ swap / s/^/#/" /etc/fstab

# Enable kernel modules
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/k8s.conf
echo "net.bridge.bridge-nf-call-iptables = 1" | sudo tee -a /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl --system
```

### Step 2: Install Docker

```bash
# Install Docker
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# Configure containerd
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i "s/SystemdCgroup = false/SystemdCgroup = true/" /etc/containerd/config.toml
sudo systemctl restart containerd
sudo systemctl restart docker
```

### Step 3: Install Kubernetes Components

```bash
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

### Step 4: Master Node Configuration (First Master Only)

```bash
# Initialize cluster
sudo kubeadm init --control-plane-endpoint="dc-cluster-lb" --pod-network-cidr=10.244.0.0/16 --service-cidr=10.96.0.0/12 --upload-certs

# Setup kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install CNI (Calico)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/calico.yaml

# Get join commands
kubeadm token create --print-join-command > /tmp/worker-join-command
kubeadm init phase upload-certs --upload-certs > /tmp/master-join-command
```

### Step 5: Additional Master Nodes

```bash
# Run the master join command from Step 4
sudo kubeadm join dc-cluster-lb:6443 --token <token> --discovery-token-ca-cert-hash <hash> --control-plane --certificate-key <cert-key>

# Setup kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### Step 6: Worker Nodes

```bash
# Run the worker join command from Step 4
sudo kubeadm join dc-cluster-lb:6443 --token <token> --discovery-token-ca-cert-hash <hash>
```

### Step 7: Install HAProxy (Load Balancer)

On the first master node:

```bash
# Install HAProxy
sudo dnf install -y haproxy

# Create HAProxy configuration
sudo tee /etc/haproxy/haproxy.cfg > /dev/null <<EOF
global
    daemon
    log 127.0.0.1:514 local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

defaults
    mode tcp
    log global
    option tcplog
    option dontlognull
    option redispatch
    retries 3
    timeout queue 1m
    timeout connect 10s
    timeout client 1m
    timeout server 1m
    timeout check 10s
    maxconn 3000

frontend k8s-api
    bind *:6443
    mode tcp
    default_backend k8s-masters

backend k8s-masters
    mode tcp
    balance roundrobin
    option tcp-check
    server master1 <master1-ip>:6443 check
    server master2 <master2-ip>:6443 check
    server master3 <master3-ip>:6443 check
EOF

# Start and enable HAProxy
sudo systemctl enable haproxy
sudo systemctl start haproxy
```

### Step 8: Install Rancher Agent

On the first master node:

```bash
# Install Rancher agent
curl -sfL https://get.rancher.io | sh -s - --server <rancher-url> --token <rancher-token>
```

## VM Server Setup

Follow these steps on each VM server.

### Step 1: Initial Server Preparation

```bash
# Update system packages
sudo dnf update -y

# Install essential packages
sudo dnf install -y curl wget vim git htop net-tools

# Configure firewall
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Open required ports
sudo firewall-cmd --permanent --add-port=22/tcp    # SSH
sudo firewall-cmd --permanent --add-port=5900-5999/tcp  # VNC
sudo firewall-cmd --reload
```

### Step 2: Install Virtualization Tools

```bash
# Install KVM and libvirt
sudo dnf install -y qemu-kvm libvirt virt-install bridge-utils

# Start and enable libvirt
sudo systemctl start libvirtd
sudo systemctl enable libvirtd

# Add user to libvirt group
sudo usermod -aG libvirt $USER
```

### Step 3: Setup Storage Pool

```bash
# Create storage directory
sudo mkdir -p /var/lib/libvirt/images
sudo chown root:root /var/lib/libvirt/images
sudo chmod 755 /var/lib/libvirt/images

# Create storage pool
sudo mkdir -p /mnt/storage-pool
sudo chown root:root /mnt/storage-pool
sudo chmod 755 /mnt/storage-pool
```

### Step 4: Setup Network Bridge

```bash
# Create bridge configuration
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

### Step 5: Download OS Images

```bash
# Create images directory
sudo mkdir -p /var/lib/libvirt/images/os-images
sudo chown root:root /var/lib/libvirt/images/os-images

# Download CentOS 7 image
cd /var/lib/libvirt/images/os-images
sudo wget https://cloud.centos.org/centos/7/images/CentOS-7-x86_64-GenericCloud.qcow2

# Download Rocky Linux 9 image
sudo wget https://download.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud.latest.x86_64.qcow2

# Download Ubuntu 22.04 image
sudo wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img
```

### Step 6: Configure SSH Keys

```bash
# Create SSH key directory
sudo mkdir -p /etc/ssh/keys
sudo chmod 700 /etc/ssh/keys

# Copy your SSH public key
sudo cp /path/to/your/public/key /etc/ssh/keys/vm-key.pub
sudo chmod 644 /etc/ssh/keys/vm-key.pub
```

## Monitoring Setup

### Step 1: Install Node Exporter on All Servers

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

### Step 2: Configure Prometheus on GUI Server

```bash
# Update Prometheus configuration to include all servers
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

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+)(?::\\d+)?'
        target_label: __address__
        replacement: '${1}:9100'

  - job_name: 'vm-servers'
    static_configs:
      - targets: ['<vm-server1-ip>:9100', '<vm-server2-ip>:9100', '<vm-server3-ip>:9100']

  - job_name: 'k8s-servers'
    static_configs:
      - targets: ['<k8s-server1-ip>:9100', '<k8s-server2-ip>:9100', '<k8s-server3-ip>:9100']
EOF

# Restart Prometheus
sudo systemctl restart prometheus
```

### Step 3: Configure Grafana Dashboards

```bash
# Access Grafana
# URL: http://<gui-server-ip>:3000
# Username: admin
# Password: admin123

# Add Prometheus as data source
# URL: http://localhost:9090

# Import dashboards:
# - Node Exporter Full: 1860
# - Kubernetes Cluster: 7249
# - Kubernetes Pods: 6417
```

## Validation & Testing

### Step 1: Test GUI Server

```bash
# Test backend API
curl http://localhost:3001/health

# Test frontend
curl http://localhost:80

# Test database connection
mysql -u dcuser -p dc_management -e "SELECT COUNT(*) FROM servers;"
```

### Step 2: Test Kubernetes Cluster

```bash
# On master node
kubectl get nodes
kubectl get pods --all-namespaces
kubectl cluster-info
```

### Step 3: Test VM Server

```bash
# Check libvirt status
sudo systemctl status libvirtd

# List available images
sudo virsh vol-list default

# Test VM creation (optional)
sudo virt-install --name test-vm --memory 1024 --vcpus 1 --disk size=10 --cdrom /var/lib/libvirt/images/os-images/CentOS-7-x86_64-GenericCloud.qcow2 --network bridge=br0 --graphics none --console pty,target_type=serial
```

### Step 4: Test Monitoring

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

3. **Kubernetes Cluster Issues**
   ```bash
   # Check kubelet status
   sudo systemctl status kubelet
   
   # Check cluster status
   kubectl get nodes
   kubectl describe nodes
   ```

4. **VM Server Issues**
   ```bash
   # Check libvirt status
   sudo systemctl status libvirtd
   
   # Check VM status
   sudo virsh list --all
   ```

5. **Monitoring Issues**
   ```bash
   # Check Prometheus status
   sudo systemctl status prometheus
   
   # Check Node Exporter status
   sudo systemctl status node_exporter
   ```

### Log Locations

- Backend logs: `sudo journalctl -u dc-backend`
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

This comprehensive setup guide provides all the necessary steps to deploy the Internal DC Management System across multiple Hetzner baremetal servers. Follow each section carefully and test each component before proceeding to the next step.