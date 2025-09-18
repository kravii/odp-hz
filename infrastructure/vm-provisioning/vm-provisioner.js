#!/usr/bin/env node

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const logger = require('../../backend/utils/logger');

class VMProvisioner {
  constructor(serverConfig) {
    this.server = serverConfig;
    this.sshClient = new Client();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.sshClient.on('ready', () => {
        logger.info(`Connected to server: ${this.server.hostname}`);
        resolve();
      });

      this.sshClient.on('error', (err) => {
        logger.error(`SSH connection error: ${err.message}`);
        reject(err);
      });

      this.sshClient.connect({
        host: this.server.ipAddress,
        port: this.server.sshPort || 22,
        username: this.server.sshUser || 'root',
        privateKey: fs.readFileSync(process.env.HETZNER_SSH_KEY_PATH),
      });
    });
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      this.sshClient.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          if (code === 0) {
            resolve({ stdout, stderr, code });
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr}`));
          }
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  async createVM(vmConfig) {
    try {
      await this.connect();
      
      const {
        hostname,
        ipAddress,
        cpuCores,
        memoryGb,
        storageGb,
        osImage,
        mountPoints,
        sshKey,
        defaultUser
      } = vmConfig;

      logger.info(`Creating VM: ${hostname}`);

      // Create VM directory
      const vmDir = `/var/lib/libvirt/images/${hostname}`;
      await this.executeCommand(`mkdir -p ${vmDir}`);

      // Download OS image if not exists
      const imagePath = await this.downloadOSImage(osImage, vmDir);

      // Create storage disk
      await this.createStorageDisk(vmDir, storageGb);

      // Create VM configuration
      const vmConfigXml = this.generateVMConfig({
        hostname,
        ipAddress,
        cpuCores,
        memoryGb,
        storageGb,
        imagePath,
        mountPoints
      });

      // Write VM config to file
      const configPath = `${vmDir}/${hostname}.xml`;
      await this.executeCommand(`cat > ${configPath} << 'EOF'\n${vmConfigXml}\nEOF`);

      // Define and start VM
      await this.executeCommand(`virsh define ${configPath}`);
      await this.executeCommand(`virsh start ${hostname}`);

      // Wait for VM to boot
      await this.waitForVMBoot(hostname);

      // Configure VM
      await this.configureVM(hostname, ipAddress, sshKey, defaultUser);

      logger.info(`VM ${hostname} created successfully`);
      return { success: true, hostname, ipAddress };

    } catch (error) {
      logger.error(`Failed to create VM: ${error.message}`);
      throw error;
    } finally {
      this.sshClient.end();
    }
  }

  async downloadOSImage(osImage, vmDir) {
    const imageUrls = {
      'centos7': 'https://cloud.centos.org/centos/7/images/CentOS-7-x86_64-GenericCloud.qcow2',
      'rhel7': 'https://access.redhat.com/downloads/content/69/ver=/rhel---7/7.9/x86_64/product-software',
      'rhel8': 'https://access.redhat.com/downloads/content/479/ver=/rhel---8/8.8/x86_64/product-software',
      'rhel9': 'https://access.redhat.com/downloads/content/479/ver=/rhel---9/9.2/x86_64/product-software',
      'rockylinux9': 'https://download.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud.latest.x86_64.qcow2',
      'ubuntu20': 'https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img',
      'ubuntu22': 'https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img',
      'ubuntu24': 'https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img',
      'oel8.10': 'https://yum.oracle.com/templates/OracleLinux-EL8/el8/x86_64/OL8U10_x86_64-kvm-b123.qcow2'
    };

    const imageUrl = imageUrls[osImage];
    if (!imageUrl) {
      throw new Error(`Unsupported OS image: ${osImage}`);
    }

    const imagePath = `${vmDir}/${osImage}.qcow2`;
    
    // Check if image already exists
    try {
      await this.executeCommand(`test -f ${imagePath}`);
      logger.info(`Image ${osImage} already exists`);
      return imagePath;
    } catch {
      // Image doesn't exist, download it
      logger.info(`Downloading ${osImage} image...`);
      await this.executeCommand(`wget -O ${imagePath} ${imageUrl}`);
      return imagePath;
    }
  }

  async createStorageDisk(vmDir, storageGb) {
    const diskPath = `${vmDir}/disk.qcow2`;
    await this.executeCommand(`qemu-img create -f qcow2 ${diskPath} ${storageGb}G`);
    return diskPath;
  }

  generateVMConfig(config) {
    const { hostname, ipAddress, cpuCores, memoryGb, storageGb, imagePath, mountPoints } = config;
    
    return `<?xml version="1.0" encoding="utf-8"?>
