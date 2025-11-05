import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
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

        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground">
              Ao acessar e utilizar nosso serviço de agendamento online, você concorda em cumprir 
              e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte 
              destes termos, não deverá utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground">
              Oferecemos uma plataforma digital para agendamento de serviços de barbearia, 
              permitindo que clientes visualizem serviços disponíveis, verifiquem horários 
              e realizem reservas online. O serviço inclui confirmações via WhatsApp e e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Você é responsável por fornecer informações precisas e atualizadas</li>
              <li>Mantenha seus dados de contato (telefone e e-mail) sempre atualizados</li>
              <li>Você é responsável pela segurança das suas informações pessoais</li>
              <li>Notifique-nos imediatamente sobre qualquer uso não autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Agendamentos</h2>
            <p className="text-muted-foreground mb-3"><strong>4.1 Realização de Agendamentos:</strong></p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Os agendamentos estão sujeitos à disponibilidade de horários</li>
              <li>Você receberá confirmação via WhatsApp e/ou e-mail</li>
              <li>Reserve apenas horários que tenha real intenção de comparecer</li>
            </ul>

            <p className="text-muted-foreground mb-3"><strong>4.2 Cancelamentos e Alterações:</strong></p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cancelamentos devem ser feitos com <strong>no mínimo 2 horas de antecedência</strong></li>
              <li>Cancelamentos tardios ou ausências podem resultar em restrições futuras</li>
              <li>Alterações de horário estão sujeitas à disponibilidade</li>
              <li>Entre em contato diretamente via WhatsApp para cancelar ou reagendar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Política de Ausência (No-Show)</h2>
            <p className="text-muted-foreground">
              Caso não compareça ao horário agendado sem cancelamento prévio por <strong>2 ou mais vezes</strong>, 
              reservamo-nos o direito de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Suspender temporariamente sua capacidade de realizar novos agendamentos</li>
              <li>Exigir confirmação adicional para agendamentos futuros</li>
              <li>Solicitar pagamento antecipado para reservas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Pagamentos</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Os preços exibidos estão sujeitos a alterações sem aviso prévio</li>
              <li>O pagamento é realizado presencialmente no estabelecimento</li>
              <li>Formas de pagamento aceitas serão informadas no local</li>
              <li>Não realizamos cobranças antecipadas, salvo casos específicos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Uso Adequado da Plataforma</h2>
            <p className="text-muted-foreground mb-3">Você concorda em NÃO:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fazer agendamentos falsos ou em nome de terceiros sem autorização</li>
              <li>Utilizar a plataforma para fins ilegais ou não autorizados</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Interferir no funcionamento normal da plataforma</li>
              <li>Coletar informações de outros usuários</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Comunicações</h2>
            <p className="text-muted-foreground">
              Ao utilizar nossos serviços, você concorda em receber:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Confirmações de agendamento via WhatsApp e e-mail</li>
              <li>Lembretes de compromissos agendados</li>
              <li>Notificações importantes sobre seus agendamentos</li>
              <li>Mensagens promocionais (você pode cancelar a qualquer momento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              A plataforma é oferecida "como está". Não nos responsabilizamos por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Falhas técnicas ou indisponibilidade temporária do sistema</li>
              <li>Erros de comunicação com provedores de WhatsApp ou e-mail</li>
              <li>Perdas ou danos decorrentes do uso inadequado da plataforma</li>
              <li>Atrasos ou problemas causados por terceiros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Propriedade Intelectual</h2>
            <p className="text-muted-foreground">
              Todo o conteúdo da plataforma, incluindo textos, imagens, logotipos e design, 
              é de propriedade exclusiva da barbearia e está protegido por leis de direitos 
              autorais. É proibida a reprodução sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Modificações nos Termos</h2>
            <p className="text-muted-foreground">
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
              Alterações entram em vigor imediatamente após publicação. O uso continuado da 
              plataforma após modificações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Suspensão e Término</h2>
            <p className="text-muted-foreground">
              Reservamo-nos o direito de suspender ou cancelar seu acesso à plataforma em 
              caso de violação destes termos, uso inadequado ou comportamento abusivo, sem 
              aviso prévio e sem qualquer responsabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Lei Aplicável</h2>
            <p className="text-muted-foreground">
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será resolvida no foro da comarca do estabelecimento.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contato</h2>
            <p className="text-muted-foreground">
              Para dúvidas, sugestões ou reclamações sobre estes Termos de Uso, entre em 
              contato através do e-mail ou telefone disponível em nosso catálogo de serviços.
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

export default TermsOfService;
