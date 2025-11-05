import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ConversationList } from '@/components/messages/ConversationList';
import { ChatArea } from '@/components/messages/ChatArea';
import { ClientInfoPanel } from '@/components/messages/ClientInfoPanel';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  client_phone: string;
  client_name: string;
  client_id: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  status: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  message_type: 'received' | 'sent';
  content: string;
  media_url: string | null;
  status: string;
  sent_by: string | null;
  created_at: string;
}

const Messages = () => {
  const { barbershopId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'archived'>('all');

  // Carregar conversas
  useEffect(() => {
    if (!barbershopId) return;
    
    const loadConversations = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .order('last_message_at', { ascending: false });

        if (filterStatus === 'unread') {
          query = query.gt('unread_count', 0);
        } else if (filterStatus === 'archived') {
          query = query.eq('status', 'archived');
        } else {
          query = query.eq('status', 'active');
        }

        if (searchQuery) {
          query = query.or(`client_name.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;

        if (error) throw error;
        setConversations(data || []);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        toast.error('Erro ao carregar conversas');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [barbershopId, searchQuery, filterStatus]);

  // Realtime para conversas
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        (payload) => {
          console.log('Conversation change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === payload.new.id ? (payload.new as Conversation) : conv
              )
            );
            
            // Atualizar conversa selecionada se for ela
            if (selectedConversation?.id === payload.new.id) {
              setSelectedConversation(payload.new as Conversation);
            }
          } else if (payload.eventType === 'DELETE') {
            setConversations((prev) => prev.filter((conv) => conv.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, selectedConversation]);

  // Carregar mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('conversation_id', selectedConversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages((data || []) as Message[]);

        // Marcar mensagens como lidas
        if (selectedConversation.unread_count > 0) {
          await supabase
            .from('whatsapp_conversations')
            .update({ unread_count: 0 })
            .eq('id', selectedConversation.id);
        }
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        toast.error('Erro ao carregar mensagens');
      }
    };

    loadMessages();
  }, [selectedConversation]);

  // Realtime para mensagens
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          console.log('Message change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Lista de Conversas */}
        <div className="w-full md:w-[30%] border-r border-border bg-card">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
          />
        </div>

        {/* Área de Chat */}
        <div className="hidden md:block md:w-[50%] bg-background">
          <ChatArea
            conversation={selectedConversation}
            messages={messages}
            barbershopId={barbershopId}
          />
        </div>

        {/* Painel de Informações */}
        <div className="hidden lg:block lg:w-[20%] border-l border-border bg-card">
          <ClientInfoPanel
            conversation={selectedConversation}
            barbershopId={barbershopId}
          />
        </div>
      </div>
    </div>
  );
};

export default Messages;