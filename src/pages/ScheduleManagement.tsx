import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Users, X, Info } from 'lucide-react';

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

const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  monday:    'Segunda-feira',
  tuesday:   'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday:  'Quinta-feira',
  friday:    'Sexta-feira',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

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
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '18:00' });
  const [saving, setSaving] = useState(false);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Weekly base hours from barbershop.operating_hours
  const [baseHours, setBaseHours] = useState<{ open: string; close: string } | null | undefined>(undefined);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchBarbers();
      fetchBaseHours();
    }
  }, [barbershopId]);

  useEffect(() => {
    if (barbershopId) {
      loadScheduleForDate(selectedDate);
    }
  }, [selectedDate, barbershopId]);

  const fetchBaseHours = async () => {
    if (!barbershopId) return;
    try {
      const { data } = await supabase
        .from('barbershops')
        .select('operating_hours')
        .eq('id', barbershopId)
        .single();
      if (data?.operating_hours) {
        // stored as JSONB, cast properly
        const oh = data.operating_hours as any;
        const dayName = DAY_MAP[new Date().getDay()];
        setBaseHours(oh[dayName] ?? null);
      }
    } catch (e) {
      console.error('Error fetching base hours:', e);
    }
  };

  const getBaseHoursForDate = (date: Date, oh: any): { open: string; close: string } | null => {
    const dayName = DAY_MAP[date.getDay()];
    return oh?.[dayName] ?? null;
  };

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
      // Fetch operating_hours for the fallback
      const { data: bsData } = await supabase
        .from('barbershops')
        .select('operating_hours')
        .eq('id', barbershopId)
        .single();

      const oh = bsData?.operating_hours as any;
      const dayBaseHours = getBaseHoursForDate(date, oh);
      setBaseHours(dayBaseHours);

      const { data, error } = await supabase
        .from('daily_schedules')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Override exists for this date
        setHasOverride(true);
        setWorkingHours({
          start: data.working_hours_start,
          end: data.working_hours_end,
        });
        setWorkingBarbers(data.barbers_working || []);
        setBlockedSlots(data.blocked_slots || []);
      } else {
        // No override — use weekly base as default
        setHasOverride(false);
        setWorkingHours({
          start: dayBaseHours?.open ?? '09:00',
          end: dayBaseHours?.close ?? '18:00',
        });
        setWorkingBarbers([]);
        setBlockedSlots([]);
      }
    } catch (error: any) {
      console.error('Error loading schedule:', error);
    }
  };

  const toggleBarberWorking = (barberId: string) => {
    setWorkingBarbers((prev) =>
      prev.includes(barberId) ? prev.filter((id) => id !== barberId) : [...prev, barberId]
    );
  };

  const toggleTimeSlot = (time: string) => {
    setBlockedSlots((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const saveSchedule = async () => {
    if (!barbershopId) {
      toast.error('Erro: Barbearia não encontrada');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);
    if (selectedDay < today) {
      toast.error('Não é possível salvar configurações para datas passadas');
      return;
    }
    if (workingHours.start >= workingHours.end) {
      toast.error('Horário de abertura deve ser antes do fechamento');
      return;
    }
    if (workingBarbers.length === 0) {
      toast.error('Selecione pelo menos um barbeiro para este dia');
      return;
    }
    const validBarbers = workingBarbers.filter((id) => barbers.some((b) => b.id === id));
    if (validBarbers.length < workingBarbers.length) {
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
        }, { onConflict: 'barbershop_id,date' });
      if (error) throw error;
      setHasOverride(true);
      toast.success('Configurações salvas para este dia!');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const clearOverride = async () => {
    if (!barbershopId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      await supabase
        .from('daily_schedules')
        .delete()
        .eq('barbershop_id', barbershopId)
        .eq('date', dateStr);
      setHasOverride(false);
      setWorkingHours({ start: baseHours?.open ?? '09:00', end: baseHours?.close ?? '18:00' });
      setWorkingBarbers([]);
      setBlockedSlots([]);
      toast.success('Exceção removida. Horário padrão restaurado.');
    } catch (e) {
      toast.error('Erro ao remover exceção');
    }
  };

  const dayName = DAY_MAP[selectedDate.getDay()];
  const dayLabel = DAY_LABELS[dayName];
  const baseClosed = baseHours === null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciar Agenda</h1>
          <p className="text-muted-foreground">Crie exceções para dias específicos — os demais seguem o horário padrão semanal</p>
        </div>

        {/* Weekly base info banner */}
        <div className={`mb-6 p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3 ${
          baseClosed
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-accent/5 border-accent/20'
        }`}>
          <Info className={`h-5 w-5 shrink-0 ${baseClosed ? 'text-destructive' : 'text-accent'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Horário padrão para <strong>{dayLabel}</strong>:{' '}
              {baseHours === undefined
                ? 'Carregando...'
                : baseClosed
                  ? 'Fechado (dia não configurado)'
                  : `${baseHours.open} – ${baseHours.close}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasOverride
                ? '⚠️ Este dia tem uma configuração especial ativa (substituindo o padrão)'
                : 'Salvar abaixo criará uma exceção para esta data específica'}
            </p>
          </div>
          {hasOverride && (
            <Button variant="outline" size="sm" onClick={clearOverride} className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5">
              <X className="h-3.5 w-3.5 mr-1" />
              Remover exceção
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar & Date Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Selecionar Data
              </CardTitle>
              <CardDescription>Escolha o dia para criar uma exceção</CardDescription>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    ? `${barbers.length} barbeiro(s) — ${selectedDate.toLocaleDateString('pt-BR')}`
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
                          <span className="font-medium">{barber.name || 'Barbeiro sem nome'}</span>
                          {barber.specialty && (
                            <span className="text-xs text-muted-foreground">{barber.specialty}</span>
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
              <CardDescription>Bloqueie horários específicos se necessário</CardDescription>
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
                  <span className="h-3 w-3 rounded-full bg-destructive inline-block" />
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
              setWorkingHours({ start: baseHours?.open ?? '09:00', end: baseHours?.close ?? '18:00' });
              setWorkingBarbers(barbers.filter((b) => b.is_available).map((b) => b.id));
              setBlockedSlots([]);
              toast.info('Configurações resetadas para o padrão do dia');
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
            {saving ? 'Salvando...' : hasOverride ? 'Atualizar Exceção' : 'Criar Exceção para este Dia'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ScheduleManagement;
