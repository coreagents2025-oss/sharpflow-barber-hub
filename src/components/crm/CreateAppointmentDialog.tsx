import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, AlertCircle, X, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string | null;
  barbershopId: string | null;
}

export function CreateAppointmentDialog({ 
  open, 
  onOpenChange, 
  leadId, 
  leadName,
  leadPhone,
  leadEmail,
  barbershopId 
}: CreateAppointmentDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [additionalServiceIds, setAdditionalServiceIds] = useState<string[]>([]);
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);

  const { createBooking, isSubmitting } = useBooking(barbershopId, true);

  // Derived: main service object + additional services objects
  const mainService = services.find(s => s.id === selectedService);
  const additionalServices = services.filter(s => additionalServiceIds.includes(s.id) && s.id !== selectedService);
  const totalDuration = (mainService?.duration_minutes || 0) + additionalServices.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalPrice = (mainService?.price || 0) + additionalServices.reduce((acc, s) => acc + s.price, 0);
  const additionalServiceOptions = services.filter(s => s.id !== selectedService);

  useEffect(() => {
    if (open && barbershopId) {
      fetchServices();
      fetchBarbers();
    }
  }, [open, barbershopId]);

  // Reset additional services when main service changes
  useEffect(() => {
    setAdditionalServiceIds([]);
  }, [selectedService]);

  // Gerar horários disponíveis quando data, barbearia ou duração total mudar; resetar horário escolhido
  useEffect(() => {
    if (selectedDate && barbershopId) {
      generateAvailableTimes();
      setSelectedTime('');
    }
  }, [selectedDate, barbershopId, totalDuration]);

  // Buscar horários ocupados quando barbeiro/data/duração total mudar
  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchOccupiedTimes();
      setSelectedTime('');
    }
  }, [selectedDate, selectedBarber, totalDuration]);

  const fetchServices = async () => {
    if (!barbershopId) return;
    setIsLoadingServices(true);
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .eq('is_subscription_plan', false)
      .order('name');
    setIsLoadingServices(false);
    if (error) {
      toast.error('Erro ao carregar serviços');
      return;
    }
    setServices(data || []);
  };

  const fetchBarbers = async () => {
    if (!barbershopId) return;
    setIsLoadingBarbers(true);
    const { data, error } = await supabase
      .from('public_barbers')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .order('name');
    setIsLoadingBarbers(false);
    if (error) {
      toast.error('Erro ao carregar barbeiros');
      return;
    }
    setBarbers(data || []);
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
    let filtered = allTimes.filter(t => {
      const [h, m] = t.split(':').map(Number);
      return toMinutes(h, m) + totalDuration <= endMinutes;
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

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`scheduled_at, status, services (duration_minutes)`)
      .eq('barber_id', selectedBarber)
      .gte('scheduled_at', dayStart.toISOString())
      .lt('scheduled_at', dayEnd.toISOString())
      .not('status', 'in', '(cancelled,no_show,completed)');

    const occupiedSlots: string[] = [];

    appointments?.forEach(apt => {
      const startTime = new Date(apt.scheduled_at);
      const duration = (apt as any).total_duration_minutes || (apt.services as any)?.duration_minutes || 30;
      const slots = Math.ceil(duration / 30);
      for (let i = 0; i < slots; i++) {
        const slotTime = new Date(startTime);
        slotTime.setMinutes(startTime.getMinutes() + i * 30);
        occupiedSlots.push(
          `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`
        );
      }
    });

    // Block slots before existing appointments that would conflict with totalDuration
    if (totalDuration > 30) {
      const newServiceSlots = Math.ceil(totalDuration / 30);
      appointments?.forEach(apt => {
        const startTime = new Date(apt.scheduled_at);
        for (let i = 1; i < newServiceSlots; i++) {
          const slotTime = new Date(startTime);
          slotTime.setMinutes(startTime.getMinutes() - i * 30);
          occupiedSlots.push(
            `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`
          );
        }
      });
    }

    setOccupiedTimes([...new Set(occupiedSlots)]);
  };

  const toggleAdditionalService = (serviceId: string) => {
    setAdditionalServiceIds(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    const success = await createBooking({
      serviceId: selectedService,
      additionalServiceIds,
      barberId: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      clientName: leadName,
      clientPhone: leadPhone,
      clientEmail: leadEmail || '',
    });

    if (success) {
      setSelectedService('');
      setAdditionalServiceIds([]);
      setSelectedBarber('');
      setSelectedDate(undefined);
      setSelectedTime('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Agendamento</DialogTitle>
          <DialogDescription>
            Criar um novo agendamento para <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avisos */}
          {!barbershopId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Erro: Barbearia não identificada. Não é possível criar agendamento.</AlertDescription>
            </Alert>
          )}
          {barbershopId && services.length === 0 && !isLoadingServices && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhum serviço cadastrado. Cadastre serviços primeiro.</AlertDescription>
            </Alert>
          )}
          {barbershopId && barbers.length === 0 && !isLoadingBarbers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nenhum barbeiro cadastrado. Cadastre barbeiros primeiro.</AlertDescription>
            </Alert>
          )}

          {/* Serviço principal */}
          <div className="space-y-2">
            <Label htmlFor="service">Serviço principal *</Label>
            <Select
              value={selectedService}
              onValueChange={setSelectedService}
              disabled={isLoadingServices || services.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingServices ? 'Carregando serviços...' : 'Selecione um serviço'} />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} — R$ {service.price.toFixed(2)} ({service.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serviços adicionais */}
          {selectedService && additionalServiceOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                Serviços adicionais
                <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <div className="rounded-md border divide-y">
                {additionalServiceOptions.map(service => {
                  const checked = additionalServiceIds.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50',
                        checked && 'bg-primary/5'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAdditionalService(service.id)}
                      />
                      <span className="flex-1 text-sm font-medium">{service.name}</span>
                      <span className="text-xs text-muted-foreground">{service.duration_minutes}min</span>
                      <span className="text-xs font-medium">R$ {service.price.toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>

              {/* Resumo total */}
              {(additionalServiceIds.length > 0 || mainService) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                  <span>{1 + additionalServiceIds.length} serviço{additionalServiceIds.length > 0 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{totalDuration} min</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Barbeiro */}
          <div className="space-y-2">
            <Label htmlFor="barber">Barbeiro *</Label>
            <Select
              value={selectedBarber}
              onValueChange={setSelectedBarber}
              disabled={isLoadingBarbers || barbers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingBarbers ? 'Carregando barbeiros...' : 'Selecione um barbeiro'} />
              </SelectTrigger>
              <SelectContent>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={date => { const d = new Date(); d.setHours(0,0,0,0); return date < d; }}
              locale={ptBR}
              className="rounded-md border w-full pointer-events-auto"
            />
          </div>

          {/* Horário */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>
                Horário *{' '}
                {selectedBarber && (
                  <span className="text-muted-foreground text-xs">(baseado na agenda do barbeiro)</span>
                )}
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map(time => {
                  const isOccupied = selectedBarber && occupiedTimes.includes(time);
                  return (
                    <Button
                      key={time}
                      type="button"
                      variant={selectedTime === time ? 'default' : 'outline'}
                      className={cn(
                        'h-10 text-sm',
                        selectedTime === time && 'bg-accent hover:bg-accent/90',
                        isOccupied && 'opacity-50 cursor-not-allowed line-through'
                      )}
                      onClick={() => !isOccupied && setSelectedTime(time)}
                      disabled={!!isOccupied}
                      title={isOccupied ? 'Horário ocupado' : undefined}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {time}
                      {isOccupied && <X className="h-3 w-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
              {!selectedBarber && (
                <p className="text-xs text-muted-foreground">
                  Selecione um barbeiro para ver os horários ocupados
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !barbershopId ||
              !selectedService ||
              !selectedBarber ||
              !selectedDate ||
              !selectedTime ||
              isSubmitting ||
              services.length === 0 ||
              barbers.length === 0
            }
          >
            {isSubmitting ? 'Criando...' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
