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

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ShoppingBag,
  Trophy,
  Ban,
  Clock,
  Briefcase,
  Zap,
  type LucideProps,
} from 'lucide-react';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Notificacion } from '../../types/notificaciones';
import { obtenerIniciales } from '../../utils/obtenerIniciales';

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
      return { icono: Coins, gradiente: 'linear-gradient(135deg, #f59e0b, #d97706)' };
    case 'voucher_generado':
      return { icono: Ticket, gradiente: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' };
    case 'voucher_cobrado':
      return { icono: Trophy, gradiente: 'linear-gradient(135deg, #10b981, #047857)' };
    case 'voucher_pendiente':
      return { icono: Clock, gradiente: 'linear-gradient(135deg, #f97316, #c2410c)' };
    case 'nueva_oferta':
      return { icono: Tag, gradiente: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' };
    case 'cupon_asignado':
      return { icono: Gift, gradiente: 'linear-gradient(135deg, #14b8a6, #0d9488)' };
    case 'cupon_revocado':
      return { icono: Ban, gradiente: 'linear-gradient(135deg, #ef4444, #b91c1c)' };
    case 'nueva_recompensa':
      return { icono: Sparkles, gradiente: 'linear-gradient(135deg, #a855f7, #7c3aed)' };
    case 'recompensa_desbloqueada':
      return { icono: Zap, gradiente: 'linear-gradient(135deg, #eab308, #a16207)' };
    case 'nuevo_cliente':
      return { icono: UserPlus, gradiente: 'linear-gradient(135deg, #06b6d4, #0891b2)' };
    case 'stock_bajo':
      return { icono: AlertTriangle, gradiente: 'linear-gradient(135deg, #dc2626, #991b1b)' };
    case 'nueva_resena':
      return { icono: Star, gradiente: 'linear-gradient(135deg, #f59e0b, #b45309)' };
    case 'nuevo_marketplace':
      return { icono: ShoppingBag, gradiente: 'linear-gradient(135deg, #ec4899, #be185d)' };
    case 'nueva_dinamica':
      return { icono: Megaphone, gradiente: 'linear-gradient(135deg, #6366f1, #4338ca)' };
    case 'nuevo_empleo':
      return { icono: Briefcase, gradiente: 'linear-gradient(135deg, #0ea5e9, #0369a1)' };
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
// HELPERS: Iniciales y colores para avatares
// =============================================================================


const COLORES_INICIALES = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

const obtenerColorIniciales = (nombre: string): string => {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_INICIALES[Math.abs(hash) % COLORES_INICIALES.length];
};

// Tipos comerciales relacionados con un usuario/cliente
const TIPOS_USUARIO_COMERCIAL = new Set<Notificacion['tipo']>([
  'puntos_ganados', 'voucher_cobrado', 'voucher_pendiente', 'nueva_resena', 'nuevo_cliente',
]);

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
  const imagenContenido = notificacion.actorImagenUrl;

  // Badge de tipo (siempre visible, superpuesto abajo-derecha)
  const badge = (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
      style={{ background: config.gradiente }}
    >
      <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
    </div>
  );

  // Caso 1: Tiene imagen → foto + badge
  if (imagenContenido) {
    return (
      <div className="relative shrink-0">
        <img
          src={imagenContenido}
          alt=""
          className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full object-cover"
        />
        {badge}
      </div>
    );
  }

  // Caso 2: Tiene nombre pero no imagen → iniciales + badge
  if (notificacion.actorNombre) {
    const iniciales = obtenerIniciales(notificacion.actorNombre);
    const colorFondo = obtenerColorIniciales(notificacion.actorNombre);
    return (
      <div className="relative shrink-0">
        <div
          className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full flex items-center justify-center"
          style={{ background: colorFondo }}
        >
          <span className="text-white font-bold text-lg lg:text-base 2xl:text-lg select-none">
            {iniciales}
          </span>
        </div>
        {badge}
      </div>
    );
  }

  // Caso 3: Sin imagen ni nombre → icono del tipo (sin badge, el círculo ya ES el tipo)
  return (
    <div className="relative shrink-0">
      <div
        className="w-14 h-14 lg:w-13 lg:h-13 2xl:w-14 2xl:h-14 rounded-full flex items-center justify-center"
        style={{ background: config.gradiente }}
      >
        <Icono className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Contenido de una notificación individual
// =============================================================================

const PuntoNoLeida = () => (
  <span className="w-2.5 h-2.5 lg:w-2 lg:h-2 2xl:w-2.5 2xl:h-2.5 bg-blue-500 rounded-full shrink-0" />
);

// Limpia el nombre del actor del mensaje (notificaciones legacy que lo incluían)
const limpiarMensajeComercial = (mensaje: string, actorNombre: string): string => {
  return mensaje
    .split('\n')
    .map((linea) => {
      const l = linea.trim();
      // Línea es exactamente el nombre → eliminar
      if (l === actorNombre) return '';
      // "Nombre: texto" → quitar prefijo "Nombre: "
      if (l.startsWith(`${actorNombre}: `)) return l.slice(actorNombre.length + 2);
      // "Nombre verbo..." → quitar prefijo, capitalizar resto
      if (l.startsWith(`${actorNombre} `)) {
        const resto = l.slice(actorNombre.length + 1);
        return resto.charAt(0).toUpperCase() + resto.slice(1);
      }
      // "...texto a Nombre" al final → quitar sufijo
      if (l.endsWith(` a ${actorNombre}`)) return l.slice(0, -(actorNombre.length + 3));
      // Legacy "Canjeó: X" → "Canjeó sus puntos por: X"
      if (l.startsWith('Canjeó: ')) return l.replace('Canjeó: ', 'Canjeó sus puntos por: ');
      return linea;
    })
    .filter(Boolean)
    .join('\n');
};

function ContenidoItem({ notificacion, expandida }: { notificacion: Notificacion; expandida?: boolean }) {
  const tiempo = (
    <p className="text-sm lg:text-[11px] 2xl:text-sm text-blue-700 font-medium">
      {formatearFechaRelativa(notificacion.createdAt)}
    </p>
  );

  // Subtítulo con el nombre de la sucursal (backend ya devuelve 'Matriz' para
  // la principal cuando el negocio tiene varias, o null cuando es única).
  const sucursalLabel = notificacion.sucursalNombre;

  const esComercialConUsuario =
    notificacion.modo === 'comercial' &&
    notificacion.actorNombre &&
    TIPOS_USUARIO_COMERCIAL.has(notificacion.tipo);

  // ─── Comercial con usuario (ventas, vouchers, reseñas, nuevo cliente) ───
  if (esComercialConUsuario) {
    const mensajeLimpio = limpiarMensajeComercial(notificacion.mensaje, notificacion.actorNombre!);
    const lineasMensaje = mensajeLimpio.split('\n').filter(Boolean);

    // Transformar títulos legacy para notificaciones existentes en BD
    let tituloMostrar = notificacion.titulo;
    if (tituloMostrar.startsWith('Venta con cupón: $')) {
      tituloMostrar = tituloMostrar.replace('Venta con cupón: $', 'Compró $') + ' con cupón';
    } else if (tituloMostrar.startsWith('Venta: $')) {
      tituloMostrar = tituloMostrar.replace('Venta: $', 'Compró $');
    } else if (tituloMostrar === 'Cupón canjeado') {
      tituloMostrar = 'Canjeó cupón';
    } else if (tituloMostrar === 'Nuevo voucher por entregar') {
      tituloMostrar = 'Recompensa por entregar';
    } else if (tituloMostrar === 'Voucher entregado') {
      tituloMostrar = 'Recompensa entregada';
    }

    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-base lg:text-sm 2xl:text-base text-blue-800 font-bold truncate">
            {notificacion.actorNombre}
          </span>
          {!notificacion.leida && <PuntoNoLeida />}
        </div>
        {sucursalLabel && (
          <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700 truncate mb-0.5">
            {sucursalLabel}
          </p>
        )}
        <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-0.5">
          {tituloMostrar}
        </p>
        {lineasMensaje.map((linea, i) => (
          <p key={i} className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
            {linea}
          </p>
        ))}
        {tiempo}
      </>
    );
  }

  // ─── Comercial sin usuario (stock_bajo, sistema, etc.) ───
  if (notificacion.modo === 'comercial') {
    return (
      <>
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-900 truncate">
            {notificacion.titulo}
          </p>
          {!notificacion.leida && <PuntoNoLeida />}
        </div>
        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mb-0.5 whitespace-pre-line line-clamp-3">
          {notificacion.mensaje}
        </p>
        {tiempo}
      </>
    );
  }

  // ─── Personal con actor (negocio) y patrón \n ───
  if (notificacion.actorNombre && notificacion.mensaje.includes('\n')) {
    // Transformar títulos y mensajes legacy para notificaciones existentes en BD
    let tituloPersonal = notificacion.titulo;
    let mensajePersonal = notificacion.mensaje.split('\n')[0];

    // Legacy: "+N puntos" → "Compra Registrada" con puntos en mensaje
    const matchPuntos = tituloPersonal.match(/^\+(\d+) puntos$/);
    if (matchPuntos) {
      mensajePersonal = `+${matchPuntos[1]} puntos Ganados`;
      tituloPersonal = 'Compra Registrada';
    }
    // Legacy: "+N puntos con cupón" → "Compra Registrada con Cupón"
    const matchPuntosCupon = tituloPersonal.match(/^\+(\d+) puntos con cupón$/);
    if (matchPuntosCupon) {
      mensajePersonal = `+${matchPuntosCupon[1]} puntos Ganados`;
      tituloPersonal = 'Compra con Cupón';
    }
    // Legacy: "Respondieron tu reseña" → "Respondió tu reseña"
    if (tituloPersonal === 'Respondieron tu reseña') tituloPersonal = 'Respondió tu reseña';
    // Legacy: "¡Oferta exclusiva para ti!" → "¡Recibiste un Cupón Exclusivo!"
    if (tituloPersonal === '¡Oferta exclusiva para ti!') tituloPersonal = '¡Recibiste un Cupón Exclusivo!';
    // Legacy: "Compraste en" → mejor no mostrar (ya está el negocio arriba)
    if (mensajePersonal === 'Compraste en') mensajePersonal = '';
    // Legacy: "Canjeaste: X" → "X — muestra el código en el negocio"
    if (mensajePersonal.startsWith('Canjeaste: ')) mensajePersonal = `${mensajePersonal.replace('Canjeaste: ', '')} — muestra el código en el negocio`;
    // Legacy: "Recibiste: X" → solo "X"
    if (mensajePersonal.startsWith('Recibiste: ')) mensajePersonal = mensajePersonal.replace('Recibiste: ', '');

    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-base lg:text-sm 2xl:text-base text-blue-800 font-bold truncate">
            {notificacion.actorNombre}
          </span>
          {!notificacion.leida && <PuntoNoLeida />}
        </div>
        {sucursalLabel && (
          <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700 truncate mb-0.5">
            {sucursalLabel}
          </p>
        )}
        <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-0.5">
          {tituloPersonal}
        </p>
        {mensajePersonal && (
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mb-0.5">
            {mensajePersonal}
          </p>
        )}
        {tiempo}
      </>
    );
  }

  // ─── Personal con actor pero sin \n (ej: sistema de niveles) ───
  if (notificacion.actorNombre) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-base lg:text-sm 2xl:text-base text-blue-800 font-bold truncate">
            {notificacion.actorNombre}
          </span>
          {!notificacion.leida && <PuntoNoLeida />}
        </div>
        {sucursalLabel && (
          <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700 truncate mb-0.5">
            {sucursalLabel}
          </p>
        )}
        <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-0.5">
          {notificacion.titulo}
        </p>
        <p className={`text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mb-0.5 whitespace-pre-line ${expandida ? '' : 'line-clamp-2'}`}>
          {notificacion.mensaje}
        </p>
        {tiempo}
      </>
    );
  }

  // ─── Personal sin actor (default) ───
  return (
    <>
      <div className="flex items-center gap-1.5 mb-0.5">
        <p className={`font-bold text-sm lg:text-[11px] 2xl:text-sm truncate ${!notificacion.leida ? 'text-slate-900' : 'text-slate-700'}`}>
          {notificacion.titulo}
        </p>
        {!notificacion.leida && <PuntoNoLeida />}
      </div>
      <p className={`text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mb-0.5 whitespace-pre-line ${expandida ? '' : 'line-clamp-3'}`}>
        {notificacion.mensaje}
      </p>
      {tiempo}
    </>
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
  expandidaId: string | null;
}

