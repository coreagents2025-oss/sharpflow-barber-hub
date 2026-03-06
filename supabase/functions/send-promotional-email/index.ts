import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_SENDER = "BarberPLUS <noreply@notify.www.barberplus.shop>";

interface PromotionalEmailRequest {
  barbershop_id: string;
  subject: string;
  message: string;
  recipient_emails?: string[];
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { barbershop_id, subject, message, recipient_emails }: PromotionalEmailRequest = await req.json();

    console.log("Processing promotional email:", { barbershop_id, subject, has_specific_recipients: !!recipient_emails?.length });

    const { data: credentials, error: credentialsError } = await supabase
      .from("barbershop_credentials")
      .select("email_credentials")
      .eq("barbershop_id", barbershop_id)
      .single();

    if (credentialsError || !credentials) {
      console.error("Error fetching credentials:", credentialsError);
      return new Response(
        JSON.stringify({ error: "Email credentials not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailSettings = (credentials.email_credentials || {}) as Record<string, any>;

    if (!emailSettings.notifications_enabled) {
      console.log("Notifications disabled for this barbershop");
      return new Response(
        JSON.stringify({ message: "Notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name")
      .eq("id", barbershop_id)
      .single();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
      throw barbershopError;
    }

    let recipients: string[] = [];

    if (recipient_emails && recipient_emails.length > 0) {
      recipients = recipient_emails;
    } else {
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("client_id")
        .eq("barbershop_id", barbershop_id);

      if (appointmentsError) throw appointmentsError;

      const uniqueClientIds = [...new Set(appointments?.map((a) => a.client_id) || [])];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", uniqueClientIds);

      if (profilesError) throw profilesError;

      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      const profileIds = profiles?.map(p => p.id) || [];
      recipients = users
        .filter(u => profileIds.includes(u.id) && u.email)
        .map(u => u.email!);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recipients found", sent_count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const contactBlock = buildContactBlock(emailSettings);

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
                  <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Mensagem de</p>
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${barbershop.name}</h1>
                </td></tr>
                <tr><td style="padding:28px 28px 0 28px;">
                  <h2 style="margin:0 0 16px 0;font-size:20px;color:#1a1a1a;">${subject}</h2>
                </td></tr>
                <tr><td style="padding:0 28px 28px 28px;">
                  <div style="font-size:15px;color:#444;line-height:1.7;background:#f9f9f9;border-radius:8px;padding:20px;">
                    ${message.replace(/\n/g, "<br>")}
                  </div>
                  <p style="margin:24px 0 0 0;font-size:15px;color:#444;">Com carinho, <strong>${barbershop.name}</strong></p>
                  ${contactBlock}
                </td></tr>
                <tr><td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 28px;text-align:center;">
                  <p style="margin:0 0 4px 0;font-size:13px;color:#666;">Este email promocional foi enviado pela <strong>${barbershop.name}</strong></p>
                  <p style="margin:0;font-size:11px;color:#999;">gerenciado via ✂️ BarberPLUS · Para cancelar, entre em contato com a barbearia.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `;

    const batchSize = 100;
    let totalSent = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      try {
        await sendEmail(resendApiKey, PLATFORM_SENDER, batch, subject, emailHTML);
        console.log("Batch sent successfully, count:", batch.length);
        totalSent += batch.length;
      } catch (err) {
        console.error("Error sending batch:", err);
      }
    }

    const { error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        barbershop_id,
        subject,
        message,
        sent_count: totalSent,
        created_by: emailSettings.created_by || null,
      });

    if (campaignError) console.error("Error saving campaign:", campaignError);

    console.log(`Promotional email sent to ${totalSent} recipients`);

    return new Response(
      JSON.stringify({ success: true, message: "Promotional emails sent", sent_count: totalSent, total_recipients: recipients.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending promotional email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
