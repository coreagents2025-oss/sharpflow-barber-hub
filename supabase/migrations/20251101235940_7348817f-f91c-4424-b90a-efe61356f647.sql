-- Add WhatsApp configuration to barbershops table
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS whatsapp_settings jsonb DEFAULT jsonb_build_object(
  'enabled', false,
  'phone_number', '',
  'message_template', 'Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!'
);