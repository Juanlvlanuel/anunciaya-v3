/**
 * TituloDeBloque.tsx
 * ===================
 * Título estandarizado para encabezar cada bloque del feed editorial.
 *
 * Estructura (Prompt 5 + ajustes):
 *  - Icono cuadrado negro a la izquierda (opcional, solo si `iconoLucide`).
 *    Hace un único `pulse-once` al renderizar (animación de entrada).
 *  - Bloque de texto: TÍTULO grande arriba, underline ámbar animado
 *    (crece de 0 a 48px en 600ms al renderizar), EYEBROW chico debajo en
 *    `text-amber-400/80` (color de marca de Ofertas).
 *  - Indicador "AUTO" opcional alineado a la derecha (puntito ámbar
 *    pulsando + texto uppercase).
 *
 * Las animaciones son ENTRADAS (one-shot) para que el header se sienta
 * "vivo" sin caer en estética caricaturesca (TOKENS Regla 13).
 *
 * Ubicación: apps/web/src/components/ofertas/TituloDeBloque.tsx
 */

import { useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

interface TituloDeBloqueProps {
  eyebrow: string;
  titulo: string;
  /** Ícono Lucide opcional. Si se pasa, se renderiza un cuadrado negro
   *  con el ícono blanco adentro a la izquierda del título. */
  iconoLucide?: LucideIcon;
  /** Si true, muestra el indicador "AUTO" (puntito pulsando) a la derecha. */
  indicadorAuto?: boolean;
  /** Variante visual.
   *  - 'normal' (default): tamaño estándar para carruseles y lista densa.
   *  - 'destacado': icono + título + underline más grandes para las 2
   *    zonas privilegiadas del feed (Hero "Hoy te recomendamos" y
   *    "Destacado" del par superior). */
  variante?: 'normal' | 'destacado';
  /** Override del ancho del underline ámbar. Por defecto se calcula según
   *  `variante`. Útil cuando un título corto (ej. "Esta semana") luce
   *  desproporcionado con el underline normal de 180px. */
  anchoUnderline?: 'corto' | 'normal';
}

// =============================================================================
// ESTILOS GLOBALES (inyectados una sola vez al montar)
// =============================================================================

const STYLES_ID = 'titulo-bloque-styles';
const STYLES_CSS = `
@keyframes titulo-bloque-pulse-once {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes titulo-bloque-underline-expand {
  from { width: 0; opacity: 0; }
  to   { width: 180px; opacity: 1; }
}
@keyframes titulo-bloque-underline-expand-corto {
  from { width: 0; opacity: 0; }
  to   { width: 110px; opacity: 1; }
}
@keyframes titulo-bloque-underline-expand-lg {
  from { width: 0; opacity: 0; }
  to   { width: 240px; opacity: 1; }
}
.titulo-bloque-icono {
  animation: titulo-bloque-pulse-once 700ms ease-out 1;
}
.titulo-bloque-underline {
  display: block;
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f59e0b 0%, rgba(245,158,11,0) 100%);
  animation: titulo-bloque-underline-expand 600ms ease-out 100ms forwards;
  /* width inicial 0, crece por la animación */
  width: 0;
}
.titulo-bloque-underline--lg {
  height: 5px;
  border-radius: 5px;
  animation: titulo-bloque-underline-expand-lg 700ms ease-out 100ms forwards;
}
.titulo-bloque-underline--corto {
  animation: titulo-bloque-underline-expand-corto 600ms ease-out 100ms forwards;
}
@media (prefers-reduced-motion: reduce) {
  .titulo-bloque-icono { animation: none; }
  .titulo-bloque-underline {
    animation: none;
    width: 180px;
    opacity: 1;
  }
  .titulo-bloque-underline--corto {
    animation: none;
    width: 110px;
    opacity: 1;
  }
  .titulo-bloque-underline--lg {
    animation: none;
    width: 240px;
    opacity: 1;
  }
}
`;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function TituloDeBloque({
  eyebrow,
  titulo,
  iconoLucide: IconoLucide,
  indicadorAuto: _indicadorAuto = false,
  variante = 'normal',
  anchoUnderline,
}: TituloDeBloqueProps) {
  const slug = useMemo(() => slugify(eyebrow), [eyebrow]);

  // Inyecta o actualiza los keyframes en `<head>`. Si el `<style>` ya
  // existe (otra instancia o HMR previo), sobrescribimos el textContent
  // — antes solo se inyectaba la primera vez, lo cual hacía que cambios
  // al CSS durante HMR no se reflejaran sin hard refresh.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(STYLES_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLES_ID;
      document.head.appendChild(style);
    }
    if (style.textContent !== STYLES_CSS) {
      style.textContent = STYLES_CSS;
    }
  }, []);

  const esDestacado = variante === 'destacado';

  // Clases responsivas por variante
  const iconoBoxClasses = esDestacado
    ? 'w-9 h-9 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11'
    : 'w-7 h-7 lg:w-8 lg:h-8';
  const iconoSizeClasses = esDestacado
    ? 'w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5'
    : 'w-3.5 h-3.5 lg:w-4 lg:h-4';
  const tituloClasses = esDestacado
    ? 'text-xl lg:text-2xl 2xl:text-3xl font-extrabold text-[#1a1a1a] leading-tight tracking-tight'
    : 'text-base lg:text-lg 2xl:text-xl font-bold text-[#1a1a1a] leading-tight tracking-tight';
  const underlineClasses = [
    'titulo-bloque-underline',
    esDestacado ? 'titulo-bloque-underline--lg' : '',
    // El modificador `--corto` solo aplica a la variante normal: si
    // `destacado` ya usa el underline grande (240px), no tiene sentido
    // acortarlo.
    !esDestacado && anchoUnderline === 'corto'
      ? 'titulo-bloque-underline--corto'
      : '',
    esDestacado ? 'mt-1.5' : 'mt-1',
  ]
    .filter(Boolean)
    .join(' ');
  // Subtítulo (eyebrow) en Title Case — más grande, al lado derecho del
  // título, sin uppercase. La capitalización ya viene desde el padre.
  const eyebrowClasses = esDestacado
    ? 'text-lg lg:text-xl 2xl:text-2xl text-amber-600 font-semibold tracking-tight whitespace-nowrap'
    : 'text-base lg:text-lg 2xl:text-xl text-amber-600 font-semibold tracking-tight whitespace-nowrap';

  // `key` cambia cuando cambia el slug → fuerza remount → animación
  // se reproduce de nuevo cuando cambia el bloque (ej. al filtrar chip).
  return (
    <div
      key={slug}
      data-testid={`titulo-bloque-${slug}`}
      className={[
        'flex items-center mb-3 lg:mb-4',
        esDestacado ? 'gap-3' : 'gap-2.5',
      ].join(' ')}
    >
      {IconoLucide && (
        <div
          className={[
            // Ring ámbar grueso aplicado a TODAS las variantes (antes solo
            // estaba en destacado). Da identidad consistente a los íconos
            // cuadrados negros de los titulos del feed.
            'titulo-bloque-icono bg-[#1a1a1a] rounded-lg flex items-center justify-center shrink-0 shadow-md ring-[3px] ring-amber-400/40',
            iconoBoxClasses,
          ].join(' ')}
        >
          <IconoLucide
            className={`text-white ${iconoSizeClasses}`}
            strokeWidth={2}
          />
        </div>
      )}

      {/* Título + underline (a la izquierda, toma el espacio restante) */}
      <div className="flex-1 min-w-0">
        <div className={tituloClasses}>{titulo}</div>
        <span className={underlineClasses} aria-hidden="true" />
      </div>

      {/* Subtítulo al LADO DERECHO, en Title Case y más grande */}
      <div className={`shrink-0 ${eyebrowClasses}`}>{eyebrow}</div>
    </div>
  );
}
