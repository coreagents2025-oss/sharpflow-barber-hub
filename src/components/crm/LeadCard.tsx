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
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={lead.avatar_url} alt={lead.full_name} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{lead.full_name}</h3>
            <div className="flex items-center gap-1">
              {needsAttention && (
                <Badge variant="destructive" className="h-5 text-xs px-1.5">
                  Atenção
                </Badge>
              )}
              <LeadStatusBadge status={lead.status} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2">{lead.phone}</p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{lead.total_appointments}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>R$ {lead.total_spent.toFixed(0)}</span>
            </div>
            {lead.notes_count > 0 && (
              <div className="flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                <span>{lead.notes_count}</span>
              </div>
            )}
            {lead.unread_messages > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                <MessageCircle className="h-3 w-3 mr-1" />
                {lead.unread_messages}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
