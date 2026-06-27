/**
 * PaginaLogin.tsx
 * ================
 * Acceso al Panel. Orquesta acceso, 2FA del Panel y recuperar.
 * Flujo: /auth/login (contraseña) → /api/admin/yo (rol + ¿2FA pendiente?).
 *  - Si la cuenta es de equipo y NO requiere 2FA → entra.
 *  - Si es SuperAdmin con 2FA del Panel prendido → pide el TOTP y, al verificarlo,
 *    reemplaza los tokens por los "marcados" y entra.
 *
 * Ubicación: apps/admin/src/pages/PaginaLogin.tsx
 */

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Sun, Moon } from 'lucide-react';
import { acceder } from '../services/authPanelService';
import { obtenerYoPanel, type SesionPanel } from '../services/sesionPanelService';
import { verificar2fa } from '../services/seguridad2faService';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';
import { CLAVE_ACCESS_TOKEN } from '../services/api';
import { obtenerTema, alternarTema, type Tema } from '../utils/tema';
import { FormularioAcceso } from '../components/acceso/FormularioAcceso';
import { VerificacionDosPasos } from '../components/acceso/VerificacionDosPasos';
import { RecuperarContrasena } from '../components/acceso/RecuperarContrasena';

type Pantalla = 'acceso' | 'dospasos' | 'recuperar';

