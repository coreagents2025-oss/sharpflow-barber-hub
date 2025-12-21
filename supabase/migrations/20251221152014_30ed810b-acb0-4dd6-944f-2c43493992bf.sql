-- Função para verificar conflito de agendamentos
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    service_duration INTEGER;
    new_end_time TIMESTAMPTZ;
    conflict_count INTEGER;
BEGIN
    -- Buscar duração do serviço
    SELECT duration_minutes INTO service_duration
    FROM services WHERE id = NEW.service_id;
    
    -- Se não encontrar, usar 30 min como padrão
    IF service_duration IS NULL THEN
        service_duration := 30;
    END IF;
    
    -- Calcular fim do novo agendamento
    new_end_time := NEW.scheduled_at + (service_duration || ' minutes')::INTERVAL;
    
    -- Verificar conflitos APENAS para status ativos (scheduled, in_progress, confirmed)
    -- Excluir: cancelled, no_show, completed
    SELECT COUNT(*) INTO conflict_count
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.barber_id = NEW.barber_id
      AND a.barbershop_id = NEW.barbershop_id
      AND a.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.status NOT IN ('cancelled', 'no_show', 'completed')
      AND (
          -- Novo agendamento começa durante um existente
          (NEW.scheduled_at >= a.scheduled_at AND 
           NEW.scheduled_at < a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL)
          OR
          -- Novo agendamento termina durante um existente
          (new_end_time > a.scheduled_at AND 
           new_end_time <= a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL)
          OR
          -- Novo agendamento engloba um existente
          (NEW.scheduled_at <= a.scheduled_at AND 
           new_end_time >= a.scheduled_at + (COALESCE(s.duration_minutes, 30) || ' minutes')::INTERVAL)
      );
    
    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'CONFLITO_AGENDAMENTO: O barbeiro já possui agendamento neste horário. Escolha outro horário ou barbeiro.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger que dispara antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS prevent_appointment_conflict ON appointments;
CREATE TRIGGER prevent_appointment_conflict
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_appointment_conflict();