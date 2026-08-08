/**
 * ============================================================================
 * VALIDACIONES ZOD — Sala en vivo de Dinámicas (Fase 4.1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/dinamicas-sala.schema.ts
 *
 * Config del sorteo (K/N) va en `validations/dinamicas.schema.ts` — se
 * captura en el composer al crear/editar, no aquí. Estos schemas cubren
 * solo la sala: agendarla, el chat en vivo y la moderación del organizador.
 */

import { z } from 'zod';

export const activarSalaSchema = z.object({
    salaProgramadaPara: z
        .string()
        .datetime({ message: 'Fecha de la sala inválida' })
        .refine((v) => new Date(v).getTime() > Date.now(), {
            message: 'La sala debe programarse para una fecha futura',
        }),
});

export type ActivarSalaInput = z.infer<typeof activarSalaSchema>;

export const enviarMensajeSalaSchema = z.object({
    contenido: z
        .string()
        .trim()
        .min(1, 'Escribe un mensaje')
        .max(500, 'El mensaje no puede exceder 500 caracteres'),
});

export type EnviarMensajeSalaInput = z.infer<typeof enviarMensajeSalaSchema>;

export const moderarSalaSchema = z.object({
    usuarioId: z.string().uuid('ID de usuario inválido'),
    /** silenciar/expulsar = efímero, solo esta Dinámica. bloquear/desbloquear
     *  = permanente, reusa `chat_bloqueados` (aplica a todas las futuras
     *  Dinámicas del organizador y a ChatYA directo). */
    accion: z.enum(['silenciar', 'expulsar', 'quitar-silencio', 'quitar-expulsion', 'bloquear', 'desbloquear'], {
        message: 'Acción de moderación no válida',
    }),
    motivo: z.string().trim().max(200).optional(),
});

export type ModerarSalaInput = z.infer<typeof moderarSalaSchema>;

export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}
