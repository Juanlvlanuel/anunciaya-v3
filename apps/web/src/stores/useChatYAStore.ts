/**
 * useChatYAStore.ts
 * ==================
 * Store de Zustand para el módulo ChatYA (Chat 1:1 en tiempo real).
 *
 * UBICACIÓN: apps/web/src/stores/useChatYAStore.ts
 *
 * RESPONSABILIDADES:
 *   - Gestionar conversaciones (lista, crear, fijar, archivar, silenciar, eliminar)
 *   - Gestionar mensajes (listar, enviar, editar, eliminar, reenviar)
 *   - Gestionar contactos y bloqueados
 *   - Controlar badge de no leídos (total y por conversación)
 *   - Controlar la vista activa del ChatOverlay
 *   - Manejar indicador "escribiendo..."
 *   - Escuchar eventos Socket.io para tiempo real
 *
 * MODO DUAL:
 *   - Al cambiar el toggle personal/comercial, la lista de chats cambia
 *   - Se pasa el modo al endpoint y el backend filtra
 *
 * OPTIMISTIC UI:
 *   - enviarMensaje: aparece instantáneamente con ID temporal
 *   - toggleFijar/Archivar/Silenciar: cambio inmediato, rollback si falla
 *   - marcarComoLeido: resetea contador inmediatamente
 */

import { create } from 'zustand';
import * as chatyaService from '../services/chatyaService';
import { useAuthStore } from './useAuthStore';
import { obtenerMiIdChatYA, obtenerModoChatYA, obtenerSucursalChatYA } from '../hooks/useChatYASession';
import { useScanYAStore } from './useScanYAStore';
import { escucharEvento, emitirEvento } from '../services/socketService';
import { notificar } from '../utils/notificaciones';
import { diagInicio, diagMarca } from '../utils/diagnosticoChatYA';
import type {
  Conversacion,
  Mensaje,
  ModoChatYA,
  VistaChatYA,
  CrearConversacionInput,
  EnviarMensajeInput,
  EditarMensajeInput,
  ReenviarMensajeInput,
  Contacto,
  AgregarContactoInput,
  ContactoDisplay,
  UsuarioBloqueado,
  BloquearUsuarioInput,
  MensajeFijado,
  EstadoEscribiendo,
  ListaPaginada,
  TipoMensaje,
  EstadoMensaje,
  EventoMensajeNuevo,
  EventoMensajeEditado,
  EventoMensajeEliminado,
  EventoLeido,
  EventoEscribiendo,
  EventoEntregado,
  EventoReaccion,
  EventoEstadoUsuario,
  EventoMensajeFijado,
  EventoMensajeDesfijado,
} from '../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

// =============================================================================
// TIPOS DEL STORE
// =============================================================================

// =============================================================================
// CHAT TEMPORAL (lazy creation)
// El chat se muestra antes de existir en el backend.
// La conversación real se crea solo al enviar el primer mensaje.
// =============================================================================

export interface ChatTemporal {
  /** ID local — siempre empieza con "temp_" */
  id: string;
  /** Datos del contacto para mostrar el header igual que un chat real */
  otroParticipante: {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    negocioNombre?: string;
    negocioLogo?: string;
    sucursalNombre?: string;
  };
  /** Datos para crear la conversación real al enviar el primer mensaje */
  datosCreacion: CrearConversacionInput;
  /**
   * Mensaje sistema OPTIMISTA insertado en la ventana del chat al abrir
   * el chat temporal. Permite mostrar contexto (ej: card del artículo de
   * MarketPlace) ANTES de que el usuario envíe el primer mensaje, sin
   * esperar a que el backend cree la conversación. Cuando se materializa
   * la conversación real, este optimista es reemplazado por el mensaje
   * sistema real del backend (vía cargarMensajes).
   */
  mensajeContextoOptimista?: Mensaje;
  /**
   * Texto pre-cargado en el input al abrir el chat temporal. Se guarda
   * como borrador del temp_id, así el `InputMensaje` lo carga
   * automáticamente. Útil para sugerir un mensaje inicial — ej:
   * "Hola, me interesa tu publicación de [título]".
   */
  borradorInicial?: string;
}

interface ChatYAState {
  // ─── Navegación interna ────────────────────────────────────────────────
  vistaActiva: VistaChatYA;
  conversacionActivaId: string | null;
  misNotasId: string | null;
  visorAbierto: boolean;
  panelInfoAbierto: boolean;

  // ─── Conversaciones ────────────────────────────────────────────────────
  conversaciones: Conversacion[];
  /** Modo para el cual está cargada la lista actual (siempre coherente con `conversaciones`). */
  conversacionesModo: ModoChatYA | null;
  /**
   * Cache por modo para transición instantánea al cambiar personal ↔ comercial.
   * Evita ventana de "vacío" o "stale" al hacer toggle.
   */
  conversacionesPorModo: { personal: Conversacion[] | null; comercial: Conversacion[] | null };
  totalConversaciones: number;
  cargandoConversaciones: boolean;

  // ─── Mensajes (de la conversación activa) ──────────────────────────────
  mensajes: Mensaje[];
  totalMensajes: number;
  cargandoMensajes: boolean;
  cargandoMensajesAntiguos: boolean;
  hayMasMensajes: boolean;

  // ─── Badge no leídos ──────────────────────────────────────────────────
  totalNoLeidos: number;
  noLeidosArchivados: number;
  archivadosVersion: number;
  conversacionesArchivadas: Conversacion[];

  // ─── Escribiendo ──────────────────────────────────────────────────────
  escribiendo: Record<string, EstadoEscribiendo>;

  // ─── Estados de usuarios (conectado/ausente/desconectado) ─────────────
  estadosUsuarios: Record<string, { estado: 'conectado' | 'ausente' | 'desconectado'; timestamp: number }>;

  // ─── Contactos (Sprint 5) ─────────────────────────────────────────────
  contactos: Contacto[];
  cargandoContactos: boolean;

  // ─── Bloqueados (Sprint 5) ────────────────────────────────────────────
  bloqueados: UsuarioBloqueado[];
  cargandoBloqueados: boolean;

  // ─── Mensajes fijados (Sprint 5) ──────────────────────────────────────
  mensajesFijados: MensajeFijado[];
  cargandoFijados: boolean;

  // ─── Búsqueda (Sprint 5) ──────────────────────────────────────────────
  resultadosBusqueda: Mensaje[];
  totalResultadosBusqueda: number;
  cargandoBusqueda: boolean;
  /** Borradores de texto por conversación — persisten al cambiar de chat */
  borradores: Record<string, string>;

  // ─── Caché de mensajes ─────────────────────────────────────────────
  /** Mensajes cacheados por conversación — persisten al cerrar ChatYA */
  cacheMensajes: Record<string, Mensaje[]>;
  cacheTotalMensajes: Record<string, number>;
  cacheHayMas: Record<string, boolean>;
  /** Mensajes fijados cacheados por conversación — evita fetch HTTP al cambiar de chat */
  cacheFijados: Record<string, MensajeFijado[]>;

  // ─── Chat Temporal (lazy creation) ───────────────────────────────────
  chatTemporal: ChatTemporal | null;

  // ─── Enviando ─────────────────────────────────────────────────────────
  enviandoMensaje: boolean;

  // ─── Error global ─────────────────────────────────────────────────────
  error: string | null;

  // ─── ACCIONES: Navegación ─────────────────────────────────────────────
  setVistaActiva: (vista: VistaChatYA) => void;
  abrirConversacion: (conversacionId: string) => void;
  abrirChatTemporal: (datos: ChatTemporal) => void;
  transicionarAConversacionReal: (conversacionId: string) => void;
  volverALista: () => void;
  setVisorAbierto: (abierto: boolean) => void;
  setPanelInfoAbierto: (abierto: boolean) => void;

  // ─── ACCIONES: Conversaciones ─────────────────────────────────────────
  cargarConversaciones: (modo?: ModoChatYA, offset?: number, silencioso?: boolean) => Promise<void>;
  crearConversacion: (datos: CrearConversacionInput) => Promise<Conversacion | null>;
  toggleFijar: (id: string) => Promise<void>;
  toggleArchivar: (id: string) => Promise<void>;
  toggleSilenciar: (id: string) => Promise<void>;
  eliminarConversacion: (id: string) => Promise<boolean>;
  marcarComoLeido: (id: string) => Promise<void>;

  // ─── ACCIONES: Mensajes ───────────────────────────────────────────────
  cargarMensajes: (conversacionId: string, offset?: number) => Promise<void>;
  cargarMensajesAntiguos: () => Promise<void>;
  enviarMensaje: (datos: EnviarMensajeInput, _idExistente?: string) => Promise<Mensaje | null>;
  /** Refresco silencioso para actualizar mensajes cacheados sin mostrar loading */
  refrescarMensajesSilencioso: (conversacionId: string) => Promise<void>;
  /** Pre-carga mensajes de las primeras N conversaciones en segundo plano */
  precargarMensajes: () => void;
  /**
   * Invalida la caché local de Mis Notas. Llamar al cambiar de sucursal
   * activa para que cuando el operador abra Mis Notas vea solo las notas
   * de su sucursal actual (filtrado real lo hace el backend).
   */
  invalidarMisNotas: () => void;
  editarMensaje: (mensajeId: string, datos: EditarMensajeInput) => Promise<boolean>;
  eliminarMensaje: (mensajeId: string) => Promise<boolean>;
  reenviarMensaje: (mensajeId: string, datos: ReenviarMensajeInput) => Promise<boolean>;

  // ─── ACCIONES: Badge ──────────────────────────────────────────────────
  cargarNoLeidos: (modo?: ModoChatYA) => Promise<void>;
  cargarNoLeidosArchivados: (modo?: ModoChatYA) => Promise<void>;
  cargarArchivados: (modo?: ModoChatYA) => Promise<void>;

  // ─── ACCIONES: Contactos (Sprint 5) ───────────────────────────────────
  cargarContactos: (tipo?: 'personal' | 'comercial') => Promise<void>;
  agregarContacto: (datos: AgregarContactoInput, display?: ContactoDisplay) => Promise<Contacto | null>;
  eliminarContacto: (id: string) => Promise<boolean>;
  editarAliasContacto: (id: string, alias: string | null) => Promise<boolean>;

  // ─── ACCIONES: Bloqueo (Sprint 5) ─────────────────────────────────────
  cargarBloqueados: () => Promise<void>;
  bloquearUsuario: (datos: BloquearUsuarioInput) => Promise<boolean>;
  desbloquearUsuario: (bloqueadoId: string) => Promise<boolean>;
  desbloquearSucursal: (sucursalId: string) => Promise<boolean>;

  // ─── ACCIONES: Reacciones (Sprint 5) ──────────────────────────────────
  toggleReaccion: (mensajeId: string, emoji: string) => Promise<void>;

  // ─── ACCIONES: Mensajes fijados (Sprint 5) ────────────────────────────
  cargarMensajesFijados: (conversacionId: string) => Promise<void>;
  fijarMensaje: (conversacionId: string, mensajeId: string) => Promise<boolean>;
  desfijarMensaje: (conversacionId: string, mensajeId: string) => Promise<boolean>;

  // ─── ACCIONES: Búsqueda (Sprint 5) ────────────────────────────────────
  buscarMensajes: (conversacionId: string, texto: string, offset?: number) => Promise<void>;
  limpiarBusqueda: () => void;
  cargarBorradores: () => void;
  guardarBorrador: (conversacionId: string, texto: string) => void;
  limpiarBorrador: (conversacionId: string) => void;

  // ─── ACCIONES: Escribiendo ────────────────────────────────────────────
  setEscribiendo: (estado: Record<string, EstadoEscribiendo>) => void;

  // ─── ACCIONES: Mis Notas ───────────────────────────────────────────────
  cargarMisNotas: () => Promise<void>;

