/**
 * Spinner.tsx
 * ============
 * Indicador de carga (círculo girando).
 *
 * ¿Cuándo usarlo?
 * - Dentro de botones cuando están cargando
 * - En páginas mientras cargan datos
 * - En cualquier lugar que necesite indicar "procesando"
 *
 * Uso:
 *   <Spinner />
 *   <Spinner tamanio="lg" color="white" />
 *
 * Ubicación: apps/web/src/components/ui/Spinner.tsx
 */

// =============================================================================
// TIPOS
// =============================================================================

interface SpinnerProps {
  /** Tamaño del spinner */
  tamanio?: 'sm' | 'md' | 'lg';
  /** Color del spinner */
  color?: 'primary' | 'white' | 'gray';
  /** Clase CSS adicional */
  className?: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Mapeo de tamaños a clases de Tailwind
 */
const tamanios = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-4',
};

/**
 * Mapeo de colores a clases de Tailwind
 */
const colores = {
  primary: 'border-blue-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  gray: 'border-slate-400 border-t-transparent',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function Spinner({
  tamanio = 'md',
  color = 'primary',
  className = '',
}: SpinnerProps) {
  return (
    <div
      className={`
        ${tamanios[tamanio]}
        ${colores[color]}
        rounded-full
        animate-spin
        ${className}
      `.trim()}
      role="status"
      aria-label="Cargando"
    />
  );
}

export default Spinner;