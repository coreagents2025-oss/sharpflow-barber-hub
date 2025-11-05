import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppNotificationRequest {
  type?: 'booking_notification' | 'manual_message';
  barbershop_id: string;
  client_phone: string;
  client_name?: string;
  service_name?: string;
  barber_name?: string;
  scheduled_at?: string;
  // Para mensagem manual
  message?: string;
  conversation_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      type = 'booking_notification',
      barbershop_id,
      client_phone,
      client_name,
      service_name,
      barber_name,
      scheduled_at,
      message: manualMessage,
      conversation_id,
    }: WhatsAppNotificationRequest = await req.json();

    console.log("Processing WhatsApp notification:", {
      type,
      barbershop_id,
      client_phone,
      client_name,
    });

    // Buscar configurações de WhatsApp da barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name")
      .eq("id", barbershop_id)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    // Buscar credenciais do WhatsApp de barbershop_credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from("barbershop_credentials")
      .select("whatsapp_credentials")
      .eq("barbershop_id", barbershop_id)
      .single();

    if (credentialsError) {
      console.error("Error fetching credentials:", credentialsError);
      throw credentialsError;
    }

    const settings = credentials?.whatsapp_credentials || {};
    
    console.log("WhatsApp settings loaded:", {
      enabled: settings.enabled,
      api_provider: settings.api_provider,
      has_phone: !!settings.phone_number,
    });

    if (!settings.enabled) {
      console.log("WhatsApp notifications disabled for this barbershop");
      return new Response(
        JSON.stringify({ message: "WhatsApp notifications disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!settings.phone_number) {
      console.log("WhatsApp phone number not configured");
      return new Response(
        JSON.stringify({ message: "WhatsApp phone number not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const apiProvider = settings.api_provider || "official";
    
    // Verificar se as credenciais necessárias estão configuradas
      if (apiProvider === "official" && (!settings.whatsapp_api_token || !settings.whatsapp_phone_number_id)) {
      console.log("WhatsApp Business API credentials not configured");
      return new Response(
        JSON.stringify({ message: "WhatsApp Business API credentials not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (apiProvider === "evolution_api" && (!settings.evolution_api_url || !settings.evolution_api_key || !settings.evolution_instance_name)) {
      console.log("Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ message: "Evolution API credentials not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (apiProvider === "z_api" && (!settings.z_api_instance_id || !settings.z_api_token)) {
      console.log("Z-API credentials not configured");
      return new Response(
        JSON.stringify({ message: "Z-API credentials not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (apiProvider === "uazapi" && (!settings.uazapi_instance_id || !settings.uazapi_token || !settings.uazapi_account_id)) {
      console.log("UAZapi credentials not configured");
      return new Response(
        JSON.stringify({ message: "UAZapi credentials not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Preparar mensagem
    let message: string;
    
    if (type === 'manual_message' && manualMessage) {
      // Mensagem manual enviada pelo usuário
      message = manualMessage;
    } else {
      // Notificação de agendamento usando template
      // Formatar data e hora
      const scheduledDate = new Date(scheduled_at!);
      const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      message = settings.message_template || 
        "Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!";
      
      message = message
        .replace(/\{\{client_name\}\}/g, client_name || '')
        .replace(/\{\{date\}\}/g, formattedDate)
        .replace(/\{\{time\}\}/g, formattedTime)
        .replace(/\{\{service_name\}\}/g, service_name || '')
        .replace(/\{\{barber_name\}\}/g, barber_name || '');

      // Adicionar mensagem de oferta do dia se existir
      if (settings.daily_offer_message && settings.daily_offer_message.trim()) {
        message += "\n\n" + settings.daily_offer_message;
      }
    }

    // Log da mensagem que seria enviada
    console.log("WhatsApp API Provider:", apiProvider);
    console.log("WhatsApp message to:", settings.phone_number);
    console.log("Message:", message);
    console.log("Client phone:", client_phone);

    // Integração com diferentes APIs do WhatsApp
    let apiResponse = null;
    
    try {
      if (apiProvider === "official") {
        // WhatsApp Business API (Oficial)
        const whatsappToken = settings.whatsapp_api_token;
        const phoneNumberId = settings.whatsapp_phone_number_id;
        
        if (whatsappToken && phoneNumberId) {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${whatsappToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: client_phone,
                type: "text",
                text: { body: message },
              }),
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`WhatsApp API error: ${errorText}`);
            throw new Error(`WhatsApp API error: ${errorText}`);
          }
          
          apiResponse = await response.json();
          console.log("WhatsApp API Response:", apiResponse);
        }
      } else if (apiProvider === "evolution_api") {
        // Evolution API
        const evolutionUrl = settings.evolution_api_url;
        const evolutionKey = settings.evolution_api_key;
        const instanceName = settings.evolution_instance_name;
        
        if (evolutionUrl && evolutionKey && instanceName) {
          const response = await fetch(
            `${evolutionUrl}/message/sendText/${instanceName}`,
            {
              method: "POST",
              headers: {
                "apikey": evolutionKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: client_phone,
                text: message,
              }),
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Evolution API error: ${errorText}`);
            throw new Error(`Evolution API error: ${errorText}`);
          }
          
          apiResponse = await response.json();
          console.log("Evolution API Response:", apiResponse);
        }
      } else if (apiProvider === "z_api") {
        // Z-API
        const instanceId = settings.z_api_instance_id;
        const zApiToken = settings.z_api_token;
        
        if (instanceId && zApiToken) {
          const response = await fetch(
            `https://api.z-api.io/instances/${instanceId}/token/${zApiToken}/send-text`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                phone: client_phone,
                message: message,
              }),
            }
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Z-API error: ${errorText}`);
            throw new Error(`Z-API error: ${errorText}`);
          }
          
          apiResponse = await response.json();
          console.log("Z-API Response:", apiResponse);
        }
      } else if (apiProvider === "uazapi") {
        // UAZapi
        let subdomain = settings.uazapi_account_id;
        const instanceId = settings.uazapi_instance_id;
        const token = settings.uazapi_token;

        // Extrair subdomínio se vier URL completa
        if (subdomain && subdomain.includes('://')) {
          try {
            const url = new URL(subdomain);
            subdomain = url.hostname.split('.')[0]; // Pega apenas "core-agents" de "core-agents.uazapi.com"
            console.log('Extracted subdomain from URL:', subdomain);
          } catch (error) {
            console.error('Error parsing UAZapi URL:', error);
          }
        }
        
        if (subdomain && instanceId && token) {
          console.log('UAZapi Config:', {
            subdomain,
            instanceId,
            tokenLength: token.length,
            baseUrl: `https://${subdomain}.uazapi.com`,
          });

          // Verificar status da instância primeiro
          const statusUrl = `https://${subdomain}.uazapi.com/instance/status`;
          console.log('Checking UAZapi instance status:', statusUrl);
          
          try {
            const statusResponse = await fetch(statusUrl, {
              method: "GET",
              headers: {
                "Token": token,
                "Content-Type": "application/json",
              },
            });
            
            const statusData = await statusResponse.json();
            console.log('UAZapi Instance Status Response:', statusData);
            
            if (statusResponse.status !== 200) {
              throw new Error(`Failed to check instance status: ${JSON.stringify(statusData)}`);
            }
            
            if (statusData.status !== 'CONNECTED') {
              throw new Error(`Instance not connected. Current status: ${statusData.status}. Please scan QR code in UAZapi dashboard.`);
            }
            
            console.log('✅ Instance is CONNECTED, proceeding with message send...');
          } catch (statusError: any) {
            console.error('Instance status check failed:', statusError.message);
            throw new Error(`UAZapi instance not ready: ${statusError.message}`);
          }
          
          // Enviar mensagem
          const apiUrl = `https://${subdomain}.uazapi.com/chat/send/text`;
          const requestBody = {
            Phone: client_phone,
            Body: message,
          };
          
          console.log('UAZapi Send Request:', {
            url: apiUrl,
            phone: client_phone,
            messageLength: message.length,
            bodyKeys: Object.keys(requestBody),
          });
          
          const response = await fetch(
            apiUrl,
            {
              method: "POST",
              headers: {
                "Token": token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            }
          );
          
          const responseText = await response.text();
          console.log('UAZapi Response Status:', response.status);
          console.log('UAZapi Response Body:', responseText);
          
          if (!response.ok) {
            let errorMessage = `UAZapi error (${response.status}): ${responseText}`;
            
            if (response.status === 405) {
              errorMessage = 'Method not allowed. Instance may be disconnected or endpoint incorrect.';
            } else if (response.status === 401 || response.status === 403) {
              errorMessage = 'Authentication failed. Check your UAZapi token.';
            } else if (response.status === 404) {
              errorMessage = 'Endpoint not found. Verify instance ID and subdomain.';
            }
            
            console.error(`UAZapi error: ${errorMessage}`);
            throw new Error(errorMessage);
          }
          
          apiResponse = JSON.parse(responseText);
          console.log("✅ UAZapi Message sent successfully:", apiResponse);
        }
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp message:", error);
      // Não retornar erro 500, apenas logar e continuar
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to send WhatsApp message",
          error: error.message,
          provider: apiProvider,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp notification sent successfully",
        provider: apiProvider,
        api_response: apiResponse,
        preview: {
          to: client_phone,
          message: message,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
