import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const AuthRedirect = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && userRole) {
      const currentPath = location.pathname;
      
      // Redireciona super_admin para o painel super admin
      if (userRole === 'super_admin') {
        if (currentPath === '/auth' || currentPath === '/') {
          navigate('/super-admin', { replace: true });
        }
      } else if (userRole === 'admin' || userRole === 'barber') {
        if (currentPath === '/auth') {
          navigate('/pdv', { replace: true });
        } else if (currentPath === '/') {
          navigate('/pdv', { replace: true });
        }
      } else {
        // Redireciona cliente da página de auth para a landing page
        if (currentPath === '/auth') {
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, userRole, loading, navigate, location.pathname]);

  return null;
};
