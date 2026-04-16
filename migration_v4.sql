-- Migration v4: Fix product editing and storage
-- Add missing columns for product bundles and active status
ALTER TABLE bot_products 
ADD COLUMN IF NOT EXISTS bundle_config JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure the products table has the correct schema for the dashboard
ALTER TABLE bot_products 
ALTER COLUMN is_active SET DEFAULT true;

-- Migration for Moderator support
ALTER TABLE bot_users ADD COLUMN IF NOT EXISTS is_moderateur BOOLEAN DEFAULT false;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS list_moderators TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
