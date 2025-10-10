import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { User, Building2, Bell, Shield } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    setLoading(true);
    // Simulated save
    setTimeout(() => {
      toast.success('Perfil atualizado com sucesso!');
      setLoading(false);
    }, 1000);
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
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" placeholder="Seu nome" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={user?.email || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" placeholder="(00) 00000-0000" />
                </div>
                
                <Button onClick={handleSaveProfile} disabled={loading} className="bg-accent hover:bg-accent/90">
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
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
                <div className="space-y-2">
                  <Label htmlFor="barbershop-name">Nome da Barbearia</Label>
                  <Input id="barbershop-name" placeholder="Nome da sua barbearia" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" placeholder="Endereço completo" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-phone">Telefone</Label>
                    <Input id="barbershop-phone" placeholder="(00) 0000-0000" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="barbershop-email">E-mail</Label>
                    <Input id="barbershop-email" type="email" placeholder="contato@barbearia.com" />
                  </div>
                </div>
                
                <Button className="bg-accent hover:bg-accent/90">
                  Salvar Alterações
                </Button>
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
                  <Input id="current-password" type="password" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input id="new-password" type="password" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                
                <Button className="bg-accent hover:bg-accent/90">
                  Alterar Senha
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
