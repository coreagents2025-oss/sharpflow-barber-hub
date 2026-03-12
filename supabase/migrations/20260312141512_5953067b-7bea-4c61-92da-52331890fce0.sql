-- Drop and recreate appointments_with_client view to add total_duration_minutes
DROP VIEW IF EXISTS public.appointments_with_client;

CREATE VIEW public.appointments_with_client AS
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
  a.total_duration_minutes,
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