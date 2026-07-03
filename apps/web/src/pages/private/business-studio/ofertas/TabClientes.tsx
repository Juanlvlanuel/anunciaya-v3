/**
 * TabClientes.tsx
 * ================
 * Tab de selección de clientes para ofertas exclusivas.
 * Dos modos:
 * - Creación: selector con checkboxes, filtros y búsqueda
 * - Edición: lista readonly de clientes asignados con estado del cupón
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/TabClientes.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Users, ChevronDown, Check, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
import { Spinner } from '../../../../components/ui/Spinner';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import type { ClienteAsignado, UsuarioBuscadoCupon } from '../../../../services/ofertasService';
import { usePuntosConfiguracion } from '../../../../hooks/queries/usePuntos';
import { useBuscarUsuariosSelector } from '../../../../hooks/queries/useOfertas';

// =============================================================================
// TIPOS
// =============================================================================

type FiltroNivel = 'todos' | 'bronce' | 'plata' | 'oro';
type FiltroActividad = 'todos' | 'activos' | 'inactivos';

export interface ClienteItem {
    id: string;
    nombre: string;
    telefono: string | null;
    avatarUrl: string | null;
    nivelActual: string;
    ultimaActividad: string | null;
    totalVisitas: number;
}

interface TabClientesProps {
    clientes: ClienteItem[];
    cargando: boolean;
    clientesSeleccionados: string[];
    onToggleCliente: (id: string) => void;
    onSeleccionarTodos: (ids: string[]) => void;
    onLimpiarSeleccion: () => void;
    // Modo edición: clientes ya asignados
    modoEdicion?: boolean;
    clientesAsignados?: ClienteAsignado[];
    cargandoAsignados?: boolean;
    onClickCliente?: (clienteId: string) => void;
    botonesDesktop?: React.ReactNode;
}

// =============================================================================
// LABELS
// =============================================================================

const NIVELES: { valor: FiltroNivel; label: string }[] = [
    { valor: 'todos', label: 'Todos los niveles' },
    { valor: 'bronce', label: 'Bronce' },
    { valor: 'plata', label: 'Plata' },
    { valor: 'oro', label: 'Oro' },
];

const ACTIVIDADES: { valor: FiltroActividad; label: string }[] = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'activos', label: 'Activos (30d)' },
    { valor: 'inactivos', label: 'Inactivos (+30d)' },
];

// =============================================================================
// HELPERS
// =============================================================================

function getBadgeEstado(estado: string): { label: string; clases: string; Icono: React.ComponentType<{ className?: string }> } {
    switch (estado) {
        case 'activo': return { label: 'Activo', clases: 'bg-emerald-100 text-emerald-700', Icono: CheckCircle };
        case 'usado': return { label: 'Usado', clases: 'bg-sky-100 text-sky-700', Icono: CheckCircle };
        case 'expirado': return { label: 'Vencido', clases: 'bg-amber-100 text-amber-700', Icono: Clock };
        case 'revocado': return { label: 'Revocado', clases: 'bg-red-100 text-red-700', Icono: XCircle };
        default: return { label: estado, clases: 'bg-slate-200 text-slate-700', Icono: AlertTriangle };
    }
}

// =============================================================================
// DROPDOWN REUTILIZABLE (TC-4)
// =============================================================================

function DropdownFiltro<T extends string>({
    opciones,
    valor,
    onChange,
    testId,
    alinearDerecha,
    expandir,
}: {
    opciones: { valor: T; label: string }[];
    valor: T;
    onChange: (v: T) => void;
    testId: string;
    alinearDerecha?: boolean;
    expandir?: boolean;
}) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!abierto) return;
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [abierto]);

    const labelActivo = opciones.find(o => o.valor === valor)?.label ?? '';
    const tieneSeleccion = valor !== 'todos';

    return (
        <div ref={ref} className={`${expandir ? 'flex-1' : 'shrink-0'} relative`}>
            <button
                type="button"
                data-testid={testId}
                onClick={() => setAbierto(!abierto)}
                className={`w-full h-11 lg:h-10 2xl:h-11 flex items-center justify-between pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${
                    tieneSeleccion
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
            >
                <span className="truncate">{labelActivo}</span>
                <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {abierto && (
                <div className={`absolute ${alinearDerecha ? 'right-0' : 'left-0'} top-full mt-1.5 z-50 min-w-full w-max bg-white rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-hidden`}>
                    {opciones.map(op => (
                        <button
                            key={op.valor}
                            type="button"
                            data-testid={`${testId}-${op.valor}`}
                            onClick={() => { onChange(op.valor); setAbierto(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${
                                valor === op.valor
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-slate-600 hover:bg-blue-50'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                valor === op.valor ? 'bg-blue-500' : 'bg-slate-200'
                            }`}>
                                {valor === op.valor && <Check className="w-3 h-3 text-white" />}
                            </div>
                            {op.label}
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

export function TabClientes({
    clientes, cargando, clientesSeleccionados, onToggleCliente, onSeleccionarTodos, onLimpiarSeleccion,
    modoEdicion, clientesAsignados, cargandoAsignados, onClickCliente, botonesDesktop,
}: TabClientesProps) {
    const { data: configPuntos } = usePuntosConfiguracion();
    const nivelesActivos = configPuntos?.nivelesActivos ?? true;

    // ── Sub-pestaña "Buscar usuario" (solo modo creación) ──
    // Estos hooks se declaran ANTES del return de modoEdicion para mantener el
    // orden estable de hooks. En modo edición quedan inertes (nunca se teclea).
    const [subTab, setSubTab] = useState<'clientes' | 'buscar'>('clientes');
    const [qUsuario, setQUsuario] = useState('');
    const [qDebounced, setQDebounced] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setQDebounced(qUsuario), 300);
        return () => clearTimeout(t);
    }, [qUsuario]);
    const busquedaUsuarios = useBuscarUsuariosSelector(qDebounced);
    // Info de usuarios elegidos desde el buscador (no están en `clientes`),
    // para poder pintar sus chips de seleccionados.
    const [infoBuscados, setInfoBuscados] = useState<Record<string, UsuarioBuscadoCupon>>({});
    const seleccionarUsuarioBuscado = (u: UsuarioBuscadoCupon) => {
        setInfoBuscados((prev) => ({ ...prev, [u.id]: u }));
        onToggleCliente(u.id);
    };

    // ── MODO EDICIÓN: lista readonly de clientes asignados ──
    if (modoEdicion) {
        return (
            <div className="p-4 lg:p-3 2xl:p-4 flex flex-col gap-3 lg:gap-2.5 2xl:gap-3 h-full">
                <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3.5 py-2.5 lg:px-3 lg:py-2 2xl:px-3.5 2xl:py-2.5 bg-slate-200 rounded-lg">
                    <Users className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0" />
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 font-semibold">
                        Enviado a {clientesAsignados?.length ?? 0} usuario(s)
                    </p>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg border-2 border-slate-300">
                    {cargandoAsignados ? (
                        <div className="p-6 text-center"><Spinner tamanio="sm" /></div>
                    ) : !clientesAsignados || clientesAsignados.length === 0 ? (
                        <p className="p-6 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium text-center">
                            Aún no lo has enviado a nadie
                        </p>
                    ) : (
                        clientesAsignados.map(cliente => {
                            const badge = getBadgeEstado(cliente.estado);
                            return (
                                <button
                                    key={cliente.cuponId}
                                    type="button"
                                    data-testid={`cliente-asignado-${cliente.id}`}
                                    onClick={() => onClickCliente?.(cliente.id)}
                                    className="w-full flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 p-3 lg:p-2 2xl:p-3 text-left cursor-pointer border-b border-slate-300 last:border-b-0 hover:bg-slate-200"
                                >
                                    {/* Avatar */}
                                    <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {cliente.avatarUrl ? (
                                            <img src={cliente.avatarUrl} alt={cliente.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-indigo-700">{obtenerIniciales(cliente.nombre)}</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800 truncate">{cliente.nombre}</p>
                                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                                            {cliente.asignadoAt && new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(new Date(cliente.asignadoAt)).map(p => p.type === 'month' ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : p.value).join('')}
                                        </p>
                                    </div>

                                    {/* Badge estado */}
                                    <div className={`px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 ${badge.clases}`}>
                                        <badge.Icono className="w-3 h-3" />
                                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold">{badge.label}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // ── MODO CREACIÓN: selector con filtros y checkboxes ──
    const [busqueda, setBusqueda] = useState('');
    const [filtroNivel, setFiltroNivel] = useState<FiltroNivel>('todos');
    const [filtroActividad, setFiltroActividad] = useState<FiltroActividad>('todos');

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const clientesFiltrados = clientes.filter(c => {
        if (busqueda) {
            const termino = busqueda.toLowerCase();
            if (!c.nombre.toLowerCase().includes(termino) && !c.telefono?.includes(termino)) return false;
        }
        if (filtroNivel !== 'todos' && c.nivelActual.toLowerCase() !== filtroNivel) return false;
        if (filtroActividad === 'activos' && c.ultimaActividad) {
            if (new Date(c.ultimaActividad) < hace30Dias) return false;
        }
        if (filtroActividad === 'inactivos') {
            if (!c.ultimaActividad || new Date(c.ultimaActividad) >= hace30Dias) return false;
        }
        return true;
    });

    const todosSeleccionados = clientesFiltrados.length > 0 && clientesFiltrados.every(c => clientesSeleccionados.includes(c.id));

    const usuariosBuscados = busquedaUsuarios.data ?? [];

    return (
        <div className="p-4 lg:p-3 2xl:p-4 flex flex-col gap-3 lg:gap-2.5 2xl:gap-3 h-full">

            {/* Sub-pestañas: Mis clientes / Buscar usuario */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg border-2 border-slate-300 shrink-0">
                <button
                    type="button"
                    data-testid="subtab-mis-clientes"
                    onClick={() => setSubTab('clientes')}
                    className={`flex-1 h-9 lg:h-8 2xl:h-9 rounded-md text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer transition-colors ${
                        subTab === 'clientes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Mis clientes
                </button>
                <button
                    type="button"
                    data-testid="subtab-buscar-usuario"
                    onClick={() => setSubTab('buscar')}
                    className={`flex-1 h-9 lg:h-8 2xl:h-9 rounded-md text-sm lg:text-[11px] 2xl:text-sm font-semibold cursor-pointer transition-colors ${
                        subTab === 'buscar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Buscar usuario
                </button>
            </div>

            {/* Chips de seleccionados (clientes + usuarios buscados) */}
            {clientesSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto shrink-0">
                    {clientesSeleccionados.map((id) => {
                        const enBilletera = clientes.find((c) => c.id === id);
                        const buscado = infoBuscados[id];
                        const nombre = enBilletera?.nombre
                            ?? (buscado ? `${buscado.nombre} ${buscado.apellidos}`.trim() : 'Usuario');
                        return (
                            <span
                                key={id}
                                data-testid={`chip-seleccionado-${id}`}
                                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-blue-100 border-2 border-blue-300 text-blue-700 text-xs lg:text-[11px] 2xl:text-xs font-semibold max-w-[12rem]"
                            >
                                <span className="truncate">{nombre}</span>
                                <button
                                    type="button"
                                    data-testid={`chip-quitar-${id}`}
                                    onClick={() => onToggleCliente(id)}
                                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200 cursor-pointer shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* ── SUB-PESTAÑA: Mis clientes ── */}
            {subTab === 'clientes' && (<>

            {/* Filtros: búsqueda + dropdowns */}
            <div className="flex flex-col gap-2 lg:gap-1.5 2xl:gap-2">
                <div className="flex flex-col lg:flex-row gap-2 lg:gap-1.5 2xl:gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" />
                        <input
                            id="input-buscar-cliente"
                            name="busquedaCliente"
                            data-testid="input-buscar-cliente"
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full h-11 lg:h-10 2xl:h-11 pl-9 lg:pl-8 2xl:pl-9 pr-3 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                    </div>
                    <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                        {nivelesActivos && (
                        <DropdownFiltro
                            opciones={NIVELES}
                            valor={filtroNivel}
                            onChange={setFiltroNivel}
                            testId="dropdown-nivel"
                            expandir
                        />
                        )}
                        <DropdownFiltro
                            opciones={ACTIVIDADES}
                            valor={filtroActividad}
                            onChange={setFiltroActividad}
                            testId="dropdown-actividad"
                            alinearDerecha
                            expandir
                        />
                    </div>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center justify-between">
                <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                    {clientesFiltrados.length} clientes • {clientesSeleccionados.length} seleccionados
                </span>
                <button
                    type="button"
                    data-testid="btn-seleccionar-todos"
                    onClick={() => {
                        if (todosSeleccionados) onLimpiarSeleccion();
                        else onSeleccionarTodos(clientesFiltrados.map(c => c.id));
                    }}
                    className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                    {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
            </div>

            {/* Lista de clientes */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg border-2 border-slate-300">
                {cargando ? (
                    <div className="p-6 text-center"><Spinner tamanio="sm" /></div>
                ) : clientesFiltrados.length === 0 ? (
                    <p className="p-6 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium text-center">
                        {clientes.length === 0 ? 'No hay clientes registrados' : 'Sin resultados para estos filtros'}
                    </p>
                ) : (
                    clientesFiltrados.map(cliente => (
                        <button
                            key={cliente.id}
                            type="button"
                            data-testid={`cliente-${cliente.id}`}
                            onClick={() => onToggleCliente(cliente.id)}
                            className={`w-full flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 px-3 py-1.5 lg:px-1.5 lg:py-1 2xl:px-3 2xl:py-1.5 text-left cursor-pointer border-b border-slate-300 last:border-b-0 ${
                                clientesSeleccionados.includes(cliente.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                        >
                            <div className={`w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 rounded-full flex items-center justify-center shrink-0 ${
                                clientesSeleccionados.includes(cliente.id) ? 'bg-blue-500' : 'bg-slate-200'
                            }`}>
                                {clientesSeleccionados.includes(cliente.id) && (
                                    <Check className="w-3 h-3 lg:w-2 lg:h-2 2xl:w-3 2xl:h-3 text-white" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-800 truncate">{cliente.nombre}</p>
                                <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                                    {cliente.telefono && <>{cliente.telefono} • </>}{cliente.totalVisitas} visitas
                                </p>
                            </div>
                            {nivelesActivos && (
                            <span className={`text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase px-2 py-0.5 lg:px-1.5 lg:py-0.5 2xl:px-2 rounded-full border-2 shrink-0 ${
                                cliente.nivelActual.toLowerCase() === 'oro' ? 'bg-amber-100 border-amber-300 text-amber-700'
                                : cliente.nivelActual.toLowerCase() === 'plata' ? 'bg-slate-100 border-slate-300 text-slate-700'
                                : 'bg-orange-50 border-orange-200 text-orange-600'
                            }`}>
                                {cliente.nivelActual}
                            </span>
                            )}
                        </button>
                    ))
                )}
            </div>

            </>)}

            {/* ── SUB-PESTAÑA: Buscar usuario (cualquier usuario de AnunciaYA) ── */}
            {subTab === 'buscar' && (<>

            <div className="relative shrink-0">
                <Search className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" />
                <input
                    id="input-buscar-usuario"
                    name="busquedaUsuario"
                    data-testid="input-buscar-usuario"
                    type="text"
                    value={qUsuario}
                    onChange={(e) => setQUsuario(e.target.value)}
                    placeholder="Buscar por nombre o apellido..."
                    className="w-full h-11 lg:h-10 2xl:h-11 pl-9 lg:pl-8 2xl:pl-9 pr-3 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                />
            </div>

            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium shrink-0">
                Envíale el cupón a cualquier usuario de AnunciaYA en tu ciudad, aunque aún no sea tu cliente.
            </p>

            {/* Resultados de la búsqueda */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg border-2 border-slate-300">
                {qDebounced.trim().length < 2 ? (
                    <p className="p-6 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium text-center">
                        Escribe al menos 2 letras para buscar usuarios.
                    </p>
                ) : busquedaUsuarios.isPending ? (
                    <div className="p-6 text-center"><Spinner tamanio="sm" /></div>
                ) : usuariosBuscados.length === 0 ? (
                    <p className="p-6 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium text-center">
                        Sin resultados para “{qDebounced.trim()}”
                    </p>
                ) : (
                    usuariosBuscados.map((u) => {
                        const sel = clientesSeleccionados.includes(u.id);
                        return (
                            <button
                                key={u.id}
                                type="button"
                                data-testid={`usuario-buscado-${u.id}`}
                                onClick={() => seleccionarUsuarioBuscado(u)}
                                className={`w-full flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 px-3 py-1.5 lg:px-1.5 lg:py-1 2xl:px-3 2xl:py-1.5 text-left cursor-pointer border-b border-slate-300 last:border-b-0 ${
                                    sel ? 'bg-blue-50' : 'hover:bg-slate-50'
                                }`}
                            >
                                <div className={`w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 rounded-full flex items-center justify-center shrink-0 ${
                                    sel ? 'bg-blue-500' : 'bg-slate-200'
                                }`}>
                                    {sel && <Check className="w-3 h-3 lg:w-2 lg:h-2 2xl:w-3 2xl:h-3 text-white" />}
                                </div>
                                <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {u.avatarUrl ? (
                                        <img src={u.avatarUrl} alt={u.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-indigo-700">{obtenerIniciales(`${u.nombre} ${u.apellidos}`)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-800 truncate">{u.nombre} {u.apellidos}</p>
                                </div>
                                <span className={`text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase px-2 py-0.5 lg:px-1.5 lg:py-0.5 2xl:px-2 rounded-full border-2 shrink-0 ${
                                    u.esCliente ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-600'
                                }`}>
                                    {u.esCliente ? 'Cliente' : 'Nuevo'}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>

            </>)}

            {botonesDesktop && <div className="hidden lg:block mt-1">{botonesDesktop}</div>}
        </div>
    );
}
