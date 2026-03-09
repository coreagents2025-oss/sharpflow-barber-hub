
-- Add Asaas credentials to barbershop_credentials
ALTER TABLE public.barbershop_credentials 
ADD COLUMN IF NOT EXISTS asaas_credentials jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add Asaas IDs to client_subscriptions
ALTER TABLE public.client_subscriptions
ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Index for quick lookup by Asaas subscription ID (used by webhook)
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_asaas_sub_id 
ON public.client_subscriptions (asaas_subscription_id) 
WHERE asaas_subscription_id IS NOT NULL;
