/**
 * BrandingColumn.tsx
 * ===================
 * Columna izquierda del registro en desktop.
 * Muestra logo, mensaje de bienvenida, badges y imagen hero.
 *
 * Ubicación: apps/web/src/components/auth/registro/BrandingColumn.tsx
 */

import { Building2, Tag, MapPin, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function BrandingColumn() {
  return (
    <div className="hidden lg:flex flex-col h-screen overflow-hidden">
      {/* ===================================================================== */}
      {/* PARTE SUPERIOR: Branding                                             */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 p-4 lg:p-6 xl:p-8 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 text-center">
          {/* Logo (más pequeño en laptop, normal en xl+) */}
          <Link to="/" className="flex justify-center mb-3 lg:mb-4 xl:mb-16 group">
            <img
              src="/logo-anunciaya-blanco.webp"
              alt="AnunciaYA"
              className="h-12 lg:h-16 xl:h-20 2xl:h-24 object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            />
          </Link>

          {/* Texto: Únete a la comunidad local más grande de México */}
          <p className="text-sm lg:text-base xl:text-lg 2xl:text-xl text-blue-100 mb-0.5 lg:mb-1">
            Únete y Gana Recompensas por comprar
          </p>
          <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-white mb-3 lg:mb-4 xl:mb-6 2xl:mb-8">
            en Negocios Locales de tu Comunidad.
          </p>

          {/* 3 Badges de beneficios (más pequeños en laptop) */}
          <div className="flex justify-center gap-1.5 lg:gap-2 2xl:gap-3 flex-wrap">
            <Badge color="green" icon={<Shield className="w-3 h-3 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />} text="Sin comisiones" />
            <Badge color="blue" icon={<MapPin className="w-3 h-3 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />} text="100% Local" />
            <Badge color="orange" icon={<Zap className="w-3 h-3 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />} text="Fácil de usar" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PARTE INFERIOR: Imagen Hero con Cards Flotantes                      */}
      {/* ===================================================================== */}
      <div className="flex-1 relative overflow-hidden">
        {/* Imagen de fondo */}
        <img
          src="/images/registro-hero.webp"
          alt="Comunidad AnunciaYA"
          className="w-full h-full object-cover"
        />

        {/* Overlay oscuro para contraste */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/30 to-transparent" />

        {/* Cards flotantes */}
        <FloatingCard
          className="top-[35%] left-[30%] animate-float-1"
          icon={<Building2 className="w-5 h-5 text-white" />}
          iconBg="bg-orange-500"
          title="Tacos El Güero"
          subtitle="⭐ 4.8 · Comida"
        />

        <FloatingCard
          className="top-[45%] right-[8%] animate-float-2"
          icon={<Tag className="w-5 h-5 text-white" />}
          iconBg="bg-green-500"
          title="-30% Hoy"
          subtitle="Farmacia del Pueblo"
        />

        <FloatingCard
          className="bottom-[15%] left-[15%] animate-float-3"
          icon={<MapPin className="w-5 h-5 text-white" />}
          iconBg="bg-blue-500"
          title="A 500m de ti"
          subtitle="12 negocios cerca"
        />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

interface BadgeProps {
  color: 'green' | 'blue' | 'orange';
  icon: React.ReactNode;
  text: string;
}

function Badge({ color, icon, text }: BadgeProps) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  const iconColors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
  };

  return (
    <div className={`flex items-center gap-1.5 lg:gap-2 ${colors[color]} border px-2 py-1.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 rounded-full`}>
      <span className={iconColors[color]}>{icon}</span>
      <span className="text-[10px] lg:text-xs 2xl:text-sm font-semibold">{text}</span>
    </div>
  );
}

interface FloatingCardProps {
  className?: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}

function FloatingCard({ className, icon, iconBg, title, subtitle }: FloatingCardProps) {
  return (
    <div
      className={`absolute bg-white/15 backdrop-blur-md border border-white/20 rounded-xl lg:rounded-2xl p-2 lg:p-3 flex items-center gap-2 lg:gap-3 ${className}`}
    >
      <div className={`w-8 h-8 lg:w-10 lg:h-10 ${iconBg} rounded-lg lg:rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-white text-xs lg:text-sm font-semibold">{title}</p>
        <p className="text-white/60 text-[10px] lg:text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

export default BrandingColumn;