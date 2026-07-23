import { Download } from 'lucide-react';
import { usePwaInstallContext } from '@/hooks/usePwaInstallContext';

interface PwaInstallButtonProps {
  className?: string;
}

export function PwaInstallButton({ className = '' }: PwaInstallButtonProps) {
  const { isInstalled, isInstallable, showPrompt } = usePwaInstallContext();

  if (isInstalled || !isInstallable) return null;

  return (
    <button
      type="button"
      onClick={showPrompt}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
        text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors
        ${className}
      `}
    >
      <Download className="w-4 h-4" />
      Instalar app
    </button>
  );
}
