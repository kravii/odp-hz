#!/bin/bash

# Internal DC Management System - Kubernetes Server Setup Script
# This script automates the setup of Kubernetes servers (master and worker nodes)

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
NODE_TYPE="${NODE_TYPE:-worker}"  # master or worker
CLUSTER_NAME="${CLUSTER_NAME:-dc-cluster}"
K8S_VERSION="${K8S_VERSION:-1.28.0}"
MASTER_IP="${MASTER_IP:-}"
JOIN_TOKEN="${JOIN_TOKEN:-}"
CERTIFICATE_KEY="${CERTIFICATE_KEY:-}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    error "sudo is required but not installed. Please install sudo first."
fi

log "Starting Kubernetes Server Setup for Internal DC Management System"
log "Node type: $NODE_TYPE"

# Step 1: Update system packages
log "Step 1: Updating system packages"
sudo dnf update -y

# Step 2: Install essential packages
log "Step 2: Installing essential packages"
sudo dnf install -y curl wget vim git htop net-tools

# Step 3: Disable firewall and SELinux
log "Step 3: Disabling firewall and SELinux"
sudo systemctl stop firewalld
sudo systemctl disable firewalld
sudo setenforce 0
sudo sed -i "s/^SELINUX=enforcing$/SELINUX=disabled/" /etc/selinux/config

# Step 4: Disable swap
log "Step 4: Disabling swap"
sudo swapoff -a
sudo sed -i "/ swap / s/^/#/" /etc/fstab

# Step 5: Enable kernel modules
log "Step 5: Enabling kernel modules"
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/k8s.conf
echo "net.bridge.bridge-nf-call-iptables = 1" | sudo tee -a /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl --system

# Step 6: Install Docker
log "Step 6: Installing Docker"
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

# Step 7: Install Kubernetes components
log "Step 7: Installing Kubernetes components"
sudo tee /etc/yum.repos.d/kubernetes.repo > /dev/null <<EOF
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF

sudo dnf install -y kubelet kubeadm kubectl

# Enable kubelet
sudo systemctl enable kubelet

# Step 8: Master node specific setup
if [ "$NODE_TYPE" = "master" ]; then
    log "Step 8: Setting up master node"
    
    # Initialize cluster
    sudo kubeadm init --control-plane-endpoint="$CLUSTER_NAME-lb" --pod-network-cidr=10.244.0.0/16 --service-cidr=10.96.0.0/12 --upload-certs
    
    # Setup kubectl
    mkdir -p $HOME/.kube
    sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
    sudo chown $(id -u):$(id -g) $HOME/.kube/config
    
    # Install CNI (Calico)
    kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/calico.yaml
    
    # Get join commands
    kubectl token create --print-join-command > /tmp/worker-join-command
    kubeadm init phase upload-certs --upload-certs > /tmp/master-join-command
    
    log "Master node setup completed!"
    log "Worker join command:"
    cat /tmp/worker-join-command
    log "Master join command:"
    cat /tmp/master-join-command
    
    # Install HAProxy for load balancing
    log "Installing HAProxy for load balancing"
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
    server master1 $(hostname -I | awk '{print $1}'):6443 check
EOF
    
    # Start and enable HAProxy
    sudo systemctl enable haproxy
    sudo systemctl start haproxy
    
    log "HAProxy configured and started"
    
else
    log "Step 8: Setting up worker node"
    
    if [ -z "$JOIN_TOKEN" ] || [ -z "$MASTER_IP" ]; then
        error "JOIN_TOKEN and MASTER_IP environment variables are required for worker nodes"
    fi
    
    # Join cluster
    sudo kubeadm join $MASTER_IP:6443 --token $JOIN_TOKEN --discovery-token-ca-cert-hash sha256:$(openssl x509 -pubkey -in /etc/kubernetes/pki/ca.pub | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //')
    
    log "Worker node joined cluster successfully!"
fi

# Step 9: Install Node Exporter
log "Step 9: Installing Node Exporter"
sudo useradd --no-create-home --shell /bin/false node_exporter
cd /tmp
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

# Step 10: Final verification
log "Step 10: Verifying installation"

# Check services
services=("docker" "kubelet" "node_exporter")
if [ "$NODE_TYPE" = "master" ]; then
    services+=("haproxy")
fi

for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        log "✓ $service is running"
    else
        warning "✗ $service is not running"
    fi
done

# Test endpoints
if curl -s http://localhost:9100/metrics > /dev/null; then
    log "✓ Node Exporter is accessible"
else
    warning "✗ Node Exporter is not accessible"
fi

if [ "$NODE_TYPE" = "master" ]; then
    if kubectl get nodes > /dev/null 2>&1; then
        log "✓ Kubernetes cluster is accessible"
        kubectl get nodes
    else
        warning "✗ Kubernetes cluster is not accessible"
    fi
fi

# Cleanup
rm -rf /tmp/node_exporter-1.6.1.linux-amd64*

log "Kubernetes server setup completed successfully!"
log "Node type: $NODE_TYPE"
log "Cluster name: $CLUSTER_NAME"

if [ "$NODE_TYPE" = "master" ]; then
    log "Master node is ready!"
    log "Use the join commands above to add additional nodes to the cluster"
else
    log "Worker node has joined the cluster successfully!"
fi