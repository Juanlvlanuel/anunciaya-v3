/**
 * PaginaCrearNegocioExito.tsx
 * ===========================
 * Página de éxito después del pago de upgrade a comercial.
 * Verifica el pago con Stripe, actualiza tokens y redirige.
 *
 * Flujo:
 * 1. Stripe redirige aquí con ?session_id=xxx
 * 2. Verificamos el pago con el backend
 * 3. Backend devuelve nuevos tokens (con tieneModoComercial: true)
 * 4. Actualizamos el store de auth
 * 5. Mostramos modal de éxito
 * 6. Usuario elige: Ir a Onboarding o Saltar a Business Studio
 *
 * Ubicación: apps/web/src/pages/private/PaginaCrearNegocioExito.tsx
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Rocket, ArrowRight, Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import pagoService from '@/services/pagoService';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

type EstadoPagina = 'verificando' | 'exito' | 'error';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaCrearNegocioExito() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const loginExitoso = useAuthStore((state) => state.loginExitoso);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [estado, setEstado] = useState<EstadoPagina>('verificando');
  const verificacionIniciada = useRef(false);

  // ---------------------------------------------------------------------------
  // Verificar pago al montar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Evitar doble ejecución por React StrictMode
    if (verificacionIniciada.current) return;
    verificacionIniciada.current = true;

    if (!sessionId) {
      setEstado('error');
      return;
    }

    const verificarPago = async () => {
      try {
        const respuesta = await pagoService.verificarSession(sessionId);

        if (!respuesta.success || !respuesta.data) {
          setEstado('error');
          notificar.error('No se pudo verificar el pago');
          return;
        }

        const { usuario, accessToken, refreshToken } = respuesta.data;

        // Actualizar store de auth con los nuevos tokens
        await loginExitoso(usuario as Parameters<typeof loginExitoso>[0], accessToken, refreshToken);

        setEstado('exito');
        notificar.exito('¡Pago completado exitosamente!');
      } catch (error) {
        console.error('❌ Error verificando pago:', error);
        setEstado('error');
        notificar.error('Error al verificar el pago');
      }
    };

    verificarPago();
  }, [sessionId, loginExitoso]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleIrAOnboarding = useCallback(() => {
    navigate('/business/onboarding');
  }, [navigate]);

  const handleIrAInicio = useCallback(() => {
    navigate('/inicio');
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // Render: Verificando
  // ---------------------------------------------------------------------------
  if (estado === 'verificando') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Verificando tu pago...
          </h1>
          <p className="text-slate-500">
            Esto puede tomar unos segundos
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error
  // ---------------------------------------------------------------------------
  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Hubo un problema
          </h1>
          <p className="text-slate-500 mb-6">
            No pudimos verificar tu pago. Si el cobro se realizó, 
            contacta a soporte.
          </p>
          <button
            onClick={() => navigate('/inicio')}
            className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Éxito
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 max-w-lg w-full">
        {/* Header con ícono de éxito */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            ¡Felicidades! 🎉
          </h1>
          <p className="text-slate-500">
            Tu cuenta ahora tiene acceso comercial
          </p>
        </div>

        {/* Card de beneficios */}
        <div className="bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Modo Comercial Activado</p>
              <p className="text-orange-600 text-sm">7 días de prueba gratis</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Perfil de negocio público
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sistema de puntos y recompensas
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Business Studio completo
            </li>
          </ul>
        </div>

        {/* Pregunta: ¿Qué quieres hacer? */}
        <div className="mb-4">
          <p className="text-center text-slate-600 font-medium mb-4">
            ¿Qué quieres hacer ahora?
          </p>

          {/* Opción 1: Configurar negocio (recomendada) */}
          <button
            onClick={handleIrAOnboarding}
            className="w-full mb-3 p-4 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:from-orange-600 hover:to-orange-700 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-bold">Configurar mi negocio</p>
                  <p className="text-orange-100 text-xs">
                    Completa tu perfil paso a paso
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Opción 2: Ir a inicio */}
          <button
            onClick={handleIrAInicio}
            className="w-full p-3 text-slate-500 font-medium text-sm hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Ir a Inicio
          </button>
        </div>

        {/* Nota */}
        <p className="text-center text-xs text-slate-400">
          Puedes completar la configuración en cualquier momento
        </p>
      </div>
    </div>
  );
}

export default PaginaCrearNegocioExito;