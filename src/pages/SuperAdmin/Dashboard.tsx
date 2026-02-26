import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, DollarSign, TrendingUp, UserCheck, MessageSquare, AlertCircle } from 'lucide-react';
import { usePlatformStats } from '@/hooks/useSuperAdminData';

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = usePlatformStats();

  const cards = [
    { title: 'Barbearias', value: stats?.totalBarbershops ?? 0, icon: Building2, color: 'text-blue-500' },
    { title: 'Usuários Total', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-green-500' },
    { title: 'Agendamentos Total', value: stats?.totalAppointments ?? 0, icon: Calendar, color: 'text-purple-500' },
    { title: 'Faturamento Total', value: `R$ ${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-accent' },
    { title: 'Agendamentos Hoje', value: stats?.todayAppointments ?? 0, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'Tickets Abertos', value: stats?.openTickets ?? 0, icon: MessageSquare, color: 'text-red-500' },
    { title: 'Admins / Barbeiros / Clientes', value: `${stats?.adminCount ?? 0} / ${stats?.barberCount ?? 0} / ${stats?.clientCount ?? 0}`, icon: UserCheck, color: 'text-cyan-500' },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard da Plataforma</h1>
          <p className="text-muted-foreground">Visão geral de toda a plataforma</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
