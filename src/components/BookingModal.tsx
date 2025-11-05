import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { checkBarberAvailability } from '@/hooks/useBarberAvailability';
import { format, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Barber {
  id: string;
  name: string;
  photo_url: string | null;
  specialty: string | null;
  is_available: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  } | null;
  barbershopId: string | null;
}

export const BookingModal = ({ isOpen, onClose, service, barbershopId }: BookingModalProps) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [barberAvailability, setBarberAvailability] = useState<Record<string, boolean>>({});
  
  const { createBooking, isSubmitting } = useBooking(barbershopId);

  useEffect(() => {
    if (isOpen && barbershopId && selectedDate) {
      fetchBarbers();
    }
  }, [isOpen, barbershopId, selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedBarber) {
      generateAvailableTimes();
      fetchOccupiedTimes();
    }
  }, [selectedDate, selectedBarber]);

  // Verificar disponibilidade de barbeiros quando hora mudar
  useEffect(() => {
    if (selectedTime && selectedDate && service) {
      checkAllBarbersAvailability();
    }
  }, [selectedTime, selectedDate, service, barbers]);

  const fetchBarbers = async () => {
    if (!barbershopId) return;

    setLoadingBarbers(true);
    try {
      // Buscar todos os barbeiros disponíveis
      const { data: allBarbers, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_available', true)
        .order('name');

      if (error || !allBarbers) {
        setBarbers([]);
        return;
      }

      // Se uma data foi selecionada, filtrar por daily_schedules
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: schedule } = await supabase
          .from('daily_schedules')
          .select('barbers_working')
          .eq('barbershop_id', barbershopId)
          .eq('date', dateStr)
          .maybeSingle();

        // Se existe schedule configurado, filtrar apenas barbeiros que trabalham neste dia
        if (schedule?.barbers_working && schedule.barbers_working.length > 0) {
          const workingBarbers = allBarbers.filter(b => 
            schedule.barbers_working.includes(b.id)
          );
          setBarbers(workingBarbers);
        } else {
          // Se não tem schedule, mostrar todos disponíveis
          setBarbers(allBarbers);
        }
      } else {
        setBarbers(allBarbers);
      }
    } finally {
      setLoadingBarbers(false);
    }
  };

  const generateAvailableTimes = async () => {
    if (!selectedDate || !barbershopId) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Buscar configuração do dia para pegar horários de funcionamento
    const { data: schedule } = await supabase
      .from('daily_schedules')
      .select('working_hours_start, working_hours_end, blocked_slots')
      .eq('barbershop_id', barbershopId)
      .eq('date', dateStr)
      .maybeSingle();

    const times: string[] = [];
    let startHour = 9;
    let endHour = 19;

    // Se tem schedule configurado, usar horários do banco
    if (schedule) {
      if (schedule.working_hours_start) {
        startHour = parseInt(schedule.working_hours_start.split(':')[0]);
      }
      if (schedule.working_hours_end) {
        endHour = parseInt(schedule.working_hours_end.split(':')[0]);
      }
    }

    // Gerar horários (a cada 30 minutos)
    for (let hour = startHour; hour < endHour; hour++) {
      const time1 = `${hour.toString().padStart(2, '0')}:00`;
      const time2 = `${hour.toString().padStart(2, '0')}:30`;
      
      // Verificar se não está nos bloqueados
      if (!schedule?.blocked_slots?.includes(time1)) {
        times.push(time1);
      }
      if (!schedule?.blocked_slots?.includes(time2)) {
        times.push(time2);
      }
    }

    setAvailableTimes(times);
  };

  const fetchOccupiedTimes = async () => {
    if (!selectedBarber || !selectedDate || !barbershopId) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Buscar appointments COM informações do serviço para calcular duração
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        scheduled_at,
        services (
          duration_minutes
        )
      `)
      .eq('barber_id', selectedBarber)
      .gte('scheduled_at', `${dateStr}T00:00:00`)
      .lt('scheduled_at', `${dateStr}T23:59:59`)
      .neq('status', 'cancelled');

    // Calcular TODOS os slots ocupados baseado na duração
    const occupiedSlots: string[] = [];
    
    appointments?.forEach(apt => {
      const startTime = new Date(apt.scheduled_at);
      const duration = (apt.services as any)?.duration_minutes || 30;
      const slots = Math.ceil(duration / 30); // Quantos slots de 30min
      
      for (let i = 0; i < slots; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(startTime.getMinutes() + (i * 30));
        
        const timeStr = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`;
        occupiedSlots.push(timeStr);
      }
    });
    
    setOccupiedTimes(occupiedSlots);
  };

  const checkAllBarbersAvailability = async () => {
    if (!selectedTime || !selectedDate || !service) return;
    
    const [hours, minutes] = selectedTime.split(':');
    const checkTime = new Date(selectedDate);
    checkTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const availability: Record<string, boolean> = {};
    
    for (const barber of barbers) {
      const isAvailable = await checkBarberAvailability(
        barber.id,
        checkTime,
        service.duration_minutes
      );
      availability[barber.id] = isAvailable;
    }
    
    setBarberAvailability(availability);
  };

  const handleSubmit = async () => {
    if (!service || !selectedBarber || !selectedDate || !selectedTime || !clientName || !clientPhone || !clientEmail) {
      return;
    }

    const success = await createBooking({
      serviceId: service.id,
      barberId: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      clientName,
      clientPhone,
      clientEmail,
    });

    if (success) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setSelectedBarber('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
  };

  const isFormValid = selectedBarber && selectedDate && selectedTime && clientName && clientPhone && clientEmail;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {service ? `Agendar ${service.name}` : 'Agendamento'}
          </SheetTitle>
          {service && (
            <p className="text-muted-foreground">
              R$ {Number(service.price).toFixed(2)} • {service.duration_minutes} min
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-120px)] mt-6">
          <div className="space-y-6 pb-6">
            {/* Client Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    let formatted = value;
                    
                    if (value.length <= 2) {
                      formatted = value;
                    } else if (value.length <= 7) {
                      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    } else {
                      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                    }
                    
                    setClientPhone(formatted);
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Barber Selection */}
            <div className="space-y-3">
              <Label>Escolha o Barbeiro</Label>
              {loadingBarbers ? (
                <div className="text-center py-6 text-muted-foreground">
                  Carregando barbeiros...
                </div>
              ) : barbers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum barbeiro disponível
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {barbers.map((barber) => {
                    const isAvailable = selectedTime ? barberAvailability[barber.id] !== false : true;
                    
                    return (
                      <button
                        key={barber.id}
                        onClick={() => isAvailable && setSelectedBarber(barber.id)}
                        disabled={!isAvailable}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                          selectedBarber === barber.id && "border-accent bg-accent/10",
                          !isAvailable && "opacity-50 cursor-not-allowed",
                          isAvailable && selectedBarber !== barber.id && "border-border hover:border-accent/50"
                        )}
                      >
                        <Avatar>
                          <AvatarImage src={barber.photo_url || undefined} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{barber.name}</p>
                            {!isAvailable && selectedTime && (
                              <Badge variant="destructive" className="text-xs">
                                Ocupado
                              </Badge>
                            )}
                          </div>
                          {barber.specialty && (
                            <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date Selection */}
            <div className="space-y-3">
              <Label>Escolha a Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                locale={ptBR}
                className="rounded-md border w-full pointer-events-auto"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="space-y-3">
                <Label>Escolha o Horário</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimes.map((time) => {
                    const isOccupied = occupiedTimes.includes(time);
                    
                    return (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        onClick={() => !isOccupied && setSelectedTime(time)}
                        disabled={isOccupied}
                        className={cn(
                          selectedTime === time && 'bg-accent hover:bg-accent/90',
                          isOccupied && 'opacity-50 cursor-not-allowed line-through'
                        )}
                        title={isOccupied ? 'Horário ocupado' : undefined}
                      >
                        {time}
                        {isOccupied && <X className="h-3 w-3 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Agendamento'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
