import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { LeadStatus } from '@/hooks/useLeads';
import { Badge } from '@/components/ui/badge';

interface LeadsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: LeadStatus | 'all';
  onStatusFilterChange: (status: LeadStatus | 'all') => void;
}

export function LeadsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: LeadsFiltersProps) {
  const statuses: Array<{ value: LeadStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'new', label: 'Novos' },
    { value: 'contacted', label: 'Contatados' },
    { value: 'active', label: 'Ativos' },
    { value: 'converted', label: 'Convertidos' },
    { value: 'lost', label: 'Perdidos' },
  ];

  return (
    <div className="space-y-4 p-4 border-b border-border bg-card">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtrar por status
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Button
              key={status.value}
              variant={statusFilter === status.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStatusFilterChange(status.value)}
              className="text-xs"
            >
              {status.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
