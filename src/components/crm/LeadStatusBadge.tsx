import { Badge } from '@/components/ui/badge';
import { LeadStatus } from '@/hooks/useLeads';
import { Star, TrendingUp, User, Clock, XCircle } from 'lucide-react';

interface LeadStatusBadgeProps {
  status: LeadStatus;
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const configs = {
    novo: {
      label: 'Novo',
      icon: User,
      className: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    },
    ativo: {
      label: 'Ativo',
      icon: TrendingUp,
      className: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    },
    inativo: {
      label: 'Inativo',
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20',
    },
    vip: {
      label: 'VIP',
      icon: Star,
      className: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
    },
    perdido: {
      label: 'Perdido',
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
