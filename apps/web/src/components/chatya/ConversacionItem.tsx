/**
 * ConversacionItem.tsx
 * =====================
 * Item individual de la lista de conversaciones.
 * Muestra avatar, nombre, preview del último mensaje, hora, badge de no leídos.
 * Pin icon si está fijada.
 *
 * UBICACIÓN: apps/web/src/components/chatya/ConversacionItem.tsx
 */

import { Pin, VolumeX } from 'lucide-react';
import type { Conversacion } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface ConversacionItemProps {
  conversacion: Conversacion;
  activa: boolean;
  onClick: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Formatea la fecha del último mensaje para la lista */
function formatearTiempo(fecha: string | null): string {
  if (!fecha) return '';

  const ahora = new Date();
  const msg = new Date(fecha);
  const diffMs = ahora.getTime() - msg.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);

  // Menos de 1 minuto
  if (diffMin < 1) return 'Ahora';

  // Menos de 1 hora
  if (diffMin < 60) return `${diffMin}m`;

  // Menos de 24 horas
  if (diffHoras < 24) return `${diffHoras}h`;

  // Ayer
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (msg.toDateString() === ayer.toDateString()) return 'Ayer';

  // Misma semana: nombre del día
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffDias < 7) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[msg.getDay()];
  }

  // Más de una semana: fecha corta
  const dia = msg.getDate().toString().padStart(2, '0');
  const mes = (msg.getMonth() + 1).toString().padStart(2, '0');
  return `${dia}/${mes}`;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ConversacionItem({ conversacion, activa, onClick }: ConversacionItemProps) {
  const otro = conversacion.otroParticipante;

  // Nombre a mostrar: negocio si aplica, sino nombre personal
  const nombre = otro?.negocioNombre || (otro ? `${otro.nombre} ${otro.apellidos || ''}`.trim() : 'Chat');

  // Iniciales para avatar fallback
  const iniciales = otro
    ? `${otro.nombre.charAt(0)}${otro.apellidos?.charAt(0) || ''}`.toUpperCase()
    : '?';

  // Avatar: logo del negocio > avatar personal > iniciales
  const avatarUrl = otro?.negocioLogo || otro?.avatarUrl || null;

  const tieneNoLeidos = conversacion.noLeidos > 0;
  const tiempo = formatearTiempo(conversacion.ultimoMensajeFecha);

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 lg:gap-2.5 px-3 lg:px-2.5 py-3 lg:py-2.5 mx-0.5 text-left cursor-pointer
        rounded-r-lg border-l-[3px] transition-colors duration-75
        ${activa
          ? 'bg-blue-100/80 border-l-blue-500'
          : 'border-l-transparent hover:bg-gray-100/70'
        }
      `}
    >
      {/* Avatar */}
      <div className="w-12 lg:w-10 h-12 lg:h-10 rounded-full shrink-0 relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nombre}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-white text-sm lg:text-xs font-bold">{iniciales}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={`text-[15px] lg:text-[13px] truncate leading-tight ${tieneNoLeidos ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
            {nombre}
          </p>
          <span className="text-xs lg:text-[11px] text-gray-500 font-medium shrink-0">
            {tiempo}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={`text-[13px] lg:text-xs truncate ${tieneNoLeidos ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
            {conversacion.ultimoMensajeTexto || 'Sin mensajes aún'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {/* Íconos de estado */}
            {conversacion.silenciada && (
              <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            )}
            {conversacion.fijada && (
              <Pin className="w-3.5 h-3.5 text-gray-400 rotate-45" />
            )}
            {/* Badge no leídos */}
            {tieneNoLeidos && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {conversacion.noLeidos > 9 ? '9+' : conversacion.noLeidos}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default ConversacionItem;