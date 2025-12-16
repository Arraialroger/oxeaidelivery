import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function PWAInstallButton({ variant = 'outline', size = 'sm', className }: PWAInstallButtonProps) {
  const { canShowInstallUI, promptInstall } = usePWAInstall();

  if (!canShowInstallUI) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={promptInstall}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Instalar App
    </Button>
  );
}
