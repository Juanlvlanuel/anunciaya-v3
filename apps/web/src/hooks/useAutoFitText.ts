/**
 * ============================================================================
 * HOOK: useAutoFitText
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useAutoFitText.ts
 * 
 * PROPÓSITO:
 * Ajusta automáticamente el tamaño de fuente para que el texto llene
 * el espacio disponible sin desbordarse ni cortarse.
 * 
 * USO:
 * const { fontSize, containerRef } = useAutoFitText({
 *   text: "Mi título",
 *   minFontSize: 12,
 *   maxFontSize: 28,
 *   maxLines: 2
 * });
 * 
 * <div ref={containerRef}>
 *   <span style={{ fontSize }}>Mi título</span>
 * </div>
 * 
 * ACTUALIZADO: Enero 2026 - Mejorado cálculo para títulos largos
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoFitTextOptions {
  /** Texto a medir */
  text: string;
  /** Tamaño mínimo de fuente en px */
  minFontSize?: number;
  /** Tamaño máximo de fuente en px */
  maxFontSize?: number;
  /** Máximo de líneas permitidas */
  maxLines?: number;
  /** Font family para medición precisa */
  fontFamily?: string;
  /** Font weight para medición precisa */
  fontWeight?: number | string;
}

interface UseAutoFitTextResult {
  /** Tamaño de fuente calculado en px */
  fontSize: number;
  /** Ref para el contenedor */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const useAutoFitText = ({
  text,
  minFontSize = 10,
  maxFontSize = 32,
  maxLines = 2,
  fontFamily = 'inherit',
  fontWeight = 900,
}: UseAutoFitTextOptions): UseAutoFitTextResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(minFontSize);

  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !text) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    if (containerWidth === 0 || containerHeight === 0) return;

    // Crear elemento temporal para medir
    const measureEl = document.createElement('div');
    measureEl.style.cssText = `
      position: absolute;
      visibility: hidden;
      left: -9999px;
      top: -9999px;
      white-space: pre-wrap;
      word-break: break-word;
      text-wrap: balance;
      width: ${containerWidth}px;
      font-family: ${fontFamily};
      font-weight: ${fontWeight};
      line-height: 1.1;
      padding: 0;
      margin: 0;
      text-align: center;
    `;
    document.body.appendChild(measureEl);

    /**
     * Verifica si el texto cabe con un tamaño dado
     * Retorna true si cabe, false si se desborda
     */
    const textFits = (size: number): boolean => {
      measureEl.style.fontSize = `${size}px`;
      measureEl.textContent = text;

      const textHeight = measureEl.scrollHeight;
      const lineHeight = size * 1.1;
      
      // Calcular líneas reales basándose en la altura
      const estimatedLines = Math.round(textHeight / lineHeight);
      
      // El texto cabe si:
      // 1. No excede la altura del contenedor
      // 2. No excede el número máximo de líneas
      return textHeight <= containerHeight && estimatedLines <= maxLines;
    };

    // Enfoque: empezar desde maxFontSize e ir bajando hasta que quepa
    // Esto es más confiable que búsqueda binaria para este caso
    let optimalSize = minFontSize;

    for (let size = maxFontSize; size >= minFontSize; size--) {
      if (textFits(size)) {
        optimalSize = size;
        break;
      }
    }

    // Limpiar elemento temporal
    document.body.removeChild(measureEl);

    setFontSize(optimalSize);
  }, [text, minFontSize, maxFontSize, maxLines, fontFamily, fontWeight]);

  useEffect(() => {
    // Pequeño delay para asegurar que el contenedor tenga dimensiones
    const timeoutId = setTimeout(() => {
      calculateFontSize();
    }, 10);

    // Observar cambios de tamaño del contenedor
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateFontSize();
    });

    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [calculateFontSize]);

  return { fontSize, containerRef };
};

export default useAutoFitText;