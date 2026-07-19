import { useContext } from 'react';
import { PwaInstallContext, type PwaInstallContextValue } from '@/lib/pwaInstallContext';

export function usePwaInstallContext(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error('usePwaInstallContext debe usarse dentro de PwaInstallProvider');
  }
  return context;
}
