import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSendMessage = () => {
  const [loading, setLoading] = useState(false);

  const sendMessage = async (
    conversationId: string,
    content: string,
    barbershopId: string,
    clientPhone: string
  ) => {
    setLoading(true);
    try {
      // 1. Salvar mensagem no banco (status: pending)
      const { data: message, error: msgError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          barbershop_id: barbershopId,
          message_type: 'sent',
          content,
          status: 'pending',
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // 2. Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: content.substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // 3. Enviar via WhatsApp usando a edge function
      try {
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            type: 'manual_message',
            barbershop_id: barbershopId,
            client_phone: clientPhone,
            message: content,
            conversation_id: conversationId,
          },
        });

        if (sendError) {
          console.error('Erro ao enviar via WhatsApp:', sendError);
          
          // Marcar mensagem como falha
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'failed' })
            .eq('id', message.id);
          
          toast.error('Mensagem salva, mas houve erro ao enviar via WhatsApp');
        } else {
          // Marcar mensagem como enviada
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'sent' })
            .eq('id', message.id);
        }
      } catch (sendError) {
        console.error('Erro ao chamar edge function:', sendError);
        
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed' })
          .eq('id', message.id);
        
        toast.error('Mensagem salva, mas houve erro ao enviar');
      }

      return message;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading };
};