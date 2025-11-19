import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
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
  const [availableTimes] = useState([
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ]);

  const { createBooking, isSubmitting } = useBooking(barbershopId);

  useEffect(() => {
    if (open && barbershopId) {
      fetchServices();
      fetchBarbers();
    }
  }, [open, barbershopId]);

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
              <Label>Horário *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTime === time ? 'default' : 'outline'}
                    className={cn(
                      'h-10 text-sm',
                      selectedTime === time && 'bg-accent hover:bg-accent/90'
                    )}
                    onClick={() => setSelectedTime(time)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {time}
                  </Button>
                ))}
              </div>
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
