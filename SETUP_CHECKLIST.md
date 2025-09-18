# Internal DC Management System - Setup Checklist

This checklist provides a step-by-step guide for setting up the Internal DC Management System across multiple Hetzner baremetal servers.

## Pre-Setup Checklist

### Hardware Requirements
- [ ] **GUI Server**: 4+ cores, 8+ GB RAM, 100+ GB SSD
- [ ] **K8s Master Servers**: 8+ cores, 16+ GB RAM, 200+ GB SSD (3 servers recommended)
- [ ] **K8s Worker Servers**: 8+ cores, 16+ GB RAM, 200+ GB SSD (2+ servers recommended)
- [ ] **VM Servers**: 16+ cores, 32+ GB RAM, 1.5+ TB SSD (2+ servers recommended)

### Software Requirements
- [ ] All servers running Rocky Linux 9
- [ ] SSH access with private key configured
- [ ] Domain name registered (optional but recommended)
- [ ] Hetzner API token obtained
- [ ] Slack webhook URL configured (for notifications)

### Network Requirements
- [ ] All servers accessible via SSH
- [ ] Firewall ports configured (22, 80, 443, 3000, 3001, 3306, 9090)
- [ ] DNS records pointing to GUI servers

## Setup Process

### Phase 1: GUI Server Setup
- [ ] **Step 1**: Update system packages
- [ ] **Step 2**: Install essential packages (curl, wget, vim, git, htop, net-tools, firewalld)
- [ ] **Step 3**: Configure firewall (open ports 22, 80, 443, 3000, 3001, 3306, 9090)
- [ ] **Step 4**: Install Node.js 18.x
- [ ] **Step 5**: Install MySQL 8.0
- [ ] **Step 6**: Secure MySQL installation
- [ ] **Step 7**: Create database and user
- [ ] **Step 8**: Clone repository
- [ ] **Step 9**: Setup backend (npm install, configure .env)
- [ ] **Step 10**: Initialize database schema
- [ ] **Step 11**: Setup frontend (npm install, npm run build)
- [ ] **Step 12**: Install Nginx
- [ ] **Step 13**: Configure Nginx reverse proxy
- [ ] **Step 14**: Create systemd service for backend
- [ ] **Step 15**: Install Prometheus
- [ ] **Step 16**: Install Node Exporter
- [ ] **Step 17**: Install Grafana
- [ ] **Step 18**: Configure monitoring
- [ ] **Step 19**: Start and enable all services
- [ ] **Step 20**: Test GUI server functionality

### Phase 2: Kubernetes Master Setup
- [ ] **Step 1**: Update system packages
- [ ] **Step 2**: Install essential packages
- [ ] **Step 3**: Disable firewall and SELinux
- [ ] **Step 4**: Disable swap
- [ ] **Step 5**: Enable kernel modules (br_netfilter)
- [ ] **Step 6**: Install Docker
- [ ] **Step 7**: Configure containerd
- [ ] **Step 8**: Install Kubernetes components (kubelet, kubeadm, kubectl)
- [ ] **Step 9**: Initialize cluster (first master only)
- [ ] **Step 10**: Setup kubectl
- [ ] **Step 11**: Install CNI (Calico)
- [ ] **Step 12**: Get join commands
- [ ] **Step 13**: Install HAProxy for load balancing
- [ ] **Step 14**: Configure HAProxy
- [ ] **Step 15**: Install Node Exporter
- [ ] **Step 16**: Test master node functionality

### Phase 3: Kubernetes Worker Setup
- [ ] **Step 1**: Update system packages
- [ ] **Step 2**: Install essential packages
- [ ] **Step 3**: Disable firewall and SELinux
- [ ] **Step 4**: Disable swap
- [ ] **Step 5**: Enable kernel modules (br_netfilter)
- [ ] **Step 6**: Install Docker
- [ ] **Step 7**: Configure containerd
- [ ] **Step 8**: Install Kubernetes components (kubelet, kubeadm, kubectl)
- [ ] **Step 9**: Join cluster using master join command
- [ ] **Step 10**: Install Node Exporter
- [ ] **Step 11**: Test worker node functionality

### Phase 4: VM Server Setup
- [ ] **Step 1**: Update system packages
- [ ] **Step 2**: Install essential packages
- [ ] **Step 3**: Configure firewall (open ports 22, 5900-5999)
- [ ] **Step 4**: Install virtualization tools (KVM, libvirt)
- [ ] **Step 5**: Setup storage pool
- [ ] **Step 6**: Setup network bridge
- [ ] **Step 7**: Download OS images (CentOS7, RockyLinux9, Ubuntu22/24)
- [ ] **Step 8**: Configure SSH keys
- [ ] **Step 9**: Install Node Exporter
- [ ] **Step 10**: Create VM management scripts
- [ ] **Step 11**: Test VM server functionality

