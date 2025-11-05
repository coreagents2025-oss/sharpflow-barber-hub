-- Create whatsapp_conversations table
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(barbershop_id, client_phone)
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('received', 'sent')),
  content TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Staff can view own barbershop conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

CREATE POLICY "Staff can manage own barbershop conversations"
ON public.whatsapp_conversations
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- RLS Policies for whatsapp_messages
CREATE POLICY "Staff can view own barbershop messages"
ON public.whatsapp_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

CREATE POLICY "Staff can create messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

CREATE POLICY "Staff can update own barbershop messages"
ON public.whatsapp_messages
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'barber'::app_role) AND barbershop_id = get_user_barbershop(auth.uid()))
);

-- Indexes for performance
CREATE INDEX idx_conversations_barbershop ON public.whatsapp_conversations(barbershop_id);
CREATE INDEX idx_conversations_last_message ON public.whatsapp_conversations(barbershop_id, last_message_at DESC);
CREATE INDEX idx_conversations_phone ON public.whatsapp_conversations(barbershop_id, client_phone);
CREATE INDEX idx_messages_conversation ON public.whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_barbershop ON public.whatsapp_messages(barbershop_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;