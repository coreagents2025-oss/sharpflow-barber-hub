
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker = on) AS
  SELECT 
    a.id,
    a.barbershop_id,
    a.barber_id,
    a.service_id,
    a.scheduled_at,
    a.status,
    COALESCE(s.duration_minutes, 30) AS duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status NOT IN ('cancelled', 'no_show', 'completed');
