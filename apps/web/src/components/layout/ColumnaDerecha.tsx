/**
 * ColumnaDerecha.tsx - VERSIÓN v4.1 ESTILO COHERENTE
 * ====================================================
 * Columna lateral derecha para desktop - 100% MONETIZACIÓN
 *
 * ✨ CAMBIOS v4.1:
 * - Sin cards redondeados (coherente con ColumnaIzquierda)
 * - Anuncios más grande
 * - Patrocinadores reducido ~75%
 * - Bordes sutiles con border-b
 * - Headers con gradientes sutiles
 *
 * Ubicación: apps/web/src/components/layout/ColumnaDerecha.tsx
 */

import { useState, useEffect } from 'react';
import {
  Star,
  Sparkles,
  Crown,
  Megaphone,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';

// =============================================================================
// DATOS DE EJEMPLO
// =============================================================================

const ANUNCIOS_PEQUENOS = [
  {
    id: 1,
    titulo: '2x1 en tacos de pastor',
    negocio: 'Tacos El Güero',
    badge: 'Oferta',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 2,
    titulo: '20% dto. medicamentos',
    negocio: 'Farmacia San Juan',
    badge: 'Promo',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 3,
    titulo: 'Café gratis con desayuno',
    negocio: 'Café Aroma',
    badge: 'Nuevo',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 4,
    titulo: '30% en toda la tienda',
    negocio: 'Zapatería Moderna',
    badge: 'Oferta',
    color: 'from-blue-500 to-indigo-500',
  },
];

const PATROCINADORES_GRANDES = [
  {
    id: 1,
    nombre: 'Restaurante Don Pepe',
    descripcion: 'Los mejores tacos de la ciudad. Ven y prueba nuestra salsa secreta.',
    badge: 'Patrocinado',
    badgeIcon: 'Star',
    gradiente: 'from-orange-400 via-red-500 to-pink-500',
  },
  {
    id: 2,
    nombre: 'Farmacia del Ahorro',
    descripcion: 'Tu salud es nuestra prioridad. Medicamentos con los mejores precios.',
    badge: 'Premium',
    badgeIcon: 'Crown',
    gradiente: 'from-emerald-400 via-teal-500 to-cyan-500',
  },
  {
    id: 3,
    nombre: 'Boutique Elegance',
    descripcion: 'Moda exclusiva para toda la familia. Nueva colección disponible.',
    badge: 'Destacado',
    badgeIcon: 'Sparkles',
    gradiente: 'from-purple-400 via-pink-500 to-rose-500',
  },
];

const NEGOCIOS_FUNDADORES = [
  { id: 1, nombre: 'Don Pepe', inicial: 'DP', color: 'from-orange-400 to-orange-600' },
  { id: 2, nombre: 'El Rincón', inicial: 'ER', color: 'from-red-400 to-red-600' },
  { id: 3, nombre: 'Farmacia', inicial: 'FA', color: 'from-emerald-400 to-emerald-600' },
  { id: 4, nombre: 'Abarrotes', inicial: 'AB', color: 'from-blue-400 to-blue-600' },
  { id: 5, nombre: 'Pollería', inicial: 'PO', color: 'from-amber-400 to-amber-600' },
  { id: 6, nombre: 'Carnicería', inicial: 'CA', color: 'from-rose-400 to-rose-600' },
  { id: 7, nombre: 'Lavandería', inicial: 'LA', color: 'from-cyan-400 to-cyan-600' },
  { id: 8, nombre: 'Tintorería', inicial: 'TI', color: 'from-violet-400 to-violet-600' },
  { id: 9, nombre: 'Boutique', inicial: 'BO', color: 'from-pink-400 to-pink-600' },
  { id: 10, nombre: 'Zapatería', inicial: 'ZA', color: 'from-indigo-400 to-indigo-600' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaDerecha() {
  return (
    <div className="absolute inset-0 bg-white overflow-y-auto flex flex-col">
      {/* Sección 1: Anuncios Pequeños */}
      <SeccionAnuncios />

      {/* Espaciador flexible superior */}
      <div className="flex-1" />

      {/* Sección 2: Patrocinadores Grandes */}
      <SeccionPatrocinadores />

      {/* Espaciador flexible inferior */}
      <div className="flex-1" />

      {/* Sección 3: Logos Fundadores */}
      <SeccionFundadores />
    </div>
  );
}

// =============================================================================
// SECCIÓN 1: ANUNCIOS
// =============================================================================

function SeccionAnuncios() {
  const [indiceActual, setIndiceActual] = useState(0);

  // Auto-scroll cada 4 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % ANUNCIOS_PEQUENOS.length);
    }, 4000);
    return () => clearInterval(intervalo);
  }, []);

  const anuncio = ANUNCIOS_PEQUENOS[indiceActual];

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-linear-to-r from-amber-100 to-orange-50">
        <div className="flex items-center gap-2 text-left">
          <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-amber-500 rounded-md flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
          </div>
          <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">
            Anuncios
          </span>
        </div>
      </div>

      {/* Contenido del anuncio */}
      <div className="px-4 py-4 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4">
        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
          {/* Icono con gradiente */}
          <div className={`w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-linear-to-br ${anuncio.color} rounded-xl flex items-center justify-center shadow-md shrink-0`}>
            <Store className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Badge */}
            <span className={`inline-block text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-white px-2 py-0.5 rounded bg-linear-to-r ${anuncio.color} mb-1`}>
              {anuncio.badge}
            </span>
            {/* Título */}
            <p className="font-bold text-black text-sm lg:text-sm 2xl:text-base truncate">
              {anuncio.titulo}
            </p>
            {/* Negocio */}
            <p className="text-xs lg:text-xs 2xl:text-sm text-slate-600 truncate">
              {anuncio.negocio}
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-1.5 pb-3 lg:pb-2 2xl:pb-3">
        {ANUNCIOS_PEQUENOS.map((_, index) => (
          <button
            key={index}
            onClick={() => setIndiceActual(index)}
            className={`h-2.5 lg:h-2 2xl:h-2.5 rounded-full transition-all ${index === indiceActual
                ? 'bg-amber-500 w-6 lg:w-5 2xl:w-6'
                : 'bg-slate-300 w-2.5 lg:w-2 2xl:w-2.5'
              }`}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SECCIÓN 2: PATROCINADORES
// =============================================================================

function SeccionPatrocinadores() {
  const [indiceActual, setIndiceActual] = useState(0);

  // Auto-scroll cada 5 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % PATROCINADORES_GRANDES.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const patrocinador = PATROCINADORES_GRANDES[indiceActual];

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Star': return Star;
      case 'Crown': return Crown;
      case 'Sparkles': return Sparkles;
      default: return Star;
    }
  };

  const BadgeIcon = getBadgeIcon(patrocinador.badgeIcon);

  const anterior = () => {
    setIndiceActual((prev) => (prev - 1 + PATROCINADORES_GRANDES.length) % PATROCINADORES_GRANDES.length);
  };

  const siguiente = () => {
    setIndiceActual((prev) => (prev + 1) % PATROCINADORES_GRANDES.length);
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 bg-linear-to-r from-blue-100 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Star className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
            </div>
            <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">
              Patrocinadores
            </span>
          </div>

          {/* Flechas de navegación */}
          <div className="flex items-center gap-1">
            <button
              onClick={anterior}
              className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-600" />
            </button>
            <button
              onClick={siguiente}
              className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronRight className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="relative h-[130px] lg:h-[220px] 2xl:h-[450px]">
        <div className={`absolute inset-0 bg-linear-to-br ${patrocinador.gradiente}`} />

        {/* Contenido del banner */}
        <div className="relative h-full p-3 lg:p-2.5 2xl:p-3 flex flex-col justify-between text-white">
          {/* Badge */}
          <span className="self-start inline-flex items-center gap-1 text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold bg-white/25 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <BadgeIcon className="w-2.5 h-2.5 lg:w-2 lg:h-2 2xl:w-2.5 2xl:h-2.5" />
            {patrocinador.badge}
          </span>

          {/* Texto */}
          <div>
            <h3 className="font-black text-sm lg:text-xs 2xl:text-sm mb-0.5 drop-shadow-md">
              {patrocinador.nombre}
            </h3>
            <p className="text-[11px] lg:text-[10px] 2xl:text-xs opacity-95 line-clamp-2 drop-shadow">
              {patrocinador.descripcion}
            </p>
          </div>

          {/* CTA */}
          <button className="self-start px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 bg-white text-slate-800 rounded-md font-bold text-[11px] lg:text-[10px] 2xl:text-[11px] hover:bg-slate-100 transition-colors shadow-md">
            Ver más
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-1.5 py-2 lg:py-1.5 2xl:py-2 bg-white">
        {PATROCINADORES_GRANDES.map((_, index) => (
          <button
            key={index}
            onClick={() => setIndiceActual(index)}
            className={`h-2.5 lg:h-2 2xl:h-2.5 rounded-full transition-all ${index === indiceActual
              ? 'bg-blue-500 w-6 lg:w-5 2xl:w-6'
              : 'bg-slate-300 w-2.5 lg:w-2 2xl:w-2.5'
              }`}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SECCIÓN 3: FUNDADORES
// =============================================================================

function SeccionFundadores() {
  const [offset, setOffset] = useState(0);

  // Auto-scroll continuo cada 2 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setOffset((prev) => (prev + 1) % NEGOCIOS_FUNDADORES.length);
    }, 2000);
    return () => clearInterval(intervalo);
  }, []);

  // Mostrar 5 logos visibles
  const logosVisibles = [];
  for (let i = 0; i < 4; i++) {
    const indice = (offset + i) % NEGOCIOS_FUNDADORES.length;
    logosVisibles.push(NEGOCIOS_FUNDADORES[indice]);
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-linear-to-r from-violet-100 to-purple-50">
        <div className="flex items-center gap-2 text-left">
          <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
          </div>
          <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">
            Fundadores
          </span>
        </div>
      </div>

      {/* Logos en scroll horizontal */}
      <div className="px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3">
        <div className="flex justify-center gap-3 lg:gap-2 2xl:gap-4">
          {logosVisibles.map((negocio, index) => (
            <div
              key={`${negocio.id}-${index}`}
              className={`w-14 h-14 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 bg-linear-to-br ${negocio.color} rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-[10px] 2xl:text-sm cursor-pointer hover:scale-110 transition-transform shadow-md`}
              title={negocio.nombre}
            >
              {negocio.inicial}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ColumnaDerecha;