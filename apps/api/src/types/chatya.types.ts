/**
 * chatya.types.ts
 * ================
 * Tipos para el módulo de ChatYA (Chat 1:1).
 *
 * UBICACIÓN: apps/api/src/types/chatya.types.ts
 */

// =============================================================================
// TIPOS BASE
// =============================================================================

export type ModoChatYA = 'personal' | 'comercial';

export type TipoMensaje =
  | 'texto'
  | 'imagen'
  | 'audio'
  | 'documento'
  | 'ubicacion'
  | 'contacto'
  | 'sistema';

export type EstadoMensaje = 'enviado' | 'entregado' | 'leido' | 'fallido';

export type ContextoTipo =
  | 'negocio'
  | 'marketplace'
  | 'oferta'
  | 'dinamica'
  | 'empleo'
  | 'directo'
  | 'notas';

// =============================================================================
// INPUTS (lo que recibe el backend)
// =============================================================================

export interface CrearConversacionInput {
  participante2Id: string;
  participante1Modo: ModoChatYA;
  participante2Modo: ModoChatYA;
  participante1SucursalId?: string | null;
  participante2SucursalId?: string | null;
  contextoTipo?: ContextoTipo;
  contextoReferenciaId?: string | null;
}

export interface EnviarMensajeInput {
  conversacionId: string;
  emisorId: string;
  emisorModo: ModoChatYA;
  emisorSucursalId?: string | null;
  empleadoId?: string | null;
  tipo: TipoMensaje;
  contenido: string;
  respuestaAId?: string | null;
}

export interface EditarMensajeInput {
  mensajeId: string;
  emisorId: string;
  contenido: string;
}

export interface ReenviarMensajeInput {
  mensajeOriginalId: string;
  emisorId: string;
  emisorModo: ModoChatYA;
  emisorSucursalId?: string | null;
  destinatarioId: string;
  destinatarioModo: ModoChatYA;
  destinatarioSucursalId?: string | null;
}

// =============================================================================
// RESPONSES (lo que devuelve el backend)
// =============================================================================

export interface ConversacionResponse {
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
  // Datos del otro participante (se llena en el service)
  otroParticipante?: {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    // Si es negocio:
    negocioNombre?: string;
    negocioLogo?: string;
    sucursalNombre?: string;
  };
}

export interface MensajeResponse {
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
  // Datos del mensaje original si es respuesta
  respuestaA?: {
    id: string;
    contenido: string;
    tipo: TipoMensaje;
    emisorId: string | null;
  } | null;
  // Reacciones del mensaje
  reacciones?: {
    emoji: string;
    cantidad: number;
    usuarios: string[];
  }[];
}

// =============================================================================
// RESPUESTA GENÉRICA DEL SERVICE
// =============================================================================

export interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number;
}

// =============================================================================
// PAGINACIÓN
// =============================================================================

export interface PaginacionInput {
  limit: number;
  offset: number;
}

export interface ListaPaginada<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// --- CONTACTOS ---

export interface ContactoInput {
  contactoId: string;
  tipo: 'personal' | 'comercial';
  negocioId?: string | null;
  sucursalId?: string | null;
  alias?: string | null;
}

export interface ContactoResponse {
  id: string;
  contactoId: string;
  tipo: 'personal' | 'comercial';
  negocioId: string | null;
  sucursalId: string | null;
  alias: string | null;
  createdAt: string;
  // Datos del contacto
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  negocioNombre?: string;
  negocioLogo?: string;
  sucursalNombre?: string;
}

// --- BLOQUEO ---

export interface BloqueoInput {
  bloqueadoId: string;
  motivo?: string | null;
}

export interface BloqueoResponse {
  id: string;
  bloqueadoId: string;
  motivo: string | null;
  createdAt: string;
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
}

// --- REACCIONES ---

export interface ReaccionInput {
  emoji: string;
}

export interface ReaccionResponse {
  emoji: string;
  cantidad: number;
  usuarios: { id: string; nombre: string }[];
}

// --- MENSAJES FIJADOS ---

export interface MensajeFijadoResponse {
  id: string;
  mensajeId: string;
  fijadoPor: string;
  createdAt: string;
  mensaje: {
    id: string;
    contenido: string;
    tipo: TipoMensaje;
    emisorId: string | null;
    createdAt: string;
  };
}

// --- BÚSQUEDA ---

export interface BusquedaMensajesInput {
  conversacionId: string;
  texto: string;
  limit: number;
  offset: number;
}

// --- BÚSQUEDA DE PERSONAS Y NEGOCIOS (Sprint 5) ---

export interface BuscarPersonasResponse {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  avatarUrl: string | null;
}

export interface BuscarNegociosResponse {
  /** Visible: nombre del negocio */
  negocioNombre: string;
  /** Visible: nombre de sucursal (null si solo tiene 1) */
  sucursalNombre: string | null;
  /** Visible: foto de perfil de la sucursal */
  fotoPerfil: string | null;
  /** Visible: calificación promedio */
  calificacionPromedio: number;
  /** Visible: nombre de la categoría principal */
  categoria: string | null;
  /** Visible: distancia en km (null si no hay GPS) */
  distanciaKm: number | null;
  /** Técnico: para participante2Id al crear conversación */
  usuarioId: string;
  /** Técnico: para participante2SucursalId */
  sucursalId: string;
  /** Técnico: para contextoReferenciaId */
  negocioId: string;
}