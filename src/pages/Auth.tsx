import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Scissors, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
const Auth = () => {
  const {
    signIn,
    signUp,
    user,
    userRole
  } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupAsAdmin, setSignupAsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'admin' || userRole === 'barber') {
        navigate('/pdv', {
          replace: true
        });
      } else {
        navigate('/', {
          replace: true
        });
      }
    }
  }, [user, userRole, navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName, signupAsAdmin ? 'admin' : 'client');
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
      setSignupAsAdmin(false);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Scissors className="h-8 w-8 text-accent" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">BarberPLUS</span>
          </Link>
          <p className="text-muted-foreground">Gestão profissional para barbearias</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo de volta</CardTitle>
                <CardDescription>
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-9" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type="password" placeholder="••••••••" className="pl-9" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Criar conta</CardTitle>
                <CardDescription>
                  Preencha os dados abaixo para começar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" placeholder="João Silva" className="pl-9" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="seu@email.com" className="pl-9" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="••••••••" className="pl-9" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-4 bg-secondary/20 rounded-lg">
                    <input type="checkbox" id="signup-admin" checked={signupAsAdmin} onChange={e => setSignupAsAdmin(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <label htmlFor="signup-admin" className="text-sm">
                      Quero criar minha própria barbearia (conta admin)
                    </label>
                  </div>

                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                    {loading ? 'Criando conta...' : signupAsAdmin ? 'Criar minha barbearia' : 'Criar conta de cliente'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>;
};
export default Auth;