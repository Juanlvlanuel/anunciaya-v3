/**
 * InfoNegocioBar.tsx
 * ==================
 * Barra con información del negocio - SIN CONTENEDOR.
 * Solo visible en MÓVIL.
 *
 * Layout: 🏪 Nombre Negocio • Sucursal (centrado, texto grande)
 *
 * Ubicación: apps/web/src/components/scanya/InfoNegocioBar.tsx
 */

import { Store } from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function InfoNegocioBar() {
  const { usuario } = useScanYAStore();

  if (!usuario) return null;

  return (
    <div className="lg:hidden py-3">
      {/* Icono + Negocio • Sucursal CENTRADO en 1 línea */}
      <div className="flex items-center justify-center gap-2.5">
        <Store 
          className="w-6 h-6 text-[#3B82F6] shrink-0" 
          strokeWidth={2}
        />
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Nombre del negocio */}
          <h2 className="text-white font-semibold text-xl truncate">
            {usuario.nombreNegocio}
          </h2>

          {/* Separador + Sucursal (si existe) */}
          {usuario.nombreSucursal && (
            <>
              <span className="text-[#3B82F6] font-bold text-xl">•</span>
              <p className="text-[#94A3B8] text-lg truncate">
                {usuario.nombreSucursal}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}