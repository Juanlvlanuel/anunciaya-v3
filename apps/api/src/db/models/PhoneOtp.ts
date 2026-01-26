import mongoose, { Schema, Document } from 'mongoose';

// ============================================================
// INTERFAZ TypeScript
// ============================================================
export interface IPhoneOtp extends Document {
  userId: string;
  telefono: string;
  channel: 'sms' | 'whatsapp' | 'voz';
  codeHash: string;
  attempts: number;
  sentAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================
const PhoneOtpSchema = new Schema<IPhoneOtp>(
  {
    // Usuario que solicita verificación (UUID de PostgreSQL)
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Número de teléfono a verificar
    telefono: {
      type: String,
      required: true,
    },

    // Canal de envío del código
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'voz'],
      required: true,
    },

    // Hash SHA256 del código OTP
    codeHash: {
      type: String,
      required: true,
    },

    // Intentos de verificación realizados
    attempts: {
      type: Number,
      default: 0,
    },

    // Fecha de envío del código
    sentAt: {
      type: Date,
      default: Date.now,
    },

    // Fecha de expiración del código
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ============================================================
// ÍNDICES
// ============================================================

// Índice para buscar OTPs por usuario y teléfono
PhoneOtpSchema.index({ userId: 1, telefono: 1 });

// TTL Index: eliminar automáticamente códigos expirados
PhoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================================
// EXPORTAR MODELO
// ============================================================
export const PhoneOtp = mongoose.model<IPhoneOtp>('PhoneOtp', PhoneOtpSchema);