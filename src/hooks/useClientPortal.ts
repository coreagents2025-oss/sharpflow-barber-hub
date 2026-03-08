import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BarbershopInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
}

interface ActiveSubscription {
  id: string;
  plan_name: string;
  credits_remaining: number;
  expires_at: string | null;
  next_billing_date: string | null;
  status: string;
  billing_interval: string;
  plan_price: number;
}

interface PendingPayment {
  id: string;
  amount: number;
  due_date: string;
  payment_method: string;
  status: string;
  subscription_id: string;
}

interface RecentAppointment {
  id: string;
  scheduled_at: string;
  status: string;
  service_name: string;
  barber_name: string | null;
}

export const useClientPortal = (slug: string | undefined) => {
  const { user } = useAuth();
  const [barbershop, setBarbershop] = useState<BarbershopInfo | null>(null);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [appointments, setAppointments] = useState<RecentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!user || !slug) {
      setLoading(false);
      return;
    }
    fetchPortalData();
  }, [user, slug]);

  const fetchPortalData = async () => {
    if (!user || !slug) return;
    setLoading(true);
    try {
      // Get barbershop by slug
      const { data: bsData } = await supabase
        .from('barbershops')
        .select('id, name, slug, logo_url, phone, address')
        .eq('slug', slug)
        .maybeSingle();

      if (!bsData) {
        setLoading(false);
        return;
      }

      setBarbershop(bsData);

      // Verify client has access to this barbershop
      const { data: linkData } = await supabase
        .from('client_barbershop_links')
        .select('id')
        .eq('user_id', user.id)
        .eq('barbershop_id', bsData.id)
        .maybeSingle();

      if (!linkData) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);

      // Fetch active subscription
      const { data: subData } = await supabase
        .from('client_subscriptions')
        .select(`
          id,
          credits_remaining,
          expires_at,
          next_billing_date,
          status,
          billing_interval,
          subscription_plans:plan_id (
            name,
            price
          )
        `)
        .eq('client_id', user.id)
        .eq('barbershop_id', bsData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        const plan = subData.subscription_plans as any;
        setSubscription({
          id: subData.id,
          plan_name: plan?.name ?? 'Plano',
          credits_remaining: subData.credits_remaining,
          expires_at: subData.expires_at,
          next_billing_date: subData.next_billing_date,
          status: subData.status,
          billing_interval: subData.billing_interval,
          plan_price: plan?.price ?? 0,
        });

        // Fetch pending payments for this subscription
        const { data: paymentsData } = await supabase
          .from('subscription_payments')
          .select('id, amount, due_date, payment_method, status, subscription_id')
          .eq('subscription_id', subData.id)
          .eq('status', 'pending')
          .order('due_date', { ascending: true });

        setPendingPayments(paymentsData ?? []);
      }

      // Fetch recent appointments
      const { data: apptData } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          status,
          services:service_id (name),
          barbers:barber_id (name)
        `)
        .eq('client_id', user.id)
        .eq('barbershop_id', bsData.id)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      if (apptData) {
        setAppointments(
          apptData.map((a: any) => ({
            id: a.id,
            scheduled_at: a.scheduled_at,
            status: a.status,
            service_name: a.services?.name ?? 'Serviço',
            barber_name: a.barbers?.name ?? null,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { barbershop, subscription, pendingPayments, appointments, loading, hasAccess, refetch: fetchPortalData };
};
