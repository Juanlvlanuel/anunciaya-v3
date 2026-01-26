import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// INTERFAZ TypeScript
// ============================================================
export interface IInteraccion extends Document {
  entityType: 'negocio' | 'articulo' | 'publicacion' | 'rifa' | 'subasta';
  entityId: string;
  userId: string | null;
  action: 'view' | 'click' | 'share' | 'message' | 'save';
  durationMs: number | null;
  ciudad: string;
  source: 'feed' | 'search' | 'direct' | 'shared_link';
  device: 'mobile' | 'desktop' | 'tablet';
  createdAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================
const InteraccionSchema = new Schema<IInteraccion>(
  {
    // Tipo de entidad
    entityType: {
      type: String,
      enum: ['negocio', 'articulo', 'publicacion', 'rifa', 'subasta'],
      required: true,
    },

    // ID de la entidad (UUID de PostgreSQL)
    entityId: {
      type: String,
      required: true,
    },

    // Usuario que realizó la interacción (UUID de PostgreSQL, null si anónimo)
    userId: {
      type: String,
      default: null,
    },

    // Tipo de acción
    action: {
      type: String,
      enum: ['view', 'click', 'share', 'message', 'save'],
      required: true,
    },

    // Duración en milisegundos (solo para 'view')
    durationMs: {
      type: Number,
      default: null,
    },

    // Contexto geográfico
    ciudad: {
      type: String,
      required: true,
    },

    // Origen de la interacción
    source: {
      type: String,
      enum: ['feed', 'search', 'direct', 'shared_link'],
      default: 'direct',
    },

    // Tipo de dispositivo
    device: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet'],
      default: 'mobile',
    },
  },
  { 
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

// ============================================================
// ÍNDICES
// ============================================================

// Índice compuesto para queries de métricas por entidad
InteraccionSchema.index({ entityType: 1, entityId: 1, action: 1 });

// Índice para analytics por ciudad y fecha
InteraccionSchema.index({ ciudad: 1, createdAt: -1 });

// Índice para queries por usuario
InteraccionSchema.index({ userId: 1, createdAt: -1 });

// TTL Index: eliminar documentos después de 90 días
InteraccionSchema.index(
  { createdAt: 1 }, 
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 días en segundos
);

// ============================================================
// EXPORTAR MODELO
// ============================================================
export const Interaccion = mongoose.model<IInteraccion>('Interaccion', InteraccionSchema);