
-- FIX 1: Profiles - Remove public INSERT policy
DROP POLICY IF EXISTS "Public can create own profile for booking" ON profiles;

-- FIX 2: Leads - Remove public SELECT policy (PII exposure)
DROP POLICY IF EXISTS "Public can search leads by phone" ON leads;

-- FIX 3: Storage - Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete barbershop logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload barbershop hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update barbershop hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete barbershop hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update barber photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete barber photos" ON storage.objects;

-- Create scoped storage policies: only barbershop staff can manage files
CREATE POLICY "Staff can manage service images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'service-images'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'service-images'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage barbershop logos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'barbershop-logos'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'barbershop-logos'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage barbershop heroes"
ON storage.objects FOR ALL
USING (
  bucket_id = 'barbershop-heroes'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'barbershop-heroes'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
);

CREATE POLICY "Staff can manage barber photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'barber-photos'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'barber-photos'
  AND EXISTS (SELECT 1 FROM public.barbershop_staff WHERE user_id = auth.uid())
);

-- FIX 4: Create RPC for public booking lead find-or-create
CREATE OR REPLACE FUNCTION public.find_or_create_lead(
  _barbershop_id uuid,
  _phone text,
  _full_name text,
  _email text DEFAULT NULL,
  _source text DEFAULT 'public_booking'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id uuid;
BEGIN
  IF _barbershop_id IS NULL OR _phone IS NULL OR _full_name IS NULL THEN
    RAISE EXCEPTION 'barbershop_id, phone, and full_name are required';
  END IF;
  _phone := regexp_replace(_phone, '[^0-9+() -]', '', 'g');
  IF length(_phone) < 8 OR length(_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF length(_full_name) > 200 THEN
    RAISE EXCEPTION 'Name too long';
  END IF;
  SELECT id INTO lead_id
  FROM leads
  WHERE barbershop_id = _barbershop_id AND phone = _phone
  LIMIT 1;
  IF lead_id IS NULL THEN
    INSERT INTO leads (barbershop_id, phone, full_name, email, source)
    VALUES (_barbershop_id, _phone, _full_name, _email, _source)
    RETURNING id INTO lead_id;
  END IF;
  RETURN lead_id;
END;
$$;
