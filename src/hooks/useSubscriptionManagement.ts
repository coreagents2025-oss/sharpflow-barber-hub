import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  price: number;
  credits_per_month: number;
  discount_percentage: number | null;
  is_active: boolean;
  billing_interval: string;
  billing_method: string;
  auto_renew: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveSubscription {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  plan_id: string;
  barbershop_id: string;
  status: string;
  credits_remaining: number;
  started_at: string;
  expires_at: string | null;
  auto_renew: boolean;
  next_billing_date: string | null;
  billing_interval: string;
  lead?: { full_name: string; phone: string } | null;
  plan?: { name: string; price: number } | null;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  barbershop_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface PlanFormData {
  name: string;
  description: string;
  price: number;
  credits_per_month: number;
  discount_percentage: number;
  billing_interval: string;
  billing_method: string;
  auto_renew: boolean;
  reminder_days_before: number;
}

export function useSubscriptionManagement() {
  const { barbershopId } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!barbershopId) return;
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setPlans((data as any) || []);
  }, [barbershopId]);

  const fetchActiveSubscriptions = useCallback(async () => {
    if (!barbershopId) return;
    const { data, error } = await supabase
      .from('client_subscriptions')
      .select(`*, leads:lead_id (full_name, phone), subscription_plans:plan_id (name, price)`)
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setActiveSubscriptions(
      (data || []).map((d: any) => ({
        ...d,
        lead: d.leads,
        plan: d.subscription_plans,
      }))
    );
  }, [barbershopId]);

  const fetchPayments = useCallback(async () => {
    if (!barbershopId) return;
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('due_date', { ascending: false });
    if (error) { console.error(error); return; }
    setPayments((data as any) || []);
  }, [barbershopId]);

  useEffect(() => {
    if (barbershopId) {
      setLoading(true);
      Promise.all([fetchPlans(), fetchActiveSubscriptions(), fetchPayments()]).finally(() => setLoading(false));
    }
  }, [barbershopId, fetchPlans, fetchActiveSubscriptions, fetchPayments]);

  const createPlan = async (data: PlanFormData) => {
    if (!barbershopId) return false;
    const { error } = await supabase.from('subscription_plans').insert({
      barbershop_id: barbershopId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      credits_per_month: data.credits_per_month,
      discount_percentage: data.discount_percentage || 0,
      billing_interval: data.billing_interval,
      billing_method: data.billing_method,
      auto_renew: data.auto_renew,
      reminder_days_before: data.reminder_days_before,
    } as any);
    if (error) { toast.error('Erro ao criar plano'); console.error(error); return false; }
    toast.success('Plano criado!');
    await fetchPlans();
    return true;
  };

  const updatePlan = async (id: string, data: Partial<PlanFormData>) => {
    const { error } = await supabase.from('subscription_plans').update(data as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar plano'); return false; }
    toast.success('Plano atualizado!');
    await fetchPlans();
    return true;
  };

  const togglePlanActive = async (id: string, is_active: boolean) => {
    await updatePlan(id, { } as any);
    const { error } = await supabase.from('subscription_plans').update({ is_active }).eq('id', id);
    if (error) { toast.error('Erro'); return; }
    toast.success(is_active ? 'Plano ativado' : 'Plano desativado');
    await fetchPlans();
  };

  const deletePlan = async (id: string) => {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir plano'); return false; }
    toast.success('Plano excluído');
    await fetchPlans();
    return true;
  };

  const markPaymentPaid = async (paymentId: string) => {
    const { error } = await supabase
      .from('subscription_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
      .eq('id', paymentId);
    if (error) { toast.error('Erro ao marcar pagamento'); return false; }
    toast.success('Pagamento confirmado!');
    await fetchPayments();
    return true;
  };

  const renewSubscription = async (subscriptionId: string) => {
    const sub = activeSubscriptions.find(s => s.id === subscriptionId);
    if (!sub || !sub.plan) { toast.error('Assinatura não encontrada'); return false; }

    const intervalDays = sub.billing_interval === 'weekly' ? 7 : sub.billing_interval === 'biweekly' ? 14 : 30;
    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + intervalDays);
    const nextBilling = new Date(newExpires);

    const plan = plans.find(p => p.id === sub.plan_id);
    const credits = plan?.credits_per_month || 0;

    const { error: updateError } = await supabase
      .from('client_subscriptions')
      .update({
        credits_remaining: credits,
        expires_at: newExpires.toISOString(),
        next_billing_date: nextBilling.toISOString(),
        status: 'active',
      } as any)
      .eq('id', subscriptionId);

    if (updateError) { toast.error('Erro ao renovar'); return false; }

    // Create pending payment
    await supabase.from('subscription_payments').insert({
      subscription_id: subscriptionId,
      barbershop_id: sub.barbershop_id,
      amount: sub.plan.price,
      due_date: new Date().toISOString().split('T')[0],
      payment_method: plan?.billing_method || 'pix',
      status: 'pending',
    } as any);

    toast.success('Assinatura renovada!');
    await Promise.all([fetchActiveSubscriptions(), fetchPayments()]);
    return true;
  };

  const cancelSubscription = async (subscriptionId: string) => {
    const { error } = await supabase
      .from('client_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);
    if (error) { toast.error('Erro ao cancelar'); return false; }
    toast.success('Assinatura cancelada');
    await fetchActiveSubscriptions();
    return true;
  };

  // Metrics
  const totalActive = activeSubscriptions.filter(s => s.status === 'active').length;
  const mrr = activeSubscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.plan?.price || 0), 0);
  const expiringSoon = activeSubscriptions.filter(s => {
    if (s.status !== 'active' || !s.expires_at) return false;
    const diff = new Date(s.expires_at).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const overduePayments = payments.filter(p => p.status === 'pending' && new Date(p.due_date) < new Date()).length;

  return {
    plans,
    activeSubscriptions,
    payments,
    loading,
    metrics: { totalActive, mrr, expiringSoon, overduePayments },
    createPlan,
    updatePlan,
    togglePlanActive,
    deletePlan,
    markPaymentPaid,
    renewSubscription,
    cancelSubscription,
    refetch: () => Promise.all([fetchPlans(), fetchActiveSubscriptions(), fetchPayments()]),
  };
}
