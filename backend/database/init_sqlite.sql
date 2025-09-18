-- SQLite Database Schema for DC Management System
-- This script initializes the database with all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login DATETIME,
    ssh_public_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
    total_cpu INTEGER NOT NULL,
    total_memory INTEGER NOT NULL,
    total_storage INTEGER NOT NULL,
    allocated_cpu INTEGER DEFAULT 0,
    allocated_memory INTEGER DEFAULT 0,
    allocated_storage INTEGER DEFAULT 0,
    os_version VARCHAR(50) DEFAULT 'Rocky Linux 9',
    ssh_port INTEGER DEFAULT 22,
    ssh_user VARCHAR(50) DEFAULT 'root',
    last_health_check DATETIME,
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'critical')),
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VM Pools table
CREATE TABLE IF NOT EXISTS vm_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    total_cpu INTEGER DEFAULT 0,
    total_memory INTEGER DEFAULT 0,
    total_storage INTEGER DEFAULT 0,
    allocated_cpu INTEGER DEFAULT 0,
    allocated_memory INTEGER DEFAULT 0,
    allocated_storage INTEGER DEFAULT 0,
    max_vms INTEGER DEFAULT 300,
    current_vms INTEGER DEFAULT 0,
    ip_range_start VARCHAR(45) DEFAULT '10.0.1.1',
    ip_range_end VARCHAR(45) DEFAULT '10.0.1.254',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- K8s Pools table
CREATE TABLE IF NOT EXISTS k8s_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cluster_name VARCHAR(100) NOT NULL UNIQUE,
    kubernetes_version VARCHAR(20) DEFAULT '1.28.0',
    total_cpu INTEGER DEFAULT 0,
    total_memory INTEGER DEFAULT 0,
    total_storage INTEGER DEFAULT 0,
    allocated_cpu INTEGER DEFAULT 0,
    allocated_memory INTEGER DEFAULT 0,
    allocated_storage INTEGER DEFAULT 0,
    master_nodes INTEGER DEFAULT 3,
    worker_nodes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'inactive', 'maintenance', 'error')),
    api_server_endpoint VARCHAR(255),
    kubeconfig TEXT,
    rancher_cluster_id VARCHAR(100),
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VMs table
CREATE TABLE IF NOT EXISTS vms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    status TEXT DEFAULT 'provisioning' CHECK (status IN ('running', 'stopped', 'starting', 'stopping', 'error', 'provisioning')),
    cpu_cores INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    os_image TEXT NOT NULL CHECK (os_image IN ('centos7', 'rhel7', 'rhel8', 'rhel9', 'rockylinux9', 'ubuntu20', 'ubuntu22', 'ubuntu24', 'oel8.10')),
    mount_points TEXT DEFAULT '[]',
    ssh_key TEXT NOT NULL,
    default_user VARCHAR(50) DEFAULT 'acceldata',
    provisioned_at DATETIME,
    last_health_check DATETIME,
    health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'critical')),
    server_id INTEGER,
    pool_id INTEGER,
    created_by INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL,
    FOREIGN KEY (pool_id) REFERENCES vm_pools(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- K8s Nodes table
CREATE TABLE IF NOT EXISTS k8s_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_name VARCHAR(100) NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('master', 'worker')),
    status TEXT DEFAULT 'provisioning' CHECK (status IN ('ready', 'notready', 'unknown', 'provisioning', 'error')),
    kubelet_version VARCHAR(50),
    container_runtime VARCHAR(50) DEFAULT 'containerd',
    os_image VARCHAR(100),
    kernel_version VARCHAR(100),
    architecture VARCHAR(20) DEFAULT 'amd64',
    cpu_capacity INTEGER,
    memory_capacity VARCHAR(20),
    storage_capacity VARCHAR(20),
    cpu_allocatable INTEGER,
    memory_allocatable VARCHAR(20),
    storage_allocatable VARCHAR(20),
    labels TEXT DEFAULT '{}',
    taints TEXT DEFAULT '[]',
    conditions TEXT DEFAULT '[]',
    joined_at DATETIME,
    last_heartbeat DATETIME,
    server_id INTEGER,
    pool_id INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE SET NULL
);

-- Namespaces table
CREATE TABLE IF NOT EXISTS namespaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    cpu_limit INTEGER,
    memory_limit INTEGER,
    storage_limit INTEGER,
    cpu_request INTEGER,
    memory_request INTEGER,
    storage_request INTEGER,
    pod_limit INTEGER,
    current_pods INTEGER DEFAULT 0,
    current_cpu_usage INTEGER DEFAULT 0,
    current_memory_usage INTEGER DEFAULT 0,
    current_storage_usage INTEGER DEFAULT 0,
    labels TEXT DEFAULT '{}',
    annotations TEXT DEFAULT '{}',
    user_id INTEGER,
    pool_id INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE CASCADE
);

-- Resource Quotas table
CREATE TABLE IF NOT EXISTS resource_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    cpu_limit INTEGER,
    memory_limit INTEGER,
    storage_limit INTEGER,
    cpu_request INTEGER,
    memory_request INTEGER,
    storage_request INTEGER,
    pod_limit INTEGER,
    service_limit INTEGER,
    pvc_limit INTEGER,
    config_map_limit INTEGER,
    secret_limit INTEGER,
    ingress_limit INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    namespace_id INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (namespace_id) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- Monitoring Data table
