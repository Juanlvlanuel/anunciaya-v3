import { z } from 'zod';

// ============================================
// PASO 1: NOMBRE + SUBCATEGORÍAS
// ============================================

/**
 * Schema para validar el Paso 1 del onboarding
 * - nombre: nombre del negocio (editable)
 * - subcategoriasIds: array de 1 a 3 IDs de subcategorías
 */
export const paso1Schema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  subcategoriasIds: z
    .array(z.number().positive())
    .min(1, 'Debes seleccionar al menos 1 subcategoría')
    .max(3, 'Puedes seleccionar máximo 3 subcategorías'),
});

// ============================================
// PASO 2: UBICACIÓN
// ============================================

export const ubicacionSchema = z.object({
  ciudad: z
    .string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(120, 'La ciudad no puede tener más de 120 caracteres'),
  estado: z
    .string()
    .min(2, 'El estado debe tener al menos 2 caracteres')
    .max(100, 'El estado no puede tener más de 100 caracteres'),
  direccion: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(250, 'La dirección no puede tener más de 250 caracteres'),
  latitud: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida'),
  longitud: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida'),
  zonaHoraria: z
    .enum([
      'America/Mexico_City',
      'America/Hermosillo',
      'America/Tijuana',
      'America/Cancun',
      'America/Mazatlan'  
    ])
    .default('America/Mexico_City'),
});
// ============================================
// PASO 3: CONTACTO
// ============================================
// Teléfonos en formato internacional: +52XXXXXXXXXX
// Default: +52 (México), pero el usuario puede cambiar el código de país
// Backend limpia automáticamente espacios, guiones y paréntesis

export const contactoSchema = z
  .object({
    telefono: z
      .union([
        z.string()
          .transform((val) => {
            if (!val) return undefined;
            return val.replace(/[\s\-()]/g, '');
          })
          .pipe(
            z.string().regex(
              /^\+[1-9]\d{1,14}$/,
              'Formato inválido. Usa formato internacional: +52XXXXXXXXXX'
            )
          ),
        z.null()
      ])
      .optional(),
    whatsapp: z
      .union([
        z.string()
          .transform((val) => {
            if (!val) return undefined;
            return val.replace(/[\s\-()]/g, '');
          })
          .pipe(
            z.string().regex(
              /^\+[1-9]\d{1,14}$/,
              'Formato inválido. Usa formato internacional: +52XXXXXXXXXX'
            )
          ),
        z.null()
      ])
      .optional(),
    correo: z
      .union([
        z.string()
          .email('Correo electrónico inválido')
          .max(100, 'El correo no puede tener más de 100 caracteres'),
        z.null()
      ])
      .optional(),
    sitioWeb: z
      .union([
        z.string()
          .url('URL inválida')
          .max(200, 'La URL no puede tener más de 200 caracteres'),
        z.null()
      ])
      .optional(),
  })
  .refine(
    (data) => data.telefono || data.whatsapp || data.correo || data.sitioWeb,
    {
      message: 'Debes proporcionar al menos un método de contacto',
      path: ['telefono'],
    }
  );

// ============================================
// PASO 4: HORARIOS
// ============================================

const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  abierto: z.boolean(),
  horaApertura: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .optional()
    .nullable(),
  horaCierre: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .optional()
    .nullable(),
  tieneHorarioComida: z.boolean().default(false),
  comidaInicio: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .optional()
    .nullable(),
  comidaFin: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
    .optional()
    .nullable(),
});

export const horariosSchema = z
  .object({
    horarios: z.array(horarioSchema).length(7, 'Debes proporcionar horarios para los 7 días'),
  })
  .refine(
    (data) => {
      // Validar que si está abierto, tenga horarios
      return data.horarios.every((h) => {
        if (h.abierto) {
          return h.horaApertura && h.horaCierre;
        }
        return true;
      });
    },
    {
      message: 'Si el negocio está abierto, debe tener hora de apertura y cierre',
      path: ['horarios'],
    }
  )
  .refine(
    (data) => {
      // Validar que si tiene horario de comida, tenga inicio y fin
      return data.horarios.every((h) => {
        if (h.tieneHorarioComida) {
          return h.comidaInicio && h.comidaFin;
        }
        return true;
      });
    },
    {
      message: 'Si tiene horario de comida, debe especificar inicio y fin',
      path: ['horarios'],
    }
  );

// ============================================
// PASO 5: IMÁGENES
// ============================================

// Nota: Las validaciones de archivos se harán en el controller/middleware
// Aquí solo validamos que las URLs estén presentes después de subir

export const logoSchema = z.object({
  logoUrl: z.string().url('URL de logo inválida'),
});

export const portadaSchema = z.object({
  portadaUrl: z.string().url('URL de portada inválida'),
});

export const galeriaSchema = z.object({
  imagenes: z
    .array(
      z.object({
        url: z.string().url('URL de imagen inválida'),
        titulo: z.string().max(100).optional(),
        orden: z.number().int().min(0).default(0),
      })
    )
    .max(10, 'Puedes subir máximo 10 imágenes a la galería'),
});

// ============================================
// PASO 6: MÉTODOS DE PAGO
// ============================================

const METODOS_PAGO_PERMITIDOS = [
  'efectivo',
  'tarjeta_debito',
  'transferencia',
] as const;

export const metodosPagoSchema = z.object({
  metodos: z
    .array(z.enum(METODOS_PAGO_PERMITIDOS))
    .min(1, 'Debes seleccionar al menos 1 método de pago')
    .refine((metodos) => new Set(metodos).size === metodos.length, {
      message: 'No puedes seleccionar el mismo método dos veces',
    }),
});

