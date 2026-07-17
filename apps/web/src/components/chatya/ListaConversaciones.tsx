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
import { Search, X, MessageSquarePlus, Store, Archive, ArrowLeft, Users, UserPlus, UserMinus, Loader2, Briefcase, ChevronDown } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useChatYASession, obtenerMiIdChatYA } from '../../hooks/useChatYASession';
import { useIniciarChatDirectoPersona } from '../../hooks/useIniciarChatDirectoPersona';
import { useIniciarChatNegocio } from '../../hooks/useIniciarChatNegocio';
import { useBackNativo } from '../../hooks/useBackNativo';
import { useGpsStore } from '../../stores/useGpsStore';
import { ConversacionItem } from './ConversacionItem';
import { MenuContextualChat } from './MenuContextualChat';
import { MenuContextualContacto } from './MenuContextualContacto';
import * as chatyaService from '../../services/chatyaService';
import type { PersonaBusqueda, NegocioBusqueda, Conversacion, Contacto } from '../../types/chatya';
import Tooltip from '../ui/Tooltip';

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type TabFiltro = 'todos' | 'personas' | 'negocios';

interface ListaConversacionesProps {
  /** Set de IDs seleccionados (controlado desde ChatOverlay) */
  seleccionadas?: Set<string>;
  /** ¿Hay alguna conversación seleccionada? */
  modoSeleccion?: boolean;
  /** Long press inicia selección (solo móvil) */
  onLongPressSeleccion?: (conversacionId: string) => void;
  /** Toggle selección de una conversación */
  onToggleSeleccion?: (conversacionId: string) => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ListaConversaciones({ seleccionadas, modoSeleccion, onLongPressSeleccion, onToggleSeleccion }: ListaConversacionesProps) {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  // `conversaciones` y el modo que representa (`conversacionesModo` en el store)
  // se actualizan atómicamente en `swapearModoDesdeCache` y `cargarConversaciones`,
  // así que la lista siempre es coherente con el modo mostrado — no hace falta
  // un invariante cross-store que compare contra `authUsuario.modoActivo`.
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const cargandoConversaciones = useChatYAStore((s) => s.cargandoConversaciones);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
  const filtroPublicacionId = useChatYAStore((s) => s.filtroPublicacionId);
  const setFiltroPublicacionId = useChatYAStore((s) => s.setFiltroPublicacionId);

  // Contactos
  const contactos = useChatYAStore((s) => s.contactos);
  const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
  const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);

  // Directorio comercial (personas de la ciudad de la sucursal). Reemplaza la
  // lista de contactos manuales cuando la cuenta está en modo comercial.
  const directorio = useChatYAStore((s) => s.directorio);
  const directorioHayMas = useChatYAStore((s) => s.directorioHayMas);
  const directorioTotal = useChatYAStore((s) => s.directorioTotal);
  const cargandoDirectorio = useChatYAStore((s) => s.cargandoDirectorio);
  const cargarDirectorio = useChatYAStore((s) => s.cargarDirectorio);

  // Hooks centralizados para iniciar chat desde resultados del buscador.
  // Internamente buscan conv existente antes de abrir chat temporal para
  // evitar duplicados visuales (misma persona/negocio como temporal + real).
  const iniciarChatDirectoPersona = useIniciarChatDirectoPersona();
  const iniciarChatNegocio = useIniciarChatNegocio();

  const { modo: modoActivo } = useChatYASession();

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
  /** Sub-vista dentro de "Contactos" en modo comercial: lista curada ('contactos') o directorio de la ciudad ('directorio'). En personal siempre es la lista curada. */
  const [subVistaComercial, setSubVistaComercial] = useState<'contactos' | 'directorio'>('contactos');
  /** Otras sucursales del negocio (modo comercial) para la sección fija "Mis sucursales". */
  const [misSucursales, setMisSucursales] = useState<NegocioBusqueda[]>([]);
  const [sucursalesExpandido, setSucursalesExpandido] = useState(false);
  const [menuContextual, setMenuContextual] = useState<{ conversacion: Conversacion; x: number; y: number } | null>(null);
  const [menuContacto, setMenuContacto] = useState<{ contacto: Contacto; x: number; y: number } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** true cuando hay ≥2 caracteres → activa modo búsqueda */
  const estaBuscando = busqueda.trim().length >= 2;

