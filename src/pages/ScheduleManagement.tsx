import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Users, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Barber {
  id: string;
  user_id: string | null;
  barbershop_id: string;
  name: string | null;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  photo_url: string | null;
  is_available: boolean | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

const ScheduleManagement = () => {
  const { barbershopId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [workingBarbers, setWorkingBarbers] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '20:00',
  });
  const [saving, setSaving] = useState(false);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (barbershopId) {
      fetchBarbers();
    }
  }, [barbershopId]);

  useEffect(() => {
    if (barbershopId) {
      loadScheduleForDate(selectedDate);
    }
  }, [selectedDate, barbershopId]);

  const fetchBarbers = async () => {
    if (!barbershopId) {
      setError('Barbearia não encontrada. Verifique suas permissões.');
      return;
    }
    
    setLoadingBarbers(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError('Nenhum barbeiro cadastrado. Cadastre barbeiros antes de configurar a agenda.');
      }
      
      setBarbers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
      setError('Erro ao carregar barbeiros. Tente novamente.');
      toast.error('Erro ao carregar barbeiros');
    } finally {
      setLoadingBarbers(false);
    }
  };

  const loadScheduleForDate = async (date: Date) => {
    if (!barbershopId) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('daily_schedules')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('date', dateStr)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setWorkingHours({
          start: data.working_hours_start,
          end: data.working_hours_end,
        });
        setWorkingBarbers(data.barbers_working || []);
        setBlockedSlots(data.blocked_slots || []);
      } else {
        // Reset para padrões - inicia vazio para forçar seleção manual
        setWorkingHours({ start: '09:00', end: '20:00' });
        setWorkingBarbers([]);
        setBlockedSlots([]);
      }
    } catch (error: any) {
      console.error('Error loading schedule:', error);
    }
  };

  const toggleBarberWorking = async (barberId: string) => {
    const isWorking = workingBarbers.includes(barberId);
    
    if (isWorking) {
      setWorkingBarbers(workingBarbers.filter(id => id !== barberId));
    } else {
      setWorkingBarbers([...workingBarbers, barberId]);
    }
  };

  const toggleTimeSlot = (time: string) => {
    if (blockedSlots.includes(time)) {
      setBlockedSlots(blockedSlots.filter(t => t !== time));
    } else {
      setBlockedSlots([...blockedSlots, time]);
    }
  };

  const saveSchedule = async () => {
    if (!barbershopId) {
      toast.error('Erro: Barbearia não encontrada');
      return;
    }
    
    // Validação 1: Data não pode ser no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);
    
    if (selectedDay < today) {
      toast.error('Não é possível salvar configurações para datas passadas');
      return;
    }
    
    // Validação 2: Horário de início deve ser menor que fim
    if (workingHours.start >= workingHours.end) {
      toast.error('Horário de abertura deve ser antes do fechamento');
      return;
    }
    
    // Validação 3: Pelo menos 1 barbeiro deve estar trabalhando
    if (workingBarbers.length === 0) {
      toast.error('Selecione pelo menos um barbeiro para este dia');
      return;
    }
    
    // Validação 4: Verificar se barbeiros existem
    const validBarbers = workingBarbers.filter(id => 
      barbers.some(b => b.id === id)
    );
    
    if (validBarbers.length < workingBarbers.length) {
      console.warn('Alguns IDs de barbeiros não são válidos, removendo...');
      setWorkingBarbers(validBarbers);
      toast.error('Alguns barbeiros selecionados não são mais válidos');
      return;
    }
    
    setSaving(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    try {
      const { error } = await supabase
        .from('daily_schedules')
        .upsert({
          barbershop_id: barbershopId,
          date: dateStr,
          working_hours_start: workingHours.start,
          working_hours_end: workingHours.end,
          barbers_working: workingBarbers,
          blocked_slots: blockedSlots,
        }, {
          onConflict: 'barbershop_id,date'
        });
      
      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciar Agenda</h1>
          <p className="text-muted-foreground">Configure horários, barbeiros e disponibilidade</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar & Date Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Selecionar Data
              </CardTitle>
              <CardDescription>
                Escolha o dia para configurar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border w-full max-w-full pointer-events-auto"
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const checkDate = new Date(date);
                  checkDate.setHours(0, 0, 0, 0);
                  return checkDate < today;
                }}
              />
              
              <div className="mt-6 space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Horário de Abertura</Label>
                  <Select value={workingHours.start} onValueChange={(value) => setWorkingHours({ ...workingHours, start: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">Horário de Fechamento</Label>
                  <Select value={workingHours.end} onValueChange={(value) => setWorkingHours({ ...workingHours, end: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barbers Working */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Barbeiros do Dia
              </CardTitle>
              <CardDescription>
                {loadingBarbers 
                  ? 'Carregando barbeiros...' 
                  : barbers.length > 0 
                    ? `${barbers.length} barbeiro(s) disponível(is) - ${selectedDate.toLocaleDateString('pt-BR')}` 
                    : 'Nenhum barbeiro cadastrado'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {barbers.map((barber) => (
                    <div
                      key={barber.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {barber.name || 'Barbeiro sem nome'}
                          </span>
                          {barber.specialty && (
                            <span className="text-xs text-muted-foreground">
                              {barber.specialty}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Switch
                        checked={workingBarbers.includes(barber.id)}
                        onCheckedChange={() => toggleBarberWorking(barber.id)}
                      />
                    </div>
                  ))}
                  
                  {barbers.length === 0 && !loadingBarbers && (
                    <p className="text-center text-muted-foreground py-8">
                      Cadastre barbeiros na página de Gerenciar Barbeiros
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Horários Disponíveis
              </CardTitle>
              <CardDescription>
                Bloqueie horários específicos se necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {timeSlots.map((time) => {
                  const isBlocked = blockedSlots.includes(time);
                  const isWithinHours = time >= workingHours.start && time <= workingHours.end;
                  
                  return (
                    <Button
                      key={time}
                      variant={isBlocked ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => toggleTimeSlot(time)}
                      disabled={!isWithinHours}
                      className="relative touch-target text-xs sm:text-sm"
                    >
                      {time}
                      {isBlocked && <X className="h-3 w-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-destructive" />
                  Horário bloqueado (clique para liberar)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              setWorkingHours({ start: '09:00', end: '20:00' });
              setWorkingBarbers(barbers.filter(b => b.is_available).map(b => b.id));
              setBlockedSlots([]);
              toast.info('Configurações resetadas');
            }}
            disabled={saving}
          >
            Resetar
          </Button>
          <Button 
            onClick={saveSchedule} 
            className="bg-accent hover:bg-accent/90"
            disabled={saving || loadingBarbers || workingBarbers.length === 0}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ScheduleManagement;