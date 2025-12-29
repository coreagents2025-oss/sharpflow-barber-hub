import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionBadgeProps {
  creditsRemaining: number;
  totalCredits?: number;
  expiresAt?: string | null;
  className?: string;
}

export function SubscriptionBadge({
  creditsRemaining,
  totalCredits,
  expiresAt,
  className,
}: SubscriptionBadgeProps) {
  const isExpiringSoon = expiresAt
    ? new Date(expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  const isLowCredits = creditsRemaining <= 1;

  const getVariant = () => {
    if (creditsRemaining === 0) return 'destructive';
    if (isLowCredits || isExpiringSoon) return 'secondary';
    return 'default';
  };

  const getIcon = () => {
    if (creditsRemaining === 0) return <AlertTriangle className="h-3 w-3" />;
    if (isLowCredits) return <AlertTriangle className="h-3 w-3" />;
    return <CreditCard className="h-3 w-3" />;
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn(
        'flex items-center gap-1',
        creditsRemaining > 0 && !isLowCredits && 'bg-green-600 hover:bg-green-700',
        className
      )}
    >
      {getIcon()}
      <span>
        {creditsRemaining}
        {totalCredits ? `/${totalCredits}` : ''} crédito{creditsRemaining !== 1 ? 's' : ''}
      </span>
    </Badge>
  );
}
