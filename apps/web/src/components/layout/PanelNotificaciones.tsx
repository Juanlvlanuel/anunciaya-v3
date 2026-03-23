/**
 * PanelNotificaciones.tsx (v5.0 - Rediseño moderno: Lucide icons + actor images)
 * ===============================================================================
 * Panel que muestra las notificaciones del usuario.
 *
 * COMPORTAMIENTO:
 * - MÓVIL (< 1024px): ModalBottom (slide up con drag)
 * - PC/LAPTOP (≥ 1024px): Dropdown desde el botón de notificaciones
 *
 * DISEÑO:
 * - Iconos Lucide en contenedores circulares con color semántico (sin emojis)
 * - Cuando hay actorImagenUrl: imagen circular + mini badge de tipo superpuesto
 * - Alineado con PanelInteracciones y PanelAlertas del Dashboard BS
 *
 * Ubicación: apps/web/src/components/layout/PanelNotificaciones.tsx
 */

import { useEffect, useRef, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  Sparkles,
  Coins,
  Ticket,
  Tag,
  Gift,
  UserPlus,
  AlertTriangle,
  Star,
  Megaphone,
  Settings,
  Trash2,
  type LucideProps,
} from 'lucide-react';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Notificacion } from '../../types/notificaciones';

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaRelativa = (fecha: string): string => {
  const ahora = new Date();
  const diferencia = ahora.getTime() - new Date(fecha).getTime();

  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);

  if (minutos < 60) {
    return minutos <= 1 ? '1 min' : `${minutos} min`;
  } else if (horas < 24) {
    return horas === 1 ? '1h' : `${horas}h`;
  } else {
    return dias === 1 ? '1 día' : `${dias} días`;
  }
};

interface ConfigTipo {
  icono: ComponentType<LucideProps>;
  gradiente: string;
}

const getConfigPorTipo = (tipo: Notificacion['tipo']): ConfigTipo => {
  switch (tipo) {
    case 'puntos_ganados':
      return { icono: Coins, gradiente: 'linear-gradient(135deg, #10b981, #047857)' };
    case 'voucher_generado':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' };
    case 'voucher_cobrado':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #10b981, #047857)' };
    case 'voucher_pendiente':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #f59e0b, #b45309)' };
    case 'nueva_oferta':
      return { icono: Tag, gradiente: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' };
    case 'cupon_asignado':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #10b981, #059669)' };
    case 'cupon_revocado':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #ef4444, #b91c1c)' };
    case 'nueva_recompensa':
    case 'recompensa_desbloqueada':
      return { icono: Gift, gradiente: 'linear-gradient(135deg, #10b981, #047857)' };
    case 'nuevo_cliente':
      return { icono: UserPlus, gradiente: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' };
    case 'stock_bajo':
      return { icono: AlertTriangle, gradiente: 'linear-gradient(135deg, #ef4444, #b91c1c)' };
    case 'nueva_resena':
      return { icono: Star, gradiente: 'linear-gradient(135deg, #f59e0b, #b45309)' };
    case 'nuevo_marketplace':
    case 'nueva_dinamica':
    case 'nuevo_empleo':
      return { icono: Megaphone, gradiente: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' };
    case 'sistema':
    default:
      return { icono: Settings, gradiente: 'linear-gradient(135deg, #64748b, #475569)' };
  }
};

// =============================================================================
// HELPER: Obtener ruta de destino según notificación
// =============================================================================

const obtenerRutaDestino = (notificacion: Notificacion): string | null => {
  const { modo, referenciaTipo, referenciaId, tipo } = notificacion;

  if (!referenciaTipo) return null;

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
        return notificacion.sucursalId && referenciaId
          ? `/negocios/${notificacion.sucursalId}?ofertaId=${referenciaId}`
          : null;
      case 'recompensa':
        return referenciaId ? `/cardya?tab=recompensas&id=${referenciaId}` : '/cardya?tab=recompensas';
      case 'cupon':
        return referenciaId ? `/mis-cupones?id=${referenciaId}` : '/mis-cupones';
      case 'resena':
        return notificacion.sucursalId && referenciaId
          ? `/negocios/${notificacion.sucursalId}?resenaId=${referenciaId}`
          : null;
      default:
        return null;
    }
  }

  if (modo === 'comercial') {
    switch (referenciaTipo) {
      case 'transaccion': {
        const txId = referenciaId ? `transaccionId=${referenciaId}` : '';
        return `/business-studio/transacciones${txId ? `?${txId}` : ''}`;
      }
      case 'voucher': {
        const canjeId = referenciaId ? `canjeId=${referenciaId}` : '';
        const busqueda = notificacion.actorNombre ? `busqueda=${encodeURIComponent(notificacion.actorNombre)}` : '';
        const params = ['tab=canjes', canjeId, busqueda].filter(Boolean).join('&');
        return `/business-studio/transacciones?${params}`;
      }
      case 'resena': {
        const resenaParam = referenciaId ? `?resenaId=${referenciaId}` : '';
        return `/business-studio/opiniones${resenaParam}`;
      }
      default:
        break;
    }
    switch (tipo) {
      case 'stock_bajo': {
        const recompId = notificacion.referenciaId ? `?recompensaId=${notificacion.referenciaId}` : '';
        return `/business-studio/puntos${recompId}`;
      }
      case 'nuevo_cliente':
        return '/business-studio/clientes';
      default:
        return null;
    }
  }

  return null;
};

// =============================================================================
// HELPERS: Iniciales del actor
// =============================================================================

const obtenerIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
};

