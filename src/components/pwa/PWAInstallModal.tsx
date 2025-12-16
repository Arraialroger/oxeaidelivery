import { Download, Smartphone, Zap, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  variant?: 'second-visit' | 'after-order';
}

export function PWAInstallModal({ isOpen, onClose, onInstall, variant = 'second-visit' }: PWAInstallModalProps) {
  const handleInstall = async () => {
    await onInstall();
    onClose();
  };

  const title = variant === 'after-order' 
    ? 'Instale para pedir mais rápido!' 
    : 'Instale o App da Bruttus Delivery';

  const description = variant === 'after-order'
    ? 'Seu pedido foi enviado! Instale o app e peça seu próximo lanche com um toque.'
    : 'Tenha a Bruttus Delivery sempre à mão na sua tela inicial.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/20 p-4 rounded-full w-fit">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-primary/10 p-2 rounded-full">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span>Acesso rápido direto da tela inicial</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-primary/10 p-2 rounded-full">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <span>Acompanhe seus pedidos em tempo real</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-primary/10 p-2 rounded-full">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <span>Funciona mesmo sem internet</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Instalar Agora
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
