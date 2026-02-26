import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users as UsersIcon } from 'lucide-react';
import { useUsersList } from '@/hooks/useSuperAdminData';
import { useState } from 'react';
import { format } from 'date-fns';

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin': return 'destructive';
    case 'admin': return 'default';
    case 'barber': return 'secondary';
    default: return 'outline';
  }
};

const roleLabel = (role: string) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'barber': return 'Barbeiro';
    case 'client': return 'Cliente';
    default: return role;
  }
};

export default function SuperAdminUsers() {
  const { data: users, isLoading } = useUsersList();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = (users ?? []).filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? '').includes(search);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">Todos os usuários da plataforma</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <UsersIcon className="h-3 w-3 mr-1" />
            {users?.length ?? 0} total
          </Badge>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="barber">Barbeiro</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>Telefone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={`${u.userId}-${u.role}`}>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-sm">{u.phone ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(u.role) as any}>{roleLabel(u.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(u.createdAt), 'dd/MM/yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
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
