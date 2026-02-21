/**
 * ListaConversaciones.tsx
 * ========================
 * Lista scrolleable de conversaciones del usuario.
 * Conversaciones fijadas aparecen arriba.
 *
 * BUSCADOR INTELIGENTE (Sprint 5):
 * - Input siempre visible con lupa + botón X para limpiar
 * - Sin búsqueda: tabs Todos|Personas|Negocios filtran conversaciones existentes
 * - Con búsqueda (≥2 chars): 3 secciones (conversaciones, negocios, personas)
 *   con resultados que van apareciendo mientras escribes (debounce 300ms)
 * - Filtro local instantáneo para conversaciones existentes
 * - Click en resultado de persona/negocio → crea conversación y abre chat
 *
 * Se usa tanto en desktop (panel izquierdo del split) como en móvil (vista completa).
 *
 * UBICACIÓN: apps/web/src/components/chatya/ListaConversaciones.tsx
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, MessageSquarePlus, Store, Star, MapPin, Archive, ArrowLeft } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { ConversacionItem } from './ConversacionItem';
import { MenuContextualChat } from './MenuContextualChat';
import * as chatyaService from '../../services/chatyaService';
import type { ModoChatYA, PersonaBusqueda, NegocioBusqueda, Conversacion } from '../../types/chatya';

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type TabFiltro = 'todos' | 'personas' | 'negocios';

// =============================================================================
// COMPONENTE
// =============================================================================

export function ListaConversaciones() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const cargando = useChatYAStore((s) => s.cargandoConversaciones);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);

  const modoActivo = (useAuthStore((s) => s.usuario?.modoActivo) || 'personal') as ModoChatYA;

  const latitud = useGpsStore((s) => s.latitud);
  const longitud = useGpsStore((s) => s.longitud);
  const ciudad = useGpsStore((s) => s.ciudad);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [tabActivo, setTabActivo] = useState<TabFiltro>('todos');
  const [personasResultados, setPersonasResultados] = useState<PersonaBusqueda[]>([]);
  const [negociosResultados, setNegociosResultados] = useState<NegocioBusqueda[]>([]);
  const [buscandoBackend, setBuscandoBackend] = useState(false);
  const [viendoArchivados, setViendoArchivados] = useState(false);
  const [cargandoArchivados, setCargandoArchivados] = useState(false);
  const [menuContextual, setMenuContextual] = useState<{ conversacion: Conversacion; x: number; y: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** true cuando hay ≥2 caracteres → activa modo búsqueda */
  const estaBuscando = busqueda.trim().length >= 2;

  // ---------------------------------------------------------------------------
  // Effect: Cargar conversaciones al montar y cuando cambia el modo
  // ---------------------------------------------------------------------------
  useEffect(() => {
    cargarConversaciones(modoActivo);
  }, [modoActivo, cargarConversaciones]);

  // ---------------------------------------------------------------------------
  // Effect: Debounce búsqueda en backend (personas + negocios)
  // Se ejecuta mientras el usuario va escribiendo, con 300ms de espera
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Si no hay suficientes caracteres, limpiar resultados
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

        // Lanzar ambas búsquedas en paralelo
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
  // Filtrar conversaciones existentes (instantáneo, sin debounce)
  // ---------------------------------------------------------------------------
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const noLeidosArchivados = useChatYAStore((s) => s.noLeidosArchivados);
  const archivados = useChatYAStore((s) => s.conversacionesArchivadas);
  const cargarArchivados = useChatYAStore((s) => s.cargarArchivados);

  const conversacionesFiltradas = useMemo(() => {
    // Excluir "Mis Notas" de la lista normal (se accede por botón aparte)
    let lista = conversaciones.filter((c) => c.id !== misNotasId);

    // Filtrar por búsqueda de texto (cuando está en modo búsqueda)
    if (estaBuscando) {
      const termino = busqueda.toLowerCase();
      lista = lista.filter((c) => {
        const nombre = c.otroParticipante?.nombre?.toLowerCase() || '';
        const apellidos = c.otroParticipante?.apellidos?.toLowerCase() || '';
        const negocio = c.otroParticipante?.negocioNombre?.toLowerCase() || '';
        const sucursal = c.otroParticipante?.sucursalNombre?.toLowerCase() || '';
        return (
          nombre.includes(termino) ||
          apellidos.includes(termino) ||
          negocio.includes(termino) ||
          sucursal.includes(termino)
        );
      });
    }

    // Filtrar por tab (solo cuando NO busca)
    if (!estaBuscando && tabActivo !== 'todos') {
      lista = lista.filter((c) => {
        const esNegocio = !!c.otroParticipante?.negocioNombre;
        return tabActivo === 'negocios' ? esNegocio : !esNegocio;
      });
    }

    // Separar fijadas arriba, luego el resto
    const fijadas = lista.filter((c) => c.fijada);
    const noFijadas = lista.filter((c) => !c.fijada);

    return [...fijadas, ...noFijadas];
  }, [conversaciones, busqueda, estaBuscando, tabActivo, misNotasId]);

  // ---------------------------------------------------------------------------
  // Handler: Limpiar búsqueda con la X
  // ---------------------------------------------------------------------------
  const limpiarBusqueda = useCallback(() => {
    setBusqueda('');
    setPersonasResultados([]);
    setNegociosResultados([]);
    inputRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Ver / salir de archivados
  // ---------------------------------------------------------------------------
  const verArchivados = useCallback(async () => {
    setCargandoArchivados(true);
    await cargarArchivados(modoActivo);
    setCargandoArchivados(false);
    setViendoArchivados(true);
  }, [modoActivo, cargarArchivados]);

  const salirArchivados = useCallback(() => {
    setViendoArchivados(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Menú contextual de conversación (click derecho / long press)
  // ---------------------------------------------------------------------------
  const handleMenuContextual = useCallback((conv: Conversacion, pos: { x: number; y: number }) => {
    setMenuContextual({ conversacion: conv, x: pos.x, y: pos.y });
  }, []);

  const cerrarMenuCtx = useCallback(() => setMenuContextual(null), []);

  // ---------------------------------------------------------------------------
  // Handler: Click en persona → abrir chat temporal (lazy creation)
  // ---------------------------------------------------------------------------
  const handleClickPersona = useCallback((persona: PersonaBusqueda) => {
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: persona.id,
        nombre: persona.nombre,
        apellidos: persona.apellidos,
        avatarUrl: persona.avatarUrl,
      },
      datosCreacion: {
        participante2Id: persona.id,
        participante2Modo: 'personal',
        contextoTipo: 'directo',
      },
    });
    limpiarBusqueda();
  }, [abrirChatTemporal, limpiarBusqueda]);

  // ---------------------------------------------------------------------------
  // Handler: Click en negocio → abrir chat temporal (lazy creation)
  // ---------------------------------------------------------------------------
  const handleClickNegocio = useCallback((negocio: NegocioBusqueda) => {
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: negocio.usuarioId,
        nombre: negocio.negocioNombre,
        apellidos: '',
        avatarUrl: negocio.fotoPerfil,
        negocioNombre: negocio.negocioNombre,
        negocioLogo: negocio.fotoPerfil || undefined,
        sucursalNombre: negocio.sucursalNombre || undefined,
      },
      datosCreacion: {
        participante2Id: negocio.usuarioId,
        participante2Modo: 'comercial',
        participante2SucursalId: negocio.sucursalId,
        contextoTipo: 'negocio',
        contextoReferenciaId: negocio.negocioId,
      },
    });
    limpiarBusqueda();
  }, [abrirChatTemporal, limpiarBusqueda]);

  // ---------------------------------------------------------------------------
  // Skeleton de carga inicial
  // ---------------------------------------------------------------------------
  if (cargando && conversaciones.length === 0) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="px-2.5 py-2 shrink-0">
          <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-1 px-2.5 pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-2.5">
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ═══ Input de búsqueda (siempre visible) ═══ */}
      <div className="px-3 lg:px-2.5 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 lg:left-2.5 top-1/2 -translate-y-1/2 w-4.5 lg:w-4 h-4.5 lg:h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar chats, personas o negocios..."
            className="w-full pl-10 lg:pl-9 pr-9 lg:pr-8 py-2.5 lg:py-2 bg-gray-100 border border-gray-300 rounded-full lg:rounded-lg text-sm lg:text-xs text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white"
          />
          {/* Botón X para limpiar búsqueda */}
          {busqueda && (
            <button
              onClick={limpiarBusqueda}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Tabs filtro (solo cuando NO está buscando) ═══ */}
      {!estaBuscando && (
        <div className="flex gap-1.5 lg:gap-1 px-3 lg:px-2.5 pb-2 shrink-0">
          {(['todos', 'personas', 'negocios'] as TabFiltro[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabActivo(tab)}
              className={`
                px-4 lg:px-3 py-1.5 lg:py-1 rounded-full text-sm lg:text-[11px] font-semibold capitalize cursor-pointer
                ${tabActivo === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Contenido scrolleable ═══ */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col relative">

        {/* ─── MODO BÚSQUEDA: 3 secciones mientras escribes ─── */}
        {estaBuscando ? (
          <div>
            {/* Sección 1: Conversaciones existentes que coinciden */}
            {conversacionesFiltradas.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-200/70 border-b border-gray-300/60">
                  Conversaciones ({conversacionesFiltradas.length})
                </p>
                {conversacionesFiltradas.map((conv) => (
                  <ConversacionItem
                    key={conv.id}
                    conversacion={conv}
                    activa={conv.id === conversacionActivaId}
                    onClick={() => {
                      abrirConversacion(conv.id);
                      limpiarBusqueda();
                    }}
                    onMenuContextual={handleMenuContextual}
                  />
                ))}
              </div>
            )}

            {/* Sección 2: Negocios (del backend) */}
            {(negociosResultados.length > 0 || buscandoBackend) && (
              <div>
                <p className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-200/70 border-b border-gray-300/60">
                  Negocios {!buscandoBackend && `(${negociosResultados.length})`}
                </p>

                {/* Skeleton mientras busca */}
                {buscandoBackend && negociosResultados.length === 0 ? (
                  <div className="px-3 py-2 space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                          <div className="h-2 bg-gray-50 rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  negociosResultados.map((neg) => (
                    <button
                      key={neg.sucursalId}
                      onClick={() => handleClickNegocio(neg)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50/60 text-left cursor-pointer"
                    >
                      {/* Foto de perfil */}
                      {neg.fotoPerfil ? (
                        <img
                          src={neg.fotoPerfil}
                          alt={neg.negocioNombre}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-blue-400" />
                        </div>
                      )}

                      {/* Info del negocio */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] lg:text-[13px] font-semibold text-gray-800 truncate">
                          {neg.negocioNombre}
                        </p>
                        {neg.sucursalNombre && (
                          <p className="text-[13px] lg:text-xs text-gray-600 font-medium truncate">
                            {neg.sucursalNombre}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {neg.categoria && (
                            <span className="text-[13px] lg:text-xs text-gray-500 font-medium">
                              {neg.categoria}
                            </span>
                          )}
                          {neg.calificacionPromedio > 0 && (
                            <span className="flex items-center gap-0.5 text-[13px] lg:text-xs text-amber-500 font-medium">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {neg.calificacionPromedio.toFixed(1)}
                            </span>
                          )}
                          {neg.distanciaKm != null && (
                            <span className="flex items-center gap-0.5 text-[13px] lg:text-xs text-gray-500 font-medium">
                              <MapPin className="w-3 h-3" />
                              {neg.distanciaKm < 1
                                ? `${Math.round(neg.distanciaKm * 1000)}m`
                                : `${neg.distanciaKm.toFixed(1)}km`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Sección 3: Personas (del backend) */}
            {(personasResultados.length > 0 || buscandoBackend) && (
              <div>
                <p className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-200/70 border-b border-gray-300/60">
                  Personas {!buscandoBackend && `(${personasResultados.length})`}
                </p>

                {/* Skeleton mientras busca */}
                {buscandoBackend && personasResultados.length === 0 ? (
                  <div className="px-3 py-2 space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                          <div className="h-2 bg-gray-50 rounded animate-pulse w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  personasResultados.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => handleClickPersona(persona)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50/60 text-left cursor-pointer"
                    >
                      {/* Avatar */}
                      {persona.avatarUrl ? (
                        <img
                          src={persona.avatarUrl}
                          alt={persona.nombre}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-gray-100 to-gray-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-gray-400">
                            {persona.nombre.charAt(0)}{persona.apellidos?.charAt(0) || ''}
                          </span>
                        </div>
                      )}

                      {/* Info de la persona */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] lg:text-[13px] font-semibold text-gray-800 truncate">
                          {persona.nombre} {persona.apellidos}
                        </p>
                        {persona.alias && (
                          <p className="text-[13px] lg:text-xs text-gray-600 font-medium truncate">
                            @{persona.alias}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Sin resultados en ninguna sección */}
            {!buscandoBackend &&
              conversacionesFiltradas.length === 0 &&
              personasResultados.length === 0 &&
              negociosResultados.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  <Search className="w-10 lg:w-8 h-10 lg:h-8 text-gray-200 mb-2" />
                  <p className="text-sm lg:text-xs text-gray-400 text-center">
                    No se encontraron resultados para "{busqueda}"
                  </p>
                </div>
              )}
          </div>
        ) : viendoArchivados ? (
          /* ─── MODO ARCHIVADOS: Lista de chats archivados ─── */
          <div className="flex flex-col h-full">
            {/* Header archivados */}
            <button
              onClick={salirArchivados}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-100 border-b border-gray-200 cursor-pointer"
            >
              <ArrowLeft className="w-5 lg:w-4 h-5 lg:h-4 text-gray-500" />
              <span className="text-sm lg:text-xs font-bold text-gray-600">Archivados</span>
            </button>

            {cargandoArchivados ? (
              <div className="px-1 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : archivados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <Archive className="w-10 lg:w-8 h-10 lg:h-8 text-gray-200 mb-2" />
                <p className="text-sm lg:text-xs text-gray-400 text-center">No hay chats archivados</p>
              </div>
            ) : (
              archivados.map((conv) => (
                <ConversacionItem
                  key={conv.id}
                  conversacion={conv}
                  activa={conv.id === conversacionActivaId}
                  onClick={() => {
                    abrirConversacion(conv.id);
                  }}
                  onMenuContextual={handleMenuContextual}
                />
              ))
            )}
          </div>
        ) : (
          /* ─── MODO NORMAL: Lista de conversaciones con tabs ─── */
          <div className="flex flex-col h-full">
            {/* Botón Archivados arriba de la lista */}
            {!estaBuscando && (
              <button
                onClick={verArchivados}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 lg:py-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              >
                <Archive className="w-5 lg:w-4 h-5 lg:h-4" />
                <span className="text-sm lg:text-xs font-bold">Archivados</span>
                {noLeidosArchivados > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {noLeidosArchivados > 9 ? '9+' : noLeidosArchivados}
                  </span>
                )}
              </button>
            )}
            {conversacionesFiltradas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className="w-16 lg:w-12 h-16 lg:h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquarePlus className="w-8 lg:w-6 h-8 lg:h-6 text-blue-400" />
                </div>
                <p className="text-sm lg:text-xs font-semibold text-gray-600 mb-1">
                  {tabActivo === 'todos'
                    ? 'Sin conversaciones'
                    : `Sin chats de ${tabActivo}`
                  }
                </p>
                <p className="text-xs lg:text-[11px] text-gray-400 text-center leading-relaxed">
                  Busca una persona o negocio para iniciar un chat
                </p>
              </div>
            ) : (
              conversacionesFiltradas.map((conv) => (
                <ConversacionItem
                  key={conv.id}
                  conversacion={conv}
                  activa={conv.id === conversacionActivaId}
                  onClick={() => abrirConversacion(conv.id)}
                  onMenuContextual={handleMenuContextual}
                />
              ))
            )}
          </div>
        )}

        {/* ═══ Menú contextual flotante (reutiliza MenuContextualChat) ═══ */}
        {menuContextual && (
          <MenuContextualChat
            conversacion={menuContextual.conversacion}
            onCerrar={cerrarMenuCtx}
            posicion={{ x: menuContextual.x, y: menuContextual.y }}
          />
        )}
      </div>
    </div>
  );
}

export default ListaConversaciones;