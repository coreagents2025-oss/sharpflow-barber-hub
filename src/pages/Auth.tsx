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
      await signUp(signupEmail, signupPassword, signupName, 'admin');
      setSignupEmail('');
      setSignupPassword('');
      setSignupName('');
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 sm:mb-4">
            <Scissors className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">BarberPLUS</span>
          </Link>
          <p className="text-muted-foreground text-sm sm:text-base">Gestão profissional para barbearias</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-11">
            <TabsTrigger value="login" className="text-sm sm:text-base">Entrar</TabsTrigger>
            <TabsTrigger value="signup" className="text-sm sm:text-base">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">Bem-vindo de volta</CardTitle>
                <CardDescription className="text-sm">
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="seu@email.com" className="pl-9 h-11" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type="password" placeholder="••••••••" className="pl-9 h-11" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-11 min-h-[44px]" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">Criar conta</CardTitle>
                <CardDescription className="text-sm">
                  Preencha os dados abaixo para começar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" placeholder="João Silva" className="pl-9 h-11" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="seu@email.com" className="pl-9 h-11" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="••••••••" className="pl-9 h-11" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-11 min-h-[44px]" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar minha barbearia'}
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