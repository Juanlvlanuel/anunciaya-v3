/**
 * usePrefetchSeccion.ts
 * =====================
 * Devuelve una función para PRECARGAR (al pasar el mouse o tocar) los datos de la sección del Panel que
 * se va a abrir, de modo que al hacer clic la vista aparezca SIN el estado "Cargando…". Es el mismo
 * patrón de prefetch-en-hover que ya usan las FILAS (usePrefetchNegocio / usePrefetchUsuario / …),
 * elevado al MENÚ: lo consumen la barra lateral (escritorio), la barra inferior y el cajón (móvil).
 *
 * Para cada lista paginada se precarga EXACTAMENTE la key inicial que monta su sección: sin filtros del
 * usuario (campos vacíos → undefined, que React Query omite del hash), página 1 y el orden por defecto.
 * Si esa key no coincide, el prefetch no evitaría el refetch. Los valores por defecto (orden, POR_PAGINA)
 * se replican aquí y DEBEN seguir coincidiendo con los `useState` iniciales de cada Seccion*.tsx.
 *
 * Los tiempos se omiten en las listas para heredar el global (staleTime 2min): así lo precargado se
 * mantiene fresco la misma ventana que consideraría la propia sección y no se refetchea al abrir.
 *
 * Ubicación: apps/admin/src/hooks/queries/usePrefetchSeccion.ts
 */

import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as negociosService from '../../services/negociosService';
import * as usuariosService from '../../services/usuariosService';
import * as suscripcionesService from '../../services/suscripcionesService';
import * as recibosService from '../../services/recibosService';
import * as equipoService from '../../services/equipoService';
import * as vendedoresService from '../../services/vendedoresService';
import * as auditoriaService from '../../services/auditoriaService';
import * as publicidadService from '../../services/publicidadService';
import * as ciudadesService from '../../services/ciudadesService';
import { obtenerResumen } from '../../services/resumenService';
import { listarConfiguracion } from '../../services/configuracionService';
import { obtenerConfigPublica } from '../../services/configuracionPublicaService';

/** Tamaño de página igual al POR_PAGINA de cada Seccion*.tsx (todas usan 20). */
const POR_PAGINA = 20;

/**
 * Precargadores por id de sección del menú. Cada uno deja en caché lo que la sección lee al montar.
 * `id` que no esté aquí (placeholders: mantenimiento) simplemente no precarga.
 */
const PRECARGADORES: Record<string, (qc: QueryClient) => void> = {
  resumen: (qc) => {
    qc.prefetchQuery({ queryKey: queryKeys.resumen.all(), queryFn: obtenerResumen, staleTime: 1000 * 60 });
  },

  negocios: (qc) => {
    const f = { orden: 'nombre_az' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.negocios.lista(f), queryFn: () => negociosService.listarNegocios(f) });
  },

  usuarios: (qc) => {
    const f = { orden: 'nombre_az' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.usuarios.lista(f), queryFn: () => usuariosService.listarUsuarios(f) });
  },

  suscripciones: (qc) => {
    const f = { orden: 'fecha_recientes' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.suscripciones.lista(f), queryFn: () => suscripcionesService.listarEventos(f) });
  },

  recibos: (qc) => {
    const f = { orden: 'folio_desc' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.recibos.lista(f), queryFn: () => recibosService.listarRecibos(f) });
  },

  equipo: (qc) => {
    const f = { orden: 'rol' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.equipo.lista(f), queryFn: () => equipoService.listarEquipo(f) });
  },

  // En el menú la sección de vendedores se llama "comisiones".
  comisiones: (qc) => {
    const f = { orden: 'cartera_desc' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.vendedores.lista(f), queryFn: () => vendedoresService.listarVendedores(f) });
  },

  auditoria: (qc) => {
    const f = { orden: 'fecha_recientes' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.auditoria.lista(f), queryFn: () => auditoriaService.listarAuditoria(f) });
    qc.prefetchQuery({ queryKey: queryKeys.auditoria.actores(), queryFn: () => auditoriaService.listarActores(), staleTime: 1000 * 60 * 5 });
  },

  publicidad: (qc) => {
    const f = { orden: 'recientes' as const, pagina: 1, porPagina: POR_PAGINA };
    qc.prefetchQuery({ queryKey: queryKeys.publicidad.lista(f), queryFn: () => publicidadService.listarPublicidad(f) });
  },

  ciudades: (qc) => {
    const f = { activa: 'todas' as const };
    qc.prefetchQuery({ queryKey: queryKeys.ciudades.lista(f), queryFn: () => ciudadesService.listarCiudades(f), staleTime: 1000 * 60 });
    // Catálogo completo (sin filtros) para el cruce del mapa + regiones (lo que la sección lee al montar).
    qc.prefetchQuery({ queryKey: queryKeys.ciudades.lista({}), queryFn: () => ciudadesService.listarCiudades({}), staleTime: 1000 * 60 });
    qc.prefetchQuery({ queryKey: queryKeys.ciudades.regiones(), queryFn: () => ciudadesService.listarRegiones(), staleTime: 1000 * 60 });
  },

  configuracion: (qc) => {
    qc.prefetchQuery({ queryKey: queryKeys.configuracion.lista(), queryFn: () => listarConfiguracion(), staleTime: 1000 * 60 });
    qc.prefetchQuery({ queryKey: ['configuracion-publica'], queryFn: obtenerConfigPublica, staleTime: 1000 * 60 * 30, gcTime: 1000 * 60 * 60 });
  },
};

/**
 * Hook para los componentes de menú. Devuelve `precargar(id)` para enganchar en `onPointerEnter`
 * (cubre hover de mouse y contacto táctil) y `onFocus` (teclado). Idempotente: si el dato ya está
 * fresco en caché, el prefetch es un no-op (no machaca el backend en hovers repetidos).
 */
export function usePrefetchSeccion() {
  const qc = useQueryClient();
  return useCallback((id: string) => PRECARGADORES[id]?.(qc), [qc]);
}

export default usePrefetchSeccion;
