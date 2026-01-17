import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Política de Privacidade</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              Bem-vindo ao Astral Gastro Bar. Esta Política de Privacidade descreve como coletamos, 
              usamos, armazenamos e protegemos suas informações pessoais quando você utiliza 
              nosso aplicativo de delivery.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ao usar nosso aplicativo, você concorda com a coleta e uso de informações de 
              acordo com esta política.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">2. Informações que Coletamos</h2>
            
            <h3 className="text-lg font-medium text-foreground">2.1 Informações Fornecidas por Você</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Nome completo</li>
              <li>Número de telefone</li>
              <li>Endereço de entrega (rua, número, bairro, complemento, ponto de referência)</li>
              <li>Histórico de pedidos</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Informações do dispositivo (modelo, sistema operacional)</li>
              <li>Dados de uso do aplicativo</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">3. Como Usamos Suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos suas informações para:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Processar e entregar seus pedidos</li>
              <li>Entrar em contato sobre seu pedido</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Enviar notificações sobre o status do pedido</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">4. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros 
              para fins de marketing. Podemos compartilhar suas informações apenas:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Com entregadores para realizar a entrega do pedido</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger nossos direitos e segurança</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas 
              informações pessoais contra acesso não autorizado, alteração, divulgação ou 
              destruição. Utilizamos criptografia e servidores seguros para armazenar seus dados.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">6. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir as 
              finalidades descritas nesta política, a menos que um período de retenção mais 
              longo seja exigido ou permitido por lei.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">7. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar seu consentimento</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
              lembrar suas preferências e analisar o uso do aplicativo. Você pode configurar 
              seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">9. Menores de Idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nosso aplicativo não é direcionado a menores de 18 anos. Não coletamos 
              intencionalmente informações de menores de idade. Se tomarmos conhecimento de 
              que coletamos dados de um menor, tomaremos medidas para excluir essas informações.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">10. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos 
              você sobre quaisquer alterações publicando a nova política nesta página e 
              atualizando a data de "última atualização".
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos 
              seus dados, entre em contato conosco:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-foreground font-medium">Astral Gastro Bar</p>
              <p className="text-muted-foreground">E-mail: contato@astralgastrobar.com.br</p>
              <p className="text-muted-foreground">WhatsApp: (XX) XXXXX-XXXX</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-8 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Astral Gastro Bar. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;