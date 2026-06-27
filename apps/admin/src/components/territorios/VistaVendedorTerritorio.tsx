/**
 * VistaVendedorTerritorio.tsx
 * ===========================
 * Vista "Mi territorio" del VENDEDOR (Territorios · G.2). El vendedor ve SOLO su zona asignada
 * (mapa enmascarado + paneo limitado) y sus MARCAS personales: pines de color por estado
 * (Visitado / Interesado / Cerrado / Sin interés) con una nota escrita por él.
 *
 * Mismo armazón responsive que la vista de gestión (SeccionTerritorios):
 *   - Móvil VERTICAL: mapa a pantalla completa + barra flotante (Agregar marca) + hoja con "peek"
 *     (filtros asomados; al subir, la lista). En "modo mapa" se ocultan header/nav del shell.
 *   - Móvil HORIZONTAL: mapa de fondo + panel de gestión 1/3 a la derecha, ocultable con tirador.
 *   - Escritorio: mapa + columna derecha de 288px.
 * El editor de una marca (estado + nota) aparece como mini-tarjeta SOBRE el mapa.
 *
 * Ubicación: apps/admin/src/components/territorios/VistaVendedorTerritorio.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Trash2, X, Store, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { useZonas, useMisMarcas, useNegociosMapa, useCrearMarca, useEditarMarca, useMoverMarca, useBorrarMarca } from '../../hooks/queries/useTerritoriosAdmin';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { MapaMarcas, COLOR_TIPO, ETIQUETA_TIPO, fechaCorta } from './MapaMarcas';
import { HojaMovil } from './HojaMovil';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import type { TipoMarca } from '../../services/territoriosService';

const TIPOS: TipoMarca[] = ['visitado', 'interesado', 'cerrado', 'sin_interes'];

/** Estado del editor de una marca (recién creada o seleccionada). */
interface MarcaEnEdicion {
    id: string | null; // null = recién creada, esperando el id real del servidor (editor ya abierto)
    tipo: TipoMarca;
    nota: string;
}

