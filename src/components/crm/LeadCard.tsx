import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeadStatusBadge } from './LeadStatusBadge';
import { Lead } from '@/hooks/useLeads';
import { MessageCircle, Calendar, DollarSign, StickyNote } from 'lucide-react';
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

  // Calcular se precisa de atenção
  const daysSinceLastInteraction = lead.last_interaction_at 
    ? Math.floor((Date.now() - new Date(lead.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const needsAttention = 
    (lead.status === 'contacted' && daysSinceLastInteraction > 7) ||
    (lead.status === 'active' && daysSinceLastInteraction > 30) ||
    (lead.status === 'new' && daysSinceLastInteraction > 3);

  return (
    <Card
      className={`p-5 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={lead.avatar_url} alt={lead.full_name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-base">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-base truncate">{lead.full_name}</h3>
            <div className="flex items-center gap-1.5">
              {needsAttention && (
                <Badge variant="destructive" className="h-6 text-xs px-2">
                  Atenção
                </Badge>
              )}
              <LeadStatusBadge status={lead.status} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{lead.phone}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{lead.total_appointments}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              <span>R$ {lead.total_spent.toFixed(0)}</span>
            </div>
            {lead.notes_count > 0 && (
              <div className="flex items-center gap-1.5">
                <StickyNote className="h-4 w-4" />
                <span>{lead.notes_count}</span>
              </div>
            )}
            {lead.unread_messages > 0 && (
              <Badge variant="destructive" className="h-6 px-2">
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                {lead.unread_messages}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
