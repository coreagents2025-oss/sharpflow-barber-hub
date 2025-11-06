-- FASE 1: Ajustar tabela payments para suportar leads

-- Tornar client_id nullable
ALTER TABLE public.payments 
ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar coluna lead_id
ALTER TABLE public.payments 
ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Adicionar constraint: client_id XOR lead_id
ALTER TABLE public.payments
ADD CONSTRAINT payments_client_or_lead_check
CHECK (
  (client_id IS NOT NULL AND lead_id IS NULL) 
  OR 
  (client_id IS NULL AND lead_id IS NOT NULL)
);

-- Criar índice para lead_id
CREATE INDEX idx_payments_lead ON public.payments(lead_id);

COMMENT ON COLUMN public.payments.lead_id IS 'Lead associado ao pagamento (mutualmente exclusivo com client_id)';