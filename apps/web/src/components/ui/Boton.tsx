/**
 * Boton.tsx
 * ==========
 * Botón reutilizable con variantes, tamaños y estado de carga.
 *
 * ¿Qué hace?
 * - Muestra diferentes estilos según la variante
 * - Cuando está cargando: muestra spinner y se deshabilita
 * - Previene doble clic automáticamente
 * - Soporte para iconos a izquierda/derecha
 *
 * Uso:
 *   <Boton onClick={handleClick}>Guardar</Boton>
 *   <Boton variante="secundario" cargando={enviando}>Enviar</Boton>
 *   <Boton variante="danger" iconoIzquierda={<Trash />}>Eliminar</Boton>
 *
 * Ubicación: apps/web/src/components/ui/Boton.tsx
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

// =============================================================================
// TIPOS
// =============================================================================

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Contenido del botón */
  children: ReactNode;
  /** Variante visual */
  variante?: 'primario' | 'secundario' | 'outline' | 'outlineGray' | 'ghost' | 'danger' | 'success';
  /** Tamaño del botón */
  tamanio?: 'sm' | 'md' | 'lg';
  /** ¿Está cargando? Muestra spinner y deshabilita */
  cargando?: boolean;
  /** ¿Ocupar todo el ancho? */
  fullWidth?: boolean;
  /** Icono a la izquierda */
  iconoIzquierda?: ReactNode;
  /** Icono a la derecha */
  iconoDerecha?: ReactNode;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Estilos base compartidos por todas las variantes
 */
const estilosBase = `
  inline-flex items-center justify-center gap-2
  font-bold rounded-xl
  transition-all duration-150
  focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
`;

/**
 * Estilos por variante (SIN focus rings - solo efectos sutiles)
 */
const variantes = {
  primario: `
    bg-linear-to-r from-slate-700 to-slate-800 text-white
    shadow-lg shadow-slate-700/30
    hover:shadow-slate-700/40 hover:from-slate-800 hover:to-slate-900
    active:shadow-slate-700/50 active:scale-[0.98]
  `,
  secundario: `
    bg-slate-200 text-slate-700
    hover:bg-slate-300
    active:bg-slate-400
  `,
  outline: `
    border-2 border-blue-700 text-blue-700 bg-transparent
    hover:bg-blue-100 hover:border-blue-800
    active:bg-blue-200
  `,
  outlineGray: `
    border-2 border-slate-300 text-slate-600 bg-transparent
    hover:bg-slate-100 hover:border-slate-400
    active:bg-slate-200
  `,
  ghost: `
    text-slate-600 bg-transparent
    hover:bg-slate-100
    active:bg-slate-200
  `,
  danger: `
    bg-gradient-to-r from-red-700 to-red-900 text-white
    shadow-lg shadow-red-800/30
    hover:shadow-red-800/40 hover:from-red-800 hover:to-red-950
    active:shadow-red-800/50 active:scale-[0.98]
  `,
  success: `
    bg-gradient-to-r from-emerald-700 to-emerald-900 text-white
    shadow-lg shadow-emerald-800/30
    hover:shadow-emerald-800/40 hover:from-emerald-800 hover:to-emerald-950
    active:shadow-emerald-800/50 active:scale-[0.98]
  `,
};

/**
 * Estilos por tamaño
 */
const tamanios = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function Boton({
  children,
  variante = 'primario',
  tamanio = 'md',
  cargando = false,
  fullWidth = false,
  iconoIzquierda,
  iconoDerecha,
  disabled,
  className = '',
  ...props
}: BotonProps) {
  const estaDeshabilitado = disabled || cargando;

  // Determinar color del spinner según variante
  const spinnerColor =
    variante === 'primario' || variante === 'danger' || variante === 'success'
      ? 'white'
      : 'gray';

  return (
    <button
      className={`
        ${estilosBase}
        ${variantes[variante]}
        ${tamanios[tamanio]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
      disabled={estaDeshabilitado}
      {...props}
    >
      {/* Spinner cuando está cargando */}
      {cargando && <Spinner tamanio="sm" color={spinnerColor} />}

      {/* Icono izquierda (oculto si está cargando) */}
      {!cargando && iconoIzquierda && <span>{iconoIzquierda}</span>}

      {/* Contenido */}
      <span>{children}</span>

      {/* Icono derecha */}
      {iconoDerecha && <span>{iconoDerecha}</span>}
    </button>
  );
}

export default Boton;