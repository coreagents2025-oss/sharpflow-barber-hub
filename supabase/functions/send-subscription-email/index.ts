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

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}

function headerBlock(barbershop: { name: string; logo_url?: string | null }): string {
  const logoHtml = barbershop.logo_url
    ? `<img src="${barbershop.logo_url}" alt="${barbershop.name}" style="height:60px;width:auto;max-width:160px;border-radius:8px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;object-fit:contain;">`
    : `<div style="width:60px;height:60px;background:rgba(255,255,255,0.25);border-radius:14px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.05em;line-height:60px;text-align:center;">${getInitials(barbershop.name)}</div>`;
  return `
    <tr><td style="background-color:#18181b;padding:14px 28px;text-align:center;">
      <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;">✂️ BarberPLUS</span>
    </td></tr>
    <tr><td style="background:linear-gradient(135deg,#B45309 0%,#D97706 100%);padding:28px 28px 20px 28px;text-align:center;">
      ${logoHtml}
      <p style="margin:0 0 4px 0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Mensagem de</p>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${barbershop.name}</h1>
    </td></tr>
  `;
}

function portalButtonBlock(slug: string): string {
  const portalUrl = `https://sharpflow-barber-hub.lovable.app/${slug}/cliente`;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;margin-bottom:8px;">
      <tr><td style="text-align:center;">
        <a href="${portalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#B45309 0%,#D97706 100%);color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">Acessar Minha Área →</a>
      </td></tr>
    </table>
    <p style="margin:8px 0 0 0;font-size:13px;color:#888;text-align:center;">Acompanhe seus créditos, benefícios e histórico de visitas.</p>
  `;
}

function footerBlock(barbershopName: string): string {
  return `
    <tr><td style="background:#f9f9f9;border-top:1px solid #e5e5e5;padding:20px 28px;text-align:center;">
      <p style="margin:0 0 4px 0;font-size:13px;color:#666;">Este email foi enviado pela <strong>${barbershopName}</strong></p>
      <p style="margin:0;font-size:11px;color:#999;">gerenciado via ✂️ BarberPLUS · Este é um email automático, não responda.</p>
    </td></tr>
  `;
}

function wrapEmail(rows: string): string {
  return `<!DOCTYPE html>
  <html lang="pt-BR">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            ${rows}
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

function buildWelcomeEmail(
  clientName: string, planName: string, planPrice: number, planCredits: number,
  expiresAt: string | null, barbershop: { name: string; logo_url?: string | null; slug?: string | null }, contactBlock: string,
): string {
  const expiresFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  return wrapEmail(`
    ${headerBlock(barbershop)}
    <tr><td style="padding:24px 28px 0 28px;text-align:center;">
      <div style="display:inline-block;background:#D1FAE5;color:#065F46;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #6EE7B7;">
        🎉 Bem-vindo ao plano ${planName}!
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>!</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
        Sua assinatura na <strong>${barbershop.name}</strong> foi criada com sucesso. Aqui estão os detalhes do seu plano:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Seu Plano</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📋 Plano:</strong> ${planName}</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>💰 Valor:</strong> R$ ${planPrice.toFixed(2)}</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>🎫 Créditos:</strong> ${planCredits} por ciclo</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;"><strong>📅 Válido até:</strong> ${expiresFormatted}</p>
        </td></tr>
      </table>
      ${barbershop.slug ? portalButtonBlock(barbershop.slug) : ""}
      <p style="margin:16px 0 0 0;font-size:14px;color:#666;line-height:1.6;">
        Em caso de dúvidas, entre em contato diretamente com <strong>${barbershop.name}</strong>.
      </p>
      ${contactBlock}
    </td></tr>
    ${footerBlock(barbershop.name)}
  `);
}

function buildRenewalEmail(
  clientName: string, planName: string, planCredits: number, newExpiresAt: string | null,
  barbershop: { name: string; logo_url?: string | null; slug?: string | null }, contactBlock: string,
): string {
  const expiresFormatted = newExpiresAt
    ? new Date(newExpiresAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  return wrapEmail(`
    ${headerBlock(barbershop)}
    <tr><td style="padding:24px 28px 0 28px;text-align:center;">
      <div style="display:inline-block;background:#EDE9FE;color:#5B21B6;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #C4B5FD;">
        🔄 Assinatura renovada!
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>!</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
        Sua assinatura na <strong>${barbershop.name}</strong> foi renovada com sucesso. Continue aproveitando todos os benefícios!
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Renovação</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📋 Plano:</strong> ${planName}</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>🎫 Créditos renovados:</strong> ${planCredits}</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;"><strong>📅 Novo vencimento:</strong> ${expiresFormatted}</p>
        </td></tr>
      </table>
      ${barbershop.slug ? portalButtonBlock(barbershop.slug) : ""}
      ${contactBlock}
    </td></tr>
    ${footerBlock(barbershop.name)}
  `);
}

function buildCancellationEmail(
  clientName: string, planName: string,
  barbershop: { name: string; logo_url?: string | null; slug?: string | null }, contactBlock: string,
): string {
  return wrapEmail(`
    ${headerBlock(barbershop)}
    <tr><td style="padding:24px 28px 0 28px;text-align:center;">
      <div style="display:inline-block;background:#FEE2E2;color:#991B1B;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #FCA5A5;">
        ❌ Assinatura cancelada
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>,</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
        Confirmamos o cancelamento da sua assinatura do plano <strong>${planName}</strong> na <strong>${barbershop.name}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Plano cancelado</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>📋 Plano:</strong> ${planName}</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;"><strong>🏪 Barbearia:</strong> ${barbershop.name}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 16px 0;font-size:15px;color:#444;line-height:1.6;">
        Sentiremos sua falta! Sempre que quiser retornar, entre em contato com a gente. 😊
      </p>
      ${contactBlock}
    </td></tr>
    ${footerBlock(barbershop.name)}
  `);
}

function buildPaymentConfirmedEmail(
  clientName: string, amount: number, paymentMethod: string,
  barbershop: { name: string; logo_url?: string | null; slug?: string | null }, contactBlock: string,
): string {
  const methodMap: Record<string, string> = { pix: "PIX", card: "Cartão", boleto: "Boleto", cash: "Dinheiro" };
  const methodLabel = methodMap[paymentMethod] || paymentMethod;
  const now = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return wrapEmail(`
    ${headerBlock(barbershop)}
    <tr><td style="padding:24px 28px 0 28px;text-align:center;">
      <div style="display:inline-block;background:#D1FAE5;color:#065F46;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;border:1px solid #6EE7B7;">
        ✅ Pagamento confirmado!
      </div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="margin:0 0 16px 0;font-size:16px;">Olá, <strong>${clientName}</strong>!</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#444;line-height:1.6;">
        Recebemos a confirmação do seu pagamento na <strong>${barbershop.name}</strong>. Obrigado!
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:4px solid #B45309;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:0.05em;">Comprovante de Pagamento</p>
          <p style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#1a1a1a;">💰 R$ ${amount.toFixed(2)}</p>
          <p style="margin:0 0 8px 0;font-size:15px;color:#1a1a1a;"><strong>💳 Método:</strong> ${methodLabel}</p>
          <p style="margin:0;font-size:15px;color:#1a1a1a;"><strong>📅 Data:</strong> ${now}</p>
        </td></tr>
      </table>
      ${barbershop.slug ? portalButtonBlock(barbershop.slug) : ""}
      ${contactBlock}
    </td></tr>
    ${footerBlock(barbershop.name)}
  `);
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
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { type, subscription_id, payment_id } = body;

    if (!type || !subscription_id) {
      return new Response(JSON.stringify({ error: "type and subscription_id are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch subscription with plan
    const { data: sub, error: subError } = await supabase
      .from("client_subscriptions")
      .select(`*, subscription_plans ( name, price, credits_per_month )`)
      .eq("id", subscription_id)
      .single();

    if (subError || !sub) {
      console.error("Subscription not found:", subError);
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch barbershop
    const { data: barbershop } = await supabase
      .from("public_barbershops")
      .select("id, name, logo_url, phone, slug")
      .eq("id", sub.barbershop_id)
      .single();

    if (!barbershop) {
      return new Response(JSON.stringify({ error: "Barbershop not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check notifications enabled
    const { data: credentials } = await supabase
      .from("barbershop_credentials")
      .select("email_credentials")
      .eq("barbershop_id", sub.barbershop_id)
      .single();

    const emailSettings = (credentials?.email_credentials || {}) as Record<string, any>;
    if (emailSettings.notifications_enabled === false) {
      console.log("Notifications disabled for barbershop", sub.barbershop_id);
      return new Response(JSON.stringify({ skipped: true, reason: "notifications_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch client email and name
    let clientEmail: string | null = null;
    let clientName = "Cliente";

    if (sub.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("email, full_name")
        .eq("id", sub.lead_id)
        .single();
      if (lead?.email) { clientEmail = lead.email; clientName = lead.full_name || "Cliente"; }
    }

    if (!clientEmail && sub.client_id) {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(sub.client_id);
      if (!userError && user?.email) {
        clientEmail = user.email;
        clientName = user.user_metadata?.full_name || user.email;
      }
    }

    if (!clientEmail) {
      console.log("No email for subscription", subscription_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const contactBlock = buildContactBlock(emailSettings);
    const planData = sub.subscription_plans as { name: string; price: number; credits_per_month: number } | null;
    const planName = planData?.name || "seu plano";
    const planPrice = planData?.price || 0;
    const planCredits = planData?.credits_per_month || 0;

    let subject = "";
    let html = "";

    if (type === "welcome") {
      subject = `🎉 Bem-vindo ao ${planName}! — ${barbershop.name}`;
      html = buildWelcomeEmail(clientName, planName, planPrice, planCredits, sub.expires_at, barbershop, contactBlock);
    } else if (type === "renewal") {
      subject = `🔄 Assinatura renovada — ${barbershop.name}`;
      html = buildRenewalEmail(clientName, planName, planCredits, sub.expires_at, barbershop, contactBlock);
    } else if (type === "cancellation") {
      subject = `❌ Assinatura cancelada — ${barbershop.name}`;
      html = buildCancellationEmail(clientName, planName, barbershop, contactBlock);
    } else if (type === "payment_confirmed") {
      let amount = planPrice;
      let paymentMethod = "pix";
      if (payment_id) {
        const { data: payment } = await supabase
          .from("subscription_payments")
          .select("amount, payment_method")
          .eq("id", payment_id)
          .single();
        if (payment) { amount = payment.amount; paymentMethod = payment.payment_method; }
      }
      subject = `✅ Pagamento confirmado — ${barbershop.name}`;
      html = buildPaymentConfirmedEmail(clientName, amount, paymentMethod, barbershop, contactBlock);
    } else {
      return new Response(JSON.stringify({ error: "Invalid email type" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await sendEmail(resendApiKey, PLATFORM_SENDER, [clientEmail], subject, html);

    console.log(`Email '${type}' sent to ${clientEmail} for subscription ${subscription_id}`);
    return new Response(JSON.stringify({ success: true, type, recipient: clientEmail }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
