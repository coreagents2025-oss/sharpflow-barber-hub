import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SuperAdminRouteProps {
  children: ReactNode;
}

export const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Faça login para acessar esta página');
        navigate('/auth', { replace: true });
        return;
      }
      if (userRole !== null && userRole !== 'super_admin') {
        toast.error('Acesso restrito a administradores da plataforma');
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading || !user || userRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'super_admin') return null;

  return <>{children}</>;
};
