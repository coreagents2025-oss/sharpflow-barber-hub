import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Building2, Bell, Shield, Globe, Eye, ExternalLink, MessageCircle, Facebook, Instagram, Clock, CreditCard, CheckCircle2, AlertCircle, Copy, ExternalLink as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { DomainSetupGuide } from '@/components/DomainSetupGuide';

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, 'Telefone inválido').optional().or(z.literal('')),
});

const barbershopSchema = z.object({
  name: z.string().min(3, 'Nome da barbearia obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  address: z.string().min(10, 'Endereço completo obrigatório'),
  facebook_url: z.string()
    .url('URL do Facebook inválida')
    .optional()
    .or(z.literal('')),
  instagram_url: z.string()
    .url('URL do Instagram inválida')
    .optional()
    .or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const domainSchema = z.object({
  slug: z.string()
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .max(50, 'Slug muito longo')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  custom_domain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Domínio inválido')
    .optional()
    .or(z.literal('')),
});

const emailSettingsSchema = z.object({
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  contact_whatsapp: z.string().optional().or(z.literal('')),
  notifications_enabled: z.boolean(),
});

const whatsappSettingsSchema = z.object({
  enabled: z.boolean(),
  phone_number: z.string().regex(/^\d{10,15}$/, 'Número de telefone inválido (apenas números)').or(z.literal('')),
  message_template: z.string().min(10, 'Template deve ter pelo menos 10 caracteres'),
  api_provider: z.enum(['official', 'evolution_api', 'z_api', 'uazapi']),
  daily_offer_message: z.string().optional().or(z.literal('')),
  // WhatsApp Business API (Oficial)
  whatsapp_api_token: z.string().optional().or(z.literal('')),
  whatsapp_phone_number_id: z.string().optional().or(z.literal('')),
  // Evolution API
  evolution_api_url: z.string().url('URL inválida').optional().or(z.literal('')),
  evolution_api_key: z.string().optional().or(z.literal('')),
  evolution_instance_name: z.string().optional().or(z.literal('')),
  // Z-API
  z_api_instance_id: z.string().optional().or(z.literal('')),
  z_api_token: z.string().optional().or(z.literal('')),
  // UAZapi
  uazapi_instance_id: z.string().optional().or(z.literal('')),
  uazapi_token: z.string().optional().or(z.literal('')),
  uazapi_account_id: z.string().optional().or(z.literal('')),
});

const Settings = () => {
  const { user, barbershopId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // SaaS subscription state
  const [planInfo, setPlanInfo] = useState<{
    plan_type: string;
    plan_status: string;
    trial_ends_at: string;
    platform_asaas_customer_id: string | null;
    platform_asaas_subscription_id: string | null;
  } | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeForm, setSubscribeForm] = useState({
    name: '',
    cpf_cnpj: '',
    email: '',
    phone: '',
    plan_type: 'monthly' as 'monthly' | 'annual',
  });
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
  });

  const [barbershopData, setBarbershopData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    facebook_url: '',
    instagram_url: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [domainData, setDomainData] = useState({
    slug: '',
    custom_domain: '',
  });

  const [emailSettings, setEmailSettings] = useState({
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    notifications_enabled: true,
  });

  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: false,
    phone_number: '',
    message_template: 'Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!',
    api_provider: 'official' as 'official' | 'evolution_api' | 'z_api' | 'uazapi',
    daily_offer_message: '',
    // WhatsApp Business API (Oficial)
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    // Evolution API
    evolution_api_url: '',
    evolution_api_key: '',
    evolution_instance_name: '',
    // Z-API
    z_api_instance_id: '',
    z_api_token: '',
    // UAZapi
    uazapi_instance_id: '',
    uazapi_token: '',
    uazapi_account_id: '',
  });

  const [showDomainGuide, setShowDomainGuide] = useState(false);

  // Asaas state
  const [asaasSettings, setAsaasSettings] = useState({
    enabled: false,
    api_key: '',
    environment: 'sandbox' as 'sandbox' | 'production',
  });
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [asaasStatus, setAsaasStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const DAYS = [
    { key: 'monday',    label: 'Segunda-feira' },
    { key: 'tuesday',   label: 'Terça-feira' },
    { key: 'wednesday', label: 'Quarta-feira' },
    { key: 'thursday',  label: 'Quinta-feira' },
    { key: 'friday',    label: 'Sexta-feira' },
    { key: 'saturday',  label: 'Sábado' },
    { key: 'sunday',    label: 'Domingo' },
  ];

  const TIME_SLOTS = [
    '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
    '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
    '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
    '19:00','19:30','20:00','20:30','21:00','21:30','22:00',
  ];

  type DayHours = { open: string; close: string } | null;
  const [operatingHours, setOperatingHours] = useState<Record<string, DayHours>>({
    monday:    { open: '09:00', close: '18:00' },
    tuesday:   { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday:  { open: '09:00', close: '18:00' },
    friday:    { open: '09:00', close: '18:00' },
    saturday:  { open: '09:00', close: '14:00' },
    sunday:    null,
  });
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setDataLoading(true);
      try {
        // Buscar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setProfileData({
            full_name: profile.full_name || '',
            phone: profile.phone || '',
          });
        }
        
        // Buscar barbearia se usuário tiver barbershopId
        if (barbershopId) {
          // Buscar dados básicos da barbearia
          const { data: barbershop } = await supabase
            .from('barbershops')
            .select('*')
            .eq('id', barbershopId)
            .single();
          
          if (barbershop) {
            setBarbershopData({
              name: barbershop.name || '',
              phone: barbershop.phone || '',
              email: barbershop.email || '',
              address: barbershop.address || '',
              facebook_url: barbershop.facebook_url || '',
              instagram_url: barbershop.instagram_url || '',
            });

            // Carregar domínio
            setDomainData({
              slug: barbershop.slug || '',
              custom_domain: barbershop.custom_domain || '',
            });

            // Carregar horários de funcionamento
            if (barbershop.operating_hours) {
              const oh = barbershop.operating_hours as any;
              setOperatingHours({
                monday:    oh.monday    ?? null,
                tuesday:   oh.tuesday   ?? null,
                wednesday: oh.wednesday ?? null,
                thursday:  oh.thursday  ?? null,
                friday:    oh.friday    ?? null,
                saturday:  oh.saturday  ?? null,
                sunday:    oh.sunday    ?? null,
              });
            }

            // Carregar credenciais da tabela barbershop_credentials
            const { data: credentials } = await supabase
              .from('barbershop_credentials')
              .select('whatsapp_credentials, email_credentials, asaas_credentials')
              .eq('barbershop_id', barbershopId)
              .single();
            
            const emailCreds = (credentials?.email_credentials || {}) as any;
            setEmailSettings({
              contact_email: emailCreds.contact_email || '',
              contact_phone: emailCreds.contact_phone || '',
              contact_whatsapp: emailCreds.contact_whatsapp || '',
              notifications_enabled: emailCreds.notifications_enabled ?? true,
            });
            
            const whatsappCreds = (credentials?.whatsapp_credentials || {}) as any;
            
            setWhatsappSettings({
              enabled: whatsappCreds.enabled || false,
              phone_number: whatsappCreds.phone_number || '',
              message_template: whatsappCreds.message_template || 'Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!',
              api_provider: whatsappCreds.api_provider || 'official',
              daily_offer_message: whatsappCreds.daily_offer_message || '',
              whatsapp_api_token: whatsappCreds.whatsapp_api_token || '',
              whatsapp_phone_number_id: whatsappCreds.whatsapp_phone_number_id || '',
              evolution_api_url: whatsappCreds.evolution_api_url || '',
              evolution_api_key: whatsappCreds.evolution_api_key || '',
              evolution_instance_name: whatsappCreds.evolution_instance_name || '',
              z_api_instance_id: whatsappCreds.z_api_instance_id || '',
              z_api_token: whatsappCreds.z_api_token || '',
              uazapi_instance_id: whatsappCreds.uazapi_instance_id || '',
              uazapi_token: whatsappCreds.uazapi_token || '',
              uazapi_account_id: whatsappCreds.uazapi_account_id || '',
            });

            const asaasCreds = (credentials?.asaas_credentials || {}) as any;
            setAsaasSettings({
              enabled: asaasCreds.enabled || false,
              api_key: asaasCreds.api_key || '',
              environment: asaasCreds.environment || 'sandbox',
            });

            // Load SaaS billing info
            setPlanInfo({
              plan_type: (barbershop as any).plan_type ?? 'trial',
              plan_status: (barbershop as any).plan_status ?? 'active',
              trial_ends_at: (barbershop as any).trial_ends_at ?? new Date().toISOString(),
              platform_asaas_customer_id: (barbershop as any).platform_asaas_customer_id ?? null,
              platform_asaas_subscription_id: (barbershop as any).platform_asaas_subscription_id ?? null,
            });
            // Pre-fill subscribe form with barbershop data
            setSubscribeForm(prev => ({
              ...prev,
              name: barbershop.name || '',
              email: barbershop.email || '',
              phone: barbershop.phone || '',
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [user, barbershopId]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const validated = profileSchema.parse(profileData);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: validated.full_name,
          phone: validated.phone || null,
        })
        .eq('id', user!.id);
      
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar perfil:', error);
        toast.error('Erro ao salvar perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBarbershop = async () => {
    if (!barbershopId) {
      toast.error('Você não está vinculado a nenhuma barbearia');
      return;
    }

    setLoading(true);
    try {
      const validated = barbershopSchema.parse(barbershopData);
      
      const { error } = await supabase
        .from('barbershops')
        .update({
          name: validated.name,
          phone: validated.phone,
          email: validated.email,
          address: validated.address,
          facebook_url: validated.facebook_url || null,
          instagram_url: validated.instagram_url || null,
        })
        .eq('id', barbershopId);
      
      if (error) throw error;
      toast.success('Barbearia atualizada com sucesso!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar barbearia:', error);
        toast.error('Erro ao salvar dados da barbearia');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const validated = passwordSchema.parse(passwordData);
      
      const { error } = await supabase.auth.updateUser({
        password: validated.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Senha alterada com sucesso!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao alterar senha:', error);
        toast.error('Erro ao alterar senha');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const validated = domainSchema.parse(domainData);
      
      // Verificar se slug já existe
      const { data: existing } = await supabase
        .from('barbershops')
        .select('id')
        .eq('slug', validated.slug)
        .neq('id', barbershopId)
        .maybeSingle();
      
      if (existing) {
        toast.error('Este slug já está em uso. Escolha outro.');
        return;
      }
      
      const { error } = await supabase
        .from('barbershops')
        .update({
          slug: validated.slug,
          custom_domain: validated.custom_domain || null,
        })
        .eq('id', barbershopId);
      
      if (error) throw error;
      toast.success('Link atualizado com sucesso!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar domínio:', error);
        toast.error('Erro ao salvar configurações');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const validated = emailSettingsSchema.parse(emailSettings);
      
      const { error } = await supabase
        .from('barbershop_credentials')
        .update({
          email_credentials: validated,
        })
        .eq('barbershop_id', barbershopId);
      
      if (error) throw error;
      toast.success('Configurações de email atualizadas!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar email settings:', error);
        toast.error('Erro ao salvar configurações de email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsappSettings = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const validated = whatsappSettingsSchema.parse(whatsappSettings);
      
      // Salvar todas as configurações (públicas + credenciais) em barbershop_credentials
      const { error } = await supabase
        .from('barbershop_credentials')
        .update({
          whatsapp_credentials: validated,
        })
        .eq('barbershop_id', barbershopId);
      
      if (error) throw error;
      
      toast.success('Configurações do WhatsApp atualizadas!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar WhatsApp settings:', error);
        toast.error('Erro ao salvar configurações do WhatsApp');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOperatingHours = async () => {
    if (!barbershopId) return;
    setSavingHours(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ operating_hours: operatingHours })
        .eq('id', barbershopId);
      if (error) throw error;
      toast.success('Horários de funcionamento salvos!');
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      toast.error('Erro ao salvar horários de funcionamento');
    } finally {
      setSavingHours(false);
    }
  };

  const handleTestUAZapiConnection = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          type: 'manual_message',
          barbershop_id: barbershopId,
          client_phone: whatsappSettings.phone_number || '5511999999999',
          message: '🧪 Teste de conexão UAZapi - Mensagem enviada com sucesso!',
        },
      });

      if (error) throw error;

      toast.success('✅ Teste enviado! Verifique os logs do edge function para detalhes.');
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      toast.error(`Erro no teste: ${error.message || 'Verifique as configurações'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsaasSettings = async () => {
    if (!barbershopId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershop_credentials')
        .update({ asaas_credentials: asaasSettings } as any)
        .eq('barbershop_id', barbershopId);
      if (error) throw error;
      toast.success('Configurações Asaas salvas!');
      setAsaasStatus('idle');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar configurações Asaas');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAsaasConnection = async () => {
    if (!asaasSettings.api_key) {
      toast.error('Informe a API Key antes de testar.');
      return;
    }
    setTestingAsaas(true);
    setAsaasStatus('idle');
    try {
      const baseUrl = asaasSettings.environment === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/api/v3';
      const resp = await fetch(`${baseUrl}/myAccount`, {
        headers: { 'access_token': asaasSettings.api_key, 'Content-Type': 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        toast.success(`Conexão OK! Conta: ${data.name || data.email || 'Asaas'}`);
        setAsaasStatus('ok');
      } else {
        toast.error('Falha na conexão. Verifique a API Key e o ambiente.');
        setAsaasStatus('error');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao testar conexão com Asaas');
      setAsaasStatus('error');
    } finally {
      setTestingAsaas(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-12 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <div className="relative">
            <div className="w-full overflow-x-auto pb-2 sm:pb-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              <TabsList className="flex sm:grid sm:grid-cols-3 lg:grid-cols-7 gap-2 w-full sm:w-auto">
                <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[100px] sm:min-w-0 touch-target">
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </TabsTrigger>
                <TabsTrigger value="barbershop" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[120px] sm:min-w-0 touch-target">
                  <Building2 className="h-4 w-4" />
                  <span>Barbearia</span>
                </TabsTrigger>
                <TabsTrigger value="hours" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[110px] sm:min-w-0 touch-target">
                  <Clock className="h-4 w-4" />
                  <span>Horários</span>
                </TabsTrigger>
                <TabsTrigger value="domain" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[110px] sm:min-w-0 touch-target">
                  <Globe className="h-4 w-4" />
                  <span>Domínio</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[130px] sm:min-w-0 touch-target">
                  <Bell className="h-4 w-4" />
                  <span>Notificações</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[120px] sm:min-w-0 touch-target">
                  <Shield className="h-4 w-4" />
                  <span>Segurança</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[120px] sm:min-w-0 touch-target">
                  <CreditCard className="h-4 w-4" />
                  <span>Pagamentos</span>
                </TabsTrigger>
                <TabsTrigger value="subscription" className="flex items-center gap-2 text-xs sm:text-sm flex-shrink-0 snap-start min-w-[140px] sm:min-w-0 touch-target">
                  <Sparkles className="h-4 w-4" />
                  <span>Minha Assinatura</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>

          <TabsContent value="profile">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Informações do Perfil</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                {dataLoading ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="name" className="text-xs sm:text-sm">Nome Completo</Label>
                      <Input 
                        id="name" 
                        placeholder="Seu nome"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        disabled={loading}
                        className="h-10 sm:h-11 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="email" className="text-xs sm:text-sm">E-mail</Label>
                      <Input id="email" type="email" value={user?.email || ''} disabled className="h-10 sm:h-11 text-sm" />
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="phone" className="text-xs sm:text-sm">Telefone</Label>
                      <Input 
                        id="phone" 
                        placeholder="(00) 00000-0000"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={loading}
                        className="h-10 sm:h-11 text-sm"
                      />
                    </div>
                    
                    <Button onClick={handleSaveProfile} disabled={loading} className="bg-accent hover:bg-accent/90">
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="barbershop">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Informações da Barbearia</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure os dados da sua barbearia
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                {!barbershopId ? (
                  <p className="text-muted-foreground">
                    Você não está vinculado a nenhuma barbearia.
                  </p>
                ) : dataLoading ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="barbershop-name" className="text-xs sm:text-sm">Nome da Barbearia</Label>
                      <Input 
                        id="barbershop-name" 
                        placeholder="Nome da sua barbearia"
                        value={barbershopData.name}
                        onChange={(e) => setBarbershopData({ ...barbershopData, name: e.target.value })}
                        disabled={loading}
                        className="h-10 sm:h-11 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="address" className="text-xs sm:text-sm">Endereço</Label>
                      <Input 
                        id="address" 
                        placeholder="Endereço completo"
                        value={barbershopData.address}
                        onChange={(e) => setBarbershopData({ ...barbershopData, address: e.target.value })}
                        disabled={loading}
                        className="h-10 sm:h-11 text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="barbershop-phone" className="text-xs sm:text-sm">Telefone</Label>
                        <Input 
                          id="barbershop-phone" 
                          placeholder="(00) 0000-0000"
                          value={barbershopData.phone}
                          onChange={(e) => setBarbershopData({ ...barbershopData, phone: e.target.value })}
                          disabled={loading}
                          className="h-10 sm:h-11 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="barbershop-email" className="text-xs sm:text-sm">E-mail</Label>
                        <Input 
                          id="barbershop-email" 
                          type="email" 
                          placeholder="contato@barbearia.com"
                          value={barbershopData.email}
                          onChange={(e) => setBarbershopData({ ...barbershopData, email: e.target.value })}
                          disabled={loading}
                          className="h-10 sm:h-11 text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Redes Sociais */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-medium text-muted-foreground">Redes Sociais</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="facebook_url" className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-[#1877F2]" />
                          Facebook
                        </Label>
                        <Input 
                          id="facebook_url" 
                          type="url"
                          placeholder="https://facebook.com/minhabarbearia"
                          value={barbershopData.facebook_url}
                          onChange={(e) => setBarbershopData({ ...barbershopData, facebook_url: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole o link completo do seu perfil no Facebook
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="instagram_url" className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-[#E4405F]" />
                          Instagram
                        </Label>
                        <Input 
                          id="instagram_url" 
                          type="url"
                          placeholder="https://instagram.com/minhabarbearia"
                          value={barbershopData.instagram_url}
                          onChange={(e) => setBarbershopData({ ...barbershopData, instagram_url: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole o link completo do seu perfil no Instagram
                        </p>
                      </div>
                    </div>
                    
                    <Button onClick={handleSaveBarbershop} disabled={loading} className="bg-accent hover:bg-accent/90">
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-0 sm:border shadow-sm">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <Globe className="h-5 w-5 text-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl">Link Público do Catálogo</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Configure o endereço público da sua barbearia
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                  {dataLoading ? (
                    <div className="space-y-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="slug" className="text-xs sm:text-sm">Identificador (Slug)</Label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">barberplus.shop/</span>
                          <Input 
                            id="slug"
                            placeholder="minha-barbearia"
                            value={domainData.slug}
                            onChange={(e) => setDomainData({ ...domainData, slug: e.target.value.toLowerCase() })}
                            disabled={loading}
                            className="h-10 sm:h-11 text-sm flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground break-all">
                          Seu catálogo estará disponível em:{' '}
                          <strong className="text-foreground">
                            {domainData.custom_domain 
                              ? `https://${domainData.custom_domain}`
                              : `https://barberplus.shop/${domainData.slug || 'seu-slug'}`
                            }
                          </strong>
                        </p>
                      </div>


                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = domainData.custom_domain
                              ? `https://${domainData.custom_domain}`
                              : `https://barberplus.shop/${domainData.slug}`;
                            window.open(url, '_blank');
                          }}
                          disabled={!domainData.slug && !domainData.custom_domain}
                          className="touch-target whitespace-nowrap text-xs sm:text-sm"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                          Visualizar Catálogo
                        </Button>
                        <Button 
                          onClick={handleSaveDomain} 
                          disabled={loading} 
                          size="sm"
                          className="bg-accent hover:bg-accent/90 touch-target text-xs sm:text-sm"
                        >
                          {loading ? 'Salvando...' : 'Salvar Link'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 sm:border shadow-sm">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="text-lg sm:text-xl">Informações de Contato nos Emails</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Estes dados aparecerão nos emails enviados aos seus clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                  {dataLoading ? (
                    <div className="space-y-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Email de Contato</Label>
                        <Input 
                          id="contact-email"
                          type="email"
                          placeholder="contato@minhabarbearia.com"
                          value={emailSettings.contact_email}
                          onChange={(e) => setEmailSettings({ ...emailSettings, contact_email: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Email exibido no rodapé dos emails para seus clientes entrarem em contato
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-phone">Telefone de Contato</Label>
                        <Input 
                          id="contact-phone"
                          placeholder="(11) 99999-9999"
                          value={emailSettings.contact_phone}
                          onChange={(e) => setEmailSettings({ ...emailSettings, contact_phone: e.target.value })}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-whatsapp">WhatsApp de Contato</Label>
                        <Input 
                          id="contact-whatsapp"
                          placeholder="(11) 99999-9999"
                          value={emailSettings.contact_whatsapp}
                          onChange={(e) => setEmailSettings({ ...emailSettings, contact_whatsapp: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Número de WhatsApp exibido nos emails para contato direto
                        </p>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label>Notificações por Email</Label>
                          <p className="text-xs text-muted-foreground">
                            Enviar confirmações automáticas de agendamento
                          </p>
                        </div>
                        <Switch 
                          checked={emailSettings.notifications_enabled}
                          onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, notifications_enabled: checked })}
                          disabled={loading}
                        />
                      </div>

                      <Button onClick={handleSaveEmailSettings} disabled={loading} className="bg-accent hover:bg-accent/90">
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MessageCircle className="h-5 w-5" />
                  Notificações via WhatsApp
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure o envio automático de confirmações de agendamento via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                {!barbershopId ? (
                  <p className="text-muted-foreground">
                    Você não está vinculado a nenhuma barbearia.
                  </p>
                ) : dataLoading ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <Label>Ativar Notificações WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">
                          Enviar confirmações automáticas de agendamento
                        </p>
                      </div>
                      <Switch 
                        checked={whatsappSettings.enabled}
                        onCheckedChange={(checked) => setWhatsappSettings({ ...whatsappSettings, enabled: checked })}
                        disabled={loading}
                      />
                    </div>

                    {whatsappSettings.enabled && (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <Label className="text-sm font-semibold mb-2 block">URL do Webhook (Receber Mensagens)</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Configure esta URL no seu provedor WhatsApp para receber mensagens dos clientes
                        </p>
                        <div className="flex gap-2">
                          <Input 
                            readOnly 
                            value={`https://jgpffcjktwsohfyljtsg.supabase.co/functions/v1/receive-whatsapp-message?token=${domainData.slug || 'seu-slug'}`}
                            className="font-mono text-xs"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://jgpffcjktwsohfyljtsg.supabase.co/functions/v1/receive-whatsapp-message?token=${domainData.slug}`);
                              toast.success('URL copiada!');
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="api-provider">Provedor de API</Label>
                      <Select 
                        value={whatsappSettings.api_provider}
                        onValueChange={(value) => setWhatsappSettings({ ...whatsappSettings, api_provider: value as any })}
                        disabled={loading}
                      >
                        <SelectTrigger id="api-provider">
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="official">WhatsApp Business API (Oficial)</SelectItem>
                          <SelectItem value="evolution_api">Evolution API (Não oficial)</SelectItem>
                          <SelectItem value="z_api">Z-API (Não oficial)</SelectItem>
                          <SelectItem value="uazapi">UAZapi (Não oficial)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Escolha o provedor de API do WhatsApp que você utiliza
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-phone">
                        Número do WhatsApp da Barbearia (com DDI + DDD)
                      </Label>
                      <Input 
                        id="whatsapp-phone"
                        placeholder="5511999999999"
                        value={whatsappSettings.phone_number}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phone_number: e.target.value.replace(/\D/g, '') })}
                        disabled={loading}
                        maxLength={15}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este é o número de WhatsApp da sua barbearia (remetente). Formato: 5511999999999 (DDI 55 + DDD + número)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message-template">Template da Mensagem de Confirmação</Label>
                      <textarea
                        id="message-template"
                        className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm"
                        value={whatsappSettings.message_template}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, message_template: e.target.value })}
                        disabled={loading}
                        placeholder="Olá {{client_name}}! Seu agendamento foi confirmado..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Use as variáveis: {'{'}{'{'} client_name {'}'}{'}'},  {'{'}{'{'} date {'}'}{'}'},  {'{'}{'{'} time {'}'}{'}'},  {'{'}{'{'} service_name {'}'}{'}'},  {'{'}{'{'} barber_name {'}'}{'}'} 
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="daily-offer">Mensagem de Oferta do Dia (Opcional)</Label>
                      <textarea
                        id="daily-offer"
                        className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm"
                        value={whatsappSettings.daily_offer_message}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, daily_offer_message: e.target.value })}
                        disabled={loading}
                        placeholder="🔥 Oferta do dia! Corte + Barba por apenas R$ 50,00. Válido até hoje!"
                      />
                      <p className="text-xs text-muted-foreground">
                        Esta mensagem será adicionada ao final de cada confirmação de agendamento
                      </p>
                    </div>

                    {/* Campos de configuração da API WhatsApp Business (Oficial) */}
                    {whatsappSettings.api_provider === 'official' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-semibold text-sm">Configuração WhatsApp Business API</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp-token">Token de Acesso</Label>
                          <Input 
                            id="whatsapp-token"
                            type="password"
                            placeholder="EAAxxxxxxxxxxxxx"
                            value={whatsappSettings.whatsapp_api_token}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_api_token: e.target.value })}
                            disabled={loading}
                          />
                          <p className="text-xs text-muted-foreground">
                            Token obtido no Facebook Developers
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone-number-id">Phone Number ID</Label>
                          <Input 
                            id="phone-number-id"
                            placeholder="123456789012345"
                            value={whatsappSettings.whatsapp_phone_number_id}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_phone_number_id: e.target.value })}
                            disabled={loading}
                          />
                          <p className="text-xs text-muted-foreground">
                            ID do número de telefone no WhatsApp Business
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Campos de configuração da Evolution API */}
                    {whatsappSettings.api_provider === 'evolution_api' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-semibold text-sm">Configuração Evolution API</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="evolution-url">URL da API</Label>
                          <Input 
                            id="evolution-url"
                            type="url"
                            placeholder="https://sua-api.com"
                            value={whatsappSettings.evolution_api_url}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, evolution_api_url: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="evolution-key">API Key</Label>
                          <Input 
                            id="evolution-key"
                            type="password"
                            placeholder="sua-api-key"
                            value={whatsappSettings.evolution_api_key}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, evolution_api_key: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="evolution-instance">Nome da Instância</Label>
                          <Input 
                            id="evolution-instance"
                            placeholder="minha-instancia"
                            value={whatsappSettings.evolution_instance_name}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, evolution_instance_name: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}

                    {/* Campos de configuração da Z-API */}
                    {whatsappSettings.api_provider === 'z_api' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-semibold text-sm">Configuração Z-API</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="z-instance-id">Instance ID</Label>
                          <Input 
                            id="z-instance-id"
                            placeholder="SUA_INSTANCIA"
                            value={whatsappSettings.z_api_instance_id}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, z_api_instance_id: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="z-token">Token</Label>
                          <Input 
                            id="z-token"
                            type="password"
                            placeholder="SEU_TOKEN"
                            value={whatsappSettings.z_api_token}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, z_api_token: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}

                    {/* Campos de configuração da UAZapi */}
                    {whatsappSettings.api_provider === 'uazapi' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-semibold text-sm">Configuração UAZapi</h4>
                        
                        <div className="space-y-2">
                          <Label htmlFor="uazapi-subdomain">Subdomínio UAZapi</Label>
                          <Input 
                            id="uazapi-subdomain"
                            placeholder="ex: core-agents (apenas o subdomínio)"
                            value={whatsappSettings.uazapi_account_id}
                            onChange={(e) => {
                              let value = e.target.value.trim();
                              
                              // Se o usuário colar uma URL completa, extrair automaticamente o subdomínio
                              if (value.includes('://')) {
                                try {
                                  const url = new URL(value);
                                  value = url.hostname.split('.')[0];
                                  toast.info(`Subdomínio extraído: ${value}`);
                                } catch (error) {
                                  console.error('Error parsing URL:', error);
                                }
                              }
                              
                              setWhatsappSettings({ ...whatsappSettings, uazapi_account_id: value });
                            }}
                            disabled={loading}
                          />
                          <p className="text-xs text-muted-foreground">
                            Digite apenas o subdomínio (ex: core-agents). Se colar uma URL completa, será extraído automaticamente.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="uazapi-instance">Instance ID</Label>
                          <Input 
                            id="uazapi-instance"
                            placeholder="SUA_INSTANCIA"
                            value={whatsappSettings.uazapi_instance_id}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, uazapi_instance_id: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="uazapi-token">Token</Label>
                          <Input 
                            id="uazapi-token"
                            type="password"
                            placeholder="seu-token-uazapi"
                            value={whatsappSettings.uazapi_token}
                            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, uazapi_token: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div className="pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestUAZapiConnection}
                            disabled={loading || !whatsappSettings.uazapi_account_id || !whatsappSettings.uazapi_instance_id || !whatsappSettings.uazapi_token}
                            className="w-full"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {loading ? 'Testando...' : 'Testar Conexão UAZapi'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Envia uma mensagem de teste e verifica o status da instância. Confira os logs do edge function para detalhes.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Documentação das APIs
                      </h4>
                      <div className="text-xs space-y-2 text-muted-foreground">
                        <div>
                          <strong className="text-foreground">WhatsApp Business API (Oficial):</strong>
                          <ol className="space-y-1 mt-1 ml-4">
                            <li>1. <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Facebook Developers</a></li>
                            <li>2. Configure o número e obtenha o token de acesso</li>
                          </ol>
                        </div>
                        <div>
                          <strong className="text-foreground">Evolution API:</strong>
                          <ol className="space-y-1 mt-1 ml-4">
                            <li>1. <a href="https://evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Evolution API Docs</a></li>
                            <li>2. Instale e configure a instância</li>
                          </ol>
                        </div>
                        <div>
                          <strong className="text-foreground">Z-API:</strong>
                          <ol className="space-y-1 mt-1 ml-4">
                            <li>1. <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Z-API Docs</a></li>
                            <li>2. Crie uma conta e obtenha suas credenciais</li>
                          </ol>
                        </div>
                        <div>
                          <strong className="text-foreground">UAZapi:</strong>
                          <ol className="space-y-1 mt-1 ml-4">
                            <li>1. <a href="https://docs.uazapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">UAZapi Docs</a></li>
                            <li>2. Configure sua instância e obtenha o token</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSaveWhatsappSettings} disabled={loading} className="bg-accent hover:bg-accent/90">
                      {loading ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl">Segurança da Conta</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="current-password" className="text-xs sm:text-sm">Senha Atual</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    disabled={loading}
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="new-password" className="text-xs sm:text-sm">Nova Senha</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    disabled={loading}
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs sm:text-sm">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirm-password" 
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    disabled={loading}
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>
                
                <Button onClick={handleChangePassword} disabled={loading} className="bg-accent hover:bg-accent/90 w-full sm:w-auto touch-target">
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </CardContent>
            </Card>
           </TabsContent>

          <TabsContent value="hours">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  Horários de Funcionamento
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Defina os horários padrão por dia da semana. Esta é a base para todos os agendamentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3">
                {!barbershopId ? (
                  <p className="text-muted-foreground text-sm">Você não está vinculado a nenhuma barbearia.</p>
                ) : (
                  <>
                    <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 mb-4">
                      <p className="text-xs text-muted-foreground">
                        💡 Os horários aqui configurados são a base do sistema de agendamento. Em <strong>Gerenciar Agenda</strong> você pode criar exceções para dias específicos.
                      </p>
                    </div>

                    {DAYS.map((day) => {
                      const hours = operatingHours[day.key];
                      const isOpen = hours !== null;
                      return (
                        <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-48">
                            <span className="text-sm font-medium">{day.label}</span>
                            <Switch
                              checked={isOpen}
                              onCheckedChange={(checked) =>
                                setOperatingHours((prev) => ({
                                  ...prev,
                                  [day.key]: checked ? { open: '09:00', close: '18:00' } : null,
                                }))
                              }
                            />
                          </div>
                          {isOpen ? (
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex-1 min-w-0">
                                <Label className="text-xs text-muted-foreground mb-1 block">Abertura</Label>
                                <Select
                                  value={hours!.open}
                                  onValueChange={(val) =>
                                    setOperatingHours((prev) => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key]!, open: val },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_SLOTS.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <span className="text-muted-foreground mt-5">–</span>
                              <div className="flex-1 min-w-0">
                                <Label className="text-xs text-muted-foreground mb-1 block">Fechamento</Label>
                                <Select
                                  value={hours!.close}
                                  onValueChange={(val) =>
                                    setOperatingHours((prev) => ({
                                      ...prev,
                                      [day.key]: { ...prev[day.key]!, close: val },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_SLOTS.map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Fechado</span>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-2">
                      <Button
                        onClick={handleSaveOperatingHours}
                        disabled={savingHours}
                        className="bg-accent hover:bg-accent/90 w-full sm:w-auto"
                      >
                        {savingHours ? 'Salvando...' : 'Salvar Horários'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="border-0 sm:border shadow-sm">
              <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <CreditCard className="h-5 w-5 text-accent" />
                  Integração Asaas — Cobrança Recorrente
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Conecte sua conta Asaas para cobrar assinaturas automaticamente via PIX, Boleto ou Cartão.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-4">
                {!barbershopId ? (
                  <p className="text-muted-foreground">Você não está vinculado a nenhuma barbearia.</p>
                ) : (
                  <>
                    {/* Toggle */}
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <Label className="text-sm font-medium">Ativar cobrança automática via Asaas</Label>
                        <p className="text-xs text-muted-foreground">
                          Quando ativado, novas assinaturas gerarão cobranças automáticas na Asaas
                        </p>
                      </div>
                      <Switch
                        checked={asaasSettings.enabled}
                        onCheckedChange={(checked) => setAsaasSettings({ ...asaasSettings, enabled: checked })}
                        disabled={loading}
                      />
                    </div>

                    {/* Environment */}
                    <div className="space-y-2">
                      <Label htmlFor="asaas-env">Ambiente</Label>
                      <Select
                        value={asaasSettings.environment}
                        onValueChange={(v) => setAsaasSettings({ ...asaasSettings, environment: v as any })}
                        disabled={loading}
                      >
                        <SelectTrigger id="asaas-env">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                          <SelectItem value="production">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Use Sandbox para testar antes de cobrar clientes reais.
                      </p>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                      <Label htmlFor="asaas-key">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id="asaas-key"
                          type="password"
                          placeholder={asaasSettings.environment === 'production' ? '$aact_...' : '$aact_sandbox_...'}
                          value={asaasSettings.api_key}
                          onChange={(e) => setAsaasSettings({ ...asaasSettings, api_key: e.target.value })}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestAsaasConnection}
                          disabled={testingAsaas || !asaasSettings.api_key}
                          className="shrink-0"
                        >
                          {testingAsaas ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : asaasStatus === 'ok' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : asaasStatus === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : null}
                          <span className="ml-1 text-xs">Testar</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Encontre sua API Key em: <a href="https://www.asaas.com/config/index" target="_blank" rel="noopener noreferrer" className="text-primary underline">Asaas → Configurações → Integrações</a>
                      </p>
                    </div>

                    {/* Webhook URL */}
                    {asaasSettings.enabled && barbershopId && (
                      <div className="space-y-2 p-4 rounded-lg border bg-muted/40">
                        <Label className="text-sm font-semibold">URL do Webhook</Label>
                        <p className="text-xs text-muted-foreground">
                          Cole esta URL em{' '}
                          <a href="https://www.asaas.com/config/index#notification" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            Asaas → Configurações → Notificações → Webhooks
                          </a>
                        </p>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={`https://jgpffcjktwsohfyljtsg.supabase.co/functions/v1/asaas-webhook?barbershop_id=${barbershopId}`}
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://jgpffcjktwsohfyljtsg.supabase.co/functions/v1/asaas-webhook?barbershop_id=${barbershopId}`);
                              toast.success('URL copiada!');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Eventos a habilitar: <strong>PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, SUBSCRIPTION_DELETED</strong>
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <Button onClick={handleSaveAsaasSettings} disabled={loading} className="bg-accent hover:bg-accent/90">
                        {loading ? 'Salvando...' : 'Salvar Configurações'}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground text-sm">Como funciona?</p>
                      <p>1. Configure sua API Key e ative a integração acima.</p>
                      <p>2. Ao criar uma nova assinatura, o sistema cria automaticamente o cliente e a cobrança recorrente na Asaas.</p>
                      <p>3. A Asaas cobra o cliente automaticamente (PIX, Boleto ou Cartão) a cada ciclo.</p>
                      <p>4. Quando o pagamento é confirmado, o webhook atualiza os créditos do assinante automaticamente.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <DomainSetupGuide open={showDomainGuide} onClose={() => setShowDomainGuide(false)} />
    </div>
  );
};

export default Settings;
