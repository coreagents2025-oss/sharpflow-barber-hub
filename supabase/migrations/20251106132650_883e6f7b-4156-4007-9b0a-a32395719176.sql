-- ============================================
-- FASE 3: VULNERABILIDADES ADICIONAIS
-- ============================================

-- 3.1 - PROTEGER barbershop_credentials
-- Adicionar colunas para armazenar apenas identificadores (não tokens)
ALTER TABLE public.barbershop_credentials
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
ADD COLUMN IF NOT EXISTS email_sender TEXT;

COMMENT ON COLUMN barbershop_credentials.whatsapp_phone IS 'Número de WhatsApp (não armazena token - use Supabase Secrets)';
COMMENT ON COLUMN barbershop_credentials.email_sender IS 'Email remetente (não armazena token - use Supabase Secrets)';
COMMENT ON COLUMN barbershop_credentials.whatsapp_credentials IS 'DEPRECATED: Use Supabase Secrets para armazenar tokens';
COMMENT ON COLUMN barbershop_credentials.email_credentials IS 'DEPRECATED: Use Supabase Secrets para armazenar tokens';

-- 3.2 - ADICIONAR POLÍTICAS FALTANTES EM email_campaigns

-- Permitir admins atualizarem campanhas
CREATE POLICY "Admins can update email campaigns"
ON public.email_campaigns
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (
    SELECT barbershop_id FROM get_user_barbershops(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND barbershop_id IN (
    SELECT barbershop_id FROM get_user_barbershops(auth.uid())
  )
);

-- Permitir admins deletarem campanhas
CREATE POLICY "Admins can delete email campaigns"
ON public.email_campaigns
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND barbershop_id IN (
    SELECT barbershop_id FROM get_user_barbershops(auth.uid())
  )
);

COMMENT ON POLICY "Admins can update email campaigns" ON email_campaigns IS 'Apenas admins podem editar campanhas da própria barbearia';
COMMENT ON POLICY "Admins can delete email campaigns" ON email_campaigns IS 'Apenas admins podem deletar campanhas da própria barbearia';