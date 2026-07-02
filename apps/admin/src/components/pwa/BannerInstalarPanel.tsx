/**
 * BannerInstalarPanel.tsx
 * =======================
 * Banner descartable que ofrece instalar el Panel Admin como PWA.
 *
 * - Android/Chrome/Edge: usa el prompt nativo capturado en el store.
 * - iPhone/iPad (Safari): muestra un instructivo (Compartir → "Agregar a
 *   pantalla de inicio").
 *
 * Se monta una sola vez a nivel global (App.tsx). Se auto-oculta cuando el
 * Panel ya corre instalado (standalone). El descarte no se persiste: al
 * refrescar/reabrir vuelve a salir mientras no esté instalado.
 *
 * Ubicación: apps/admin/src/components/pwa/BannerInstalarPanel.tsx
 */

import { useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { usePWAInstallPanelStore } from '../../stores/usePWAInstallPanelStore';

export function BannerInstalarPanel() {
  const bannerVisible = usePWAInstallPanelStore((s) => s.bannerVisible);
  const esIOS = usePWAInstallPanelStore((s) => s.esIOS);
  const instalar = usePWAInstallPanelStore((s) => s.instalar);
  const descartarBanner = usePWAInstallPanelStore((s) => s.descartarBanner);

  const [mostrarInstruccionesIOS, setMostrarInstruccionesIOS] = useState(false);

  const handleInstalar = async () => {
    if (esIOS) {
      setMostrarInstruccionesIOS(true);
      return;
    }
    await instalar();
  };

  return (
    <>
      {bannerVisible && (
        <div
          className="fixed inset-x-4 bottom-4 z-[900] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm"
          role="dialog"
          aria-label="Instalar el Panel"
          data-testid="banner-instalar-panel"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <img
              src="/icons/panel-192.png"
              alt="Panel AnunciaYA"
              className="h-11 w-11 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Instala el Panel</p>
              <p className="truncate text-xs text-slate-400">
                Acceso directo desde tu pantalla de inicio.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstalar}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              data-testid="banner-instalar-panel-boton"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              {esIOS ? 'Ver cómo' : 'Instalar'}
            </button>
            <button
              type="button"
              onClick={descartarBanner}
              className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              aria-label="Descartar"
              data-testid="banner-instalar-panel-cerrar"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Instructivo iOS — Safari no tiene prompt nativo */}
      {mostrarInstruccionesIOS && (
        <div
          className="fixed inset-0 z-[1002] flex items-end justify-center bg-black/60 p-4 lg:items-center"
          onClick={() => setMostrarInstruccionesIOS(false)}
          data-testid="modal-instalar-panel-ios"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <img src="/icons/panel-192.png" alt="Panel" className="h-10 w-10 rounded-xl" />
              <div>
                <p className="text-base font-semibold text-white">Instalar en iPhone</p>
                <p className="text-xs text-slate-400">Solo toma 2 pasos en Safari</p>
              </div>
            </div>

            <ol className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-400">
                  1
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-200">
                  Toca el botón
                  <Share className="h-4 w-4 text-blue-400" strokeWidth={2} />
                  <b>Compartir</b>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-sm font-bold text-blue-400">
                  2
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-200">
                  Elige
                  <Plus className="h-4 w-4 text-blue-400" strokeWidth={2} />
                  <b>Agregar a inicio</b>
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setMostrarInstruccionesIOS(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default BannerInstalarPanel;
