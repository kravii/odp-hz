# Deployment Guide

This guide covers different deployment scenarios for the Internal DC Management System.

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [High Availability Setup](#high-availability-setup)
6. [Scaling](#scaling)

## Local Development

### Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd internal-dc-management

# Install dependencies
npm run setup

# Start development environment
npm run dev
```

### Environment Setup

```bash
# Backend environment
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend environment
cd frontend
# No additional configuration needed for development
```

### Development Services

- Backend API: http://localhost:3001
- Frontend: http://localhost:3000
- Database: localhost:3306

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Included

- **mysql**: MySQL 8.0 database
- **backend**: Node.js API server
- **frontend**: React application
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboard

### Environment Configuration

```bash
# Copy environment file
cp docker-compose.override.yml.example docker-compose.override.yml

# Edit with your configuration
vim docker-compose.override.yml
```

### Custom Configuration

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  mysql:
    environment:
      MYSQL_ROOT_PASSWORD: your-secure-password
      MYSQL_DATABASE: dc_management
      MYSQL_USER: dcuser
      MYSQL_PASSWORD: your-db-password

  backend:
    environment:
      DB_PASSWORD: your-db-password
      JWT_SECRET: your-jwt-secret
      HETZNER_API_TOKEN: your-hetzner-token

  grafana:
    environment:
      GF_SECURITY_ADMIN_PASSWORD: your-grafana-password
```

## Production Deployment

### Server Requirements

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 100+ GB SSD
- **OS**: Rocky Linux 9 or Ubuntu 20.04+

### Installation Steps

1. **System Preparation**
   ```bash
   # Update system
   sudo dnf update -y
   
   # Install Node.js
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo dnf install -y nodejs
   
   # Install MySQL
   sudo dnf install -y mysql-server
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd internal-dc-management
   
   # Install dependencies
   npm run setup
   
   # Build frontend
   cd frontend && npm run build
   ```

3. **Service Configuration**
   ```bash
   # Create systemd services
   sudo cp deployment/systemd/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable dc-backend dc-frontend
   sudo systemctl start dc-backend dc-frontend
   ```

4. **Reverse Proxy Setup**
   ```bash
   # Install Nginx
   sudo dnf install -y nginx
   
   # Configure Nginx
   sudo cp deployment/nginx/dc-management.conf /etc/nginx/conf.d/
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

### SSL/TLS Configuration

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

### Monitoring Setup

```bash
# Install Prometheus
sudo cp deployment/prometheus/prometheus.yml /etc/prometheus/
sudo systemctl enable prometheus
sudo systemctl start prometheus

# Install Grafana
sudo dnf install -y grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.20+)
- Helm 3.0+
- kubectl configured

### Helm Chart Deployment

```bash
# Add Helm repository
helm repo add dc-management https://charts.dc-management.local
helm repo update

# Install chart
helm install dc-management dc-management/dc-management \
  --namespace dc-management \
  --create-namespace \
  --values values.yaml
```

### Custom Values

```yaml
# values.yaml
global:
  domain: dc-management.local
  
backend:
  replicas: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "500m"

frontend:
  replicas: 2
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "200m"

database:
  mysql:
    rootPassword: "secure-password"
    database: "dc_management"
    user: "dcuser"
    password: "secure-password"

monitoring:
  prometheus:
    enabled: true
    storage: "10Gi"
  grafana:
    enabled: true
    adminPassword: "secure-password"
```

### Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dc-management-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dc-management.local
    secretName: dc-management-tls
  rules:
  - host: dc-management.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dc-management-frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: dc-management-backend
            port:
              number: 3001
```

## High Availability Setup

### Load Balancer Configuration

```yaml
# haproxy.cfg
global
    daemon
    log 127.0.0.1:514 local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option redispatch
    retries 3
    timeout queue 1m
    timeout connect 10s
    timeout client 1m
    timeout server 1m
    timeout check 10s
    maxconn 3000

frontend dc-management
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/dc-management.pem
    redirect scheme https if !{ ssl_fc }
    default_backend dc-management-backend

backend dc-management-backend
    balance roundrobin
    option httpchk GET /health
    server web1 10.0.1.10:3001 check
    server web2 10.0.1.11:3001 check
    server web3 10.0.1.12:3001 check
```

### Database Replication

```sql
-- Master configuration
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
gtid-mode = ON
enforce-gtid-consistency = ON

-- Slave configuration
[mysqld]
server-id = 2
relay-log = mysql-relay-bin
read-only = 1
gtid-mode = ON
enforce-gtid-consistency = ON
```

### Redis Cluster

```yaml
# redis-cluster.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    protected-mode no
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend replicas
kubectl scale deployment dc-management-backend --replicas=5

# Scale frontend replicas
kubectl scale deployment dc-management-frontend --replicas=3
```

### Vertical Scaling

```yaml
# resources.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dc-management-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

### Auto Scaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dc-management-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dc-management-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

```bash
# Read replicas
kubectl apply -f - <<EOF
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: dc-management-db
spec:
  secretName: mysql-secret
  tlsUseSelfSigned: true
  instances: 3
  router:
    instances: 2
EOF
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u root -p dc_management > $BACKUP_DIR/dc_management_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/dc_management_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/dc_management_$DATE.sql.gz s3://dc-management-backups/

# Cleanup old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### Application Backup

```bash
#!/bin/bash
# backup-app.sh

BACKUP_DIR="/backup/app"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/dc_management_$DATE.tar.gz \
  /opt/dc-management \
  /etc/systemd/system/dc-*.service \
  /etc/nginx/conf.d/dc-management.conf

# Upload to S3
aws s3 cp $BACKUP_DIR/dc_management_$DATE.tar.gz s3://dc-management-backups/
```

### Disaster Recovery

```bash
#!/bin/bash
# disaster-recovery.sh

# Restore database
mysql -u root -p dc_management < /backup/mysql/dc_management_latest.sql

# Restore application
tar -xzf /backup/app/dc_management_latest.tar.gz -C /

# Restart services
systemctl restart dc-backend dc-frontend nginx
```

## Monitoring and Alerting

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "dc-management-rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'dc-management-backend'
    static_configs:
      - targets: ['dc-management-backend:3001']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'dc-management-frontend'
    static_configs:
      - targets: ['dc-management-frontend:3000']
    metrics_path: /metrics
    scrape_interval: 30s
```

### Alert Rules

```yaml
# dc-management-rules.yml
groups:
- name: dc-management
  rules:
  - alert: HighCPUUsage
    expr: cpu_usage_percent > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
      description: "CPU usage is above 80% for more than 5 minutes"

  - alert: HighMemoryUsage
    expr: memory_usage_percent > 90
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High memory usage detected"
      description: "Memory usage is above 90% for more than 5 minutes"

  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "Service {{ $labels.instance }} is down"
```

This deployment guide provides comprehensive instructions for deploying the Internal DC Management System in various environments. Choose the deployment method that best fits your requirements and infrastructure.