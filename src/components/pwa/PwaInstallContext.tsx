/**
 * Contexto para compartir el estado de instalación PWA entre el modal automático
 * y cualquier botón manual que quiera abrir el modal.
 */

import { useMemo, type ReactNode } from 'react';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { PwaInstallContext, type PwaInstallContextValue } from '@/lib/pwaInstallContext';
import { PwaInstallModal } from './PwaInstallModal';

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const promptState = usePwaInstallPrompt();

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isInstalled: promptState.isInstalled,
      isInstallable: promptState.isInstallable,
      showPrompt: promptState.showPrompt,
    }),
    [promptState.isInstalled, promptState.isInstallable, promptState.showPrompt]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <PwaInstallModal promptState={promptState} />
    </PwaInstallContext.Provider>
  );
}
