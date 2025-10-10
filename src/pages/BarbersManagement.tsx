import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Pencil, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Barber {
  id: string;
  user_id: string;
  barbershop_id: string;
  bio: string | null;
  specialty: string | null;
  photo_url: string | null;
  is_available: boolean;
  profiles: {
    full_name: string;
    phone: string | null;
  };
}

const BarbersManagement = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({
    bio: '',
    specialty: '',
    photo_url: '',
    is_available: true,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    setLoading(true);
    try {
      // Buscar barbershop_id do usuário atual
      const { data: barberData } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user?.id)
        .single();

      if (!barberData?.barbershop_id) {
        toast.error('Erro: Barbearia não encontrada');
        return;
      }

      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          profiles!inner(full_name, phone)
        `)
        .eq('barbershop_id', barberData.barbershop_id);

      if (error) throw error;
      setBarbers(data as any || []);
    } catch (error: any) {
      console.error('Error fetching barbers:', error);
      toast.error('Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setFormData({
      bio: barber.bio || '',
      specialty: barber.specialty || '',
      photo_url: barber.photo_url || '',
      is_available: barber.is_available,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBarber(null);
    setFormData({
      bio: '',
      specialty: '',
      photo_url: '',
      is_available: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingBarber) return;

    try {
      const { error } = await supabase
        .from('barbers')
        .update({
          bio: formData.bio || null,
          specialty: formData.specialty || null,
          photo_url: formData.photo_url || null,
          is_available: formData.is_available,
        })
        .eq('id', editingBarber.id);

      if (error) throw error;

      toast.success('Barbeiro atualizado com sucesso!');
      setDialogOpen(false);
      setEditingBarber(null);
      fetchBarbers();
    } catch (error: any) {
      console.error('Error updating barber:', error);
      toast.error('Erro ao atualizar barbeiro');
    }
  };

  const toggleAvailability = async (barber: Barber) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ is_available: !barber.is_available })
        .eq('id', barber.id);

      if (error) throw error;

      toast.success(
        barber.is_available
          ? 'Barbeiro marcado como indisponível'
          : 'Barbeiro marcado como disponível'
      );
      fetchBarbers();
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      toast.error('Erro ao atualizar disponibilidade');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestão de Barbeiros</h1>
            <p className="text-muted-foreground">Gerencie a equipe da sua barbearia</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Barbeiro
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-medium mb-2">Nenhum barbeiro cadastrado</p>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Os barbeiros devem ser adicionados através do sistema de cadastro de usuários com a role "barber"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <Card key={barber.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                        {barber.photo_url ? (
                          <img
                            src={barber.photo_url}
                            alt={barber.profiles?.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-accent" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{barber.profiles?.full_name || 'Sem nome'}</CardTitle>
                        <CardDescription>{barber.specialty || 'Sem especialidade'}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {barber.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{barber.bio}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={barber.is_available ? 'default' : 'secondary'}>
                      {barber.is_available ? (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Disponível
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3 mr-1" />
                          Indisponível
                        </>
                      )}
                    </Badge>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(barber)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={barber.is_available ? 'secondary' : 'default'}
                        onClick={() => toggleAvailability(barber)}
                      >
                        {barber.is_available ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingBarber ? 'Editar Barbeiro' : 'Adicionar Barbeiro'}</DialogTitle>
              <DialogDescription>
                {editingBarber 
                  ? 'Atualize as informações do barbeiro' 
                  : 'Para adicionar um novo barbeiro, primeiro crie um usuário com a role "barber" no sistema. Depois você poderá editar suas informações aqui.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  placeholder="Ex: Cortes clássicos, Barba"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Breve descrição sobre o barbeiro..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="photo_url">URL da Foto</Label>
                <Input
                  id="photo_url"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <Label htmlFor="is_available" className="cursor-pointer">
                  Barbeiro disponível para agendamentos
                </Label>
                <Switch
                  id="is_available"
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BarbersManagement;
