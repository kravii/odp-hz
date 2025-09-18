# Baremetal Server Management

This document describes the new baremetal server management functionality added to the datacenter management system.

## Overview

The baremetal management system allows administrators to:
- Add baremetal servers to the system with IP/hostname, CPU cores, RAM, and storage specifications
- Assign servers to VM or Kubernetes pools
- Enable monitoring and install required packages on servers
- Track server health and resource utilization

## Features

### 1. Server Registration
- Add servers by IP address or hostname
- Specify CPU cores, RAM, and storage capacity
- Configure SSH access credentials
- Set OS version and other metadata

### 2. Pool Assignment
- Assign servers to VM pools for virtual machine hosting
- Assign servers to Kubernetes pools for container orchestration
- Track which pool each server belongs to
- View pool resource allocation

### 3. Monitoring Setup
- Enable monitoring on selected servers
- Install monitoring packages:
  - **Prometheus**: Metrics collection and storage
  - **Grafana**: Data visualization and dashboards
  - **Node Exporter**: System metrics collection
  - **Docker**: Container runtime
  - **Kubectl**: Kubernetes command-line tool
- Automatic service configuration and startup
- Firewall rule management

### 4. Dashboard Integration
- View baremetal server status on the main dashboard
- See pool assignments and monitoring status
- Track resource utilization across all servers
- Monitor server health status

## API Endpoints

### Server Management
- `GET /api/servers` - List all servers with pool information
- `POST /api/servers` - Add new server with pool assignment and monitoring options
- `PUT /api/servers/:id` - Update server information
- `DELETE /api/servers/:id` - Remove server (if no active VMs/K8s nodes)

### Pool Assignment
- `POST /api/servers/:id/assign-pool` - Assign server to a pool
- `GET /api/servers/pools/available` - Get available pools for assignment

### Monitoring Setup
- `POST /api/servers/:id/setup-monitoring` - Setup monitoring and install packages
- `POST /api/servers/:id/health-check` - Perform health check on server

## Database Schema

### New Server Fields
```sql
ALTER TABLE servers 
ADD COLUMN pool_type ENUM('vm', 'k8s', 'none') DEFAULT 'none',
ADD COLUMN pool_id INT NULL,
ADD COLUMN monitoring_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN packages_installed JSON DEFAULT '[]';
```

## Installation and Setup

### 1. Database Migration
Run the migration script to add the new fields:
```bash
./scripts/migrate-baremetal-fields.sh
```

### 2. Server Requirements
For monitoring setup, servers must have:
- SSH access enabled
- Root or sudo access
- Internet connectivity for package downloads
- Firewall configured to allow SSH (port 22)

### 3. Package Installation
The system automatically installs and configures:
- **Prometheus**: Available at `http://server-ip:9090`
- **Grafana**: Available at `http://server-ip:3000`
- **Node Exporter**: Metrics available at `http://server-ip:9100/metrics`

## Usage Guide

### Adding a Baremetal Server

1. Navigate to **Servers** page in the dashboard
2. Click **Add Server** button
3. Fill in server details:
   - Hostname and IP address
   - CPU cores, RAM, and storage
   - SSH credentials
4. Select pool assignment (VM or K8s)
5. Choose monitoring packages to install
6. Click **Add Server**

### Assigning Server to Pool

1. Select a server from the servers table
2. Click the **Actions** menu (three dots)
3. Select **Assign to Pool**
4. Choose pool type (VM or Kubernetes)
5. Select specific pool from dropdown
6. Click **Assign to Pool**

### Setting Up Monitoring

1. Select a server from the servers table
2. Click the **Actions** menu
3. Select **Setup Monitoring**
4. Choose packages to install:
   - Prometheus (monitoring)
   - Grafana (visualization)
   - Node Exporter (system metrics)
   - Docker (containers)
   - Kubectl (Kubernetes CLI)
5. Click **Setup Monitoring**

## Monitoring and Health Checks

### Health Check Process
The system performs health checks by:
1. Testing SSH connectivity
2. Checking system resource usage
3. Verifying service status
4. Updating health status in database

### Monitoring Endpoints
- **Prometheus**: `http://server-ip:9090`
- **Grafana**: `http://server-ip:3000` (default login: admin/admin)
- **Node Exporter**: `http://server-ip:9100/metrics`

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify SSH credentials and port
   - Check firewall settings
   - Ensure server is accessible

2. **Package Installation Failed**
   - Check internet connectivity
   - Verify package repository access
   - Review server logs for specific errors

3. **Service Not Starting**
   - Check systemd service status
   - Review service logs
   - Verify port availability

### Logs
- Application logs: Check backend logs for monitoring service errors
- Server logs: SSH into server and check service logs
- Database logs: Check migration and query logs

## Security Considerations

- SSH keys should be used instead of passwords when possible
- Firewall rules should be properly configured
- Monitoring endpoints should be secured with authentication
- Regular security updates should be applied to monitoring packages

## Future Enhancements

- Automated SSL/TLS certificate management
- Integration with external monitoring systems
- Advanced alerting and notification systems
- Resource usage optimization recommendations
- Automated backup and recovery procedures