import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LeadStatus = 'novo' | 'ativo' | 'inativo' | 'vip' | 'perdido';
export type LeadSource = 'agendamento_publico' | 'whatsapp' | 'indicacao' | 'manual';

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  status: LeadStatus;
  source: LeadSource;
  created_at: string;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  total_spent: number;
  last_appointment_date?: string;
  days_since_last_visit?: number;
  lifetime_value: number;
  has_whatsapp_conversation: boolean;
  unread_messages: number;
  notes_count: number;
  tags: string[];
}

function classifyLeadStatus(lead: any): LeadStatus {
  const daysSinceLastVisit = lead.days_since_last_visit;
  const lifetimeValue = Number(lead.total_spent || 0);
  const completedAppointments = Number(lead.completed_appointments || 0);
  
  // VIP: alto valor ou muitas visitas
  if (lifetimeValue > 500 || completedAppointments >= 5) {
    return 'vip';
  }
  
  // Novo: nunca agendou
  if (lead.total_appointments === 0) {
    return 'novo';
  }
  
  // Perdido: mais de 90 dias sem visita
  if (daysSinceLastVisit > 90) {
    return 'perdido';
  }
  
  // Inativo: entre 30-90 dias
  if (daysSinceLastVisit > 30) {
    return 'inativo';
  }
  
  // Ativo: visitou nos últimos 30 dias
  return 'ativo';
}

export function useLeads(barbershopId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    new30d: 0,
    active: 0,
    conversionRate: 0,
    totalValue: 0,
  });

  useEffect(() => {
    if (!barbershopId) return;

    const loadLeads = async () => {
      setLoading(true);
      try {
        // Buscar profiles (todos os clientes)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*');
        
        if (!profiles) {
          setLeads([]);
          setLoading(false);
          return;
        }
        
        // Buscar dados relacionados de forma eficiente
        const leadsData = await Promise.all(profiles.map(async (profile) => {
          // Buscar appointments
          const { data: appointments } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', profile.id)
            .eq('barbershop_id', barbershopId);
          
          // Buscar pagamentos
          const { data: payments } = await supabase
            .from('payments')
            .select('amount')
            .eq('client_id', profile.id)
            .eq('barbershop_id', barbershopId);
          
          // Buscar anotações
          const { data: notes } = await supabase
            .from('client_notes')
            .select('id')
            .eq('client_id', profile.id)
            .eq('barbershop_id', barbershopId);
          
          // Buscar conversas WhatsApp
          const { data: conversations } = await supabase
            .from('whatsapp_conversations')
            .select('unread_count')
            .eq('client_phone', profile.phone || '')
            .eq('barbershop_id', barbershopId);
          
          const totalAppointments = appointments?.length || 0;
          const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
          const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;
          const totalSpent = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          const lastAppointment = appointments?.sort((a, b) => 
            new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
          )[0];
          
          const daysSinceLastVisit = lastAppointment 
            ? Math.floor((Date.now() - new Date(lastAppointment.scheduled_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          
          return {
            ...profile,
            total_appointments: totalAppointments,
            completed_appointments: completedAppointments,
            cancelled_appointments: cancelledAppointments,
            total_spent: totalSpent,
            last_appointment_date: lastAppointment?.scheduled_at,
            days_since_last_visit: daysSinceLastVisit,
            has_whatsapp_conversation: (conversations?.length || 0) > 0,
            unread_messages: conversations?.reduce((sum, c) => sum + c.unread_count, 0) || 0,
            notes_count: notes?.length || 0,
          };
        }));
        
        const data = leadsData;

        // Processar e classificar leads
        const processedLeads: Lead[] = (data || []).map((lead: any) => ({
          id: lead.id,
          full_name: lead.full_name || 'Cliente',
          phone: lead.phone || '',
          avatar_url: lead.avatar_url,
          status: classifyLeadStatus(lead),
          source: 'agendamento_publico' as LeadSource,
          created_at: lead.created_at,
          total_appointments: Number(lead.total_appointments || 0),
          completed_appointments: Number(lead.completed_appointments || 0),
          cancelled_appointments: Number(lead.cancelled_appointments || 0),
          total_spent: Number(lead.total_spent || 0),
          last_appointment_date: lead.last_appointment_date,
          days_since_last_visit: lead.days_since_last_visit,
          lifetime_value: Number(lead.total_spent || 0),
          has_whatsapp_conversation: Boolean(lead.has_whatsapp_conversation),
          unread_messages: Number(lead.unread_messages || 0),
          notes_count: Number(lead.notes_count || 0),
          tags: [],
        }));

        setLeads(processedLeads);

        // Calcular métricas
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const newLeads = processedLeads.filter(l => 
          new Date(l.created_at) >= thirtyDaysAgo
        ).length;
        
        const activeLeads = processedLeads.filter(l => l.status === 'ativo').length;
        const leadsWithAppointments = processedLeads.filter(l => l.total_appointments > 0).length;
        const totalValue = processedLeads.reduce((sum, l) => sum + l.total_spent, 0);
        
        setMetrics({
          total: processedLeads.length,
          new30d: newLeads,
          active: activeLeads,
          conversionRate: processedLeads.length > 0 
            ? (leadsWithAppointments / processedLeads.length) * 100 
            : 0,
          totalValue,
        });

      } catch (error) {
        console.error('Erro ao carregar leads:', error);
        toast.error('Erro ao carregar leads');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, [barbershopId]);

  return { leads, loading, metrics };
}
