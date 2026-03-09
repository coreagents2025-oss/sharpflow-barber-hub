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

    const { email, password, full_name, barbershop_id, lead_id, subscription_id } = await req.json();

    if (!email || !password || !barbershop_id) {
      return new Response(JSON.stringify({ error: 'email, password e barbershop_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for admin operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase().trim());

    let userId: string;

    if (existingUser) {
      // User already has an account — update password and ensure link exists
      userId = existingUser.id;
      await adminClient.auth.admin.updateUserById(userId, { password });
    } else {
      // Create new user with email_confirm: true (no email verification needed)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || email,
          role: 'client',
          barbershop_id,
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = newUser.user!.id;
    }

    // Ensure client_barbershop_links exists
    const { data: existingLink } = await adminClient
      .from('client_barbershop_links')
      .select('id')
      .eq('user_id', userId)
      .eq('barbershop_id', barbershop_id)
      .maybeSingle();

    if (!existingLink) {
      await adminClient.from('client_barbershop_links').insert({
        user_id: userId,
        barbershop_id,
        lead_id: lead_id || null,
      });
    }

    // Ensure user_roles has 'client' role
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'client')
      .maybeSingle();

    if (!existingRole) {
      await adminClient.from('user_roles').insert({ user_id: userId, role: 'client' });
    }

    // Ensure profiles row exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await adminClient.from('profiles').insert({
        id: userId,
        full_name: full_name || email,
      });
    }

    // Link subscription to this user if subscription_id provided
    if (subscription_id) {
      await adminClient
        .from('client_subscriptions')
        .update({ client_id: userId })
        .eq('id', subscription_id)
        .eq('barbershop_id', barbershop_id);
    }

    // Also update all subscriptions for this lead if lead_id provided
    if (lead_id) {
      await adminClient
        .from('client_subscriptions')
        .update({ client_id: userId })
        .eq('lead_id', lead_id)
        .eq('barbershop_id', barbershop_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      is_existing_user: !!existingUser,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-client-account error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
