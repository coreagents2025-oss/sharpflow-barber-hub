import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { checkBarberAvailability } from '@/hooks/useBarberAvailability';
import { startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Barber {
  id: string;
  name: string;
  photo_url: string | null;
  specialty: string | null;
  is_available: boolean;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
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
  allServices?: ServiceOption[];
}

export const BookingModal = ({ isOpen, onClose, service, barbershopId, allServices = [] }: BookingModalProps) => {
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
  const [additionalServiceIds, setAdditionalServiceIds] = useState<string[]>([]);
  
  const { createBooking, isSubmitting } = useBooking(barbershopId);

  // Compute additional services (exclude main service)
  const additionalServiceOptions = allServices.filter(s => s.id !== service?.id);

  // Compute selected additional services objects
  const selectedAdditionalServices = additionalServiceOptions.filter(s => additionalServiceIds.includes(s.id));

  // Total duration and price
  const totalDuration = (service?.duration_minutes || 0) + selectedAdditionalServices.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = (service?.price || 0) + selectedAdditionalServices.reduce((acc, s) => acc + s.price, 0);
  const totalServices = 1 + selectedAdditionalServices.length;

  useEffect(() => {
    if (isOpen && barbershopId && selectedDate) {
      fetchBarbers();
    }
  }, [isOpen, barbershopId, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      generateAvailableTimes();
    }
  }, [selectedDate, barbershopId]);

  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchOccupiedTimes();
    }
  }, [selectedDate, selectedBarber, totalDuration]);

  useEffect(() => {
    if (selectedTime && selectedDate && service) {
      checkAllBarbersAvailability();
    }
  }, [selectedTime, selectedDate, totalDuration, barbers]);

  // Reset additional services when modal closes or main service changes
  useEffect(() => {
    if (!isOpen) {
      setAdditionalServiceIds([]);
    }
  }, [isOpen]);

  useEffect(() => {
    setAdditionalServiceIds([]);
  }, [service?.id]);

  const toggleAdditionalService = (serviceId: string) => {
    setAdditionalServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
    // Reset time selection since duration changed
    setSelectedTime('');
  };

  const fetchBarbers = async () => {
    if (!barbershopId) return;

    setLoadingBarbers(true);
    try {
      const { data: allBarbers, error } = await supabase
        .from('public_barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (error || !allBarbers) {
        setBarbers([]);
        return;
      }

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: schedule } = await supabase
          .from('daily_schedules')
          .select('barbers_working')
          .eq('barbershop_id', barbershopId)
          .eq('date', dateStr)
          .maybeSingle();

        if (schedule?.barbers_working && schedule.barbers_working.length > 0) {
          const workingBarbers = allBarbers.filter(b => 
            schedule.barbers_working.includes(b.id)
          );
          setBarbers(workingBarbers);
        } else {
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
    
    const { data: schedule } = await supabase
      .from('daily_schedules')
      .select('working_hours_start, working_hours_end, blocked_slots')
      .eq('barbershop_id', barbershopId)
      .eq('date', dateStr)
      .maybeSingle();

    const times: string[] = [];
    let startHour = 9;
    let endHour = 18;

    if (schedule?.working_hours_start && schedule?.working_hours_end) {
      startHour = parseInt(schedule.working_hours_start.split(':')[0]);
      endHour = parseInt(schedule.working_hours_end.split(':')[0]);
    } else {
      const { data: barbershop } = await supabase
        .from('public_barbershops')
        .select('operating_hours')
        .eq('id', barbershopId)
        .maybeSingle();

      if (barbershop?.operating_hours) {
        const DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = DAY_MAP[selectedDate.getDay()];
        const dayHours = (barbershop.operating_hours as any)?.[dayName];

        if (dayHours?.open && dayHours?.close) {
          startHour = parseInt(dayHours.open.split(':')[0]);
          endHour = parseInt(dayHours.close.split(':')[0]);
        } else {
          setAvailableTimes([]);
          return;
        }
      }
    }

    for (let hour = startHour; hour < endHour; hour++) {
      const time1 = `${hour.toString().padStart(2, '0')}:00`;
      const time2 = `${hour.toString().padStart(2, '0')}:30`;
      
      if (!schedule?.blocked_slots?.includes(time1)) times.push(time1);
      if (!schedule?.blocked_slots?.includes(time2)) times.push(time2);
    }

    setAvailableTimes(times);
  };

  const fetchOccupiedTimes = async () => {
    if (!selectedBarber || !selectedDate || !barbershopId) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        scheduled_at,
        status,
        services (
          duration_minutes
        )
      `)
      .eq('barber_id', selectedBarber)
      .gte('scheduled_at', `${dateStr}T00:00:00`)
      .lt('scheduled_at', `${dateStr}T23:59:59`)
      .not('status', 'in', '(cancelled,no_show,completed)');

    const occupiedSlots: string[] = [];
    
    appointments?.forEach(apt => {
      const startTime = new Date(apt.scheduled_at);
      const duration = (apt.services as any)?.duration_minutes || 30;
      const slots = Math.ceil(duration / 30);
      
      for (let i = 0; i < slots; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(startTime.getMinutes() + (i * 30));
        const timeStr = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`;
        occupiedSlots.push(timeStr);
      }
    });
    
    // Block slots that the new TOTAL duration would conflict with
    if (totalDuration > 30) {
      const newServiceSlots = Math.ceil(totalDuration / 30);
      const additionalBlockedSlots: string[] = [];
      
      appointments?.forEach(apt => {
        const startTime = new Date(apt.scheduled_at);
        
        for (let i = 1; i < newServiceSlots; i++) {
          const slotTime = new Date(startTime);
          slotTime.setMinutes(startTime.getMinutes() - (i * 30));
          const timeStr = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`;
          additionalBlockedSlots.push(timeStr);
        }
      });
      
      occupiedSlots.push(...additionalBlockedSlots);
    }
    
    setOccupiedTimes([...new Set(occupiedSlots)]);
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
        totalDuration
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
      additionalServiceIds,
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
    setAdditionalServiceIds([]);
  };

  const isFormValid = selectedBarber && selectedDate && selectedTime && clientName && clientPhone && clientEmail;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] rounded-t-3xl">
        <SheetHeader className="px-1">
          <SheetTitle className="text-xl sm:text-2xl">
            {service ? `Agendar ${service.name}` : 'Agendamento'}
          </SheetTitle>
          {service && (
            <div className="text-muted-foreground text-sm sm:text-base">
              {totalServices > 1 ? (
                <span className="text-foreground font-medium">
                  {totalServices} serviços · R$ {Number(totalPrice).toFixed(2)} · {totalDuration} min
                </span>
              ) : (
                <span>R$ {Number(service.price).toFixed(2)} · {service.duration_minutes} min</span>
              )}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-120px)] sm:h-[calc(90vh-120px)] mt-4 sm:mt-6">
          <div className="space-y-4 sm:space-y-6 pb-28 px-1">
            {/* Client Info */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">Nome</Label>
                <Input
                  id="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">Telefone</Label>
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
                  className="mt-1 h-11"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1 h-11"
                />
              </div>
            </div>

            {/* Additional Services */}
            {additionalServiceOptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-accent" />
                  <Label className="text-sm font-semibold">Adicionar serviços</Label>
                </div>
                <div className="rounded-lg border divide-y">
                  {additionalServiceOptions.map((svc) => {
                    const isChecked = additionalServiceIds.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={cn(
                          "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                          isChecked ? "bg-accent/10" : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleAdditionalService(svc.id)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.duration_minutes} min</p>
                        </div>
                        <span className="text-sm font-semibold text-accent shrink-0">
                          R$ {Number(svc.price).toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedAdditionalServices.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                    <span className="text-muted-foreground">
                      {totalServices} {totalServices === 1 ? 'serviço' : 'serviços'} · {totalDuration} min
                    </span>
                    <span className="font-bold text-foreground">
                      Total: R$ {Number(totalPrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator />

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
                <Label className="text-sm">Escolha o Horário</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableTimes.map((time) => {
                    const isOccupied = occupiedTimes.includes(time);
                    
                    return (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        onClick={() => !isOccupied && setSelectedTime(time)}
                        disabled={isOccupied}
                        className={cn(
                          'h-11 min-h-[44px] text-sm',
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

            {/* Barber Selection */}
            <div className="space-y-3">
              <Label className="text-sm">Escolha o Barbeiro</Label>
              {!selectedDate || !selectedTime ? (
                <div className="text-center py-6 px-4 bg-muted/50 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Selecione data e horário primeiro para ver os barbeiros disponíveis
                  </p>
                </div>
              ) : loadingBarbers ? (
                <div className="text-center py-6 text-muted-foreground">
                  Carregando barbeiros...
                </div>
              ) : barbers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum barbeiro disponível para este horário
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
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-background border-t">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 min-h-[48px] text-base"
            size="lg"
          >
            {isSubmitting
              ? 'Confirmando...'
              : totalServices > 1
                ? `Confirmar ${totalServices} serviços · R$ ${Number(totalPrice).toFixed(2)}`
                : 'Confirmar Agendamento'
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
