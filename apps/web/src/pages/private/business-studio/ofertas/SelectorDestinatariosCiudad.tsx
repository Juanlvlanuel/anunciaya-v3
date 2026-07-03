/**
 * ============================================================================
 * SELECTOR: Destinatarios de la ciudad (cuerpo reutilizable, controlado)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/SelectorDestinatariosCiudad.tsx
 *
 * PROPÓSITO:
 * Cuerpo del selector de destinatarios: buscador + botones rápidos
 * "Clientes"/"Todos" + lista combinada (usuarios de la ciudad + tus clientes,
 * con badge "Cliente"; los seleccionados suben al inicio).
 *
 * Es CONTROLADO: la selección vive en el padre (`seleccionados` + `onToggle`).
 * Lo usan:
 *   - `ModalDestinatariosCiudad` (compartir oferta / enviar cupón a más).
 *   - El tab "Enviar a" de creación de cupón (`ModalOferta` → `TabClientes`).
 *
 * Fuente: `useUsuariosCiudad` (GET /api/ofertas/buscar-usuarios) + tus clientes
 * (`useClientesSelector`). `esCliente` se deriva de la lista real de clientes.
 */

import { useState, useMemo, type ReactNode } from 'react';
import { Search, Check } from 'lucide-react';
import { Spinner } from '../../../../components/ui/Spinner';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import { useUsuariosCiudad } from '../../../../hooks/queries/useOfertas';
import { useClientesSelector } from '../../../../hooks/queries/useClientes';
import type { UsuarioBuscadoCupon } from '../../../../services/ofertasService';

interface SelectorDestinatariosCiudadProps {
    seleccionados: Set<string>;
    /** Agrega (`activar=true`) o quita (`false`) uno o varios ids de la selección. */
    onToggle: (ids: string[], activar: boolean) => void;
    /** Botones de acción para desktop (Cancelar/Enviar), al pie del selector. */
    botonesDesktop?: ReactNode;
}

