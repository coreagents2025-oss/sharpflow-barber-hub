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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { checkBarberAvailability } from '@/hooks/useBarberAvailability';
import { startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, X, Plus, ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, Clock, Scissors } from 'lucide-react';
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

const ANY_BARBER = '__any__';

export const BookingModal = ({ isOpen, onClose, service, barbershopId, allServices = [] }: BookingModalProps) => {
  const [step, setStep] = useState(1);
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
  const [additionalServiceIds, setAdditionalServiceIds] = useState<string[]>([]);

  const { createBooking, isSubmitting } = useBooking(barbershopId);

  const additionalServiceOptions = allServices.filter(s => s.id !== service?.id);
  const selectedAdditionalServices = additionalServiceOptions.filter(s => additionalServiceIds.includes(s.id));
  const totalDuration = (service?.duration_minutes || 0) + selectedAdditionalServices.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = (service?.price || 0) + selectedAdditionalServices.reduce((acc, s) => acc + s.price, 0);
  const totalServices = 1 + selectedAdditionalServices.length;

  // Compute total steps (skip add-ons step if no additional services)
  const totalSteps = additionalServiceOptions.length > 0 ? 4 : 3;
  // Map logical steps (always: 1=barber, 2=date/time, 3=addons (maybe), 4=client info)
  // When no addons: 1=barber, 2=date/time, 3=client info
  const getStepLabel = (s: number) => {
    if (totalSteps === 4) {
      return ['Profissional', 'Data e Horário', 'Serviços extras', 'Seus dados'][s - 1];
    }
    return ['Profissional', 'Data e Horário', 'Seus dados'][s - 1];
  };

  // Fetch barbers on open
  useEffect(() => {
    if (isOpen && barbershopId) {
      fetchBarbers();
    }
  }, [isOpen, barbershopId]);

  // Fetch barbers filtered by selected date when date changes
  useEffect(() => {
    if (isOpen && barbershopId && selectedDate) {
      fetchBarbers();
    }
  }, [selectedDate]);

  // Fetch available times when date or total duration changes
  useEffect(() => {
    if (selectedDate) {
      generateAvailableTimes();
      setSelectedTime('');
    }
  }, [selectedDate, barbershopId, totalDuration]);

  // Fetch occupied times when barber or date changes
  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchOccupiedTimes();
      setSelectedTime('');
    }
  }, [selectedDate, selectedBarber, totalDuration]);

  // Reset on close / service change
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    setAdditionalServiceIds([]);
  }, [service?.id]);

  const toggleAdditionalService = (serviceId: string) => {
    setAdditionalServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
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

      if (error || !allBarbers) { setBarbers([]); return; }

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: schedule } = await supabase
          .from('daily_schedules')
          .select('barbers_working')
          .eq('barbershop_id', barbershopId)
          .eq('date', dateStr)
          .maybeSingle();

        if (schedule?.barbers_working && schedule.barbers_working.length > 0) {
          setBarbers(allBarbers.filter(b => schedule.barbers_working.includes(b.id)));
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

    const toMinutes = (h: number, m: number) => h * 60 + m;
    let startMinutes = toMinutes(9, 0);
    let endMinutes = toMinutes(18, 0);

    if (schedule?.working_hours_start && schedule?.working_hours_end) {
      const [sh, sm] = schedule.working_hours_start.split(':').map(Number);
      const [eh, em] = schedule.working_hours_end.split(':').map(Number);
      startMinutes = toMinutes(sh, sm);
      endMinutes = toMinutes(eh, em);
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
          const [sh, sm] = dayHours.open.split(':').map(Number);
          const [eh, em] = dayHours.close.split(':').map(Number);
          startMinutes = toMinutes(sh, sm);
          endMinutes = toMinutes(eh, em);
        } else {
          setAvailableTimes([]);
          return;
        }
      }
    }

    const allTimes: string[] = [];
    for (let mins = startMinutes; mins < endMinutes; mins += 30) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const t = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      if (!schedule?.blocked_slots?.includes(t)) allTimes.push(t);
    }

    // Bug fix 1: filter slots where service end time would exceed closing time
    const duration = totalDuration || (service?.duration_minutes ?? 30);
    let filtered = allTimes.filter(t => {
      const [h, m] = t.split(':').map(Number);
      return toMinutes(h, m) + duration <= endMinutes;
    });

    // Bug fix 2: filter past time slots when the selected date is today
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    if (isToday) {
      const nowMinutes = toMinutes(now.getHours(), now.getMinutes());
      filtered = filtered.filter(t => {
        const [h, m] = t.split(':').map(Number);
        return toMinutes(h, m) > nowMinutes;
      });
    }

    setAvailableTimes(filtered);
  };

  const fetchOccupiedTimes = async () => {
    if (!selectedBarber || !selectedDate || !barbershopId) return;

    if (selectedBarber === ANY_BARBER) {
      // For "any", occupied = times occupied by ALL barbers simultaneously
      // We show all times that have at least one barber free, so no need to block here
      setOccupiedTimes([]);
      return;
    }

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`scheduled_at, status, services(duration_minutes)`)
      .eq('barber_id', selectedBarber)
      .gte('scheduled_at', dayStart.toISOString())
      .lt('scheduled_at', dayEnd.toISOString())
      .not('status', 'in', '(cancelled,no_show,completed)');

    const occupiedSlots: string[] = [];

    appointments?.forEach(apt => {
      const startTime = new Date(apt.scheduled_at);
      const duration = (apt.services as any)?.duration_minutes || 30;
      const slots = Math.ceil(duration / 30);
      for (let i = 0; i < slots; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(startTime.getMinutes() + (i * 30));
        occupiedSlots.push(
          `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`
        );
      }
    });

    if (totalDuration > 30) {
      const newServiceSlots = Math.ceil(totalDuration / 30);
      appointments?.forEach(apt => {
        const startTime = new Date(apt.scheduled_at);
        for (let i = 1; i < newServiceSlots; i++) {
          const slotTime = new Date(startTime);
          slotTime.setMinutes(startTime.getMinutes() - (i * 30));
          occupiedSlots.push(
            `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`
          );
        }
      });
    }

    setOccupiedTimes([...new Set(occupiedSlots)]);
  };

  // Resolve final barber for "any" option
  const resolveBarber = async (): Promise<string | null> => {
    if (selectedBarber !== ANY_BARBER) return selectedBarber;
    if (!selectedDate || !selectedTime) return null;

    const [hours, minutes] = selectedTime.split(':');
    const checkTime = new Date(selectedDate);
    checkTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    for (const barber of barbers) {
      const isAvailable = await checkBarberAvailability(barber.id, checkTime, totalDuration);
      if (isAvailable) return barber.id;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!service || !selectedBarber || !selectedDate || !selectedTime || !clientName || !clientPhone || !clientEmail) return;

    const finalBarberId = await resolveBarber();
    if (!finalBarberId) return;

    const success = await createBooking({
      serviceId: service.id,
      additionalServiceIds,
      barberId: finalBarberId,
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
    setStep(1);
    setSelectedBarber('');
    setSelectedDate(undefined);
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setAdditionalServiceIds([]);
    setOccupiedTimes([]);
    setAvailableTimes([]);
  };

  const canAdvance = () => {
    if (step === 1) return !!selectedBarber;
    if (step === 2) return !!selectedDate && !!selectedTime;
    if (step === 3 && totalSteps === 4) return true; // add-ons are optional
    return true;
  };

  const advance = () => {
    if (step < totalSteps) setStep(s => s + 1);
  };

  const back = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const progressValue = (step / totalSteps) * 100;

  // Determine the real content step considering totalSteps
  // Step 1 = barber, Step 2 = date/time, Step 3 = addons (only if 4 total), last = client info
  const isClientInfoStep = step === totalSteps;
  const isAddonsStep = totalSteps === 4 && step === 3;
  const isDateTimeStep = step === 2;
  const isBarberStep = step === 1;

  const isFormValid = selectedBarber && selectedDate && selectedTime && clientName && clientPhone && clientEmail;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold leading-tight">
                {service ? `Agendar ${service.name}` : 'Agendamento'}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {totalServices > 1
                  ? <span className="text-foreground font-medium">{totalServices} serviços · R$ {Number(totalPrice).toFixed(2)} · {totalDuration} min</span>
                  : service && <span>R$ {Number(service.price).toFixed(2)} · {service.duration_minutes} min</span>
                }
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3 space-y-1.5">
            <Progress value={progressValue} className="h-1.5" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                Passo {step} de {totalSteps} · {getStepLabel(step)}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      i + 1 < step ? 'bg-accent' : i + 1 === step ? 'bg-accent' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Step Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 pb-4 space-y-4">

            {/* STEP 1 — Barber */}
            {isBarberStep && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Com quem você quer ser atendido?</p>

                {loadingBarbers ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Carregando barbeiros...</div>
                ) : (
                  <div className="space-y-2">
                    {/* Any barber option */}
                    <button
                      onClick={() => setSelectedBarber(ANY_BARBER)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                        selectedBarber === ANY_BARBER
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50 hover:bg-muted/30'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        selectedBarber === ANY_BARBER ? 'bg-accent text-accent-foreground' : 'bg-muted'
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Qualquer disponível</p>
                        <p className="text-xs text-muted-foreground">Primeiro barbeiro livre no horário escolhido</p>
                      </div>
                      {selectedBarber === ANY_BARBER && (
                        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-accent-foreground" />
                        </div>
                      )}
                    </button>

                    {/* Individual barbers */}
                    {barbers.map((barber) => (
                      <button
                        key={barber.id}
                        onClick={() => setSelectedBarber(barber.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                          selectedBarber === barber.id
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50 hover:bg-muted/30'
                        )}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={barber.photo_url || undefined} />
                          <AvatarFallback className="bg-muted">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{barber.name}</p>
                          {barber.specialty && (
                            <p className="text-xs text-muted-foreground truncate">{barber.specialty}</p>
                          )}
                        </div>
                        {selectedBarber === barber.id && (
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-accent-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Date + Time */}
            {isDateTimeStep && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-accent" />
                    <Label className="text-sm font-semibold">Escolha a data</Label>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                    locale={ptBR}
                    className="rounded-xl border w-full pointer-events-auto"
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <Label className="text-sm font-semibold">Escolha o horário</Label>
                    </div>
                    {availableTimes.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                        Nenhum horário disponível nesta data
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableTimes.map((time) => {
                          const isOccupied = occupiedTimes.includes(time);
                          return (
                            <Button
                              key={time}
                              variant={selectedTime === time ? 'default' : 'outline'}
                              onClick={() => !isOccupied && setSelectedTime(time)}
                              disabled={isOccupied}
                              className={cn(
                                'h-10 text-sm font-medium',
                                selectedTime === time && 'bg-accent hover:bg-accent/90 text-accent-foreground',
                                isOccupied && 'opacity-40 cursor-not-allowed line-through'
                              )}
                              title={isOccupied ? 'Horário ocupado' : undefined}
                            >
                              {time}
                              {isOccupied && <X className="h-3 w-3 ml-1" />}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Additional services (only if totalSteps === 4) */}
            {isAddonsStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-accent" />
                  <Label className="text-sm font-semibold">Deseja adicionar mais algum serviço?</Label>
                </div>
                <p className="text-xs text-muted-foreground">Opcional — você pode pular este passo</p>

                <div className="rounded-xl border divide-y overflow-hidden">
                  {additionalServiceOptions.map((svc) => {
                    const isChecked = additionalServiceIds.includes(svc.id);
                    return (
                      <label
                        key={svc.id}
                        className={cn(
                          'flex items-center gap-3 p-3.5 cursor-pointer transition-colors',
                          isChecked ? 'bg-accent/10' : 'hover:bg-muted/40'
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
                        <span className="text-sm font-bold text-accent shrink-0">
                          R$ {Number(svc.price).toFixed(2)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedAdditionalServices.length > 0 && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/50 text-sm border">
                    <span className="text-muted-foreground">
                      {totalServices} serviços · {totalDuration} min
                    </span>
                    <span className="font-bold text-foreground">
                      R$ {Number(totalPrice).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 (or 3) — Client info + summary */}
            {isClientInfoStep && (
              <div className="space-y-4">
                {/* Booking summary */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviço</span>
                      <span className="font-medium">{service?.name}{totalServices > 1 ? ` +${totalServices - 1}` : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Barbeiro</span>
                      <span className="font-medium">
                        {selectedBarber === ANY_BARBER
                          ? 'Qualquer disponível'
                          : barbers.find(b => b.id === selectedBarber)?.name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data e hora</span>
                      <span className="font-medium">
                        {selectedDate?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 mt-1.5">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-accent">R$ {Number(totalPrice).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Client fields */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-sm">Seu nome</Label>
                    <Input
                      id="name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome completo"
                      className="mt-1 h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        if (value.length <= 2) formatted = value;
                        else if (value.length <= 7) formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        else formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
                        setClientPhone(formatted);
                      }}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="mt-1 h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm">E-mail</Label>
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
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Footer navigation */}
        <div className="shrink-0 px-5 py-4 border-t bg-background space-y-2">
          {isClientInfoStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-semibold"
            >
              {isSubmitting
                ? 'Confirmando...'
                : `Confirmar · R$ ${Number(totalPrice).toFixed(2)}`}
            </Button>
          ) : (
            <Button
              onClick={advance}
              disabled={!canAdvance()}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-semibold"
            >
              Continuar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={back}
              className="w-full h-10 text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
