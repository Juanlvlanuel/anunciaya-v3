/**
 * ============================================================================
 * VALIDACIONES ZOD - Ofertas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/validations/ofertas.schema.ts
 * 
 * PROPÓSITO:
 * Validar datos de entrada para operaciones CRUD de ofertas
 * Usando Zod v4 (sintaxis actualizada)
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

/**
 * Campo: tipo de oferta
 * Debe ser uno de los tipos permitidos
 */
const campoTipo = z.enum(
  ['porcentaje', 'monto_fijo', '2x1', '3x2', 'envio_gratis', 'otro'],
  {
    message: 'El tipo debe ser: porcentaje, monto_fijo, 2x1, 3x2, envio_gratis u otro',
  }
);

/**
 * Campo: título de la oferta
 * Mínimo 5 caracteres, máximo 150
 */
const campoTitulo = z
  .string()
  .trim()
  .min(3, 'El título debe tener al menos 3 caracteres')
  .max(150, 'El título no puede exceder 150 caracteres');

/**
 * Campo: descripción (opcional)
 * Máximo 500 caracteres
 */
const campoDescripcion = z
  .string()
  .trim()
  .max(500, 'La descripción no puede exceder 500 caracteres')
  .optional()
  .nullable();

/**
 * Campo: imagen (opcional)
 * URL de R2, máximo 500 caracteres
 */
const campoImagen = z
  .string()
  .url('La imagen debe ser una URL válida')
  .max(500, 'La URL de la imagen no puede exceder 500 caracteres')
  .optional()
  .nullable();

/**
 * Campo: valor del descuento
 * Opcional, acepta string (para tipo "otro") o number (para porcentaje/monto_fijo)
 */
const campoValor = z
  .union([
    z.string().max(100, 'El texto no puede exceder 100 caracteres'),
    z.number().positive('El valor debe ser mayor a 0').max(100000, 'El valor no puede exceder $100,000')
  ])
  .optional()
  .nullable();

/**
 * Campo: compra mínima
 * Opcional, debe ser 0 o mayor
 */
const campoCompraMinima = z
  .number()
  .min(0, 'La compra mínima debe ser 0 o mayor')
  .max(999999.99, 'La compra mínima no puede exceder $999,999.99')
  .optional()
  .default(0);

/**
 * Campo: fecha (ISO string)
 */
const campoFecha = z
  .string()
  .datetime({ message: 'Debe ser una fecha válida en formato ISO' });

/**
 * Campo: límite de usos (opcional)
 * NULL = ilimitado
 */
const campoLimiteUsos = z
  .number()
  .int('El límite de usos debe ser un número entero')
  .positive('El límite de usos debe ser mayor a 0')
  .optional()
  .nullable();

/**
 * Campo: límite de usos por usuario (opcional)
 * NULL = sin límite por persona
 */
const campoLimiteUsosPorUsuario = z
  .number()
  .int('El límite por usuario debe ser un número entero')
  .positive('El límite por usuario debe ser mayor a 0')
  .optional()
  .nullable();

/**
 * Campo: visibilidad
 */
const campoVisibilidad = z
  .enum(['publico', 'privado'], {
    message: 'La visibilidad debe ser: publico o privado',
  })
  .optional()
  .default('publico');

/**
 * Campo: UUID (para validar IDs)
 * Permisivo: acepta cualquier formato UUID (incluyendo UUIDs de testing)
 */
const campoUUID = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'El ID debe ser un UUID válido'
  );

// =============================================================================
// SCHEMA 1: CREAR OFERTA
// =============================================================================
// Para: POST /api/ofertas

