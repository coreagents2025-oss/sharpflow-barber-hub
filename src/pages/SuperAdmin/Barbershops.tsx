import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Search, Users, Scissors, Calendar } from 'lucide-react';
import { useBarbershopsList } from '@/hooks/useSuperAdminData';
import { useState } from 'react';
import { format } from 'date-fns';

export default function SuperAdminBarbershops() {
  const { data: barbershops, isLoading } = useBarbershopsList();
  const [search, setSearch] = useState('');

  const filtered = (barbershops ?? []).filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.slug.toLowerCase().includes(search.toLowerCase()) ||
    (b.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Barbearias</h1>
            <p className="text-muted-foreground">Todas as barbearias cadastradas na plataforma</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Building2 className="h-3 w-3 mr-1" />
            {barbershops?.length ?? 0} total
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center"><Users className="h-4 w-4 inline" /></TableHead>
                    <TableHead className="text-center"><Scissors className="h-4 w-4 inline" /></TableHead>
                    <TableHead className="text-center"><Calendar className="h-4 w-4 inline" /></TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{b.slug}</TableCell>
                      <TableCell className="text-sm">{b.email ?? '-'}</TableCell>
                      <TableCell className="text-center">{b.staffCount}</TableCell>
                      <TableCell className="text-center">{b.servicesCount}</TableCell>
                      <TableCell className="text-center">{b.appointmentsCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(b.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma barbearia encontrada
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
