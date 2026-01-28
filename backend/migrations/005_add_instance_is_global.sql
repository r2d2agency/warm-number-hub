-- Add is_global column to instances for global/shared connections
ALTER TABLE instances ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Add owner_user_id to track original owner (for global instances)
-- This helps identify who created the global instance
CREATE INDEX IF NOT EXISTS idx_instances_is_global ON instances(is_global);

-- Comment for documentation
COMMENT ON COLUMN instances.is_global IS 'When true, this instance is visible to all users';
