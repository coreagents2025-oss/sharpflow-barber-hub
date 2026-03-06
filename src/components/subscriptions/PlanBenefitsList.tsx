import { Badge } from "@/components/ui/badge";
import { Scissors, Gift, Star, Percent } from "lucide-react";
import type { PlanBenefit, PlanPointsConfig } from "@/hooks/useSubscriptionManagement";

interface Props {
  benefits: PlanBenefit[];
  pointsConfig?: PlanPointsConfig | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  service: <Scissors className="h-3 w-3" />,
  product: <Gift className="h-3 w-3" />,
  discount: <Percent className="h-3 w-3" />,
  custom: <Gift className="h-3 w-3" />,
};

export function PlanBenefitsList({ benefits, pointsConfig }: Props) {
  if (benefits.length === 0 && !pointsConfig) return null;

  return (
    <div className="space-y-2">
      {benefits.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Benefícios</p>
          {benefits.map((b) => (
            <div key={b.id} className="flex items-center gap-1.5 text-sm">
              {typeIcons[b.benefit_type] || typeIcons.custom}
              <span>
                {b.benefit_type === "service" && b.service
                  ? b.service.name
                  : b.custom_name || "Benefício"}
              </span>
              {b.quantity_per_cycle > 1 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {b.quantity_per_cycle}x
                </Badge>
              )}
              {b.discount_value > 0 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {b.discount_value}% off
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
      {pointsConfig && (pointsConfig.points_per_visit > 0 || pointsConfig.bonus_points_monthly > 0) && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Star className="h-3 w-3" /> Pontos
          </p>
          {pointsConfig.points_per_visit > 0 && (
            <p className="text-xs text-muted-foreground">{pointsConfig.points_per_visit} pts/visita</p>
          )}
          {pointsConfig.points_per_real_spent > 0 && (
            <p className="text-xs text-muted-foreground">{pointsConfig.points_per_real_spent} pts/R$ gasto</p>
          )}
          {pointsConfig.bonus_points_monthly > 0 && (
            <p className="text-xs text-muted-foreground">+{pointsConfig.bonus_points_monthly} pts/mês bônus</p>
          )}
        </div>
      )}
    </div>
  );
}
