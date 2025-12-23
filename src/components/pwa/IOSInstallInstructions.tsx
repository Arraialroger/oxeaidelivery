import { Share, PlusSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface IOSInstallInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IOSInstallInstructions({ isOpen, onClose }: IOSInstallInstructionsProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Instalar App no iPhone</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-center text-muted-foreground text-sm">
            Siga os passos abaixo para instalar o app na tela inicial do seu iPhone:
          </p>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4 p-3 bg-secondary rounded-lg">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Toque no botão Compartilhar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  É o ícone <Share className="inline w-4 h-4" /> na barra inferior do Safari
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4 p-3 bg-secondary rounded-lg">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Toque em "Adicionar à Tela de Início"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <PlusSquare className="inline w-4 h-4" /> Role para baixo para encontrar a opção
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 p-3 bg-secondary rounded-lg">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Confirme tocando em "Adicionar"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pronto! O app aparecerá na sua tela inicial
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
