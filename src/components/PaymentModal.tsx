import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Banknote, Smartphone, DollarSign, Sparkles, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    unified_client_id: string;
    client_type: 'lead' | 'client';
    barbershop_id: string;
    service: {
      name: string;
      price: number;
    };
    client: {
      full_name: string;
    };
  };
  onSuccess: () => void;
}

interface SubscriptionInfo {
  id: string;
  credits_remaining: number;
  service?: {
    name: string;
    credits_per_month: number;
  };
}

export const PaymentModal = ({ isOpen, onClose, appointment, onSuccess }: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentType, setPaymentType] = useState<'normal' | 'subscription'>('normal');
  const [tip, setTip] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const totalAmount = appointment.service.price + Number(tip);

  // Buscar assinatura ativa do cliente
  useEffect(() => {
    if (isOpen && appointment.client_type === 'lead' && appointment.unified_client_id) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setPaymentType('normal');
    }
  }, [isOpen, appointment.unified_client_id, appointment.client_type]);

  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          id,
          credits_remaining,
          services:service_id (
            name,
            credits_per_month
          )
        `)
        .eq('lead_id', appointment.unified_client_id)
        .eq('status', 'active')
        .gt('credits_remaining', 0)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription({
          id: data.id,
          credits_remaining: data.credits_remaining,
          service: data.services as any,
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    
    try {
      if (paymentType === 'subscription' && subscription) {
        // Usar crédito da assinatura
        await handleSubscriptionPayment();
      } else {
        // Pagamento normal
        await handleNormalPayment();
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscriptionPayment = async () => {
    if (!subscription) throw new Error('Assinatura não encontrada');

    // 1. Registrar uso do crédito
    const { error: usageError } = await supabase
      .from('subscription_credit_usage')
      .insert({
        subscription_id: subscription.id,
        appointment_id: appointment.id,
        notes: `Crédito usado para: ${appointment.service.name}`,
      });

    if (usageError) throw usageError;

    // 2. Decrementar créditos
    const { error: updateError } = await supabase
      .from('client_subscriptions')
      .update({ credits_remaining: subscription.credits_remaining - 1 })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    // 3. Marcar appointment como completed
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment.id);

    if (appointmentError) throw appointmentError;

    toast.success(`Crédito utilizado! Restam ${subscription.credits_remaining - 1} créditos`);
  };

  const handleNormalPayment = async () => {
    // Determinar se é client_id ou lead_id
    const paymentData: any = {
      appointment_id: appointment.id,
      barbershop_id: appointment.barbershop_id,
      amount: totalAmount,
      payment_method: paymentMethod,
      status: 'completed',
    };

    // Adicionar client_id OU lead_id baseado no tipo
    if (appointment.client_type === 'client') {
      paymentData.client_id = appointment.unified_client_id;
      paymentData.lead_id = null;
    } else {
      paymentData.lead_id = appointment.unified_client_id;
      paymentData.client_id = null;
    }

    const { error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData);

    if (paymentError) throw paymentError;

    // 2. Atualizar status do appointment
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment.id);

    if (appointmentError) throw appointmentError;

    // 3. Registrar no fluxo de caixa
    const { data: user } = await supabase.auth.getUser();
    
    const { error: cashFlowError } = await supabase.from('cash_flow').insert({
      barbershop_id: appointment.barbershop_id,
      type: 'income',
      category: 'service',
      amount: totalAmount,
      description: `Pagamento - ${appointment.service.name} - ${appointment.client.full_name}`,
      reference_id: appointment.id,
      reference_type: 'appointment',
      payment_method: paymentMethod,
      transaction_date: new Date().toISOString().split('T')[0],
      created_by: user.user?.id
    });

    // Verificar erro no cash_flow (não crítico, trigger garante a sincronia)
    if (cashFlowError) {
      console.error('Error inserting cash flow:', cashFlowError);
      toast.warning('Pagamento registrado, mas fluxo de caixa será sincronizado automaticamente');
    } else {
      toast.success('Pagamento registrado com sucesso!');
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'pix':
        return <Smartphone className="h-4 w-4" />;
      case 'debit':
      case 'credit':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Pagamento</DialogTitle>
          <DialogDescription>
            Registre o pagamento do atendimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cliente e Serviço */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente:</span>
              <span className="font-medium">{appointment.client.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Serviço:</span>
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor:</span>
              <span className="font-medium">R$ {appointment.service.price.toFixed(2)}</span>
            </div>
          </div>

          {/* Aviso de Assinatura */}
          {subscription && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  Cliente possui assinatura ativa
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Créditos disponíveis:</span>
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {subscription.credits_remaining} / {subscription.service?.credits_per_month || '?'}
                </Badge>
              </div>
            </div>
          )}

          {/* Tipo de Pagamento (se tiver assinatura) */}
          {subscription && (
            <RadioGroup
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as 'normal' | 'subscription')}
              className="space-y-2"
            >
              <div 
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentType === 'subscription' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => setPaymentType('subscription')}
              >
                <RadioGroupItem value="subscription" id="subscription" />
                <Label htmlFor="subscription" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span>Usar Crédito da Assinatura</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Debita 1 crédito, sem cobrança adicional
                  </p>
                </Label>
              </div>
              <div 
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentType === 'normal' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => setPaymentType('normal')}
              >
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Cobrar Pagamento Normal</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registra pagamento em dinheiro/cartão
                  </p>
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Forma de Pagamento (apenas se pagamento normal) */}
          {paymentType === 'normal' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(paymentMethod)}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Pix
                      </div>
                    </SelectItem>
                    <SelectItem value="debit">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Débito
                      </div>
                    </SelectItem>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Crédito
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gorjeta */}
              <div className="space-y-2">
                <Label htmlFor="tip">Gorjeta (opcional)</Label>
                <Input
                  id="tip"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Total */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total a Pagar:</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Resumo para pagamento com assinatura */}
          {paymentType === 'subscription' && subscription && (
            <div className="bg-green-500/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Créditos após uso:</span>
                <span className="text-2xl font-bold text-green-600">
                  {subscription.credits_remaining - 1}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sem cobrança adicional - serviço coberto pela assinatura
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmPayment} disabled={isSubmitting || loadingSubscription}>
            {isSubmitting ? 'Processando...' : paymentType === 'subscription' ? 'Usar Crédito' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
