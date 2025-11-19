import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Banknote, Smartphone, DollarSign } from 'lucide-react';

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

export const PaymentModal = ({ isOpen, onClose, appointment, onSuccess }: PaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [tip, setTip] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = appointment.service.price + Number(tip);

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    
    try {
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
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsSubmitting(false);
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

          {/* Forma de Pagamento */}
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
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmPayment} disabled={isSubmitting}>
            {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