  // ─── Carga inicial y reset ────────────────────────────────────────────
  inicializar: (modo?: ModoChatYA) => Promise<void>;
  /**
   * Cambia el modo mostrando instantáneamente las conversaciones cacheadas de
   * ese modo (si existen) y refresca en segundo plano. Elimina el parpadeo al
   * hacer toggle personal ↔ comercial.
   */
  swapearModoDesdeCache: (modo: ModoChatYA) => void;
  inicializarScanYA: () => Promise<void>;
  limpiar: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Clave de localStorage para borradores del usuario actual */
function getBorradoresKey(): string | null {
  try {
    const miId = obtenerMiIdChatYA();
    return miId ? `chatya_borradores_${miId}` : null;
  } catch { return null; }
}

// =============================================================================
// ESTADO INICIAL
// =============================================================================

const ESTADO_INICIAL = {
  vistaActiva: 'lista' as VistaChatYA,
  conversacionActivaId: null as string | null,
  misNotasId: null as string | null,
  visorAbierto: false,
  panelInfoAbierto: false,
  conversaciones: [] as Conversacion[],
  /**
   * Modo para el cual está cargada la lista actual (`conversaciones`).
   * Se actualiza atómicamente junto con `conversaciones` en `swapearModoDesdeCache`
   * y `cargarConversaciones`, por lo que siempre es coherente con los datos.
   * Clave de `conversacionesPorModo` al poblar el cache por modo.
   */
  conversacionesModo: null as ModoChatYA | null,
  conversacionesPorModo: { personal: null as Conversacion[] | null, comercial: null as Conversacion[] | null },
  totalConversaciones: 0,
  cargandoConversaciones: false,
  mensajes: [] as Mensaje[],
  totalMensajes: 0,
  cargandoMensajes: false,
  cargandoMensajesAntiguos: false,
  hayMasMensajes: false,
  totalNoLeidos: 0,
  noLeidosArchivados: 0,
  archivadosVersion: 0,
  conversacionesArchivadas: [] as Conversacion[],
  escribiendo: {} as Record<string, EstadoEscribiendo>,
  estadosUsuarios: {} as Record<string, { estado: 'conectado' | 'ausente' | 'desconectado'; timestamp: number }>,
  contactos: [] as Contacto[],
  cargandoContactos: false,
  bloqueados: [] as UsuarioBloqueado[],
  cargandoBloqueados: false,
  mensajesFijados: [] as MensajeFijado[],
  cargandoFijados: false,
  resultadosBusqueda: [] as Mensaje[],
  totalResultadosBusqueda: 0,
  cargandoBusqueda: false,
  borradores: {} as Record<string, string>,
  enviandoMensaje: false,
  chatTemporal: null as ChatTemporal | null,
  error: null as string | null,
  cacheMensajes: {} as Record<string, Mensaje[]>,
  cacheTotalMensajes: {} as Record<string, number>,
  cacheHayMas: {} as Record<string, boolean>,
  cacheFijados: {} as Record<string, MensajeFijado[]>,
};

// =============================================================================
// STORE
// =============================================================================

export const useChatYAStore = create<ChatYAState>((set, get) => ({
  ...ESTADO_INICIAL,

  // ===========================================================================
  // ACCIONES: Navegación interna
  // ===========================================================================

  setVistaActiva: (vista: VistaChatYA) => {
    set({ vistaActiva: vista });
  },

  /**
   * Abre una conversación: cambia a vista chat, carga mensajes,
   * marca como leído automáticamente.
   * CON CACHÉ: si hay mensajes cacheados, los muestra al instante
   * y refresca silenciosamente desde el servidor.
   */
  abrirConversacion: (conversacionId: string) => {
    // Si ya es la conversación activa, no recargar
    if (get().conversacionActivaId === conversacionId) return;

    // ── DIAGNÓSTICO ──
    diagInicio();
    diagMarca('1. abrirConversacion: inicio');

    // Leer TODO del estado actual en UNA sola lectura
    const {
      conversacionActivaId: prevId,
      mensajes: prevMensajes,
      mensajesFijados: prevFijados,
      totalMensajes: prevTotal,
      hayMasMensajes: prevHayMas,
      cacheMensajes,
      cacheTotalMensajes,
      cacheHayMas: cacheHayMasMap,
      cacheFijados,
    } = get();

    const cache = cacheMensajes[conversacionId];
    const cacheTotal = cacheTotalMensajes[conversacionId];
    const cacheHayMas = cacheHayMasMap[conversacionId];
    const tieneCache = !!(cache && cache.length > 0);
    const fijadosCache = cacheFijados[conversacionId] || [];
    const guardarPrevio = !!(prevId && prevMensajes.length > 0);

    // Limitar mensajes iniciales para render instantáneo (~30 = lo visible + margen)
    // El IntersectionObserver carga más al hacer scroll hacia arriba
    const LIMITE_INICIAL = 30;
    const mensajesIniciales = tieneCache ? cache.slice(0, LIMITE_INICIAL) : [];
    const cacheTieneMas = tieneCache && cache.length > LIMITE_INICIAL;

    diagMarca('2. estado leído');

    // ── UN solo set() atómico: guardar caché anterior + cargar nuevo chat ──
    set((state) => ({
      // Guardar caché del chat anterior (solo si había mensajes)
      ...(guardarPrevio ? {
        cacheMensajes: { ...state.cacheMensajes, [prevId]: prevMensajes },
        cacheTotalMensajes: { ...state.cacheTotalMensajes, [prevId]: prevTotal },
        cacheHayMas: { ...state.cacheHayMas, [prevId]: prevHayMas },
        cacheFijados: { ...state.cacheFijados, [prevId]: prevFijados },
      } : {}),
      // Cargar nuevo chat (mensajes + fijados desde caché = 0 fetches)
      vistaActiva: 'chat' as const,
      conversacionActivaId: conversacionId,
      chatTemporal: null,
      mensajes: mensajesIniciales,
      totalMensajes: tieneCache ? (cacheTotal || 0) : 0,
      hayMasMensajes: tieneCache ? (cacheTieneMas || cacheHayMas || false) : false,
      mensajesFijados: fijadosCache,
      escribiendo: {},
      cargandoMensajes: !tieneCache,
    }));

    diagMarca('3. set() atómico' + (tieneCache ? ' (caché)' : ' (loading)'));

    // Sin caché: cargar mensajes inmediatamente (el usuario necesita verlos)
    if (!tieneCache) {
      get().cargarMensajes(conversacionId);
    }

    diagMarca('4. abrirConversacion: fin');

    // ── Diferir operaciones secundarias hasta DESPUÉS del primer paint ──
    // Cada una de estas llama set() al completar, lo que causa re-renders.
    // Si las ejecutamos inmediatamente, se apilan 6-8 re-renders antes de que
    // Virtuoso pueda pintar una sola burbuja.
    // Con setTimeout(0), dejamos que React pinte primero y luego actualizamos.
    setTimeout(() => {
      if (tieneCache) {
        get().refrescarMensajesSilencioso(conversacionId);
      }
      // Solo fetch fijados si no hay caché — los socket events los mantienen sincronizados
      if (fijadosCache.length === 0) {
        get().cargarMensajesFijados(conversacionId);
      }
      if (!conversacionId.startsWith('temp_')) {
        get().marcarComoLeido(conversacionId);
      }
    }, 0);
  },

  /**
   * Transiciona de chat temporal a conversación real.
   * A diferencia de abrirConversacion, NO resetea mensajes — preserva
   * el mensaje optimista que ya está en pantalla.
   */
  transicionarAConversacionReal: (conversacionId: string) => {
    const idTemp = get().conversacionActivaId;
    set({
      conversacionActivaId: conversacionId,
      chatTemporal: null,
    });
    // Limpiar el borrador residual del id temp_*. El input ya consumió el
    // texto al enviar; sin esto el localStorage acumularía borradores
    // huérfanos de chats temporales que ya se materializaron.
    if (idTemp?.startsWith('temp_')) {
      get().limpiarBorrador(idTemp);
    }
  },

  /**
   * Abre un chat temporal sin crear conversación en el backend.
   * La conversación real se crea cuando el usuario envía el primer mensaje.
   */
  abrirChatTemporal: (datos: ChatTemporal) => {
    // Si vienen datos de contexto, sembrar el chat con el mensaje sistema
    // optimista para que el usuario vea la card (artículo de MarketPlace,
    // etc.) inmediatamente al abrir, sin tener que enviar primero.
    const mensajesIniciales = datos.mensajeContextoOptimista
      ? [datos.mensajeContextoOptimista]
      : [];
    set({
      vistaActiva: 'chat',
      conversacionActivaId: datos.id,
      chatTemporal: datos,
      mensajes: mensajesIniciales,
      totalMensajes: mensajesIniciales.length,
      hayMasMensajes: false,
      escribiendo: {},
      cargandoMensajes: false,
    });
    // Pre-cargar borrador en el id temp. El `InputMensaje` lee borradores
    // por `conversacionActivaId`, así que esto aparece automáticamente en
    // el input cuando se abre el chat temporal.
    if (datos.borradorInicial && datos.borradorInicial.trim().length > 0) {
      get().guardarBorrador(datos.id, datos.borradorInicial);
    }
  },

  /** Vuelve a la lista de conversaciones, guardando mensajes y fijados en caché */
  volverALista: () => {
    const { conversacionActivaId, mensajes, totalMensajes, hayMasMensajes, mensajesFijados } = get();

    // Guardar mensajes + fijados en caché antes de volver a la lista
    if (conversacionActivaId && mensajes.length > 0) {
      set((state) => ({
        vistaActiva: 'lista' as const,
        conversacionActivaId: null,
        chatTemporal: null,
        mensajes: [],
        totalMensajes: 0,
        hayMasMensajes: false,
        escribiendo: {},
        resultadosBusqueda: [],
        totalResultadosBusqueda: 0,
        mensajesFijados: [],
        cacheMensajes: { ...state.cacheMensajes, [conversacionActivaId]: mensajes },
        cacheTotalMensajes: { ...state.cacheTotalMensajes, [conversacionActivaId]: totalMensajes },
        cacheHayMas: { ...state.cacheHayMas, [conversacionActivaId]: hayMasMensajes },
        cacheFijados: { ...state.cacheFijados, [conversacionActivaId]: mensajesFijados },
      }));
    } else {
      set({
        vistaActiva: 'lista',
        conversacionActivaId: null,
        chatTemporal: null,
        mensajes: [],
        totalMensajes: 0,
        hayMasMensajes: false,
        escribiendo: {},
        resultadosBusqueda: [],
        totalResultadosBusqueda: 0,
        mensajesFijados: [],
      });
    }
  },

  setVisorAbierto: (abierto: boolean) => set({ visorAbierto: abierto }),
  setPanelInfoAbierto: (abierto: boolean) => {
    if (get().panelInfoAbierto !== abierto) set({ panelInfoAbierto: abierto });
  },

  // ===========================================================================
  // ACCIONES: Conversaciones
  // ===========================================================================

  cargarConversaciones: async (modo: ModoChatYA = 'personal', offset = 0, silencioso = false) => {
    // En modo comercial, no cargar si sucursalActiva aún no está lista
    const estaEnScanYA = typeof window !== 'undefined' && window.location.pathname.startsWith('/scanya');
    if (modo === 'comercial' && !useAuthStore.getState().usuario?.sucursalActiva && !estaEnScanYA) return;

    const { conversaciones } = get();
    const esCargaInicial = !silencioso && conversaciones.length === 0 && offset === 0;

    set({ cargandoConversaciones: esCargaInicial, error: null });

    try {
      const respuesta = await chatyaService.getConversaciones(modo, 20, offset);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Conversacion>;
        const nuevasConversaciones = offset === 0
          ? data.items
          : [...conversaciones, ...data.items];
        set((prev) => ({
          conversaciones: nuevasConversaciones,
          totalConversaciones: data.total,
          conversacionesModo: modo,
          // Poblar el cache del modo recién cargado para swaps instantáneos.
          conversacionesPorModo: {
            ...prev.conversacionesPorModo,
            [modo]: nuevasConversaciones,
          },
        }));
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      set({ error: 'Error al cargar conversaciones' });
    } finally {
      set({ cargandoConversaciones: false });
    }
  },

  crearConversacion: async (datos: CrearConversacionInput) => {
    try {
      const respuesta = await chatyaService.crearConversacion(datos);
      if (respuesta.success && respuesta.data) {
        const nueva = respuesta.data;

        // Agregar al inicio de la lista si no existe
        set((state) => {
          const yaExiste = state.conversaciones.some((c) => c.id === nueva.id);
          return {
            conversaciones: yaExiste
              ? state.conversaciones
              : [nueva, ...state.conversaciones],
          };
        });

        return nueva;
      }
      return null;
    } catch (error) {
      console.error('Error creando conversación:', error);
      notificar.error('No se pudo iniciar la conversación');
      return null;
    }
  },

  /** Toggle fijar (optimista) */
  toggleFijar: async (id: string) => {
    const { conversaciones, conversacionesArchivadas } = get();
    const convAnterior = conversaciones.find((c) => c.id === id);
    const enArchivados = conversacionesArchivadas.some((c) => c.id === id);

    // Optimista
    if (convAnterior) {
      set({
        conversaciones: conversaciones.map((c) =>
          c.id === id ? { ...c, fijada: !c.fijada } : c
        ),
      });
    } else if (enArchivados) {
      set({
        conversacionesArchivadas: conversacionesArchivadas.map((c) =>
          c.id === id ? { ...c, fijada: !c.fijada } : c
        ),
      });
    }

    try {
      const respuesta = await chatyaService.toggleFijarConversacion(id);
      if (!respuesta.success) {
        if (convAnterior) set({ conversaciones });
        if (enArchivados) set({ conversacionesArchivadas });
      }
    } catch {
      if (convAnterior) set({ conversaciones });
      if (enArchivados) set({ conversacionesArchivadas });
    }
  },

  /** Toggle archivar (optimista) */
  toggleArchivar: async (id: string) => {
    const { conversaciones, conversacionesArchivadas } = get();
    const enNormales = conversaciones.find((c) => c.id === id);
    const enArchivados = conversacionesArchivadas.find((c) => c.id === id);

    // Optimista: mover entre listas
    if (enNormales) {
      // Archivando: quitar de normales, agregar a archivados
      set({
        conversaciones: conversaciones.filter((c) => c.id !== id),
        conversacionesArchivadas: [{ ...enNormales, archivada: true }, ...conversacionesArchivadas],
      });
    } else if (enArchivados) {
      // Desarchivando: quitar de archivados, agregar a normales
      set({
        conversacionesArchivadas: conversacionesArchivadas.filter((c) => c.id !== id),
        conversaciones: [{ ...enArchivados, archivada: false }, ...conversaciones],
      });
    }

    try {
      const respuesta = await chatyaService.toggleArchivarConversacion(id);
      if (!respuesta.success) {
        // Rollback
        set({ conversaciones, conversacionesArchivadas });
      }
    } catch {
      set({ conversaciones, conversacionesArchivadas });
    }
  },

  /** Toggle silenciar (optimista) */
  toggleSilenciar: async (id: string) => {
    const { conversaciones, conversacionesArchivadas } = get();
    const enNormales = conversaciones.some((c) => c.id === id);
    const enArchivados = conversacionesArchivadas.some((c) => c.id === id);

    // Optimista
    if (enNormales) {
      set({
        conversaciones: conversaciones.map((c) =>
          c.id === id ? { ...c, silenciada: !c.silenciada } : c
        ),
      });
    } else if (enArchivados) {
      set({
        conversacionesArchivadas: conversacionesArchivadas.map((c) =>
          c.id === id ? { ...c, silenciada: !c.silenciada } : c
        ),
      });
    }

    try {
      const respuesta = await chatyaService.toggleSilenciarConversacion(id);
      if (!respuesta.success) {
        if (enNormales) set({ conversaciones });
        if (enArchivados) set({ conversacionesArchivadas });
      }
    } catch {
      if (enNormales) set({ conversaciones });
      if (enArchivados) set({ conversacionesArchivadas });
    }
  },

  eliminarConversacion: async (id: string) => {
    const { conversaciones, conversacionActivaId } = get();
    const conversacionesAnterior = [...conversaciones];

    // Optimista: quitar de la lista
    set({
      conversaciones: conversaciones.filter((c) => c.id !== id),
    });

    // Si era la activa, volver a la lista
    if (conversacionActivaId === id) {
      get().volverALista();
    }

    try {
      const respuesta = await chatyaService.eliminarConversacion(id);
      if (respuesta.success) {
        return true;
      } else {
        set({ conversaciones: conversacionesAnterior });
        notificar.error(respuesta.message || 'No se pudo eliminar el chat');
        return false;
      }
    } catch {
      set({ conversaciones: conversacionesAnterior });
      notificar.error('Error al eliminar el chat');
      return false;
    }
  },

  /** Marcar como leído (optimista): resetea contador inmediatamente */
  marcarComoLeido: async (id: string) => {
    const { conversaciones, conversacionesArchivadas, totalNoLeidos, noLeidosArchivados } = get();

    // Buscar en lista normal
    const conv = conversaciones.find((c) => c.id === id);
    if (conv && conv.noLeidos > 0) {
      set({
        conversaciones: conversaciones.map((c) =>
          c.id === id ? { ...c, noLeidos: 0 } : c
        ),
        totalNoLeidos: Math.max(0, totalNoLeidos - conv.noLeidos),
      });
    }

    // Buscar en archivados
    const convArch = conversacionesArchivadas.find((c) => c.id === id);
    if (convArch && convArch.noLeidos > 0) {
      set({
        conversacionesArchivadas: conversacionesArchivadas.map((c) =>
          c.id === id ? { ...c, noLeidos: 0 } : c
        ),
        noLeidosArchivados: Math.max(0, noLeidosArchivados - convArch.noLeidos),
        totalNoLeidos: Math.max(0, get().totalNoLeidos - convArch.noLeidos),
      });
    }

    // Si no había no leídos en ninguna lista, no llamar al backend
    if ((!conv || conv.noLeidos === 0) && (!convArch || convArch.noLeidos === 0)) return;

    try {
      await chatyaService.marcarComoLeido(id);
    } catch {
      // Rollback silencioso — la próxima carga sincronizará
    }
  },

  // ===========================================================================
  // ACCIONES: Mensajes
  // ===========================================================================

  cargarMensajes: async (conversacionId: string, offset = 0) => {
    set({ cargandoMensajes: offset === 0, cargandoMensajesAntiguos: offset > 0 });

    try {
      const respuesta = await chatyaService.getMensajes(conversacionId, 30, offset);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Mensaje>;
        const nuevosMensajes = offset === 0
          ? data.items
          : [...get().mensajes, ...data.items];
        const hayMas = offset + data.items.length < data.total;

        set({
          mensajes: nuevosMensajes,
          totalMensajes: data.total,
          hayMasMensajes: hayMas,
        });

        // Actualizar caché
        set((state) => ({
          cacheMensajes: { ...state.cacheMensajes, [conversacionId]: nuevosMensajes },
          cacheTotalMensajes: { ...state.cacheTotalMensajes, [conversacionId]: data.total },
          cacheHayMas: { ...state.cacheHayMas, [conversacionId]: hayMas },
        }));
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      set({ cargandoMensajes: false, cargandoMensajesAntiguos: false });
    }
  },

  /** Carga la siguiente página de mensajes antiguos (scroll infinito hacia arriba) */
  cargarMensajesAntiguos: async () => {
    const { conversacionActivaId, mensajes, cargandoMensajesAntiguos, hayMasMensajes } = get();
    if (!conversacionActivaId || cargandoMensajesAntiguos || !hayMasMensajes) return;

    await get().cargarMensajes(conversacionActivaId, mensajes.length);
  },

  /**
   * Refresco silencioso: trae mensajes recientes del servidor sin mostrar loading.
   * Se usa cuando abrimos una conversación cacheada — los mensajes cacheados se muestran
   * al instante y este refresco trae cualquier mensaje nuevo que haya llegado.
   */
  refrescarMensajesSilencioso: async (conversacionId: string) => {
    try {
      const respuesta = await chatyaService.getMensajes(conversacionId, 30, 0);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Mensaje>;
        const sigueActiva = get().conversacionActivaId === conversacionId;

        if (sigueActiva) {
          const actuales = get().mensajes;
          // Solo actualizar si llegaron mensajes NUEVOS (el más reciente cambió).
          // Los cambios de estado (palomitas, editado, eliminado) ya los manejan
          // los socket events en tiempo real — no necesitamos re-render aquí.
          const mensajeNuevoLlego =
            data.items.length > 0 &&
            (actuales.length === 0 || data.items[0]?.id !== actuales[0]?.id);

          if (mensajeNuevoLlego) {
            set({
              mensajes: data.items,
              totalMensajes: data.total,
              hayMasMensajes: data.items.length < data.total,
            });
          }
        }
        // Siempre actualizar caché (no causa re-render de VentanaChat)
        set((state) => ({
          cacheMensajes: { ...state.cacheMensajes, [conversacionId]: data.items },
          cacheTotalMensajes: { ...state.cacheTotalMensajes, [conversacionId]: data.total },
          cacheHayMas: { ...state.cacheHayMas, [conversacionId]: data.items.length < data.total },
        }));
      }
    } catch (error) {
      console.error('Error refrescando mensajes silencioso:', error);
    }
  },

  /**
   * Pre-carga mensajes de las primeras N conversaciones en segundo plano.
   * Se ejecuta después de cargar la lista de conversaciones.
   * Fire-and-forget: no bloquea la UI.
   */
  precargarMensajes: () => {
    const { conversaciones, cacheMensajes } = get();
    // Solo pre-cargar las primeras 5 que NO estén ya cacheadas
    const sinCache = conversaciones
      .filter((c) => !cacheMensajes[c.id])
      .slice(0, 5);

    for (const conv of sinCache) {
      chatyaService.getMensajes(conv.id, 30, 0)
        .then((resp) => {
          if (resp.success && resp.data) {
            const data = resp.data as ListaPaginada<Mensaje>;
            useChatYAStore.setState((state) => ({
              cacheMensajes: { ...state.cacheMensajes, [conv.id]: data.items },
              cacheTotalMensajes: { ...state.cacheTotalMensajes, [conv.id]: data.total },
              cacheHayMas: { ...state.cacheHayMas, [conv.id]: data.items.length < data.total },
            }));
          }
        })
        .catch(() => { /* silencioso */ });
    }
  },

  invalidarMisNotas: () => {
    const { misNotasId, conversacionActivaId } = get();
    if (!misNotasId) return;

    // Limpiar caché local de Mis Notas
    set((state) => {
      const nuevoCacheMensajes = { ...state.cacheMensajes };
      delete nuevoCacheMensajes[misNotasId];
      const nuevoCacheTotal = { ...state.cacheTotalMensajes };
      delete nuevoCacheTotal[misNotasId];
      const nuevoCacheHayMas = { ...state.cacheHayMas };
      delete nuevoCacheHayMas[misNotasId];
      return {
        cacheMensajes: nuevoCacheMensajes,
        cacheTotalMensajes: nuevoCacheTotal,
        cacheHayMas: nuevoCacheHayMas,
      };
    });

    // Si Mis Notas está abierta ahora, recargarla de inmediato con el filtro
    // de la nueva sucursal aplicado por el backend.
    if (conversacionActivaId === misNotasId) {
      get().cargarMensajes(misNotasId, 0);
    }
  },

  /**
   * Enviar mensaje (optimista).
   * 1. Crea mensaje temporal con ID local
   * 2. Lo inserta al inicio del array (más reciente primero)
   * 3. Envía al backend
   * 4. Reemplaza ID temporal con el real
   * 5. Si falla → marcar como fallido
   */
  enviarMensaje: async (datos: EnviarMensajeInput, _idExistente?: string) => {
    // Si el chat es temporal, materializarlo como conversación real ANTES de enviar.
    // Esto cubre todos los tipos de mensaje (texto, imagen, audio, documento, ubicación).
    //
    // Tras materializar, sincronizamos los mensajes desde el backend si la
    // conversación viene de un contexto de MarketPlace. El backend auto-inserta
    // un mensaje `tipo='sistema'` (card del artículo o aviso "te contactó desde
    // el perfil") al crear la conversación, pero el evento `chatya:mensaje-nuevo`
    // suele llegar mientras `conversacionActivaId` aún es `temp_*`, por lo que
    // el handler de socket lo descarta. El GET de mensajes garantiza que el
    // mensaje sistema aparezca en la ventana del chat para el iniciador.
    {
      const { conversacionActivaId: idActual, chatTemporal } = get();
      if (idActual?.startsWith('temp_') && chatTemporal) {
        const datosCreacion = chatTemporal.datosCreacion;
        const conv = await get().crearConversacion(datosCreacion);
        if (!conv) return null;
        get().transicionarAConversacionReal(conv.id);
        // Después de materializar, sincronizar mensajes desde backend en
        // todos los contextos donde el backend auto-inserta una card de
        // contexto (`tipo='sistema'`). Sin esto, el optimista sembrado en
        // `abrirChatTemporal` queda colgado con `conversacionId=temp_*` y
        // al refrescar desaparece — además los datos del backend (con id
        // real, snapshot validado) son la fuente de verdad.
        const esContextoConCardBackend =
          datosCreacion.contextoTipo === 'marketplace' ||
          datosCreacion.contextoTipo === 'vendedor_marketplace' ||
          datosCreacion.contextoTipo === 'oferta' ||
          datosCreacion.contextoTipo === 'articulo_negocio';
        if (esContextoConCardBackend) {
          await get().cargarMensajes(conv.id);
        }
      }
    }

    const { conversacionActivaId, mensajes, conversaciones } = get();
    if (!conversacionActivaId) return null;

    const idTemporal = _idExistente || `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const miId = obtenerMiIdChatYA() || null;

    if (_idExistente) {
      // ── Mensaje optimista ya existe (ej: documento subiendo) ──
      // Solo actualizar su contenido con la URL final de R2
      set((state) => ({
        mensajes: state.mensajes.map((m) =>
          m.id === _idExistente ? { ...m, contenido: datos.contenido } : m
        ),
      }));
    } else {
      // ── Comportamiento original: crear mensaje optimista ──
      const mensajeOptimista: Mensaje = {
        id: idTemporal,
        conversacionId: conversacionActivaId,
        emisorId: miId,
        emisorModo: null,
        emisorSucursalId: null,
        empleadoId: datos.empleadoId || null,
        tipo: datos.tipo || 'texto',
        contenido: datos.contenido,
        estado: 'enviado',
        editado: false,
        editadoAt: null,
        eliminado: false,
        eliminadoAt: null,
        respuestaAId: datos.respuestaAId || null,
        reenviadoDeId: null,
        createdAt: new Date().toISOString(),
        entregadoAt: null,
        leidoAt: null,
      };

      // Insertar al inicio (más reciente primero)
      set({
        mensajes: [mensajeOptimista, ...mensajes],
        enviandoMensaje: true,
      });

      // Actualizar preview de la conversación en la lista
      set({
        conversaciones: conversaciones.map((c) =>
          c.id === conversacionActivaId
            ? {
              ...c,
              ultimoMensajeTexto: datos.tipo === 'texto'
                ? datos.contenido.substring(0, 100)
                : datos.tipo === 'imagen' ? '📷 Imagen'
                  : datos.tipo === 'audio' ? '🎤 Audio'
                    : datos.tipo === 'documento' ? '📎 Documento'
                      : datos.contenido.substring(0, 100),
              ultimoMensajeFecha: new Date().toISOString(),
              ultimoMensajeTipo: datos.tipo || 'texto',
              ultimoMensajeEstado: 'enviado' as const,
              ultimoMensajeEmisorId: miId,
            }
            : c
        ),
      });
    }

    try {
      const respuesta = await chatyaService.enviarMensaje(conversacionActivaId, datos);
      if (respuesta.success && respuesta.data) {
        const real = respuesta.data;
        set((state) => {
          // Si el evento socket `chatya:mensaje-nuevo` ya insertó el mensaje real
          // (carrera común en chats inter-sucursal y multi-dispositivo), eliminar
          // el optimistic en vez de reemplazarlo — evita duplicados visuales.
          const yaEstaReal = state.mensajes.some((m) => m.id === real.id);
          if (yaEstaReal) {
            return { mensajes: state.mensajes.filter((m) => m.id !== idTemporal) };
          }
          return {
            mensajes: state.mensajes.map((m) => (m.id === idTemporal ? real : m)),
          };
        });
        return respuesta.data;
      } else {
        // Marcar como fallido (se queda visible con ⚠) en vez de eliminar
        set((state) => ({
          mensajes: state.mensajes.map((m) =>
            m.id === idTemporal ? { ...m, estado: 'fallido' as const } : m
          ),
        }));
        return null;
      }
    } catch {
      // Si hay error de red, marcar como fallido
      set((state) => ({
        mensajes: state.mensajes.map((m) =>
          m.id === idTemporal ? { ...m, estado: 'fallido' as const } : m
        ),
      }));

      return null;
    } finally {
      set({ enviandoMensaje: false });
    }
  },

  editarMensaje: async (mensajeId: string, datos: EditarMensajeInput) => {
    const { mensajes } = get();
    const mensajesAnterior = [...mensajes];

    // Optimista
    set({
      mensajes: mensajes.map((m) =>
        m.id === mensajeId
          ? { ...m, contenido: datos.contenido, editado: true }
          : m
      ),
    });

    try {
      const respuesta = await chatyaService.editarMensaje(mensajeId, datos);
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          mensajes: state.mensajes.map((m) =>
            m.id === mensajeId ? respuesta.data! : m
          ),
        }));
        return true;
      } else {
        set({ mensajes: mensajesAnterior });
        return false;
      }
    } catch {
      set({ mensajes: mensajesAnterior });
      return false;
    }
  },

  eliminarMensaje: async (mensajeId: string) => {
    const { mensajes, mensajesFijados, conversacionActivaId } = get();
    const mensajesAnterior = [...mensajes];
    const fijadosAnterior = [...mensajesFijados];
    const nuevosFijados = mensajesFijados.filter((f) => f.mensajeId !== mensajeId);

    // Optimista: marcar como eliminado + quitar de fijados (incluido caché)
    set((state) => ({
      mensajes: mensajes.map((m) =>
        m.id === mensajeId
          ? { ...m, eliminado: true, contenido: 'Se eliminó este mensaje' }
          : m
      ),
      mensajesFijados: nuevosFijados,
      ...(conversacionActivaId ? {
        cacheFijados: { ...state.cacheFijados, [conversacionActivaId]: nuevosFijados },
      } : {}),
    }));

    try {
      const respuesta = await chatyaService.eliminarMensaje(mensajeId);
      if (respuesta.success) {
        // Refrescar preview desde el backend (fuente de verdad)
        if (conversacionActivaId) {
          try {
            const convResp = await chatyaService.getConversacion(conversacionActivaId);
            if (convResp.success && convResp.data) {
              const conv = convResp.data as Conversacion;
              set((state) => ({
                conversaciones: state.conversaciones.map((c) =>
                  c.id === conversacionActivaId
                    ? {
                        ...c,
                        ultimoMensajeTexto: conv.ultimoMensajeTexto,
                        ultimoMensajeTipo: conv.ultimoMensajeTipo,
                        ultimoMensajeFecha: conv.ultimoMensajeFecha,
                        ultimoMensajeEstado: conv.ultimoMensajeEstado,
                        ultimoMensajeEmisorId: conv.ultimoMensajeEmisorId,
                      }
                    : c
                ),
                conversacionesArchivadas: state.conversacionesArchivadas.map((c) =>
                  c.id === conversacionActivaId
                    ? {
                        ...c,
                        ultimoMensajeTexto: conv.ultimoMensajeTexto,
                        ultimoMensajeTipo: conv.ultimoMensajeTipo,
                        ultimoMensajeFecha: conv.ultimoMensajeFecha,
                        ultimoMensajeEstado: conv.ultimoMensajeEstado,
                        ultimoMensajeEmisorId: conv.ultimoMensajeEmisorId,
                      }
                    : c
                ),
              }));
            }
          } catch { /* el socket lo cubrirá */ }
        }
        return true;
      } else {
        set((state) => ({
          mensajes: mensajesAnterior,
          mensajesFijados: fijadosAnterior,
          ...(conversacionActivaId ? {
            cacheFijados: { ...state.cacheFijados, [conversacionActivaId]: fijadosAnterior },
          } : {}),
        }));
        return false;
      }
    } catch {
      set((state) => ({
        mensajes: mensajesAnterior,
        mensajesFijados: fijadosAnterior,
        ...(conversacionActivaId ? {
          cacheFijados: { ...state.cacheFijados, [conversacionActivaId]: fijadosAnterior },
        } : {}),
      }));
      return false;
    }
  },

  reenviarMensaje: async (mensajeId: string, datos: ReenviarMensajeInput) => {
    try {
      const respuesta = await chatyaService.reenviarMensaje(mensajeId, datos);
      if (respuesta.success && respuesta.data) {
        notificar.exito('Mensaje reenviado');

        // Obtener la conversación destino para actualizar/agregar en la lista
        const convId = (respuesta.data as { conversacionId?: string }).conversacionId;
        if (convId) {
          try {
            const convResp = await chatyaService.getConversacion(convId);
            if (convResp.success && convResp.data) {
              const convActualizada = convResp.data as Conversacion;
              set((state) => {
                const sinDuplicado = state.conversaciones.filter((c) => c.id !== convId);
                return { conversaciones: [convActualizada, ...sinDuplicado] };
              });
            }
          } catch {
            // Si falla obtener la conversación, al menos el reenvío ya se hizo
          }
        }

        return true;
      }
      notificar.error(respuesta.message || 'No se pudo reenviar');
      return false;
    } catch {
      notificar.error('Error al reenviar el mensaje');
      return false;
    }
  },

  // ===========================================================================
  // ACCIONES: Badge no leídos
  // ===========================================================================

  cargarNoLeidos: async (modo: ModoChatYA = 'personal') => {
    const estaEnScanYA = typeof window !== 'undefined' && window.location.pathname.startsWith('/scanya');
    if (modo === 'comercial' && !useAuthStore.getState().usuario?.sucursalActiva && !estaEnScanYA) return;
    try {
      const respuesta = await chatyaService.getNoLeidos(modo);
      if (respuesta.success && respuesta.data) {
        set({ totalNoLeidos: respuesta.data.total });
      }
    } catch (error) {
      console.error('Error cargando no leídos:', error);
    }
  },

  // ===========================================================================
  // ACCIONES: Contactos (Sprint 5)
  // ===========================================================================

  cargarContactos: async (tipo: 'personal' | 'comercial' = 'personal') => {
    const { contactos } = get();
    const esCargaInicial = contactos.length === 0;

    set({ cargandoContactos: esCargaInicial });

    try {
      const respuesta = await chatyaService.getContactos(tipo);
      if (respuesta.success && respuesta.data) {
        set({ contactos: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
    } finally {
      set({ cargandoContactos: false });
    }
  },

  agregarContacto: async (datos: AgregarContactoInput, display?: ContactoDisplay) => {
    const tempId = `temp_${Date.now()}`;
    const contactoOptimista: Contacto = {
      id: tempId,
      contactoId: datos.contactoId,
      tipo: datos.tipo || 'personal',
      negocioId: datos.negocioId || null,
      sucursalId: datos.sucursalId || null,
      alias: datos.alias || null,
      createdAt: new Date().toISOString(),
      nombre: display?.nombre || '',
      apellidos: display?.apellidos || '',
      avatarUrl: display?.avatarUrl || null,
      negocioNombre: display?.negocioNombre,
      negocioLogo: display?.negocioLogo,
      sucursalNombre: display?.sucursalNombre,
    };

    // Optimista: agregar inmediatamente
    set((state) => ({ contactos: [...state.contactos, contactoOptimista] }));

    try {
      const respuesta = await chatyaService.agregarContacto(datos);
      if (respuesta.success && respuesta.data) {
        // Reemplazar temp id con el real
        set((state) => ({
          contactos: state.contactos.map((c) =>
            c.id === tempId ? { ...c, id: (respuesta.data as { id: string }).id } : c
          ),
        }));
        return { ...contactoOptimista, id: (respuesta.data as { id: string }).id };
      }
      // Rollback
      set((state) => ({ contactos: state.contactos.filter((c) => c.id !== tempId) }));
      notificar.error(respuesta.message || 'No se pudo agregar el contacto');
      return null;
    } catch {
      set((state) => ({ contactos: state.contactos.filter((c) => c.id !== tempId) }));
      notificar.error('Error al agregar contacto');
      return null;
    }
  },

  eliminarContacto: async (id: string) => {
    const { contactos } = get();
    const contactosAnterior = [...contactos];

    // Optimista
    set({ contactos: contactos.filter((c) => c.id !== id) });

    try {
      const respuesta = await chatyaService.eliminarContacto(id);
      if (respuesta.success) {
        return true;
      }
      set({ contactos: contactosAnterior });
      notificar.error('No se pudo eliminar el contacto');
      return false;
    } catch {
      set({ contactos: contactosAnterior });
      notificar.error('Error al eliminar contacto');
      return false;
    }
  },

  editarAliasContacto: async (id: string, alias: string | null) => {
    const { contactos } = get();
    const contactosAnterior = [...contactos];

    // Optimista: actualizar alias en la lista
    set({
      contactos: contactos.map((c) =>
        c.id === id ? { ...c, alias: alias?.trim() || null } : c
      ),
    });

    try {
      const respuesta = await chatyaService.editarAliasContacto(id, alias);
      if (respuesta.success) {
        notificar.exito('Alias actualizado');
        return true;
      }
      set({ contactos: contactosAnterior });
      notificar.error('No se pudo actualizar el alias');
      return false;
    } catch {
      set({ contactos: contactosAnterior });
      notificar.error('Error al actualizar el alias');
      return false;
    }
  },

  // ===========================================================================
  // ACCIONES: Bloqueo (Sprint 5)
  // ===========================================================================

  cargarBloqueados: async () => {
    const { bloqueados } = get();
    const esCargaInicial = bloqueados.length === 0;

    set({ cargandoBloqueados: esCargaInicial });

    try {
      const respuesta = await chatyaService.getBloqueados();
      if (respuesta.success && respuesta.data) {
        set({ bloqueados: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando bloqueados:', error);
    } finally {
      set({ cargandoBloqueados: false });
    }
  },

  bloquearUsuario: async (datos: BloquearUsuarioInput) => {
    const { bloqueados } = get();

    // Optimista: agregar inmediatamente con datos mínimos. Discriminado
    // por `tipo` — persona vs sucursal son entradas distintas.
    const entradaOptimista: UsuarioBloqueado =
      datos.tipo === 'sucursal'
        ? {
            id: `opt_${Date.now()}`,
            tipo: 'sucursal',
            sucursalId: datos.sucursalId,
            motivo: datos.motivo || null,
            createdAt: new Date().toISOString(),
            sucursalNombre: '',
            negocioNombre: '',
            negocioLogoUrl: null,
          }
        : {
            id: `opt_${Date.now()}`,
            tipo: 'usuario',
            bloqueadoId: datos.bloqueadoId,
            motivo: datos.motivo || null,
            createdAt: new Date().toISOString(),
            nombre: '',
            apellidos: '',
            avatarUrl: null,
          };
    set({ bloqueados: [...bloqueados, entradaOptimista] });

    try {
      const respuesta = await chatyaService.bloquearUsuario(datos);
      if (respuesta.success && respuesta.data) {
        // Solo actualizar el id temporal con el id real del servidor
        set((state) => ({
          bloqueados: state.bloqueados.map((b) =>
            b.id === entradaOptimista.id ? { ...b, id: respuesta.data!.id } : b
          ),
        }));
        return true;
      }
      set({ bloqueados }); // revertir
      notificar.error(respuesta.message || 'No se pudo bloquear');
      return false;
    } catch {
      set({ bloqueados }); // revertir
      notificar.error('Error al bloquear');
      return false;
    }
  },

  desbloquearUsuario: async (bloqueadoId: string) => {
    const { bloqueados } = get();
    const bloqueadosAnterior = [...bloqueados];

    // Optimista — solo entradas de tipo 'usuario' con ese bloqueadoId
    set({
      bloqueados: bloqueados.filter(
        (b) => !(b.tipo === 'usuario' && b.bloqueadoId === bloqueadoId)
      ),
    });

    try {
      const respuesta = await chatyaService.desbloquearUsuario(bloqueadoId);
      if (respuesta.success) {
        return true;
      }
      set({ bloqueados: bloqueadosAnterior });
      return false;
    } catch {
      set({ bloqueados: bloqueadosAnterior });
      return false;
    }
  },

  desbloquearSucursal: async (sucursalId: string) => {
    const { bloqueados } = get();
    const bloqueadosAnterior = [...bloqueados];

    // Optimista — solo entradas de tipo 'sucursal' con ese sucursalId
    set({
      bloqueados: bloqueados.filter(
        (b) => !(b.tipo === 'sucursal' && b.sucursalId === sucursalId)
      ),
    });

    try {
      const respuesta = await chatyaService.desbloquearSucursal(sucursalId);
      if (respuesta.success) {
        return true;
      }
      set({ bloqueados: bloqueadosAnterior });
      return false;
    } catch {
      set({ bloqueados: bloqueadosAnterior });
      return false;
    }
  },

  // ===========================================================================
  // ACCIONES: Reacciones (Sprint 5)
  // ===========================================================================

  toggleReaccion: async (mensajeId: string, emoji: string) => {
    try {
      const respuesta = await chatyaService.toggleReaccion(mensajeId, emoji);
      if (!respuesta.success) {
        notificar.error('No se pudo reaccionar');
      }
      // La actualización de UI viene por Socket.io (chatya:reaccion)
    } catch {
      notificar.error('Error al reaccionar');
    }
  },

  // ===========================================================================
  // ACCIONES: Mensajes fijados (Sprint 5)
  // ===========================================================================

  cargarMensajesFijados: async (conversacionId: string) => {
    // Solo mostrar loading si NO hay fijados en pantalla (primera carga)
    const tieneFijadosVisibles = get().mensajesFijados.length > 0;
    if (!tieneFijadosVisibles) {
      set({ cargandoFijados: true });
    }

    try {
      const respuesta = await chatyaService.getMensajesFijados(conversacionId);
      if (respuesta.success && respuesta.data) {
        // Verificar que seguimos en la misma conversación (el usuario pudo cambiar)
        if (get().conversacionActivaId !== conversacionId) return;

        const nuevos = respuesta.data;
        const actuales = get().mensajesFijados;

        // Comparar por mensajeId (estable) e independiente del orden
        const idsActuales = new Set(actuales.map((f) => f.mensajeId));
        const idsNuevos = new Set(nuevos.map((f) => f.mensajeId));
        const mismos = idsActuales.size === idsNuevos.size &&
          [...idsNuevos].every((id) => idsActuales.has(id));

        if (!mismos) {
          set({ mensajesFijados: nuevos });
        }

        // Actualizar caché siempre (es barato, no causa re-render)
        set((state) => ({
          cacheFijados: { ...state.cacheFijados, [conversacionId]: nuevos },
        }));
      }
    } catch (error) {
      console.error('Error cargando mensajes fijados:', error);
    } finally {
      if (!tieneFijadosVisibles) {
        set({ cargandoFijados: false });
      }
    }
  },

  fijarMensaje: async (conversacionId: string, mensajeId: string) => {
    const { mensajes, mensajesFijados } = get();
    const msg = mensajes.find((m) => m.id === mensajeId);

    // Optimista: crear entrada temporal
    const fijadoTemporal: MensajeFijado = {
      id: `temp-${Date.now()}`,
      mensajeId,
      fijadoPor: obtenerMiIdChatYA(),
      createdAt: new Date().toISOString(),
      mensaje: {
        id: mensajeId,
        contenido: msg?.contenido || '',
        tipo: msg?.tipo || 'texto',
        emisorId: msg?.emisorId || null,
        createdAt: msg?.createdAt || new Date().toISOString(),
      },
    };
    const fijadosAnterior = [...mensajesFijados];
    set({ mensajesFijados: [fijadoTemporal, ...mensajesFijados] });

    try {
      const respuesta = await chatyaService.fijarMensaje(conversacionId, mensajeId);
      if (respuesta.success && respuesta.data) {
        // Reemplazar temporal con dato real, preservando campos críticos si el servidor no los devuelve
        set((state) => {
          const fijadosActualizados = state.mensajesFijados.map((f) =>
            f.id === fijadoTemporal.id
              ? {
                  ...fijadoTemporal,
                  ...respuesta.data!,
                  mensajeId: respuesta.data!.mensajeId || fijadoTemporal.mensajeId,
                  mensaje: respuesta.data!.mensaje || fijadoTemporal.mensaje,
                }
              : f
          );
          return {
            mensajesFijados: fijadosActualizados,
            cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosActualizados },
          };
        });
        return true;
      }
      set((state) => ({
        mensajesFijados: fijadosAnterior,
        cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosAnterior },
      }));
      return false;
    } catch {
      set((state) => ({
        mensajesFijados: fijadosAnterior,
        cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosAnterior },
      }));
      return false;
    }
  },

  desfijarMensaje: async (conversacionId: string, mensajeId: string) => {
    if (!mensajeId || !conversacionId) return false;
    const { mensajesFijados } = get();
    const fijadosAnterior = [...mensajesFijados];
    const fijadosFiltrados = mensajesFijados.filter((f) => f.mensajeId !== mensajeId);

    // Optimista: actualizar estado + caché
    set((state) => ({
      mensajesFijados: fijadosFiltrados,
      cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosFiltrados },
    }));

    try {
      const respuesta = await chatyaService.desfijarMensaje(conversacionId, mensajeId);
      if (respuesta.success) {
        return true;
      }
      // Rollback
      set((state) => ({
        mensajesFijados: fijadosAnterior,
        cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosAnterior },
      }));
      return false;
    } catch {
      set((state) => ({
        mensajesFijados: fijadosAnterior,
        cacheFijados: { ...state.cacheFijados, [conversacionId]: fijadosAnterior },
      }));
      return false;
    }
  },

  // ===========================================================================
  // ACCIONES: Búsqueda (Sprint 5)
  // ===========================================================================

  buscarMensajes: async (conversacionId: string, texto: string, offset = 0) => {
    set({ cargandoBusqueda: true });

    try {
      const respuesta = await chatyaService.buscarMensajes(conversacionId, texto, 20, offset);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Mensaje>;
        set((state) => ({
          resultadosBusqueda: offset === 0
            ? data.items
            : [...state.resultadosBusqueda, ...data.items],
          totalResultadosBusqueda: data.total,
        }));
      }
    } catch (error) {
      console.error('Error buscando mensajes:', error);
    } finally {
      set({ cargandoBusqueda: false });
    }
  },

  limpiarBusqueda: () => {
    set({ resultadosBusqueda: [], totalResultadosBusqueda: 0 });
  },

  // ===========================================================================
  // ACCIONES: Borradores
  // ===========================================================================

  cargarBorradores: () => {
    const key = getBorradoresKey();
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) set({ borradores: JSON.parse(saved) });
    } catch { /* sin acceso a localStorage */ }
  },

  guardarBorrador: (conversacionId: string, texto: string) => {
    set((state) => {
      const nuevos = { ...state.borradores, [conversacionId]: texto };
      const key = getBorradoresKey();
      if (key) try { localStorage.setItem(key, JSON.stringify(nuevos)); } catch { /* sin acceso a localStorage */ }
      return { borradores: nuevos };
    });
  },

  limpiarBorrador: (conversacionId: string) => {
    set((state) => {
      const nuevos = { ...state.borradores };
      delete nuevos[conversacionId];
      const key = getBorradoresKey();
      if (key) try { localStorage.setItem(key, JSON.stringify(nuevos)); } catch { /* sin acceso a localStorage */ }
      return { borradores: nuevos };
    });
  },

  // ===========================================================================
  // ACCIONES: Escribiendo
  // ===========================================================================

  setEscribiendo: (estado: Record<string, EstadoEscribiendo>) => {
    set({ escribiendo: estado });
  },

  // ===========================================================================
  // ACCIONES: Inicializar y limpiar
  // ===========================================================================

  /** Cuenta no leídos de conversaciones archivadas */
  cargarNoLeidosArchivados: async (modo: ModoChatYA = 'personal') => {
    try {
      const respuesta = await chatyaService.getConversaciones(modo, 50, 0, true);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Conversacion>;
        const total = data.items.reduce((sum, c) => sum + c.noLeidos, 0);
        set({ noLeidosArchivados: total, conversacionesArchivadas: data.items });
      }
    } catch {
      // Silenciar error — no es crítico
    }
  },

  /** Carga conversaciones archivadas */
  cargarArchivados: async (modo: ModoChatYA = 'personal') => {
    try {
      const respuesta = await chatyaService.getConversaciones(modo, 50, 0, true);
      if (respuesta.success && respuesta.data) {
        const data = respuesta.data as ListaPaginada<Conversacion>;
        const total = data.items.reduce((sum, c) => sum + c.noLeidos, 0);
        set({ conversacionesArchivadas: data.items, noLeidosArchivados: total });
      }
    } catch {
      set({ conversacionesArchivadas: [] });
    }
  },

  /** Obtiene o crea "Mis Notas" y guarda su ID */
  cargarMisNotas: async () => {
    try {
      const respuesta = await chatyaService.getMisNotas();
      if (respuesta.success && respuesta.data) {
        set({ misNotasId: respuesta.data.id });
      }
    } catch (error) {
      console.error('Error cargando Mis Notas:', error);
    }
  },

  /** Carga inicial: mis notas primero (para filtrar), luego conversaciones + badge */
  swapearModoDesdeCache: (modo: ModoChatYA) => {
    const cached = get().conversacionesPorModo[modo];
    if (cached) {
      // Swap atómico: conversaciones + modo se actualizan en una sola pasada.
      // La vista NO pasa por "vacío" — salta del modo anterior al nuevo con datos.
      set({
        conversaciones: cached,
        conversacionesModo: modo,
        conversacionActivaId: null, // cerrar conv abierta (es del modo anterior)
        mensajes: [],
        mensajesFijados: [],
      });
    } else {
      // Sin cache para el nuevo modo → mostrar lista vacía + flag de carga.
      // El refetch post-cambiarModo rellenará y conversacionesModo se sincronizará.
      set({
        conversaciones: [],
        conversacionesModo: modo,
        conversacionActivaId: null,
        mensajes: [],
        mensajesFijados: [],
        cargandoConversaciones: true,
      });
    }
  },

  inicializar: async (modo: ModoChatYA = 'personal') => {
    await get().cargarMisNotas();
    await Promise.all([
      get().cargarConversaciones(modo),
      get().cargarNoLeidos(modo),
      get().cargarNoLeidosArchivados(modo),
    ]);
    // Pre-cargar mensajes de las primeras conversaciones en segundo plano
    get().precargarMensajes();
  },

  /**
   * Inicialización desde ScanYA (modo comercial forzado).
   * Bypasea el guard de useAuthStore — el backend filtra por sucursal
   * usando el token ScanYA directamente.
   */
  inicializarScanYA: async () => {
    // Solo carga el badge — las conversaciones las carga ChatOverlay al abrir.
    try {
      const res = await chatyaService.getNoLeidos('comercial');
      if (res.success && res.data) {
        set({ totalNoLeidos: res.data.total });
      }
    } catch (error) {
      console.error('[ChatYA ScanYA] Error cargando badge:', error);
    }
  },

  limpiar: () => {
    set({ ...ESTADO_INICIAL });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectConversaciones = (state: ChatYAState) => state.conversaciones;
export const selectMensajes = (state: ChatYAState) => state.mensajes;
export const selectConversacionActivaId = (state: ChatYAState) => state.conversacionActivaId;
export const selectVistaActiva = (state: ChatYAState) => state.vistaActiva;
export const selectTotalNoLeidos = (state: ChatYAState) => state.totalNoLeidos;
export const selectEscribiendo = (state: ChatYAState) => state.escribiendo;
export const selectEstadosUsuarios = (state: ChatYAState) => state.estadosUsuarios;
export const selectCargandoConversaciones = (state: ChatYAState) => state.cargandoConversaciones;
export const selectCargandoMensajes = (state: ChatYAState) => state.cargandoMensajes;

/** Obtiene la conversación activa completa desde la lista */
export const selectConversacionActiva = (state: ChatYAState) =>
  state.conversaciones.find((c) => c.id === state.conversacionActivaId) ?? null;

// =============================================================================
// SONIDO DE NOTIFICACIÓN
// =============================================================================
const TONO_DEFAULT = 'tono_mensaje_1';
let audioNotificacion: HTMLAudioElement | null = null;

function reproducirSonidoNotificacion(): void {
  try {
    const tono = localStorage.getItem('ay_tono_chat') || TONO_DEFAULT;
    const sonidoActivo = localStorage.getItem('ay_sonido_chat') !== 'false'; // activo por defecto
    if (!sonidoActivo) return;

    // Reutilizar o crear el elemento Audio
    if (!audioNotificacion) {
      audioNotificacion = new Audio();
      audioNotificacion.volume = 0.5;
    }
    audioNotificacion.src = `/${tono}.mp3`;
    audioNotificacion.play().catch(() => { /* browser puede bloquear autoplay */ });
    // Vibración corta en móvil (200ms)
    if (navigator.vibrate) navigator.vibrate(300);
  } catch {
    /* silencioso si falla */
  }
}

// =============================================================================
// LISTENERS SOCKET.IO — Tiempo real
// =============================================================================

/**
 * Timers pendientes de badge por conversación.
 * Cuando llega chatya:mensaje-nuevo, se agenda un timer de 3s para consultar
 * noLeidos al backend. Si chatya:leido (yoLeí) llega antes, cancela el timer
 * → el badge nunca aparece (otro dispositivo ya leyó el mensaje).
 */
const badgeTimersPendientes = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Ids de mensajes ya procesados por el listener `chatya:mensaje-nuevo`.
 * El backend emite el mismo mensaje a 2 rooms (otroId + emisorId) y en
 * inter-sucursal ambos van al mismo `usuario:${id}` → el cliente recibe el
 * evento dos veces. Este set es un safety net cuando el mensaje no está en
 * `state.mensajes` ni en `cacheMensajes` (conv no cargada). Sliding window.
 */
const idsMensajesVistos = new Set<string>();

/** chatya:mensaje-nuevo — Mensaje nuevo de otro participante */
escucharEvento<EventoMensajeNuevo>('chatya:mensaje-nuevo', ({ conversacionId, mensaje }) => {
  const state = useChatYAStore.getState();

  const miId = obtenerMiIdChatYA();
  const miSucursalId = obtenerSucursalChatYA();

  // Dedup por ID real. El backend emite el mismo evento a otroId y a emisorId
  // (en inter-sucursal van al mismo room `usuario:${id}` → 2 eventos al mismo
  // cliente). Cualquier evento duplicado se descarta aquí — revisamos tanto en
  // la conversación activa como en el caché de inactivas, y contra un registro
  // global de IDs recientemente vistos (para convs que no cargamos en caché).
  if (state.mensajes.some((m) => m.id === mensaje.id)) return;
  if (state.cacheMensajes[conversacionId]?.some((m) => m.id === mensaje.id)) return;
  if (idsMensajesVistos.has(mensaje.id)) return;
  idsMensajesVistos.add(mensaje.id);
  // Mantener el set acotado (sliding window) para no crecer indefinidamente.
  if (idsMensajesVistos.size > 500) {
    const primero = idsMensajesVistos.values().next().value;
    if (primero) idsMensajesVistos.delete(primero);
  }

  // Para mensajes propios (mismo usuarioId + misma sucursal activa): dedup contra
  // el mensaje optimista insertado al enviar. Para "otro yo" en otra sucursal
  // (inter-sucursal), dejar pasar para procesar como recibido.
  if (mensaje.emisorId === miId) {
    const esEcoPropio = !mensaje.emisorSucursalId || mensaje.emisorSucursalId === miSucursalId;
    if (esEcoPropio) {
      const yaExisteTemp = state.mensajes.some((m) =>
        m.id.startsWith('temp_') && m.conversacionId === conversacionId && m.contenido === mensaje.contenido
      );
      if (yaExisteTemp) return;
    }
  }

  // Verificar si la conversación pertenece a la sucursal activa (modo comercial)
  // Si la lista ya está filtrada por sucursal, solo las conversaciones ahí son relevantes
  const existeEnLista = state.conversaciones.some((c) => c.id === conversacionId);
  const existeEnArchivados = state.conversacionesArchivadas.some((c) => c.id === conversacionId);
  const esConversacionConocida = existeEnLista || existeEnArchivados;

  // En modo comercial: si la conversación no está en la lista filtrada, es de otra sucursal
  const modoActivo = obtenerModoChatYA();
  const esModoComercial = modoActivo === 'comercial';

  // Si estamos viendo esta conversación Y la pestaña es visible, agregar y marcar leído
  const pestanaVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
  // En chat inter-sucursal, un mensaje de "otro yo" (mismo usuarioId, distinta sucursal)
  // NO es propio desde la perspectiva de esta sesión — debe sonar, marcar no-leído, etc.
  const esMensajePropio =
    mensaje.emisorId === miId &&
    (!mensaje.emisorSucursalId || mensaje.emisorSucursalId === miSucursalId);

  // ── Sonido de notificación ──
  // Solo si NO es propio Y la conversación está en mi lista filtrada.
  // En inter-sucursal, un mismo usuarioId comparte socket room entre sesiones,
  // así que el dueño podría recibir el mensaje-nuevo del gerente a un tercero
  // y dispararía sonido por algo que no le corresponde.
  //
  // Los mensajes `tipo='sistema'` (cards de contexto: marketplace, oferta,
  // articulo_negocio, contacto_perfil) tienen `emisorId=null` y se emiten a
  // AMBOS participantes al crear conversación. Sin esta exclusión, el
  // iniciador escuchaba el sonido de notificación al enviar su primer
  // mensaje (el sistema es triggered por la materialización), confundiendo
  // "envié algo" con "recibí algo". Tampoco generan badge en backend, así
  // que silenciar el sonido es consistente.
  const esMensajeSistema = mensaje.tipo === 'sistema';
  if (!esMensajePropio && !esMensajeSistema && esConversacionConocida) {
    const esActiva = state.conversacionActivaId === conversacionId && pestanaVisible;
    const convSilenciada = [...state.conversaciones, ...state.conversacionesArchivadas]
      .find((c) => c.id === conversacionId)?.silenciada;
    if (!esActiva && !convSilenciada) {
      reproducirSonidoNotificacion();
    }
  }

  // Helper: agregar mensaje con dedup final (evita cualquier camino de duplicación,
  // incluyendo race conditions entre el optimistic insert y los 2 emits del backend).
  const agregarMensajeConDedup = (prev: { mensajes: typeof state.mensajes }) => {
    const yaEstaReal = prev.mensajes.some((m) => m.id === mensaje.id);
    if (yaEstaReal) return { mensajes: prev.mensajes };
    const yaEstaTemp = prev.mensajes.some(
      (m) => m.id.startsWith('temp_') && m.conversacionId === conversacionId && m.contenido === mensaje.contenido
    );
    if (yaEstaTemp) {
      // Reemplazar optimistic con real (similar al happy path de enviarMensaje)
      return {
        mensajes: prev.mensajes.map((m) =>
          m.id.startsWith('temp_') && m.conversacionId === conversacionId && m.contenido === mensaje.contenido
            ? mensaje
            : m
        ),
      };
    }
    return { mensajes: [mensaje, ...prev.mensajes] };
  };

  if (state.conversacionActivaId === conversacionId && pestanaVisible) {
    useChatYAStore.setState(agregarMensajeConDedup);
    if (!esMensajePropio && !conversacionId.startsWith('temp_')) chatyaService.marcarComoLeido(conversacionId).catch(() => { });
  } else if (state.conversacionActivaId === conversacionId && !pestanaVisible) {
    // Conversación abierta pero pestaña no visible
    useChatYAStore.setState(agregarMensajeConDedup);
    if (!esMensajePropio) {
      // Agendar consulta de badge con timer cancelable.
      // Si otro dispositivo (ScanYA) marca como leído → chatya:leido cancela este timer.
      const timerAnterior = badgeTimersPendientes.get(conversacionId);
      if (timerAnterior) clearTimeout(timerAnterior);
      badgeTimersPendientes.set(conversacionId, setTimeout(() => {
        badgeTimersPendientes.delete(conversacionId);
        const modo = obtenerModoChatYA();
        useChatYAStore.getState().cargarNoLeidos(modo);
      }, 3000));
    }
  } else if (esConversacionConocida && !esMensajePropio) {
    // Agendar consulta de badge con timer cancelable.
    // Si otro dispositivo (ScanYA) marca como leído → chatya:leido cancela este timer.
    const timerAnterior = badgeTimersPendientes.get(conversacionId);
    if (timerAnterior) clearTimeout(timerAnterior);
    badgeTimersPendientes.set(conversacionId, setTimeout(() => {
      badgeTimersPendientes.delete(conversacionId);
      const modo = obtenerModoChatYA();
      useChatYAStore.getState().cargarNoLeidos(modo);
    }, 3000));
  }
  // Si NO es conocida y es modo comercial → es de otra sucursal, no incrementar badge

  // ✅ Actualizar caché si la conversación NO está activa pero sí cacheada
  if (state.conversacionActivaId !== conversacionId) {
    const cached = state.cacheMensajes[conversacionId];
    if (cached) {
      useChatYAStore.setState((prev) => ({
        cacheMensajes: {
          ...prev.cacheMensajes,
          [conversacionId]: [mensaje, ...cached],
        },
      }));
    }
  }

  // Actualizar preview o agregar conversación nueva
  if (esConversacionConocida) {
    // Conversación existente: actualizar preview e incrementar noLeidos si corresponde.
    // El `debeIncrementar` cubre: mensaje recibido + conv no activa (o pestaña no visible).
    const activaYVisible = state.conversacionActivaId === conversacionId && pestanaVisible;
    const debeIncrementar = !esMensajePropio && !activaYVisible;
    useChatYAStore.setState((prev) => ({
      totalNoLeidos: debeIncrementar ? prev.totalNoLeidos + 1 : prev.totalNoLeidos,
      conversaciones: prev.conversaciones.map((c) =>
        c.id === conversacionId
          ? {
            ...c,
            ultimoMensajeTexto: mensaje.tipo === 'texto'
              ? mensaje.contenido.substring(0, 100)
              : mensaje.tipo === 'sistema'
                ? mensaje.contenido.substring(0, 100)
                : `[${mensaje.tipo}]`,
            ultimoMensajeFecha: mensaje.createdAt,
            ultimoMensajeTipo: mensaje.tipo,
            ultimoMensajeEstado: mensaje.estado,
            ultimoMensajeEmisorId: mensaje.emisorId,
            noLeidos: activaYVisible
              ? 0
              : debeIncrementar
                ? c.noLeidos + 1
                : c.noLeidos,
          }
          : c
      ),
      conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
        c.id === conversacionId
          ? {
            ...c,
            ultimoMensajeTexto: mensaje.tipo === 'texto'
              ? mensaje.contenido.substring(0, 100)
              : mensaje.tipo === 'sistema'
                ? mensaje.contenido.substring(0, 100)
                : `[${mensaje.tipo}]`,
            ultimoMensajeFecha: mensaje.createdAt,
            ultimoMensajeTipo: mensaje.tipo,
            ultimoMensajeEstado: mensaje.estado,
            ultimoMensajeEmisorId: mensaje.emisorId,
            noLeidos: activaYVisible
              ? 0
              : debeIncrementar
                ? c.noLeidos + 1
                : c.noLeidos,
          }
          : c
      ),
      noLeidosArchivados: debeIncrementar && prev.conversacionesArchivadas.some((c) => c.id === conversacionId)
        ? prev.noLeidosArchivados + 1
        : prev.noLeidosArchivados,
    }));
  } else if (!esModoComercial) {
    // Conversación NUEVA en modo personal: obtener del backend y agregar
    chatyaService.getConversacion(conversacionId).then((resp) => {
      if (resp.success && resp.data) {
        const nuevaConv = resp.data as Conversacion;
        useChatYAStore.setState((prev) => {
          if (prev.conversaciones.some((c) => c.id === conversacionId)) return prev;
          return {
            conversaciones: [{ ...nuevaConv, noLeidos: esMensajePropio ? 0 : 1 }, ...prev.conversaciones],
            totalNoLeidos: esMensajePropio ? prev.totalNoLeidos : prev.totalNoLeidos + 1,
          };
        });
      }
    }).catch(() => { });
  } else {
    // Conversación NUEVA en modo comercial: verificar si pertenece a la sucursal activa
    chatyaService.getConversacion(conversacionId).then((resp) => {
      if (resp.success && resp.data) {
        const nuevaConv = resp.data as Conversacion;
        const sucursalActiva = obtenerSucursalChatYA();

        // Verificar si esta conversación es de la sucursal activa
        const esMiSucursal =
          nuevaConv.participante1SucursalId === sucursalActiva ||
          nuevaConv.participante2SucursalId === sucursalActiva;

        if (esMiSucursal) {
          useChatYAStore.setState((prev) => {
            if (prev.conversaciones.some((c) => c.id === conversacionId)) return prev;
            return {
              conversaciones: [{ ...nuevaConv, noLeidos: esMensajePropio ? 0 : 1 }, ...prev.conversaciones],
              totalNoLeidos: esMensajePropio ? prev.totalNoLeidos : prev.totalNoLeidos + 1,
            };
          });
        }
        // Si no es de mi sucursal: no agregar ni incrementar badge
      }
    }).catch(() => { });
  }

  // ── Confirmar entrega al emisor (palomitas dobles grises) ──
  // Solo si soy participante real de esta conversación. En inter-sucursal el
  // mismo usuarioId puede estar en varias sucursales compartiendo socket room,
  // así que verificamos que la conversación exista en MI lista filtrada
  // (ya refleja "es de mi sucursal activa"). Evita falsos "entregados".
  if (!esMensajePropio && esConversacionConocida) {
    emitirEvento('chatya:entregado', {
      conversacionId,
      emisorId: mensaje.emisorId,
      mensajeIds: [mensaje.id],
    });
  }
});

/** chatya:mensaje-editado — Mensaje editado en tiempo real */
escucharEvento<EventoMensajeEditado>('chatya:mensaje-editado', ({ conversacionId, mensaje, nuevoPreview }) => {
  const state = useChatYAStore.getState();

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) =>
        m.id === mensaje.id ? mensaje : m
      ),
    }));
  }

  // ✅ Actualizar caché si no es la conversación activa
  if (state.conversacionActivaId !== conversacionId) {
    const cached = state.cacheMensajes[conversacionId];
    if (cached) {
      useChatYAStore.setState((prev) => ({
        cacheMensajes: {
          ...prev.cacheMensajes,
          [conversacionId]: cached.map((m) => m.id === mensaje.id ? mensaje : m),
        },
      }));
    }
  }

  // Si el mensaje editado era el último, actualizar preview en la lista.
  if (nuevoPreview) {
    useChatYAStore.setState((prev) => ({
      conversaciones: prev.conversaciones.map((c) =>
        c.id === conversacionId ? { ...c, ultimoMensajeTexto: nuevoPreview.ultimoMensajeTexto } : c
      ),
      conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
        c.id === conversacionId ? { ...c, ultimoMensajeTexto: nuevoPreview.ultimoMensajeTexto } : c
      ),
    }));
  }
});

/** chatya:mensaje-eliminado — Mensaje eliminado en tiempo real */
escucharEvento<EventoMensajeEliminado>('chatya:mensaje-eliminado', ({ conversacionId, mensajeId, eraUltimoMensaje, nuevoPreview }) => {
  const state = useChatYAStore.getState();

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) =>
        m.id === mensajeId
          ? { ...m, eliminado: true, contenido: 'Se eliminó este mensaje' }
          : m
      ),
    }));
  }

  // ✅ Actualizar caché si no es la conversación activa
  if (state.conversacionActivaId !== conversacionId) {
    const cached = state.cacheMensajes[conversacionId];
    if (cached) {
      useChatYAStore.setState((prev) => ({
        cacheMensajes: {
          ...prev.cacheMensajes,
          [conversacionId]: cached.map((m) =>
            m.id === mensajeId
              ? { ...m, eliminado: true, contenido: 'Se eliminó este mensaje' }
              : m
          ),
        },
      }));
    }
  }

  // Si era el último mensaje, actualizar el preview con los datos del backend
  if (eraUltimoMensaje && nuevoPreview) {
    const preview = {
      ultimoMensajeTexto: nuevoPreview.ultimoMensajeTexto,
      ultimoMensajeTipo: nuevoPreview.ultimoMensajeTipo as TipoMensaje | null,
      ultimoMensajeFecha: nuevoPreview.ultimoMensajeFecha,
      ultimoMensajeEstado: (nuevoPreview.ultimoMensajeEstado as EstadoMensaje) ?? null,
      ultimoMensajeEmisorId: nuevoPreview.ultimoMensajeEmisorId,
    };
    useChatYAStore.setState((prev) => ({
      conversaciones: prev.conversaciones.map((c) =>
        c.id === conversacionId
          ? { ...c, ...preview }
          : c
      ),
      conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
        c.id === conversacionId
          ? { ...c, ...preview }
          : c
      ),
    }));
  }
});

/** chatya:leido — Palomitas azules (el otro leyó los mensajes) */
escucharEvento<EventoLeido>('chatya:leido', ({ conversacionId, leidoPor, leidoPorSucursalId, leidoAt }) => {

  const state = useChatYAStore.getState();

  // Identificar si fui YO quien leyó (en otro dispositivo/tab como ScanYA).
  // En chats inter-sucursal, el `usuarioId` es el mismo en ambos lados (dueño),
  // así que desempatamos con `sucursalId`.
  const miId = obtenerMiIdChatYA();
  const miSucursalId = obtenerSucursalChatYA();
  const yoLeí =
    leidoPor === miId &&
    (!leidoPorSucursalId || leidoPorSucursalId === miSucursalId);

  // Un mensaje fue leído por el OTRO lado si su emisor no coincide con la tupla
  // (leidoPor, leidoPorSucursalId). Así cubrimos el caso inter-sucursal donde
  // `emisorId === leidoPor` pero las sucursales difieren.
  const mensajeEsLeido = (m: { emisorId: string | null; emisorSucursalId: string | null }) => {
    if (m.emisorId !== leidoPor) return true;
    if (leidoPorSucursalId && m.emisorSucursalId !== leidoPorSucursalId) return true;
    return false;
  };

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) =>
        mensajeEsLeido(m) && m.estado !== 'leido'
          ? { ...m, estado: 'leido' as const, leidoAt }
          : m
      ),
    }));
  }

  // ✅ Actualizar caché si no es la conversación activa
  if (state.conversacionActivaId !== conversacionId) {
    const cached = state.cacheMensajes[conversacionId];
    if (cached) {
      useChatYAStore.setState((prev) => ({
        cacheMensajes: {
          ...prev.cacheMensajes,
          [conversacionId]: cached.map((m) =>
            mensajeEsLeido(m) && m.estado !== 'leido'
              ? { ...m, estado: 'leido' as const, leidoAt }
              : m
          ),
        },
      }));
    }
  }

  // ✅ SINCRONIZACIÓN MULTI-DISPOSITIVO: si YO leí en otro tab/dispositivo (ScanYA),
  // limpiar el badge en este dispositivo también — los mensajes ya fueron vistos.
  if (yoLeí) {
    // Cancelar timer pendiente de badge — otro dispositivo ya leyó, no mostrar badge
    const timerPendiente = badgeTimersPendientes.get(conversacionId);
    if (timerPendiente) {
      clearTimeout(timerPendiente);
      badgeTimersPendientes.delete(conversacionId);
    }

    useChatYAStore.setState((prev) => {
      const conv = prev.conversaciones.find((c) => c.id === conversacionId);
      const convArch = prev.conversacionesArchivadas.find((c) => c.id === conversacionId);
      const noLeidosConv = conv?.noLeidos ?? 0;
      const noLeidosArch = convArch?.noLeidos ?? 0;

      return {
        conversaciones: prev.conversaciones.map((c) =>
          c.id === conversacionId ? { ...c, noLeidos: 0 } : c
        ),
        conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
          c.id === conversacionId ? { ...c, noLeidos: 0 } : c
        ),
        totalNoLeidos: Math.max(0, prev.totalNoLeidos - noLeidosConv - noLeidosArch),
        noLeidosArchivados: Math.max(0, prev.noLeidosArchivados - noLeidosArch),
      };
    });
  }

  // Actualizar el preview del último mensaje SOLO si realmente hubo un mensaje
  // que no era del lector (es decir: el lector leyó mensajes del otro lado).
  // Si el lector abre un chat donde él mismo envió el último mensaje, el backend
  // igual emite este evento pero no debemos pintar 'leido' — nadie lo ha visto.
  //
  // Usamos la tupla (leidoPor, leidoPorSucursalId) para decidir: si el último
  // mensaje (según el state local) pertenece al lector, no actualizar.
  const convLocal =
    useChatYAStore.getState().conversaciones.find((c) => c.id === conversacionId) ??
    useChatYAStore.getState().conversacionesArchivadas.find((c) => c.id === conversacionId);
  if (convLocal) {
    const ultimoEmisorId = convLocal.ultimoMensajeEmisorId;
    // Si no sabemos el emisor del último mensaje, no arriesgar.
    if (ultimoEmisorId && ultimoEmisorId !== leidoPor) {
      // Último mensaje fue de otro usuario (no del lector) → marcar leido.
      useChatYAStore.setState((prev) => ({
        conversaciones: prev.conversaciones.map((c) =>
          c.id === conversacionId ? { ...c, ultimoMensajeEstado: 'leido' as const } : c
        ),
        conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
          c.id === conversacionId ? { ...c, ultimoMensajeEstado: 'leido' as const } : c
        ),
      }));
    } else if (ultimoEmisorId === leidoPor && leidoPorSucursalId) {
      // Mismo usuarioId: inter-sucursal posible. Desempatar con el emisor del
      // último mensaje en el state si la conv está activa.
      const state2 = useChatYAStore.getState();
      if (state2.conversacionActivaId === conversacionId) {
        const ultimoMsgLocal = state2.mensajes[0];
        if (ultimoMsgLocal && ultimoMsgLocal.emisorSucursalId && ultimoMsgLocal.emisorSucursalId !== leidoPorSucursalId) {
          useChatYAStore.setState((prev) => ({
            conversaciones: prev.conversaciones.map((c) =>
              c.id === conversacionId ? { ...c, ultimoMensajeEstado: 'leido' as const } : c
            ),
            conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
              c.id === conversacionId ? { ...c, ultimoMensajeEstado: 'leido' as const } : c
            ),
          }));
        }
      }
    }
  }
});

/** chatya:escribiendo — Indicador "escribiendo..." (soporta múltiples conversaciones) */
escucharEvento<EventoEscribiendo>('chatya:escribiendo', ({ conversacionId, emisorSucursalId }) => {
  // En chat inter-sucursal el evento propio rebota a mi sesión (mismo usuarioId, mismo room).
  // Si el emisor es mi propia sucursal activa, es eco — ignorar.
  if (emisorSucursalId && emisorSucursalId === obtenerSucursalChatYA()) return;
  const timestamp = Date.now();
  useChatYAStore.setState((prev) => ({
    escribiendo: { ...prev.escribiendo, [conversacionId]: { conversacionId, timestamp } },
  }));

  // Auto-limpiar después de 5 segundos si no llega dejar-escribir
  setTimeout(() => {
    const current = useChatYAStore.getState().escribiendo[conversacionId];
    if (current && Date.now() - current.timestamp >= 4500) {
      useChatYAStore.setState((prev) => {
        const nuevo = { ...prev.escribiendo };
        delete nuevo[conversacionId];
        return { escribiendo: nuevo };
      });
    }
  }, 5000);
});

/** chatya:dejar-escribir — Dejar de mostrar "escribiendo..." */
escucharEvento<EventoEscribiendo>('chatya:dejar-escribir', ({ conversacionId, emisorSucursalId }) => {
  if (emisorSucursalId && emisorSucursalId === obtenerSucursalChatYA()) return;
  useChatYAStore.setState((prev) => {
    if (!prev.escribiendo[conversacionId]) return prev;
    const nuevo = { ...prev.escribiendo };
    delete nuevo[conversacionId];
    return { escribiendo: nuevo };
  });
});

/** chatya:entregado — Palomitas dobles grises (mensaje entregado al receptor) */
escucharEvento<EventoEntregado>('chatya:entregado', ({ conversacionId, mensajeIds }) => {
  const state = useChatYAStore.getState();

  // Guard inter-sucursal: el dueño y el gerente comparten socket room cuando el
  // gerente opera como el negocio. Si el evento es para una conv que no está
  // en MI lista filtrada por sucursal, no me corresponde — ignorar.
  const esConocida =
    state.conversaciones.some((c) => c.id === conversacionId) ||
    state.conversacionesArchivadas.some((c) => c.id === conversacionId);
  if (!esConocida) return;

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) =>
        mensajeIds.includes(m.id) && m.estado === 'enviado'
          ? { ...m, estado: 'entregado' as const, entregadoAt: new Date().toISOString() }
          : m
      ),
    }));
  }

  // Actualizar estado del último mensaje en la lista
  useChatYAStore.setState((prev) => ({
    conversaciones: prev.conversaciones.map((c) =>
      c.id === conversacionId && c.ultimoMensajeEstado === 'enviado'
        ? { ...c, ultimoMensajeEstado: 'entregado' as const }
        : c
    ),
    conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
      c.id === conversacionId && c.ultimoMensajeEstado === 'enviado'
        ? { ...c, ultimoMensajeEstado: 'entregado' as const }
        : c
    ),
  }));
});

/** chatya:estado-usuario — Estado de conexión de otro usuario */
escucharEvento<EventoEstadoUsuario & { ultimaConexion?: string | null }>('chatya:estado-usuario', ({ usuarioId, estado, ultimaConexion }) => {
  const timestamp = estado === 'desconectado' && ultimaConexion
    ? new Date(ultimaConexion).getTime()
    : Date.now();

  useChatYAStore.setState((prev) => ({
    estadosUsuarios: {
      ...prev.estadosUsuarios,
      [usuarioId]: { estado, timestamp },
    },
  }));
});

/** chatya:reaccion — Reacción agregada/removida en tiempo real */
escucharEvento<EventoReaccion>('chatya:reaccion', ({ conversacionId, mensajeId, emoji, usuarioId, usuarioSucursalId, accion }) => {
  // Nota: NO dedupamos aquí por clave semántica (msgId|userId|sucursal|emoji|accion)
  // porque esa clave se repite legítimamente (agregar → quitar → agregar otra vez
  // es el mismo `agregada` con la misma clave). La correctness contra eventos
  // duplicados está garantizada por `normalizarReacciones` (idempotente por tupla).

  const state = useChatYAStore.getState();

  // Helpers para reactor-as-tuple (id, sucursalId). Cada sucursal es una entidad
  // independiente de reacción, así que el "mismo" usuarioId puede aparecer varias
  // veces, una por sucursal. Soportamos el shape legacy string[] con fallback.
  const obtenerReactorId = (u: string | { id: string; sucursalId?: string | null }) =>
    typeof u === 'string' ? u : u.id;
  const obtenerReactorSucursal = (u: string | { id: string; sucursalId?: string | null }): string | null =>
    typeof u === 'string' ? null : (u.sucursalId ?? null);
  const coincideReactor = (
    u: string | { id: string; sucursalId?: string | null },
    id: string,
    sucId: string | null | undefined,
  ) => obtenerReactorId(u) === id && obtenerReactorSucursal(u) === (sucId ?? null);

  /**
   * Normaliza una lista de reactores: cada tupla (id, sucursalId) aparece UNA
   * sola vez y `cantidad` iguala el número real de tuplas únicas. Es la garantía
   * final contra cualquier camino que añada duplicados (optimistic + socket,
   * listeners duplicados por HMR, race conditions, etc.).
   */
  const normalizarReacciones = <T extends { emoji: string; cantidad: number; usuarios: (string | { id: string; sucursalId?: string | null })[] }>(
    reacciones: T[],
  ): T[] => reacciones
    .map((r) => {
      const seen = new Set<string>();
      const unicos = r.usuarios.filter((u) => {
        const key = `${obtenerReactorId(u)}|${obtenerReactorSucursal(u) ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...r, usuarios: unicos as typeof r.usuarios, cantidad: unicos.length };
    })
    .filter((r) => r.cantidad > 0);

  // Actualizar reacciones del mensaje si la conversación está abierta.
  // IMPORTANTE: todas las actualizaciones son INMUTABLES (crean nuevos objetos).
  // Mutaciones directas (`r.cantidad += 1`, `r.usuarios.push(...)`) causaron bugs
  // de doble conteo cuando el listener se disparaba más de una vez, porque el
  // mismo r objeto era reutilizado entre renders.
  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) => {
        if (m.id !== mensajeId) return m;

        const reacciones = m.reacciones ?? [];
        type ReactorTupla = string | { id: string; sucursalId?: string | null };

        if (accion === 'agregada') {
          const existente = reacciones.find((r) => r.emoji === emoji);
          const nuevoReactor = { id: usuarioId, sucursalId: usuarioSucursalId ?? null };
          const nuevasReacciones = existente
            ? reacciones.map((r) =>
                r === existente
                  ? { ...r, cantidad: r.cantidad + 1, usuarios: [...r.usuarios, nuevoReactor] as typeof r.usuarios }
                  : r,
              )
            : [...reacciones, { emoji, cantidad: 1, usuarios: [nuevoReactor] }];
          // Normalización final: elimina duplicados por tupla — cualquier ruta
          // que añadió al mismo reactor dos veces (optimistic + listener race,
          // listeners duplicados, etc.) queda corregida aquí.
          return { ...m, reacciones: normalizarReacciones(nuevasReacciones) };
        }

        // accion === 'eliminada'
        const existente = reacciones.find((r) => r.emoji === emoji);
        if (!existente) return m;
        const usuariosArr = existente.usuarios as ReactorTupla[];
        const usuariosSinReactor = usuariosArr.filter((u) => !coincideReactor(u, usuarioId, usuarioSucursalId));
        const nuevasReacciones = reacciones.map((r) =>
          r === existente
            ? { ...r, cantidad: usuariosSinReactor.length, usuarios: usuariosSinReactor as typeof r.usuarios }
            : r,
        );
        return { ...m, reacciones: normalizarReacciones(nuevasReacciones) };
      }),
    }));
  }

  // Actualizar preview en la lista de conversaciones
  if (accion === 'agregada') {
    const miId = obtenerMiIdChatYA();
    // Buscar contenido del mensaje reaccionado (si los mensajes están cargados)
    const msgReaccionado = state.mensajes.find((m) => m.id === mensajeId);
    const previewMsg = msgReaccionado?.contenido
      ? `"${msgReaccionado.contenido.slice(0, 30)}${msgReaccionado.contenido.length > 30 ? '...' : ''}"`
      : '';

    // Desempate por sucursal para inter-sucursal (mismo usuarioId, distinta sucursal).
    const miSucursalIdReac = obtenerSucursalChatYA();
    const esMiReaccion = usuarioId === miId &&
      (!usuarioSucursalId || usuarioSucursalId === miSucursalIdReac);
    const textoPreview = esMiReaccion
      ? `Reaccionaste con ${emoji} a ${previewMsg}`.trim()
      : `Reaccionó con ${emoji} a ${previewMsg}`.trim();

    useChatYAStore.setState((prev) => ({
      conversaciones: prev.conversaciones.map((c) => {
        if (c.id !== conversacionId) return c;
        return {
          ...c,
          _previewAnteReaccion: c._previewAnteReaccion ?? {
            texto: c.ultimoMensajeTexto,
            fecha: c.ultimoMensajeFecha,
            emisorId: c.ultimoMensajeEmisorId,
          },
          ultimoMensajeTexto: textoPreview,
          ultimoMensajeFecha: new Date().toISOString(),
          ultimoMensajeEmisorId: usuarioId,
        };
      }),
    }));
  } else {
    // Reacción eliminada: restaurar preview solo si no quedan reacciones en el mensaje
    const msgs = state.conversacionActivaId === conversacionId
      ? state.mensajes
      : state.cacheMensajes[conversacionId];

    // Las reacciones del mensaje ya fueron actualizadas (líneas anteriores).
    const msgActualizado = msgs?.find((m) => m.id === mensajeId);
    const reaccionRestante = msgActualizado?.reacciones?.find((r) => r.cantidad > 0);

    // Si aún quedan reacciones, actualizar preview con la reacción restante
    if (reaccionRestante) {
      const miId = obtenerMiIdChatYA();
      const miSucForRest = obtenerSucursalChatYA();
      const usuariosArr = reaccionRestante.usuarios as (string | { id: string; sucursalId?: string | null })[];
      // "Es mía" si existe un reactor con mi tupla (id + sucursalId).
      const esMia = usuariosArr.some((u) => coincideReactor(u, miId, miSucForRest));
      const previewMsg = msgActualizado?.contenido
        ? `"${msgActualizado.contenido.slice(0, 30)}${msgActualizado.contenido.length > 30 ? '...' : ''}"`
        : '';
      const textoReaccion = esMia
        ? `Reaccionaste con ${reaccionRestante.emoji} a ${previewMsg}`.trim()
        : `Reaccionó con ${reaccionRestante.emoji} a ${previewMsg}`.trim();

      useChatYAStore.setState((prev) => ({
        conversaciones: prev.conversaciones.map((c) =>
          c.id !== conversacionId ? c : { ...c, ultimoMensajeTexto: textoReaccion },
        ),
      }));
      return;
    }

    useChatYAStore.setState((prev) => ({
      conversaciones: prev.conversaciones.map((c) => {
        if (c.id !== conversacionId) return c;

        // Fuente 1: preview guardado antes de la reacción
        if (c._previewAnteReaccion != null) {
          return {
            ...c,
            ultimoMensajeTexto: c._previewAnteReaccion.texto,
            ultimoMensajeFecha: c._previewAnteReaccion.fecha,
            ultimoMensajeEmisorId: c._previewAnteReaccion.emisorId,
            _previewAnteReaccion: undefined,
          };
        }

        // Fuente 2: último mensaje no eliminado cargado/en caché
        const ultimo = msgs?.find((m) => !m.eliminado);
        if (ultimo) {
          return {
            ...c,
            ultimoMensajeTexto: ultimo.tipo === 'texto' || ultimo.tipo === 'sistema'
              ? ultimo.contenido.substring(0, 100)
              : `[${ultimo.tipo}]`,
            ultimoMensajeFecha: ultimo.createdAt,
            ultimoMensajeEmisorId: ultimo.emisorId,
          };
        }

        return c;
      }),
    }));
  }
});

