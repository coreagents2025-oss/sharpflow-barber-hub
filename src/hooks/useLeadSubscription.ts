import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadSubscription {
  id: string;
  lead_id: string;
  service_id: string;
  plan_id: string;
  barbershop_id: string;
  status: string;
  credits_remaining: number;
  started_at: string;
  expires_at: string | null;
  service?: {
    name: string;
    price: number;
    credits_per_month: number;
    subscription_duration_days: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  credits_per_month: number;
  subscription_duration_days: number;
  is_subscription_plan: boolean;
}

export function useLeadSubscription(leadId: string | undefined, barbershopId: string | undefined) {
  const [subscription, setSubscription] = useState<LeadSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    if (leadId && barbershopId) {
      fetchSubscription();
      fetchAvailablePlans();
    } else {
      setLoading(false);
    }
  }, [leadId, barbershopId]);

  const fetchSubscription = async () => {
    if (!leadId) return;

    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          services:service_id (
            name,
            price,
            credits_per_month,
            subscription_duration_days
          )
        `)
        .eq('lead_id', leadId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription({
          ...data,
          service: data.services as any
        });
      } else {
        setSubscription(null);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlans = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, description, credits_per_month, subscription_duration_days, is_subscription_plan')
        .eq('barbershop_id', barbershopId)
        .eq('is_subscription_plan', true)
        .eq('is_active', true);

      if (error) throw error;
      setAvailablePlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
    }
  };

  const createSubscription = async (planId: string) => {
    if (!leadId || !barbershopId) {
      toast.error('Lead ou barbearia não identificados');
      return false;
    }

    try {
      const plan = availablePlans.find(p => p.id === planId);
      if (!plan) {
        toast.error('Plano não encontrado');
        return false;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.subscription_duration_days);

      const { error } = await supabase
        .from('client_subscriptions')
        .insert({
          lead_id: leadId,
          service_id: planId,
          plan_id: planId,
          barbershop_id: barbershopId,
          status: 'active',
          credits_remaining: plan.credits_per_month,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      toast.success('Assinatura criada com sucesso!');
      await fetchSubscription();
      return true;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error('Erro ao criar assinatura');
      return false;
    }
  };

  const useCredit = async (appointmentId: string) => {
    if (!subscription || subscription.credits_remaining <= 0) {
      toast.error('Sem créditos disponíveis');
      return false;
    }

    try {
      // Registrar uso do crédito
      const { error: usageError } = await supabase
        .from('subscription_credit_usage')
        .insert({
          subscription_id: subscription.id,
          appointment_id: appointmentId,
        });

      if (usageError) throw usageError;

      // Decrementar créditos
      const { error: updateError } = await supabase
        .from('client_subscriptions')
        .update({ credits_remaining: subscription.credits_remaining - 1 })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      toast.success('Crédito utilizado!');
      await fetchSubscription();
      return true;
    } catch (error: any) {
      console.error('Error using credit:', error);
      toast.error('Erro ao usar crédito');
      return false;
    }
  };

  const renewSubscription = async () => {
    if (!subscription) {
      toast.error('Assinatura não encontrada');
      return false;
    }

    try {
      const plan = subscription.service;
      if (!plan) {
        toast.error('Plano não encontrado');
        return false;
      }

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + plan.subscription_duration_days);

      const { error } = await supabase
        .from('client_subscriptions')
        .update({
          credits_remaining: plan.credits_per_month,
          expires_at: newExpiresAt.toISOString(),
          status: 'active',
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Assinatura renovada com sucesso!');
      await fetchSubscription();
      return true;
    } catch (error: any) {
      console.error('Error renewing subscription:', error);
      toast.error('Erro ao renovar assinatura');
      return false;
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return false;

    try {
      const { error } = await supabase
        .from('client_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Assinatura cancelada');
      setSubscription(null);
      return true;
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast.error('Erro ao cancelar assinatura');
      return false;
    }
  };

  return {
    subscription,
    loading,
    availablePlans,
    hasActiveSubscription: !!subscription && subscription.status === 'active',
    creditsRemaining: subscription?.credits_remaining ?? 0,
    createSubscription,
    useCredit,
    renewSubscription,
    cancelSubscription,
    refetch: fetchSubscription,
  };
}