// =============================================================================
// COMPONENTE: Icono de Notificación (estilo Facebook)
// =============================================================================
// Siempre: círculo grande (foto/iniciales) + mini badge superpuesto (tipo)
// Prioridad del círculo grande:
//   1. actorImagenUrl → foto
//   2. actorNombre → iniciales
//   3. Sin datos → icono Lucide del tipo (fallback final)

function IconoNotificacion({ notificacion }: { notificacion: Notificacion }) {
  const config = getConfigPorTipo(notificacion.tipo);
  const Icono = config.icono;

  // Badge de tipo (siempre visible, superpuesto abajo-derecha)
  const badge = (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
      style={{ background: config.gradiente }}
    >
      <Icono className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white" />
    </div>
  );

  // Caso 1: Tiene imagen del actor
  if (notificacion.actorImagenUrl) {
    return (
      <div className="relative shrink-0">
        <img
          src={notificacion.actorImagenUrl}
          alt=""
          className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full object-cover"
        />
        {badge}
      </div>
    );
  }

  // Caso 2: Tiene nombre del actor → iniciales
  if (notificacion.actorNombre) {
    return (
      <div className="relative shrink-0">
        <div className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full bg-blue-200 flex items-center justify-center">
          <span className="text-base lg:text-sm 2xl:text-base font-bold text-blue-700">
            {obtenerIniciales(notificacion.actorNombre)}
          </span>
        </div>
        {badge}
      </div>
    );
  }

  // Caso 3: Sin datos del actor → iniciales del título + badge de tipo
  return (
    <div className="relative shrink-0">
      <div className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full bg-blue-200 flex items-center justify-center">
        <span className="text-base lg:text-sm 2xl:text-base font-bold text-blue-700">
          {obtenerIniciales(notificacion.titulo)}
        </span>
      </div>
      {badge}
    </div>
  );
}

// =============================================================================
// COMPONENTE: Contenido de Notificaciones
// =============================================================================

interface ContenidoNotificacionesProps {
  notificaciones: Notificacion[];
  onClickNotificacion: (notificacion: Notificacion) => void;
  onEliminar: (id: string) => void;
  hayMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
}

