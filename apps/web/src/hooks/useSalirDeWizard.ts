/**
 * useSalirDeWizard.ts
 * ====================
 * Hook centralizado para salir de un wizard (o flujo profundo) DESDE UN
 * MODAL DE CONFIRMACIÓN interno, dejando el history limpio.
 *
 * Problema que resuelve:
 *
 *  - Wizard `/seccion/publicar` abierto (pushea entrada al history).
 *  - Modal "¿Salir sin publicar?" encima (pushea SU PROPIA entrada vía
 *    `useBackNativo` heredado de `Modal`/`ModalAdaptativo`).
 *  - El usuario hace click en "Descartar y salir" o "Guardar borrador y
 *    salir": queremos cerrar modal Y salir del wizard, dejando el history
 *    en un estado donde el siguiente back lleve al usuario al lugar
 *    correcto (la ruta de donde vino, o al fallback).
 *
 * Por qué NO funciona `useVolverAtras(fallback)` aquí:
 *
 *  - `useVolverAtras` hace `navigate(-1)`. Eso retrocede 1 entrada. Pero
 *    el modal acaba de pushear SU entrada (la actual). Retroceder 1
 *    consume la entrada del modal pero deja al usuario en el wizard.
 *
 * Por qué NO funciona `navigate('/fallback')` aquí:
 *
 *  - Hace push de la nueva URL ENCIMA de la entrada del modal y del
 *    wizard. El usuario sale visualmente al fallback, pero al hacer back
 *    desde ahí, el browser retrocede a la entrada del wizard → wizard se
 *    re-monta. Esto es el bug "back desde /marketplace me regresa al
 *    wizard" que motivó este hook.
 *
 * Por qué NO funciona `navigate('/fallback', { replace: true })`:
 *
 *  - Reemplaza la entrada del modal por el fallback, pero la entrada del
 *    wizard queda intacta atrás. El back desde el fallback también
 *    regresa al wizard.
 *
 * Solución (alineada con el patrón `history.go(-(1+N))` usado en
 * `abrirChatYA` cuando se abre el chat sobre un modal — documentado en
 * `docs/estandares/Sistema_Navegacion_Back.md` §"Por qué replaceState +
 * conteo de marcas + go(-(1+N))"):
 *
 *  - Retroceder `numEntradas` atrás en una sola operación atómica
 *    (`navigate(-numEntradas)`). Esto consume modal + wizard + lo que
 *    indique el caller, y el browser ejecuta el popstate correspondiente
 *    en un solo paso → cursor del history queda en la posición correcta
 *    y el back posterior funciona natural.
 *
 *  - Si no hay historial real (`location.key === 'default'`, típico al
 *    entrar por URL directa al wizard), `navigate(-numEntradas)` saldría
 *    del SPA. Fallback: `navigate(fallback)` que al menos lleva al
 *    usuario a una ruta conocida.
 *
 * @param numEntradas Cuántas entradas atrás saltar.
 *   - Para "modal de confirmación + wizard": **2** (1 del modal + 1 del
 *     wizard).
 *   - Si el wizard tiene más capas internas que pushearon entradas,
 *     ajustar según corresponda.
 * @param fallback URL a la que navegar cuando no hay historial real.
 *   Típicamente la ruta del feed/listado padre (`/marketplace`,
 *   `/servicios`, etc.).
 *
 * @example
 * function MiWizard() {
 *   const [modalAbierto, setModalAbierto] = useState(false);
 *   const salirDelWizard = useSalirDeWizard(2, '/marketplace');
 *
 *   const handleDescartar = () => {
 *     limpiarStorage();
 *     setModalAbierto(false);
 *     salirDelWizard();
 *   };
 *
 *   const handleGuardarBorrador = () => {
 *     persistirStorage();
 *     setModalAbierto(false);
 *     salirDelWizard();
 *   };
 *
 *   return <ModalAdaptativo abierto={modalAbierto} ...>...</ModalAdaptativo>;
 * }
 *
 * UBICACIÓN: apps/web/src/hooks/useSalirDeWizard.ts
 */

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useSalirDeWizard(
    numEntradas: number,
    fallback: string,
): () => void {
    const navigate = useNavigate();
    const location = useLocation();

    return useCallback(() => {
        if (location.key === 'default') {
            navigate(fallback);
        } else {
            navigate(-numEntradas);
        }
    }, [navigate, location.key, numEntradas, fallback]);
}

export default useSalirDeWizard;
