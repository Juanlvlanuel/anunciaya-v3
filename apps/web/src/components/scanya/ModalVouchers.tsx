/**
 * ModalVouchers.tsx
 * ==================
 * Modal unificado para gestión completa de vouchers.
 * 
 * Estructura:
 * ┌─────────────────────────────┐
 * │ Header                       │
 * ├─────────────────────────────┤
 * │ [▼] Buscar cliente          │ ← Colapsable
 * │   [+52] [6441234567] [🔍]  │
 * ├─────────────────────────────┤
 * │ [Sucursal ▼] [Operador ▼]   │ ← Filtros (dueño/gerente)
 * ├─────────────────────────────┤
 * │ [Pendientes] [Usados] [...] │ ← Tabs (ocultos si hay búsqueda)
 * ├─────────────────────────────┤
 * │ Lista de vouchers           │
 * └─────────────────────────────┘
 * 
 * Flujos:
 * 1. Búsqueda: Usuario busca → filtra vouchers de ese cliente
 * 2. Gestión: Usuario navega tabs → ve todos los vouchers
 * 
 * Ubicación: apps/web/src/components/scanya/ModalVouchers.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X,
    ArrowLeft,
    Search,
    User,
    Gift,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Clock,
    XCircle,
    Ban,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Check,
} from 'lucide-react';
import scanyaService from '@/services/scanyaService';
import { useScanYAStore } from '@/stores/useScanYAStore';
import { useChatYAStore } from '@/stores/useChatYAStore';
import { useUiStore } from '@/stores/useUiStore';
import { TarjetaVoucher } from './TarjetaVoucher';
import type { VoucherCompleto, ClienteConVouchers } from '@/types/scanya';
import { Phone, MapPin, Coins, Calendar } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalVouchersProps {
    abierto: boolean;
    onClose: () => void;
    onCanjearVoucher: (voucherId: string, clienteId: string, clienteNombre: string, recompensaNombre: string) => void;
    cambiosVouchers?: number;
    canjearAbierto?: boolean;
}

type EstadoVoucher = 'pendiente' | 'usado' | 'expirado' | 'cancelado';

interface TabConfig {
    id: EstadoVoucher;
    label: string;
    icono: typeof Gift;
    color: string;
    bgColor: string;
    borderColor: string;
}

interface SucursalLista {
    id: string;
    nombre: string;
}

interface OperadorLista {
    id: string;
    nombre: string;
    tipo: 'empleado' | 'gerente' | 'dueno';
    sucursalId: string | null;
    sucursalNombre: string | null;
}

// =============================================================================
// CONFIGURACIÓN DE PESTAÑAS
// =============================================================================

const TABS: TabConfig[] = [
    {
        id: 'pendiente',
        label: 'Pendientes',
        icono: Clock,
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    {
        id: 'usado',
        label: 'Usados',
        icono: CheckCircle,
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    {
        id: 'expirado',
        label: 'Expirados',
        icono: XCircle,
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    {
        id: 'cancelado',
        label: 'Cancelados',
        icono: Ban,
        color: '#64748B',
        bgColor: 'rgba(100, 116, 139, 0.15)',
        borderColor: 'rgba(100, 116, 139, 0.3)',
    },
];

// =============================================================================
// HELPERS
// =============================================================================

const formatearTelefono = (telefono: string): string => {
    if (telefono.startsWith('+52') && telefono.length === 13) {
        return `+52 ${telefono.slice(3, 6)} ${telefono.slice(6, 9)} ${telefono.slice(9)}`;
    }
    return telefono;
};

// =============================================================================
// COMPONENTE: DROPDOWN PERSONALIZADO
// =============================================================================

interface DropdownOption {
    id: string;
    label: string;
}

interface CustomDropdownProps {
    options: DropdownOption[];
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    placeholder: string;
    disabled?: boolean;
}

function CustomDropdown({ options, value, onChange, placeholder, disabled }: CustomDropdownProps) {
    const [abierto, setAbierto] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setAbierto(false);
            }
        };

        if (abierto) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [abierto]);

    const selectedOption = options.find(opt => opt.id === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    return (
        <div ref={dropdownRef} className="relative flex-1">
            {/* Botón del dropdown */}
            <button
                type="button"
                onClick={() => !disabled && setAbierto(!abierto)}
                disabled={disabled}
                className="
                    w-full flex items-center justify-between
                    py-2 px-3
                    rounded-lg lg:rounded-md 2xl:rounded-lg
                    text-sm lg:text-xs 2xl:text-sm
                    cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
                    transition-all
                "
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: abierto
                        ? '1px solid rgba(59, 130, 246, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    color: value ? '#3B82F6' : '#94A3B8',
                }}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDown
                    className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8] shrink-0 ml-2 transition-transform ${abierto ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Lista de opciones */}
            {abierto && (
                <div
                    className="
                        absolute z-50 w-full mt-1
                        rounded-lg lg:rounded-md 2xl:rounded-lg
                        overflow-hidden
                        shadow-xl
                    "
                    style={{
                        background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                    }}
                >
                    {/* Opción "Todos" */}
                    <button
                        type="button"
                        onClick={() => {
                            onChange(undefined);
                            setAbierto(false);
                        }}
                        className="
                            w-full flex items-center justify-between
                            px-3 py-2.5
                            text-sm lg:text-xs 2xl:text-sm text-left
                            cursor-pointer
                            transition-colors
                        "
                        style={{
                            background: !value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            color: !value ? '#3B82F6' : '#94A3B8',
                        }}
                        onMouseEnter={(e) => {
                            if (value) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.color = '#FFFFFF';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (value) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#94A3B8';
                            }
                        }}
                    >
                        <span>{placeholder}</span>
                        {!value && <Check className="w-4 h-4 text-[#3B82F6]" />}
                    </button>

                    {/* Separador */}
                    <div className="h-px bg-white/10" />

                    {/* Opciones */}
                    {options.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                                onChange(option.id);
                                setAbierto(false);
                            }}
                            className="
                                w-full flex items-center justify-between
                                px-3 py-2.5
                                text-sm lg:text-xs 2xl:text-sm text-left
                                cursor-pointer
                                transition-colors
                            "
                            style={{
                                background: value === option.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: value === option.id ? '#3B82F6' : '#94A3B8',
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = '#FFFFFF';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.id) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94A3B8';
                                }
                            }}
                        >
                            <span className="truncate">{option.label}</span>
                            {value === option.id && <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalVouchers({
    abierto,
    onClose,
    onCanjearVoucher,
    cambiosVouchers,
    canjearAbierto = false,
}: ModalVouchersProps) {
    // ---------------------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------------------
    const usuario = useScanYAStore((s) => s.usuario);
    const tipoUsuario = usuario?.tipo || 'empleado';

    // Buscador
    const [buscadorAbierto, setBuscadorAbierto] = useState(false);
    const [lada, setLada] = useState('+52');
    const [telefono, setTelefono] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [clienteBuscado, setClienteBuscado] = useState<ClienteConVouchers | null>(null);
    const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

    // Filtros
    const [filtroSucursalId, setFiltroSucursalId] = useState<string | undefined>(undefined);
    const [filtroOperadorId, setFiltroOperadorId] = useState<string | undefined>(undefined);
    const [sucursales, setSucursales] = useState<SucursalLista[]>([]);
    const [operadores, setOperadores] = useState<OperadorLista[]>([]);
    const [cargandoListas, setCargandoListas] = useState(false);

    // Tabs y vouchers
    const [tabActiva, setTabActiva] = useState<EstadoVoucher>('pendiente');
    const [vouchers, setVouchers] = useState<VoucherCompleto[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [total, setTotal] = useState(0);
    const [yaCargo, setYaCargo] = useState(false);
    const [refreshGirando, setRefreshGirando] = useState(false);

    // Detalle de voucher
    const [voucherDetalle, setVoucherDetalle] = useState<VoucherCompleto | null>(null);

    // Refs para detectar cambios
    const prevFiltroSucursal = useRef(filtroSucursalId);
    const prevFiltroOperador = useRef(filtroOperadorId);

    // ---------------------------------------------------------------------------
    // Permisos de filtros según rol
    // ---------------------------------------------------------------------------
    const puedeVerFiltroSucursal = tipoUsuario === 'dueno';
    const puedeVerFiltroOperador = (tipoUsuario === 'dueno' || tipoUsuario === 'gerente') && operadores.length > 0;

    // ---------------------------------------------------------------------------
    // Cargar listas para filtros
    // ---------------------------------------------------------------------------
    const cargarListas = useCallback(async () => {
        if (tipoUsuario === 'empleado') return;

        setCargandoListas(true);
        try {
            // Cargar sucursales (solo si es dueño)
            if (tipoUsuario === 'dueno') {
                const resSucursales = await scanyaService.obtenerSucursalesLista();
                if (resSucursales.success && resSucursales.data) {
                    setSucursales(resSucursales.data);
                }
            }

            // Cargar operadores (dueño y gerente)
            const resOperadores = await scanyaService.obtenerOperadoresLista(filtroSucursalId);
            if (resOperadores.success && resOperadores.data) {
                setOperadores(resOperadores.data);
            }
        } catch (err) {
            console.error('Error cargando listas:', err);
        } finally {
            setCargandoListas(false);
        }
    }, [tipoUsuario, filtroSucursalId]);

    // ---------------------------------------------------------------------------
    // Reset al abrir/cerrar
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (abierto) {
            setBuscadorAbierto(false);
            setLada('+52');
            setTelefono('');
            setClienteBuscado(null);
            setErrorBusqueda(null);
            setTabActiva('pendiente');
            setPaginaActual(1);
            if (!yaCargo) {
                cargarListas();
            }
            cargarVouchers('pendiente', 1);
            setYaCargo(true);
        }
    }, [abierto]);

    // Recargar operadores cuando cambia la sucursal (solo para dueño)
    useEffect(() => {
        if (abierto && tipoUsuario === 'dueno' && filtroSucursalId !== prevFiltroSucursal.current) {
            // Limpiar filtro de operador al cambiar sucursal
            setFiltroOperadorId(undefined);
            // Recargar lista de operadores de esa sucursal
            scanyaService.obtenerOperadoresLista(filtroSucursalId).then(res => {
                if (res.success && res.data) {
                    setOperadores(res.data);
                }
            });
        }
        prevFiltroSucursal.current = filtroSucursalId;
    }, [filtroSucursalId, abierto, tipoUsuario]);

    // Recargar cuando cambian los filtros
    useEffect(() => {
        if (abierto && yaCargo && !clienteBuscado) {
            if (filtroSucursalId !== prevFiltroSucursal.current || filtroOperadorId !== prevFiltroOperador.current) {
                setPaginaActual(1);
                setVouchers([]);
                cargarVouchers(tabActiva, 1);
            }
        }
        prevFiltroSucursal.current = filtroSucursalId;
        prevFiltroOperador.current = filtroOperadorId;
    }, [filtroSucursalId, filtroOperadorId, abierto, yaCargo, clienteBuscado]);

    // Recargar cuando hay cambios (ventas registradas, vouchers canjeados)
    useEffect(() => {
        if (cambiosVouchers && cambiosVouchers > 0 && yaCargo) {
            setPaginaActual(1);
            cargarVouchers(tabActiva, 1);
        }
    }, [cambiosVouchers]);

    // ---------------------------------------------------------------------------
    // Cargar vouchers (gestión general)
    // ---------------------------------------------------------------------------
    const cargarVouchers = async (estado: EstadoVoucher, pagina: number = 1) => {
        if (!usuario) return;

        // Solo mostrar loading si no hay datos previos (evita parpadeo al reabrir)
        if (vouchers.length === 0) setCargando(true);
        setError(null);

        try {
            const respuesta = await scanyaService.obtenerVouchers({
                estado,
                pagina,
                limite: 10,
                sucursalId: filtroSucursalId,
                empleadoId: filtroOperadorId,
            });

            if (respuesta.success && respuesta.data) {
                setVouchers(respuesta.data.vouchers);
                setTotal(respuesta.data.total);
                setPaginaActual(respuesta.data.pagina);
                setTotalPaginas(respuesta.data.totalPaginas);
            } else {
                setError(respuesta.message || 'Error al cargar vouchers');
            }
        } catch (err) {
            console.error('Error cargando vouchers:', err);
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Buscar cliente específico
    // ---------------------------------------------------------------------------
    const handleBuscarCliente = async () => {
        if (telefono.length !== 10) {
            setErrorBusqueda('Formato inválido. Ingresa 10 dígitos');
            return;
        }

        setBuscando(true);
        setErrorBusqueda(null);
        setClienteBuscado(null);

        try {
            const telefonoCompleto = lada + telefono;
            const respuesta = await scanyaService.buscarClienteConVouchers({
                telefono: telefonoCompleto,
            });

            if (respuesta.success && respuesta.data) {
                setClienteBuscado(respuesta.data);
            } else {
                setErrorBusqueda(respuesta.message || 'Cliente no encontrado');
            }
        } catch (err) {
            console.error('Error buscando cliente:', err);
            setErrorBusqueda('Error de conexión. Intenta de nuevo.');
        } finally {
            setBuscando(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleCambiarTab = (estado: EstadoVoucher) => {
        setTabActiva(estado);
        setPaginaActual(1);
        setClienteBuscado(null);
        cargarVouchers(estado, 1);
    };

    const handleLimpiarBusqueda = () => {
        setClienteBuscado(null);
        setLada('+52');
        setTelefono('');
        setErrorBusqueda(null);
        cargarVouchers(tabActiva, 1);
    };

    const handleCanjearClick = (voucher: {
        id: string;
        recompensaNombre: string;
        usuarioId?: string;
        usuarioNombre?: string
    }) => {
        const clienteId = clienteBuscado
            ? clienteBuscado.cliente.id
            : voucher.usuarioId || '';

        const clienteNombre = clienteBuscado
            ? clienteBuscado.cliente.nombre
            : voucher.usuarioNombre || '';

        onCanjearVoucher(
            voucher.id,
            clienteId,
            clienteNombre,
            voucher.recompensaNombre
        );
    };

    const handleRefresh = () => {
        setRefreshGirando(true);
        setTimeout(() => setRefreshGirando(false), 600);
        setClienteBuscado(null);
        setPaginaActual(1);
        cargarVouchers(tabActiva, 1);
    };

    // ---------------------------------------------------------------------------
    // Determinar qué vouchers mostrar
    // ---------------------------------------------------------------------------
    const vouchersMostrar = clienteBuscado
        ? clienteBuscado.vouchers.map((v) => ({
            id: v.id,
            usuarioId: clienteBuscado.cliente.id,
            usuarioNombre: clienteBuscado.cliente.nombre,
            usuarioTelefono: clienteBuscado.cliente.telefono,
            usuarioAvatarUrl: clienteBuscado.cliente.avatarUrl || null,
            recompensaId: v.recompensaId,
            recompensaNombre: v.recompensaNombre,
            recompensaDescripcion: v.recompensaDescripcion,
            puntosUsados: v.puntosUsados,
            estado: 'pendiente' as const,
            expiraAt: v.expiraAt,
            usadoAt: null,
            usadoPorEmpleadoNombre: null,
            sucursalNombre: '',
        }))
        : vouchers;

    const totalMostrar = clienteBuscado ? clienteBuscado.vouchers.length : total;

    // History back — un solo handler que maneja todos los niveles
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const nivelRef = useRef(0); // nivel lógico de navegación
    const pushCountRef = useRef(0); // entries reales en el history
    const canjearAbiertoRef = useRef(false);
    canjearAbiertoRef.current = canjearAbierto;

    useEffect(() => {
        if (!abierto) {
            nivelRef.current = 0;
            pushCountRef.current = 0;
            setVoucherDetalle(null);
            return;
        }

        history.pushState({ modal: 'vouchers' }, '');
        nivelRef.current = 1;
        pushCountRef.current = 1;

        const handlePopState = () => {
            pushCountRef.current = Math.max(0, pushCountRef.current - 1);
            if (canjearAbiertoRef.current) return;
            if (nivelRef.current >= 2) {
                nivelRef.current = 1;
                setVoucherDetalle(null);
            } else {
                nivelRef.current = 0;
                onCloseRef.current();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            const pendientes = pushCountRef.current;
            pushCountRef.current = 0;
            nivelRef.current = 0;
            if (pendientes > 0) history.go(-pendientes);
        };
    }, [abierto]);

    // Push al abrir detalle
    useEffect(() => {
        if (!voucherDetalle || !abierto) return;
        history.pushState({ modal: 'voucher-detalle' }, '');
        nivelRef.current = 2;
        pushCountRef.current += 1;
    }, [voucherDetalle, abierto]);

    if (!abierto) return null;

    // ---------------------------------------------------------------------------
    // RENDER: Detalle de voucher
    // ---------------------------------------------------------------------------
    if (voucherDetalle) {
        const v = voucherDetalle;
        const formatTel = (tel: string) => {
            if (tel.startsWith('+52') && tel.length === 13) return `+52 ${tel.slice(3, 6)} ${tel.slice(6, 9)} ${tel.slice(9)}`;
            const l = tel.replace(/\D/g, '');
            if (l.length === 10) return `+52 ${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6)}`;
            return tel;
        };
        const formatFechaLarga = (f: string) => {
            const d = new Date(f);
            return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
                ', ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        };
        const formatFechaCorta = (f: string) => {
            const d = new Date(f);
            return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) +
                ', ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const iniciales = (() => {
            const p = v.usuarioNombre.trim().split(/\s+/);
            return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : v.usuarioNombre.slice(0, 2).toUpperCase();
        })();

        const estadoConfig = (() => {
            switch (v.estado) {
                case 'usado': return { label: 'Canjeado', color: '#34D399', icon: CheckCircle };
                case 'vencido': return { label: 'Vencido', color: '#EF4444', icon: XCircle };
                case 'cancelado': return { label: 'Cancelado', color: '#64748B', icon: Ban };
                default: return { label: 'Pendiente', color: '#F59E0B', icon: Clock };
            }
        })();
        const EstadoIcono = estadoConfig.icon;

        const abrirChatTemporal = useChatYAStore.getState().abrirChatTemporal;
        const abrirChatYA = useUiStore.getState().abrirChatYA;

        const handleContactar = () => {
            if (!v.usuarioId) return;
            abrirChatTemporal({
                id: `temp_${Date.now()}`,
                otroParticipante: { id: v.usuarioId, nombre: v.usuarioNombre, apellidos: '', avatarUrl: v.usuarioAvatarUrl ?? null },
                datosCreacion: { participante2Id: v.usuarioId, participante2Modo: 'personal', contextoTipo: 'directo' },
            });
            abrirChatYA();
            setVoucherDetalle(null);
            onClose();
        };

        const ROW = 'flex items-center justify-between py-2.5 lg:py-2 2xl:py-2.5';
        const LABEL = 'text-sm lg:text-[11px] 2xl:text-sm font-medium';
        const VALUE = 'text-sm lg:text-[11px] 2xl:text-sm font-bold';

        return (
            <>
                <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setVoucherDetalle(null)} />
                <div
                    className="fixed z-50 inset-x-0 bottom-0 h-full lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px] flex flex-col rounded-none overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)', boxShadow: '-4px 0 30px rgba(0,0,0,0.5)' }}
                >
                    {/* Header */}
                    <header className="flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10 shrink-0">
                        <button onClick={() => history.back()} className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                            <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </button>
                        <h2 className="text-base lg:text-sm 2xl:text-base font-bold text-white flex-1">Detalle de voucher</h2>
                        <button onClick={onClose} className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </button>
                    </header>

                    {/* Contenido */}
                    <div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4">

                        {/* ── CLIENTE ── */}
                        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                            {v.usuarioAvatarUrl ? (
                                <img src={v.usuarioAvatarUrl} alt="" className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-full object-cover shrink-0" />
                            ) : (
                                <div className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.2)' }}>
                                    <span className="text-xl lg:text-base 2xl:text-xl font-bold" style={{ color: '#60A5FA' }}>{iniciales}</span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-lg lg:text-base 2xl:text-lg font-bold truncate" style={{ color: '#F1F5F9' }}>
                                    {v.usuarioNombre}
                                </p>
                                {v.usuarioTelefono && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>{formatTel(v.usuarioTelefono)}</span>
                                    </div>
                                )}
                                {/* Badge estado */}
                                <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full w-fit" style={{ background: `${estadoConfig.color}20` }}>
                                    <EstadoIcono className="w-3 h-3" style={{ color: estadoConfig.color }} />
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold" style={{ color: estadoConfig.color }}>{estadoConfig.label}</span>
                                </div>
                            </div>
                            {/* Logo ChatYA */}
                            {v.usuarioId && (
                                <button onClick={handleContactar} className="shrink-0 cursor-pointer hover:opacity-80">
                                    <img src="/logo-ChatYA-blanco.webp" alt="ChatYA" className="w-auto h-14 lg:h-11 2xl:h-14" />
                                </button>
                            )}
                        </div>

                        {/* ── RECOMPENSA ── */}
                        <div className="mt-4 lg:mt-3 2xl:mt-4 rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <Gift className="w-5 h-5" style={{ color: '#60A5FA' }} />
                                <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>{v.recompensaNombre}</span>
                            </div>
                            {v.recompensaDescripcion && (
                                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium mb-3 lg:mb-2 2xl:mb-3" style={{ color: '#94A3B8' }}>{v.recompensaDescripcion}</p>
                            )}

                            {/* Puntos / Gratis */}
                            <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center gap-1.5">
                                    <Coins className="w-4 h-4" style={{ color: v.puntosUsados > 0 ? '#60A5FA' : '#34D399' }} />
                                    <span className={LABEL} style={{ color: '#94A3B8' }}>
                                        {v.puntosUsados > 0 ? 'Puntos canjeados' : 'Tipo de canje'}
                                    </span>
                                </div>
                                <span className={VALUE} style={{ color: v.puntosUsados > 0 ? '#60A5FA' : '#34D399' }}>
                                    {v.puntosUsados > 0 ? `${v.puntosUsados.toLocaleString()} pts` : `Gratis · ${v.recompensaNombre}`}
                                </span>
                            </div>
                        </div>

                        {/* ── FECHAS ── */}
                        <div className="mt-3 lg:mt-2 2xl:mt-3 space-y-1">
                            {/* Expiración */}
                            <div className={ROW}>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" style={{ color: '#64748B' }} />
                                    <span className={LABEL} style={{ color: '#94A3B8' }}>
                                        {v.estado === 'vencido' ? 'Expiró' : 'Expira'}
                                    </span>
                                </div>
                                <span className={VALUE} style={{ color: '#F1F5F9' }}>
                                    {new Date(v.expiraAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Fecha de canje (si fue usado) */}
                            {v.estado === 'usado' && v.usadoAt && (
                                <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle className="w-4 h-4" style={{ color: '#34D399' }} />
                                        <span className={LABEL} style={{ color: '#94A3B8' }}>Canjeado</span>
                                    </div>
                                    <span className={VALUE} style={{ color: '#F1F5F9' }}>{formatFechaCorta(v.usadoAt)}</span>
                                </div>
                            )}
                        </div>

                        {/* ── METADATA ── */}
                        {(v.usadoPorEmpleadoNombre || v.sucursalNombre) && (
                            <div className="mt-4 lg:mt-3 2xl:mt-4 pt-3 lg:pt-2 2xl:pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                {/* Atendido por */}
                                {v.estado === 'usado' && v.usadoPorEmpleadoNombre && (
                                    <div className="mb-2 lg:mb-1.5 2xl:mb-2">
                                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#64748B' }}>Atendido por:</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <User className="w-4 h-4" style={{ color: '#94A3B8' }} />
                                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold" style={{ color: '#F1F5F9' }}>{v.usadoPorEmpleadoNombre}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Sucursal */}
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" style={{ color: '#64748B' }} />
                                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>{v.sucursalNombre}</span>
                                </div>
                            </div>
                        )}

                        {/* ── BOTÓN CANJEAR (si pendiente) ── */}
                        {v.estado === 'pendiente' && (
                            <button
                                onClick={() => {
                                    handleCanjearClick(v);
                                }}
                                className="w-full mt-4 lg:mt-3 2xl:mt-4 py-3 lg:py-2.5 2xl:py-3 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center justify-center gap-2 font-bold text-base lg:text-sm 2xl:text-base text-white cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #334155, #475569)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b, #334155)'; }}
                            >
                                <CheckCircle className="w-5 h-5" />
                                Canjear Voucher
                            </button>
                        )}
                    </div>
                </div>
            </>
        );
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <>
            {/* ================================================================== */}
            {/* OVERLAY - Solo móvil (oscurece el fondo) */}
            {/* ================================================================== */}
            <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" />

            {/* ================================================================== */}
            {/* CONTENEDOR PRINCIPAL */}
            {/* - Móvil: ModalBottom 85% altura, desde abajo */}
            {/* - PC: Drawer lateral derecho 450px */}
            {/* ================================================================== */}
            <div
                className="
          fixed z-50
          inset-x-0 bottom-0 h-full
          lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px]
          flex flex-col
          rounded-none
          overflow-hidden
        "
                style={{
                    background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)',
                    boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* ============================================================== */}
                {/* HEADER */}
                {/* ============================================================== */}
                <header
                    className="
            relative
            flex items-center gap-3 lg:gap-2 2xl:gap-1.5
            px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
            border-b border-white/10
          "
                >
                    <button
                        onClick={() => history.back()}
                        className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/20 -ml-2 cursor-pointer transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-white font-bold text-lg lg:text-base 2xl:text-lg">Vouchers</h1>
                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                            {clienteBuscado
                                ? `${totalMostrar} voucher${totalMostrar !== 1 ? 's' : ''} de ${clienteBuscado.cliente.nombre}`
                                : `${totalMostrar} voucher${totalMostrar !== 1 ? 's' : ''} ${tabActiva === 'pendiente' ? 'pendientes' : tabActiva + 's'}`}
                        </p>
                    </div>

                    {/* Botón Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={cargando}
                        className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed transition-transform"
                    >
                        <RefreshCw
                            className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#3B82F6] transition-transform ${cargando || refreshGirando ? 'animate-spin' : ''
                                }`}
                        />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/20 -mr-2 cursor-pointer transition-colors"
                    >
                        <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>
                </header>

                {/* ============================================================== */}
                {/* BUSCADOR COLAPSABLE */}
                {/* ============================================================== */}
                <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 shrink-0 border-b border-white/10">
                    <button
                        onClick={() => setBuscadorAbierto(!buscadorAbierto)}
                        className="
              w-full flex items-center justify-between
              text-sm lg:text-xs 2xl:text-sm text-[#94A3B8] hover:text-white
              transition-colors cursor-pointer
            "
                    >
                        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                            <Search className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                            <span>Buscar cliente específico</span>
                        </div>
                        {buscadorAbierto ? (
                            <ChevronUp className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                        )}
                    </button>

                    {buscadorAbierto && (
                        <div className="mt-3 lg:mt-2 2xl:mt-3 space-y-3 lg:space-y-2 2xl:space-y-3">
                            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                                <input
                                    type="text"
                                    value={lada}
                                    onChange={(e) => {
                                        let valor = e.target.value;
                                        if (!valor.startsWith('+')) valor = '+' + valor.replace(/[^0-9]/g, '');
                                        else valor = '+' + valor.slice(1).replace(/[^0-9]/g, '');
                                        if (valor.length <= 4) setLada(valor);
                                    }}
                                    className="
                    w-16 py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-1.5 text-center rounded-lg lg:rounded-md 2xl:rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm lg:text-xs 2xl:text-sm
                    focus:outline-none focus:border-[#3B82F6]/50
                  "
                                    placeholder="+52"
                                />

                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={telefono}
                                    onChange={(e) => {
                                        setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10));
                                        setErrorBusqueda(null);
                                    }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && telefono.length === 10 && !buscando) {
                                            handleBuscarCliente();
                                        }
                                    }}
                                    placeholder="6441234567"
                                    className="
                    flex-1 py-2 lg:py-1.5 2xl:py-2 px-3 lg:px-2 2xl:px-1.5 rounded-lg lg:rounded-md 2xl:rounded-lg
                    bg-white/5 border border-white/10
                    text-white text-sm lg:text-xs 2xl:text-sm placeholder:text-[#94A3B8]/50
                    focus:outline-none focus:border-[#3B82F6]/50
                  "
                                />

                                <button
                                    onClick={handleBuscarCliente}
                                    disabled={buscando || telefono.length !== 10}
                                    className="
                    px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg
                    flex items-center gap-2 lg:gap-1.5 2xl:gap-2
                    text-sm lg:text-xs 2xl:text-sm font-medium text-white
                    transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    cursor-pointer hover:shadow-lg
                  "
                                    style={{
                                        background:
                                            buscando || telefono.length !== 10
                                                ? 'rgba(59, 130, 246, 0.3)'
                                                : 'rgba(59, 130, 246, 0.6)',
                                    }}
                                >
                                    {buscando ? <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 animate-spin" /> : <Search className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />}
                                </button>
                            </div>

                            {errorBusqueda && (
                                <div
                                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg"
                                    style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                                >
                                    <AlertCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#EF4444] shrink-0" />
                                    <p className="text-xs text-[#EF4444]">{errorBusqueda}</p>
                                </div>
                            )}

                            {clienteBuscado && (
                                <div
                                    className="p-3 lg:p-2 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center justify-between"
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                                        <User className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                        <div>
                                            <p className="text-white text-sm lg:text-xs 2xl:text-sm font-medium">
                                                {clienteBuscado.cliente.nombre}
                                            </p>
                                            <p className="text-[#94A3B8] text-xs">
                                                {formatearTelefono(clienteBuscado.cliente.telefono)}
                                            </p>
                                            {clienteBuscado.vouchers.length === 0 && (
                                                <p className="text-[#F59E0B] text-xs mt-0.5 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Sin vouchers pendientes
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLimpiarBusqueda}
                                        className="text-[#94A3B8] hover:text-white text-xs cursor-pointer transition-colors"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* FILTROS ADICIONALES (Sucursal / Operador) */}
                {/* ============================================================== */}
                {!clienteBuscado && (puedeVerFiltroSucursal || puedeVerFiltroOperador) && (
                    <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10">
                        <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                            {/* Dropdown Sucursal - Solo dueño */}
                            {puedeVerFiltroSucursal && (
                                <CustomDropdown
                                    options={sucursales.map(s => ({ id: s.id, label: s.nombre }))}
                                    value={filtroSucursalId}
                                    onChange={setFiltroSucursalId}
                                    placeholder="Todas las sucursales"
                                    disabled={cargandoListas}
                                />
                            )}

                            {/* Dropdown Operador - Dueño y gerente (si hay operadores) */}
                            {puedeVerFiltroOperador && (
                                <CustomDropdown
                                    options={operadores.map(op => ({ id: op.id, label: op.nombre }))}
                                    value={filtroOperadorId}
                                    onChange={setFiltroOperadorId}
                                    placeholder="Todos"
                                    disabled={cargandoListas}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TABS (solo si no hay búsqueda activa) */}
                {/* ============================================================== */}
                {!clienteBuscado && (
                    <div className="px-4 lg:px-2 2xl:px-4 py-3 lg:py-2 2xl:py-3 shrink-0 overflow-x-auto border-b border-white/10">
                        <div className="flex gap-2 lg:gap-1 2xl:gap-2">
                            {TABS.map((tab) => {
                                const Icono = tab.icono;
                                const activo = tab.id === tabActiva;

                                if (usuario?.tipo === 'empleado' && tab.id !== 'pendiente') return null;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleCambiarTab(tab.id)}
                                        className="
                      px-2 lg:px-1.5 2xl:px-2 py-1 lg:py-1 2xl:py-1.5 rounded-lg lg:rounded-md 2xl:rounded-lg
                      flex items-center gap-1 lg:gap-0.5 2xl:gap-1
                      text-xs lg:text-[11px] 2xl:text-[13px] font-medium whitespace-nowrap
                      transition-all shrink-0 cursor-pointer
                    "
                                        style={{
                                            background: activo ? tab.bgColor : 'transparent',
                                            color: activo ? tab.color : '#94A3B8',
                                            border: `1px solid ${activo ? tab.borderColor : 'transparent'}`,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!activo) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.color = '#FFFFFF';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!activo) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = '#94A3B8';
                                            }
                                        }}
                                    >
                                        <Icono className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CONTENIDO */}
                <div className="flex-1 overflow-y-auto">
                    {cargando ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#3B82F6] animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="p-4 lg:p-3 2xl:p-2">
                            <div
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 p-3 lg:p-2 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg"
                                style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                            >
                                <AlertCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#EF4444] shrink-0" />
                                <p className="text-sm lg:text-xs 2xl:text-sm text-[#EF4444]">{error}</p>
                            </div>
                        </div>
                    ) : vouchersMostrar.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4 lg:px-3 2xl:px-4">
                            <Gift className="w-16 h-16 text-[#64748B] mb-3 lg:mb-2 2xl:mb-1.5" />
                            <p className="text-[#94A3B8] text-lg lg:text-base 2xl:text-lg font-medium">Sin vouchers</p>
                            <p className="text-[#64748B] text-sm lg:text-xs 2xl:text-sm mt-1">
                                {clienteBuscado
                                    ? 'Este cliente no tiene vouchers'
                                    : `No hay vouchers ${tabActiva === 'pendiente' ? 'pendientes' : tabActiva + 's'}`}
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2 2xl:space-y-3">
                            {vouchersMostrar.map((voucher) => (
                                <TarjetaVoucher
                                    key={voucher.id}
                                    voucher={voucher}
                                    onValidar={handleCanjearClick}
                                    onClick={() => setVoucherDetalle(voucher)}
                                    mostrarBotonValidar={voucher.estado === 'pendiente'}
                                    mostrarEstado={!clienteBuscado}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ============================================================== */}
                {/* PAGINACIÓN */}
                {/* ============================================================== */}
                {!cargando && !error && !clienteBuscado && totalPaginas > 1 && (
                    <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 shrink-0 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => cargarVouchers(tabActiva, paginaActual - 1)}
                                disabled={paginaActual === 1}
                                className="
                  px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center gap-2 lg:gap-1.5 2xl:gap-2
                  text-sm lg:text-xs 2xl:text-sm font-medium text-white
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer hover:shadow-lg
                "
                                style={{
                                    background: paginaActual === 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.5)',
                                }}
                            >
                                <ChevronLeft className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                Anterior
                            </button>

                            <div className="text-sm lg:text-xs 2xl:text-sm text-[#94A3B8]">
                                Página {paginaActual} de {totalPaginas}
                            </div>

                            <button
                                onClick={() => cargarVouchers(tabActiva, paginaActual + 1)}
                                disabled={paginaActual === totalPaginas}
                                className="
                  px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center gap-2 lg:gap-1.5 2xl:gap-2
                  text-sm lg:text-xs 2xl:text-sm font-medium text-white
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer hover:shadow-lg
                "
                                style={{
                                    background:
                                        paginaActual === totalPaginas ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.5)',
                                }}
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default ModalVouchers;