export function VistaVendedorTerritorio() {
    const { data: zonas = [], isLoading: cargandoZonas } = useZonas({});
    const { data: marcas = [] } = useMisMarcas();
    const { data: negocios = [] } = useNegociosMapa();
    const crear = useCrearMarca();
    const editar = useEditarMarca();
    const mover = useMoverMarca();
    const borrar = useBorrarMarca();

    const esEscritorio = useEsEscritorio();
    const [modoAgregar, setModoAgregar] = useState(false);
    const [editando, setEditando] = useState<MarcaEnEdicion | null>(null);
    const [confirmarBorrar, setConfirmarBorrar] = useState(false);
    const [filtro, setFiltro] = useState<TipoMarca | null>(null);
    const [mostrarNegocios, setMostrarNegocios] = useState(true);
    // Hoja móvil (peek/expandida) y panel derecho horizontal (visible/oculto).
    const [hojaExpandida, setHojaExpandida] = useState(false);
    const [panelAbierto, setPanelAbierto] = useState(true);

    // Orientación: en HORIZONTAL ocultamos header + nav SIEMPRE (mapa total); en vertical siguen a la hoja.
    const [esHorizontal, setEsHorizontal] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
    );
    useEffect(() => {
        const mql = window.matchMedia('(orientation: landscape)');
        const alCambiar = (e: MediaQueryListEvent) => setEsHorizontal(e.matches);
        mql.addEventListener('change', alCambiar);
        setEsHorizontal(mql.matches);
        return () => mql.removeEventListener('change', alCambiar);
    }, []);

    // Al agregar (tocando el mapa) o editar (mini-form abierto) la hoja se colapsa a peek para no tapar.
    useEffect(() => { if (modoAgregar || editando) setHojaExpandida(false); }, [modoAgregar, editando]);

    // Cerrar el editor de la marca al hacer click/tap FUERA de él. Usamos 'click' (no 'pointerdown')
    // a propósito: arrastrar el mapa (pan) no dispara click, así que panear no cierra el editor; solo
    // un tap fuera lo cierra. El click en otro pin no llega aquí (el pin hace stopPropagation).
    const formMarcaRef = useRef<HTMLDivElement>(null);
    // Margen para ignorar el click-fuera justo tras CREAR: el mismo tap que crea la marca (o su "ghost
    // click" en táctil) llegaría al listener y cerraría el editor recién abierto. Lo ignoramos un instante.
    const ignorarCierreRef = useRef(false);
    const hayEditor = !!editando;
    useEffect(() => {
        // Mientras el diálogo "Borrar marca" esté abierto no escuchamos: un click en él cerraría el editor.
        if (!hayEditor || confirmarBorrar) return;
        const alClickFuera = (e: MouseEvent) => {
            if (ignorarCierreRef.current) return; // el click del gesto que acaba de crear la marca
            if (formMarcaRef.current && !formMarcaRef.current.contains(e.target as Node)) setEditando(null);
        };
        document.addEventListener('click', alClickFuera);
        return () => document.removeEventListener('click', alClickFuera);
    }, [hayEditor, confirmarBorrar]);

    // "Modo mapa" (móvil): en vertical header/nav siguen a la hoja; en horizontal se ocultan siempre.
    const setNavVisible = useScrollPanel((s) => s.setNavVisible);
    const setHeaderVisible = useScrollPanel((s) => s.setHeaderVisible);
    useEffect(() => {
        if (esEscritorio) return;
        const barrasVisibles = esHorizontal ? false : hojaExpandida;
        setNavVisible(barrasVisibles);
        setHeaderVisible(barrasVisibles);
        return () => { setNavVisible(true); setHeaderVisible(true); };
    }, [esEscritorio, esHorizontal, hojaExpandida, setNavVisible, setHeaderVisible]);

    // Filtros excluyentes: un solo estado a la vez (clic en el activo lo quita → muestra todas).
    const seleccionarFiltro = (t: TipoMarca) => setFiltro((f) => (f === t ? null : t));

    const sinZona = !cargandoZonas && zonas.length === 0;

    const abrirMarca = (id: string) => {
        const m = marcas.find((x) => x.id === id);
        if (!m) return;
        // Ignora el click-fuera del propio gesto que abre el editor (el botón "Editar" de la lista no hace
        // stopPropagation como el pin → sin esto, su click cerraría el editor recién abierto).
        ignorarCierreRef.current = true;
        window.setTimeout(() => { ignorarCierreRef.current = false; }, 400);
        setModoAgregar(false);
        setFoco(null); // el resalte pasa a ser el de la marca en edición
        setEditando({ id: m.id, tipo: m.tipo, nota: m.nota ?? '' });
    };

    // "Ver en el mapa": centra + acerca + RESALTA la marca SIN abrir el editor. Colapsa la hoja.
    const [foco, setFoco] = useState<{ id: string; coords: [number, number]; nonce: number } | null>(null);
    const verMarca = (m: { id: string; lng: number; lat: number }) => {
        setHojaExpandida(false);
        setFoco((f) => ({ id: m.id, coords: [m.lng, m.lat], nonce: (f?.nonce ?? 0) + 1 }));
    };

    const alAgregarMarca = (lat: number, lng: number) => {
        setModoAgregar(false);
        setFiltro(null); // la marca nueva siempre visible (no la oculta un filtro activo)
        setFoco(null);   // el resalte pasa a la marca nueva
        // Ignora el click-fuera del propio gesto que crea (si no, cerraría el editor recién abierto).
        ignorarCierreRef.current = true;
        window.setTimeout(() => { ignorarCierreRef.current = false; }, 400);
        setEditando({ id: null, tipo: 'visitado', nota: '' }); // abre el editor AL INSTANTE (sin esperar al servidor)
        crear.mutate(
            { lat, lng, tipo: 'visitado' },
            {
                // Completa el id real cuando responde el servidor, sin reabrir el editor. Solo si el
                // editor sigue en la marca pendiente (no si el usuario ya abrió otra o lo cerró).
                onSuccess: (data) => setEditando((p) => (p && p.id === null ? { ...p, id: data.id } : p)),
            },
        );
    };

    const guardarMarca = () => {
        if (!editando?.id) return; // aún sin id real (servidor respondiendo): el botón está deshabilitado
        editar.mutate(
            { id: editando.id, datos: { tipo: editando.tipo, nota: editando.nota.trim() || null } },
            { onSuccess: () => setEditando(null) },
        );
    };

    const borrarMarca = () => {
        if (!editando?.id) return;
        borrar.mutate(editando.id); // optimista: el pin se va al instante (revierte si falla)
        setConfirmarBorrar(false);  // cerramos diálogo + editor de inmediato, sin esperar al servidor
        setEditando(null);
    };

    const marcasOrdenadas = useMemo(
        () => [...marcas].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
        [marcas],
    );
    const marcasFiltradas = useMemo(
        () => (filtro === null ? marcasOrdenadas : marcasOrdenadas.filter((m) => m.tipo === filtro)),
        [marcasOrdenadas, filtro],
    );

    // ── Piezas de UI ───────────────────────────────────────────────────────────

    const elMapa = (
        <MapaMarcas
            zonas={zonas}
            marcas={marcasFiltradas}
            negocios={mostrarNegocios ? negocios : []}
            modoAgregar={modoAgregar}
            onAgregarMarca={alAgregarMarca}
            onClicMarca={abrirMarca}
            onMoverMarca={(id, lat, lng) => mover.mutate({ id, lat, lng })}
            marcaSeleccionadaId={editando?.id ?? foco?.id ?? null}
            mapaFijo={!esEscritorio && !esHorizontal}
            enfocarMarca={foco?.coords ?? null}
            enfocarNonce={foco?.nonce ?? 0}
        />
    );

    // Chips de filtro por estado. En la hoja móvil (`carrusel`) van en 1 sola fila deslizable; en el
    // panel de PC se acomodan en varias filas (flex-wrap) para verse completos sin scroll.
    const piezaFiltros = (carrusel: boolean) => (!editando && marcas.length > 0 ? (
        <div className={carrusel
            ? 'flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'flex flex-wrap gap-1'}>
            {TIPOS.map((t) => {
                const activo = filtro === t;
                return (
                    <button
                        key={t}
                        type="button"
                        data-testid={`filtro-${t}`}
                        onClick={() => seleccionarFiltro(t)}
                        aria-pressed={activo}
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] transition ${
                            activo ? 'border-marca bg-marca-suave font-medium text-texto' : 'border-borde text-texto-3 hover:bg-superficie-2'
                        }`}
                    >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                        {ETIQUETA_TIPO[t]}
                    </button>
                );
            })}
        </div>
    ) : null);

    // Toggle de "Mis negocios" (FAB). En la hoja vertical va como FAB que sube/baja con el modal;
    // en los otros layouts, flotante sobre el mapa.
    const fabNegocios = (
        <Tooltip text={mostrarNegocios ? 'Ocultar negocios' : 'Mis negocios'} position="right">
            <button
                type="button"
                data-testid="toggle-negocios"
                onClick={() => setMostrarNegocios((v) => !v)}
                aria-pressed={mostrarNegocios}
                aria-label={mostrarNegocios ? 'Ocultar mis negocios' : 'Mostrar mis negocios'}
                className={`grid h-[52px] w-[52px] place-items-center rounded-full border shadow-tarjeta-panel transition ${mostrarNegocios ? 'border-marca bg-marca text-white' : 'border-borde bg-superficie text-texto-3'}`}
            >
                <Store size={22} />
            </button>
        </Tooltip>
    );
    const botonNegocios = (posicion: string) => (!editando ? <div className={`absolute z-10 ${posicion}`}>{fabNegocios}</div> : null);

    // FAB "Agregar marca" (+, o X para cancelar): para la hoja vertical, abajo a la derecha.
    const fabAgregar = (
        <button
            type="button"
            data-testid="marca-agregar"
            onClick={() => { setEditando(null); setModoAgregar((v) => !v); }}
            disabled={sinZona}
            aria-label={modoAgregar ? 'Cancelar' : 'Agregar marca'}
            className="grid h-[52px] w-[52px] place-items-center rounded-full bg-marca text-white shadow-tarjeta-panel transition hover:opacity-90 disabled:bg-marca-suave disabled:text-marca"
        >
            {modoAgregar ? <X size={24} /> : <Plus size={26} />}
        </button>
    );

    // Editor de la marca seleccionada/creada: mini-tarjeta SOBRE el mapa (estado + nota + acciones).
    const fechaCreacion = editando ? fechaCorta(marcas.find((m) => m.id === editando.id)?.createdAt ?? null) : '';
    const miniFormMarca = editando ? (
        <div ref={formMarcaRef} className="absolute left-1/2 top-3 z-30 w-[min(420px,calc(100%-1.5rem))] -translate-x-1/2 rounded-[14px] border border-borde bg-superficie p-3 shadow-tarjeta-panel" data-testid="form-marca">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-[13px] font-medium text-texto-3">{fechaCreacion ? `Marcado el ${fechaCreacion}` : 'Nueva marca'}</span>
                <button type="button" onClick={() => setEditando(null)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-texto-3 transition hover:bg-superficie-2">
                    <X size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-1">
                {TIPOS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        data-testid={`marca-tipo-${t}`}
                        onClick={() => setEditando((p) => (p ? { ...p, tipo: t } : p))}
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1.5 text-[13px] transition ${
                            editando.tipo === t ? 'border-marca bg-marca-suave font-medium text-texto' : 'border-borde text-texto-2 hover:bg-superficie-2'
                        }`}
                    >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[t] }} />
                        {ETIQUETA_TIPO[t]}
                    </button>
                ))}
            </div>
            <textarea
                data-testid="marca-nota"
                value={editando.nota}
                onChange={(e) => setEditando((p) => (p ? { ...p, nota: e.target.value } : p))}
                placeholder="Nota (ej. Volver el martes, hablar con el dueño…)"
                rows={4}
                className="mt-2 w-full resize-none rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[15px] text-texto outline-none focus:border-marca"
            />
            <div className="mt-2 flex gap-2">
                <button
                    type="button"
                    data-testid="marca-borrar"
                    onClick={() => setConfirmarBorrar(true)}
                    aria-label="Borrar marca"
                    className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-borde px-3 py-2 text-[15px] text-texto-3 transition hover:bg-peligro-suave hover:text-peligro"
                >
                    <Trash2 size={16} /> Borrar
                </button>
                <button
                    type="button"
                    data-testid="marca-guardar"
                    onClick={guardarMarca}
                    disabled={editar.isPending || !editando.id}
                    className="flex-1 rounded-[10px] bg-marca px-3 py-2 text-[15px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                >
                    Guardar
                </button>
            </div>
        </div>
    ) : null;

    // Lista de mis marcas (en el panel/hoja).
    const piezaLista = (
        <div className="flex min-h-0 flex-1 flex-col">
            {sinZona ? (
                <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                    Aún no tienes una zona asignada. Tu gerente te asignará una.
                </div>
            ) : marcasOrdenadas.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                    Aún no tienes marcas. Usa "Agregar marca" y toca el mapa.
                </div>
            ) : marcasFiltradas.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-borde px-3 py-6 text-center text-[13px] text-texto-3">
                    Ninguna marca con ese filtro.
                </div>
            ) : (
                marcasFiltradas.map((m) => (
                    <div key={m.id} data-testid={`marca-item-${m.id}`} className="flex flex-col gap-1.5 border-b border-borde py-2.5 last:border-b-0">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TIPO[m.tipo] }} />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-texto">{ETIQUETA_TIPO[m.tipo]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[12.5px] text-texto-3">{m.nota || 'Sin nota'}</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <Tooltip text="Ver en el mapa">
                                    <button
                                        type="button"
                                        data-testid={`marca-ver-${m.id}`}
                                        onClick={() => verMarca(m)}
                                        aria-label="Ver marca en el mapa"
                                        style={{ backgroundColor: `${COLOR_TIPO[m.tipo]}1f`, color: COLOR_TIPO[m.tipo] }}
                                        className="grid h-10 w-10 place-items-center rounded-full transition hover:opacity-80"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Editar marca">
                                    <button
                                        type="button"
                                        data-testid={`marca-editar-${m.id}`}
                                        onClick={() => abrirMarca(m.id)}
                                        aria-label="Editar marca"
                                        className="grid h-10 w-10 place-items-center rounded-full bg-marca-suave text-marca transition hover:opacity-80"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // Contenido del panel de gestión (filtros + lista). `conBoton`: en HORIZONTAL el botón "Agregar
    // marca" vive en el panel (un FAB ahí quedaría tapado por el panel deslizable); en ESCRITORIO el
    // botón se vuelve un FAB sobre el mapa, así que el panel va sin él.
    // El "Agregar marca" ya NO vive en el panel: es un FAB sobre el mapa en todos los layouts.
    // `filtrosCarrusel`: en HORIZONTAL (panel angosto) los filtros van en 1 fila deslizable; en
    // ESCRITORIO con flex-wrap.
    const contenidoPanel = (filtrosCarrusel: boolean) => (
        <>
            {piezaFiltros(filtrosCarrusel)}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{piezaLista}</div>
        </>
    );

    // FAB "Agregar marca" sobre el mapa, con tooltip (escritorio). Tooltip a la izquierda porque va
    // pegado a la derecha. Se oculta con el editor abierto, igual que el FAB de negocios.
    const botonAgregarMapa = (posicion: string) => (!editando ? (
        <div className={`absolute z-10 ${posicion}`}>
            <Tooltip text={modoAgregar ? 'Cancelar' : 'Agregar marca'} position="left">{fabAgregar}</Tooltip>
        </div>
    ) : null);

    const dialogoBorrar = confirmarBorrar ? (
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
    ) : null;

    // ── Móvil HORIZONTAL: mapa de fondo + panel 1/3 a la derecha, ocultable ────
    if (!esEscritorio && esHorizontal) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-mi-territorio">
                <div className="absolute inset-0">
                    {elMapa}
                    {botonNegocios('bottom-3 left-3')}
                    {/* FAB de Agregar marca: sigue al panel — a su izquierda cuando está abierto, a la esquina al cerrarse. */}
                    {botonAgregarMapa(`bottom-3 transition-[right] duration-300 ${panelAbierto ? 'right-[calc(45%+0.75rem)]' : 'right-3'}`)}
                    {miniFormMarca}
                </div>
                <aside
                    className={`absolute inset-y-0 right-0 z-20 flex w-[45%] flex-col gap-2 border-l border-borde bg-superficie p-2.5 shadow-tarjeta-panel transition-transform duration-300 ${panelAbierto ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <button
                        type="button"
                        data-testid="mt-toggle-panel"
                        onClick={() => setPanelAbierto((v) => !v)}
                        aria-label={panelAbierto ? 'Ocultar panel' : 'Mostrar panel'}
                        className="absolute left-0 top-1/2 grid h-14 w-7 -translate-x-full -translate-y-1/2 place-items-center rounded-l-[12px] border border-r-0 border-borde bg-superficie text-texto-3 shadow-tarjeta-panel transition hover:text-marca"
                    >
                        {panelAbierto ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    {contenidoPanel(true)}
                </aside>
                {dialogoBorrar}
            </div>
        );
    }

    // ── Móvil VERTICAL: mapa a pantalla completa + barra flotante + hoja con peek ──
    if (!esEscritorio) {
        return (
            <div className="relative h-full w-full overflow-hidden" data-testid="seccion-mi-territorio">
                {/* Mapa FIJO al viewport: no se redimensiona cuando el header/nav del shell colapsan al
                    subir/bajar la hoja → la transición no provoca flash/estiramiento del canvas. El overlay
                    no captura eventos (pointer-events-none) para que los clics lleguen al mapa/controles. */}
                <div className="fixed inset-0 z-0">{elMapa}</div>
                <div className="pointer-events-none absolute inset-0 z-10 [&>*]:pointer-events-auto">{miniFormMarca}</div>

                {/* Instrucción al agregar (el FAB de Agregar/Cancelar vive en la hoja, abajo a la derecha).
                    No llega hasta la derecha (right-14) para no chocar con el zoom (top-right). */}
                {modoAgregar && !editando && (
                    <div className="absolute left-2 right-14 top-2 z-10 flex items-center justify-center gap-2 rounded-full border border-borde bg-superficie px-3.5 py-2 text-[12.5px] font-medium text-texto-2 shadow-tarjeta-panel">
                        <MapPin size={15} className="shrink-0 text-marca" />
                        <span>Toca el mapa para poner tu marca</span>
                    </div>
                )}

                <HojaMovil
                    expandida={hojaExpandida}
                    onExpandidaChange={setHojaExpandida}
                    resumen={piezaFiltros(true)}
                    altura="54%"
                    fabIzquierda={!editando ? fabNegocios : undefined}
                    fabDerecha={!editando ? fabAgregar : undefined}
                >
                    {piezaLista}
                </HojaMovil>

                {dialogoBorrar}
            </div>
        );
    }

    // ── Escritorio: mapa a la izquierda + columna derecha ──────────────────────
    return (
        <div className="flex h-full flex-col gap-3 lg:flex-row" data-testid="seccion-mi-territorio">
            <div className="relative min-h-[320px] min-w-0 flex-1">
                {elMapa}
                {botonNegocios('bottom-3 left-3')}
                {botonAgregarMapa('bottom-3 right-3')}
                {modoAgregar && !editando && (
                    <div className="absolute left-2 right-16 top-2 z-10 flex items-center justify-center gap-2 rounded-full border border-borde bg-superficie px-3.5 py-2 text-[12.5px] font-medium text-texto-2 shadow-tarjeta-panel">
                        <MapPin size={15} className="shrink-0 text-marca" />
                        <span>Toca el mapa para poner tu marca</span>
                    </div>
                )}
                {miniFormMarca}
            </div>
            <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72 lg:pr-3 lg:pt-3">
                {contenidoPanel(false)}
            </aside>
            {dialogoBorrar}
        </div>
    );
}

export default VistaVendedorTerritorio;
