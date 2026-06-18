/**
 * validations/admin/recibos.schema.ts
 * ===================================
 * Schema Zod del body para reenviar un recibo por correo (módulo Recibos del Panel).
 *
 * Ubicación: apps/api/src/validations/admin/recibos.schema.ts
 */

import { z } from 'zod';

/** Reenvío del comprobante a 1+ destinatarios (independiente del correo del negocio). */
export const reenviarReciboSchema = z.object({
    correos: z
        .array(z.string().trim().email('Hay un correo con formato inválido.'))
        .min(1, 'Indica al menos un correo.')
        .max(10, 'Máximo 10 correos por reenvío.'),
});

export type ReenviarReciboInput = z.infer<typeof reenviarReciboSchema>;
