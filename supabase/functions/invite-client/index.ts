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
    // Validate caller is authenticated staff
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify calling user with anon key
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, full_name, slug, barbershop_id } = await req.json();

    if (!email || !barbershop_id || !slug) {
      return new Response(JSON.stringify({ error: 'email, barbershop_id e slug são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for all admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch barbershop's custom_domain to build the correct redirectTo URL
    const { data: barbershop } = await adminClient
      .from('barbershops')
      .select('custom_domain, slug')
      .eq('id', barbershop_id)
      .single();

    // Use custom domain if set, otherwise fall back to the published platform domain
    const baseUrl = barbershop?.custom_domain
      ? `https://${barbershop.custom_domain}`
      : 'https://barberplus.shop';

    const redirectTo = `${baseUrl}/${slug}/cliente/dashboard`;

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: full_name || email,
        role: 'client',
        barbershop_id,
      },
    });

    if (error) {
      // If user already exists, generate a magic link (recovery) instead
      if (error.message?.includes('already been registered') || error.message?.includes('already registered')) {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo },
        });

        if (linkError) {
          return new Response(JSON.stringify({ error: linkError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, type: 'recovery', action_link: linkData.properties?.action_link }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, type: 'invite', user_id: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-client error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
