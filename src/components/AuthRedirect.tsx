import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Never redirect away from the password reset page
    if (location.pathname === '/reset-password') return;

    if (!loading && user && userRole) {
      const currentPath = location.pathname;

      if (userRole === 'super_admin') {
        if (currentPath === '/auth' || currentPath === '/') {
          navigate('/super-admin', { replace: true });
        }
      } else if (userRole === 'admin' || userRole === 'barber') {
        if (currentPath === '/auth' || currentPath === '/') {
          navigate('/pdv', { replace: true });
        }
        // Check plan status: redirect to subscription settings if overdue or trial expired
        if (currentPath !== '/settings' && !currentPath.startsWith('/super-admin')) {
          // Only check if user has a barbershop
          supabase
            .from('barbershop_staff')
            .select('barbershop_id')
            .eq('user_id', user.id)
            .single()
            .then(({ data: staffData }) => {
              if (!staffData?.barbershop_id) return;
              supabase
                .from('barbershops')
                .select('plan_type, plan_status, trial_ends_at')
                .eq('id', staffData.barbershop_id)
                .single()
                .then(({ data: shop }) => {
                  if (!shop) return;
                  const isTrialExpired = shop.plan_type === 'trial' && new Date((shop as any).trial_ends_at) < new Date();
                  const isOverdue = (shop as any).plan_status === 'overdue';
                  const isCancelled = (shop as any).plan_status === 'cancelled';
                  if ((isTrialExpired || isOverdue || isCancelled) && currentPath !== '/settings') {
                    navigate('/settings?tab=subscription', { replace: true });
                  }
                });
            });
        }
      } else if (userRole === 'client') {
        // Redirect clients back to their barbershop dashboard
        if (currentPath === '/auth' || currentPath === '/') {
          supabase
            .from('client_barbershop_links')
            .select('barbershop_id, barbershops:barbershop_id(slug)')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()
            .then(({ data }) => {
              const slug = (data?.barbershops as any)?.slug;
              if (slug) {
                navigate(`/${slug}/cliente/dashboard`, { replace: true });
              } else {
                // No link found, stay on landing
              }
            });
        }
      } else {
        if (currentPath === '/auth') {
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
};
