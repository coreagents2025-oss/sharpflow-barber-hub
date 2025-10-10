import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user, userRole } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const getRedirectPath = () => {
    if (user && (userRole === 'admin' || userRole === 'barber')) {
      return '/pdv';
    }
    return '/';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <div className="text-center space-y-6 px-4">
        <AlertCircle className="h-24 w-24 text-accent mx-auto" />
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-2xl text-muted-foreground">Página não encontrada</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        <Link to={getRedirectPath()}>
          <Button className="bg-accent hover:bg-accent/90">
            <Home className="h-4 w-4 mr-2" />
            {user && (userRole === 'admin' || userRole === 'barber') ? 'Voltar ao Painel' : 'Voltar ao Início'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
