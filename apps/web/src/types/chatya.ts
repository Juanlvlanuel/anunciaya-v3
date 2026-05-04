/**
 * ============================================================================
 * TIPOS - ChatYA (Chat 1:1 en tiempo real)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/chatya.ts
 *
 * ALINEADO CON: apps/api/src/types/chatya.types.ts
 *
 * Todos los tipos reflejan EXACTAMENTE lo que retorna el backend.
 * Los tipos adicionales para UI (vistas, estados visuales)
 * se derivan de los tipos base sin duplicar campos.
 *
 * SPRINTS:
 *   - Sprint 4 (Frontend Core): Conversaciones, Mensajes, Paginación
 *   - Sprint 5 (Frontend Complementario): Contactos, Bloqueo, Reacciones, Fijados, Búsqueda
 *   - Sprint 6 (Multimedia): Imágenes, Audio, Documentos, Ubicación
 */

// =============================================================================
// TIPOS BASE (idénticos al backend)
// =============================================================================

/** Modo en que participa el usuario en la conversación */
export type ModoChatYA = 'personal' | 'comercial';

/** Tipos de contenido soportados por ChatYA */
export type TipoMensaje =
  | 'texto'
  | 'imagen'
  | 'audio'
  | 'documento'
  | 'ubicacion'
  | 'contacto'
  | 'sistema'
  | 'cupon';

/** Estados de entrega del mensaje (palomitas) */
export type EstadoMensaje = 'enviado' | 'entregado' | 'leido' | 'fallido';

/** Desde dónde se inició la conversación. `vendedor_marketplace` agregado en
 *  Sprint 5 del MarketPlace para chats iniciados desde el perfil del vendedor
 *  (sin artículo específico). El check de BD ya soporta este valor desde la
 *  migración del Sprint 1. */
export type ContextoTipo =
  | 'negocio'
  | 'marketplace'
  | 'vendedor_marketplace'
  | 'oferta'
  | 'servicio'
  | 'directo'
  | 'notas';

// =============================================================================
// PAGINACIÓN
// =============================================================================

/** Lista paginada genérica (misma estructura que el backend) */
export interface ListaPaginada<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// OTRO PARTICIPANTE (datos del contacto/negocio en la conversación)
// =============================================================================

/**
 * Datos del otro participante en la conversación.
 * El backend los llena automáticamente en el service.
 * Si el otro participa como negocio, incluye negocioNombre/negocioLogo/sucursalNombre.
 */
export interface OtroParticipante {
  id: string;
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  /** Solo si el participante está en modo comercial */
  negocioNombre?: string;
  negocioLogo?: string;
  sucursalNombre?: string;
}

// =============================================================================
// CONVERSACIÓN
// =============================================================================

/**
 * Conversación retornada por el backend.
 * GET /api/chatya/conversaciones (lista)
 * GET /api/chatya/conversaciones/:id (detalle)
 * POST /api/chatya/conversaciones (crear/obtener)
 */
export interface Conversacion {
  id: string;
  participante1Id: string;
  participante1Modo: ModoChatYA;
  participante1SucursalId: string | null;
  participante2Id: string;
  participante2Modo: ModoChatYA;
  participante2SucursalId: string | null;
  contextoTipo: ContextoTipo;
  contextoReferenciaId: string | null;
  contextoNombre: string | null;
  ultimoMensajeTexto: string | null;
  ultimoMensajeFecha: string | null;
  ultimoMensajeTipo: TipoMensaje | null;
  ultimoMensajeEstado: EstadoMensaje | null;
  ultimoMensajeEmisorId: string | null;
  noLeidos: number;
  fijada: boolean;
  archivada: boolean;
  silenciada: boolean;
  createdAt: string;
  updatedAt: string;
  /** Datos del otro participante (nombre, avatar, negocio si aplica) */
  otroParticipante?: OtroParticipante;
  /** Preview original guardado antes de sobreescribir con reacción (solo en memoria) */
  _previewAnteReaccion?: { texto: string | null; fecha: string | null; emisorId: string | null } | null;
}

// =============================================================================
// MENSAJE
// =============================================================================