/** chatya:mensaje-fijado — Mensaje fijado en tiempo real */
escucharEvento<EventoMensajeFijado>('chatya:mensaje-fijado', ({ conversacionId, mensajeId, fijadoPor: _fijadoPor, fijadoPorSucursalId }) => {
  // Fijado es per-lado. En inter-sucursal el room `usuario:${id}` es compartido
  // entre sesiones del mismo usuarioId; si el evento viene de otra sucursal, no
  // me corresponde.
  if (fijadoPorSucursalId !== undefined && fijadoPorSucursalId !== obtenerSucursalChatYA()) return;

  const state = useChatYAStore.getState();

  // Recargar solo si estamos en esa conversación Y el mensaje no está ya en la lista (optimista)
  if (state.conversacionActivaId === conversacionId) {
    const yaExiste = state.mensajesFijados.some((f) => f.mensajeId === mensajeId);
    if (!yaExiste) {
      state.cargarMensajesFijados(conversacionId);
    }
  }
});

/** chatya:mensaje-desfijado — Mensaje desfijado en tiempo real */
escucharEvento<EventoMensajeDesfijado>('chatya:mensaje-desfijado', ({ conversacionId, mensajeId, fijadoPorSucursalId }) => {
  if (fijadoPorSucursalId !== undefined && fijadoPorSucursalId !== obtenerSucursalChatYA()) return;

  const state = useChatYAStore.getState();

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => {
      const fijadosActualizados = prev.mensajesFijados.filter((f) => f.mensajeId !== mensajeId);
      return {
        mensajesFijados: fijadosActualizados,
        cacheFijados: { ...prev.cacheFijados, [conversacionId]: fijadosActualizados },
      };
    });
  }
});

