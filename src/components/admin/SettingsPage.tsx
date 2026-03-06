import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RestaurantProfileForm } from './RestaurantProfileForm';
import { ConfigForm } from './ConfigForm';
import { PaymentSettingsForm } from './PaymentSettingsForm';
import { IntegrationsForm } from './IntegrationsForm';
import { Store, Settings2, CreditCard, BarChart3 } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Configurações</h2>
      
      <Accordion type="single" collapsible defaultValue="profile" className="space-y-3">
        <AccordionItem value="profile" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="font-medium">Perfil do Restaurante</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <RestaurantProfileForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="operation" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Operação</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ConfigForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payment" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="font-medium">Pagamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <PaymentSettingsForm />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="integrations" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="font-medium">Integrações & Rastreamento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <IntegrationsForm />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
