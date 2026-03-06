import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_SENDER = "BarberPLUS <noreply@notify.www.barberplus.shop>";

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
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString();
    const threeDaysStr = threeDaysFromNow.toISOString();

    console.log(`Checking subscriptions expiring between ${todayStr} and ${threeDaysStr}`);

    const { data: subscriptions, error: subError } = await supabase
      .from("client_subscriptions")
      .select(`
        id, barbershop_id, lead_id, client_id, expires_at, next_billing_date, billing_interval, plan_id,
        subscription_plans ( name, price, billing_interval )
      `)
      .eq("status", "active")
      .or(`expires_at.gte.${todayStr},expires_at.lte.${threeDaysStr},next_billing_date.gte.${todayStr},next_billing_date.lte.${threeDaysStr}`);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions expiring soon");
      return new Response(JSON.stringify({ message: "No subscriptions expiring soon", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions to remind`);

    let totalSent = 0;
    let totalSkipped = 0;

    for (const sub of subscriptions) {
      try {
        const expiryDate = sub.expires_at || sub.next_billing_date;
        if (!expiryDate) { totalSkipped++; continue; }

        const expiry = new Date(expiryDate);
        if (expiry < now || expiry > threeDaysFromNow) { totalSkipped++; continue; }

        const { data: barbershop } = await supabase
          .from("public_barbershops")
          .select("id, name, logo_url, phone")
          .eq("id", sub.barbershop_id)
          .single();

        if (!barbershop) { totalSkipped++; continue; }

        const { data: credentials } = await supabase
          .from("barbershop_credentials")
          .select("email_credentials")
          .eq("barbershop_id", sub.barbershop_id)
          .single();

        const emailSettings = (credentials?.email_credentials || {}) as Record<string, any>;

        if (!emailSettings.notifications_enabled) { totalSkipped++; continue; }

        let clientEmail: string | null = null;
        let clientName = "Cliente";

        if (sub.lead_id) {
          const { data: lead } = await supabase.from("leads").select("email, full_name").eq("id", sub.lead_id).single();
          if (lead?.email) { clientEmail = lead.email; clientName = lead.full_name || "Cliente"; }
        }

        if (!clientEmail && sub.client_id) {
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(sub.client_id);
          if (!userError && user?.email) { clientEmail = user.email; clientName = user.user_metadata?.full_name || user.email; }
        }

        if (!clientEmail) { totalSkipped++; continue; }

        const expiryFormatted = expiry.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const planName = (sub.subscription_plans as { name?: string } | null)?.name || "seu plano";
        const contactBlock = buildContactBlock(emailSettings);

        const emailHTML = `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr><td style="background-color:#18181b;padding:16px 28px;text-align:center;">
                      <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;">✂️ BarberPLUS</span>
                    </td></tr>
                    <tr><td style="background:linear-gradient(135deg,#B45309 0%,#D97706 100%);padding:28px 28px 20px 28px;text-align:center;">
                      ${barbershop.logo_url
                        ? `<img src="${barbershop.logo_url}" alt="${barbershop.name}" style="height:56px;width:auto;border-radius:8px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">`
                        : `<div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;">✂️</div>`
                      }
                      <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Mensagem de</p>
                      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${barbershop.name}</h1>
                    </td></tr>
                    <tr><td style="padding:24px 28px 0 28px;text-align:center;">
                      <div style="display:inline-block;background:#FEF3C7;color:#B45309;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #FDE68A;">
                        ⏰ Vence em ${daysUntilExpiry} dia${daysUntilExpiry === 1 ? "" : "s"}
                      </div>
                    </td></tr>
                    <tr><td style="padding:24px 28px;">
                      <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>!</p>
                      <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
                        Seu plano na <strong>${barbershop.name}</strong> está prestes a vencer. Renove agora para continuar aproveitando todos os benefícios sem interrupção.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
                        <tr><td style="padding:20px 24px;">
                          <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Detalhes do Plano</p>
                          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📋 Plano:</strong> ${planName}</p>
                          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📍 Barbearia:</strong> ${barbershop.name}</p>
                          <p style="margin:0;font-size:15px;color:#B91C1C;"><strong>📅 Vencimento:</strong> ${expiryFormatted}</p>
                        </td></tr>
                      </table>
                      <p style="margin:0 0 24px 0;font-size:14px;color:#666;line-height:1.6;">
                        Para renovar, entre em contato com <strong>${barbershop.name}</strong> diretamente
                        ${barbershop.phone ? ` pelo telefone <strong>${barbershop.phone}</strong>` : ""}.
                      </p>
                      ${contactBlock}
                    </td></tr>
                    <tr><td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 28px;text-align:center;">
                      <p style="margin:0 0 4px 0;font-size:13px;color:#666;">Este email foi enviado pela <strong>${barbershop.name}</strong></p>
                      <p style="margin:0;font-size:11px;color:#999;">gerenciado via ✂️ BarberPLUS · Este é um email automático, não responda.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
          </html>
        `;

        await sendEmail(
          resendApiKey,
          PLATFORM_SENDER,
          [clientEmail],
          `⏰ Seu plano vence em ${daysUntilExpiry} dia${daysUntilExpiry === 1 ? "" : "s"} — ${barbershop.name}`,
          emailHTML,
        );

        console.log(`Reminder sent to ${clientEmail} for barbershop ${barbershop.name}`);
        totalSent++;
      } catch (subErr) {
        console.error(`Error processing subscription ${sub.id}:`, subErr);
        totalSkipped++;
      }
    }

    console.log(`Subscription reminders: ${totalSent} sent, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, skipped: totalSkipped, total_checked: subscriptions.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-subscription-reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
