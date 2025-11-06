-- Adicionar colunas de redes sociais à tabela barbershops
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.barbershops.facebook_url IS 'URL completa do perfil do Facebook (ex: https://facebook.com/minhabarbearia)';
COMMENT ON COLUMN public.barbershops.instagram_url IS 'URL completa do perfil do Instagram (ex: https://instagram.com/minhabarbearia)';