/**
 * IndicadoresRapidos.tsx
 * ======================
 * Grid de accesos rápidos - DISEÑO PROFESIONAL + RESPONSIVE.
 *
 * v6.0 - Sistema de 3 niveles responsive:
 * - Móvil (base): Valores originales
 * - Laptop (lg:): Reducción ~30% para optimizar espacio
 * - Desktop (2xl:): Restauración de valores originales
 *
 * Características:
 * - Grid 2 columnas fijo
 * - Cards con hover effect
 * - Badges con contadores
 * - Logo ChatYA visible
 * - Iconos Lucide para otros accesos
 *
 * Ubicación: apps/web/src/components/scanya/IndicadoresRapidos.tsx
 */

import { Star, WifiOff, Ticket, History } from 'lucide-react';

// =============================================================================
// INTERFACES
// =============================================================================

interface Contadores {
  recordatoriosPendientes: number;
  mensajesSinLeer: number;
  resenasPendientes: number;
  vouchersPendientes: number;
}

interface IndicadoresRapidosProps {
  contadores: Contadores;
  onNavigate: (ruta: string) => void;
}

interface Boton {
  id: string;
  label: string;
  icon?: typeof Star;
  isLogo?: boolean;
  logoSrc?: string;
  ruta: string;
  contador?: keyof Contadores;
  color: string;
  borderColor: string;
  bgHover: string;
}

// =============================================================================
// CONFIGURACIÓN DE BOTONES
// =============================================================================

const BOTONES: Boton[] = [
  {
    id: 'chat',
    label: '',
    isLogo: true,
    logoSrc: '/logo-ChatYA-blanco.webp',
    ruta: '/scanya/chat',
    contador: 'mensajesSinLeer',
    color: 'text-[#3B82F6]',
    borderColor: '#3B82F6',
    bgHover: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'resenas',
    label: 'Reseñas',
    icon: Star,
    ruta: '/scanya/resenas',
    contador: 'resenasPendientes',
    color: 'text-[#F59E0B]',
    borderColor: '#3B82F6',
    bgHover: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'recordatorios',
    label: 'Offline',
    icon: WifiOff,
    ruta: '/scanya/recordatorios',
    contador: 'recordatoriosPendientes',
    color: 'text-[#10B981]',
    borderColor: '#3B82F6',
    bgHover: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'vouchers',
    label: 'Vouchers',
    icon: Ticket,
    ruta: '/scanya/vouchers',
    contador: 'vouchersPendientes',
    color: 'text-[#8B5CF6]',
    borderColor: '#3B82F6',
    bgHover: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'historial',
    label: 'Historial',
    icon: History,
    ruta: '/scanya/historial',
    color: 'text-[#94A3B8]',
    borderColor: '#3B82F6',
    bgHover: 'rgba(148, 163, 184, 0.15)',
  },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function IndicadoresRapidos({
  contadores,
  onNavigate,
}: IndicadoresRapidosProps) {
  return (
    <div>
      {/* Grid de botones - 3 columnas móvil, 2 columnas PC */}
      <div
        className="
          grid grid-cols-3 lg:grid-cols-2
          gap-3 lg:gap-4 2xl:gap-6
          mt-6 lg:mt-6 2xl:mt-10
        "
      >
        {BOTONES.map((boton) => {
          const Icon = boton.icon;
          const valorContador = boton.contador ? contadores[boton.contador] : 0;
          const mostrarBadge = valorContador > 0;

          return (
            <button
              key={boton.id}
              onClick={() => onNavigate(boton.ruta)}
              className="
                relative
                rounded-lg lg:rounded-lg 2xl:rounded-xl
                p-3 lg:p-3 2xl:p-4
                flex flex-col items-center justify-center 
                gap-1.5 lg:gap-2 2xl:gap-2.5
                transition-all duration-200
                cursor-pointer
                group
              "
              style={{
                background: '#011545',
                border: `3px solid ${boton.borderColor}`,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 0 15px ${boton.borderColor.replace('0.3', '0.1')}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = boton.bgHover;
                e.currentTarget.style.boxShadow = `0 0 25px ${boton.borderColor.replace('0.3', '0.2')}`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)';
                e.currentTarget.style.boxShadow = `0 0 15px ${boton.borderColor.replace('0.3', '0.1')}`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Badge con contador */}
              {mostrarBadge && (
                <div
                  className="
                    absolute -top-1.5 -right-1.5 lg:-top-2 lg:-right-2
                    bg-[#DC2626]
                    text-white 
                    text-[10px] lg:text-[10px] 2xl:text-xs
                    font-bold
                    min-w-5 h-5
                    lg:min-w-5 lg:h-5
                    2xl:min-w-6 2xl:h-6
                    px-1 lg:px-1 2xl:px-1.5
                    rounded-full
                    flex items-center justify-center
                    shadow-lg
                  "
                  style={{
                    boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)',
                  }}
                >
                  {valorContador > 99 ? '99+' : valorContador}
                </div>
              )}

              {/* Logo o Ícono */}
              {boton.isLogo && boton.logoSrc ? (
                <img
                  src={boton.logoSrc}
                  alt={boton.label}
                  className="
                    w-auto 
                    h-14 lg:h-12 2xl:h-15
                    object-contain
                    group-hover:scale-110
                    transition-transform duration-200
                  "
                />
              ) : Icon ? (
                <>
                  {/* Ícono */}
                  <Icon
                    className={`
                      w-8 h-8
                      lg:w-8 lg:h-8
                      2xl:w-10 2xl:h-10
                      ${boton.color}
                      group-hover:scale-110
                      transition-transform duration-200
                    `}
                    strokeWidth={2}
                  />

                  {/* Label */}
                  <span
                    className="
                      text-white font-semibold
                      text-xs lg:text-xs 2xl:text-sm
                      text-center
                    "
                  >
                    {boton.label}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}