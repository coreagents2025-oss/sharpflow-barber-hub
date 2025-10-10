import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, User, Scissors, CheckCircle2, AlertCircle, QrCode, Bell, TrendingUp, Users as UsersIcon, Calendar as CalendarIcon, Percent } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string;
    phone: string | null;
  };
  services: {
    name: string;
    duration_minutes: number;
  };
  barbers: {
    profiles: {
      full_name: string;
    };
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
  const { user } = useAuth();
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
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    fetchBarbershopId();
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchTodayAppointments();
      fetchStats();
      fetchBarberStatuses();
      fetchPopularServices();
      
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
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [barbershopId]);

  const fetchBarbershopId = async () => {
    try {
      const { data } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user?.id)
        .single();
      
      setBarbershopId(data?.barbershop_id || null);
    } catch (error) {
      console.error('Error fetching barbershop_id:', error);
    }
  };

  const fetchTodayAppointments = async () => {
    if (!barbershopId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:client_id (full_name, phone),
          services (name, duration_minutes),
          barbers (
            id,
            profiles:user_id (full_name)
          )
        `)
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const upcoming = (data || []).filter(apt => new Date(apt.scheduled_at) > now);
      
      setTodayAppointments(data as any || []);
      setUpcomingAppointments(upcoming.slice(0, 5) as any);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchStats = async () => {
    if (!barbershopId) return;
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Agendamentos de hoje
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString());
      
      // Faturamento do mês
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', firstDay.toISOString())
        .eq('status', 'completed');
      
      const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Clientes ativos (distintos no mês)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', firstDay.toISOString());
      
      const uniqueClients = new Set(appointments?.map(a => a.client_id)).size;
      
      setStats({
        todayAppointments: todayCount || 0,
        monthlyRevenue: revenue,
        activeClients: uniqueClients,
        occupancyRate: 0, // Pode ser calculado posteriormente
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBarberStatuses = async () => {
    if (!barbershopId) return;
    
    try {
      const now = new Date();
      const { data: barbers } = await supabase
        .from('barbers')
        .select(`
          id,
          is_available,
          user_id
        `)
        .eq('barbershop_id', barbershopId);
      
      if (!barbers) return;
      
      // Para cada barbeiro, buscar profile e agendamentos
      const statuses = await Promise.all(
        barbers.map(async (barber: any) => {
          // Buscar profile do barbeiro
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', barber.user_id)
            .single();
          
          // Buscar appointment em andamento
          const { data: current } = await supabase
            .from('appointments')
            .select('id, client_id')
            .eq('barber_id', barber.id)
            .eq('status', 'in_progress')
            .maybeSingle();
          
          let currentClientName: string | undefined;
          if (current) {
            const { data: clientProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', current.client_id)
              .single();
            currentClientName = clientProfile?.full_name;
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
            name: profile?.full_name || 'Sem nome',
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
    if (!barbershopId) return;
    
    try {
      const firstDay = new Date();
      firstDay.setDate(1);
      
      const { data } = await supabase
        .from('appointments')
        .select(`
          service_id,
          services (name)
        `)
        .eq('barbershop_id', barbershopId)
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
          
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            QR Code Check-in
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Agendamentos Hoje
              </CardDescription>
              <CardTitle className="text-3xl">{stats.todayAppointments}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Faturamento Mensal
              </CardDescription>
              <CardTitle className="text-3xl">
                R$ {stats.monthlyRevenue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Clientes Ativos
              </CardDescription>
              <CardTitle className="text-3xl">{stats.activeClients}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Taxa de Ocupação
              </CardDescription>
              <CardTitle className="text-3xl">{stats.occupancyRate}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
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
                            {apt.profiles?.full_name || 'Cliente'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <Scissors className="h-3 w-3 inline mr-1" />
                            {apt.services?.name || 'Serviço'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Barbeiro: {apt.barbers?.profiles?.full_name || 'N/A'}
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

        {/* All Today's Appointments */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Todos os Agendamentos de Hoje
            </CardTitle>
            <CardDescription>
              {todayAppointments.length} agendamentos no total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-lg border bg-card text-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">
                      {new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Badge variant="outline" className={getStatusColor(apt.status)}>
                      {apt.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {apt.profiles?.full_name || 'Cliente'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {apt.services?.name || 'Serviço'} • {apt.barbers?.profiles?.full_name || 'Barbeiro'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PDV;