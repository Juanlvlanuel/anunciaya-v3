/**
 * VistaVendedorTerritorio.tsx
 * ===========================
 * Vista "Mi territorio" del VENDEDOR (Territorios · G.2). El vendedor ve SOLO su zona asignada
 * (mapa enmascarado + paneo limitado) y sus MARCAS personales: pines de color por estado
 * (Visitado / Interesado / Cerrado / Sin interés) con una nota escrita por él. No ve datos de
 * gestión (nombres, reasignación, otras zonas) — solo su pedazo del mapa y sus herramientas.
 *
 * Columna derecha: botón "Agregar marca" + leyenda de estados; al seleccionar/crear una marca
 * se muestra el editor (estado + nota + guardar/borrar). El backend acota todo al vendedor.
 *
 * Ubicación: apps/admin/src/components/territorios/VistaVendedorTerritorio.tsx
 */

import { useMemo, useState } from 'react';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import { useZonas, useMisMarcas, useCrearMarca, useEditarMarca, useMoverMarca, useBorrarMarca } from '../../hooks/queries/useTerritoriosAdmin';
import { MapaMarcas, COLOR_TIPO, ETIQUETA_TIPO } from './MapaMarcas';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import type { TipoMarca } from '../../services/territoriosService';

const TIPOS: TipoMarca[] = ['visitado', 'interesado', 'cerrado', 'sin_interes'];

/** Estado del editor de una marca (recién creada o seleccionada). */
interface MarcaEnEdicion {
    id: string;
    tipo: TipoMarca;
    nota: string;
}