/**
 * Mensaje retornado por el backend.
 * GET /api/chatya/conversaciones/:id/mensajes (lista paginada)
 * POST /api/chatya/conversaciones/:id/mensajes (enviar)
 * PATCH /api/chatya/mensajes/:id (editar)
 */
export interface Mensaje {
  id: string;
  conversacionId: string;
  emisorId: string | null;
  emisorModo: ModoChatYA | null;
  emisorSucursalId: string | null;
  empleadoId: string | null;
  tipo: TipoMensaje;
  contenido: string;
  estado: EstadoMensaje;
  editado: boolean;
  editadoAt: string | null;
  eliminado: boolean;
  eliminadoAt: string | null;
  respuestaAId: string | null;
  reenviadoDeId: string | null;
  createdAt: string;
  entregadoAt: string | null;
  leidoAt: string | null;
  /** Datos del mensaje original si es respuesta (quote/reply) */
  respuestaA?: {
    id: string;
    contenido: string;
    tipo: TipoMensaje;
    emisorId: string | null;
    emisorSucursalId: string | null;
  } | null;
  /** Reacciones agrupadas por emoji */
  reacciones?: ReaccionAgrupada[];
}

// =============================================================================
// MULTIMEDIA — Estructura del contenido según tipo de mensaje
// =============================================================================

/**
 * JSON parseado del campo `contenido` cuando tipo === 'imagen'.
 *
 * Se guarda como JSON.stringify en la DB y se parsea en el frontend.
 * El campo `miniatura` es un LQIP (Low Quality Image Placeholder):
 * una imagen WebP de ~16px codificada en base64 (~300-500 bytes)
 * que se muestra con blur mientras la imagen real carga.
 */
export interface ContenidoImagen {
  /** URL pública de la imagen en R2 */
  url: string;
  /** Ancho original en píxeles (después de optimización) */
  ancho: number;
  /** Alto original en píxeles (después de optimización) */
  alto: number;
  /** Peso del archivo en bytes */
  peso: number;
  /** LQIP: data:image/webp;base64,... (~400 bytes, 16px ancho) */
  miniatura: string;
  /** Texto opcional debajo de la imagen (pie de foto) */
  caption?: string;
}

/**
 * Estructura del JSON que se guarda en mensaje.contenido cuando tipo === 'audio'.
 * Se guarda como JSON.stringify en la DB y se parsea en el frontend.
 */
export interface ContenidoAudio {
  /** URL pública del audio en R2 */
  url: string;
  /** Duración en segundos (ej: 12.5) */
  duracion: number;
  /** Peso del archivo en bytes */
  tamano: number;
  /** Array de ~50 valores 0-1 para la onda visual en la burbuja */
  waveform: number[];
}

/**
 * Respuesta del endpoint POST /api/chatya/upload-imagen
 * Genera una presigned URL para subir directamente a R2.
 */
export interface PresignedUrlR2 {
  /** URL pre-firmada para hacer PUT con el archivo */
  uploadUrl: string;
  /** URL pública final de la imagen (usar después del upload) */
  publicUrl: string;
  /** Key del archivo en R2 (para eliminación futura) */
  key: string;
  /** Segundos de validez de la URL */
  expiresIn: number;
}

// =============================================================================
// INPUTS — Lo que envía el frontend al backend
// =============================================================================

/**
 * Body para POST /api/chatya/conversaciones
 * El backend automáticamente toma participante1Id, modo y sucursalId del token.
 */
export interface CrearConversacionInput {
  participante2Id: string;
  participante2Modo?: ModoChatYA;
  participante2SucursalId?: string | null;
  contextoTipo?: ContextoTipo;
  contextoReferenciaId?: string | null;
}

/**
 * Body para POST /api/chatya/conversaciones/:id/mensajes
 * El backend toma emisorId, modo y sucursalId del token.
 */
export interface EnviarMensajeInput {
  contenido: string;
  tipo?: TipoMensaje;
  respuestaAId?: string | null;
  empleadoId?: string | null;
}

/**
 * Body para PATCH /api/chatya/mensajes/:id
 */
export interface EditarMensajeInput {
  contenido: string;
}

/**
 * Body para POST /api/chatya/mensajes/:id/reenviar
 * El backend toma emisorId, modo y sucursalId del token.
 */
export interface ReenviarMensajeInput {
  destinatarioId: string;
  destinatarioModo?: ModoChatYA;
  destinatarioSucursalId?: string | null;
}

