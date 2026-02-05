/**
 * TecladoNumerico.tsx
 * ====================
 * Teclado numérico para ingresar PIN de 4 dígitos.
 *
 * Características:
 * - Botones grandes táctiles (optimizado para tablets)
 * - Muestra los dígitos como círculos (●)
 * - Botón borrar (⌫)
 * - Botón confirmar (✓)
 * - Vibración táctil en dispositivos compatibles
 *
 * Ubicación: apps/web/src/components/scanya/TecladoNumerico.tsx
 */

import { useState, useEffect } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

interface TecladoNumericoProps {
  /** Callback cuando se completan los 4 dígitos y se presiona ✓ */
  onComplete: (pin: string) => void;
  /** Longitud del PIN (default: 4) */
  longitud?: number;
  /** Deshabilitado */
  disabled?: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const BOTONES = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['borrar', '0', 'confirmar'],
] as const;

// =============================================================================
// COMPONENTE
// =============================================================================

export function TecladoNumerico({
  onComplete,
  longitud = 4,
  disabled = false,
}: TecladoNumericoProps) {
  const [digitos, setDigitos] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // Vibración táctil (si está disponible)
  // ---------------------------------------------------------------------------
  const vibrar = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDigito = (digito: string) => {
    if (disabled || digitos.length >= longitud) return;

    vibrar();
    setDigitos([...digitos, digito]);
  };

  const handleBorrar = () => {
    if (disabled || digitos.length === 0) return;

    vibrar();
    setDigitos(digitos.slice(0, -1));
  };

  const handleConfirmar = () => {
    if (disabled || digitos.length !== longitud) return;

    vibrar();
    onComplete(digitos.join(''));
    setDigitos([]);
  };

  const handleClick = (valor: string) => {
    if (valor === 'borrar') {
      handleBorrar();
    } else if (valor === 'confirmar') {
      handleConfirmar();
    } else {
      handleDigito(valor);
    }
  };

  // ---------------------------------------------------------------------------
  // Capturar teclado físico
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está deshabilitado
      if (disabled) return;

      // ⚠️ IMPORTANTE: No capturar eventos si el usuario está escribiendo en un input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return; // Dejar que el input maneje el evento normalmente
      }

      // Capturar números (0-9)
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigito(e.key);
      }
      // Capturar Backspace como borrar
      else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBorrar();
      }
      // Capturar Enter como confirmar
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, digitos, longitud]); // Dependencias necesarias

  // ---------------------------------------------------------------------------
  // Clases dinámicas
  // ---------------------------------------------------------------------------

  const getBotonClasses = (valor: string) => {
    const base = `
      w-full h-14 lg:h-10 2xl:h-16 rounded-lg lg:rounded-lg 2xl:rounded-xl
      font-bold text-lg lg:text-base 2xl:text-xl
      transition-all duration-200
      active:scale-95
      select-none
      border cursor-pointer
    `;

    if (valor === 'borrar') {
      return disabled
        ? `${base} bg-transparent text-[#606060] cursor-not-allowed border-[#333333]`
        : `${base} text-[#A0A0A0] hover:text-white border-[#333333] hover:border-[#3B82F6] hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]`
          .replace('bg-transparent', 'bg-[rgba(0,0,0,0.3)]');
    }

    if (valor === 'confirmar') {
      const habilitado = digitos.length === longitud && !disabled;
      return habilitado
        ? `${base} bg-[#2563EB] text-white hover:bg-[#1D4ED8] border-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] `
        : `${base} bg-transparent text-[#606060] cursor-not-allowed border-[#333333]`;
    }

    // Números
    return disabled
      ? `${base} bg-transparent text-[#606060] cursor-not-allowed border-[#333333]`
      : `${base} text-white border-[rgba(255,255,255,0.15)] hover:border-[#3B82F6] hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]`
          .replace('bg-transparent', 'bg-[rgba(0,0,0,0.3)]');
  };

  const getIcono = (valor: string) => {
    if (valor === 'borrar') return '⌫';
    if (valor === 'confirmar') return '✓';
    return valor;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-[280px] lg:max-w-[220px] 2xl:max-w-[280px] mx-auto">
      {/* Display de dígitos (círculos) */}
      <div className="flex items-center justify-center gap-2.5 lg:gap-2 2xl:gap-3 mb-5 lg:mb-3 2xl:mb-6 h-10 lg:h-8 2xl:h-10">
        {Array.from({ length: longitud }).map((_, index) => (
          <div
            key={index}
            className={`
              w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5 rounded-full
              transition-all duration-200 border
              ${
                index < digitos.length
                  ? 'bg-[#2563EB] border-[#3B82F6] scale-110 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                  : 'bg-transparent border-[rgba(255,255,255,0.2)] scale-100'
              }
            `}
          />
        ))}
      </div>

      {/* Teclado */}
      <div className="grid gap-2 lg:gap-1.5 2xl:gap-2.5">
        {BOTONES.map((fila, filaIndex) => (
          <div key={filaIndex} className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2.5">
            {fila.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => handleClick(valor)}
                disabled={
                  disabled ||
                  (valor === 'confirmar' && digitos.length !== longitud)
                }
                className={getBotonClasses(valor)}
              >
                {getIcono(valor)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TecladoNumerico;