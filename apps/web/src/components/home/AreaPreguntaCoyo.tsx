/**
 * AreaPreguntaCoyo.tsx — Área de pregunta del Home (estilo "Burbuja").
 * =====================================================================
 * Layout VERTICAL centrado: Coyo (mascota Rive) grande arriba, dos burbujas
 * de diálogo debajo (saludo + pregunta) con el pico apuntando hacia Coyo,
 * el input a todo el ancho y el stat de vecinos al pie. Pensado para vivir
 * centrado en el rail izquierdo (desktop) y arriba del feed (móvil).
 *
 * Decisiones de integración:
 *   - Coyo es <CoyoAnimado> (Rive), reacciona al estado de la app (idle/
 *     atento/pensando/respondiendo) que pasa el padre por `estadoCoyo`.
 *   - CoyoInput es CONTROLADO: el texto vive en el padre (PaginaInicio) para
 *     que useCoyoEstadoVisual reciba el texto y encienda `atento`.
 *
 * Ubicación: apps/web/src/components/home/AreaPreguntaCoyo.tsx
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Sparkles, X, Loader2 } from 'lucide-react';
import { CoyoAnimado, type EstadoCoyoVisual } from '../CoyoAnimado';

const TEXTO_MAX = 500;

// =============================================================================
// CoyoInput — campo de pregunta (pill blanco + X + botón enviar circular)
// =============================================================================

interface CoyoInputProps {
    id?: string;
    compact?: boolean;
    placeholder?: string;
    texto: string;
    onTextoChange: (v: string) => void;
    onEnviar: () => void;
    enviando: boolean;
    puedeEnviar: boolean;
}

export function CoyoInput({
    id = 'coyo-input',
    compact = false,
    placeholder = 'Escribe lo que buscas…',
    texto,
    onTextoChange,
    onEnviar,
    enviando,
    puedeEnviar,
}: CoyoInputProps) {
    const ref = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!puedeEnviar) return;
        onEnviar();
    };

    // Altura estándar de la app: 44px (laptop/desktop), 48px en móvil para que
    // el input protagonista del Home destaque y evite el auto-zoom de iOS.
    const dims = compact ? 'h-12 px-4' : 'h-11 lg:h-10 2xl:h-11 px-5';

    return (
        <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <div
                className={`flex-1 min-w-0 flex items-center gap-1.5 bg-white rounded-full border-2 border-slate-300 focus-within:border-slate-500 ${dims}`}
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
            >
                <input
                    id={id}
                    ref={ref}
                    type="text"
                    value={texto}
                    onChange={(e) => onTextoChange(e.target.value.slice(0, TEXTO_MAX))}
                    placeholder={placeholder}
                    maxLength={TEXTO_MAX}
                    disabled={enviando}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-testid="home-pregunta-input"
                    className="flex-1 min-w-0 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                {texto && !enviando && (
                    <button
                        type="button"
                        aria-label="Borrar"
                        onClick={() => {
                            onTextoChange('');
                            ref.current?.focus();
                        }}
                        className="shrink-0 inline-flex items-center justify-center w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 rounded-full bg-slate-500 hover:bg-slate-600 lg:cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5 text-white" strokeWidth={2.5} />
                    </button>
                )}
            </div>
            <button
                type="submit"
                disabled={!puedeEnviar}
                aria-label="Publicar pregunta"
                data-testid="home-pregunta-enviar"
                className={`send-btn shrink-0 inline-flex items-center justify-center rounded-full text-white lg:cursor-pointer active:scale-[0.94] disabled:opacity-50 disabled:cursor-not-allowed ${
                    compact ? 'w-12 h-12' : 'w-11 h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11'
                }`}
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 3px 10px rgba(30,41,59,0.35)' }}
            >
                {enviando ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                    <span className="send-ico inline-flex">
                        <Send size={18} aria-hidden="true" />
                    </span>
                )}
            </button>
        </form>
    );
}

// =============================================================================
// Saludo con efecto "máquina de escribir" (letras una por una)
// =============================================================================

/** Devuelve cuántos caracteres mostrar, revelados uno por uno. Respeta
 *  prefers-reduced-motion (muestra todo de inmediato). */
function useTecleado(texto: string, velocidad = 65, retrasoMs = 0): number {
    const [n, setN] = useState(0);
    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !texto) {
            setN(texto.length);
            return;
        }
        setN(0);
        let i = 0;
        let intervalId: number | undefined;
        const timeoutId = window.setTimeout(() => {
            intervalId = window.setInterval(() => {
                i += 1;
                setN(i);
                if (i >= texto.length) window.clearInterval(intervalId);
            }, velocidad);
        }, retrasoMs);
        return () => {
            window.clearTimeout(timeoutId);
            if (intervalId !== undefined) window.clearInterval(intervalId);
        };
    }, [texto, velocidad, retrasoMs]);
    return n;
}

/** Texto simple tecleado letra por letra (con cursor mientras escribe). */
function TextoTecleado({
    texto,
    retrasoMs = 0,
    className,
}: {
    texto: string;
    retrasoMs?: number;
    className?: string;
}) {
    const n = useTecleado(texto, 65, retrasoMs);
    const tecleando = n < texto.length;
    return (
        <p className={className} aria-label={texto}>
            <span aria-hidden>{texto.slice(0, n)}</span>
            {tecleando && (
                <span
                    aria-hidden
                    className="ml-0.5 inline-block w-[2px] h-[0.95em] translate-y-[2px] bg-slate-500 animate-pulse"
                />
            )}
        </p>
    );
}

