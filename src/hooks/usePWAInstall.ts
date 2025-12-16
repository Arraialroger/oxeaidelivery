import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VISIT_COUNT_KEY = 'bruttus_visit_count';
const INSTALL_DISMISSED_KEY = 'bruttus_install_dismissed';
const LAST_VISIT_KEY = 'bruttus_last_visit';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [visitCount, setVisitCount] = useState(1);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Check if dismissed recently (within 24h)
    const dismissedAt = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
      }
    }

    // Track visit count
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    const today = new Date().toDateString();
    
    if (lastVisit !== today) {
      const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
      const newCount = currentCount + 1;
      localStorage.setItem(VISIT_COUNT_KEY, newCount.toString());
      localStorage.setItem(LAST_VISIT_KEY, today);
      setVisitCount(newCount);
    } else {
      const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '1', 10);
      setVisitCount(currentCount);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
    setIsDismissed(true);
  }, []);

  const shouldShowSecondVisitPrompt = visitCount >= 2 && isInstallable && !isInstalled && !isDismissed;
  const canShowInstallUI = isInstallable && !isInstalled;

  return {
    isInstallable,
    isInstalled,
    visitCount,
    isDismissed,
    promptInstall,
    dismissInstall,
    shouldShowSecondVisitPrompt,
    canShowInstallUI,
  };
}
