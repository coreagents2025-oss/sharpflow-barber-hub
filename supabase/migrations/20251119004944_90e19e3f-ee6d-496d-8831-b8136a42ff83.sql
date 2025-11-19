-- ====================================
-- TABELA: barber_commission_config
-- ====================================
CREATE TABLE barber_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed' | 'per_service'
  commission_value NUMERIC NOT NULL DEFAULT 50,
  minimum_services INTEGER DEFAULT 0,
  apply_to_completed_only BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barber_id, barbershop_id)
);

CREATE INDEX idx_commission_config_barber ON barber_commission_config(barber_id);
CREATE INDEX idx_commission_config_barbershop ON barber_commission_config(barbershop_id);

ALTER TABLE barber_commission_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission config"
ON barber_commission_config
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

CREATE POLICY "Barbers can view own commission config"
ON barber_commission_config
FOR SELECT
USING (
  barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
);

-- ====================================
-- TABELA: commission_records
-- ====================================
CREATE TABLE commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_services INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  manual_adjustments NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  payment_date TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_commission_records_barber ON commission_records(barber_id);
CREATE INDEX idx_commission_records_period ON commission_records(period_start, period_end);
CREATE INDEX idx_commission_records_status ON commission_records(status);

ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission records"
ON commission_records
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

CREATE POLICY "Barbers can view own commission records"
ON commission_records
FOR SELECT
USING (
  barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
);

-- ====================================
-- TABELA: cash_flow
-- ====================================
CREATE TABLE cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'income' | 'expense'
  category TEXT NOT NULL, -- 'service' | 'commission' | 'salary' | 'rent' | 'supplies' | 'other'
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT, -- 'appointment' | 'commission' | 'manual'
  payment_method TEXT, -- 'cash' | 'debit' | 'credit' | 'pix'
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_cash_flow_barbershop ON cash_flow(barbershop_id);
CREATE INDEX idx_cash_flow_date ON cash_flow(transaction_date);
CREATE INDEX idx_cash_flow_type ON cash_flow(type);
CREATE INDEX idx_cash_flow_category ON cash_flow(category);

ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage cash flow"
ON cash_flow
FOR ALL
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'barber'::app_role))
  AND barbershop_id = get_user_barbershop(auth.uid())
);

-- ====================================
-- FUNÇÃO: calculate_barber_commission
-- ====================================
CREATE OR REPLACE FUNCTION calculate_barber_commission(
  _barber_id UUID,
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  total_services BIGINT,
  total_amount NUMERIC,
  commission_amount NUMERIC
) AS $$
DECLARE
  config RECORD;
BEGIN
  SELECT * INTO config
  FROM barber_commission_config
  WHERE barber_id = _barber_id AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active commission config found for barber %', _barber_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(a.id)::BIGINT as total_services,
    COALESCE(SUM(s.price), 0) as total_amount,
    CASE 
      WHEN config.commission_type = 'percentage' THEN
        COALESCE(SUM(s.price) * (config.commission_value / 100), 0)
      WHEN config.commission_type = 'fixed' THEN
        COUNT(a.id) * config.commission_value
      ELSE
        0
    END as commission_amount
  FROM appointments a
  INNER JOIN services s ON s.id = a.service_id
  WHERE a.barber_id = _barber_id
    AND a.scheduled_at::DATE BETWEEN _start_date AND _end_date
    AND (
      (config.apply_to_completed_only = true AND a.status = 'completed')
      OR config.apply_to_completed_only = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================
-- TRIGGER: updated_at para as tabelas
-- ====================================
CREATE TRIGGER update_barber_commission_config_updated_at
BEFORE UPDATE ON barber_commission_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_records_updated_at
BEFORE UPDATE ON commission_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();