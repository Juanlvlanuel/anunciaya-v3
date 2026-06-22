/**
 * cronRegistry.ts
 * ================
 * Registro central de las tareas programadas (crons) para el bloque "Tareas
 * programadas" del módulo Mantenimiento (Panel Admin).
 *
 * Combina dos cosas:
 *  - CATÁLOGO estático: qué crons existen, su descripción y su cadencia legible.
 *  - TELEMETRÍA en vivo: cada cron llama a `registrarEjecucionCron()` al terminar,
 *    dejando su última corrida (timestamp, duración, ok/error, resumen).
 *
 * La telemetría es VOLÁTIL (en memoria): se pierde en cada redeploy/reinicio.
 * Consistente con la ventana de logs; la persistencia queda como backlog.
 *
 * Solo se listan los crons REALMENTE activos (los que `index.ts` inicializa). El
 * cron de comisiones ("foto mensual") se retiró, por eso no aparece aquí.
 *
 * Ubicación: apps/api/src/utils/cronRegistry.ts
 */

export interface DefCron {
    id: string;
    nombre: string;
    descripcion: string;
    /** Cadencia en lenguaje de persona (ej. "Cada 6 h"). */
    cadencia: string;
    /** Cadencia en ms si es un intervalo fijo; permite estimar la próxima corrida. */
    cadenciaMs?: number;
}

export interface EstadoCron extends DefCron {
    ultimaEjecucion: string | null;
    duracionMs: number | null;
    /** true = ok, false = error, null = aún no ha corrido en esta instancia. */
    ok: boolean | null;
    resultado: string | null;
    /** Estimada solo para crons de intervalo fijo con al menos una corrida. */
    proximaEstimada: string | null;
}

const MIN = 60 * 1000;
const HORA = 60 * MIN;

/** Catálogo de los 7 crons activos (mismo orden en que los arranca index.ts). */
export const CATALOGO_CRONS: DefCron[] = [
    {
        id: 'chatya',
        nombre: 'Limpieza de ChatYA',
        descripcion: 'Borra conversaciones inactivas y sus archivos huérfanos.',
        cadencia: 'Diario ~3:00 AM',
    },
    {
        id: 'alertas',
        nombre: 'Detección de alertas',
        descripcion: 'Genera alertas operativas para los negocios.',
        cadencia: 'Diario ~4:00 AM + lunes 5:00 AM',
    },
    {
        id: 'scanya',
        nombre: 'Cierre de turnos ScanYA',
        descripcion: 'Cierra automáticamente los turnos colgados.',
        cadencia: 'Cada 30 min',
        cadenciaMs: 30 * MIN,
    },
    {
        id: 'marketplace-expiracion',
        nombre: 'Expiración de MarketPlace',
        descripcion: 'Auto-pausa artículos vencidos y avisa de próximos a vencer.',
        cadencia: 'Cada 6 h',
        cadenciaMs: 6 * HORA,
    },
    {
        id: 'servicios-expiracion',
        nombre: 'Expiración de Servicios',
        descripcion: 'Auto-pausa las publicaciones de Servicios vencidas.',
        cadencia: 'Cada 6 h',
        cadenciaMs: 6 * HORA,
    },
    {
        id: 'suscripciones-gracia',
        nombre: 'Gracia de membresías',
        descripcion: 'Suspende negocios cuyo periodo de gracia ya venció.',
        cadencia: 'Cada 24 h',
        cadenciaMs: 24 * HORA,
    },
    {
        id: 'vencimientos-manuales',
        nombre: 'Vencimientos manuales',
        descripcion: 'Pasa a gracia los negocios manuales con membresía vencida.',
        cadencia: 'Cada 24 h',
        cadenciaMs: 24 * HORA,
    },
];

interface Telemetria {
    ultimaEjecucion: string;
    duracionMs: number;
    ok: boolean;
    resultado: string;
}

const telemetria = new Map<string, Telemetria>();

/**
 * Registra el resultado de una corrida de cron. La llaman los propios crons al
 * terminar (tanto en el camino feliz como en el catch).
 */
export function registrarEjecucionCron(
    id: string,
    datos: { ok: boolean; duracionMs: number; resultado: string },
): void {
    telemetria.set(id, {
        ultimaEjecucion: new Date().toISOString(),
        duracionMs: datos.duracionMs,
        ok: datos.ok,
        resultado: datos.resultado,
    });
}

/** Une catálogo + telemetría y estima la próxima corrida cuando es posible. */
export function obtenerEstadoCrons(): EstadoCron[] {
    return CATALOGO_CRONS.map((def) => {
        const t = telemetria.get(def.id);
        let proximaEstimada: string | null = null;
        if (t && def.cadenciaMs) {
            proximaEstimada = new Date(
                new Date(t.ultimaEjecucion).getTime() + def.cadenciaMs,
            ).toISOString();
        }
        return {
            ...def,
            ultimaEjecucion: t?.ultimaEjecucion ?? null,
            duracionMs: t?.duracionMs ?? null,
            ok: t?.ok ?? null,
            resultado: t?.resultado ?? null,
            proximaEstimada,
        };
    });
}
