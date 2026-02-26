import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileText } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useSuperAdminData';
import { useState } from 'react';
import { format } from 'date-fns';

const actionBadge = (action: string) => {
  switch (action) {
    case 'INSERT': return 'default';
    case 'UPDATE': return 'secondary';
    case 'DELETE': return 'destructive';
    default: return 'outline';
  }
};

export default function SuperAdminAuditLogs() {
  const { data: logs, isLoading } = useAuditLogs();
  const [search, setSearch] = useState('');

  const filtered = (logs ?? []).filter(l =>
    l.table_name.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.record_id ?? '').includes(search)
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs de Auditoria</h1>
            <p className="text-muted-foreground">Histórico de ações na plataforma</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <FileText className="h-3 w-3 mr-1" />
            {logs?.length ?? 0} registros
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por tabela, ação ou ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionBadge(l.action) as any}>{l.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.table_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.record_id?.substring(0, 8) ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.user_id?.substring(0, 8) ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