// =============================================================================
// LISTENER: Visibilidad de pestaña
// =============================================================================
// Cuando el usuario regresa a la pestaña (des-minimiza, desbloquea, cambia tab),
// si tiene una conversación abierta, marcar mensajes como leídos y limpiar badge.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    const { conversacionActivaId, conversaciones, totalNoLeidos } = useChatYAStore.getState();
    if (!conversacionActivaId) return;

    // Verificar si hay mensajes no leídos en esta conversación
    const conv = conversaciones.find((c) => c.id === conversacionActivaId);
    if (conv && conv.noLeidos > 0) {
      // Limpiar badge de esta conversación
      const noLeidosConv = conv.noLeidos;
      useChatYAStore.setState({
        conversaciones: conversaciones.map((c) =>
          c.id === conversacionActivaId ? { ...c, noLeidos: 0 } : c
        ),
        totalNoLeidos: Math.max(0, totalNoLeidos - noLeidosConv),
      });
    }

    // Notificar al backend que fueron leídos (para palomitas azules del emisor)
    if (!conversacionActivaId.startsWith('temp_')) chatyaService.marcarComoLeido(conversacionActivaId).catch(() => { });
  });
}

// =============================================================================
// SUSCRIPCIÓN: Cerrar chat al hacer logout
// Cuando el usuario cierra sesión, limpiar la conversación activa para que
// al iniciar sesión de nuevo el chat aparezca cerrado.
// =============================================================================
function limpiarChatYAAlCerrarSesion() {
  useChatYAStore.setState({ conversacionActivaId: null });
  // Cerrar el overlay — importar useUiStore lazy para evitar dependencia circular
  import('./useUiStore').then(({ useUiStore }) => {
    useUiStore.getState().cerrarChatYA();
  });
}
useAuthStore.subscribe((state, prev) => {
  if (prev.usuario !== null && state.usuario === null) {
    limpiarChatYAAlCerrarSesion();
  }
});
useScanYAStore.subscribe((state, prev) => {
  if (prev.usuario !== null && state.usuario === null) {
    limpiarChatYAAlCerrarSesion();
  }
});

