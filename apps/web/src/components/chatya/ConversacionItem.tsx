/**
 * ConversacionItem.tsx
 * =====================
 * Item individual de la lista de conversaciones.
 * Muestra avatar, nombre, preview del último mensaje, hora, badge de no leídos.
 * Pin icon si está fijada.
 *
 * UBICACIÓN: apps/web/src/components/chatya/ConversacionItem.tsx
 */

import { useRef, useCallback } from 'react';
import { Pin, BellOff, ShieldBan, Check, CheckCheck, ChevronDown } from 'lucide-react';
import type { Conversacion } from '../../types/chatya';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { TextoConEmojis } from './TextoConEmojis';

// =============================================================================
// TIPOS
// =============================================================================

interface ConversacionItemProps {
  conversacion: Conversacion;
  activa: boolean;
  onClick: () => void;
  onMenuContextual?: (conversacion: Conversacion, posicion: { x: number; y: number }) => void;
  /** Modo selección múltiple (estilo WhatsApp) */
  modoSeleccion?: boolean;
  /** ¿Esta conversación está seleccionada? */
  seleccionada?: boolean;
  /** Callback para long press que inicia selección (solo móvil) */
  onLongPress?: (conversacionId: string) => void;
  /** Callback para toggle selección en modo selección */
  onToggleSeleccion?: (conversacionId: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Formatea la fecha del último mensaje para la lista (estilo WhatsApp) */
function formatearTiempo(fecha: string | null): string {
  if (!fecha) return '';

  const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const msg = new Date(fecha);
  const ahora = new Date();

  // Obtener fecha (YYYY-MM-DD) en zona horaria local para comparar días
  const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit' });
  const hoyStr = fmtDia.format(ahora);
  const msgStr = fmtDia.format(msg);

  // Hoy → mostrar hora exacta (ej: 2:35 p.m.)
  if (msgStr === hoyStr) {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: zonaHoraria,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(msg);
  }

  // Ayer
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (msgStr === fmtDia.format(ayer)) return 'Ayer';

  // Misma semana (< 7 días)
  const diffMs = ahora.getTime() - msg.getTime();
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffDias < 7) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    // Obtener día de la semana en zona horaria local
    const diaSemana = new Intl.DateTimeFormat('en-US', { timeZone: zonaHoraria, weekday: 'short' }).format(msg);
    const mapa: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dias[mapa[diaSemana] ?? msg.getDay()];
  }

  // Más de una semana: dd/mm/yy
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: zonaHoraria,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(msg);
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ConversacionItem({ conversacion, activa, onClick, onMenuContextual, modoSeleccion, seleccionada, onLongPress, onToggleSeleccion }: ConversacionItemProps) {
  const otro = conversacion.otroParticipante;
  const bloqueados = useChatYAStore((s) => s.bloqueados);
  const borradores = useChatYAStore((s) => s.borradores);
  const contactos = useChatYAStore((s) => s.contactos);
  const borrador = borradores[conversacion.id] || null;
  const esBloqueado = bloqueados.some((b) => b.bloqueadoId === otro?.id);
  const miId = useAuthStore((s) => s.usuario?.id);
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo || 'personal');

  // ¿El último mensaje es mío? → mostrar palomitas
  const ultimoEsMio = !!miId && conversacion.ultimoMensajeEmisorId === miId;

