import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, AlertCircle, X } from 'lucide-react';
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
  const [selectedBarber, setSelectedBarber] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);

  const { createBooking, isSubmitting } = useBooking(barbershopId);

  useEffect(() => {
    if (open && barbershopId) {
      fetchServices();
      fetchBarbers();
    }
  }, [open, barbershopId]);

  // Gerar horários disponíveis quando data for selecionada
  useEffect(() => {
    if (selectedDate && barbershopId) {
      generateAvailableTimes();
    }
  }, [selectedDate, barbershopId]);

  // Buscar horários ocupados quando barbeiro for selecionado
  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchOccupiedTimes();
    }
  }, [selectedDate, selectedBarber, selectedService]);

  const fetchServices = async () => {
    if (!barbershopId) {
      console.warn('barbershopId não fornecido');
      return;
    }

    setIsLoadingServices(true);

    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name');

    setIsLoadingServices(false);

    if (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
      return;
    }

    setServices(data || []);
  };

  const fetchBarbers = async () => {
    if (!barbershopId) {
      console.warn('barbershopId não fornecido');
      return;
    }

    setIsLoadingBarbers(true);

    const { data, error } = await supabase
      .from('public_barbers')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .order('name');

    setIsLoadingBarbers(false);

    if (error) {
      console.error('Erro ao buscar barbeiros:', error);
      toast.error('Erro ao carregar barbeiros');
      return;
    }

    setBarbers(data || []);
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
    // Excluir status que liberam o horário: cancelled, no_show, completed
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

    // Calcular TODOS os slots ocupados baseado na duração COMPLETA do serviço
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
    
    // Também bloquear slots que seriam afetados pelo NOVO serviço selecionado
    const selectedServiceData = services.find(s => s.id === selectedService);
    if (selectedServiceData && selectedServiceData.duration_minutes > 30) {
      const newServiceSlots = Math.ceil(selectedServiceData.duration_minutes / 30);
      const additionalBlockedSlots: string[] = [];
      
      appointments?.forEach(apt => {
        const startTime = new Date(apt.scheduled_at);
        
        // Bloquear slots ANTES do agendamento existente que conflitariam
        for (let i = 1; i < newServiceSlots; i++) {
          const slotTime = new Date(startTime);
          slotTime.setMinutes(startTime.getMinutes() - (i * 30));
          
          const timeStr = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`;
          additionalBlockedSlots.push(timeStr);
        }
      });
      
      occupiedSlots.push(...additionalBlockedSlots);
    }
    
    setOccupiedTimes([...new Set(occupiedSlots)]); // Remove duplicatas
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    const success = await createBooking({
      serviceId: selectedService,
      barberId: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      clientName: leadName,
      clientPhone: leadPhone,
      clientEmail: leadEmail || '',
    });

    if (success) {
      setSelectedService('');
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
              <AlertDescription>
                Erro: Barbearia não identificada. Não é possível criar agendamento.
              </AlertDescription>
            </Alert>
          )}

          {barbershopId && services.length === 0 && !isLoadingServices && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum serviço cadastrado. Cadastre serviços primeiro.
              </AlertDescription>
            </Alert>
          )}

          {barbershopId && barbers.length === 0 && !isLoadingBarbers && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum barbeiro cadastrado. Cadastre barbeiros primeiro.
              </AlertDescription>
            </Alert>
          )}

          {/* Serviço */}
          <div className="space-y-2">
            <Label htmlFor="service">Serviço *</Label>
            <Select 
              value={selectedService} 
              onValueChange={setSelectedService}
              disabled={isLoadingServices || services.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingServices ? "Carregando serviços..." : "Selecione um serviço"
                } />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price.toFixed(2)} ({service.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barbeiro */}
          <div className="space-y-2">
            <Label htmlFor="barber">Barbeiro *</Label>
            <Select 
              value={selectedBarber} 
              onValueChange={setSelectedBarber}
              disabled={isLoadingBarbers || barbers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingBarbers ? "Carregando barbeiros..." : "Selecione um barbeiro"
                } />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((barber) => (
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
              disabled={(date) => date < new Date()}
              locale={ptBR}
              className="rounded-md border w-full pointer-events-auto"
            />
          </div>

          {/* Horário */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>Horário * {selectedBarber && <span className="text-muted-foreground text-xs">(baseado na agenda do barbeiro)</span>}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map((time) => {
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