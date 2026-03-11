import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientPortal } from '@/hooks/useClientPortal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Scissors,
  Calendar,
  CreditCard,
  Clock,
  LogOut,
  AlertCircle,
  Star,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, parseISO, isAfter, formatDistanceToNow, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const intervalLabel: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Agendado', variant: 'default' },
  completed: { label: 'Concluído', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  no_show: { label: 'Faltou', variant: 'destructive' },
  in_progress: { label: 'Em andamento', variant: 'default' },
};

const ClientDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { barbershop, subscription, pendingPayments, appointments, loading, hasAccess } = useClientPortal(slug);

  // Password change state
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    // signOut already redirects via window.location.href — no navigate needed
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setPwDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Acesso não autorizado</h2>
        <p className="text-muted-foreground max-w-sm">
          Sua conta não está vinculada a esta barbearia. Verifique se fez o cadastro pelo link correto.
        </p>
        <Button variant="outline" onClick={handleSignOut}>Sair</Button>
      </div>
    );
  }

  const isExpired = subscription?.expires_at
    ? !isAfter(parseISO(subscription.expires_at), new Date())
    : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {barbershop?.logo_url ? (
              <img
                src={barbershop.logo_url}
                alt={barbershop.name}
                className="h-9 w-9 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm leading-tight">{barbershop?.name}</p>
              <p className="text-xs text-muted-foreground">Área do Assinante</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">Olá! 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{user?.email}</p>
        </div>

        {/* Active Subscription Card */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Minha Assinatura
          </h2>
          {subscription ? (
            <Card className={`border-2 ${isExpired ? 'border-destructive/40' : 'border-primary/30'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                      {subscription.plan_name}
                    </CardTitle>
                    <CardDescription>
                      {intervalLabel[subscription.billing_interval] ?? subscription.billing_interval} •{' '}
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subscription.plan_price)}
                    </CardDescription>
                  </div>
                  <Badge variant={isExpired ? 'destructive' : 'default'}>
                    {isExpired ? 'Vencida' : 'Ativa'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{subscription.credits_remaining}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Créditos restantes</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-sm font-semibold">
                      {subscription.expires_at
                        ? format(parseISO(subscription.expires_at), "dd 'de' MMM", { locale: ptBR })
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Vencimento</p>
                  </div>
                </div>
                {subscription.next_billing_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Próxima cobrança:{' '}
                      <strong className="text-foreground">
                        {format(parseISO(subscription.next_billing_date), "dd/MM/yyyy", { locale: ptBR })}
                      </strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Scissors className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium">Nenhuma assinatura ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Entre em contato com a barbearia para assinar um plano.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to={`/${slug}`}>Ver catálogo</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Cobranças Pendentes
            </h2>
            <div className="space-y-2">
              {pendingPayments.map((payment) => (
                <Card key={payment.id} className="border-destructive/30">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vence em {format(parseISO(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-destructive border-destructive/50 text-xs">
                      Pendente
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground px-1">
                💡 Realize o pagamento via PIX e aguarde a confirmação da barbearia.
              </p>
            </div>
          </section>
        )}

        {/* Recent Appointments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Últimos Agendamentos
            </h2>
          </div>
          {appointments.length > 0 ? (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {appointments.map((appt, i) => {
                  const cfg = statusConfig[appt.status] ?? { label: appt.status, variant: 'outline' as const };
                  return (
                    <div key={appt.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{appt.service_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(appt.scheduled_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            {appt.barber_name ? ` · ${appt.barber_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                Nenhum agendamento encontrado.
              </CardContent>
            </Card>
          )}
        </section>

        {/* Security Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Segurança
          </h2>
          <Card>
            <CardContent className="py-4 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Senha de acesso</p>
                  <p className="text-xs text-muted-foreground">Altere sua senha a qualquer momento</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPwDialogOpen(true)}>
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Actions */}
        <Separator />
        <div className="flex flex-col sm:flex-row gap-3 pb-6">
          <Button asChild className="flex-1">
            <Link to={`/${slug}`}>
              <Scissors className="h-4 w-4 mr-2" />
              Agendar horário
            </Link>
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="flex-1 sm:flex-none">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={(o) => {
        setPwDialogOpen(o);
        if (!o) { setNewPassword(''); setConfirmPassword(''); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Alterar senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para acessar o portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
              <Input
                id="confirm-pw"
                type={showPw ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPwDialogOpen(false)} disabled={changingPw}>
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!newPassword || !confirmPassword || changingPw}
            >
              {changingPw ? 'Salvando...' : 'Salvar senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;
