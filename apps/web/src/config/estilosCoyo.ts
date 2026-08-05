/**
 * estilosCoyo.ts
 * ================
 * Estilos visuales compartidos del ícono de Coyo (Navbar, BottomNav, panel
 * del Asistente) — evita repetir el mismo valor 3 veces.
 *
 * Ubicación: apps/web/src/config/estilosCoyo.ts
 */

/**
 * Contorno blanco fino sobre la SILUETA del ícono de Coyo (sigue el canal
 * alfa del PNG/WebP mediante `drop-shadow` con blur pequeño, no offsets
 * duros) — para que no se pierda contra fondos oscuros/de color, sin verse
 * como un círculo o anillo grueso.
 */
export const FILTRO_CONTORNO_COYO =
  'drop-shadow(0 0 1.1px white) drop-shadow(0 0 1.1px white) drop-shadow(0 0 1.1px white) drop-shadow(0 0 1.1px white)';
