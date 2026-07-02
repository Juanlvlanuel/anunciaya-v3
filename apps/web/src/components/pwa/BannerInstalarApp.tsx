/**
 * BannerInstalarApp.tsx
 * =====================
 * Banner descartable que ofrece instalar la PWA principal de AnunciaYA.
 *
 * - Android/Chrome: usa el prompt nativo capturado en `usePWAInstallStore`.
 * - iPhone/iPad (Safari): no hay prompt nativo → muestra un instructivo
 *   (Compartir → "Agregar a pantalla de inicio").
 *
 * Se monta una sola vez a nivel global (RootLayout). No se muestra en rutas
 * de ScanYA (tiene su propio flujo de instalación), ni dentro del iframe de
 * preview, ni cuando la app ya corre instalada (standalone).
 *
 * Ubicación: apps/web/src/components/pwa/BannerInstalarApp.tsx
 */

import { useLocation } from 'react-router-dom';
import { X, Download, Share, Plus } from 'lucide-react';
import { usePWAInstallStore } from '../../stores/usePWAInstallStore';
import { useAuthStore } from '../../stores/useAuthStore';

export function BannerInstalarApp() {
  const { pathname, search } = useLocation();

  // Solo se ofrece la instalación ANTES de iniciar sesión (landing/públicas).
  // Con sesión activa no debe aparecer en ninguna página.
  const usuario = useAuthStore((s) => s.usuario);

  const bannerVisible = usePWAInstallStore((s) => s.bannerVisible);
  const esIOS = usePWAInstallStore((s) => s.esIOS);
  const instalar = usePWAInstallStore((s) => s.instalar);
  const descartarBanner = usePWAInstallStore((s) => s.descartarBanner);
  const instruccionesIOSVisible = usePWAInstallStore((s) => s.instruccionesIOSVisible);
  const abrirInstruccionesIOS = usePWAInstallStore((s) => s.abrirInstruccionesIOS);
  const cerrarInstruccionesIOS = usePWAInstallStore((s) => s.cerrarInstruccionesIOS);

  // Guardas: ScanYA tiene su propio flujo, y el iframe de preview no aplica.
  const esRutaScanYA = pathname.startsWith('/scanya');
  const esPreviewIframe = new URLSearchParams(search).has('preview');

  // Con sesión iniciada no se muestra en ninguna página (solo antes de login).
  if (usuario || esRutaScanYA || esPreviewIframe) return null;

  const handleInstalar = async () => {
    if (esIOS) {
      abrirInstruccionesIOS();
      return;
    }
    await instalar();
  };

  return (
    <>
      {/* Banner flotante — libra el BottomNav en móvil, esquina inferior en desktop */}
      {bannerVisible && (
      <div
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] z-[900] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm"
        role="dialog"
        aria-label="Instalar AnunciaYA"
        data-testid="banner-instalar-app"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <img
            src="/icons/anunciaya-192.png"
            alt="AnunciaYA"
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Instala AnunciaYA</p>
            <p className="truncate text-xs text-slate-500">
              Acceso directo desde tu pantalla de inicio.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstalar}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 lg:cursor-pointer"
            data-testid="banner-instalar-boton"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            {esIOS ? 'Ver cómo' : 'Instalar'}
          </button>
          <button
            type="button"
            onClick={descartarBanner}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 lg:cursor-pointer"
            aria-label="Descartar"
            data-testid="banner-instalar-cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      )}

      {/* Instructivo iOS — Safari no tiene prompt nativo */}
      {instruccionesIOSVisible && (
        <div
          className="fixed inset-0 z-[1002] flex items-end justify-center bg-black/50 p-4 lg:items-center"
          onClick={cerrarInstruccionesIOS}
          data-testid="modal-instalar-ios"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/icons/anunciaya-192.png"
                alt="AnunciaYA"
                className="h-10 w-10 rounded-xl"
              />
              <div>
                <p className="text-base font-semibold text-slate-900">Instalar en iPhone</p>
                <p className="text-xs text-slate-500">Solo toma 2 pasos en Safari</p>
              </div>
            </div>

            <ol className="space-y-3">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  1
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-700">
                  Toca el botón
                  <Share className="h-4 w-4 text-blue-600" strokeWidth={2} />
                  <b>Compartir</b>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  2
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-700">
                  Elige
                  <Plus className="h-4 w-4 text-blue-600" strokeWidth={2} />
                  <b>Agregar a inicio</b>
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={cerrarInstruccionesIOS}
              className="mt-5 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default BannerInstalarApp;