  /** En modo comercial la vista "Contactos" tiene dos sub-vistas: "Mis contactos" (lista curada) y "Directorio" (todos los usuarios de la ciudad). Este flag es true solo cuando se está viendo el Directorio. */
  const esDirectorioComercial = viendoContactos && modoActivo === 'comercial' && subVistaComercial === 'directorio';

  // ---------------------------------------------------------------------------
  // Effect: Cargar conversaciones al montar y cuando cambia el modo
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Si ya hay conversaciones cargadas, solo refrescar silenciosamente.
    // Evita duplicar la carga con ChatOverlay que también llama inicializar().
    const yaHayDatos = useChatYAStore.getState().conversaciones.length > 0;
    cargarConversaciones(modoActivo, 0, yaHayDatos);
    // NO limpiar contactos/archivados aquí — causa parpadeo al dejar arrays vacíos.
    // Las siguientes cargas son silenciosas y reemplazan los datos directamente.
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => { });
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
          // En comercial el buscador no muestra negocios (el inter-sucursal vive en
          // "Mis sucursales"; los negocios ajenos son ruido para una cuenta comercial).
          ciudadNombre && modoActivo !== 'comercial'
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
  }, [busqueda, estaBuscando, ciudad, latitud, longitud, viendoArchivados, viendoContactos, modoActivo]);

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

    // Separar fijadas arriba, luego el resto — ambas ordenadas por más reciente
    const ordenarPorFecha = (a: Conversacion, b: Conversacion) => {
      const fa = a.ultimoMensajeFecha ? new Date(a.ultimoMensajeFecha).getTime() : 0;
      const fb = b.ultimoMensajeFecha ? new Date(b.ultimoMensajeFecha).getTime() : 0;
      return fb - fa;
    };
    const fijadas = lista.filter((c) => c.fijada).sort(ordenarPorFecha);
    const noFijadas = lista.filter((c) => !c.fijada).sort(ordenarPorFecha);

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

  /** Total de contactos guardados del modo actual (para el badge de "Mis contactos"). Sin filtro de búsqueda. */
  const totalMisContactos = useMemo(
    () => contactos.filter((c) => c.tipo === modoActivo).length,
    [contactos, modoActivo],
  );

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

  /** Abrir conversación desde resultados de búsqueda (abre + limpia búsqueda) */
  const abrirDesdeResultado = useCallback((conversacionId: string) => {
    abrirConversacion(conversacionId);
    limpiarBusqueda();
  }, [abrirConversacion, limpiarBusqueda]);

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
    setSubVistaComercial('contactos'); // siempre abre en "Mis contactos"
    setViendoContactos(true);
    // Refresco silencioso (datos ya precargados al cambiar modo)
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => { });
    // En comercial, pre-cargar el directorio (para el badge del sub-tab) y las
    // sucursales propias (sección fija "Mis sucursales").
    if (modoActivo === 'comercial') {
      void cargarDirectorio(0, '');
      chatyaService.getMisSucursales()
        .then((res) => { if (res.success && res.data) setMisSucursales(res.data); })
        .catch(() => { });
    }
  }, [modoActivo, cargarDirectorio]);

  const salirContactos = useCallback(() => {
    setViendoContactos(false);
    setBusqueda('');
  }, []);

  // Back nativo del celular / flecha del navegador → salir de "Contactos"
  // (incluida su sub-vista "Directorio") de vuelta a la lista de chats activos,
  // sin importar en qué sub-tab esté (el usuario lo pidió así: 1 back sale de
  // Contactos completo, no navega entre sub-tabs). La entrada se apila SOBRE la
  // del overlay del chat: useBackNativo hereda el state previo (que trae la
  // marca `chatyaOverlay`), así que el sistema de capas manual del ChatOverlay
  // la respeta — el back consume primero ESTA entrada (cierra Contactos) y deja
  // el overlay del chat abierto. Discriminador propio para no chocar con las
  // capas del overlay (chat, visor, panelInfo). Al abrir un chat desde aquí,
  // `setViendoContactos(false)` cierra esta capa antes de que el chat empuje la
  // suya. Ver docs/estandares/Sistema_Navegacion_Back.md (sección ChatYA).
  useBackNativo({
    abierto: viendoContactos,
    onCerrar: salirContactos,
    discriminador: '_chatyaContactos',
  });

  /** Alterna entre "Mis contactos" (búsqueda local) y "Directorio" (búsqueda server-side). Limpia el texto al cambiar para no arrastrar un filtro entre sub-vistas con lógicas de búsqueda distintas. */
  const cambiarSubVista = useCallback((v: 'contactos' | 'directorio') => {
    setSubVistaComercial(v);
    setBusqueda('');
  }, []);

  // Recargar contactos al cambiar de modo (si ya está en vista contactos)
  useEffect(() => {
    if (!viendoContactos) return;
    chatyaService.getContactos(modoActivo)
      .then((res) => useChatYAStore.setState({ contactos: res.data || [] }))
      .catch(() => { });
  }, [modoActivo, viendoContactos]);

  // Cargar el directorio comercial al entrar a "Contactos" en modo comercial, y
  // recargarlo (con debounce) al escribir en el buscador. La búsqueda del directorio
  // es server-side (por ciudad de la sucursal), no local como la de contactos.
  useEffect(() => {
    if (!esDirectorioComercial) return;
    const t = setTimeout(() => { void cargarDirectorio(0, busqueda.trim()); }, 300);
    return () => clearTimeout(t);
  }, [esDirectorioComercial, busqueda, cargarDirectorio]);

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
  // Menú contextual de contacto (click derecho / long press)
  // ---------------------------------------------------------------------------
  const handleMenuContacto = useCallback((contacto: Contacto, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const rect = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    setMenuContacto({ contacto, x: rect.x, y: rect.y });
  }, []);

  const cerrarMenuContacto = useCallback(() => setMenuContacto(null), []);

  const handleLongPressStart = useCallback((contacto: Contacto, e: React.TouchEvent) => {
    longPressRef.current = setTimeout(() => handleMenuContacto(contacto, e), 500);
  }, [handleMenuContacto]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Click en persona → buscar conv existente y reusar; si no, abrir
  // chat temporal (delegado en `useIniciarChatDirectoPersona`).
  // ---------------------------------------------------------------------------
  const handleClickPersona = useCallback((persona: PersonaBusqueda) => {
    limpiarBusqueda();
    void iniciarChatDirectoPersona({
      usuarioId: persona.id,
      nombre: persona.nombre,
      apellidos: persona.apellidos,
      avatarUrl: persona.avatarUrl,
    });
  }, [iniciarChatDirectoPersona, limpiarBusqueda]);

  // ---------------------------------------------------------------------------
  // Handler: Click en negocio → buscar conv existente y reusar; si no, abrir
  // chat temporal (delegado en `useIniciarChatNegocio`).
  // ---------------------------------------------------------------------------
  const handleClickNegocio = useCallback((negocio: NegocioBusqueda) => {
    limpiarBusqueda();
    void iniciarChatNegocio({
      usuarioId: negocio.usuarioId,
      sucursalId: negocio.sucursalId,
      negocioNombre: negocio.negocioNombre,
      avatarUrl: negocio.fotoPerfil,
      sucursalNombre: negocio.sucursalNombre || undefined,
    });
  }, [iniciarChatNegocio, limpiarBusqueda]);

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
    const miId = obtenerMiIdChatYA();

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
      // Avatar comercial: foto de perfil de la SUCURSAL con fallback al logo
      // del negocio. En modo personal se usa el avatar del usuario.
      const avatarComercial = contacto.sucursalFotoPerfil ?? contacto.negocioLogo ?? null;
      abrirChatTemporal({
        id: `temp_${Date.now()}`,
        otroParticipante: {
          id: contacto.contactoId,
          nombre: esNegocio ? (contacto.negocioNombre || contacto.nombre) : contacto.nombre,
          apellidos: esNegocio ? '' : contacto.apellidos,
          avatarUrl: esNegocio ? avatarComercial : contacto.avatarUrl,
          negocioNombre: contacto.negocioNombre,
          negocioLogo: esNegocio ? (avatarComercial ?? undefined) : contacto.negocioLogo,
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
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden select-none">
      {/* ═══ Chip de filtro activo (cuando viene de BS Vacantes) ═══ */}
      {filtroPublicacionId && (
        <div className="px-3 pt-2.5 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/25 border border-blue-300/40 rounded-full text-white text-sm font-semibold">
            <Briefcase className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Filtrado por vacante</span>
            <button
              type="button"
              onClick={() => setFiltroPublicacionId(null)}
              className="w-5 h-5 rounded-full grid place-items-center hover:bg-white/15 lg:cursor-pointer"
              aria-label="Quitar filtro"
              data-testid="btn-quitar-filtro-publicacion"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

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
            className="w-full pl-10 pr-9 py-2.5 lg:py-2 text-base lg:text-sm bg-white/10 border border-white/15 rounded-full text-white placeholder:text-white/35 outline-none focus:border-white/35 focus:bg-white/15" />
          {/* Botón X para limpiar búsqueda */}
          {busqueda && (
            <button
              onClick={limpiarBusqueda}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/15 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5 text-white/50" />
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
                px-4 py-1 rounded-full text-sm font-bold capitalize cursor-pointer
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
                onClickConversacion={abrirConversacion}
                onMenuContextual={handleMenuContextual}
              />
            ))
          )}
        </div>

        {/* ─── VISTA CONTACTOS (siempre montada, oculta con CSS) ─── */}
        <div className={viendoContactos ? 'flex flex-col h-full' : 'hidden'}>
          {/* Header contactos: flecha atrás + (en comercial) sub-tabs "Mis contactos | Directorio" */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
            <button
              onClick={salirContactos}
              aria-label="Volver a chats"
              className="shrink-0 p-1 -ml-1 rounded-lg hover:bg-white/8 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            {modoActivo === 'comercial' ? (
              <div className="flex gap-1.5">
                {(['contactos', 'directorio'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => cambiarSubVista(v)}
                    data-testid={`chatya-subtab-${v}`}
                    className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[13px] font-bold cursor-pointer ${subVistaComercial === v
                      ? 'bg-white text-[#0B358F]'
                      : 'bg-white/12 text-white/55 hover:bg-white/20 hover:text-white/80'
                      }`}
                  >
                    <span>{v === 'contactos' ? 'Mis contactos' : 'Directorio'}</span>
                    <span
                      data-testid={`chatya-subtab-${v}-count`}
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center ${subVistaComercial === v
                        ? 'bg-[#0B358F]/12 text-[#0B358F]'
                        : 'bg-white/20 text-white/70'
                        }`}
                    >
                      {v === 'contactos' ? totalMisContactos : directorioTotal}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-sm font-bold text-white/70">Contactos</span>
            )}
          </div>

          {/* Sección fija "Mis sucursales" — solo en la sub-vista "Mis contactos" (comercial) y si hay otras sucursales. Contactos automáticos y fijos: sin agregar/quitar. */}
          {!esDirectorioComercial && modoActivo === 'comercial' && misSucursales.length > 0 && (
            <div className="border-b border-white/8 shrink-0">
              <button
                onClick={() => setSucursalesExpandido((v) => !v)}
                data-testid="chatya-mis-sucursales-toggle"
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/8 cursor-pointer"
              >
                <span className="flex items-center gap-2 text-[13px] font-bold text-white/70">
                  <Store className="w-4 h-4 text-white/50" />
                  Mis sucursales
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-white/15 text-white/70">
                    {misSucursales.length}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${sucursalesExpandido ? 'rotate-180' : ''}`} />
              </button>
              {sucursalesExpandido && misSucursales.map((suc) => {
                const nombre = suc.sucursalNombre || suc.negocioNombre;
                return (
                  <div
                    key={suc.sucursalId}
                    onClick={() => handleClickNegocio(suc)}
                    data-testid={`mi-sucursal-${suc.sucursalId}`}
                    className="flex items-center gap-2.5 pl-6 pr-3 py-2.5 hover:bg-white/8 border-t border-white/5 cursor-pointer select-none"
                  >
                    {suc.fotoPerfil ? (
                      <img src={suc.fotoPerfil} alt={nombre} className="w-9 h-9 shrink-0 object-cover rounded-full" />
                    ) : (
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white/10">
                        <Store className="w-4.5 h-4.5 text-white/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white/85 truncate">{nombre}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {esDirectorioComercial ? (
            <div className="flex-1 overflow-y-auto">
              {cargandoDirectorio && directorio.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                </div>
              ) : directorio.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-10">
                  <Users className="w-10 h-10 text-white/30 mb-2" />
                  <p className="text-[15px] font-semibold text-white/70 text-center">
                    {busqueda.trim() ? `Sin resultados para "${busqueda}"` : 'Aún no hay usuarios en tu ciudad'}
                  </p>
                </div>
              ) : (
                <>
                  {directorio.map((p) => {
                    const nombre = `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre';
                    const iniciales = `${(p.nombre || '').charAt(0)}${(p.apellidos || '').charAt(0)}`.toUpperCase() || '?';
                    const contactoExistente = esContacto(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 border-b border-white/5"
                        data-testid={`directorio-persona-${p.id}`}
                      >
                        <button
                          onClick={() => { void iniciarChatDirectoPersona({ usuarioId: p.id, nombre: p.nombre, apellidos: p.apellidos, avatarUrl: p.avatarUrl }); }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer select-none"
                        >
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={nombre} className="w-10 h-10 shrink-0 object-cover rounded-full" />
                          ) : (
                            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-700">
                              <span className="text-sm font-bold text-white">{iniciales}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-white/85 truncate">{nombre}</p>
                          </div>
                        </button>

                        {/* Guardar / quitar de "Mis contactos" — reutiliza chat_contactos (tipo comercial) */}
                        <Tooltip text={contactoExistente ? 'Quitar de Mis contactos' : 'Agregar a Mis contactos'} position="bottom">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (contactoExistente) {
                                void handleEliminarContacto(contactoExistente);
                              } else {
                                void handleAgregarContacto(p.id, undefined, undefined, {
                                  nombre: p.nombre,
                                  apellidos: p.apellidos,
                                  avatarUrl: p.avatarUrl,
                                });
                              }
                            }}
                            data-testid={`directorio-guardar-${p.id}`}
                            className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${contactoExistente ? 'hover:bg-red-500/20' : 'hover:bg-white/15'}`}
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
                  })}
                  {directorioHayMas && (
                    <button
                      onClick={() => { void cargarDirectorio(directorio.length, busqueda.trim()); }}
                      disabled={cargandoDirectorio}
                      className="w-full py-3 text-sm text-white/60 hover:bg-white/8 cursor-pointer disabled:opacity-50"
                    >
                      {cargandoDirectorio ? 'Cargando…' : 'Cargar más'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : contactosFiltrados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Users className="w-10 h-10 text-white/30 mb-2" />
              <p className="text-[15px] font-semibold text-white/70 text-center">
                {estaBuscando ? `Sin resultados para "${busqueda}"` : 'No tienes contactos guardados'}
              </p>
              <p className="text-[13px] text-white/45 text-center mt-1">
                {modoActivo === 'comercial'
                  ? 'Agrégalos desde el Directorio o la búsqueda'
                  : 'Busca personas o negocios para agregarlos'}
              </p>
            </div>
          ) : (
            contactosFiltrados.map((contacto) => {
              const esNegocio = !!contacto.negocioId;
              const nombreReal = esNegocio
                ? (contacto.negocioNombre || contacto.nombre || 'Sin nombre')
                : `${contacto.nombre || ''} ${contacto.apellidos || ''}`.trim() || 'Sin nombre';
              // Alias tiene prioridad sobre el nombre real
              const nombreMostrar = contacto.alias?.trim() || nombreReal;
              // Avatar negocio: foto de perfil de SUCURSAL con fallback al logo.
              const avatar = esNegocio
                ? (contacto.sucursalFotoPerfil ?? contacto.negocioLogo ?? null)
                : contacto.avatarUrl;
              const iniciales = `${(contacto.nombre || '').charAt(0)}${(contacto.apellidos || '').charAt(0)}`.toUpperCase() || '?';

              return (
                <div
                  key={contacto.id}
                  onClick={() => handleChatDesdeContacto(contacto)}
                  onContextMenu={(e) => handleMenuContacto(contacto, e)}
                  onTouchStart={(e) => handleLongPressStart(contacto, e)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/8 border-b border-white/5 cursor-pointer select-none"
                >
                  {/* Avatar — siempre redondo */}
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={nombreMostrar}
                      className="w-10 h-10 shrink-0 object-cover rounded-full"
                    />
                  ) : (
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full ${esNegocio ? 'bg-white/10' : 'bg-linear-to-br from-blue-500 to-blue-700'}`}>
                      {esNegocio ? (
                        <Store className="w-5 h-5 text-white/40" />
                      ) : (
                        <span className="text-sm font-bold text-white">{iniciales}</span>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white/85 truncate">{nombreMostrar}</p>
                    {esNegocio && contacto.sucursalNombre && (
                      <p className="text-xs text-white/45 truncate">
                        suc. {contacto.sucursalNombre}
                      </p>
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
                  onClickConversacion={abrirDesdeResultado}
                  onMenuContextual={handleMenuContextual}
                />
              ))}
            </div>
          )}

          {/* Sección 2: Negocios (del backend) — oculta en comercial (ver "Mis sucursales") */}
          {modoActivo !== 'comercial' && (negociosResultados.length > 0 || buscandoBackend) && (
            <div>
              <p className="px-3 py-1.5 text-[11px] font-bold text-white/45 uppercase tracking-wider bg-white/6 border-b border-white/8">
                Negocios {!buscandoBackend && `(${negociosResultados.length})`}
              </p>

              {buscandoBackend && negociosResultados.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-white/40">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="text-xs">Buscando...</span>
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
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
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
                          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${contactoExistente ? 'hover:bg-red-500/20' : 'hover:bg-white/15'
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
                <div className="flex items-center gap-2 px-3 py-3 text-white/40">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="text-xs">Buscando...</span>
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
                          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 cursor-pointer ${contactoExistente ? 'hover:bg-red-500/20' : 'hover:bg-white/15'
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
          <div className="flex items-center justify-between px-3.5 py-3.5 lg:py-2.5 border-b border-white/8">
            {/* Contactos */}
            <button
              onClick={verContactos}
              className="flex items-center gap-2 text-white/60 hover:text-white/70 cursor-pointer"
            >
              <Users className="w-4.5 h-4.5" />
              <span className="2xl:text-[13px] text-[14px]  font-bold">Contactos</span>
            </button>

            {/* Archivados */}
            <button
              onClick={verArchivados}
              className="flex items-center gap-2 text-white/60 hover:text-white/70 cursor-pointer"
            >
              <Archive className="w-4.5 h-4.5" />
              <span className="2xl:text-[13px] text-[14px] font-bold">Archivados</span>
              {noLeidosArchivados > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {noLeidosArchivados > 9 ? '9+' : noLeidosArchivados}
                </span>
              )}
            </button>
          </div>
          {cargandoConversaciones && conversacionesFiltradas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              <p className="text-[13px] text-white/45">Cargando chats...</p>
            </div>
          ) : conversacionesFiltradas.length === 0 ? (
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
                onClickConversacion={abrirConversacion}
                onMenuContextual={handleMenuContextual}
                modoSeleccion={modoSeleccion}
                seleccionada={seleccionadas?.has(conv.id)}
                onLongPress={onLongPressSeleccion}
                onToggleSeleccion={onToggleSeleccion}
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

        {/* ═══ Menú contextual de contacto ═══ */}
        {menuContacto && (
          <MenuContextualContacto
            contacto={menuContacto.contacto}
            posicion={{ x: menuContacto.x, y: menuContacto.y }}
            onCerrar={cerrarMenuContacto}
          />
        )}
      </div>
    </div>
  );
}

export default ListaConversaciones;