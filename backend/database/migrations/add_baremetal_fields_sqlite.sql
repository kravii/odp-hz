-- SQLite migration to add baremetal server fields
-- Add pool assignment and monitoring fields to servers table

-- Add new columns to servers table
ALTER TABLE servers ADD COLUMN pool_type TEXT DEFAULT 'none' CHECK (pool_type IN ('vm', 'k8s', 'none'));
ALTER TABLE servers ADD COLUMN pool_id INTEGER DEFAULT NULL;
ALTER TABLE servers ADD COLUMN monitoring_enabled INTEGER DEFAULT 0 CHECK (monitoring_enabled IN (0, 1));
ALTER TABLE servers ADD COLUMN packages_installed TEXT DEFAULT '[]';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_pool_type ON servers(pool_type);
CREATE INDEX IF NOT EXISTS idx_servers_pool_id ON servers(pool_id);
CREATE INDEX IF NOT EXISTS idx_servers_monitoring_enabled ON servers(monitoring_enabled);