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
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Users, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Barber {
  id: string;
  user_id: string;
  is_available: boolean;
  profiles: {
    full_name: string;
  };
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

const ScheduleManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [workingBarbers, setWorkingBarbers] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '20:00',
  });

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*');

      if (error) throw error;
      setBarbers(data as any || []);
      setWorkingBarbers(data?.filter(b => b.is_available).map(b => b.id) || []);
    } catch (error: any) {
      toast.error('Erro ao carregar barbeiros');
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

  const saveSchedule = () => {
    toast.success('Configurações de agenda salvas!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gerenciar Agenda</h1>
          <p className="text-muted-foreground">Configure horários, barbeiros e disponibilidade</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
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
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
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
                Selecione quem está trabalhando em {selectedDate.toLocaleDateString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <span className="font-medium">{barber.profiles?.full_name || 'Sem nome'}</span>
                    </div>
                    
                    <Switch
                      checked={workingBarbers.includes(barber.id)}
                      onCheckedChange={() => toggleBarberWorking(barber.id)}
                    />
                  </div>
                ))}
                
                {barbers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum barbeiro cadastrado
                  </p>
                )}
              </div>
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
            <CardContent>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
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
                      className="relative"
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

        <div className="mt-6 flex justify-end">
          <Button onClick={saveSchedule} className="bg-accent hover:bg-accent/90">
            Salvar Configurações
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ScheduleManagement;