-- Internal DC Management System Database Schema
-- This script initializes the database with all required tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS dc_management;
USE dc_management;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    ssh_public_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    status ENUM('active', 'inactive', 'maintenance', 'error') DEFAULT 'active',
    total_cpu INT NOT NULL COMMENT 'Total CPU cores',
    total_memory INT NOT NULL COMMENT 'Total memory in GB',
    total_storage INT NOT NULL COMMENT 'Total storage in GB',
    allocated_cpu INT DEFAULT 0 COMMENT 'Allocated CPU cores',
    allocated_memory INT DEFAULT 0 COMMENT 'Allocated memory in GB',
    allocated_storage INT DEFAULT 0 COMMENT 'Allocated storage in GB',
    os_version VARCHAR(50) DEFAULT 'Rocky Linux 9',
    ssh_port INT DEFAULT 22,
    ssh_user VARCHAR(50) DEFAULT 'root',
    last_health_check DATETIME,
    health_status ENUM('healthy', 'warning', 'critical') DEFAULT 'healthy',
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostname (hostname),
    INDEX idx_ip_address (ip_address),
    INDEX idx_status (status),
    INDEX idx_health_status (health_status)
);

-- VM Pools table
CREATE TABLE IF NOT EXISTS vm_pools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    total_cpu INT DEFAULT 0 COMMENT 'Total CPU cores in pool',
    total_memory INT DEFAULT 0 COMMENT 'Total memory in GB in pool',
    total_storage INT DEFAULT 0 COMMENT 'Total storage in GB in pool',
    allocated_cpu INT DEFAULT 0 COMMENT 'Allocated CPU cores',
    allocated_memory INT DEFAULT 0 COMMENT 'Allocated memory in GB',
    allocated_storage INT DEFAULT 0 COMMENT 'Allocated storage in GB',
    max_vms INT DEFAULT 300 COMMENT 'Maximum number of VMs in this pool',
    current_vms INT DEFAULT 0 COMMENT 'Current number of VMs',
    ip_range_start VARCHAR(45) DEFAULT '10.0.1.1',
    ip_range_end VARCHAR(45) DEFAULT '10.0.1.254',
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
);

-- K8s Pools table
CREATE TABLE IF NOT EXISTS k8s_pools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cluster_name VARCHAR(100) NOT NULL UNIQUE,
    kubernetes_version VARCHAR(20) DEFAULT '1.28.0',
    total_cpu INT DEFAULT 0 COMMENT 'Total CPU cores in pool',
    total_memory INT DEFAULT 0 COMMENT 'Total memory in GB in pool',
    total_storage INT DEFAULT 0 COMMENT 'Total storage in GB in pool',
    allocated_cpu INT DEFAULT 0 COMMENT 'Allocated CPU cores',
    allocated_memory INT DEFAULT 0 COMMENT 'Allocated memory in GB',
    allocated_storage INT DEFAULT 0 COMMENT 'Allocated storage in GB',
    master_nodes INT DEFAULT 3 COMMENT 'Number of master nodes for HA',
    worker_nodes INT DEFAULT 0 COMMENT 'Number of worker nodes',
    status ENUM('provisioning', 'active', 'inactive', 'maintenance', 'error') DEFAULT 'provisioning',
    api_server_endpoint VARCHAR(255),
    kubeconfig TEXT,
    rancher_cluster_id VARCHAR(100),
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_cluster_name (cluster_name),
    INDEX idx_status (status)
);

