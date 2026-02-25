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
let listeners: Array<(marcas: Marca[]) => void> = [];

/** Inicia una nueva sesión de medición (se llama al cambiar de chat) */
export function diagInicio() {
  sesionActual = { inicio: performance.now(), marcas: [] };
}

/** Agrega una marca de tiempo con nombre descriptivo */
export function diagMarca(nombre: string) {
  if (!sesionActual) return;
  sesionActual.marcas.push({
    nombre,
    tiempo: Math.round(performance.now() - sesionActual.inicio),
  });
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