/**
 * FormularioCrearNegocio.tsx
 * ==========================
 * Formulario simplificado para upgrade de cuenta personal a comercial.
 * Solo pide el nombre del negocio (el usuario ya está autenticado).
 *
 * Ubicación: apps/web/src/components/auth/registro/FormularioCrearNegocio.tsx
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronLeft, Sparkles } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface FormularioCrearNegocioProps {
  onSubmit: (nombreNegocio: string) => Promise<void>;
  cargando: boolean;
  nombreUsuario: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const PRECIO_COMERCIAL = 449;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function FormularioCrearNegocio({
  onSubmit,
  cargando,
  nombreUsuario,
}: FormularioCrearNegocioProps) {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [tocado, setTocado] = useState(false);

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------
  const nombreValido = nombreNegocio.trim().length >= 3;
  const formularioValido = nombreValido && aceptaTerminos;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNombreNegocio(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setTocado(true);
  }, []);

  const handleToggleTerminos = useCallback(() => {
    setAceptaTerminos((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formularioValido || cargando) return;
      await onSubmit(nombreNegocio.trim());
    },
    [formularioValido, cargando, nombreNegocio, onSubmit]
  );

  const handleCancelar = useCallback(() => {
    navigate('/inicio');
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen lg:min-h-0 flex flex-col">
      {/* Header móvil */}
      <div className="lg:hidden bg-linear-to-r from-blue-600 to-blue-700 p-4">
        <button
          onClick={handleCancelar}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Cancelar</span>
        </button>
        <h1 className="text-xl font-bold text-white">Crea tu negocio</h1>
        <p className="text-blue-100 text-sm mt-1">
          Hola {nombreUsuario}, expande tu cuenta
        </p>
      </div>

      {/* Formulario */}
      <div className="flex-1 p-4 lg:p-0">
        <div className="bg-white rounded-2xl lg:rounded-none shadow-xl lg:shadow-none p-5 lg:p-6 2xl:p-8 max-w-md mx-auto lg:max-w-none">
          {/* Header desktop */}
          <div className="hidden lg:block mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-linear-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl 2xl:text-2xl font-bold text-slate-900">
                Crea tu negocio
              </h1>
            </div>
            <p className="text-slate-500 text-sm">
              Hola <span className="font-semibold text-slate-700">{nombreUsuario}</span>, 
              expande tu cuenta personal a comercial
            </p>
          </div>

          {/* Aviso informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-blue-800 font-semibold text-sm mb-1">
                  Tu cuenta se convertirá en comercial
                </p>
                <p className="text-blue-600 text-xs leading-relaxed">
                  Podrás configurar el correo, ubicación y datos de tu negocio 
                  después del pago en el asistente de configuración.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo: Nombre del negocio */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nombre del negocio
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    !tocado
                      ? 'text-slate-400'
                      : nombreValido
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Ej: Tacos El Güero"
                  value={nombreNegocio}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={cargando}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-2 rounded-xl text-sm font-medium focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    !tocado
                      ? 'border-slate-200 focus:border-blue-500 focus:bg-white'
                      : nombreValido
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                />
              </div>
              {tocado && !nombreValido && (
                <p className="text-xs text-red-500 mt-1">
                  El nombre debe tener al menos 3 caracteres
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-800 font-bold text-lg">
                    ${PRECIO_COMERCIAL}
                    <span className="text-orange-600 font-medium text-sm">/mes</span>
                  </p>
                  <p className="text-orange-600 text-xs">IVA incluido</p>
                </div>
                <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  7 días gratis
                </div>
              </div>
              <p className="text-orange-600 text-xs mt-2">
                Se cobra al día 8 • Cancela cuando quieras
              </p>
            </div>

            {/* Checkbox términos */}
            <div
              onClick={handleToggleTerminos}
              className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                aceptaTerminos
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-slate-50 border-transparent hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  aceptaTerminos
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {aceptaTerminos && <Check className="w-3 h-3 text-white" />}
              </div>
              <label className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                Acepto los{' '}
                <a
                  href="/terminos"
                  className="text-blue-600 font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Términos
                </a>{' '}
                y{' '}
                <a
                  href="/privacidad"
                  className="text-blue-600 font-semibold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacidad
                </a>{' '}
                del servicio comercial
              </label>
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={!formularioValido || cargando}
              className="w-full py-3 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparando pago...
                </span>
              ) : (
                'Continuar a pago'
              )}
            </button>

            {/* Botón cancelar (desktop) */}
            <button
              type="button"
              onClick={handleCancelar}
              disabled={cargando}
              className="hidden lg:block w-full py-2.5 text-slate-500 font-medium text-sm hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancelar y volver
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FormularioCrearNegocio;