// ============================================
// PASO 7: SISTEMA DE PUNTOS
// ============================================

export const puntosSchema = z.object({
  participaPuntos: z.boolean(),
});

// ============================================
// PASO 8: PRODUCTOS/SERVICIOS
// ============================================

const articuloSchema = z.object({
  tipo: z.enum(['producto', 'servicio'], {
    message: 'El tipo debe ser "producto" o "servicio"',
  }),
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede tener más de 150 caracteres'),
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede tener más de 1000 caracteres')
    .optional(),
  precioBase: z
    .number()
    .positive('El precio debe ser mayor a 0')
    .max(999999.99, 'El precio es demasiado alto'),
  imagenPrincipal: z.string().url('URL de imagen inválida').optional(),
  disponible: z.boolean().default(true),
});

export const articulosSchema = z.object({
  articulos: z.array(articuloSchema).min(0)
});

// ============================================
// VALIDACIÓN COMPLETA DEL ONBOARDING
// ============================================

export const validarOnboardingCompletoSchema = z.object({
  negocioId: z.string().uuid('ID de negocio inválido'),
});

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type Paso1Input = z.infer<typeof paso1Schema>;
export type UbicacionInput = z.infer<typeof ubicacionSchema>;
export type ContactoInput = z.infer<typeof contactoSchema>;
export type HorariosInput = z.infer<typeof horariosSchema>;
export type LogoInput = z.infer<typeof logoSchema>;
export type PortadaInput = z.infer<typeof portadaSchema>;
export type GaleriaInput = z.infer<typeof galeriaSchema>;
export type MetodosPagoInput = z.infer<typeof metodosPagoSchema>;
export type PuntosInput = z.infer<typeof puntosSchema>;
export type ArticulosInput = z.infer<typeof articulosSchema>;
export type ValidarOnboardingCompletoInput = z.infer<typeof validarOnboardingCompletoSchema>;

// ============================================
// VALIDACIONES PARA ENDPOINTS DE CATEGORÍAS
// ============================================

// GET /api/categorias/:id/subcategorias
export const obtenerSubcategoriasSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, 'El ID debe ser un número')
      .transform(Number)
      .pipe(z.number().int().positive('El ID debe ser un número positivo')),
  }),
});

export type ObtenerSubcategoriasParams = z.infer<typeof obtenerSubcategoriasSchema>;

// ============================================
// SCHEMAS PARCIALES PARA BORRADORES
// ============================================

/**
 * Schemas parciales que NO requieren validación completa
 * Se usan en endpoints /draft para guardar cambios parciales
 * sin bloquear al usuario
 */

export const paso1DraftSchema = z.object({
  nombre: z.union([z.string(), z.null()]).optional(),
  subcategoriasIds: z.union([z.array(z.number()), z.null()]).optional(),
});

export const ubicacionDraftSchema = z.object({
  ciudad: z.union([z.string(), z.null()]).optional(),
  estado: z.union([z.string(), z.null()]).optional(),
  direccion: z.union([z.string(), z.null()]).optional(),
  latitud: z.union([z.number(), z.null()]).optional(),
  longitud: z.union([z.number(), z.null()]).optional(),
  zonaHoraria: z.union([z.string(), z.null()]).optional(),
});

export const contactoDraftSchema = z.object({
  telefono: z.union([z.string(), z.null()]).optional(),
  whatsapp: z.union([z.string(), z.null()]).optional(),
  correo: z.union([z.string(), z.null()]).optional(),
  sitioWeb: z.union([z.string(), z.null()]).optional(),
});

export const horariosDraftSchema = z.object({
  horarios: z.union([z.array(z.any()), z.null()]).optional(),
});

export const logoDraftSchema = z.object({
  logoUrl: z.union([z.string(), z.null()]).optional(),
});

export const portadaDraftSchema = z.object({
  portadaUrl: z.union([z.string(), z.null()]).optional(),
});

export const galeriaDraftSchema = z.object({
  imagenes: z.union([z.array(z.any()), z.null()]).optional(),
});

export const metodosPagoDraftSchema = z.object({
  sucursalId: z.string().uuid().optional(),
  metodos: z.union([z.array(z.string()), z.null()]).optional(),
});

export const puntosDraftSchema = z.object({
  participaPuntos: z.union([z.boolean(), z.null()]).optional(),
});

export const articulosDraftSchema = z.object({
  articulos: z.union([z.array(z.any()), z.null()]).optional(),
});

// ============================================
// TIPOS TYPESCRIPT PARA BORRADORES
// ============================================

export type Paso1Draft = z.infer<typeof paso1DraftSchema>;
export type UbicacionDraft = z.infer<typeof ubicacionDraftSchema>;
export type ContactoDraft = z.infer<typeof contactoDraftSchema>;
export type HorariosDraft = z.infer<typeof horariosDraftSchema>;
export type LogoDraft = z.infer<typeof logoDraftSchema>;
export type PortadaDraft = z.infer<typeof portadaDraftSchema>;
export type GaleriaDraft = z.infer<typeof galeriaDraftSchema>;
export type MetodosPagoDraft = z.infer<typeof metodosPagoDraftSchema>;
export type PuntosDraft = z.infer<typeof puntosDraftSchema>;
export type ArticulosDraft = z.infer<typeof articulosDraftSchema>;