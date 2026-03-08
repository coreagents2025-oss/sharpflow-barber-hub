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
  benefits?: PlanBenefit[];
  points_config?: PlanPointsConfig | null;
}

export interface PlanBenefit {
  id: string;
  plan_id: string;
  service_id: string | null;
  custom_name: string | null;
  custom_description: string | null;
  quantity_per_cycle: number;
  benefit_type: string;
  discount_value: number;
  discount_type: string;
  service?: { name: string; price: number } | null;
}

export interface PlanPointsConfig {
  id: string;
  plan_id: string;
  points_per_visit: number;
  points_per_real_spent: number;
  bonus_points_monthly: number;
}

export interface LoyaltyReward {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_required: number;
  is_active: boolean;
  created_at: string;
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
  lead?: { full_name: string; phone: string; email?: string | null } | null;
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
  benefits?: BenefitFormData[];
  points_config?: PointsConfigFormData;
}

export interface BenefitFormData {
  id?: string;
  service_id: string | null;
  custom_name: string;
  custom_description: string;
  quantity_per_cycle: number;
  benefit_type: string;
  discount_value: number;
  discount_type: string;
}

export interface PointsConfigFormData {
  points_per_visit: number;
  points_per_real_spent: number;
  bonus_points_monthly: number;
}

export interface RewardFormData {
  name: string;
  description: string;
  reward_type: string;
  points_required: number;
}

