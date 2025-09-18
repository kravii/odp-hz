#!/bin/bash

# Internal DC Management System - VM Server Setup Script
# This script automates the setup of VM servers for virtual machine provisioning

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
BRIDGE_IP="${BRIDGE_IP:-10.0.1.1}"
BRIDGE_NETMASK="${BRIDGE_NETMASK:-255.255.255.0}"
STORAGE_POOL_PATH="${STORAGE_POOL_PATH:-/mnt/storage-pool}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    error "sudo is required but not installed. Please install sudo first."
fi

log "Starting VM Server Setup for Internal DC Management System"

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
sudo firewall-cmd --permanent --add-port=5900-5999/tcp  # VNC
sudo firewall-cmd --reload

# Step 4: Install virtualization tools
log "Step 4: Installing virtualization tools"
sudo dnf install -y qemu-kvm libvirt virt-install bridge-utils

# Start and enable libvirt
sudo systemctl start libvirtd
sudo systemctl enable libvirtd

# Add user to libvirt group
sudo usermod -aG libvirt $USER

# Step 5: Setup storage pool
log "Step 5: Setting up storage pool"
sudo mkdir -p /var/lib/libvirt/images
sudo chown root:root /var/lib/libvirt/images
sudo chmod 755 /var/lib/libvirt/images

# Create storage pool
sudo mkdir -p $STORAGE_POOL_PATH
sudo chown root:root $STORAGE_POOL_PATH
sudo chmod 755 $STORAGE_POOL_PATH

# Step 6: Setup network bridge
log "Step 6: Setting up network bridge"
sudo tee /etc/sysconfig/network-scripts/ifcfg-br0 > /dev/null <<EOF
DEVICE=br0
TYPE=Bridge
BOOTPROTO=static
IPADDR=$BRIDGE_IP
NETMASK=$BRIDGE_NETMASK
ONBOOT=yes
EOF

# Restart network
sudo systemctl restart NetworkManager

# Step 7: Download OS images
log "Step 7: Downloading OS images"
sudo mkdir -p /var/lib/libvirt/images/os-images
sudo chown root:root /var/lib/libvirt/images/os-images

cd /var/lib/libvirt/images/os-images

# Download CentOS 7 image
if [ ! -f "CentOS-7-x86_64-GenericCloud.qcow2" ]; then
    log "Downloading CentOS 7 image..."
    sudo wget https://cloud.centos.org/centos/7/images/CentOS-7-x86_64-GenericCloud.qcow2
fi

# Download Rocky Linux 9 image
if [ ! -f "Rocky-9-GenericCloud.latest.x86_64.qcow2" ]; then
    log "Downloading Rocky Linux 9 image..."
    sudo wget https://download.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud.latest.x86_64.qcow2
fi

# Download Ubuntu 22.04 image
if [ ! -f "jammy-server-cloudimg-amd64.img" ]; then
    log "Downloading Ubuntu 22.04 image..."
    sudo wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img
fi

# Download Ubuntu 24.04 image
if [ ! -f "noble-server-cloudimg-amd64.img" ]; then
    log "Downloading Ubuntu 24.04 image..."
    sudo wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
fi

# Step 8: Configure SSH keys
log "Step 8: Configuring SSH keys"
sudo mkdir -p /etc/ssh/keys
sudo chmod 700 /etc/ssh/keys

# Create a sample SSH key if none exists
if [ ! -f "/etc/ssh/keys/vm-key.pub" ]; then
    log "Creating sample SSH key for VMs..."
    sudo ssh-keygen -t rsa -b 4096 -f /etc/ssh/keys/vm-key -N "" -C "vm-key"
    sudo chmod 644 /etc/ssh/keys/vm-key.pub
    sudo chmod 600 /etc/ssh/keys/vm-key
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

# Step 10: Create VM management scripts
log "Step 10: Creating VM management scripts"

# Create VM creation script
sudo tee /usr/local/bin/create-vm.sh > /dev/null <<EOF
#!/bin/bash

# VM Creation Script
VM_NAME=\$1
VM_IP=\$2
VM_CPU=\${3:-2}
VM_MEMORY=\${4:-2048}
VM_DISK=\${5:-20}
VM_OS=\${6:-centos7}

if [ -z "\$VM_NAME" ] || [ -z "\$VM_IP" ]; then
    echo "Usage: create-vm.sh <name> <ip> [cpu] [memory] [disk] [os]"
    echo "OS options: centos7, rockylinux9, ubuntu22, ubuntu24"
    exit 1
fi

VM_DIR="/var/lib/libvirt/images/\$VM_NAME"
mkdir -p \$VM_DIR

