#!/usr/bin/env node

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const logger = require('../../backend/utils/logger');

class K8sProvisioner {
  constructor(serverConfigs) {
    this.servers = serverConfigs;
    this.masterNodes = [];
    this.workerNodes = [];
    this.clusterConfig = null;
  }

  async provisionCluster(clusterConfig) {
    try {
      this.clusterConfig = clusterConfig;
      
      logger.info(`Starting Kubernetes cluster provisioning: ${clusterConfig.clusterName}`);
      
      // Separate master and worker nodes
      this.masterNodes = this.servers.slice(0, clusterConfig.masterNodes);
      this.workerNodes = this.servers.slice(clusterConfig.masterNodes);
      
      // Install prerequisites on all nodes
      await this.installPrerequisites();
      
      // Configure master nodes
      await this.configureMasterNodes();
      
      // Configure worker nodes
      await this.configureWorkerNodes();
      
      // Setup HA for control plane
      await this.setupHA();
      
      // Install CNI (Calico)
      await this.installCNI();
      
      // Install Rancher agent
      await this.installRancherAgent();
      
      logger.info(`Kubernetes cluster ${clusterConfig.clusterName} provisioned successfully`);
      return { success: true, clusterName: clusterConfig.clusterName };
      
    } catch (error) {
      logger.error(`Failed to provision Kubernetes cluster: ${error.message}`);
      throw error;
    }
  }

  async installPrerequisites() {
    logger.info('Installing prerequisites on all nodes...');
    
    const commands = [
      'yum update -y',
      'yum install -y curl wget vim net-tools',
      'systemctl stop firewalld',
      'systemctl disable firewalld',
      'setenforce 0',
      'sed -i "s/^SELINUX=enforcing$/SELINUX=disabled/" /etc/selinux/config',
      'swapoff -a',
      'sed -i "/ swap / s/^/#/" /etc/fstab',
      'modprobe br_netfilter',
      'echo "br_netfilter" >> /etc/modules-load.d/k8s.conf',
      'echo "net.bridge.bridge-nf-call-iptables = 1" >> /etc/sysctl.conf',
      'echo "net.bridge.bridge-nf-call-ip6tables = 1" >> /etc/sysctl.conf',
      'sysctl --system'
    ];

    for (const server of this.servers) {
      await this.executeOnServer(server, commands.join(' && '));
    }
  }

  async configureMasterNodes() {
    logger.info('Configuring master nodes...');
    
    for (let i = 0; i < this.masterNodes.length; i++) {
      const master = this.masterNodes[i];
      await this.configureMasterNode(master, i === 0);
    }
  }

  async configureMasterNode(master, isFirstMaster) {
    const commands = [
      // Install Docker
      'yum install -y yum-utils',
      'yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo',
      'yum install -y docker-ce docker-ce-cli containerd.io',
      'systemctl enable docker',
      'systemctl start docker',
      
      // Install kubeadm, kubelet, kubectl
      'cat > /etc/yum.repos.d/kubernetes.repo << EOF\n[kubernetes]\nname=Kubernetes\nbaseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg\nEOF',
      'yum install -y kubelet kubeadm kubectl',
      'systemctl enable kubelet',
      
      // Configure containerd
      'mkdir -p /etc/containerd',
      'containerd config default | tee /etc/containerd/config.toml',
      'sed -i "s/SystemdCgroup = false/SystemdCgroup = true/" /etc/containerd/config.toml',
      'systemctl restart containerd',
      'systemctl restart kubelet'
    ];

    await this.executeOnServer(master, commands.join(' && '));

    if (isFirstMaster) {
      // Initialize cluster on first master
      await this.initializeCluster(master);
    } else {
      // Join additional masters
      await this.joinMasterNode(master);
    }
  }

  async initializeCluster(master) {
    logger.info(`Initializing cluster on master: ${master.hostname}`);
    
    const initCommand = `kubeadm init --control-plane-endpoint="${this.clusterConfig.clusterName}-lb" --pod-network-cidr=10.244.0.0/16 --service-cidr=10.96.0.0/12 --upload-certs`;
    
    await this.executeOnServer(master, initCommand);
    
    // Setup kubectl
    const kubectlCommands = [
      'mkdir -p $HOME/.kube',
      'cp -i /etc/kubernetes/admin.conf $HOME/.kube/config',
      'chown $(id -u):$(id -g) $HOME/.kube/config'
    ];
    
    await this.executeOnServer(master, kubectlCommands.join(' && '));
    
    // Get join command for workers
    const joinCommand = await this.getJoinCommand(master);
    this.workerJoinCommand = joinCommand;
    
    // Get join command for masters
    const masterJoinCommand = await this.getMasterJoinCommand(master);
    this.masterJoinCommand = masterJoinCommand;
  }

  async joinMasterNode(master) {
    logger.info(`Joining master node: ${master.hostname}`);
    
    if (!this.masterJoinCommand) {
      throw new Error('Master join command not available');
    }
    
    await this.executeOnServer(master, this.masterJoinCommand);
    
    // Setup kubectl
    const kubectlCommands = [
      'mkdir -p $HOME/.kube',
      'cp -i /etc/kubernetes/admin.conf $HOME/.kube/config',
      'chown $(id -u):$(id -g) $HOME/.kube/config'
    ];
    
    await this.executeOnServer(master, kubectlCommands.join(' && '));
  }

