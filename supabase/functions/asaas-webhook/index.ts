import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const barbershopId = url.searchParams.get('barbershop_id');

    if (!barbershopId) {
      return new Response(JSON.stringify({ error: 'Missing barbershop_id query param' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    const event = payload.event as string;
    const paymentData = payload.payment;

    console.log(`Asaas webhook: event=${event}, barbershop_id=${barbershopId}`, JSON.stringify(payload));

    if (!event || !paymentData) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the subscription by Asaas subscription ID (externalReference or subscriptionId)
    const asaasSubscriptionId = paymentData.subscription || paymentData.subscriptionId;

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      if (!asaasSubscriptionId) {
        console.log('No subscription ID in payment, skipping');
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find local subscription by asaas_subscription_id
      const { data: sub, error: subError } = await supabaseAdmin
        .from('client_subscriptions')
        .select('id, barbershop_id, plan_id, billing_interval')
        .eq('asaas_subscription_id', asaasSubscriptionId)
        .eq('barbershop_id', barbershopId)
        .single();

      if (subError || !sub) {
        console.error('Subscription not found for asaas_subscription_id:', asaasSubscriptionId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark the pending subscription_payment as paid (match by due_date or just most recent pending)
      const dueDateStr = paymentData.dueDate || new Date().toISOString().split('T')[0];
      const { data: existingPayment } = await supabaseAdmin
        .from('subscription_payments')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('status', 'pending')
        .eq('due_date', dueDateStr)
        .maybeSingle();

      if (existingPayment) {
        await supabaseAdmin
          .from('subscription_payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
          .eq('id', existingPayment.id);
      } else {
        // Insert a new paid record
        await supabaseAdmin.from('subscription_payments').insert({
          subscription_id: sub.id,
          barbershop_id: barbershopId,
          amount: paymentData.value || 0,
          due_date: dueDateStr,
          payment_method: paymentData.billingType?.toLowerCase() || 'pix',
          status: 'paid',
          paid_at: new Date().toISOString(),
        } as any);
      }

      // Renew subscription: add credits + extend expires_at
      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('credits_per_month')
        .eq('id', sub.plan_id)
        .single();

      const intervalDays =
        sub.billing_interval === 'weekly' ? 7
        : sub.billing_interval === 'biweekly' ? 14
        : 30;

      const newExpires = new Date();
      newExpires.setDate(newExpires.getDate() + intervalDays);

      await supabaseAdmin
        .from('client_subscriptions')
        .update({
          status: 'active',
          credits_remaining: plan?.credits_per_month || 0,
          expires_at: newExpires.toISOString(),
          next_billing_date: newExpires.toISOString(),
        } as any)
        .eq('id', sub.id);

      console.log(`Payment confirmed for subscription ${sub.id}, renewed until ${newExpires.toISOString()}`);

      // Fire-and-forget payment confirmation email
      supabaseAdmin.functions.invoke('send-subscription-email', {
        body: { type: 'payment_confirmed', subscription_id: sub.id },
      }).catch(console.error);

    } else if (event === 'PAYMENT_OVERDUE') {
      if (!asaasSubscriptionId) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: sub } = await supabaseAdmin
        .from('client_subscriptions')
        .select('id')
        .eq('asaas_subscription_id', asaasSubscriptionId)
        .eq('barbershop_id', barbershopId)
        .single();

      if (sub) {
        const dueDateStr = paymentData.dueDate || new Date().toISOString().split('T')[0];
        await supabaseAdmin
          .from('subscription_payments')
          .update({ status: 'overdue' } as any)
          .eq('subscription_id', sub.id)
          .eq('due_date', dueDateStr);
      }

    } else if (event === 'SUBSCRIPTION_DELETED') {
      const asaasSubId = paymentData.id || asaasSubscriptionId;
      if (asaasSubId) {
        await supabaseAdmin
          .from('client_subscriptions')
          .update({ status: 'cancelled' } as any)
          .eq('asaas_subscription_id', asaasSubId)
          .eq('barbershop_id', barbershopId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('asaas-webhook error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
