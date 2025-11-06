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
import { User, Building2, Bell, Shield, Globe, Eye, ExternalLink, MessageCircle, Facebook, Instagram } from 'lucide-react';
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
  from_email: z.string().email('Email inválido'),
  from_name: z.string().min(3, 'Nome obrigatório'),
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
    from_email: '',
    from_name: '',
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

            // Carregar credenciais da tabela barbershop_credentials
            const { data: credentials } = await supabase
              .from('barbershop_credentials')
              .select('whatsapp_credentials, email_credentials')
              .eq('barbershop_id', barbershopId)
              .single();
            
            const emailCreds = (credentials?.email_credentials || {}) as any;
            setEmailSettings({
              from_email: emailCreds.from_email || '',
              from_name: emailCreds.from_name || '',
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="barbershop" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Barbearia
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domínio & Emails
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataLoading ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input 
                        id="name" 
                        placeholder="Seu nome"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" value={user?.email || ''} disabled />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        placeholder="(00) 00000-0000"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={loading}
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
            <Card>
              <CardHeader>
                <CardTitle>Informações da Barbearia</CardTitle>
                <CardDescription>
                  Configure os dados da sua barbearia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="barbershop-name">Nome da Barbearia</Label>
                      <Input 
                        id="barbershop-name" 
                        placeholder="Nome da sua barbearia"
                        value={barbershopData.name}
                        onChange={(e) => setBarbershopData({ ...barbershopData, name: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input 
                        id="address" 
                        placeholder="Endereço completo"
                        value={barbershopData.address}
                        onChange={(e) => setBarbershopData({ ...barbershopData, address: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="barbershop-phone">Telefone</Label>
                        <Input 
                          id="barbershop-phone" 
                          placeholder="(00) 0000-0000"
                          value={barbershopData.phone}
                          onChange={(e) => setBarbershopData({ ...barbershopData, phone: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="barbershop-email">E-mail</Label>
                        <Input 
                          id="barbershop-email" 
                          type="email" 
                          placeholder="contato@barbearia.com"
                          value={barbershopData.email}
                          onChange={(e) => setBarbershopData({ ...barbershopData, email: e.target.value })}
                          disabled={loading}
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Link Público do Catálogo</CardTitle>
                  <CardDescription>Configure o endereço público da sua barbearia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dataLoading ? (
                    <div className="space-y-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Identificador (Slug)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">barberplus.shop/</span>
                          <Input 
                            id="slug"
                            placeholder="minha-barbearia"
                            value={domainData.slug}
                            onChange={(e) => setDomainData({ ...domainData, slug: e.target.value.toLowerCase() })}
                            disabled={loading}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Seu catálogo estará disponível em:{' '}
                          <strong className="text-foreground">
                            {domainData.custom_domain 
                              ? `https://${domainData.custom_domain}`
                              : `https://barberplus.shop/${domainData.slug || 'seu-slug'}`
                            }
                          </strong>
                        </p>
                      </div>


                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const url = domainData.custom_domain
                              ? `https://${domainData.custom_domain}`
                              : `https://barberplus.shop/${domainData.slug}`;
                            window.open(url, '_blank');
                          }}
                          disabled={!domainData.slug && !domainData.custom_domain}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar Catálogo
                        </Button>
                        <Button onClick={handleSaveDomain} disabled={loading} className="bg-accent hover:bg-accent/90">
                          {loading ? 'Salvando...' : 'Salvar Link'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Email</CardTitle>
                  <CardDescription>Configure emails para notificações de agendamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dataLoading ? (
                    <div className="space-y-4">
                      <div className="h-10 bg-muted animate-pulse rounded" />
                      <div className="h-10 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="from-email">Email de Envio</Label>
                        <Input 
                          id="from-email"
                          type="email"
                          placeholder="noreply@minhabarbearia.com"
                          value={emailSettings.from_email}
                          onChange={(e) => setEmailSettings({ ...emailSettings, from_email: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Email que seus clientes verão como remetente
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="from-name">Nome do Remetente</Label>
                        <Input 
                          id="from-name"
                          placeholder="Barbearia Elite"
                          value={emailSettings.from_name}
                          onChange={(e) => setEmailSettings({ ...emailSettings, from_name: e.target.value })}
                          disabled={loading}
                        />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Notificações via WhatsApp
                </CardTitle>
                <CardDescription>
                  Configure o envio automático de confirmações de agendamento via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
            <Card>
              <CardHeader>
                <CardTitle>Segurança da Conta</CardTitle>
                <CardDescription>
                  Gerencie a segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input 
                    id="confirm-password" 
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
                
                <Button onClick={handleChangePassword} disabled={loading} className="bg-accent hover:bg-accent/90">
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
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
