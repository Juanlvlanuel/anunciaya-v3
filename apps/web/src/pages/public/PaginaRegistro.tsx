// Declaración de tipo para Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
/**
 * PaginaRegistro.tsx
 * ===================
 * Página principal de registro que orquesta todo el flujo:
 * - Formulario de registro (Personal/Comercial)
 * - Verificación de email
 * - Redirección a Stripe Checkout (comercial)
 * - Modal de bienvenida
 *
 * Ubicación: apps/web/src/pages/public/PaginaRegistro.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import authService, {
  type RegistroInput,
  type DatosGoogleNuevo,
  type Usuario,
  type RespuestaLoginGoogle,
} from '@/services/authService';
import pagoService from '@/services/pagoService';
import { notificar } from '@/utils/notificaciones';
import { useUiStore } from '@/stores/useUiStore';
import {
  BrandingColumn,
  FormularioRegistro,
  ModalVerificacionEmail,
  ModalBienvenida,
} from '@/components/auth/registro';

// =============================================================================
// TIPOS
// =============================================================================

type PasoRegistro =
  | 'formulario'
  | 'verificacion'
  | 'bienvenida';

/**
 * Datos de Google extendidos para incluir el token
 * (El FormularioRegistro usa DatosGoogleNuevo del authService,
 * pero internamente necesitamos el googleIdToken)
 */
interface DatosGoogleConToken extends DatosGoogleNuevo {
  googleIdToken: string;
}

interface EstadoRegistro {
  paso: PasoRegistro;
  correo: string;
  tipoCuenta: 'personal' | 'comercial';
  nombreNegocio: string;
  nombreUsuario: string;
  datosGoogle: DatosGoogleConToken | null;
  datosRegistro: {
    nombre: string;
    apellidos: string;
    telefono: string;
  } | null;
}

/**
 * Tokens temporales para flujo personal.
 * Para comercial, los tokens se recuperan después del pago en /registro-exito
 */
interface TokensTemporales {
  usuario: Usuario;
  accessToken: string;
  refreshToken: string;
}

// =============================================================================
// HELPER: Extraer mensaje de error de Axios
// =============================================================================

