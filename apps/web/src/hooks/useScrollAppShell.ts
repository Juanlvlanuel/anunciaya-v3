/**
 * useScrollAppShell.ts
 * ====================
 * Registra el contenedor de scroll INTERNO de una página "app-shell propio"
 * (patrón estilo Business Studio: header FUERA del scroll) en el store global
 * de scroll (`useMainScrollStore`).
 *
 * ¿POR QUÉ? En estas páginas el scroll ya NO ocurre en `window` sino dentro del
 * contenedor interno de la propia página. Los hooks/componentes que leen
 * `mainScrollRef` (BotonIrArriba, useHideOnScroll, scroll-to-top al cambiar de
 * tab, etc.) seguirán funcionando solo si ese contenedor está registrado aquí.
 *
 * En DESKTOP no registra nada: ahí el scroll es el <main> de la columna central
 * del layout, y MainLayout ya registra ese ref (`mainRef`).
 *
 * USO:
 *   const cuerpoRef = useScrollAppShell();
 *   ...
 *   <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto ... lg:overflow-visible">
 *
 * NOTA: MainLayout NO pisa el ref para rutas `esAppShellPropio` (lo deja a este
 * hook). Por eso TODA página app-shell-propio DEBE usarlo, aunque no tenga
 * scroll-to-top ni FAB — así `mainScrollRef` siempre apunta al contenedor real y
 * no queda apuntando a una página anterior.
 *
 * UBICACIÓN: apps/web/src/hooks/useScrollAppShell.ts
 */
import { useEffect, useRef, type RefObject } from 'react';
import { useMainScrollStore } from '../stores/useMainScrollStore';
import { useBreakpoint } from './useBreakpoint';

/**
 * @param enabled  Pásalo en `false` cuando la página se monte en un modo que NO
 *   es el app-shell (p. ej. Centro de Ayuda embebido en un drawer de ScanYA):
 *   así no registra un contenedor de scroll que no existe. Default: true.
 */
export function useScrollAppShell<T extends HTMLElement = HTMLDivElement>(enabled: boolean = true) {
  const ref = useRef<T>(null);
  const ultimoNodoRegistradoRef = useRef<T | null>(null);
  const setMainScrollRef = useMainScrollStore((s) => s.setMainScrollRef);
  const { esMobile } = useBreakpoint();

  // Sin arreglo de dependencias a propósito: corre después de CADA render de
  // la página que usa este hook. Necesario porque páginas con un estado de
  // carga (isLoading/isPending) que NO monta el contenedor con `ref` hasta
  // que llegan los datos (ej. detalle de una publicación, perfil de un
  // negocio/vendedor/prestador) hacen que `ref.current` pase de `null` a un
  // elemento real DESPUÉS del primer render — una reasignación de
  // `ref.current` por React es una mutación directa, NO dispara los
  // suscriptores de Zustand (useHideOnScroll, useCollapsibleBanner), así que
  // sin este chequeo se quedan escuchando el registro viejo (o `window`) y
  // el BottomNav/header nunca reaccionan al scroll real de la página.
  useEffect(() => {
    if (!enabled || !esMobile) return;
    if (ref.current === ultimoNodoRegistradoRef.current) return;
    ultimoNodoRegistradoRef.current = ref.current;
    // Objeto NUEVO en cada registro (aunque sea el mismo `ref`): así el
    // store siempre notifica el cambio, incluso si la referencia de `ref`
    // en sí no cambió — lo que cambió es a qué nodo apunta `.current`.
    setMainScrollRef({ current: ref.current } as RefObject<HTMLElement | null>);
  });

  return ref;
}

export default useScrollAppShell;
