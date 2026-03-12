
-- Fix #2: Criar view pública segura para verificação de disponibilidade de slots
-- Expõe apenas campos necessários (sem PII: sem lead_id, client_id, notes)
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker = on) AS
  SELECT 
    id,
    barbershop_id,
    barber_id,
    service_id,
    scheduled_at,
    status
  FROM public.appointments
  WHERE status NOT IN ('cancelled', 'no_show', 'completed');

-- Fix #2b: Política SELECT pública na tabela appointments
-- Permite que usuários anônimos verifiquem disponibilidade de horários
CREATE POLICY "Public can check appointment availability"
ON public.appointments
FOR SELECT
TO public
USING (true);

-- Fix #3: Política SELECT pública em daily_schedules para usuários anônimos
-- Necessário para que o modal de agendamento leia horários personalizados do dia
CREATE POLICY "Public can read daily schedules"
ON public.daily_schedules
FOR SELECT
TO public
USING (true);
