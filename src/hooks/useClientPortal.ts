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

      // Fetch active subscription — look up both by client_id and by lead_id
      // (manually created subscriptions use lead_id; client-portal signups use client_id)
      const linkLead = linkData as any;
      const leadId: string | null = linkLead?.lead_id ?? null;

      // Build OR filter: client_id = user OR lead_id = linked lead
      let subQuery = supabase
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
        .eq('barbershop_id', bsData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (leadId) {
        subQuery = subQuery.or(`client_id.eq.${user.id},lead_id.eq.${leadId}`);
      } else {
        subQuery = subQuery.eq('client_id', user.id);
      }

      const { data: subData } = await subQuery.maybeSingle();

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

      // Fetch recent appointments (upcoming first, then past)
      const { data: apptUpcoming } = await supabase
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
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);

      const { data: apptPast } = await supabase
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
        .or('status.in.(completed,cancelled,no_show),scheduled_at.lt.' + new Date().toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(20);

      const mapAppt = (a: any): RecentAppointment => ({
        id: a.id,
        scheduled_at: a.scheduled_at,
        status: a.status,
        service_name: a.services?.name ?? 'Serviço',
        barber_name: a.barbers?.name ?? null,
      });

      setAppointments([
        ...(apptUpcoming ?? []).map(mapAppt),
        ...(apptPast ?? []).map(mapAppt),
      ]);
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { barbershop, subscription, pendingPayments, appointments, loading, hasAccess, refetch: fetchPortalData };
};
