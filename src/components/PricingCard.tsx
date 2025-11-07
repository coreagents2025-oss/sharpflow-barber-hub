import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  ctaText: string;
}

export const PricingCard = ({
  title,
  price,
  period,
  description,
  features,
  highlighted = false,
  badge,
  ctaText,
}: PricingCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className={`relative transition-all duration-300 hover:-translate-y-2 ${
        highlighted
          ? "border-accent shadow-lg scale-105 bg-gradient-to-br from-card to-accent/5"
          : "hover:shadow-md"
      }`}
    >
      {badge && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
          {badge}
        </Badge>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl mb-2">{title}</CardTitle>
        <div className="mb-2">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className={`w-full ${
            highlighted
              ? "bg-accent hover:bg-accent/90 text-accent-foreground"
              : ""
          }`}
          size="lg"
          onClick={() => navigate("/auth")}
        >
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
};
