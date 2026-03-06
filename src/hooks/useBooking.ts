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
      
      console.log('[BOOKING] Buscando/criando lead via RPC:', normalizedPhone);

      // Use secure RPC to find or create lead
      const { data: leadId, error: leadError } = await supabase
        .rpc('find_or_create_lead', {
          _barbershop_id: barbershopId,
          _phone: normalizedPhone,
          _full_name: data.clientName,
          _email: data.clientEmail || null,
          _source: 'public_booking',
        });

      if (leadError) {
        console.error('[BOOKING] Erro ao buscar/criar lead:', leadError);
        toast.error(`Erro ao registrar cliente: ${leadError.message}`);
        return false;
      }

      console.log('[BOOKING] Lead ID:', leadId);

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

      // Verificar se HÁ OVERLAP com agendamentos existentes (excluindo cancelled, no_show, completed)
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('scheduled_at, status, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .gte('scheduled_at', scheduledAt.toISOString())
        .lt('scheduled_at', endTime.toISOString())
        .not('status', 'in', '(cancelled,no_show,completed)');

      // Também verificar agendamentos que COMEÇAM ANTES mas TERMINAM DURANTE
      const { data: overlappingBefore } = await supabase
        .from('appointments')
        .select('scheduled_at, status, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .lt('scheduled_at', scheduledAt.toISOString())
        .not('status', 'in', '(cancelled,no_show,completed)');

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

      // Criar appointment com lead_id
      console.log('[BOOKING] Criando appointment com lead_id:', leadId);
      
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: barbershopId,
          service_id: data.serviceId,
          barber_id: data.barberId,
          lead_id: leadId,        // ✅ Usar lead_id
          client_id: null,        // ✅ Explicitamente null
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
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            barbershop_id: barbershopId,
            client_email: data.clientEmail,
            client_name: data.clientName,
            service_name: service?.name || 'Serviço',
            barber_name: barber?.name || 'Barbeiro',
            scheduled_at: scheduledAt.toISOString(),
          },
        });
        
        if (emailError) {
          console.error('❌ Email error:', emailError);
        } else if (emailResult?.success === false) {
          console.warn('⚠️ Email não enviado:', emailResult.message);
        } else {
          console.log('✅ Email enviado com sucesso!');
        }
      } catch (err) {
        console.error('❌ Email exception:', err);
      }

      // Enviar notificação WhatsApp (se configurado)
      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            barbershop_id: barbershopId,
            client_phone: normalizedPhone, // ✅ Enviar telefone normalizado
            client_name: data.clientName,
            service_name: service?.name || 'Serviço',
            barber_name: barber?.name || 'Barbeiro',
            scheduled_at: scheduledAt.toISOString(),
          },
        });
        
        if (whatsappError) {
          console.error('❌ WhatsApp error:', whatsappError);
        } else if (whatsappResult?.success === false) {
          console.warn('⚠️ WhatsApp não enviado:', whatsappResult.message);
        } else {
          console.log('✅ WhatsApp enviado com sucesso!');
        }
      } catch (err) {
        console.error('❌ WhatsApp exception:', err);
      }

      toast.success('Agendamento realizado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      // Mensagens específicas por tipo de erro
      if (error.message?.includes('CONFLITO_AGENDAMENTO')) {
        toast.error('Este horário já está ocupado. Por favor, escolha outro horário ou barbeiro.');
      } else if (error.code === '23505') { // Unique violation
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
