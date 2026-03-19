/**
 * VistaRecuperar.tsx
 * ===================
 * Flujo de recuperación de contraseña en 2 pasos.
 *
 * Ubicación: apps/web/src/components/auth/vistas/VistaRecuperar.tsx
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Hash, Lock, Eye, EyeOff, Check, RefreshCw, ArrowLeft } from 'lucide-react';
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
        } else {
          notificar.error(response.message || t('recuperar.error'));
        }
      } catch {
        notificar.error(t('recuperar.error'));
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
      } catch {
        notificar.error(t('recuperar.error'));
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
    } catch {
      notificar.error(t('recuperar.error'));
    } finally {
      setCargando(false);
    }
  }, [email, cargando, t]);

  const handleCambioCodigo = useCallback((valor: string) => {
    const valorLimpio = valor.replace(/[^0-9]/g, '');
    if (valorLimpio.length <= 6) setCodigo(valorLimpio);
  }, []);

  // Borde del wrapper según estado (TC-14)
  const getBorde = (valor: string, esValido: boolean) => {
    if (valor.length === 0) return 'border-slate-300';
    if (esValido) return 'border-emerald-500';
    return 'border-red-500';
  };

  const claseWrapper = (valor: string, esValido: boolean) =>
    `flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 ${getBorde(valor, esValido)}`;

  const claseBotonSubmit = (valido: boolean) =>
    `w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-white text-base lg:text-sm 2xl:text-base ${
      valido && !cargando
        ? 'bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98] lg:cursor-pointer'
        : 'bg-slate-400 cursor-not-allowed'
    }`;

  // Indicador de pasos compacto
  const IndicadorPasos = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
        paso >= 1 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {paso > 1 ? <Check size={16} /> : '1'}
      </div>
      <div className={`w-10 h-0.5 ${paso > 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
        paso === 2 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        2
      </div>
    </div>
  );

  return (
    <div className="p-6">

      {/* Volver */}
      <button
        type="button"
        onClick={() => paso === 2 ? setPaso(1) : onCambiarVista('login')}
        className="flex items-center gap-1.5 text-base font-semibold text-blue-600 hover:underline mb-5 lg:cursor-pointer"
      >
        <ArrowLeft size={22} />
        {paso === 2 ? t('recuperar.volver') : t('recuperar.volverLogin')}
      </button>

      <IndicadorPasos />

      {/* PASO 1 */}
      {paso === 1 && (
        <form onSubmit={handleEnviarCodigo}>
          <p className="text-base font-medium text-slate-600 mb-5">
            {t('recuperar.subtitulo')}
          </p>

          <div className="mb-6">
            <label className="block text-base font-bold text-slate-700 mb-2">
              {t('recuperar.correo')}
            </label>
            <div className={claseWrapper(email, emailValido)} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <Mail className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('recuperar.correoPlaceholder')}
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!formularioPaso1Valido || cargando}
            className={claseBotonSubmit(formularioPaso1Valido)}
          >
            {cargando ? t('recuperar.enviando') : t('recuperar.botonEnviar')}
          </button>
        </form>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <form onSubmit={handleRestablecer}>
          {/* Email badge */}
          <div className="bg-slate-100 border-2 border-slate-300 rounded-lg px-3 py-2 mb-4 text-center">
            <span className="text-base font-medium text-slate-600">
              {t('recuperar.codigoEnviadoA')}{' '}
            </span>
            <span className="text-base font-semibold text-slate-800">{email}</span>
          </div>

          {/* Código */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-base font-bold text-slate-700">
                {t('recuperar.codigo')}
              </label>
              <button
                type="button"
                onClick={handleReenviar}
                disabled={cargando}
                className="flex items-center gap-1.5 text-base font-semibold text-blue-600 hover:underline lg:cursor-pointer"
              >
                <RefreshCw size={14} />
                {t('recuperar.reenviar')}
              </button>
            </div>
            <div className={claseWrapper(codigo, codigoValido)} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <Hash className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => handleCambioCodigo(e.target.value)}
                placeholder={t('recuperar.codigoPlaceholder')}
                maxLength={6}
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="mb-5">
            <label className="block text-base font-bold text-slate-700 mb-2">
              {t('recuperar.nuevaContrasena')}
            </label>
            <div className={claseWrapper(nuevaPassword, passwordValida)} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <Lock className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder={t('recuperar.nuevaContrasenaPlaceholder')}
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
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

            <div className={`flex items-center gap-2 mt-3 text-base font-medium ${passwordValida ? 'text-emerald-600' : 'text-slate-600'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                passwordValida ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
              }`}>
                {passwordValida && <Check size={12} className="text-white" />}
              </div>
              <span>Mínimo 8 caracteres: 1 mayúscula y 1 número</span>
            </div>
          </div>

          {/* Confirmar */}
          <div className="mb-6">
            <label className="block text-base font-bold text-slate-700 mb-2">
              {t('recuperar.confirmar')}
            </label>
            <div className={claseWrapper(confirmarPassword, passwordsCoinciden)} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <Lock className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
              <input
                type={mostrarConfirmar ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder={t('recuperar.confirmarPlaceholder')}
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                className="shrink-0 ml-1 text-slate-600 hover:text-slate-800 lg:cursor-pointer"
                tabIndex={-1}
              >
                {mostrarConfirmar ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {confirmarPassword.length > 0 && !passwordsCoinciden && (
              <p className="text-base font-medium text-red-600 mt-2">
                {t('recuperar.passwordNoCoincide')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!formularioPaso2Valido || cargando}
            className={claseBotonSubmit(formularioPaso2Valido)}
          >
            {cargando ? t('recuperar.restableciendo') : t('recuperar.botonRestablecer')}
          </button>
        </form>
      )}
    </div>
  );
}

export default VistaRecuperar;
