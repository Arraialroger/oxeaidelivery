import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRestaurantBySlug } from "@/hooks/useRestaurant";

const TermsOfUse = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant } = useRestaurantBySlug(slug);
  
  const restaurantName = restaurant?.name || 'Restaurante';
  const whatsapp = restaurant?.whatsapp || restaurant?.phone || '(XX) XXXXX-XXXX';
  const backLink = slug ? `/${slug}/menu` : '/';
  
  const lastUpdated = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={backLink}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Termos de Uso</h1>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground mb-6">
            Última atualização: {lastUpdated}
          </p>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground mb-4">
              Ao acessar e utilizar o aplicativo {restaurantName}, você concorda em cumprir e estar 
              vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, 
              não deverá utilizar nosso aplicativo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground mb-4">
              O {restaurantName} é um aplicativo de delivery de alimentos que permite aos usuários:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Visualizar o cardápio de produtos disponíveis</li>
              <li>Realizar pedidos de alimentos para entrega</li>
              <li>Acompanhar o status dos pedidos em tempo real</li>
              <li>Gerenciar informações de conta e endereços de entrega</li>
              <li>Escolher formas de pagamento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground mb-4">
              Para utilizar nossos serviços, você deve:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Fornecer informações verdadeiras, precisas e completas</li>
              <li>Manter suas informações de cadastro atualizadas</li>
              <li>Ser responsável pela segurança de sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">4. Pedidos e Pagamentos</h2>
            <p className="text-muted-foreground mb-4">
              Ao realizar um pedido através do nosso aplicativo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Você concorda em pagar o valor total do pedido, incluindo taxa de entrega</li>
              <li>Os preços podem ser alterados sem aviso prévio</li>
              <li>Reservamo-nos o direito de recusar ou cancelar pedidos por motivos operacionais</li>
              <li>O pagamento deve ser realizado conforme as opções disponíveis no aplicativo</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">5. Entrega</h2>
            <p className="text-muted-foreground mb-4">
              Sobre o serviço de entrega:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Os tempos de entrega são estimativas e podem variar</li>
              <li>O cliente deve fornecer endereço completo e correto</li>
              <li>Alguém deve estar disponível para receber o pedido no local indicado</li>
              <li>A área de entrega é limitada à região de cobertura do estabelecimento</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">6. Cancelamentos e Reembolsos</h2>
            <p className="text-muted-foreground mb-4">
              Política de cancelamento:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Pedidos podem ser cancelados antes do início da preparação</li>
              <li>Após o início da preparação, o cancelamento está sujeito a análise</li>
              <li>Reembolsos, quando aplicáveis, serão processados conforme a forma de pagamento</li>
              <li>Problemas com o pedido devem ser reportados imediatamente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">7. Conduta do Usuário</h2>
            <p className="text-muted-foreground mb-4">
              Ao utilizar nosso aplicativo, você concorda em não:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Violar leis ou regulamentos aplicáveis</li>
              <li>Fornecer informações falsas ou enganosas</li>
              <li>Usar o serviço para fins ilegais ou não autorizados</li>
              <li>Interferir no funcionamento do aplicativo</li>
              <li>Tentar acessar áreas restritas do sistema</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">8. Propriedade Intelectual</h2>
            <p className="text-muted-foreground mb-4">
              Todo o conteúdo do aplicativo, incluindo textos, gráficos, logotipos, imagens e software, 
              é de propriedade do {restaurantName} ou de seus licenciadores e está protegido por leis 
              de propriedade intelectual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">9. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground mb-4">
              O {restaurantName} não será responsável por:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Danos indiretos, incidentais ou consequenciais</li>
              <li>Interrupções no serviço devido a fatores externos</li>
              <li>Atrasos causados por condições climáticas ou de trânsito</li>
              <li>Problemas decorrentes de informações incorretas fornecidas pelo usuário</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">10. Modificações dos Termos</h2>
            <p className="text-muted-foreground mb-4">
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
              As alterações entrarão em vigor imediatamente após a publicação no aplicativo. 
              O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">11. Lei Aplicável</h2>
            <p className="text-muted-foreground mb-4">
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será submetida à jurisdição dos tribunais competentes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">12. Contato</h2>
            <p className="text-muted-foreground mb-4">
              Para dúvidas sobre estes Termos de Uso, entre em contato conosco:
            </p>
            <ul className="list-none text-muted-foreground space-y-1">
              <li><strong>{restaurantName}</strong></li>
              <li>WhatsApp: {whatsapp}</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {restaurantName}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default TermsOfUse;
