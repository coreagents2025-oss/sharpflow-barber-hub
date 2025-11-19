import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, User, Scissors, CheckCircle2, AlertCircle, Bell, TrendingUp, Users as UsersIcon, Calendar as CalendarIcon, Percent, DollarSign, UserCheck, UserX, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PaymentModal } from '@/components/PaymentModal';

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
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  barbers: {
    name: string;
  };
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
  useEffect(() => {
    if (authBarbershopId) {
      fetchTodayAppointments();
      fetchStats();
      fetchBarberStatuses();
      fetchPopularServices();
      fetchDailyPayments();
      
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
            fetchTodayAppointments();
            fetchStats();
            fetchBarberStatuses();
            fetchDailyPayments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authBarbershopId]);

  const fetchTodayAppointments = async () => {
    if (!authBarbershopId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Usar view unificada appointments_with_client
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
          services (name, duration_minutes, price),
          barbers (name)
        `)
        .eq('barbershop_id', authBarbershopId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
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
      fetchTodayAppointments();
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
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast.success('Presença confirmada!');
      fetchTodayAppointments();
    } catch (error: any) {
      console.error('Error confirming presence:', error);
      toast.error('Erro ao confirmar presença');
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
      fetchTodayAppointments();
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
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Todos os Agendamentos de Hoje</CardTitle>
                  <CardDescription>
                    {filteredAppointments.length} agendamento(s)
                  </CardDescription>
                </div>
                <div className="relative">
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 snap-x snap-mandatory">
                    <Button 
                      variant={filterStatus === 'all' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start min-w-[80px] text-xs sm:text-sm"
                    >
                      Todos
                    </Button>
                    <Button 
                      variant={filterStatus === 'scheduled' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('scheduled')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start min-w-[90px] text-xs sm:text-sm"
                    >
                      Pendentes
                    </Button>
                    <Button 
                      variant={filterStatus === 'in_progress' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('in_progress')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start min-w-[100px] text-xs sm:text-sm"
                    >
                      Atendendo
                    </Button>
                    <Button 
                      variant={filterStatus === 'completed' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setFilterStatus('completed')}
                      className="touch-target whitespace-nowrap flex-shrink-0 snap-start min-w-[100px] text-xs sm:text-sm"
                    >
                      Finalizados
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
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-xs sm:text-sm truncate">{apt.client_name || 'Cliente'}</span>
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
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Barbeiro: {apt.barbers?.name || 'N/A'}</span>
                            </div>
                          </div>
                          
                          {/* Botões de Ação */}
                          {(apt.status === 'scheduled' || apt.status === 'in_progress') && (
                            <div className="flex gap-2 flex-wrap pt-2 border-t">
                              {apt.status === 'scheduled' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleConfirmPresence(apt.id)}
                                    className="touch-target flex-1 sm:flex-none whitespace-nowrap text-xs"
                                  >
                                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Presente
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
                              {apt.status === 'in_progress' && (
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
                            {payment.payment_method === 'credit' && '💳 Crédito'}
                            {payment.payment_method === 'debit' && '💳 Débito'}
                            {payment.payment_method === 'pix' && '📱 PIX'}
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
            fetchTodayAppointments();
            fetchStats();
            fetchDailyPayments();
          }}
        />
      )}
    </div>
  );
};

export default PDV;