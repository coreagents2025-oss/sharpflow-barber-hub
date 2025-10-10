import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useBooking } from '@/hooks/useBooking';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User } from 'lucide-react';

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
  
  const { createBooking, isSubmitting } = useBooking(barbershopId);

  useEffect(() => {
    if (isOpen && barbershopId) {
      fetchBarbers();
    }
  }, [isOpen, barbershopId]);

  useEffect(() => {
    if (selectedDate && selectedBarber) {
      generateAvailableTimes();
    }
  }, [selectedDate, selectedBarber]);

  const fetchBarbers = async () => {
    if (!barbershopId) return;

    setLoadingBarbers(true);
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_available', true)
        .order('name');

      if (!error && data) {
        setBarbers(data);
      }
    } finally {
      setLoadingBarbers(false);
    }
  };

  const generateAvailableTimes = () => {
    const times: string[] = [];
    const startHour = 9;
    const endHour = 19;

    for (let hour = startHour; hour < endHour; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }

    setAvailableTimes(times);
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
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
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
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedBarber === barber.id
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={barber.photo_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-1">
                        <p className="font-medium">{barber.name}</p>
                        {barber.specialty && (
                          <p className="text-sm text-muted-foreground">{barber.specialty}</p>
                        )}
                      </div>
                    </button>
                  ))}
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
                disabled={(date) => date < new Date()}
                locale={ptBR}
                className="rounded-md border w-full pointer-events-auto"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="space-y-3">
                <Label>Escolha o Horário</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? 'default' : 'outline'}
                      onClick={() => setSelectedTime(time)}
                      className={selectedTime === time ? 'bg-accent hover:bg-accent/90' : ''}
                    >
                      {time}
                    </Button>
                  ))}
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
