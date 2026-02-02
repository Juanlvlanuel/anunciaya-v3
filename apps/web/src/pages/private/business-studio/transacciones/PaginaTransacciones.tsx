/**
 * PaginaTransacciones.tsx
 * ========================
 * Página del módulo Transacciones en Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/transacciones/PaginaTransacciones.tsx
 *
 * RESPONSABILIDAD:
 *   - Historial de transacciones de puntos con paginación infinita
 *   - Se recarga automáticamente cuando cambia sucursalActiva
 *   - Gerentes solo ven transacciones de su sucursal (forzado en backend)
 *
 * SUCURSALES:
 *   - Muestra nombre de sucursal activa como indicador
 *   - useEffect escucha sucursalActiva y recarga el historial completo
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useTransaccionesStore } from '../../../../stores/useTransaccionesStore';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaTransacciones() {
  // Store de transacciones
  const cargarHistorial = useTransaccionesStore((s) => s.cargarHistorial);
  const limpiar = useTransaccionesStore((s) => s.limpiar);

  // Sucursal activa para re-fetch
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);

  // Recarga cuando cambia sucursal
  const recargar = useCallback(() => {
    if (usuario?.modoActivo === 'comercial' && !sucursalActiva) return;
    cargarHistorial();
  }, [sucursalActiva, usuario?.modoActivo, cargarHistorial]);

  useEffect(() => {
    recargar();

    return () => {
      limpiar();
    };
  }, [recargar, limpiar]);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Transacciones</h1>

          {/* Indicador de sucursal activa */}
          {sucursalActiva && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {usuario?.nombreNegocio || 'Sucursal'}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Historial de transacciones — próximamente</p>
        </div>
      </div>
    </div>
  );
}