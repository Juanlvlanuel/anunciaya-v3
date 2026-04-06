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
import { ModalImagenes } from '@/components/ui/ModalImagenes';

// =============================================================================
// INTERFACES
// =============================================================================

interface ResumenTurnoProps {
    turno: TurnoScanYA | null;
    onAbrirTurno: () => void;
    onCerrarTurno: () => void;
    cargando?: boolean;
    nombreUsuario: string;
    fotoUrl?: string | null;
    vouchersPendientes?: number;
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
    fotoUrl,
    vouchersPendientes = 0,
}: ResumenTurnoProps) {
    // ---------------------------------------------------------------------------
    // ESTADO: Duración en tiempo real
    // ---------------------------------------------------------------------------
    const [duracion, setDuracion] = useState<string>('');
    const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);

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
          rounded-2xl
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

                {/* Header — Avatar centrado */}
                <div
                    className="mb-5 pb-4 relative"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))',
                        margin: '-24px -24px 24px -24px',
                        padding: '28px 24px 16px 24px',
                        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                >
                    {/* Badge Estado — esquina superior derecha */}
                    <div className="absolute top-4 right-4">
                        <div
                            className="
                                px-2.5 py-1 lg:px-3 lg:py-1
                                rounded-full
                                flex items-center gap-1.5
                            "
                            style={{
                                background: 'rgba(100, 116, 139, 0.2)',
                                border: '1px solid rgba(100, 116, 139, 0.4)',
                            }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                            <span className="text-[#94A3B8] text-[10px] lg:text-xs font-semibold uppercase">
                                Sin Turno
                            </span>
                        </div>
                    </div>

                    {/* Avatar + Nombre centrados */}
                    <div className="flex flex-col items-center gap-3 pt-2">
                        <div
                            className={`
                                w-18 h-18 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20
                                rounded-full
                                flex items-center justify-center
                                overflow-hidden shrink-0
                                ${fotoUrl ? 'cursor-pointer hover:ring-2 hover:ring-white/40 transition-all duration-200' : ''}
                            `}
                            style={{
                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)',
                            }}
                            onClick={fotoUrl ? () => setModalAvatarAbierto(true) : undefined}
                        >
                            {fotoUrl ? (
                                <img src={fotoUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                            ) : (
                                <span className="text-white font-bold text-3xl lg:text-2xl 2xl:text-3xl">
                                    {obtenerSoloNombres(nombreUsuario).charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="text-center">
                            <h2 className="text-white font-bold text-xl lg:text-lg 2xl:text-xl">
                                Hola, {obtenerSoloNombres(nombreUsuario)}
                            </h2>
                            <p className="text-[#94A3B8] text-base lg:text-sm 2xl:text-base mt-0.5 font-medium">
                                Listo para empezar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mensaje */}
                <p className="text-[#94A3B8] text-center mb-6 lg:mb-4 2xl:mb-6 mt-6 lg:mt-4 2xl:mt-6 text-lg lg:text-base 2xl:text-lg py-4 lg:py-3 2xl:py-4">
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

                {/* Modal para expandir avatar */}
                {fotoUrl && (
                    <ModalImagenes
                        images={[fotoUrl]}
                        isOpen={modalAvatarAbierto}
                        onClose={() => setModalAvatarAbierto(false)}
                    />
                )}
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // RENDER: CON TURNO ACTIVO
    // ---------------------------------------------------------------------------
    return (
        <div
            className="
        rounded-2xl
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

            {/* Header Premium — Avatar centrado */}
            <div
                className="p-4 lg:p-4 2xl:p-6 pb-3 lg:pb-3 2xl:pb-4 relative"
                style={{
                    background: 'linear-gradient(0deg, #001136 0%, #072885 70%, #072885 100%)',
                }}
            >
                {/* ============================================================
                    MÓVIL: 3 columnas — Finalizar | Avatar+Datos | Activo
                ============================================================ */}
                <div className="flex lg:hidden flex-col pt-2 mb-3">
                    {/* Fila superior: Finalizar | Activo */}
                    <div className="flex items-center justify-between mb-3">
                        {/* Botón Finalizar Turno */}
                        <button
                            onClick={onCerrarTurno}
                            disabled={cargando}
                            className="
                                px-3 py-1.5
                                rounded-full
                                flex items-center gap-2
                                text-white font-bold
                                text-sm
                                transition-all duration-200
                                cursor-pointer
                                disabled:opacity-50 disabled:cursor-not-allowed
                                bg-linear-to-br from-amber-600 to-red-700
                            "
                            style={{
                                boxShadow: '0 2px 10px rgba(185, 28, 28, 0.35)',
                            }}
                        >
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <rect x="9" y="9" width="6" height="6" />
                            </svg>
                            {cargando ? 'Cerrando...' : 'Cerrar Turno'}
                        </button>

                        {/* Badge Activo */}
                        <div
                            className="
                                px-3 py-1.5
                                rounded-full
                                flex items-center gap-1.5
                            "
                            style={{
                                background: 'rgba(16, 185, 129, 0.25)',
                                border: '1px solid #10B981',
                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                            }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" style={{ boxShadow: '0 0 6px #10B981' }} />
                            <span className="text-[#34D399] text-xs font-bold uppercase tracking-wide">
                                Activo
                            </span>
                        </div>
                    </div>

                    {/* Avatar + Nombre centrado */}
                    <div className="flex flex-col items-center gap-1.5">
                        <div
                            className={`
                                w-14 h-14
                                rounded-full
                                flex items-center justify-center
                                overflow-hidden shrink-0
                                ${fotoUrl ? 'cursor-pointer hover:ring-2 hover:ring-white/40 transition-all duration-200' : ''}
                            `}
                            style={{
                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)',
                            }}
                            onClick={fotoUrl ? () => setModalAvatarAbierto(true) : undefined}
                        >
                            {fotoUrl ? (
                                <img src={fotoUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                            ) : (
                                <span className="text-white font-bold text-xl">
                                    {obtenerSoloNombres(nombreUsuario).charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="text-center">
                            <h2 className="text-white font-bold text-xl">
                                Hola, {obtenerSoloNombres(nombreUsuario)}
                            </h2>
                            <p className="text-[#94A3B8] text-base mt-0.5 font-medium">
                                Tu turno está en curso
                            </p>
                        </div>
                    </div>
                </div>

                {/* ============================================================
                    LAPTOP/DESKTOP: Layout centrado original
                ============================================================ */}

                {/* Badge Estado ACTIVO — esquina superior derecha (solo desktop) */}
                <div className="hidden lg:block absolute top-4 right-4">
                    <div
                        className="
                            px-3 py-1
                            rounded-full
                            flex items-center gap-1.5
                        "
                        style={{
                            background: 'rgba(16, 185, 129, 0.25)',
                            border: '1px solid #10B981',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" style={{ boxShadow: '0 0 6px #10B981' }} />
                        <span className="text-[#34D399] text-xs font-bold uppercase tracking-wide">
                            Activo
                        </span>
                    </div>
                </div>

                {/* Avatar + Nombre centrados (solo desktop) */}
                <div className="hidden lg:flex flex-col items-center gap-2 pt-2 mb-4">
                    <div
                        className={`
                            lg:w-16 lg:h-16 2xl:w-20 2xl:h-20
                            rounded-full
                            flex items-center justify-center
                            overflow-hidden shrink-0
                            ${fotoUrl ? 'cursor-pointer hover:ring-2 hover:ring-white/40 transition-all duration-200' : ''}
                        `}
                        style={{
                            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.5)',
                        }}
                        onClick={fotoUrl ? () => setModalAvatarAbierto(true) : undefined}
                    >
                        {fotoUrl ? (
                            <img src={fotoUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                        ) : (
                            <span className="text-white font-bold lg:text-2xl 2xl:text-3xl">
                                {obtenerSoloNombres(nombreUsuario).charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-white font-bold lg:text-lg 2xl:text-xl">
                            Hola, {obtenerSoloNombres(nombreUsuario)}
                        </h2>
                        <p className="text-[#94A3B8] lg:text-sm 2xl:text-base mt-0.5 font-medium">
                            Tu turno está en curso
                        </p>
                    </div>
                </div>

                {/* Separador móvil */}
                <div
                    className="h-0.5 mx-4 mt-2 mb-3 lg:mt-1 lg:mb-3 2xl:mt-2 2xl:mb-4"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.25), transparent)' }}
                />

                {/* Time Display en 3 bloques */}
                <div className="flex justify-between items-center py-0 lg:py-1">
                    <div className="text-center">
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide font-medium">
                            Inicio
                        </div>
                        <div className="text-lg lg:text-lg 2xl:text-2xl font-bold text-white">
                            {formatearHora(turno.horaInicio)}
                        </div>
                    </div>

                    <div className="text-2xl lg:text-xl 2xl:text-2xl text-[#3B82F6] font-light mx-2 lg:mx-2 2xl:mx-3">•</div>

                    <div className="text-center">
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide font-medium">
                            Duración
                        </div>
                        <div className="text-lg lg:text-lg 2xl:text-2xl font-bold text-[#10B981]">
                            {duracion || '0min'}
                        </div>
                    </div>

                    <div className="text-2xl lg:text-xl 2xl:text-2xl text-[#3B82F6] font-light mx-2 lg:mx-2 2xl:mx-3">•</div>

                    <div className="text-center">
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase mb-1 lg:mb-1 2xl:mb-2 tracking-wide font-medium">
                            Estado
                        </div>
                        <div className="text-base lg:text-base 2xl:text-lg font-bold text-white">
                            Abierto
                        </div>
                    </div>
                </div>
            </div>

            {/* Body Premium */}
            <div className="p-4 pt-4 lg:p-4 lg:pt-4 2xl:p-6 2xl:pt-6">
                {/* Métricas — 4 en 1 fila */}
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-2 2xl:gap-3 mb-4 lg:mb-4 2xl:mb-5">
                    {/* Transacciones */}
                    <div
                        className="rounded-lg p-2.5 lg:p-2.5 2xl:p-3 relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2.5px solid rgba(30, 64, 110, 0.7)',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
                        }}
                    >
                        <div
                            className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #3B82F6, transparent)' }}
                        />
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase tracking-wide font-medium text-center mt-0.5 mb-1">
                            Ventas
                        </div>
                        <div className="text-2xl lg:text-2xl 2xl:text-3xl font-bold text-white text-center">
                            {turno.transacciones}
                        </div>
                        <div className="text-sm lg:text-xs 2xl:text-sm text-[#94A3B8] font-medium text-center mt-0.5">
                            en turno
                        </div>
                    </div>

                    {/* Puntos */}
                    <div
                        className="rounded-lg p-2.5 lg:p-2.5 2xl:p-3 relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2.5px solid rgba(30, 64, 110, 0.7)',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
                        }}
                    >
                        <div
                            className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #F59E0B, transparent)' }}
                        />
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase tracking-wide font-medium text-center mt-0.5 mb-1">
                            Puntos
                        </div>
                        <div className="text-2xl lg:text-2xl 2xl:text-3xl font-bold text-white text-center">
                            {turno.puntosOtorgados}
                        </div>
                        <div className="text-sm lg:text-xs 2xl:text-sm text-[#94A3B8] font-medium text-center mt-0.5">
                            otorgados
                        </div>
                    </div>

                    {/* Ventas Totales $ */}
                    <div
                        className="rounded-lg p-2.5 lg:p-2.5 2xl:p-3 relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2.5px solid rgba(30, 64, 110, 0.7)',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
                        }}
                    >
                        <div
                            className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #10B981, transparent)' }}
                        />
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase tracking-wide font-medium text-center mt-0.5 mb-1">
                            Total $
                        </div>
                        <div className="text-2xl lg:text-2xl 2xl:text-3xl font-bold text-[#10B981] text-center">
                            ${turno.ventasTotales ? turno.ventasTotales.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                        </div>
                        <div className="text-sm lg:text-xs 2xl:text-sm text-[#94A3B8] font-medium text-center mt-0.5">
                            vendido
                        </div>
                    </div>

                    {/* Vouchers pendientes (solo laptop+) */}
                    <div
                        className="hidden lg:block rounded-lg p-2.5 lg:p-2.5 2xl:p-3 relative"
                        style={{
                            background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.7) 0%, rgba(10, 35, 70, 0.6) 100%)',
                            border: '2.5px solid rgba(30, 64, 110, 0.7)',
                            boxShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
                        }}
                    >
                        <div
                            className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #8B5CF6, transparent)' }}
                        />
                        <div className="text-xs lg:text-xs 2xl:text-sm text-[#94A3B8] uppercase tracking-wide font-medium text-center mt-0.5 mb-1">
                            Vouchers
                        </div>
                        <div className="text-2xl lg:text-2xl 2xl:text-3xl font-bold text-white text-center">
                            {vouchersPendientes}
                        </div>
                        <div className="text-sm lg:text-xs 2xl:text-sm text-[#94A3B8] font-medium text-center mt-0.5">
                            por canjear
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div
                    className="h-0.5 mb-4 lg:mb-4 2xl:mb-5"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
                    }}
                />

                {/* Botón Finalizar Turno (solo laptop+) */}
                <button
                    onClick={onCerrarTurno}
                    disabled={cargando}
                    className="
            hidden lg:flex
            w-full
            items-center justify-center gap-2 lg:gap-2 2xl:gap-3
            text-white font-bold
            py-3.5 lg:py-3.5 2xl:py-4
            rounded-xl
            transition-all duration-200
            text-base lg:text-base 2xl:text-lg
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            relative
            overflow-hidden
            group
          "
                    style={{
                        background: cargando
                            ? 'rgba(100, 116, 139, 0.3)'
                            : 'linear-gradient(135deg, #D97706, #B91C1C)',
                        border: 'none',
                        boxShadow: cargando ? 'none' : '0 4px 16px rgba(185, 28, 28, 0.35)',
                    }}
                    onMouseEnter={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 25px rgba(185, 28, 28, 0.45)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!cargando) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(185, 28, 28, 0.35)';
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
                        {cargando ? 'Cerrando turno...' : 'Cerrar Turno'}
                    </span>
                </button>
            </div>

            {/* Modal para expandir avatar */}
            {fotoUrl && (
                <ModalImagenes
                    images={[fotoUrl]}
                    isOpen={modalAvatarAbierto}
                    onClose={() => setModalAvatarAbierto(false)}
                />
            )}
        </div>
    );
}