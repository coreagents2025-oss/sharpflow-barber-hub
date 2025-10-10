-- Copiar dados de profiles.full_name para barbers.name onde name está NULL
-- Isso padroniza os dados dos barbeiros para usar barbers.name como fonte única
UPDATE barbers b
SET name = p.full_name
FROM profiles p
WHERE b.user_id = p.id 
  AND b.name IS NULL
  AND p.full_name IS NOT NULL;