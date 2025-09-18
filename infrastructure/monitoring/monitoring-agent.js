#!/usr/bin/env node

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const logger = require('../../backend/utils/logger');

class MonitoringAgent {
  constructor(serverConfig) {
    this.server = serverConfig;
    this.sshClient = new Client();
  }

  async installAgent() {
    try {
      await this.connect();
      
      logger.info(`Installing monitoring agent on: ${this.server.hostname}`);
      
      // Install Node Exporter
      await this.installNodeExporter();
      
      // Install Prometheus Agent
      await this.installPrometheusAgent();
      
      // Configure monitoring
      await this.configureMonitoring();
      
      logger.info(`Monitoring agent installed successfully on: ${this.server.hostname}`);
      return { success: true };
      
    } catch (error) {
      logger.error(`Failed to install monitoring agent: ${error.message}`);
      throw error;
    } finally {
      this.sshClient.end();
    }
  }

  async installNodeExporter() {
    logger.info('Installing Node Exporter...');
    
    const commands = [
      'useradd --no-create-home --shell /bin/false node_exporter',
      'wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz',
      'tar xzf node_exporter-1.6.1.linux-amd64.tar.gz',
      'cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/',
      'chown node_exporter:node_exporter /usr/local/bin/node_exporter',
      'rm -rf node_exporter-1.6.1.linux-amd64*'
    ];
    
    await this.executeCommand(commands.join(' && '));
    
    // Create systemd service
    const serviceConfig = `[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter --collector.systemd --collector.processes --collector.cpu.info

[Install]
WantedBy=multi-user.target`;

    await this.executeCommand(`cat > /etc/systemd/system/node_exporter.service << 'EOF'\n${serviceConfig}\nEOF`);
    
    // Enable and start service
    await this.executeCommand([
      'systemctl daemon-reload',
      'systemctl enable node_exporter',
      'systemctl start node_exporter'
    ].join(' && '));
  }

  async installPrometheusAgent() {
    logger.info('Installing Prometheus Agent...');
    
    const commands = [
      'useradd --no-create-home --shell /bin/false prometheus',
      'mkdir /etc/prometheus',
      'mkdir /var/lib/prometheus',
      'chown prometheus:prometheus /etc/prometheus',
      'chown prometheus:prometheus /var/lib/prometheus',
      'wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz',
      'tar xzf prometheus-2.45.0.linux-amd64.tar.gz',
      'cp prometheus-2.45.0.linux-amd64/prometheus /usr/local/bin/',
      'cp prometheus-2.45.0.linux-amd64/promtool /usr/local/bin/',
      'cp -r prometheus-2.45.0.linux-amd64/consoles /etc/prometheus',
      'cp -r prometheus-2.45.0.linux-amd64/console_libraries /etc/prometheus',
      'chown -R prometheus:prometheus /etc/prometheus/consoles',
      'chown -R prometheus:prometheus /etc/prometheus/console_libraries',
      'rm -rf prometheus-2.45.0.linux-amd64*'
    ];
    
    await this.executeCommand(commands.join(' && '));
    
    // Create Prometheus configuration
    const prometheusConfig = `global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+)(?::\\d+)?'
        target_label: __address__
        replacement: '${1}:9100'

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)`;

    await this.executeCommand(`cat > /etc/prometheus/prometheus.yml << 'EOF'\n${prometheusConfig}\nEOF`);
    
    // Create systemd service
    const serviceConfig = `[Unit]
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
WantedBy=multi-user.target`;

    await this.executeCommand(`cat > /etc/systemd/system/prometheus.service << 'EOF'\n${serviceConfig}\nEOF`);
    
    // Enable and start service
    await this.executeCommand([
      'systemctl daemon-reload',
      'systemctl enable prometheus',
      'systemctl start prometheus'
    ].join(' && '));
  }

  async configureMonitoring() {
    logger.info('Configuring monitoring...');
    
    // Configure firewall
    await this.executeCommand([
      'firewall-cmd --permanent --add-port=9090/tcp',
      'firewall-cmd --permanent --add-port=9100/tcp',
      'firewall-cmd --reload'
    ].join(' && '));
    
    // Create monitoring script
    const monitoringScript = `#!/bin/bash

# System monitoring script
while true; do
    # Get system metrics
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    TEMPERATURE=$(sensors 2>/dev/null | grep "Core 0" | awk '{print $3}' | sed 's/+//' | sed 's/°C//' || echo "N/A")
    
    # Send metrics to API
    curl -X POST http://localhost:3001/api/monitoring/data \\
        -H "Content-Type: application/json" \\
        -d "{
            \\"resourceType\\": \\"server\\",
            \\"resourceId\\": ${this.server.id},
            \\"cpuUsage\\": $CPU_USAGE,
            \\"memoryUsage\\": $MEMORY_USAGE,
            \\"storageUsage\\": $DISK_USAGE,
            \\"loadAverage1m\\": $LOAD_AVG,
            \\"temperature\\": $TEMPERATURE,
            \\"timestamp\\": \\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\"
        }" 2>/dev/null || true
    
    sleep 60
done`;

    await this.executeCommand(`cat > /usr/local/bin/monitoring-agent.sh << 'EOF'\n${monitoringScript}\nEOF`);
    await this.executeCommand('chmod +x /usr/local/bin/monitoring-agent.sh');
    
    // Create systemd service for monitoring agent
    const serviceConfig = `[Unit]
Description=Monitoring Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/monitoring-agent.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

    await this.executeCommand(`cat > /etc/systemd/system/monitoring-agent.service << 'EOF'\n${serviceConfig}\nEOF`);
    
    // Enable and start monitoring agent
    await this.executeCommand([
      'systemctl daemon-reload',
      'systemctl enable monitoring-agent',
      'systemctl start monitoring-agent'
    ].join(' && '));
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

  async uninstallAgent() {
    try {
      await this.connect();
      
      logger.info(`Uninstalling monitoring agent from: ${this.server.hostname}`);
      
      // Stop and disable services
      await this.executeCommand([
        'systemctl stop monitoring-agent',
        'systemctl disable monitoring-agent',
        'systemctl stop node_exporter',
        'systemctl disable node_exporter',
        'systemctl stop prometheus',
        'systemctl disable prometheus'
      ].join(' && '));
      
      // Remove files
      await this.executeCommand([
        'rm -f /usr/local/bin/node_exporter',
        'rm -f /usr/local/bin/prometheus',
        'rm -f /usr/local/bin/promtool',
        'rm -f /usr/local/bin/monitoring-agent.sh',
        'rm -f /etc/systemd/system/node_exporter.service',
        'rm -f /etc/systemd/system/prometheus.service',
        'rm -f /etc/systemd/system/monitoring-agent.service',
        'rm -rf /etc/prometheus',
        'rm -rf /var/lib/prometheus'
      ].join(' && '));
      
      // Remove users
      await this.executeCommand([
        'userdel node_exporter',
        'userdel prometheus'
      ].join(' && '));
      
      logger.info(`Monitoring agent uninstalled successfully from: ${this.server.hostname}`);
      return { success: true };
      
    } catch (error) {
      logger.error(`Failed to uninstall monitoring agent: ${error.message}`);
      throw error;
    } finally {
      this.sshClient.end();
    }
  }
}

module.exports = MonitoringAgent;