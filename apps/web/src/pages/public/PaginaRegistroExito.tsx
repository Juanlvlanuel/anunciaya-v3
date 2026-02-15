/**
 * PaginaRegistroExito.tsx
 * =======================
 * Página de retorno después de completar el pago en Stripe.
 * 
 * ¿Qué hace esta página?
 * 1. Obtiene el session_id de la URL (Stripe lo agrega automáticamente)
 * 2. Llama al backend para verificar que el pago fue exitoso
 * 3. Recupera los tokens JWT del usuario
 * 4. Hace login automático
 * 5. Muestra modal de bienvenida
 * 6. Redirige a la app
 * 
 * Ubicación: apps/web/src/pages/public/PaginaRegistroExito.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

    // ---------------------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------------------
    const [estado, setEstado] = useState<EstadoProceso>('validando');
    const [nombreUsuario, setNombreUsuario] = useState('');

    // ---------------------------------------------------------------------------
    // Ref para evitar llamadas duplicadas (React StrictMode)
    // ---------------------------------------------------------------------------
    const verificacionIniciada = useRef(false);
    const verificacionExitosa = useRef(false);

    // ---------------------------------------------------------------------------
    // Efecto: Verificar sesión al montar
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Evitar llamadas duplicadas (React StrictMode ejecuta useEffect 2 veces)
        if (verificacionIniciada.current) {
            return;
        }
        verificacionIniciada.current = true;

        verificarPago();
    }, []);

    // ---------------------------------------------------------------------------
    // Función: Verificar pago y hacer login
    // ---------------------------------------------------------------------------
    async function verificarPago() {
        try {
            // PASO 1: Obtener session_id de la URL
            const sessionId = searchParams.get('session_id');

            if (!sessionId) {
                console.error('❌ No se encontró session_id en la URL');
                setEstado('error');
                notificar.error('Error: No se encontró información de pago');
                setTimeout(() => navigate('/registro'), 3000);
                return;
            }



            // PASO 2: Llamar al backend para verificar
            const respuesta = await pagoService.verificarSession(sessionId);

            if (!respuesta.success || !respuesta.data) {
                // Si ya hubo éxito previo, ignorar este error (llamada duplicada)
                if (verificacionExitosa.current) {
                    return;
                }
                console.error('❌ Error en respuesta del backend:', respuesta);
                setEstado('error');
                notificar.error(respuesta.message || 'Error al verificar el pago');
                setTimeout(() => navigate('/registro'), 3000);
                return;
            }

            const { usuario, accessToken, refreshToken } = respuesta.data;

            // Agregar campos de negocio (null para registro nuevo)
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

            // Marcar como exitoso para ignorar errores de llamadas duplicadas
            verificacionExitosa.current = true;

            // PASO 3: Hacer login automático con los tokens
            loginExitoso(usuarioCompleto, accessToken, refreshToken);

            // PASO 4: Guardar nombre para el modal
            setNombreUsuario(usuario.nombre);

            // PASO 5: Mostrar estado de éxito y modal
            setEstado('exito');

            // Esperar 1 segundo antes de mostrar modal
            setTimeout(() => {
                setEstado('bienvenida');
            }, 1000);

        } catch (error) {
            // Si ya hubo éxito previo, ignorar este error (llamada duplicada)
            if (verificacionExitosa.current) {
                return;
            }
            console.error('❌ Error verificando pago:', error);
            setEstado('error');
            notificar.error('Error al procesar el pago. Contacta a soporte.');
            setTimeout(() => navigate('/registro'), 3000);
        }
    }

    // ---------------------------------------------------------------------------
    // Handlers: Cerrar modal de bienvenida
    // ---------------------------------------------------------------------------
    const handleIrAlInicio = () => {
        navigate('/inicio');
    };

    const handleCompletarPerfil = () => {
        navigate('/business/onboarding');
    };

    // ---------------------------------------------------------------------------
    // Render: Estado "Validando"
    // ---------------------------------------------------------------------------
    if (estado === 'validando') {
        return (
            <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    {/* Spinner */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>

                    {/* Texto */}
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                        Validando pago...
                    </h2>
                    <p className="text-slate-600 text-center">
                        Estamos verificando tu pago con Stripe. Esto tomará solo unos segundos.
                    </p>

                    {/* Pasos */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span>Pago procesado por Stripe</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            </div>
                            <span>Verificando transacción...</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                            <span>Creando tu cuenta</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Estado "Éxito" (breve, antes del modal)
    // ---------------------------------------------------------------------------
    if (estado === 'exito') {
        return (
            <div className="min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    {/* Ícono de éxito */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Texto */}
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                        ¡Pago exitoso!
                    </h2>
                    <p className="text-slate-600 text-center">
                        Tu cuenta comercial ha sido creada correctamente.
                    </p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Estado "Error"
    // ---------------------------------------------------------------------------
    if (estado === 'error') {
        return (
            <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    {/* Ícono de error */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>

                    {/* Texto */}
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                        Error al procesar
                    </h2>
                    <p className="text-slate-600 text-center mb-6">
                        Hubo un problema al verificar tu pago. Serás redirigido al registro.
                    </p>

                    {/* Botón manual */}
                    <button
                        onClick={() => navigate('/registro')}
                        className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Volver al registro
                    </button>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Estado "Bienvenida" (modal)
    // ---------------------------------------------------------------------------
    return (
        <>
            {/* Fondo mientras se muestra el modal */}
            <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50" />

            {/* Modal de bienvenida */}
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