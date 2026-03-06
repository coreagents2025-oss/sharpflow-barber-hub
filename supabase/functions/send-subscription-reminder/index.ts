import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString();
    const threeDaysStr = threeDaysFromNow.toISOString();

    console.log(`Checking subscriptions expiring between ${todayStr} and ${threeDaysStr}`);

    // Fetch active subscriptions expiring or billing in the next 3 days
    const { data: subscriptions, error: subError } = await supabase
      .from("client_subscriptions")
      .select(`
        id,
        barbershop_id,
        lead_id,
        client_id,
        expires_at,
        next_billing_date,
        billing_interval,
        plan_id,
        subscription_plans (
          name,
          price,
          billing_interval
        )
      `)
      .eq("status", "active")
      .or(
        `expires_at.gte.${todayStr},expires_at.lte.${threeDaysStr},next_billing_date.gte.${todayStr},next_billing_date.lte.${threeDaysStr}`
      );

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

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
        // Determine expiry date to show
        const expiryDate = sub.expires_at || sub.next_billing_date;
        if (!expiryDate) {
          totalSkipped++;
          continue;
        }

        // Check it's actually within the 3-day window
        const expiry = new Date(expiryDate);
        if (expiry < now || expiry > threeDaysFromNow) {
          totalSkipped++;
          continue;
        }

        // Fetch barbershop info
        const { data: barbershop } = await supabase
          .from("public_barbershops")
          .select("id, name, logo_url, phone")
          .eq("id", sub.barbershop_id)
          .single();

        if (!barbershop) {
          console.warn(`Barbershop not found for subscription ${sub.id}`);
          totalSkipped++;
          continue;
        }

        // Fetch email credentials for this barbershop
        const { data: credentials } = await supabase
          .from("barbershop_credentials")
          .select("email_credentials")
          .eq("barbershop_id", sub.barbershop_id)
          .single();

        const emailSettings = (credentials?.email_credentials || {}) as Record<string, string | boolean>;

        if (!emailSettings.notifications_enabled) {
          console.log(`Notifications disabled for barbershop ${barbershop.name}`);
          totalSkipped++;
          continue;
        }

        if (!emailSettings.from_email) {
          console.log(`No from_email configured for barbershop ${barbershop.name}`);
          totalSkipped++;
          continue;
        }

        // Resolve client email
        let clientEmail: string | null = null;
        let clientName = "Cliente";

        if (sub.lead_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("email, full_name")
            .eq("id", sub.lead_id)
            .single();
          if (lead?.email) {
            clientEmail = lead.email;
            clientName = lead.full_name || "Cliente";
          }
        }

        if (!clientEmail && sub.client_id) {
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(sub.client_id);
          if (!userError && user?.email) {
            clientEmail = user.email;
            clientName = user.user_metadata?.full_name || user.email;
          }
        }

        if (!clientEmail) {
          console.log(`No email found for subscription ${sub.id}`);
          totalSkipped++;
          continue;
        }

        // Format expiry date
        const expiryFormatted = expiry.toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const planName = (sub.subscription_plans as { name?: string } | null)?.name || "seu plano";

        const brandColor = "#B45309";
        const brandColorLight = "#FEF3C7";

        const emailHTML = `
          <!DOCTYPE html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Lembrete de Vencimento de Plano</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
                <tr>
                  <td align="center">
                    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                      <!-- Platform Header -->
                      <tr>
                        <td style="background-color:#18181b;padding:16px 28px;text-align:center;">
                          <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;">✂️ BarberPLUS</span>
                        </td>
                      </tr>

                      <!-- Barbershop Banner -->
                      <tr>
                        <td style="background:linear-gradient(135deg,${brandColor} 0%,#D97706 100%);padding:28px 28px 20px 28px;text-align:center;">
                          ${barbershop.logo_url
                            ? `<img src="${barbershop.logo_url}" alt="${barbershop.name}" style="height:56px;width:auto;border-radius:8px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">`
                            : `<div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;">✂️</div>`
                          }
                          <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Mensagem de</p>
                          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${barbershop.name}</h1>
                        </td>
                      </tr>

                      <!-- Alert Badge -->
                      <tr>
                        <td style="padding:24px 28px 0 28px;text-align:center;">
                          <div style="display:inline-block;background:${brandColorLight};color:${brandColor};font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #FDE68A;">
                            ⏰ Vence em ${daysUntilExpiry} dia${daysUntilExpiry === 1 ? "" : "s"}
                          </div>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:24px 28px;">
                          <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>!</p>
                          <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
                            Seu plano na <strong>${barbershop.name}</strong> está prestes a vencer. Renove agora para continuar aproveitando todos os benefícios sem interrupção.
                          </p>

                          <!-- Plan Details Card -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="background:${brandColorLight};border-radius:10px;border-left:4px solid ${brandColor};margin-bottom:24px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:${brandColor};text-transform:uppercase;letter-spacing:0.05em;">Detalhes do Plano</p>
                                <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📋 Plano:</strong> ${planName}</p>
                                <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📍 Barbearia:</strong> ${barbershop.name}</p>
                                <p style="margin:0;font-size:15px;color:#B91C1C;"><strong>📅 Vencimento:</strong> ${expiryFormatted}</p>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0 0 24px 0;font-size:14px;color:#666;line-height:1.6;">
                            Para renovar, entre em contato com <strong>${barbershop.name}</strong> diretamente
                            ${barbershop.phone ? ` pelo telefone <strong>${barbershop.phone}</strong>` : ""}.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 28px;text-align:center;">
                          <p style="margin:0 0 4px 0;font-size:13px;color:#666;">
                            Este email foi enviado pela <strong>${barbershop.name}</strong>
                          </p>
                          <p style="margin:0;font-size:11px;color:#999;">
                            gerenciado via ✂️ BarberPLUS · Este é um email automático, não responda.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `;

        const { error: sendError } = await resend.emails.send({
          from: `${emailSettings.from_name || barbershop.name} <${emailSettings.from_email}>`,
          to: [clientEmail],
          subject: `⏰ Seu plano vence em ${daysUntilExpiry} dia${daysUntilExpiry === 1 ? "" : "s"} — ${barbershop.name}`,
          html: emailHTML,
        });

        if (sendError) {
          console.error(`Error sending to ${clientEmail}:`, sendError);
          totalSkipped++;
        } else {
          console.log(`Reminder sent to ${clientEmail} for barbershop ${barbershop.name}`);
          totalSent++;
        }
      } catch (subErr) {
        console.error(`Error processing subscription ${sub.id}:`, subErr);
        totalSkipped++;
      }
    }

    console.log(`Subscription reminders: ${totalSent} sent, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
        total_checked: subscriptions.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
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
