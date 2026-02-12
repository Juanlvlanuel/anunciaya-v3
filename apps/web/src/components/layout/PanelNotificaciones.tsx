/**
 * PanelNotificaciones.tsx - VERSIÓN 3.0 (Patrón Adaptativo)
 * ==========================================================
 * Panel que muestra las notificaciones del usuario.
 *
 * COMPORTAMIENTO:
 * - MÓVIL (< 1024px): ModalBottom (slide up con drag)
 * - PC/LAPTOP (≥ 1024px): Dropdown desde el botón de notificaciones
 *
 * CARACTERÍSTICAS:
 * - Responsive: móvil bottom sheet, desktop dropdown
 * - Bloqueo de scroll en móvil (manejado por ModalBottom)
 * - Swipe down para cerrar en móvil (manejado por ModalBottom)
 * - Click fuera para cerrar
 * - Diseño visual con gradientes y efectos
 *
 * Ubicación: apps/web/src/components/layout/PanelNotificaciones.tsx
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, Check, Sparkles } from 'lucide-react';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Notificacion } from '../../types/notificaciones';

// =============================================================================
// HELPERS (fuera del componente para evitar re-creación)
// =============================================================================

/**
 * Formatea una fecha a texto relativo (ej: "Hace 5 min")
 */
const formatearFechaRelativa = (fecha: string): string => {
  const ahora = new Date();
  const diferencia = ahora.getTime() - new Date(fecha).getTime();

  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);

  if (minutos < 60) {
    return minutos <= 1 ? 'Hace 1 min' : `Hace ${minutos} min`;
  } else if (horas < 24) {
    return horas === 1 ? 'Hace 1h' : `Hace ${horas}h`;
  } else {
    return dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`;
  }
};

/**
 * Configuración visual por tipo de notificación
 */
const getConfigPorTipo = (tipo: Notificacion['tipo']) => {
  switch (tipo) {
    case 'puntos_ganados':
      return {
        emoji: '🎯',
        bgColor: 'bg-linear-to-br from-blue-100 to-blue-50',
      };
    case 'voucher_generado':
    case 'voucher_cobrado':
    case 'voucher_pendiente':
      return {
        emoji: '🎟️',
        bgColor: 'bg-linear-to-br from-emerald-100 to-emerald-50',
      };
    case 'nueva_oferta':
    case 'nuevo_cupon':
      return {
        emoji: '🏷️',
        bgColor: 'bg-linear-to-br from-orange-100 to-orange-50',
      };
    case 'nueva_recompensa':
      return {
        emoji: '🎁',
        bgColor: 'bg-linear-to-br from-pink-100 to-pink-50',
      };
    case 'nuevo_cliente':
      return {
        emoji: '👤',
        bgColor: 'bg-linear-to-br from-cyan-100 to-cyan-50',
      };
    case 'stock_bajo':
      return {
        emoji: '⚠️',
        bgColor: 'bg-linear-to-br from-amber-100 to-amber-50',
      };
    case 'nueva_resena':
      return {
        emoji: '⭐',
        bgColor: 'bg-linear-to-br from-yellow-100 to-yellow-50',
      };
    case 'nuevo_marketplace':
    case 'nueva_dinamica':
    case 'nuevo_empleo':
      return {
        emoji: '📢',
        bgColor: 'bg-linear-to-br from-indigo-100 to-indigo-50',
      };
    case 'sistema':
    default:
      return {
        emoji: '⚙️',
        bgColor: 'bg-linear-to-br from-gray-100 to-gray-50',
      };
  }
};

// =============================================================================
// HELPER: Obtener ruta de destino según notificación
// =============================================================================

/**
 * Determina a qué ruta navegar cuando el usuario hace click en una notificación.
 * Retorna null si la notificación no tiene destino (solo se marca como leída).
 */
const obtenerRutaDestino = (notificacion: Notificacion): string | null => {
  const { modo, referenciaTipo, referenciaId, tipo } = notificacion;

  // Sin referenciaTipo → no hay destino
  if (!referenciaTipo) return null;

  // ── MODO PERSONAL ──
  if (modo === 'personal') {
    switch (referenciaTipo) {
      case 'transaccion':
        return referenciaId
          ? `/cardya?tab=historial&id=${referenciaId}`
          : '/cardya?tab=historial';

      case 'voucher':
        return referenciaId
          ? `/cardya?tab=vouchers&id=${referenciaId}`
          : '/cardya?tab=vouchers';

      case 'oferta':
        // Navegar al perfil del negocio (sucursal) y abrir modal de la oferta
        return notificacion.sucursalId && referenciaId
          ? `/negocios/${notificacion.sucursalId}?ofertaId=${referenciaId}`
          : null;

      case 'recompensa':
        return referenciaId ? `/cardya?tab=recompensas&id=${referenciaId}` : '/cardya?tab=recompensas';

      default:
        return null;
    }
  }

  // ── MODO COMERCIAL ──
  if (modo === 'comercial') {
    switch (referenciaTipo) {
      case 'transaccion':
      case 'voucher':
        return '/business-studio/transacciones';

      case 'resena':
        return '/business-studio/opiniones';

      default:
        break;
    }

    // Fallback por tipo de notificación (comercial)
    switch (tipo) {
      case 'stock_bajo':
        return '/business-studio/puntos';
      case 'nuevo_cliente':
        return '/business-studio/clientes';
      default:
        return null;
    }
  }

  return null;
};

// =============================================================================
// COMPONENTE: Contenido de Notificaciones (reutilizable)
// =============================================================================

interface ContenidoNotificacionesProps {
  notificaciones: Notificacion[];
  onClickNotificacion: (notificacion: Notificacion) => void;
}

function ContenidoNotificaciones({
  notificaciones,
  onClickNotificacion,
}: ContenidoNotificacionesProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {notificaciones.length === 0 ? (
        // Estado vacío
        <div className="flex flex-col items-center justify-center py-12 lg:py-8 2xl:py-12 px-4 text-center">
          <div className="w-16 h-16 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 bg-linear-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-4 lg:mb-3 2xl:mb-4 shadow-inner">
            <Bell className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold mb-1 text-sm lg:text-xs 2xl:text-sm">
            Sin notificaciones
          </p>
          <p className="text-xs lg:text-[11px] 2xl:text-xs text-gray-400">
            Aquí aparecerán tus notificaciones
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 px-4">
          {notificaciones.map((notificacion) => {
            const config = getConfigPorTipo(notificacion.tipo);

            return (
              <button
                key={notificacion.id}
                onClick={() => onClickNotificacion(notificacion)}
                className={`
                  w-full flex items-start gap-3 lg:gap-2.5 2xl:gap-3 py-3 lg:py-2.5 2xl:py-3
                  hover:bg-linear-to-r hover:from-blue-50/50 hover:to-transparent
                  transition-all duration-150 text-left
                  ${!notificacion.leida ? 'bg-blue-50/30' : ''}
                `}
              >
                {/* Icono */}
                <div className="shrink-0">
                  <div
                    className={`
                      w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11
                      ${config.bgColor}
                      rounded-xl flex items-center justify-center text-2xl lg:text-xl 2xl:text-2xl
                      shadow-sm ring-2 ring-white
                    `}
                  >
                    {config.emoji}
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p
                      className={`
                        font-semibold text-sm lg:text-xs 2xl:text-sm
                        ${!notificacion.leida ? 'text-gray-900' : 'text-gray-600'}
                      `}
                    >
                      {notificacion.titulo}
                    </p>
                    {!notificacion.leida && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1 shadow-md shadow-blue-500/50" />
                    )}
                  </div>
                  <p className="text-sm lg:text-xs 2xl:text-sm text-gray-600 mb-1 line-clamp-2">
                    {notificacion.mensaje}
                  </p>
                  <p className="text-xs lg:text-[10px] 2xl:text-xs text-gray-400 font-medium">
                    {formatearFechaRelativa(notificacion.createdAt)}
                  </p>
                </div>

                {/* Indicador de acción */}
                {!notificacion.leida && (
                  <div className="shrink-0">
                    <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE: Footer de Notificaciones (separado para reutilizar)
// =============================================================================

interface FooterNotificacionesProps {
  cantidadNoLeidas: number;
  onMarcarTodasLeidas: () => void;
}

function FooterNotificaciones({ cantidadNoLeidas, onMarcarTodasLeidas }: FooterNotificacionesProps) {
  if (cantidadNoLeidas === 0) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-linear-to-r from-blue-50/80 via-purple-50/80 to-pink-50/80 px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3">
      <button
        onClick={onMarcarTodasLeidas}
        className="w-full py-3 lg:py-2.5 2xl:py-3 text-sm lg:text-xs 2xl:text-sm font-bold text-white bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        <Sparkles className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
        <span>Marcar todas como leídas</span>
      </button>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Dropdown Desktop (Panel posicionado)
// =============================================================================

interface DropdownDesktopProps {
  notificaciones: Notificacion[];
  cantidadNoLeidas: number;
  onClose: () => void;
  onClickNotificacion: (notificacion: Notificacion) => void;
  onMarcarTodasLeidas: () => void;
}

function DropdownDesktop({
  notificaciones,
  cantidadNoLeidas,
  onClose,
  onClickNotificacion,
  onMarcarTodasLeidas,
}: DropdownDesktopProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Effect: Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // No cerrar si el click es en el botón de notificaciones
      const esBotonNotificaciones = target.closest('button[title="Notificaciones"]');
      if (esBotonNotificaciones) return;

      // Cerrar si el click es fuera del panel
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };

    // Pequeño delay para evitar que se cierre inmediatamente al abrir
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Effect: Cerrar con ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="
        fixed z-50
        top-[70px] right-4
        w-80 lg:w-80 2xl:w-96
        max-h-[400px] 2xl:max-h-[500px]
        bg-white rounded-2xl shadow-2xl border border-gray-200
        flex flex-col
        overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-200
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:py-2.5 2xl:py-3 border-b border-gray-200 bg-linear-to-r from-blue-50 via-purple-50 to-pink-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <Bell className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-base lg:text-sm 2xl:text-base">
            Notificaciones
          </h3>
          {cantidadNoLeidas > 0 && (
            <span className="bg-red-500 text-white text-xs lg:text-[10px] 2xl:text-xs px-2 py-0.5 rounded-full font-bold">
              {cantidadNoLeidas}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 lg:p-1 2xl:p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all"
        >
          <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
        </button>
      </div>

      {/* Contenido con flex para scroll correcto */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ContenidoNotificaciones
          notificaciones={notificaciones}
          onClickNotificacion={onClickNotificacion}
        />
      </div>

      {/* Footer - FIJO */}
      <FooterNotificaciones
        cantidadNoLeidas={cantidadNoLeidas}
        onMarcarTodasLeidas={onMarcarTodasLeidas}
      />
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL: PanelNotificaciones
// =============================================================================

export function PanelNotificaciones() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const panelAbierto = useNotificacionesStore((state) => state.panelAbierto);
  const notificaciones = useNotificacionesStore((state) => state.notificaciones);
  const cerrarPanel = useNotificacionesStore((state) => state.cerrarPanel);
  const marcarLeidas = useNotificacionesStore((state) => state.marcarTodasLeidas);
  const marcarLeidaPorId = useNotificacionesStore((state) => state.marcarLeidaPorId);

  // ---------------------------------------------------------------------------
  // Hook para detectar dispositivo
  // ---------------------------------------------------------------------------
  const { esMobile } = useBreakpoint();

  // ---------------------------------------------------------------------------
  // Navegación
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------
  const cantidadNoLeidas = useNotificacionesStore((state) => state.totalNoLeidas);


  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Determina la ruta de destino según referenciaTipo y modo de la notificación.
   *
   * MODO PERSONAL:
   * - transaccion → /cardya?tab=historial&id=xxx (abre modal detalle)
   * - voucher     → /cardya?tab=vouchers&id=xxx  (abre modal detalle)
   * - oferta      → /negocios/{negocioId}?ofertaId=xxx (abre modal en perfil)
   * - recompensa  → /cardya?tab=recompensas
   *
   * MODO COMERCIAL:
   * - transaccion → /business-studio/transacciones
   * - voucher     → /business-studio/transacciones
   * - oferta      → (no aplica, el dueño creó la oferta)
   * - recompensa  → (no aplica, el dueño creó la recompensa)
   * - resena      → /business-studio/opiniones
   * - stock_bajo  → /business-studio/puntos
   * - nuevo_cliente → /business-studio/clientes
   */
  const handleClickNotificacion = (notificacion: Notificacion) => {
    // 1. Marcar como leída
    if (!notificacion.leida) {
      marcarLeidaPorId(notificacion.id);
    }

    // 2. Determinar ruta de destino
    const ruta = obtenerRutaDestino(notificacion);

    // 3. Cerrar panel y navegar (si hay ruta)
    if (ruta) {
      cerrarPanel();
      navigate(ruta);
    }
  };

  const handleMarcarTodasLeidas = () => {
    marcarLeidas();
  };

  // ---------------------------------------------------------------------------
  // Si no está abierto, no renderizar nada
  // ---------------------------------------------------------------------------
  if (!panelAbierto) return null;

  // ---------------------------------------------------------------------------
  // Render según dispositivo
  // ---------------------------------------------------------------------------
  return (
    <>
      {esMobile ? (
        /* MÓVIL: ModalBottom */
        <ModalBottom
          abierto={panelAbierto}
          onCerrar={cerrarPanel}
          titulo="Notificaciones"
          iconoTitulo={<Bell className="w-5 h-5 text-white" />}
          mostrarHeader={false}
          sinScrollInterno={true}
          alturaMaxima="md"
        >
          {/* Header con franja de gradiente - FIJO */}
          <div className="px-4 py-3 bg-linear-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Notificaciones</h3>
              {cantidadNoLeidas > 0 && (
                <span className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                  {cantidadNoLeidas}
                </span>
              )}
            </div>
          </div>

          {/* Lista con scroll interno */}
          <ContenidoNotificaciones
            notificaciones={notificaciones}
            onClickNotificacion={handleClickNotificacion}
          />

          {/* Footer - FIJO */}
          <FooterNotificaciones
            cantidadNoLeidas={cantidadNoLeidas}
            onMarcarTodasLeidas={handleMarcarTodasLeidas}
          />
        </ModalBottom>
      ) : (
        /* ESCRITORIO: Dropdown */
        <DropdownDesktop
          notificaciones={notificaciones}
          cantidadNoLeidas={cantidadNoLeidas}
          onClose={cerrarPanel}
          onClickNotificacion={handleClickNotificacion}
          onMarcarTodasLeidas={handleMarcarTodasLeidas}
        />
      )}
    </>
  );
}

export default PanelNotificaciones;