// =============================================================================
// CONTACTOS
// =============================================================================

/**
 * Body para POST /api/chatya/contactos
 */
export interface AgregarContactoInput {
  contactoId: string;
  tipo?: 'personal' | 'comercial';
  negocioId?: string | null;
  sucursalId?: string | null;
  alias?: string | null;
}

/** Datos de display para actualización optimista al agregar contacto */
export interface ContactoDisplay {
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  negocioNombre?: string;
  negocioLogo?: string;
  sucursalNombre?: string;
}

/**
 * Contacto retornado por GET /api/chatya/contactos
 */
export interface Contacto {
  id: string;
  contactoId: string;
  tipo: 'personal' | 'comercial';
  negocioId: string | null;
  sucursalId: string | null;
  alias: string | null;
  createdAt: string;
  /** Datos del contacto (joins del backend) */
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  negocioNombre?: string;
  negocioLogo?: string;
  sucursalNombre?: string;
}

// =============================================================================
// BLOQUEO
// =============================================================================

/**
 * Body para POST /api/chatya/bloqueados
 */
export interface BloquearUsuarioInput {
  bloqueadoId: string;
  motivo?: string | null;
}

/**
 * Usuario bloqueado retornado por GET /api/chatya/bloqueados
 */
export interface UsuarioBloqueado {
  id: string;
  bloqueadoId: string;
  motivo: string | null;
  createdAt: string;
  /** Datos del bloqueado (joins del backend) */
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
}

// =============================================================================
// REACCIONES
// =============================================================================

/**
 * Reacción agrupada por emoji (retornada dentro de los mensajes y en GET reacciones)
 */
export interface ReaccionAgrupada {
  emoji: string;
  cantidad: number;
  /**
   * Cada reactor es una tupla (id, sucursalId). En inter-sucursal el mismo
   * usuarioId puede aparecer varias veces, una por sucursal. Los items pueden ser:
   * - string legacy (solo id, sucursal=null implícita).
   * - objeto con id + sucursalId (shape nuevo).
   */
  usuarios: (string | { id: string; sucursalId?: string | null; nombre?: string })[];
}

/**
 * Body para POST /api/chatya/mensajes/:id/reaccion
 */
export interface ReaccionInput {
  emoji: string;
}

// =============================================================================
// MENSAJES FIJADOS
// =============================================================================

/**
 * Mensaje fijado retornado por GET /api/chatya/conversaciones/:id/fijados
 */
export interface MensajeFijado {
  id: string;
  mensajeId: string;
  fijadoPor: string;
  createdAt: string;
  /** Datos del mensaje original fijado */
  mensaje: {
    id: string;
    contenido: string;
    tipo: TipoMensaje;
    emisorId: string | null;
    createdAt: string;
  };
}

// =============================================================================
// EVENTOS SOCKET.IO — Payloads que recibe el frontend
// =============================================================================

/** chatya:mensaje-nuevo */
export interface EventoMensajeNuevo {
  conversacionId: string;
  mensaje: Mensaje;
}

/** chatya:mensaje-editado */
export interface EventoMensajeEditado {
  conversacionId: string;
  mensaje: Mensaje;
  /** Si el mensaje editado era el último de la conversación, el nuevo texto del preview */
  nuevoPreview?: { ultimoMensajeTexto: string };
}

/** chatya:mensaje-eliminado */
export interface EventoMensajeEliminado {
  conversacionId: string;
  mensajeId: string;
  eraUltimoMensaje?: boolean;
  nuevoPreview?: {
    ultimoMensajeTexto: string | null;
    ultimoMensajeTipo: string | null;
    ultimoMensajeFecha: string | null;
    ultimoMensajeEstado: string | null;
    ultimoMensajeEmisorId: string | null;
  };
}

/** chatya:leido */
export interface EventoLeido {
  conversacionId: string;
  leidoPor: string;
  leidoPorSucursalId?: string | null;
  leidoAt: string;
}

/** chatya:escribiendo / chatya:dejar-escribir */
export interface EventoEscribiendo {
  conversacionId: string;
  destinatarioId: string;
  emisorSucursalId?: string | null;
}

