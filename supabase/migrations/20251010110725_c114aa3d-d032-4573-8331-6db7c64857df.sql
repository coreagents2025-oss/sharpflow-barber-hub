-- Tabela para configurações diárias da agenda
CREATE TABLE IF NOT EXISTS public.daily_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  working_hours_start TIME NOT NULL,
  working_hours_end TIME NOT NULL,
  barbers_working UUID[] NOT NULL DEFAULT '{}',
  blocked_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbershop_id, date)
);

-- Habilitar RLS
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Admins e barbeiros podem gerenciar schedules da sua barbearia
CREATE POLICY "Admins and barbers can manage schedules"
ON public.daily_schedules FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Trigger para updated_at
CREATE TRIGGER update_daily_schedules_updated_at
  BEFORE UPDATE ON public.daily_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();