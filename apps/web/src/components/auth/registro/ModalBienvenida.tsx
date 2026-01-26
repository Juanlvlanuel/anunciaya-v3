/**
 * ModalBienvenida.tsx
 * ====================
 * Modal informativo post-registro que prepara al usuario para el onboarding.
 * Tiene 2 variantes: Personal y Comercial.
 *
 * Ubicación: apps/web/src/components/auth/registro/ModalBienvenida.tsx
 */

import { Check, Edit3, TrendingUp, ArrowRight, Home, Search, Tag, MapPin } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalBienvenidaProps {
  isOpen: boolean;
  tipo: 'personal' | 'comercial';
  nombre: string;
  onCompletarPerfil?: () => void;
  onIrAlInicio: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalBienvenida({
  isOpen,
  tipo,
  nombre,
  onCompletarPerfil,
  onIrAlInicio,
}: ModalBienvenidaProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop con gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header con check verde */}
        <div className="px-8 pt-10 pb-6 text-center">
          {/* Icono check verde con círculo */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="w-20 h-20 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-50">
              <Check className="w-10 h-10 text-emerald-500 stroke-[3]" />
            </div>
          </div>

          {/* Línea decorativa azul */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <div className="w-10 h-1 bg-blue-600 rounded-full" />
            <div className="w-2.5 h-1 bg-blue-400 rounded-full" />
          </div>

          {/* Texto de bienvenida */}
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            ¡Perfecto, {nombre}!
          </h3>
          <p className="text-slate-500 text-sm mb-1">Cuenta creada exitosamente</p>
        </div>

        {/* Contenido según tipo */}
        <div className="px-8 pb-8">
          {tipo === 'personal' ? (
            <ContenidoPersonal onIrAlInicio={onIrAlInicio} />
          ) : (
            <ContenidoComercial onIrAlInicio={onIrAlInicio} onCompletarPerfil={onCompletarPerfil} />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VARIANTE PERSONAL
// =============================================================================

interface ContenidoPersonalProps {
  onIrAlInicio: () => void;
}

function ContenidoPersonal({ onIrAlInicio }: ContenidoPersonalProps) {
  const features = [
    {
      icon: <Search className="w-6 h-6 text-blue-600" />,
      titulo: 'Busca negocios',
      descripcion: 'Encuentra lo que necesitas',
    },
    {
      icon: <Tag className="w-6 h-6 text-green-600" />,
      titulo: 'Ofertas locales',
      descripcion: 'Descubre promociones',
    },
    {
      icon: <MapPin className="w-6 h-6 text-orange-600" />,
      titulo: 'Cerca de ti',
      descripcion: 'Negocios en tu zona',
    },
  ];

  return (
    <>
      {/* Mensaje */}
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-slate-900 mb-2">
          ¡Bienvenido a AnunciaYA!
        </h4>
        <p className="text-slate-600 text-sm">
          Descubre negocios y ofertas en tu zona
        </p>
      </div>

      {/* Features en grid 3 columnas */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              {feature.icon}
            </div>
            <h5 className="text-xs font-bold text-slate-900 mb-1">{feature.titulo}</h5>
            <p className="text-xs text-slate-600">{feature.descripcion}</p>
          </div>
        ))}
      </div>

      {/* Botón */}
      <button
        onClick={onIrAlInicio}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
      >
        <Home className="w-4 h-4" />
        Ir al inicio
      </button>
    </>
  );
}

// =============================================================================
// VARIANTE COMERCIAL
// =============================================================================

interface ContenidoComercialProps {
  onIrAlInicio: () => void;
  onCompletarPerfil?: () => void;
}

function ContenidoComercial({ onIrAlInicio, onCompletarPerfil }: ContenidoComercialProps) {
  return (
    <>
      {/* Mensaje principal */}
      <div className="text-center mb-6">
        <h4 className="text-xl font-bold text-slate-900 mb-2">
          Configuremos tu negocio
        </h4>
        <p className="text-slate-600 text-sm">
          Solo lo básico para que tu negocio sea visible
        </p>
      </div>

      {/* Cards informativos en fila horizontal */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Card 1: Editable */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Edit3 className="w-6 h-6 text-blue-600" />
          </div>
          <h5 className="text-sm font-bold text-slate-900 mb-1">
            100% Editable
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            Puedes cambiar todo después en Business Studio
          </p>
        </div>

        {/* Card 2: Agrega más después */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <h5 className="text-sm font-bold text-slate-900 mb-1">
            Agrega más después
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            Completa tu perfil a tu ritmo
          </p>
        </div>
      </div>

      {/* Botones */}
      <div className="space-y-3">
        {/* Botón principal - Solo se muestra si existe onCompletarPerfil */}
        {onCompletarPerfil && (
          <button
            onClick={onCompletarPerfil}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
          >
            Comenzar configuración
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* Botón secundario */}
        <button
          onClick={onIrAlInicio}
          className="w-full py-4 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          {onCompletarPerfil ? 'Saltar por ahora' : 'Ir al inicio'}
        </button>
      </div>
    </>
  );
}

export default ModalBienvenida;