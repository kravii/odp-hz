# Internal DC Management System - Setup Scripts

This directory contains automated setup scripts for the Internal DC Management System infrastructure.

## Scripts Overview

### 1. `setup-master.sh` - Master Orchestration Script
The main script that orchestrates the setup of the entire infrastructure.

**Usage:**
```bash
./setup-master.sh --gui-servers 192.168.1.10 --k8s-masters 192.168.1.11,192.168.1.12,192.168.1.13 --k8s-workers 192.168.1.14,192.168.1.15 --vm-servers 192.168.1.16,192.168.1.17 --domain dc-management.local
```

**Options:**
- `--gui-servers <list>`: Comma-separated list of GUI server IPs
- `--k8s-masters <list>`: Comma-separated list of K8s master server IPs
- `--k8s-workers <list>`: Comma-separated list of K8s worker server IPs
- `--vm-servers <list>`: Comma-separated list of VM server IPs
- `--domain <domain>`: Domain name for the application
- `--mysql-password <pass>`: MySQL root password
- `--jwt-secret <secret>`: JWT secret key
- `--hetzner-token <token>`: Hetzner API token
- `--ssh-key-path <path>`: Path to SSH private key
- `--slack-webhook <url>`: Slack webhook URL
- `--grafana-password <pass>`: Grafana admin password

### 2. `setup-gui-server.sh` - GUI Server Setup
Sets up the central management interface server.

**Features:**
- Installs Node.js, MySQL, Nginx
- Sets up backend and frontend applications
- Configures Prometheus and Grafana
- Creates systemd services
- Configures firewall

**Usage:**
```bash
# Set environment variables
export DOMAIN_NAME="dc-management.local"
export MYSQL_PASSWORD="secure-password"
export JWT_SECRET="your-jwt-secret"
export HETZNER_API_TOKEN="your-hetzner-token"
export HETZNER_SSH_KEY_PATH="/path/to/private/key"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook/url"
export GRAFANA_PASSWORD="admin123"

# Run setup
./setup-gui-server.sh
```

### 3. `setup-k8s-server.sh` - Kubernetes Server Setup
Sets up Kubernetes master and worker nodes.

**Features:**
- Installs Docker and Kubernetes components
- Configures master nodes with HA setup
- Sets up worker nodes
- Installs HAProxy for load balancing
- Configures monitoring

**Usage:**
```bash
# For master nodes
export NODE_TYPE="master"
export CLUSTER_NAME="dc-cluster"
export K8S_VERSION="1.28.0"
./setup-k8s-server.sh

# For worker nodes
export NODE_TYPE="worker"
export CLUSTER_NAME="dc-cluster"
export MASTER_IP="192.168.1.11"
export JOIN_TOKEN="your-join-token"
./setup-k8s-server.sh
```

### 4. `setup-vm-server.sh` - VM Server Setup
Sets up servers for virtual machine provisioning.

**Features:**
- Installs KVM and libvirt
- Sets up storage pools
- Downloads OS images
- Configures network bridges
- Creates VM management scripts

**Usage:**
```bash
# Set environment variables
export BRIDGE_IP="10.0.1.1"
export BRIDGE_NETMASK="255.255.255.0"
export STORAGE_POOL_PATH="/mnt/storage-pool"

# Run setup
./setup-vm-server.sh
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

## Setup Process

### 1. Prepare Servers

Ensure all servers are running Rocky Linux 9 and accessible via SSH with root access.

### 2. Configure Environment Variables

Set the following environment variables:

```bash
export DOMAIN_NAME="dc-management.local"
export MYSQL_ROOT_PASSWORD="dcpassword123"
export MYSQL_DATABASE="dc_management"
export MYSQL_USER="dcuser"
export MYSQL_PASSWORD="dcpass123"
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
export HETZNER_API_TOKEN="your-hetzner-api-token"
export HETZNER_SSH_KEY_PATH="/path/to/private/key"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/webhook/url"
export GRAFANA_PASSWORD="admin123"
```

### 3. Run Master Setup Script

```bash
./setup-master.sh \
  --gui-servers 192.168.1.10 \
  --k8s-masters 192.168.1.11,192.168.1.12,192.168.1.13 \
  --k8s-workers 192.168.1.14,192.168.1.15 \
  --vm-servers 192.168.1.16,192.168.1.17 \
  --domain dc-management.local \
  --mysql-password dcpass123 \
  --jwt-secret your-jwt-secret \
  --hetzner-token your-hetzner-token \
  --ssh-key-path /path/to/private/key \
  --slack-webhook https://hooks.slack.com/services/your/webhook/url \
  --grafana-password admin123
