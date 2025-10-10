import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Layout, Save } from 'lucide-react';
import { toast } from 'sonner';

const Catalog = () => {
  const [isEditMode, setIsEditMode] = useState(false);

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="p-6 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 hover:border-accent/50 transition-colors cursor-move"
                >
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="secondary">Serviço {item}</Badge>
                    {isEditMode && <Badge variant="outline">Arrastar</Badge>}
                  </div>
                  <h3 className="font-semibold mb-2">Exemplo de Serviço</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Descrição do serviço aqui
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-accent">R$ 50,00</span>
                    <span className="text-sm text-muted-foreground">45 min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Catalog;
