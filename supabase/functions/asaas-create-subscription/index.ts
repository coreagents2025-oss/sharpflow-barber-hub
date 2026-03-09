import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { subscription_id, barbershop_id, lead_id, plan_id } = await req.json();

    if (!subscription_id || !barbershop_id || !lead_id || !plan_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch Asaas credentials for this barbershop
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('barbershop_credentials')
      .select('asaas_credentials')
      .eq('barbershop_id', barbershop_id)
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({ error: 'Barbershop credentials not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const asaasCreds = (credentials.asaas_credentials || {}) as any;
    if (!asaasCreds.enabled || !asaasCreds.api_key) {
      return new Response(JSON.stringify({ error: 'Asaas not configured for this barbershop' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = asaasCreds.api_key as string;
    const environment = asaasCreds.environment || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Fetch lead info
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('full_name, phone, email')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch plan info
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('name, price, billing_interval, billing_method')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    };

    // Step 1: Create or find customer in Asaas
    // Try to find by phone first
    const phoneDigits = lead.phone.replace(/\D/g, '');
    const searchResp = await fetch(`${baseUrl}/customers?mobilePhone=${phoneDigits}&limit=1`, {
      headers,
    });
    const searchData = await searchResp.json();

    let customerId: string;

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      // Create new customer
      const createCustomerBody: Record<string, string> = {
        name: lead.full_name,
        mobilePhone: phoneDigits,
      };
      if (lead.email) createCustomerBody.email = lead.email;

      const createCustomerResp = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createCustomerBody),
      });
      const customerData = await createCustomerResp.json();

      if (!createCustomerResp.ok || customerData.errors) {
        const errMsg = customerData.errors?.[0]?.description || 'Failed to create customer in Asaas';
        return new Response(JSON.stringify({ error: errMsg }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      customerId = customerData.id;
    }

    // Map billing cycle
    const cycleMap: Record<string, string> = {
      weekly: 'WEEKLY',
      biweekly: 'BIWEEKLY',
      monthly: 'MONTHLY',
    };
    const billingTypeMap: Record<string, string> = {
      pix: 'PIX',
      boleto: 'BOLETO',
      card: 'CREDIT_CARD',
    };

    const cycle = cycleMap[plan.billing_interval] || 'MONTHLY';
    const billingType = billingTypeMap[plan.billing_method] || 'PIX';
    const today = new Date().toISOString().split('T')[0];

    // Step 2: Create subscription in Asaas
    const createSubBody = {
      customer: customerId,
      billingType,
      value: Number(plan.price),
      nextDueDate: today,
      cycle,
      description: `Assinatura: ${plan.name}`,
      externalReference: subscription_id,
    };

    const createSubResp = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(createSubBody),
    });
    const subData = await createSubResp.json();

    if (!createSubResp.ok || subData.errors) {
      const errMsg = subData.errors?.[0]?.description || 'Failed to create subscription in Asaas';
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Save asaas_subscription_id and asaas_customer_id to client_subscriptions
    const { error: updateError } = await supabaseAdmin
      .from('client_subscriptions')
      .update({
        asaas_subscription_id: subData.id,
        asaas_customer_id: customerId,
      } as any)
      .eq('id', subscription_id);

    if (updateError) {
      console.error('Failed to update subscription with Asaas IDs:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      asaas_subscription_id: subData.id,
      asaas_customer_id: customerId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('asaas-create-subscription error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