  async configureWorkerNodes() {
    logger.info('Configuring worker nodes...');
    
    for (const worker of this.workerNodes) {
      await this.configureWorkerNode(worker);
    }
  }

  async configureWorkerNode(worker) {
    const commands = [
      // Install Docker
      'yum install -y yum-utils',
      'yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo',
      'yum install -y docker-ce docker-ce-cli containerd.io',
      'systemctl enable docker',
      'systemctl start docker',
      
      // Install kubeadm, kubelet, kubectl
      'cat > /etc/yum.repos.d/kubernetes.repo << EOF\n[kubernetes]\nname=Kubernetes\nbaseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=1\ngpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg\nEOF',
      'yum install -y kubelet kubeadm kubectl',
      'systemctl enable kubelet',
      
      // Configure containerd
      'mkdir -p /etc/containerd',
      'containerd config default | tee /etc/containerd/config.toml',
      'sed -i "s/SystemdCgroup = false/SystemdCgroup = true/" /etc/containerd/config.toml',
      'systemctl restart containerd',
      'systemctl restart kubelet'
    ];

    await this.executeOnServer(worker, commands.join(' && '));
    
    // Join cluster
    if (!this.workerJoinCommand) {
      throw new Error('Worker join command not available');
    }
    
    await this.executeOnServer(worker, this.workerJoinCommand);
  }

  async setupHA() {
    logger.info('Setting up HA for control plane...');
    
    // Install HAProxy for load balancing
    const haproxyConfig = `global
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
${this.masterNodes.map((master, index) => 
  `    server master${index + 1} ${master.ipAddress}:6443 check`
).join('\n')}`;

    // Install HAProxy on first master
    const firstMaster = this.masterNodes[0];
    await this.executeOnServer(firstMaster, [
      'yum install -y haproxy',
      `cat > /etc/haproxy/haproxy.cfg << 'EOF'\n${haproxyConfig}\nEOF`,
      'systemctl enable haproxy',
      'systemctl start haproxy'
    ].join(' && '));
  }

  async installCNI() {
    logger.info('Installing CNI (Calico)...');
    
    const firstMaster = this.masterNodes[0];
    
    const calicoManifest = `apiVersion: v1
kind: Pod
metadata:
  name: calico-install
  namespace: kube-system
spec:
  containers:
  - name: calico-install
    image: calico/cni:v3.24.5
    command: ["/bin/sh"]
    args: ["-c", "kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.24.5/manifests/calico.yaml"]
    volumeMounts:
    - name: kubeconfig
      mountPath: /root/.kube
  volumes:
  - name: kubeconfig
    hostPath:
      path: /root/.kube
  restartPolicy: Never`;

    await this.executeOnServer(firstMaster, [
      `cat > /tmp/calico-install.yaml << 'EOF'\n${calicoManifest}\nEOF`,
      'kubectl apply -f /tmp/calico-install.yaml'
    ].join(' && '));
  }

  async installRancherAgent() {
    logger.info('Installing Rancher agent...');
    
    const firstMaster = this.masterNodes[0];
    
    const rancherAgentCommand = `curl -sfL https://get.rancher.io | sh -s - --server ${this.clusterConfig.rancherUrl} --token ${this.clusterConfig.rancherToken}`;
    
    await this.executeOnServer(firstMaster, rancherAgentCommand);
  }

  async getJoinCommand(master) {
    const result = await this.executeOnServer(master, 'kubeadm token create --print-join-command');
    return result.stdout.trim();
  }

  async getMasterJoinCommand(master) {
    const result = await this.executeOnServer(master, 'kubeadm init phase upload-certs --upload-certs');
    const certKey = result.stdout.match(/--certificate-key (\S+)/)?.[1];
    
    if (!certKey) {
      throw new Error('Failed to get certificate key');
    }
    
    const joinCommand = await this.getJoinCommand(master);
    return `${joinCommand} --control-plane --certificate-key ${certKey}`;
  }

  async executeOnServer(server, command) {
    return new Promise((resolve, reject) => {
      const sshClient = new Client();
      
      sshClient.on('ready', () => {
        sshClient.exec(command, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code, signal) => {
            sshClient.end();
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

      sshClient.on('error', (err) => {
        reject(err);
      });

      sshClient.connect({
        host: server.ipAddress,
        port: server.sshPort || 22,
        username: server.sshUser || 'root',
        privateKey: fs.readFileSync(process.env.HETZNER_SSH_KEY_PATH),
      });
    });
  }

  async destroyCluster(clusterName) {
    try {
      logger.info(`Destroying Kubernetes cluster: ${clusterName}`);
      
      // Reset all nodes
      for (const server of this.servers) {
        await this.executeOnServer(server, [
          'kubeadm reset --force',
          'systemctl stop kubelet',
          'systemctl stop docker',
          'rm -rf /var/lib/cni/',
          'rm -rf /var/lib/kubelet/*',
          'rm -rf /etc/cni/',
          'rm -rf /etc/kubernetes/',
          'rm -rf /var/lib/etcd/',
          'rm -rf /root/.kube/',
          'iptables -F',
          'iptables -t nat -F',
          'iptables -t mangle -F',
          'iptables -X'
        ].join(' && '));
      }
      
      logger.info(`Kubernetes cluster ${clusterName} destroyed successfully`);
      return { success: true };
      
    } catch (error) {
      logger.error(`Failed to destroy Kubernetes cluster: ${error.message}`);
      throw error;
    }
  }
}

module.exports = K8sProvisioner;