import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  payment_method?: string;
  transaction_date: string;
}

interface CashFlowTableProps {
  transactions: Transaction[];
}

export const CashFlowTable = ({ transactions }: CashFlowTableProps) => {
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum lançamento encontrado
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {transaction.type === 'income' ? (
                    <Badge variant="default" className="bg-green-500">
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                      Entrada
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                      Saída
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{getCategoryLabel(transaction.category)}</TableCell>
                <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                <TableCell>{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                <TableCell className="text-right font-medium">
                  R$ {transaction.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
