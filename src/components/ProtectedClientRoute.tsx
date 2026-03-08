import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedClientRouteProps {
  children: React.ReactNode;
}

export const ProtectedClientRoute = ({ children }: ProtectedClientRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate(`/${slug}/cliente`, { replace: true });
      } else if (userRole && userRole !== 'client') {
        // Admin/barber accidentally on client route → send to their dashboard
        navigate('/pdv', { replace: true });
      }
    }
  }, [user, userRole, loading, navigate, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || (userRole && userRole !== 'client')) return null;

  return <>{children}</>;
};
