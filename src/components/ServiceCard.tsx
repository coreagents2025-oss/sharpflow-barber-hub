import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
    image_url: string | null;
    is_popular: boolean;
  };
  showPopularBadge?: boolean;
  onBookNow: () => void;
}

export const ServiceCard = ({ service, showPopularBadge = true, onBookNow }: ServiceCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {service.image_url && (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {service.is_popular && showPopularBadge && (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
              Popular
            </Badge>
          )}
        </div>
      )}
      
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="font-semibold text-base sm:text-lg leading-tight break-words">{service.name}</h3>
          <span className="text-base sm:text-lg font-bold text-accent whitespace-nowrap">
            R$ {Number(service.price).toFixed(2)}
          </span>
        </div>
        
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{service.duration_minutes} min</span>
          </div>
          
          <Button 
            onClick={onBookNow}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto h-11 min-h-[44px] text-sm"
          >
            Agendar Agora
          </Button>
        </div>
      </div>
    </Card>
  );
};
