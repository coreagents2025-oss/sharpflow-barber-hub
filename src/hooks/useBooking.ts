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
      const dateStr = scheduledAt.toISOString().split('T')[0];

      // Verificar daily_schedule
      const { data: schedule } = await supabase
        .from('daily_schedules')
        .select('barbers_working, blocked_slots, working_hours_start, working_hours_end')
        .eq('barbershop_id', barbershopId)
        .eq('date', dateStr)
        .maybeSingle();

      // Verificar se barbeiro está trabalhando neste dia
      if (schedule && schedule.barbers_working && !schedule.barbers_working.includes(data.barberId)) {
        toast.error('Este barbeiro não está trabalhando neste dia.');
        return false;
      }

      // Verificar se horário está bloqueado
      if (schedule?.blocked_slots?.includes(data.time)) {
        toast.error('Este horário está bloqueado para agendamentos.');
        return false;
      }

      // Verificar se está dentro do horário de funcionamento
      if (schedule?.working_hours_start && schedule?.working_hours_end) {
        if (data.time < schedule.working_hours_start || data.time > schedule.working_hours_end) {
          toast.error('Horário fora do expediente de trabalho.');
          return false;
        }
      }

      // Normalizar telefone (remover formatação)
      const normalizedPhone = data.clientPhone.replace(/\D/g, '');
      
      console.log('[BOOKING] Buscando cliente por telefone:', normalizedPhone);

      // Buscar cliente existente por telefone
      const { data: existingClient, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (searchError) {
        console.error('[BOOKING] Erro ao buscar cliente:', searchError);
      } else {
        console.log('[BOOKING] Cliente encontrado:', existingClient);
      }

      let clientId = existingClient?.id;

      // Se não encontrou, criar novo lead (sem autenticação)
      if (!clientId) {
        console.log('[BOOKING] Cliente não encontrado, criando lead no banco...');
        
        // Gerar UUID para o novo lead
        const newClientId = crypto.randomUUID();
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: newClientId,
            full_name: data.clientName,
            phone: normalizedPhone,
          }])
          .select('id')
          .single();

        if (insertError) {
          console.error('[BOOKING] Erro ao criar perfil:', insertError);
          
          // Se for erro de duplicata (telefone já existe), tentar buscar novamente
          if (insertError.code === '23505') {
            const { data: retryClient } = await supabase
              .from('profiles')
              .select('id')
              .eq('phone', normalizedPhone)
              .maybeSingle();
            
            if (retryClient) {
              clientId = retryClient.id;
              console.log('[BOOKING] Cliente encontrado na segunda tentativa:', clientId);
            }
          }
          
          if (!clientId) {
            toast.error('Erro ao criar perfil do cliente. Tente novamente.');
            return false;
          }
        } else {
          clientId = newProfile.id;
          console.log('[BOOKING] Lead criado com sucesso:', clientId);
        }
      }

      // Validar se não é data/hora passada
      const now = new Date();
      if (scheduledAt <= now) {
        toast.error('Não é possível agendar para datas passadas.');
        return false;
      }

      // Buscar serviço para pegar duração
      const { data: serviceData } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', data.serviceId)
        .single();

      const durationMinutes = serviceData?.duration_minutes || 30;
      const endTime = new Date(scheduledAt);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      // Verificar se HÁ OVERLAP com agendamentos existentes
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('scheduled_at, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .gte('scheduled_at', scheduledAt.toISOString())
        .lt('scheduled_at', endTime.toISOString())
        .neq('status', 'cancelled');

      // Também verificar agendamentos que COMEÇAM ANTES mas TERMINAM DURANTE
      const { data: overlappingBefore } = await supabase
        .from('appointments')
        .select('scheduled_at, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .lt('scheduled_at', scheduledAt.toISOString())
        .neq('status', 'cancelled');

      // Validar overlaps
      let hasOverlap = existingAppointments && existingAppointments.length > 0;

      if (!hasOverlap && overlappingBefore) {
        overlappingBefore.forEach(apt => {
          const aptStart = new Date(apt.scheduled_at);
          const aptDuration = (apt.services as any)?.duration_minutes || 30;
          const aptEnd = new Date(aptStart);
          aptEnd.setMinutes(aptStart.getMinutes() + aptDuration);
          
          // Se o agendamento anterior termina DEPOIS do novo começar, há overlap
          if (aptEnd > scheduledAt) {
            hasOverlap = true;
          }
        });
      }

      if (hasOverlap) {
        toast.error('Este horário está ocupado ou conflita com outro agendamento.');
        return false;
      }

      // Create appointment
      console.log('[BOOKING] Criando appointment com dados:', {
        barbershop_id: barbershopId,
        service_id: data.serviceId,
        barber_id: data.barberId,
        client_id: clientId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      });
      
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

      if (appointmentError) {
        console.error('[BOOKING] Erro ao criar appointment:', appointmentError);
        throw appointmentError;
      }
      
      console.log('[BOOKING] Appointment criado com sucesso!');

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

      // Enviar notificação WhatsApp (se configurado)
      try {
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            barbershop_id: barbershopId,
            client_phone: data.clientPhone,
            client_name: data.clientName,
            service_name: service?.name || 'Serviço',
            barber_name: barber?.name || 'Barbeiro',
            scheduled_at: scheduledAt.toISOString(),
          },
        });
      } catch (whatsappError) {
        console.log('WhatsApp notification failed (não configurado):', whatsappError);
        // Não falhar o agendamento se o WhatsApp não funcionar
      }

      toast.success('Agendamento realizado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      // Mensagens específicas por tipo de erro
      if (error.code === '23505') { // Unique violation
        toast.error('Já existe um agendamento neste horário.');
      } else if (error.message?.includes('RLS') || error.message?.includes('policy')) {
        toast.error('Erro de permissão. Entre em contato com a barbearia.');
      } else if (error.message) {
        toast.error(`Erro ao realizar agendamento: ${error.message}`);
      } else {
        toast.error('Erro ao realizar agendamento. Tente novamente.');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createBooking, isSubmitting };
};
