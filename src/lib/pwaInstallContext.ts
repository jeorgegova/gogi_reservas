import { createContext } from 'react';

export interface PwaInstallContextValue {
  isInstalled: boolean;
  isInstallable: boolean;
  showPrompt: () => void;
}

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);
