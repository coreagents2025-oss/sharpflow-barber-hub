import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useLeads, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { LeadsFilters } from '@/components/crm/LeadsFilters';
import { LeadsList } from '@/components/crm/LeadsList';
import { LeadDetailsPanel } from '@/components/crm/LeadDetailsPanel';
import { LeadMetrics } from '@/components/crm/LeadMetrics';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const CRM = () => {
  const { barbershopId } = useAuth();
  const { leads, loading, metrics } = useLeads(barbershopId);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all' | 'needs_contact' | 'at_risk' | 'inactive' | 'archived'>('all');
  const [metricsOpen, setMetricsOpen] = useState(false);
  const isMobile = useIsMobile();

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = 
        lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);

      if (statusFilter !== 'archived' && lead.archived_at) return false;
      if (statusFilter === 'archived') return matchesSearch && !!lead.archived_at;

      const daysSinceLastInteraction = lead.last_interaction_at 
        ? Math.floor((Date.now() - new Date(lead.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let matchesStatus = false;
      if (statusFilter === 'all') matchesStatus = true;
      else if (statusFilter === 'needs_contact') matchesStatus = lead.status === 'new' && daysSinceLastInteraction > 7;
      else if (statusFilter === 'at_risk') matchesStatus = lead.status === 'active' && daysSinceLastInteraction > 60;
      else if (statusFilter === 'inactive') matchesStatus = daysSinceLastInteraction > 90 && lead.total_appointments > 0;
      else matchesStatus = lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleCloseSheet = (open: boolean) => {
    if (!open) setSelectedLead(null);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <div className="flex-1 flex flex-col px-3 py-3 overflow-hidden">
          <div className="mb-2">
            <h1 className="text-xl font-bold">CRM</h1>
          </div>

          <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 mb-2 text-xs text-muted-foreground">
                Métricas
                {metricsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <LeadMetrics metrics={metrics} />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden min-h-0">
            <LeadsFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
            <div className="flex-1 overflow-hidden">
              <LeadsList
                leads={filteredLeads}
                selectedLead={selectedLead}
                onSelectLead={handleSelectLead}
                loading={loading}
              />
            </div>
          </div>
        </div>

        <Sheet open={!!selectedLead} onOpenChange={handleCloseSheet}>
          <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-xl">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-left">{selectedLead?.full_name}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto h-[calc(85vh-60px)]">
              <LeadDetailsPanel lead={selectedLead} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-1">CRM de Leads</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seus leads e acompanhe o relacionamento
          </p>
        </div>

        <LeadMetrics metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
          <div className="lg:col-span-4 flex flex-col border rounded-lg bg-card overflow-hidden">
            <LeadsFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
            <div className="flex-1 overflow-hidden">
              <LeadsList
                leads={filteredLeads}
                selectedLead={selectedLead}
                onSelectLead={setSelectedLead}
                loading={loading}
              />
            </div>
          </div>

          <div className="lg:col-span-8 border rounded-lg bg-card overflow-hidden">
            <LeadDetailsPanel lead={selectedLead} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRM;
