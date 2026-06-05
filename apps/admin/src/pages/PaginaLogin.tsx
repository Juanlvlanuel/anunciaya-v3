/**
 * PaginaLogin.tsx
 * ================
 * Pantalla de acceso al Panel. Orquesta las 3 sub-vistas (acceso, 2FA,
 * recuperar) sobre la tarjeta centrada con fondo decorativo. El acceso es REAL:
 * llama POST /auth/login (el mismo login de la app). 2FA y recuperar son UI
 * lista; su lógica se cablea después.
 *
 * Ubicación: apps/admin/src/pages/PaginaLogin.tsx
 */

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { Sun, Moon } from 'lucide-react';
import { acceder } from '../services/authPanelService';
import { obtenerYoPanel } from '../services/sesionPanelService';
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
  const [error, setError] = useState(false);
  const [mensajeError, setMensajeError] = useState<string>();
  const [cargando, setCargando] = useState(false);

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

      // Cuenta con 2FA → mostrar verificación (lógica se cablea después).
      if (respuesta.data.requiere2FA) {
        setPantalla('dospasos');
        return;
      }

      const { usuario, accessToken, refreshToken } = respuesta.data;

      // 2) Guardar el token para que /api/admin/yo viaje autenticado.
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

      // 4) Sesión válida con rol → guardar y entrar al shell.
      const d = sesion.data;
      iniciarSesion(
        {
          id: d.usuarioId ?? usuario.id,
          nombre: d.nombre ?? usuario.nombre,
          apellidos: d.apellidos ?? '',
          correo: d.correo ?? correoForm,
          avatarUrl: d.avatarUrl,
          rolEquipo: d.rolEquipo,
          regionId: d.regionId,
        },
        accessToken,
        refreshToken,
      );
      navigate('/inicio', { replace: true });
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

  function irA(p: Pantalla) {
    setPantalla(p);
    setError(false);
    setMensajeError(undefined);
  }

  // Si ya hay sesión del Panel hidratada, saltar el login.
  if (hidratado && usuarioSesion && accessTokenSesion) {
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
            <VerificacionDosPasos correo={correo} onVolver={() => irA('acceso')} />
          )}
          {pantalla === 'recuperar' && <RecuperarContrasena onVolver={() => irA('acceso')} />}
        </div>

        <p className="relative mt-5 text-sm text-texto-3">© 2026 AnunciaYA</p>
      </div>
    </div>
  );
}

export default PaginaLogin;
