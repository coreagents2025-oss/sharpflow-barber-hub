import { LeadCard } from './LeadCard';
import { Lead } from '@/hooks/useLeads';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeadsListProps {
  leads: Lead[];
  selectedLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
  loading: boolean;
}

export function LeadsList({ leads, selectedLead, onSelectLead, loading }: LeadsListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-muted-foreground p-8">
        <div>
          <p className="text-lg font-medium mb-2">Nenhum lead encontrado</p>
          <p className="text-sm">Os leads aparecerão aqui quando clientes realizarem agendamentos</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isSelected={selectedLead?.id === lead.id}
            onClick={() => onSelectLead(lead)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
