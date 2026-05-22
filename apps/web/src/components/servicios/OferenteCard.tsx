/**
 * OferenteCard.tsx
 * =================
 * Bloque del oferente en el detalle del servicio. Distingue visualmente
 * entre persona física (servicio-persona / solicito) y negocio
 * (vacante-empresa).
 *
 * Patrón visual replicado de `CardVendedor.tsx` (MarketPlace) para
 * mantener coherencia cross-sección. Sprint 9.3 (iteración):
 *   - Card con `border-2 border-slate-300 + shadow-md` (antes era
 *     `bg-slate-50` plano).
 *   - Avatar 9x9 con ring slate-200 (mismo que vendedor).
 *   - Nombre con `BadgeCheck` sky azul (en MP es blue-600; Servicios
 *     usa la familia sky por convención de marca).
 *   - CTA "Ver perfil / Ver negocio" en sky-700 (NO teal — teal es
 *     identidad cromática de MarketPlace).
 *   - Trust badges (responde rápido + última conexión) como pills
 *     coloreados al final, igual que CardVendedor.
 *
 * Para vacantes: el card mantiene avatar cuadrado (rounded-xl) con
 * borde sky para diferenciar marca corporativa de persona física.
 *
 * Ubicación: apps/web/src/components/servicios/OferenteCard.tsx
 */

import { ChevronRight, BadgeCheck, Zap } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import type { PublicacionDetalle } from '../../types/servicios';
import { formatearUltimaConexion } from '../../utils/servicios';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;

interface OferenteCardProps {
    publicacion: PublicacionDetalle;
    onClick?: () => void;
}

export function OferenteCard({ publicacion, onClick }: OferenteCardProps) {
    const { oferente, tipo } = publicacion;
    const esEmpresa = tipo === 'vacante-empresa';

    // ── Identidad mostrada ──────────────────────────────────────────────
    // - Empresa: nombre del negocio + (si aplica) sufijo de sucursal con
    //   divisor vertical. Avatar = logo del negocio con fallback a la foto
    //   de perfil de la sucursal.
    // - Persona: nombre + apellidos del usuario. Avatar = avatar del usuario.
    const nombrePrincipal = esEmpresa
        ? oferente.negocioNombre
            ?? `${oferente.nombre} ${oferente.apellidos}`.trim()
        : `${oferente.nombre} ${oferente.apellidos}`.trim();

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
        ? obtenerInicialesDeNombre(nombrePrincipal)
        : obtenerIniciales(oferente.nombre, oferente.apellidos);

    // Trust badges (igual que CardVendedor MP).
    const conexionLabel = formatearUltimaConexion(oferente.ultimaConexion);
    const respondeRapido =
        oferente.tiempoRespuestaMinutos !== null
        && oferente.tiempoRespuestaMinutos !== undefined
        && oferente.tiempoRespuestaMinutos < 60;

    // CTA label según tipo
    const ctaLabel = esEmpresa ? 'Ver negocio' : 'Ver perfil';

    return (
        // Card NO clickeable. Solo el botón CTA navega al perfil — permite
        // al usuario seleccionar texto, copiar el nombre, etc., sin
        // gatillar navegación accidental (mismo patrón que CardVendedor MP).
        <div
            data-testid="oferente-card"
            className="flex w-full flex-col gap-1.5 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md lg:gap-2"
        >
            {/* Línea 1: avatar + nombre + verification + CTA */}
            <div className="flex items-center gap-2">
                {/* Avatar — circular para personas, cuadrado para empresas */}
                {esEmpresa ? (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white shadow-md ring-2 ring-sky-100">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombrePrincipal}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center text-sm font-extrabold text-sky-700">
                                {iniciales}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={nombrePrincipal}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div
                                className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
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

                {/* Identidad */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                        <span className="truncate text-sm font-bold text-slate-900 lg:text-base">
                            {nombrePrincipal}
                        </span>
                        {/* BadgeCheck sky para empresas verificadas — para
                            personas físicas se omite porque AnunciaYA no
                            tiene verificación de identidad personal aún. */}
                        {esEmpresa && (
                            <BadgeCheck
                                className="h-4 w-4 shrink-0 text-sky-600"
                                strokeWidth={2.5}
                                aria-label="Empresa verificada"
                            />
                        )}
                    </div>
                    {/* Subtítulo: sucursal (empresas) o ciudad (personas) */}
                    <div className="truncate text-sm font-medium text-slate-600">
                        {esEmpresa
                            ? sufijoSucursal ?? oferente.ciudad ?? 'Puerto Peñasco'
                            : oferente.ciudad ?? 'Puerto Peñasco'}
                    </div>
                </div>

                {/* CTA — único elemento clickeable de la card. Color sky
                    (NO teal de MP) por convención cromática de Servicios. */}
                <button
                    type="button"
                    data-testid="btn-ver-perfil-oferente"
                    onClick={onClick}
                    aria-label={`${ctaLabel} de ${nombrePrincipal}`}
                    className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md text-sm font-bold text-sky-700 lg:hover:text-sky-900 lg:hover:underline"
                >
                    {ctaLabel}
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {/* Trust badges — pills coloreados solo si hay info útil.
                Mismo patrón visual que CardVendedor MP. */}
            {(respondeRapido || conexionLabel) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {respondeRapido && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700 lg:text-xs 2xl:text-sm">
                            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Suele responder rápido
                        </span>
                    )}
                    {conexionLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700 lg:text-xs 2xl:text-sm">
                            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {conexionLabel}
                        </span>
                    )}
                </div>
            )}
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
