/**
 * Vista2FA.tsx
 * =============
 * Vista de verificación de dos factores.
 * Diseño compacto para móvil.
 *
 * Ubicación: apps/web/src/components/auth/vistas/Vista2FA.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificar } from '../../../utils/notificaciones';
import { useAuthStore } from '../../../stores/useAuthStore';
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
    (datos: { usuario: any; accessToken: string; refreshToken: string }) => {
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
      } catch (error: any) {
        notificar.error(error.response?.data?.mensaje || t('dosFactor.error'));
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
      } catch (error: any) {
        notificar.error(error.response?.data?.mensaje || t('dosFactor.respaldo.error'));
      } finally {
        setCargando(false);
      }
    },
    [codigoRespaldo, codigoRespaldoValido, cargando, tokenTemporal, handleLoginExitoso, t]
  );

  // Clases
  const getCodeInputClasses = (valor: string) => {
    const base = 'w-10 h-12 text-center text-lg font-bold border-2 rounded-lg transition-colors focus:outline-none';
    if (valor === '') return `${base} border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100`;
    return `${base} border-green-500 focus:border-green-500`;
  };

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t('dosFactor.titulo')}</h2>
      </div>

      {/* TOTP */}
      {subVista === 'totp' && (
        <form onSubmit={handleSubmitTOTP}>
          <p className="text-sm text-gray-500 mb-4">{t('dosFactor.subtitulo')}</p>

          <div className="flex justify-center gap-1.5 mb-4" onPaste={handlePasteTOTP}>
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
            className={`w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-colors ${
              codigoTOTPValido && !cargando
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-purple-300 cursor-not-allowed'
            }`}
          >
            {cargando ? t('dosFactor.verificando') : t('dosFactor.boton')}
          </button>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setSubVista('respaldo')}
              className="text-sm text-purple-500 hover:underline"
            >
              {t('dosFactor.usarRespaldo')}
            </button>
          </p>
        </form>
      )}

      {/* Respaldo */}
      {subVista === 'respaldo' && (
        <form onSubmit={handleSubmitRespaldo}>
          <p className="text-sm text-gray-500 mb-4">{t('dosFactor.respaldo.subtitulo')}</p>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('dosFactor.respaldo.titulo')}
            </label>
            <div className="relative">
              <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={codigoRespaldo}
                onChange={(e) => setCodigoRespaldo(e.target.value)}
                placeholder={t('dosFactor.respaldo.placeholder')}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('dosFactor.respaldo.nota')}</p>
          </div>

          <button
            type="submit"
            disabled={!codigoRespaldoValido || cargando}
            className={`w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-colors ${
              codigoRespaldoValido && !cargando
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-purple-300 cursor-not-allowed'
            }`}
          >
            {cargando ? t('dosFactor.verificando') : t('dosFactor.boton')}
          </button>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setSubVista('totp');
                setCodigoRespaldo('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
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