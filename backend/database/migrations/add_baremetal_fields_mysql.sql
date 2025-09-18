-- MySQL migration to add baremetal server fields
-- Add pool assignment and monitoring fields to servers table

-- Add new columns to servers table
ALTER TABLE servers 
ADD COLUMN pool_type ENUM('vm', 'k8s', 'none') DEFAULT 'none' COMMENT 'Type of pool this server belongs to',
ADD COLUMN pool_id INT NULL COMMENT 'ID of the pool this server belongs to',
ADD COLUMN monitoring_enabled BOOLEAN DEFAULT FALSE COMMENT 'Whether monitoring is enabled on this server',
ADD COLUMN packages_installed JSON DEFAULT (JSON_ARRAY()) COMMENT 'List of packages installed on this server';

-- Add indexes for better performance
CREATE INDEX idx_servers_pool_type ON servers(pool_type);
CREATE INDEX idx_servers_pool_id ON servers(pool_id);
CREATE INDEX idx_servers_monitoring_enabled ON servers(monitoring_enabled);

-- Add foreign key constraints (optional - can be enabled later)
-- ALTER TABLE servers ADD CONSTRAINT fk_servers_vm_pool FOREIGN KEY (pool_id) REFERENCES vm_pools(id) ON DELETE SET NULL;
-- ALTER TABLE servers ADD CONSTRAINT fk_servers_k8s_pool FOREIGN KEY (pool_id) REFERENCES k8s_pools(id) ON DELETE SET NULL;