/**
 * ModalDetalleCupon.tsx
 * =====================
 * Modal de detalle de cupón con revelación de código.
 * El código se revela con confirmación de contraseña.
 *
 * UBICACIÓN: apps/web/src/pages/private/cupones/componentes/ModalDetalleCupon.tsx
 */

import { useState } from 'react';
import {
    Ticket, Store, Lock, Eye, EyeOff, Copy, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Calendar = (p: IconoWrapperProps) => <Icon icon={ICONOS.fechas} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
const DollarSign = (p: IconoWrapperProps) => <Icon icon={ICONOS.dinero} {...p} />;
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { revelarCodigo } from '../../../../services/misCuponesService';
import type { CuponCliente } from '../../../../services/misCuponesService';
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';

// =============================================================================
// HELPERS
// =============================================================================

function getGradienteTipo(): { bg: string; shadow: string; handle: string } {
    return { bg: 'linear-gradient(135deg, #334155, #475569)', shadow: 'rgba(51,65,85,0.4)', handle: 'rgba(255,255,255,0.4)' };
}

function formatearBadgeDescuento(tipo: string, valor: string | null): string {
    switch (tipo) {
        case 'porcentaje': return `${valor}% desc.`;
        case 'monto_fijo': return `$${valor} desc.`;
        case '2x1': return '2×1';
        case '3x2': return '3×2';
        case 'envio_gratis': return 'Envío Gratis';
        default: return valor || 'Promo';
    }
}

function getBadgeEstado(estado: string): { label: string; clases: string; icono: React.ComponentType<{ className?: string }> } {
    switch (estado) {
        case 'activo': return { label: 'Activo', clases: 'bg-emerald-600 text-white', icono: CheckCircle };
        case 'usado': return { label: 'Usado', clases: 'bg-slate-200 text-slate-700', icono: CheckCircle };
        case 'expirado': return { label: 'Expirado', clases: 'bg-amber-100 text-amber-700', icono: Clock };
        case 'revocado': return { label: 'Revocado', clases: 'bg-red-100 text-red-700', icono: XCircle };
        default: return { label: estado, clases: 'bg-slate-200 text-slate-700', icono: AlertTriangle };
    }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalDetalleCupon({
    abierto,
    onCerrar,
    cupon,
}: {
    abierto: boolean;
    onCerrar: () => void;
    cupon: CuponCliente | null;
}) {
    const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
    const abrirChatYA = useUiStore((s) => s.abrirChatYA);
    const [codigoVisible, setCodigoVisible] = useState(false);
    const [codigoRevelado, setCodigoRevelado] = useState<string | null>(null);
    const [cargandoCodigo, setCargandoCodigo] = useState(false);
    const [contrasena, setContrasena] = useState('');
    const [errorContrasena, setErrorContrasena] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);

    if (!abierto || !cupon) return null;

    const gradiente = getGradienteTipo();
    const badge = getBadgeEstado(cupon.estado);
    const BadgeIcono = badge.icono;
    const esActivo = cupon.estado === 'activo';

    const handleRevelarCodigo = async () => {
        if (!contrasena.trim()) {
            setErrorContrasena('Ingresa tu contraseña');
            return;
        }
        setErrorContrasena('');
        setCargandoCodigo(true);
        try {
            const res = await revelarCodigo(cupon.cuponId, contrasena);
            if (res.success && res.data) {
                setCodigoRevelado(res.data.codigo);
                setCodigoVisible(true);
                setContrasena('');
            } else {
                setErrorContrasena(res.message || 'Contraseña incorrecta');
            }
        } catch {
            setErrorContrasena('Error al verificar');
        } finally {
            setCargandoCodigo(false);
        }
    };

    const handleCopiarCodigo = () => {
        if (codigoRevelado) {
            navigator.clipboard.writeText(codigoRevelado);
            notificar.exito('Código copiado');
        }
    };

    const handleCerrar = () => {
        setCodigoVisible(false);
        setCodigoRevelado(null);
        setContrasena('');
        setErrorContrasena('');
        setMostrarContrasena(false);
        onCerrar();
    };

    const handleContactarNegocio = () => {
        if (!cupon.negocioUsuarioId) return;

        const datos = {
            id: cupon.negocioUsuarioId,
            nombre: cupon.negocioNombre,
            logo: cupon.negocioLogo,
            sucursalId: cupon.sucursalId,
            sucursalNombre: cupon.sucursalNombre,
        };

        if (history.state?._modalBottom) {
            const estado = { ...history.state };
            delete estado._modalBottom;
            history.replaceState(estado, '');
        }

        handleCerrar();
        setTimeout(() => {
            // Defensa contra duplicación en header del chat: si la sucursal
            // se llama igual que el negocio (caso típico de la sucursal
            // principal en negocios de 1 sola sucursal), no la propagamos.
            // El backend `obtenerMisCupones` no normaliza a "Matriz" como sí
            // lo hacen otros endpoints (chatya `buscarNegocios`, `listarContactos`,
            // `obtenerDatosParticipante`). Patrón coherente con línea 213
            // del mismo componente que ya hace este check al renderizar.
            const sucursalParaHeader =
                datos.sucursalNombre && datos.sucursalNombre !== datos.nombre
                    ? datos.sucursalNombre
                    : undefined;
            abrirChatTemporal({
                id: `temp_${Date.now()}`,
                otroParticipante: {
                    id: datos.id,
                    nombre: datos.nombre,
                    apellidos: '',
                    avatarUrl: datos.logo,
                    negocioNombre: datos.nombre,
                    negocioLogo: datos.logo || undefined,
                    sucursalNombre: sucursalParaHeader,
                },
                datosCreacion: {
                    participante2Id: datos.id,
                    participante2Modo: 'comercial',
                    participante2SucursalId: datos.sucursalId || undefined,
                    contextoTipo: 'negocio',
                },
            });
            abrirChatYA();
        }, 300);
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={handleCerrar}
            ancho="md"
            paddingContenido="none"
            mostrarHeader={false}
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle={gradiente.handle}
            headerOscuro
            className="max-w-xs lg:max-w-md 2xl:max-w-lg"
        >
            <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

                {/* Header — gradiente + título + badge estado */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{formatearBadgeDescuento(cupon.tipo, cupon.valor)}</h3>
                            <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-white/70 truncate">{cupon.titulo}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg ${badge.clases} flex items-center gap-1`}>
                            <BadgeIcono className="w-3.5 h-3.5" />
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold">{badge.label}</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">

                    {/* Sección negocio — logo + nombre + ChatYA */}
                    <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        {cupon.negocioLogo ? (
                            <img src={cupon.negocioLogo} alt={cupon.negocioNombre} decoding="sync" className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl object-cover border-2 border-slate-300" />
                        ) : (
                            <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <Store className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-emerald-600" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 truncate">{cupon.negocioNombre}</p>
                            {cupon.sucursalNombre && cupon.sucursalNombre !== cupon.negocioNombre && <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">{cupon.sucursalNombre}</p>}
                        </div>
                        {cupon.negocioUsuarioId && (
                            <Tooltip text="ChatYA" position="bottom" className="max-lg:hidden">
                                <button
                                    data-testid="btn-chatya-negocio"
                                    onClick={handleContactarNegocio}
                                    className="shrink-0 cursor-pointer"
                                >
                                    <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-8 h-9 lg:w-7 lg:h-8 2xl:w-8 2xl:h-9" />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Sección info — lista con divisores */}
                    <div className="rounded-xl border-2 border-slate-300 divide-y divide-slate-300">
                        {/* Fecha expiración */}
                        {cupon.fechaFin && (
                            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5">
                                <Calendar className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-600 shrink-0" />
                                <div>
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">Vencimiento:</span>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                                        {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Compra mínima */}
                        {cupon.compraMinima && parseFloat(cupon.compraMinima) > 0 && (
                            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5">
                                <DollarSign className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-600 shrink-0" />
                                <div>
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">Compra mínima:</span>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">${cupon.compraMinima}</p>
                                </div>
                            </div>
                        )}

                        {/* Motivo */}
                        {cupon.motivo && (
                            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5">
                                <Gift className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-600 shrink-0" />
                                <div>
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">Motivo:</span>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">{cupon.motivo}</p>
                                </div>
                            </div>
                        )}

                        {/* Condiciones de uso */}
                        {cupon.descripcion && (
                            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5">
                                <AlertTriangle className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-600 shrink-0" />
                                <div>
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">Condiciones:</span>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">{cupon.descripcion}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Revocación */}
                    {cupon.estado === 'revocado' && (
                        <div className="p-2.5 lg:p-2 2xl:p-2.5 bg-red-100 rounded-lg border-2 border-red-300">
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-red-700">Cupón revocado</p>
                            {cupon.motivoRevocacion && <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-700 font-medium mt-0.5">{cupon.motivoRevocacion}</p>}
                            {cupon.revocadoAt && <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium mt-1">{new Date(cupon.revocadoAt).toLocaleDateString('es-MX')}</p>}
                        </div>
                    )}

                    {/* Sección código — compacta */}
                    {esActivo && (
                        <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-200 rounded-xl">
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800 mb-2 lg:mb-1.5 2xl:mb-2">Código de Cupón</p>

                            {codigoVisible && codigoRevelado ? (
                                <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
                                    <div className="flex items-center justify-between p-2.5 lg:p-2 2xl:p-2.5 bg-white rounded-lg border-2 border-emerald-300">
                                        <span className="text-xl lg:text-lg 2xl:text-xl font-mono font-black text-slate-800 tracking-widest">
                                            {codigoRevelado}
                                        </span>
                                        <button
                                            data-testid="btn-copiar-codigo"
                                            onClick={handleCopiarCodigo}
                                            className="p-2 lg:p-1.5 2xl:p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 cursor-pointer"
                                        >
                                            <Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        </button>
                                    </div>
                                    <button
                                        data-testid="btn-ocultar-codigo"
                                        onClick={() => setCodigoVisible(false)}
                                        className="flex items-center gap-1.5 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 cursor-pointer"
                                    >
                                        <EyeOff className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        Ocultar código
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); handleRevelarCodigo(); }} className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
                                    <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
                                    <div className="relative">
                                        <Lock className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" />
                                        <input
                                            id="input-contrasena-revelar"
                                            name="contrasenaRevelar"
                                            data-testid="input-contrasena-revelar"
                                            type={mostrarContrasena ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={contrasena}
                                            onChange={(e) => { setContrasena(e.target.value); setErrorContrasena(''); }}
                                            placeholder="Tu contraseña de AnunciaYA"
                                            className={`w-full h-10 lg:h-9 2xl:h-10 pl-9 lg:pl-8 2xl:pl-9 pr-10 lg:pr-9 2xl:pr-10 bg-white border-2 ${errorContrasena ? 'border-red-400' : 'border-slate-300'} rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500`}
                                        />
                                        <button
                                            type="button"
                                            data-testid="btn-toggle-contrasena"
                                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                            className="absolute right-2.5 lg:right-2 2xl:right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-600 cursor-pointer"
                                        >
                                            {mostrarContrasena ? (
                                                <EyeOff className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                            )}
                                        </button>
                                    </div>
                                    {errorContrasena && (
                                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium">{errorContrasena}</p>
                                    )}
                                    <button
                                        data-testid="btn-revelar-codigo"
                                        type="submit"
                                        disabled={cargandoCodigo || !contrasena.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm cursor-pointer disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}
                                    >
                                        {cargandoCodigo ? (
                                            <Spinner tamanio="sm" color="white" />
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                                Revelar código
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </ModalAdaptativo>
    );
}