/** chatya:entregado */
export interface EventoEntregado {
  conversacionId: string;
  emisorId: string;
  mensajeIds: string[];
}

/** chatya:estado-usuario */
export interface EventoEstadoUsuario {
  usuarioId: string;
  estado: 'conectado' | 'ausente' | 'desconectado';
}

/** chatya:reaccion */
export interface EventoReaccion {
  conversacionId: string;
  mensajeId: string;
  emoji: string;
  usuarioId: string;
  usuarioSucursalId?: string | null;
  accion: 'agregada' | 'removida';
}

/** chatya:mensaje-fijado */
export interface EventoMensajeFijado {
  conversacionId: string;
  mensajeId: string;
  fijadoPor: string;
  fijadoPorSucursalId?: string | null;
}

/** chatya:mensaje-desfijado */
export interface EventoMensajeDesfijado {
  conversacionId: string;
  mensajeId: string;
  fijadoPorSucursalId?: string | null;
}

// =============================================================================
// BÚSQUEDA DE PERSONAS Y NEGOCIOS (Sprint 5)
// =============================================================================

/** Resultado de buscar personas por nombre/alias */
export interface PersonaBusqueda {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  avatarUrl: string | null;
}

/** Resultado de buscar negocios/sucursales */
export interface NegocioBusqueda {
  /** Visible */
  negocioNombre: string;
  sucursalNombre: string | null;
  fotoPerfil: string | null;
  calificacionPromedio: number;
  categoria: string | null;
  distanciaKm: number | null;
  /** Técnicos (para crear conversación) */
  usuarioId: string;
  sucursalId: string;
  negocioId: string;
}

// =============================================================================
// METADATOS IMAGEN — Lo que produce el hook useImagenChat
// =============================================================================

/**
 * Metadatos completos de una imagen procesada por useImagenChat.
 * Incluye todo lo necesario para el pipeline zero-flicker:
 * dimensiones, LQIP, blob local, y archivo optimizado listo para subir.
 */
export interface MetadatosImagen {
  /** Archivo optimizado (WebP, max 1920px) listo para subir a R2 */
  archivo: File;
  /** URL blob local para preview instantáneo */
  blobUrl: string;
  /** Ancho después de optimización */
  ancho: number;
  /** Alto después de optimización */
  alto: number;
  /** Peso del archivo optimizado en bytes */
  peso: number;
  /** LQIP base64: data:image/webp;base64,... (~400 bytes) */
  miniatura: string;
  /** Caption opcional del usuario */
  caption?: string;
}

// =============================================================================
// ESTADOS DE UI
// =============================================================================

/** Vista activa dentro del ChatOverlay */
export type VistaChatYA =
  | 'lista'             // Lista de conversaciones
  | 'chat'              // Ventana de chat activa
  | 'buscar-nuevo'      // Buscar personas/negocios para iniciar chat (Sprint 5)
  | 'contactos'         // Lista de contactos (Sprint 5)
  | 'bloqueados'        // Lista de bloqueados (Sprint 5)
  | 'archivados'        // Conversaciones archivadas (Sprint 5)
  | 'busqueda';         // Búsqueda de conversaciones (Sprint 5)

/** Estado de escritura del otro participante */
export interface EstadoEscribiendo {
  conversacionId: string;
  /** Timestamp para limpiar automáticamente si no llega dejar-escribir */
  timestamp: number;
}

// =============================================================================
// ARCHIVOS COMPARTIDOS (PanelInfoContacto → GaleriaArchivos)
// =============================================================================

/** Categorías de archivos compartidos en una conversación */
export type CategoriaArchivo = 'imagenes' | 'documentos' | 'enlaces';

/** Item individual retornado por GET .../archivos-compartidos */
export interface ArchivoCompartido {
  id: string;
  contenido: string;
  createdAt: string;
  emisorId: string | null;
}

/** Conteo de archivos por categoría (GET .../archivos-compartidos/conteo) */
export interface ConteoArchivosCompartidos {
  imagenes: number;
  documentos: number;
  enlaces: number;
  total: number;
}

// =============================================================================
// OPEN GRAPH PREVIEW
// =============================================================================

/** Datos de Open Graph preview para URLs en mensajes */
export interface DatosOgPreview {
  titulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  dominio: string;
  url: string;
}