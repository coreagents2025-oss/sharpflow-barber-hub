import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { PricingCard } from "@/components/PricingCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { Calendar, TrendingUp, Users, Clock, Star, Shield, Zap, CheckCircle2, ArrowRight, Scissors } from "lucide-react";
import heroImage from "@/assets/hero-barbershop.jpg";
const Index = () => {
  const navigate = useNavigate();
  const features = [{
    icon: Calendar,
    title: "Agendamento 24/7",
    description: "Receba agendamentos a qualquer hora, mesmo enquanto dorme"
  }, {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Nunca mais perca um cliente. Fidelize automaticamente com histórico completo"
  }, {
    icon: TrendingUp,
    title: "Relatórios Inteligentes",
    description: "Descubra seu melhor horário e serviço mais rentável em tempo real"
  }, {
    icon: Clock,
    title: "Lembretes Automáticos",
    description: "Reduza faltas em até 70% com confirmações automáticas via WhatsApp"
  }, {
    icon: Star,
    title: "Marketing Automatizado",
    description: "Traga clientes de volta com campanhas inteligentes e personalizadas"
  }, {
    icon: Shield,
    title: "Pagamentos Seguros",
    description: "Aceite cartões, Pix e tenha controle financeiro total em um só lugar"
  }];
  const plans = [{
    title: "Mensal",
    price: "R$ 89,90",
    period: "mês",
    features: ["Todos os recursos incluídos", "CRM completo e ilimitado", "WhatsApp integrado", "Relatórios em tempo real", "Suporte prioritário", "Sem taxa de setup", "Atualizações gratuitas"],
    ctaText: "Começar Teste Grátis",
    highlighted: false
  }, {
    title: "Anual",
    price: "12x R$ 69,00",
    period: "ano",
    description: "ou R$ 828,00 à vista",
    features: ["Todos os recursos do Mensal", "2 meses grátis (economize 23%)", "Prioridade no suporte", "Onboarding personalizado", "Consultoria de crescimento", "Atualizações vitalícias", "Garantia de 30 dias"],
    ctaText: "Começar Agora",
    highlighted: true,
    badge: "MAIS POPULAR"
  }];
  const steps = [{
    number: "1",
    title: "Cadastre-se Grátis",
    description: "Crie sua conta em menos de 2 minutos"
  }, {
    number: "2",
    title: "Configure sua Barbearia",
    description: "Adicione barbeiros, serviços e horários"
  }, {
    number: "3",
    title: "Comece a Receber Clientes",
    description: "Sistema pronto para usar imediatamente"
  }];
  const faqs = [{
    question: "Preciso de conhecimento técnico para usar?",
    answer: "Não! O BarberPLUS foi criado para ser extremamente simples. Se você consegue usar WhatsApp, consegue usar nossa plataforma. Além disso, oferecemos suporte completo e tutoriais em vídeo."
  }, {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, você pode cancelar quando quiser, sem multas ou taxas adicionais. Não há fidelidade e você mantém acesso até o final do período pago."
  }, {
    question: "Como funciona o período de teste?",
    answer: "Você tem 14 dias para testar todas as funcionalidades gratuitamente, sem precisar cadastrar cartão de crédito. Se gostar, escolhe o plano ideal para você."
  }, {
    question: "Meus dados estão seguros?",
    answer: "Absolutamente. Utilizamos criptografia de ponta e servidores em nuvem com 99.9% de disponibilidade. Seus dados são backupeados diariamente e você tem total controle sobre eles."
  }, {
    question: "Tem limite de agendamentos?",
    answer: "Não! Você pode fazer quantos agendamentos quiser, cadastrar quantos barbeiros precisar e ter quantos clientes desejar. Sem limites ocultos."
  }, {
    question: "Posso migrar de outro sistema?",
    answer: "Sim! Nossa equipe ajuda você a migrar seus dados de forma gratuita e sem perder nenhuma informação importante. O processo é rápido e seguro."
  }];
  return <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center text-white">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
            Transforme sua Barbearia
            <span className="block text-accent mt-2">em um Negócio Digital</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-200">
            Gestão completa, marketing inteligente e mais clientes. 
            Tudo em um único aplicativo. A partir de R$ 69/mês.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-lg h-14 px-8 shadow-lg" onClick={() => navigate("/auth")}>
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 bg-background/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm" onClick={() => document.getElementById('features')?.scrollIntoView({
            behavior: 'smooth'
          })}>
              Ver Funcionalidades
            </Button>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              14 dias grátis
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Sem cartão de crédito
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Cancele quando quiser
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa para crescer
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Funcionalidades profissionais para otimizar cada aspecto da sua barbearia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map(feature => {
            const Icon = feature.icon;
            return <Card key={feature.title} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 sm:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-accent font-semibold mb-2">🔥 Mais de 100 barbearias já usam</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent mb-2">95%</div>
              <p className="text-sm sm:text-base lg:text-lg">Taxa de Satisfação</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent mb-2">+40%</div>
              <p className="text-sm sm:text-base lg:text-lg">Aumento em Agendamentos</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent mb-2">24/7</div>
              <p className="text-sm sm:text-base lg:text-lg">Disponibilidade Online</p>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-accent mb-2">99.9%</div>
              <p className="text-sm sm:text-base lg:text-lg">Uptime Garantido</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-muted-foreground text-lg">Simples, rápido e sem complicação</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-accent/30" />}
              </div>)}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Escolha o plano ideal para sua barbearia. Teste grátis por 14 dias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => <PricingCard key={index} {...plan} />)}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              ✓ Sem contrato de fidelidade • ✓ Cancele quando quiser • ✓ Suporte incluído
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-muted-foreground text-lg">Tudo que você precisa saber</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>)}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-2xl">
            <CardContent className="p-12 text-center">
              <Zap className="h-16 w-16 mx-auto mb-6 text-accent" />
              <h2 className="text-4xl font-bold mb-4">
                Pronto para transformar sua barbearia?
              </h2>
              <p className="text-lg mb-2 max-w-2xl mx-auto opacity-90">
                Teste grátis por 14 dias. Sem cartão de crédito.
              </p>
              <p className="text-sm mb-8 max-w-xl mx-auto opacity-75">
                Junte-se a mais de 100 barbearias que já aumentaram seu faturamento 
                e melhoraram a experiência dos clientes
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg h-14 px-10 shadow-lg" onClick={() => navigate("/auth")}>
                  Criar Minha Conta Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="text-lg h-14 px-8 border-white/20 bg-zinc-100 text-zinc-800">
                  Já tenho conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Coluna 1: Logo e Descrição */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="h-6 w-6 text-accent" />
                <span className="text-xl font-bold">BarberPLUS</span>
              </div>
              <p className="text-sm text-primary-foreground/80 mb-4">
                Sistema completo de gestão para barbearias modernas. Transforme seu negócio com tecnologia.
              </p>
            </div>

            {/* Coluna 2: Links Rápidos */}
            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => document.getElementById('features')?.scrollIntoView({
                  behavior: 'smooth'
                })} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <button onClick={() => document.getElementById('pricing')?.scrollIntoView({
                  behavior: 'smooth'
                })} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Planos e Preços
                  </button>
                </li>
                <li>
                  <button onClick={() => document.getElementById('faq')?.scrollIntoView({
                  behavior: 'smooth'
                })} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Perguntas Frequentes
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Suporte */}
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://wa.me/5541983455701" target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent transition-colors flex items-center gap-2">
                    <span>WhatsApp: (41) 98345-5701</span>
                  </a>
                </li>
                <li>
                  <button onClick={() => navigate("/auth")} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Central de Ajuda
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate("/privacy-policy")} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Política de Privacidade
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/terms-of-service")} className="text-primary-foreground/80 hover:text-accent transition-colors">
                    Termos de Serviço
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Linha de Copyright */}
          <div className="border-t border-primary-foreground/10 pt-8 text-center text-sm text-primary-foreground/60">
            <p>© {new Date().getFullYear()} BarberPLUS. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;