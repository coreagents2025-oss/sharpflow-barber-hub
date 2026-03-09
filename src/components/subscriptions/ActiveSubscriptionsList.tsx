import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, XCircle, User, CreditCard, Calendar, Send, Loader2, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ActiveSubscription } from "@/hooks/useSubscriptionManagement";

interface Props {
  subscriptions: ActiveSubscription[];
  onRenew: (id: string) => void;
  onCancel: (id: string) => void;
  onInvite: (id: string) => Promise<boolean>;
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

export function ActiveSubscriptionsList({ subscriptions, onRenew, onCancel, onInvite }: Props) {
  const isMobile = useIsMobile();
  const [inviting, setInviting] = useState<string | null>(null);

  const handleInvite = async (id: string) => {
    setInviting(id);
    await onInvite(id);
    setInviting(null);
  };

  if (subscriptions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhuma assinatura encontrada.</p>;
  }

  // Mobile: card-based layout
  if (isMobile) {
    return (
      <div className="space-y-2">
        {subscriptions.map((sub) => {
          const st = statusMap[sub.status] || { label: sub.status, variant: "outline" as const };
          const hasEmail = !!sub.lead?.email;
          return (
            <Card key={sub.id} className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-sm truncate block">{sub.lead?.full_name || "—"}</span>
                    {sub.lead?.email && (
                      <span className="text-[10px] text-muted-foreground truncate block">{sub.lead.email}</span>
                    )}
                  </div>
                </div>
                <Badge variant={st.variant} className="shrink-0 text-[10px] h-5">
                  {st.label}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                <div>
                  <span className="block text-[10px] uppercase tracking-wide">Plano</span>
                  <span className="text-foreground font-medium">{sub.plan?.name || "—"}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="block text-[10px] uppercase tracking-wide">Créditos</span>
                  <span className="text-foreground font-medium flex items-center gap-0.5">
                    <CreditCard className="h-3 w-3" /> {sub.credits_remaining}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase tracking-wide">Expira</span>
                  <span className="text-foreground font-medium flex items-center gap-0.5 justify-end">
                    <Calendar className="h-3 w-3" />
                    {sub.expires_at ? format(new Date(sub.expires_at), "dd/MM", { locale: ptBR }) : "—"}
                  </span>
                </div>
              </div>
              {sub.status === "active" && (
                <div className="flex gap-1.5 pt-2 border-t flex-wrap">
                  {hasEmail && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => handleInvite(sub.id)}
                      disabled={inviting === sub.id}
                    >
                      {inviting === sub.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Send className="h-3 w-3 mr-1" />
                      }
                      Enviar Acesso
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => onRenew(sub.id)}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Renovar
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => onCancel(sub.id)}>
                    <XCircle className="h-3 w-3 mr-1" /> Cancelar
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
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Créditos</TableHead>
            <TableHead>Recorrência</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => {
            const st = statusMap[sub.status] || { label: sub.status, variant: "outline" as const };
            const hasEmail = !!sub.lead?.email;
            return (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.lead?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{sub.lead?.phone || ""}</p>
                    {sub.lead?.email && (
                      <p className="text-xs text-muted-foreground">{sub.lead.email}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{sub.plan?.name || "—"}</TableCell>
                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                <TableCell>{sub.credits_remaining}</TableCell>
                <TableCell>{intervalMap[sub.billing_interval] || sub.billing_interval}</TableCell>
                <TableCell>
                  {sub.expires_at ? format(new Date(sub.expires_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {sub.status === "active" && (
                    <div className="flex gap-1 justify-end">
                      {hasEmail && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => handleInvite(sub.id)}
                          disabled={inviting === sub.id}
                          title="Enviar link de acesso ao painel do assinante"
                        >
                          {inviting === sub.id
                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            : <Send className="h-3 w-3 mr-1" />
                          }
                          Enviar Acesso
                        </Button>
                      )}
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
