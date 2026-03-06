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
    { title: "Ativas", value: metrics.totalActive, icon: Users, color: "text-emerald-500" },
    { title: "MRR", value: `R$ ${metrics.mrr.toFixed(0)}`, icon: TrendingUp, color: "text-blue-500" },
    { title: "Expirando", value: metrics.expiringSoon, icon: AlertTriangle, color: "text-amber-500" },
    { title: "Pendentes", value: metrics.overduePayments, icon: CreditCard, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-2.5 sm:px-6 sm:pt-6 sm:pb-2">
            <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
          </CardHeader>
          <CardContent className="px-3 pb-2.5 pt-0 sm:px-6 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
