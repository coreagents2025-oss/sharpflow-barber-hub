import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SubscriptionPlan } from '@/hooks/useLeadSubscription';
import { CreditCard, Calendar, Sparkles } from 'lucide-react';

interface SellSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  plans: SubscriptionPlan[];
  onConfirm: (planId: string) => Promise<boolean>;
}

export function SellSubscriptionDialog({
  open,
  onOpenChange,
  leadName,
  plans,
  onConfirm,
}: SellSubscriptionDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedPlanId) return;
    
    setIsSubmitting(true);
    const success = await onConfirm(selectedPlanId);
    setIsSubmitting(false);
    
    if (success) {
      onOpenChange(false);
      setSelectedPlanId('');
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vender Assinatura
          </DialogTitle>
          <DialogDescription>
            Selecione um plano de assinatura para {leadName}
          </DialogDescription>
        </DialogHeader>

        {plans.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhum plano de assinatura disponível.</p>
            <p className="text-sm mt-2">
              Crie planos em Gerenciar Serviços marcando "Plano de Assinatura".
            </p>
          </div>
        ) : (
          <RadioGroup
            value={selectedPlanId}
            onValueChange={setSelectedPlanId}
            className="space-y-3"
          >
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${
                  selectedPlanId === plan.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={plan.id} className="cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{plan.name}</span>
                        <Badge variant="secondary" className="font-bold">
                          R$ {plan.price.toFixed(2)}
                        </Badge>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {plan.credits_per_month} créditos
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {plan.subscription_duration_days} dias
                        </span>
                      </div>
                    </Label>
                  </div>
                </div>
              </Card>
            ))}
          </RadioGroup>
        )}

        {selectedPlan && (
          <div className="bg-primary/10 p-4 rounded-lg mt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total a receber:</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {selectedPlan.price.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Créditos:</p>
                <p className="text-xl font-semibold">{selectedPlan.credits_per_month}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || isSubmitting}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar Venda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
