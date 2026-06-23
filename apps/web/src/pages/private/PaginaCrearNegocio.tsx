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
import { Building2, Check, ArrowRight, X } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
import { useAuthStore } from '@/stores/useAuthStore';
import pagoService from '@/services/pagoService';
import { notificar } from '@/utils/notificaciones';
import { useConfigPublica } from '@/hooks/queries/useConfigPublica';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCrearNegocio() {
  const navigate = useNavigate();
  const usuario = useAuthStore((state) => state.usuario);
  const { trialDias, precioMembresia, precioMembresiaAnual, anualDisponible } = useConfigPublica();

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [cargando, setCargando] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [intervalo, setIntervalo] = useState<'month' | 'year'>('month');
  const [codigoReferido, setCodigoReferido] = useState('');
  const [vendedorValidado, setVendedorValidado] = useState<{ valido: boolean; vendedor: string | null } | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [negocioArchivado, setNegocioArchivado] = useState<{ tiene: boolean; nombre: string | null } | null>(null);

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

  // ¿El usuario ya tuvo un negocio (cancelado)? El upgrade lo REVIVE → mostramos "Recupera tu negocio" y
  // prellenamos su nombre (editable) en vez del genérico "Crea tu negocio".
  useEffect(() => {
    let activo = true;
    pagoService.obtenerNegocioArchivado().then((r) => {
      if (!activo) return;
      setNegocioArchivado({ tiene: r.tiene, nombre: r.nombre });
      if (r.tiene && r.nombre) setNombreNegocio(r.nombre);
    });
    return () => { activo = false; };
  }, []);

  // Validación EN VIVO del código de referido (debounce 450ms). Case-sensitive (lo resuelve el backend).
  // Solo se atribuye al pagar si validó a un vendedor real → un código mal escrito no se cuela.
  useEffect(() => {
    const codigo = codigoReferido.trim();
    if (!codigo) { setVendedorValidado(null); setValidandoCodigo(false); return; }
    setValidandoCodigo(true);
    const t = setTimeout(async () => {
      const r = await pagoService.validarReferido(codigo);
      setVendedorValidado(r);
      setValidandoCodigo(false);
    }, 450);
    return () => clearTimeout(t);
  }, [codigoReferido]);

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
          intervalo,
          // Solo se atribuye si validó a un vendedor real (no un código mal escrito).
          codigoReferido: vendedorValidado?.valido ? codigoReferido.trim() : undefined,
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
    [formularioValido, cargando, nombreNegocio, intervalo, codigoReferido, vendedorValidado]
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
        {/* Barra de acento comercial */}
        <div className="h-1 bg-linear-to-r from-orange-500 to-amber-500" />

        {/* Header */}
        <div className="px-5 lg:px-5 2xl:px-7 pt-4 lg:pt-4 2xl:pt-5">
          <div className="flex items-center gap-3 2xl:gap-4">
            <div className="w-11 h-11 2xl:w-12 2xl:h-12 bg-linear-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 2xl:w-6 2xl:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-lg 2xl:text-xl font-bold text-slate-900">{negocioArchivado?.tiene ? 'Recupera tu negocio' : 'Crea tu negocio'}</h1>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                {negocioArchivado?.tiene ? `Hola ${usuario.nombre}, reactiva tu negocio anterior` : `Hola ${usuario.nombre}, activa tu cuenta comercial`}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-5 lg:px-5 2xl:px-7 pt-3 lg:pt-3 2xl:pt-4 pb-4 lg:pb-4 2xl:pb-5">
          {/* Nota informativa */}
          <div className={`flex items-start gap-2.5 rounded-xl p-2.5 lg:p-2.5 2xl:p-3 mb-3 lg:mb-3 2xl:mb-4 ${negocioArchivado?.tiene ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100'}`}>
            <Sparkles className={`w-4 h-4 2xl:w-5 2xl:h-5 shrink-0 mt-0.5 ${negocioArchivado?.tiene ? 'text-emerald-600' : 'text-slate-600'}`} />
            <p className={`text-sm lg:text-[11px] 2xl:text-sm font-medium leading-relaxed ${negocioArchivado?.tiene ? 'text-emerald-800' : 'text-slate-600'}`}>
              {negocioArchivado?.tiene
                ? <>Tu negocio <strong>{negocioArchivado.nombre}</strong> se reactivará con sus datos al pagar. Puedes cambiarle el nombre abajo si quieres.</>
                : 'Configurarás el correo, ubicación y datos de tu negocio después del pago, en el asistente de configuración.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-2.5 2xl:space-y-3.5">
            {/* Campo: Nombre del negocio */}
            <div>
              <label className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-1.5 lg:mb-1.5 2xl:mb-2">
                Nombre del negocio
              </label>
              <div className="relative">
                <span
                  className={`absolute left-3 lg:left-3 2xl:left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    !tocado
                      ? 'text-slate-500'
                      : nombreValido
                      ? 'text-green-600'
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
                  className={`w-full pl-10 lg:pl-10 2xl:pl-12 pr-3 py-2.5 lg:py-2.5 2xl:py-3.5 bg-slate-50 border-2 rounded-xl text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    !tocado
                      ? 'border-slate-300 focus:border-orange-500 focus:bg-white'
                      : nombreValido
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                />
              </div>
              {tocado && !nombreValido && (
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-600 mt-1 lg:mt-1 2xl:mt-1.5">
                  El nombre debe tener al menos 3 caracteres
                </p>
              )}
            </div>

            {/* Toggle Mensual / Anual — solo si el plan anual está disponible en Stripe */}
            {anualDisponible && (
              <div className="flex gap-1 p-1 bg-orange-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIntervalo('month')}
                  disabled={cargando}
                  className={`flex-1 rounded-lg py-1.5 text-sm lg:text-[12px] 2xl:text-sm font-semibold transition lg:cursor-pointer ${intervalo === 'month' ? 'bg-white text-orange-900 shadow-sm' : 'text-orange-800'}`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setIntervalo('year')}
                  disabled={cargando}
                  className={`flex-1 rounded-lg py-1.5 text-sm lg:text-[12px] 2xl:text-sm font-semibold transition lg:cursor-pointer ${intervalo === 'year' ? 'bg-white text-orange-900 shadow-sm' : 'text-orange-800'}`}
                >
                  Anual
                </button>
              </div>
            )}

            {/* Precio */}
            <div className="bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 lg:p-3 2xl:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-orange-800 font-bold text-xl lg:text-lg 2xl:text-2xl">${intervalo === 'year' ? precioMembresiaAnual : precioMembresia}</span>
                  <span className="text-orange-600 font-medium text-sm lg:text-sm 2xl:text-base">{intervalo === 'year' ? '/año' : '/mes'}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {trialDias > 0 && (
                    <span className="bg-green-600 text-white text-xs lg:text-[11px] 2xl:text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                      {trialDias} días gratis
                    </span>
                  )}
                  <span className="bg-orange-100 text-orange-700 text-xs lg:text-[11px] 2xl:text-sm font-semibold px-2.5 py-1 rounded-full">
                    IVA incluido{intervalo === 'year' ? ' • 10 meses' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-orange-200">
                <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span className="text-orange-700 text-sm lg:text-[11px] 2xl:text-sm font-medium">
                  {trialDias > 0 ? `Se cobra al día ${trialDias + 1} • Cancela cuando quieras` : 'Se cobra hoy • Cancela cuando quieras'}
                </span>
              </div>
            </div>

            {/* Código de vendedor (opcional) — validación en vivo */}
            <div>
              <label className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-1.5">
                ¿Te atendió un vendedor? <span className="font-normal text-slate-400">Código (opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: JUAN01"
                value={codigoReferido}
                onChange={(e) => setCodigoReferido(e.target.value)}
                disabled={cargando}
                autoComplete="off"
                data-testid="upgrade-codigo-referido"
                className={`w-full px-4 py-2.5 lg:py-2.5 2xl:py-3.5 bg-slate-50 border-2 rounded-xl text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all disabled:opacity-50 ${
                  !codigoReferido.trim()
                    ? 'border-slate-300 focus:border-orange-500 focus:bg-white'
                    : vendedorValidado?.valido
                    ? 'border-green-500 bg-green-50'
                    : validandoCodigo
                    ? 'border-slate-300'
                    : 'border-red-400 bg-red-50'
                }`}
              />
              {codigoReferido.trim() && (
                <p className={`text-sm lg:text-[11px] 2xl:text-sm font-medium mt-1 flex items-center gap-1 ${vendedorValidado?.valido ? 'text-green-600' : validandoCodigo ? 'text-slate-400' : 'text-red-500'}`}>
                  {validandoCodigo
                    ? 'Verificando…'
                    : vendedorValidado?.valido
                    ? <><Check className="w-3.5 h-3.5" /> Vendedor: {vendedorValidado.vendedor}</>
                    : <><X className="w-3.5 h-3.5" /> Código no válido</>}
                </p>
              )}
            </div>

            {/* Checkbox términos */}
            <div
              onClick={handleToggleTerminos}
              className="flex items-start gap-2.5 2xl:gap-3 px-1 cursor-pointer"
            >
              <div
                className={`w-5 h-5 2xl:w-6 2xl:h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  aceptaTerminos
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {aceptaTerminos && <Check className="w-3 h-3 2xl:w-4 2xl:h-4 text-white stroke-3" />}
              </div>
              <label className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-relaxed cursor-pointer">
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
              className="w-full py-3 lg:py-3 2xl:py-4 bg-linear-to-r from-orange-500 to-orange-600 text-white font-semibold text-base lg:text-sm 2xl:text-base rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
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
              className="w-full py-2 lg:py-2 2xl:py-3 text-slate-600 font-medium text-sm lg:text-sm 2xl:text-base hover:text-slate-800 disabled:opacity-50"
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