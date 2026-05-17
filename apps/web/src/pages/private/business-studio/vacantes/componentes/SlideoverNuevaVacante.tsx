/**
 * SlideoverNuevaVacante.tsx
 * ===========================
 * Slideover desde la derecha para crear o editar una vacante.
 *
 * Maneja state local, validación cliente y dispara `onSubmit` (el padre
 * conecta a React Query). Soporta dos modos:
 *
 *   - 'crear'                       → form en blanco
 *   - { tipo: 'editar', vacante }   → pre-poblado con la vacante actual
 *
 * Patrón consistente con ModalArticulo / ModalOferta de Business Studio
 * (backdrop oscuro + panel 720px desde la derecha + footer sticky).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/SlideoverNuevaVacante.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Briefcase,
    Check,
    Clock,
    X,
} from 'lucide-react';
import {
    DIAS_ORDEN,
    DIA_CORTO,
    TIPO_EMPLEO_LABEL,
    TIPO_EMPLEO_SUBLABEL,
    MODALIDAD_LABEL,
    MODALIDAD_SUBLABEL,
    validarVacante,
    esFormularioVacanteValido,
} from './helpers';
import type {
    CrearVacanteInput,
    ActualizarVacanteInput,
    DiaSemanaCodigo,
    ModalidadServicio,
    PrecioServicio,
    TipoEmpleo,
    Vacante,
} from '../../../../../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Versión del esquema de confirmaciones legales. */
const VERSION_CONFIRMACIONES = 'v1-2026-05-17';

/**
 * Coordenadas fallback de Puerto Peñasco. Se usan cuando la sucursal seleccionada
 * no expone latitud/longitud (los endpoints actuales de sucursales no las traen).
 *
 * TODO: cuando el backend de sucursales exponga lat/lng en el endpoint
 * `/negocios/:negocioId/sucursales`, reemplazar este fallback por las
 * coordenadas reales de la sucursal seleccionada.
 */
const FALLBACK_PENASCO = {
    lat: 31.3145,
    lng: -113.5455,
    ciudad: 'Puerto Peñasco',
} as const;

/** Subset de UI para el selector de unidad del salario. */
type UnidadSalario = 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto';

// =============================================================================
// TIPOS PÚBLICOS
// =============================================================================

export interface SucursalOpcion {
    id: string;
    nombre: string;
    esPrincipal: boolean;
}

export type ModoSlideover =
    | 'crear'
    | { tipo: 'editar'; vacante: Vacante };

interface SlideoverNuevaVacanteProps {
    abierto: boolean;
    modo: ModoSlideover;
    sucursales: SucursalOpcion[];
    enviando?: boolean;
    onClose: () => void;
    onSubmitCrear: (input: CrearVacanteInput) => Promise<void>;
    onSubmitEditar: (id: string, cambios: ActualizarVacanteInput) => Promise<void>;
}

// =============================================================================
// HELPERS LOCALES
// =============================================================================

function unidadDesdePrecio(precio: PrecioServicio): UnidadSalario {
    switch (precio.kind) {
        case 'rango':
            return 'mes-rango';
        case 'mensual':
            return 'mes-fijo';
        case 'hora':
            return 'hora';
        case 'fijo':
            return 'proyecto';
        case 'a-convenir':
            return 'mes-rango';
    }
}

function montoMinDesdePrecio(precio: PrecioServicio): string {
    switch (precio.kind) {
        case 'rango':
            return String(precio.min);
        case 'mensual':
        case 'hora':
        case 'fijo':
            return String(precio.monto);
        case 'a-convenir':
            return '';
    }
}

function montoMaxDesdePrecio(precio: PrecioServicio): string {
    if (precio.kind === 'rango') return String(precio.max);
    return '';
}

