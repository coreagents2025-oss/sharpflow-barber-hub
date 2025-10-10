-- Create catalog_settings table for admin customization
CREATE TABLE public.catalog_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  theme_color text DEFAULT '#8B4513',
  logo_url text,
  hero_image_url text,
  services_order jsonb DEFAULT '[]'::jsonb,
  show_popular_badge boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id)
);

-- Enable RLS
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage catalog settings
CREATE POLICY "Admins can manage catalog settings"
ON public.catalog_settings
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Anyone can view catalog settings
CREATE POLICY "Anyone can view catalog settings"
ON public.catalog_settings
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_catalog_settings_updated_at
BEFORE UPDATE ON public.catalog_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();