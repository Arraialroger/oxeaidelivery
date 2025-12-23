import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallInstructions } from './IOSInstallInstructions';

export function PWAInstallBanner() {
  const { canShowInstallUI, canShowIOSInstallUI, isDismissed, promptInstall, dismissInstall, isIOSSafari } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Mostrar para Android/Chrome ou para iOS/Safari
  const shouldShow = (canShowInstallUI || canShowIOSInstallUI) && !isDismissed;

  if (!shouldShow) return null;

  const handleInstallClick = () => {
    if (isIOSSafari) {
      setShowIOSInstructions(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/30 px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-screen-lg mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-primary/20 p-2 rounded-full shrink-0">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-foreground truncate">
              <span className="font-semibold">Abra direto da tela inicial.</span>{' '}
              <span className="text-muted-foreground hidden sm:inline">Instale o App!</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="text-xs h-8"
            >
              Instalar
            </Button>
            <button
              onClick={dismissInstall}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <IOSInstallInstructions 
        isOpen={showIOSInstructions} 
        onClose={() => setShowIOSInstructions(false)} 
      />
    </>
  );
}