/** chatya:recargar-conversaciones — Forzar recarga (ej: al revocar cupón) */
escucharEvento('chatya:recargar-conversaciones', () => {
  const state = useChatYAStore.getState();
  state.cargarConversaciones('personal', 0, true);
  // Si hay conversación activa, recargar sus mensajes también
  if (state.conversacionActivaId) {
    state.cargarMensajes(state.conversacionActivaId);
  }
});

/** chatya:cupon-eliminado — Eliminar burbujas de cupón sin parpadeo */
escucharEvento<{ ofertaId: string; conversacionIds: string[] }>('chatya:cupon-eliminado', ({ ofertaId, conversacionIds }) => {
  const state = useChatYAStore.getState();

  // Filtrar mensajes tipo cupón de la conversación activa (sin recargar)
  if (state.conversacionActivaId && conversacionIds.includes(state.conversacionActivaId)) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.filter(m => !(m.tipo === 'cupon' && m.contenido.includes(ofertaId))),
    }));
  }

  // Limpiar caché de mensajes
  for (const convId of conversacionIds) {
    const cached = state.cacheMensajes[convId];
    if (cached) {
      useChatYAStore.setState((prev) => ({
        cacheMensajes: {
          ...prev.cacheMensajes,
          [convId]: cached.filter(m => !(m.tipo === 'cupon' && m.contenido.includes(ofertaId))),
        },
      }));
    }
  }

  // Recargar lista de conversaciones (para actualizar preview)
  state.cargarConversaciones('personal', 0, true);
});