export function SelectorDestinatariosCiudad({ seleccionados, onToggle, botonesDesktop }: SelectorDestinatariosCiudadProps) {
    const [busqueda, setBusqueda] = useState('');

    const usuariosQuery = useUsuariosCiudad();
    const clientesQuery = useClientesSelector();

    const usuariosCiudad: UsuarioBuscadoCupon[] = useMemo(() => usuariosQuery.data ?? [], [usuariosQuery.data]);
    const clientesNegocio = useMemo(() => clientesQuery.data ?? [], [clientesQuery.data]);
    const clientesIds = useMemo(() => new Set(clientesNegocio.map((c) => c.id)), [clientesNegocio]);

    // Lista combinada: usuarios de la ciudad + TUS clientes (aunque no tengan
    // ciudad asignada). `esCliente` se deriva de la lista real de clientes.
    const todos: UsuarioBuscadoCupon[] = useMemo(() => {
        const map = new Map<string, UsuarioBuscadoCupon>();
        for (const u of usuariosCiudad) {
            map.set(u.id, { ...u, esCliente: clientesIds.has(u.id) });
        }
        for (const c of clientesNegocio) {
            if (!map.has(c.id)) {
                map.set(c.id, { id: c.id, nombre: c.nombre, apellidos: '', avatarUrl: c.avatarUrl ?? null, esCliente: true });
            }
        }
        return Array.from(map.values());
    }, [usuariosCiudad, clientesNegocio, clientesIds]);

    const clientes = useMemo(() => todos.filter((u) => clientesIds.has(u.id)), [todos, clientesIds]);

    // Filtro local + orden: los seleccionados suben al principio (sort estable).
    const visibles = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        const filtrados = t
            ? todos.filter((u) => `${u.nombre} ${u.apellidos}`.toLowerCase().includes(t))
            : todos;
        return [...filtrados].sort(
            (a, b) => (seleccionados.has(a.id) ? 0 : 1) - (seleccionados.has(b.id) ? 0 : 1)
        );
    }, [todos, busqueda, seleccionados]);

    const todosSeleccionados = todos.length > 0 && todos.every((u) => seleccionados.has(u.id));
    const clientesSeleccionados = clientes.length > 0 && clientes.every((u) => seleccionados.has(u.id));

    const toggleUno = (u: UsuarioBuscadoCupon) => onToggle([u.id], !seleccionados.has(u.id));
    const toggleTodos = () => onToggle(todos.map((u) => u.id), !todosSeleccionados);
    const toggleClientes = () => onToggle(clientes.map((u) => u.id), !clientesSeleccionados);

    return (
        <div className="flex-1 flex flex-col min-h-0">

            {/* ── Buscador + selección rápida (fijo) ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 flex flex-col gap-2 border-b border-slate-200 bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        data-testid="input-directorio"
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar usuario de tu ciudad..."
                        className="w-full h-11 lg:h-10 2xl:h-11 pl-9 pr-3 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-semibold shrink-0">Seleccionar:</span>
                    <button
                        type="button"
                        data-testid="btn-sel-clientes"
                        onClick={toggleClientes}
                        disabled={clientes.length === 0}
                        className={`px-2.5 py-1 rounded-full text-xs lg:text-[11px] 2xl:text-xs font-bold border-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            clientesSeleccionados
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400'
                        }`}
                    >
                        Clientes{clientes.length ? ` (${clientes.length})` : ''}
                    </button>
                    <button
                        type="button"
                        data-testid="btn-sel-todos"
                        onClick={toggleTodos}
                        disabled={todos.length === 0}
                        className={`px-2.5 py-1 rounded-full text-xs lg:text-[11px] 2xl:text-xs font-bold border-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            todosSeleccionados
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400'
                        }`}
                    >
                        Todos{todos.length ? ` (${todos.length})` : ''}
                    </button>
                </div>
            </div>

            {/* ── Lista (scroll) ── */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                {(usuariosQuery.isPending || clientesQuery.isPending) ? (
                    <div className="p-6 text-center"><Spinner tamanio="sm" /></div>
                ) : visibles.length === 0 ? (
                    <p className="p-6 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium text-center">
                        {busqueda.trim()
                            ? `Sin resultados para “${busqueda.trim()}”`
                            : 'No hay usuarios en tu ciudad todavía'}
                    </p>
                ) : (
                    <>
                        {visibles.map((u) => {
                            const sel = seleccionados.has(u.id);
                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    data-testid={`directorio-persona-${u.id}`}
                                    onClick={() => toggleUno(u)}
                                    className={`w-full flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-1.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-1.5 text-left cursor-pointer border-b border-slate-200 last:border-b-0 ${
                                        sel ? 'bg-blue-50' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full flex items-center justify-center shrink-0 ${
                                        sel ? 'bg-blue-500' : 'bg-slate-200'
                                    }`}>
                                        {sel && <Check className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white" />}
                                    </div>
                                    <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {u.avatarUrl ? (
                                            <img src={u.avatarUrl} alt={u.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-indigo-700">{obtenerIniciales(`${u.nombre} ${u.apellidos}`)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm lg:text-[13px] 2xl:text-sm font-semibold text-slate-800 truncate">{u.nombre} {u.apellidos}</p>
                                    </div>
                                    {u.esCliente && (
                                        <span className="text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase px-2 py-0.5 rounded-full border-2 shrink-0 bg-emerald-50 border-emerald-200 text-emerald-700">
                                            Cliente
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {todos.length >= 500 && (
                            <p className="px-3 py-2 text-xs lg:text-[10px] 2xl:text-xs text-slate-500 text-center">
                                Mostrando los primeros 500 usuarios de tu ciudad.
                            </p>
                        )}
                    </>
                )}
            </div>

            {botonesDesktop && <div className="hidden lg:block px-4 lg:px-3 2xl:px-4 py-2.5 border-t border-slate-200 bg-white shrink-0">{botonesDesktop}</div>}
        </div>
    );
}

export default SelectorDestinatariosCiudad;
