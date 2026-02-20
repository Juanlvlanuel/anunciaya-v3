/**
 * BarraMinimizada.tsx
 * ====================
 * Barra lateral derecha minimizada del ChatYA.
 * Muestra logo + avatares de conversaciones recientes con badges.
 * Click en cualquier elemento → expande el chat completo.
 *
 * Solo se renderiza en desktop cuando el chat está minimizado.
 *
 * UBICACIÓN: apps/web/src/components/chatya/BarraMinimizada.tsx
 */

import { MessageSquare } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';

// =============================================================================
// TIPOS
// =============================================================================

interface BarraMinimizadaProps {
  onExpandir: () => void;
  totalNoLeidos: number;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function BarraMinimizada({ onExpandir, totalNoLeidos }: BarraMinimizadaProps) {
  const conversaciones = useChatYAStore((s) => s.conversaciones);

  // Tomar las primeras 6 conversaciones con actividad reciente
  const recientes = conversaciones.slice(0, 6);

  return (
    <div className="fixed right-3 top-[66px] bottom-3 w-14 z-60 flex flex-col items-center gap-1 py-2 bg-white rounded-2xl shadow-[0_4px_24px_rgba(15,29,58,0.12),0_0_0_1px_rgba(15,29,58,0.04)] overflow-y-auto scrollbar-hide">
      {/* Logo ChatYA — botón principal para expandir */}
      <button
        onClick={onExpandir}
        className="w-[42px] h-[42px] bg-linear-to-br from-red-600 to-red-700 rounded-[13px] flex items-center justify-center relative shrink-0 shadow-[0_3px_12px_rgba(212,43,43,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
        title="Abrir ChatYA"
      >
        <MessageSquare className="w-5 h-5 text-white fill-white" />
        {totalNoLeidos > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-[0_2px_6px_rgba(232,135,42,0.4)]">
            {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
          </span>
        )}
      </button>

      {/* Separador */}
      <div className="w-6 h-[1.5px] bg-gray-200 rounded-full my-1 shrink-0" />

      {/* Avatares de conversaciones recientes */}
      {recientes.map((conv) => {
        const otro = conv.otroParticipante;
        if (!otro) return null;

        const iniciales = `${otro.nombre.charAt(0)}${otro.apellidos?.charAt(0) || ''}`.toUpperCase();
        const tieneNoLeidos = conv.noLeidos > 0;

        return (
          <button
            key={conv.id}
            onClick={onExpandir}
            className="w-10 h-10 rounded-full relative shrink-0 hover:scale-110 active:scale-95 my-0.5 cursor-pointer"
            title={otro.negocioNombre || `${otro.nombre} ${otro.apellidos || ''}`}
          >
            {otro.avatarUrl || otro.negocioLogo ? (
              <img
                src={otro.negocioLogo || otro.avatarUrl || ''}
                alt={otro.nombre}
                className={`w-full h-full rounded-full object-cover border-[2.5px] ${tieneNoLeidos ? 'border-blue-400' : 'border-gray-200'}`}
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center border-[2.5px] ${tieneNoLeidos ? 'border-blue-400' : 'border-gray-200'}`}>
                <span className="text-white text-[11px] font-bold">{iniciales}</span>
              </div>
            )}

            {/* Badge de no leídos */}
            {tieneNoLeidos && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                {conv.noLeidos > 9 ? '9+' : conv.noLeidos}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default BarraMinimizada;