/**
 * useArrastrePortada.ts
 * ======================
 * Arrastre estilo "reposicionar portada" (Facebook): el usuario toma la
 * imagen ya subida y la desliza dentro del marco para elegir qué parte
 * queda visible. Sin zoom — solo paneo libre en X/Y, expresado como
 * object-position en porcentaje (0-100).
 *
 * La posición vive solo en memoria mientras se arrastra (preview en vivo);
 * quien use el hook decide cuándo persistirla (ver ModalAjustarPortada).
 *
 * UBICACIÓN: apps/web/src/hooks/useArrastrePortada.ts
 */

import { useCallback, useRef, useState } from 'react';

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

export function useArrastrePortada(posicionInicial: PosicionPortada) {
  const [posicion, setPosicion] = useState(posicionInicial);
  const [arrastrando, setArrastrando] = useState(false);
  const inicio = useRef<InicioArrastre | null>(null);
  const posicionActual = useRef(posicionInicial);
  const huboMovimiento = useRef(false);

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
    huboMovimiento.current = false;
    setArrastrando(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return { posicion, arrastrando, onPointerDown, onPointerMove, onPointerUp };
}
