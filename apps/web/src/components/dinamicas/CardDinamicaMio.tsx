/**
 * CardDinamicaMio.tsx
 * ====================
 * Card del organizador en "Mis Publicaciones" (tab Dinámicas) — calca el
 * cuerpo visual de `CardDinamicaCompacta.tsx` (misma imagen/título/precio/
 * vendidos/countdown) y le agrega el menú "⋯" de acciones, igual patrón que
 * `CardArticuloMio.tsx` usa para MarketPlace.
 *
 * Acciones disponibles según estado (no hay "Eliminar" — una Dinámica no se
 * borra, solo se pospone o cancela; backend no tiene endpoint DELETE para
 * esto). "Editar" sí existe pero es limitado: solo título, descripción y
 * fotos del premio — boletos/precio/reglas/fecha quedan bloqueados una vez
 * publicada (ver `editarBorrador` en dinamicas.service.ts):
 *   - activa/pospuesta → Editar · Agregar Participante · Posponer · Cancelar
 *   - en_sorteo/cerrada/cancelada → sin acciones (estado terminal o en
 *     curso), el botón "⋯" ni se muestra — la card solo navega al detalle.
 *
 * Ubicación: apps/web/src/components/dinamicas/CardDinamicaMio.tsx
 */

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ImageOff, MoreVertical, Pencil, Ticket, Users, CalendarClock, Ban, UserPlus, type LucideIcon } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { DinamicaFeedItem } from '../../types/dinamicas';

interface CardDinamicaMioProps {
    dinamica: DinamicaFeedItem;
    onEditar: (dinamica: DinamicaFeedItem) => void;
    onAgregarManual: (dinamica: DinamicaFeedItem) => void;
    onPosponer: (dinamica: DinamicaFeedItem) => void;
    onCancelar: (dinamica: DinamicaFeedItem) => void;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
    activa: { texto: 'Activa', clase: 'bg-emerald-500 text-white' },
    pospuesta: { texto: 'Pospuesta', clase: 'bg-amber-500 text-white' },
    en_sorteo: { texto: 'En sorteo', clase: 'bg-violet-500 text-white' },
    cerrada: { texto: 'Cerrada', clase: 'bg-slate-600 text-white' },
    cancelada: { texto: 'Cancelada', clase: 'bg-rose-500 text-white' },
};

function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const restante = new Date(fechaLimite).getTime() - Date.now();
    // "Vencida" (no "Cerrada") a propósito — ese texto choca con el `estado`
    // real de la Dinámica ("cerrada" es un valor del enum). Este chip solo
    // refleja que la fecha límite de inscripción ya pasó, no que el
    // organizador ya cerró/sorteó — hoy no hay cron que transicione el
    // `estado` automáticamente al vencer (eso es Fase 4).
    if (restante <= 0) return 'Vencida';
    const dias = Math.floor(restante / (24 * 60 * 60 * 1000));
    if (dias >= 1) return `${dias}d`;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= 1) return `${horas}h`;
    const min = Math.floor(restante / (60 * 1000));
    return `${min}min`;
}