/** "¡Hola, [nombre]!" tecleado letra por letra (nombre en azul) + cursor. */
function SaludoTecleado({ nombre }: { nombre: string }) {
    const prefijo = '¡Hola, ';
    const sufijo = '!';
    const completo = `${prefijo}${nombre}${sufijo}`;
    const n = useTecleado(completo);

    const finPre = Math.min(n, prefijo.length);
    const finNom = Math.min(Math.max(n - prefijo.length, 0), nombre.length);
    const finSuf = Math.max(n - prefijo.length - nombre.length, 0);
    const tecleando = n < completo.length;

    return (
        <h1
            className="text-2xl 2xl:text-3xl font-bold text-slate-900 tracking-tight"
            aria-label={completo}
        >
            <span aria-hidden>{prefijo.slice(0, finPre)}</span>
            <span aria-hidden className="text-blue-600">
                {nombre.slice(0, finNom)}
            </span>
            <span aria-hidden>{sufijo.slice(0, finSuf)}</span>
            {tecleando && (
                <span
                    aria-hidden
                    className="ml-0.5 inline-block w-[2px] h-[0.95em] translate-y-[2px] bg-slate-700 animate-pulse"
                />
            )}
        </h1>
    );
}

// =============================================================================
// AreaPreguntaCoyo — Coyo + burbujas + (input) + stat (layout vertical)
// =============================================================================

interface AreaPreguntaCoyoProps {
    nombreUsuario: string;
    /** Estado visual de la mascota (idle/atento/pensando/respondiendo/saludo). */
    estadoCoyo: EstadoCoyoVisual;
    /** false en móvil cuando el input va aparte (sticky). */
    conInput?: boolean;
    /** Si no hay ciudad activa, el input se deshabilita con otro placeholder. */
    hayCiudad?: boolean;
    // Props del input controlado (solo necesarias si conInput=true).
    texto?: string;
    onTextoChange?: (v: string) => void;
    onEnviar?: () => void;
    enviando?: boolean;
    puedeEnviar?: boolean;
}

export function AreaPreguntaCoyo({
    nombreUsuario,
    estadoCoyo,
    conInput = true,
    hayCiudad = true,
    texto = '',
    onTextoChange,
    onEnviar,
    enviando = false,
    puedeEnviar = false,
}: AreaPreguntaCoyoProps) {
    return (
        <div className="flex flex-col items-center text-center gap-6 lg:gap-7">
            {/* Saludo arriba (encabezado) con efecto máquina de escribir */}
            <SaludoTecleado nombre={nombreUsuario} />

            {/* Coyo + su burbuja de diálogo (pico apuntando hacia Coyo) */}
            <div className="flex flex-col items-center gap-3">
                <CoyoAnimado
                    estado={estadoCoyo}
                    align="center"
                    alt="Coyo, asistente de AnunciaYA"
                    className="shrink-0 h-44 w-44 lg:h-48 lg:w-48 2xl:h-52 2xl:w-52 select-none overflow-visible transition-transform duration-300 ease-out lg:hover:-translate-y-2 lg:hover:rotate-6 lg:hover:scale-105"
                    style={{ filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.15))' }}
                />
                <div
                    className="relative bg-white border-[3px] border-blue-200 rounded-2xl px-5 py-2.5"
                    style={{ boxShadow: '0 10px 28px rgba(37,99,235,0.10), 0 2px 4px rgba(15,23,42,0.06)' }}
                >
                    {/* Pico apuntando hacia arriba (a Coyo) */}
                    <svg
                        aria-hidden
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{ top: '-13px', width: 30, height: 16 }}
                        viewBox="0 0 32 18"
                        fill="none"
                    >
                        <polygon points="16,0 2,18 30,18" fill="#bfdbfe" />
                        <polygon points="16,5 8,18 24,18" fill="white" />
                    </svg>
                    <TextoTecleado
                        texto="¿Qué andas buscando hoy?"
                        retrasoMs={`¡Hola, ${nombreUsuario}!`.length * 65 + 350}
                        className="text-base 2xl:text-lg font-semibold text-slate-700 leading-snug"
                    />
                </div>
            </div>

            {/* Input (solo cuando vive aquí — desktop) */}
            {conInput && (
                <div className="w-full space-y-2">
                    <p className="flex items-center gap-2 pl-1 text-sm font-bold text-slate-600">
                        <Sparkles size={16} strokeWidth={2.5} className="text-amber-500" /> Pregúntale a Coyo
                    </p>
                    <CoyoInput
                        texto={texto}
                        onTextoChange={onTextoChange ?? (() => {})}
                        onEnviar={onEnviar ?? (() => {})}
                        enviando={enviando}
                        puedeEnviar={puedeEnviar}
                        placeholder={hayCiudad ? 'Escribe lo que buscas…' : 'Activa tu ubicación para preguntar'}
                    />
                </div>
            )}
        </div>
    );
}

export default AreaPreguntaCoyo;
