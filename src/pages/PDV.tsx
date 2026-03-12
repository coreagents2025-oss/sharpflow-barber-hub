import { useState, useEffect } from 'react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, User, Scissors, CheckCircle2, AlertCircle, Bell, TrendingUp, Users as UsersIcon, Calendar as CalendarIcon, Percent, DollarSign, UserCheck, UserX, CreditCard, RefreshCw, ChevronLeft, ChevronRight, XCircle, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PaymentModal } from '@/components/PaymentModal';
import { SubscriptionBadgeInline } from '@/components/subscriptions/SubscriptionBadgeInline';
import { cn } from '@/lib/utils';

interface AppointmentService {
  service_id: string;
  position: number;
  duration_minutes: number;
  price: number;
  services: { name: string };
}

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  unified_client_id: string;
  client_type: 'lead' | 'client';
  client_name: string;
  client_phone: string;
  barbershop_id: string;
  barber_id?: string;
  total_duration_minutes?: number;
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  barbers: {
    name: string;
  };
  appointment_services?: AppointmentService[];
}

interface BarberStatus {
  id: string;
  name: string;
  status: 'free' | 'occupied' | 'break';
  currentClient?: string;
  nextAppointment?: string;
  nextAppointments?: Array<{ time: string; client: string }>; // Lista dos próximos 2-3 agendamentos
  currentAppointmentId?: string;
  appointmentStartTime?: string;
}

