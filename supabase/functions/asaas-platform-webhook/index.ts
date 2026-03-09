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
    const body = await req.json();
    console.log('Asaas platform webhook received:', JSON.stringify(body));

    const { event, payment, subscription } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Identify barbershop by external reference
    const externalRef = payment?.externalReference ?? subscription?.externalReference;
    if (!externalRef) {
      console.log('No externalReference found in webhook, skipping');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updateData: Record<string, any> = {};

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        updateData = { plan_status: 'active', is_suspended: false };
        break;

      case 'PAYMENT_OVERDUE':
        updateData = { plan_status: 'overdue' };
        break;

      case 'SUBSCRIPTION_DELETED':
      case 'PAYMENT_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        updateData = { plan_status: 'cancelled', is_suspended: true };
        break;

      case 'PAYMENT_RESTORED':
        updateData = { plan_status: 'active', is_suspended: false };
        break;

      default:
        console.log(`Unhandled event: ${event}`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { error } = await supabaseAdmin
      .from('barbershops')
      .update(updateData)
      .eq('id', externalRef);

    if (error) {
      console.error('DB update error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Barbershop ${externalRef} updated: event=${event}`, updateData);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
