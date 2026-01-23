-- Add is_primary field to instances table
-- This marks one instance as the "warming number" that sends and receives messages

ALTER TABLE instances ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Ensure only one primary instance per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_user_primary 
ON instances (user_id) 
WHERE is_primary = TRUE;

-- Add warming stats to instances
ALTER TABLE instances ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;
ALTER TABLE instances ADD COLUMN IF NOT EXISTS messages_received INTEGER DEFAULT 0;
ALTER TABLE instances ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;
