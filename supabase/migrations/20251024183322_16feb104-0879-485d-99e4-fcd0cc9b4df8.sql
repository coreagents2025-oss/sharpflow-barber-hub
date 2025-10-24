-- ============================================
-- CRIAR TRIGGERS FALTANTES
-- ============================================

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers: update_updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbershops_updated_at ON public.barbershops;
CREATE TRIGGER update_barbershops_updated_at 
  BEFORE UPDATE ON public.barbershops 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbers_updated_at ON public.barbers;
CREATE TRIGGER update_barbers_updated_at 
  BEFORE UPDATE ON public.barbers 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON public.services 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
  BEFORE UPDATE ON public.appointments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalog_settings_updated_at ON public.catalog_settings;
CREATE TRIGGER update_catalog_settings_updated_at 
  BEFORE UPDATE ON public.catalog_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_schedules_updated_at ON public.daily_schedules;
CREATE TRIGGER update_daily_schedules_updated_at 
  BEFORE UPDATE ON public.daily_schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_subscriptions_updated_at ON public.client_subscriptions;
CREATE TRIGGER update_client_subscriptions_updated_at 
  BEFORE UPDATE ON public.client_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at 
  BEFORE UPDATE ON public.integrations 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();