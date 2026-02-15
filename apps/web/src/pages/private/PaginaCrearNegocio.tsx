/**
 * PaginaCrearNegocio.tsx
 * ======================
 * Página para upgrade de cuenta personal a comercial.
 * Usuario ya autenticado, solo pide nombre del negocio y redirige a Stripe.
 *
 * NOTA: Esta página se muestra dentro del MainLayout (con columnas laterales)
 *
 * Ubicación: apps/web/src/pages/private/PaginaCrearNegocio.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import pagoService from '@/services/pagoService';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// CONSTANTES
// =============================================================================

const PRECIO_COMERCIAL = 449;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCrearNegocio() {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [cargando, setCargando] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [tocado, setTocado] = useState(false);

  // ---------------------------------------------------------------------------
  // Validaciones de acceso
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!usuario) {
      navigate('/');
      return;
    }

    if (usuario.tieneModoComercial) {
      notificar.info('Ya tienes acceso al modo comercial');
      navigate('/business-studio');
    }
  }, [usuario, navigate]);

  // ---------------------------------------------------------------------------
  // Validación del formulario
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

  const handleCancelar = useCallback(() => {
    navigate('/inicio');
  }, [navigate]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formularioValido || cargando) return;

      setCargando(true);

      try {
        notificar.info('Preparando pago...');

        const respuesta = await pagoService.crearCheckoutUpgrade({
          nombreNegocio: nombreNegocio.trim(),
        });

        if (!respuesta.success || !respuesta.data) {
          notificar.error(respuesta.message || 'Error al crear sesión de pago');
          setCargando(false);
          return;
        }

        window.location.href = respuesta.data.checkoutUrl;
      } catch (error: unknown) {
        console.error('❌ Error creando sesión de upgrade:', error);
        const mensaje =
          (error as { response?: { data?: { message?: string } }; message?: string })
            .response?.data?.message ||
          (error as Error).message ||
          'Error al procesar el pago';
        notificar.error(mensaje);
        setCargando(false);
      }
    },
    [formularioValido, cargando, nombreNegocio]
  );

  // Guard
  if (!usuario || usuario.tieneModoComercial) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center py-4 lg:py-4 2xl:py-8 px-3 lg:px-4">
      {/* Card principal */}
      <div className="bg-white rounded-xl lg:rounded-xl 2xl:rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full max-w-md lg:max-w-md 2xl:max-w-xl">
        {/* Header */}
        <div className="bg-linear-to-r from-orange-500 to-amber-500 p-4 lg:p-4 2xl:p-6">
          <div className="flex items-center gap-3 lg:gap-3 2xl:gap-4">
            <div className="w-11 h-11 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 bg-white/20 backdrop-blur rounded-lg lg:rounded-lg 2xl:rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-lg 2xl:text-2xl font-bold text-white">Crea tu negocio</h1>
              <p className="text-orange-100 text-sm lg:text-sm 2xl:text-base">
                Hola {usuario.nombre}, expande tu cuenta
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 lg:p-4 2xl:p-6">
          {/* Aviso informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg lg:rounded-lg 2xl:rounded-xl p-3 lg:p-3 2xl:p-4 mb-4 lg:mb-4 2xl:mb-6">
            <div className="flex items-start gap-2.5 lg:gap-2 2xl:gap-3">
              <div className="w-8 h-8 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-blue-800 font-semibold text-sm lg:text-sm 2xl:text-base mb-0.5 lg:mb-0.5 2xl:mb-1">
                  Tu cuenta se convertirá en comercial
                </p>
                <p className="text-blue-600 text-xs lg:text-xs 2xl:text-sm leading-relaxed">
                  Podrás configurar el correo, ubicación y datos de tu negocio 
                  después del pago en el asistente de configuración.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-3 2xl:space-y-5">
            {/* Campo: Nombre del negocio */}
            <div>
              <label className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-1.5 lg:mb-1.5 2xl:mb-2">
                Nombre del negocio
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 lg:left-3 2xl:left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    !tocado
                      ? 'text-slate-400'
                      : nombreValido
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  <Building2 className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Ej: Tacos El Güero"
                  value={nombreNegocio}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={cargando}
                  className={`w-full pl-10 lg:pl-10 2xl:pl-12 pr-3 py-2.5 lg:py-2.5 2xl:py-3.5 bg-slate-50 border-2 rounded-lg lg:rounded-lg 2xl:rounded-xl text-sm lg:text-sm 2xl:text-base font-medium focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    !tocado
                      ? 'border-slate-200 focus:border-blue-500 focus:bg-white'
                      : nombreValido
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                />
              </div>
              {tocado && !nombreValido && (
                <p className="text-xs lg:text-xs 2xl:text-sm text-red-500 mt-1 lg:mt-1 2xl:mt-1.5">
                  El nombre debe tener al menos 3 caracteres
                </p>
              )}
            </div>

            {/* Precio */}
            <div className="bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg lg:rounded-lg 2xl:rounded-xl p-3 lg:p-3 2xl:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-800 font-bold text-xl lg:text-lg 2xl:text-2xl">
                    ${PRECIO_COMERCIAL}
                    <span className="text-orange-600 font-medium text-sm lg:text-sm 2xl:text-base">/mes</span>
                  </p>
                  <p className="text-orange-600 text-xs lg:text-xs 2xl:text-sm">IVA incluido</p>
                </div>
                <div className="bg-green-500 text-white text-xs lg:text-xs 2xl:text-sm font-bold px-3 lg:px-3 2xl:px-4 py-1.5 lg:py-1.5 2xl:py-2 rounded-full flex items-center gap-1 lg:gap-1 2xl:gap-1.5">
                  <Check className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                  7 días gratis
                </div>
              </div>
              <p className="text-orange-600 text-xs lg:text-xs 2xl:text-sm mt-2 lg:mt-2 2xl:mt-3">
                Se cobra al día 8 • Cancela cuando quieras
              </p>
            </div>

            {/* Checkbox términos */}
            <div
              onClick={handleToggleTerminos}
              className={`flex items-start gap-2.5 lg:gap-2 2xl:gap-3 p-3 lg:p-3 2xl:p-4 rounded-lg lg:rounded-lg 2xl:rounded-xl border-2 cursor-pointer transition-all ${
                aceptaTerminos
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-slate-50 border-transparent hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-5 h-5 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  aceptaTerminos
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {aceptaTerminos && <Check className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-white" />}
              </div>
              <label className="text-xs lg:text-xs 2xl:text-sm text-slate-600 leading-relaxed cursor-pointer">
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
              style={{ cursor: formularioValido && !cargando ? 'pointer' : 'not-allowed' }}
              className="w-full py-3 lg:py-3 2xl:py-4 bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold text-sm lg:text-sm 2xl:text-base rounded-lg lg:rounded-lg 2xl:rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparando pago...
                </>
              ) : (
                <>
                  Continuar a pago
                  <ArrowRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                </>
              )}
            </button>

            {/* Botón cancelar */}
            <button
              type="button"
              onClick={handleCancelar}
              disabled={cargando}
              style={{ cursor: 'pointer' }}
              className="w-full py-2 lg:py-2 2xl:py-3 text-slate-500 font-medium text-sm lg:text-sm 2xl:text-base hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              Cancelar y volver
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PaginaCrearNegocio;