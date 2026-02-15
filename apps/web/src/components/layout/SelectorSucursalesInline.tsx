/**
 * SelectorSucursalesInline.tsx
 * =============================
 * Selector de sucursales integrado inline con flechas de navegación
 * 
 * COMPORTAMIENTO:
 * - DUEÑO con 1 sucursal: Solo muestra nombre del NEGOCIO (sin decoraciones)
 * - DUEÑO con 2+ sucursales: Muestra nombre del NEGOCIO + flechas + contador + etiqueta sucursal
 * - GERENTE: Muestra nombre del NEGOCIO + etiqueta "Sucursal Fija"
 * 
 * DISEÑO v4.0 (FINAL):
 * - Primera línea: Nombre del NEGOCIO (texto más grande)
 * - Segunda línea: "Matriz" o nombre de sucursal específica
 * - Contador "1 de 3" va ENTRE las flechas (lado izquierdo de →)
 * - SIN etiqueta "Administrando:" (textos más grandes y legibles)
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/SelectorSucursalesInline.tsx
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { obtenerSucursalesNegocio } from '../../services/negociosService';
import Tooltip from '../../components/ui/Tooltip';

// =============================================================================
// TIPOS
// =============================================================================

interface Sucursal {
  id: string;
  nombre: string;
  esPrincipal: boolean;
  activa: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function SelectorSucursalesInline() {
  const { usuario, setSucursalActiva, setEsSucursalPrincipal } = useAuthStore();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);

  // Determinar tipo de usuario
  const esDueño = usuario?.negocioId && !usuario?.sucursalAsignada;
  const esGerente = usuario?.negocioId && usuario?.sucursalAsignada;

  // Cargar sucursales
  useEffect(() => {
    async function cargar() {
      // ✅ VALIDAR que hay usuario logueado Y en modo comercial
      if (!usuario?.negocioId || usuario?.modoActivo !== 'comercial') {
        setSucursales([]);
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        const respuesta = await obtenerSucursalesNegocio(usuario.negocioId);

        if (respuesta.success && respuesta.data) {
          // Ordenar: Principal primero, luego por nombre
          const ordenadas = [...respuesta.data].sort((a, b) => {
            if (a.esPrincipal) return -1;
            if (b.esPrincipal) return 1;
            return a.nombre.localeCompare(b.nombre);
          });
          setSucursales(ordenadas);

          // ✅ Si no hay sucursal activa, asignar la primera (principal)
          if (!usuario?.sucursalActiva && ordenadas.length > 0) {
            setSucursalActiva(ordenadas[0].id);
          }

          // Actualizar si la sucursal activa es principal
          if (usuario?.sucursalActiva) {
            const sucursalAct = ordenadas.find(s => s.id === usuario.sucursalActiva);
            setEsSucursalPrincipal(sucursalAct?.esPrincipal ?? true);
          }
        }
      } catch (error) {
        console.error('[SELECTOR] Error cargando sucursales:', error);
        setSucursales([]);
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [usuario?.negocioId, usuario?.modoActivo]);

  // Obtener índice de sucursal actual
  const indiceActual = sucursales.findIndex(s => s.id === usuario?.sucursalActiva);
  const sucursalActual = sucursales[indiceActual];

  // Handlers: Navegar entre sucursales
  const irAnterior = () => {
    if (indiceActual > 0) {
      const sucAnterior = sucursales[indiceActual - 1];
      setSucursalActiva(sucAnterior.id);
      setEsSucursalPrincipal(sucAnterior.esPrincipal);
    }
  };

  const irSiguiente = () => {
    if (indiceActual < sucursales.length - 1) {
      const sucSiguiente = sucursales[indiceActual + 1];
      setSucursalActiva(sucSiguiente.id);
      setEsSucursalPrincipal(sucSiguiente.esPrincipal);
    }
  };

  // =========================================================================
  // RENDERIZADO CONDICIONAL
  // =========================================================================

  // Si está cargando
  if (cargando) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-32 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  // =========================================================================
  // CASO 1: GERENTE (sin flechas, muestra nombre fijo)
  // =========================================================================
  if (esGerente) {
    // Buscar el nombre de la sucursal asignada
    const sucursalAsignada = sucursales.find(s => s.id === usuario?.sucursalAsignada);
    const nombreSucursal = sucursalAsignada?.nombre || 'Sucursal Fija';

    return (
      <div className="flex flex-col">
        {/* Nombre del NEGOCIO - Responsive */}
        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">
          {usuario?.nombreNegocio || 'Sin asignar'}
        </span>
        {/* Nombre real de la sucursal asignada */}
        <span className="text-xs lg:text-xs 2xl:text-sm text-cyan-300 font-bold">
          {nombreSucursal}
        </span>
      </div>
    );
  }

  // =========================================================================
  // CASO 2: DUEÑO con SOLO 1 SUCURSAL (sin decoraciones)
  // =========================================================================
  if (esDueño && sucursales.length === 1) {
    return (
      <div className="flex flex-col">
        {/* Nombre del NEGOCIO - Responsive - CENTRADO */}
        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">
          {usuario?.nombreNegocio || 'Sin nombre'}
        </span>
        {/* Sin texto debajo cuando solo hay 1 sucursal */}
      </div>
    );
  }

  // =========================================================================
  // CASO 3: DUEÑO con 2+ SUCURSALES (con flechas y contador)
  // =========================================================================
  if (esDueño && sucursales.length > 1) {
    return (
      <div className="flex items-center gap-1 lg:gap-1 2xl:gap-2">
        {/* Flecha Izquierda */}
        <Tooltip text="Sucursal anterior" position="bottom">
          <button
            onClick={irAnterior}
            disabled={indiceActual === 0}
            className={`p-1 lg:p-1 2xl:p-1.5 rounded-lg transition-all ${indiceActual === 0
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer'
              }`}
          >
            <ChevronLeft className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          </button>
        </Tooltip>

        {/* Nombre del NEGOCIO + Etiqueta de Sucursal */}
        <div className="flex flex-col min-w-[140px] lg:min-w-[140px] 2xl:min-w-[200px]">
          {/* Primera línea: Nombre del NEGOCIO - Responsive */}
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white truncate">
            {usuario?.nombreNegocio || 'Sin nombre'}
          </span>

          {/* Segunda línea: "Matriz" o Nombre de Sucursal */}
          <span className="text-xs lg:text-xs 2xl:text-sm font-bold text-cyan-300">
            {sucursalActual?.nombre}
          </span>
        </div>

        {/* Contador "1 de 3" antes de la flecha derecha */}
        <span className="text-xs lg:text-xs 2xl:text-sm text-blue-200 font-medium">
          {indiceActual + 1} de {sucursales.length}
        </span>

        {/* Flecha Derecha */}
        <Tooltip text="Siguiente sucursal" position="bottom">
          <button
            onClick={irSiguiente}
            disabled={indiceActual === sucursales.length - 1}
            className={`p-1 lg:p-1 2xl:p-1.5 rounded-lg transition-all ${indiceActual === sucursales.length - 1
              ? 'text-white/30 cursor-not-allowed'
              : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer'
              }`}
          >
            <ChevronRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          </button>
        </Tooltip>
      </div>
    );
  }

  // Usuario sin negocio o sin sucursales
  return null;
}