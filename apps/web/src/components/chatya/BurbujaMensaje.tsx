/**
 * BurbujaMensaje.tsx
 * ===================
 * Burbuja individual de un mensaje en el chat.
 *
 * - Propias: gradiente azul vibrante (lado derecho)
 * - Del otro: fondo blanco con borde (lado izquierdo)
 * - Hora + palomitas de estado (enviado/entregado/leído)
 * - Indicador "editado" sutil
 * - Mensajes eliminados: texto gris itálico
 * - Tag de negocio si el emisor es un negocio
 *
 * UBICACIÓN: apps/web/src/components/chatya/BurbujaMensaje.tsx
 */

import { Check, CheckCheck, Store } from 'lucide-react';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface BurbujaMensajeProps {
  mensaje: Mensaje;
  esMio: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Formatea hora del mensaje (ej: "10:30 AM") */
function formatearHora(fecha: string): string {
  const d = new Date(fecha);
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function BurbujaMensaje({ mensaje, esMio }: BurbujaMensajeProps) {
  const hora = formatearHora(mensaje.createdAt);
  const esNegocio = !!mensaje.emisorSucursalId;

  // Mensaje eliminado
  if (mensaje.eliminado) {
    return (
      <div className={`max-w-[84%] px-3 py-2 rounded-xl ${esMio ? 'self-end' : 'self-start'}`}>
        <p className="text-[11px] text-gray-400 italic">Se eliminó este mensaje</p>
      </div>
    );
  }

  return (
    <div
      className={`
        max-w-[84%] px-3 py-2 rounded-[14px] relative
        ${esMio
          ? 'self-end bg-linear-to-br from-[#2563eb] to-[#3b82f6] text-white rounded-br-[5px] shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
          : 'self-start bg-white text-gray-800 rounded-bl-[5px] shadow-[0_1px_4px_rgba(15,29,58,0.08)] border border-gray-100'
        }
      `}
    >
      {/* Tag de negocio (solo mensajes del otro que es negocio) */}
      {!esMio && esNegocio && (
        <div className="flex items-center gap-1 mb-0.5">
          <Store className="w-2.5 h-2.5 text-amber-500" />
          <span className="text-[9px] font-bold text-amber-500">Negocio</span>
        </div>
      )}

      {/* Contenido */}
      <p className="text-[12px] leading-normal wrap-break-word whitespace-pre-wrap">
        {mensaje.contenido}
      </p>

      {/* Footer: hora + editado + palomitas */}
      <div className={`flex items-center gap-1 mt-0.5 ${esMio ? 'justify-end' : ''}`}>
        {/* Indicador editado */}
        {mensaje.editado && (
          <span className={`text-[8px] italic ${esMio ? 'text-white/50' : 'text-gray-400'}`}>
            editado
          </span>
        )}

        {/* Hora */}
        <span className={`text-[9px] ${esMio ? 'text-white/55' : 'text-gray-400'}`}>
          {hora}
        </span>

        {/* Palomitas (solo mensajes propios) */}
        {esMio && <Palomitas estado={mensaje.estado} />}
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: Palomitas de estado
// =============================================================================

function Palomitas({ estado }: { estado: 'enviado' | 'entregado' | 'leido' }) {
  switch (estado) {
    case 'leido':
      return <CheckCheck className="w-3.5 h-3.5 text-sky-300" />;
    case 'entregado':
      return <CheckCheck className="w-3.5 h-3.5 text-white/50" />;
    case 'enviado':
    default:
      return <Check className="w-3 h-3 text-white/50" />;
  }
}

export default BurbujaMensaje;
