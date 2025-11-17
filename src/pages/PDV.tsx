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
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id, name, is_available')
        .eq('barbershop_id', authBarbershopId);
      
      if (!barbers) return;
      
      // Para cada barbeiro, buscar agendamentos
      const statuses = await Promise.all(
        barbers.map(async (barber: any) => {
          // Buscar appointment em andamento usando view unificada
          const { data: current } = await supabase
            .from('appointments_with_client')
            .select('id, unified_client_id, client_name')
            .eq('barber_id', barber.id)
            .eq('status', 'in_progress')
            .maybeSingle();
          
          let currentClientName: string | undefined;
          if (current) {
            currentClientName = current.client_name || 'Cliente';
          }
          
          // Buscar próximo agendamento
          const { data: next } = await supabase
            .from('appointments')
            .select('scheduled_at')
            .eq('barber_id', barber.id)
            .eq('status', 'scheduled')
            .gte('scheduled_at', now.toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          return {
            id: barber.id,
            name: barber.name || 'Barbeiro sem nome',
            status: current ? 'occupied' : (barber.is_available ? 'free' : 'break'),
            currentClient: currentClientName,
            nextAppointment: next ? new Date(next.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
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
                barberStatuses.map((barber) => (
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
                    <div className="text-sm text-muted-foreground mt-2">
                      <Scissors className="h-3 w-3 inline mr-1" />
                      Atendendo: {barber.currentClient}
                    </div>
                  )}
                  
                  {barber.nextAppointment && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Próximo: {barber.nextAppointment}
                    </div>
                  )}
                </div>
              ))
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

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
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
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                  <Button 
                    variant={filterStatus === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                    className="touch-target whitespace-nowrap"
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filterStatus === 'scheduled' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterStatus('scheduled')}
                    className="touch-target whitespace-nowrap"
                  >
                    Pendentes
                  </Button>
                  <Button 
                    variant={filterStatus === 'in_progress' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterStatus('in_progress')}
                    className="touch-target whitespace-nowrap"
                  >
                    Atendendo
                  </Button>
                  <Button 
                    variant={filterStatus === 'completed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setFilterStatus('completed')}
                    className="touch-target whitespace-nowrap"
                  >
                    Finalizados
                  </Button>
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
                  filteredAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 sm:p-4 rounded-lg border bg-card"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex flex-wrap items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{apt.client_name || 'Cliente'}</span>
                            {apt.client_phone && (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                • {apt.client_phone}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Scissors className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.services?.name || 'Serviço'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{apt.barbers?.name || 'N/A'}</span>
                            </div>
                            <Badge className={getStatusColor(apt.status)}>
                              {getStatusLabel(apt.status)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Botões de Ação */}
                        <div className="flex sm:flex-col gap-2 flex-wrap w-full sm:w-auto">
                          {apt.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleConfirmPresence(apt.id)}
                                className="touch-target flex-1 sm:flex-none whitespace-nowrap"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Presente
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleNoShow(apt.id)}
                                className="touch-target flex-1 sm:flex-none whitespace-nowrap"
                              >
                                <UserX className="h-4 w-4 mr-1" />
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
                              className="touch-target w-full sm:w-auto whitespace-nowrap"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Finalizar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Pagamentos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Pagamentos Hoje</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Total: R$ {dailyTotal.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dailyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pagamento hoje</p>
                </div>
              ) : (
                dailyPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-2.5 sm:p-3 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                        R$ {Number(payment.amount).toFixed(2)}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize whitespace-nowrap flex-shrink-0">
                        {payment.payment_method === 'cash' && 'Dinheiro'}
                        {payment.payment_method === 'pix' && 'Pix'}
                        {payment.payment_method === 'debit' && 'Débito'}
                        {payment.payment_method === 'credit' && 'Crédito'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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