
-- 1. Create appointment_services table
CREATE TABLE public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  position integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Public can insert appointment_services"
  ON public.appointment_services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can view appointment_services"
  ON public.appointment_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.barbershop_staff bs ON bs.barbershop_id = a.barbershop_id
      WHERE a.id = appointment_services.appointment_id
        AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view appointment_services for availability"
  ON public.appointment_services FOR SELECT
  USING (true);

-- 4. Add total_duration_minutes to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_duration_minutes integer;

-- 5. Update public_appointment_slots view to use total_duration_minutes
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker = on) AS
  SELECT
    a.id,
    a.barbershop_id,
    a.barber_id,
    a.service_id,
    a.scheduled_at,
    a.status,
    COALESCE(a.total_duration_minutes, s.duration_minutes, 30) AS duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status NOT IN ('cancelled', 'no_show', 'completed');

-- 6. Update check_appointment_conflict trigger to use total_duration_minutes
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    service_duration INTEGER;
    new_end_time TIMESTAMPTZ;
    conflict_count INTEGER;
BEGIN
    -- Use total_duration_minutes if available, otherwise fall back to service duration
    IF NEW.total_duration_minutes IS NOT NULL THEN
        service_duration := NEW.total_duration_minutes;
    ELSE
        SELECT duration_minutes INTO service_duration
        FROM services WHERE id = NEW.service_id;
        IF service_duration IS NULL THEN
            service_duration := 30;
        END IF;
    END IF;

    -- Calculate end time of new appointment
    new_end_time := NEW.scheduled_at + (service_duration || ' minutes')::INTERVAL;

    -- Check conflicts with active appointments only
    SELECT COUNT(*) INTO conflict_count
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.barber_id = NEW.barber_id
      AND a.barbershop_id = NEW.barbershop_id
      AND a.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status NOT IN ('cancelled', 'no_show', 'completed')
      AND (
          (NEW.scheduled_at >= a.scheduled_at AND
           NEW.scheduled_at < a.scheduled_at + (COALESCE(a.total_duration_minutes, s.duration_minutes, 30) || ' minutes')::INTERVAL)
          OR
          (new_end_time > a.scheduled_at AND
           new_end_time <= a.scheduled_at + (COALESCE(a.total_duration_minutes, s.duration_minutes, 30) || ' minutes')::INTERVAL)
          OR
          (NEW.scheduled_at <= a.scheduled_at AND
           new_end_time >= a.scheduled_at + (COALESCE(a.total_duration_minutes, s.duration_minutes, 30) || ' minutes')::INTERVAL)
      );

    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'CONFLITO_AGENDAMENTO: O barbeiro já possui agendamento neste horário. Escolha outro horário ou barbeiro.';
    END IF;

    RETURN NEW;
END;
$$;
