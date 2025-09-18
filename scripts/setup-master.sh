#!/bin/bash

# Internal DC Management System - Master Setup Script
# This script orchestrates the setup of the entire infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
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

# Server lists
GUI_SERVERS=()
K8S_MASTER_SERVERS=()
K8S_WORKER_SERVERS=()
VM_SERVERS=()

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --gui-servers <list>        Comma-separated list of GUI server IPs"
    echo "  --k8s-masters <list>       Comma-separated list of K8s master server IPs"
    echo "  --k8s-workers <list>       Comma-separated list of K8s worker server IPs"
    echo "  --vm-servers <list>        Comma-separated list of VM server IPs"
    echo "  --domain <domain>          Domain name for the application"
    echo "  --mysql-password <pass>    MySQL root password"
    echo "  --jwt-secret <secret>      JWT secret key"
    echo "  --hetzner-token <token>     Hetzner API token"
    echo "  --ssh-key-path <path>      Path to SSH private key"
    echo "  --slack-webhook <url>      Slack webhook URL"
    echo "  --grafana-password <pass> Grafana admin password"
    echo "  --help                     Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --gui-servers 192.168.1.10 --k8s-masters 192.168.1.11,192.168.1.12,192.168.1.13 --k8s-workers 192.168.1.14,192.168.1.15 --vm-servers 192.168.1.16,192.168.1.17 --domain dc-management.local"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --gui-servers)
            GUI_SERVERS=($(echo "$2" | tr ',' ' '))
            shift 2
            ;;
        --k8s-masters)
            K8S_MASTER_SERVERS=($(echo "$2" | tr ',' ' '))
            shift 2
            ;;
        --k8s-workers)
            K8S_WORKER_SERVERS=($(echo "$2" | tr ',' ' '))
            shift 2
            ;;
        --vm-servers)
            VM_SERVERS=($(echo "$2" | tr ',' ' '))
            shift 2
            ;;
        --domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        --mysql-password)
            MYSQL_PASSWORD="$2"
            shift 2
            ;;
        --jwt-secret)
            JWT_SECRET="$2"
            shift 2
            ;;
        --hetzner-token)
            HETZNER_API_TOKEN="$2"
            shift 2
            ;;
        --ssh-key-path)
            HETZNER_SSH_KEY_PATH="$2"
            shift 2
            ;;
        --slack-webhook)
            SLACK_WEBHOOK_URL="$2"
            shift 2
            ;;
        --grafana-password)
            GRAFANA_PASSWORD="$2"
            shift 2
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate required parameters
if [ ${#GUI_SERVERS[@]} -eq 0 ]; then
    error "At least one GUI server must be specified"
fi

if [ ${#K8S_MASTER_SERVERS[@]} -eq 0 ]; then
    error "At least one K8s master server must be specified"
fi

if [ ${#VM_SERVERS[@]} -eq 0 ]; then
    error "At least one VM server must be specified"
fi

# Function to execute command on remote server
execute_remote() {
    local server_ip="$1"
    local command="$2"
    local script_path="$3"
    
    log "Executing on server $server_ip: $command"
    
    if [ -n "$script_path" ]; then
        # Copy script to remote server
        scp -o StrictHostKeyChecking=no "$script_path" root@$server_ip:/tmp/
        ssh -o StrictHostKeyChecking=no root@$server_ip "chmod +x /tmp/$(basename $script_path) && /tmp/$(basename $script_path)"
    else
        # Execute command directly
        ssh -o StrictHostKeyChecking=no root@$server_ip "$command"
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local server_ip="$1"
    local timeout="${2:-300}"
    
    log "Waiting for server $server_ip to be ready..."
    
    local start_time=$(date +%s)
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$server_ip "echo 'Server is ready'" >/dev/null 2>&1; then
            log "Server $server_ip is ready"
            return 0
        fi
        sleep 10
    done
    
    error "Server $server_ip is not ready after $timeout seconds"
}

# Function to setup GUI servers
setup_gui_servers() {
    log "Setting up GUI servers..."
    
    for server in "${GUI_SERVERS[@]}"; do
        log "Setting up GUI server: $server"
        
        # Wait for server to be ready
        wait_for_server "$server"
        
        # Set environment variables
        local env_vars="DOMAIN_NAME=$DOMAIN_NAME MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD MYSQL_DATABASE=$MYSQL_DATABASE MYSQL_USER=$MYSQL_USER MYSQL_PASSWORD=$MYSQL_PASSWORD JWT_SECRET=$JWT_SECRET HETZNER_API_TOKEN=$HETZNER_API_TOKEN HETZNER_SSH_KEY_PATH=$HETZNER_SSH_KEY_PATH SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL GRAFANA_PASSWORD=$GRAFANA_PASSWORD"
        
        # Execute setup script
        execute_remote "$server" "$env_vars /tmp/setup-gui-server.sh" "scripts/setup-gui-server.sh"
        
        log "GUI server $server setup completed"
    done
}

# Function to setup K8s master servers
setup_k8s_masters() {
    log "Setting up K8s master servers..."
    
    local first_master=true
    local join_token=""
    local cert_key=""
    
    for server in "${K8S_MASTER_SERVERS[@]}"; do
        log "Setting up K8s master server: $server"
        
        # Wait for server to be ready
        wait_for_server "$server"
        
        # Set environment variables
        local env_vars="NODE_TYPE=master CLUSTER_NAME=dc-cluster K8S_VERSION=1.28.0"
        
        if [ "$first_master" = true ]; then
            # First master - initialize cluster
            execute_remote "$server" "$env_vars /tmp/setup-k8s-server.sh" "scripts/setup-k8s-server.sh"
            
            # Get join token and certificate key
            join_token=$(ssh -o StrictHostKeyChecking=no root@$server "kubeadm token create --print-join-command | awk '{print \$5}'")
            cert_key=$(ssh -o StrictHostKeyChecking=no root@$server "kubeadm init phase upload-certs --upload-certs | grep -o '--certificate-key [^ ]*' | awk '{print \$2}'")
            
            first_master=false
        else
            # Additional masters - join cluster
            local master_join_cmd="kubeadm join $server:6443 --token $join_token --discovery-token-ca-cert-hash sha256:$(ssh -o StrictHostKeyChecking=no root@${K8S_MASTER_SERVERS[0]} 'openssl x509 -pubkey -in /etc/kubernetes/pki/ca.pub | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed \"s/^.* //\"') --control-plane --certificate-key $cert_key"
            
            execute_remote "$server" "$env_vars /tmp/setup-k8s-server.sh" "scripts/setup-k8s-server.sh"
            execute_remote "$server" "$master_join_cmd"
        fi
        
        log "K8s master server $server setup completed"
    done
}

# Function to setup K8s worker servers
setup_k8s_workers() {
    log "Setting up K8s worker servers..."
    
    if [ ${#K8S_WORKER_SERVERS[@]} -eq 0 ]; then
        log "No worker servers specified, skipping..."
        return
    fi
    
    # Get join token from first master
    local join_token=$(ssh -o StrictHostKeyChecking=no root@${K8S_MASTER_SERVERS[0]} "kubeadm token create --print-join-command | awk '{print \$5}'")
    local master_ip=${K8S_MASTER_SERVERS[0]}
    
    for server in "${K8S_WORKER_SERVERS[@]}"; do
        log "Setting up K8s worker server: $server"
        
        # Wait for server to be ready
        wait_for_server "$server"
        
        # Set environment variables
        local env_vars="NODE_TYPE=worker CLUSTER_NAME=dc-cluster K8S_VERSION=1.28.0 MASTER_IP=$master_ip JOIN_TOKEN=$join_token"
        
        # Execute setup script
        execute_remote "$server" "$env_vars /tmp/setup-k8s-server.sh" "scripts/setup-k8s-server.sh"
        
        log "K8s worker server $server setup completed"
    done
}

# Function to setup VM servers
setup_vm_servers() {
    log "Setting up VM servers..."
    
    for server in "${VM_SERVERS[@]}"; do
        log "Setting up VM server: $server"
        
        # Wait for server to be ready
        wait_for_server "$server"
        
        # Execute setup script
        execute_remote "$server" "/tmp/setup-vm-server.sh" "scripts/setup-vm-server.sh"
        
        log "VM server $server setup completed"
    done
}

# Function to configure monitoring
configure_monitoring() {
    log "Configuring monitoring..."
    
    local gui_server=${GUI_SERVERS[0]}
    
    # Update Prometheus configuration to include all servers
    local prometheus_config="global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']"

    # Add GUI servers
    for server in "${GUI_SERVERS[@]}"; do
        prometheus_config+="
      - targets: ['$server:9100']"
    done
    
    # Add K8s servers
    for server in "${K8S_MASTER_SERVERS[@]}"; do
        prometheus_config+="
      - targets: ['$server:9100']"
    done
    
    for server in "${K8S_WORKER_SERVERS[@]}"; do
        prometheus_config+="
      - targets: ['$server:9100']"
    done
    
    # Add VM servers
    for server in "${VM_SERVERS[@]}"; do
        prometheus_config+="
      - targets: ['$server:9100']"
    done
    
    # Update Prometheus configuration
    ssh -o StrictHostKeyChecking=no root@$gui_server "cat > /etc/prometheus/prometheus.yml << 'EOF'
$prometheus_config
EOF"
    
    # Restart Prometheus
    ssh -o StrictHostKeyChecking=no root@$gui_server "systemctl restart prometheus"
    
    log "Monitoring configuration completed"
}

# Function to display final summary
display_summary() {
    log "Setup completed successfully!"
    echo ""
    info "Infrastructure Summary:"
    echo "  GUI Servers: ${GUI_SERVERS[*]}"
    echo "  K8s Master Servers: ${K8S_MASTER_SERVERS[*]}"
    echo "  K8s Worker Servers: ${K8S_WORKER_SERVERS[*]}"
    echo "  VM Servers: ${VM_SERVERS[*]}"
    echo ""
    info "Access URLs:"
    echo "  Frontend: http://$DOMAIN_NAME"
    echo "  Backend API: http://$DOMAIN_NAME/api"
    echo "  Prometheus: http://$DOMAIN_NAME:9090"
    echo "  Grafana: http://$DOMAIN_NAME:3000 (admin/$GRAFANA_PASSWORD)"
    echo ""
    info "Next steps:"
    echo "1. Configure your domain DNS to point to the GUI servers"
    echo "2. Set up SSL certificates with Let's Encrypt"
    echo "3. Configure your Hetzner API token and SSH keys"
    echo "4. Test VM and Kubernetes provisioning"
    echo "5. Configure monitoring and alerting"
    echo ""
    info "Useful commands:"
    echo "  kubectl get nodes (on master nodes)"
    echo "  virsh list --all (on VM servers)"
    echo "  systemctl status dc-backend (on GUI servers)"
}

# Main execution
main() {
    log "Starting Internal DC Management System setup"
    log "Domain: $DOMAIN_NAME"
    log "GUI Servers: ${GUI_SERVERS[*]}"
    log "K8s Master Servers: ${K8S_MASTER_SERVERS[*]}"
    log "K8s Worker Servers: ${K8S_WORKER_SERVERS[*]}"
    log "VM Servers: ${VM_SERVERS[*]}"
    
    # Check if SSH key exists
    if [ ! -f "$HETZNER_SSH_KEY_PATH" ]; then
        error "SSH key not found at $HETZNER_SSH_KEY_PATH"
    fi
    
    # Setup servers in order
    setup_gui_servers
    setup_k8s_masters
    setup_k8s_workers
    setup_vm_servers
    configure_monitoring
    
    # Display summary
    display_summary
}

# Run main function
main "$@"