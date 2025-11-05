import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookMessage {
  barbershop_token?: string;
  provider: 'official' | 'evolution_api' | 'z_api' | 'uazapi';
  from: string;
  message: string;
  media_url?: string;
  provider_message_id?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const contentType = req.headers.get('content-type') || '';
    let payload: any;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else {
      const text = await req.text();
      console.log('Webhook received (non-JSON):', text);
      return new Response(JSON.stringify({ success: true, message: 'Webhook received' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Identificar barbershop_id pelo token na URL ou no payload
    const url = new URL(req.url);
    const tokenFromUrl = url.searchParams.get('token');
    const barbershop_token = tokenFromUrl || payload.barbershop_token;

    if (!barbershop_token) {
      return new Response(JSON.stringify({ error: 'Missing barbershop token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Buscar barbershop pelo token (usando slug como token temporário)
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('slug', barbershop_token)
      .single();

    if (shopError || !barbershop) {
      console.error('Barbershop not found:', shopError);
      return new Response(JSON.stringify({ error: 'Invalid barbershop token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const barbershop_id = barbershop.id;

    // Parse do payload conforme provedor
    let parsedMessage: WebhookMessage | null = null;

    // Tentar detectar provedor
    if (payload.entry && payload.object === 'whatsapp_business_account') {
      // WhatsApp Business API (Official)
      parsedMessage = parseOfficialWebhook(payload);
    } else if (payload.event === 'messages.upsert' || payload.instance) {
      // Evolution API
      parsedMessage = parseEvolutionWebhook(payload);
    } else if (payload.phone || payload.instanceId) {
      // Z-API
      parsedMessage = parseZAPIWebhook(payload);
    } else if (payload.key && payload.message) {
      // UAZapi
      parsedMessage = parseUAZapiWebhook(payload);
    }

    if (!parsedMessage) {
      console.log('Unable to parse webhook from any known provider');
      return new Response(JSON.stringify({ success: true, message: 'Webhook format not recognized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Parsed message:', parsedMessage);

    // Buscar ou criar conversa
    let conversation_id: string;
    
    const { data: existingConv } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('barbershop_id', barbershop_id)
      .eq('client_phone', parsedMessage.from)
      .maybeSingle();

    if (existingConv) {
      conversation_id = existingConv.id;
      
      // Atualizar conversa
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: parsedMessage.message.substring(0, 100),
          last_message_at: new Date().toISOString(),
          unread_count: supabase.rpc('increment', { x: 1, row_id: existingConv.id }),
        })
        .eq('id', existingConv.id);
    } else {
      // Criar nova conversa
      const { data: newConv, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          barbershop_id,
          client_phone: parsedMessage.from,
          client_name: parsedMessage.from, // Melhorar depois com dados reais
          last_message: parsedMessage.message.substring(0, 100),
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        })
        .select('id')
        .single();

      if (convError || !newConv) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      conversation_id = newConv.id;
    }

    // Salvar mensagem
    const { error: msgError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id,
        barbershop_id,
        message_type: 'received',
        content: parsedMessage.message,
        media_url: parsedMessage.media_url || null,
        status: 'delivered',
        provider_message_id: parsedMessage.provider_message_id || null,
        metadata: parsedMessage.metadata || {},
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
      throw msgError;
    }

    console.log('Message saved successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function parseOfficialWebhook(payload: any): WebhookMessage | null {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return null;

    return {
      provider: 'official',
      from: message.from,
      message: message.text?.body || message.caption || '',
      media_url: message.image?.link || message.video?.link || message.document?.link,
      provider_message_id: message.id,
      metadata: { raw: payload },
    };
  } catch (error) {
    console.error('Error parsing official webhook:', error);
    return null;
  }
}

function parseEvolutionWebhook(payload: any): WebhookMessage | null {
  try {
    const message = payload.data?.key || payload.key;
    const messageContent = payload.data?.message || payload.message;

    if (!message || !messageContent) return null;

    return {
      provider: 'evolution_api',
      from: message.remoteJid?.replace('@s.whatsapp.net', '') || '',
      message: messageContent.conversation || messageContent.extendedTextMessage?.text || '',
      media_url: messageContent.imageMessage?.url || messageContent.videoMessage?.url,
      provider_message_id: message.id,
      metadata: { raw: payload },
    };
  } catch (error) {
    console.error('Error parsing Evolution webhook:', error);
    return null;
  }
}

function parseZAPIWebhook(payload: any): WebhookMessage | null {
  try {
    if (!payload.phone || !payload.text?.message) return null;

    return {
      provider: 'z_api',
      from: payload.phone,
      message: payload.text.message,
      media_url: payload.image?.imageUrl || payload.video?.videoUrl,
      provider_message_id: payload.messageId,
      metadata: { raw: payload },
    };
  } catch (error) {
    console.error('Error parsing Z-API webhook:', error);
    return null;
  }
}

function parseUAZapiWebhook(payload: any): WebhookMessage | null {
  try {
    const key = payload.key;
    const message = payload.message;

    if (!key || !message) return null;

    // UAZapi usa key.remoteJid para o número
    const from = key.remoteJid?.replace('@s.whatsapp.net', '') || '';
    
    // Extrair texto da mensagem
    const text = message.conversation || 
                 message.extendedTextMessage?.text || 
                 message.imageMessage?.caption || 
                 message.videoMessage?.caption || '';

    return {
      provider: 'uazapi',
      from,
      message: text,
      media_url: message.imageMessage?.url || message.videoMessage?.url || message.documentMessage?.url,
      provider_message_id: key.id,
      metadata: { raw: payload },
    };
  } catch (error) {
    console.error('Error parsing UAZapi webhook:', error);
    return null;
  }
}