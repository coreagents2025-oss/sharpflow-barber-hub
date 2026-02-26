import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(0, 70%, 55%)'];

export default function SuperAdminMetrics() {
  const { data: serviceStats } = useQuery({
    queryKey: ['super-admin', 'service-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('name, barbershop_id');
      
      const nameCount: Record<string, number> = {};
      (data ?? []).forEach(s => {
        nameCount[s.name] = (nameCount[s.name] || 0) + 1;
      });

      return Object.entries(nameCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    },
  });

  const { data: signupsByMonth } = useQuery({
    queryKey: ['super-admin', 'signups-by-month'],
    queryFn: async () => {
      const { data } = await supabase
        .from('barbershops')
        .select('created_at');

      const monthCount: Record<string, number> = {};
      (data ?? []).forEach(b => {
        const month = b.created_at.substring(0, 7); // YYYY-MM
        monthCount[month] = (monthCount[month] || 0) + 1;
      });

      return Object.entries(monthCount)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, count]) => ({ month, count }));
    },
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas</h1>
          <p className="text-muted-foreground">Análise de dados da plataforma</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastros de Barbearias por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={signupsByMonth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Serviços Mais Populares (cross-barbearia)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceStats ?? []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, count }) => `${name} (${count})`}
                  >
                    {(serviceStats ?? []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
