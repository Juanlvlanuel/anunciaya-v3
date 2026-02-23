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
import { Search, X, MessageSquarePlus, Store, Star, MapPin, Archive, ArrowLeft, Users, UserPlus, UserMinus } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { ConversacionItem } from './ConversacionItem';
import { MenuContextualChat } from './MenuContextualChat';
import * as chatyaService from '../../services/chatyaService';
import type { ModoChatYA, PersonaBusqueda, NegocioBusqueda, Conversacion, Contacto } from '../../types/chatya';
import Tooltip from '../ui/Tooltip';

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
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);

  // Contactos
  const contactos = useChatYAStore((s) => s.contactos);
  const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
  const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);

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
  const [viendoContactos, setViendoContactos] = useState(false);
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
    // Limpiar datos del modo anterior y precargar en background
    useChatYAStore.setState({ contactos: [], conversacionesArchivadas: [] });
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => {});
    useChatYAStore.getState().cargarArchivados(modoActivo);
  }, [modoActivo, cargarConversaciones]);

  // ---------------------------------------------------------------------------
  // Effect: Debounce búsqueda en backend (personas + negocios)
  // Solo se activa en vista NORMAL (no archivados ni contactos)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Si está en archivados o contactos, NO buscar en backend
    if (viendoArchivados || viendoContactos) {
      setPersonasResultados([]);
      setNegociosResultados([]);
      setBuscandoBackend(false);
      return;
    }

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
  }, [busqueda, estaBuscando, ciudad, latitud, longitud, viendoArchivados, viendoContactos]);

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
  // Filtrar archivados por búsqueda (instantáneo, local)
  // ---------------------------------------------------------------------------
  const archivadosFiltrados = useMemo(() => {
    if (!estaBuscando) return archivados;
    const termino = busqueda.toLowerCase();
    return archivados.filter((c) => {
      const nombre = c.otroParticipante?.nombre?.toLowerCase() || '';
      const apellidos = c.otroParticipante?.apellidos?.toLowerCase() || '';
      const negocio = c.otroParticipante?.negocioNombre?.toLowerCase() || '';
      const sucursal = c.otroParticipante?.sucursalNombre?.toLowerCase() || '';
      return nombre.includes(termino) || apellidos.includes(termino) || negocio.includes(termino) || sucursal.includes(termino);
    });
  }, [archivados, busqueda, estaBuscando]);

  // ---------------------------------------------------------------------------
  // Filtrar contactos por búsqueda (instantáneo, local)
  // ---------------------------------------------------------------------------
  const contactosFiltrados = useMemo(() => {
    if (!estaBuscando) return contactos;
    const termino = busqueda.toLowerCase();
    return contactos.filter((c) => {
      const nombre = c.nombre?.toLowerCase() || '';
      const apellidos = c.apellidos?.toLowerCase() || '';
      const negocio = c.negocioNombre?.toLowerCase() || '';
      const alias = c.alias?.toLowerCase() || '';
      return nombre.includes(termino) || apellidos.includes(termino) || negocio.includes(termino) || alias.includes(termino);
    });
  }, [contactos, busqueda, estaBuscando]);

  // ---------------------------------------------------------------------------
  // Helper: ¿Un usuario/negocio ya es contacto?
  // ---------------------------------------------------------------------------
  const esContacto = useCallback((usuarioId: string, sucursalId?: string): Contacto | undefined => {
    return contactos.find((c) =>
      c.contactoId === usuarioId &&
      c.tipo === modoActivo &&
      (!sucursalId || c.sucursalId === sucursalId)
    );
  }, [contactos, modoActivo]);

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
  const verArchivados = useCallback(() => {
    setViendoArchivados(true);
    // Refresco silencioso (datos ya precargados al cambiar modo)
    cargarArchivados(modoActivo);
  }, [modoActivo, cargarArchivados]);

  const salirArchivados = useCallback(() => {
    setViendoArchivados(false);
    setBusqueda('');
  }, []);

  const verContactos = useCallback(async () => {
    setViendoContactos(true);
    // Refresco silencioso (datos ya precargados al cambiar modo)
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => {});
  }, [modoActivo]);

  const salirContactos = useCallback(() => {
    setViendoContactos(false);
    setBusqueda('');
  }, []);

  // Recargar contactos al cambiar de modo (si ya está en vista contactos)
  useEffect(() => {
    if (!viendoContactos) return;
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => {});
  }, [modoActivo, viendoContactos]);

  // Recargar archivados automáticamente al cambiar de modo (si ya está en vista archivados)
  useEffect(() => {
    if (!viendoArchivados) return;
    cargarArchivados(modoActivo);
  }, [modoActivo, viendoArchivados, cargarArchivados]);

  // ---------------------------------------------------------------------------
  // Menú contextual de conversación (click derecho / long press)
  // ---------------------------------------------------------------------------
  const handleMenuContextual = useCallback((conv: Conversacion, pos: { x: number; y: number }) => {
    setMenuContextual((prev) =>
      prev?.conversacion.id === conv.id ? null : { conversacion: conv, x: pos.x, y: pos.y }
    );
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
        contextoTipo: 'directo',
      },
    });
    limpiarBusqueda();
  }, [abrirChatTemporal, limpiarBusqueda]);

  // ---------------------------------------------------------------------------
  // Handler: Agregar contacto desde resultados de búsqueda
  // ---------------------------------------------------------------------------
  const handleAgregarContacto = useCallback(async (
    usuarioId: string,
    negocioId?: string,
    sucursalId?: string,
    display?: { nombre: string; apellidos: string; avatarUrl: string | null; negocioNombre?: string; negocioLogo?: string; sucursalNombre?: string },
  ) => {
    await agregarContactoStore(
      { contactoId: usuarioId, tipo: modoActivo, negocioId: negocioId || null, sucursalId: sucursalId || null },
      display,
    );
  }, [agregarContactoStore, modoActivo]);

  // ---------------------------------------------------------------------------
  // Handler: Eliminar contacto
  // ---------------------------------------------------------------------------
  const handleEliminarContacto = useCallback(async (contacto: Contacto) => {
    await eliminarContactoStore(contacto.id);
  }, [eliminarContactoStore]);

  // ---------------------------------------------------------------------------
  // Handler: Iniciar chat desde lista de contactos
  // ---------------------------------------------------------------------------
  const handleChatDesdeContacto = useCallback((contacto: Contacto) => {
    const esNegocio = !!contacto.negocioId;
    const miId = useAuthStore.getState().usuario?.id;

    // Buscar si ya existe una conversación activa con este contacto
    const convExistente = conversaciones.find((c) => {
      const otroId = c.otroParticipante?.id;
      if (otroId !== contacto.contactoId) return false;

      if (esNegocio) {
        // Para negocios, verificar que sea la misma sucursal
        const sucIdConv = c.participante1Id === miId
          ? c.participante2SucursalId
          : c.participante1SucursalId;
        return sucIdConv === contacto.sucursalId;
      } else {
        // Para personas, verificar que NO sea un chat con negocio
        return !c.otroParticipante?.negocioNombre;
      }
    });

    if (convExistente) {
      abrirConversacion(convExistente.id);
    } else {
      abrirChatTemporal({
        id: `temp_${Date.now()}`,
        otroParticipante: {
          id: contacto.contactoId,
          nombre: esNegocio ? (contacto.negocioNombre || contacto.nombre) : contacto.nombre,
          apellidos: esNegocio ? '' : contacto.apellidos,
          avatarUrl: esNegocio ? (contacto.negocioLogo || null) : contacto.avatarUrl,
          negocioNombre: contacto.negocioNombre,
          negocioLogo: contacto.negocioLogo,
        },
        datosCreacion: {
          participante2Id: contacto.contactoId,
          participante2Modo: esNegocio ? 'comercial' : 'personal',
          participante2SucursalId: contacto.sucursalId || undefined,
          contextoTipo: 'directo',
        },
      });
    }

    setViendoContactos(false);
    setBusqueda('');
  }, [conversaciones, abrirConversacion, abrirChatTemporal]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      {/* ═══ Input de búsqueda (siempre visible) ═══ */}
      <div className="px-3 py-2.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={
              viendoArchivados ? 'Buscar en archivados...' :
              viendoContactos ? 'Buscar contacto...' :
              'Buscar chats, personas o negocios...'
            }
            className="w-full pl-10 pr-9 py-2.5 bg-white/10 border border-white/15 rounded-full text-sm text-white placeholder:text-white/35 outline-none focus:border-white/35 focus:bg-white/15"
          />
          {/* Botón X para limpiar búsqueda */}
          {busqueda && (
            <button
              onClick={limpiarBusqueda}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/15 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Tabs filtro (solo en vista normal, sin búsqueda activa) ═══ */}
      {!estaBuscando && !viendoArchivados && !viendoContactos && (
        <div className="flex gap-1.5 px-3 pb-2.5 shrink-0">
          {(['todos', 'personas', 'negocios'] as TabFiltro[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabActivo(tab)}
              className={`
                px-4 py-1 rounded-full text-[13px] font-bold capitalize cursor-pointer transition-colors duration-75
                ${tabActivo === tab
                  ? 'bg-white text-[#0B358F]'
                  : 'bg-white/12 text-white/55 hover:bg-white/20 hover:text-white/80'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Contenido scrolleable ═══ */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col relative"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: 'rgba(255,255,255,0.18) transparent',
        }}
      >

        {/* ─── VISTA ARCHIVADOS (siempre montada, oculta con CSS) ─── */}
        <div className={viendoArchivados ? 'flex flex-col h-full' : 'hidden'}>
          {/* Header archivados */}
          <button
            onClick={salirArchivados}
            className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-white/8 border-b border-white/8 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
            <span className="text-sm font-bold text-white/70">Archivados</span>
          </button>

          {archivadosFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Archive className="w-10 h-10 text-white/30 mb-2" />
              <p className="text-[15px] font-semibold text-white/70 text-center">
                {estaBuscando ? `Sin resultados para "${busqueda}"` : 'No hay chats archivados'}
              </p>
            </div>
          ) : (
            archivadosFiltrados.map((conv) => (
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

        {/* ─── VISTA CONTACTOS (siempre montada, oculta con CSS) ─── */}
        <div className={viendoContactos ? 'flex flex-col h-full' : 'hidden'}>
          {/* Header contactos */}
          <button
            onClick={salirContactos}
            className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-white/8 border-b border-white/8 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
            <span className="text-sm font-bold text-white/70">Contactos</span>
          </button>

          {contactosFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Users className="w-10 h-10 text-white/30 mb-2" />
              <p className="text-[15px] font-semibold text-white/70 text-center">
                {estaBuscando ? `Sin resultados para "${busqueda}"` : 'No tienes contactos guardados'}
              </p>
              <p className="text-[13px] text-white/45 text-center mt-1">
                Busca personas o negocios para agregarlos
              </p>
            </div>
          ) : (
            contactosFiltrados.map((contacto) => {
              const esNegocio = !!contacto.negocioId;
              const nombre = esNegocio
                ? (contacto.negocioNombre || contacto.nombre || 'Sin nombre')
                : `${contacto.nombre || ''} ${contacto.apellidos || ''}`.trim() || 'Sin nombre';
              const avatar = esNegocio ? (contacto.negocioLogo || null) : contacto.avatarUrl;
              const iniciales = `${(contacto.nombre || '').charAt(0)}${(contacto.apellidos || '').charAt(0)}`.toUpperCase() || '?';

              return (
                <div
                  key={contacto.id}
                  onClick={() => handleChatDesdeContacto(contacto)}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 border-b border-white/5 cursor-pointer"
                >
                  {/* Avatar */}
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={nombre}
                      className={`w-10 h-10 shrink-0 object-cover ${esNegocio ? 'rounded-lg' : 'rounded-full'}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center ${esNegocio ? 'rounded-lg bg-white/10' : 'rounded-full bg-linear-to-br from-blue-500 to-blue-700'}`}>
                      {esNegocio ? (
                        <Store className="w-5 h-5 text-white/40" />
                      ) : (
                        <span className="text-sm font-bold text-white">{iniciales}</span>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white/85 truncate">{nombre}</p>
                    {esNegocio && contacto.sucursalNombre && (
                      <p className="text-xs text-white/45 truncate">{contacto.sucursalNombre}</p>
                    )}
                    {!esNegocio && contacto.alias && (
                      <p className="text-xs text-white/45 truncate">@{contacto.alias}</p>
                    )}
                  </div>

                  {/* Eliminar contacto */}
                  <Tooltip text="Eliminar contacto" position="bottom">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarContacto(contacto);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 cursor-pointer shrink-0"
                    >
                      <UserMinus className="w-4.5 h-4.5 text-white/40 hover:text-red-400" />
                    </button>
                  </Tooltip>
                </div>
              );
            })
          )}
        </div>

        {/* ─── VISTA BÚSQUEDA GLOBAL (solo cuando busca en vista normal) ─── */}
        <div className={estaBuscando && !viendoArchivados && !viendoContactos ? 'flex flex-col h-full' : 'hidden'}>
          {/* Sección 1: Conversaciones existentes que coinciden */}
          {conversacionesFiltradas.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[11px] font-bold text-white/45 uppercase tracking-wider bg-white/6 border-b border-white/8">
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
              <p className="px-3 py-1.5 text-[11px] font-bold text-white/45 uppercase tracking-wider bg-white/6 border-b border-white/8">
                Negocios {!buscandoBackend && `(${negociosResultados.length})`}
              </p>

              {buscandoBackend && negociosResultados.length === 0 ? (
                <div className="px-3 py-2 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-white/10 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-white/6 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                negociosResultados.map((neg) => {
                  const contactoExistente = esContacto(neg.usuarioId, neg.sucursalId);
                  return (
                    <div
                      key={neg.sucursalId}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 border-b border-white/5"
                    >
                      <button
                        onClick={() => handleClickNegocio(neg)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        {neg.fotoPerfil ? (
                          <img
                            src={neg.fotoPerfil}
                            alt={neg.negocioNombre}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-white/40" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-white/85 truncate">
                            {neg.negocioNombre}
                          </p>
                          {neg.sucursalNombre && (
                            <p className="text-xs text-white/50 font-medium truncate">
                              {neg.sucursalNombre}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {neg.categoria && (
                              <span className="text-xs text-white/40 font-medium">
                                {neg.categoria}
                              </span>
                            )}
                            {neg.calificacionPromedio > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-400 font-medium">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {neg.calificacionPromedio.toFixed(1)}
                              </span>
                            )}
                            {neg.distanciaKm != null && (
                              <span className="flex items-center gap-0.5 text-xs text-white/40 font-medium">
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

                      <Tooltip text={contactoExistente ? 'Eliminar de contactos' : 'Agregar a contactos'} position="bottom">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (contactoExistente) {
                              handleEliminarContacto(contactoExistente);
                            } else {
                              handleAgregarContacto(neg.usuarioId, neg.negocioId, neg.sucursalId, {
                                nombre: '',
                                apellidos: '',
                                avatarUrl: neg.fotoPerfil || null,
                                negocioNombre: neg.negocioNombre,
                                negocioLogo: neg.fotoPerfil || undefined,
                                sucursalNombre: neg.sucursalNombre || undefined,
                              });
                            }
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${
                            contactoExistente ? 'hover:bg-red-500/20' : 'hover:bg-white/15'
                          }`}
                        >
                          {contactoExistente ? (
                            <UserMinus className="w-4.5 h-4.5 text-red-400/70" />
                          ) : (
                            <UserPlus className="w-4.5 h-4.5 text-white/45" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sección 3: Personas (del backend) */}
          {(personasResultados.length > 0 || buscandoBackend) && (
            <div>
              <p className="px-3 py-1.5 text-[11px] font-bold text-white/45 uppercase tracking-wider bg-white/6 border-b border-white/8">
                Personas {!buscandoBackend && `(${personasResultados.length})`}
              </p>

              {buscandoBackend && personasResultados.length === 0 ? (
                <div className="px-3 py-2 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-2/3" />
                        <div className="h-2 bg-white/6 rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                personasResultados.map((persona) => {
                  const contactoExistente = esContacto(persona.id);
                  return (
                    <div
                      key={persona.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 border-b border-white/5"
                    >
                      <button
                        onClick={() => handleClickPersona(persona)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        {persona.avatarUrl ? (
                          <img
                            src={persona.avatarUrl}
                            alt={persona.nombre}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-white/45">
                              {persona.nombre.charAt(0)}{persona.apellidos?.charAt(0) || ''}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-white/85 truncate">
                            {persona.nombre} {persona.apellidos}
                          </p>
                          {persona.alias && (
                            <p className="text-xs text-white/45 font-medium truncate">
                              @{persona.alias}
                            </p>
                          )}
                        </div>
                      </button>

                      <Tooltip text={contactoExistente ? 'Eliminar de contactos' : 'Agregar a contactos'} position="bottom">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (contactoExistente) {
                              handleEliminarContacto(contactoExistente);
                            } else {
                              handleAgregarContacto(persona.id, undefined, undefined, {
                                nombre: persona.nombre,
                                apellidos: persona.apellidos,
                                avatarUrl: persona.avatarUrl,
                              });
                            }
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${
                            contactoExistente ? 'hover:bg-red-500/20' : 'hover:bg-white/15'
                          }`}
                        >
                          {contactoExistente ? (
                            <UserMinus className="w-4.5 h-4.5 text-red-400/70" />
                          ) : (
                            <UserPlus className="w-4.5 h-4.5 text-white/45" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sin resultados en ninguna sección */}
          {!buscandoBackend &&
            conversacionesFiltradas.length === 0 &&
            personasResultados.length === 0 &&
            negociosResultados.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <Search className="w-10 h-10 text-white/30 mb-2" />
                <p className="text-[15px] font-semibold text-white/70 text-center">
                  No se encontraron resultados para "{busqueda}"
                </p>
              </div>
            )}
        </div>

        {/* ─── VISTA NORMAL: Lista de conversaciones con tabs ─── */}
        <div className={!estaBuscando && !viendoArchivados && !viendoContactos ? 'flex flex-col h-full' : 'hidden'}>
          {/* Fila: Contactos (izq) + Archivados (der) */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/8">
            {/* Contactos */}
            <button
              onClick={verContactos}
              className="flex items-center gap-2 text-white/40 hover:text-white/70 cursor-pointer transition-colors duration-75"
            >
              <Users className="w-4.5 h-4.5" />
              <span className="text-[13px] font-bold">Contactos</span>
            </button>

            {/* Archivados */}
            <button
              onClick={verArchivados}
              className="flex items-center gap-2 text-white/40 hover:text-white/70 cursor-pointer transition-colors duration-75"
            >
              <Archive className="w-4.5 h-4.5" />
              <span className="text-[13px] font-bold">Archivados</span>
              {noLeidosArchivados > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {noLeidosArchivados > 9 ? '9+' : noLeidosArchivados}
                </span>
              )}
            </button>
          </div>
          {conversacionesFiltradas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                <MessageSquarePlus className="w-7 h-7 text-white/40" />
              </div>
              <p className="text-[15px] font-semibold text-white/70 mb-1">
                {tabActivo === 'todos' && 'Sin conversaciones'}
                {tabActivo === 'personas' && 'Sin chats con personas'}
                {tabActivo === 'negocios' && 'Sin chats con negocios'}
              </p>
              <p className="text-[13px] text-white/45 text-center leading-relaxed">
                {tabActivo === 'todos' && <>Busca una persona o negocio<br />para iniciar un chat</>}
                {tabActivo === 'personas' && <>Busca una persona<br />para iniciar un chat</>}
                {tabActivo === 'negocios' && <>Busca un negocio<br />para iniciar un chat</>}
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