CREATE TABLE IF NOT EXISTS monitoring_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('server', 'vm', 'k8s_node')),
    resource_id INTEGER NOT NULL,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    storage_usage DECIMAL(5,2),
    network_in_bytes INTEGER,
    network_out_bytes INTEGER,
    disk_read_ops INTEGER,
    disk_write_ops INTEGER,
    disk_read_bytes INTEGER,
    disk_write_bytes INTEGER,
    load_average_1m DECIMAL(5,2),
    load_average_5m DECIMAL(5,2),
    load_average_15m DECIMAL(5,2),
    temperature DECIMAL(5,2),
    uptime INTEGER,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    server_id INTEGER,
    vm_id INTEGER,
    k8s_node_id INTEGER,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (vm_id) REFERENCES vms(id) ON DELETE CASCADE,
    FOREIGN KEY (k8s_node_id) REFERENCES k8s_nodes(id) ON DELETE CASCADE
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('server', 'vm', 'k8s_node', 'namespace')),
    resource_id INTEGER NOT NULL,
    metric TEXT NOT NULL CHECK (metric IN ('cpu', 'memory', 'storage', 'network', 'disk_io', 'temperature', 'load')),
    threshold DECIMAL(5,2) NOT NULL,
    operator TEXT NOT NULL DEFAULT '>' CHECK (operator IN ('>', '<', '>=', '<=', '==', '!=')),
    duration INTEGER NOT NULL DEFAULT 300,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'firing', 'resolved')),
    last_fired DATETIME,
    last_resolved DATETIME,
    fire_count INTEGER DEFAULT 0,
    labels TEXT DEFAULT '{}',
    annotations TEXT DEFAULT '{}',
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('slack', 'email', 'webhook')),
    channel VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
    sent_at DATETIME,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at DATETIME,
    error_message TEXT,
    alert_id INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Junction tables for many-to-many relationships

-- Server VM Pool relationship
CREATE TABLE IF NOT EXISTS server_vm_pool (
    server_id INTEGER NOT NULL,
    pool_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, pool_id),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES vm_pools(id) ON DELETE CASCADE
);

-- Server K8s Pool relationship
CREATE TABLE IF NOT EXISTS server_k8s_pool (
    server_id INTEGER NOT NULL,
    pool_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, pool_id),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_servers_hostname ON servers(hostname);
CREATE INDEX IF NOT EXISTS idx_servers_ip_address ON servers(ip_address);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_health_status ON servers(health_status);
CREATE INDEX IF NOT EXISTS idx_vm_pools_name ON vm_pools(name);
CREATE INDEX IF NOT EXISTS idx_vm_pools_status ON vm_pools(status);
CREATE INDEX IF NOT EXISTS idx_k8s_pools_name ON k8s_pools(name);
CREATE INDEX IF NOT EXISTS idx_k8s_pools_cluster_name ON k8s_pools(cluster_name);
CREATE INDEX IF NOT EXISTS idx_k8s_pools_status ON k8s_pools(status);
CREATE INDEX IF NOT EXISTS idx_vms_hostname ON vms(hostname);
CREATE INDEX IF NOT EXISTS idx_vms_ip_address ON vms(ip_address);
CREATE INDEX IF NOT EXISTS idx_vms_status ON vms(status);
CREATE INDEX IF NOT EXISTS idx_vms_server_id ON vms(server_id);
CREATE INDEX IF NOT EXISTS idx_vms_created_by ON vms(created_by);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_node_name ON k8s_nodes(node_name);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_role ON k8s_nodes(role);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_status ON k8s_nodes(status);
CREATE INDEX IF NOT EXISTS idx_k8s_nodes_server_id ON k8s_nodes(server_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_name_pool ON namespaces(name, pool_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_user_id ON namespaces(user_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_pool_id ON namespaces(pool_id);
CREATE INDEX IF NOT EXISTS idx_namespaces_status ON namespaces(status);
CREATE INDEX IF NOT EXISTS idx_resource_quotas_name_namespace ON resource_quotas(name, namespace_id);
CREATE INDEX IF NOT EXISTS idx_resource_quotas_namespace_id ON resource_quotas(namespace_id);
CREATE INDEX IF NOT EXISTS idx_resource_quotas_status ON resource_quotas(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_data_resource_type_id ON monitoring_data(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_data_timestamp ON monitoring_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_data_resource_timestamp ON monitoring_data(resource_type, resource_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_resource_type_id ON alerts(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_metric ON alerts(metric);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON notifications(alert_id);

-- Insert default data
INSERT OR IGNORE INTO users (username, email, password, role, first_name, last_name) 
VALUES ('admin', 'admin@dc.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Admin', 'User');

INSERT OR IGNORE INTO vm_pools (name, description, status) 
VALUES ('default-vm-pool', 'Default VM pool for general use', 'active');

INSERT OR IGNORE INTO k8s_pools (name, description, cluster_name, status) 
VALUES ('default-k8s-pool', 'Default Kubernetes pool', 'dc-cluster', 'provisioning');