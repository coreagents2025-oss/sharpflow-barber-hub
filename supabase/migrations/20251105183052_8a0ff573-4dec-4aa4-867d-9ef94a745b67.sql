-- Criar tabela para rastrear campanhas de email
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem criar campanhas
CREATE POLICY "Admins can create email campaigns"
ON public.email_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

-- Admins e barbeiros podem visualizar campanhas
CREATE POLICY "Staff can view email campaigns"
ON public.email_campaigns
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Criar índice para melhor performance
CREATE INDEX idx_email_campaigns_barbershop ON public.email_campaigns(barbershop_id);
CREATE INDEX idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);