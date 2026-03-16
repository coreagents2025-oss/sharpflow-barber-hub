import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useAllClientSubscriptions = () => {
  return useQuery({
    queryKey: ['super-admin', 'all-subscriptions'],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from('client_subscriptions')
        .select('id, status, credits_remaining, expires_at, billing_interval, barbershop_id, lead_id, client_id, plan_id, started_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const barbershopIds = [...new Set((subs ?? []).map(s => s.barbershop_id))];
      const planIds = [...new Set((subs ?? []).map(s => s.plan_id))];
      const leadIds = (subs ?? []).map(s => s.lead_id).filter(Boolean) as string[];
      const clientIds = (subs ?? []).map(s => s.client_id).filter(Boolean) as string[];

      const [barbershopsRes, plansRes, leadsRes, profilesRes] = await Promise.all([
        supabase.from('barbershops').select('id, name').in('id', barbershopIds),
        supabase.from('subscription_plans').select('id, name, price').in('id', planIds),
        leadIds.length > 0
          ? supabase.from('leads').select('id, full_name, phone').in('id', leadIds)
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from('profiles').select('id, full_name, phone').in('id', clientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const barbershops = barbershopsRes.data ?? [];
      const plans = plansRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      return (subs ?? []).map(s => {
        const barbershop = barbershops.find(b => b.id === s.barbershop_id);
        const plan = plans.find(p => p.id === s.plan_id);
        const lead = leads.find(l => l.id === s.lead_id);
        const profile = profiles.find(p => p.id === s.client_id);
        const clientName = lead?.full_name ?? profile?.full_name ?? 'Desconhecido';
        const clientPhone = lead?.phone ?? profile?.phone ?? '-';
        return {
          ...s,
          barbershopName: barbershop?.name ?? '-',
          planName: plan?.name ?? '-',
          planPrice: plan?.price ?? 0,
          clientName,
          clientPhone,
        };
      });
    },
  });
};

export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['super-admin', 'platform-stats'],
    queryFn: async () => {
      const [barbershops, userRoles, appointments, payments] = await Promise.all([
        supabase.from('barbershops').select('id, name, created_at', { count: 'exact' }),
        supabase.from('user_roles').select('id, role', { count: 'exact' }),
        supabase.from('appointments').select('id, status, scheduled_at, barbershop_id', { count: 'exact' }),
        supabase.from('payments').select('id, amount, status, created_at', { count: 'exact' }),
      ]);

      const totalBarbershops = barbershops.count ?? 0;
      const totalUsers = userRoles.count ?? 0;
      const totalAppointments = appointments.count ?? 0;

      const roles = userRoles.data ?? [];
      const adminCount = roles.filter(r => r.role === 'admin').length;
      const barberCount = roles.filter(r => r.role === 'barber').length;
      const clientCount = roles.filter(r => r.role === 'client').length;

      const completedPayments = (payments.data ?? []).filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = (appointments.data ?? []).filter(
        a => a.scheduled_at?.startsWith(today)
      ).length;

      // Support tickets count
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open');

      return {
        totalBarbershops,
        totalUsers,
        totalAppointments,
        totalRevenue,
        todayAppointments,
        adminCount,
        barberCount,
        clientCount,
        openTickets: openTickets ?? 0,
      };
    },
  });
};

export const useBarbershopsList = () => {
  return useQuery({
    queryKey: ['super-admin', 'barbershops-list'],
    queryFn: async () => {
      const { data: barbershops, error } = await supabase
        .from('barbershops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const barbershopIds = (barbershops ?? []).map(b => b.id);
      
      const [staffRes, servicesRes, appointmentsRes] = await Promise.all([
        supabase.from('barbershop_staff').select('barbershop_id').in('barbershop_id', barbershopIds),
        supabase.from('services').select('barbershop_id').in('barbershop_id', barbershopIds),
        supabase.from('appointments').select('barbershop_id').in('barbershop_id', barbershopIds),
      ]);

      return (barbershops ?? []).map(b => ({
        ...b,
        staffCount: (staffRes.data ?? []).filter(s => s.barbershop_id === b.id).length,
        servicesCount: (servicesRes.data ?? []).filter(s => s.barbershop_id === b.id).length,
        appointmentsCount: (appointmentsRes.data ?? []).filter(a => a.barbershop_id === b.id).length,
      }));
    },
  });
};

export const useUsersList = () => {
  return useQuery({
    queryKey: ['super-admin', 'users-list'],
    queryFn: async () => {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from('user_roles').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      const roles = rolesRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      return roles.map(r => {
        const profile = profiles.find(p => p.id === r.user_id);
        return {
          userId: r.user_id,
          role: r.role,
          roleId: r.id,
          fullName: profile?.full_name ?? 'Sem nome',
          phone: profile?.phone,
          avatarUrl: profile?.avatar_url,
          createdAt: r.created_at,
        };
      });
    },
  });
};

// Suspend/Unsuspend barbershop
export const useSuspendBarbershop = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspend, reason }: { id: string; suspend: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('barbershops')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_reason: suspend ? (reason ?? null) : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      toast({ title: suspend ? 'Barbearia suspensa' : 'Barbearia reativada' });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar barbearia', variant: 'destructive' });
    },
  });
};

