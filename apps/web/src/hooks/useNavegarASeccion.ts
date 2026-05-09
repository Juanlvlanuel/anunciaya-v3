/**
 * useNavegarASeccion.ts
 * ======================
 * Hook centralizado para navegar entre secciones top-level de la app
 * (Negocios, Marketplace, Ofertas, Servicios, CardYA, Mis Cupones,
 * Guardados, Mis Publicaciones, Perfil, Business Studio, Inicio).
 *
 * ¿Por qué existe?
 * Las secciones top-level son hermanas, no anidadas. Si el usuario está
 * en `/negocios` y navega a `/ofertas`, el back NO debería regresar a
 * `/negocios` — debería ir a `/inicio`. Lo mismo para cualquier otro
 * salto entre secciones.
 *
 * Comportamiento:
 *  - Si la ruta destino es una sección top-level Y la ruta actual NO es
 *    `/inicio` → usa `navigate(ruta, { replace: true })`. El back queda
 *    apuntando al `/inicio` (si venía de ahí) o a la entrada anterior.
 *  - Si la ruta actual es `/inicio` → usa `navigate(ruta)` normal (push).
 *    El back regresa a `/inicio`, que es el comportamiento natural.
 *  - Si el destino NO es top-level (subrutas como `/marketplace/articulo/X`,
 *    `/negocios/:id`, etc.) → usa `navigate(ruta)` normal (push). La
 *    navegación interna de cada sección conserva su historial.
 *
 * Tabla de comportamiento:
 *  | Desde                          | Hacia                | Acción      |
 *  |--------------------------------|----------------------|-------------|
 *  | /inicio                        | /negocios            | push        |
 *  | /negocios                      | /ofertas             | replace     |
 *  | /negocios                      | /inicio              | replace     |
 *  | /marketplace/articulo/X        | /cardya              | replace     |
 *  | /marketplace/articulo/X        | /inicio              | replace     |
 *  | /marketplace                   | /marketplace/articulo/X | push     |
 *  | /negocios                      | /negocios/:sucursal  | push        |
 *
 * Uso:
 * ```tsx
 * import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
 *
 * function MiNavbar() {
 *   const navegar = useNavegarASeccion();
 *   return <button onClick={() => navegar('/negocios')}>Negocios</button>;
 * }
 * ```
 *
 * UBICACIÓN: apps/web/src/hooks/useNavegarASeccion.ts
 */

import { useCallback } from 'react';
import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom';

/**
 * Lista canónica de rutas top-level de la app.
 *
 * Una ruta es top-level si está al mismo nivel que `/inicio` en la
 * jerarquía conceptual de la app (accesible desde el menú principal,
 * navbar, o como destino directo). Las subrutas anidadas (`/negocios/:id`,
 * `/marketplace/articulo/:id`, `/business-studio/dashboard`, etc.) NO
 * son top-level — sus historiales internos sí se preservan con push.
 *
 * Mantener esta lista sincronizada con `apps/web/src/router/index.tsx`
 * cuando se agreguen nuevas secciones de primer nivel.
 */
const RUTAS_TOP_LEVEL = new Set<string>([
    '/inicio',
    '/negocios',
    '/marketplace',
    '/ofertas',
    '/servicios',
    '/perfil',
    '/guardados',
    '/mis-publicaciones',
    '/cardya',
    '/mis-cupones',
    '/business-studio',
]);

/** True si la ruta corresponde a una sección top-level (no subruta). */
export function esRutaTopLevel(ruta: string): boolean {
    return RUTAS_TOP_LEVEL.has(ruta);
}

/**
 * True si la ruta es un módulo de Business Studio (incluye `/business-studio`
 * raíz y cualquier `/business-studio/<modulo>`). Los módulos de BS son
 * "hermanas" entre sí — el back desde cualquiera debe ir a `/inicio`,
 * no al módulo previo. La navegación interna se hace con menú/sidebar.
 */
export function esModuloBS(ruta: string): boolean {
    return ruta === '/business-studio' || ruta.startsWith('/business-studio/');
}

/**
 * Hook que devuelve una función `navegar(ruta, opciones?)` con la lógica
 * de replace automático en dos casos:
 *  1. Navegación entre secciones top-level (Negocios → Ofertas, etc.)
 *     cuando NO se sale desde `/inicio`.
 *  2. Navegación entre módulos hermanos de Business Studio (ej.
 *     `/business-studio/dashboard` → `/business-studio/clientes`).
 *
 * Resultado: el back nativo del celular en cualquier sección hermana
 * regresa siempre a la entrada anterior a la "familia" (típicamente
 * `/inicio`), nunca módulo por módulo.
 *
 * Acepta el segundo parámetro `opciones` de React Router para casos
 * donde el consumidor quiera forzar replace o pasar `state`. Si el
 * consumidor pasa `replace: true`, ese gana sobre la heurística.
 */
export function useNavegarASeccion(): (ruta: string, opciones?: NavigateOptions) => void {
    const navigate = useNavigate();
    const location = useLocation();

    return useCallback(
        (ruta: string, opciones?: NavigateOptions) => {
            const rutaActual = location.pathname;

            // Caso 1: salto entre secciones top-level del usuario final.
            //   /negocios → /ofertas → replace (back regresa a /inicio).
            //   /inicio → /negocios → push (back regresa a /inicio natural).
            const saltoEntreTopLevel =
                esRutaTopLevel(ruta) && rutaActual !== '/inicio';

            // Caso 2: salto entre módulos hermanos de Business Studio.
            //   /business-studio/dashboard → /business-studio/clientes → replace.
            //   /inicio → /business-studio → push (entrada al área).
            const saltoEntreModulosBS =
                esModuloBS(ruta) && esModuloBS(rutaActual) && rutaActual !== ruta;

            const debeReemplazar =
                opciones?.replace === undefined
                    ? saltoEntreTopLevel || saltoEntreModulosBS
                    : opciones.replace;

            navigate(ruta, { ...opciones, replace: debeReemplazar });
        },
        [navigate, location.pathname],
    );
}

export default useNavegarASeccion;
