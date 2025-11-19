-- FASE 1: Limpeza imediata de agendamentos travados
UPDATE appointments
SET 
  status = 'completed',
  notes = COALESCE(notes || ' | ', '') || 'Auto-completado pelo sistema (agendamento travado)',
  updated_at = NOW()
WHERE status = 'in_progress'
  AND updated_at < NOW() - INTERVAL '3 hours';

-- FASE 2: Criar função de auto-complete para prevenção
CREATE OR REPLACE FUNCTION auto_complete_old_appointments()
RETURNS void AS $$
BEGIN
  UPDATE appointments
  SET 
    status = 'completed',
    notes = COALESCE(notes || ' | ', '') || 'Auto-completado (excedeu tempo limite)',
    updated_at = NOW()
  WHERE status = 'in_progress'
    AND updated_at < NOW() - INTERVAL '3 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FASE 3: Adicionar tempo máximo de serviço
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS max_duration_minutes integer;

-- Definir valores padrão baseados na duração atual (adicionar 30min de buffer)
UPDATE services
SET max_duration_minutes = duration_minutes + 30
WHERE max_duration_minutes IS NULL;