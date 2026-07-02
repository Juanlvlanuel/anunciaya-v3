/**
 * config/scanya.ts
 * ================
 * Configuración del subdominio de ScanYA como PWA independiente.
 *
 * ScanYA se sirve desde `s.anunciaya.mx` con el MISMO build de `apps/web`,
 * manteniendo las rutas `/scanya/*`. Al ser otro ORIGEN que `anunciaya.mx`,
 * su scope de PWA deja de solaparse con el de AnunciaYA (que es `/`), y ambas
 * apps se pueden instalar en el mismo dispositivo.
 *
 * Toda la lógica interna de ScanYA sigue detectando su contexto por la ruta
 * `/scanya` (sin cambios). Este archivo solo centraliza lo que depende del HOST.
 *
 * Ubicación: apps/web/src/config/scanya.ts
 */

/** Host donde vive la PWA de ScanYA en producción. */
export const SCANYA_HOST = 's.anunciaya.mx';

/** Origen completo del subdominio de ScanYA. */
export const SCANYA_ORIGIN = `https://${SCANYA_HOST}`;

/**
 * Hosts de producción de AnunciaYA desde donde "abrir ScanYA" debe SALTAR al
 * subdominio (navegación cross-origin). En dev/preview (localhost, *.vercel.app)
 * no aplica: ahí ScanYA se abre con navegación interna, como siempre.
 */
const HOSTS_PROD_ANUNCIAYA = ['anunciaya.mx', 'www.anunciaya.mx'];

/** True si la app corre en el subdominio de ScanYA. */
export function esHostScanYA(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === SCANYA_HOST;
}

/**
 * True si estamos en el dominio de producción de AnunciaYA, donde "abrir ScanYA"
 * debe cruzar al subdominio (otro origen) en lugar de navegar dentro de la SPA.
 */
export function debeSaltarASubdominioScanYA(): boolean {
  return typeof window !== 'undefined' && HOSTS_PROD_ANUNCIAYA.includes(window.location.hostname);
}

/**
 * Abre ScanYA desde AnunciaYA.
 * - En producción: salta al subdominio (cross-origin, navegación completa).
 * - En dev/preview: usa la navegación interna que se pasa como fallback (como hoy).
 */
export function abrirScanYA(navegacionInterna: () => void): void {
  if (debeSaltarASubdominioScanYA()) {
    window.location.href = `${SCANYA_ORIGIN}/scanya/login`;
  } else {
    navegacionInterna();
  }
}
