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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { barbershop_id, plan_type, name, cpf_cnpj, email, phone } = body;

    if (!barbershop_id || !plan_type || !name || !cpf_cnpj || !email || !phone) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: barbershop_id, plan_type, name, cpf_cnpj, email, phone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['monthly', 'annual'].includes(plan_type)) {
      return new Response(JSON.stringify({ error: 'plan_type deve ser "monthly" ou "annual"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB operations (trusted since we verified the JWT)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the user is admin of this barbershop
    const { data: staffData } = await supabaseAdmin
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('barbershop_id', barbershop_id)
      .eq('user_id', userId)
      .single();

    if (!staffData) {
      return new Response(JSON.stringify({ error: 'Acesso negado a esta barbearia' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ASAAS_API_KEY = Deno.env.get('ASAAS_PLATFORM_API_KEY');
    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: 'API Key Asaas da plataforma não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
    const asaasHeaders = {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
    };

    // 1. Criar customer no Asaas
    const customerPayload = {
      name: name.trim().substring(0, 200),
      cpfCnpj: cpf_cnpj.replace(/\D/g, ''),
      email: email.trim().toLowerCase(),
      mobilePhone: phone.replace(/\D/g, ''),
      externalReference: barbershop_id,
    };

    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(customerPayload),
    });

    if (!customerRes.ok) {
      const errBody = await customerRes.text();
      console.error('Asaas customer error:', errBody);
      return new Response(JSON.stringify({ error: 'Erro ao criar cliente no Asaas', detail: errBody }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customer = await customerRes.json();
    const customerId = customer.id;

    // 2. Criar assinatura recorrente
    const prices: Record<string, { value: number; cycle: string }> = {
      monthly: { value: 89.90, cycle: 'MONTHLY' },
      annual:  { value: 828.00, cycle: 'YEARLY' },
    };

    const today = new Date();
    const nextMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const subscriptionPayload = {
      customer: customerId,
      billingType: 'PIX',
      value: prices[plan_type].value,
      nextDueDate: nextMonthStr,
      cycle: prices[plan_type].cycle,
      description: `BarberPlus - Plano ${plan_type === 'monthly' ? 'Mensal' : 'Anual'}`,
      externalReference: barbershop_id,
    };

    const subscriptionRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(subscriptionPayload),
    });

    if (!subscriptionRes.ok) {
      const errBody = await subscriptionRes.text();
      console.error('Asaas subscription error:', errBody);
      return new Response(JSON.stringify({ error: 'Erro ao criar assinatura no Asaas', detail: errBody }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subscription = await subscriptionRes.json();

    // 3. Atualizar barbershop no banco
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + (plan_type === 'annual' ? 12 : 1));

    const { error: updateError } = await supabaseAdmin
      .from('barbershops')
      .update({
        plan_type,
        plan_status: 'active',
        platform_asaas_customer_id: customerId,
        platform_asaas_subscription_id: subscription.id,
      } as any)
      .eq('id', barbershop_id);

    if (updateError) {
      console.error('DB update error:', updateError);
      return new Response(JSON.stringify({ error: 'Assinatura criada no Asaas mas falha ao salvar no banco', asaas_subscription_id: subscription.id }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      asaas_customer_id: customerId,
      asaas_subscription_id: subscription.id,
      plan_type,
      next_billing_date: nextBillingDate.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message ?? 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
