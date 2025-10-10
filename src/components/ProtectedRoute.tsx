import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ children, requiredRoles = ['admin', 'barber'] }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Você precisa fazer login para acessar esta página');
        navigate('/auth', { replace: true });
        return;
      }

      if (requiredRoles.length > 0 && userRole && !requiredRoles.includes(userRole)) {
        toast.error('Você não tem permissão para acessar esta página');
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, userRole, loading, navigate, requiredRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || (requiredRoles.length > 0 && userRole && !requiredRoles.includes(userRole))) {
    return null;
  }

  return <>{children}</>;
};
