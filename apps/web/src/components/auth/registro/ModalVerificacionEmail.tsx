/**
 * ModalVerificacionEmail.tsx
 * ===========================
 * Modal para verificar el código de 6 dígitos enviado al email.
 * Incluye timer para reenvío y auto-focus entre inputs.
 *
 * Ubicación: apps/web/src/components/auth/registro/ModalVerificacionEmail.tsx
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mail, RefreshCw } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalVerificacionEmailProps {
  isOpen: boolean;
  correo: string;
  onVerificar: (codigo: string) => Promise<void>;
  onReenviar: () => Promise<void>;
  onClose: () => void;
  cargando: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const TIEMPO_REENVIO = 60; // segundos

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalVerificacionEmail({
  isOpen,
  correo,
  onVerificar,
  onReenviar,
  onClose,
  cargando,
}: ModalVerificacionEmailProps) {
  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [codigo, setCodigo] = useState<string[]>(['', '', '', '', '', '']);
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_REENVIO);
  const [puedeReenviar, setPuedeReenviar] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ---------------------------------------------------------------------------
  // Timer para reenvío
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    // Reset al abrir
    setCodigo(['', '', '', '', '', '']);
    setTiempoRestante(TIEMPO_REENVIO);
    setPuedeReenviar(false);

    // Focus en primer input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    // Timer
    const interval = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          setPuedeReenviar(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;

      // Solo números
      if (valor && !/^\d$/.test(valor)) return;

      const nuevoCodigo = [...codigo];
      nuevoCodigo[index] = valor;
      setCodigo(nuevoCodigo);

      // Auto-focus al siguiente
      if (valor && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit cuando está completo
      if (valor && index === 5) {
        const codigoCompleto = nuevoCodigo.join('');
        if (codigoCompleto.length === 6) {
          onVerificar(codigoCompleto);
        }
      }
    },
    [codigo, onVerificar]
  );

  const handleKeyDown = useCallback(
    (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Backspace: borrar y volver al anterior
      if (e.key === 'Backspace' && !codigo[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      // Enter: intentar verificar
      if (e.key === 'Enter') {
        const codigoCompleto = codigo.join('');
        if (codigoCompleto.length === 6) {
          onVerificar(codigoCompleto);
        }
      }
    },
    [codigo, onVerificar]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const texto = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

      if (texto.length === 6) {
        const nuevoCodigo = texto.split('');
        setCodigo(nuevoCodigo);
        inputRefs.current[5]?.focus();

        // Auto-submit
        setTimeout(() => {
          onVerificar(texto);
        }, 100);
      }
    },
    [onVerificar]
  );

  const handleReenviar = useCallback(async () => {
    if (!puedeReenviar || reenviando) return;

    setReenviando(true);
    try {
      await onReenviar();
      // Reset timer
      setTiempoRestante(TIEMPO_REENVIO);
      setPuedeReenviar(false);
      // Reset código
      setCodigo(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setReenviando(false);
    }
  }, [puedeReenviar, reenviando, onReenviar]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!isOpen) return null;

  const codigoCompleto = codigo.join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm lg:bg-slate-900/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* Icono */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <Mail className="w-8 h-8 text-white" />
        </div>

        {/* Título */}
        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Verifica tu correo</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          Enviamos un código de 6 dígitos a
          <br />
          <span className="font-semibold text-slate-700">{correo}</span>
        </p>

        {/* Inputs de código */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {codigo.map((digito, index) => (
            <input
              key={index}
              ref={(el) => {
                if (el) inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digito}
              onChange={handleChange(index)}
              onKeyDown={handleKeyDown(index)}
              disabled={cargando}
              className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all disabled:opacity-50 ${digito
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white'
                }`}
            />
          ))}
        </div>

        {/* Botón verificar */}
        <button
          onClick={() => onVerificar(codigoCompleto)}
          disabled={codigoCompleto.length !== 6 || cargando}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {cargando ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verificando...
            </span>
          ) : (
            'Verificar código'
          )}
        </button>

        {/* Reenviar */}
        <div className="mt-4 text-center">
          {puedeReenviar ? (
            <button
              onClick={handleReenviar}
              disabled={reenviando}
              className="text-sm text-blue-600 font-semibold hover:underline disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {reenviando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reenviar código
                </>
              )}
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              Reenviar código en{' '}
              <span className="font-semibold text-slate-700">
                {Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}
              </span>
            </p>
          )}
        </div>

        {/* Ayuda */}
        <p className="text-xs text-slate-400 text-center mt-4">
          ¿No encuentras el correo? Revisa tu carpeta de spam
        </p>
      </div>
    </div>
  );
}

export default ModalVerificacionEmail;