const PDV = () => {
  const { user, barbershopId: authBarbershopId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [barberStatuses, setBarberStatuses] = useState<BarberStatus[]>([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    monthlyRevenue: 0,
    activeClients: 0,
    occupancyRate: 0,
  });
  const [popularServices, setPopularServices] = useState<Array<{ name: string; count: number }>>([]);
  const [dailyPayments, setDailyPayments] = useState<any[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Cancel/Reschedule state
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingPdv, setCancellingPdv] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
  const [rescheduleDatePickerOpen, setRescheduleDatePickerOpen] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return `Hoje, ${format(date, "d MMM", { locale: ptBR })}`;
    if (isYesterday(date)) return `Ontem, ${format(date, "d MMM", { locale: ptBR })}`;
    if (isTomorrow(date)) return `Amanhã, ${format(date, "d MMM", { locale: ptBR })}`;
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    setFilterStatus('all');
  };

  const refreshAll = () => {
    fetchAppointmentsForDate(selectedDate);
    fetchStats();
    fetchBarberStatuses();
    fetchPopularServices();
    fetchDailyPayments();
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (authBarbershopId) {
      fetchAppointmentsForDate(selectedDate);
      fetchStats();
      fetchBarberStatuses();
      fetchPopularServices();
      fetchDailyPayments();
      setLastUpdated(new Date());
      
      // Real-time updates
      const channel = supabase
        .channel('pdv-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments'
          },
          () => {
            fetchAppointmentsForDate(selectedDate);
            fetchBarberStatuses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authBarbershopId]);

  useEffect(() => {
    if (authBarbershopId) {
      fetchAppointmentsForDate(selectedDate);
      setFilterStatus('all');
    }
  }, [selectedDate, authBarbershopId]);

  const fetchAppointmentsForDate = async (date: Date) => {
    if (!authBarbershopId) return;
    
    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const { data: appointmentsData, error } = await supabase
        .from('appointments_with_client')
        .select(`
          id,
          scheduled_at,
          status,
          notes,
          unified_client_id,
          client_name,
          client_phone,
          client_type,
          barbershop_id,
          barber_id,
          total_duration_minutes,
          services (name, duration_minutes, price),
          barbers (name),
          appointment_services (service_id, position, duration_minutes, price, services(name))
        `)
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const upcoming = (appointmentsData || []).filter(apt => new Date(apt.scheduled_at) > now);
      
      setTodayAppointments(appointmentsData as any || []);
      setUpcomingAppointments(upcoming.slice(0, 5) as any);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    }
  };

  const fetchStats = async () => {
    if (!authBarbershopId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Agendamentos de hoje
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString());
      
      // Faturamento do mês
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('barbershop_id', authBarbershopId)
        .gte('created_at', firstDay.toISOString())
        .eq('status', 'completed');
      
      const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Clientes ativos (distintos no mês) - incluindo leads
      const { data: appointments } = await supabase
        .from('appointments_with_client')
        .select('unified_client_id')
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', firstDay.toISOString());
      
      const uniqueClients = new Set(
        appointments?.map(a => a.unified_client_id).filter(Boolean)
      ).size;

      // Calcular taxa de ocupação
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id')
        .eq('barbershop_id', authBarbershopId);

      const workingHours = 9; // 9h às 18h = 9 horas
      const slotsPerHour = 2; // média de 30 min por slot
      const totalSlots = (barbers?.length || 0) * workingHours * slotsPerHour;
      
      const { count: occupiedSlots } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .in('status', ['scheduled', 'in_progress', 'completed']);

      const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots || 0) / totalSlots * 100) : 0;
      
      setStats({
        todayAppointments: todayCount || 0,
        monthlyRevenue: revenue,
        activeClients: uniqueClients,
        occupancyRate,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBarberStatuses = async () => {
    if (!authBarbershopId) return;
    
    try {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id, name, is_available')
        .eq('barbershop_id', authBarbershopId);
      
      if (!barbers) return;
      
      // Para cada barbeiro, buscar agendamentos
      const statuses = await Promise.all(
        barbers.map(async (barber: any) => {
          // Buscar appointment em andamento usando view unificada
          // FILTRAR agendamentos in_progress antigos (mais de 3 horas)
          const { data: current } = await supabase
            .from('appointments_with_client')
            .select('id, unified_client_id, client_name, scheduled_at')
            .eq('barber_id', barber.id)
            .eq('status', 'in_progress')
            .gte('scheduled_at', threeHoursAgo.toISOString())
            .maybeSingle();
          
          let currentClientName: string | undefined;
          let currentAppointmentId: string | undefined;
          let appointmentStartTime: string | undefined;
          
          if (current) {
            currentClientName = current.client_name || 'Cliente';
            currentAppointmentId = current.id;
            appointmentStartTime = current.scheduled_at;
          }
          
          // Buscar próximo agendamento (apenas do DIA DE HOJE)
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

          const { data: next } = await supabase
            .from('appointments')
            .select('scheduled_at')
            .eq('barber_id', barber.id)
            .eq('barbershop_id', authBarbershopId) // ✅ Filtrar por barbearia
            .eq('status', 'scheduled')
            .gte('scheduled_at', now.toISOString())
            .lte('scheduled_at', endOfToday.toISOString()) // ✅ Apenas hoje
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          // Buscar próximos 3 agendamentos usando view unificada
          const { data: nextAppointments } = await supabase
            .from('appointments_with_client')
            .select('scheduled_at, client_name')
            .eq('barber_id', barber.id)
            .eq('barbershop_id', authBarbershopId)
            .eq('status', 'scheduled')
            .gte('scheduled_at', now.toISOString())
            .lte('scheduled_at', endOfToday.toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(3);
          
          return {
            id: barber.id,
            name: barber.name || 'Barbeiro sem nome',
            status: current ? 'occupied' : (barber.is_available ? 'free' : 'break'),
            currentClient: currentClientName,
            currentAppointmentId,
            appointmentStartTime,
            nextAppointment: next ? new Date(next.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
            nextAppointments: nextAppointments?.map(apt => ({
              time: new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              client: apt.client_name || 'Cliente'
            })),
          } as BarberStatus;
        })
      );
      
      setBarberStatuses(statuses);
    } catch (error: any) {
      console.error('Error fetching barber statuses:', error);
    }
  };

  const fetchPopularServices = async () => {
    if (!authBarbershopId) return;
    
    try {
      const firstDay = new Date();
      firstDay.setDate(1);
      
      const { data } = await supabase
        .from('appointments')
        .select(`
          service_id,
          services (name)
        `)
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', firstDay.toISOString());
      
      // Contar por serviço
      const counts = data?.reduce((acc: Record<string, number>, apt: any) => {
        const name = apt.services?.name || 'Desconhecido';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      
      // Top 5
      const sorted = Object.entries(counts || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count: count as number }));
      
      setPopularServices(sorted);
    } catch (error: any) {
      console.error('Error fetching popular services:', error);
    }
  };

  const handleResetBarberStatus = async (appointmentId: string, barberName: string) => {
    if (!confirm(`Deseja forçar a conclusão do atendimento em andamento de ${barberName}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          notes: 'Atendimento finalizado manualmente pelo sistema (resetado via PDV)',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Status do barbeiro resetado com sucesso');
      fetchBarberStatuses();
      fetchAppointmentsForDate(selectedDate);
    } catch (error: any) {
      toast.error('Erro ao resetar status: ' + error.message);
    }
  };

  const getAppointmentDuration = (scheduledAt: string) => {
    const start = new Date(scheduledAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours: diffHours, minutes: diffMinutes, isLong: diffHours >= 2 };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getBarberStatusColor = (status: string) => {
    switch (status) {
      case 'free':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-red-500';
      case 'break':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const fetchDailyPayments = async () => {
    if (!authBarbershopId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('barbershop_id', authBarbershopId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      setDailyPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleConfirmPresence = async (appointmentId: string) => {
    if (confirmingId) return;
    setConfirmingId(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast.success('Presença confirmada!');
      fetchAppointmentsForDate(selectedDate);
    } catch (error: any) {
      console.error('Error confirming presence:', error);
      toast.error('Erro ao confirmar presença');
    } finally {
      setTimeout(() => setConfirmingId(null), 1500);
    }
  };

  const handleNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          notes: 'Cliente não compareceu'
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast.success('Cliente marcado como faltou');
      fetchAppointmentsForDate(selectedDate);
    } catch (error: any) {
      console.error('Error marking no-show:', error);
      toast.error('Erro ao marcar falta');
    }
  };

  const handleOpenPaymentModal = (appointment: any) => {
    // Passar dados unificados para o modal
    setSelectedAppointment({
      ...appointment,
      client: {
        full_name: appointment.client_name || 'Cliente',
      },
      service: appointment.services,
    });
    setPaymentModalOpen(true);
  };

  const handleCancelAppointmentPdv = async () => {
    if (!cancelConfirmId) return;
    setCancellingPdv(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', notes: 'Cancelado pelo barbeiro/admin' })
        .eq('id', cancelConfirmId);
      if (error) throw error;
      toast.success('Agendamento cancelado com sucesso.');
      setCancelConfirmOpen(false);
      setCancelConfirmId(null);
      fetchAppointmentsForDate(selectedDate);
      fetchBarberStatuses();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar agendamento');
    } finally {
      setCancellingPdv(false);
    }
  };


  const loadAvailableSlotsForBarber = async (appt: Appointment, date: Date) => {
    if (!appt || !authBarbershopId) return;
    setLoadingSlots(true);
    setRescheduleTime('');
    const duration = appt.services?.duration_minutes || 30;

    // Fetch all existing appointments for this barber on this date (excluding current)
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [existingResult, scheduleResult, barbershopResult] = await Promise.all([
      supabase
        .from('appointments')
        .select('scheduled_at, services(duration_minutes)')
        .eq('barber_id', appt.barber_id || '')
        .neq('id', appt.id)
        .not('status', 'in', '(cancelled,no_show,completed)')
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString()),
      supabase
        .from('daily_schedules')
        .select('working_hours_start, working_hours_end, blocked_slots')
        .eq('barbershop_id', authBarbershopId)
        .eq('date', date.toISOString().split('T')[0])
        .maybeSingle(),
      supabase
        .from('public_barbershops')
        .select('operating_hours')
        .eq('id', authBarbershopId)
        .maybeSingle(),
    ]);

    // Determine working hours from daily_schedule → operating_hours → fallback
    let startHour = 9;
    let endHour = 18;
    const schedule = scheduleResult.data;

    if (schedule?.working_hours_start && schedule?.working_hours_end) {
      startHour = parseInt(schedule.working_hours_start.split(':')[0]);
      endHour = parseInt(schedule.working_hours_end.split(':')[0]);
    } else {
      const opHours = barbershopResult.data?.operating_hours as any;
      if (opHours) {
        const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = DAY_MAP[date.getDay()];
        const dayHours = opHours[dayName];
        if (dayHours?.open && dayHours?.close) {
          startHour = parseInt(dayHours.open.split(':')[0]);
          endHour = parseInt(dayHours.close.split(':')[0]);
        }
      }
    }

    const blockedSlots: string[] = schedule?.blocked_slots || [];
    const slots: string[] = [];
    const now = new Date();

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (blockedSlots.includes(timeStr)) continue;

        const slotDate = new Date(date);
        slotDate.setHours(h, m, 0, 0);
        if (slotDate <= now) continue;

        const slotEnd = new Date(slotDate.getTime() + duration * 60000);
        let conflict = false;

        for (const ex of existingResult.data || []) {
          const exStart = new Date(ex.scheduled_at);
          const exDur = (ex.services as any)?.duration_minutes || 30;
          const exEnd = new Date(exStart.getTime() + exDur * 60000);
          if (slotDate < exEnd && slotEnd > exStart) { conflict = true; break; }
        }

        if (!conflict) slots.push(timeStr);
      }
    }

    setAvailableSlots(slots);
    setLoadingSlots(false);
  };

  const handleOpenReschedule = async (appt: Appointment) => {
    setRescheduleAppt(appt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow);
    setRescheduleOpen(true);
    await loadAvailableSlotsForBarber(appt, tomorrow);
  };

  const handleReschedule = async () => {
    if (!rescheduleAppt || !rescheduleTime) return;
    setRescheduling(true);
    try {
      const [h, m] = rescheduleTime.split(':').map(Number);
      const newDate = new Date(rescheduleDate);
      newDate.setHours(h, m, 0, 0);

      const { error } = await supabase
        .from('appointments')
        .update({ scheduled_at: newDate.toISOString() })
        .eq('id', rescheduleAppt.id);

      if (error) throw error;
      toast.success('Agendamento reagendado com sucesso!');
      setRescheduleOpen(false);
      setRescheduleAppt(null);
      fetchAppointmentsForDate(selectedDate);
      fetchBarberStatuses();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reagendar');
    } finally {
      setRescheduling(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Aguardando';
      case 'in_progress': return 'Atendendo';
      case 'completed': return 'Pago';
      case 'cancelled': return 'Faltou';
      default: return status;
    }
  };

  const filteredAppointments = todayAppointments.filter(apt => {
    if (filterStatus === 'all') return true;
    return apt.status === filterStatus;
  });

  const dailyTotal = dailyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Contagens por status para os filtros
  const statusCounts = {
    all: todayAppointments.length,
    scheduled: todayAppointments.filter(a => a.status === 'scheduled').length,
    in_progress: todayAppointments.filter(a => a.status === 'in_progress').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">PDV - Painel Operacional</h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2 p-3 sm:p-4 lg:p-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <DollarSign className="h-4 w-4" />
                Faturamento Hoje
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                R$ {dailyTotal.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2 p-3 sm:p-4 lg:p-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <CalendarIcon className="h-4 w-4" />
                Agendamentos Hoje
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{stats.todayAppointments}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-4 lg:p-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <TrendingUp className="h-4 w-4" />
                Faturamento Mensal
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">
                R$ {stats.monthlyRevenue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-4 lg:p-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <UsersIcon className="h-4 w-4" />
                Clientes Ativos
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{stats.activeClients}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 p-3 sm:p-4 lg:p-6">
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Percent className="h-4 w-4" />
                Taxa de Ocupação
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{stats.occupancyRate}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Barber Status */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Status dos Barbeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {barberStatuses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum barbeiro cadastrado</p>
                </div>
              ) : (
                barberStatuses.map((barber) => {
                  const duration = barber.appointmentStartTime ? getAppointmentDuration(barber.appointmentStartTime) : null;
                  const isLongAppointment = duration?.isLong;
                  
                  return (
                    <div
                      key={barber.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${getBarberStatusColor(barber.status)} animate-pulse`} />
                          <span className="font-medium">{barber.name}</span>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {barber.status === 'free' && 'Livre'}
                          {barber.status === 'occupied' && 'Ocupado'}
                          {barber.status === 'break' && 'Pausa'}
                        </Badge>
                      </div>
                      
                      {barber.currentClient && (
                        <>
                          <div className="text-sm text-muted-foreground mt-2">
                            <Scissors className="h-3 w-3 inline mr-1" />
                            Atendendo: {barber.currentClient}
                          </div>
                          {isLongAppointment && duration && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Atendimento longo: {duration.hours}h {duration.minutes}min
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Lista de próximos agendamentos */}
                      {barber.nextAppointments && barber.nextAppointments.length > 0 ? (
                        <div className="mt-3 space-y-1.5 border-t pt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1.5">
                            Próximos agendamentos hoje:
                          </div>
                          {barber.nextAppointments.map((apt, idx) => (
                            <div key={idx} className="text-sm flex items-center justify-between text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {apt.time}
                              </span>
                              <span className="text-xs truncate ml-2 max-w-[120px]" title={apt.client}>
                                {apt.client}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : !barber.currentClient && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          Sem agendamentos hoje
                        </div>
                      )}

                      {isLongAppointment && barber.currentAppointmentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 text-xs"
                          onClick={() => handleResetBarberStatus(barber.currentAppointmentId!, barber.name)}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Resetar Status
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                Próximos Agendamentos
              </CardTitle>
              <CardDescription>
                Clientes que chegam em breve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agendamento próximo</p>
                  </div>
                ) : (
                  upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {apt.client_name || 'Cliente'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <Scissors className="h-3 w-3 inline mr-1" />
                            {apt.services?.name || 'Serviço'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Barbeiro: {apt.barbers?.name || 'N/A'}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-lg text-accent">
                            {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <Badge className={getStatusColor(apt.status)}>
                            {apt.status === 'scheduled' && 'Agendado'}
                            {apt.status === 'in_progress' && 'Em andamento'}
                            {apt.status === 'completed' && 'Concluído'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Popular Services */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-accent" />
                Serviços Populares
              </CardTitle>
              <CardDescription>
                Mais solicitados neste mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum serviço registrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {popularServices.map((service, index) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                          {index + 1}
                        </div>
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <Badge variant="secondary">{service.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
          {/* All Today's Appointments */}
          <Card className="lg:col-span-2 min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base lg:text-lg">
                    Agendamentos — {getDateLabel(selectedDate)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {filteredAppointments.length} agendamento(s)
                  </CardDescription>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => navigateDate(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-left font-normal h-8 text-xs sm:text-sm gap-1.5"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {getDateLabel(selectedDate)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => navigateDate(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isToday(selectedDate) && (
                    <Button variant="secondary" size="sm" className="h-8 text-xs flex-shrink-0" onClick={() => { setSelectedDate(new Date()); setFilterStatus('all'); }}>
                      Hoje
                    </Button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="relative min-w-0 w-full">
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory -mx-1 px-1">
                    <Button 
                      variant={filterStatus === 'all' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
                    >
                      Todos ({statusCounts.all})
                    </Button>
                    <Button 
                      variant={filterStatus === 'scheduled' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('scheduled')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
                    >
                      Pendentes ({statusCounts.scheduled})
                    </Button>
                    <Button 
                      variant={filterStatus === 'in_progress' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('in_progress')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
                    >
                      Atendendo ({statusCounts.in_progress})
                    </Button>
                    <Button 
                      variant={filterStatus === 'completed' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('completed')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8"
                    >
                      Finalizados ({statusCounts.completed})
                    </Button>
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agendamento nesta categoria</p>
                  </div>
                ) : (
                  filteredAppointments.map((apt) => {
                    const duration = apt.status === 'in_progress' ? getAppointmentDuration(apt.scheduled_at) : null;
                    
                    return (
                      <div
                        key={apt.id}
                        className="p-3 sm:p-4 rounded-lg border bg-card"
                      >
                        <div className="flex flex-col gap-3">
                          {/* Header: Nome e Telefone */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">{apt.client_name || 'Cliente'}</span>
                                {/* Badge de Assinante - será renderizado via componente separado */}
                                <SubscriptionBadgeInline 
                                  leadId={apt.client_type === 'lead' ? apt.unified_client_id : undefined} 
                                />
                              </div>
                              {apt.client_phone && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground truncate block">
                                  {apt.client_phone}
                                </span>
                              )}
                            </div>
                            
                            {/* Horário e Status - Inline Mobile */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="font-bold text-sm sm:text-base text-accent whitespace-nowrap">
                                {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                              <Badge className={`${getStatusColor(apt.status)} text-[10px] sm:text-xs`}>
                                {getStatusLabel(apt.status)}
                              </Badge>
                            </div>
                          </div>

                          {/* Alerta de atendimento longo */}
                          {duration?.isLong && (
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-[10px] sm:text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Em andamento há {duration.hours}h {duration.minutes}min
                              </Badge>
                            </div>
                          )}

                          {/* Info: Serviço e Barbeiro */}
                          <div className="grid grid-cols-1 gap-1 text-[10px] sm:text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Scissors className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.services?.name || 'Serviço'}</span>
                              {apt.services?.price && (
                                <span className="font-medium text-accent ml-1">
                                  R$ {apt.services.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Barbeiro: {apt.barbers?.name || 'N/A'}</span>
                            </div>
                          </div>
                          
                          {/* Botões de Ação — para hoje e datas futuras */}
                          {(apt.status === 'scheduled' || apt.status === 'in_progress') && (
                            <div className="flex gap-2 flex-wrap pt-2 border-t">
                              {apt.status === 'scheduled' && isToday(selectedDate) && (
                                <>
                                   <Button 
                                     size="sm" 
                                     variant="default"
                                     onClick={() => handleConfirmPresence(apt.id)}
                                     disabled={confirmingId === apt.id}
                                     className="touch-target flex-1 sm:flex-none whitespace-nowrap text-xs"
                                   >
                                     {confirmingId === apt.id ? (
                                       <>
                                         <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-primary" />
                                         Confirmado!
                                       </>
                                     ) : (
                                       <>
                                         <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                         Presente
                                       </>
                                     )}
                                   </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleNoShow(apt.id)}
                                    className="touch-target flex-1 sm:flex-none whitespace-nowrap text-xs"
                                  >
                                    <UserX className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Faltou
                                  </Button>
                                </>
                              )}
                              {apt.status === 'in_progress' && isToday(selectedDate) && (
                                <Button 
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleOpenPaymentModal({
                                    id: apt.id,
                                    unified_client_id: apt.unified_client_id,
                                    client_type: apt.client_type,
                                    barbershop_id: apt.barbershop_id,
                                    services: {
                                      name: apt.services?.name || 'Serviço',
                                      price: apt.services?.price || 50,
                                    },
                                    client_name: apt.client_name,
                                  })}
                                  className="touch-target w-full whitespace-nowrap text-xs"
                                >
                                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Finalizar
                                </Button>
                              )}
                              {apt.status === 'scheduled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReschedule(apt)}
                                  className="touch-target flex-1 sm:flex-none whitespace-nowrap text-xs text-muted-foreground"
                                >
                                  <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Reagendar
                                </Button>
                              )}
                              {(apt.status === 'scheduled' || apt.status === 'in_progress') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setCancelConfirmId(apt.id); setCancelConfirmOpen(true); }}
                                  className="touch-target flex-1 sm:flex-none whitespace-nowrap text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {apt.notes && (
                            <div className="text-[10px] sm:text-xs text-muted-foreground italic pt-2 border-t">
                              {apt.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Pagamentos */}
          <Card className="lg:col-span-1 min-w-0">
            <CardHeader className="pb-3 p-3 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
                  <span className="leading-tight">Pagamentos<br className="sm:hidden" /> Hoje</span>
                </CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm font-semibold text-accent mt-2">
                Total: R$ {dailyTotal.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 sm:px-6 sm:pb-6">
              {dailyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pagamento hoje</p>
                </div>
              ) : (
                dailyPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-2 sm:p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      {/* Info do Cliente/Serviço */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">
                          {payment.appointments?.client_name || 'Cliente'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {payment.appointments?.services?.name || 'Serviço'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge 
                            variant="secondary" 
                            className="text-[9px] sm:text-xs px-1 py-0 h-auto"
                          >
                            {payment.payment_method === 'cash' && '💵 Dinheiro'}
                            {payment.payment_method === 'credit_card' && '💳 Crédito'}
                            {payment.payment_method === 'debit_card' && '💳 Débito'}
                            {payment.payment_method === 'pix' && '📱 PIX'}
                            {payment.payment_method === 'subscription' && '⭐ Assinatura'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Valor e Horário */}
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-sm sm:text-base text-accent">
                          R$ {Number(payment.amount).toFixed(2)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap sm:whitespace-normal">
                          {new Date(payment.created_at).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Payment Modal */}
      {selectedAppointment && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSuccess={() => {
            fetchAppointmentsForDate(selectedDate);
            fetchStats();
            fetchDailyPayments();
          }}
        />
      )}

      {/* Cancel Appointment Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={(o) => { if (!cancellingPdv) { setCancelConfirmOpen(o); if (!o) setCancelConfirmId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancelar agendamento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento? O cliente será removido da agenda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelConfirmOpen(false); setCancelConfirmId(null); }} disabled={cancellingPdv}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelAppointmentPdv} disabled={cancellingPdv}>
              {cancellingPdv ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={(o) => { if (!rescheduling) { setRescheduleOpen(o); if (!o) setRescheduleAppt(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reagendar agendamento
            </DialogTitle>
            <DialogDescription>
              {rescheduleAppt && (
                <span>
                  <strong>{rescheduleAppt.client_name}</strong> — {rescheduleAppt.services?.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova data</label>
              <Popover open={rescheduleDatePickerOpen} onOpenChange={setRescheduleDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2 font-normal">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {format(rescheduleDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={async (date) => {
                      if (date && rescheduleAppt) {
                        setRescheduleDate(date);
                        setRescheduleDatePickerOpen(false);
                        await loadAvailableSlotsForBarber(rescheduleAppt, date);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo horário</label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">Carregando horários disponíveis...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-destructive">Nenhum horário disponível nesta data.</p>
              ) : (
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRescheduleOpen(false); setRescheduleAppt(null); }} disabled={rescheduling}>
              Cancelar
            </Button>
            <Button onClick={handleReschedule} disabled={!rescheduleTime || rescheduling || loadingSlots}>
              {rescheduling ? 'Salvando...' : 'Confirmar reagendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDV;