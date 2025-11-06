import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ExternalLink, Archive, Ban } from 'lucide-react';
import { Conversation } from '@/pages/Messages';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClientInfoPanelProps {
  conversation: Conversation | null;
  barbershopId: string | null;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  service_id: string;
  services: {
    name: string;
  };
  barbers: {
    name: string;
  };
}

export const ClientInfoPanel = ({ conversation, barbershopId }: ClientInfoPanelProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversation?.client_id || !barbershopId) {
      setAppointments([]);
      return;
    }

    const loadAppointments = async () => {
      setLoading(true);
      try {
        // Usar view unificada
        const { data, error } = await supabase
          .from('appointments_with_client')
          .select(`
            id,
            scheduled_at,
            status,
            service_id,
            services (name),
            barbers (name)
          `)
          .eq('unified_client_id', conversation.client_id)
          .eq('barbershop_id', barbershopId)
          .order('scheduled_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setAppointments(data || []);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [conversation, barbershopId]);

  const handleArchive = async () => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'archived' })
        .eq('id', conversation.id);

      if (error) throw error;
      toast.success('Conversa arquivada');
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast.error('Erro ao arquivar conversa');
    }
  };

  const handleBlock = async () => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'blocked' })
        .eq('id', conversation.id);

      if (error) throw error;
      toast.success('Contato bloqueado');
    } catch (error) {
      console.error('Erro ao bloquear contato:', error);
      toast.error('Erro ao bloquear contato');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground text-sm text-center">
          Selecione uma conversa para ver informações
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
      {/* Informações do Cliente */}
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 mb-3">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
            {getInitials(conversation.client_name)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{conversation.client_name}</h3>
        <p className="text-sm text-muted-foreground">{conversation.client_phone}</p>
        
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          asChild
        >
          <a
            href={`https://wa.me/${conversation.client_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir no WhatsApp
          </a>
        </Button>
      </div>

      {/* Histórico de Agendamentos */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Agendamentos
        </h4>
        
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
        ) : (
          <div className="space-y-2">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 rounded-lg border border-border bg-card text-sm"
              >
                <div className="font-medium">{apt.services.name}</div>
                <div className="text-muted-foreground text-xs">
                  {format(new Date(apt.scheduled_at), "dd 'de' MMMM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
                <div className="text-muted-foreground text-xs">
                  com {apt.barbers.name}
                </div>
                <div className={`text-xs mt-1 ${
                  apt.status === 'scheduled' ? 'text-blue-500' :
                  apt.status === 'completed' ? 'text-green-500' :
                  'text-gray-500'
                }`}>
                  {apt.status === 'scheduled' ? 'Agendado' :
                   apt.status === 'completed' ? 'Concluído' :
                   apt.status === 'cancelled' ? 'Cancelado' : apt.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações da Conversa */}
      <div className="space-y-2">
        <h4 className="font-semibold mb-3">Ações</h4>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleArchive}
        >
          <Archive className="h-4 w-4 mr-2" />
          Arquivar conversa
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleBlock}
        >
          <Ban className="h-4 w-4 mr-2" />
          Bloquear contato
        </Button>
      </div>
    </div>
  );
};