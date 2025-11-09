import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock,
  Scissors
} from "lucide-react";

const stats = [
  {
    title: "Agendamentos Hoje",
    value: "24",
    change: "+12%",
    icon: Calendar,
    trend: "up",
  },
  {
    title: "Faturamento Mensal",
    value: "R$ 18.450",
    change: "+23%",
    icon: DollarSign,
    trend: "up",
  },
  {
    title: "Clientes Ativos",
    value: "342",
    change: "+8%",
    icon: Users,
    trend: "up",
  },
  {
    title: "Taxa de Ocupação",
    value: "87%",
    change: "+5%",
    icon: TrendingUp,
    trend: "up",
  },
];

const recentAppointments = [
  { id: 1, client: "Carlos Silva", service: "Corte + Barba", time: "09:00", barber: "João Silva", status: "Concluído" },
  { id: 2, client: "Pedro Santos", service: "Corte Clássico", time: "10:30", barber: "Rafael Costa", status: "Concluído" },
  { id: 3, client: "Lucas Oliveira", service: "Barba Completa", time: "14:00", barber: "Pedro Santos", status: "Em andamento" },
  { id: 4, client: "Rafael Martins", service: "Pacote Premium", time: "15:30", barber: "João Silva", status: "Agendado" },
  { id: 5, client: "Bruno Costa", service: "Barbear Tradicional", time: "17:00", barber: "Carlos Oliveira", status: "Agendado" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Visão geral do seu negócio em tempo real
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-accent flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{stat.change} vs mês anterior</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Agendamentos Recentes
              </CardTitle>
              <CardDescription>
                Últimos agendamentos do dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {recentAppointments.map((appointment) => (
                  <div 
                    key={appointment.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Scissors className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{appointment.client}</p>
                        <p className="text-sm text-muted-foreground truncate">{appointment.service}</p>
                      </div>
                    </div>
                    <div className="flex justify-between sm:text-right sm:block pl-13 sm:pl-0">
                      <div>
                        <p className="font-medium">{appointment.time}</p>
                        <p className="text-sm text-muted-foreground truncate">{appointment.barber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Serviços Mais Populares
              </CardTitle>
              <CardDescription>
                Ranking dos serviços mais solicitados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {[
                  { name: "Corte + Barba", count: 45, percentage: 35 },
                  { name: "Corte Clássico", count: 38, percentage: 29 },
                  { name: "Barba Completa", count: 26, percentage: 20 },
                  { name: "Pacote Premium", count: 12, percentage: 9 },
                  { name: "Barbear Tradicional", count: 9, percentage: 7 },
                ].map((service) => (
                  <div key={service.name} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">{service.name}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        {service.count} agendamentos
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${service.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
