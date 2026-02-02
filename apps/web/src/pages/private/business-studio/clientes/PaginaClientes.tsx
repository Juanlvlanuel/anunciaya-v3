/**
 * PaginaClientes.tsx
 * ===================
 * Página del módulo Clientes en Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/clientes/PaginaClientes.tsx
 *
 * RESPONSABILIDAD:
 *   - Top clientes por puntos disponibles
 *   - Se recarga automáticamente cuando cambia sucursalActiva
 *   - Gerentes solo ven clientes de su sucursal (forzado en backend)
 *
 * SUCURSALES:
 *   - Muestra nombre de sucursal activa como indicador
 *   - useEffect escucha sucursalActiva y recarga la lista
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useClientesStore } from '../../../../stores/useClientesStore';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaClientes() {
  // Store de clientes
  const cargarClientes = useClientesStore((s) => s.cargarClientes);
  const limpiar = useClientesStore((s) => s.limpiar);

  // Sucursal activa para re-fetch
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);

  // Recarga cuando cambia sucursal
  const recargar = useCallback(() => {
    if (usuario?.modoActivo === 'comercial' && !sucursalActiva) return;
    cargarClientes();
  }, [sucursalActiva, usuario?.modoActivo, cargarClientes]);

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
          <h1 className="text-lg font-bold text-gray-800">Clientes</h1>

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
          <p className="text-gray-400 text-sm">Top clientes con puntos — próximamente</p>
        </div>
      </div>
    </div>
  );
}