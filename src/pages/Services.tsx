import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import shaveImg from "@/assets/service-shave.jpg";

const services = [
  {
    id: 1,
    name: "Corte Clássico",
    description: "Corte profissional com acabamento perfeito e estilização personalizada",
    price: "R$ 45,00",
    duration: "30 min",
    image: haircutImg,
    popular: true,
  },
  {
    id: 2,
    name: "Barba Completa",
    description: "Aparar, modelar e finalizar com produtos premium de grooming",
    price: "R$ 35,00",
    duration: "25 min",
    image: beardImg,
    popular: false,
  },
  {
    id: 3,
    name: "Barba + Corte",
    description: "Pacote completo: corte de cabelo e barba com desconto especial",
    price: "R$ 70,00",
    duration: "50 min",
    image: haircutImg,
    popular: true,
  },
  {
    id: 4,
    name: "Barbear Tradicional",
    description: "Experiência premium com toalha quente, navalha e produtos de luxo",
    price: "R$ 50,00",
    duration: "35 min",
    image: shaveImg,
    popular: false,
  },
  {
    id: 5,
    name: "Tratamento Capilar",
    description: "Hidratação profunda e tratamento especializado para o cabelo",
    price: "R$ 40,00",
    duration: "30 min",
    image: haircutImg,
    popular: false,
  },
  {
    id: 6,
    name: "Pacote Premium",
    description: "Serviço completo: corte, barba, barbear e tratamento capilar",
    price: "R$ 120,00",
    duration: "90 min",
    image: beardImg,
    popular: true,
  },
];

const Services = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nossos Serviços
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Oferecemos uma experiência completa de cuidados masculinos com profissionais especializados
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                {service.popular && (
                  <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                    Popular
                  </Badge>
                )}
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {service.name}
                  <span className="text-accent font-bold">{service.price}</span>
                </CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {service.duration}
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate("/booking")}
                  className="w-full bg-primary hover:bg-primary/90 transition-all"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 p-8 bg-card rounded-lg border text-center">
          <h2 className="text-2xl font-bold mb-4">Clube de Assinaturas</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Ganhe até 20% de desconto com nosso plano de assinatura mensal. 
            Ideal para quem cuida da aparência regularmente!
          </p>
          <Button className="bg-accent hover:bg-accent/90">
            Conhecer Planos
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Services;
