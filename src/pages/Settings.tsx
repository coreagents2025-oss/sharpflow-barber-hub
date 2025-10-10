import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Building2, Bell, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="barbershop" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Barbearia
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
    </div>
  );
};

export default Settings;
