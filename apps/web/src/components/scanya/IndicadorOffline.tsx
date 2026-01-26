/**
 * IndicadorOffline.tsx
 * =====================
 * Badge que indica cuando no hay conexión a internet.
 * Se muestra en el HeaderScanYA entre el nombre del negocio/sucursal y el botón de logout.
 *
 * Características:
 * - Solo visible cuando offline = true
 * - Badge naranja con icono WifiOff
 * - Animación pulse sutil
 * - Responsive (móvil y desktop)
 *
 * Ubicación: apps/web/src/components/scanya/IndicadorOffline.tsx
 */

import { WifiOff } from 'lucide-react';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function IndicadorOffline() {
  return (
    <div
      className="
        flex items-center gap-1.5
        px-3 py-1.5 lg:px-3 lg:py-2
        rounded-full
        animate-pulse
      "
      style={{
        background: 'rgba(245, 158, 11, 0.2)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)',
      }}
    >
      <WifiOff className="w-4 h-4 lg:w-4 lg:h-4 text-[#F59E0B]" strokeWidth={2.5} />
      <span className="text-[#F59E0B] font-medium text-xs lg:text-sm whitespace-nowrap">
        SIN CONEXIÓN
      </span>
    </div>
  );
}