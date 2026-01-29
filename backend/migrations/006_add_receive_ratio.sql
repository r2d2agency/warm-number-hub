-- Add receive_ratio field to warming_config table
-- This configures the ratio of received vs sent messages for the primary instance
-- Default is 2.0 (receives 2x more than sends)

ALTER TABLE warming_config ADD COLUMN IF NOT EXISTS receive_ratio DECIMAL(3,1) DEFAULT 2.0;
