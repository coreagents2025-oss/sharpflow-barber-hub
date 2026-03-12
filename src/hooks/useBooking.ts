import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BookingData {
  serviceId: string;
  additionalServiceIds?: string[];
  barberId: string;
  date: Date;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

interface ServiceInfo {
  id: string;
  duration_minutes: number;
  name: string;
  price: number;
}

export const useBooking = (barbershopId: string | null, isStaffBooking?: boolean) => {
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

      // Determinar horários de funcionamento
      let workingHoursStart: string | null = schedule?.working_hours_start ?? null;
      let workingHoursEnd: string | null = schedule?.working_hours_end ?? null;

      if (!workingHoursStart || !workingHoursEnd) {
        const { data: barbershop } = await supabase
          .from('public_barbershops')
          .select('operating_hours')
          .eq('id', barbershopId)
          .maybeSingle();

        if (barbershop?.operating_hours) {
          const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = DAY_MAP[scheduledAt.getDay()];
          const dayHours = (barbershop.operating_hours as any)?.[dayName];

          if (dayHours?.open && dayHours?.close) {
            workingHoursStart = dayHours.open;
            workingHoursEnd = dayHours.close;
          } else {
            toast.error('A barbearia não tem expediente neste dia.');
            return false;
          }
        }
      }

      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      // Validar horário dentro do expediente
      if (workingHoursStart && workingHoursEnd) {
        const startMinutes = toMinutes(workingHoursStart);
        const endMinutes = toMinutes(workingHoursEnd);
        const bookingStartMinutes = toMinutes(data.time);
        if (bookingStartMinutes < startMinutes || bookingStartMinutes >= endMinutes) {
          toast.error('Horário fora do expediente de trabalho.');
          return false;
        }
      }

      // Validar se não é data/hora passada
      const now = new Date();
      if (scheduledAt <= now) {
        toast.error('Não é possível agendar para datas passadas.');
        return false;
      }

      // Normalizar telefone
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

      // Buscar todos os serviços (principal + adicionais) para obter durações, nomes e preços
      const allServiceIds = [data.serviceId, ...(data.additionalServiceIds || [])];
      
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, duration_minutes, name, price')
        .in('id', allServiceIds);

      const servicesMap = new Map<string, ServiceInfo>();
      servicesData?.forEach(s => servicesMap.set(s.id, s));

      // Build ordered list of services to book
      const servicesToBook: ServiceInfo[] = [];
      const mainService = servicesMap.get(data.serviceId);
      if (mainService) servicesToBook.push(mainService);
      
      for (const svcId of (data.additionalServiceIds || [])) {
        const svc = servicesMap.get(svcId);
        if (svc) servicesToBook.push(svc);
      }

      // Calcular duração total
      const totalDurationMinutes = servicesToBook.reduce((acc, s) => acc + s.duration_minutes, 0);
      const totalEndTime = new Date(scheduledAt);
      totalEndTime.setMinutes(totalEndTime.getMinutes() + totalDurationMinutes);

      // Validar que o TÉRMINO de todos os serviços está dentro do expediente
      if (workingHoursEnd) {
        const endMinutes = toMinutes(workingHoursEnd);
        const serviceEndMinutes = totalEndTime.getHours() * 60 + totalEndTime.getMinutes();
        if (serviceEndMinutes > endMinutes) {
          toast.error(`Os serviços selecionados ultrapassam o horário de funcionamento (fechamento: ${workingHoursEnd}). Escolha um horário mais cedo ou menos serviços.`);
          return false;
        }
      }

      // Verificar conflito para o bloco total
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('scheduled_at, status, total_duration_minutes, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .gte('scheduled_at', scheduledAt.toISOString())
        .lt('scheduled_at', totalEndTime.toISOString())
        .not('status', 'in', '(cancelled,no_show,completed)');

      // Fix: limitar busca às últimas 8h para evitar que agendamentos históricos bloqueiem novos
      const lookbackStart = new Date(scheduledAt.getTime() - 8 * 60 * 60 * 1000);
      const { data: overlappingBefore } = await supabase
        .from('appointments')
        .select('scheduled_at, status, total_duration_minutes, services(duration_minutes)')
        .eq('barber_id', data.barberId)
        .gte('scheduled_at', lookbackStart.toISOString())
        .lt('scheduled_at', scheduledAt.toISOString())
        .not('status', 'in', '(cancelled,no_show,completed)');

      let hasOverlap = existingAppointments && existingAppointments.length > 0;

      if (!hasOverlap && overlappingBefore) {
        overlappingBefore.forEach(apt => {
          const aptStart = new Date(apt.scheduled_at);
          const aptDuration = (apt as any).total_duration_minutes || (apt.services as any)?.duration_minutes || 30;
          const aptEnd = new Date(aptStart);
          aptEnd.setMinutes(aptStart.getMinutes() + aptDuration);
          
          if (aptEnd > scheduledAt) {
            hasOverlap = true;
          }
        });
      }

      if (hasOverlap) {
        toast.error('Este horário está ocupado ou conflita com outro agendamento.');
        return false;
      }

      // ── CRIAR 1 ÚNICO APPOINTMENT com total_duration_minutes ──
      console.log(`[BOOKING] Criando 1 appointment consolidado com ${servicesToBook.length} serviço(s)`);
      
      const firstServiceName = servicesToBook[0]?.name || 'Serviço';

      const { data: appt, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: barbershopId,
          service_id: data.serviceId,          // serviço principal (retrocompatibilidade)
          barber_id: data.barberId,
          lead_id: leadId,
          client_id: null,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
          total_duration_minutes: totalDurationMinutes,
        })
        .select('id')
        .single();

      if (appointmentError) {
        console.error('[BOOKING] Erro ao criar appointment:', appointmentError);
        throw appointmentError;
      }

      console.log('[BOOKING] Appointment criado:', appt.id);

      // ── INSERIR TODOS OS SERVIÇOS em appointment_services (batch) ──
      const { error: servicesError } = await supabase
        .from('appointment_services' as any)
        .insert(
          servicesToBook.map((svc, i) => ({
            appointment_id: appt.id,
            service_id: svc.id,
            position: i + 1,
            duration_minutes: svc.duration_minutes,
            price: svc.price,
          }))
        );

      if (servicesError) {
        console.error('[BOOKING] Erro ao inserir appointment_services:', servicesError);
        throw servicesError;
      }

      console.log('[BOOKING] Appointment consolidado criado com sucesso!');

      // Buscar nome do barbeiro para notificações
      const { data: barber } = await supabase
        .from('barbers')
        .select('name')
        .eq('id', data.barberId)
        .single();

      const serviceNameForNotification = servicesToBook.length > 1
        ? `${firstServiceName} + ${servicesToBook.length - 1} outro(s)`
        : firstServiceName;

      // Enviar email de confirmação
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            barbershop_id: barbershopId,
            client_email: data.clientEmail,
            client_name: data.clientName,
            service_name: serviceNameForNotification,
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

      // Enviar notificação WhatsApp
      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            barbershop_id: barbershopId,
            client_phone: normalizedPhone,
            client_name: data.clientName,
            service_name: serviceNameForNotification,
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
      
      if (error.message?.includes('CONFLITO_AGENDAMENTO')) {
        toast.error('Este horário já está ocupado. Por favor, escolha outro horário ou barbeiro.');
      } else if (error.code === '23505') {
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
