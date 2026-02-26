import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedMetrics } from '@/hooks/useSuperAdminData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Activity, AlertTriangle } from 'lucide-react';

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(200, 70%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(0, 70%, 55%)'];
const RETENTION_COLORS = ['hsl(150, 60%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 70%, 55%)'];

export default function SuperAdminMetrics() {
  const { data: metrics, isLoading } = useAdvancedMetrics();

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="text-center text-muted-foreground p-12">Carregando métricas...</div>
      </SuperAdminLayout>
    );
  }

  const retentionData = [
    { name: 'Ativas', value: metrics?.retention.activeCount ?? 0 },
    { name: 'Inativas', value: metrics?.retention.inactiveCount ?? 0 },
    { name: 'Suspensas', value: metrics?.retention.suspendedCount ?? 0 },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas Avançadas</h1>
          <p className="text-muted-foreground">Análise detalhada da plataforma</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Barbearias Ativas</p>
                <p className="text-2xl font-bold">{metrics?.retention.activeCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inativas (30d)</p>
                <p className="text-2xl font-bold">{metrics?.retention.inactiveCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Suspensas</p>
                <p className="text-2xl font-bold">{metrics?.retention.suspendedCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.funnel ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="stage" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(metrics?.funnel ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Retention Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retenção / Churn</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={retentionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {retentionData.map((_, i) => (
                      <Cell key={i} fill={RETENTION_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics?.revenueTimeline ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Receita']} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking de Barbearias</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Barbearia</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Agend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metrics?.ranking ?? []).map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Badge variant={i < 3 ? 'default' : 'outline'} className="text-xs">{i + 1}º</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{b.name}</TableCell>
                      <TableCell className="text-right text-sm">R$ {b.revenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm">{b.appointments}</TableCell>
                    </TableRow>
                  ))}
                  {(metrics?.ranking ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem dados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
