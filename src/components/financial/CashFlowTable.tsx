import { useState } from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, MoreHorizontal, Pencil, Trash2, Zap } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  payment_method?: string;
  transaction_date: string;
  reference_type?: string | null;
}

interface CashFlowTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const CashFlowTable = ({ transactions, onEdit, onDelete }: CashFlowTableProps) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAutomatic = (t: Transaction) => t.reference_type === 'appointment';

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      service: 'Serviço',
      subscription: 'Assinatura',
      commission: 'Comissão',
      salary: 'Salário',
      rent: 'Aluguel',
      supplies: 'Material',
      maintenance: 'Manutenção',
      marketing: 'Marketing',
      other: 'Outro'
    };
    return labels[category] || category;
  };

  const getPaymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      debit: 'Débito',
      credit: 'Crédito',
      pix: 'PIX'
    };
    return method ? labels[method] || method : '-';
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const categories = [...new Set(transactions.map(t => t.category))];

  const handleConfirmDelete = () => {
    if (deleteId && onDelete) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Entradas</SelectItem>
            <SelectItem value="expense">Saídas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="hidden sm:table-cell">Descrição</TableHead>
              <TableHead className="hidden md:table-cell">Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum lançamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-xs sm:text-sm">
                    {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {transaction.type === 'income' ? (
                      <Badge variant="default" className="bg-green-500 text-xs">
                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                        Entrada
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <ArrowDownCircle className="h-3 w-3 mr-1" />
                        Saída
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      {getCategoryLabel(transaction.category)}
                      {isAutomatic(transaction) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                Auto
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerado automaticamente por pagamento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate hidden sm:table-cell text-xs sm:text-sm">{transaction.description}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                  <TableCell className="text-right font-medium text-xs sm:text-sm">
                    R$ {Number(transaction.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {!isAutomatic(transaction) && (onEdit || onDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(transaction)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium text-xs sm:text-sm">
                  Entradas: <span className="text-green-600">R$ {totalIncome.toFixed(2)}</span>
                  {' | '}
                  Saídas: <span className="text-destructive">R$ {totalExpense.toFixed(2)}</span>
                  {' | '}
                  Saldo: <span className={totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-destructive'}>
                    R$ {(totalIncome - totalExpense).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
