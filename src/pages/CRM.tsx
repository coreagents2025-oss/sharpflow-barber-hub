import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useLeads, type Lead, type LeadStatus } from '@/hooks/useLeads';
import { LeadsFilters } from '@/components/crm/LeadsFilters';
import { LeadsList } from '@/components/crm/LeadsList';
import { LeadDetailsPanel } from '@/components/crm/LeadDetailsPanel';
import { LeadMetrics } from '@/components/crm/LeadMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CRM = () => {
  const { barbershopId } = useAuth();
  const { leads, loading, metrics } = useLeads(barbershopId);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const isMobile = useIsMobile();

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

  // Mobile: use tabs to switch between list and details
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">CRM de Leads</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gerencie seus leads e acompanhe o relacionamento com seus clientes
            </p>
          </div>

          <LeadMetrics metrics={metrics} />

          <Tabs defaultValue="lista" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="lista">Lista de Leads</TabsTrigger>
              <TabsTrigger value="detalhes" disabled={!selectedLead}>
                Detalhes {selectedLead ? `(${selectedLead.full_name})` : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="mt-0">
              <div className="border rounded-lg bg-card overflow-hidden">
                <LeadsFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
                <div className="max-h-[calc(100vh-400px)] overflow-hidden">
                  <LeadsList
                    leads={filteredLeads}
                    selectedLead={selectedLead}
                    onSelectLead={setSelectedLead}
                    loading={loading}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="detalhes" className="mt-0">
              <div className="border rounded-lg bg-card overflow-hidden">
                <div className="p-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLead(null)}
                    className="mb-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para lista
                  </Button>
                </div>
                <div className="max-h-[calc(100vh-400px)] overflow-auto">
                  <LeadDetailsPanel lead={selectedLead} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop: traditional layout
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
