import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// INTERFACES TypeScript
// ============================================================

// Cache de participante (datos de PostgreSQL)
export interface IParticipanteCache {
  id: string;
  nickname: string;
  avatar: string;
  _syncedAt: Date;
}

export interface IChat extends Document {
  tipo: 'privado' | 'grupo';
  contextoChat: 'personal' | 'comercial';
  participantes: string[];
  usuarioA: string | null;
  usuarioB: string | null;
  negocioId: string | null;
  isSelfChat: boolean;
  nombre: string | null;
  backgroundUrl: string;
  favoritesBy: string[];
  pinnedBy: string[];
  deletedFor: string[];
  archivedFor: string[];
  blockedBy: string[];
  pinsByUser: Map<string, mongoose.Types.ObjectId[]>;
  ultimoMensaje: string;
  ultimoMensajeAt: Date | null;
  unreadCount: Map<string, number>;
  _participantesCache: IParticipanteCache[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SUB-SCHEMA
// ============================================================
const ParticipanteCacheSchema = new Schema<IParticipanteCache>(
  {
    id: { type: String, required: true },
    nickname: { type: String, default: '' },
    avatar: { type: String, default: '' },
    _syncedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ============================================================
// SCHEMA
// ============================================================
const ChatSchema = new Schema<IChat>(
  {
    // Tipo de chat
    tipo: {
      type: String,
      enum: ['privado', 'grupo'],
      default: 'privado',
    },

    contextoChat: {
      type: String,
      enum: ['personal', 'comercial'],
      default: 'personal',
    },

    // Participantes (UUIDs de PostgreSQL)
    participantes: [{
      type: String,
    }],

    usuarioA: {
      type: String,
      default: null,
    },

    usuarioB: {
      type: String,
      default: null,
    },

    // Referencia a negocio (UUID de PostgreSQL)
    negocioId: {
      type: String,
      default: null,
    },

    // Configuración
    isSelfChat: {
      type: Boolean,
      default: false,
    },

    nombre: {
      type: String,
      default: null,
    },

    backgroundUrl: {
      type: String,
      default: '',
    },

    // Estados por usuario (UUIDs)
    favoritesBy: [{
      type: String,
    }],

    pinnedBy: [{
      type: String,
    }],

    deletedFor: [{
      type: String,
    }],

    archivedFor: [{
      type: String,
    }],

    blockedBy: [{
      type: String,
    }],

    // Mensajes fijados por usuario
    pinsByUser: {
      type: Map,
      of: [{ type: Schema.Types.ObjectId, ref: 'Mensaje' }],
      default: () => new Map(),
    },

    // Último mensaje (denormalizado)
    ultimoMensaje: {
      type: String,
      default: '',
    },

    ultimoMensajeAt: {
      type: Date,
      default: null,
    },

    // Contador de no leídos
    unreadCount: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },

    // Cache de datos de PostgreSQL (evita queries frecuentes)
    _participantesCache: {
      type: [ParticipanteCacheSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ============================================================
// ÍNDICES
// ============================================================
ChatSchema.index({ participantes: 1, updatedAt: -1 });
ChatSchema.index({ tipo: 1, participantes: 1 });
ChatSchema.index({ negocioId: 1 });
ChatSchema.index({ blockedBy: 1 });
ChatSchema.index({ archivedFor: 1 });
ChatSchema.index({ pinnedBy: 1 });

// ============================================================
// EXPORTAR MODELO
// ============================================================
export const Chat = mongoose.model<IChat>('Chat', ChatSchema);