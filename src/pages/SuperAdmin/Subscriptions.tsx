import { useState } from 'react';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { useAllClientSubscriptions } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CheckCircle2, XCircle, TrendingUp, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativa', variant: 'default' },
  expired: { label: 'Expirada', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
  inactive: { label: 'Inativa', variant: 'outline' },
};

const billingLabel: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

export default function SuperAdminSubscriptions() {
  const { data: subscriptions = [], isLoading } = useAllClientSubscriptions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [barbershopFilter, setBarbershopFilter] = useState('all');

  const barbershops = [...new Map(subscriptions.map(s => [s.barbershop_id, s.barbershopName])).entries()];

  const filtered = subscriptions.filter(s => {
    const matchSearch =
      s.clientName.toLowerCase().includes(search.toLowerCase()) ||
      s.clientPhone.includes(search) ||
      s.planName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchBarbershop = barbershopFilter === 'all' || s.barbershop_id === barbershopFilter;
    return matchSearch && matchStatus && matchBarbershop;
  });

  const totalActive = subscriptions.filter(s => s.status === 'active').length;
  const totalExpired = subscriptions.filter(s => s.status === 'expired').length;
  const mrr = subscriptions
    .filter(s => s.status === 'active' && s.billing_interval === 'monthly')
    .reduce((sum, s) => sum + Number(s.planPrice ?? 0), 0);
  const totalAll = subscriptions.length;

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinantes</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão global de todas as assinaturas da plataforma</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalAll}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalActive}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-destructive" /> Expiradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalExpired}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou plano..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="expired">Expirada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={barbershopFilter} onValueChange={setBarbershopFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Barbearia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as barbearias</SelectItem>
              {barbershops.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Carregando assinaturas...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Nenhuma assinatura encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Barbearia</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Créditos</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Expira em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => {
                    const st = statusLabel[s.status] ?? { label: s.status, variant: 'outline' as const };
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium text-foreground text-sm">{s.clientName}</p>
                          <p className="text-xs text-muted-foreground">{s.clientPhone}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.barbershopName}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{s.planName}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(s.planPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-foreground">{s.credits_remaining}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {billingLabel[s.billing_interval] ?? s.billing_interval}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.expires_at
                            ? format(new Date(s.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
