import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { AuthRedirect } from "./components/AuthRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedClientRoute } from "./components/ProtectedClientRoute";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Booking from "./pages/Booking";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PDV from "./pages/PDV";
import ServicesManagement from "./pages/ServicesManagement";
import Catalog from "./pages/Catalog";
import PublicCatalog from "./pages/PublicCatalog";
import ClientAuth from "./pages/ClientAuth";
import ClientDashboard from "./pages/ClientDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ScheduleManagement from "./pages/ScheduleManagement";
import Settings from "./pages/Settings";
import BarbersManagement from "./pages/BarbersManagement";
import CRM from "./pages/CRM";
import Financial from "./pages/Financial";
import SubscriptionsManagement from "./pages/SubscriptionsManagement";
import NotFound from "./pages/NotFound";
import { InstallPWA } from "./components/InstallPWA";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import SuperAdminBarbershops from "./pages/SuperAdmin/Barbershops";
import SuperAdminUsers from "./pages/SuperAdmin/Users";
import SuperAdminMetrics from "./pages/SuperAdmin/Metrics";
import SuperAdminSupport from "./pages/SuperAdmin/Support";
import SuperAdminAuditLogs from "./pages/SuperAdmin/AuditLogs";
import SuperAdminSaasBilling from "./pages/SuperAdmin/SaasBilling";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthRedirect />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Catálogo Público Mobile-First */}
            <Route path="/catalogo" element={<PublicCatalog />} />
            {/* Client Portal Routes — must come before /:slug */}
            <Route path="/:slug/cliente" element={<ClientAuth />} />
            <Route path="/:slug/cliente/dashboard" element={<ProtectedClientRoute><ClientDashboard /></ProtectedClientRoute>} />
            <Route path="/:slug/privacidade" element={<PrivacyPolicy />} />
            <Route path="/:slug/termos" element={<TermsOfService />} />
            <Route path="/:slug" element={<PublicCatalog />} />
            {/* Painel do Dono da Barbearia - Rotas Protegidas */}
            <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
            <Route path="/services-management" element={<ProtectedRoute><ServicesManagement /></ProtectedRoute>} />
            <Route path="/barbers-management" element={<ProtectedRoute><BarbersManagement /></ProtectedRoute>} />
            <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
            <Route path="/schedule-management" element={<ProtectedRoute><ScheduleManagement /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
            <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRoles={[]}><Settings /></ProtectedRoute>} />
            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/super-admin/barbershops" element={<SuperAdminRoute><SuperAdminBarbershops /></SuperAdminRoute>} />
            <Route path="/super-admin/users" element={<SuperAdminRoute><SuperAdminUsers /></SuperAdminRoute>} />
            <Route path="/super-admin/metrics" element={<SuperAdminRoute><SuperAdminMetrics /></SuperAdminRoute>} />
            <Route path="/super-admin/support" element={<SuperAdminRoute><SuperAdminSupport /></SuperAdminRoute>} />
            <Route path="/super-admin/audit-logs" element={<SuperAdminRoute><SuperAdminAuditLogs /></SuperAdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPWA />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
