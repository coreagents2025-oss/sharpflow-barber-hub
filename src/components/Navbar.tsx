import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Monitor, Scissors, Users, LogOut, Settings, Layout, ClipboardList, MessageCircle, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
export const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    user,
    userRole,
    signOut
  } = useAuth();
  const isActive = (path: string) => location.pathname === path;
  const isAdmin = userRole === 'admin' || userRole === 'barber';

  // Detectar contexto: landing pages vs painel admin
  const landingRoutes = ['/', '/services', '/booking', '/auth'];
  const isLandingPage = landingRoutes.includes(location.pathname);
  const isInAdminPanel = isAdmin && !isLandingPage;
  return <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={isAdmin ? "/pdv" : "/"} className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-accent" />
            <span className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-extrabold">BarberPLUS</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {isInAdminPanel ?
          // NAVBAR DE PAINEL ADMIN
          <>
                <Link to="/pdv">
                  <Button variant={isActive("/pdv") ? "default" : "ghost"} size="sm" className="transition-all">
                    <Monitor className="h-4 w-4 mr-2" />
                    PDV
                  </Button>
                </Link>
                <Link to="/services-management">
                  <Button variant={isActive("/services-management") ? "default" : "ghost"} size="sm" className="transition-all">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Serviços
                  </Button>
                </Link>
                <Link to="/barbers-management">
                  <Button variant={isActive("/barbers-management") ? "default" : "ghost"} size="sm" className="transition-all">
                    <Users className="h-4 w-4 mr-2" />
                    Barbeiros
                  </Button>
                </Link>
                <Link to="/catalog">
                  <Button variant={isActive("/catalog") ? "default" : "ghost"} size="sm" className="transition-all">
                    <Layout className="h-4 w-4 mr-2" />
                    Catálogo
                  </Button>
                </Link>
                <Link to="/schedule-management">
                  <Button variant={isActive("/schedule-management") ? "default" : "ghost"} size="sm" className="transition-all">
                    <Calendar className="h-4 w-4 mr-2" />
                    Agenda
                  </Button>
                </Link>
                <Link to="/crm">
                  <Button variant={isActive("/crm") || isActive("/messages") ? "default" : "ghost"} size="sm" className="transition-all">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    CRM
                  </Button>
                </Link>
              </> :
          // NAVBAR DE LANDING (Marketing)
          <>
                <Link to="/">
                  
                </Link>
                <Link to="/services">
                  
                </Link>
                <Link to="/booking">
                  
                </Link>
              </>}
          </div>

          <div className="flex items-center gap-2">
            {/* Menu hamburguer mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <div className="flex flex-col gap-4 mt-8">
                  {isInAdminPanel ? (
                    <>
                      <Link to="/pdv" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/pdv") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <Monitor className="h-4 w-4 mr-2" />
                          PDV
                        </Button>
                      </Link>
                      <Link to="/services-management" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/services-management") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Serviços
                        </Button>
                      </Link>
                      <Link to="/barbers-management" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/barbers-management") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          Barbeiros
                        </Button>
                      </Link>
                      <Link to="/catalog" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/catalog") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <Layout className="h-4 w-4 mr-2" />
                          Catálogo
                        </Button>
                      </Link>
                      <Link to="/schedule-management" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/schedule-management") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          Agenda
                        </Button>
                      </Link>
                      <Link to="/crm" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/crm") || isActive("/messages") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          CRM
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          Home
                        </Button>
                      </Link>
                      <Link to="/services" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/services") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          Serviços
                        </Button>
                      </Link>
                      <Link to="/booking" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant={isActive("/booking") ? "default" : "ghost"} size="sm" className="w-full justify-start">
                          Agendar
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Conta</span>
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
              </DropdownMenu> : <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>}
            
            {/* CTA "Agendar" - APENAS em landing pages */}
            {!isInAdminPanel && <Button 
                className="hidden sm:flex bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 transition-all"
                onClick={() => window.open('https://wa.me/5511915761294', '_blank')}
              >
                Chamar no WhatsApp
              </Button>}
          </div>
        </div>
      </div>
    </nav>;
};