-- FASE 3: Criar função e trigger para sincronização automática
CREATE OR REPLACE FUNCTION sync_payment_to_cash_flow()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir no cash_flow quando um pagamento for criado
  INSERT INTO cash_flow (
    barbershop_id,
    type,
    category,
    amount,
    description,
    reference_id,
    reference_type,
    payment_method,
    transaction_date,
    created_by,
    created_at
  )
  SELECT 
    NEW.barbershop_id,
    'income',
    'service',
    NEW.amount,
    CONCAT('Pagamento - Appointment ID: ', NEW.appointment_id),
    NEW.appointment_id,
    'appointment',
    NEW.payment_method,
    NEW.created_at::date,
    (SELECT barber_id FROM appointments WHERE id = NEW.appointment_id),
    NEW.created_at
  WHERE NOT EXISTS (
    SELECT 1 FROM cash_flow 
    WHERE reference_id = NEW.appointment_id 
    AND reference_type = 'appointment'
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER payment_to_cash_flow_trigger
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_to_cash_flow();

-- FASE 4: Ajustar RLS para permitir inserções via trigger
CREATE POLICY "Allow insert via trigger"
  ON cash_flow
  FOR INSERT
  WITH CHECK (true);

-- FASE 5: Criar view de auditoria para detectar inconsistências
CREATE OR REPLACE VIEW payment_cash_flow_audit AS
SELECT 
  p.id as payment_id,
  p.appointment_id,
  p.amount as payment_amount,
  p.created_at as payment_date,
  cf.id as cash_flow_id,
  cf.amount as cash_flow_amount,
  cf.created_at as cash_flow_date,
  CASE 
    WHEN cf.id IS NULL THEN 'MISSING_IN_CASH_FLOW'
    WHEN p.amount != cf.amount THEN 'AMOUNT_MISMATCH'
    ELSE 'OK'
  END as status
FROM payments p
LEFT JOIN cash_flow cf ON cf.reference_id = p.appointment_id AND cf.reference_type = 'appointment'
WHERE p.status = 'completed';