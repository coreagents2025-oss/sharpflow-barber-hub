import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: 'client' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  userRole: string | null;
  barbershopId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setRoleLoading(true);
          // Fetch user role and barbershop
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            setUserRole(roleData?.role ?? null);

            // Fetch barbershop_id for admin/barber users
            if (roleData?.role === 'admin' || roleData?.role === 'barber') {
              const { data: staffData } = await supabase
                .from('barbershop_staff')
                .select('barbershop_id')
                .eq('user_id', session.user.id)
                .single();
              
              setBarbershopId(staffData?.barbershop_id ?? null);
            } else {
              setBarbershopId(null);
            }
            setRoleLoading(false);
          }, 0);
        } else {
          setUserRole(null);
          setBarbershopId(null);
          setRoleLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setRoleLoading(true);
        setTimeout(async () => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          setUserRole(roleData?.role ?? null);

          // Fetch barbershop_id for admin/barber users
          if (roleData?.role === 'admin' || roleData?.role === 'barber') {
            const { data: staffData } = await supabase
              .from('barbershop_staff')
              .select('barbershop_id')
              .eq('user_id', session.user.id)
              .single();
            
            setBarbershopId(staffData?.barbershop_id ?? null);
          } else {
            setBarbershopId(null);
          }
          setRoleLoading(false);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Login realizado com sucesso!');
      navigate('/pdv');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'client' | 'admin' = 'client') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role, // Passa role para o trigger handle_new_user
          },
        },
      });

      if (error) throw error;
      
      if (role === 'admin') {
        toast.success('Barbearia criada! Você já pode fazer login.');
      } else {
        toast.success('Cadastro realizado! Você já pode fazer login.');
      }
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message || 'Erro ao criar conta');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, userRole, barbershopId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};