import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppNotificationRequest {
  barbershop_id: string;
  client_phone: string;
  client_name: string;
  service_name: string;
  barber_name: string;
  scheduled_at: string;
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
      barbershop_id,
      client_phone,
      client_name,
      service_name,
      barber_name,
      scheduled_at,
    }: WhatsAppNotificationRequest = await req.json();

    console.log("Processing WhatsApp notification:", {
      barbershop_id,
      client_phone,
      client_name,
    });

    // Buscar configurações de WhatsApp da barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name, whatsapp_settings")
      .eq("id", barbershop_id)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    const settings = barbershop.whatsapp_settings || {};

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

    // Formatar data e hora
    const scheduledDate = new Date(scheduled_at);
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

    // Preparar mensagem usando template
    let message = settings.message_template || 
      "Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!";
    
    message = message
      .replace(/\{\{client_name\}\}/g, client_name)
      .replace(/\{\{date\}\}/g, formattedDate)
      .replace(/\{\{time\}\}/g, formattedTime)
      .replace(/\{\{service_name\}\}/g, service_name)
      .replace(/\{\{barber_name\}\}/g, barber_name);

    // Adicionar mensagem de oferta do dia se existir
    if (settings.daily_offer_message && settings.daily_offer_message.trim()) {
      message += "\n\n" + settings.daily_offer_message;
    }

    const apiProvider = settings.api_provider || "official";

    // Log da mensagem que seria enviada
    console.log("WhatsApp API Provider:", apiProvider);
    console.log("WhatsApp message to:", settings.phone_number);
    console.log("Message:", message);
    console.log("Client phone:", client_phone);

    // Integração com diferentes APIs do WhatsApp
    // Para habilitar, adicione as variáveis de ambiente necessárias em cada caso
    
    if (apiProvider === "official") {
      // WhatsApp Business API (Oficial)
      // Requer: WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID
      // const whatsappToken = Deno.env.get("WHATSAPP_API_TOKEN");
      // const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      
      // if (whatsappToken && phoneNumberId) {
      //   const response = await fetch(
      //     `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      //     {
      //       method: "POST",
      //       headers: {
      //         "Authorization": `Bearer ${whatsappToken}`,
      //         "Content-Type": "application/json",
      //       },
      //       body: JSON.stringify({
      //         messaging_product: "whatsapp",
      //         to: client_phone,
      //         type: "text",
      //         text: { body: message },
      //       }),
      //     }
      //   );
      //   
      //   if (!response.ok) {
      //     throw new Error(`WhatsApp API error: ${await response.text()}`);
      //   }
      // }
    } else if (apiProvider === "evolution_api") {
      // Evolution API
      // Requer: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
      // const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
      // const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
      // const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME");
      
      // if (evolutionUrl && evolutionKey && instanceName) {
      //   const response = await fetch(
      //     `${evolutionUrl}/message/sendText/${instanceName}`,
      //     {
      //       method: "POST",
      //       headers: {
      //         "apikey": evolutionKey,
      //         "Content-Type": "application/json",
      //       },
      //       body: JSON.stringify({
      //         number: client_phone,
      //         text: message,
      //       }),
      //     }
      //   );
      //   
      //   if (!response.ok) {
      //     throw new Error(`Evolution API error: ${await response.text()}`);
      //   }
      // }
    } else if (apiProvider === "z_api") {
      // Z-API
      // Requer: Z_API_INSTANCE_ID, Z_API_TOKEN
      // const instanceId = Deno.env.get("Z_API_INSTANCE_ID");
      // const zApiToken = Deno.env.get("Z_API_TOKEN");
      
      // if (instanceId && zApiToken) {
      //   const response = await fetch(
      //     `https://api.z-api.io/instances/${instanceId}/token/${zApiToken}/send-text`,
      //     {
      //       method: "POST",
      //       headers: {
      //         "Content-Type": "application/json",
      //       },
      //       body: JSON.stringify({
      //         phone: client_phone,
      //         message: message,
      //       }),
      //     }
      //   );
      //   
      //   if (!response.ok) {
      //     throw new Error(`Z-API error: ${await response.text()}`);
      //   }
      // }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp notification processed",
        provider: apiProvider,
        preview: {
          to: settings.phone_number,
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
