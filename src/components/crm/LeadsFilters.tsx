import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { LeadStatus } from '@/hooks/useLeads';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LeadsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: LeadStatus | 'all' | 'needs_contact' | 'at_risk' | 'inactive' | 'archived';
  onStatusFilterChange: (status: LeadStatus | 'all' | 'needs_contact' | 'at_risk' | 'inactive' | 'archived') => void;
}

export function LeadsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: LeadsFiltersProps) {
  const statuses = [
    { value: 'all', label: 'Todos' },
    { value: 'new', label: 'Novos' },
    { value: 'contacted', label: 'Contatados' },
    { value: 'active', label: 'Ativos' },
    { value: 'converted', label: 'Convertidos' },
    { value: 'lost', label: 'Perdidos' },
    { value: 'needs_contact', label: '⚠️ Precisa Contato' },
    { value: 'at_risk', label: '⚠️ Risco de Perda' },
    { value: 'inactive', label: '⚠️ Inativos' },
    { value: 'archived', label: '📦 Arquivados' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-border bg-card">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(val) => onStatusFilterChange(val as any)}
      >
        <SelectTrigger className="w-full sm:w-[200px] h-9">
          <SelectValue placeholder="Filtrar status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
