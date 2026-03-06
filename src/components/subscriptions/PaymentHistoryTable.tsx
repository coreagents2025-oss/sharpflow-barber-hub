import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SubscriptionPayment } from "@/hooks/useSubscriptionManagement";

interface Props {
  payments: SubscriptionPayment[];
  onMarkPaid: (id: string) => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

const methodMap: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  boleto: "Boleto",
  cash: "Dinheiro",
};

export function PaymentHistoryTable({ payments, onMarkPaid }: Props) {
  if (payments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum pagamento registrado.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="hidden sm:table-cell">Método</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Pago em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => {
            const isOverdue = p.status === "pending" && new Date(p.due_date) < new Date();
            const st = isOverdue
              ? statusMap.overdue
              : statusMap[p.status] || { label: p.status, variant: "outline" as const };
            return (
              <TableRow key={p.id}>
                <TableCell>{format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                <TableCell>R$ {Number(p.amount).toFixed(2)}</TableCell>
                <TableCell className="hidden sm:table-cell">{methodMap[p.payment_method] || p.payment_method}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell">
                  {p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => onMarkPaid(p.id)}>
                      <Check className="h-3 w-3 mr-1" /> Confirmar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
