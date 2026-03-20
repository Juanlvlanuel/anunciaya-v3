/**
 * PaginaRegistroExito.tsx
 * =======================
 * Página de retorno después de completar el pago en Stripe.
 * Verifica el pago, hace login automático y muestra bienvenida.
 *
 * Ubicación: apps/web/src/pages/public/PaginaRegistroExito.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import pagoService from '@/services/pagoService';
import { notificar } from '@/utils/notificaciones';
import { ModalBienvenida } from '@/components/auth/registro';

// =============================================================================
// TIPOS
// =============================================================================

type EstadoProceso = 'validando' | 'exito' | 'error' | 'bienvenida';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaRegistroExito() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const loginExitoso = useAuthStore((state) => state.loginExitoso);

    const [estado, setEstado] = useState<EstadoProceso>('validando');
    const [nombreUsuario, setNombreUsuario] = useState('');

    const verificacionIniciada = useRef(false);
    const verificacionExitosa = useRef(false);

    useEffect(() => {
        if (verificacionIniciada.current) return;
        verificacionIniciada.current = true;
        verificarPago();
    }, []);

    async function verificarPago() {
        try {
            const sessionId = searchParams.get('session_id');

            if (!sessionId) {
                setEstado('error');
                notificar.error('Error: No se encontró información de pago');
                setTimeout(() => navigate('/registro'), 3000);
                return;
            }

            const respuesta = await pagoService.verificarSession(sessionId);

            if (!respuesta.success || !respuesta.data) {
                if (verificacionExitosa.current) return;
                setEstado('error');
                notificar.error(respuesta.message || 'Error al verificar el pago');
                setTimeout(() => navigate('/registro'), 3000);
                return;
            }

            const { usuario, accessToken, refreshToken } = respuesta.data;

            const usuarioCompleto = {
                ...usuario,
                sucursalActiva: null,
                sucursalAsignada: null,
                nombreNegocio: null,
                correoNegocio: null,
                logoNegocio: null,
                fotoPerfilNegocio: null,
                nombreSucursalAsignada: null,
                correoSucursalAsignada: null,
                fotoPerfilSucursalAsignada: null,
            };

            verificacionExitosa.current = true;
            loginExitoso(usuarioCompleto, accessToken, refreshToken);
            setNombreUsuario(usuario.nombre);
            setEstado('exito');

            setTimeout(() => setEstado('bienvenida'), 1000);
        } catch {
            if (verificacionExitosa.current) return;
            setEstado('error');
            notificar.error('Error al procesar el pago. Contacta a soporte.');
            setTimeout(() => navigate('/registro'), 3000);
        }
    }

    const handleIrAlInicio = () => navigate('/inicio');
    const handleCompletarPerfil = () => navigate('/business/onboarding');

    // =========================================================================
    // RENDER: Validando
    // =========================================================================
    if (estado === 'validando') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
            >
                <div className="bg-white rounded-lg shadow-md p-8 lg:p-6 2xl:p-8 max-w-md w-full">
                    {/* Spinner */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    </div>

                    <h2 className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold text-slate-900 text-center mb-2">
                        Validando pago...
                    </h2>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 text-center">
                        Estamos verificando tu pago con Stripe. Esto tomará solo unos segundos.
                    </p>

                    {/* Pasos */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-700">Pago procesado por Stripe</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-800 flex items-center justify-center shrink-0">
                                <div className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" />
                            </div>
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-700">Verificando transacción...</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Creando tu cuenta</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Éxito (breve, antes del modal)
    // =========================================================================
    if (estado === 'exito') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
            >
                <div className="bg-white rounded-lg shadow-md p-8 lg:p-6 2xl:p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Check className="w-10 h-10 text-emerald-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold text-slate-900 mb-2">
                        ¡Pago exitoso!
                    </h2>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                        Tu cuenta comercial ha sido creada correctamente.
                    </p>
                </div>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Error
    // =========================================================================
    if (estado === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
            >
                <div className="bg-white rounded-lg shadow-md p-8 lg:p-6 2xl:p-8 max-w-md w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <X className="w-10 h-10 text-red-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold text-slate-900 mb-2">
                        Error al procesar
                    </h2>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mb-6">
                        Hubo un problema al verificar tu pago. Serás redirigido al registro.
                    </p>
                    <button
                        onClick={() => navigate('/registro')}
                        className="w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base text-white bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 lg:cursor-pointer flex items-center justify-center gap-2"
                    >
                        Volver al registro
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Bienvenida (modal)
    // =========================================================================
    return (
        <>
            <div className="min-h-screen"
                style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
            />
            <ModalBienvenida
                isOpen={estado === 'bienvenida'}
                tipo="comercial"
                nombre={nombreUsuario}
                onIrAlInicio={handleIrAlInicio}
                onCompletarPerfil={handleCompletarPerfil}
            />
        </>
    );
}

export default PaginaRegistroExito;
