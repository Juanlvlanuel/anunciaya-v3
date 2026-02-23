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
 *   - Manejar cola de mensajes offline
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
import { escucharEvento } from '../services/socketService';
import { notificar } from '../utils/notificaciones';
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
  UsuarioBloqueado,
  BloquearUsuarioInput,
  MensajeFijado,
  MensajeOffline,
  EstadoEscribiendo,
  ListaPaginada,
  EventoMensajeNuevo,
  EventoMensajeEditado,
  EventoMensajeEliminado,
  EventoLeido,
  EventoEscribiendo,
  EventoEntregado,
  EventoReaccion,
  EventoMensajeFijado,
  EventoMensajeDesfijado,
} from '../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Máximo de mensajes en cola offline */
const MAX_COLA_OFFLINE = 50;

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
  escribiendo: EstadoEscribiendo | null;

  // ─── Cola offline ─────────────────────────────────────────────────────
  colaOffline: MensajeOffline[];

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
  enviarMensaje: (datos: EnviarMensajeInput) => Promise<Mensaje | null>;
  editarMensaje: (mensajeId: string, datos: EditarMensajeInput) => Promise<boolean>;
  eliminarMensaje: (mensajeId: string) => Promise<boolean>;
  reenviarMensaje: (mensajeId: string, datos: ReenviarMensajeInput) => Promise<boolean>;

  // ─── ACCIONES: Badge ──────────────────────────────────────────────────
  cargarNoLeidos: (modo?: ModoChatYA) => Promise<void>;
  cargarNoLeidosArchivados: (modo?: ModoChatYA) => Promise<void>;
  cargarArchivados: (modo?: ModoChatYA) => Promise<void>;

  // ─── ACCIONES: Contactos (Sprint 5) ───────────────────────────────────
  cargarContactos: (tipo?: 'personal' | 'comercial') => Promise<void>;
  agregarContacto: (datos: AgregarContactoInput) => Promise<Contacto | null>;
  eliminarContacto: (id: string) => Promise<boolean>;

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
  guardarBorrador: (conversacionId: string, texto: string) => void;
  limpiarBorrador: (conversacionId: string) => void;

  // ─── ACCIONES: Cola offline ───────────────────────────────────────────
  agregarAColaOffline: (mensaje: MensajeOffline) => void;
  enviarColaOffline: () => Promise<void>;

  // ─── ACCIONES: Escribiendo ────────────────────────────────────────────
  setEscribiendo: (estado: EstadoEscribiendo | null) => void;

  // ─── ACCIONES: Mis Notas ───────────────────────────────────────────────
  cargarMisNotas: () => Promise<void>;

  // ─── Carga inicial y reset ────────────────────────────────────────────
  inicializar: (modo?: ModoChatYA) => Promise<void>;
  limpiar: () => void;
}

// =============================================================================
// ESTADO INICIAL
// =============================================================================

