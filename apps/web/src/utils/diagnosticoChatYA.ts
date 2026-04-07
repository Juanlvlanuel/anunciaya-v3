/**
 * diagnosticoChatYA.ts
 * =====================
 * TEMPORAL — Utilidad de diagnóstico para medir tiempos del flujo de renderizado.
 * Eliminar después de diagnosticar.
 *
 * UBICACIÓN: apps/web/src/utils/diagnosticoChatYA.ts
 */

interface Marca {
  nombre: string;
  tiempo: number; // ms desde el inicio
}

interface Sesion {
  inicio: number;
  marcas: Marca[];
}

let sesionActual: Sesion | null = null;
let historial: Sesion[] = [];
let listeners: Array<(marcas: Marca[]) => void> = [];

/** Inicia una nueva sesión de medición (se llama al cambiar de chat) */
export function diagInicio() {
  // Guardar sesión anterior en historial
  if (sesionActual && sesionActual.marcas.length > 0) {
    historial.push(sesionActual);
  }
  sesionActual = { inicio: performance.now(), marcas: [] };
}

/** Agrega una marca de tiempo con nombre descriptivo */
export function diagMarca(nombre: string) {
  if (!sesionActual) return;
  const tiempo = Math.round(performance.now() - sesionActual.inicio);
  sesionActual.marcas.push({ nombre, tiempo });
  // Imprimir en consola cuando el monitor está activo
  if (typeof window !== 'undefined' && (window as any).__PERF_BS__) {
    console.log(`%c[ChatYA] %c${nombre} %c→ ${tiempo}ms`, 'color:#10b981;font-weight:bold', 'color:#e2e8f0', 'color:#facc15;font-weight:bold');
  }
  // Notificar al overlay
  listeners.forEach((fn) => fn([...sesionActual!.marcas]));
}

/** Suscribirse a cambios (para el overlay visual) */
export function diagSuscribir(fn: (marcas: Marca[]) => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/** Obtener marcas actuales */
export function diagObtenerMarcas(): Marca[] {
  return sesionActual?.marcas ?? [];
}

/** Obtener todas las sesiones registradas (para el reporte descargable) */
export function diagObtenerHistorial(): Array<{ inicio: number; marcas: Marca[] }> {
  // Incluir sesión actual si tiene marcas
  const todas = [...historial];
  if (sesionActual && sesionActual.marcas.length > 0) {
    todas.push(sesionActual);
  }
  return todas;
}

/** Limpiar historial */
export function diagLimpiar() {
  historial = [];
  sesionActual = null;
}
