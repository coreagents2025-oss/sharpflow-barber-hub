import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, Users, Clock, Star, Shield, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-barbershop.jpg";
const Index = () => {
  const navigate = useNavigate();
  const features = [{
    icon: Calendar,
    title: "Agendamento 24/7",
    description: "Sistema online disponível sempre que seus clientes precisarem"
  }, {
    icon: Users,
    title: "Gestão de Clientes",
    description: "CRM completo com histórico e preferências de cada cliente"
  }, {
    icon: TrendingUp,
    title: "Relatórios Inteligentes",
    description: "Análises detalhadas para otimizar seu negócio"
  }, {
    icon: Clock,
    title: "Lembretes Automáticos",
    description: "Confirmações via WhatsApp, SMS e notificações push"
  }, {
    icon: Star,
    title: "Programa de Fidelidade",
    description: "Recompense clientes fiéis e aumente o retorno"
  }, {
    icon: Shield,
    title: "Pagamentos Seguros",
    description: "Aceite cartões, Pix e gerencie seu financeiro"
  }];
  return <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
        
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            Transforme sua Barbearia
            <span className="block text-accent mt-2">em um Negócio Digital</span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-200">
            Gestão completa, marketing inteligente e mais clientes. 
            Tudo em um único aplicativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/booking")} className="bg-accent hover:bg-accent/90 h-14 px-8 font-thin text-3xl">
              Agendar Demo Grátis
            </Button>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Tudo que você precisa para crescer
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Funcionalidades profissionais para otimizar cada aspecto da sua barbearia
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(feature => {
            const Icon = feature.icon;
            return <Card key={feature.title} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold text-accent mb-2">95%</div>
              <p className="text-lg">Taxa de Satisfação</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-accent mb-2">+40%</div>
              <p className="text-lg">Aumento em Agendamentos</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-accent mb-2">24/7</div>
              <p className="text-lg">Disponibilidade Online</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <Smartphone className="h-16 w-16 mx-auto mb-6 text-accent" />
              <h2 className="text-4xl font-bold mb-4">
                Pronto para revolucionar sua barbearia?
              </h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
                Junte-se a centenas de barbearias que já aumentaram seu faturamento 
                e melhoraram a experiência dos clientes
              </p>
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg h-14 px-8" onClick={() => navigate("/booking")}>
                Começar Agora Gratuitamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>;
};
export default Index;