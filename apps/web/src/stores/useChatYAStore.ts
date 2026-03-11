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
  inicializarScanYA: () => Promise<void>;
  limpiar: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Clave de localStorage para borradores del usuario actual */
function getBorradoresKey(): string | null {
  try {
    const usuario = JSON.parse(localStorage.getItem('ay_usuario') || 'null');
    return usuario?.id ? `chatya_borradores_${usuario.id}` : null;
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
    set({
      conversacionActivaId: conversacionId,
      chatTemporal: null,
    });
  },

  /**
   * Abre un chat temporal sin crear conversación en el backend.
   * La conversación real se crea cuando el usuario envía el primer mensaje.
   */
  abrirChatTemporal: (datos: ChatTemporal) => {
    set({
      vistaActiva: 'chat',
      conversacionActivaId: datos.id,
      chatTemporal: datos,
      mensajes: [],
      totalMensajes: 0,
      hayMasMensajes: false,
      escribiendo: {},
      cargandoMensajes: false,
    });
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
  setPanelInfoAbierto: (abierto: boolean) => set({ panelInfoAbierto: abierto }),

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
        set({
          conversaciones: offset === 0
            ? data.items
            : [...conversaciones, ...data.items],
          totalConversaciones: data.total,
        });
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

  /**
   * Enviar mensaje (optimista).
   * 1. Crea mensaje temporal con ID local
   * 2. Lo inserta al inicio del array (más reciente primero)
   * 3. Envía al backend
   * 4. Reemplaza ID temporal con el real
   * 5. Si falla → marcar como fallido
   */
  enviarMensaje: async (datos: EnviarMensajeInput, _idExistente?: string) => {
    const { conversacionActivaId, mensajes, conversaciones } = get();
    if (!conversacionActivaId) return null;

    const idTemporal = _idExistente || `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const miId = JSON.parse(localStorage.getItem('ay_usuario') || '{}')?.id || null;

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
        // Reemplazar mensaje temporal con el real del backend
        set((state) => ({
          mensajes: state.mensajes.map((m) =>
            m.id === idTemporal ? respuesta.data! : m
          ),
        }));
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

    // Optimista: agregar inmediatamente con datos mínimos para que esBloqueado sea true
    const entradaOptimista: UsuarioBloqueado = {
      id: `opt_${Date.now()}`,
      bloqueadoId: datos.bloqueadoId,
      motivo: datos.motivo || null,
      createdAt: new Date().toISOString(),
      nombre: '',
      apellidos: '',
      avatarUrl: '',
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
      notificar.error('Error al bloquear usuario');
      return false;
    }
  },

  desbloquearUsuario: async (bloqueadoId: string) => {
    const { bloqueados } = get();
    const bloqueadosAnterior = [...bloqueados];

    // Optimista
    set({ bloqueados: bloqueados.filter((b) => b.bloqueadoId !== bloqueadoId) });

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
      fijadoPor: useAuthStore.getState().usuario?.id || '',
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

/** chatya:mensaje-nuevo — Mensaje nuevo de otro participante */
escucharEvento<EventoMensajeNuevo>('chatya:mensaje-nuevo', ({ conversacionId, mensaje }) => {
  const state = useChatYAStore.getState();

  // Ignorar mensajes propios SOLO si ya existen localmente (actualización optimista del mismo dispositivo)
  const usuario = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
  const miId = usuario?.id;
  if (mensaje.emisorId === miId) {
    // Verificar si ya existe por ID real O si hay un mensaje temporal pendiente del mismo contenido
    const yaExiste = state.mensajes.some((m) =>
      m.id === mensaje.id ||
      (m.id.startsWith('temp_') && m.conversacionId === conversacionId && m.contenido === mensaje.contenido)
    );
    if (yaExiste) return;
  }

  // Verificar si la conversación pertenece a la sucursal activa (modo comercial)
  // Si la lista ya está filtrada por sucursal, solo las conversaciones ahí son relevantes
  const existeEnLista = state.conversaciones.some((c) => c.id === conversacionId);
  const existeEnArchivados = state.conversacionesArchivadas.some((c) => c.id === conversacionId);
  const esConversacionConocida = existeEnLista || existeEnArchivados;

  // En modo comercial: si la conversación no está en la lista filtrada, es de otra sucursal
  const modoActivo = usuario?.modoActivo || 'personal';
  const esModoComercial = modoActivo === 'comercial';

  // Si estamos viendo esta conversación Y la pestaña es visible, agregar y marcar leído
  const pestanaVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
  const esMensajePropio = mensaje.emisorId === miId;

  // ── Sonido de notificación ──
  if (!esMensajePropio) {
    const esActiva = state.conversacionActivaId === conversacionId && pestanaVisible;
    const convSilenciada = [...state.conversaciones, ...state.conversacionesArchivadas]
      .find((c) => c.id === conversacionId)?.silenciada;
    if (!esActiva && !convSilenciada) {
      reproducirSonidoNotificacion();
    }
  }

  if (state.conversacionActivaId === conversacionId && pestanaVisible) {
    useChatYAStore.setState((prev) => ({
      mensajes: [mensaje, ...prev.mensajes],
    }));
    if (!esMensajePropio && !conversacionId.startsWith('temp_')) chatyaService.marcarComoLeido(conversacionId).catch(() => { });
  } else if (state.conversacionActivaId === conversacionId && !pestanaVisible) {
    // Conversación abierta pero pestaña no visible
    useChatYAStore.setState((prev) => ({
      mensajes: [mensaje, ...prev.mensajes],
    }));
    if (!esMensajePropio) {
      // Agendar consulta de badge con timer cancelable.
      // Si otro dispositivo (ScanYA) marca como leído → chatya:leido cancela este timer.
      const timerAnterior = badgeTimersPendientes.get(conversacionId);
      if (timerAnterior) clearTimeout(timerAnterior);
      badgeTimersPendientes.set(conversacionId, setTimeout(() => {
        badgeTimersPendientes.delete(conversacionId);
        const modo = (JSON.parse(localStorage.getItem('ay_usuario') || '{}')?.modoActivo || 'personal') as 'personal' | 'comercial';
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
      const modo = (JSON.parse(localStorage.getItem('ay_usuario') || '{}')?.modoActivo || 'personal') as 'personal' | 'comercial';
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
    // Conversación existente: actualizar preview
    useChatYAStore.setState((prev) => ({
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
            noLeidos: prev.conversacionActivaId === conversacionId
              ? 0
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
            noLeidos: prev.conversacionActivaId === conversacionId
              ? 0
              : c.noLeidos,
          }
          : c
      ),
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
        const sucursalActiva = usuario?.sucursalActiva || null;

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
  if (!esMensajePropio) {
    emitirEvento('chatya:entregado', {
      conversacionId,
      emisorId: mensaje.emisorId,
      mensajeIds: [mensaje.id],
    });
  }
});

/** chatya:mensaje-editado — Mensaje editado en tiempo real */
escucharEvento<EventoMensajeEditado>('chatya:mensaje-editado', ({ conversacionId, mensaje }) => {
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
escucharEvento<EventoLeido>('chatya:leido', ({ conversacionId, leidoPor, leidoAt }) => {

  const state = useChatYAStore.getState();

  // Identificar si fui YO quien leyó (en otro dispositivo/tab como ScanYA)
  const usuario = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
  const miId = usuario?.id;
  const yoLeí = leidoPor === miId;

  // Solo marcar como leídos los mensajes que NO fueron enviados por quien leyó.
  // Ejemplo: si leidoPor = Ian, solo mis mensajes se marcan como leídos (Ian los leyó).
  // Si leidoPor = yo, solo los mensajes de Ian se marcan (yo los leí) — sync multi-dispositivo.
  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) =>
        m.emisorId !== leidoPor && m.estado !== 'leido'
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
            m.emisorId !== leidoPor && m.estado !== 'leido'
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

  // Actualizar estado del último mensaje en la lista de conversaciones
  // Solo si el último mensaje fue enviado por alguien distinto a quien leyó
  useChatYAStore.setState((prev) => ({
    conversaciones: prev.conversaciones.map((c) =>
      c.id === conversacionId && c.ultimoMensajeEmisorId !== leidoPor
        ? { ...c, ultimoMensajeEstado: 'leido' as const }
        : c
    ),
    conversacionesArchivadas: prev.conversacionesArchivadas.map((c) =>
      c.id === conversacionId && c.ultimoMensajeEmisorId !== leidoPor
        ? { ...c, ultimoMensajeEstado: 'leido' as const }
        : c
    ),
  }));
});

/** chatya:escribiendo — Indicador "escribiendo..." (soporta múltiples conversaciones) */
escucharEvento<EventoEscribiendo>('chatya:escribiendo', ({ conversacionId }) => {
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
escucharEvento<EventoEscribiendo>('chatya:dejar-escribir', ({ conversacionId }) => {
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
escucharEvento<EventoReaccion>('chatya:reaccion', ({ conversacionId, mensajeId, emoji, usuarioId, accion }) => {
  const state = useChatYAStore.getState();

  // Actualizar reacciones del mensaje si la conversación está abierta
  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) => {
        if (m.id !== mensajeId) return m;

        const reacciones = [...(m.reacciones || [])];

        if (accion === 'agregada') {
          const existente = reacciones.find((r) => r.emoji === emoji);
          if (existente) {
            // Idempotente: solo agregar si el usuario no está ya en la lista
            if (!(existente.usuarios as string[]).includes(usuarioId)) {
              existente.cantidad += 1;
              (existente.usuarios as string[]).push(usuarioId);
            }
          } else {
            reacciones.push({ emoji, cantidad: 1, usuarios: [usuarioId] });
          }
        } else {
          const existente = reacciones.find((r) => r.emoji === emoji);
          if (existente) {
            // Idempotente: solo remover si el usuario todavía está en la lista
            if ((existente.usuarios as string[]).includes(usuarioId)) {
              existente.cantidad -= 1;
              existente.usuarios = (existente.usuarios as string[]).filter((id) => id !== usuarioId);
            }
            if (existente.cantidad <= 0) {
              const idx = reacciones.indexOf(existente);
              reacciones.splice(idx, 1);
            }
          }
        }

        return { ...m, reacciones };
      }),
    }));
  }

  // Actualizar preview en la lista de conversaciones
  if (accion === 'agregada') {
    const miId = useAuthStore.getState().usuario?.id;
    // Buscar contenido del mensaje reaccionado (si los mensajes están cargados)
    const msgReaccionado = state.mensajes.find((m) => m.id === mensajeId);
    const previewMsg = msgReaccionado?.contenido
      ? `"${msgReaccionado.contenido.slice(0, 30)}${msgReaccionado.contenido.length > 30 ? '...' : ''}"`
      : '';

    const esMiReaccion = usuarioId === miId;
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
      const miId = useAuthStore.getState().usuario?.id;
      const usuarioIds = reaccionRestante.usuarios as (string | { id: string })[];
      const esMia = usuarioIds.some((u) => (typeof u === 'string' ? u : u.id) === miId);
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
escucharEvento<EventoMensajeFijado>('chatya:mensaje-fijado', ({ conversacionId, mensajeId, fijadoPor: _fijadoPor }) => {
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
escucharEvento<EventoMensajeDesfijado>('chatya:mensaje-desfijado', ({ conversacionId, mensajeId }) => {
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
useAuthStore.subscribe((state, prev) => {
  // Detectar cuando el usuario pasa de autenticado a no autenticado (logout)
  if (prev.usuario !== null && state.usuario === null) {
    useChatYAStore.setState({ conversacionActivaId: null });
  }
});