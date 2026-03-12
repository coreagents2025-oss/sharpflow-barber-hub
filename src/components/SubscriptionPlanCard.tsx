import { Link } from 'react-router-dom';
import { Crown, ArrowRight, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  credits_per_month: number;
  billing_interval: string;
  auto_renew: boolean;
  discount_percentage: number | null;
}

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  slug: string | undefined;
}

const billingIntervalLabel: Record<string, string> = {
  weekly: 'semana',
  biweekly: 'quinzena',
  monthly: 'mês',
};

const billingIntervalCreditsLabel: Record<string, string> = {
  weekly: 'semana',
  biweekly: 'quinzena',
  monthly: 'mês',
};

export const SubscriptionPlanCard = ({ plan, slug }: SubscriptionPlanCardProps) => {
  const { user, userRole } = useAuth();
  const intervalLabel = billingIntervalLabel[plan.billing_interval] || 'mês';
  const creditsLabel = billingIntervalCreditsLabel[plan.billing_interval] || 'mês';

  const destination = (user && userRole === 'client')
    ? `/${slug}/cliente/dashboard`
    : slug ? `/${slug}/cliente` : '/cliente';

  return (
    <div className="relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Gradient top border */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-accent" />

      {/* Discount badge */}
      {plan.discount_percentage && plan.discount_percentage > 0 && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-accent text-accent-foreground font-bold gap-1">
            <Star className="h-3 w-3 fill-current" />
            -{plan.discount_percentage}%
          </Badge>
        </div>
      )}

      <div className="flex flex-col gap-4 p-5 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-[11px] font-semibold px-2 py-0 gap-1">
                <Crown className="h-2.5 w-2.5" />
                Assinatura
              </Badge>
            </div>
            <h3 className="font-bold text-foreground text-base mt-1 leading-tight">{plan.name}</h3>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end gap-1">
          <span className="text-3xl font-extrabold text-foreground">
            {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-sm text-muted-foreground mb-1">/{intervalLabel}</span>
        </div>

        {/* Description */}
        {plan.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
        )}

        {/* Credits info */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 bg-primary/8 text-primary rounded-md px-2.5 py-1 font-medium">
            <Crown className="h-3.5 w-3.5" />
            {plan.credits_per_month} crédito{plan.credits_per_month !== 1 ? 's' : ''}
            /{creditsLabel}
          </span>
          {plan.auto_renew && (
            <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs">
              <RefreshCw className="h-3 w-3" />
              Renovação automática
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <Button
          asChild
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Link to={slug ? `/${slug}/cliente` : '/cliente'}>
            Assinar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
