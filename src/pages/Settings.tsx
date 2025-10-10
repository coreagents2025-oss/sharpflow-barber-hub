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
import { User, Building2, Bell, Shield, Globe, Eye, ExternalLink } from 'lucide-react';
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
            });

            // Carregar domínio
            setDomainData({
              slug: barbershop.slug || '',
              custom_domain: barbershop.custom_domain || '',
            });

            // Carregar email settings
            const settings = (barbershop.email_settings || {}) as any;
            setEmailSettings({
              from_email: settings.from_email || '',
              from_name: settings.from_name || '',
              notifications_enabled: settings.notifications_enabled ?? true,
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
        .from('barbershops')
        .update({
          email_settings: validated,
        })
        .eq('id', barbershopId);
      
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
                          <span className="text-sm text-muted-foreground whitespace-nowrap">lovable.app/</span>
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
                            {window.location.origin}/{domainData.slug || 'seu-slug'}
                          </strong>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-domain">Domínio Personalizado (Opcional)</Label>
                        <Input 
                          id="custom-domain"
                          placeholder="www.minhabarbearia.com.br"
                          value={domainData.custom_domain}
                          onChange={(e) => setDomainData({ ...domainData, custom_domain: e.target.value })}
                          disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Configure seu próprio domínio.{' '}
                          <button 
                            onClick={() => setShowDomainGuide(true)}
                            className="text-accent hover:underline inline-flex items-center gap-1"
                          >
                            Saiba como <ExternalLink className="h-3 w-3" />
                          </button>
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const url = domainData.slug 
                              ? `${window.location.origin}/${domainData.slug}`
                              : `${window.location.origin}/catalogo`;
                            window.open(url, '_blank');
                          }}
                          disabled={!domainData.slug}
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
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configurações de notificação serão implementadas
                </p>
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
