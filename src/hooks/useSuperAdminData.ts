import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

      return {
        totalBarbershops,
        totalUsers,
        totalAppointments,
        totalRevenue,
        todayAppointments,
        adminCount,
        barberCount,
        clientCount,
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

      // Get counts per barbershop
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
          fullName: profile?.full_name ?? 'Sem nome',
          phone: profile?.phone,
          avatarUrl: profile?.avatar_url,
          createdAt: r.created_at,
        };
      });
    },
  });
};
