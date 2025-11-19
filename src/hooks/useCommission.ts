import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CommissionConfig {
  id?: string;
  barber_id: string;
  barbershop_id: string;
  commission_type: 'percentage' | 'fixed' | 'per_service';
  commission_value: number;
  minimum_services: number;
  apply_to_completed_only: boolean;
  is_active: boolean;
}

export interface CommissionCalculation {
  barber_id: string;
  barber_name: string;
  total_services: number;
  total_amount: number;
  commission_amount: number;
  manual_adjustments: number;
  final_amount: number;
}

export const useCommission = (barbershopId: string) => {
  const [loading, setLoading] = useState(false);

  const getCommissionConfig = async (barberId: string) => {
    try {
      const { data, error } = await supabase
        .from('barber_commission_config')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error('Erro ao buscar configuração de comissão');
      console.error(error);
      return null;
    }
  };

  const updateCommissionConfig = async (barberId: string, config: Partial<CommissionConfig>) => {
    try {
      setLoading(true);
      const { data: existing } = await supabase
        .from('barber_commission_config')
        .select('id')
        .eq('barber_id', barberId)
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('barber_commission_config')
          .update(config)
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barber_commission_config')
          .insert({
            barber_id: barberId,
            barbershop_id: barbershopId,
            ...config
          });
        
        if (error) throw error;
      }

      toast.success('Configuração de comissão atualizada');
      return true;
    } catch (error: any) {
      toast.error('Erro ao atualizar configuração');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const calculateCommissions = async (
    barberIds: string[],
    startDate: string,
    endDate: string
  ): Promise<CommissionCalculation[]> => {
    try {
      setLoading(true);
      const calculations: CommissionCalculation[] = [];

      for (const barberId of barberIds) {
        const { data: barber } = await supabase
          .from('barbers')
          .select('name')
          .eq('id', barberId)
          .single();

        const { data, error } = await supabase.rpc('calculate_barber_commission', {
          _barber_id: barberId,
          _start_date: startDate,
          _end_date: endDate
        });

        if (error) throw error;

        if (data && data.length > 0) {
          calculations.push({
            barber_id: barberId,
            barber_name: barber?.name || 'Barbeiro',
            total_services: Number(data[0].total_services) || 0,
            total_amount: Number(data[0].total_amount) || 0,
            commission_amount: Number(data[0].commission_amount) || 0,
            manual_adjustments: 0,
            final_amount: Number(data[0].commission_amount) || 0
          });
        }
      }

      return calculations;
    } catch (error: any) {
      toast.error('Erro ao calcular comissões');
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const recordCommissionPayment = async (data: {
    barber_id: string;
    period_start: string;
    period_end: string;
    total_services: number;
    total_amount: number;
    commission_amount: number;
    manual_adjustments: number;
    final_amount: number;
    notes?: string;
    metadata?: any;
  }) => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from('commission_records').insert({
        ...data,
        barbershop_id: barbershopId,
        status: 'paid',
        payment_date: new Date().toISOString(),
        created_by: user.user?.id
      });

      if (error) throw error;

      // Registrar no fluxo de caixa
      await supabase.from('cash_flow').insert({
        barbershop_id: barbershopId,
        type: 'expense',
        category: 'commission',
        amount: data.final_amount,
        description: `Comissão paga - ${data.period_start} a ${data.period_end}`,
        reference_type: 'commission',
        payment_method: 'cash',
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: user.user?.id
      });

      toast.success('Pagamento de comissão registrado');
      return true;
    } catch (error: any) {
      toast.error('Erro ao registrar pagamento');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getCommissionHistory = async (filters?: {
    barber_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      let query = supabase
        .from('commission_records')
        .select(`
          *,
          barbers (name)
        `)
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (filters?.barber_id) {
        query = query.eq('barber_id', filters.barber_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.start_date) {
        query = query.gte('period_start', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('period_end', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast.error('Erro ao buscar histórico');
      console.error(error);
      return [];
    }
  };

  return {
    loading,
    getCommissionConfig,
    updateCommissionConfig,
    calculateCommissions,
    recordCommissionPayment,
    getCommissionHistory
  };
};