function extraerMensajeError(error: unknown, mensajeDefault: string): string {
  if (error instanceof AxiosError && error.response?.data) {
    // El backend devuelve { exito: false, mensaje: "..." }
    const data = error.response.data;
    if (typeof data === 'object' && 'mensaje' in data && typeof data.mensaje === 'string') {
      return data.mensaje;
    }
  }
  return mensajeDefault;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaRegistro() {
  const navigate = useNavigate();

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIO: Obtener datosGooglePendiente y limpiarDatosGooglePendiente del store
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    loginExitoso,
    datosGooglePendiente,
    limpiarDatosGooglePendiente
  } = useAuthStore();
  const { abrirModalLogin } = useUiStore();

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [estado, setEstado] = useState<EstadoRegistro>({
    paso: 'formulario',
    correo: '',
    tipoCuenta: 'personal',
    nombreNegocio: '',
    nombreUsuario: '',
    datosGoogle: null,
    datosRegistro: null,
  });

  const [cargando, setCargando] = useState(false);

  // Tokens temporales para personal (login después del modal)
  const [tokensTemporales, setTokensTemporales] = useState<TokensTemporales | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVO: useEffect para leer datos de Google del store al montar
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Si hay datos de Google pendientes en el store, usarlos
    if (datosGooglePendiente) {

      setEstado((prev) => ({
        ...prev,
        datosGoogle: {
          email: datosGooglePendiente.correo,
          nombre: datosGooglePendiente.nombre,
          apellidos: datosGooglePendiente.apellidos,
          avatar: datosGooglePendiente.avatar,
          googleIdToken: datosGooglePendiente.googleIdToken,
        },
      }));

      // Limpiar del store después de usar (evita que persista si navegan a otra página)
      limpiarDatosGooglePendiente();
    }
  }, [datosGooglePendiente, limpiarDatosGooglePendiente]);

  // ---------------------------------------------------------------------------
  // Handler: Enviar formulario de registro
  // ---------------------------------------------------------------------------
  const handleSubmitRegistro = useCallback(
    async (datos: RegistroInput) => {
      setCargando(true);

      try {
        // ═══════════════════════════════════════════════════════════════════
        // CASO ESPECIAL: Comercial + Google → Ir directo a Stripe
        // El usuario se crea después del pago exitoso (en el webhook)
        // ═══════════════════════════════════════════════════════════════════
        if (datos.perfil === 'comercial' && datos.googleIdToken) {
          setEstado((prev) => ({
            ...prev,
            correo: datos.correo,
            tipoCuenta: 'comercial',
            nombreNegocio: datos.nombreNegocio || '',
            nombreUsuario: datos.nombre,
            datosRegistro: {
              nombre: datos.nombre,
              apellidos: datos.apellidos,
              telefono: datos.telefono,
            },
          }));

          await redirigirAStripe(
            datos.correo,
            datos.nombreNegocio || '',
            {
              nombre: datos.nombre,
              apellidos: datos.apellidos,
              telefono: datos.telefono,
            },
            datos.googleIdToken
          );
          return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // FLUJO NORMAL: Llamar a registro
        // ═══════════════════════════════════════════════════════════════════
        const respuesta = await authService.registro(datos);

        if (!respuesta.success) {
          notificar.error(respuesta.message || 'Error al crear la cuenta');
          return;
        }

        // Guardar datos para los siguientes pasos
        setEstado((prev) => ({
          ...prev,
          correo: datos.correo,
          tipoCuenta: datos.perfil,
          nombreNegocio: datos.nombreNegocio || '',
          nombreUsuario: datos.nombre,
          datosRegistro: {
            nombre: datos.nombre,
            apellidos: datos.apellidos,
            telefono: datos.telefono,
          },
        }));

        // Si es registro con Google, no necesita verificación
        if (datos.googleIdToken && respuesta.data && 'accessToken' in respuesta.data) {
          // Si es comercial, redirigir a Stripe directamente
          if (datos.perfil === 'comercial') {
            await redirigirAStripe(
              datos.correo,
              datos.nombreNegocio || '',
              {
                nombre: datos.nombre,
                apellidos: datos.apellidos,
                telefono: datos.telefono,
              },
              datos.googleIdToken
            );
          } else {
            // Personal: guardar tokens para después del modal
            setTokensTemporales({
              usuario: respuesta.data.usuario,
              accessToken: respuesta.data.accessToken,
              refreshToken: respuesta.data.refreshToken,
            });
            setEstado((prev) => ({ ...prev, paso: 'bienvenida' }));
          }
        } else {
          // Registro normal: ir a verificación
          setEstado((prev) => ({ ...prev, paso: 'verificacion' }));
          notificar.info('Te enviamos un código de verificación');
        }
      } catch (error) {
        console.error('Error en registro:', error);
        const mensaje = extraerMensajeError(error, 'Error de conexión. Intenta de nuevo.');
        notificar.error(mensaje);
      } finally {
        setCargando(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Handler: Verificar código de email
  // ---------------------------------------------------------------------------
  const handleVerificarEmail = useCallback(
    async (codigo: string) => {
      setCargando(true);

      try {
        const respuesta = await authService.verificarEmail({
          correo: estado.correo,
          codigo,
        });

        if (!respuesta.success|| !respuesta.data) {
          notificar.error(respuesta.message || 'Código incorrecto');
          return;
        }

        notificar.exito('¡Email verificado!');

        // Si es comercial, redirigir a Stripe
        if (estado.tipoCuenta === 'comercial') {
          await redirigirAStripe(
            estado.correo,
            estado.nombreNegocio,
            estado.datosRegistro!
          );
        } else {
          // Personal: guardar tokens y mostrar modal de bienvenida
          setTokensTemporales({
            usuario: respuesta.data.usuario,
            accessToken: respuesta.data.accessToken,
            refreshToken: respuesta.data.refreshToken,
          });
          setEstado((prev) => ({ ...prev, paso: 'bienvenida' }));
        }
      } catch (error) {
        console.error('Error verificando email:', error);
        const mensaje = extraerMensajeError(error, 'Error de conexión. Intenta de nuevo.');
        notificar.error(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [estado.correo, estado.tipoCuenta, estado.nombreNegocio, estado.datosRegistro]
  );

  // ---------------------------------------------------------------------------
  // Handler: Reenviar código
  // ---------------------------------------------------------------------------
  const handleReenviarCodigo = useCallback(async () => {
    try {
      const respuesta = await authService.reenviarVerificacion(estado.correo);

      if (respuesta.success) {
        notificar.info('Nuevo código enviado');
      } else {
        notificar.error(respuesta.message || 'Error al reenviar código');
      }
    } catch (error) {
      console.error('Error reenviando código:', error);
      const mensaje = extraerMensajeError(error, 'Error de conexión');
      notificar.error(mensaje);
    }
  }, [estado.correo]);

  // ---------------------------------------------------------------------------
  // Handler: Google OAuth desde el formulario de registro
  // ---------------------------------------------------------------------------
  const handleGoogleSuccess = useCallback(
    async (credential: string) => {
      try {
        setCargando(true);
        const respuesta = await authService.loginConGoogle(credential);

        if (respuesta.success&& respuesta.data) {
          const datos = respuesta.data;

          // Limpiar popups de Google
          document.getElementById('google-signin-container')?.remove();
          document.getElementById('google-signin-overlay')?.remove();

          // CASO 1: Usuario nuevo → Prellenar campos del formulario
          if ('usuarioNuevo' in datos && datos.usuarioNuevo === true) {
            setEstado((prev) => ({
              ...prev,
              datosGoogle: {
                email: datos.datosGoogle.email,
                nombre: datos.datosGoogle.nombre,
                apellidos: datos.datosGoogle.apellidos || '',
                avatar: datos.datosGoogle.avatar || null,
                googleIdToken: credential,
              },
            }));
            notificar.exito('Conectado con Google');
            return;
          }

          // CASO 2: Usuario existente → Login directo
          if ('usuario' in datos && datos.accessToken) {
            loginExitoso(datos.usuario, datos.accessToken, datos.refreshToken);
            notificar.exito(`¡Bienvenido de nuevo, ${datos.usuario.nombre}!`);
            navigate('/inicio');
            return;
          }

          notificar.error('Respuesta inesperada del servidor');
        } else {
          notificar.error(respuesta.message || 'Error al conectar con Google');
        }
      } catch (error: any) {
        console.error('Error en Google OAuth:', error);
        notificar.error(error.response?.data?.mensaje || 'Error al conectar con Google');
      } finally {
        setCargando(false);
      }
    },
    [loginExitoso, navigate]
  );

  const handleGoogleClick = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!window.google?.accounts?.id) {
      notificar.error('Error al cargar Google. Recarga la página.');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => {
        if (response.credential) {
          handleGoogleSuccess(response.credential);
        }
      },
      use_fedcm_for_prompt: true,
    });

    // En producción (HTTPS) usar mini-popup, en localhost usar botón renderizado
    const esProduccion = window.location.protocol === 'https:';

    if (esProduccion) {
      window.google.accounts.id.prompt();
    } else {
      // Botón renderizado para localhost
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '50%';
      container.style.left = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.zIndex = '9999';
      container.style.background = 'white';
      container.style.padding = '20px';
      container.style.borderRadius = '12px';
      container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      container.id = 'google-signin-container';
      document.body.appendChild(container);

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '9998';
      overlay.id = 'google-signin-overlay';
      overlay.onclick = () => {
        document.getElementById('google-signin-container')?.remove();
        document.getElementById('google-signin-overlay')?.remove();
      };
      document.body.appendChild(overlay);

      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 280,
      });
    }
  }, [handleGoogleSuccess]);

  // ---------------------------------------------------------------------------
  // Handler: Desconectar Google (limpiar datos y permitir cambiar cuenta)
  // ---------------------------------------------------------------------------
  const handleDesconectarGoogle = useCallback(() => {
    setEstado((prev) => ({
      ...prev,
      datosGoogle: null,
    }));
    // Limpiar selección de Google para permitir elegir otra cuenta
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // FUNCIÓN: Redirigir a Stripe Checkout
  // ---------------------------------------------------------------------------
  async function redirigirAStripe(
    correo: string,
    nombreNegocio: string,
    datosRegistro: { nombre: string; apellidos: string; telefono: string },
    googleIdToken?: string
  ) {
    try {
      setCargando(true);
      notificar.info('Preparando pago...');

      // Llamar al backend para crear sesión de Stripe
      const respuesta = await pagoService.crearCheckout({
        correo,
        nombreNegocio,
        datosRegistro,
        ...(googleIdToken && { esRegistroGoogle: true, googleIdToken }),
      });

      if (!respuesta.success|| !respuesta.data) {
        notificar.error(respuesta.message || 'Error al crear sesión de pago');
        return;
      }

      const { checkoutUrl } = respuesta.data;


      // Redirigir a Stripe Checkout
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('❌ Error creando sesión de Stripe:', error);
      const mensaje = extraerMensajeError(error, 'Error al procesar el pago');
      notificar.error(mensaje);
      setCargando(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Handler: Ir al inicio (AQUÍ se hace el login real)
  // ---------------------------------------------------------------------------
  const handleIrAlInicio = useCallback(() => {
    // Hacer login con los tokens guardados
    if (tokensTemporales) {
      loginExitoso(
        tokensTemporales.usuario,
        tokensTemporales.accessToken,
        tokensTemporales.refreshToken
      );
      setTokensTemporales(null);
    }
    navigate('/inicio');
  }, [tokensTemporales, loginExitoso, navigate]);

  // ---------------------------------------------------------------------------
  // Handler: Completar perfil (comercial) - NO SE USA porque redirige a Stripe
  // ---------------------------------------------------------------------------
  const handleCompletarPerfil = useCallback(() => {
    // Hacer login con los tokens guardados
    if (tokensTemporales) {
      loginExitoso(
        tokensTemporales.usuario,
        tokensTemporales.accessToken,
        tokensTemporales.refreshToken
      );
      setTokensTemporales(null);
    }
    navigate('/negocio/configurar');
  }, [tokensTemporales, loginExitoso, navigate]);

  // ---------------------------------------------------------------------------
  // Handler: Cerrar modales
  // ---------------------------------------------------------------------------
  const handleCerrarModal = useCallback(() => {
    // Verificación: permitir cerrar (vuelve al formulario)
    if (estado.paso === 'verificacion') {
      setEstado((prev) => ({ ...prev, paso: 'formulario' }));
      return;
    }
  }, [estado.paso]);

  // ---------------------------------------------------------------------------
  // Preparar datosGoogle para el FormularioRegistro
  // (Convertir de DatosGoogleConToken a DatosGoogleNuevo)
  // ---------------------------------------------------------------------------
  const datosGoogleParaFormulario: DatosGoogleNuevo | null = estado.datosGoogle
    ? {
      email: estado.datosGoogle.email,
      nombre: estado.datosGoogle.nombre,
      apellidos: estado.datosGoogle.apellidos,
      avatar: estado.datosGoogle.avatar,
    }
    : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-100 lg:bg-white">
      {/* Layout desktop: 2 columnas */}
      <div className="lg:grid lg:grid-cols-2 lg:h-screen">
        {/* Columna izquierda: Branding (solo desktop) */}
        <BrandingColumn />

        {/* Columna derecha: Formulario con scroll */}
        <div className="lg:flex lg:items-center lg:justify-center lg:p-2 lg:py-2 2xl:p-8 lg:overflow-hidden lg:h-screen">
          <div className="lg:scale-[0.80] 2xl:scale-100 lg:origin-center w-full">
            <FormularioRegistro
              onSubmit={handleSubmitRegistro}
              onGoogleClick={handleGoogleClick}
              onDesconectarGoogle={handleDesconectarGoogle}
              datosGoogle={datosGoogleParaFormulario}
              googleIdToken={estado.datosGoogle?.googleIdToken}
              cargando={cargando}
              onAbrirLogin={abrirModalLogin}
            />
          </div>
        </div>
      </div>

      {/* Modal: Verificación de email */}
      <ModalVerificacionEmail
        isOpen={estado.paso === 'verificacion'}
        correo={estado.correo}
        onVerificar={handleVerificarEmail}
        onReenviar={handleReenviarCodigo}
        onClose={handleCerrarModal}
        cargando={cargando}
      />

      {/* Modal: Bienvenida (solo para cuentas personales) */}
      <ModalBienvenida
        isOpen={estado.paso === 'bienvenida'}
        tipo={estado.tipoCuenta}
        nombre={estado.nombreUsuario}
        onIrAlInicio={handleIrAlInicio}
        onCompletarPerfil={handleCompletarPerfil}
      />
    </div>
  );
}

export default PaginaRegistro;