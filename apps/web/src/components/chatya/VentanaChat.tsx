/**
 * VentanaChat.tsx
 * ================
 * Ventana de chat activo con el otro participante.
 * Header (info contacto) + área de mensajes + input.
 *
 * Se usa tanto en el panel derecho del split (desktop) como en vista completa (móvil).
 *
 * UBICACIÓN: apps/web/src/components/chatya/VentanaChat.tsx
 */

import { useRef, useEffect, useCallback } from 'react';
import { Search, MoreVertical, Store } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { BurbujaMensaje } from './BurbujaMensaje';
import { InputMensaje } from './InputMensaje';
import { IndicadorEscribiendo } from './IndicadorEscribiendo';
import { SeparadorFecha } from './SeparadorFecha';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// COMPONENTE
// =============================================================================

export function VentanaChat() {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const mensajes = useChatYAStore((s) => s.mensajes);
  const cargandoMensajes = useChatYAStore((s) => s.cargandoMensajes);
  const cargandoMensajesAntiguos = useChatYAStore((s) => s.cargandoMensajesAntiguos);
  const hayMasMensajes = useChatYAStore((s) => s.hayMasMensajes);
  const cargarMensajesAntiguos = useChatYAStore((s) => s.cargarMensajesAntiguos);
  const escribiendo = useChatYAStore((s) => s.escribiendo);

  const usuario = useAuthStore((s) => s.usuario);

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------
  const conversacion = conversaciones.find((c) => c.id === conversacionActivaId);
  const otro = conversacion?.otroParticipante;
  const nombre = otro?.negocioNombre || (otro ? `${otro.nombre} ${otro.apellidos || ''}`.trim() : 'Chat');
  const avatarUrl = otro?.negocioLogo || otro?.avatarUrl || null;
  const iniciales = otro
    ? `${otro.nombre.charAt(0)}${otro.apellidos?.charAt(0) || ''}`.toUpperCase()
    : '?';
  const esNegocio = !!otro?.negocioNombre;
  const miId = usuario?.id || '';

  const estaEscribiendo = escribiendo?.conversacionId === conversacionActivaId;

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMensajesLenRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Effect: Scroll al fondo cuando llegan nuevos mensajes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Solo scroll al fondo si se agregaron mensajes al inicio (nuevos)
    if (mensajes.length > prevMensajesLenRef.current && prevMensajesLenRef.current > 0) {
      // Nuevo mensaje — scroll al fondo
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    // Carga inicial — scroll al fondo
    if (prevMensajesLenRef.current === 0 && mensajes.length > 0) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevMensajesLenRef.current = mensajes.length;
  }, [mensajes.length]);

  // ---------------------------------------------------------------------------
  // Handler: Scroll infinito hacia arriba para cargar más mensajes
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || cargandoMensajesAntiguos || !hayMasMensajes) return;

    // Si llegó cerca del top (< 50px), cargar más
    if (scrollRef.current.scrollTop < 50) {
      cargarMensajesAntiguos();
    }
  }, [cargandoMensajesAntiguos, hayMasMensajes, cargarMensajesAntiguos]);

  // ---------------------------------------------------------------------------
  // Agrupar mensajes por fecha para separadores
  // ---------------------------------------------------------------------------
  const mensajesConSeparadores = agruparPorFecha(mensajes);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ═══ Header del chat ═══ */}
      <div className="px-3 py-2 flex items-center gap-2.5 border-b border-gray-200 shrink-0 bg-white">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={nombre} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{iniciales}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {esNegocio && <Store className="w-3 h-3 text-amber-500 shrink-0" />}
            <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">{nombre}</p>
          </div>
          {estaEscribiendo ? (
            <p className="text-[10px] text-green-500 font-semibold">Escribiendo...</p>
          ) : (
            <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              En línea
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-0.5 shrink-0">
          <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500">
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-blue-500">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ═══ Área de mensajes ═══ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 bg-linear-to-b from-gray-50 to-white scrollbar-hide"
      >
        {/* Spinner de carga de mensajes antiguos */}
        {cargandoMensajesAntiguos && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Skeleton carga inicial */}
        {cargandoMensajes && mensajes.length === 0 ? (
          <div className="flex-1 flex flex-col justify-end gap-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-10 rounded-xl animate-pulse ${i % 2 === 0 ? 'bg-blue-100 self-end w-3/5' : 'bg-gray-100 self-start w-2/3'}`}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Mensajes agrupados por fecha */}
            {mensajesConSeparadores.map((item) => {
              if (item.tipo === 'separador') {
                return <SeparadorFecha key={item.fecha} fecha={item.fecha} />;
              }
              return (
                <BurbujaMensaje
                  key={item.mensaje.id}
                  mensaje={item.mensaje}
                  esMio={item.mensaje.emisorId === miId}
                />
              );
            })}

            {/* Indicador escribiendo */}
            {estaEscribiendo && <IndicadorEscribiendo />}
          </>
        )}
      </div>

      {/* ═══ Input de mensaje ═══ */}
      <InputMensaje />
    </div>
  );
}

// =============================================================================
// HELPER: Agrupar mensajes por fecha e intercalar separadores
// =============================================================================

function agruparPorFecha(mensajes: Mensaje[]): Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> {
  const resultado: Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> = [];
  let ultimaFecha = '';
  const ordenados = [...mensajes].reverse();

  for (const msg of ordenados) {
    const fecha = new Date(msg.createdAt).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (fecha !== ultimaFecha) {
      ultimaFecha = fecha;
      resultado.push({ tipo: 'separador', fecha });
    }
    resultado.push({ tipo: 'mensaje', mensaje: msg });
  }
  return resultado;
}

export default VentanaChat;
