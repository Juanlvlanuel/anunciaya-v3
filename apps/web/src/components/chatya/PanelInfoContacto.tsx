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
  ShieldBan, Trash2, ChevronRight, Award, Coins, Calendar, User, Info, UserPlus, UserMinus,
} from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerPerfilSucursal } from '../../services/negociosService';
import { getDetalleCliente } from '../../services/clientesService';
import type { Conversacion } from '../../types/chatya';
import type { NegocioCompleto } from '../../types/negocios';
import type { ClienteDetalle } from '../../types/clientes';
import Swal from 'sweetalert2';

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
        (!sucursalIdNegocio || c.sucursalId === sucursalIdNegocio)
      )
    : undefined;

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
  const [negocio, setNegocio] = useState<NegocioCompleto | null>(null);
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [cargando, setCargando] = useState(false);

  // ---------------------------------------------------------------------------
  // Cargar datos según vista
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!otro) return;

    if (tipoVista === 'negocio' && sucursalIdNegocio) {
      setCargando(true);
      obtenerPerfilSucursal(sucursalIdNegocio)
        .then((res) => { if (res.success && res.data) setNegocio(res.data); })
        .catch(() => void 0)
        .finally(() => setCargando(false));

    } else if (tipoVista === 'cliente') {
      setCargando(true);
      getDetalleCliente(otro.id)
        .then((res) => { if (res.success && res.data) setCliente(res.data); })
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
    <div className="w-[320px] 2xl:w-[340px] min-w-[320px] 2xl:min-w-[340px] border-l border-gray-200 flex flex-col bg-linear-to-b from-slate-100 to-blue-50 overflow-y-auto shrink-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-[61px] border-b border-slate-200 bg-slate-200 shrink-0">
        <span className="flex items-center gap-2 text-base font-bold text-gray-800">
          <Info className="w-4 h-4 text-gray-600" />
          Información
        </span>
        <button
          onClick={onCerrar}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Avatar + Nombre ── */}
      <div className="flex flex-col items-center px-4 pt-6 pb-5 gap-3 border-b border-white/20">
        <div
          role="button"
          tabIndex={avatarUrl ? 0 : -1}
          onClick={(e) => { e.stopPropagation(); if (avatarUrl) onAbrirImagen(avatarUrl); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && avatarUrl) onAbrirImagen(avatarUrl); }}
          className={`w-24 h-24 rounded-full overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] shrink-0 ${avatarUrl ? 'cursor-pointer hover:opacity-90' : ''}`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={nombre} className="w-full h-full object-cover" />
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

        <div className="flex flex-col items-center gap-1 text-center">
          {tipoVista === 'negocio' && (
            <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              <Store className="w-3.5 h-3.5" />
              {otro?.sucursalNombre || 'Negocio'}
            </span>
          )}
          <p className="text-[17px] font-bold text-gray-800 leading-snug">{nombre}</p>
          {tipoVista !== 'negocio' && (
            <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-100/70 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              En línea
            </span>
          )}
          {conversacion.contextoTipo && conversacion.contextoTipo !== 'directo' && conversacion.contextoTipo !== 'notas' && (
            <span className="text-xs text-gray-500 font-medium mt-0.5">
              {conversacion.contextoTipo === 'negocio' && 'Contactó desde: Tu perfil'}
              {conversacion.contextoTipo === 'oferta' && `Contactó por oferta: ${conversacion.contextoNombre || 'Ofertas'}`}
              {conversacion.contextoTipo === 'marketplace' && `Contactó por publicación: ${conversacion.contextoNombre || 'Marketplace'}`}
              {conversacion.contextoTipo === 'empleo' && `Contactó por vacante: ${conversacion.contextoNombre || 'Empleos'}`}
              {conversacion.contextoTipo === 'dinamica' && `Contactó por dinámica: ${conversacion.contextoNombre || 'Dinámicas'}`}
            </span>
          )}
          <button
            onClick={handleToggleContacto}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full cursor-pointer transition-colors mt-1 ${
              contactoExistente
                ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
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
            {cargando ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : negocio ? (
              <>
                {/* Calificación */}
                {parseFloat(negocio.calificacionPromedio) > 0 && (
                  <div className="flex items-center gap-2.5 bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-sm font-bold text-gray-800">
                      {parseFloat(negocio.calificacionPromedio).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({negocio.totalCalificaciones} reseñas)
                    </span>
                  </div>
                )}

                {/* Categoría */}
                {negocio.categorias?.length > 0 && (
                  <div className="flex items-center gap-2.5 bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                    <Store className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-700">
                      {negocio.categorias[0].categoria.nombre}
                    </span>
                  </div>
                )}

                {/* Horario + estado */}
                <div className="flex items-center gap-2.5 bg-white/90 shadow-sm rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${calcularAbierto(negocio.horarios) ? 'text-green-600' : 'text-red-500'}`}>
                      {calcularAbierto(negocio.horarios) ? 'Abierto ahora' : 'Cerrado'}
                    </span>
                    {(() => {
                      const h = horarioHoy(negocio.horarios);
                      return h ? <span className="text-xs text-gray-500">{h}</span> : null;
                    })()}
                  </div>
                </div>

                {/* Ver perfil */}
                <a
                  href={`/negocios/${negocio.sucursalId}`}
                  className="flex items-center justify-between w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <span>Ver perfil del negocio</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No se pudo cargar la información</p>
            )}
          </div>
        )}

        {/* ════ VISTA 3: Negocio → Cliente ════ */}
        {tipoVista === 'cliente' && (
          <div className="px-4 py-4 flex flex-col gap-3">
            {cargando ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : cliente ? (
              <>
                <div className="bg-white/90 shadow-sm rounded-xl p-3.5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Cliente registrado</p>

                  <div className="flex items-center gap-2.5">
                    <Award className={`w-4 h-4 shrink-0 ${nivelColor(cliente.nivelActual)}`} />
                    <span className={`text-sm font-bold ${nivelColor(cliente.nivelActual)}`}>
                      {nivelEmoji(cliente.nivelActual)}{' '}
                      {cliente.nivelActual.charAt(0).toUpperCase() + cliente.nivelActual.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">
                        {cliente.puntosDisponibles.toLocaleString('es-MX')} pts
                      </span>
                      <span className="text-xs text-gray-500">disponibles</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Última compra</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatFecha(cliente.ultimaActividad)}
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
                  className="flex items-center justify-between w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <span>Ver detalle del cliente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <User className="w-9 h-9 text-gray-400/60" />
                <p className="text-sm text-gray-600 font-medium">Sin billetera en tu negocio</p>
                <p className="text-xs text-gray-500">Este usuario aún no ha comprado aquí</p>
              </div>
            )}
          </div>
        )}

        {/* ════ VISTA 1: Usuario → Usuario ════ */}
        {tipoVista === 'usuario' && <div className="px-4 py-3" />}

      </div>

      {/* ── Acciones comunes ── */}
      <div className="border-t border-white/20 px-4 py-3 flex flex-col gap-1 shrink-0">
        <button
          onClick={handleSilenciar}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-black/8 text-gray-600 cursor-pointer transition-colors"
        >
          {conversacion.silenciada
            ? <Bell className="w-4 h-4 text-gray-500 shrink-0" />
            : <BellOff className="w-4 h-4 text-gray-500 shrink-0" />
          }
          <span className="text-sm">
            {conversacion.silenciada ? 'Activar notificaciones' : 'Silenciar notificaciones'}
          </span>
        </button>

        {!esModoComercial && (
          <button
            onClick={handleBloquear}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-100/60 text-red-500 cursor-pointer transition-colors"
          >
            <ShieldBan className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">Bloquear</span>
          </button>
        )}

        <button
          onClick={handleEliminar}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-100/60 text-red-500 cursor-pointer transition-colors"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">Eliminar chat</span>
        </button>
      </div>
    </div>
  );
}

export default PanelInfoContacto;