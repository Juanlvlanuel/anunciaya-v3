/**
 * Input.tsx
 * ==========
 * Campo de texto reutilizable con label, iconos, validación visual y errores.
 *
 * ¿Qué hace?
 * - Muestra label siempre visible
 * - Puede tener icono a la izquierda
 * - Validación visual: verde (válido), rojo (inválido), neutral (sin validar)
 * - Muestra mensajes de error debajo
 * - Para contraseñas: botón para mostrar/ocultar
 * - Soporte para onBlur (validación al perder foco)
 *
 * Uso:
 *   <Input
 *     label="Correo Electrónico"
 *     type="email"
 *     placeholder="tu@email.com"
 *     icono={<Mail />}
 *     isValid={validacion.correo}
 *     onBlur={handleBlur('correo')}
 *     error="Ingresa un correo válido"
 *   />
 *
 * Ubicación: apps/web/src/components/ui/Input.tsx
 */

import { InputHTMLAttributes, ReactNode, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Etiqueta del campo */
  label?: string;
  /** Mensaje de error (se muestra cuando isValid es false) */
  error?: string;
  /** Icono a la izquierda */
  icono?: ReactNode;
  /** Elemento a la derecha (ej: botón adicional) */
  elementoDerecha?: ReactNode;
  /** Texto de ayuda debajo del input */
  ayuda?: string;
  /** Estado de validación: true (válido/verde), false (inválido/rojo), null (neutral) */
  isValid?: boolean | null;
  /** Tamaño del input */
  tamaño?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Genera un ID válido a partir del label
 * Ej: "Correo Electrónico" → "input-correo-electronico"
 */
const generarIdDesdeLabel = (label: string): string => {
  return 'input-' + label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')    // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-')            // Espacios → guiones
    .replace(/-+/g, '-')             // Múltiples guiones → uno solo
    .trim();
};

// =============================================================================
// CONSTANTES
// =============================================================================

const tamaños = {
  sm: 'py-2 text-sm',
  md: 'py-2.5 text-sm',
  lg: 'py-3 text-base',
};

const tamañosLabel = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icono,
      elementoDerecha,
      ayuda,
      type = 'text',
      isValid = null,
      tamaño = 'md',
      className = '',
      disabled,
      id,
      name,
      ...props
    },
    ref
  ) => {
    // Estado para mostrar/ocultar contraseña
    const [mostrarPassword, setMostrarPassword] = useState(false);

    // ¿Es campo de contraseña?
    const esPassword = type === 'password';

    // Tipo real del input (para toggle de password)
    const tipoReal = esPassword ? (mostrarPassword ? 'text' : 'password') : type;

    // ¿Tiene elemento a la derecha? (botón password o elementoDerecha)
    const tieneElementoDerecha = esPassword || elementoDerecha;

    // -------------------------------------------------------------------------
    // Auto-generar id y name si no se proporcionan
    // -------------------------------------------------------------------------
    const inputId = id || (label ? generarIdDesdeLabel(label) : undefined);
    const inputName = name || inputId;

    // -------------------------------------------------------------------------
    // Clases dinámicas
    // -------------------------------------------------------------------------
    const getInputClasses = () => {
      const base = `
        w-full px-4 ${tamaños[tamaño]}
        bg-slate-50 border-2 rounded-xl
        font-medium
        placeholder-slate-400
        transition-all duration-150
        focus:outline-none focus:bg-white
        disabled:opacity-50 disabled:cursor-not-allowed
      `;

      const conIcono = icono ? 'pl-10' : '';
      const conDerecha = tieneElementoDerecha ? 'pr-10' : '';

      // Estilos según estado de validación
      let estadoClasses = '';
      if (isValid === null) {
        estadoClasses = 'border-slate-200 focus:border-blue-500';
      } else if (isValid === true) {
        estadoClasses = 'border-green-500 bg-green-50';
      } else {
        estadoClasses = 'border-red-500 bg-red-50';
      }

      return `${base} ${conIcono} ${conDerecha} ${estadoClasses} ${className}`.trim();
    };

    const getIconoClasses = () => {
      if (isValid === null) return 'text-slate-400';
      if (isValid === true) return 'text-green-500';
      return 'text-red-500';
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
      <div className="w-full">
        {/* Label - asociado al input con htmlFor */}
        {label && (
          <label
            htmlFor={inputId}
            className={`block ${tamañosLabel[tamaño]} font-semibold text-slate-600 mb-1.5`}
          >
            {label}
          </label>
        )}

        {/* Contenedor del input */}
        <div className="relative">
          {/* Icono izquierda */}
          {icono && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${getIconoClasses()}`}
            >
              {icono}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            name={inputName}
            type={tipoReal}
            disabled={disabled}
            className={getInputClasses()}
            {...props}
          />

          {/* Botón mostrar/ocultar contraseña */}
          {esPassword && (
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}

          {/* Elemento derecha personalizado (si no es password) */}
          {!esPassword && elementoDerecha && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {elementoDerecha}
            </div>
          )}
        </div>

        {/* Mensaje de error */}
        {isValid === false && error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}

        {/* Texto de ayuda (solo si no hay error) */}
        {ayuda && isValid !== false && (
          <p className="mt-1 text-xs text-slate-500">{ayuda}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;