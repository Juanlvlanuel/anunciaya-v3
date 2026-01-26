/**
 * ColumnaDerecha.tsx - VERSIÓN v3.8 CON ICONOS
 * ===================
 * Columna lateral derecha para desktop - 100% MONETIZACIÓN
 *
 * ✨ CAMBIOS v3.8 (19 Dic 2024) - ICONOS EN LUGAR DE EMOJIS:
 * - REEMPLAZADO: Todos los emojis por iconos de Lucide React
 * - Título Destacados: Star icon (amarillo)
 * - Título Fundadores: Trophy icon (amarillo)
 * - Avatares negocios: Iconos con fondo de color
 *   • Tacos: UtensilsCrossed (naranja)
 *   • Farmacia: Pill (rojo)
 *   • Café: Coffee (ámbar)
 *   • Zapatería: ShoppingBag (azul)
 * - Aspecto más profesional y consistente
 * 
 * ✨ CAMBIOS v3.7 (19 Dic 2024) - OPTIMIZADA FULL HD:
 * - AUMENTADO: Todos los tamaños para pantallas Full HD (2xl:)
 * - Títulos: text-base (16px) en 2xl:
 * - Iconos títulos: w-6 h-6 (24px) en 2xl:
 * - Avatares Destacados: w-14 h-14 (56px) en 2xl:
 * - Iconos avatares: w-8 h-8 (32px) en 2xl:
 * - Logos Fundadores: w-16 h-16 (64px) en 2xl:
 * - Nombre negocios: text-xl (20px) en 2xl:
 * - Descripción: text-base (16px) en 2xl:
 * - Badges: text-sm con padding aumentado en 2xl:
 * - Espaciados y gaps aumentados en 2xl:
 * - Indicadores carousel: w-3 h-3 (12px) en 2xl:
 * 
 * ✨ CAMBIOS v3.6 (19 Dic 2024) - EXPANDIDA:
 * - AMPLIADO: Destacados ahora muestra 4 anuncios (antes 2)
 * - AMPLIADO: Negocios Fundadores ahora muestra 2 filas de 4 logos (8 totales, antes 4)
 * - Carousel automático con 8 logos visibles simultáneamente
 * - Mayor capacidad de monetización
 * 
 * ✨ CAMBIOS v3.5 (19 Dic 2024) - SOLO PUBLICIDAD:
 * - ELIMINADO: CTA "¿Tienes un negocio?" (movido a ColumnaIzquierda)
 * - Columna derecha ahora es 100% para publicidad pagada
 * - Estrategia de monetización clara y enfocada
 * 
 * Contenido actual:
 * 1. Destacados: 4 anuncios con badges de gradiente e iconos
 *    - Patrocinado (dorado) - Star badge
 *    - Destacado (púrpura) - Sparkles badge
 *    - Premium (azul) - Crown badge
 * 2. Negocios Fundadores: Carousel de 8 avatares (2 filas × 4 columnas)
 *    - Auto-scroll cada 3 segundos
 *    - Grid responsive 4×2
 *    - Indicadores de página
 *
 * Iconos utilizados:
 * - Títulos: Star, Trophy
 * - Badges: Star, Sparkles, Crown
 * - Avatares: UtensilsCrossed, Pill, Coffee, ShoppingBag, Store
 *
 * Responsive (Full HD optimizado):
 * - Base (lg:): Compacto para laptops
 * - 2xl: (>1536px): Tamaños aumentados para Full HD y mayores
 *
 * Modelo de negocio:
 * - Patrocinados: Gradiente dorado (from-yellow-400 to-orange-500)
 * - Destacados: Gradiente púrpura (from-purple-500 to-indigo-500)
 * - Premium: Gradiente azul (from-blue-500 to-cyan-500)
 *
 * Ubicación: apps/web/src/components/layout/ColumnaDerecha.tsx
 */

