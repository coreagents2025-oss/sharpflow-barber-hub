-- Enable public booking without authentication

-- 1. Policy para permitir INSERT público de leads em profiles
CREATE POLICY "Public booking can create client profiles"
ON profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Policy para permitir UPDATE público de telefone em profiles  
CREATE POLICY "Public booking can update client phone"
ON profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. Policy para permitir INSERT público de appointments
CREATE POLICY "Public can create appointments"
ON appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Policy para permitir SELECT público de appointments (para validar overlaps)
CREATE POLICY "Public can view appointments for booking validation"
ON appointments
FOR SELECT
TO anon, authenticated
USING (true);