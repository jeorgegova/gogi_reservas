import { Download, Smartphone, X, Share2, PlusSquare, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import type { PwaInstallState } from '@/hooks/usePwaInstallPrompt';

export function PwaInstallModal({ promptState }: { promptState: PwaInstallState }) {
  const { shouldShowPrompt, isInstalled, isIOS, deferredPrompt, dismiss, promptInstall } = promptState;

  if (!shouldShowPrompt || isInstalled) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header con icono */}
          <div className="bg-slate-900 p-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Instala GoGi Reservas</h2>
            <p className="text-slate-300 text-sm mt-1">
              Accede más rápido y recibe notificaciones directamente en tu dispositivo.
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {isIOS ? (
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  En iPhone o iPad, instala la app desde Safari:
                </p>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-xs">1</span>
                    <span>Toca el icono <Share2 className="h-4 w-4 inline mx-1 text-blue-500" /> Compartir en la barra de Safari.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-xs">2</span>
                    <span>Selecciona <strong>Agregar a la pantalla de inicio</strong> <PlusSquare className="h-4 w-4 inline mx-1 text-blue-500" />.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-slate-600 space-y-3">
                <p>
                  Instala GoGi Reservas como una aplicación en tu dispositivo para:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Abrir la app desde tu pantalla de inicio.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Recibir notificaciones de tus reservas.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Navegar más rápido sin depender del navegador.
                  </li>
                </ul>

                {/* Instrucciones manuales si el navegador no ofrece instalación nativa */}
                {!deferredPrompt && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                    <p className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-slate-400" />
                      <strong>¿No ves el botón de instalar?</strong>
                    </p>
                    <p>
                      En Chrome/Edge de escritorio o si ya descartaste el banner, abre el menú del navegador y selecciona <strong>Instalar GoGi Reservas</strong> o <strong>Agregar a la pantalla de inicio</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={dismiss}
                className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                Ahora no
              </Button>
              {!isIOS && (
                <Button
                  onClick={promptInstall}
                  disabled={!deferredPrompt}
                  className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar
                </Button>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
