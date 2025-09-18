const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class MonitoringService {
  constructor() {
    this.packageInstallScripts = {
      'prometheus': this.installPrometheus.bind(this),
      'grafana': this.installGrafana.bind(this),
      'node-exporter': this.installNodeExporter.bind(this),
      'docker': this.installDocker.bind(this),
      'kubectl': this.installKubectl.bind(this),
    };
  }

  /**
   * Setup monitoring on a baremetal server
   * @param {Object} server - Server object with connection details
   * @param {Array} packages - Array of packages to install
   * @returns {Object} Setup result
   */
  async setupMonitoring(server, packages = []) {
    try {
      logger.info(`Setting up monitoring on server: ${server.hostname} (${server.ipAddress})`);
      
      const results = {
        server: server.hostname,
        ipAddress: server.ipAddress,
        packagesInstalled: [],
        errors: [],
        monitoringEndpoint: null,
        status: 'success'
      };

      // Install each requested package
      for (const packageName of packages) {
        try {
          if (this.packageInstallScripts[packageName]) {
            await this.packageInstallScripts[packageName](server);
            results.packagesInstalled.push(packageName);
            logger.info(`Successfully installed ${packageName} on ${server.hostname}`);
          } else {
            logger.warn(`Unknown package: ${packageName}`);
            results.errors.push(`Unknown package: ${packageName}`);
          }
        } catch (error) {
          logger.error(`Failed to install ${packageName} on ${server.hostname}:`, error);
          results.errors.push(`Failed to install ${packageName}: ${error.message}`);
        }
      }

      // Setup monitoring endpoint
      if (packages.includes('prometheus')) {
        results.monitoringEndpoint = `http://${server.ipAddress}:9090`;
      }

      // If there are errors but some packages were installed, mark as partial success
      if (results.errors.length > 0 && results.packagesInstalled.length > 0) {
        results.status = 'partial';
      } else if (results.errors.length > 0) {
        results.status = 'failed';
      }

      logger.info(`Monitoring setup completed on ${server.hostname}: ${results.status}`);
      return results;

    } catch (error) {
      logger.error(`Monitoring setup failed on ${server.hostname}:`, error);
      throw error;
    }
  }

  /**
   * Install Prometheus monitoring system
   */
  async installPrometheus(server) {
    const commands = [
      // Download and install Prometheus
      `curl -LO https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz`,
      `tar xvfz prometheus-2.45.0.linux-amd64.tar.gz`,
      `sudo cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/`,
      `sudo cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/`,
      
      // Create Prometheus user
      `sudo useradd --no-create-home --shell /bin/false prometheus`,
      
      // Create directories
      `sudo mkdir /etc/prometheus`,
      `sudo mkdir /var/lib/prometheus`,
      
      // Set ownership
      `sudo chown prometheus:prometheus /etc/prometheus`,
      `sudo chown prometheus:prometheus /var/lib/prometheus`,
      
      // Create systemd service
      `sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
    --config.file /etc/prometheus/prometheus.yml \\
    --storage.tsdb.path /var/lib/prometheus/ \\
    --web.console.templates=/etc/prometheus/consoles \\
    --web.console.libraries=/etc/prometheus/console_libraries \\
    --web.listen-address=0.0.0.0:9090 \\
    --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF`,
      
      // Start and enable service
      `sudo systemctl daemon-reload`,
      `sudo systemctl start prometheus`,
      `sudo systemctl enable prometheus`,
      
      // Cleanup
      `rm -rf prometheus-2.45.0.linux-amd64*`
    ];

    await this.executeCommandsOnServer(server, commands);
  }

  /**
   * Install Grafana visualization platform
   */
  async installGrafana(server) {
    const commands = [
      // Install Grafana repository
      `sudo tee /etc/yum.repos.d/grafana.repo > /dev/null <<EOF
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF`,
      
      // Install Grafana
      `sudo yum install grafana -y`,
      
      // Start and enable service
      `sudo systemctl start grafana-server`,
      `sudo systemctl enable grafana-server`,
      
      // Configure firewall
      `sudo firewall-cmd --permanent --add-port=3000/tcp`,
      `sudo firewall-cmd --reload`
    ];

    await this.executeCommandsOnServer(server, commands);
  }

  /**
   * Install Node Exporter for system metrics
   */
  async installNodeExporter(server) {
    const commands = [
      // Download and install Node Exporter
      `curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz`,
      `tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz`,
      `sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/`,
      
      // Create systemd service
      `sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF`,
      
      // Create node_exporter user
      `sudo useradd --no-create-home --shell /bin/false node_exporter`,
      
      // Start and enable service
      `sudo systemctl daemon-reload`,
      `sudo systemctl start node_exporter`,
      `sudo systemctl enable node_exporter`,
      
      // Configure firewall
      `sudo firewall-cmd --permanent --add-port=9100/tcp`,
      `sudo firewall-cmd --reload`,
      
      // Cleanup
      `rm -rf node_exporter-1.6.1.linux-amd64*`
    ];

    await this.executeCommandsOnServer(server, commands);
  }

  /**
   * Install Docker container runtime
   */
  async installDocker(server) {
    const commands = [
      // Install Docker
      `sudo yum install -y yum-utils`,
      `sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo`,
      `sudo yum install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y`,
      
      // Start and enable Docker
      `sudo systemctl start docker`,
      `sudo systemctl enable docker`,
      
      // Add user to docker group
      `sudo usermod -aG docker ${server.sshUser}`
    ];

    await this.executeCommandsOnServer(server, commands);
  }

  /**
   * Install Kubernetes CLI (kubectl)
   */
  async installKubectl(server) {
    const commands = [
      // Install kubectl
      `curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"`,
      `sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl`,
      
      // Enable bash completion
      `echo 'source <(kubectl completion bash)' >> ~/.bashrc`,
      
      // Cleanup
      `rm kubectl`
    ];

    await this.executeCommandsOnServer(server, commands);
  }

  /**
   * Execute commands on a remote server via SSH
   */
  async executeCommandsOnServer(server, commands) {
    const sshCommand = `ssh -o StrictHostKeyChecking=no -p ${server.sshPort} ${server.sshUser}@${server.ipAddress}`;
    
    for (const command of commands) {
      try {
        const fullCommand = `${sshCommand} "${command}"`;
        logger.debug(`Executing on ${server.hostname}: ${command}`);
        
        const { stdout, stderr } = await execAsync(fullCommand, { timeout: 300000 }); // 5 minute timeout
        
        if (stderr && !stderr.includes('Warning: Permanently added')) {
          logger.warn(`Command warning on ${server.hostname}: ${stderr}`);
        }
        
        logger.debug(`Command output on ${server.hostname}: ${stdout}`);
      } catch (error) {
        logger.error(`Command failed on ${server.hostname}: ${command}`, error);
        throw new Error(`Failed to execute command: ${command}. Error: ${error.message}`);
      }
    }
  }

  /**
   * Test SSH connection to server
   */
  async testConnection(server) {
    try {
      const sshCommand = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${server.sshPort} ${server.sshUser}@${server.ipAddress} "echo 'Connection successful'"`;
      const { stdout } = await execAsync(sshCommand, { timeout: 30000 });
      
      if (stdout.includes('Connection successful')) {
        return { success: true, message: 'SSH connection successful' };
      } else {
        return { success: false, message: 'SSH connection failed' };
      }
    } catch (error) {
      return { success: false, message: `SSH connection failed: ${error.message}` };
    }
  }
}

module.exports = new MonitoringService();