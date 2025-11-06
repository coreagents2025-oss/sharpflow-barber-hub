-- Criar tabelas para sistema de webhooks e integrações com N8n

-- Tabela de webhooks subscritos
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  secret_key TEXT NOT NULL,
  retry_config JSONB DEFAULT '{"max_retries": 3, "backoff_ms": 1000}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de webhooks
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_webhook_subscriptions_barbershop ON webhook_subscriptions(barbershop_id);
CREATE INDEX idx_webhook_logs_subscription ON webhook_logs(subscription_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- RLS Policies para webhook_subscriptions
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks"
ON webhook_subscriptions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (
    SELECT barbershop_id FROM get_user_barbershops(auth.uid())
  )
);

-- RLS Policies para webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
ON webhook_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND subscription_id IN (
    SELECT id FROM webhook_subscriptions 
    WHERE barbershop_id IN (
      SELECT barbershop_id FROM get_user_barbershops(auth.uid())
    )
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_webhook_subscriptions_updated_at
BEFORE UPDATE ON webhook_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();