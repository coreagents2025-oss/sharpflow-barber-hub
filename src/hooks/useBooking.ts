import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BookingData {
  serviceId: string;
  barberId: string;
  date: Date;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

export const useBooking = (barbershopId: string | null) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBooking = async (data: BookingData) => {
    if (!barbershopId) {
      toast.error('Barbearia não identificada');
      return false;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = data.time.split(':');
      const scheduledAt = new Date(data.date);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create or get client profile
      const { data: existingClient } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${data.clientPhone},id.eq.${data.clientEmail}`)
        .maybeSingle();

      let clientId = existingClient?.id;

      if (!clientId) {
        // Criar usuário anônimo temporário para agendamento público
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.clientEmail,
          password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
          options: {
            data: {
              full_name: data.clientName,
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (authError) {
          console.error('Error creating anonymous user:', authError);
          toast.error('Erro ao criar perfil. Tente novamente.');
          return false;
        }

        clientId = authData.user?.id;
        
        if (!clientId) {
          toast.error('Erro ao criar perfil. Tente novamente.');
          return false;
        }

        // Atualizar telefone no perfil
        await supabase
          .from('profiles')
          .update({ phone: data.clientPhone })
          .eq('id', clientId);
      }

      // Verificar se horário está disponível
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', data.barberId)
        .eq('scheduled_at', scheduledAt.toISOString())
        .neq('status', 'cancelled');

      if (existingAppointments && existingAppointments.length > 0) {
        toast.error('Este horário já está ocupado. Escolha outro horário.');
        return false;
      }

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: barbershopId,
          service_id: data.serviceId,
          barber_id: data.barberId,
          client_id: clientId,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
        });

      if (appointmentError) throw appointmentError;

      // Buscar informações do serviço e barbeiro para o email
      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', data.serviceId)
        .single();

      const { data: barber } = await supabase
        .from('barbers')
        .select('name')
        .eq('id', data.barberId)
        .single();

      // Enviar email de confirmação (se configurado)
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            barbershop_id: barbershopId,
            client_email: data.clientEmail,
            client_name: data.clientName,
            service_name: service?.name || 'Serviço',
            barber_name: barber?.name || 'Barbeiro',
            scheduled_at: scheduledAt.toISOString(),
          },
        });
      } catch (emailError) {
        console.log('Email notification failed (não configurado):', emailError);
        // Não falhar o agendamento se o email não funcionar
      }

      toast.success('Agendamento realizado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error('Erro ao realizar agendamento. Tente novamente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createBooking, isSubmitting };
};
