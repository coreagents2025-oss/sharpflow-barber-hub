
-- Add is_suspended to barbershops
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Support Tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Admins (barbershop owners) can create and view their own tickets
CREATE POLICY "Barbershop admins can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
  AND created_by = auth.uid()
);

CREATE POLICY "Barbershop admins can view own tickets"
ON public.support_tickets FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

CREATE POLICY "Barbershop admins can update own tickets"
ON public.support_tickets FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

-- Super admins can do everything
CREATE POLICY "Super admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (is_super_admin(auth.uid()));

-- Support Ticket Messages table
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop admins can view own ticket messages"
ON public.support_ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
    AND t.barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
  )
);

CREATE POLICY "Barbershop admins can send messages on own tickets"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
    AND t.barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
  )
);

CREATE POLICY "Super admins can manage all ticket messages"
ON public.support_ticket_messages FOR ALL
USING (is_super_admin(auth.uid()));

-- Super admin can manage all user roles (CRUD)
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (is_super_admin(auth.uid()));

-- Super admin can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admin can update barbershops (suspend/unsuspend)
CREATE POLICY "Super admins can manage all barbershops"
ON public.barbershops FOR ALL
USING (is_super_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
