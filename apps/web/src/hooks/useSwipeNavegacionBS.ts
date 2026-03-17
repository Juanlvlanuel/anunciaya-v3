/**
 * useSwipeNavegacionBS.ts
 * =======================
 * Hook para detectar swipe horizontal en móvil y navegar entre módulos de Business Studio.
 * - Swipe izquierda → módulo siguiente
 * - Swipe derecha → módulo anterior
 * - Bounce sutil al llegar al primer/último módulo
 *
 * Ubicación: apps/web/src/hooks/useSwipeNavegacionBS.ts
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

// =============================================================================
// MÓDULOS BS (mismo orden que MobileHeader)
// =============================================================================

const MODULOS_BS = [
  { nombre: 'Dashboard', ruta: '/business-studio' },
  { nombre: 'Transacciones', ruta: '/business-studio/transacciones' },
  { nombre: 'Clientes', ruta: '/business-studio/clientes' },
  { nombre: 'Opiniones', ruta: '/business-studio/opiniones' },
  { nombre: 'Alertas', ruta: '/business-studio/alertas' },
  { nombre: 'Catálogo', ruta: '/business-studio/catalogo' },
  { nombre: 'Ofertas', ruta: '/business-studio/ofertas' },
  { nombre: 'Cupones', ruta: '/business-studio/cupones' },
  { nombre: 'Puntos', ruta: '/business-studio/puntos' },
  { nombre: 'Rifas', ruta: '/business-studio/rifas' },
  { nombre: 'Empleados', ruta: '/business-studio/empleados' },
  { nombre: 'Vacantes', ruta: '/business-studio/vacantes' },
  { nombre: 'Reportes', ruta: '/business-studio/reportes' },
  { nombre: 'Sucursales', ruta: '/business-studio/sucursales' },
  { nombre: 'Mi Perfil', ruta: '/business-studio/perfil' },
];

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const SWIPE_THRESHOLD = 30;      // px mínimos para considerar un swipe
const SWIPE_MAX_TIME = 600;      // ms máximo para el gesto
const BOUNCE_DISTANCE = 30;      // px del efecto bounce al llegar al límite
const BOUNCE_DURATION = 300;     // ms de la animación bounce

// =============================================================================
// HOOK
// =============================================================================

export function useSwipeNavegacionBS(elementRef: React.RefObject<HTMLElement | null>) {
  const location = useLocation();
  const navigate = useNavigate();

  const usuario = useAuthStore((s) => s.usuario);
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
  const esGerente = !!usuario?.sucursalAsignada;
  const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);

  const esBusinessStudio = location.pathname.startsWith('/business-studio');

  // Filtrar módulos (misma lógica que MobileHeader)
  const modulosFiltrados = vistaComoGerente
    ? MODULOS_BS.filter(m => m.ruta !== '/business-studio/sucursales' && m.ruta !== '/business-studio/puntos')
    : MODULOS_BS;

  // Refs para el gesto
  const inicioX = useRef(0);
  const inicioY = useRef(0);
  const inicioTiempo = useRef(0);
  const swiping = useRef(false);

  // Encontrar índice actual
  const obtenerIndice = useCallback(() => {
    const exacto = modulosFiltrados.findIndex(m => location.pathname === m.ruta);
    if (exacto !== -1) return exacto;
    return modulosFiltrados.findIndex(m =>
      m.ruta !== '/business-studio' && location.pathname.startsWith(m.ruta)
    );
  }, [location.pathname, modulosFiltrados]);

  // Bounce visual
  const aplicarBounce = useCallback((direccion: 'izquierda' | 'derecha') => {
    const el = elementRef.current;
    if (!el) return;

    const distancia = direccion === 'izquierda' ? -BOUNCE_DISTANCE : BOUNCE_DISTANCE;
    el.style.transition = `transform ${BOUNCE_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    el.style.transform = `translateX(${distancia}px)`;

    setTimeout(() => {
      el.style.transition = `transform ${BOUNCE_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      el.style.transform = 'translateX(0)';
    }, BOUNCE_DURATION / 2);

    setTimeout(() => {
      el.style.transition = '';
      el.style.transform = '';
    }, BOUNCE_DURATION);
  }, [elementRef]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !esBusinessStudio) return;

    const onTouchStart = (e: TouchEvent) => {
      // Ignorar si hay un modal/overlay/drawer abierto
      const target0 = e.target as HTMLElement;
      if (target0.closest('[data-bloquear-swipe]') || target0.closest('[role="dialog"]')) {
        swiping.current = false;
        return;
      }

      // Ignorar si el toque inicia dentro de un contenedor con scroll horizontal
      let target = e.target as HTMLElement | null;
      while (target && target !== el) {
        const { overflowX } = window.getComputedStyle(target);
        if (
          (overflowX === 'auto' || overflowX === 'scroll') &&
          target.scrollWidth > target.clientWidth
        ) {
          swiping.current = false;
          return;
        }
        target = target.parentElement;
      }

      const touch = e.touches[0];
      inicioX.current = touch.clientX;
      inicioY.current = touch.clientY;
      inicioTiempo.current = Date.now();
      swiping.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swiping.current) return;
      swiping.current = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - inicioX.current;
      const deltaY = touch.clientY - inicioY.current;
      const tiempo = Date.now() - inicioTiempo.current;

      // Verificar que es un swipe horizontal válido
      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD ||
        Math.abs(deltaY) > Math.abs(deltaX) * 1.2 ||
        tiempo > SWIPE_MAX_TIME
      ) {
        return;
      }

      const indice = obtenerIndice();
      if (indice === -1) return;

      if (deltaX < 0) {
        // Swipe izquierda → módulo siguiente
        if (indice < modulosFiltrados.length - 1) {
          navigate(modulosFiltrados[indice + 1].ruta);
        } else {
          aplicarBounce('izquierda');
        }
      } else {
        // Swipe derecha → módulo anterior
        if (indice > 0) {
          navigate(modulosFiltrados[indice - 1].ruta);
        } else {
          aplicarBounce('derecha');
        }
      }
    };

    const onTouchCancel = () => {
      swiping.current = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [elementRef, esBusinessStudio, modulosFiltrados, obtenerIndice, navigate, aplicarBounce]);
}
