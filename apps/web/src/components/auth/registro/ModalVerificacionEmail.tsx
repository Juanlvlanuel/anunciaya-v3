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

const TIEMPO_REENVIO = 60;

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
    const [codigo, setCodigo] = useState<string[]>(['', '', '', '', '', '']);
    const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_REENVIO);
    const [puedeReenviar, setPuedeReenviar] = useState(false);
    const [reenviando, setReenviando] = useState(false);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        setCodigo(['', '', '', '', '', '']);
        setTiempoRestante(TIEMPO_REENVIO);
        setPuedeReenviar(false);

        setTimeout(() => inputRefs.current[0]?.focus(), 100);

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

    const handleChange = useCallback(
        (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const valor = e.target.value;
            if (valor && !/^\d$/.test(valor)) return;

            const nuevoCodigo = [...codigo];
            nuevoCodigo[index] = valor;
            setCodigo(nuevoCodigo);

            if (valor && index < 5) inputRefs.current[index + 1]?.focus();

            if (valor && index === 5) {
                const codigoCompleto = nuevoCodigo.join('');
                if (codigoCompleto.length === 6) onVerificar(codigoCompleto);
            }
        },
        [codigo, onVerificar]
    );

    const handleKeyDown = useCallback(
        (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && !codigo[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
            if (e.key === 'Enter') {
                const codigoCompleto = codigo.join('');
                if (codigoCompleto.length === 6) onVerificar(codigoCompleto);
            }
        },
        [codigo, onVerificar]
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            e.preventDefault();
            const texto = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (texto.length === 6) {
                setCodigo(texto.split(''));
                inputRefs.current[5]?.focus();
                setTimeout(() => onVerificar(texto), 100);
            }
        },
        [onVerificar]
    );

    const handleReenviar = useCallback(async () => {
        if (!puedeReenviar || reenviando) return;
        setReenviando(true);
        try {
            await onReenviar();
            setTiempoRestante(TIEMPO_REENVIO);
            setPuedeReenviar(false);
            setCodigo(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setReenviando(false);
        }
    }, [puedeReenviar, reenviando, onReenviar]);

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
            <div className="relative w-full max-w-sm mx-4 bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md p-5 lg:p-5 2xl:p-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Botón cerrar */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-slate-200 hover:bg-slate-300 lg:cursor-pointer"
                >
                    <X className="w-4 h-4 text-slate-600" />
                </button>

                {/* Icono */}
                <div className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 rounded-lg flex items-center justify-center mx-auto mb-4 lg:mb-3 2xl:mb-4 bg-linear-to-b from-slate-700 to-slate-800 shadow-lg shadow-slate-700/30">
                    <Mail className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white" />
                </div>

                {/* Título */}
                <h3 className="text-xl lg:text-lg 2xl:text-xl font-extrabold text-slate-900 text-center mb-1">
                    Verifica tu correo
                </h3>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 text-center mb-5 lg:mb-4 2xl:mb-5">
                    Enviamos un código de 6 dígitos a
                    <br />
                    <span className="font-bold text-slate-800">{correo}</span>
                </p>

                {/* Inputs de código */}
                <div className="flex justify-center gap-2 lg:gap-1.5 2xl:gap-2 mb-5 lg:mb-4 2xl:mb-5" onPaste={handlePaste}>
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
                            className={`w-11 h-12 lg:w-10 lg:h-11 2xl:w-11 2xl:h-12 text-center text-xl lg:text-lg 2xl:text-xl font-bold rounded-lg border-2 focus:outline-none disabled:opacity-50 ${digito
                                ? 'border-slate-800 bg-slate-200 text-slate-900'
                                : 'border-slate-300 bg-slate-100 text-slate-900 focus:border-slate-500'
                                }`}
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                    ))}
                </div>

                {/* Botón verificar */}
                <button
                    onClick={() => onVerificar(codigoCompleto)}
                    disabled={codigoCompleto.length !== 6 || cargando}
                    className={`w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base lg:cursor-pointer ${codigoCompleto.length === 6 && !cargando
                        ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 active:scale-[0.98]'
                        : 'bg-slate-400 text-white cursor-not-allowed'
                        }`}
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
                <div className="mt-3 lg:mt-2.5 2xl:mt-3 text-center">
                    {puedeReenviar ? (
                        <button
                            onClick={handleReenviar}
                            disabled={reenviando}
                            className="text-sm lg:text-[11px] 2xl:text-sm text-slate-800 font-bold hover:underline disabled:opacity-50 inline-flex items-center gap-1.5 lg:cursor-pointer"
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
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                            Reenviar código en{' '}
                            <span className="font-bold text-slate-800">
                                {Math.floor(tiempoRestante / 60)}:{(tiempoRestante % 60).toString().padStart(2, '0')}
                            </span>
                        </p>
                    )}
                </div>

                {/* Ayuda */}
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 text-center mt-3 lg:mt-2.5 2xl:mt-3">
                    ¿No encuentras el correo? Revisa tu carpeta de spam
                </p>
            </div>
        </div>
    );
}

export default ModalVerificacionEmail;
