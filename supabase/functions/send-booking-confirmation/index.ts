import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_SENDER = "BarberPLUS <noreply@notify.www.barberplus.shop>";

interface BookingEmailRequest {
  barbershop_id: string;
  client_email: string;
  client_name: string;
  service_name: string;
  barber_name: string;
  scheduled_at: string;
}

function buildContactBlock(settings: Record<string, any>): string {
  const lines: string[] = [];
  if (settings.contact_email) lines.push(`📧 ${settings.contact_email}`);
  if (settings.contact_phone) lines.push(`📱 ${settings.contact_phone}`);
  if (settings.contact_whatsapp) lines.push(`💬 WhatsApp: ${settings.contact_whatsapp}`);
  if (lines.length === 0) return "";
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:12px 0 0 0;border-top:1px solid #e5e5e5;">
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;">Entre em contato</p>
          ${lines.map(l => `<p style="margin:0 0 4px 0;font-size:14px;color:#555;">${l}</p>`).join("")}
        </td>
      </tr>
    </table>
  `;
}

async function sendEmail(apiKey: string, from: string, to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Resend API error:", data);
    throw new Error(data.message || `Email send failed with status ${res.status}`);
  }
  return data;
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

    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name")
      .eq("id", barbershop_id)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    const { data: credentials } = await supabase
      .from("barbershop_credentials")
      .select("email_credentials")
      .eq("barbershop_id", barbershop_id)
      .single();

    const settings = (credentials?.email_credentials || {}) as Record<string, any>;

    // notifications_enabled defaults to true when not explicitly set to false
    if (settings.notifications_enabled === false) {
      console.log("Notifications disabled for this barbershop");
      return new Response(
        JSON.stringify({ message: "Notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email send");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const scheduledDate = new Date(scheduled_at);
    const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
    });

    const contactBlock = buildContactBlock(settings);

    const emailHTML = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr><td style="background-color:#18181b;padding:14px 28px;text-align:center;">
                  <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;">✂️ BarberPLUS</span>
                </td></tr>
                <tr><td style="background:linear-gradient(135deg,#B45309 0%,#D97706 100%);padding:28px;text-align:center;">
                  <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Confirmação de Agendamento</p>
                  <h1 style="margin:0 0 2px 0;color:#ffffff;font-size:22px;font-weight:700;">${barbershop.name}</h1>
                  <p style="margin:8px 0 0 0;font-size:24px;">🎉</p>
                </td></tr>
                <tr><td style="padding:28px;">
                  <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${client_name}</strong>!</p>
                  <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">Seu agendamento na <strong>${barbershop.name}</strong> foi confirmado com sucesso.</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
                    <tr><td style="padding:20px 24px;">
                      <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Detalhes do Agendamento</p>
                      <p style="margin:0 0 8px 0;font-size:15px;"><strong>📍 Barbearia:</strong> ${barbershop.name}</p>
                      <p style="margin:0 0 8px 0;font-size:15px;"><strong>✂️ Serviço:</strong> ${service_name}</p>
                      <p style="margin:0 0 8px 0;font-size:15px;"><strong>👨‍💼 Barbeiro:</strong> ${barber_name}</p>
                      <p style="margin:0 0 8px 0;font-size:15px;"><strong>📅 Data:</strong> ${formattedDate}</p>
                      <p style="margin:0;font-size:15px;"><strong>🕐 Horário:</strong> ${formattedTime}</p>
                    </td></tr>
                  </table>
                  <p style="margin:0;font-size:15px;color:#444;">Nos vemos em breve! — <strong>${barbershop.name}</strong></p>
                  ${contactBlock}
                </td></tr>
                <tr><td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 28px;text-align:center;">
                  <p style="margin:0 0 4px 0;font-size:13px;color:#666;">Este email foi enviado pela <strong>${barbershop.name}</strong></p>
                  <p style="margin:0;font-size:11px;color:#999;">gerenciado via ✂️ BarberPLUS · Email automático, não responda.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `;

    console.log("Sending email to:", client_email);

    const data = await sendEmail(
      resendApiKey,
      PLATFORM_SENDER,
      [client_email],
      `Agendamento Confirmado - ${barbershop.name}`,
      emailHTML,
    );

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Email notification processed" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
