import { X, HelpCircle } from 'lucide-react';
import { PaginaCentroAyuda } from '../../pages/private/ayuda/PaginaCentroAyuda';

interface ModalCentroAyudaScanYAProps {
  abierto: boolean;
  onClose: () => void;
}

/**
 * Centro de Ayuda dentro de ScanYA: drawer full-screen (móvil) / lateral
 * derecho (desktop) que reutiliza `PaginaCentroAyuda` forzada a la audiencia
 * de ScanYA. No saca al comerciante de su caja.
 */
export function ModalCentroAyudaScanYA({ abierto, onClose }: ModalCentroAyudaScanYAProps) {
  if (!abierto) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <div
        data-testid="scanya-drawer-ayuda"
        className="fixed inset-0 z-[70] flex flex-col bg-slate-100 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-1/2"
      >
        {/* Header oscuro estilo ScanYA */}
        <header
          className="flex items-center gap-3 px-4 py-3 text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)' }}
        >
          <HelpCircle className="h-5 w-5 text-blue-300" strokeWidth={2.2} />
          <h2 className="flex-1 text-base font-bold">Ayuda y Tutoriales</h2>
          <button
            onClick={onClose}
            data-testid="scanya-ayuda-cerrar"
            aria-label="Cerrar"
            className="rounded-lg p-1.5 lg:cursor-pointer lg:hover:bg-white/10"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </header>

        {/* Contenido: el Centro forzado a la audiencia ScanYA */}
        <div className="flex-1 overflow-y-auto">
          <PaginaCentroAyuda soloAudiencia="scanya" embebido />
        </div>
      </div>
    </>
  );
}

export default ModalCentroAyudaScanYA;