function ContenidoNotificaciones({
  notificaciones,
  onClickNotificacion,
  onEliminar,
  hayMas,
  cargandoMas,
  onCargarMas,
}: ContenidoNotificacionesProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {notificaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 lg:py-8 2xl:py-12 px-4 text-center">
          <div className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 bg-slate-200 rounded-full flex items-center justify-center mb-4 lg:mb-3 2xl:mb-4">
            <Bell className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-600" />
          </div>
          <p className="text-slate-700 font-bold mb-1 text-sm lg:text-[11px] 2xl:text-sm">
            Sin notificaciones
          </p>
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
            Aquí aparecerán tus notificaciones
          </p>
        </div>
      ) : (
        <div>
          <div className="divide-y divide-slate-300">
            {notificaciones.map((notificacion) => (
              <button
                key={notificacion.id}
                onClick={() => onClickNotificacion(notificacion)}
                className={`
                  group w-full flex items-center gap-3 lg:gap-2.5 2xl:gap-3 px-4 py-2 lg:py-1.5 2xl:py-2
                  hover:bg-slate-100
                  text-left lg:cursor-pointer
                  ${!notificacion.leida ? 'bg-blue-50' : ''}
                `}
              >
                <IconoNotificacion notificacion={notificacion} />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p
                      className={`
                        font-bold text-sm lg:text-[11px] 2xl:text-sm
                        ${!notificacion.leida ? 'text-slate-900' : 'text-slate-700'}
                      `}
                    >
                      {notificacion.titulo}
                    </p>
                    {!notificacion.leida && (
                      <span className="w-2.5 h-2.5 lg:w-2 lg:h-2 2xl:w-2.5 2xl:h-2.5 bg-blue-500 rounded-full shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mb-0.5 whitespace-pre-line line-clamp-3">
                    {notificacion.mensaje}
                  </p>
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-blue-700 font-medium">
                    {formatearFechaRelativa(notificacion.createdAt)}
                  </p>
                </div>

                {/* Botón eliminar */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onEliminar(notificacion.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onEliminar(notificacion.id); } }}
                  className="shrink-0 p-1.5 lg:p-1 2xl:p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-100 rounded-lg lg:cursor-pointer lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5" />
                </div>
              </button>
            ))}
          </div>

          {/* Botón cargar más */}
          {hayMas && (
            <div className="px-4 py-3 lg:py-2.5 2xl:py-3">
              <button
                onClick={onCargarMas}
                disabled={cargandoMas}
                className="w-full py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-[11px] 2xl:text-sm font-bold text-blue-700 hover:bg-blue-100 rounded-xl lg:cursor-pointer"
              >
                {cargandoMas ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE: Footer de Notificaciones
// =============================================================================

interface FooterNotificacionesProps {
  cantidadNoLeidas: number;
  onMarcarTodasLeidas: () => void;
}

function FooterNotificaciones({ cantidadNoLeidas, onMarcarTodasLeidas }: FooterNotificacionesProps) {
  if (cantidadNoLeidas === 0) return null;

  return (
    <div className="shrink-0 border-t-2 border-slate-300 bg-slate-200 px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3">
      <button
        onClick={onMarcarTodasLeidas}
        className="w-full py-3 lg:py-2.5 2xl:py-3 text-sm lg:text-[11px] 2xl:text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-slate-700/30 active:scale-[0.98] lg:cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #334155, #1e293b)' }}
      >
        <Sparkles className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
        <span>Marcar todas como leídas</span>
      </button>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Dropdown Desktop
// =============================================================================

interface DropdownDesktopProps {
  notificaciones: Notificacion[];
  cantidadNoLeidas: number;
  onClose: () => void;
  onClickNotificacion: (notificacion: Notificacion) => void;
  onMarcarTodasLeidas: () => void;
  hayMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
  onEliminar: (id: string) => void;
}

function DropdownDesktop({
  notificaciones,
  cantidadNoLeidas,
  onClose,
  onClickNotificacion,
  onMarcarTodasLeidas,
  hayMas,
  cargandoMas,
  onCargarMas,
  onEliminar,
}: DropdownDesktopProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const esBotonNotificaciones = target.closest('button[title="Notificaciones"]');
      if (esBotonNotificaciones) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="
        fixed z-75
        2xl:top-[68px] 2xl:right-28 right-20 top-[58px]
        w-80 lg:w-80 2xl:w-96
        max-h-[400px] 2xl:max-h-[500px]
        bg-white rounded-2xl shadow-lg border-2 border-slate-300
        flex flex-col
        overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-200
      "
    >
      {/* Header gradiente */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.4)' }}
      >
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
          <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
          </div>
          <h3 className="flex-1 text-lg lg:text-base 2xl:text-lg font-bold text-white">
            Notificaciones
          </h3>
          {cantidadNoLeidas > 0 && (
            <span className="bg-white/20 border border-white/30 text-white text-sm lg:text-[11px] 2xl:text-sm px-2 py-0.5 rounded-full font-bold">
              {cantidadNoLeidas}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 lg:p-1 2xl:p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg lg:cursor-pointer"
          >
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ContenidoNotificaciones
          notificaciones={notificaciones}
          onClickNotificacion={onClickNotificacion}
          onEliminar={onEliminar}
          hayMas={hayMas}
          cargandoMas={cargandoMas}
          onCargarMas={onCargarMas}
        />
      </div>

      {/* Footer */}
      <FooterNotificaciones
        cantidadNoLeidas={cantidadNoLeidas}
        onMarcarTodasLeidas={onMarcarTodasLeidas}
      />
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelNotificaciones() {
  const panelAbierto = useNotificacionesStore((state) => state.panelAbierto);
  const notificaciones = useNotificacionesStore((state) => state.notificaciones);
  const cerrarPanel = useNotificacionesStore((state) => state.cerrarPanel);
  const marcarLeidas = useNotificacionesStore((state) => state.marcarTodasLeidas);
  const marcarLeidaPorId = useNotificacionesStore((state) => state.marcarLeidaPorId);
  const hayMas = useNotificacionesStore((state) => state.hayMas);
  const cargandoMas = useNotificacionesStore((state) => state.cargandoMas);
  const cargarMas = useNotificacionesStore((state) => state.cargarMas);
  const eliminarPorId = useNotificacionesStore((state) => state.eliminarPorId);
  const { esMobile } = useBreakpoint();
  const navigate = useNavigate();
  const cantidadNoLeidas = useNotificacionesStore((state) => state.totalNoLeidas);

  const handleClickNotificacion = (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      marcarLeidaPorId(notificacion.id);
    }
    const ruta = obtenerRutaDestino(notificacion);
    if (ruta) {
      cerrarPanel();
      navigate(ruta);
    }
  };

  const handleMarcarTodasLeidas = () => {
    marcarLeidas();
  };

  if (!panelAbierto) return null;

  return (
    <>
      {esMobile ? (
        <ModalBottom
          abierto={panelAbierto}
          onCerrar={cerrarPanel}
          titulo="Notificaciones"
          iconoTitulo={<Bell className="w-5 h-5 text-white" />}
          mostrarHeader={false}
          sinScrollInterno={true}
          alturaMaxima="md"
        >
          {/* Header gradiente */}
          <div
            className="relative overflow-hidden px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.4)' }}
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h3 className="flex-1 text-xl font-bold text-white">Notificaciones</h3>
              {cantidadNoLeidas > 0 && (
                <span className="bg-white/20 border border-white/30 text-white text-sm px-2.5 py-1 rounded-full font-bold">
                  {cantidadNoLeidas}
                </span>
              )}
            </div>
          </div>

          <ContenidoNotificaciones
            notificaciones={notificaciones}
            onClickNotificacion={handleClickNotificacion}
            onEliminar={eliminarPorId}
            hayMas={hayMas}
            cargandoMas={cargandoMas}
            onCargarMas={cargarMas}
          />

          <FooterNotificaciones
            cantidadNoLeidas={cantidadNoLeidas}
            onMarcarTodasLeidas={handleMarcarTodasLeidas}
          />
        </ModalBottom>
      ) : (
        <DropdownDesktop
          notificaciones={notificaciones}
          cantidadNoLeidas={cantidadNoLeidas}
          onClose={cerrarPanel}
          onClickNotificacion={handleClickNotificacion}
          onMarcarTodasLeidas={handleMarcarTodasLeidas}
          hayMas={hayMas}
          cargandoMas={cargandoMas}
          onCargarMas={cargarMas}
          onEliminar={eliminarPorId}
        />
      )}
    </>
  );
}

export default PanelNotificaciones;
