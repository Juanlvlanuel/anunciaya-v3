/**
 * admin/crons-preview.service.ts
 * ===============================
 * "Preview" de las tareas programadas: cuántos registros procesaría cada cron si
 * se ejecutara AHORA, sin actuar. Lo consume el diálogo de confirmación del Panel
 * para que el SuperAdmin vea qué va a tocar antes de ejecutar.
 *
 * Cada `contar()` reutiliza la MISMA condición que la función de ejecución del
 * cron (definidas en sus services de dominio), así que el número no se desincroniza.
 *
 * Ubicación: apps/api/src/services/admin/crons-preview.service.ts
 */

import { contarGraciasVencidas } from '../suscripciones/gracia.js';
import { contarManualesVencidos } from '../suscripciones/vencimientos-manuales.js';
import { contarExpiradosServicios } from '../servicios/expiracion.js';
import { contarExpiradosMarketplace } from '../marketplace/expiracion.js';
import { contarTurnosACerrar } from '../scanya-cierre-auto.service.js';
import { contarConversacionesInactivas } from '../../cron/chatya.cron.js';
import { obtenerNegociosActivos } from '../alertas-motor.service.js';

export interface PreviewCron {
    candidatos: number;
    descripcion: string;
}

interface DefPreview {
    contar: () => Promise<number>;
    /** Texto según el conteo (n=0 → mensaje de "nada que hacer"). */
    describir: (n: number) => string;
}

const PREVIEWS: Record<string, DefPreview> = {
    'suscripciones-gracia': {
        contar: contarGraciasVencidas,
        describir: (n) =>
            n === 0
                ? 'No hay negocios con periodo de gracia vencido.'
                : `Suspenderá ${n} negocio${n === 1 ? '' : 's'} con periodo de gracia vencido.`,
    },
    'vencimientos-manuales': {
        contar: contarManualesVencidos,
        describir: (n) =>
            n === 0
                ? 'No hay membresías manuales vencidas.'
                : `Pasará a gracia ${n} negocio${n === 1 ? '' : 's'} manual${n === 1 ? '' : 'es'} con membresía vencida.`,
    },
    'servicios-expiracion': {
        contar: contarExpiradosServicios,
        describir: (n) =>
            n === 0
                ? 'No hay publicaciones de Servicios vencidas.'
                : `Pausará ${n} publicación${n === 1 ? '' : 'es'} de Servicios vencida${n === 1 ? '' : 's'}.`,
    },
    'marketplace-expiracion': {
        contar: contarExpiradosMarketplace,
        describir: (n) =>
            n === 0
                ? 'No hay artículos de MarketPlace vencidos.'
                : `Pausará ${n} artículo${n === 1 ? '' : 's'} de MarketPlace vencido${n === 1 ? '' : 's'} y avisará a sus dueños.`,
    },
    scanya: {
        contar: contarTurnosACerrar,
        describir: (n) =>
            n === 0
                ? 'No hay turnos de ScanYA colgados por cerrar.'
                : `Cerrará ${n} turno${n === 1 ? '' : 's'} de ScanYA colgado${n === 1 ? '' : 's'}.`,
    },
    chatya: {
        contar: contarConversacionesInactivas,
        describir: (n) =>
            n === 0
                ? 'No hay conversaciones inactivas por limpiar.'
                : `Borrará ${n} conversación${n === 1 ? '' : 'es'} inactiva${n === 1 ? '' : 's'} (más de 6 meses) y sus archivos.`,
    },
    alertas: {
        contar: async () => (await obtenerNegociosActivos()).length,
        describir: (n) =>
            n === 0
                ? 'No hay negocios activos que revisar.'
                : `Revisará ${n} negocio${n === 1 ? '' : 's'} activo${n === 1 ? '' : 's'} y generará o actualizará sus alertas.`,
    },
};

/** Devuelve el preview de un cron, o null si el id no existe. */
export async function obtenerPreviewCron(id: string): Promise<PreviewCron | null> {
    const def = PREVIEWS[id];
    if (!def) return null;
    const candidatos = await def.contar();
    return { candidatos, descripcion: def.describir(candidatos) };
}
