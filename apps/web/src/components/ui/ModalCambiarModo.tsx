/**
 * ModalCambiarModo.tsx
 * =====================
 * Modal para confirmar cambio de modo cuando el usuario
 * intenta acceder a una ruta que requiere un modo diferente.
 * 
 * Uso:
 * - Usuario en Personal intenta ir a /business-studio
 * - Aparece modal: "¿Cambiar a modo Comercial?"
 * - Confirmar → Cambia modo y accede
 * - Cancelar → Vuelve atrás
 * 
 * Ubicación: apps/web/src/components/ui/ModalCambiarModo.tsx
 */

import { User, Store } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalCambiarModoProps {
  isOpen: boolean;
  modoDestino: 'personal' | 'comercial';
  onConfirm: () => void;
  onCancel: () => void;
  cargando?: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalCambiarModo({ 
  isOpen, 
  modoDestino, 
  onConfirm, 
  onCancel,
  cargando = false 
}: ModalCambiarModoProps) {
  if (!isOpen) return null;

  const esComercial = modoDestino === 'comercial';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        {/* Icono */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              esComercial
                ? 'bg-gradient-to-br from-orange-100 to-orange-200'
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}
          >
            {esComercial ? (
              <Store className="w-7 h-7 text-orange-600" />
            ) : (
              <User className="w-7 h-7 text-blue-600" />
            )}
          </div>
        </div>

        {/* Título */}
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Cambiar a modo {esComercial ? 'Comercial' : 'Personal'}
        </h3>

        {/* Descripción */}
        <p className="text-gray-600 text-center mb-6">
          Esta sección requiere el modo {esComercial ? 'Comercial' : 'Personal'}. 
          ¿Deseas cambiar?
        </p>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={cargando}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={cargando}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 ${
              esComercial
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            }`}
          >
            {cargando ? 'Cambiando...' : 'Cambiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCambiarModo;