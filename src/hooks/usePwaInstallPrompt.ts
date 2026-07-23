/**
 * Hook para detectar si la PWA puede instalarse y mostrar el prompt nativo.
 * Captura el evento `beforeinstallprompt` y determina si la app ya está instalada.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = 'gogi-pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const FALLBACK_DELAY_MS = 3500; // 3.5 segundos

export interface PwaInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  dismiss: () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  showPrompt: () => void;
  shouldShowPrompt: boolean;
}

function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    // iOS Safari
    ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
}

function wasRecentlyDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!dismissedAt) return false;
    const dismissedTime = parseInt(dismissedAt, 10);
    return Date.now() - dismissedTime < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function usePwaInstallPrompt(): PwaInstallState {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => wasRecentlyDismissed());
  const [isInstalled, setIsInstalled] = useState(isAppInstalled);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isIOS = useMemo(() => isIOSDevice(), []);
  const hasShownRef = useRef(false);

  const showPrompt = useCallback(() => {
    if (!isInstalled && !isDismissed) {
      hasShownRef.current = true;
      setIsVisible(true);
    }
  }, [isInstalled, isDismissed]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!isInstalled && !isDismissed && !hasShownRef.current) {
        showPrompt();
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsVisible(false);
    };

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches);
      if (event.matches) setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mql.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener('change', handleDisplayModeChange);
    };
  }, [isInstalled, isDismissed, showPrompt]);

  // Fallback solo para iOS: Apple no expone prompt nativo, así que allí sí mostramos
  // instrucciones. En Android/desktop evitamos un botón de instalar sin prompt nativo.
  useEffect(() => {
    if (!isIOS || isInstalled || isDismissed || hasShownRef.current) return;
    const timer = setTimeout(() => {
      if (!hasShownRef.current && !isInstalled && !isDismissed) {
        showPrompt();
      }
    }, FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isIOS, isInstalled, isDismissed, showPrompt]);

  const dismiss = useCallback(() => {
    markDismissed();
    setIsDismissed(true);
    setIsVisible(false);
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      return 'unavailable';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      } else {
        markDismissed();
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
      setIsVisible(false);
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt) || isIOS,
    isInstalled,
    isIOS,
    deferredPrompt,
    dismiss,
    promptInstall,
    showPrompt,
    shouldShowPrompt: isVisible,
  };
}
