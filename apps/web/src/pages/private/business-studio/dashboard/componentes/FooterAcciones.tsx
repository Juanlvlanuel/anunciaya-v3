/**
 * FooterAcciones.tsx
 * ====================
 * Footer con acciones rápidas del Dashboard
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/FooterAcciones.tsx
 */

import { 
  Tag, 
  Ticket, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  ChevronRight 
} from 'lucide-react';

// =============================================================================
// DATOS
// =============================================================================

const ACCIONES = [
  {
    id: 'nueva-oferta',
    titulo: 'Nueva Oferta',
    descripcion: 'Crear promoción',
    icono: Tag,
    color: 'from-rose-500 to-pink-600',
    bgLight: 'bg-rose-50',
  },
  {
    id: 'nuevo-cupon',
    titulo: 'Nuevo Cupón',
    descripcion: 'Generar cupón',
    icono: Ticket,
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
  },
  {
    id: 'nuevo-producto',
    titulo: 'Agregar Producto',
    descripcion: 'Al catálogo',
    icono: Package,
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
  },
  {
    id: 'ver-clientes',
    titulo: 'Mis Clientes',
    descripcion: 'Ver lista',
    icono: Users,
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    descripcion: 'Estadísticas',
    icono: BarChart3,
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
  },
  {
    id: 'configuracion',
    titulo: 'Configuración',
    descripcion: 'Mi negocio',
    icono: Settings,
    color: 'from-slate-500 to-slate-700',
    bgLight: 'bg-slate-100',
  },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export default function FooterAcciones() {
  return (
    <div className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl border-2 border-slate-300 p-4 lg:p-3.5 2xl:p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Acciones Rápidas</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          Ver todo
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid de acciones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 2xl:gap-5">
        {ACCIONES.map((accion) => {
          const Icono = accion.icono;

          return (
            <button
              key={accion.id}
              className="group p-3 lg:p-2.5 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.05] 2xl:hover:scale-[1.05] hover:-translate-y-1 transition-all duration-200 text-left"
            >
              <div className={`w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-linear-to-br ${accion.color} flex items-center justify-center mb-2.5 lg:mb-2 2xl:mb-2.5 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icono className="w-4.5 h-4.5 lg:w-4 lg:h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
              </div>
              <p className="font-medium text-slate-800 text-sm lg:text-xs 2xl:text-sm">{accion.titulo}</p>
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500">{accion.descripcion}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}