-- VMs table
CREATE TABLE IF NOT EXISTS vms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    status ENUM('running', 'stopped', 'starting', 'stopping', 'error', 'provisioning') DEFAULT 'provisioning',
    cpu_cores INT NOT NULL,
    memory_gb INT NOT NULL,
    storage_gb INT NOT NULL,
    os_image ENUM('centos7', 'rhel7', 'rhel8', 'rhel9', 'rockylinux9', 'ubuntu20', 'ubuntu22', 'ubuntu24', 'oel8.10') NOT NULL,
    mount_points JSON DEFAULT (JSON_ARRAY()),
    ssh_key TEXT NOT NULL,
    default_user VARCHAR(50) DEFAULT 'acceldata',
    provisioned_at DATETIME,
    last_health_check DATETIME,
    health_status ENUM('healthy', 'warning', 'critical') DEFAULT 'healthy',
    server_id INT,
    pool_id INT,
    created_by INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hostname (hostname),
    INDEX idx_ip_address (ip_address),
    INDEX idx_status (status),
    INDEX idx_server_id (server_id),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL,
    FOREIGN KEY (pool_id) REFERENCES vm_pools(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- K8s Nodes table
CREATE TABLE IF NOT EXISTS k8s_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    node_name VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('master', 'worker') NOT NULL,
    status ENUM('ready', 'notready', 'unknown', 'provisioning', 'error') DEFAULT 'provisioning',
    kubelet_version VARCHAR(50),
    container_runtime VARCHAR(50) DEFAULT 'containerd',
    os_image VARCHAR(100),
    kernel_version VARCHAR(100),
    architecture VARCHAR(20) DEFAULT 'amd64',
    cpu_capacity INT COMMENT 'CPU capacity in millicores',
    memory_capacity VARCHAR(20) COMMENT 'Memory capacity in bytes',
    storage_capacity VARCHAR(20) COMMENT 'Storage capacity in bytes',
    cpu_allocatable INT COMMENT 'Allocatable CPU in millicores',
    memory_allocatable VARCHAR(20) COMMENT 'Allocatable memory in bytes',
    storage_allocatable VARCHAR(20) COMMENT 'Allocatable storage in bytes',
    labels JSON DEFAULT (JSON_OBJECT()),
    taints JSON DEFAULT (JSON_ARRAY()),
    conditions JSON DEFAULT (JSON_ARRAY()),
    joined_at DATETIME,
    last_heartbeat DATETIME,
    server_id INT,
    pool_id INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_node_name (node_name),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_server_id (server_id),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE SET NULL
);

-- Namespaces table
CREATE TABLE IF NOT EXISTS namespaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    cpu_limit INT COMMENT 'CPU limit in millicores',
    memory_limit INT COMMENT 'Memory limit in MB',
    storage_limit INT COMMENT 'Storage limit in GB',
    cpu_request INT COMMENT 'CPU request in millicores',
    memory_request INT COMMENT 'Memory request in MB',
    storage_request INT COMMENT 'Storage request in GB',
    pod_limit INT COMMENT 'Maximum number of pods',
    current_pods INT DEFAULT 0,
    current_cpu_usage INT DEFAULT 0 COMMENT 'Current CPU usage in millicores',
    current_memory_usage INT DEFAULT 0 COMMENT 'Current memory usage in MB',
    current_storage_usage INT DEFAULT 0 COMMENT 'Current storage usage in GB',
    labels JSON DEFAULT (JSON_OBJECT()),
    annotations JSON DEFAULT (JSON_OBJECT()),
    user_id INT,
    pool_id INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name_pool (name, pool_id),
    INDEX idx_user_id (user_id),
    INDEX idx_pool_id (pool_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE CASCADE
);

