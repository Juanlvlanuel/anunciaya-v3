/**
 * useArrastrePortada.ts
 * ======================
 * Arrastre estilo "reposicionar portada" (Facebook): el usuario toma la
 * imagen ya subida y la desliza dentro del marco para elegir qué parte
 * queda visible. Sin zoom — solo paneo libre en X/Y, expresado como
 * object-position en porcentaje (0-100).
 *
 * UBICACIÓN: apps/web/src/hooks/useArrastrePortada.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PosicionPortada {
  x: number;
  y: number;
}

interface InicioArrastre {
  pointerX: number;
  pointerY: number;
  rect: DOMRect;
  posicion: PosicionPortada;
}

export function useArrastrePortada(
  posicionInicial: PosicionPortada,
  onSoltar: (posicion: PosicionPortada) => void,
) {
  const [posicion, setPosicion] = useState(posicionInicial);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<InicioArrastre | null>(null);
  const posicionActual = useRef(posicionInicial);
  const huboMovimiento = useRef(false);
  const bloquearSiguienteClick = useRef(false);

  // Sincronizar si la posición inicial cambia desde fuera (ej: carga async del perfil)
  useEffect(() => {
    setPosicion(posicionInicial);
    posicionActual.current = posicionInicial;
  }, [posicionInicial.x, posicionInicial.y]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      rect: e.currentTarget.getBoundingClientRect(),
      posicion: posicionActual.current,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!inicio.current) return;
    const { pointerX, pointerY, rect, posicion: base } = inicio.current;
    const deltaX = ((e.clientX - pointerX) / rect.width) * 100;
    const deltaY = ((e.clientY - pointerY) / rect.height) * 100;

    if (!huboMovimiento.current && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
      huboMovimiento.current = true;
      setArrastrando(true);
    }
    if (!huboMovimiento.current) return;

    // Arrastrar la imagen a la derecha revela su parte izquierda → se resta el delta.
    const nueva: PosicionPortada = {
      x: Math.min(100, Math.max(0, base.x - deltaX)),
      y: Math.min(100, Math.max(0, base.y - deltaY)),
    };
    posicionActual.current = nueva;
    setPosicion(nueva);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!inicio.current) return;
    inicio.current = null;
    if (huboMovimiento.current) {
      huboMovimiento.current = false;
      bloquearSiguienteClick.current = true;
      setArrastrando(false);
      const final = {
        x: Math.round(posicionActual.current.x),
        y: Math.round(posicionActual.current.y),
      };
      onSoltar(final);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [onSoltar]);

  // Si hubo arrastre, el click sintético que sigue al pointerup no debe abrir el lightbox.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (bloquearSiguienteClick.current) {
      bloquearSiguienteClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return { posicion, arrastrando, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}
