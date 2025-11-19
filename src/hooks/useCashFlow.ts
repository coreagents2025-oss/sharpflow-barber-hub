import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CashFlowTransaction {
  id?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  payment_method?: string;
  transaction_date: string;
  reference_id?: string;
  reference_type?: string;
}

export const useCashFlow = (barbershopId: string) => {
  const [loading, setLoading] = useState(false);

  const addTransaction = async (transaction: CashFlowTransaction) => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from('cash_flow').insert({
        ...transaction,
        barbershop_id: barbershopId,
        created_by: user.user?.id
      });

      if (error) throw error;
      toast.success('Lançamento registrado');
      return true;
    } catch (error: any) {
      toast.error('Erro ao registrar lançamento');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getTransactions = async (filters?: {
    type?: 'income' | 'expense';
    category?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      let query = supabase
        .from('cash_flow')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('transaction_date', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.start_date) {
        query = query.gte('transaction_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('transaction_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast.error('Erro ao buscar transações');
      console.error(error);
      return [];
    }
  };

  const getCashSummary = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('type, amount')
        .eq('barbershop_id', barbershopId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (error) throw error;

      const income = data
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = data
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        income,
        expense,
        balance: income - expense
      };
    } catch (error: any) {
      toast.error('Erro ao calcular resumo');
      console.error(error);
      return { income: 0, expense: 0, balance: 0 };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('cash_flow')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lançamento excluído');
      return true;
    } catch (error: any) {
      toast.error('Erro ao excluir lançamento');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    addTransaction,
    getTransactions,
    getCashSummary,
    deleteTransaction
  };
};
