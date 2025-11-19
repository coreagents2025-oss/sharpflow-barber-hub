-- ========================================
-- FASE 2: Sistema de Tags para Leads
-- ========================================

-- Criar tabela de tags para leads
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (length(tag) <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(lead_id, tag)
);

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON public.lead_tags(tag);

-- Habilitar RLS
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_tags
CREATE POLICY "Staff can view tags from their barbershop leads"
ON public.lead_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
    WHERE l.id = lead_tags.lead_id
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can create tags for their barbershop leads"
ON public.lead_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
    WHERE l.id = lead_tags.lead_id
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can delete tags from their barbershop leads"
ON public.lead_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
    WHERE l.id = lead_tags.lead_id
    AND bs.user_id = auth.uid()
  )
);

-- ========================================
-- FASE 3: Sistema de Arquivamento de Leads
-- ========================================

-- Adicionar coluna archived_at para soft delete
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Índice para melhorar performance de filtros
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON public.leads(archived_at) WHERE archived_at IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.leads.archived_at IS 'Timestamp quando o lead foi arquivado (soft delete)';
COMMENT ON TABLE public.lead_tags IS 'Tags personalizadas para organização de leads';