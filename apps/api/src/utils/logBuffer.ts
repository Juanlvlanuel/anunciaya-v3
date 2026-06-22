/**
 * logBuffer.ts
 * =============
 * Captura en memoria de los últimos logs del backend para la "Ventana de logs
 * recientes" del módulo Mantenimiento (Panel Admin).
 *
 * Cómo funciona: al arrancar, `inicializarCapturaLogs()` envuelve `console.log/
 * info/warn/error` para empujar cada mensaje a un buffer circular y luego seguir
 * llamando al `console` original (no cambia el comportamiento de los logs en
 * stdout/Render). El buffer guarda como mucho `CAPACIDAD` entradas.
 *
 * Es VOLÁTIL a propósito (en memoria): se pierde en cada redeploy/reinicio y solo
 * cubre la instancia actual. Suficiente para staging/beta. La persistencia (tabla
 * `sistema_logs`) queda como backlog del módulo.
 *
 * Ubicación: apps/api/src/utils/logBuffer.ts
 */

export type NivelLog = 'info' | 'warn' | 'error';

export interface EntradaLog {
    ts: string;
    nivel: NivelLog;
    mensaje: string;
}

/** Máximo de entradas retenidas en memoria. */
const CAPACIDAD = 500;

/** Largo máximo de un mensaje (recorta líneas enormes como stacks gigantes). */
const MAX_LARGO_MENSAJE = 2000;

const buffer: EntradaLog[] = [];
let capturando = false;

/** Convierte los argumentos variados de un `console.*` a un solo string legible. */
function formatearArgs(args: unknown[]): string {
    return args
        .map((a) => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return a.stack ?? a.message;
            try {
                return JSON.stringify(a);
            } catch {
                return String(a);
            }
        })
        .join(' ');
}

/** Empuja una entrada al buffer; nunca lanza (no debe romper un `console.*` real). */
function empujar(nivel: NivelLog, args: unknown[]): void {
    try {
        buffer.push({
            ts: new Date().toISOString(),
            nivel,
            mensaje: formatearArgs(args).slice(0, MAX_LARGO_MENSAJE),
        });
        if (buffer.length > CAPACIDAD) buffer.splice(0, buffer.length - CAPACIDAD);
    } catch {
        /* la captura nunca debe interferir con el log original */
    }
}

/**
 * Envuelve `console.log/info/warn/error` para capturar en memoria. Idempotente:
 * si ya está activa, no hace nada. Llamar una sola vez al arranque del servidor.
 */
export function inicializarCapturaLogs(): void {
    if (capturando) return;
    capturando = true;

    const origLog = console.log.bind(console);
    const origInfo = console.info.bind(console);
    const origWarn = console.warn.bind(console);
    const origError = console.error.bind(console);

    console.log = (...args: unknown[]) => {
        empujar('info', args);
        origLog(...args);
    };
    console.info = (...args: unknown[]) => {
        empujar('info', args);
        origInfo(...args);
    };
    console.warn = (...args: unknown[]) => {
        empujar('warn', args);
        origWarn(...args);
    };
    console.error = (...args: unknown[]) => {
        empujar('error', args);
        origError(...args);
    };
}

/** Vacía el buffer de logs en memoria (útil para reproducir un escenario limpio). */
export function vaciarLogs(): void {
    buffer.length = 0;
}

/**
 * Devuelve las entradas capturadas, las más recientes primero. Filtra por nivel
 * si se indica y limita la cantidad (tope `CAPACIDAD`).
 */
export function obtenerLogs(opciones?: { nivel?: NivelLog; limite?: number }): EntradaLog[] {
    let entradas = buffer;
    if (opciones?.nivel) {
        entradas = entradas.filter((e) => e.nivel === opciones.nivel);
    }
    const limite = Math.min(opciones?.limite ?? CAPACIDAD, CAPACIDAD);
    return entradas.slice(-limite).reverse();
}