# Copy OS image
case \$VM_OS in
    centos7)
        cp /var/lib/libvirt/images/os-images/CentOS-7-x86_64-GenericCloud.qcow2 \$VM_DIR/\$VM_NAME.qcow2
        ;;
    rockylinux9)
        cp /var/lib/libvirt/images/os-images/Rocky-9-GenericCloud.latest.x86_64.qcow2 \$VM_DIR/\$VM_NAME.qcow2
        ;;
    ubuntu22)
        cp /var/lib/libvirt/images/os-images/jammy-server-cloudimg-amd64.img \$VM_DIR/\$VM_NAME.qcow2
        ;;
    ubuntu24)
        cp /var/lib/libvirt/images/os-images/noble-server-cloudimg-amd64.img \$VM_DIR/\$VM_NAME.qcow2
        ;;
    *)
        echo "Unsupported OS: \$VM_OS"
        exit 1
        ;;
esac

# Resize image
qemu-img resize \$VM_DIR/\$VM_NAME.qcow2 \$VM_DISK\G

# Create VM configuration
cat > \$VM_DIR/\$VM_NAME.xml <<VMEOF
<?xml version="1.0" encoding="utf-8"?>
<domain type="kvm">
  <name>\$VM_NAME</name>
  <memory unit="MB">\$VM_MEMORY</memory>
  <vcpu>\$VM_CPU</vcpu>
  <os>
    <type arch="x86_64" machine="pc-q35-6.2">hvm</type>
    <boot dev="hd"/>
  </os>
  <features>
    <acpi/>
    <apic/>
    <pae/>
  </features>
  <cpu mode="host-passthrough"/>
  <clock offset="utc"/>
  <on_poweroff>destroy</on_poweroff>
  <on_reboot>restart</on_reboot>
  <on_crash>restart</on_crash>
  <devices>
    <disk type="file" device="disk">
      <driver name="qemu" type="qcow2"/>
      <source file="\$VM_DIR/\$VM_NAME.qcow2"/>
      <target dev="vda" bus="virtio"/>
    </disk>
    <interface type="network">
      <source network="default"/>
      <model type="virtio"/>
      <address type="pci" domain="0x0000" bus="0x01" slot="0x00" function="0x0"/>
    </interface>
    <serial type="pty">
      <target port="0"/>
    </serial>
    <console type="pty">
      <target type="serial" port="0"/>
    </console>
    <graphics type="vnc" port="-1" autoport="yes"/>
  </devices>
</domain>
VMEOF

# Define and start VM
virsh define \$VM_DIR/\$VM_NAME.xml
virsh start \$VM_NAME

echo "VM \$VM_NAME created and started successfully!"
echo "IP: \$VM_IP"
echo "VNC: \$(virsh vncdisplay \$VM_NAME)"
EOF

sudo chmod +x /usr/local/bin/create-vm.sh

# Create VM deletion script
sudo tee /usr/local/bin/delete-vm.sh > /dev/null <<EOF
#!/bin/bash

VM_NAME=\$1

if [ -z "\$VM_NAME" ]; then
    echo "Usage: delete-vm.sh <name>"
    exit 1
fi

# Stop and undefine VM
virsh destroy \$VM_NAME 2>/dev/null || true
virsh undefine \$VM_NAME 2>/dev/null || true

# Remove VM files
rm -rf /var/lib/libvirt/images/\$VM_NAME

echo "VM \$VM_NAME deleted successfully!"
EOF

sudo chmod +x /usr/local/bin/delete-vm.sh

# Step 11: Final verification
log "Step 11: Verifying installation"

# Check services
services=("libvirtd" "node_exporter")
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

# Check libvirt status
if virsh list --all > /dev/null 2>&1; then
    log "✓ Libvirt is accessible"
    virsh list --all
else
    warning "✗ Libvirt is not accessible"
fi

# Check available images
log "Available OS images:"
ls -la /var/lib/libvirt/images/os-images/

# Cleanup
rm -rf /tmp/node_exporter-1.6.1.linux-amd64*

log "VM server setup completed successfully!"
log "Storage pool: $STORAGE_POOL_PATH"
log "Bridge IP: $BRIDGE_IP"
log ""
log "Available VM management commands:"
log "  create-vm.sh <name> <ip> [cpu] [memory] [disk] [os]"
log "  delete-vm.sh <name>"
log "  virsh list --all"
log "  virsh start <name>"
log "  virsh stop <name>"
log ""
log "Available OS images:"
log "  - centos7: CentOS 7"
log "  - rockylinux9: Rocky Linux 9"
log "  - ubuntu22: Ubuntu 22.04"
log "  - ubuntu24: Ubuntu 24.04"
log ""
log "SSH key for VMs: /etc/ssh/keys/vm-key.pub"