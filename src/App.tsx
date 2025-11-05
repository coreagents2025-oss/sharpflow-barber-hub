import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Booking from "./pages/Booking";
import Auth from "./pages/Auth";
import PDV from "./pages/PDV";
import ServicesManagement from "./pages/ServicesManagement";
import Catalog from "./pages/Catalog";
import PublicCatalog from "./pages/PublicCatalog";
import ScheduleManagement from "./pages/ScheduleManagement";
import Settings from "./pages/Settings";
import BarbersManagement from "./pages/BarbersManagement";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/auth" element={<Auth />} />
            {/* Catálogo Público Mobile-First */}
            <Route path="/catalogo" element={<PublicCatalog />} />
            <Route path="/:slug" element={<PublicCatalog />} />
            {/* Painel do Dono da Barbearia - Rotas Protegidas */}
            <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
            <Route path="/services-management" element={<ProtectedRoute><ServicesManagement /></ProtectedRoute>} />
            <Route path="/barbers-management" element={<ProtectedRoute><BarbersManagement /></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
            <Route path="/schedule-management" element={<ProtectedRoute><ScheduleManagement /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRoles={[]}><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
