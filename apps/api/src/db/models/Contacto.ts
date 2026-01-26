import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// INTERFACES TypeScript
// ============================================================

// Cache de datos de PostgreSQL
export interface IContactoCache {
  nombre: string;
  avatar: string;
  telefono: string;
  ciudad: string;
  _syncedAt: Date;
}

export interface IContacto extends Document {
  usuarioId: string;
  tipo: 'personal' | 'comercial';
  contactoId: string | null;
  negocioId: string | null;
  apodo: string;
  notas: string;
  etiquetas: string[];
  esFavorito: boolean;
  bloqueado: boolean;
  totalMensajes: number;
  ultimaInteraccion?: Date;
  _cache: IContactoCache | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SUB-SCHEMA
// ============================================================
const ContactoCacheSchema = new Schema<IContactoCache>(
  {
    nombre: { type: String, default: '' },
    avatar: { type: String, default: '' },
    telefono: { type: String, default: '' },
    ciudad: { type: String, default: '' },
    _syncedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ============================================================
// SCHEMA
// ============================================================
const ContactoSchema = new Schema<IContacto>(
  {
    // Dueño del contacto (UUID de PostgreSQL)
    usuarioId: {
      type: String,
      required: true,
      index: true,
    },

    // Tipo de contacto
    tipo: {
      type: String,
      enum: ['personal', 'comercial'],
      required: true,
    },

    // Referencia al contacto según tipo
    // Si tipo="personal" → contactoId tiene valor
    contactoId: {
      type: String,
      default: null,
    },

    // Si tipo="comercial" → negocioId tiene valor
    negocioId: {
      type: String,
      default: null,
    },

    // Personalización
    apodo: {
      type: String,
      trim: true,
      default: '',
    },

    notas: {
      type: String,
      trim: true,
      default: '',
    },

    etiquetas: [{
      type: String,
    }],

    // Estados
    esFavorito: {
      type: Boolean,
      default: false,
    },

    bloqueado: {
      type: Boolean,
      default: false,
    },

    // Estadísticas
    totalMensajes: {
      type: Number,
      default: 0,
    },

    ultimaInteraccion: {
      type: Date,
    },

    // Cache de datos de PostgreSQL (evita queries frecuentes)
    _cache: {
      type: ContactoCacheSchema,
      default: null,
    },
  },
  { timestamps: true }
);

// ============================================================
// ÍNDICES
// ============================================================
ContactoSchema.index({ usuarioId: 1, tipo: 1 });
ContactoSchema.index({ usuarioId: 1, contactoId: 1 }, { unique: true, sparse: true });
ContactoSchema.index({ usuarioId: 1, negocioId: 1 }, { unique: true, sparse: true });
ContactoSchema.index({ esFavorito: 1 });

// ============================================================
// EXPORTAR MODELO
// ============================================================
export const Contacto = mongoose.model<IContacto>('Contacto', ContactoSchema);