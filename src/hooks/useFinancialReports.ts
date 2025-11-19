import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const useFinancialReports = (barbershopId: string) => {
  const [loading, setLoading] = useState(false);

  const getMonthlyRevenue = async (months: number = 12) => {
    try {
      const data = [];
      const today = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(today, i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');

        const { data: transactions } = await supabase
          .from('cash_flow')
          .select('type, amount')
          .eq('barbershop_id', barbershopId)
          .gte('transaction_date', start)
          .lte('transaction_date', end);

        const income = transactions
          ?.filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        data.push({
          month: format(date, 'MMM/yy'),
          revenue: income
        });
      }

      return data;
    } catch (error: any) {
      toast.error('Erro ao buscar faturamento mensal');
      console.error(error);
      return [];
    }
  };

  const getRevenueByCategory = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('cash_flow')
        .select('category, amount')
        .eq('barbershop_id', barbershopId)
        .eq('type', 'income')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      if (error) throw error;

      const grouped = data?.reduce((acc: any, curr) => {
        const cat = curr.category || 'other';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += Number(curr.amount);
        return acc;
      }, {});

      return Object.entries(grouped || {}).map(([name, value]) => ({
        name,
        value: value as number
      }));
    } catch (error: any) {
      toast.error('Erro ao buscar receitas por categoria');
      console.error(error);
      return [];
    }
  };

  const getTopServices = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          service_id,
          services (name, price)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate);

      if (error) throw error;

      const grouped = data?.reduce((acc: any, curr) => {
        const serviceId = curr.service_id;
        const serviceName = (curr.services as any)?.name || 'Serviço';
        const price = Number((curr.services as any)?.price || 0);

        if (!acc[serviceId]) {
          acc[serviceId] = {
            name: serviceName,
            count: 0,
            revenue: 0
          };
        }
        acc[serviceId].count += 1;
        acc[serviceId].revenue += price;
        return acc;
      }, {});

      return Object.values(grouped || {})
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);
    } catch (error: any) {
      toast.error('Erro ao buscar serviços mais lucrativos');
      console.error(error);
      return [];
    }
  };

  const getBarberPerformance = async (startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          barber_id,
          barbers (name),
          services (price)
        `)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate);

      if (error) throw error;

      const grouped = data?.reduce((acc: any, curr) => {
        const barberId = curr.barber_id;
        const barberName = (curr.barbers as any)?.name || 'Barbeiro';
        const price = Number((curr.services as any)?.price || 0);

        if (!acc[barberId]) {
          acc[barberId] = {
            name: barberName,
            services: 0,
            revenue: 0
          };
        }
        acc[barberId].services += 1;
        acc[barberId].revenue += price;
        return acc;
      }, {});

      return Object.values(grouped || {})
        .sort((a: any, b: any) => b.revenue - a.revenue);
    } catch (error: any) {
      toast.error('Erro ao buscar performance dos barbeiros');
      console.error(error);
      return [];
    }
  };

  return {
    loading,
    getMonthlyRevenue,
    getRevenueByCategory,
    getTopServices,
    getBarberPerformance
  };
};
