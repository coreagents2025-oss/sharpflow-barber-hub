-- Criar tabela para anotações dos leads
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_notes
CREATE POLICY "Barbeiros podem ver notas dos leads da sua barbearia"
  ON public.lead_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
      WHERE l.id = lead_notes.lead_id
      AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbeiros podem criar notas dos leads da sua barbearia"
  ON public.lead_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
      WHERE l.id = lead_notes.lead_id
      AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbeiros podem atualizar notas dos leads da sua barbearia"
  ON public.lead_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
      WHERE l.id = lead_notes.lead_id
      AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbeiros podem deletar notas dos leads da sua barbearia"
  ON public.lead_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.barbershop_staff bs ON l.barbershop_id = bs.barbershop_id
      WHERE l.id = lead_notes.lead_id
      AND bs.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhorar performance
CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_created_at ON public.lead_notes(created_at DESC);