import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, User, Scissors, CheckCircle2, AlertCircle, QrCode, Bell } from 'lucide-react';

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
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [barberStatuses, setBarberStatuses] = useState<BarberStatus[]>([
    { id: '1', name: 'João Silva', status: 'occupied', currentClient: 'Pedro Souza', nextAppointment: '14:30' },
    { id: '2', name: 'Carlos Oliveira', status: 'free' },
    { id: '3', name: 'Rafael Costa', status: 'break' },
  ]);

  useEffect(() => {
    fetchTodayAppointments();
    
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
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
              {barberStatuses.map((barber) => (
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
              ))}
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