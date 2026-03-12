import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadSubscription } from '@/hooks/useLeadSubscription';
import {
  CreditCard,
  Calendar,
  RefreshCw,
  XCircle,
  Sparkles,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionPanelProps {
  subscription: LeadSubscription | null;
  onRenew: () => Promise<boolean>;
  onCancel: () => Promise<boolean>;
  onSell: () => void;
  onRegisterPayment: (paymentMethod: string) => Promise<boolean>;
}

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
];

export function SubscriptionPanel({
  subscription,
  onRenew,
  onCancel,
  onSell,
  onRegisterPayment,
}: SubscriptionPanelProps) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pix');

  const handleRenew = async () => {
    setIsRenewing(true);
    await onRenew();
    setIsRenewing(false);
  };

  const handleCancel = async () => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura?')) return;
    setIsCancelling(true);
    await onCancel();
    setIsCancelling(false);
  };

  const handleConfirmPayment = async () => {
    setIsRegisteringPayment(true);
    const success = await onRegisterPayment(selectedPaymentMethod);
    setIsRegisteringPayment(false);
    if (success) {
      setShowPaymentDialog(false);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center py-2">
            Este cliente não possui assinatura ativa.
          </p>
          <Button onClick={onSell} className="w-full" variant="outline">
            <CreditCard className="h-4 w-4 mr-2" />
            Vender Assinatura
          </Button>
        </CardContent>
      </Card>
    );
  }

  const plan = subscription.plan;
  const totalCredits = plan?.credits_per_month ?? 0;
  const usedCredits = totalCredits - subscription.credits_remaining;
  const progressPercent = totalCredits > 0 ? (subscription.credits_remaining / totalCredits) * 100 : 0;

  const daysRemaining = subscription.expires_at
    ? differenceInDays(new Date(subscription.expires_at), new Date())
    : null;

  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Assinatura
            </span>
            <Badge
              variant={isExpired ? 'destructive' : isExpiringSoon ? 'secondary' : 'default'}
              className={!isExpired && !isExpiringSoon ? 'bg-green-600' : ''}
            >
              {isExpired ? 'Expirada' : isExpiringSoon ? 'Expirando' : 'Ativa'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome do Plano */}
          <div>
            <p className="font-semibold">{plan?.name ?? 'Plano'}</p>
            <p className="text-sm text-muted-foreground">
              R$ {plan?.price?.toFixed(2) ?? '0.00'}/mês
            </p>
          </div>

          <Separator />

          {/* Créditos */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Créditos
              </span>
              <span className="font-semibold">
                {subscription.credits_remaining} / {totalCredits}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {usedCredits} crédito{usedCredits !== 1 ? 's' : ''} utilizado{usedCredits !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Validade */}
          {subscription.expires_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Validade
              </span>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {format(new Date(subscription.expires_at), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                {daysRemaining !== null && (
                  <p className={`text-xs ${isExpiringSoon ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {isExpired ? 'Expirada' : `${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Alerta */}
          {(isExpiringSoon || subscription.credits_remaining <= 1) && !isExpired && (
            <div className="flex items-center gap-2 p-2 rounded bg-orange-500/10 text-orange-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {isExpiringSoon && 'Assinatura expirando em breve.'}
                {subscription.credits_remaining <= 1 && !isExpiringSoon && 'Poucos créditos restantes.'}
              </span>
            </div>
          )}

          <Separator />

          {/* Ações */}
          <div className="space-y-2">
            {/* Registrar Pagamento */}
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => setShowPaymentDialog(true)}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Registrar Pagamento
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRenew}
                disabled={isRenewing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRenewing ? 'animate-spin' : ''}`} />
                Renovar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Registrar Pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">{plan?.name}</p>
              <p className="text-muted-foreground">
                Valor: <span className="font-semibold text-foreground">R$ {plan?.price?.toFixed(2)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de pagamento</label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isRegisteringPayment}>
              {isRegisteringPayment ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
