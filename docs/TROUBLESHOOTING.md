# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Internal DC Management System.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Backend Issues](#backend-issues)
3. [Frontend Issues](#frontend-issues)
4. [Database Issues](#database-issues)
5. [VM Provisioning Issues](#vm-provisioning-issues)
6. [Kubernetes Issues](#kubernetes-issues)
7. [Monitoring Issues](#monitoring-issues)
8. [Network Issues](#network-issues)
9. [Performance Issues](#performance-issues)
10. [Log Analysis](#log-analysis)

## Common Issues

### Application Won't Start

**Symptoms:**
- Application fails to start
- Error messages during startup
- Services not responding

**Diagnosis:**
```bash
# Check if ports are available
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :3000

# Check system resources
free -h
df -h
top

# Check systemd service status
sudo systemctl status dc-backend
sudo systemctl status dc-frontend
```

**Solutions:**
1. **Port conflicts:**
   ```bash
   # Kill processes using the ports
   sudo fuser -k 3001/tcp
   sudo fuser -k 3000/tcp
   ```

2. **Insufficient resources:**
   - Increase RAM/CPU allocation
   - Free up disk space
   - Optimize resource usage

3. **Service configuration:**
   ```bash
   # Check service configuration
   sudo systemctl cat dc-backend
   sudo journalctl -u dc-backend -f
   ```

### Authentication Issues

**Symptoms:**
- Login failures
- Token expiration errors
- Permission denied errors

**Diagnosis:**
```bash
# Check JWT configuration
grep JWT_SECRET backend/.env

# Test authentication endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

**Solutions:**
1. **Invalid credentials:**
   - Reset admin password
   - Check user database

2. **Token issues:**
   - Regenerate JWT secret
   - Check token expiration settings

3. **Database connection:**
   ```bash
   # Test database connection
   mysql -u dcuser -p dc_management -e "SELECT 1;"
   ```

## Backend Issues

### API Endpoints Not Responding

**Symptoms:**
- 404 errors
- 500 internal server errors
- Timeout errors

**Diagnosis:**
```bash
# Check backend logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/servers
```

**Solutions:**
1. **Route configuration:**
   - Check route definitions
   - Verify middleware setup

2. **Database connection:**
   ```bash
   # Check database status
   sudo systemctl status mysqld
   
   # Test connection
   mysql -u dcuser -p dc_management
   ```

3. **Environment variables:**
   ```bash
   # Verify environment configuration
   cat backend/.env
   ```

### Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- "Access denied" errors
- Timeout errors

**Diagnosis:**
```bash
# Check MySQL status
sudo systemctl status mysqld

# Check MySQL logs
sudo tail -f /var/log/mysqld.log

# Test connection
mysql -u dcuser -p dc_management
```

**Solutions:**
1. **MySQL not running:**
   ```bash
   sudo systemctl start mysqld
   sudo systemctl enable mysqld
   ```

2. **Access denied:**
   ```bash
   # Reset user password
   sudo mysql -u root -p
   ALTER USER 'dcuser'@'localhost' IDENTIFIED BY 'newpassword';
   FLUSH PRIVILEGES;
   ```

3. **Connection limits:**
   ```bash
   # Check MySQL configuration
   sudo vim /etc/my.cnf
   
   # Increase connection limits
   max_connections = 200
   ```

### Memory Issues

**Symptoms:**
- Out of memory errors
- Slow performance
- Application crashes

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js memory
ps aux | grep node
```

**Solutions:**
1. **Increase Node.js memory:**
   ```bash
   # Set memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Optimize database queries:**
   - Add indexes
   - Optimize queries
   - Use connection pooling

3. **System memory:**
   - Add more RAM
   - Optimize system configuration

## Frontend Issues

### Build Failures

**Symptoms:**
- Build errors
- Missing dependencies
- Compilation failures

**Diagnosis:**
```bash
# Check Node.js version
node --version
npm --version

# Check dependencies
npm list

# Clear cache
npm cache clean --force
```

**Solutions:**
1. **Dependency issues:**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Node.js version:**
   ```bash
   # Update Node.js
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo dnf install -y nodejs
   ```

3. **Build configuration:**
   ```bash
   # Check build configuration
   cat frontend/package.json
   ```

### UI Not Loading

**Symptoms:**
- Blank page
- JavaScript errors
- CSS not loading

**Diagnosis:**
```bash
# Check browser console
# Check network tab
# Check server logs
```

**Solutions:**
1. **API connection:**
   - Verify API URL
   - Check CORS configuration
   - Test API endpoints

2. **Static files:**
   ```bash
   # Check Nginx configuration
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Browser cache:**
   - Clear browser cache
   - Hard refresh (Ctrl+F5)

## Database Issues

### Slow Queries

**Symptoms:**
- Slow API responses
- High CPU usage
- Database locks

**Diagnosis:**
```bash
# Check slow query log
sudo tail -f /var/log/mysqld.log

# Check MySQL process list
mysql -u root -p -e "SHOW PROCESSLIST;"

# Check table status
mysql -u root -p -e "SHOW TABLE STATUS FROM dc_management;"
```

**Solutions:**
1. **Add indexes:**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_server_status ON servers(status);
   CREATE INDEX idx_vm_status ON vms(status);
   CREATE INDEX idx_monitoring_timestamp ON monitoring_data(timestamp);
   ```

2. **Optimize queries:**
   ```sql
   -- Use EXPLAIN to analyze queries
   EXPLAIN SELECT * FROM servers WHERE status = 'active';
   ```

3. **Database configuration:**
   ```bash
   # Optimize MySQL configuration
   sudo vim /etc/my.cnf
   
   # Add performance settings
   innodb_buffer_pool_size = 1G
   innodb_log_file_size = 256M
   query_cache_size = 64M
   ```

### Data Corruption

**Symptoms:**
- Inconsistent data
- Foreign key errors
- Application crashes

**Diagnosis:**
```bash
# Check database integrity
mysqlcheck -u root -p --check dc_management

# Check table corruption
mysqlcheck -u root -p --repair dc_management
```

**Solutions:**
1. **Repair tables:**
   ```bash
   mysqlcheck -u root -p --repair dc_management
   ```

2. **Restore from backup:**
   ```bash
   # Restore database
   mysql -u root -p dc_management < backup.sql
   ```

3. **Recreate database:**
   ```bash
   # Drop and recreate
   mysql -u root -p -e "DROP DATABASE dc_management;"
   mysql -u root -p -e "CREATE DATABASE dc_management;"
   mysql -u root -p dc_management < init.sql
   ```

## VM Provisioning Issues

### VM Creation Failures

**Symptoms:**
- VM creation timeout
- Resource allocation errors
- SSH connection failures

**Diagnosis:**
```bash
# Check libvirt status
sudo systemctl status libvirtd

# Check VM logs
sudo journalctl -u libvirtd -f

# Check available resources
virsh nodeinfo
```

**Solutions:**
1. **Libvirt issues:**
   ```bash
   # Restart libvirt
   sudo systemctl restart libvirtd
   
   # Check configuration
   sudo virsh list --all
   ```

2. **Resource allocation:**
   ```bash
   # Check available resources
   free -h
   df -h
   
   # Check CPU usage
   top
   ```

3. **Network configuration:**
   ```bash
   # Check network bridge
   sudo brctl show
   
   # Check IP configuration
   ip addr show
   ```

### VM Management Issues

**Symptoms:**
- VMs not starting
- VMs not stopping
- Resource monitoring failures

**Diagnosis:**
```bash
# Check VM status
virsh list --all

# Check VM configuration
virsh dumpxml vm-name

# Check VM logs
virsh console vm-name
```

**Solutions:**
1. **VM configuration:**
   ```bash
   # Edit VM configuration
   virsh edit vm-name
   
   # Restart VM
   virsh destroy vm-name
   virsh start vm-name
   ```

2. **Resource issues:**
   - Check available CPU/memory
   - Verify storage space
   - Check network connectivity

## Kubernetes Issues

### Cluster Setup Failures

**Symptoms:**
- Cluster initialization fails
- Nodes not joining
- Network issues

**Diagnosis:**
```bash
# Check kubelet status
sudo systemctl status kubelet

# Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# Check logs
sudo journalctl -u kubelet -f
```

**Solutions:**
1. **Reset cluster:**
   ```bash
   # Reset kubeadm
   sudo kubeadm reset --force
   
   # Clean up
   sudo rm -rf /etc/kubernetes/
   sudo rm -rf /var/lib/etcd/
   ```

2. **Network issues:**
   ```bash
   # Check network configuration
   ip route show
   
   # Check firewall rules
   sudo firewall-cmd --list-all
   ```

3. **Container runtime:**
   ```bash
   # Check containerd status
   sudo systemctl status containerd
   
   # Restart containerd
   sudo systemctl restart containerd
   ```

### Pod Issues

**Symptoms:**
- Pods not starting
- Pods crashing
- Resource limits exceeded

**Diagnosis:**
```bash
# Check pod status
kubectl get pods --all-namespaces

# Check pod logs
kubectl logs pod-name -n namespace

# Check pod events
kubectl describe pod pod-name -n namespace
```

**Solutions:**
1. **Resource limits:**
   ```bash
   # Check resource quotas
   kubectl get resourcequota -n namespace
   
   # Adjust resource limits
   kubectl edit resourcequota quota-name -n namespace
   ```

2. **Image issues:**
   ```bash
   # Check image availability
   kubectl describe pod pod-name -n namespace
   
   # Pull image manually
   docker pull image-name
   ```

## Monitoring Issues

### Prometheus Issues

**Symptoms:**
- Metrics not collected
- Prometheus not starting
- Query failures

**Diagnosis:**
```bash
# Check Prometheus status
sudo systemctl status prometheus

# Check Prometheus logs
sudo journalctl -u prometheus -f

# Test Prometheus API
curl http://localhost:9090/api/v1/query?query=up
```

**Solutions:**
1. **Configuration issues:**
   ```bash
   # Check configuration
   sudo promtool check config /etc/prometheus/prometheus.yml
   
   # Reload configuration
   curl -X POST http://localhost:9090/-/reload
   ```

2. **Storage issues:**
   ```bash
   # Check disk space
   df -h /var/lib/prometheus
   
   # Clean old data
   sudo find /var/lib/prometheus -name "*.db" -mtime +30 -delete
   ```

### Node Exporter Issues

**Symptoms:**
- Metrics not available
- Node Exporter not starting
- Permission errors

**Diagnosis:**
```bash
# Check Node Exporter status
sudo systemctl status node_exporter

# Check Node Exporter logs
sudo journalctl -u node_exporter -f

# Test metrics endpoint
curl http://localhost:9100/metrics
```

**Solutions:**
1. **Permission issues:**
   ```bash
   # Check user permissions
   id node_exporter
   
   # Fix permissions
   sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
   ```

2. **Configuration issues:**
   ```bash
   # Check service configuration
   sudo systemctl cat node_exporter
   
   # Restart service
   sudo systemctl restart node_exporter
   ```

## Network Issues

### Connectivity Problems

**Symptoms:**
- API calls failing
- SSH connections failing
- Service discovery issues

**Diagnosis:**
```bash
# Check network connectivity
ping server-ip
telnet server-ip port

# Check DNS resolution
nslookup server-hostname
dig server-hostname

# Check routing
traceroute server-ip
```

**Solutions:**
1. **Firewall issues:**
   ```bash
   # Check firewall status
   sudo firewall-cmd --list-all
   
   # Open required ports
   sudo firewall-cmd --permanent --add-port=3001/tcp
   sudo firewall-cmd --reload
   ```

2. **DNS issues:**
   ```bash
   # Check DNS configuration
   cat /etc/resolv.conf
   
   # Add DNS servers
   echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
   ```

### SSL/TLS Issues

**Symptoms:**
- Certificate errors
- SSL handshake failures
- Mixed content warnings

**Diagnosis:**
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect server:443

# Check certificate chain
curl -I https://server
```

**Solutions:**
1. **Certificate issues:**
   ```bash
   # Renew certificate
   sudo certbot renew
   
   # Check certificate files
   ls -la /etc/letsencrypt/live/domain/
   ```

2. **Configuration issues:**
   ```bash
   # Check Nginx SSL configuration
   sudo nginx -t
   
   # Reload Nginx
   sudo systemctl reload nginx
   ```

## Performance Issues

### Slow Response Times

**Symptoms:**
- High response times
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Check system load
uptime
top
htop

# Check disk I/O
iostat -x 1

# Check network usage
iftop
```

**Solutions:**
1. **Database optimization:**
   ```sql
   -- Add indexes
   CREATE INDEX idx_timestamp ON monitoring_data(timestamp);
   
   -- Optimize queries
   EXPLAIN SELECT * FROM monitoring_data WHERE timestamp > NOW() - INTERVAL 1 HOUR;
   ```

2. **Application optimization:**
   ```bash
   # Enable gzip compression
   # Add caching headers
   # Optimize database queries
   ```

3. **System optimization:**
   ```bash
   # Increase file descriptors
   ulimit -n 65536
   
   # Optimize kernel parameters
   echo 'net.core.somaxconn = 65536' >> /etc/sysctl.conf
   sysctl -p
   ```

### High Resource Usage

**Symptoms:**
- High CPU usage
- High memory usage
- System slowdown

**Diagnosis:**
```bash
# Check resource usage
top
htop
free -h
df -h

# Check process details
ps aux --sort=-%cpu | head
ps aux --sort=-%mem | head
```

**Solutions:**
1. **Memory optimization:**
   ```bash
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **CPU optimization:**
   ```bash
   # Check CPU frequency
   cat /proc/cpuinfo
   
   # Optimize CPU governor
   echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
   ```

## Log Analysis

### Log Locations

```bash
# Application logs
backend/logs/combined.log
backend/logs/error.log

# System logs
/var/log/messages
/var/log/secure

# Service logs
sudo journalctl -u dc-backend -f
sudo journalctl -u dc-frontend -f
sudo journalctl -u mysqld -f
sudo journalctl -u nginx -f
```

### Log Analysis Tools

```bash
# Search logs
grep "ERROR" backend/logs/combined.log
grep "WARN" backend/logs/combined.log

# Monitor logs in real-time
tail -f backend/logs/combined.log
sudo journalctl -f

# Analyze log patterns
awk '{print $1}' backend/logs/combined.log | sort | uniq -c | sort -nr
```

### Common Log Patterns

1. **Database connection errors:**
   ```
   ERROR: connect ECONNREFUSED 127.0.0.1:3306
   ```

2. **Authentication failures:**
   ```
   ERROR: Invalid credentials
   ```

3. **Resource allocation errors:**
   ```
   ERROR: Insufficient resources
   ```

4. **Network timeouts:**
   ```
   ERROR: ETIMEDOUT
   ```

This troubleshooting guide provides comprehensive solutions for common issues. For additional support, check the logs and use the diagnostic commands provided for each issue type.