import { useState, useEffect } from 'react';
import { 
  Star, 
  Sparkles, 
  Crown,
  UtensilsCrossed,
  Pill,
  Coffee,
  ShoppingBag,
  Trophy,
  Store,
} from 'lucide-react';

// =============================================================================
// DATOS DE EJEMPLO
// =============================================================================

const DESTACADOS = [
  {
    id: 1,
    nombre: 'Tacos El Güero',
    descripcion: '2x1 en tacos de pastor',
    badge: 'Patrocinado',
    icon: 'UtensilsCrossed',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
  {
    id: 2,
    nombre: 'Farmacia San Juan',
    descripcion: '20% en medicamentos genéricos',
    badge: 'Destacado',
    icon: 'Pill',
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  {
    id: 3,
    nombre: 'Café Aroma',
    descripcion: 'Cappuccino gratis con desayuno',
    badge: 'Premium',
    icon: 'Coffee',
    iconColor: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
  {
    id: 4,
    nombre: 'Zapatería Moderna',
    descripcion: '30% dto. en toda la tienda',
    badge: 'Patrocinado',
    icon: 'ShoppingBag',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
];

const NEGOCIOS_FUNDADORES = [
  { id: 1, nombre: 'Don Pepe', inicial: 'D' },
  { id: 2, nombre: 'El Rincón', inicial: 'E' },
  { id: 3, nombre: 'Farmacia', inicial: 'F' },
  { id: 4, nombre: 'Abarrotes', inicial: 'A' },
  { id: 5, nombre: 'Pollería', inicial: 'P' },
  { id: 6, nombre: 'Carnicería', inicial: 'C' },
  { id: 7, nombre: 'Lavandería', inicial: 'L' },
  { id: 8, nombre: 'Tintorería', inicial: 'T' },
  { id: 9, nombre: 'Boutique', inicial: 'B' },
  { id: 10, nombre: 'Zapatería', inicial: 'Z' },
  { id: 11, nombre: 'Mercado', inicial: 'M' },
  { id: 12, nombre: 'Heladería', inicial: 'H' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaDerecha() {
  return (
    <div className="space-y-4 2xl:space-y-6">
      {/* Sección 1: Destacados (Publicidad Pagada) */}
      <SeccionDestacados />

      {/* Sección 2: Negocios Fundadores (Publicidad) */}
      <SeccionFundadores />
    </div>
  );
}

// =============================================================================
// SECCIÓN 1: DESTACADOS
// =============================================================================

function SeccionDestacados() {
  /**
   * Función para obtener el estilo del badge según el tipo
   * Retorna clases de Tailwind con gradientes
   */
  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'Patrocinado':
        // Gradiente dorado para patrocinados
        return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'Destacado':
        // Gradiente púrpura para destacados
        return 'bg-gradient-to-r from-purple-500 to-indigo-500';
      case 'Premium':
        // Gradiente azul para premium
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Función para obtener el icono del badge
   */
  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'Patrocinado':
        return Star;
      case 'Destacado':
        return Sparkles;
      case 'Premium':
        return Crown;
      default:
        return Star;
    }
  };

  /**
   * Función para obtener el componente de icono según el nombre
   */
  const getAvatarIcon = (iconName: string) => {
    switch (iconName) {
      case 'UtensilsCrossed':
        return UtensilsCrossed;
      case 'Pill':
        return Pill;
      case 'Coffee':
        return Coffee;
      case 'ShoppingBag':
        return ShoppingBag;
      default:
        return Store;
    }
  };

  return (
    <div>
      {/* Título de la sección */}
      <h3 className="text-xs 2xl:text-base font-bold text-gray-700 uppercase tracking-wide mb-3 2xl:mb-4 flex items-center gap-2 2xl:gap-3">
        <Star className="w-4 h-4 2xl:w-6 2xl:h-6 text-yellow-500" />
        <span>Destacados</span>
      </h3>

      {/* Lista de negocios destacados */}
      <div className="space-y-2 2xl:space-y-3.5">
        {DESTACADOS.map((item) => {
          const BadgeIcon = getBadgeIcon(item.badge);
          const AvatarIcon = getAvatarIcon(item.icon);
          
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl 2xl:rounded-2xl p-2 2xl:p-4 hover:shadow-md transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-2 2xl:gap-3.5">
                {/* Avatar del negocio - ICONO */}
                <div className={`w-9 h-9 2xl:w-14 2xl:h-14 ${item.iconBg} rounded-lg 2xl:rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <AvatarIcon className={`w-5 h-5 2xl:w-8 2xl:h-8 ${item.iconColor}`} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  {/* Badge con gradiente */}
                  <div className="flex items-center gap-2 mb-0.5 2xl:mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs 2xl:text-sm px-2 2xl:px-3 py-0.5 2xl:py-1 rounded-full font-semibold text-white ${getBadgeStyle(item.badge)}`}
                    >
                      <BadgeIcon className="w-3 h-3 2xl:w-4 2xl:h-4" />
                      <span>{item.badge}</span>
                    </span>
                  </div>
                  
                  {/* Nombre del negocio */}
                  <p className="font-bold text-gray-900 text-sm 2xl:text-xl truncate">
                    {item.nombre}
                  </p>
                  
                  {/* Descripción de la oferta */}
                  <p className="text-xs 2xl:text-base text-gray-600 truncate">
                    {item.descripcion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// SECCIÓN 2: NEGOCIOS FUNDADORES
// =============================================================================

function SeccionFundadores() {
  const [indiceActivo, setIndiceActivo] = useState(0);

  /**
   * Auto-scroll del carrusel cada 3 segundos
   * useEffect se encarga de cambiar automáticamente el índice
   */
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActivo((prev) => (prev + 1) % NEGOCIOS_FUNDADORES.length);
    }, 3000);

    // Cleanup: limpia el intervalo cuando el componente se desmonta
    return () => clearInterval(intervalo);
  }, []);

  /**
   * Mostrar 8 negocios a la vez en el carrusel (2 filas de 4)
   * Calcula qué negocios mostrar según el índice activo
   */
  const negociosVisibles = [];
  for (let i = 0; i < 8; i++) {
    const indice = (indiceActivo + i) % NEGOCIOS_FUNDADORES.length;
    negociosVisibles.push(NEGOCIOS_FUNDADORES[indice]);
  }

  return (
    <div>
      {/* Título de la sección con icono */}
      <h3 className="text-xs 2xl:text-base font-bold text-gray-700 uppercase tracking-wide mb-3 2xl:mb-4 flex items-center gap-2 2xl:gap-3">
        <Trophy className="w-4 h-4 2xl:w-6 2xl:h-6 text-yellow-600" />
        <span>Negocios Fundadores</span>
      </h3>

      {/* Grid de avatares circulares - 2 FILAS de 4 columnas */}
      <div className="grid grid-cols-4 gap-2 2xl:gap-3.5">
        {negociosVisibles.map((negocio, index) => (
          <div
            key={`${negocio.id}-${index}`}
            className="w-10 h-10 2xl:w-16 2xl:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm 2xl:text-xl cursor-pointer hover:scale-110 transition-transform duration-150"
            title={negocio.nombre}
          >
            {negocio.inicial}
          </div>
        ))}
      </div>

      {/* Indicadores de puntos del carrusel */}
      <div className="flex justify-center gap-1.5 2xl:gap-2.5 mt-2 2xl:mt-4">
        {NEGOCIOS_FUNDADORES.slice(0, Math.ceil(NEGOCIOS_FUNDADORES.length / 8)).map(
          (_, index) => (
            <button
              key={index}
              onClick={() => setIndiceActivo(index * 8)}
              className={`w-1.5 h-1.5 2xl:w-3 2xl:h-3 rounded-full transition-colors duration-150 ${
                Math.floor(indiceActivo / 8) === index
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
              aria-label={`Ir a página ${index + 1}`}
            />
          )
        )}
      </div>
    </div>
  );
}


export default ColumnaDerecha;