/**
 * useFiltrosBuscadorUrl.ts
 * =========================
 * Hook que sincroniza filtros del buscador del MarketPlace con la URL
 * (`?q=&precioMin=&precioMax=&condicion=&distanciaMaxKm=&ordenar=`).
 *
 * Por qué URL state:
 *  - Los resultados de búsqueda son COMPARTIBLES (un usuario manda un link
 *    de "bicis usadas <$5000 cerca" y el receptor ve los mismos filtros).
 *  - Bookmarkeable.
 *  - El back/forward del navegador funciona naturalmente.
 *
 * No usa librerías externas — `URLSearchParams` nativo es suficiente.
 *
 * Ubicación: apps/web/src/hooks/useFiltrosBuscadorUrl.ts
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FiltrosBusquedaCliente } from './queries/useMarketplace';

type Condicion = NonNullable<FiltrosBusquedaCliente['condicion']>[number];
type Ordenar = NonNullable<FiltrosBusquedaCliente['ordenar']>;

const CONDICIONES_VALIDAS: readonly Condicion[] = [
    'nuevo',
    'seminuevo',
    'usado',
    'para_reparar',
];
const ORDENES_VALIDOS: readonly Ordenar[] = [
    'recientes',
    'cercanos',
    'precio_asc',
    'precio_desc',
];

interface UseFiltrosBuscadorUrlResult {
    filtros: FiltrosBusquedaCliente;
    /** Reemplaza filtros completos (no merge — el caller pasa lo que quiere) */
    setFiltros: (nuevos: FiltrosBusquedaCliente) => void;
    /** Actualiza un solo campo manteniendo el resto */
    actualizarFiltro: <K extends keyof FiltrosBusquedaCliente>(
        key: K,
        valor: FiltrosBusquedaCliente[K]
    ) => void;
    /** Limpia TODOS los filtros excepto `q` (el query) */
    limpiarFiltros: () => void;
    /** Quita un solo filtro */
    quitarFiltro: (key: keyof FiltrosBusquedaCliente) => void;
}

export function useFiltrosBuscadorUrl(): UseFiltrosBuscadorUrlResult {
    const [searchParams, setSearchParams] = useSearchParams();

    // ─── Parsear URL → objeto de filtros ──────────────────────────────────
    const filtros = useMemo<FiltrosBusquedaCliente>(() => {
        const result: FiltrosBusquedaCliente = {};

        const q = searchParams.get('q');
        if (q && q.trim()) result.q = q.trim();

        const precioMin = parseIntSafe(searchParams.get('precioMin'));
        if (precioMin !== null) result.precioMin = precioMin;

        const precioMax = parseIntSafe(searchParams.get('precioMax'));
        if (precioMax !== null) result.precioMax = precioMax;

        const condicionRaw = searchParams.get('condicion');
        if (condicionRaw) {
            const condList = condicionRaw
                .split(',')
                .map((c) => c.trim())
                .filter((c): c is Condicion => CONDICIONES_VALIDAS.includes(c as Condicion));
            if (condList.length > 0) result.condicion = condList;
        }

        const distanciaMaxKm = parseIntSafe(searchParams.get('distanciaMaxKm'));
        if (distanciaMaxKm !== null) result.distanciaMaxKm = distanciaMaxKm;

        const ordenarRaw = searchParams.get('ordenar');
        if (ordenarRaw && ORDENES_VALIDOS.includes(ordenarRaw as Ordenar)) {
            result.ordenar = ordenarRaw as Ordenar;
        }

        return result;
    }, [searchParams]);

    // ─── Serializar objeto de filtros → URL ───────────────────────────────
    const setFiltros = useCallback(
        (nuevos: FiltrosBusquedaCliente) => {
            const params = new URLSearchParams();
            if (nuevos.q) params.set('q', nuevos.q);
            if (nuevos.precioMin !== undefined) params.set('precioMin', String(nuevos.precioMin));
            if (nuevos.precioMax !== undefined) params.set('precioMax', String(nuevos.precioMax));
            if (nuevos.condicion && nuevos.condicion.length > 0) {
                params.set('condicion', nuevos.condicion.join(','));
            }
            if (nuevos.distanciaMaxKm !== undefined) {
                params.set('distanciaMaxKm', String(nuevos.distanciaMaxKm));
            }
            if (nuevos.ordenar && nuevos.ordenar !== 'recientes') {
                params.set('ordenar', nuevos.ordenar);
            }
            setSearchParams(params, { replace: true });
        },
        [setSearchParams]
    );

    const actualizarFiltro = useCallback(
        <K extends keyof FiltrosBusquedaCliente>(
            key: K,
            valor: FiltrosBusquedaCliente[K]
        ) => {
            const merged: FiltrosBusquedaCliente = { ...filtros, [key]: valor };
            // Si el valor es undefined o array vacío, eliminar la clave
            if (valor === undefined || (Array.isArray(valor) && valor.length === 0)) {
                delete merged[key];
            }
            setFiltros(merged);
        },
        [filtros, setFiltros]
    );

    const quitarFiltro = useCallback(
        (key: keyof FiltrosBusquedaCliente) => {
            const sinKey = { ...filtros };
            delete sinKey[key];
            setFiltros(sinKey);
        },
        [filtros, setFiltros]
    );

    const limpiarFiltros = useCallback(() => {
        // Mantener solo `q` y `ordenar` si está presente
        const conservar: FiltrosBusquedaCliente = {};
        if (filtros.q) conservar.q = filtros.q;
        if (filtros.ordenar) conservar.ordenar = filtros.ordenar;
        setFiltros(conservar);
    }, [filtros, setFiltros]);

    return { filtros, setFiltros, actualizarFiltro, quitarFiltro, limpiarFiltros };
}

function parseIntSafe(s: string | null): number | null {
    if (!s) return null;
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
}
