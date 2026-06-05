/**
 * tema.ts
 * ========
 * Manejo del tema claro/oscuro del Panel. El tema se aplica con el atributo
 * `data-tema` en <html> y se persiste en localStorage (clave propia del Panel).
 *
 * Ubicación: apps/admin/src/utils/tema.ts
 */

export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'ayadmin_tema';

/**
 * Lee el tema guardado; si no hay preferencia guardada, abre en CLARO.
 * El claro es el diseño principal del Panel (fondo celeste + tarjeta blanca);
 * el oscuro queda disponible con el toggle.
 */
export function obtenerTema(): Tema {
  const guardado = localStorage.getItem(CLAVE_TEMA);
  if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  return 'claro';
}

/** Aplica un tema a <html> y lo persiste. */
export function aplicarTema(tema: Tema): void {
  document.documentElement.setAttribute('data-tema', tema);
  localStorage.setItem(CLAVE_TEMA, tema);
}

/** Aplica el tema inicial al cargar la app (antes del primer render). */
export function aplicarTemaInicial(): void {
  document.documentElement.setAttribute('data-tema', obtenerTema());
}

/** Alterna entre claro y oscuro, devuelve el tema resultante. */
export function alternarTema(): Tema {
  const actual = document.documentElement.getAttribute('data-tema');
  const siguiente: Tema = actual === 'oscuro' ? 'claro' : 'oscuro';
  aplicarTema(siguiente);
  return siguiente;
}
