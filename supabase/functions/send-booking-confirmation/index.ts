import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  barbershop_id: string;
  client_email: string;
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
      client_email,
      client_name,
      service_name,
      barber_name,
      scheduled_at,
    }: BookingEmailRequest = await req.json();

    console.log("Processing booking confirmation email:", {
      barbershop_id,
      client_email,
      client_name,
    });

    // Buscar configurações de email da barbearia
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name, email_settings")
      .eq("id", barbershop_id)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    const settings = barbershop.email_settings || {};

    if (!settings.notifications_enabled) {
      console.log("Notifications disabled for this barbershop");
      return new Response(
        JSON.stringify({ message: "Notifications disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Preparar email HTML
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

    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B4513; }
            .details h3 { margin-top: 0; color: #8B4513; }
            .details p { margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Agendamento Confirmado! 🎉</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${client_name}</strong>!</p>
              <p>Seu agendamento foi confirmado com sucesso.</p>
              
              <div class="details">
                <h3>Detalhes do Agendamento:</h3>
                <p><strong>📍 Local:</strong> ${barbershop.name}</p>
                <p><strong>✂️ Serviço:</strong> ${service_name}</p>
                <p><strong>👨‍💼 Barbeiro:</strong> ${barber_name}</p>
                <p><strong>📅 Data:</strong> ${formattedDate}</p>
                <p><strong>🕐 Horário:</strong> ${formattedTime}</p>
              </div>
              
              <p>Nos vemos em breve!</p>
              <p><strong>${barbershop.name}</strong></p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Por enquanto, apenas log do email (Resend será configurado pelo usuário)
    console.log("Email would be sent to:", client_email);
    console.log("From:", settings.from_email || "noreply@barbershop.com");
    console.log("Subject: Agendamento Confirmado -", barbershop.name);

    // TODO: Integrar com Resend quando o usuário configurar a API key
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: `${settings.from_name || barbershop.name} <${settings.from_email || 'noreply@lovable.app'}>`,
    //   to: [client_email],
    //   subject: `Agendamento Confirmado - ${barbershop.name}`,
    //   html: emailHTML,
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email notification processed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
