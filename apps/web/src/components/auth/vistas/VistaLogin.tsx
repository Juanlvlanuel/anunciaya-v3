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
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
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

      try {
        const response = await authService.login({
          correo: email,
          contrasena: password,
        });

        if (response.success && response.data) {
          const { requiere2FA, tokenTemporal, usuario, accessToken, refreshToken } = response.data;

          if (recordarCorreo) {
            localStorage.setItem(STORAGE_KEY_EMAIL, email);
          } else {
            localStorage.removeItem(STORAGE_KEY_EMAIL);
          }

          if (requiere2FA && tokenTemporal) {
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
          notificar.error(response.message || t('login.error'));
        }
      } catch (error: any) {
        const mensaje = error.response?.data?.message || t('login.error');
        notificar.error(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [email, password, recordarCorreo, formularioValido, cargando, onCambiarVista, onActualizarDatos, onCerrarModal, navigate, t]
  );

  const handleIrARegistro = useCallback(() => {
    onCerrarModal();
    navigate('/registro');
  }, [onCerrarModal, navigate]);

  // Clases de input
  const getInputClasses = (valor: string, esValido: boolean) => {
    const base = 'w-full pl-10 pr-4 py-2.5 border rounded-xl text-gray-900 placeholder-gray-400 transition-colors focus:outline-none text-sm';
    if (valor.length === 0) return `${base} border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;
    if (esValido) return `${base} border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-100`;
    return `${base} border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100`;
  };

  return (
    <div className="p-5">
      {/* Header compacto */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t('login.titulo')}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('login.correo')}
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.correoPlaceholder')}
              className={getInputClasses(email, emailValido)}
              autoComplete="email"
              autoFocus
            />
          </div>
        </div>

        {/* Contraseña */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('login.contrasena')}
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={mostrarPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.contrasenaPlaceholder')}
              className={`${getInputClasses(password, passwordValido)} pr-10`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Recordar + Olvidaste */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recordarCorreo}
              onChange={(e) => setRecordarCorreo(e.target.checked)}
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{t('login.recordarCorreo')}</span>
          </label>
          <button
            type="button"
            onClick={() => {
              onActualizarDatos({ email });
              onCambiarVista('recuperar');
            }}
            className="text-sm text-blue-500 hover:underline"
          >
            {t('login.olvidaste')}
          </button>
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={!formularioValido || cargando}
          className={`w-full py-2.5 rounded-xl font-semibold text-white transition-colors text-sm ${formularioValido && !cargando
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-blue-300 cursor-not-allowed'
            }`}
        >
          {cargando ? t('login.cargando') : t('login.boton')}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-4 text-center text-sm text-gray-500">
        {t('login.sinCuenta')}{' '}
        <button
          type="button"
          onClick={handleIrARegistro}
          className="font-semibold text-blue-500 hover:underline"
        >
          {t('login.registrate')}
        </button>
      </p>
    </div>
  );
}

export default VistaLogin;