  // ---------------------------------------------------------------------------
  // Long press (móvil → selección) + Click derecho (desktop → menú contextual)
  // ---------------------------------------------------------------------------
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const touchMovedRef = useRef(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo abrir menú contextual en desktop (en móvil usa selección)
    if (!('ontouchstart' in window)) {
      onMenuContextual?.(conversacion, { x: e.clientX, y: e.clientY });
    }
  }, [conversacion, onMenuContextual]);

  const handleTouchStart = useCallback(() => {
    touchMovedRef.current = false;
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      onLongPress?.(conversacion.id);
    }, 500);
  }, [conversacion.id, onLongPress]);

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /** Bloquea onClick si el long press ya disparó la selección */
  const handleClick = useCallback(() => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (modoSeleccion && onToggleSeleccion) {
      onToggleSeleccion(conversacion.id);
      return;
    }
    onClick();
  }, [onClick, modoSeleccion, onToggleSeleccion, conversacion.id]);

  // Nombre a mostrar: negocio si aplica, sino nombre personal
  const nombre = otro?.negocioNombre || (otro ? `${otro.nombre} ${otro.apellidos || ''}`.trim() : 'Chat');

  // sucursalId del otro participante
  const otroSucursalId = miId
    ? (conversacion.participante1Id === miId ? conversacion.participante2SucursalId : conversacion.participante1SucursalId)
    : null;

  // Alias del contacto tiene prioridad sobre el nombre real
  const contactoExistente = otro
    ? contactos.find((c) =>
        c.contactoId === otro.id &&
        c.tipo === modoActivo &&
        c.sucursalId === otroSucursalId
      )
    : undefined;
  const nombreMostrar = contactoExistente?.alias?.trim() || nombre;

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
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        w-full flex items-center gap-3 px-3 py-3 mx-0.5 text-left cursor-pointer select-none
        rounded-r-lg border-l-[3px] transition-colors duration-75 group
        ${activa
          ? 'bg-white/12 border-l-amber-400'
          : seleccionada
            ? 'bg-blue-500/15 border-l-blue-400'
            : 'border-l-transparent hover:bg-white/8'
        }
      `}
    >
      {/* Avatar */}
      <div className="w-12 lg:w-11 h-12 lg:h-11 rounded-full shrink-0 relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nombreMostrar}
            className={`w-full h-full rounded-full object-cover ${esBloqueado ? 'opacity-40' : ''}`}
          />
        ) : (
          <div className={`w-full h-full rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center ${esBloqueado ? 'opacity-40' : ''}`}>
            <span className="text-white text-sm font-bold">{iniciales}</span>
          </div>
        )}
        {/* Overlay bloqueado */}
        {esBloqueado && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center">
            <ShieldBan className="w-5 h-5 text-red-500" />
          </div>
        )}
        {/* Overlay selección (checkmark azul) */}
        {seleccionada && (
          <div className="absolute inset-0 rounded-full bg-blue-500/90 flex items-center justify-center">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 h-5">
          <p className={`text-[15px] lg:text-[14px] truncate leading-tight ${esBloqueado ? 'text-white/35 font-medium' : tieneNoLeidos ? 'font-bold text-white' : 'font-semibold text-white/80'}`}>
            {nombreMostrar}
          </p>
          <span className="text-[13px] lg:text-[11px] text-white/45 font-medium shrink-0">
            {tiempo}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5 h-5">
          <p className={`text-[13px] truncate ${tieneNoLeidos ? 'text-white/80 font-medium' : 'text-white/50'}`}>
            {borrador ? (
              <>
                <span className="text-amber-400 font-semibold">Borrador: </span>
                <span className="text-white/60">{borrador}</span>
              </>
            ) : (
              <>
                {ultimoEsMio && conversacion.ultimoMensajeEstado && (
                  conversacion.ultimoMensajeEstado === 'leido'
                    ? <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 inline align-[-3px] mr-0.5" />
                    : conversacion.ultimoMensajeEstado === 'entregado'
                      ? <CheckCheck className="w-3.5 h-3.5 text-gray-400 shrink-0 inline align-[-3px] mr-0.5" />
                      : <Check className="w-3 h-3 text-gray-400 shrink-0 inline align-[-2px] mr-0.5" />
                )}
                {conversacion.ultimoMensajeTexto
                  ? <TextoConEmojis texto={conversacion.ultimoMensajeTexto} tamañoEmoji={22} />
                  : <span>Sin mensajes aún</span>
                }
              </>
            )}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {/* Íconos de estado */}
            {conversacion.silenciada && (
              <BellOff className="w-4 h-4 text-white/45" />
            )}
            {conversacion.fijada && (
              <Pin className="w-4.5 h-4.5 text-white/45 rotate-45" />
            )}
            {/* Badge no leídos */}
            {tieneNoLeidos && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {conversacion.noLeidos > 9 ? '9+' : conversacion.noLeidos}
              </span>
            )}
            {/* Flechita menú contextual (hover desktop) */}
            <div
              role="button"
              data-menu-trigger="true"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onMenuContextual?.(conversacion, { x: rect.right - 144, y: rect.bottom + 4 });
              }}
              className="hidden lg:group-hover:flex w-5 h-5 items-center justify-center rounded hover:bg-white/15 cursor-pointer"
            >
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export default ConversacionItem;