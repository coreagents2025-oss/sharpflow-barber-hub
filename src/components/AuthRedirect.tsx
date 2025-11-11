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
      
      // Redireciona admin/barber da página de auth ou landing page para o PDV
      if (userRole === 'admin' || userRole === 'barber') {
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