export function CardDinamicaMio({ dinamica, onEditar, onAgregarManual, onPosponer, onCancelar }: CardDinamicaMioProps) {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al click afuera — mismo patrón que `CardArticuloMio`.
    useEffect(() => {
        if (!menuAbierto) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest(`[data-menu-toggle-dinamica="${dinamica.id}"]`)) return;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuAbierto, dinamica.id]);

    const portada = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaUrl = portada?.tipo === 'video' ? portada.posterUrl : portada?.url;

    const totalBoletos = dinamica.numeroTotalBoletos ?? 0;
    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const estado = ETIQUETA_ESTADO[dinamica.estado] ?? ETIQUETA_ESTADO.activa;
    const tieneAcciones = dinamica.estado === 'activa' || dinamica.estado === 'pospuesta';

    const handleClickCard = () => navigate(`/marketplace/dinamica/${dinamica.id}`);

    const handleMenuToggle = (e: ReactMouseEvent) => {
        e.stopPropagation();
        setMenuAbierto((v) => !v);
    };

    const handleAccion = (e: ReactMouseEvent, accion: () => void) => {
        e.stopPropagation();
        setMenuAbierto(false);
        accion();
    };

    return (
        <article
            data-testid={`card-dinamica-mio-${dinamica.id}`}
            onClick={handleClickCard}
            className="group relative min-w-0 cursor-pointer flex flex-col rounded-xl border-2 border-slate-300 bg-white shadow-md transition-all duration-200 lg:hover:-translate-y-0.5 lg:hover:border-amber-400 lg:hover:shadow-lg"
        >
            <div className="relative w-full aspect-3/2 overflow-hidden rounded-t-xl bg-slate-200">
                {portadaUrl ? (
                    <img
                        src={portadaUrl}
                        alt={dinamica.titulo}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                )}
                <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md shadow-black/20 ${estado.clase}`}>
                    {estado.texto}
                </span>

                {tieneAcciones && (
                    <button
                        data-testid={`btn-menu-dinamica-mio-${dinamica.id}`}
                        data-menu-toggle-dinamica={dinamica.id}
                        onClick={handleMenuToggle}
                        aria-label="Acciones de la Dinámica"
                        aria-expanded={menuAbierto}
                        className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur-sm lg:h-10 lg:w-10"
                    >
                        <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                )}
            </div>

            <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
                <div className="truncate text-base font-bold leading-snug text-slate-900">
                    {dinamica.titulo}
                </div>

                {dinamica.precioBoleto && (
                    <div className="text-lg font-bold leading-tight text-amber-700">
                        ${Number(dinamica.precioBoleto).toLocaleString('es-MX')}
                        <span className="ml-1 text-sm font-medium text-amber-700/80">por boleto</span>
                    </div>
                )}

                <p className="text-sm font-medium text-slate-600">
                    Organizada {formatearTiempoRelativo(dinamica.createdAt)}
                </p>

                {/* KPIs como mini-chips — mismo patrón que `CardArticuloMio` de
                    MarketPlace. Dinámicas no trackea vistas/mensajes/guardados
                    (no existen esas columnas en la tabla), así que usamos los
                    3 datos reales que sí tenemos. */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <KpiChip
                        icono={Ticket}
                        valor={`${dinamica.boletosPagados}${totalBoletos > 0 ? `/${totalBoletos}` : ''}`}
                        label="Boletos vendidos"
                        acento="amber"
                    />
                    {dinamica.boletosDisponibles !== null && (
                        <KpiChip
                            icono={Users}
                            valor={dinamica.boletosDisponibles}
                            label="Boletos disponibles"
                        />
                    )}
                    {cuentaRegresiva && (
                        <KpiChip
                            icono={Clock}
                            valor={cuentaRegresiva}
                            label="Tiempo para cerrar"
                        />
                    )}
                </div>
            </div>

            {menuAbierto && (
                <div
                    ref={menuRef}
                    className="absolute right-2 top-12 z-20 w-44 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 lg:right-3 lg:top-14 lg:w-48 2xl:w-56"
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                >
                    <BotonMenu
                        testId={`menu-editar-dinamica-${dinamica.id}`}
                        icono={Pencil}
                        iconColor="text-amber-600"
                        onClick={(e) => handleAccion(e, () => onEditar(dinamica))}
                    >
                        Editar
                    </BotonMenu>
                    <BotonMenu
                        testId={`menu-agregar-participante-${dinamica.id}`}
                        icono={UserPlus}
                        iconColor="text-blue-600"
                        onClick={(e) => handleAccion(e, () => onAgregarManual(dinamica))}
                    >
                        Agregar Part.
                    </BotonMenu>
                    <BotonMenu
                        testId={`menu-posponer-${dinamica.id}`}
                        icono={CalendarClock}
                        iconColor="text-amber-600"
                        onClick={(e) => handleAccion(e, () => onPosponer(dinamica))}
                    >
                        Posponer
                    </BotonMenu>
                    <BotonMenu
                        testId={`menu-cancelar-${dinamica.id}`}
                        icono={Ban}
                        iconColor="text-red-600"
                        textColor="text-red-600"
                        hoverClass="lg:hover:bg-red-100"
                        onClick={(e) => handleAccion(e, () => onCancelar(dinamica))}
                    >
                        Cancelar
                    </BotonMenu>
                </div>
            )}
        </article>
    );
}

interface KpiChipProps {
    icono: LucideIcon;
    valor: number | string;
    label: string;
    acento?: 'amber';
}

/** Mini-chip de KPI — calca `KpiChip` de `CardArticuloMio.tsx` (MarketPlace)
 *  para que ambas cards del panel "Mis Publicaciones" tengan la misma
 *  densidad visual. */
function KpiChip({ icono: IconoChip, valor, label, acento }: KpiChipProps) {
    const bgClasses = acento === 'amber' ? 'bg-amber-100' : 'bg-slate-200';
    const textClasses = acento === 'amber' ? 'text-amber-700' : 'text-slate-700';
    const iconClasses = acento === 'amber' ? 'text-amber-600' : 'text-slate-600';
    return (
        <Tooltip text={label} position="top">
            <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full ${bgClasses} px-2 py-1 text-sm font-semibold ${textClasses} lg:px-2.5`}
            >
                <IconoChip className={`h-3.5 w-3.5 ${iconClasses} lg:h-4 lg:w-4`} strokeWidth={2.5} />
                {valor}
            </span>
        </Tooltip>
    );
}

interface BotonMenuProps {
    testId: string;
    icono: LucideIcon;
    iconColor?: string;
    textColor?: string;
    hoverClass?: string;
    onClick: (e: ReactMouseEvent) => void;
    children: React.ReactNode;
}

function BotonMenu({
    testId,
    icono: Icono,
    iconColor = 'text-slate-600',
    textColor = 'text-slate-700',
    hoverClass = 'lg:hover:bg-slate-200',
    onClick,
    children,
}: BotonMenuProps) {
    return (
        <button
            data-testid={testId}
            onClick={onClick}
            role="menuitem"
            className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm font-semibold whitespace-nowrap lg:gap-2.5 lg:px-3 lg:py-1.5 2xl:gap-3 2xl:px-3.5 2xl:py-2.5 ${textColor} ${hoverClass}`}
        >
            <Icono className={`h-4 w-4 shrink-0 2xl:h-5 2xl:w-5 ${iconColor}`} strokeWidth={2.5} />
            {children}
        </button>
    );
}

export default CardDinamicaMio;