function unidadSugerida(tipoEmpleo: TipoEmpleo): UnidadSalario {
    if (tipoEmpleo === 'por-proyecto') return 'proyecto';
    if (tipoEmpleo === 'eventual') return 'hora';
    return 'mes-rango';
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SlideoverNuevaVacante({
    abierto,
    modo,
    sucursales,
    enviando = false,
    onClose,
    onSubmitCrear,
    onSubmitEditar,
}: SlideoverNuevaVacanteProps) {
    const esEdicion = typeof modo === 'object' && modo.tipo === 'editar';
    const vacanteInicial = esEdicion ? modo.vacante : null;

    // ===========================================================================
    // ESTADO LOCAL
    // ===========================================================================

    const [sucursalId, setSucursalId] = useState<string>('');
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tipoEmpleo, setTipoEmpleo] = useState<TipoEmpleo>('tiempo-completo');
    const [modalidad, setModalidad] =
        useState<ModalidadServicio>('presencial');

    // salario
    const [aConvenir, setAConvenir] = useState(false);
    const [unidad, setUnidad] = useState<UnidadSalario>('mes-rango');
    const [montoMin, setMontoMin] = useState('');
    const [montoMax, setMontoMax] = useState('');

    // tags
    const [requisitos, setRequisitos] = useState<string[]>([]);
    const [reqInput, setReqInput] = useState('');
    const [beneficios, setBeneficios] = useState<string[]>([]);
    const [benInput, setBenInput] = useState('');

    // horario / días
    const [horario, setHorario] = useState('');
    const [dias, setDias] = useState<DiaSemanaCodigo[]>([]);

    // confirmaciones legales
    const [confirms, setConfirms] = useState({
        real: false,
        legal: false,
        coord: false,
    });

    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // ===========================================================================
    // SINCRONIZAR STATE AL ABRIR
    // ===========================================================================

    useEffect(() => {
        if (!abierto) return;

        if (esEdicion && vacanteInicial) {
            const v = vacanteInicial;
            setSucursalId(v.sucursalId ?? sucursales[0]?.id ?? '');
            setTitulo(v.titulo);
            setDescripcion(v.descripcion);
            setTipoEmpleo(v.tipoEmpleo ?? 'tiempo-completo');
            setModalidad(v.modalidad);

            const esAConvenir = v.precio.kind === 'a-convenir';
            setAConvenir(esAConvenir);
            setUnidad(esAConvenir ? 'mes-rango' : unidadDesdePrecio(v.precio));
            setMontoMin(esAConvenir ? '' : montoMinDesdePrecio(v.precio));
            setMontoMax(esAConvenir ? '' : montoMaxDesdePrecio(v.precio));

            setRequisitos(v.requisitos);
            setBeneficios(v.beneficios);
            setHorario(v.horario ?? '');
            setDias(v.diasSemana);
            // En edición no pedimos las confirmaciones de nuevo
            setConfirms({ real: true, legal: true, coord: true });
        } else {
            setSucursalId(sucursales[0]?.id ?? '');
            setTitulo('');
            setDescripcion('');
            setTipoEmpleo('tiempo-completo');
            setModalidad('presencial');
            setAConvenir(false);
            setUnidad('mes-rango');
            setMontoMin('');
            setMontoMax('');
            setRequisitos([]);
            setBeneficios([]);
            setHorario('');
            setDias([]);
            setConfirms({ real: false, legal: false, coord: false });
        }

        setReqInput('');
        setBenInput('');
    }, [abierto, esEdicion, vacanteInicial, sucursales]);

    // ===========================================================================
    // EFECTOS — ESC + body scroll + focus inicial
    // ===========================================================================

    useEffect(() => {
        if (!abierto) return;
        const onKey = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeBtnRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [abierto, onClose]);

    // ===========================================================================
    // DERIVADOS
    // ===========================================================================

    const precio: PrecioServicio = useMemo(() => {
        if (aConvenir) return { kind: 'a-convenir' };
        const min = Number(montoMin) || 0;
        const max = Number(montoMax) || 0;
        switch (unidad) {
            case 'mes-rango':
                return { kind: 'rango', min, max, moneda: 'MXN' };
            case 'mes-fijo':
                return { kind: 'mensual', monto: min, moneda: 'MXN' };
            case 'hora':
                return { kind: 'hora', monto: min, moneda: 'MXN' };
            case 'proyecto':
                return { kind: 'fijo', monto: min, moneda: 'MXN' };
        }
    }, [aConvenir, unidad, montoMin, montoMax]);

    const confirmacionesOk =
        confirms.real && confirms.legal && confirms.coord;

    const errores = useMemo(
        () =>
            validarVacante({
                sucursalId,
                titulo,
                descripcion,
                requisitos,
                beneficios,
                horario,
                precio,
                confirmacionesOk,
            }),
        [
            sucursalId,
            titulo,
            descripcion,
            requisitos,
            beneficios,
            horario,
            precio,
            confirmacionesOk,
        ],
    );
    const valido = esFormularioVacanteValido(errores);

    const showMax = unidad === 'mes-rango' && !aConvenir;
    const labelMonto = showMax ? 'Mínimo' : 'Monto';

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const handleTipoEmpleo = (t: TipoEmpleo) => {
        setTipoEmpleo(t);
        if (!aConvenir) {
            setUnidad(unidadSugerida(t));
        }
    };

    const toggleDia = (d: DiaSemanaCodigo) =>
        setDias((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
        );

    const agregarRequisito = () => {
        const t = reqInput.trim();
        if (!t || requisitos.includes(t) || requisitos.length >= 20) return;
        setRequisitos((r) => [...r, t]);
        setReqInput('');
    };

    const agregarBeneficio = () => {
        const t = benInput.trim();
        if (!t || beneficios.includes(t) || beneficios.length >= 8) return;
        setBeneficios((b) => [...b, t]);
        setBenInput('');
    };

    const handlePublicar = async () => {
        if (!valido || enviando) return;

        // Tomamos coordenadas del fallback de Peñasco; en el futuro se podrá
        // buscar la sucursal y leer su lat/lng directamente.
        const lat = FALLBACK_PENASCO.lat;
        const lng = FALLBACK_PENASCO.lng;
        const ciudad = FALLBACK_PENASCO.ciudad;

        if (esEdicion && vacanteInicial) {
            const cambios: ActualizarVacanteInput = {
                sucursalId,
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                tipoEmpleo,
                modalidad,
                precio,
                requisitos,
                beneficios,
                horario: horario.trim() || undefined,
                diasSemana: dias.length > 0 ? dias : undefined,
                latitud: lat,
                longitud: lng,
                ciudad,
            };
            await onSubmitEditar(vacanteInicial.id, cambios);
        } else {
            const input: CrearVacanteInput = {
                sucursalId,
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                tipoEmpleo,
                modalidad,
                precio,
                requisitos,
                beneficios,
                horario: horario.trim() || undefined,
                diasSemana: dias.length > 0 ? dias : undefined,
                latitud: lat,
                longitud: lng,
                ciudad,
                confirmaciones: {
                    legal: true,
                    verdadera: true,
                    coordinacion: true,
                    version: VERSION_CONFIRMACIONES,
                },
            };
            await onSubmitCrear(input);
        }
    };

    if (!abierto) return null;

    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="slideover-vacante-title"
                className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[720px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
                data-testid="slideover-vacante"
            >
                {/* Header */}
                <header className="flex items-start gap-3.5 px-5 lg:px-7 py-5 border-b border-slate-200 shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
                        <Briefcase
                            className="w-[22px] h-[22px]"
                            strokeWidth={1.75}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2
                            id="slideover-vacante-title"
                            className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900"
                        >
                            {esEdicion ? 'Editar vacante' : 'Nueva vacante'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">
                            {esEdicion
                                ? 'Actualiza los datos de tu publicación.'
                                : 'Publícala y aparecerá en la sección Servicios de AnunciaYA.'}
                        </p>
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:bg-slate-100 transition-colors"
                        data-testid="btn-cerrar-slideover"
                    >
                        <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-6 space-y-5">
                    {/* Puesto + Sucursal */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <Field label="Puesto" requerido>
                            <input
                                type="text"
                                value={titulo}
                                onChange={(ev) => setTitulo(ev.target.value)}
                                placeholder="Ej: Diseñador gráfico"
                                maxLength={80}
                                className={CLASES_INPUT}
                                data-testid="input-titulo"
                            />
                            {titulo.length > 0 && titulo.trim().length < 10 && (
                                <ErrorText msg="Mínimo 10 caracteres." />
                            )}
                        </Field>
                        <Field label="Sucursal" requerido>
                            <select
                                value={sucursalId}
                                onChange={(ev) => setSucursalId(ev.target.value)}
                                className={CLASES_INPUT}
                                data-testid="select-sucursal"
                            >
                                {sucursales.length === 0 && (
                                    <option value="">Sin sucursales disponibles</option>
                                )}
                                {sucursales.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre}
                                        {s.esPrincipal ? ' · Matriz' : ''}
                                    </option>
                                ))}
                            </select>
                            {errores.sucursalId && (
                                <ErrorText msg={errores.sucursalId} />
                            )}
                        </Field>
                    </div>

                    {/* Tipo */}
                    <Field label="Tipo de empleo" requerido>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {(
                                [
                                    'tiempo-completo',
                                    'medio-tiempo',
                                    'por-proyecto',
                                    'eventual',
                                ] as TipoEmpleo[]
                            ).map((t) => (
                                <Choice
                                    key={t}
                                    seleccionado={tipoEmpleo === t}
                                    titulo={TIPO_EMPLEO_LABEL[t]}
                                    subtitulo={TIPO_EMPLEO_SUBLABEL[t]}
                                    onClick={() => handleTipoEmpleo(t)}
                                    testId={`chip-tipo-${t}`}
                                />
                            ))}
                        </div>
                    </Field>

                    {/* Modalidad */}
                    <Field label="Modalidad" requerido>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                            {(
                                ['presencial', 'remoto', 'hibrido'] as ModalidadServicio[]
                            ).map((m) => (
                                <Choice
                                    key={m}
                                    seleccionado={modalidad === m}
                                    titulo={MODALIDAD_LABEL[m]}
                                    subtitulo={MODALIDAD_SUBLABEL[m]}
                                    onClick={() => setModalidad(m)}
                                    testId={`chip-modalidad-${m}`}
                                />
                            ))}
                        </div>
                    </Field>

                    {/* Salario */}
                    <Field label="Salario (MXN)">
                        <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                            <Toggle
                                on={aConvenir}
                                onToggle={() => setAConvenir((v) => !v)}
                            />
                            <span className="text-sm font-semibold text-slate-700">
                                Dejar a convenir
                            </span>
                            <span className="text-[12.5px] text-slate-500 font-medium">
                                Sin monto público — los candidatos preguntan por chat.
                            </span>
                        </div>
                        {!aConvenir && (
                            <>
                                <div
                                    className="grid items-end gap-2.5"
                                    style={{
                                        gridTemplateColumns: showMax
                                            ? '1fr 1fr auto'
                                            : '1fr auto',
                                    }}
                                >
                                    <InputPrefix
                                        prefijo="$"
                                        placeholder={labelMonto}
                                        valor={montoMin}
                                        onChange={setMontoMin}
                                        testId="input-monto-min"
                                    />
                                    {showMax && (
                                        <InputPrefix
                                            prefijo="$"
                                            placeholder="Máximo"
                                            valor={montoMax}
                                            onChange={setMontoMax}
                                            testId="input-monto-max"
                                        />
                                    )}
                                    <select
                                        value={unidad}
                                        onChange={(ev) =>
                                            setUnidad(ev.target.value as UnidadSalario)
                                        }
                                        className={`${CLASES_INPUT} w-[180px]`}
                                        data-testid="select-unidad-salario"
                                    >
                                        <option value="mes-rango">/mes (rango)</option>
                                        <option value="mes-fijo">/mes (fijo)</option>
                                        <option value="hora">/hora</option>
                                        <option value="proyecto">/proyecto</option>
                                    </select>
                                </div>
                                <p className="text-[12.5px] text-slate-500 mt-2 font-medium">
                                    {unidad === 'mes-rango' &&
                                        'Define el rango salarial mensual.'}
                                    {unidad === 'mes-fijo' &&
                                        'Define el sueldo mensual fijo.'}
                                    {unidad === 'hora' &&
                                        'Pago por hora trabajada.'}
                                    {unidad === 'proyecto' &&
                                        'Pago único al completar el proyecto.'}
                                </p>
                            </>
                        )}
                        {errores.precio && <ErrorText msg={errores.precio} />}
                    </Field>

                    {/* Descripción */}
                    <Field label="Descripción" requerido>
                        <textarea
                            rows={4}
                            value={descripcion}
                            onChange={(ev) => setDescripcion(ev.target.value)}
                            maxLength={500}
                            placeholder="Describe el puesto, responsabilidades y a qué tipo de candidato buscas..."
                            className={`${CLASES_INPUT} resize-y min-h-[100px]`}
                            data-testid="textarea-descripcion"
                        />
                        <Meta
                            izquierda={`Mínimo 30 caracteres (${descripcion.length}/30)`}
                            derecha={`${descripcion.length}/500`}
                            ok={descripcion.length >= 30}
                        />
                    </Field>

                    {/* Requisitos */}
                    <Field label="Requisitos · habilidades clave" requerido>
                        <p className="text-[12.5px] text-slate-500 -mt-1 mb-2 font-medium">
                            Agrega entre 3 y 20 elementos. Presiona Enter para añadir.
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={reqInput}
                                onChange={(ev) => setReqInput(ev.target.value)}
                                onKeyDown={(ev) => {
                                    if (ev.key === 'Enter') {
                                        ev.preventDefault();
                                        agregarRequisito();
                                    }
                                }}
                                placeholder="Ej: Adobe Illustrator, Inglés avanzado..."
                                maxLength={200}
                                className={CLASES_INPUT}
                                data-testid="input-requisito"
                            />
                            <button
                                type="button"
                                onClick={agregarRequisito}
                                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors"
                                data-testid="btn-agregar-requisito"
                            >
                                Agregar
                            </button>
                        </div>
                        {requisitos.length > 0 && (
                            <Tags
                                items={requisitos}
                                tono="sky"
                                onRemove={(t) =>
                                    setRequisitos((r) => r.filter((x) => x !== t))
                                }
                            />
                        )}
                        {errores.requisitos && <ErrorText msg={errores.requisitos} />}
                    </Field>

                    {/* Beneficios */}
                    <Field label="Beneficios" hint="(opcional · máx 8)">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={benInput}
                                onChange={(ev) => setBenInput(ev.target.value)}
                                onKeyDown={(ev) => {
                                    if (ev.key === 'Enter') {
                                        ev.preventDefault();
                                        agregarBeneficio();
                                    }
                                }}
                                placeholder="Ej: Aguinaldo, Home office 2 días, Bonos..."
                                maxLength={100}
                                className={CLASES_INPUT}
                                data-testid="input-beneficio"
                            />
                            <button
                                type="button"
                                onClick={agregarBeneficio}
                                className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors"
                                data-testid="btn-agregar-beneficio"
                            >
                                Agregar
                            </button>
                        </div>
                        {beneficios.length > 0 && (
                            <Tags
                                items={beneficios}
                                tono="emerald"
                                onRemove={(t) =>
                                    setBeneficios((b) => b.filter((x) => x !== t))
                                }
                            />
                        )}
                        {errores.beneficios && <ErrorText msg={errores.beneficios} />}
                    </Field>

                    {/* Horario y días */}
                    <Field label="Horario y días" hint="(opcional)">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                            <input
                                type="text"
                                value={horario}
                                onChange={(ev) => setHorario(ev.target.value)}
                                maxLength={150}
                                placeholder="Ej: L–V 9:00 a 18:00"
                                className={CLASES_INPUT}
                                data-testid="input-horario"
                            />
                            <div className="flex gap-1.5">
                                {DIAS_ORDEN.map((d) => {
                                    const activo = dias.includes(d);
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => toggleDia(d)}
                                            className={
                                                'flex-1 py-2.5 rounded-lg text-[13px] font-bold tracking-wider uppercase border lg:cursor-pointer transition-colors ' +
                                                (activo
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400')
                                            }
                                            data-testid={`btn-dia-${d}`}
                                        >
                                            {DIA_CORTO[d]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {errores.horario && <ErrorText msg={errores.horario} />}
                    </Field>

                    {/* Vigencia (info chip) */}
                    <Field label="Vigencia">
                        <div className="inline-flex items-start gap-2 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium">
                            <Clock
                                className="w-4 h-4 shrink-0 mt-0.5"
                                strokeWidth={1.75}
                            />
                            <span>
                                La vacante queda activa por{' '}
                                <b className="text-slate-900">30 días</b>. Al vencer, se
                                auto-pausa y puedes reactivarla con un click.
                            </span>
                        </div>
                    </Field>

                    {/* Confirmaciones legales (solo en creación) */}
                    {!esEdicion && (
                        <Field label="Confirmaciones legales" requerido>
                            <div className="grid gap-2.5">
                                <ConfirmCard
                                    checked={confirms.real}
                                    onToggle={() =>
                                        setConfirms((s) => ({ ...s, real: !s.real }))
                                    }
                                    texto="Confirmo que esta vacante es real y vigente."
                                    testId="check-confirm-real"
                                />
                                <ConfirmCard
                                    checked={confirms.legal}
                                    onToggle={() =>
                                        setConfirms((s) => ({ ...s, legal: !s.legal }))
                                    }
                                    texto="Acepto que el contenido cumple con las leyes locales y los términos de AnunciaYA."
                                    testId="check-confirm-legal"
                                />
                                <ConfirmCard
                                    checked={confirms.coord}
                                    onToggle={() =>
                                        setConfirms((s) => ({ ...s, coord: !s.coord }))
                                    }
                                    texto="Entiendo que el contacto con candidatos se coordina entre las partes; AnunciaYA solo conecta."
                                    testId="check-confirm-coord"
                                />
                            </div>
                            {errores.confirmaciones && (
                                <ErrorText msg={errores.confirmaciones} />
                            )}
                        </Field>
                    )}
                </div>

                {/* Footer */}
                <footer className="flex items-center justify-end gap-2.5 px-5 lg:px-7 py-4 border-t border-slate-200 bg-white shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm lg:cursor-pointer hover:bg-slate-50 transition-colors"
                        data-testid="btn-cancelar-slideover"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handlePublicar}
                        disabled={!valido || enviando}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                        data-testid="btn-publicar-vacante"
                    >
                        {enviando
                            ? esEdicion
                                ? 'Guardando…'
                                : 'Publicando…'
                            : esEdicion
                                ? 'Guardar cambios'
                                : 'Publicar vacante'}
                    </button>
                </footer>
            </aside>
        </>
    );
}

// =============================================================================
// SUBCOMPONENTES INTERNOS
// =============================================================================

const CLASES_INPUT =
    'w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white text-sm lg:text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-colors font-medium';

function Field({
    label,
    hint,
    requerido,
    children,
}: {
    label: string;
    hint?: string;
    requerido?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-[12px] font-semibold tracking-wider uppercase text-slate-700 mb-2">
                {label}
                {requerido && <span className="text-rose-500 ml-1">*</span>}
                {hint && (
                    <span className="ml-2 normal-case tracking-normal font-medium text-slate-500">
                        {hint}
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

function Choice({
    seleccionado,
    titulo,
    subtitulo,
    onClick,
    testId,
}: {
    seleccionado: boolean;
    titulo: string;
    subtitulo: string;
    onClick: () => void;
    testId?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'text-left px-3.5 py-3 rounded-lg border-2 lg:cursor-pointer transition-colors ' +
                (seleccionado
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-400')
            }
            data-testid={testId}
        >
            <strong className="block text-sm lg:text-base font-bold text-slate-900">
                {titulo}
            </strong>
            <span className="block text-[12.5px] text-slate-500 mt-0.5 font-medium">
                {subtitulo}
            </span>
        </button>
    );
}

function InputPrefix({
    prefijo,
    placeholder,
    valor,
    onChange,
    testId,
}: {
    prefijo: string;
    placeholder: string;
    valor: string;
    onChange: (v: string) => void;
    testId?: string;
}) {
    return (
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                {prefijo}
            </span>
            <input
                type="number"
                inputMode="numeric"
                min={0}
                value={valor}
                onChange={(ev) => onChange(ev.target.value)}
                placeholder={placeholder}
                className={`${CLASES_INPUT} pl-9`}
                data-testid={testId}
            />
        </div>
    );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={on}
            className={
                'relative w-10 h-[22px] rounded-full lg:cursor-pointer transition-colors ' +
                (on ? 'bg-slate-900' : 'bg-slate-300')
            }
            data-testid="toggle-a-convenir"
        >
            <span
                className={
                    'absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ' +
                    (on ? 'translate-x-[18px]' : 'translate-x-0.5')
                }
            />
        </button>
    );
}

function Tags({
    items,
    tono,
    onRemove,
}: {
    items: string[];
    tono: 'sky' | 'emerald';
    onRemove: (t: string) => void;
}) {
    const wrapCls =
        tono === 'sky'
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    const closeCls =
        tono === 'sky'
            ? 'bg-sky-600 hover:bg-sky-700'
            : 'bg-emerald-600 hover:bg-emerald-700';
    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            {items.map((t) => (
                <span
                    key={t}
                    className={`inline-flex items-center gap-1.5 pl-3 pr-1 py-1 border rounded-full text-[12.5px] font-semibold ${wrapCls}`}
                >
                    {t}
                    <button
                        type="button"
                        onClick={() => onRemove(t)}
                        aria-label={`Quitar ${t}`}
                        className={`w-[18px] h-[18px] rounded-full grid place-items-center text-white lg:cursor-pointer ${closeCls}`}
                    >
                        <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                </span>
            ))}
        </div>
    );
}

function ConfirmCard({
    checked,
    onToggle,
    texto,
    testId,
}: {
    checked: boolean;
    onToggle: () => void;
    texto: string;
    testId?: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={
                'w-full flex items-start gap-3.5 px-4 py-3.5 rounded-lg border-2 text-left lg:cursor-pointer transition-colors ' +
                (checked
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 bg-white hover:border-slate-400')
            }
            data-testid={testId}
        >
            <span
                className={
                    'w-[22px] h-[22px] rounded-md grid place-items-center shrink-0 mt-px transition-colors ' +
                    (checked
                        ? 'bg-slate-900 border-2 border-slate-900 text-white'
                        : 'border-2 border-slate-400 bg-white')
                }
            >
                {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </span>
            <span className="text-sm text-slate-700 leading-relaxed font-medium">
                {texto}
            </span>
        </button>
    );
}

function Meta({
    izquierda,
    derecha,
    ok,
}: {
    izquierda: string;
    derecha: string;
    ok: boolean;
}) {
    return (
        <div className="flex justify-between items-center mt-1.5 text-[12.5px] text-slate-500 font-medium">
            <span className={ok ? 'text-emerald-600 font-semibold' : ''}>
                {izquierda}
            </span>
            <span className="tabular-nums">{derecha}</span>
        </div>
    );
}

function ErrorText({ msg }: { msg: string }) {
    return (
        <div className="flex items-center gap-1.5 text-[12.5px] text-rose-600 mt-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            {msg}
        </div>
    );
}
