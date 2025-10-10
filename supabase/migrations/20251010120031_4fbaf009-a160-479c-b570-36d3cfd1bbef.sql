-- Add slug, custom_domain and email_settings columns to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE,
ADD COLUMN IF NOT EXISTS email_settings jsonb DEFAULT '{}'::jsonb;

-- Create index for better performance on slug lookups
CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON barbershops(slug);
CREATE INDEX IF NOT EXISTS idx_barbershops_custom_domain ON barbershops(custom_domain);

-- Update existing barbershops with a default slug based on their name
UPDATE barbershops 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Make slug NOT NULL after setting defaults
ALTER TABLE barbershops 
ALTER COLUMN slug SET NOT NULL,
ALTER COLUMN slug SET DEFAULT '';