function ContenidoNotificaciones({
  notificaciones,
  onClickNotificacion,
  onEliminar,
  hayMas,
  cargandoMas,
  onCargarMas,
  expandidaId,
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
                  group w-full text-left lg:cursor-pointer
                  hover:bg-slate-100
                  ${!notificacion.leida ? 'bg-blue-50' : ''}
                `}
              >
                <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 px-4 py-2 lg:py-1.5 2xl:py-2">
                <IconoNotificacion notificacion={notificacion} />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <ContenidoItem notificacion={notificacion} expandida={expandidaId === notificacion.id} />
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
                className="w-full py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl lg:cursor-pointer"
              >
                {cargandoMas ? 'Cargando...' : 'Ver notificaciones anteriores'}
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
  expandidaId: string | null;
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
  expandidaId,
}: DropdownDesktopProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Ignorar clicks en el botón de campana del navbar (lo identifica su data-attribute,
      // no el title — el title se quitó del botón para limpiar UX).
      const esBotonNotificaciones = target.closest('button[data-notificaciones-boton="true"]');
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
        2xl:top-[68px] 2xl:right-6 right-4 top-[58px]
        w-80 lg:w-80 2xl:w-96
        max-h-[85vh]
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
            <span className="bg-white/20 border border-white/30 text-white text-sm lg:text-[11px] 2xl:text-sm min-w-7 h-7 lg:min-w-6 lg:h-6 2xl:min-w-7 2xl:h-7 px-1.5 rounded-full font-bold flex items-center justify-center">
              {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
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
          expandidaId={expandidaId}
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
  const location = useLocation();
  const cantidadNoLeidas = useNotificacionesStore((state) => state.totalNoLeidas);

  const [expandidaId, setExpandidaId] = useState<string | null>(null);

  const handleClickNotificacion = (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      marcarLeidaPorId(notificacion.id);
    }
    const ruta = obtenerRutaDestino(notificacion);
    if (ruta) {
      cerrarPanel();
      // Si ya estamos en la misma ruta base, usar replace para no recargar
      const [rutaBase, query] = ruta.split('?');
      if (location.pathname === rutaBase && query) {
        navigate(`${rutaBase}?${query}`, { replace: true });
      } else {
        navigate(ruta);
      }
    } else {
      // Sin ruta → toggle expansión del mensaje
      setExpandidaId((prev) => prev === notificacion.id ? null : notificacion.id);
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
          alturaMaxima="xl"
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
                <span className="bg-white/20 border border-white/30 text-white text-sm min-w-8 h-8 px-2 rounded-full font-bold flex items-center justify-center">
                  {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
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
            expandidaId={expandidaId}
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
          expandidaId={expandidaId}
        />
      )}
    </>
  );
}

export default PanelNotificaciones;
