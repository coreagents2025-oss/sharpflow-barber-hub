import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_type: string;
  barbershop_id: string;
  data: any;
}

async function sendWebhook(
  url: string,
  payload: any,
  secretKey: string,
  retryConfig: { max_retries: number; backoff_ms: number }
): Promise<{ success: boolean; status?: number; body?: string; attempts: number }> {
  let attempts = 0;
  const maxAttempts = retryConfig.max_retries + 1;

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // Criar assinatura HMAC
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, data);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log(`[Webhook] Tentativa ${attempts}/${maxAttempts} para ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signatureHex,
          'User-Agent': 'BarberPLUS-Webhook/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      console.log(`[Webhook] Resposta: ${response.status} - ${responseText.substring(0, 100)}`);

      if (response.ok) {
        return {
          success: true,
          status: response.status,
          body: responseText,
          attempts,
        };
      }

      // Se não foi bem-sucedido e ainda temos tentativas, aguardar antes de tentar novamente
      if (attempts < maxAttempts) {
        const backoffTime = retryConfig.backoff_ms * Math.pow(2, attempts - 1);
        console.log(`[Webhook] Aguardando ${backoffTime}ms antes da próxima tentativa`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        return {
          success: false,
          status: response.status,
          body: responseText,
          attempts,
        };
      }
    } catch (error: any) {
      console.error(`[Webhook] Erro na tentativa ${attempts}:`, error.message);
      
      if (attempts < maxAttempts) {
        const backoffTime = retryConfig.backoff_ms * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        return {
          success: false,
          body: error.message,
          attempts,
        };
      }
    }
  }

  return { success: false, attempts };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    const { event_type, barbershop_id, data } = payload;

    console.log(`[Webhook Dispatcher] Evento recebido: ${event_type} para barbershop ${barbershop_id}`);

    // Buscar webhooks ativos para este evento e barbearia
    const { data: subscriptions, error: subError } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('barbershop_id', barbershop_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (subError) {
      console.error('[Webhook Dispatcher] Erro ao buscar subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Webhook Dispatcher] Nenhum webhook ativo encontrado para evento ${event_type}`);
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum webhook configurado para este evento',
          event_type,
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[Webhook Dispatcher] Enviando para ${subscriptions.length} webhook(s)`);

    // Enviar para todos os webhooks em paralelo
    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        const webhookPayload = {
          event: event_type,
          barbershop_id,
          timestamp: new Date().toISOString(),
          data,
        };

        const result = await sendWebhook(
          subscription.webhook_url,
          webhookPayload,
          subscription.secret_key,
          subscription.retry_config as { max_retries: number; backoff_ms: number }
        );

        // Registrar log
        await supabase.from('webhook_logs').insert({
          subscription_id: subscription.id,
          event_type,
          payload: webhookPayload,
          response_status: result.status,
          response_body: result.body,
          attempts: result.attempts,
          delivered_at: result.success ? new Date().toISOString() : null,
        });

        return {
          subscription_id: subscription.id,
          webhook_url: subscription.webhook_url,
          ...result,
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`[Webhook Dispatcher] ${successCount}/${results.length} webhooks enviados com sucesso`);

    return new Response(
      JSON.stringify({
        message: 'Webhooks processados',
        event_type,
        total: results.length,
        successful: successCount,
        results,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[Webhook Dispatcher] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
