/**
 * ModalReenviar.tsx
 * ==================
 * Modal para seleccionar a quién reenviar un mensaje.
 *
 * FLUJO:
 *   1. Se abre cuando el usuario selecciona "Reenviar" del menú contextual
 *   2. Muestra conversaciones recientes como opciones rápidas
 *   3. Al escribir en el buscador, filtra locales + busca personas/negocios vía API
 *   4. Click en destinatario → ejecuta reenviarMensaje() → cierra → toast
 *
 * CARACTERÍSTICAS:
 *   - Usa ModalAdaptativo (bottom sheet en móvil, modal centrado en desktop)
 *   - Reutiliza el mismo patrón de búsqueda de ListaConversaciones
 *   - Excluye "Mis Notas" de la lista
 *   - Preview del mensaje que se va a reenviar
 *
 * UBICACIÓN: apps/web/src/components/chatya/ModalReenviar.tsx
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Forward, Store, MapPin, Star, Loader2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import * as chatyaService from '../../services/chatyaService';
import type { Mensaje, Conversacion, PersonaBusqueda, NegocioBusqueda } from '../../types/chatya';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalReenviarProps {
  /** Mensaje que se va a reenviar */
  mensaje: Mensaje;
  /** Callback para cerrar el modal */
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalReenviar({ mensaje, onCerrar }: ModalReenviarProps) {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const reenviarMensaje = useChatYAStore((s) => s.reenviarMensaje);

  const usuario = useAuthStore((s) => s.usuario);
  const miId = usuario?.id || '';

  const latitud = useGpsStore((s) => s.latitud);
  const longitud = useGpsStore((s) => s.longitud);
  const ciudad = useGpsStore((s) => s.ciudad);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [personasResultados, setPersonasResultados] = useState<PersonaBusqueda[]>([]);
  const [negociosResultados, setNegociosResultados] = useState<NegocioBusqueda[]>([]);
  const [buscandoBackend, setBuscandoBackend] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const estaBuscando = busqueda.trim().length >= 2;

  // ---------------------------------------------------------------------------
  // Conversaciones recientes (excluyendo Mis Notas)
  // ---------------------------------------------------------------------------
  const conversacionesRecientes = useMemo(() => {
    return conversaciones
      .filter((c) => c.id !== misNotasId)
      .slice(0, 15);
  }, [conversaciones, misNotasId]);

  // ---------------------------------------------------------------------------
  // Filtrar conversaciones locales por búsqueda
  // ---------------------------------------------------------------------------
  const conversacionesFiltradas = useMemo(() => {
    if (!estaBuscando) return conversacionesRecientes;

    const termino = busqueda.toLowerCase();
    return conversacionesRecientes.filter((c) => {
      const nombre = c.otroParticipante?.nombre?.toLowerCase() || '';
      const apellidos = c.otroParticipante?.apellidos?.toLowerCase() || '';
      const negocio = c.otroParticipante?.negocioNombre?.toLowerCase() || '';
      return nombre.includes(termino) || apellidos.includes(termino) || negocio.includes(termino);
    });
  }, [conversacionesRecientes, busqueda, estaBuscando]);

  // ---------------------------------------------------------------------------
  // Buscar personas y negocios en el backend (debounce 300ms)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!estaBuscando) {
      setPersonasResultados([]);
      setNegociosResultados([]);
      setBuscandoBackend(false);
      return;
    }

    setBuscandoBackend(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const ciudadNombre = ciudad?.nombre || '';

        const [resPersonas, resNegocios] = await Promise.all([
          chatyaService.buscarPersonas(busqueda.trim()),
          ciudadNombre
            ? chatyaService.buscarNegocios(busqueda.trim(), ciudadNombre, latitud, longitud)
            : Promise.resolve({ success: true, data: [] as NegocioBusqueda[] }),
        ]);

        setPersonasResultados(resPersonas.data || []);
        setNegociosResultados(resNegocios.data || []);
      } catch {
        setPersonasResultados([]);
        setNegociosResultados([]);
      } finally {
        setBuscandoBackend(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busqueda, estaBuscando, ciudad, latitud, longitud]);

  // ---------------------------------------------------------------------------
  // Focus automático al input
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Reenviar a conversación existente
  // Extrae modo y sucursalId del otro participante para que el backend
  // encuentre la conversación correcta (evita crear chat personal con dueño)
  // ---------------------------------------------------------------------------
  const handleReenviarAConversacion = async (conv: Conversacion) => {
    if (enviando) return;
    setEnviando(true);

    // Determinar quién es el otro participante
    const esP1 = conv.participante1Id === miId;
    const destinatarioId = esP1 ? conv.participante2Id : conv.participante1Id;
    const destinatarioModo = esP1 ? conv.participante2Modo : conv.participante1Modo;
    const destinatarioSucursalId = esP1 ? conv.participante2SucursalId : conv.participante1SucursalId;

    const exito = await reenviarMensaje(mensaje.id, {
      destinatarioId,
      destinatarioModo,
      destinatarioSucursalId,
    });
    if (exito) onCerrar();
    else setEnviando(false);
  };

  // ---------------------------------------------------------------------------
  // Handler: Reenviar a persona de búsqueda
  // ---------------------------------------------------------------------------
  const handleReenviarAPersona = async (persona: PersonaBusqueda) => {
    if (enviando) return;
    setEnviando(true);

    const exito = await reenviarMensaje(mensaje.id, {
      destinatarioId: persona.id,
    });
    if (exito) onCerrar();
    else setEnviando(false);
  };

  // ---------------------------------------------------------------------------
  // Handler: Reenviar a negocio de búsqueda
  // ---------------------------------------------------------------------------
  const handleReenviarANegocio = async (negocio: NegocioBusqueda) => {
    if (enviando) return;
    setEnviando(true);

    const exito = await reenviarMensaje(mensaje.id, {
      destinatarioId: negocio.usuarioId,
      destinatarioModo: 'comercial',
      destinatarioSucursalId: negocio.sucursalId,
    });
    if (exito) onCerrar();
    else setEnviando(false);
  };

  // ---------------------------------------------------------------------------
  // Filtrar personas para no duplicar con conversaciones existentes
  // ---------------------------------------------------------------------------
  const idsConversaciones = useMemo(() => {
    return new Set(conversacionesFiltradas.map((c) => c.otroParticipante?.id).filter(Boolean));
  }, [conversacionesFiltradas]);

  const personasSinDuplicar = useMemo(() => {
    return personasResultados.filter((p) => !idsConversaciones.has(p.id) && p.id !== miId);
  }, [personasResultados, idsConversaciones, miId]);

  // ---------------------------------------------------------------------------
  // Preview del mensaje truncado
  // ---------------------------------------------------------------------------
  const previewMensaje = mensaje.tipo === 'texto'
    ? mensaje.contenido?.slice(0, 80) + (mensaje.contenido && mensaje.contenido.length > 80 ? '...' : '')
    : mensaje.tipo === 'imagen' ? '📷 Imagen'
    : mensaje.tipo === 'audio' ? '🎤 Audio'
    : mensaje.tipo === 'documento' ? '📎 Documento'
    : mensaje.tipo === 'ubicacion' ? '📍 Ubicación'
    : mensaje.contenido?.slice(0, 80) || '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Reenviar mensaje"
      iconoTitulo={<Forward className="w-5 h-5 text-blue-500" />}
      ancho="sm"
      sinScrollInterno
      alturaMaxima="lg"
      zIndice="z-90"
    >
      <div className="flex flex-col max-h-[60vh] lg:max-h-[50vh]">

        {/* ── Preview del mensaje ── */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
          <p className="text-xs text-gray-400 truncate">{previewMensaje}</p>
        </div>

        {/* ── Buscador ── */}
        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar persona o negocio..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 placeholder:text-gray-400"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* ── Lista scrolleable ── */}
        <div className="flex-1 overflow-y-auto relative">

          {/* Loader cuando busca en backend */}
          {buscandoBackend && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Loader global cuando se está enviando */}
          {enviando && (
            <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          {/* ── Conversaciones recientes / filtradas ── */}
          {conversacionesFiltradas.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {estaBuscando ? 'Chats' : 'Recientes'}
              </p>
              {conversacionesFiltradas.map((conv) => {
                const otro = conv.otroParticipante;
                if (!otro) return null;
                const esNeg = !!otro.negocioNombre;
                const nombreCompleto = esNeg
                  ? otro.negocioNombre!
                  : `${otro.nombre} ${otro.apellidos || ''}`.trim();
                const avatar = otro.negocioLogo || otro.avatarUrl;
                const iniciales = nombreCompleto
                  .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleReenviarAConversacion(conv)}
                    disabled={enviando}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 cursor-pointer disabled:opacity-50"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={nombreCompleto} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white text-xs font-bold
                          ${esNeg ? 'bg-linear-to-br from-amber-400 to-amber-600' : 'bg-linear-to-br from-blue-500 to-blue-700'}`}>
                          {iniciales}
                        </div>
                      )}
                    </div>
                    {/* Nombre */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        {esNeg && <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <p className="text-sm font-semibold text-gray-800 truncate">{nombreCompleto}</p>
                      </div>
                      {esNeg && otro.sucursalNombre && (
                        <p className="text-xs text-gray-400 truncate">{otro.sucursalNombre}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Personas encontradas (sin duplicar con conversaciones) ── */}
          {estaBuscando && personasSinDuplicar.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Personas
              </p>
              {personasSinDuplicar.map((persona) => {
                const nombreCompleto = `${persona.nombre} ${persona.apellidos || ''}`.trim();
                const iniciales = nombreCompleto
                  .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <button
                    key={persona.id}
                    onClick={() => handleReenviarAPersona(persona)}
                    disabled={enviando}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      {persona.avatarUrl ? (
                        <img src={persona.avatarUrl} alt={nombreCompleto} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                          {iniciales}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate">{nombreCompleto}</p>
                      {persona.alias && (
                        <p className="text-xs text-gray-400 truncate">@{persona.alias}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Negocios encontrados ── */}
          {estaBuscando && negociosResultados.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Negocios
              </p>
              {negociosResultados.map((negocio) => {
                const iniciales = negocio.negocioNombre
                  .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <button
                    key={negocio.sucursalId}
                    onClick={() => handleReenviarANegocio(negocio)}
                    disabled={enviando}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      {negocio.fotoPerfil ? (
                        <img src={negocio.fotoPerfil} alt={negocio.negocioNombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                          {iniciales}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <p className="text-sm font-semibold text-gray-800 truncate">{negocio.negocioNombre}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {negocio.categoria && (
                          <span className="text-xs text-gray-400 truncate">{negocio.categoria}</span>
                        )}
                        {negocio.calificacionPromedio > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {negocio.calificacionPromedio.toFixed(1)}
                          </span>
                        )}
                        {negocio.distanciaKm != null && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {negocio.distanciaKm < 1
                              ? `${Math.round(negocio.distanciaKm * 1000)}m`
                              : `${negocio.distanciaKm.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Estado vacío (buscó pero no encontró) ── */}
          {estaBuscando && !buscandoBackend
            && conversacionesFiltradas.length === 0
            && personasSinDuplicar.length === 0
            && negociosResultados.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Search className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">No se encontraron resultados</p>
            </div>
          )}

          {/* ── Estado vacío sin conversaciones ── */}
          {!estaBuscando && conversacionesRecientes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Forward className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Busca a quién reenviar</p>
            </div>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default ModalReenviar;