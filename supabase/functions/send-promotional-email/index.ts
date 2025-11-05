import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromotionalEmailRequest {
  barbershop_id: string;
  subject: string;
  message: string;
  recipient_emails?: string[]; // Se vazio, envia para todos os clientes
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
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { Resend } = await import("https://esm.sh/resend@2.0.0");
    const resend = new Resend(resendApiKey);

    const {
      barbershop_id,
      subject,
      message,
      recipient_emails,
    }: PromotionalEmailRequest = await req.json();

    console.log("Processing promotional email:", {
      barbershop_id,
      subject,
      has_specific_recipients: !!recipient_emails?.length,
    });

    // Buscar configurações de email da barbearia
    const { data: credentials, error: credentialsError } = await supabase
      .from("barbershop_credentials")
      .select("email_credentials")
      .eq("barbershop_id", barbershop_id)
      .single();

    if (credentialsError || !credentials) {
      console.error("Error fetching credentials:", credentialsError);
      return new Response(
        JSON.stringify({ error: "Email credentials not found" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailSettings = credentials.email_credentials || {};

    if (!emailSettings.notifications_enabled) {
      console.log("Notifications disabled for this barbershop");
      return new Response(
        JSON.stringify({ message: "Notifications disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Buscar informações da barbearia
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
      // Buscar emails de todos os clientes que já agendaram nesta barbearia
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("client_id")
        .eq("barbershop_id", barbershop_id);

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        throw appointmentsError;
      }

      const uniqueClientIds = [...new Set(appointments?.map((a) => a.client_id) || [])];

      // Buscar emails dos clientes
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
        .in("id", uniqueClientIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Buscar emails do auth.users via admin
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      const profileIds = profiles?.map(p => p.id) || [];
      recipients = users
        .filter(u => profileIds.includes(u.id) && u.email)
        .map(u => u.email!);
    }

    if (recipients.length === 0) {
      console.log("No recipients found");
      return new Response(
        JSON.stringify({ message: "No recipients found", sent_count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Preparar HTML do email
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
            .message { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${subject}</h1>
            </div>
            <div class="content">
              <div class="message">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <p><strong>${barbershop.name}</strong></p>
            </div>
            <div class="footer">
              <p>Este é um email promocional de ${barbershop.name}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar emails (Resend suporta até 100 destinatários por vez)
    const batchSize = 100;
    let totalSent = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const { data, error } = await resend.emails.send({
          from: `${emailSettings.from_name || barbershop.name} <${emailSettings.from_email}>`,
          to: batch,
          subject: subject,
          html: emailHTML,
        });

        if (error) {
          console.error("Resend error for batch:", error);
        } else {
          console.log("Batch sent successfully:", data);
          totalSent += batch.length;
        }
      } catch (err) {
        console.error("Error sending batch:", err);
      }
    }

    // Registrar campanha no banco
    const { error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        barbershop_id,
        subject,
        message,
        sent_count: totalSent,
        created_by: emailSettings.created_by || null,
      });

    if (campaignError) {
      console.error("Error saving campaign:", campaignError);
    }

    console.log(`Promotional email sent to ${totalSent} recipients`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Promotional emails sent",
        sent_count: totalSent,
        total_recipients: recipients.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
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
