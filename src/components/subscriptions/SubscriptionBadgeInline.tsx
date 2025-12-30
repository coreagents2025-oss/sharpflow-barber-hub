import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionBadgeInlineProps {
  leadId: string | undefined;
}

export function SubscriptionBadgeInline({ leadId }: SubscriptionBadgeInlineProps) {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (leadId) {
      fetchCredits();
    }
  }, [leadId]);

  const fetchCredits = async () => {
    try {
      const { data } = await supabase
        .from('client_subscriptions')
        .select('credits_remaining')
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .gt('credits_remaining', 0)
        .maybeSingle();

      if (data) {
        setCredits(data.credits_remaining);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  if (!leadId || credits === null) return null;

  return (
    <Badge 
      variant="secondary" 
      className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-4 flex items-center gap-1"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {credits}
    </Badge>
  );
}
