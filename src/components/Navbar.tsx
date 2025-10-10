import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Monitor, Scissors, Users, LogOut, Settings, Layout, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  
  const isAdmin = userRole === 'admin' || userRole === 'barber';

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-accent" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BarberPro
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/">
              <Button 
                variant={isActive("/") ? "default" : "ghost"} 
                size="sm"
                className="transition-all"
              >
                Início
              </Button>
            </Link>
            <Link to="/services">
              <Button 
                variant={isActive("/services") ? "default" : "ghost"} 
                size="sm"
                className="transition-all"
              >
                <Scissors className="h-4 w-4 mr-2" />
                Serviços
              </Button>
            </Link>
            <Link to="/booking">
              <Button 
                variant={isActive("/booking") ? "default" : "ghost"} 
                size="sm"
                className="transition-all"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Link to="/pdv">
                  <Button 
                    variant={isActive("/pdv") ? "default" : "ghost"} 
                    size="sm"
                    className="transition-all"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    PDV
                  </Button>
                </Link>
                <Link to="/services-management">
                  <Button 
                    variant={isActive("/services-management") ? "default" : "ghost"} 
                    size="sm"
                    className="transition-all"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Serviços
                  </Button>
                </Link>
                <Link to="/catalog">
                  <Button 
                    variant={isActive("/catalog") ? "default" : "ghost"} 
                    size="sm"
                    className="transition-all"
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    Catálogo
                  </Button>
                </Link>
                <Link to="/schedule-management">
                  <Button 
                    variant={isActive("/schedule-management") ? "default" : "ghost"} 
                    size="sm"
                    className="transition-all"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Agenda
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Conta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
            )}
            
            <Link to="/booking">
              <Button 
                className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 transition-all"
              >
                Agendar Horário
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
