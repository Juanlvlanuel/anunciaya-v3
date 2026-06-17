/**
 * configuracionService.ts
 * =======================
 * Llamadas a la API del Panel para la sección "Configuración" (módulo 9) — los valores dinámicos del
 * negocio. Reusa el axios del Panel (`api`). Solo superadmin (lo garantiza el gate del backend).
 *
 * Endpoints:
 *   GET   /admin/configuracion        → valores editables (catálogo + valor actual)
 *   PATCH /admin/configuracion/:clave → editar un valor (escalera, trial o gracia)
 *
 * Ubicación: apps/admin/src/services/configuracionService.ts
 */

import { api, type RespuestaAPI } from './api';

/** Un tramo de la escalera de comisiones: # de activos → monto por activo/mes. */
export interface TramoEscalera {
  min: number;
  max: number | null; // null = sin tope
  montoPorActivo: number;
}

export type TipoConfig = 'numero' | 'json';

/** Una fila editable de Configuración (catálogo + valor actual). El `valor` es crudo (string). */
export interface ConfigFila {
  clave: string;
  etiqueta: string;
  descripcion: string;
  tipo: TipoConfig;
  categoria: string;
  unidad: string | null;
  min: number | null;
  max: number | null;
  valor: string;
  sembrado: boolean;
  actualizadoEn: string | null;
}

export async function listarConfiguracion(): Promise<ConfigFila[]> {
  const { data } = await api.get<RespuestaAPI<ConfigFila[]>>('/admin/configuracion');
  return data.data ?? [];
}

/** Edita un valor. `valor` viaja como string (número → "21"; escalera → JSON serializado). */
export async function actualizarConfiguracion(clave: string, valor: string): Promise<{ clave: string; valor: string }> {
  const { data } = await api.patch<RespuestaAPI<{ clave: string; valor: string }>>(
    `/admin/configuracion/${clave}`,
    { valor },
  );
  return data.data ?? { clave, valor };
}

/** Parsea el valor JSON de la escalera a tramos; [] si no es válido. */
export function parsearEscalera(valor: string): TramoEscalera[] {
  try {
    const arr = JSON.parse(valor);
    return Array.isArray(arr) ? (arr as TramoEscalera[]) : [];
  } catch {
    return [];
  }
}
