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
        .eq('phone', data.clientPhone)
        .maybeSingle();

      let clientId = existingClient?.id;

      if (!clientId) {
        // For now, we'll use a placeholder client_id
        // In a real app, you'd create a proper anonymous user or require login
        toast.error('Sistema de clientes em desenvolvimento. Por favor, faça login.');
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
