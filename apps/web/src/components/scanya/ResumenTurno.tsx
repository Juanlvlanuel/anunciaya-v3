/**
 * ResumenTurno.tsx
 * ================
 * Resumen del turno activo - DISEÑO HÍBRIDO PREMIUM.
 *
 * Diseño:
 * - Estilo Card Premium (línea colorida superior, header con gradiente, secciones definidas)
 * - Iconos SVG del Dashboard Ejecutivo (en lugar de Lucide Icons)
 * - Botón rojo estilo Gaming con efectos shimmer
 * - Métricas totalmente centradas
 * - Sin footer
 *
 * Ubicación: apps/web/src/components/scanya/ResumenTurno.tsx
 */

import { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import type { TurnoScanYA } from '@/types/scanya';

// =============================================================================
// INTERFACES
// =============================================================================

interface ResumenTurnoProps {
    turno: TurnoScanYA | null;
    onAbrirTurno: () => void;
    onCerrarTurno: () => void;
    cargando?: boolean;
    nombreUsuario: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convierte formato PostgreSQL a ISO 8601
 */
function convertirPostgreSQLaISO(timestamp: string): string {
    let iso = timestamp.replace(' ', 'T');
    iso = iso.replace('+00', 'Z');
    return iso;
}

/**
 * Calcula la duración transcurrida desde el inicio del turno
 */
function calcularDuracion(horaInicio: string | null | undefined): string {
    if (!horaInicio) {
        return '0min';
    }

    try {
        const isoTimestamp = convertirPostgreSQLaISO(horaInicio);
        const inicio = new Date(isoTimestamp);

        if (isNaN(inicio.getTime())) {
            console.error('[ResumenTurno] Fecha inválida para duración:', horaInicio);
            return '0min';
        }

        const ahora = new Date();
        const diff = ahora.getTime() - inicio.getTime();

        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (horas > 0) {
            return `${horas}h ${minutos}min`;
        }
        return `${minutos}min`;
    } catch (error) {
        console.error('[ResumenTurno] Error calculando duración:', error);
        return '0min';
    }
}

/**
 * Formatea hora a formato 12h
 */
function formatearHora(timestamp: string | null | undefined): string {
    if (!timestamp) {
        return '--:--';
    }

    try {
        const isoTimestamp = convertirPostgreSQLaISO(timestamp);
        const fecha = new Date(isoTimestamp);

        if (isNaN(fecha.getTime())) {
            console.error('[ResumenTurno] Fecha inválida:', timestamp);
            return '--:--';
        }

        return fecha.toLocaleTimeString('es-MX', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error('[ResumenTurno] Error formateando hora:', error);
        return '--:--';
    }
}

/**
 * Extrae solo los nombres (sin apellidos)
 */
function obtenerSoloNombres(nombreCompleto: string): string {
    const palabras = nombreCompleto.trim().split(/\s+/);

    if (palabras.length === 1) {
        return palabras[0];
    } else if (palabras.length === 2) {
        return palabras[0];
    } else {
        return `${palabras[0]} ${palabras[1]}`;
    }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function ResumenTurno({
    turno,
    onAbrirTurno,
    onCerrarTurno,
    cargando = false,
    nombreUsuario,
}: ResumenTurnoProps) {
    // ---------------------------------------------------------------------------
    // ESTADO: Duración en tiempo real
    // ---------------------------------------------------------------------------
    const [duracion, setDuracion] = useState<string>('');

    // ---------------------------------------------------------------------------
    // EFECTO: Actualizar duración cada minuto
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!turno) {
            setDuracion('');
            return;
        }

        setDuracion(calcularDuracion(turno.horaInicio));

        const intervalo = setInterval(() => {
            setDuracion(calcularDuracion(turno.horaInicio));
        }, 60000);

        return () => clearInterval(intervalo);
    }, [turno]);

    // ---------------------------------------------------------------------------
    // RENDER: SIN TURNO
    // ---------------------------------------------------------------------------
    if (!turno) {
        return (
            <div
                className="
          rounded-xl
          p-6 lg:p-4 2xl:p-6
          relative
          lg:max-w-md 2xl:max-w-none
          
        "
                style={{
                    background: '#001136',
                    borderColor: '#002D8F',
                }}
            >
                {/* Línea superior colorida */}
                <div
                    className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                    style={{
                        background: 'linear-gradient(90deg, #3B82F6, #10B981, #F59E0B)',
                    }}
                />

                {/* Header */}
                <div
                    className="mb-5 pb-4"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))',
                        margin: '-24px -24px 24px -24px',
                        padding: '28px 24px 16px 24px',
                        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        {/* Logo + Título */}
                        <div className="flex items-center gap-3">
                            <div
                                className="
                  w-14 h-14 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14
                  rounded-xl
                  flex items-center justify-center
                "
                                style={{
                                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.5)',
                                }}
                            >
                                {/* Icono SVG BarChart */}
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M3 3v18h18" />
                                    <path d="m19 9-5 5-4-4-3 3" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-xl lg:text-lg 2xl:text-xl tracking-wide">
                                    ¡BIENVENIDO!
                                </h2>
                                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                                    @{obtenerSoloNombres(nombreUsuario)}
                                </p>
                            </div>
                        </div>

                        {/* Badge Estado */}
                        <div
                            className="
                px-2.5 py-1 lg:px-4 lg:py-2
                rounded-full
                flex items-center gap-1.5 lg:gap-2
              "
                            style={{
                                background: 'rgba(100, 116, 139, 0.2)',
                                border: '1px solid rgba(100, 116, 139, 0.4)',
                            }}
                        >
                            <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-[#64748B]" />
                            <span className="text-[#94A3B8] text-[10px] lg:text-xs 2xl:text-xs font-semibold uppercase">
                                Sin Turno
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mensaje */}
                <p className="text-[#94A3B8] text-center mb-6 lg:mb-4 2xl:mb-6 mt-6 lg:mt-4 2xl:mt-6 text-base lg:text-sm 2xl:text-base py-4 lg:py-3 2xl:py-4">
                    No tienes un turno abierto
                </p>

                {/* Botón Abrir Turno */}
                <button
                    onClick={onAbrirTurno}
                    disabled={cargando}
                    className="
            w-full
            flex items-center justify-center gap-2.5
            text-white font-semibold
            py-4
            rounded-lg
            transition-all duration-200
            text-base
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
          "
                    style={{
                        background: cargando
                            ? 'rgba(100, 116, 139, 0.3)'
                            : 'rgba(16, 185, 129, 0.2)',
                        border: cargando
                            ? '1px solid rgba(100, 116, 139, 0.3)'
                            : '1px solid rgba(16, 185, 129, 0.4)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: cargando ? 'none' : '0 0 20px rgba(16, 185, 129, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.3)';
                            e.currentTarget.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';
                        }
                    }}
                >
                    <PlayCircle className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                    {cargando ? 'Abriendo turno...' : 'Abrir Turno'}
                </button>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // RENDER: CON TURNO ACTIVO
    // ---------------------------------------------------------------------------
    return (
        <div
            className="
        rounded-xl
        relative
        overflow-hidden
        lg:max-w-md 2xl:max-w-none
        
      "
            style={{
                background: '#001136',
                borderColor: '#002D8F',
            }}
        >
            {/* Línea superior colorida */}
            <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{
                    background: 'linear-gradient(90deg, #3B82F6, #10B981, #F59E0B)',
                }}
            />

            {/* Header Premium */}
            <div
                className="p-4 lg:p-4 2xl:p-6 pb-3 lg:pb-3 2xl:pb-4"
                style={{
                    background: 'linear-gradient(0deg, #001136 0%, #072885 70%, #072885 100%)',
                }}
            >
                <div className="flex justify-between items-start mb-3 lg:mb-4">
                    {/* Logo + Título */}
                    <div className="flex items-center gap-2 lg:gap-2 2xl:gap-3">
                        <div
                            className="
                w-10 h-10 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14
                rounded-xl
                flex items-center justify-center
              "
                            style={{
                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.5)',
                            }}
                        >
                            {/* Icono SVG BarChart */}
                            <svg className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M3 3v18h18" />
                                <path d="m19 9-5 5-4-4-3 3" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base lg:text-lg 2xl:text-xl tracking-wide">
                                ¡BIENVENIDO!
                            </h2>
                            <p className="text-[#94A3B8] text-sm lg:text-base 2xl:text-lg">
                                @{obtenerSoloNombres(nombreUsuario)}
                            </p>
                        </div>
                    </div>

                    {/* Badge Estado ACTIVO */}
                    <div
                        className="
              px-2 py-1 lg:px-2.5 lg:py-0.5 2xl:px-4 2xl:py-2
              rounded-full
              flex items-center gap-1.5 lg:gap-1 2xl:gap-2
            "
                        style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        <span className="text-[#10B981] text-[10px] lg:text-[10px] 2xl:text-xs font-semibold uppercase">
                            Activo
                        </span>
                    </div>
                </div>

                {/* Time Display en 3 bloques */}
                <div className="flex justify-between items-center py-0 lg:py-1">
                    <div className="text-center">
                        <div className="text-[10px] lg:text-[10px] 2xl:text-[11px] text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide">
                            Inicio
                        </div>
                        <div className="text-base lg:text-base 2xl:text-xl font-bold text-white">
                            {formatearHora(turno.horaInicio)}
                        </div>
                    </div>

                    <div className="text-2xl lg:text-xl 2xl:text-2xl text-[#3B82F6] font-light mx-2 lg:mx-2 2xl:mx-3">•</div>

                    <div className="text-center">
                        <div className="text-[10px] lg:text-[10px] 2xl:text-[11px] text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide">
                            Duración
                        </div>
                        <div className="text-base lg:text-base 2xl:text-xl font-bold text-[#10B981]">
                            {duracion || '0min'}
                        </div>
                    </div>

                    <div className="text-2xl lg:text-xl 2xl:text-2xl text-[#3B82F6] font-light mx-2 lg:mx-2 2xl:mx-3">•</div>

                    <div className="text-center">
                        <div className="text-[10px] lg:text-[10px] 2xl:text-[11px] text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide">
                            Estado
                        </div>
                        <div className="text-sm lg:text-sm 2xl:text-base font-bold text-white">
                            Abierto
                        </div>
                    </div>
                </div>
            </div>

            {/* Body Premium */}
            <div className="p-4 pt-5 lg:p-4 lg:pt-6 2xl:p-8 2xl:pt-12">
                {/* Métricas Centradas */}
                <div className="flex gap-2 lg:gap-4 2xl:gap-5 mb-4 lg:mb-4 2xl:mb-6">
                    {/* Transacciones */}
                    <div
                        className="
              flex-1
              rounded-xl
              p-2 lg:p-3 2xl:p-6
              relative
            "
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2px solid rgba(30, 64, 110, 0.5)',
                        }}
                    >
                        {/* Línea superior azul */}
                        <div
                            className="absolute top-2 left-2 right-2 h-1.5 rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, #3B82F6, transparent)',
                            }}
                        />

                        <div className="flex flex-col items-center gap-1 lg:gap-2 2xl:gap-3 mb-1 lg:mb-2 2xl:mb-4 mt-3 lg:mt-0 2xl:mt-0">
                            {/* Icono SVG Tarjeta */}
                            <div
                                className="
                  w-6 h-6 lg:w-7 lg:h-7 lg:mt-2 2xl:w-11 2xl:h-11
                  rounded-lg
                  flex items-center justify-center
                "
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))',
                                }}
                            >
                                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                    <line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                            </div>
                            <div className="text-[9px] lg:text-[10px] 2xl:text-xs text-[#94A3B8] uppercase tracking-wide font-medium">
                                Transacciones
                            </div>
                        </div>

                        <div className="text-2xl lg:text-3xl 2xl:text-5xl font-bold text-white text-center mb-0.5 lg:mb-1 2xl:mb-2">
                            {turno.transacciones}
                        </div>
                        <div className="text-[10px] lg:text-xs 2xl:text-sm text-[#64748B] text-center">
                            procesadas en turno
                        </div>
                    </div>

                    {/* Puntos */}
                    <div
                        className="
              flex-1
              rounded-xl
              p-2 lg:p-3 2xl:p-6
              relative
            "
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2px solid rgba(30, 64, 110, 0.5)',
                        }}
                    >
                        {/* Línea superior dorada */}
                        <div
                            className="absolute top-2 left-2 right-2 h-1.5 rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, #F59E0B, transparent)',
                            }}
                        />

                        <div className="flex flex-col items-center gap-1 lg:gap-2 2xl:gap-3 mb-1 lg:mb-2 2xl:mb-4 mt-3 lg:mt-0 2xl:mt-0">
                            {/* Icono SVG Estrella */}
                            <div
                                className="
                  w-6 h-6 lg:w-7 lg:h-7 lg:mt-2 2xl:w-11 2xl:h-11
                  rounded-lg
                  flex items-center justify-center
                "
                                style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
                                }}
                            >
                                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            </div>
                            <div className="text-[9px] lg:text-[10px] 2xl:text-xs text-[#94A3B8] uppercase tracking-wide font-medium">
                                Puntos
                            </div>
                        </div>

                        <div className="text-2xl lg:text-3xl 2xl:text-5xl font-bold text-white text-center mb-0.5 lg:mb-1 2xl:mb-2">
                            {turno.puntosOtorgados}
                        </div>
                        <div className="text-[10px] lg:text-xs 2xl:text-sm text-[#64748B] text-center">
                            otorgados en turno
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div
                    className="h-0.5 mb-4 lg:mb-4 2xl:mb-6"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                    }}
                />

                {/* Botón Gaming Style - Finalizar Turno */}
                <button
                    onClick={onCerrarTurno}
                    disabled={cargando}
                    className="
            w-full
            flex items-center justify-center gap-2 lg:gap-2 2xl:gap-3
            text-white font-bold
            py-3 lg:py-3.5 2xl:py-5
            rounded-xl
            transition-all duration-200
            text-sm lg:text-sm 2xl:text-base
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            relative
            overflow-hidden
            group
          "
                    style={{
                        background: cargando
                            ? 'rgba(100, 116, 139, 0.3)'
                            : 'linear-gradient(135deg, #DC2626, #991B1B)',
                        border: 'none',
                        boxShadow: cargando ? 'none' : '0 4px 20px rgba(220, 38, 38, 0.4)',
                    }}
                    onMouseEnter={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 25px rgba(220, 38, 38, 0.5)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(220, 38, 38, 0.4)';
                        }
                    }}
                >
                    {/* Efecto Shimmer */}
                    {!cargando && (
                        <div
                            className="
                absolute inset-0
                bg-linear-to-r from-transparent via-white/30 to-transparent
                -translate-x-full
                group-hover:translate-x-full
                transition-transform duration-700
              "
                        />
                    )}

                    {/* Icono SVG StopCircle */}
                    <svg className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-[22px] 2xl:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <rect x="9" y="9" width="6" height="6" />
                    </svg>

                    <span className="relative z-10">
                        {cargando ? 'Finalizando turno...' : 'Finalizar Turno'}
                    </span>
                </button>
            </div>
        </div>
    );
}