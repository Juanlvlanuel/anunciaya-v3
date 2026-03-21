/**
 * PanelInfoContacto.tsx
 * ======================
 * Panel lateral derecho dentro de VentanaChat.
 * Se abre al hacer click en el header (avatar + nombre del contacto).
 *
 * 3 VISTAS DINÁMICAS según el contexto:
 *   - Vista 1: Usuario → Usuario  (personal, el otro no es negocio)
 *   - Vista 2: Usuario → Negocio  (cliente viendo al negocio)
 *   - Vista 3: Negocio → Usuario  (comerciante viendo al cliente)
 *
 * UBICACIÓN: apps/web/src/components/chatya/PanelInfoContacto.tsx
 */

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import {
  X, Store, Star, Clock, ExternalLink, Bell, BellOff,
  ShieldBan, Trash2, ChevronRight, Award, Coins, Calendar, User, UserPlus, UserMinus, ArrowLeft,
  FileText, ArrowUpRight, MapPin,
} from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerPerfilSucursal } from '../../services/negociosService';
import { getDetalleCliente } from '../../services/clientesService';
import { getConteoArchivosCompartidos, getArchivosCompartidos } from '../../services/chatyaService';
import type { Conversacion, ConteoArchivosCompartidos, ArchivoCompartido, ContenidoImagen } from '../../types/chatya';
import type { NegocioCompleto } from '../../types/negocios';
import type { ClienteDetalle } from '../../types/clientes';
import { notificar } from '../../utils/notificaciones';
import { useBreakpoint, BreakpointOverride } from '../../hooks/useBreakpoint';
import { GaleriaArchivosCompartidos, invalidarCachéGaleria } from './GaleriaArchivosCompartidos';
import Tooltip from '../ui/Tooltip';
import { ModalHorarios } from '../negocios/ModalHorarios';

// Lazy load — mantiene PaginaPerfilNegocio en su propio chunk (code-split)
const PaginaPerfilNegocio = lazy(() => import('../../pages/private/negocios/PaginaPerfilNegocio'));

// =============================================================================
// CACHÉ EN MEMORIA (persiste mientras la app esté montada)
// =============================================================================
export const cachéNegocio = new Map<string, NegocioCompleto>();
export const cachéCliente = new Map<string, ClienteDetalle>();
export const cachéConteoArchivos = new Map<string, ConteoArchivosCompartidos>();
export const cachéArchivosRecientes = new Map<string, ArchivoCompartido[]>();

/** Invalida caché de archivos compartidos (llamar al enviar imagen/documento/enlace) */
export function invalidarCachéArchivos(conversacionId: string) {
  cachéConteoArchivos.delete(conversacionId);
  cachéArchivosRecientes.delete(conversacionId);
  invalidarCachéGaleria(conversacionId);
}

// =============================================================================
// HELPERS
// =============================================================================

function nivelColor(nivel: string) {
  const n = nivel?.toLowerCase();
  if (n === 'oro') return 'text-amber-500';
  if (n === 'plata') return 'text-slate-600';
  return 'text-amber-700';
}

function nivelEmoji(nivel: string) {
  const n = nivel?.toLowerCase();
  if (n === 'oro') return '🥇';
  if (n === 'plata') return '🥈';
  return '🥉';
}