const ESTADO_INICIAL = {
  vistaActiva: 'lista' as VistaChatYA,
  conversacionActivaId: null as string | null,
  misNotasId: null as string | null,
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
  escribiendo: null as EstadoEscribiendo | null,
  colaOffline: [] as MensajeOffline[],
  contactos: [] as Contacto[],
  cargandoContactos: false,
  bloqueados: [] as UsuarioBloqueado[],
  cargandoBloqueados: false,
  mensajesFijados: [] as MensajeFijado[],
  cargandoFijados: false,
  resultadosBusqueda: [] as Mensaje[],
  totalResultadosBusqueda: 0,
  cargandoBusqueda: false,
  borradores: (() => {
    try {
      const saved = localStorage.getItem('chatya_borradores');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  })() as Record<string, string>,
  enviandoMensaje: false,
  chatTemporal: null as ChatTemporal | null,
  error: null as string | null,
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
   */
  abrirConversacion: (conversacionId: string) => {
    // Si ya es la conversación activa, no recargar
    if (get().conversacionActivaId === conversacionId) return;
    set({
      vistaActiva: 'chat',
      conversacionActivaId: conversacionId,
      chatTemporal: null,
      mensajes: [],
      totalMensajes: 0,
      hayMasMensajes: false,
      escribiendo: null,
      cargandoMensajes: true,
    });

    // Cargar mensajes y marcar como leído en paralelo
    get().cargarMensajes(conversacionId);
    get().cargarMensajesFijados(conversacionId);
    get().marcarComoLeido(conversacionId);
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
      escribiendo: null,
      cargandoMensajes: false,
    });
  },

  /** Vuelve a la lista de conversaciones y limpia el estado del chat activo */
  volverALista: () => {
    set({
      vistaActiva: 'lista',
      conversacionActivaId: null,
      chatTemporal: null,
      mensajes: [],
      totalMensajes: 0,
      hayMasMensajes: false,
      escribiendo: null,
      resultadosBusqueda: [],
      totalResultadosBusqueda: 0,
      mensajesFijados: [],
    });
  },

  // ===========================================================================
  // ACCIONES: Conversaciones
  // ===========================================================================

  cargarConversaciones: async (modo: ModoChatYA = 'personal', offset = 0, silencioso = false) => {
    // En modo comercial, no cargar si sucursalActiva aún no está lista
    if (modo === 'comercial' && !useAuthStore.getState().usuario?.sucursalActiva) return;

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
        set((state) => ({
          mensajes: offset === 0
            ? data.items
            : [...state.mensajes, ...data.items],
          totalMensajes: data.total,
          hayMasMensajes: offset + data.items.length < data.total,
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
   * Enviar mensaje (optimista).
   * 1. Crea mensaje temporal con ID local
   * 2. Lo inserta al inicio del array (más reciente primero)
   * 3. Envía al backend
   * 4. Reemplaza ID temporal con el real
   * 5. Si falla → rollback o mover a cola offline
   */
  enviarMensaje: async (datos: EnviarMensajeInput) => {
    const { conversacionActivaId, mensajes, conversaciones } = get();
    if (!conversacionActivaId) return null;

    const idTemporal = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Crear mensaje optimista
    const miId = JSON.parse(localStorage.getItem('ay_usuario') || '{}')?.id || null;
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
      // Si hay error de red, mover a cola offline
      set((state) => ({
        mensajes: state.mensajes.map((m) =>
          m.id === idTemporal ? { ...m, estado: 'enviado' as const } : m
        ),
      }));

      get().agregarAColaOffline({
        idTemporal,
        conversacionId: conversacionActivaId,
        contenido: datos.contenido,
        tipo: datos.tipo || 'texto',
        respuestaAId: datos.respuestaAId,
        creadoLocalAt: new Date().toISOString(),
        reintentos: 0,
      });

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
    const { mensajes } = get();
    const mensajesAnterior = [...mensajes];

    // Optimista: marcar como eliminado
    set({
      mensajes: mensajes.map((m) =>
        m.id === mensajeId
          ? { ...m, eliminado: true, contenido: 'Se eliminó este mensaje' }
          : m
      ),
    });

    try {
      const respuesta = await chatyaService.eliminarMensaje(mensajeId);
      if (respuesta.success) {
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
    if (modo === 'comercial' && !useAuthStore.getState().usuario?.sucursalActiva) return;
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

  agregarContacto: async (datos: AgregarContactoInput) => {
    try {
      const respuesta = await chatyaService.agregarContacto(datos);
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          contactos: [...state.contactos, respuesta.data!],
        }));
        notificar.exito('Contacto agregado');
        return respuesta.data;
      }
      notificar.error(respuesta.message || 'No se pudo agregar el contacto');
      return null;
    } catch {
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
      return false;
    } catch {
      set({ contactos: contactosAnterior });
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
        notificar.exito('Usuario bloqueado');
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
        notificar.exito('Usuario desbloqueado');
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
    set({ cargandoFijados: true });

    try {
      const respuesta = await chatyaService.getMensajesFijados(conversacionId);
      if (respuesta.success && respuesta.data) {
        set({ mensajesFijados: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando mensajes fijados:', error);
    } finally {
      set({ cargandoFijados: false });
    }
  },

  fijarMensaje: async (conversacionId: string, mensajeId: string) => {
    try {
      const respuesta = await chatyaService.fijarMensaje(conversacionId, mensajeId);
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          mensajesFijados: [respuesta.data!, ...state.mensajesFijados],
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  desfijarMensaje: async (conversacionId: string, mensajeId: string) => {
    const { mensajesFijados } = get();
    const fijadosAnterior = [...mensajesFijados];

    // Optimista
    set({
      mensajesFijados: mensajesFijados.filter((f) => f.mensajeId !== mensajeId),
    });

    try {
      const respuesta = await chatyaService.desfijarMensaje(conversacionId, mensajeId);
      if (respuesta.success) {
        return true;
      }
      set({ mensajesFijados: fijadosAnterior });
      return false;
    } catch {
      set({ mensajesFijados: fijadosAnterior });
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

  guardarBorrador: (conversacionId: string, texto: string) => {
    set((state) => {
      const nuevos = { ...state.borradores, [conversacionId]: texto };
      try { localStorage.setItem('chatya_borradores', JSON.stringify(nuevos)); } catch { /* sin acceso a localStorage */ }
      return { borradores: nuevos };
    });
  },

  limpiarBorrador: (conversacionId: string) => {
    set((state) => {
      const nuevos = { ...state.borradores };
      delete nuevos[conversacionId];
      try { localStorage.setItem('chatya_borradores', JSON.stringify(nuevos)); } catch { /* sin acceso a localStorage */ }
      return { borradores: nuevos };
    });
  },

  // ===========================================================================
  // ACCIONES: Cola offline
  // ===========================================================================

  agregarAColaOffline: (mensaje: MensajeOffline) => {
    set((state) => {
      let cola = [...state.colaOffline, mensaje];
      // Si excede el máximo, descartar los más antiguos
      if (cola.length > MAX_COLA_OFFLINE) {
        cola = cola.slice(cola.length - MAX_COLA_OFFLINE);
      }
      return { colaOffline: cola };
    });
  },

  /** Envía todos los mensajes de la cola offline al reconectar */
  enviarColaOffline: async () => {
    const { colaOffline } = get();
    if (colaOffline.length === 0) return;

    const colaActual = [...colaOffline];
    set({ colaOffline: [] });

    for (const mensajePendiente of colaActual) {
      try {
        const respuesta = await chatyaService.enviarMensaje(
          mensajePendiente.conversacionId,
          {
            contenido: mensajePendiente.contenido,
            tipo: mensajePendiente.tipo,
            respuestaAId: mensajePendiente.respuestaAId,
          }
        );

        if (respuesta.success && respuesta.data) {
          // Reemplazar mensaje temporal con el real
          set((state) => ({
            mensajes: state.mensajes.map((m) =>
              m.id === mensajePendiente.idTemporal ? respuesta.data! : m
            ),
          }));
        }
      } catch {
        // Si falla de nuevo, re-encolar con +1 reintento
        if (mensajePendiente.reintentos < 3) {
          get().agregarAColaOffline({
            ...mensajePendiente,
            reintentos: mensajePendiente.reintentos + 1,
          });
        }
        // Si ya reintentó 3 veces, se descarta
      }
    }
  },

  // ===========================================================================
  // ACCIONES: Escribiendo
  // ===========================================================================

  setEscribiendo: (estado: EstadoEscribiendo | null) => {
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
export const selectCargandoConversaciones = (state: ChatYAState) => state.cargandoConversaciones;
export const selectCargandoMensajes = (state: ChatYAState) => state.cargandoMensajes;

/** Obtiene la conversación activa completa desde la lista */
export const selectConversacionActiva = (state: ChatYAState) =>
  state.conversaciones.find((c) => c.id === state.conversacionActivaId) ?? null;

// =============================================================================
// LISTENERS SOCKET.IO — Tiempo real
// =============================================================================

/** chatya:mensaje-nuevo — Mensaje nuevo de otro participante */
escucharEvento<EventoMensajeNuevo>('chatya:mensaje-nuevo', ({ conversacionId, mensaje }) => {
  const state = useChatYAStore.getState();

  // Ignorar mensajes propios: ya fueron agregados por enviarMensaje() (optimistic UI)
  const usuario = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
  const miId = usuario?.id;
  if (mensaje.emisorId === miId) return;

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

  if (state.conversacionActivaId === conversacionId && pestanaVisible) {
    useChatYAStore.setState((prev) => ({
      mensajes: [mensaje, ...prev.mensajes],
    }));
    chatyaService.marcarComoLeido(conversacionId).catch(() => { });
  } else if (state.conversacionActivaId === conversacionId && !pestanaVisible) {
    // Conversación abierta pero pestaña no visible
    useChatYAStore.setState((prev) => ({
      mensajes: [mensaje, ...prev.mensajes],
      totalNoLeidos: esConversacionConocida ? prev.totalNoLeidos + 1 : prev.totalNoLeidos,
    }));
  } else if (esConversacionConocida) {
    // Conversación en la lista (pertenece a la sucursal activa): incrementar badge
    useChatYAStore.setState((prev) => ({
      totalNoLeidos: prev.totalNoLeidos + 1,
    }));
  }
  // Si NO es conocida y es modo comercial → es de otra sucursal, no incrementar badge

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
              : c.noLeidos + 1,
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
              : c.noLeidos + 1,
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
            conversaciones: [{ ...nuevaConv, noLeidos: 1 }, ...prev.conversaciones],
            totalNoLeidos: prev.totalNoLeidos + 1,
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
              conversaciones: [{ ...nuevaConv, noLeidos: 1 }, ...prev.conversaciones],
              totalNoLeidos: prev.totalNoLeidos + 1,
            };
          });
        }
        // Si no es de mi sucursal: no agregar ni incrementar badge
      }
    }).catch(() => { });
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
});

/** chatya:mensaje-eliminado — Mensaje eliminado en tiempo real */
escucharEvento<EventoMensajeEliminado>('chatya:mensaje-eliminado', ({ conversacionId, mensajeId }) => {
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
});

/** chatya:leido — Palomitas azules (el otro leyó los mensajes) */
escucharEvento<EventoLeido>('chatya:leido', ({ conversacionId, leidoPor, leidoAt }) => {

  const state = useChatYAStore.getState();

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

/** chatya:escribiendo — Indicador "escribiendo..." */
escucharEvento<EventoEscribiendo>('chatya:escribiendo', ({ conversacionId }) => {
  const state = useChatYAStore.getState();

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState({
      escribiendo: { conversacionId, timestamp: Date.now() },
    });

    // Auto-limpiar después de 5 segundos si no llega dejar-escribir
    setTimeout(() => {
      const current = useChatYAStore.getState().escribiendo;
      if (current && current.conversacionId === conversacionId && Date.now() - current.timestamp >= 4500) {
        useChatYAStore.setState({ escribiendo: null });
      }
    }, 5000);
  }
});

/** chatya:dejar-escribir — Dejar de mostrar "escribiendo..." */
escucharEvento<EventoEscribiendo>('chatya:dejar-escribir', ({ conversacionId }) => {
  const state = useChatYAStore.getState();

  if (state.escribiendo?.conversacionId === conversacionId) {
    useChatYAStore.setState({ escribiendo: null });
  }
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
            existente.cantidad += 1;
            (existente.usuarios as string[]).push(usuarioId);
          } else {
            reacciones.push({ emoji, cantidad: 1, usuarios: [usuarioId] });
          }
        } else {
          const existente = reacciones.find((r) => r.emoji === emoji);
          if (existente) {
            existente.cantidad -= 1;
            existente.usuarios = (existente.usuarios as string[]).filter((id) => id !== usuarioId);
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

  // Actualizar preview en la lista de conversaciones (solo al agregar)
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
          ultimoMensajeTexto: textoPreview,
          ultimoMensajeFecha: new Date().toISOString(),
          ultimoMensajeEmisorId: usuarioId,
        };
      }),
    }));
  }
});

/** chatya:mensaje-fijado — Mensaje fijado en tiempo real */
escucharEvento<EventoMensajeFijado>('chatya:mensaje-fijado', ({ conversacionId, mensajeId: _mensajeId, fijadoPor: _fijadoPor }) => {
  const state = useChatYAStore.getState();

  // Recargar la lista de fijados si estamos en esa conversación
  if (state.conversacionActivaId === conversacionId) {
    state.cargarMensajesFijados(conversacionId);
  }
});

/** chatya:mensaje-desfijado — Mensaje desfijado en tiempo real */
escucharEvento<EventoMensajeDesfijado>('chatya:mensaje-desfijado', ({ conversacionId, mensajeId }) => {
  const state = useChatYAStore.getState();

  if (state.conversacionActivaId === conversacionId) {
    useChatYAStore.setState((prev) => ({
      mensajesFijados: prev.mensajesFijados.filter((f) => f.mensajeId !== mensajeId),
    }));
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
    chatyaService.marcarComoLeido(conversacionActivaId).catch(() => { });
  });
}