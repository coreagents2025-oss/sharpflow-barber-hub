import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