<domain type="kvm">
  <name>${hostname}</name>
  <memory unit="GB">${memoryGb}</memory>
  <vcpu>${cpuCores}</vcpu>
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
      <source file="${imagePath}"/>
      <target dev="vda" bus="virtio"/>
    </disk>
    <disk type="file" device="disk">
      <driver name="qemu" type="qcow2"/>
      <source file="${vmDir}/disk.qcow2"/>
      <target dev="vdb" bus="virtio"/>
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
</domain>`;
  }

  async waitForVMBoot(hostname, timeout = 300) {
    logger.info(`Waiting for VM ${hostname} to boot...`);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeout * 1000) {
      try {
        await this.executeCommand(`virsh domstate ${hostname}`);
        logger.info(`VM ${hostname} is running`);
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error(`VM ${hostname} failed to boot within ${timeout} seconds`);
  }

  async configureVM(hostname, ipAddress, sshKey, defaultUser) {
    logger.info(`Configuring VM ${hostname}...`);
    
    // Wait for VM to be accessible via SSH
    await this.waitForSSH(ipAddress);
    
    // Configure network
    await this.configureNetwork(hostname, ipAddress);
    
    // Configure SSH key
    await this.configureSSHKey(hostname, sshKey, defaultUser);
    
    // Configure user
    await this.configureUser(hostname, defaultUser);
  }

  async waitForSSH(ipAddress, timeout = 300) {
    logger.info(`Waiting for SSH access to ${ipAddress}...`);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeout * 1000) {
      try {
        await this.executeCommand(`nc -z ${ipAddress} 22`);
        logger.info(`SSH access available for ${ipAddress}`);
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error(`SSH access to ${ipAddress} not available within ${timeout} seconds`);
  }

  async configureNetwork(hostname, ipAddress) {
    // Configure static IP
    const networkConfig = `# This file describes the network interfaces available on your system
# and how to activate them. For more information, see interfaces(5).

source /etc/network/interfaces.d/*

# The loopback network interface
auto lo
iface lo inet loopback

# The primary network interface
auto eth0
iface eth0 inet static
    address ${ipAddress}
    netmask 255.255.255.0
    gateway 10.0.1.1
    dns-nameservers 8.8.8.8 8.8.4.4`;

    await this.executeCommand(`cat > /tmp/interfaces << 'EOF'\n${networkConfig}\nEOF`);
    await this.executeCommand(`virsh attach-disk ${hostname} /tmp/interfaces vdc --targetbus virtio`);
  }

  async configureSSHKey(hostname, sshKey, defaultUser) {
    // Add SSH key to authorized_keys
    await this.executeCommand(`echo "${sshKey}" > /tmp/authorized_keys`);
    await this.executeCommand(`virsh attach-disk ${hostname} /tmp/authorized_keys vdd --targetbus virtio`);
  }

  async configureUser(hostname, defaultUser) {
    // Create user and configure sudo
    const userConfig = `#!/bin/bash
useradd -m -s /bin/bash ${defaultUser}
usermod -aG sudo ${defaultUser}
echo "${defaultUser} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
mkdir -p /home/${defaultUser}/.ssh
chmod 700 /home/${defaultUser}/.ssh
chown ${defaultUser}:${defaultUser} /home/${defaultUser}/.ssh`;

    await this.executeCommand(`cat > /tmp/user-config.sh << 'EOF'\n${userConfig}\nEOF`);
    await this.executeCommand(`chmod +x /tmp/user-config.sh`);
    await this.executeCommand(`virsh attach-disk ${hostname} /tmp/user-config.sh vde --targetbus virtio`);
  }

  async destroyVM(hostname) {
    try {
      await this.connect();
      
      logger.info(`Destroying VM: ${hostname}`);
      
      // Stop and undefine VM
      await this.executeCommand(`virsh destroy ${hostname} || true`);
      await this.executeCommand(`virsh undefine ${hostname} || true`);
      
      // Remove VM files
      await this.executeCommand(`rm -rf /var/lib/libvirt/images/${hostname}`);
      
      logger.info(`VM ${hostname} destroyed successfully`);
      return { success: true };
      
    } catch (error) {
      logger.error(`Failed to destroy VM: ${error.message}`);
      throw error;
    } finally {
      this.sshClient.end();
    }
  }
}

module.exports = VMProvisioner;