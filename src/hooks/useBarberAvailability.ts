import { supabase } from '@/integrations/supabase/client';

export const checkBarberAvailability = async (
  barberId: string,
  startTime: Date,
  durationMinutes: number
): Promise<boolean> => {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);
  
  // Buscar agendamentos do barbeiro que podem conflitar
  // Busca 4h antes até o fim do novo agendamento
  const searchStart = new Date(startTime.getTime() - 4 * 60 * 60 * 1000);
  
  const { data: appointments } = await supabase
    .from('appointments')
    .select('scheduled_at, services(duration_minutes)')
    .eq('barber_id', barberId)
    .gte('scheduled_at', searchStart.toISOString())
    .lt('scheduled_at', endTime.toISOString())
    .neq('status', 'cancelled');
  
  if (!appointments || appointments.length === 0) return true;
  
  // Verificar overlaps
  for (const apt of appointments) {
    const aptStart = new Date(apt.scheduled_at);
    const aptDuration = (apt.services as any)?.duration_minutes || 30;
    const aptEnd = new Date(aptStart);
    aptEnd.setMinutes(aptStart.getMinutes() + aptDuration);
    
    // Overlap se:
    // 1. Novo começa durante agendamento existente
    // 2. Novo termina durante agendamento existente
    // 3. Novo engloba agendamento existente
    if (
      (startTime >= aptStart && startTime < aptEnd) ||
      (endTime > aptStart && endTime <= aptEnd) ||
      (startTime <= aptStart && endTime >= aptEnd)
    ) {
      return false;
    }
  }
  
  return true;
};
