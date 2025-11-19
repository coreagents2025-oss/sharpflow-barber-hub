-- FASE 1: Limpar agendamentos antigos (scheduled que já passaram)
UPDATE appointments
SET 
  status = 'no_show',
  notes = COALESCE(notes || ' | ', '') || 'Auto-marcado como falta (agendamento expirado)',
  updated_at = NOW()
WHERE status = 'scheduled'
  AND scheduled_at < NOW() - INTERVAL '1 hour';

-- FASE 3: Criar função para auto-marcar agendamentos expirados
CREATE OR REPLACE FUNCTION auto_mark_expired_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments
  SET 
    status = 'no_show',
    notes = COALESCE(notes || ' | ', '') || 'Falta não justificada (auto-marcado)',
    updated_at = NOW()
  WHERE status = 'scheduled'
    AND scheduled_at < NOW() - INTERVAL '1 hour';
END;
$$;