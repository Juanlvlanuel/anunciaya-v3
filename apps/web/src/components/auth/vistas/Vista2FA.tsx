/**
 * Vista2FA.tsx
 * =============
 * Vista de verificación de dos factores.
 *
 * Ubicación: apps/web/src/components/auth/vistas/Vista2FA.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificar } from '../../../utils/notificaciones';
import { useAuthStore, type Usuario } from '../../../stores/useAuthStore';
import authService from '../../../services/authService';
import type { VistaAuth } from '../ModalLogin';

// =============================================================================
// TIPOS
// =============================================================================

interface Vista2FAProps {
  tokenTemporal: string;
  onCambiarVista: (vista: VistaAuth) => void;
  onCerrarModal: () => void;
}

type SubVista2FA = 'totp' | 'respaldo';

// =============================================================================
// COMPONENTE
// =============================================================================

export function Vista2FA({
  tokenTemporal,
  onCambiarVista,
  onCerrarModal,
}: Vista2FAProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const setTokens = useAuthStore((state) => state.setTokens);
  const setUsuario = useAuthStore((state) => state.setUsuario);

  // Estado
  const [subVista, setSubVista] = useState<SubVista2FA>('totp');
  const [codigoTOTP, setCodigoTOTP] = useState<string[]>(['', '', '', '', '', '']);
  const [codigoRespaldo, setCodigoRespaldo] = useState('');
  const [cargando, setCargando] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validaciones
  const codigoTOTPValido = /^\d{6}$/.test(codigoTOTP.join(''));
  const codigoRespaldoValido = codigoRespaldo.trim().length >= 8;

  // Auto-focus
  useEffect(() => {
    if (subVista === 'totp' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [subVista]);

  // Login exitoso
  const handleLoginExitoso = useCallback(
    (datos: { usuario: Usuario; accessToken: string; refreshToken: string }) => {
      setTokens(datos.accessToken, datos.refreshToken);
      setUsuario(datos.usuario);
      notificar.exito(t('dosFactor.exito'));
      onCerrarModal();

      const rutaPendiente = sessionStorage.getItem('ay_ruta_pendiente');
      if (rutaPendiente) {
        sessionStorage.removeItem('ay_ruta_pendiente');
        navigate(rutaPendiente);
      } else {
        navigate('/inicio');
      }
    },
    [setTokens, setUsuario, onCerrarModal, navigate, t]
  );

  // Handlers TOTP
  const handleCambioTOTP = useCallback(
    (index: number, valor: string) => {
      const valorLimpio = valor.replace(/[^0-9]/g, '');
      if (valorLimpio.length <= 1) {
        const nuevosCodigos = [...codigoTOTP];
        nuevosCodigos[index] = valorLimpio;
        setCodigoTOTP(nuevosCodigos);
        if (valorLimpio.length === 1 && index < 5) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [codigoTOTP]
  );

  const handleKeyDownTOTP = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && codigoTOTP[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codigoTOTP]
  );

  const handlePasteTOTP = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (texto.length === 6) {
      setCodigoTOTP(texto.split(''));
      inputRefs.current[5]?.focus();
    }
  }, []);

  const handleSubmitTOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!codigoTOTPValido || cargando) return;

      setCargando(true);
      try {
        const response = await authService.verificar2FA({
          codigo: codigoTOTP.join(''),
          tokenTemporal,
        });

        if (response.success && response.data) {
          handleLoginExitoso(response.data);
        } else {
          notificar.error(response.message || t('dosFactor.error'));
          setCodigoTOTP(['', '', '', '', '', '']);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } catch {
        notificar.error(t('dosFactor.error'));
        setCodigoTOTP(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } finally {
        setCargando(false);
      }
    },
    [codigoTOTP, codigoTOTPValido, cargando, tokenTemporal, handleLoginExitoso, t]
  );

  const handleSubmitRespaldo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!codigoRespaldoValido || cargando) return;

      setCargando(true);
      try {
        const response = await authService.verificar2FA({
          codigo: codigoRespaldo,
          tokenTemporal,
        });

        if (response.success && response.data) {
          handleLoginExitoso(response.data);
        } else {
          notificar.error(response.message || t('dosFactor.respaldo.error'));
        }
      } catch {
        notificar.error(t('dosFactor.respaldo.error'));
      } finally {
        setCargando(false);
      }
    },
    [codigoRespaldo, codigoRespaldoValido, cargando, tokenTemporal, handleLoginExitoso, t]
  );

  // Clases
  const getCodeInputClasses = (valor: string) => {
    const base = 'w-10 h-12 text-center text-lg font-bold border-2 rounded-lg focus:outline-none bg-slate-100';
    if (valor === '') return `${base} border-slate-300`;
    return `${base} border-emerald-500`;
  };

  const claseBotonSubmit = (valido: boolean) =>
    `w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-white text-base lg:text-sm 2xl:text-base ${
      valido && !cargando
        ? 'bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98] lg:cursor-pointer'
        : 'bg-slate-400 cursor-not-allowed'
    }`;

  return (
    <div className="p-6">

      {/* TOTP */}
      {subVista === 'totp' && (
        <form onSubmit={handleSubmitTOTP}>
          <p className="text-base font-medium text-slate-600 mb-6">
            {t('dosFactor.subtitulo')}
          </p>

          <div className="flex justify-center gap-1.5 mb-6" onPaste={handlePasteTOTP}>
            {codigoTOTP.map((digito, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digito}
                onChange={(e) => handleCambioTOTP(index, e.target.value)}
                onKeyDown={(e) => handleKeyDownTOTP(index, e)}
                className={getCodeInputClasses(digito)}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!codigoTOTPValido || cargando}
            className={claseBotonSubmit(codigoTOTPValido)}
          >
            {cargando ? t('dosFactor.verificando') : t('dosFactor.boton')}
          </button>

          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setSubVista('respaldo')}
              className="text-base font-semibold text-blue-600 hover:underline lg:cursor-pointer"
            >
              {t('dosFactor.usarRespaldo')}
            </button>
          </p>
        </form>
      )}

      {/* Respaldo */}
      {subVista === 'respaldo' && (
        <form onSubmit={handleSubmitRespaldo}>
          <p className="text-base font-medium text-slate-600 mb-6">
            {t('dosFactor.respaldo.subtitulo')}
          </p>

          <div className="mb-6">
            <label className="block text-base font-bold text-slate-700 mb-2">
              {t('dosFactor.respaldo.titulo')}
            </label>
            <div
              className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300"
              style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <Key className="w-4 h-4 shrink-0 text-slate-500 mr-2.5" />
              <input
                type="text"
                value={codigoRespaldo}
                onChange={(e) => setCodigoRespaldo(e.target.value)}
                placeholder={t('dosFactor.respaldo.placeholder')}
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!codigoRespaldoValido || cargando}
            className={claseBotonSubmit(codigoRespaldoValido)}
          >
            {cargando ? t('dosFactor.verificando') : t('dosFactor.boton')}
          </button>

          <p className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setSubVista('totp');
                setCodigoRespaldo('');
              }}
              className="text-base font-medium text-slate-600 hover:text-slate-800 lg:cursor-pointer"
            >
              ← {t('dosFactor.volverApp')}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

export default Vista2FA;
