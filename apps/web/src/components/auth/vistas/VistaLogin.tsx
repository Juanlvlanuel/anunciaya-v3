/**
 * VistaLogin.tsx
 * ===============
 * Formulario de inicio de sesión.
 * Diseño compacto para móvil.
 *
 * Ubicación: apps/web/src/components/auth/vistas/VistaLogin.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificar } from '../../../utils/notificaciones';
import { useAuthStore } from '../../../stores/useAuthStore';
import authService from '../../../services/authService';
import type { VistaAuth, DatosAuth } from '../ModalLogin';

// =============================================================================
// CONSTANTES
// =============================================================================

const STORAGE_KEY_EMAIL = 'ay_recordar_correo';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =============================================================================
// TIPOS
// =============================================================================

interface VistaLoginProps {
  onCambiarVista: (vista: VistaAuth) => void;
  onActualizarDatos: (datos: Partial<DatosAuth>) => void;
  onCerrarModal: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function VistaLogin({
  onCambiarVista,
  onActualizarDatos,
  onCerrarModal,
}: VistaLoginProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const loginExitoso = useAuthStore((state) => state.loginExitoso);

  // Estado
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordarCorreo, setRecordarCorreo] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  // Cuando el backend confirma que el correo no existe, ofrecemos un CTA
  // para que el usuario se registre con ese mismo correo prellenado.
  const [correoNoRegistrado, setCorreoNoRegistrado] = useState<string | null>(null);

  // Cargar email guardado
  useEffect(() => {
    const emailGuardado = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (emailGuardado) {
      setEmail(emailGuardado);
      setRecordarCorreo(true);
    }
  }, []);

  // Validaciones
  const emailValido = EMAIL_REGEX.test(email);
  const passwordValido = password.length > 0;
  const formularioValido = emailValido && passwordValido;

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formularioValido || cargando) return;

      setCargando(true);

      // Limpiar el bloque de "correo no registrado" en cada intento nuevo
      setCorreoNoRegistrado(null);

      try {
        const response = await authService.login({
          correo: email,
          contrasena: password,
        });

        if (response.success && response.data) {
          const { requiere2FA, requiereCambioContrasena, tokenTemporal, usuario, accessToken, refreshToken } = response.data;

          if (recordarCorreo) {
            localStorage.setItem(STORAGE_KEY_EMAIL, email);
          } else {
            localStorage.removeItem(STORAGE_KEY_EMAIL);
          }

          if (requiereCambioContrasena && tokenTemporal) {
            onActualizarDatos({ email, tokenTemporal2FA: tokenTemporal });
            onCambiarVista('cambiarContrasena');
          } else if (requiere2FA && tokenTemporal) {
            onActualizarDatos({ email, tokenTemporal2FA: tokenTemporal });
            onCambiarVista('2fa');
          } else if (usuario && accessToken && refreshToken) {
            await loginExitoso(usuario, accessToken, refreshToken);
            notificar.exito(t('login.exito'));
            onCerrarModal();

            const rutaPendiente = sessionStorage.getItem('ay_ruta_pendiente');
            if (rutaPendiente) {
              sessionStorage.removeItem('ay_ruta_pendiente');
              navigate(rutaPendiente);
            } else {
              navigate('/inicio');
            }
          }
        } else {
          // Caso especial: el correo no existe en BD → ofrecer crear cuenta
          if (response.errorCode === 'CORREO_NO_REGISTRADO') {
            setCorreoNoRegistrado(email);
          } else {
            notificar.error(response.message || t('login.error'));
          }
        }
      } catch {
        notificar.error(t('login.error'));
      } finally {
        setCargando(false);
      }
    },
    [email, password, recordarCorreo, formularioValido, cargando, onCambiarVista, onActualizarDatos, onCerrarModal, navigate, t]
  );

  const handleIrARegistro = useCallback(
    (correoPrellenado?: string) => {
      onCerrarModal();
      navigate('/registro', correoPrellenado ? { state: { correo: correoPrellenado } } : undefined);
    },
    [onCerrarModal, navigate]
  );

  // Borde del wrapper según estado de validación (TC-14)
  const getBorde = (valor: string, esValido: boolean) => {
    if (valor.length === 0) return 'border-slate-300';
    if (esValido) return 'border-emerald-500';
    return 'border-red-500';
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-5">
          <label className="block text-base font-bold text-slate-700 mb-2">
            {t('login.correo')}
          </label>
          <div
            className={`flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 ${getBorde(email, emailValido)}`}
            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
          >
            <Mail className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.correoPlaceholder')}
              className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Contraseña */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-base font-bold text-slate-700">
              {t('login.contrasena')}
            </label>
            <button
              type="button"
              onClick={() => {
                onActualizarDatos({ email });
                onCambiarVista('recuperar');
              }}
              className="text-base font-semibold text-blue-600 hover:underline lg:cursor-pointer"
            >
              {t('login.olvidaste')}
            </button>
          </div>
          <div
            className={`flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 ${getBorde(password, passwordValido)}`}
            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
          >
            <Lock className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
            <input
              type={mostrarPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.contrasenaPlaceholder')}
              className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="shrink-0 ml-1 text-slate-600 hover:text-slate-800 lg:cursor-pointer"
              tabIndex={-1}
            >
              {mostrarPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        {/* Recordar */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recordarCorreo}
              onChange={(e) => setRecordarCorreo(e.target.checked)}
              className="w-4 h-4 text-slate-700 border-slate-300 rounded focus:ring-slate-400"
            />
            <span className="text-base font-medium text-slate-600">{t('login.recordarCorreo')}</span>
          </label>
        </div>

        {/* CTA: correo no registrado → crear cuenta con este correo */}
        {correoNoRegistrado && (
          <div
            data-testid="cta-correo-no-registrado"
            className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-3"
          >
            <div className="flex items-start gap-2">
              <UserPlus className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  No encontramos una cuenta con
                </p>
                <p className="text-sm font-semibold text-blue-700 truncate">
                  {correoNoRegistrado}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="btn-crear-cuenta-con-correo"
              onClick={() => handleIrARegistro(correoNoRegistrado)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] lg:cursor-pointer"
            >
              Crear cuenta con este correo
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={!formularioValido || cargando}
          className={`w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-white text-base lg:text-sm 2xl:text-base ${formularioValido && !cargando
            ? 'bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98] lg:cursor-pointer'
            : 'bg-slate-400 cursor-not-allowed'
            }`}
        >
          {cargando ? t('login.cargando') : t('login.boton')}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-base font-medium text-slate-600">
        {t('login.sinCuenta')}{' '}
        <button
          type="button"
          onClick={() => handleIrARegistro()}
          className="font-semibold text-blue-600 hover:underline lg:cursor-pointer"
        >
          {t('login.registrate')}
        </button>
      </p>
    </div>
  );
}

export default VistaLogin;