import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

  if (payments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum pagamento registrado.</p>;
  }

  // Mobile: card-based layout
  if (isMobile) {
    return (
      <div className="space-y-2">
        {payments.map((p) => {
          const isOverdue = p.status === "pending" && new Date(p.due_date) < new Date();
          const st = isOverdue
            ? statusMap.overdue
            : statusMap[p.status] || { label: p.status, variant: "outline" as const };
          return (
            <Card key={p.id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">R$ {Number(p.amount).toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">• {methodMap[p.payment_method] || p.payment_method}</span>
                </div>
                <Badge variant={st.variant} className="text-[10px] h-5 shrink-0">
                  {st.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Vence: {format(new Date(p.due_date), "dd/MM/yy", { locale: ptBR })}
                </span>
                {p.paid_at && (
                  <span>Pago: {format(new Date(p.paid_at), "dd/MM/yy", { locale: ptBR })}</span>
                )}
              </div>
              {p.status === "pending" && (
                <div className="pt-2 mt-2 border-t">
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => onMarkPaid(p.id)}>
                    <Check className="h-3 w-3 mr-1" /> Confirmar Pagamento
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop: table layout
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pago em</TableHead>
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
                <TableCell>{methodMap[p.payment_method] || p.payment_method}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell>
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
