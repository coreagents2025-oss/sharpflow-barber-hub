import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

const services = [
  "Corte Clássico - R$ 45,00",
  "Barba Completa - R$ 35,00",
  "Barba + Corte - R$ 70,00",
  "Barbear Tradicional - R$ 50,00",
  "Tratamento Capilar - R$ 40,00",
  "Pacote Premium - R$ 120,00",
];

const barbers = [
  "João Silva",
  "Pedro Santos",
  "Carlos Oliveira",
  "Rafael Costa",
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00"
];

const Booking = () => {
  const [date, setDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !selectedService || !selectedBarber || !selectedTime || !clientName || !clientPhone) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    toast.success("Agendamento realizado com sucesso!", {
      description: `${clientName}, seu horário está confirmado para ${date.toLocaleDateString()} às ${selectedTime}`,
    });

    // Reset form
    setDate(undefined);
    setSelectedService("");
    setSelectedBarber("");
    setSelectedTime("");
    setClientName("");
    setClientPhone("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Agende seu Horário
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha o melhor horário e profissional para você
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                Novo Agendamento
              </CardTitle>
              <CardDescription>
                Preencha os dados abaixo para confirmar seu horário
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      placeholder="Digite seu nome"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Serviço</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profissional</Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers.map((barber) => (
                        <SelectItem key={barber} value={barber}>
                          {barber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horário Disponível</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={selectedTime === time ? "default" : "outline"}
                          className="h-12"
                          onClick={() => setSelectedTime(time)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-lg h-12"
                >
                  Confirmar Agendamento
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Booking;