export function VistaVendedorTerritorio() {
    const { data: zonas = [], isLoading: cargandoZonas } = useZonas({});
    const { data: marcas = [] } = useMisMarcas();
    const crear = useCrearMarca();
    const editar = useEditarMarca();
    const mover = useMoverMarca();
    const borrar = useBorrarMarca();

    const [modoAgregar, setModoAgregar] = useState(false);
    const [editando, setEditando] = useState<MarcaEnEdicion | null>(null);
    const [confirmarBorrar, setConfirmarBorrar] = useState(false);

    const sinZona = !cargandoZonas && zonas.length === 0;

    const abrirMarca = (id: string) => {
        const m = marcas.find((x) => x.id === id);
        if (!m) return;
        setModoAgregar(false);
        setEditando({ id: m.id, tipo: m.tipo, nota: m.nota ?? '' });
    };

    const alAgregarMarca = (lat: number, lng: number) => {
        crear.mutate(
            { lat, lng, tipo: 'visitado' },
            {
                onSuccess: (data) => {
                    setModoAgregar(false);
                    setEditando({ id: data.id, tipo: 'visitado', nota: '' });
                },
            },
        );
    };

    const guardarMarca = () => {
        if (!editando) return;
        editar.mutate(
            { id: editando.id, datos: { tipo: editando.tipo, nota: editando.nota.trim() || null } },
            { onSuccess: () => setEditando(null) },
        );
    };

    const borrarMarca = () => {
        if (!editando) return;
        borrar.mutate(editando.id, {
            onSuccess: () => { setConfirmarBorrar(false); setEditando(null); },
        });
    };

    const marcasOrdenadas = useMemo(
        () => [...marcas].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
        [marcas],
    );

    return (
        <div className="flex h-full flex-col gap-3 lg:flex-row" data-testid="seccion-mi-territorio">
            {/* Mapa: solo su zona, lo más alto/ancho posible */}
            <div className="min-h-[320px] min-w-0 flex-1">
                <MapaMarcas
                    zonas={zonas}
                    marcas={marcas}
                    modoAgregar={modoAgregar}
                    onAgregarMarca={alAgregarMarca}
                    onClicMarca={abrirMarca}
                    onMoverMarca={(id, lat, lng) => mover.mutate({ id, lat, lng })}
                />
            </div>

            {/* Columna derecha: solo herramientas del vendedor */}
            <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72 lg:pt-3">
                <button
                    type="button"
                    data-testid="marca-agregar"
                    onClick={() => { setEditando(null); setModoAgregar((v) => !v); }}
                    disabled={sinZona}
                    className={`flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition disabled:opacity-40 ${
                        modoAgregar ? 'bg-marca-suave text-marca ring-1 ring-marca' : 'bg-marca text-white hover:opacity-90'
                    }`}
                >
                    {modoAgregar ? (<><X size={15} /> Cancelar</>) : (<><Plus size={15} /> Agregar marca</>)}
                </button>
                {modoAgregar && (
                    <p className="shrink-0 rounded-[10px] bg-superficie-2 px-3 py-2 text-[12px] text-texto-3">
                        Toca el mapa donde quieras poner la marca.
                    </p>
                )}

                {editando ? (
                    /* Editor de la marca seleccionada */
                    <div className="flex shrink-0 flex-col gap-2.5 rounded-[12px] border border-borde bg-superficie-2 p-3" data-testid="form-marca">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[14px] font-semibold text-texto">Marca</h2>
                            <button type="button" onClick={() => setEditando(null)} className="grid h-7 w-7 place-items-center rounded-full text-texto-3 transition hover:bg-superficie">
                                <X size={15} />
                            </button>
                        </div>
                        {/* Estado (color del pin) */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-texto-3">Estado</span>
                            <div className="grid grid-cols-2 gap-1.5">
                                {TIPOS.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        data-testid={`marca-tipo-${t}`}
                                        onClick={() => setEditando((p) => (p ? { ...p, tipo: t } : p))}
                                        className={`flex items-center gap-1.5 rounded-[9px] border px-2 py-1.5 text-[12.5px] transition ${
                                            editando.tipo === t ? 'border-marca bg-marca-suave text-texto' : 'border-borde text-texto-2 hover:bg-superficie'
                                        }`}
                                    >
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                                        {ETIQUETA_TIPO[t]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Nota personal */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-texto-3">Nota</span>
                            <textarea
                                data-testid="marca-nota"
                                value={editando.nota}
                                onChange={(e) => setEditando((p) => (p ? { ...p, nota: e.target.value } : p))}
                                placeholder="Ej. Volver el martes, hablar con el dueño…"
                                rows={3}
                                className="w-full resize-none rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none focus:border-marca"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                data-testid="marca-borrar"
                                onClick={() => setConfirmarBorrar(true)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-borde text-texto-3 transition hover:bg-peligro-suave hover:text-peligro"
                                title="Borrar marca"
                            >
                                <Trash2 size={15} />
                            </button>
                            <button
                                type="button"
                                data-testid="marca-guardar"
                                onClick={guardarMarca}
                                disabled={editar.isPending}
                                className="flex-1 rounded-[10px] bg-marca px-3 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Leyenda de estados */}
                        <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 rounded-[10px] border border-borde bg-superficie px-3 py-2">
                            {TIPOS.map((t) => (
                                <span key={t} className="flex items-center gap-1.5 text-[11.5px] text-texto-3">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                                    {ETIQUETA_TIPO[t]}
                                </span>
                            ))}
                        </div>

                        {/* Lista de mis marcas */}
                        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                            {sinZona ? (
                                <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                                    Aún no tienes una zona asignada. Tu gerente te asignará una.
                                </div>
                            ) : marcasOrdenadas.length === 0 ? (
                                <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                                    Aún no tienes marcas. Usa "Agregar marca" y toca el mapa.
                                </div>
                            ) : (
                                marcasOrdenadas.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        data-testid={`marca-item-${m.id}`}
                                        onClick={() => abrirMarca(m.id)}
                                        className="flex items-start gap-2 rounded-[10px] border border-borde bg-superficie p-2.5 text-left transition hover:bg-superficie-2"
                                    >
                                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ backgroundColor: COLOR_TIPO[m.tipo] }}>
                                            <MapPin size={12} className="text-white" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[12.5px] font-medium text-texto">{ETIQUETA_TIPO[m.tipo]}</span>
                                            <span className="block truncate text-[12px] text-texto-3">{m.nota || 'Sin nota'}</span>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </aside>

            {confirmarBorrar && (
                <DialogoConfirmar
                    abierto
                    variante="danger"
                    titulo="Borrar marca"
                    mensaje="Se eliminará esta marca y su nota. Esta acción no se puede deshacer."
                    textoConfirmar="Borrar"
                    cargando={borrar.isPending}
                    onCerrar={() => setConfirmarBorrar(false)}
                    onConfirmar={borrarMarca}
                />
            )}
        </div>
    );
}

export default VistaVendedorTerritorio;
