/**
 * useOfertasFeed.ts
 * ==================
 * Hooks de React Query para la sección pública de Ofertas.
 *
 * PATRÓN:
 *   - useOfertasFeedCerca → bloque "Cerca de ti" (respeta el chip situacional
 *     activo y la búsqueda del store de filtros).
 *   - En Prompt 3 se sumarán hooks por bloque editorial:
 *     useOfertasFeedRecientes, useOfertasFeedPopulares,
 *     useOfertasFeedVencenPronto, etc., cada uno con params fijos
 *     (no afectados por el chip situacional).
 *
 * Ubicación: apps/web/src/hooks/queries/useOfertasFeed.ts
 */

import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  obtenerFeedOfertas,
  obtenerOfertaDestacadaDelDia,
  obtenerSugerenciasOfertas,
  type SugerenciaOferta,
} from '../../services/ofertasService';
import { useGpsStore } from '../../stores/useGpsStore';
import { useFiltrosOfertasStore } from '../../stores/useFiltrosOfertasStore';
import { useSearchStore } from '../../stores/useSearchStore';
import { queryKeys } from '../../config/queryKeys';
import type { FiltrosFeedOfertas, OfertaFeed } from '../../types/ofertas';

// =============================================================================
// HELPER: traducir chip situacional → params del backend
// =============================================================================

/**
 * Mapea el chip situacional activo a un set de params del backend.
 * Las traducciones siguen el contrato del backend (ver Prompt 1 del módulo
 * Ofertas: orden, soloCardya, creadasUltimasHoras).
 */
function chipAParams(
  chip: ReturnType<typeof useFiltrosOfertasStore.getState>['chipActivo']
): Partial<FiltrosFeedOfertas> {
  switch (chip) {
    case 'hoy':
      return { creadasUltimasHoras: 24 };
    case 'esta_semana':
      return { creadasUltimasHoras: 168 };
    case 'cerca':
      return { orden: 'distancia' };
    case 'cardya':
      return { soloCardya: true };
    case 'recientes':
      return { orden: 'recientes' };
    case 'mas_vistas':
      return { orden: 'populares' };
    default:
      return {};
  }
}

// =============================================================================
// BLOQUE: "Cerca de ti" — respeta chip situacional + búsqueda
// =============================================================================

/**
 * Hook principal del feed público de Ofertas.
 *
 * Filtro por ciudad (ver Prompt 3 §A.4):
 *  - Lee `latitud, longitud` directo del `useGpsStore`. Cuando el usuario
 *    cambia de ciudad en el header (Modal/Navbar/MobileHeader), `setCiudad`
 *    actualiza esas mismas coords en el store. Mismo mecanismo que
 *    `useNegociosLista`. Se incluyen SIEMPRE en el objeto `filtros` (aunque
 *    sean null) para que el queryKey reaccione a los cambios y RQ haga
 *    refetch automático.
 *  - El backend filtra `ST_DWithin(50km)` cuando recibe lat/lng → cambiar
 *    de Peñasco a Guadalajara devuelve 0 ofertas, igual que Negocios.
 *
 * `placeholderData: keepPreviousData` evita temblor al cambiar chip o
 * búsqueda (regla obligatoria del estándar React Query del proyecto).
 */
