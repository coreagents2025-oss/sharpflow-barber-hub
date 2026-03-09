import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors, Lock, Loader2, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let settled = false;

    // onAuthStateChange must be set up BEFORE getSession so the PASSWORD_RECOVERY
    // event (fired from the URL hash) is never missed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
        settled = true;
        setChecking(false);
      } else if (event === 'SIGNED_IN' && session && !settled) {
        // Fallback: already signed-in session (e.g. link already consumed once)
        setValidSession(true);
        settled = true;
        setChecking(false);
      }
    });

    // Give the PASSWORD_RECOVERY event up to 1.5 s to arrive before we
    // fall back to getSession — this prevents the "link inválido" flash.
    const fallback = setTimeout(async () => {
      if (settled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setValidSession(true);
      setChecking(false);
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success('Senha redefinida com sucesso!');
      setTimeout(() => navigate('/auth', { replace: true }), 2500);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Scissors className="h-8 w-8 text-accent" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BarberPLUS
            </span>
          </Link>
          <p className="text-muted-foreground text-sm">Redefinição de senha</p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl">
              {done ? 'Senha redefinida!' : 'Nova senha'}
            </CardTitle>
            <CardDescription>
              {done
                ? 'Você será redirecionado para o login em instantes.'
                : validSession
                  ? 'Crie uma nova senha segura para sua conta.'
                  : 'Link inválido ou expirado. Solicite um novo link de recuperação.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0">
            {done ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Redirecionando para o login…
                </p>
              </div>
            ) : validSession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mín. 6 caracteres"
                      className="pl-9 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repita a nova senha"
                      className="pl-9 h-11"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 h-11 min-h-[44px]"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Redefinir senha
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  O link de recuperação é inválido ou já expirou.
                </p>
                <Button asChild className="w-full bg-accent hover:bg-accent/90 h-11">
                  <Link to="/auth">Voltar ao login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-accent transition-colors">
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
