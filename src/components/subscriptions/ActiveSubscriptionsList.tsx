import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ActiveSubscription } from "@/hooks/useSubscriptionManagement";

interface Props {
  subscriptions: ActiveSubscription[];
  onRenew: (id: string) => void;
  onCancel: (id: string) => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  expired: { label: "Expirada", variant: "secondary" },
};

const intervalMap: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

export function ActiveSubscriptionsList({ subscriptions, onRenew, onCancel }: Props) {
  if (subscriptions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhuma assinatura encontrada.</p>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Créditos</TableHead>
            <TableHead className="hidden sm:table-cell">Recorrência</TableHead>
            <TableHead className="hidden md:table-cell">Expira em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => {
            const st = statusMap[sub.status] || { label: sub.status, variant: "outline" as const };
            return (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.lead?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{sub.lead?.phone || ""}</p>
                  </div>
                </TableCell>
                <TableCell>{sub.plan?.name || "—"}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell">{sub.credits_remaining}</TableCell>
                <TableCell className="hidden sm:table-cell">{intervalMap[sub.billing_interval] || sub.billing_interval}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {sub.expires_at ? format(new Date(sub.expires_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {sub.status === "active" && (
                    <div className="flex flex-col sm:flex-row gap-1 justify-end">
                      <Button size="sm" variant="outline" onClick={() => onRenew(sub.id)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Renovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onCancel(sub.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Cancelar
                      </Button>
                    </div>
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
