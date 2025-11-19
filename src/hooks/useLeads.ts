import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LeadStatus = 'new' | 'contacted' | 'active' | 'converted' | 'lost';
export type LeadSource = 'public_booking' | 'whatsapp' | 'referral' | 'manual';

export interface Lead {
  id: string;
  barbershop_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  last_interaction_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Dados agregados
  appointments: Array<{
    id: string;
    scheduled_at: string;
    status: string;
    services: {
      name: string;
      price: number;
    } | null;
  }>;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_spent: number;
  average_ticket: number;
  days_since_last_visit: number | null;
  lifetime_value: number;
  has_whatsapp_conversation: boolean;
  unread_messages: number;
  notes_count: number;
  tags: string[];
  avatar_url?: string;
  last_appointment_date?: string;
  whatsapp_conversations?: Array<{
    id: string;
    last_message: string;
    last_message_at: string;
  }>;
}

export interface LeadMetrics {
  total: number;
  new30d: number;
  active: number;
  conversionRate: number;
  totalValue: number;
}

export const useLeads = (barbershopId: string | null) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barbershopId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      try {
        setLoading(true);

        // Buscar leads da barbearia
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .order('last_interaction_at', { ascending: false });

        if (leadsError) throw leadsError;

        if (!leadsData || leadsData.length === 0) {
          setLeads([]);
          setLoading(false);
          return;
        }

        // Buscar appointments dos leads
        const leadIds = leadsData.map(l => l.id);
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            lead_id,
            scheduled_at,
            status,
            services (
              name,
              price
            )
          `)
          .in('lead_id', leadIds)
          .not('lead_id', 'is', null);

        if (appointmentsError) {
          console.error('Error fetching appointments:', appointmentsError);
        }

        // Buscar conversas do WhatsApp
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('whatsapp_conversations')
          .select('id, client_id, last_message, last_message_at, unread_count')
          .eq('barbershop_id', barbershopId);

        if (conversationsError) {
          console.error('Error fetching conversations:', conversationsError);
        }

        // Buscar notas
        const { data: notesData, error: notesError } = await supabase
          .from('client_notes')
          .select('id, client_id')
          .eq('barbershop_id', barbershopId);

        if (notesError) {
          console.error('Error fetching notes:', notesError);
        }

        // Buscar pagamentos dos leads usando lead_id
        const leadIds2 = leadsData.map(l => l.id);
        const { data: leadPaymentsData, error: leadPaymentsError } = await supabase
          .from('payments')
          .select('lead_id, amount, created_at')
          .in('lead_id', leadIds2)
          .not('lead_id', 'is', null)
          .eq('status', 'completed');

        if (leadPaymentsError) {
          console.error('Error fetching lead payments:', leadPaymentsError);
        }

        // Processar dados dos leads
        const processedLeads: Lead[] = leadsData.map(lead => {
          // Appointments do lead
          const leadAppointments = appointmentsData?.filter(a => a.lead_id === lead.id) || [];
          
          // Appointments completados e cancelados
          const completedAppointments = leadAppointments.filter(a => a.status === 'completed');
          const cancelledAppointments = leadAppointments.filter(a => a.status === 'cancelled');

          // Pagamentos do lead
          const leadPayments = leadPaymentsData?.filter(p => p.lead_id === lead.id) || [];
          const totalSpent = leadPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

          // Calcular ticket médio
          const averageTicket = completedAppointments.length > 0 
            ? totalSpent / completedAppointments.length 
            : 0;

          // Dias desde última visita
          const lastCompletedAppointment = completedAppointments
            .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
          
          const daysSinceLastVisit = lastCompletedAppointment
            ? Math.floor((Date.now() - new Date(lastCompletedAppointment.scheduled_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          // Conversas do WhatsApp
          const whatsappConversations = conversationsData?.filter(c => c.client_id === lead.id) || [];
          const unreadMessages = whatsappConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

          // Notas
          const leadNotes = notesData?.filter(n => n.client_id === lead.id) || [];

          return {
            id: lead.id,
            barbershop_id: lead.barbershop_id,
            full_name: lead.full_name,
            phone: lead.phone,
            email: lead.email,
            source: lead.source as LeadSource,
            status: lead.status as LeadStatus,
            last_interaction_at: lead.last_interaction_at,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
            archived_at: lead.archived_at || null,
            appointments: leadAppointments,
            total_appointments: leadAppointments.length,
            completed_appointments: completedAppointments.length,
            cancelled_appointments: cancelledAppointments.length,
            total_spent: totalSpent,
            average_ticket: averageTicket,
            days_since_last_visit: daysSinceLastVisit,
            lifetime_value: totalSpent,
            has_whatsapp_conversation: whatsappConversations.length > 0,
            unread_messages: unreadMessages,
            notes_count: leadNotes.length,
            tags: [],
            last_appointment_date: lastCompletedAppointment?.scheduled_at,
            whatsapp_conversations: whatsappConversations,
          };
        });

        setLeads(processedLeads);
      } catch (error) {
        console.error('Error fetching leads:', error);
        toast.error('Erro ao carregar leads');
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [barbershopId]);

  // Calcular métricas
  const metrics: LeadMetrics = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const newLeads = leads.filter(l => 
      new Date(l.created_at).getTime() > thirtyDaysAgo
    ).length;

    const activeLeads = leads.filter(l => l.status === 'active').length;
    const leadsWithAppointments = leads.filter(l => l.total_appointments > 0).length;
    const conversionRate = leads.length > 0 
      ? (leadsWithAppointments / leads.length) * 100 
      : 0;

    const totalValue = leads.reduce((sum, lead) => sum + lead.total_spent, 0);

    return {
      total: leads.length,
      new30d: newLeads,
      active: activeLeads,
      conversionRate: conversionRate,
      totalValue: totalValue,
    };
  }, [leads]);

  return { leads, loading, metrics };
};
