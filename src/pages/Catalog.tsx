import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Layout, Save, Plus, Scissors as ScissorsIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_popular: boolean;
  is_active: boolean;
  image_url: string | null;
}

const Catalog = () => {
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    fetchBarbershopId();
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
    }
  }, [barbershopId]);

  const fetchBarbershopId = async () => {
    try {
      const { data } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user?.id)
        .single();
      
      setBarbershopId(data?.barbershop_id || null);
    } catch (error) {
      console.error('Error fetching barbershop_id:', error);
    }
  };

  const fetchServices = async () => {
    if (!barbershopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('barbershop_id', barbershopId)
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('Layout do catálogo salvo com sucesso!');
    setIsEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Catálogo Público</h1>
            <p className="text-muted-foreground">Visualize e edite o layout do seu catálogo</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/services', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualizar
            </Button>
            
            {isEditMode ? (
              <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">
                <Save className="h-4 w-4 mr-2" />
                Salvar Layout
              </Button>
            ) : (
              <Button onClick={() => setIsEditMode(true)} className="bg-accent hover:bg-accent/90">
                <Layout className="h-4 w-4 mr-2" />
                Editar Layout
              </Button>
            )}
          </div>
        </div>

        {isEditMode && (
          <Card className="mb-6 border-accent">
            <CardHeader>
              <CardTitle className="text-accent">Modo de Edição Ativo</CardTitle>
              <CardDescription>
                Funcionalidade de arrastar e soltar em desenvolvimento
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Layout do Catálogo</CardTitle>
            <CardDescription>
              Editor visual com arrastar e soltar será implementado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-16">
                <ScissorsIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum serviço cadastrado</p>
                <p className="text-muted-foreground mb-6">
                  Comece adicionando serviços para exibir no catálogo público
                </p>
                <Button asChild className="bg-accent hover:bg-accent/90">
                  <Link to="/services-management">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Serviços
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="p-6 rounded-lg border bg-card hover:shadow-lg transition-all"
                  >
                    {service.image_url && (
                      <img
                        src={service.image_url}
                        alt={service.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <div className="flex gap-2 mb-3">
                      {service.is_popular && (
                        <Badge variant="secondary">Popular</Badge>
                      )}
                      <Badge variant="outline">{service.name}</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">{service.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {service.description || 'Sem descrição'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-accent">
                        R$ {Number(service.price).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {service.duration_minutes} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Catalog;
