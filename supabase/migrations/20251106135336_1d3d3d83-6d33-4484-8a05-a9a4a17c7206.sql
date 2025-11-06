-- ============================================
-- FASE 1: Criar tabela leads com RLS
-- ============================================

-- Criar tabela leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT DEFAULT 'public_booking',
  status TEXT DEFAULT 'new',
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id, phone)
);

-- Índices para performance
CREATE INDEX idx_leads_barbershop ON public.leads(barbershop_id);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_status ON public.leads(barbershop_id, status);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Público pode criar leads
CREATE POLICY "Public can create leads"
ON public.leads FOR INSERT WITH CHECK (true);

-- Policy: Público pode buscar leads por telefone (necessário para evitar duplicatas)
CREATE POLICY "Public can search leads by phone"
ON public.leads FOR SELECT USING (true);

-- Policy: Staff pode visualizar leads da própria barbearia
CREATE POLICY "Staff can view own barbershop leads"
ON public.leads FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Policy: Staff pode atualizar leads da própria barbearia
CREATE POLICY "Staff can update own barbershop leads"
ON public.leads FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.leads IS 'Leads de clientes que agendam via booking público (não autenticados)';

-- ============================================
-- FASE 2: Modificar tabela appointments
-- ============================================

-- Adicionar coluna lead_id
ALTER TABLE public.appointments 
ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Tornar client_id opcional
ALTER TABLE public.appointments 
ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar constraint: um ou outro, não ambos
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_client_or_lead_check
CHECK (
  (client_id IS NOT NULL AND lead_id IS NULL) 
  OR 
  (client_id IS NULL AND lead_id IS NOT NULL)
);

-- Índice para lead_id
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);

COMMENT ON COLUMN public.appointments.lead_id IS 'Lead que agendou (booking público). Mutuamente exclusivo com client_id';
COMMENT ON COLUMN public.appointments.client_id IS 'Cliente autenticado. Mutuamente exclusivo com lead_id';

-- ============================================
-- FASE 3: Atualizar RLS de appointments
-- ============================================

-- Remover política antiga de criação pública
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;

-- Nova política: Público pode criar appointments com lead_id
CREATE POLICY "Public can create appointments with lead"
ON public.appointments
FOR INSERT
WITH CHECK (
  -- Pode criar se fornecer lead_id válido
  (lead_id IS NOT NULL AND client_id IS NULL)
  OR
  -- OU se for cliente autenticado
  (client_id IS NOT NULL AND auth.uid() = client_id AND lead_id IS NULL)
);

-- ============================================
-- FASE 4: Criar view unificada
-- ============================================

CREATE OR REPLACE VIEW public.appointments_with_client AS
SELECT 
  a.id,
  a.barbershop_id,
  a.service_id,
  a.barber_id,
  a.scheduled_at,
  a.status,
  a.notes,
  a.created_at,
  a.updated_at,
  a.lead_id,
  a.client_id,
  -- Dados unificados do cliente
  COALESCE(l.id, p.id) as unified_client_id,
  COALESCE(l.full_name, p.full_name) as client_name,
  COALESCE(l.phone, p.phone) as client_phone,
  COALESCE(l.email, '') as client_email,
  CASE 
    WHEN a.lead_id IS NOT NULL THEN 'lead'
    WHEN a.client_id IS NOT NULL THEN 'client'
  END as client_type,
  l.status as lead_status,
  l.source as lead_source
FROM appointments a
LEFT JOIN leads l ON a.lead_id = l.id
LEFT JOIN profiles p ON a.client_id = p.id;

GRANT SELECT ON public.appointments_with_client TO authenticated, anon;

COMMENT ON VIEW public.appointments_with_client IS 'View unificada de appointments com dados do cliente (lead ou profile)';