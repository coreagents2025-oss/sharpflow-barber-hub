import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scissors, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';

const ClientAuth = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading, signIn } = useAuth();

  const [barbershop, setBarbershop] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const [bsLoading, setBsLoading] = useState(true);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Load barbershop info
  useEffect(() => {
    if (!slug) return;
    supabase
      .from('barbershops')
      .select('id, name, logo_url')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        setBarbershop(data);
        setBsLoading(false);
      });
  }, [slug]);

  // Redirect if already logged in as client
  useEffect(() => {
    if (!authLoading && user && userRole === 'client') {
      navigate(`/${slug}/cliente/dashboard`, { replace: true });
    } else if (!authLoading && user && userRole && userRole !== 'client') {
      navigate('/pdv', { replace: true });
    }
  }, [user, userRole, authLoading, navigate, slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      navigate(`/${slug}/cliente/dashboard`, { replace: true });
    } catch {
      // error handled in signIn
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) return;
    if (signupPassword !== signupConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (signupPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!barbershop) return;

    setSignupLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/${slug}/cliente/dashboard`,
          data: {
            full_name: signupName,
            role: 'client',
            barbershop_id: barbershop.id,
          },
        },
      });

      if (error) throw error;

      toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado. Faça login.');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  if (bsLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-muted-foreground">Barbearia não encontrada.</p>
        <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      {/* Back to catalog */}
      <div className="w-full max-w-md mb-4">
        <Link
          to={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="text-center pb-2">
          {barbershop.logo_url ? (
            <img
              src={barbershop.logo_url}
              alt={barbershop.name}
              className="h-16 w-16 rounded-full object-cover border-4 border-primary/20 mx-auto mb-3 shadow"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Scissors className="h-7 w-7 text-primary" />
            </div>
          )}
          <CardTitle className="text-xl">{barbershop.name}</CardTitle>
          <CardDescription>Área exclusiva para assinantes</CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Criar conta</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loginLoading}>
                  {loginLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mín. 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm">Confirmar senha</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Repita a senha"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full mt-2" disabled={signupLoading}>
                  {signupLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Após o cadastro, confirme seu email para acessar a área do assinante.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    <ForgotPasswordDialog
      open={forgotOpen}
      onOpenChange={setForgotOpen}
      defaultEmail={loginEmail}
    />
    </>
  );
};

export default ClientAuth;