function PaginaLogin() {
  const navigate = useNavigate();
  const iniciarSesion = useAuthPanelStore((s) => s.iniciarSesion);
  const cerrarSesion = useAuthPanelStore((s) => s.cerrarSesion);
  const hidratado = useAuthPanelStore((s) => s.hidratado);
  const usuarioSesion = useAuthPanelStore((s) => s.usuario);
  const accessTokenSesion = useAuthPanelStore((s) => s.accessToken);

  const [tema, setTema] = useState<Tema>(obtenerTema());
  const [pantalla, setPantalla] = useState<Pantalla>('acceso');
  const [correo, setCorreo] = useState('');
  // Activación del equipo: el enlace del correo trae ?activarCuenta=<correo> y ya incluye el código.
  const [modoActivacion, setModoActivacion] = useState(false);
  const [error, setError] = useState(false);
  const [mensajeError, setMensajeError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  // Datos de la sesión guardados entre el login y el paso de 2FA del Panel.
  const [sesion2fa, setSesion2fa] = useState<SesionPanel | null>(null);
  const [error2fa, setError2fa] = useState(false);
  const [cargando2fa, setCargando2fa] = useState(false);

  /** Construye el usuario del store a partir de la respuesta de /api/admin/yo. */
  function entrarConSesion(d: SesionPanel, accessToken: string, refreshToken: string) {
    iniciarSesion(
      {
        id: d.usuarioId ?? '',
        nombre: d.nombre ?? '',
        apellidos: d.apellidos ?? '',
        correo: d.correo ?? correo,
        avatarUrl: d.avatarUrl,
        rolEquipo: d.rolEquipo,
        regionId: d.regionId,
        regionNombre: d.regionNombre,
      },
      accessToken,
      refreshToken,
    );
    navigate('/inicio', { replace: true });
  }

  async function onEnviar(correoForm: string, contrasena: string) {
    setError(false);
    setMensajeError(undefined);
    setCargando(true);
    try {
      // 1) Autenticar contra el login de siempre.
      const respuesta = await acceder(correoForm, contrasena);

      if (!respuesta.success || !respuesta.data) {
        setError(true);
        setMensajeError(respuesta.message || 'Revisa tu correo y contraseña.');
        return;
      }

      // 2FA GENERAL de AnunciaYA (no el del Panel). El equipo del Panel no debería
      // tenerlo; si lo tiene, avisamos en lugar de entrar a medias.
      if (respuesta.data.requiere2FA) {
        setError(true);
        setMensajeError(
          'Esta cuenta tiene verificación en dos pasos de AnunciaYA. El Panel usa su propio 2FA; desactiva el general para entrar.',
        );
        return;
      }

      const { usuario, accessToken, refreshToken } = respuesta.data;

      // 2) Guardar el token para que /api/admin/yo (y /2fa/verificar) viajen autenticados.
      localStorage.setItem(CLAVE_ACCESS_TOKEN, accessToken);

      // 3) Validar el rol de equipo en el backend (guard real del Panel).
      let sesion;
      try {
        sesion = await obtenerYoPanel();
      } catch (e) {
        cerrarSesion();
        const status = (e as AxiosError)?.response?.status;
        setError(true);
        setMensajeError(
          status === 403
            ? 'Esta cuenta no tiene acceso al Panel.'
            : 'No se pudo verificar el acceso. Inténtalo de nuevo.',
        );
        return;
      }

      if (!sesion.success || !sesion.data?.rolEquipo) {
        cerrarSesion();
        setError(true);
        setMensajeError('Esta cuenta no tiene acceso al Panel.');
        return;
      }

      // 4) ¿SuperAdmin con 2FA del Panel pendiente? → pedir el TOTP.
      if (sesion.data.panel2faPendiente) {
        setSesion2fa(sesion.data);
        setCorreo(sesion.data.correo ?? correoForm);
        setError2fa(false);
        setPantalla('dospasos');
        return;
      }

      // 5) Sin 2FA → entrar directo.
      void usuario; // datos ya vienen de /api/admin/yo
      entrarConSesion(sesion.data, accessToken, refreshToken);
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>;
      setError(true);
      if (err.response) {
        setMensajeError(err.response.data?.message || 'Revisa tu correo y contraseña.');
      } else {
        setMensajeError('No se pudo conectar con el servidor. Inténtalo de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  }

  /** Verifica el TOTP del Panel: si es válido, recibe tokens marcados y entra. */
  async function onVerificarPanel2fa(codigo: string) {
    if (!sesion2fa) return;
    setError2fa(false);
    setCargando2fa(true);
    try {
      const r = await verificar2fa(codigo);
      if (!r.success || !r.data) {
        setError2fa(true);
        return;
      }
      entrarConSesion(sesion2fa, r.data.accessToken, r.data.refreshToken);
    } catch {
      setError2fa(true);
    } finally {
      setCargando2fa(false);
    }
  }

  // Enlace de activación del equipo (?activarCuenta=<correo>): abrir directo "crea tu contraseña"
  // en el paso del código (la persona ya lo recibió en el correo) y limpiar el parámetro de la URL.
  // Se lee SÍNCRONO (no solo en el efecto) para que el redirect por sesión de abajo no se dispare
  // antes de procesar el enlace.
  const correoActivarURL = new URLSearchParams(window.location.search).get('activarCuenta');
  useEffect(() => {
    if (!correoActivarURL) return;
    // El enlace de activación es del MIEMBRO NUEVO, no de quien esté logueado en este navegador.
    // Si hay una sesión activa (p. ej. el admin que acaba de dar de alta al vendedor), ciérrala:
    // si no, el redirect a /inicio secuestra la activación y el correo del admin se cuela en el form.
    if (usuarioSesion) cerrarSesion();
    setCorreo(correoActivarURL);
    setModoActivacion(true);
    setPantalla('recuperar');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  function irA(p: Pantalla) {
    setPantalla(p);
    setModoActivacion(false);
    setError(false);
    setMensajeError(undefined);
    setError2fa(false);
  }

  // Si ya hay sesión del Panel hidratada, saltar el login — SALVO que llegue un enlace de
  // activación de un miembro del equipo: ese miembro debe poder crear su contraseña aunque el
  // admin que lo dio de alta siga logueado en este navegador (la sesión se cierra en el efecto).
  if (hidratado && usuarioSesion && accessTokenSesion && !correoActivarURL && !modoActivacion) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-lienzo">
      <div className="fondo-login">
        <div className="rejilla-login" />
      </div>

      {/* Toggle de tema flotante (para revisar claro/oscuro; en el shell vivirá en el header) */}
      <button
        type="button"
        data-testid="login-tema"
        onClick={() => setTema(alternarTema())}
        aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-[10px] border border-borde bg-superficie text-texto-3 transition hover:text-texto"
      >
        {tema === 'oscuro' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div
          key={pantalla}
          className="entrada-login w-full max-w-[416px] rounded-[20px] border border-borde bg-superficie p-9 shadow-tarjeta-panel"
        >
          {pantalla === 'acceso' && (
            <FormularioAcceso
              tema={tema}
              correo={correo}
              setCorreo={setCorreo}
              error={error}
              mensajeError={mensajeError}
              cargando={cargando}
              onEnviar={onEnviar}
              onOlvido={() => irA('recuperar')}
            />
          )}
          {pantalla === 'dospasos' && (
            <VerificacionDosPasos
              correo={correo}
              onVolver={() => irA('acceso')}
              onVerificar={onVerificarPanel2fa}
              error={error2fa}
              cargando={cargando2fa}
            />
          )}
          {pantalla === 'recuperar' && (
            <RecuperarContrasena
              onVolver={() => irA('acceso')}
              correoInicial={correo}
              modoCrear={modoActivacion}
              pasoInicial={modoActivacion ? 'codigo' : 'correo'}
            />
          )}
        </div>

        <p className="relative mt-5 text-sm text-texto-3">© 2026 AnunciaYA</p>
      </div>
    </div>
  );
}

export default PaginaLogin;
