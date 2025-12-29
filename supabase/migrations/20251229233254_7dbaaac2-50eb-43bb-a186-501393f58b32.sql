-- Fase 1: Adicionar colunas de plano de assinatura na tabela services
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_subscription_plan BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS credits_per_month INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS subscription_duration_days INTEGER DEFAULT 30;

-- Fase 2: Adaptar client_subscriptions para suportar leads
ALTER TABLE client_subscriptions ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);

-- Adicionar constraint para garantir que tenha client_id OU lead_id
ALTER TABLE client_subscriptions DROP CONSTRAINT IF EXISTS subscription_has_client;
ALTER TABLE client_subscriptions ADD CONSTRAINT subscription_has_client 
  CHECK (client_id IS NOT NULL OR lead_id IS NOT NULL);

-- Fase 3: Criar tabela de uso de créditos
CREATE TABLE IF NOT EXISTS subscription_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- Habilitar RLS na nova tabela
ALTER TABLE subscription_credit_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscription_credit_usage
CREATE POLICY "Staff can view credit usage for their barbershop"
ON subscription_credit_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_subscriptions cs
    JOIN barbershop_staff bs ON cs.barbershop_id = bs.barbershop_id
    WHERE cs.id = subscription_credit_usage.subscription_id
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can create credit usage for their barbershop"
ON subscription_credit_usage FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_subscriptions cs
    JOIN barbershop_staff bs ON cs.barbershop_id = bs.barbershop_id
    WHERE cs.id = subscription_credit_usage.subscription_id
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can delete credit usage for their barbershop"
ON subscription_credit_usage FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM client_subscriptions cs
    JOIN barbershop_staff bs ON cs.barbershop_id = bs.barbershop_id
    WHERE cs.id = subscription_credit_usage.subscription_id
    AND bs.user_id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_services_subscription_plan ON services(is_subscription_plan) WHERE is_subscription_plan = true;
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_lead_id ON client_subscriptions(lead_id);
CREATE INDEX IF NOT EXISTS idx_subscription_credit_usage_subscription_id ON subscription_credit_usage(subscription_id);