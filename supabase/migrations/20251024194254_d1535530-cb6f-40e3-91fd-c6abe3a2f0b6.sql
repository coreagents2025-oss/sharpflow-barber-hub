-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('service-images', 'service-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('barbershop-logos', 'barbershop-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('barbershop-heroes', 'barbershop-heroes', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('barber-photos', 'barber-photos', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for service-images bucket
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated users can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' 
  AND auth.role() = 'authenticated'
);

-- RLS Policies for barbershop-logos bucket
CREATE POLICY "Anyone can view barbershop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-logos');

CREATE POLICY "Authenticated users can upload barbershop logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update barbershop logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete barbershop logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-logos' 
  AND auth.role() = 'authenticated'
);

-- RLS Policies for barbershop-heroes bucket
CREATE POLICY "Anyone can view barbershop hero images"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-heroes');

CREATE POLICY "Authenticated users can upload barbershop hero images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-heroes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update barbershop hero images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-heroes' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete barbershop hero images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-heroes' 
  AND auth.role() = 'authenticated'
);

-- RLS Policies for barber-photos bucket
CREATE POLICY "Anyone can view barber photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'barber-photos');

CREATE POLICY "Authenticated users can upload barber photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barber-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update barber photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barber-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete barber photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barber-photos' 
  AND auth.role() = 'authenticated'
);