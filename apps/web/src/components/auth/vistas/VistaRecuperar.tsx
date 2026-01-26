/**
 * VistaRecuperar.tsx
 * ===================
 * Flujo de recuperación de contraseña en 2 pasos.
 * Diseño compacto para móvil.
 *
 * Ubicación: apps/web/src/components/auth/vistas/VistaRecuperar.tsx
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Mail, Hash, Lock, Eye, EyeOff, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import { notificar } from '../../../utils/notificaciones';
import authService from '../../../services/authService';
import type { VistaAuth, DatosAuth } from '../ModalLogin';

// =============================================================================
// TIPOS Y CONSTANTES
// =============================================================================

interface VistaRecuperarProps {
  emailInicial: string;
  onCambiarVista: (vista: VistaAuth) => void;
  onActualizarDatos: (datos: Partial<DatosAuth>) => void;
}

type PasoRecuperar = 1 | 2;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_REGEX = /^\d{6}$/;

// =============================================================================
// COMPONENTE
// =============================================================================

export function VistaRecuperar({
  emailInicial,
  onCambiarVista,
  onActualizarDatos,
}: VistaRecuperarProps) {
  const { t } = useTranslation('auth');

  // Estado
  const [paso, setPaso] = useState<PasoRecuperar>(1);
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Validaciones
  const emailValido = EMAIL_REGEX.test(email);
  const codigoValido = CODIGO_REGEX.test(codigo);
  const tieneMinLength = nuevaPassword.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(nuevaPassword);
  const tieneNumero = /[0-9]/.test(nuevaPassword);
  const passwordValida = tieneMinLength && tieneMayuscula && tieneNumero;
  const passwordsCoinciden = nuevaPassword === confirmarPassword && confirmarPassword.length > 0;

  const formularioPaso1Valido = emailValido;
  const formularioPaso2Valido = codigoValido && passwordValida && passwordsCoinciden;

  // Handlers
  const handleEnviarCodigo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formularioPaso1Valido || cargando) return;

      setCargando(true);
      try {
        const response = await authService.olvideContrasena(email);
        if (response.success) {
          if (response.data?.correoRegistrado) {
            notificar.exito(t('recuperar.codigoEnviado'));
            setPaso(2);
          } else if (response.data?.esOAuth) {
            notificar.advertencia('Esta cuenta usa Google. Inicia sesión con el botón de Google.');
          } else {
            notificar.info('Si el correo está registrado, recibirás un código en breve.');
          }
        }
        else {
          notificar.error(response.message || t('recuperar.error'));
        }
      } catch (error: any) {
        notificar.error(error.response?.data?.mensaje || t('recuperar.error'));
      } finally {
        setCargando(false);
      }
    },
    [email, formularioPaso1Valido, cargando, t]
  );

  const handleRestablecer = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formularioPaso2Valido || cargando) return;

      setCargando(true);
      try {
        const response = await authService.restablecerContrasena({
          correo: email,
          codigo,
          nuevaContrasena: nuevaPassword,
        });

        if (response.success) {
          notificar.exito(t('recuperar.exito'));
          setTimeout(() => {
            onActualizarDatos({ email });
            onCambiarVista('login');
          }, 500);
        } else {
          notificar.error(response.message || t('recuperar.error'));
        }
      } catch (error: any) {
        notificar.error(error.response?.data?.mensaje || t('recuperar.error'));
      } finally {
        setCargando(false);
      }
    },
    [email, codigo, nuevaPassword, formularioPaso2Valido, cargando, onCambiarVista, onActualizarDatos, t]
  );

  const handleReenviar = useCallback(async () => {
    if (cargando) return;
    setCargando(true);
    try {
      const response = await authService.olvideContrasena(email);
      if (response.success) {
        notificar.exito(t('recuperar.codigoEnviado'));
      } else {
        notificar.error(response.message || t('recuperar.error'));
      }
    } catch (error: any) {
      notificar.error(error.response?.data?.mensaje || t('recuperar.error'));
    } finally {
      setCargando(false);
    }
  }, [email, cargando, t]);

  const handleCambioCodigo = useCallback((valor: string) => {
    const valorLimpio = valor.replace(/[^0-9]/g, '');
    if (valorLimpio.length <= 6) setCodigo(valorLimpio);
  }, []);

  // Clases
  const getInputClasses = (valor: string, esValido: boolean) => {
    const base = 'w-full pl-10 pr-4 py-2.5 border rounded-xl text-gray-900 placeholder-gray-400 text-sm transition-colors focus:outline-none';
    if (valor.length === 0) return `${base} border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;
    if (esValido) return `${base} border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-100`;
    return `${base} border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100`;
  };

  // Indicador de pasos compacto
  const IndicadorPasos = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${paso >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
        {paso > 1 ? <Check size={12} /> : '1'}
      </div>
      <div className={`w-8 h-0.5 ${paso > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${paso === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
        2
      </div>
    </div>
  );

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-10 h-10 ${paso === 1 ? 'bg-blue-500' : 'bg-green-500'} rounded-xl flex items-center justify-center`}>
          <KeyRound className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t('recuperar.titulo')}</h2>
      </div>

      {/* Volver */}
      <button
        type="button"
        onClick={() => paso === 2 ? setPaso(1) : onCambiarVista('login')}
        className="flex items-center gap-1.5 text-base text-gray-500 hover:text-gray-700 mb-3 font-medium"
      >
        <ArrowLeft size={18} />
        {paso === 2 ? t('recuperar.volver') : t('recuperar.volverLogin')}
      </button>

      <IndicadorPasos />

      {/* PASO 1 */}
      {paso === 1 && (
        <form onSubmit={handleEnviarCodigo}>
          <p className="text-sm text-gray-500 mb-4">{t('recuperar.subtitulo')}</p>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('recuperar.correo')}
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('recuperar.correoPlaceholder')}
                className={getInputClasses(email, emailValido)}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!formularioPaso1Valido || cargando}
            className={`w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-colors ${formularioPaso1Valido && !cargando
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-blue-300 cursor-not-allowed'
              }`}
          >
            {cargando ? t('recuperar.enviando') : t('recuperar.botonEnviar')}
          </button>
        </form>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <form onSubmit={handleRestablecer}>
          {/* Email badge */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3 text-center text-sm">
            <span className="text-gray-600">{t('recuperar.codigoEnviadoA')} </span>
            <span className="font-semibold text-blue-600">{email}</span>
          </div>

          {/* Código - Label y Reenviar en la misma línea */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">
                {t('recuperar.codigo')}
              </label>
              <button
                type="button"
                onClick={handleReenviar}
                disabled={cargando}
                className="flex items-center gap-1.5 text-base text-blue-500 hover:underline font-medium"
              >
                <RefreshCw size={16} />
                {t('recuperar.reenviar')}
              </button>
            </div>
            <div className="relative">
              <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => handleCambioCodigo(e.target.value)}
                placeholder={t('recuperar.codigoPlaceholder')}
                maxLength={6}
                className={getInputClasses(codigo, codigoValido)}
                autoFocus
              />
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('recuperar.nuevaContrasena')}
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder={t('recuperar.nuevaContrasenaPlaceholder')}
                className={`${getInputClasses(nuevaPassword, passwordValida)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Requisitos simplificados - texto más grande */}
            <div className={`flex items-center gap-2 mt-2 text-base ${passwordValida ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${passwordValida ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}>
                {passwordValida && <Check size={12} className="text-white" />}
              </div>
              <span>Mínimo 8 caracteres: 1 mayúscula y 1 número</span>
            </div>
          </div>

          {/* Confirmar */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('recuperar.confirmar')}
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={mostrarConfirmar ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder={t('recuperar.confirmarPlaceholder')}
                className={`${getInputClasses(confirmarPassword, passwordsCoinciden)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmarPassword.length > 0 && !passwordsCoinciden && (
              <p className="text-sm text-red-500 mt-1">{t('recuperar.passwordNoCoincide')}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!formularioPaso2Valido || cargando}
            className={`w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-colors ${formularioPaso2Valido && !cargando
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-green-300 cursor-not-allowed'
              }`}
          >
            {cargando ? t('recuperar.restableciendo') : t('recuperar.botonRestablecer')}
          </button>
        </form>
      )}
    </div>
  );
}

export default VistaRecuperar;