function formatFecha(fecha: string | null) {
  if (!fecha) return 'Sin registros';
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Convierte "HH:MM" a formato 12hrs */
function formatoHora12(hora24: string): string {
  const [h, m] = hora24.split(':').map(Number);
  const periodo = h >= 12 ? 'PM' : 'AM';
  const hora12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
}

/** Obtiene el horario de hoy en formato legible */
function horarioHoy(horarios: NegocioCompleto['horarios']): string | null {
  if (!horarios?.length) return null;
  const hoy = new Date().getDay();
  const diaHoy = horarios.find((h) => h.diaSemana === hoy);
  if (!diaHoy || !diaHoy.abierto) return null;
  const apertura = diaHoy.horaApertura?.slice(0, 5) || '';
  const cierre = diaHoy.horaCierre?.slice(0, 5) || '';
  return apertura && cierre ? `${formatoHora12(apertura)} - ${formatoHora12(cierre)}` : null;
}

/** Calcula si el negocio está abierto ahora según sus horarios */
function calcularAbierto(horarios: NegocioCompleto['horarios']): boolean {
  if (!horarios?.length) return false;
  const ahora = new Date();
  const hoy = ahora.getDay();
  const diaHoy = horarios.find((h) => h.diaSemana === hoy);
  if (!diaHoy || !diaHoy.abierto) return false;
  const [hA, mA] = diaHoy.horaApertura.split(':').map(Number);
  const [hC, mC] = diaHoy.horaCierre.split(':').map(Number);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const minApertura = hA * 60 + mA;
  const minCierre = hC * 60 + mC;
  return minAhora >= minApertura && minAhora < minCierre;
}

// =============================================================================
// PROPS
// =============================================================================

interface PanelInfoContactoProps {
  conversacion: Conversacion;
  esTemporal?: boolean;
  onCerrar: () => void;
  onAbrirImagen: (url: string) => void;
  onAbrirVisorArchivos: (archivoId: string) => void;
  archivosKey?: number;
}

// =============================================================================
// Helper: Formatear "última vez" relativo
// =============================================================================
function formatearUltimaVez(timestamp: number): string {
  const ahora = new Date();
  const fecha = new Date(timestamp);

  const hora = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (fecha.toDateString() === ahora.toDateString()) {
    return `últ. vez hoy a la(s) ${hora}`;
  }

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) {
    return `últ. vez ayer a la(s) ${hora}`;
  }

  const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / 86400000);
  if (diffDias < 7) {
    const dia = fecha.toLocaleDateString('es-MX', { weekday: 'long' });
    return `últ. vez el ${dia} a la(s) ${hora}`;
  }

  const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: fecha.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined });
  return `últ. vez el ${fechaStr} a la(s) ${hora}`;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelInfoContacto({ conversacion, esTemporal, onCerrar, onAbrirImagen, onAbrirVisorArchivos, archivosKey = 0 }: PanelInfoContactoProps) {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((s) => s.usuario);
  const modoActivo = usuario?.modoActivo || 'personal';
  const miId = usuario?.id || '';
  const { esMobile } = useBreakpoint();

  const toggleSilenciar = useChatYAStore((s) => s.toggleSilenciar);
  const eliminarConversacion = useChatYAStore((s) => s.eliminarConversacion);
  const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
  const contactos = useChatYAStore((s) => s.contactos);
  const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
  const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);
  const estadosUsuarios = useChatYAStore((s) => s.estadosUsuarios);

  // ---------------------------------------------------------------------------
  // Derivados de la conversación
  // ---------------------------------------------------------------------------
  const otro = conversacion.otroParticipante;
  const esNegocio = !!otro?.negocioNombre;
  const esModoComercial = modoActivo === 'comercial';
  const estadoOtro = otro?.id ? estadosUsuarios[otro.id] : null;

  // Tipo de vista según contexto
  const tipoVista: 'usuario' | 'negocio' | 'cliente' =
    esNegocio ? 'negocio' : esModoComercial ? 'cliente' : 'usuario';

  // sucursalId del participante que NO soy yo (el negocio)
  const sucursalIdNegocio =
    conversacion.participante1Id === miId
      ? conversacion.participante2SucursalId
      : conversacion.participante1SucursalId;

  const nombre = otro?.negocioNombre || `${otro?.nombre || ''} ${otro?.apellidos || ''}`.trim();
  const avatarUrl = otro?.negocioLogo || otro?.avatarUrl || null;
  const iniciales = nombre
    ? nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  // Verificar si ya es contacto
  const contactoExistente = otro
    ? contactos.find((c) =>
        c.contactoId === otro.id &&
        c.tipo === modoActivo &&
        c.sucursalId === sucursalIdNegocio
      )
    : undefined;

  // Alias del contacto tiene prioridad sobre el nombre real
  const nombreMostrar = contactoExistente?.alias?.trim() || nombre;

  const handleToggleContacto = async () => {
    if (!otro) return;
    if (contactoExistente) {
      await eliminarContactoStore(contactoExistente.id);
    } else {
      await agregarContactoStore({
        contactoId: otro.id,
        tipo: modoActivo as 'personal' | 'comercial',
        sucursalId: sucursalIdNegocio || null,
      }, {
        nombre: otro.nombre || '',
        apellidos: otro.apellidos || '',
        avatarUrl: otro.avatarUrl || otro.negocioLogo || null,
        negocioNombre: otro.negocioNombre,
        negocioLogo: otro.negocioLogo,
        sucursalNombre: otro.sucursalNombre,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [, forzarRender] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);
  const [vistaPerfilAbierta, setVistaPerfilAbierta] = useState(false);
  const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
  const vistaPerfilHistoryRef = useRef(false);
  const popStatePerfilRef = useRef<(() => void) | null>(null);

  /** Cerrar vista perfil limpiando historial (para botón UI y flecha header) */
  const cerrarVistaPerfil = useCallback(() => {
    if (vistaPerfilHistoryRef.current) {
      vistaPerfilHistoryRef.current = false;
      if (popStatePerfilRef.current) {
        window.removeEventListener('popstate', popStatePerfilRef.current);
        popStatePerfilRef.current = null;
      }
      history.back();
    }
    setVistaPerfilAbierta(false);
  }, []);

  // Botón atrás nativo: cerrar vista perfil
  const vistaPerfilIdRef = useRef(`_vp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    if (!vistaPerfilAbierta) {
      vistaPerfilHistoryRef.current = false;
      popStatePerfilRef.current = null;
      return;
    }

    const id = vistaPerfilIdRef.current;

    if (!vistaPerfilHistoryRef.current) {
      const prevState = history.state ?? {};
      history.pushState({ ...prevState, _vistaPerfilChat: id }, '', window.location.href);
      vistaPerfilHistoryRef.current = true;
    }

    const onPopState = () => {
      if (!vistaPerfilHistoryRef.current) return;
      // Solo cerrar si NUESTRA entrada fue la consumida
      if (history.state?._vistaPerfilChat === id) return;
      vistaPerfilHistoryRef.current = false;
      popStatePerfilRef.current = null;
      setVistaPerfilAbierta(false);
    };

    popStatePerfilRef.current = onPopState;
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      popStatePerfilRef.current = null;
    };
  }, [vistaPerfilAbierta]);

  // Leer siempre del caché por ID — nunca datos de un chat anterior
  const negocioEfectivo = sucursalIdNegocio ? cachéNegocio.get(sucursalIdNegocio) ?? null : null;
  const clienteEfectivo = otro ? cachéCliente.get(otro.id) ?? null : null;
  const conteoArchivos = cachéConteoArchivos.get(conversacion.id) ?? null;
  const archivosRecientes = cachéArchivosRecientes.get(conversacion.id) ?? null;

  // ---------------------------------------------------------------------------
  // Cargar datos según vista
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!otro) return;

    if (tipoVista === 'negocio' && sucursalIdNegocio) {
      if (cachéNegocio.has(sucursalIdNegocio)) return; // ya está en caché
      setCargando(true);
      obtenerPerfilSucursal(sucursalIdNegocio)
        .then((res) => {
          if (res.success && res.data) {
            cachéNegocio.set(sucursalIdNegocio, res.data);
            forzarRender((n) => n + 1);
          }
        })
        .catch(() => void 0)
        .finally(() => setCargando(false));

    } else if (tipoVista === 'cliente') {
      if (cachéCliente.has(otro.id)) return; // ya está en caché
      setCargando(true);
      getDetalleCliente(otro.id)
        .then((res) => {
          if (res.success && res.data) {
            cachéCliente.set(otro.id, res.data);
            forzarRender((n) => n + 1);
          }
        })
        .catch(() => void 0)
        .finally(() => setCargando(false));
    }
  }, [otro?.id, tipoVista, sucursalIdNegocio]);

  // ---------------------------------------------------------------------------
  // Cargar conteo + preview de archivos compartidos (caché por conversacionId)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esTemporal) return; // conversaciones temporales no tienen archivos

    const convId = conversacion.id;
    if (cachéConteoArchivos.has(convId)) return; // ya está en caché

    // Cargar conteo + últimas 6 imágenes en paralelo
    Promise.all([
      getConteoArchivosCompartidos(convId),
      getArchivosCompartidos(convId, 'imagenes', 6, 0),
    ])
      .then(([conteoRes, imgRes]) => {
        if (conteoRes.success && conteoRes.data) {
          cachéConteoArchivos.set(convId, conteoRes.data);
        }
        if (imgRes.success && imgRes.data) {
          cachéArchivosRecientes.set(convId, imgRes.data.items);
        }
        forzarRender((n) => n + 1);
      })
      .catch(() => void 0);
  }, [conversacion.id, esTemporal, archivosKey]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSilenciar = () => toggleSilenciar(conversacion.id);

  const handleBloquear = async () => {
    if (!otro) return;
    bloquearUsuario({ bloqueadoId: otro.id });
    onCerrar();
  };

  const handleEliminar = async () => {
    const confirmado = await notificar.confirmar(
      '¿Eliminar chat?',
      'Se eliminará para ti. Si el otro también elimina, se borra permanentemente.'
    );
    if (confirmado) { eliminarConversacion(conversacion.id); onCerrar(); }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={`${esMobile ? 'w-full h-full' : vistaPerfilAbierta ? 'w-[500px] 2xl:w-[560px] min-w-[500px] 2xl:min-w-[560px] h-full border-l border-gray-200' : 'w-[320px] 2xl:w-[340px] min-w-[320px] 2xl:min-w-[340px] h-full border-l border-gray-200'} relative flex flex-col ${esMobile ? 'bg-linear-to-b from-[#0B358F] to-[#050d1a]' : 'bg-slate-100'} overflow-hidden shrink-0`}>

      {/* ─── Bloque A: Contenido principal + Galería — precargado, oculto con CSS cuando perfil abre ─── */}
      <div className={`flex-1 flex flex-col ${vistaPerfilAbierta ? 'hidden' : ''}`} style={{ minHeight: 0 }}>
      {!galeriaAbierta ? (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,120,150,0.35) transparent' }}>
      {/* ── Botón cerrar flotante ── */}
      <div className="shrink-0 px-2 pt-2" style={esMobile ? { paddingTop: 'max(0.5rem, env(safe-area-inset-top))' } : undefined}>
        {esMobile ? (
          <button
            onClick={onCerrar}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/70 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={onCerrar}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-600 hover:text-red-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Avatar + Nombre ── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-5 gap-3">
        {/* Avatar con botón contacto */}
        <div className="relative">
          <div
            role="button"
            tabIndex={avatarUrl ? 0 : -1}
            onClick={(e) => { e.stopPropagation(); if (avatarUrl) onAbrirImagen(avatarUrl); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && avatarUrl) onAbrirImagen(avatarUrl); }}
            className={`w-24 h-24 rounded-full overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] shrink-0 ${avatarUrl ? 'cursor-pointer hover:opacity-90' : ''}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={nombreMostrar} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-white text-2xl font-bold
                ${tipoVista === 'negocio'
                  ? 'bg-linear-to-br from-amber-400 to-amber-600'
                  : 'bg-linear-to-br from-blue-500 to-blue-700'
                }`}
              >
                {iniciales}
              </div>
            )}
          </div>

          {/* Botón contacto — círculo encimado en esquina inferior-derecha del avatar */}
          <div className="absolute bottom-0 right-0">
            {esMobile ? (
              <button
                onClick={handleToggleContacto}
                className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-[2.5px] border-white active:scale-95 ${
                  contactoExistente
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {contactoExistente ? <UserMinus className="w-[15px] h-[15px]" /> : <UserPlus className="w-[15px] h-[15px]" />}
              </button>
            ) : (
              <Tooltip text={contactoExistente ? 'Quitar de contactos' : 'Agregar a contactos'} position="bottom">
                <button
                  onClick={handleToggleContacto}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-[2.5px] border-white active:scale-95 ${
                    contactoExistente
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {contactoExistente ? <UserMinus className="w-[15px] h-[15px]" /> : <UserPlus className="w-[15px] h-[15px]" />}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5 text-center">
          {/* CON ALIAS: Alias > Nombre real > Sucursal */}
          {contactoExistente?.alias?.trim() ? (
            <>
              <p className="text-[19px] lg:text-[19px] font-bold text-white lg:text-gray-800 leading-snug">{contactoExistente.alias.trim()}</p>
              {tipoVista === 'negocio' ? (
                <span className="flex items-center gap-2 text-[15px] font-bold text-blue-400 lg:text-gray-800">
                  <Store className="w-4 h-4 shrink-0" />
                  {nombre}
                </span>
              ) : (
                <p className="text-[15px] text-white/60 lg:text-slate-600 font-medium">{nombre}</p>
              )}
              {tipoVista === 'negocio' && otro?.sucursalNombre && (
                <p className="text-[14px] text-white/50 lg:text-gray-600 font-medium">
                  Suc. {otro.sucursalNombre.includes(' - ')
                    ? otro.sucursalNombre.split(' - ').slice(1).join(' - ')
                    : otro.sucursalNombre}
                </p>
              )}
            </>
          ) : (
            <>
              {/* SIN ALIAS: Nombre > Sucursal */}
              {tipoVista === 'negocio' ? (
                <span className="flex items-center gap-2 text-[20px] font-bold text-blue-400 lg:text-gray-800 leading-snug">
                  <Store className="w-5 h-5 shrink-0" />
                  {nombre}
                </span>
              ) : (
                <p className="text-[20px] font-bold text-white lg:text-gray-800 leading-snug">{nombre}</p>
              )}
              {tipoVista === 'negocio' && otro?.sucursalNombre && (
                <p className="text-[14px] text-white/50 lg:text-gray-600 font-medium">
                  Suc. {otro.sucursalNombre.includes(' - ')
                    ? otro.sucursalNombre.split(' - ').slice(1).join(' - ')
                    : otro.sucursalNombre}
                </p>
              )}
            </>
          )}

          {estadoOtro?.estado === 'conectado' ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                En línea
              </span>
            ) : estadoOtro?.estado === 'ausente' ? (
              <span className="flex items-center gap-1.5 text-sm text-amber-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Ausente
              </span>
            ) : estadoOtro?.estado === 'desconectado' ? (
              <span className="text-sm text-white/70 lg:text-slate-600 font-semibold">
                {formatearUltimaVez(estadoOtro.timestamp)}
              </span>
            ) : (
              <span className="text-sm text-white/30 lg:text-slate-600">...</span>
            )}
          {conversacion.contextoTipo && conversacion.contextoTipo !== 'directo' && conversacion.contextoTipo !== 'notas' && (
            <span className="text-sm lg:text-[11px] 2xl:text-sm text-white/40 lg:text-slate-600 font-medium mt-0.5">
              {conversacion.contextoTipo === 'negocio' && 'Contactó desde: Tu perfil'}
              {conversacion.contextoTipo === 'oferta' && `Contactó por oferta: ${conversacion.contextoNombre || 'Ofertas'}`}
              {conversacion.contextoTipo === 'marketplace' && `Contactó por publicación: ${conversacion.contextoNombre || 'Marketplace'}`}
              {conversacion.contextoTipo === 'empleo' && `Contactó por vacante: ${conversacion.contextoNombre || 'Empleos'}`}
              {conversacion.contextoTipo === 'dinamica' && `Contactó por dinámica: ${conversacion.contextoNombre || 'Dinámicas'}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Contenido dinámico ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,120,150,0.35) transparent' }}>

        {/* ════ VISTA 2: Usuario → Negocio ════ */}
        {tipoVista === 'negocio' && (
          <div className="px-4 py-4 flex flex-col gap-3">
            {cargando && !negocioEfectivo ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : negocioEfectivo ? (
              <>
                {/* Rating + Categoría en un solo renglón */}
                <div className="flex items-center gap-2.5 bg-slate-200 shadow-sm rounded-xl px-3 py-2.5 border-2 border-slate-300">
                  {parseFloat(negocioEfectivo.calificacionPromedio) > 0 ? (
                    <>
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-800">
                        {parseFloat(negocioEfectivo.calificacionPromedio).toFixed(1)}
                      </span>
                      <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                        ({negocioEfectivo.totalCalificaciones})
                      </span>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-sm text-slate-600 font-medium">Sin reseñas aún</span>
                    </>
                  )}
                  {negocioEfectivo.categorias?.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                      <Store className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium truncate">
                        {negocioEfectivo.categorias[0].categoria.nombre}
                      </span>
                    </div>
                  )}
                </div>

                {/* Horario + estado — clickeable para abrir modal */}
                <button
                  onClick={() => setModalHorariosAbierto(true)}
                  className="flex items-center gap-2.5 bg-slate-200 shadow-sm rounded-xl px-3 py-2.5 w-full cursor-pointer hover:bg-slate-300 border-2 border-slate-300"
                >
                  <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="flex flex-col flex-1 text-left">
                    <span className={`text-base lg:text-sm font-semibold ${calcularAbierto(negocioEfectivo.horarios) ? 'text-emerald-600' : 'text-red-600'}`}>
                      {calcularAbierto(negocioEfectivo.horarios) ? 'Abierto ahora' : 'Cerrado'}
                    </span>
                    {(() => {
                      const h = horarioHoy(negocioEfectivo.horarios);
                      return h ? <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{h}</span> : null;
                    })()}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
                </button>

                {/* Modal de horarios */}
                {modalHorariosAbierto && negocioEfectivo.horarios && (
                  <ModalHorarios
                    horarios={negocioEfectivo.horarios}
                    onClose={() => setModalHorariosAbierto(false)}
                  />
                )}

                {/* Ver perfil + Ubicación */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVistaPerfilAbierta(true)}
                    className="flex items-center gap-2 flex-1 bg-slate-200 shadow-sm rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-300 border-2 border-slate-300"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-semibold text-blue-600">Ver Perfil</span>
                    <ArrowUpRight className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${negocioEfectivo.latitud},${negocioEfectivo.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 flex-1 bg-slate-200 shadow-sm rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-300 border-2 border-slate-300"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-600">Ubicación</span>
                    <ArrowUpRight className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 text-center py-2 font-medium">No se pudo cargar la información</p>
            )}
          </div>
        )}

        {/* ════ VISTA 3: Negocio → Cliente ════ */}
        {tipoVista === 'cliente' && (
          <div className="px-4 py-4 flex flex-col gap-3">
            {cargando && !clienteEfectivo ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : clienteEfectivo ? (
              <>
                {clienteEfectivo.clienteDesde && (
                  <>
                    {/* Encabezado sección */}
                    {/* Card nivel + puntos — con header integrado */}
                    <div className="bg-slate-200 rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
                      {/* Título integrado */}
                      <div
                        className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-slate-300 bg-[#1e293b]"
                      >
                        <Coins className="w-4 h-4 text-white shrink-0" />
                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white">Puntos y nivel</span>
                      </div>
                      {/* Fila nivel */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-slate-300">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Award className={`w-4 h-4 ${nivelColor(clienteEfectivo.nivelActual ?? '')}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Nivel</span>
                          <span className={`text-sm font-bold ${nivelColor(clienteEfectivo.nivelActual ?? '')}`}>
                            {nivelEmoji(clienteEfectivo.nivelActual ?? '')} {(clienteEfectivo.nivelActual ?? '').charAt(0).toUpperCase() + (clienteEfectivo.nivelActual ?? '').slice(1)}
                          </span>
                        </div>
                      </div>
                      {/* Fila puntos */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-slate-300">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Coins className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Puntos disponibles</span>
                          <span className="text-sm font-bold text-slate-800">
                            {clienteEfectivo.puntosDisponibles.toLocaleString('es-MX')} pts
                          </span>
                        </div>
                      </div>
                      {/* Fila última compra */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Última compra</span>
                          <span className="text-sm font-semibold text-slate-700">
                            {formatFecha(clienteEfectivo.ultimaActividad)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (otro?.id) {
                          window.dispatchEvent(
                            new CustomEvent('chatya:ver-cliente', { detail: { clienteId: otro.id } })
                          );
                        }
                      }}
                      className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer shadow-lg shadow-slate-700/30 active:scale-[0.98] bg-[#1e293b]"
                    >
                      <span>Ver detalle del cliente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="bg-white/15 lg:bg-slate-200 rounded-xl shadow-sm border border-white/15 lg:border-slate-300 flex flex-col items-center gap-2 py-6 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 lg:bg-slate-300 flex items-center justify-center mb-1">
                  <User className="w-6 h-6 text-white/30 lg:text-slate-600" />
                </div>
                <p className="text-sm font-bold text-white/70 lg:text-slate-700">Sin billetera aquí</p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/40 lg:text-slate-600 leading-relaxed font-medium">Este usuario aún no ha realizado compras en tu negocio</p>
              </div>
            )}
          </div>
        )}

        {/* ════ VISTA 1: Usuario → Usuario ════ */}
        {tipoVista === 'usuario' && <div className="px-4 py-3" />}

        {/* ════ ARCHIVOS COMPARTIDOS (común a las 3 vistas) ════ */}
        {!esTemporal && conteoArchivos && conteoArchivos.total > 0 && (
          <div className="px-4 py-3">
            {/* Barra título + total */}
            <button
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 lg:hover:bg-black/5 cursor-pointer"
              onClick={() => setGaleriaAbierta(true)}
            >
              <FileText className="w-5 h-5 lg:w-4 lg:h-4 text-white/50 lg:text-slate-600 shrink-0" />
              <span className="text-sm lg:text-sm font-semibold text-white/70 lg:text-slate-700 flex-1 text-left whitespace-nowrap">
                Archivos, enlaces y documentos
              </span>
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/40 lg:text-slate-600">
                {conteoArchivos.total}
              </span>
              <ChevronRight className="w-4 h-4 text-white/30 lg:text-slate-600 shrink-0" />
            </button>

            {/* Grid de imágenes recientes (3 cols x 2 filas) */}
            {archivosRecientes && archivosRecientes.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mt-2 px-3">
                {archivosRecientes.map((archivo) => {
                  let imgUrl: string | null = null;
                  let lqip: string | null = null;
                  try {
                    const parsed: ContenidoImagen = JSON.parse(archivo.contenido);
                    imgUrl = parsed.url;
                    lqip = parsed.miniatura || null;
                  } catch {
                    return null;
                  }
                  if (!imgUrl) return null;
                  return (
                    <div
                      key={archivo.id}
                      className="aspect-square rounded-lg overflow-hidden bg-white/10 lg:bg-slate-200 relative cursor-pointer group"
                      onClick={() => onAbrirVisorArchivos(archivo.id)}
                    >
                      {/* LQIP borroso como fondo mientras carga la real */}
                      {lqip && (
                        <img
                          src={lqip}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
                        />
                      )}
                      <img
                        src={imgUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover z-10 group-hover:scale-110 duration-500"
                        loading="lazy"
                      />
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        )}

      </div>

      </div>

      {/* ── Acciones comunes (solo si el chat ya existe en el servidor) ── */}
      {!esTemporal && (
        <div className="px-4 py-3 lg:py-4 flex flex-row gap-2 shrink-0 lg:border-t-2 lg:border-slate-300">
          <button
            onClick={handleSilenciar}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 px-2 py-3 lg:py-4 cursor-pointer group"
          >
            {conversacion.silenciada
              ? <Bell className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/50 lg:text-slate-600 shrink-0 group-hover:animate-[sacudir_0.4s_ease-in-out]" />
              : <BellOff className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/50 lg:text-slate-600 shrink-0 group-hover:animate-[sacudir_0.4s_ease-in-out]" />
            }
            <span className="text-sm lg:text-[11px] 2xl:text-sm text-white/70 lg:text-slate-600 text-center leading-tight font-medium">
              {conversacion.silenciada ? 'Activar' : 'Silenciar'}
            </span>
          </button>

          <button
            onClick={handleBloquear}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 px-2 py-3 lg:py-4 cursor-pointer group"
          >
            <ShieldBan className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-red-400 lg:text-red-600 shrink-0 group-hover:animate-[sacudir_0.4s_ease-in-out]" />
            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-400 lg:text-red-600">Bloquear</span>
          </button>

          <button
            onClick={handleEliminar}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 px-2 py-3 lg:py-4 cursor-pointer group"
          >
            <Trash2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-red-400 lg:text-red-600 shrink-0 group-hover:animate-[sacudir_0.4s_ease-in-out]" />
            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-400 lg:text-red-600">Eliminar</span>
          </button>
        </div>
      )}

      {/* ═══ Galería de archivos compartidos ═══ */}
        </div>
      ) : conteoArchivos ? (
        <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
          <GaleriaArchivosCompartidos
            conversacionId={conversacion.id}
            conteo={conteoArchivos}
            onCerrar={() => setGaleriaAbierta(false)}
            onAbrirVisorArchivos={onAbrirVisorArchivos}
          />
        </div>
      ) : null}
      </div>{/* fin Bloque A */}

      {/* ─── Bloque B: Vista Perfil — siempre en DOM (precargado en background), show/hide con CSS ─── */}
      {tipoVista === 'negocio' && sucursalIdNegocio && (
        <div className={`perfil-contenedor flex-1 flex flex-col ${vistaPerfilAbierta ? '' : 'hidden'}`} style={{ minHeight: 0 }}>
          {/* Header con flecha atrás — siempre estilo mobile azul */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-white/10 bg-[#0B358F]">
            <button
              onClick={cerrarVistaPerfil}
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/10 text-white/80 cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Store className="w-5 h-5 shrink-0 text-white/60" />
            <span className="text-base font-semibold truncate text-white/90">
              {nombreMostrar}
            </span>
          </div>
          {/* Componente directo — sin iframe, misma instancia React */}
          <div className="perfil-embebido flex-1 overflow-y-auto bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <BreakpointOverride forzarMobile>
                <PaginaPerfilNegocio sucursalIdOverride={sucursalIdNegocio} modoPreviewOverride />
              </BreakpointOverride>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelInfoContacto;