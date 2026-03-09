import { useState } from 'react';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreditCard, CheckCircle2, AlertCircle, Clock, Ban, Search, RefreshCw, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  monthly: 'Mensal',
  annual: 'Anual',
  free: 'Gratuito',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  active: { label: 'Ativo', variant: 'default', icon: CheckCircle2 },
  overdue: { label: 'Inadimplente', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelado', variant: 'outline', icon: XCircle },
  suspended: { label: 'Suspenso', variant: 'destructive', icon: Ban },
};

function PlanStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const, icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function TrialBadge({ trialEndsAt }: { trialEndsAt: string }) {
  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return <Badge variant="destructive" className="flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />Trial expirado</Badge>;
  return <Badge variant="secondary" className="flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />{daysLeft}d de trial</Badge>;
}

export default function SaasBilling() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const { data: barbershops, isLoading } = useQuery({
    queryKey: ['super-admin', 'saas-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbershops')
        .select('id, name, email, plan_type, plan_status, trial_ends_at, platform_asaas_customer_id, platform_asaas_subscription_id, is_suspended, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (barbershopId: string) => {
      const { error } = await supabase
        .from('barbershops')
        .update({ plan_status: 'cancelled', is_suspended: true } as any)
        .eq('id', barbershopId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Assinatura cancelada e barbearia suspensa' });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'saas-billing'] });
    },
    onError: () => {
      toast({ title: 'Erro ao cancelar assinatura', variant: 'destructive' });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (barbershopId: string) => {
      const { error } = await supabase
        .from('barbershops')
        .update({ plan_status: 'active', is_suspended: false } as any)
        .eq('id', barbershopId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Barbearia reativada' });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'saas-billing'] });
    },
    onError: () => {
      toast({ title: 'Erro ao reativar', variant: 'destructive' });
    },
  });

  const filtered = (barbershops ?? []).filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: barbershops?.length ?? 0,
    trial: barbershops?.filter(b => b.plan_type === 'trial').length ?? 0,
    active: barbershops?.filter(b => b.plan_status === 'active' && b.plan_type !== 'trial').length ?? 0,
    overdue: barbershops?.filter(b => b.plan_status === 'overdue').length ?? 0,
    cancelled: barbershops?.filter(b => b.plan_status === 'cancelled').length ?? 0,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas SaaS</h1>
          <p className="text-muted-foreground">Gerencie os planos das barbearias na plataforma</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Em Trial</p>
                <p className="text-2xl font-bold">{stats.trial}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Inadimplentes</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Barbearias</CardTitle>
            <CardDescription>Plano, status e IDs Asaas de cada barbearia</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar barbearia..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Barbearia</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Plano</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">ID Asaas</th>
                      <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Cadastro</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(b => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          {b.plan_type === 'trial' ? (
                            <TrialBadge trialEndsAt={b.trial_ends_at} />
                          ) : (
                            <Badge variant="secondary">{PLAN_LABELS[b.plan_type] ?? b.plan_type}</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <PlanStatusBadge status={b.plan_status} />
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground font-mono">
                            {b.platform_asaas_subscription_id ?? <span className="italic">—</span>}
                          </p>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {b.plan_status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setCancelTarget(b.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                            {(b.plan_status === 'cancelled' || b.plan_status === 'suspended' || b.is_suspended) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reactivateMutation.mutate(b.id)}
                                disabled={reactivateMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reativar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Nenhuma barbearia encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook URL Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URL do Webhook Asaas</CardTitle>
            <CardDescription>Configure esta URL no painel Asaas para receber notificações automáticas de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-3 font-mono text-xs break-all text-foreground">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/asaas-platform-webhook`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Eventos a ativar: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso suspenderá o acesso desta barbearia à plataforma imediatamente. A assinatura no Asaas deve ser cancelada manualmente no painel Asaas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget); setCancelTarget(null); }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
}