-- Resource Quotas table
CREATE TABLE IF NOT EXISTS resource_quotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cpu_limit INT COMMENT 'CPU limit in millicores',
    memory_limit INT COMMENT 'Memory limit in MB',
    storage_limit INT COMMENT 'Storage limit in GB',
    cpu_request INT COMMENT 'CPU request in millicores',
    memory_request INT COMMENT 'Memory request in MB',
    storage_request INT COMMENT 'Storage request in GB',
    pod_limit INT COMMENT 'Maximum number of pods',
    service_limit INT COMMENT 'Maximum number of services',
    pvc_limit INT COMMENT 'Maximum number of persistent volume claims',
    config_map_limit INT COMMENT 'Maximum number of config maps',
    secret_limit INT COMMENT 'Maximum number of secrets',
    ingress_limit INT COMMENT 'Maximum number of ingresses',
    status ENUM('active', 'inactive') DEFAULT 'active',
    namespace_id INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name_namespace (name, namespace_id),
    INDEX idx_namespace_id (namespace_id),
    INDEX idx_status (status),
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- Monitoring Data table
CREATE TABLE IF NOT EXISTS monitoring_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_type ENUM('server', 'vm', 'k8s_node') NOT NULL,
    resource_id INT NOT NULL,
    cpu_usage DECIMAL(5,2) COMMENT 'CPU usage percentage',
    memory_usage DECIMAL(5,2) COMMENT 'Memory usage percentage',
    storage_usage DECIMAL(5,2) COMMENT 'Storage usage percentage',
    network_in_bytes BIGINT COMMENT 'Network input in bytes',
    network_out_bytes BIGINT COMMENT 'Network output in bytes',
    disk_read_ops BIGINT COMMENT 'Disk read operations',
    disk_write_ops BIGINT COMMENT 'Disk write operations',
    disk_read_bytes BIGINT COMMENT 'Disk read bytes',
    disk_write_bytes BIGINT COMMENT 'Disk write bytes',
    load_average_1m DECIMAL(5,2) COMMENT '1-minute load average',
    load_average_5m DECIMAL(5,2) COMMENT '5-minute load average',
    load_average_15m DECIMAL(5,2) COMMENT '15-minute load average',
    temperature DECIMAL(5,2) COMMENT 'CPU temperature in Celsius',
    uptime BIGINT COMMENT 'System uptime in seconds',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    server_id INT,
    vm_id INT,
    k8s_node_id INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    INDEX idx_resource_type_id (resource_type, resource_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_resource_timestamp (resource_type, resource_id, timestamp),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (vm_id) REFERENCES vms(id) ON DELETE CASCADE,
    FOREIGN KEY (k8s_node_id) REFERENCES k8s_nodes(id) ON DELETE CASCADE
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_type ENUM('server', 'vm', 'k8s_node', 'namespace') NOT NULL,
    resource_id INT NOT NULL,
    metric ENUM('cpu', 'memory', 'storage', 'network', 'disk_io', 'temperature', 'load') NOT NULL,
    threshold DECIMAL(5,2) NOT NULL COMMENT 'Threshold value for the metric',
    operator ENUM('>', '<', '>=', '<=', '==', '!=') NOT NULL DEFAULT '>',
    duration INT NOT NULL DEFAULT 300 COMMENT 'Duration in seconds before alert triggers',
    severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'warning',
    status ENUM('active', 'inactive', 'firing', 'resolved') DEFAULT 'active',
    last_fired DATETIME,
    last_resolved DATETIME,
    fire_count INT DEFAULT 0,
    labels JSON DEFAULT (JSON_OBJECT()),
    annotations JSON DEFAULT (JSON_OBJECT()),
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_resource_type_id (resource_type, resource_id),
    INDEX idx_status (status),
    INDEX idx_severity (severity),
    INDEX idx_metric (metric)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('slack', 'email', 'webhook') NOT NULL,
    channel VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'retrying') DEFAULT 'pending',
    sent_at DATETIME,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    next_retry_at DATETIME,
    error_message TEXT,
    alert_id INT,
    metadata JSON DEFAULT (JSON_OBJECT()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_sent_at (sent_at),
    INDEX idx_alert_id (alert_id),
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Junction tables for many-to-many relationships

-- Server VM Pool relationship
CREATE TABLE IF NOT EXISTS server_vm_pool (
    server_id INT NOT NULL,
    pool_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, pool_id),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES vm_pools(id) ON DELETE CASCADE
);

-- Server K8s Pool relationship
CREATE TABLE IF NOT EXISTS server_k8s_pool (
    server_id INT NOT NULL,
    pool_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, pool_id),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT IGNORE INTO users (username, email, password, role, first_name, last_name) 
VALUES ('admin', 'admin@dc.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin', 'User');

-- Insert default VM pool
INSERT IGNORE INTO vm_pools (name, description, status) 
VALUES ('default-vm-pool', 'Default VM pool for general use', 'active');

-- Insert default K8s pool
INSERT IGNORE INTO k8s_pools (name, description, cluster_name, status) 
VALUES ('default-k8s-pool', 'Default Kubernetes pool', 'dc-cluster', 'provisioning');