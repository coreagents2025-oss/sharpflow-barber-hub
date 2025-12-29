import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LeadSubscription } from '@/hooks/useLeadSubscription';
import { 
  CreditCard, 
  Calendar, 
  RefreshCw, 
  XCircle, 
  Sparkles,
  AlertTriangle 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionPanelProps {
  subscription: LeadSubscription | null;
  onRenew: () => Promise<boolean>;
  onCancel: () => Promise<boolean>;
  onSell: () => void;
}

export function SubscriptionPanel({
  subscription,
  onRenew,
  onCancel,
  onSell,
}: SubscriptionPanelProps) {
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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

  const plan = subscription.service;
  const totalCredits = plan?.credits_per_month ?? 0;
  const usedCredits = totalCredits - subscription.credits_remaining;
  const progressPercent = totalCredits > 0 ? (subscription.credits_remaining / totalCredits) * 100 : 0;

  const daysRemaining = subscription.expires_at
    ? differenceInDays(new Date(subscription.expires_at), new Date())
    : null;

  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  return (
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
      </CardContent>
    </Card>
  );
}
