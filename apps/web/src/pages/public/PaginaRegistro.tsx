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
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import authService, {
  type RegistroInput,
  type DatosGoogleNuevo,
  type Usuario,
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
  | 'reanudar'       // volvió de Stripe sin pagar; sus datos siguen en Redis → puede continuar sin re-llenar
  | 'bienvenida';

// OBS-12: reanudar el pago tras cancelar/volver de Stripe sin completar.
// Guardamos SOLO datos no sensibles en sessionStorage (NUNCA la contraseña: esa ya viaja hasheada y vive
// en Redis del backend). Al volver con ?cancelado=true, ofrecemos "Continuar al pago" sin re-llenar/re-verificar.
const REANUDAR_KEY = 'ay_registro_reanudar';

interface DatosReanudar {
  correo: string;
  nombreNegocio: string;
  datosRegistro: { nombre: string; apellidos: string; telefono: string; ciudad: string };
  intervalo: 'month' | 'year';
}

// Separa la lada (+52, +1, …) del teléfono completo guardado para repoblar el formulario al reanudar
// (el registro guarda el teléfono como `${lada}${numero}`; el formulario lo necesita por separado).
const LADAS_REANUDAR = ['+52', '+1', '+34', '+57', '+54', '+56'].sort((a, b) => b.length - a.length);
function separarLada(telefonoCompleto: string): { lada: string; telefono: string } {
  const t = telefonoCompleto || '';
  const formatear = (num: string) => {
    const n = num.replace(/\D/g, '').slice(0, 10);
    if (n.length > 6) return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
    if (n.length > 3) return `${n.slice(0, 3)} ${n.slice(3)}`;
    return n;
  };
  for (const lada of LADAS_REANUDAR) {
    if (t.startsWith(lada)) return { lada, telefono: formatear(t.slice(lada.length)) };
  }
  return { lada: '+52', telefono: formatear(t) };
}

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
  intervalo: 'month' | 'year';
  nombreNegocio: string;
  nombreUsuario: string;
  datosGoogle: DatosGoogleConToken | null;
  datosRegistro: {
    nombre: string;
    apellidos: string;
    telefono: string;
    ciudad: string;
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
  const location = useLocation();

  // Correo prellenado cuando llegan desde el modal de login con un correo
  // que no existe en BD (errorCode='CORREO_NO_REGISTRADO').
  const correoInicial =
    (location.state as { correo?: string } | null)?.correo ?? '';

  // Código de referido del vendedor que trajo al negocio (link `?ref=`).
  // Es un parámetro de URL, no un campo del formulario. Si no viene o está
  // vacío, queda undefined y el registro sigue normal (sin atribución).
  const codigoReferido =
    new URLSearchParams(location.search).get('ref')?.trim() || undefined;

  // Tipo de cuenta inicial según el plan que trae la URL (`?plan=comercial`),
  // p.ej. al llegar desde el botón "Probar trial Gratis" del landing. Es la
  // misma lectura que hace FormularioRegistro, para que la columna de branding
  // (BrandingColumn) y el formulario arranquen sincronizados en el mismo modo.
  const tipoCuentaInicial: 'personal' | 'comercial' =
    new URLSearchParams(location.search).get('plan') === 'comercial'
      ? 'comercial'
      : 'personal';

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
    intervalo: 'month',
    nombreNegocio: '',
    nombreUsuario: '',
    datosGoogle: null,
    datosRegistro: null,
  });

  const [cargando, setCargando] = useState(false);
  const [tipoCuentaActiva, setTipoCuentaActiva] = useState<'personal' | 'comercial'>(tipoCuentaInicial);

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

  // ───────────────────────────────────────────────────────────────────────────
  // OBS-12: al volver de Stripe sin pagar (?cancelado=true), si guardamos los datos
  // antes de ir a Stripe, mostramos el panel "Reanudar" → continuar al pago sin
  // re-llenar ni re-verificar (los datos del registro siguen en Redis). En un
  // registro fresco (sin cancelado) limpiamos cualquier dato viejo para no arrastrarlo.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cancelado = new URLSearchParams(location.search).get('cancelado') === 'true';
    if (!cancelado) {
      sessionStorage.removeItem(REANUDAR_KEY);
      return;
    }
    const raw = sessionStorage.getItem(REANUDAR_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as DatosReanudar;
      if (!d?.correo || !d?.datosRegistro) return;
      setEstado((prev) => ({
        ...prev,
        paso: 'reanudar',
        correo: d.correo,
        tipoCuenta: 'comercial',
        intervalo: d.intervalo ?? 'month',
        nombreNegocio: d.nombreNegocio ?? '',
        datosRegistro: d.datosRegistro,
      }));
    } catch {
      sessionStorage.removeItem(REANUDAR_KEY);
    }
    // Solo al montar: leer la URL/sessionStorage una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            intervalo: datos.intervalo ?? 'month',
            nombreNegocio: datos.nombreNegocio || '',
            nombreUsuario: datos.nombre,
            datosRegistro: {
              nombre: datos.nombre,
              apellidos: datos.apellidos,
              telefono: datos.telefono,
              ciudad: datos.ciudad,
            },
          }));

          await redirigirAStripe(
            datos.correo,
            datos.nombreNegocio || '',
            {
              nombre: datos.nombre,
              apellidos: datos.apellidos,
              telefono: datos.telefono,
              ciudad: datos.ciudad,
            },
            datos.intervalo ?? 'month',
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
          intervalo: datos.intervalo ?? 'month',
          nombreNegocio: datos.nombreNegocio || '',
          nombreUsuario: datos.nombre,
          datosRegistro: {
            nombre: datos.nombre,
            apellidos: datos.apellidos,
            telefono: datos.telefono,
            ciudad: datos.ciudad,
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
                ciudad: datos.ciudad,
              },
              datos.intervalo ?? 'month',
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
            estado.datosRegistro!,
            estado.intervalo
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
    [estado.correo, estado.tipoCuenta, estado.intervalo, estado.nombreNegocio, estado.datosRegistro]
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
  // Handler: Reanudar el pago (OBS-12) — vuelve a Stripe con el plan elegido, sin
  // re-llenar ni re-verificar (los datos del registro siguen en Redis del backend).
  // ---------------------------------------------------------------------------
  const handleReanudarPago = useCallback(
    async (datos: {
      nombre: string;
      apellidos: string;
      telefono: string;
      nombreNegocio: string;
      intervalo: 'month' | 'year';
    }) => {
      try {
        setCargando(true);
        // Persiste las correcciones en Redis (sin re-verificar) ANTES de ir a Stripe, para que el
        // webhook cree el negocio con los datos actualizados (el webhook lee de Redis, no de Stripe).
        const resp = await authService.actualizarRegistroPendiente({
          correo: estado.correo,
          nombre: datos.nombre,
          apellidos: datos.apellidos,
          telefono: datos.telefono || null,
          nombreNegocio: datos.nombreNegocio || null,
        });
        if (!resp.success) {
          notificar.error(resp.message || 'No se pudo actualizar. Empieza de nuevo.');
          setCargando(false);
          return;
        }
        await redirigirAStripe(
          estado.correo,
          datos.nombreNegocio,
          // En reanudar la ciudad ya vive en Redis (registro_pendiente); solo se
          // pasa para satisfacer el tipo, el checkout normal no la reescribe.
          { nombre: datos.nombre, apellidos: datos.apellidos, telefono: datos.telefono, ciudad: estado.datosRegistro?.ciudad ?? '' },
          datos.intervalo,
        );
      } catch (error) {
        const mensaje = extraerMensajeError(error, 'Error al continuar el pago');
        notificar.error(mensaje);
        setCargando(false);
      }
    },
    // redirigirAStripe es estable (function declaration del componente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estado.correo],
  );

  // ---------------------------------------------------------------------------
  // Handler: Empezar de nuevo — descarta los datos guardados y vuelve al formulario.
  // ---------------------------------------------------------------------------
  const handleEmpezarDeNuevo = useCallback(() => {
    sessionStorage.removeItem(REANUDAR_KEY);
    setEstado((prev) => ({ ...prev, paso: 'formulario' }));
    navigate(`/registro?plan=comercial${codigoReferido ? `&ref=${codigoReferido}` : ''}`, { replace: true });
  }, [navigate, codigoReferido]);

  // ---------------------------------------------------------------------------
  // Handler: Google OAuth desde el formulario de registro
  // ---------------------------------------------------------------------------
  const handleGoogleSuccess = useCallback(
    async (code: string) => {
      try {
        setCargando(true);
        const respuesta = await authService.loginConGoogle(code);

        if (respuesta.success && respuesta.data) {
          const datos = respuesta.data;

          // CASO 1: Usuario nuevo → Prellenar campos del formulario
          if ('usuarioNuevo' in datos && datos.usuarioNuevo === true) {
            setEstado((prev) => ({
              ...prev,
              datosGoogle: {
                email: datos.datosGoogle.email,
                nombre: datos.datosGoogle.nombre,
                apellidos: datos.datosGoogle.apellidos || '',
                avatar: datos.datosGoogle.avatar || null,
                googleIdToken: datos.idToken,
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
      } catch (error: unknown) {
        const err = error as { response?: { data?: { mensaje?: string } } };
        console.error('Error en Google OAuth:', error);
        notificar.error(err.response?.data?.mensaje || 'Error al conectar con Google');
      } finally {
        setCargando(false);
      }
    },
    [loginExitoso, navigate]
  );

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
    datosRegistro: { nombre: string; apellidos: string; telefono: string; ciudad: string },
    intervalo: 'month' | 'year' = 'month',
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
        intervalo,
        ...(googleIdToken && { esRegistroGoogle: true, googleIdToken }),
        ...(codigoReferido && { codigoReferido }),
      });

      if (!respuesta.success|| !respuesta.data) {
        notificar.error(respuesta.message || 'Error al crear sesión de pago');
        return;
      }

      const { checkoutUrl } = respuesta.data;

      // OBS-12: guarda los datos (NO la contraseña) para reanudar el pago si el usuario cancela/regresa
      // de Stripe, sin re-llenar el formulario ni re-verificar el correo. Solo flujo normal (el de Google
      // no pasa por verificación y maneja su propio token).
      if (!googleIdToken) {
        const datosReanudar: DatosReanudar = { correo, nombreNegocio, datosRegistro, intervalo };
        sessionStorage.setItem(REANUDAR_KEY, JSON.stringify(datosReanudar));
      }

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
    <div className="min-h-screen bg-app-degradado lg:bg-white">
      {/* Layout desktop: 2 columnas */}
      <div className="lg:grid lg:grid-cols-2 lg:h-screen">
        {/* Columna izquierda: Branding (solo desktop) */}
        <BrandingColumn tipoCuenta={tipoCuentaActiva} hayVendedor={!!codigoReferido} />

        {/* Columna derecha: Formulario con scroll */}
        <div className="lg:flex lg:items-center lg:justify-center lg:p-4 2xl:p-8 lg:overflow-y-auto lg:h-screen"
            style={{ background: 'linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, #eff6ff 75%, #b1c6dd 100%)' }}
        >
          <div className="w-full">
            <FormularioRegistro
              // Fuerza el remontaje al entrar/salir de "reanudar" para que el form re-inicialice su
              // estado con los valores prellenados (useState no reacciona a cambios de props — OBS-12).
              key={estado.paso === 'reanudar' ? 'form-reanudar' : 'form-normal'}
              onSubmit={handleSubmitRegistro}
              onGoogleCode={handleGoogleSuccess}
              onDesconectarGoogle={handleDesconectarGoogle}
              datosGoogle={datosGoogleParaFormulario}
              googleIdToken={estado.datosGoogle?.googleIdToken}
              cargando={cargando}
              onAbrirLogin={abrirModalLogin}
              onTipoCuentaCambio={setTipoCuentaActiva}
              correoInicial={correoInicial}
              hayVendedor={!!codigoReferido}
              modoReanudar={
                estado.paso === 'reanudar' && estado.datosRegistro
                  ? {
                      valoresIniciales: {
                        correo: estado.correo,
                        nombreNegocio: estado.nombreNegocio,
                        nombre: estado.datosRegistro.nombre,
                        apellidos: estado.datosRegistro.apellidos,
                        ...separarLada(estado.datosRegistro.telefono),
                        intervalo: estado.intervalo,
                      },
                      onReanudar: handleReanudarPago,
                      onEmpezarDeNuevo: handleEmpezarDeNuevo,
                    }
                  : undefined
              }
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