```

### 4. Verify Installation

After setup completion, verify the installation:

```bash
# Test GUI server
curl http://192.168.1.10/health

# Test Kubernetes cluster (on master node)
kubectl get nodes

# Test VM server
virsh list --all
```

## Manual Setup

If you prefer to run the setup scripts individually:

### 1. Setup GUI Server

```bash
# Copy script to GUI server
scp setup-gui-server.sh root@192.168.1.10:/tmp/
ssh root@192.168.1.10 "chmod +x /tmp/setup-gui-server.sh && /tmp/setup-gui-server.sh"
```

### 2. Setup Kubernetes Masters

```bash
# Copy script to master servers
for server in 192.168.1.11 192.168.1.12 192.168.1.13; do
  scp setup-k8s-server.sh root@$server:/tmp/
  ssh root@$server "chmod +x /tmp/setup-k8s-server.sh && NODE_TYPE=master /tmp/setup-k8s-server.sh"
done
```

### 3. Setup Kubernetes Workers

```bash
# Copy script to worker servers
for server in 192.168.1.14 192.168.1.15; do
  scp setup-k8s-server.sh root@$server:/tmp/
  ssh root@$server "chmod +x /tmp/setup-k8s-server.sh && NODE_TYPE=worker MASTER_IP=192.168.1.11 /tmp/setup-k8s-server.sh"
done
```

### 4. Setup VM Servers

```bash
# Copy script to VM servers
for server in 192.168.1.16 192.168.1.17; do
  scp setup-vm-server.sh root@$server:/tmp/
  ssh root@$server "chmod +x /tmp/setup-vm-server.sh && /tmp/setup-vm-server.sh"
done
```

## Troubleshooting

### Common Issues

1. **SSH Connection Issues**
   ```bash
   # Test SSH connection
   ssh -o StrictHostKeyChecking=no root@server-ip "echo 'Connection successful'"
   ```

2. **Script Permission Issues**
   ```bash
   # Make scripts executable
   chmod +x *.sh
   ```

3. **Service Status Issues**
   ```bash
   # Check service status
   systemctl status service-name
   
   # View service logs
   journalctl -u service-name -f
   ```

4. **Network Issues**
   ```bash
   # Test network connectivity
   ping server-ip
   telnet server-ip port
   ```

### Log Locations

- Setup logs: Console output
- Service logs: `journalctl -u service-name`
- System logs: `/var/log/messages`
- Application logs: `/var/log/dc-management/`

### Recovery

If setup fails, you can:

1. **Clean up and retry**
   ```bash
   # Remove installed packages
   dnf remove -y nodejs mysql-server nginx docker-ce kubelet kubeadm kubectl
   
   # Clean up configuration files
   rm -rf /etc/prometheus /var/lib/prometheus
   rm -rf /etc/grafana /var/lib/grafana
   
   # Retry setup
   ./setup-script.sh
   ```

2. **Partial setup recovery**
   ```bash
   # Check what's installed
   systemctl list-units --type=service --state=active
   
   # Restart failed services
   systemctl restart service-name
   ```

## Security Considerations

1. **SSH Security**
   - Use key-based authentication
   - Disable root login if possible
   - Use strong passwords

2. **Firewall Configuration**
   - Only open necessary ports
   - Use fail2ban for SSH protection

3. **SSL/TLS**
   - Use strong SSL certificates
   - Enable HSTS headers

4. **Database Security**
   - Use strong passwords
   - Limit database access

5. **Application Security**
   - Keep packages updated
   - Use environment variables for secrets
   - Implement rate limiting

## Maintenance

### Regular Tasks

1. **System Updates**
   ```bash
   dnf update -y
   ```

2. **Service Monitoring**
   ```bash
   systemctl status service-name
   ```

3. **Log Rotation**
   ```bash
   logrotate /etc/logrotate.d/dc-management
   ```

4. **Backup Verification**
   ```bash
   /usr/local/bin/backup-dc.sh
   ```

## Support

For issues and support:

1. Check the troubleshooting section above
2. Review the main documentation in `/docs/`
3. Check service logs for error messages
4. Verify network connectivity between servers
5. Ensure all prerequisites are met

## License

This project is licensed under the MIT License - see the LICENSE file for details.