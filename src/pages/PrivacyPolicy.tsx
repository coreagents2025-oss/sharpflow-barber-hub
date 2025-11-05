import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to={`/${slug || ''}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p className="text-muted-foreground">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos 
              suas informações pessoais. Ao utilizar nossos serviços de agendamento, você concorda 
              com as práticas descritas nesta política, em conformidade com a Lei Geral de Proteção 
              de Dados (LGPD - Lei 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Dados Coletados</h2>
            <p className="text-muted-foreground mb-3">Coletamos as seguintes informações:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Dados de identificação:</strong> Nome completo, telefone e e-mail</li>
              <li><strong>Histórico de agendamentos:</strong> Serviços agendados, datas e horários</li>
              <li><strong>Comunicações:</strong> Mensagens trocadas via WhatsApp e e-mail</li>
              <li><strong>Dados técnicos:</strong> Endereço IP, navegador e dispositivo (para segurança)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Finalidade do Uso</h2>
            <p className="text-muted-foreground mb-3">Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Processar e confirmar agendamentos de serviços</li>
              <li>Enviar notificações e lembretes via WhatsApp e e-mail</li>
              <li>Melhorar nossos serviços e experiência do cliente</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground">
              <strong>Não compartilhamos</strong> seus dados pessoais com terceiros para fins comerciais. 
              Seus dados são armazenados em servidores seguros com infraestrutura de nuvem confiável, 
              e o acesso é restrito exclusivamente aos funcionários autorizados da barbearia para fins 
              de atendimento e gestão de agendamentos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground mb-3">De acordo com a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar a remoção dos seus dados</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Revogação:</strong> Retirar o consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Retenção de Dados</h2>
            <p className="text-muted-foreground">
              Mantemos seus dados enquanto houver relacionamento ativo conosco ou conforme 
              necessário para cumprir obrigações legais. O histórico de agendamentos é mantido 
              por até 5 anos para fins de auditoria e melhoria de serviços. Você pode solicitar 
              a exclusão dos seus dados a qualquer momento através dos nossos canais de contato.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Segurança</h2>
            <p className="text-muted-foreground mb-3">Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Acesso autenticado e controlado ao sistema</li>
              <li>Backups regulares e seguros</li>
              <li>Monitoramento contínuo de acessos e atividades suspeitas</li>
              <li>Conformidade com as melhores práticas de segurança da informação</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground">
              Utilizamos cookies essenciais para o funcionamento da plataforma, como manutenção 
              de sessão e preferências do usuário. Não utilizamos cookies de rastreamento ou 
              publicidade de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Alterações nesta Política</h2>
            <p className="text-muted-foreground">
              Reservamo-nos o direito de modificar esta Política de Privacidade a qualquer momento. 
              Alterações significativas serão comunicadas através dos nossos canais de contato. 
              A versão mais recente sempre estará disponível nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
            <p className="text-muted-foreground">
              Para exercer seus direitos, esclarecer dúvidas ou fazer solicitações relacionadas 
              à privacidade e proteção de dados, entre em contato através do e-mail ou telefone 
              disponível em nosso catálogo de serviços.
            </p>
          </section>

          <section className="mt-8 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
