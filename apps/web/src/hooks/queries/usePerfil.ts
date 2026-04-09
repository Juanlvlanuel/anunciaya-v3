/**
 * usePerfil.ts
 * =============
 * Hooks de React Query para el módulo Mi Perfil de Business Studio.
 *
 * PATRÓN:
 *   - useQuery → datos del perfil (sucursal), lista de sucursales
 *   - El estado de formulario (edición) vive en perfil/hooks/usePerfil.ts
 *     que consume estos hooks para la carga inicial.
 *
 * NOTA: Configuración y Perfil son por sucursal. El perfil se carga
 *       como dato crudo y se transforma en el hook de formulario.
 *
 * Ubicación: apps/web/src/hooks/queries/usePerfil.ts
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { obtenerSucursalesNegocio } from '../../services/negociosService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

// Tipos para categorías/subcategorías
interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  orden: number;
}

interface Subcategoria {
  id: number;
  nombre: string;
  icono: string;
  orden: number;
}

// =============================================================================
// DATOS DEL PERFIL (por sucursal)
// =============================================================================

export function usePerfilSucursal() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.perfil.sucursal(sucursalId),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: unknown }>(
        `/negocios/sucursal/${sucursalId}`
      );
      return response.data.success ? response.data.data : null;
    },
    enabled: habilitado,
  });
}

// =============================================================================
// LISTA DE SUCURSALES (para determinar esPrincipal + totalSucursales)
// =============================================================================

export function usePerfilSucursales() {
  const negocioId = useAuthStore((s) => s.usuario?.negocioId ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!negocioId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.perfil.sucursales(negocioId),
    queryFn: () =>
      obtenerSucursalesNegocio(negocioId).then((r) => r.data ?? []),
    enabled: habilitado,
    staleTime: 5 * 60 * 1000, // 5 min — datos que cambian poco
  });
}

// =============================================================================
// CATEGORÍAS (referencia estática)
// =============================================================================

export function usePerfilCategorias() {
  return useQuery({
    queryKey: queryKeys.perfil.categorias(),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Categoria[] }>(
        '/categorias'
      );
      return response.data.success ? response.data.data : [];
    },
    staleTime: 10 * 60 * 1000, // 10 min — datos estáticos
  });
}

// =============================================================================
// SUBCATEGORÍAS (depende de categoría seleccionada)
// =============================================================================

export function usePerfilSubcategorias(categoriaId: number) {
  return useQuery({
    queryKey: queryKeys.perfil.subcategorias(categoriaId),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Subcategoria[] }>(
        `/categorias/${categoriaId}/subcategorias`
      );
      return response.data.success ? response.data.data : [];
    },
    enabled: !!categoriaId && categoriaId > 0,
    staleTime: 10 * 60 * 1000, // 10 min — datos estáticos
  });
}
