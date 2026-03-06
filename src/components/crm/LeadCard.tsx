import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeadStatusBadge } from './LeadStatusBadge';
import { Lead } from '@/hooks/useLeads';
import { MessageCircle, Calendar, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeadCardProps {
  lead: Lead;
  isSelected: boolean;
  onClick: () => void;
}

export function LeadCard({ lead, isSelected, onClick }: LeadCardProps) {
  const initials = lead.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const daysSinceLastInteraction = lead.last_interaction_at 
    ? Math.floor((Date.now() - new Date(lead.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const needsAttention = 
    (lead.status === 'contacted' && daysSinceLastInteraction > 7) ||
    (lead.status === 'active' && daysSinceLastInteraction > 30) ||
    (lead.status === 'new' && daysSinceLastInteraction > 3);

  return (
    <Card
      className={`p-2.5 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={lead.avatar_url} alt={lead.full_name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="font-semibold text-sm truncate">{lead.full_name}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {needsAttention && (
                <Badge variant="destructive" className="h-4 text-[9px] px-1 py-0">
                  !
                </Badge>
              )}
              {lead.unread_messages > 0 && (
                <Badge variant="destructive" className="h-4 px-1 py-0 text-[9px]">
                  <MessageCircle className="h-2.5 w-2.5 mr-0.5" />
                  {lead.unread_messages}
                </Badge>
              )}
              <LeadStatusBadge status={lead.status} />
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-0.5">
            <span className="truncate">{lead.phone}</span>
            <span className="flex items-center gap-0.5 shrink-0">
              <Calendar className="h-3 w-3" />
              {lead.total_appointments}
            </span>
            <span className="flex items-center gap-0.5 shrink-0">
              <DollarSign className="h-3 w-3" />
              R${lead.total_spent.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