export const crearOfertaSchema = z
  .object({
    titulo: campoTitulo,
    descripcion: campoDescripcion,
    imagen: campoImagen,
    tipo: campoTipo,
    valor: campoValor,
    compraMinima: campoCompraMinima,
    fechaInicio: campoFecha,
    fechaFin: campoFecha,
    limiteUsos: campoLimiteUsos,
    limiteUsosPorUsuario: campoLimiteUsosPorUsuario,
    articuloId: campoUUID.optional().nullable(),
    activo: z.boolean().optional().default(true),
    visibilidad: campoVisibilidad,
    // Tope alto de seguridad (anti-abuso), sin límite práctico para el comerciante.
    // Los destinatarios ya NO están limitados a clientes con billetera: puede ser
    // cualquier usuario de AnunciaYA (el service valida existencia/actividad).
    usuariosIds: z.array(campoUUID).min(1).max(5000).optional(),
    motivoAsignacion: z.string().trim().max(200).optional(),
    duplicarImagen: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      return fin >= inicio;
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['fechaFin'],
    }
  )
  .refine(
    (data) => {
      if (data.tipo === 'porcentaje' && typeof data.valor === 'number') {
        return data.valor >= 1 && data.valor <= 100;
      }
      return true;
    },
    {
      message: 'Para descuento por porcentaje, el valor debe estar entre 1 y 100',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      if (data.tipo === 'monto_fijo') {
        return typeof data.valor === 'number' && data.valor > 0;
      }
      return true;
    },
    {
      message: 'Para descuento por monto fijo, debes especificar el valor',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      if (data.tipo === 'otro') {
        return typeof data.valor === 'string' && data.valor.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Para tipo otro, debes especificar el concepto',
      path: ['valor'],
    }
  );
// NOTA: un cupón privado PUEDE crearse sin `usuariosIds` (0 destinatarios). El
// envío es un segundo paso: al crear el cupón se abre el modal de destinatarios,
// o se envía después desde la tabla con "Enviar a más" (POST /:id/asignar).

export type CrearOfertaInput = z.infer<typeof crearOfertaSchema>;

// =============================================================================
// SCHEMA 2: ACTUALIZAR OFERTA
// =============================================================================
// Para: PUT /api/ofertas/:id
// Todos los campos son opcionales (PATCH)

export const actualizarOfertaSchema = z
  .object({
    titulo: campoTitulo.optional(),
    descripcion: campoDescripcion,
    imagen: campoImagen,
    tipo: campoTipo.optional(),
    valor: campoValor,
    compraMinima: campoCompraMinima.optional(),
    fechaInicio: campoFecha.optional(),
    fechaFin: campoFecha.optional(),
    limiteUsos: campoLimiteUsos,
    limiteUsosPorUsuario: campoLimiteUsosPorUsuario,
    articuloId: campoUUID.optional().nullable(),
    activo: z.boolean().optional(),
    visibilidad: z.enum(['publico', 'privado']).optional(),
  })
  .refine(
    // Validación: al menos un campo debe estar presente
    (data) => Object.keys(data).length > 0,
    {
      message: 'Debes proporcionar al menos un campo para actualizar',
    }
  )
  .refine(
    (data) => {
      // Validación: si se actualizan fechas, fechaFin >= fechaInicio
      if (data.fechaInicio && data.fechaFin) {
        const inicio = new Date(data.fechaInicio);
        const fin = new Date(data.fechaFin);
        return fin >= inicio;
      }
      return true;
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['fechaFin'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'porcentaje', validar valor
      if (data.tipo === 'porcentaje' && typeof data.valor === 'number') {
        return data.valor >= 1 && data.valor <= 100;
      }
      return true;
    },
    {
      message: 'Para descuento por porcentaje, el valor debe estar entre 1 y 100',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'monto_fijo', valor debe ser número positivo
      if (data.tipo === 'monto_fijo') {
        return typeof data.valor === 'number' && data.valor > 0;
      }
      return true;
    },
    {
      message: 'Para descuento por monto fijo, debes especificar el valor',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'otro', valor debe ser string no vacío
      if (data.tipo === 'otro') {
        return typeof data.valor === 'string' && data.valor.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Para tipo otro, debes especificar el concepto',
      path: ['valor'],
    }
  );

export type ActualizarOfertaInput = z.infer<typeof actualizarOfertaSchema>;

// =============================================================================
// SCHEMA 3: DUPLICAR OFERTA A SUCURSALES
// =============================================================================
// Para: POST /api/ofertas/:id/duplicar
// Solo DUEÑOS pueden usar esta función

export const duplicarOfertaSchema = z.object({
  sucursalesIds: z
    .array(campoUUID)
    .min(1, 'Debes seleccionar al menos una sucursal')
    .max(50, 'No puedes duplicar a más de 50 sucursales a la vez'),
});

export type DuplicarOfertaInput = z.infer<typeof duplicarOfertaSchema>;

// =============================================================================
// SCHEMA 4: FILTROS FEED (Query params)
// =============================================================================
// Para: GET /api/ofertas/feed
// Nota: Si viene sucursalId, filtra por esa sucursal específica (para perfil de negocio)

export const filtrosFeedSchema = z.object({
  sucursalId: campoUUID.optional(),
  latitud: z.coerce.number().optional(),
  longitud: z.coerce.number().optional(),
  distanciaMaxKm: z.coerce.number().int().positive().max(500).optional().default(50),
  categoriaId: z.coerce.number().int().positive().optional(),
  tipo: campoTipo.optional(),
  busqueda: z.string().trim().max(100).optional(),
  limite: z.coerce.number().int().positive().max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  fechaLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser YYYY-MM-DD').optional(),
  orden: z
    .enum(['distancia', 'recientes', 'populares', 'vencen_pronto'], {
      message: 'orden debe ser: distancia, recientes, populares o vencen_pronto',
    })
    .optional(),
  soloCardya: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  creadasUltimasHoras: z.coerce
    .number()
    .int()
    .min(1, 'creadasUltimasHoras debe ser al menos 1')
    .max(720, 'creadasUltimasHoras no puede exceder 720 (30 días)')
    .optional(),
});

export type FiltrosFeedInput = z.infer<typeof filtrosFeedSchema>;

// =============================================================================
// FUNCIÓN HELPER: Formatear errores de Zod v4
// =============================================================================

export function formatearErroresZod(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${campo}${issue.message}`;
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

// =============================================================================
// SCHEMA 5: ASIGNAR OFERTA A USUARIOS
// =============================================================================
// Para: POST /api/ofertas/:id/asignar

export const asignarOfertaSchema = z.object({
  usuariosIds: z
    .array(campoUUID)
    .min(1, 'Debes seleccionar al menos un usuario')
    .max(5000, 'No puedes asignar a más de 5000 usuarios a la vez'),
  motivo: z
    .string()
    .trim()
    .max(200, 'El motivo no puede exceder 200 caracteres')
    .optional(),
});

export type AsignarOfertaInput = z.infer<typeof asignarOfertaSchema>;

// =============================================================================
// SCHEMA: BUSCAR USUARIOS PARA SELECTOR DE CUPÓN (Business Studio)
// =============================================================================
// Para: GET /api/ofertas/buscar-usuarios?q=...&limit=...
//
// Alimenta la sub-pestaña "Buscar usuario" del selector de destinatarios de un
// cupón. Permite elegir a CUALQUIER usuario de AnunciaYA (no solo clientes con
// billetera). El service filtra por la ciudad de la sucursal activa.

export const buscarUsuariosQuerySchema = z.object({
  // `q` opcional: sin término lista todos los usuarios de la ciudad (lo usa el
  // modal de "Compartir oferta" con limit alto para poder "Seleccionar todos").
  q: z
    .string()
    .trim()
    .max(100, 'La búsqueda no puede exceder 100 caracteres')
    .optional()
    .default(''),
  limit: z.coerce.number().int().min(1).max(500).optional().default(10),
});

export type BuscarUsuariosQueryInput = z.infer<typeof buscarUsuariosQuerySchema>;

// =============================================================================
// SCHEMA: COMPARTIR OFERTA POR CHATYA
// =============================================================================
// Para: POST /api/ofertas/:id/compartir-chatya
//
// Comparte una oferta PÚBLICA por ChatYA a usuarios del directorio comercial
// (usuarios de la ciudad de la sucursal). No aplica a cupones (esos se asignan).

export const compartirOfertaSchema = z.object({
  usuariosIds: z
    .array(campoUUID)
    .min(1, 'Debes seleccionar al menos un usuario')
    .max(500, 'No puedes compartir a más de 500 usuarios a la vez'),
});

export type CompartirOfertaInput = z.infer<typeof compartirOfertaSchema>;

// =============================================================================
// SCHEMA 6: VALIDAR CÓDIGO DE DESCUENTO
// =============================================================================
// Para: GET /api/ofertas/validar/:codigo

export const validarCodigoSchema = z.object({
  codigo: z
    .string()
    .min(1, 'El código es requerido')
    .max(50, 'El código no puede exceder 50 caracteres')
    .transform((val) => val.toUpperCase().trim()),
  clienteId: campoUUID,
});

export type ValidarCodigoInput = z.infer<typeof validarCodigoSchema>;

// =============================================================================
// SCHEMA 7: BUSCAR OFERTAS (búsqueda completa con filtros + orden + paginado)
// =============================================================================
// Para: GET /api/ofertas/buscar
//
// Calcado de `buscarServiciosQuerySchema` de servicios. Diferencias:
//   - Solo filtro `tipo` (no hay modo/modalidad/categoria propios).
//   - Sin lat/lng/distanciaMaxKm: las ofertas no tienen ubicación propia
//     (la sucursal sí, pero la oferta no — el feed se filtra por ciudad).
//   - `ordenar` solo permite 'recientes' (por la misma razón).

export const buscarOfertasQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  ciudad: z
    .string()
    .trim()
    .min(2, 'La ciudad es obligatoria')
    .max(100, 'La ciudad no puede exceder 100 caracteres'),
  tipo: campoTipo.optional(),
  ordenar: z.enum(['recientes']).optional().default('recientes'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type BuscarOfertasQueryInput = z.infer<typeof buscarOfertasQuerySchema>;

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  crearOfertaSchema,
  actualizarOfertaSchema,
  duplicarOfertaSchema,
  filtrosFeedSchema,
  asignarOfertaSchema,
  buscarUsuariosQuerySchema,
  compartirOfertaSchema,
  validarCodigoSchema,
  buscarOfertasQuerySchema,
  formatearErroresZod,
};