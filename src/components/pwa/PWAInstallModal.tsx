import { useState } from 'react';
import { Download, Smartphone, Zap, Bell, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IOSInstallInstructions } from './IOSInstallInstructions';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  variant?: 'second-visit' | 'after-order';
  isIOSSafari?: boolean;
}

export function PWAInstallModal({ isOpen, onClose, onInstall, variant = 'second-visit', isIOSSafari = false }: PWAInstallModalProps) {
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleInstall = async () => {
    if (isIOSSafari) {
      onClose();
      setShowIOSInstructions(true);
    } else {
      await onInstall();
      onClose();
    }
  };

  const title = variant === 'after-order' 
    ? 'Instale para pedir mais rápido!' 
    : 'Instale o App do Astral Gastro Bar';

  const description = variant === 'after-order'
    ? 'Seu pedido foi enviado! Instale o app e peça seu próximo pedido com um toque.'
    : 'Tenha o Astral Gastro Bar sempre à mão na sua tela inicial.';

  return (
    <>
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
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 p-2 rounded-full">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <span>Resgate seus brindes de fidelidade</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleInstall} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isIOSSafari ? 'Ver instruções' : 'Instalar Agora'}
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground">
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <IOSInstallInstructions 
        isOpen={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />
    </>
  );
}
