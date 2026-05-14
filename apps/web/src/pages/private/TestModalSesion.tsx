/**
 * PÁGINA TEMPORAL — TestModalSesion
 * ==================================
 * Comparación de diseños alternativos para ModalInactividad.
 *
 * Brief: ni saturado/decorado, ni techy/dashboard. Estilo MODERNO PROFESIONAL.
 * Referencias: Stripe consumer, Notion config, Linear, MailChimp.
 *
 * Después de elegir, BORRAR esta página y su ruta.
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

const TIEMPO_INICIAL = 300;

export default function TestModalSesion() {
    const [segundos, setSegundos] = useState(264);
    const [pausado, setPausado] = useState(false);

    useEffect(() => {
        if (pausado) return;
        const interval = setInterval(() => {
            setSegundos((s) => (s <= 0 ? TIEMPO_INICIAL : s - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [pausado]);

    const progreso = (segundos / TIEMPO_INICIAL) * 100;

    return (
        <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                    Rediseño del Modal de Sesión
                </h1>
                <p className="text-slate-600 mb-6">
                    Estilo <strong>moderno-profesional</strong>: limpio, sin gradientes
                    saturados, sin elementos decorativos, sin headers oscuros. Inspiración:
                    Stripe consumer, Notion, MailChimp.
                </p>

                <div className="mb-6 flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setPausado((p) => !p)}
                        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold cursor-pointer hover:bg-slate-700"
                    >
                        {pausado ? 'Reanudar contador' : 'Pausar contador'}
                    </button>
                    <button
                        onClick={() => setSegundos(TIEMPO_INICIAL)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50"
                    >
                        Reiniciar a 300s
                    </button>
                    <button
                        onClick={() => setSegundos(15)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold cursor-pointer hover:bg-slate-50"
                    >
                        Saltar a 15s (cerca de expirar)
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ════════════════════════════════════════════════════════════ */}
                    {/* DISEÑO E — Clean Pro Compacto                                  */}
                    {/* ════════════════════════════════════════════════════════════ */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            Diseño E — Clean Pro
                        </h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Modal compacto, ícono discreto en círculo gris claro, counter
                            inline en el texto. Acento dorado solo en la barra de progreso.
                            Estilo Linear/Notion <em>humanizado</em>.
                        </p>

                        <div className="relative bg-slate-300/60 rounded-2xl p-8 flex items-center justify-center min-h-[420px]">
                            <DisenoE segundos={segundos} progreso={progreso} />
                        </div>

                        <details className="mt-3 text-xs text-slate-600">
                            <summary className="cursor-pointer font-semibold">
                                Características del Diseño E
                            </summary>
                            <ul className="ml-4 mt-2 space-y-1 list-disc">
                                <li>Modal blanco, esquinas redondeadas medias (rounded-2xl)</li>
                                <li>Ícono Clock pequeño en círculo slate-100 con border</li>
                                <li>Título peso semibold (no bold/extrabold)</li>
                                <li>Counter inline en el texto: "...se cerrará en 4:24 min"</li>
                                <li>Barra de progreso fina con acento dorado sutil</li>
                                <li>2 botones lado a lado: secundario blanco/borde + primario slate-900</li>
                                <li>Padding generoso (p-6), ancho 400px</li>
                                <li>Sombra suave, sin gradientes</li>
                            </ul>
                        </details>
                    </div>

                    {/* ════════════════════════════════════════════════════════════ */}
                    {/* DISEÑO F — Editorial Centered                                  */}
                    {/* ════════════════════════════════════════════════════════════ */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            Diseño F — Editorial Centered
                        </h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Layout vertical centrado con jerarquía clara. Counter como elemento
                            visual prominente pero sobrio. Padding amplio, tipografía legible.
                            Estilo MailChimp/HubSpot.
                        </p>

                        <div className="relative bg-slate-300/60 rounded-2xl p-8 flex items-center justify-center min-h-[420px]">
                            <DisenoF segundos={segundos} progreso={progreso} />
                        </div>

                        <details className="mt-3 text-xs text-slate-600">
                            <summary className="cursor-pointer font-semibold">
                                Características del Diseño F
                            </summary>
                            <ul className="ml-4 mt-2 space-y-1 list-disc">
                                <li>Modal blanco más ancho, esquinas suaves (rounded-2xl)</li>
                                <li>Sin ícono decorativo (el contenido habla por sí mismo)</li>
                                <li>Título centrado peso medium-semibold</li>
                                <li>Counter centrado prominente: número grande slate-900 + "segundos restantes"</li>
                                <li>Barra de progreso amplia con acento dorado</li>
                                <li>2 botones full-width apilados (primario arriba, link debajo)</li>
                                <li>Padding amplio (p-8), ancho 380px</li>
                                <li>Sin colores saturados, sin gradientes</li>
                            </ul>
                        </details>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                    <p className="text-sm text-slate-800">
                        <strong>Para elegir:</strong> dime <code className="bg-white px-1 rounded">E</code> o{' '}
                        <code className="bg-white px-1 rounded">F</code> (o pídeme variaciones —
                        ej: <em>"E pero sin ícono"</em> o <em>"F con botones lado a lado"</em>),
                        y aplico el cambio en{' '}
                        <code className="bg-white px-1 rounded">ModalInactividad.tsx</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════
// DISEÑO E — Clean Pro Compacto
// ════════════════════════════════════════════════════════════════════

function DisenoE({ segundos, progreso }: { segundos: number; progreso: number }) {
    const urgente = segundos <= 30;
    const mm = Math.floor(segundos / 60);
    const ss = String(segundos % 60).padStart(2, '0');
    const tiempoTexto = mm > 0 ? `${mm}:${ss} min` : `${segundos} segundos`;

    return (
        <div
            className="bg-white rounded-2xl shadow-lg w-full max-w-[400px] p-6"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            {/* Ícono discreto en círculo gris claro */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <Icon icon={ICONOS.horario} className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-900 leading-tight">
                        Sesión por expirar
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Por inactividad</p>
                </div>
            </div>

            {/* Mensaje con counter inline */}
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Por tu seguridad, cerraremos tu sesión en{' '}
                <span
                    className={`font-semibold tabular-nums ${
                        urgente ? 'text-red-600' : 'text-slate-900'
                    }`}
                >
                    {tiempoTexto}
                </span>
                . ¿Quieres permanecer conectado?
            </p>

            {/* Barra de progreso fina con acento dorado */}
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-5">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                        width: `${progreso}%`,
                        background: urgente ? '#dc2626' : '#f59e0b',
                    }}
                />
            </div>

            {/* Botones */}
            <div className="flex items-center gap-2">
                <button className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 cursor-pointer">
                    Cerrar sesión
                </button>
                <button className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 cursor-pointer">
                    Continuar
                </button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════
// DISEÑO F — Editorial Centered (con counter circular)
// ════════════════════════════════════════════════════════════════════

function DisenoF({ segundos, progreso }: { segundos: number; progreso: number }) {
    const urgente = segundos <= 30;
    // Color sólido para el counter circular (sin gradient ahí)
    const colorAcento = urgente ? '#dc2626' : '#f97316';
    // Gradientes para el botón primario (naranja → naranja oscuro o rojo si urgente)
    const gradientePrimario = urgente
        ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
        : 'linear-gradient(135deg, #fb923c, #ea580c)';
    const gradientePrimarioHover = urgente
        ? 'linear-gradient(135deg, #dc2626, #991b1b)'
        : 'linear-gradient(135deg, #f97316, #c2410c)';
    const radio = 52;
    const circumference = 2 * Math.PI * radio;
    const offset = circumference * (1 - progreso / 100);

    return (
        <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-8"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            {/* Detalle decorativo: ícono de reloj naranja con halo pulsante */}
            <div className="flex justify-center mb-4">
                <div className="relative w-11 h-11 flex items-center justify-center">
                    {/* Halo pulsante detrás */}
                    <span
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: colorAcento,
                            opacity: 0.25,
                            animation: 'pulseRing 1.6s ease-in-out infinite',
                        }}
                    />
                    {/* Ícono reloj */}
                    <Icon
                        icon={ICONOS.horario}
                        className="w-10 h-10 relative"
                        style={{ color: colorAcento }}
                    />
                </div>
            </div>

            {/* Título centrado */}
            <h3 className="text-center text-xl font-semibold text-slate-900 tracking-tight mb-2">
                Tu sesión está por expirar
            </h3>
            <p className="text-center text-sm text-slate-500 leading-relaxed mb-6">
                Te desconectaremos por inactividad.
            </p>

            {/* Counter circular SVG */}
            <div className="flex justify-center mb-6">
                <div className="relative inline-flex items-center justify-center">
                    <svg
                        className="transform -rotate-90"
                        style={{ width: '8rem', height: '8rem' }}
                    >
                        {/* Background circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radio}
                            stroke="#e2e8f0"
                            strokeWidth="8"
                            fill="none"
                        />
                        {/* Progress circle (color sólido sin gradient) */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radio}
                            stroke={colorAcento}
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                        />
                    </svg>
                    {/* Contenido centrado dentro del círculo */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div
                            className={`font-semibold tabular-nums leading-none ${
                                urgente ? 'text-red-600' : 'text-slate-900'
                            }`}
                            style={{ fontSize: '2.5rem' }}
                        >
                            {segundos}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                            segundos
                        </div>
                    </div>
                </div>
            </div>

            {/* Botones lado a lado — ambos con gradient sutil para coherencia */}
            <div className="flex items-center gap-2">
                <button
                    className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                    onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            'linear-gradient(135deg, #334155, #1e293b)')
                    }
                    onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            'linear-gradient(135deg, #1e293b, #0f172a)')
                    }
                >
                    Cerrar sesión
                </button>
                <button
                    className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all shadow-sm"
                    style={{ background: gradientePrimario }}
                    onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            gradientePrimarioHover)
                    }
                    onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            gradientePrimario)
                    }
                >
                    Permanecer
                </button>
            </div>
        </div>
    );
}

// Inyectar keyframes
if (typeof document !== 'undefined' && !document.getElementById('test-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'test-modal-styles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.4); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
