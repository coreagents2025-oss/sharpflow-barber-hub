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

    // Log da mensagem que seria enviada
    console.log("WhatsApp message to:", settings.phone_number);
    console.log("Message:", message);
    console.log("Client phone:", client_phone);

    // TODO: Integrar com WhatsApp Business API quando configurado
    // Requer WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp notification processed",
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
