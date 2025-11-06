import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useLeads, Lead, LeadStatus } from '@/hooks/useLeads';
import { LeadsFilters } from '@/components/crm/LeadsFilters';
import { LeadsList } from '@/components/crm/LeadsList';
import { LeadDetailsPanel } from '@/components/crm/LeadDetailsPanel';
import { LeadMetrics } from '@/components/crm/LeadMetrics';

const CRM = () => {
  const { barbershopId } = useAuth();
  const { leads, loading, metrics } = useLeads(barbershopId);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Filtro de busca
      const matchesSearch = 
        lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery);

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">CRM de Leads</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o relacionamento com seus clientes
          </p>
        </div>

        <LeadMetrics metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-300px)]">
          {/* Sidebar - Filtros e Lista */}
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

          {/* Painel de Detalhes */}
          <div className="lg:col-span-8 border rounded-lg bg-card overflow-hidden">
            <LeadDetailsPanel lead={selectedLead} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRM;