export function useSubscriptionManagement() {
  const { barbershopId } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!barbershopId) return;
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }

    const plansData = (data as any) || [];

    // Fetch benefits and points config for each plan
    const planIds = plansData.map((p: any) => p.id);
    if (planIds.length > 0) {
      const [benefitsRes, pointsRes] = await Promise.all([
        supabase.from('plan_benefits' as any).select('*, services:service_id (name, price)').in('plan_id', planIds),
        supabase.from('plan_points_config' as any).select('*').in('plan_id', planIds),
      ]);

      const benefitsMap: Record<string, PlanBenefit[]> = {};
      ((benefitsRes.data as any) || []).forEach((b: any) => {
        if (!benefitsMap[b.plan_id]) benefitsMap[b.plan_id] = [];
        benefitsMap[b.plan_id].push({ ...b, service: b.services });
      });

      const pointsMap: Record<string, PlanPointsConfig> = {};
      ((pointsRes.data as any) || []).forEach((p: any) => {
        pointsMap[p.plan_id] = p;
      });

      plansData.forEach((plan: any) => {
        plan.benefits = benefitsMap[plan.id] || [];
        plan.points_config = pointsMap[plan.id] || null;
      });
    }

    setPlans(plansData);
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

  const fetchRewards = useCallback(async () => {
    if (!barbershopId) return;
    const { data, error } = await supabase
      .from('loyalty_rewards' as any)
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setRewards((data as any) || []);
  }, [barbershopId]);

  useEffect(() => {
    if (barbershopId) {
      setLoading(true);
      Promise.all([fetchPlans(), fetchActiveSubscriptions(), fetchPayments(), fetchRewards()]).finally(() => setLoading(false));
    }
  }, [barbershopId, fetchPlans, fetchActiveSubscriptions, fetchPayments, fetchRewards]);

  const saveBenefitsAndPoints = async (planId: string, data: PlanFormData) => {
    // Delete existing benefits, then re-insert
    await supabase.from('plan_benefits' as any).delete().eq('plan_id', planId);
    if (data.benefits && data.benefits.length > 0) {
      const rows = data.benefits.map(b => ({
        plan_id: planId,
        service_id: b.service_id || null,
        custom_name: b.custom_name || null,
        custom_description: b.custom_description || null,
        quantity_per_cycle: b.quantity_per_cycle,
        benefit_type: b.benefit_type,
        discount_value: b.discount_value,
        discount_type: b.discount_type,
      }));
      await supabase.from('plan_benefits' as any).insert(rows);
    }

    // Upsert points config
    if (data.points_config) {
      const existing = plans.find(p => p.id === planId)?.points_config;
      if (existing) {
        await supabase.from('plan_points_config' as any).update({
          points_per_visit: data.points_config.points_per_visit,
          points_per_real_spent: data.points_config.points_per_real_spent,
          bonus_points_monthly: data.points_config.bonus_points_monthly,
        }).eq('plan_id', planId);
      } else {
        await supabase.from('plan_points_config' as any).insert({
          plan_id: planId,
          points_per_visit: data.points_config.points_per_visit,
          points_per_real_spent: data.points_config.points_per_real_spent,
          bonus_points_monthly: data.points_config.bonus_points_monthly,
        });
      }
    }
  };

  const createPlan = async (data: PlanFormData) => {
    if (!barbershopId) return false;
    const { data: created, error } = await supabase.from('subscription_plans').insert({
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
    } as any).select('id').single();
    if (error || !created) { toast.error('Erro ao criar plano'); console.error(error); return false; }
    await saveBenefitsAndPoints((created as any).id, data);
    toast.success('Plano criado!');
    await fetchPlans();
    return true;
  };

  const updatePlan = async (id: string, data: PlanFormData) => {
    const { error } = await supabase.from('subscription_plans').update({
      name: data.name,
      description: data.description || null,
      price: data.price,
      credits_per_month: data.credits_per_month,
      discount_percentage: data.discount_percentage || 0,
      billing_interval: data.billing_interval,
      billing_method: data.billing_method,
      auto_renew: data.auto_renew,
      reminder_days_before: data.reminder_days_before,
    } as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar plano'); return false; }
    await saveBenefitsAndPoints(id, data);
    toast.success('Plano atualizado!');
    await fetchPlans();
    return true;
  };

  const togglePlanActive = async (id: string, is_active: boolean) => {
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

    // Fire-and-forget payment confirmed email — find subscription_id from local payments state
    const subIdForEmail = payments.find(p => p.id === paymentId)?.subscription_id;
    if (subIdForEmail) {
      supabase.functions.invoke('send-subscription-email', {
        body: { type: 'payment_confirmed', subscription_id: subIdForEmail, payment_id: paymentId },
      }).catch(console.error);
    }
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

    // Verificar se já existe cobrança pendente para esta renovação antes de inserir
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: existingPayment } = await supabase
      .from('subscription_payments')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending')
      .eq('due_date', todayStr)
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from('subscription_payments').insert({
        subscription_id: subscriptionId,
        barbershop_id: sub.barbershop_id,
        amount: sub.plan.price,
        due_date: todayStr,
        payment_method: plan?.billing_method || 'pix',
        status: 'pending',
      } as any);
    }

    toast.success('Assinatura renovada!');
    await Promise.all([fetchActiveSubscriptions(), fetchPayments()]);

    // Fire-and-forget renewal email
    supabase.functions.invoke('send-subscription-email', {
      body: { type: 'renewal', subscription_id: subscriptionId },
    }).catch(console.error);

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

    // Fire-and-forget cancellation email
    supabase.functions.invoke('send-subscription-email', {
      body: { type: 'cancellation', subscription_id: subscriptionId },
    }).catch(console.error);

    return true;
  };

  // Rewards CRUD
  const createReward = async (data: RewardFormData) => {
    if (!barbershopId) return false;
    const { error } = await supabase.from('loyalty_rewards' as any).insert({
      barbershop_id: barbershopId,
      name: data.name,
      description: data.description || null,
      reward_type: data.reward_type,
      points_required: data.points_required,
    });
    if (error) { toast.error('Erro ao criar recompensa'); console.error(error); return false; }
    toast.success('Recompensa criada!');
    await fetchRewards();
    return true;
  };

  const updateReward = async (id: string, data: RewardFormData) => {
    const { error } = await supabase.from('loyalty_rewards' as any).update({
      name: data.name,
      description: data.description || null,
      reward_type: data.reward_type,
      points_required: data.points_required,
    }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar recompensa'); return false; }
    toast.success('Recompensa atualizada!');
    await fetchRewards();
    return true;
  };

  const toggleRewardActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from('loyalty_rewards' as any).update({ is_active }).eq('id', id);
    if (error) { toast.error('Erro'); return; }
    toast.success(is_active ? 'Recompensa ativada' : 'Recompensa desativada');
    await fetchRewards();
  };

  const deleteReward = async (id: string) => {
    const { error } = await supabase.from('loyalty_rewards' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir recompensa'); return false; }
    toast.success('Recompensa excluída');
    await fetchRewards();
    return true;
  };

  const inviteSubscriber = async (subscriptionId: string) => {
    const sub = activeSubscriptions.find(s => s.id === subscriptionId);
    if (!sub?.lead?.email) {
      toast.error('Este assinante não possui email cadastrado');
      return false;
    }

    const barbershop = await supabase
      .from('barbershops')
      .select('slug')
      .eq('id', sub.barbershop_id)
      .single();

    if (!barbershop.data?.slug) {
      toast.error('Erro ao buscar dados da barbearia');
      return false;
    }

    const { data, error } = await supabase.functions.invoke('invite-client', {
      body: {
        email: sub.lead.email,
        full_name: sub.lead.full_name,
        slug: barbershop.data.slug,
        barbershop_id: sub.barbershop_id,
      },
    });

    if (error) {
      toast.error('Erro ao enviar convite');
      console.error(error);
      return false;
    }

    if (data?.type === 'recovery') {
      toast.success('Link de acesso reenviado para o email do assinante!');
    } else {
      toast.success('Convite enviado! O assinante receberá um email para criar sua senha.');
    }
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
    rewards,
    loading,
    metrics: { totalActive, mrr, expiringSoon, overduePayments },
    createPlan,
    updatePlan,
    togglePlanActive,
    deletePlan,
    markPaymentPaid,
    renewSubscription,
    cancelSubscription,
    createReward,
    updateReward,
    toggleRewardActive,
    deleteReward,
    inviteSubscriber,
    refetch: () => Promise.all([fetchPlans(), fetchActiveSubscriptions(), fetchPayments(), fetchRewards()]),
  };
}
