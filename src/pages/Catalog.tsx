import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface CatalogSettings {
  id?: string;
  barbershop_id: string;
  theme_color: string;
  logo_url: string | null;
  hero_image_url: string | null;
  show_popular_badge: boolean;
}

const Catalog = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CatalogSettings>({
    barbershop_id: '',
    theme_color: '#8B4513',
    logo_url: null,
    hero_image_url: null,
    show_popular_badge: true,
  });

  useEffect(() => {
    if (user) {
      fetchBarbershopAndSettings();
    }
  }, [user]);

  const fetchBarbershopAndSettings = async () => {
    setLoading(true);
    try {
      const { data: barberData } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (barberData?.barbershop_id) {
        setBarbershopId(barberData.barbershop_id);

        const { data: settingsData } = await supabase
          .from('catalog_settings')
          .select('*')
          .eq('barbershop_id', barberData.barbershop_id)
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData);
        } else {
          setSettings(prev => ({ ...prev, barbershop_id: barberData.barbershop_id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!barbershopId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('catalog_settings')
        .upsert({
          ...settings,
          barbershop_id: barbershopId,
        });

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <div className="text-center">Carregando configurações...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Editor do Catálogo</h1>
            <p className="text-muted-foreground">Configure a aparência do seu catálogo público</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open('/catalogo', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Catálogo Público
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-accent hover:bg-accent/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Personalização Visual
              </CardTitle>
              <CardDescription>
                Configure cores, imagens e elementos visuais do catálogo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme-color">Cor do Tema</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="theme-color"
                    type="color"
                    value={settings.theme_color}
                    onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.theme_color}
                    onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                    placeholder="#8B4513"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-url">URL do Logo</Label>
                <Input
                  id="logo-url"
                  type="url"
                  value={settings.logo_url || ''}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-image">URL da Imagem Hero</Label>
                <Input
                  id="hero-image"
                  type="url"
                  value={settings.hero_image_url || ''}
                  onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                  placeholder="https://exemplo.com/hero.jpg"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-popular">Mostrar Badge "Popular"</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir badge nos serviços marcados como populares
                  </p>
                </div>
                <Switch
                  id="show-popular"
                  checked={settings.show_popular_badge}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_popular_badge: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview do Catálogo</CardTitle>
              <CardDescription>
                Visualização em tempo real das suas configurações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  Clique em "Visualizar Catálogo Público" para ver como ficará para seus clientes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Catalog;