export function useOfertasFeedCerca() {
  const chipActivo = useFiltrosOfertasStore((s) => s.chipActivo);
  // Búsqueda: leer del searchStore GLOBAL (Navbar/MobileHeader) — Ofertas
  // no tiene buscador propio, reusa el del header principal. El placeholder
  // específico ya está definido en `useSearchStore.placeholderSeccion`.
  const busquedaRaw = useSearchStore((s) => s.query);

  // PERF: debounce 250ms del query antes de armar el queryKey. Sin esto,
  // cada keystroke (escribir o borrar) cambiaba el queryKey y React Query
  // disparaba un fetch nuevo por tecla — al borrar con Backspace se sentía
  // lento. El input visual sigue instantáneo (escribe directo al store);
  // solo el fetch al backend se debouncea.
  const [busqueda, setBusqueda] = useState(busquedaRaw);
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(busquedaRaw), 250);
    return () => clearTimeout(t);
  }, [busquedaRaw]);

  const { latitud, longitud } = useGpsStore();

  // Patrón espejo de `useNegociosLista`: lat/lng SIEMPRE en `filtros`
  // (aunque null) para que el queryKey reaccione al cambio de ciudad.
  const filtros: FiltrosFeedOfertas = {
    ...chipAParams(chipActivo),
    latitud: latitud ?? undefined,
    longitud: longitud ?? undefined,
    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
  };

  return useQuery({
    queryKey: queryKeys.ofertasFeed.bloque(
      'cerca',
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: async (): Promise<OfertaFeed[]> => {
      const r = await obtenerFeedOfertas(filtros);
      return r.success ? (r.data ?? []) : [];
    },
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// HERO: "Oferta del día" (contenido editorial global, sin filtro de ciudad)
// =============================================================================

/**
 * Devuelve la oferta destacada del día. Puede ser `null` si no hay
 * ninguna activa o destacada (no es error).
 *
 * `staleTime` largo (30 min) porque la destacada del día no cambia seguido.
 * NO se filtra por ciudad por decisión editorial, pero SÍ pasamos lat/lng
 * cuando el usuario los tiene activos para que el backend calcule la
 * distancia y se muestre en la card.
 */
export function useOfertaDestacadaDelDia() {
  const latitud = useGpsStore((s) => s.latitud);
  const longitud = useGpsStore((s) => s.longitud);
  const gps =
    latitud != null && longitud != null ? { latitud, longitud } : undefined;

  return useQuery({
    queryKey: queryKeys.ofertasFeed.bloque(
      'destacada',
      gps ? { latitud, longitud } : undefined
    ),
    queryFn: async (): Promise<OfertaFeed | null> => {
      const r = await obtenerOfertaDestacadaDelDia(gps);
      return r.success ? (r.data ?? null) : null;
    },
    staleTime: 30 * 60 * 1000,
  });
}

// =============================================================================
// HOOK COMÚN: bloque de carrusel con orden fijo
// =============================================================================

/**
 * Helper interno que centraliza el patrón de los 3 carruseles editoriales.
 * Cada carrusel tiene su orden fijo (no afectado por el chip situacional)
 * pero TODOS respetan el filtro por ciudad (Prompt 3 §A.4) leyendo lat/lng
 * del mismo store que `useNegociosLista`.
 *
 * NO usa `placeholderData: keepPreviousData` — los carruseles tienen params
 * fijos por bloque, no son listas con filtros variables del usuario.
 */
function useBloqueCarrusel(
  nombre: 'vencen_pronto' | 'recientes' | 'populares',
  orden: 'vencen_pronto' | 'recientes' | 'populares',
  limite: number
) {
  const { latitud, longitud } = useGpsStore();

  const filtros: FiltrosFeedOfertas = {
    orden,
    limite,
    latitud: latitud ?? undefined,
    longitud: longitud ?? undefined,
  };

  return useQuery({
    queryKey: queryKeys.ofertasFeed.bloque(
      nombre,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: async (): Promise<OfertaFeed[]> => {
      const r = await obtenerFeedOfertas(filtros);
      return r.success ? (r.data ?? []) : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// CARRUSELES EDITORIALES (Prompt 3 — Fase C)
// =============================================================================

export function useOfertasFeedVencenPronto() {
  return useBloqueCarrusel('vencen_pronto', 'vencen_pronto', 10);
}

export function useOfertasFeedRecientes() {
  return useBloqueCarrusel('recientes', 'recientes', 10);
}

export function useOfertasFeedPopulares() {
  return useBloqueCarrusel('populares', 'populares', 10);
}

// =============================================================================
// BUSCADOR — sugerencias en vivo del overlay
// =============================================================================

export type { SugerenciaOferta };

/**
 * Sugerencias en vivo con debounce 300ms (mismo patrón que MarketPlace).
 *
 * El componente pasa el `query` "raw" del input — este hook se encarga de
 * debouncear y solo dispara fetch cuando el query estabilizado tiene >= 2
 * caracteres. Sin esto, cada tecla pegada spamearía el backend.
 *
 * Versión sobria del patrón de MP: sin populares, sin tabla de log.
 */
export function useBuscadorOfertasSugerencias(
  queryRaw: string,
  ciudad: string | null,
) {
  const [queryDebounced, setQueryDebounced] = useState(queryRaw);

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(queryRaw), 300);
    return () => clearTimeout(timer);
  }, [queryRaw]);

  return useQuery({
    queryKey: queryKeys.ofertasFeed.sugerencias(queryDebounced, ciudad ?? ''),
    queryFn: async (): Promise<SugerenciaOferta[]> => {
      const r = await obtenerSugerenciasOfertas(queryDebounced, ciudad ?? '');
      return r.success ? (r.data ?? []) : [];
    },
    enabled: !!ciudad && queryDebounced.trim().length >= 2,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
