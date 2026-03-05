import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Users, AlertTriangle, TrendingUp } from "lucide-react";

interface Props {
  metrics: {
    totalActive: number;
    mrr: number;
    expiringSoon: number;
    overduePayments: number;
  };
}

export function SubscriptionDashboard({ metrics }: Props) {
  const cards = [
    { title: "Assinaturas Ativas", value: metrics.totalActive, icon: Users, color: "text-emerald-500" },
    { title: "Receita Recorrente (MRR)", value: `R$ ${metrics.mrr.toFixed(2)}`, icon: TrendingUp, color: "text-blue-500" },
    { title: "Expirando em 7 dias", value: metrics.expiringSoon, icon: AlertTriangle, color: "text-amber-500" },
    { title: "Pagamentos Pendentes", value: metrics.overduePayments, icon: CreditCard, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
