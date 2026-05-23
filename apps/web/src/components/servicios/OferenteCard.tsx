/**
 * OferenteCard.tsx
 * =================
 * Bloque del oferente en el detalle del servicio. Distingue visualmente
 * entre persona física (servicio-persona / solicito) y negocio
 * (vacante-empresa).
 *
 * Patrón visual igualado al `CardVendedor.tsx` del MarketPlace (Sprint
 * 9.3 iteración):
 *   - Avatar h-12 (más grande que antes h-9).
 *   - Nombre dividido en 2 líneas para PERSONAS (nombres arriba,
 *     apellidos + BadgeCheck invertido en la 2ª línea).
 *   - BadgeCheck h-6 invertido (fondo azul + palomita blanca, estilo
 *     Twitter/X) — para PERSONAS solo cuando esta verificación se
 *     introduzca (por ahora se muestra siempre como contrato visual,
 *     se ajustará cuando el backend traiga `verificado`).
 *   - Ciudad debajo del nombre (siempre, antes solo aparecía la
 *     sucursal para empresas).
 *   - Trust badge "Suele responder rápido" como pill emerald
 *     destacado.
 *   - Actividad ("Activa hace X") como texto inline con dot sutil
 *     (no pill gris) + link "Ver perfil/negocio" al lado derecho del
 *     mismo renglón.
 *
 * Para vacantes: el card mantiene avatar cuadrado (rounded-xl) con
 * borde sky para diferenciar marca corporativa de persona física.
 *
 * Ubicación: apps/web/src/components/servicios/OferenteCard.tsx
 */

import { ChevronRight, BadgeCheck, Zap } from 'lucide-react';
import type { PublicacionDetalle } from '../../types/servicios';
import { formatearUltimaConexion } from '../../utils/servicios';

interface OferenteCardProps {
    publicacion: PublicacionDetalle;
    onClick?: () => void;
}

export function OferenteCard({ publicacion, onClick }: OferenteCardProps) {
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';

    // ── Identidad mostrada ──────────────────────────────────────────────
    // - Empresa: nombre del negocio (1 línea). Avatar = logo del
    //   negocio con fallback a la foto de perfil de la sucursal.
    // - Persona: nombre (línea 1) + apellidos (línea 2). Avatar =
    //   avatar del usuario.
    const nombreEmpresa = esEmpresa
        ? oferente.negocioNombre ?? `${oferente.nombre} ${oferente.apellidos}`.trim()
        : '';

    const sufijoSucursal = esEmpresa && (oferente.totalSucursales ?? 0) > 1
        ? oferente.sucursalEsPrincipal
            ? 'Matriz'
            : oferente.sucursalNombre
        : null;

    const avatarUrl = esEmpresa
        ? oferente.negocioLogo
            ?? oferente.sucursalFotoPerfil
            ?? oferente.avatarUrl
        : oferente.avatarUrl;

    const iniciales = esEmpresa
        ? obtenerInicialesDeNombre(nombreEmpresa)
        : obtenerIniciales(oferente.nombre, oferente.apellidos);

    // Trust badges (igual que CardVendedor MP).
    const conexionLabel = formatearUltimaConexion(oferente.ultimaConexion);
    const respondeRapido =
        oferente.tiempoRespuestaMinutos !== null
        && oferente.tiempoRespuestaMinutos !== undefined
        && oferente.tiempoRespuestaMinutos < 60;

    // CTA label según tipo
    const ctaLabel = esEmpresa ? 'Ver negocio' : 'Ver perfil';
    const nombreCompletoAria = esEmpresa
        ? nombreEmpresa
        : `${oferente.nombre} ${oferente.apellidos}`.trim();

    return (
        // Card NO clickeable. Solo el link "Ver perfil/negocio" navega.
        // Mismo patrón que `CardVendedor.tsx` del MP.
        <div
            data-testid="oferente-card"
            className="flex w-full flex-col gap-2 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md"
        >
            {/* Línea 1: avatar + identidad (nombre + ciudad) */}
            <div className="flex items-center gap-2">
                {/* Avatar — circular para personas, cuadrado para empresas */}
                {esEmpresa ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white shadow-md ring-2 ring-sky-100">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombreEmpresa}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-base font-extrabold text-sky-700">
                                {iniciales}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombreCompletoAria}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="flex h-full w-full items-center justify-center text-base font-bold text-white"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #38bdf8 0%, #0284c7 50%, #0369a1 100%)',
                                }}
                            >
                                {iniciales}
                            </div>
                        )}
                    </div>
                )}

                {/* Identidad. Para PERSONAS: nombre en 2 líneas (nombres
                    arriba, apellidos + BadgeCheck invertido abajo). Para
                    EMPRESAS: nombre en 1 línea con BadgeCheck inline al
                    final. BadgeCheck con fondo azul + palomita blanca
                    (estilo Twitter/X). */}
                <div className="min-w-0 flex-1">
                    {esEmpresa ? (
                        <h3 className="flex items-center gap-1 text-sm font-bold text-slate-900 leading-tight lg:text-base">
                            <span className="truncate">{nombreEmpresa}</span>
                            <BadgeCheck
                                className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                strokeWidth={2.5}
                                aria-label="Empresa verificada"
                            />
                        </h3>
                    ) : (
                        <h3 className="text-sm font-bold text-slate-900 leading-tight lg:text-base">
                            <span className="block">{oferente.nombre}</span>
                            <span className="flex items-center gap-1">
                                {oferente.apellidos}
                                <BadgeCheck
                                    className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                    strokeWidth={2.5}
                                    aria-label="Usuario verificado"
                                />
                            </span>
                        </h3>
                    )}
                    {/* Subtítulo solo para empresas con sucursal extra
                        (Matriz / nombre de la sucursal). Personas no
                        muestran ciudad — info se queda solo en el
                        avatar/badge de actividad. */}
                    {esEmpresa && sufijoSucursal && (
                        <div className="mt-0.5 truncate text-sm font-medium text-slate-600">
                            {sufijoSucursal}
                        </div>
                    )}
                </div>
            </div>

            {/* Trust badge "Suele responder rápido" — pill emerald
                destacado (indicador de valor para el usuario). */}
            {respondeRapido && (
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700 lg:text-xs 2xl:text-sm">
                        <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Suele responder rápido
                    </span>
                </div>
            )}

            {/* Fila inferior: actividad (izquierda) + Ver perfil/negocio
                (derecha). Mismo patrón que `CardVendedor.tsx` del MP. */}
            <div className="flex items-center gap-2">
                {conexionLabel && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full bg-slate-400"
                        />
                        {conexionLabel}
                    </div>
                )}
                <button
                    type="button"
                    data-testid="btn-ver-perfil-oferente"
                    onClick={onClick}
                    aria-label={`${ctaLabel} de ${nombreCompletoAria}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-sky-700 lg:cursor-pointer lg:hover:text-sky-900 lg:hover:underline"
                >
                    {ctaLabel}
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre ?? '').trim().charAt(0).toUpperCase();
    const b = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${a}${b}` || '··';
}

function obtenerInicialesDeNombre(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    const a = partes[0]?.charAt(0).toUpperCase() ?? '';
    const b = partes[1]?.charAt(0).toUpperCase() ?? '';
    return `${a}${b}` || '··';
}

export default OferenteCard;
