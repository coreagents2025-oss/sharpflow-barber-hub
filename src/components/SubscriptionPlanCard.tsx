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
  weekly: 'sem',
  biweekly: 'qzn',
  monthly: 'mês',
};

export const SubscriptionPlanCard = ({ plan, slug }: SubscriptionPlanCardProps) => {
  const { user, userRole } = useAuth();
  const intervalLabel = billingIntervalLabel[plan.billing_interval] || 'mês';

  const destination = (user && userRole === 'client')
    ? `/${slug}/cliente/dashboard`
    : slug ? `/${slug}/cliente` : '/cliente';

  return (
    <div className="relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Gradient top border */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/80 to-accent" />

      <div className="flex items-center gap-3 p-3">
        {/* Left: icon + info */}
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Crown className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{plan.name}</span>
            {plan.discount_percentage && plan.discount_percentage > 0 && (
              <Badge className="bg-accent text-accent-foreground font-bold gap-0.5 text-[10px] px-1.5 py-0 h-4">
                <Star className="h-2.5 w-2.5 fill-current" />
                -{plan.discount_percentage}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-base font-extrabold text-foreground">
              {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className="text-xs text-muted-foreground">/{intervalLabel}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-primary font-medium">
              {plan.credits_per_month} crédito{plan.credits_per_month !== 1 ? 's' : ''}
            </span>
            {plan.auto_renew && (
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
          )}
        </div>

        {/* Right: CTA */}
        <Button
          asChild
          size="sm"
          className="shrink-0 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs"
        >
          <Link to={destination}>
            Assinar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
