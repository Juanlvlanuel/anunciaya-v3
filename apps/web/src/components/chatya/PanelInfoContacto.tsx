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

import { useEffect, useState } from 'react';
import {
  X, Store, Star, Clock, ExternalLink, Bell, BellOff,
  ShieldBan, Trash2, ChevronRight, Award, Coins, Calendar, User, UserPlus, UserMinus, ArrowLeft,
} from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerPerfilSucursal } from '../../services/negociosService';
import { getDetalleCliente } from '../../services/clientesService';
import type { Conversacion } from '../../types/chatya';
import type { NegocioCompleto } from '../../types/negocios';
import type { ClienteDetalle } from '../../types/clientes';
import Swal from 'sweetalert2';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// =============================================================================
// CACHÉ EN MEMORIA (persiste mientras la app esté montada)
// =============================================================================
export const cachéNegocio = new Map<string, NegocioCompleto>();
export const cachéCliente = new Map<string, ClienteDetalle>();

// =============================================================================
// HELPERS
// =============================================================================

function nivelColor(nivel: string) {
  const n = nivel?.toLowerCase();
  if (n === 'oro') return 'text-amber-500';
  if (n === 'plata') return 'text-slate-400';
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

/** Obtiene el horario de hoy en formato legible */
function horarioHoy(horarios: NegocioCompleto['horarios']): string | null {
  if (!horarios?.length) return null;
  const hoy = new Date().getDay();
  const diaHoy = horarios.find((h) => h.diaSemana === hoy);
  if (!diaHoy || !diaHoy.abierto) return null;
  const apertura = diaHoy.horaApertura?.slice(0, 5) || '';
  const cierre = diaHoy.horaCierre?.slice(0, 5) || '';
  return apertura && cierre ? `${apertura} - ${cierre}` : null;
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
  onCerrar: () => void;
  onAbrirImagen: (url: string) => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelInfoContacto({ conversacion, onCerrar, onAbrirImagen }: PanelInfoContactoProps) {
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

  // ---------------------------------------------------------------------------
  // Derivados de la conversación
  // ---------------------------------------------------------------------------
  const otro = conversacion.otroParticipante;
  const esNegocio = !!otro?.negocioNombre;
  const esModoComercial = modoActivo === 'comercial';

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

  // Leer siempre del caché por ID — nunca datos de un chat anterior
  const negocioEfectivo = sucursalIdNegocio ? cachéNegocio.get(sucursalIdNegocio) ?? null : null;
  const clienteEfectivo = otro ? cachéCliente.get(otro.id) ?? null : null;

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
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSilenciar = () => toggleSilenciar(conversacion.id);

  const handleBloquear = async () => {
    if (!otro) return;
    bloquearUsuario({ bloqueadoId: otro.id });
    onCerrar();
  };

  const handleEliminar = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar chat?',
      text: 'Se eliminará para ti. Si el otro también elimina, se borra permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) { eliminarConversacion(conversacion.id); onCerrar(); }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={`${esMobile ? 'w-full h-full' : 'w-[320px] 2xl:w-[340px] min-w-[320px] 2xl:min-w-[340px] border-l border-gray-200'} flex flex-col ${esMobile ? 'bg-linear-to-b from-[#0B358F] to-[#050d1a]' : 'bg-linear-to-b from-slate-100 to-blue-50'} overflow-y-auto shrink-0`}>

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
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-200 text-gray-500 hover:text-red-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Avatar + Nombre ── */}
      <div className="flex flex-col items-center px-4 pt-2 pb-5 gap-3">
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
                <p className="text-[15px] text-white/60 lg:text-gray-500 font-medium">{nombre}</p>
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

          {tipoVista !== 'negocio' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 lg:text-green-700 font-semibold bg-green-500/15 lg:bg-green-100/70 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              En línea
            </span>
          )}
          {conversacion.contextoTipo && conversacion.contextoTipo !== 'directo' && conversacion.contextoTipo !== 'notas' && (
            <span className="text-xs text-white/40 lg:text-gray-500 font-medium mt-0.5">
              {conversacion.contextoTipo === 'negocio' && 'Contactó desde: Tu perfil'}
              {conversacion.contextoTipo === 'oferta' && `Contactó por oferta: ${conversacion.contextoNombre || 'Ofertas'}`}
              {conversacion.contextoTipo === 'marketplace' && `Contactó por publicación: ${conversacion.contextoNombre || 'Marketplace'}`}
              {conversacion.contextoTipo === 'empleo' && `Contactó por vacante: ${conversacion.contextoNombre || 'Empleos'}`}
              {conversacion.contextoTipo === 'dinamica' && `Contactó por dinámica: ${conversacion.contextoNombre || 'Dinámicas'}`}
            </span>
          )}
          <button
            onClick={handleToggleContacto}
            className={`flex items-center gap-1.5 text-sm lg:text-sm font-semibold px-3.5 py-1.5 rounded-full cursor-pointer transition-colors mt-1 ${
              contactoExistente
                ? 'bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400 lg:bg-gray-100 lg:text-gray-500 lg:hover:bg-red-50 lg:hover:text-red-500'
                : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 lg:bg-blue-50 lg:text-blue-600 lg:hover:bg-blue-100'
            }`}
          >
            {contactoExistente ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {contactoExistente ? 'Quitar de contactos' : 'Agregar a contactos'}
          </button>
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
                {/* Calificación */}
                {parseFloat(negocioEfectivo.calificacionPromedio) > 0 && (
                  <div className="flex items-center gap-2.5 bg-white/10 lg:bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-sm lg:text-sm font-bold text-white lg:text-gray-800">
                      {parseFloat(negocioEfectivo.calificacionPromedio).toFixed(1)}
                    </span>
                    <span className="text-xs text-white/50 lg:text-gray-500">
                      ({negocioEfectivo.totalCalificaciones} reseñas)
                    </span>
                  </div>
                )}

                {/* Categoría */}
                {negocioEfectivo.categorias?.length > 0 && (
                  <div className="flex items-center gap-2.5 bg-white/10 lg:bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                    <Store className="w-4 h-4 text-white/50 lg:text-gray-500 shrink-0" />
                    <span className="text-sm lg:text-sm text-white/80 lg:text-gray-700">
                      {negocioEfectivo.categorias[0].categoria.nombre}
                    </span>
                  </div>
                )}

                {/* Horario + estado */}
                <div className="flex items-center gap-2.5 bg-white/10 lg:bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-white/50 lg:text-gray-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${calcularAbierto(negocioEfectivo.horarios) ? 'text-green-600' : 'text-red-500'}`}>
                      {calcularAbierto(negocioEfectivo.horarios) ? 'Abierto ahora' : 'Cerrado'}
                    </span>
                    {(() => {
                      const h = horarioHoy(negocioEfectivo.horarios);
                      return h ? <span className="text-xs text-white/40 lg:text-gray-500">{h}</span> : null;
                    })()}
                  </div>
                </div>

                {/* Ver perfil */}
                <a
                  href={`/negocios/${negocioEfectivo.sucursalId}`}
                  className="flex items-center justify-between w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <span>Ver perfil del negocio</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <p className="text-xs text-white/40 lg:text-gray-500 text-center py-2">No se pudo cargar la información</p>
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
                {/* Encabezado sección */}
                <p className="text-[11px] lg:text-[11px] font-bold text-white/40 lg:text-gray-400 uppercase tracking-wider px-1">Billetera en tu negocio</p>

                {/* Card nivel + puntos */}
                <div className="bg-white/10 lg:bg-white rounded-2xl shadow-sm border border-white/10 lg:border-gray-100 overflow-hidden">
                  {/* Fila nivel */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 lg:border-gray-50">
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 lg:bg-amber-50 flex items-center justify-center shrink-0">
                      <Award className={`w-4 h-4 ${nivelColor(clienteEfectivo.nivelActual)}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] lg:text-[11px] text-white/40 lg:text-gray-400 font-medium">Nivel</span>
                      <span className={`text-sm lg:text-sm font-bold ${nivelColor(clienteEfectivo.nivelActual)}`}>
                        {nivelEmoji(clienteEfectivo.nivelActual)} {clienteEfectivo.nivelActual.charAt(0).toUpperCase() + clienteEfectivo.nivelActual.slice(1)}
                      </span>
                    </div>
                  </div>
                  {/* Fila puntos */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 lg:border-gray-50">
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 lg:bg-amber-50 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] lg:text-[11px] text-white/40 lg:text-gray-400 font-medium">Puntos disponibles</span>
                      <span className="text-sm lg:text-sm font-bold text-white lg:text-gray-800">
                        {clienteEfectivo.puntosDisponibles.toLocaleString('es-MX')} pts
                      </span>
                    </div>
                  </div>
                  {/* Fila última compra */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 lg:bg-blue-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] lg:text-[11px] text-white/40 lg:text-gray-400 font-medium">Última compra</span>
                      <span className="text-sm lg:text-sm font-semibold text-white/70 lg:text-gray-700">
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
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <span>Ver detalle del cliente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="bg-white/10 lg:bg-white rounded-2xl shadow-sm border border-white/10 lg:border-gray-100 flex flex-col items-center gap-2 py-6 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 lg:bg-gray-50 flex items-center justify-center mb-1">
                  <User className="w-6 h-6 text-white/30 lg:text-gray-300" />
                </div>
                <p className="text-sm font-bold text-white/70 lg:text-gray-600">Sin billetera aquí</p>
                <p className="text-xs text-white/40 lg:text-gray-400 leading-relaxed">Este usuario aún no ha realizado compras en tu negocio</p>
              </div>
            )}
          </div>
        )}

        {/* ════ VISTA 1: Usuario → Usuario ════ */}
        {tipoVista === 'usuario' && <div className="px-4 py-3" />}

      </div>

      {/* ── Acciones comunes ── */}
      <div className="px-4 py-3 flex flex-col gap-1 shrink-0">
        <button
          onClick={handleSilenciar}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 lg:hover:bg-black/8 text-white/70 lg:text-gray-600 cursor-pointer transition-colors"
        >
          {conversacion.silenciada
            ? <Bell className="w-5 h-5 lg:w-4 lg:h-4 text-white/50 lg:text-gray-500 shrink-0" />
            : <BellOff className="w-5 h-5 lg:w-4 lg:h-4 text-white/50 lg:text-gray-500 shrink-0" />
          }
          <span className="text-[15px] lg:text-sm">
            {conversacion.silenciada ? 'Activar notificaciones' : 'Silenciar notificaciones'}
          </span>
        </button>

        {!esModoComercial && (
          <button
            onClick={handleBloquear}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-500/15 lg:hover:bg-red-100/60 text-red-400 lg:text-red-500 cursor-pointer transition-colors"
          >
            <ShieldBan className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
            <span className="text-[15px] lg:text-sm font-medium">Bloquear</span>
          </button>
        )}

        <button
          onClick={handleEliminar}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-500/15 lg:hover:bg-red-100/60 text-red-400 lg:text-red-500 cursor-pointer transition-colors"
        >
          <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
          <span className="text-[15px] lg:text-sm font-medium">Eliminar chat</span>
        </button>
      </div>
    </div>
  );
}

export default PanelInfoContacto;