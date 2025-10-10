import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface DomainSetupGuideProps {
  open: boolean;
  onClose: () => void;
}

export const DomainSetupGuide = ({ open, onClose }: DomainSetupGuideProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Como Configurar Seu Domínio Personalizado</DialogTitle>
          <DialogDescription>
            Siga estes passos para conectar seu próprio domínio ao catálogo
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Passo 1: Registre seu domínio</h3>
            <p className="text-sm text-muted-foreground">
              Se ainda não possui, registre um domínio em provedores como Registro.br, GoDaddy, Hostinger ou Namecheap.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Passo 2: Configure os registros DNS</h3>
            <p className="text-sm text-muted-foreground mb-3">
              No painel do seu provedor de domínio, adicione o seguinte registro DNS:
            </p>
            
            <div className="bg-muted p-4 rounded-lg space-y-1 font-mono text-sm">
              <div><strong>Tipo:</strong> A</div>
              <div><strong>Nome:</strong> @ (ou seu subdomínio, ex: catalogo)</div>
              <div><strong>Valor:</strong> 185.158.133.1</div>
              <div className="text-xs text-muted-foreground mt-2">
                Para subdomínios como "catalogo.seudomain.com", coloque "catalogo" no campo Nome
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Passo 3: Aguarde a propagação DNS</h3>
            <p className="text-sm text-muted-foreground">
              A propagação DNS pode levar de 24 a 48 horas. Durante esse período, seu domínio pode não funcionar imediatamente.
            </p>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Ferramentas Úteis
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Use estas ferramentas para verificar o status da propagação DNS:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>
                <a 
                  href="https://dnschecker.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  DNSChecker.org
                </a>
              </li>
              <li>
                <a 
                  href="https://www.whatsmydns.net" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  WhatsMyDNS.net
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
            <h4 className="font-semibold mb-2">💡 Dicas Importantes</h4>
            <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
              <li>Certifique-se de que não há outros registros A conflitantes</li>
              <li>Se usar CDN (como Cloudflare), desative o proxy temporariamente durante a configuração</li>
              <li>Após a propagação, seu catálogo estará acessível em seu domínio personalizado</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};