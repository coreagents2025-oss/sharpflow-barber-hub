-- Adicionar constraint UNIQUE no custom_domain (apenas valores não nulos)
CREATE UNIQUE INDEX IF NOT EXISTS barbershops_custom_domain_unique 
ON barbershops(custom_domain) 
WHERE custom_domain IS NOT NULL;