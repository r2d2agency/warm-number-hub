-- Migration: Add branding configuration table
-- Run this migration on your database

CREATE TABLE IF NOT EXISTS branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  app_name VARCHAR(100) DEFAULT 'WhatsApp Warmer',
  app_subtitle VARCHAR(200) DEFAULT 'Sistema de Aquecimento',
  primary_color VARCHAR(20) DEFAULT '#22c55e',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default branding if not exists
INSERT INTO branding (logo_url, app_name, app_subtitle, primary_color)
SELECT NULL, 'WhatsApp Warmer', 'Sistema de Aquecimento', '#22c55e'
WHERE NOT EXISTS (SELECT 1 FROM branding LIMIT 1);
