import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard, Scissors, Users } from "lucide-react";

export const Navbar = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
            <Link to="/dashboard">
              <Button 
                variant={isActive("/dashboard") ? "default" : "ghost"} 
                size="sm"
                className="transition-all"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          <Link to="/booking">
            <Button 
              className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 transition-all"
            >
              Agendar Horário
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