### Phase 5: Monitoring Configuration
- [ ] **Step 1**: Update Prometheus configuration on GUI server
- [ ] **Step 2**: Add all servers to Prometheus targets
- [ ] **Step 3**: Restart Prometheus service
- [ ] **Step 4**: Configure Grafana dashboards
- [ ] **Step 5**: Add Prometheus as data source
- [ ] **Step 6**: Import monitoring dashboards
- [ ] **Step 7**: Configure alerting rules
- [ ] **Step 8**: Test monitoring functionality

## Post-Setup Verification

### GUI Server Verification
- [ ] Backend API accessible at `http://gui-server:3001/health`
- [ ] Frontend accessible at `http://gui-server:80`
- [ ] Prometheus accessible at `http://gui-server:9090`
- [ ] Grafana accessible at `http://gui-server:3000`
- [ ] Database connection working
- [ ] All services running (systemctl status)

### Kubernetes Cluster Verification
- [ ] All nodes showing as Ready (`kubectl get nodes`)
- [ ] All pods running (`kubectl get pods --all-namespaces`)
- [ ] Cluster info accessible (`kubectl cluster-info`)
- [ ] HAProxy load balancer working
- [ ] CNI (Calico) pods running
- [ ] Node Exporter running on all nodes

### VM Server Verification
- [ ] Libvirt service running (`systemctl status libvirtd`)
- [ ] Storage pool accessible (`virsh pool-list`)
- [ ] OS images downloaded (`ls /var/lib/libvirt/images/os-images/`)
- [ ] Network bridge configured (`ip addr show br0`)
- [ ] VM management scripts working
- [ ] Node Exporter running

### Monitoring Verification
- [ ] Prometheus scraping all targets
- [ ] Grafana dashboards displaying data
- [ ] Node Exporter metrics available
- [ ] Alerting rules configured
- [ ] Slack notifications working

## Configuration Checklist

### Environment Variables
- [ ] `DOMAIN_NAME` set
- [ ] `MYSQL_PASSWORD` configured
- [ ] `JWT_SECRET` set
- [ ] `HETZNER_API_TOKEN` configured
- [ ] `HETZNER_SSH_KEY_PATH` set
- [ ] `SLACK_WEBHOOK_URL` configured
- [ ] `GRAFANA_PASSWORD` set

### Security Configuration
- [ ] Firewall rules configured
- [ ] SSH key authentication working
- [ ] Strong passwords set
- [ ] SSL certificates configured (if using domain)
- [ ] Database access restricted
- [ ] Application secrets in environment variables

### Network Configuration
- [ ] DNS records pointing to GUI servers
- [ ] Load balancer configured (if using multiple GUI servers)
- [ ] Network bridges configured on VM servers
- [ ] Kubernetes cluster networking working
- [ ] Monitoring network access configured

## Troubleshooting Checklist

### Common Issues
- [ ] SSH connection problems
- [ ] Service startup failures
- [ ] Network connectivity issues
- [ ] Database connection problems
- [ ] Kubernetes cluster issues
- [ ] VM creation problems
- [ ] Monitoring data not appearing

### Log Locations
- [ ] Backend logs: `journalctl -u dc-backend`
- [ ] Nginx logs: `/var/log/nginx/`
- [ ] System logs: `/var/log/messages`
- [ ] Service logs: `journalctl -u service-name`
- [ ] Application logs: `/var/log/dc-management/`

### Recovery Procedures
- [ ] Service restart procedures documented
- [ ] Backup and restore procedures tested
- [ ] Disaster recovery plan in place
- [ ] Monitoring and alerting configured
- [ ] Documentation updated

## Maintenance Checklist

### Regular Tasks
- [ ] System updates scheduled
- [ ] Database maintenance scheduled
- [ ] Log rotation configured
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured
- [ ] Performance monitoring in place

### Security Maintenance
- [ ] Regular security updates
- [ ] Password rotation schedule
- [ ] SSL certificate renewal
- [ ] Access audit procedures
- [ ] Vulnerability scanning

## Final Verification

### End-to-End Testing
- [ ] Create test VM through GUI
- [ ] Deploy test application to Kubernetes
- [ ] Test monitoring and alerting
- [ ] Verify backup and restore
- [ ] Test user authentication
- [ ] Verify all API endpoints
- [ ] Test Slack notifications
- [ ] Verify database operations

### Performance Testing
- [ ] Load testing on GUI server
- [ ] Kubernetes cluster performance
- [ ] VM creation performance
- [ ] Database performance
- [ ] Monitoring system performance

### Documentation
- [ ] Setup documentation complete
- [ ] Troubleshooting guide updated
- [ ] API documentation available
- [ ] User manual created
- [ ] Maintenance procedures documented

## Sign-off

- [ ] **System Administrator**: All technical requirements met
- [ ] **Security Team**: Security requirements satisfied
- [ ] **Operations Team**: Monitoring and alerting configured
- [ ] **Development Team**: Application functionality verified
- [ ] **Management**: Project objectives achieved

---

**Setup Completed By**: _________________  
**Date**: _________________  
**Signature**: _________________

**Reviewed By**: _________________  
**Date**: _________________  
**Signature**: _________________