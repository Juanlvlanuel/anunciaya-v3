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
import { useBackNativo } from '../../hooks/useBackNativo';

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

  // El instructivo iOS es un overlay full-screen descartable → el back nativo
  // (y la flecha del navegador) deben cerrarlo, igual que su X y el backdrop.
  // El hook se llama antes de las guardas de abajo para no romper las reglas de
  // hooks; queda inerte (abierto:false) cuando el banner no aplica.
  useBackNativo({
    abierto: instruccionesIOSVisible,
    onCerrar: cerrarInstruccionesIOS,
    discriminador: '_instalarIOS',
  });

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
      {/* Banner flotante — pastilla delgada centrada ARRIBA, colgando justo bajo el
          header (móvil y desktop). Deja libre la esquina inferior derecha para el FAB
          de WhatsApp. */}
      {bannerVisible && (
      <div
        className="fixed left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,0px)+52px)] z-[900] max-w-[calc(100%-1.25rem)]"
        role="dialog"
        aria-label="Instalar AnunciaYA"
        data-testid="banner-instalar-app"
      >
        <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-2 pr-1.5 shadow-[0_10px_28px_-6px_rgba(15,23,42,0.38)] ring-1 ring-blue-600/15">
          <img
            src="/icons/anunciaya-192.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">Instala AnunciaYA</p>
            <p className="hidden truncate text-[11px] leading-tight text-slate-500 lg:block">Acceso directo desde tu inicio</p>
          </div>
          <button
            type="button"
            onClick={handleInstalar}
            className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 lg:cursor-pointer"
            data-testid="banner-instalar-boton"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
            {esIOS ? 'Ver cómo' : 'Instalar'}
          </button>
          <button
            type="button"
            onClick={descartarBanner}
            className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 lg:cursor-pointer"
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
