/**
 * TabClientes.tsx
 * ================
 * Tab de selección de clientes para ofertas exclusivas.
 * 2 dropdowns (nivel + actividad) + selector con checkboxes + chips.
 *
 * TOKENS: TC-4 Anatomía de Dropdowns
 * - Panel: rounded-xl border-2 border-slate-300 shadow-lg py-1 mt-1.5
 * - Ítems: font-semibold, activo bg-indigo-100 text-indigo-700
 * - Círculo: w-5 h-5 rounded-full, activo bg-indigo-500
 * - Botón: sin selección bg-white, con selección bg-indigo-100 border-indigo-300
 * - Chevron: rotate-180 cuando abierto
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/TabClientes.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X, Users, ChevronDown, Check, Info } from 'lucide-react';
import { Spinner } from '../../../../components/ui/Spinner';

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
            {/* Botón */}
            <button
                type="button"
                data-testid={testId}
                onClick={() => setAbierto(!abierto)}
                className={`w-full h-11 lg:h-10 2xl:h-11 flex items-center justify-between pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer ${
                    tieneSeleccion
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
            >
                <span className="truncate">{labelActivo}</span>
                <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel */}
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
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {/* Círculo indicador */}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                valor === op.valor ? 'bg-indigo-500' : 'bg-slate-200'
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

export function TabClientes({ clientes, cargando, clientesSeleccionados, onToggleCliente, onSeleccionarTodos, onLimpiarSeleccion }: TabClientesProps) {
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

    return (
        <div className="p-4 lg:p-3 2xl:p-4 flex flex-col gap-3 lg:gap-2.5 2xl:gap-3 h-full">

            {/* Filtros: búsqueda + dropdowns */}
            <div className="flex flex-col gap-2 lg:gap-1.5 2xl:gap-2">
                {/* Fila: búsqueda + dropdowns */}
                <div className="flex flex-col lg:flex-row gap-2 lg:gap-1.5 2xl:gap-2">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" />
                        <input
                            data-testid="input-buscar-cliente"
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full h-11 lg:h-10 2xl:h-11 pl-9 lg:pl-8 2xl:pl-9 pr-3 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                    </div>

                    {/* Dropdowns — ocupan espacio horizontal completo */}
                    <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                        <DropdownFiltro
                            opciones={NIVELES}
                            valor={filtroNivel}
                            onChange={setFiltroNivel}
                            testId="dropdown-nivel"
                            expandir
                        />
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

            {/* Aviso informativo */}
            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3.5 py-2.5 lg:px-3 lg:py-2 2xl:px-3.5 2xl:py-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <Info className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600 shrink-0" />
                <p className="text-sm lg:text-[11px] 2xl:text-sm text-blue-700 font-semibold">
                    Cada cliente recibirá un código único al crear la oferta.
                </p>
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
                            className={`w-full flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 p-3 lg:p-1.5 2xl:p-3 text-left cursor-pointer border-b border-slate-300 last:border-b-0 ${
                                clientesSeleccionados.includes(cliente.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                        >
                            {/* Checkbox — TC-4 círculo indicador */}
                            <div className={`w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 rounded-full flex items-center justify-center shrink-0 ${
                                clientesSeleccionados.includes(cliente.id) ? 'bg-indigo-500' : 'bg-slate-200'
                            }`}>
                                {clientesSeleccionados.includes(cliente.id) && (
                                    <Check className="w-3 h-3 lg:w-2 lg:h-2 2xl:w-3 2xl:h-3 text-white" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-800 truncate">{cliente.nombre}</p>
                                <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                                    {cliente.telefono && <>{cliente.telefono} • </>}{cliente.totalVisitas} visitas
                                </p>
                            </div>

                            {/* Nivel badge */}
                            <span className={`text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase px-2 py-0.5 lg:px-1.5 lg:py-0.5 2xl:px-2 rounded-full border-2 shrink-0 ${
                                cliente.nivelActual.toLowerCase() === 'oro' ? 'bg-amber-100 border-amber-300 text-amber-700'
                                : cliente.nivelActual.toLowerCase() === 'plata' ? 'bg-slate-100 border-slate-300 text-slate-700'
                                : 'bg-orange-50 border-orange-200 text-orange-600'
                            }`}>
                                {cliente.nivelActual}
                            </span>
                        </button>
                    ))
                )}
            </div>

        </div>
    );
}
