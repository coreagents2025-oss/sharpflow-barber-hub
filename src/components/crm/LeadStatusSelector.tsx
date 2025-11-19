import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadStatus } from '@/hooks/useLeads';
import { User, Clock, TrendingUp, Star, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeadStatusSelectorProps {
  leadId: string;
  currentStatus: LeadStatus;
  onStatusChange?: () => void;
}

export function LeadStatusSelector({ 
  leadId, 
  currentStatus,
  onStatusChange 
}: LeadStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const statusConfig = {
    new: {
      label: 'Novo',
      icon: User,
      className: 'text-blue-600',
    },
    contacted: {
      label: 'Contatado',
      icon: Clock,
      className: 'text-yellow-600',
    },
    active: {
      label: 'Ativo',
      icon: TrendingUp,
      className: 'text-green-600',
    },
    converted: {
      label: 'Convertido',
      icon: Star,
      className: 'text-purple-600',
    },
    lost: {
      label: 'Perdido',
      icon: XCircle,
      className: 'text-red-600',
    },
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Lead marcado como "${statusConfig[newStatus].label}"`,
      });

      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do lead',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select 
      value={currentStatus} 
      onValueChange={handleStatusChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, config]) => {
          const Icon = config.icon;
          return (
            <SelectItem key={value} value={value}>
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.className}`} />
                <span>{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
