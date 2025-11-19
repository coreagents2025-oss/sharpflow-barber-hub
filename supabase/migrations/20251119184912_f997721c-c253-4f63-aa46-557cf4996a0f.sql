-- Fase 2: Criar função e triggers para atualização automática de status

-- Função para determinar e atualizar automaticamente o status do lead
CREATE OR REPLACE FUNCTION auto_update_lead_status()
RETURNS TRIGGER AS $$
DECLARE
  lead_record RECORD;
  new_status TEXT;
BEGIN
  -- Buscar informações do lead
  SELECT 
    l.id,
    l.status,
    COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as payment_count,
    COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appt_count,
    COUNT(DISTINCT a.id) as total_appt_count,
    MAX(GREATEST(
      COALESCE(a.scheduled_at, '1970-01-01'::timestamptz),
      COALESCE(l.last_interaction_at, '1970-01-01'::timestamptz)
    )) as last_activity
  INTO lead_record
  FROM leads l
  LEFT JOIN appointments a ON a.lead_id = l.id
  LEFT JOIN payments p ON p.lead_id = l.id
  WHERE l.id = COALESCE(NEW.lead_id, OLD.lead_id)
  GROUP BY l.id, l.status;

  -- Determinar novo status baseado em regras
  IF lead_record.payment_count > 0 THEN
    new_status := 'converted';
  ELSIF lead_record.completed_appt_count > 0 THEN
    new_status := 'active';
  ELSIF lead_record.total_appt_count > 0 THEN
    new_status := 'contacted';
  ELSIF lead_record.last_activity < NOW() - INTERVAL '90 days' AND lead_record.total_appt_count > 0 THEN
    new_status := 'lost';
  ELSE
    new_status := 'new';
  END IF;

  -- Atualizar apenas se o status mudou
  IF new_status IS DISTINCT FROM lead_record.status THEN
    UPDATE leads 
    SET 
      status = new_status,
      last_interaction_at = NOW(),
      updated_at = NOW()
    WHERE id = lead_record.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para appointments (INSERT e UPDATE)
DROP TRIGGER IF EXISTS update_lead_status_on_appointment ON appointments;
CREATE TRIGGER update_lead_status_on_appointment
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION auto_update_lead_status();

-- Trigger para payments (INSERT)
DROP TRIGGER IF EXISTS update_lead_status_on_payment ON payments;
CREATE TRIGGER update_lead_status_on_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION auto_update_lead_status();