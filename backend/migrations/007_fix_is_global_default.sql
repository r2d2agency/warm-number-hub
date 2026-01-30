-- Ensure is_global has a proper default and update existing NULL values
ALTER TABLE instances ALTER COLUMN is_global SET DEFAULT FALSE;

-- Update any NULL values to FALSE
UPDATE instances SET is_global = FALSE WHERE is_global IS NULL;

-- Ensure is_primary also has proper default
ALTER TABLE instances ALTER COLUMN is_primary SET DEFAULT FALSE;
UPDATE instances SET is_primary = FALSE WHERE is_primary IS NULL;
