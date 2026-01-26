import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// INTERFACES TypeScript
// ============================================================

// Archivo adjunto
export interface IArchivo {
  name?: string;
  filename?: string;
  url?: string;
  thumbUrl?: string;
  mimeType?: string;
  size?: number;
  isImage?: boolean;
  isAudio?: boolean;
  duration?: number;
  width?: number;
  height?: number;
  public_id_cloudinary?: string;
  url_optimizada?: string;
  subido_en?: Date;
  visiblePara?: string[];
}

// Autor en respuestas
export interface IReplyAutor {
  _id?: string;
  nickname?: string;
  nombre?: string;
}

// Respuesta a mensaje
export interface IReply {
  _id?: mongoose.Types.ObjectId;
  texto?: string;
  preview?: string;
  autor?: IReplyAutor;
}

// Mensaje reenviado
export interface IForward {
  _id?: mongoose.Types.ObjectId;
}

// Reacción
export interface IReaccion {
  usuario: string;
  emoji: string;
  creadoAt?: Date;
}

// Mensaje principal
export interface IMensaje extends Document {
  chat: mongoose.Types.ObjectId;
  emisor: string;
  negocioId: string | null;
  texto?: string;
  archivos: IArchivo[];
  replyTo?: IReply;
  forwardOf?: IForward;
  reacciones: IReaccion[];
  leidoPor: string[];
  deletedFor: string[];
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SUB-SCHEMAS
// ============================================================

const ArchivoSchema = new Schema<IArchivo>(
  {
    name: String,
    filename: String,
    url: String,
    thumbUrl: String,
    mimeType: String,
    size: Number,
    isImage: Boolean,
    isAudio: Boolean,
    duration: Number,
    width: Number,
    height: Number,
    public_id_cloudinary: String,
    url_optimizada: String,
    subido_en: { type: Date, default: Date.now },
    visiblePara: [{ type: String }],
  },
  { _id: true }
);

const ReplyAutorSchema = new Schema<IReplyAutor>(
  {
    _id: { type: String },
    nickname: String,
    nombre: String,
  },
  { _id: false }
);

const ReplySchema = new Schema<IReply>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'Mensaje' },
    texto: String,
    preview: String,
    autor: ReplyAutorSchema,
  },
  { _id: false }
);

const ForwardSchema = new Schema<IForward>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'Mensaje' },
  },
  { _id: false }
);

const ReaccionSchema = new Schema<IReaccion>(
  {
    usuario: { type: String, required: true },
    emoji: { type: String, required: true },
    creadoAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ============================================================
// SCHEMA PRINCIPAL
// ============================================================

const MensajeSchema = new Schema<IMensaje>(
  {
    // Referencia al chat (ObjectId interno de MongoDB)
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },

    // Emisor (UUID de PostgreSQL)
    emisor: {
      type: String,
      required: true,
    },

    // Negocio relacionado (UUID de PostgreSQL)
    negocioId: {
      type: String,
      default: null,
    },

    // Contenido
    texto: {
      type: String,
    },

    archivos: [ArchivoSchema],

    // Respuesta y reenvío
    replyTo: ReplySchema,
    forwardOf: ForwardSchema,

    // Reacciones
    reacciones: [ReaccionSchema],

    // Estado de lectura (UUIDs)
    leidoPor: [{
      type: String,
    }],

    // Eliminación selectiva (UUIDs)
    deletedFor: [{
      type: String,
    }],

    // Edición
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ============================================================
// ÍNDICES
// ============================================================
MensajeSchema.index({ chat: 1, createdAt: -1 });
MensajeSchema.index({ emisor: 1 });
MensajeSchema.index({ negocioId: 1 });

// ============================================================
// EXPORTAR MODELO
// ============================================================
export const Mensaje = mongoose.model<IMensaje>('Mensaje', MensajeSchema);