// Change user role
export const useChangeUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Role atualizado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar role', variant: 'destructive' });
    },
  });
};

// Support tickets
export const useSupportTickets = () => {
  return useQuery({
    queryKey: ['super-admin', 'support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with barbershop name
      const barbershopIds = [...new Set((data ?? []).map(t => t.barbershop_id))];
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('id, name')
        .in('id', barbershopIds);

      return (data ?? []).map(t => ({
        ...t,
        barbershopName: barbershops?.find(b => b.id === t.barbershop_id)?.name ?? 'Desconhecida',
      }));
    },
  });
};

export const useTicketMessages = (ticketId: string | null) => {
  return useQuery({
    queryKey: ['super-admin', 'ticket-messages', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useSendTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, content, senderId }: { ticketId: string; content: string; senderId: string }) => {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({ ticket_id: ticketId, content, sender_id: senderId, is_admin_reply: true });
      if (error) throw error;
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'ticket-messages', ticketId] });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status,
          ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
        })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status do ticket atualizado' });
      queryClient.invalidateQueries({ queryKey: ['super-admin'] });
    },
  });
};

// Audit logs
export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['super-admin', 'audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};

// Advanced metrics
export const useAdvancedMetrics = () => {
  return useQuery({
    queryKey: ['super-admin', 'advanced-metrics'],
    queryFn: async () => {
      const [barbershopsRes, appointmentsRes, paymentsRes, servicesRes] = await Promise.all([
        supabase.from('barbershops').select('id, name, created_at, is_suspended'),
        supabase.from('appointments').select('id, barbershop_id, status, scheduled_at, created_at'),
        supabase.from('payments').select('id, barbershop_id, amount, status, created_at'),
        supabase.from('services').select('id, barbershop_id'),
      ]);

      const barbershops = barbershopsRes.data ?? [];
      const appointments = appointmentsRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const services = servicesRes.data ?? [];

      // Ranking by revenue
      const revenueByBarbershop: Record<string, number> = {};
      payments.filter(p => p.status === 'completed').forEach(p => {
        revenueByBarbershop[p.barbershop_id] = (revenueByBarbershop[p.barbershop_id] || 0) + Number(p.amount);
      });

      const ranking = barbershops
        .map(b => ({
          id: b.id,
          name: b.name,
          revenue: revenueByBarbershop[b.id] || 0,
          appointments: appointments.filter(a => a.barbershop_id === b.id).length,
          services: services.filter(s => s.barbershop_id === b.id).length,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Retention / Churn (active = has appointment in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      const activeBarbershopIds = new Set(
        appointments
          .filter(a => a.scheduled_at > thirtyDaysAgoStr)
          .map(a => a.barbershop_id)
      );

      const activeCount = barbershops.filter(b => activeBarbershopIds.has(b.id) && !b.is_suspended).length;
      const inactiveCount = barbershops.filter(b => !activeBarbershopIds.has(b.id) && !b.is_suspended).length;
      const suspendedCount = barbershops.filter(b => b.is_suspended).length;

      // Funnel
      const totalSignups = barbershops.length;
      const withServices = new Set(services.map(s => s.barbershop_id)).size;
      const withAppointments = new Set(appointments.map(a => a.barbershop_id)).size;
      const withPayments = new Set(payments.filter(p => p.status === 'completed').map(p => p.barbershop_id)).size;

      const funnel = [
        { stage: 'Cadastro', count: totalSignups },
        { stage: 'Serviço Criado', count: withServices },
        { stage: '1º Agendamento', count: withAppointments },
        { stage: '1º Pagamento', count: withPayments },
      ];

      // Revenue by month
      const revenueByMonth: Record<string, number> = {};
      payments.filter(p => p.status === 'completed').forEach(p => {
        const month = p.created_at.substring(0, 7);
        revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(p.amount);
      });
      const revenueTimeline = Object.entries(revenueByMonth)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, amount]) => ({ month, amount }));

      return {
        ranking,
        retention: { activeCount, inactiveCount, suspendedCount },
        funnel,
        revenueTimeline,
      };
    },
  });
};
