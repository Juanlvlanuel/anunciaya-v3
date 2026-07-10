/**
 * SlideoverNuevaVacante.tsx
 * ===========================
 * Wizard de 3 pasos (montado como slideover desde la derecha) para crear
 * o editar una vacante.
 *
 *   Paso 1 · Identidad              — Puesto · Sucursal · Tipo · Modalidad
 *   Paso 2 · Compensación y detalles — Salario · Descripción · Requisitos · Beneficios
 *   Paso 3 · Logística               — Horario · Días · Vigencia · Confirmaciones
 *
 * Modos:
 *   - 'crear'                       → form en blanco
 *   - { tipo: 'editar', vacante }   → pre-poblado con la vacante actual
 *
 * Validación:
 *   - Por paso: "Siguiente" disabled si hay errores en el paso actual.
 *   - Global: "Publicar vacante" (paso 3) revisa la validación completa,
 *     defensa por si el usuario saltó atrás y dejó algo incompleto.
 *
 * El componente mantiene la API pública del slideover original — el padre
 * (`PaginaVacantes`) no necesita cambios.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/SlideoverNuevaVacante.tsx
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Briefcase,
    Check,
    ChevronDown,
    Clock,
    Eye,
    X,
} from 'lucide-react';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { useBackNativo } from '../../../../../hooks/useBackNativo';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { HorarioYDias } from './HorarioYDias';
import {
    TIPO_EMPLEO_LABEL,
    TIPO_EMPLEO_SUBLABEL,
    MODALIDAD_LABEL,
    MODALIDAD_SUBLABEL,
    validarVacante,
    esFormularioVacanteValido,
} from './helpers';
import type { ErroresVacante } from './helpers';
import type {
    CrearVacanteInput,
    ActualizarVacanteInput,
    DiaSemanaCodigo,
    ModalidadServicio,
    PrecioServicio,
    TipoEmpleo,
    Vacante,
} from '../../../../../types/servicios';
import {
    descartarBorradorVacantes,
    guardarBorradorVacantes,
    leerBorradorVacantes,
} from '../../../../../utils/borradorVacantes';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Versión del esquema de confirmaciones legales. */
const VERSION_CONFIRMACIONES = 'v1-2026-05-17';

/**
 * Respaldo de último recurso. Desde 2026-06 el BACKEND deriva la ciudad y las
 * coordenadas de la vacante desde su sucursal (ciudad_id → catálogo `ciudades` +
 * `ubicacion` PostGIS) y SOBREESCRIBE lo que mande el front (ver vacantes.service →
 * obtenerUbicacionSucursal). Estos valores solo se usarían si la sucursal no tuviera
 * ni ciudad_id ni ubicación (caso muy raro).
 */
const FALLBACK_PENASCO = {
    lat: 31.3145,
    lng: -113.5455,
    ciudad: 'Puerto Peñasco',
} as const;

/** Subset de UI para el selector de unidad del salario. */
type UnidadSalario = 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto';

const UNIDAD_SUFIJO: Record<UnidadSalario, string> = {
    'mes-rango': '/mes',
    'mes-fijo': '/mes',
    'hora': '/hora',
    'proyecto': '/proyecto',
};

const UNIDAD_OPCIONES: { value: UnidadSalario; label: string }[] = [
    { value: 'mes-rango', label: '/mes (rango)' },
    { value: 'mes-fijo', label: '/mes (fijo)' },
    { value: 'hora', label: '/hora' },
    { value: 'proyecto', label: '/proyecto' },
];

const PASOS = [
    { n: 1, key: 'identidad' as const, label: 'Puesto' },
    { n: 2, key: 'compensa' as const, label: 'Descripción' },
    { n: 3, key: 'logistica' as const, label: 'Horarios' },
];
type PasoKey = (typeof PASOS)[number]['key'];

const STEP_HEADER: Record<
    PasoKey,
    { titulo: string; hint: string; opcional?: boolean }
> = {
    identidad: {
        titulo: 'Puesto',
        hint: '¿Qué puesto buscas y bajo qué condiciones?',
    },
    compensa: {
        // Sin hint Sprint 9.3 — el título "Descripción" y los labels
        // de cada campo (Salario, Descripción, Requisitos, Beneficios)
        // comunican qué se pide. El subtítulo descriptivo agregaba
        // ruido para un paso sencillo.
        titulo: 'Descripción',
        hint: '',
    },
    logistica: {
        // Sin hint — el contenido del paso (campos de horario + card de
        // confirmaciones) es autoexplicativo y el subtítulo agregaba ruido.
        // `opcional: true` agrega un sufijo "· Opcional" inline al título
        // (sustituye al label "Horario y días · opcional" del Field que
        // antes envolvía al HorarioYDias — Sprint 9.3).
        titulo: 'Horarios',
        hint: '',
        opcional: true,
    },
};

/** Qué keys de `ErroresVacante` aplican a cada paso. */
const KEYS_POR_PASO: Record<PasoKey, (keyof ErroresVacante)[]> = {
    identidad: ['sucursalId', 'titulo'],
    compensa: ['precio', 'descripcion', 'requisitos', 'beneficios'],
    logistica: ['horario', 'confirmaciones'],
};

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

function fmtMxn(n: number): string {
    return '$' + n.toLocaleString('es-MX');
}

function previewSalario(
    precio: PrecioServicio,
    unidad: UnidadSalario,
): string | null {
    if (precio.kind === 'a-convenir') return null;
    if (precio.kind === 'rango') {
        if (precio.min === 0 || precio.max === 0) return null;
        return `${fmtMxn(precio.min)} – ${fmtMxn(precio.max)} ${UNIDAD_SUFIJO[unidad]}`;
    }
    if (precio.monto === 0) return null;
    return `${fmtMxn(precio.monto)} ${UNIDAD_SUFIJO[unidad]}`;
}

/**
 * Normaliza el precio antes de enviarlo al backend cuando el usuario
 * dejó el salario sin definir (Sprint 9.3 — salario opcional en BS
 * Vacantes). Casos:
 *   - rango con `min === 0 && max === 0`     → `{kind: 'a-convenir'}`
 *   - monto único con `monto === 0`          → `{kind: 'a-convenir'}`
 * El resto de variantes pasa intacto. El discriminated union del schema
 * Zod sí acepta `'a-convenir'` y el card de la vacante renderiza
 * "A convenir" en esos casos.
 */
function normalizarPrecioVacanteParaPayload(
    precio: PrecioServicio,
): PrecioServicio {
    if (precio.kind === 'rango' && precio.min === 0 && precio.max === 0) {
        return { kind: 'a-convenir' };
    }
    if (
        precio.kind !== 'a-convenir' &&
        precio.kind !== 'rango' &&
        precio.monto === 0
    ) {
        return { kind: 'a-convenir' };
    }
    return precio;
}

/** Devuelve los faltantes user-friendly del paso indicado. */
function faltantesDelPaso(args: {
    paso: PasoKey;
    errores: ErroresVacante;
    titulo: string;
    descripcion: string;
    aConvenir: boolean;
    precio: PrecioServicio;
    confirmacionesOk: boolean;
    esEdicion: boolean;
}): string[] {
    const {
        paso,
        errores,
        titulo,
        descripcion,
        aConvenir,
        precio,
        confirmacionesOk,
        esEdicion,
    } = args;
    const lista: string[] = [];

    if (paso === 'identidad') {
        if (errores.sucursalId) lista.push('sucursal');
        const t = titulo.trim();
        if (t.length === 0) lista.push('puesto');
        else if (t.length < 10) lista.push('puesto más largo');
    }

    if (paso === 'compensa') {
        // Sprint 9.3: salario y requisitos son OPCIONALES. Solo aparecen
        // en la lista de faltantes cuando están parcialmente llenos de
        // forma inconsistente (rango con un solo extremo, min >= max,
        // requisito demasiado corto/largo, etc.). Si el usuario los deja
        // totalmente vacíos, NO bloquea avanzar — la vacante se publica
        // con esos campos sin definir (precio se trata como "a convenir"
        // automáticamente en el payload).
        if (!aConvenir && precio.kind === 'rango') {
            if ((precio.min === 0) !== (precio.max === 0)) {
                lista.push('salario válido');
            } else if (precio.min > 0 && precio.min >= precio.max) {
                lista.push('salario válido');
            }
        }
        const d = descripcion.trim();
        if (d.length === 0) lista.push('descripción');
        else if (d.length < 30) lista.push('descripción más larga');
        if (errores.requisitos) lista.push('requisitos válidos');
        if (errores.beneficios) lista.push('beneficios válidos');
    }

    if (paso === 'logistica') {
        if (errores.horario) lista.push('horario válido');
        if (!esEdicion && !confirmacionesOk) lista.push('confirmar políticas');
    }

    return lista;
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
    // CONTEXTO DE SUCURSAL — solo Matriz puede elegir destino
    // ===========================================================================
    //
    // Patrón consistente con el resto de BS: las sucursales secundarias
    // gestionan SU propio contexto y no pueden actuar sobre otras. Para una
    // sucursal secundaria se sobreentiende que la vacante es para ella misma
    // — el dropdown se oculta y se usa la sucursal activa automáticamente.
    const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
    const sucursalActivaId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
    const mostrarSelectorSucursal = esSucursalPrincipal && sucursales.length > 1;
    const sucursalActivaNombre = useMemo(
        () => sucursales.find((s) => s.id === sucursalActivaId)?.nombre ?? '',
        [sucursales, sucursalActivaId],
    );

    // ===========================================================================
    // ESTADO LOCAL
    // ===========================================================================

    const [paso, setPaso] = useState(1);

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

    // confirmaciones legales (las 3 se marcan juntas vía el card consolidado)
    const [confirms, setConfirms] = useState({
        real: false,
        legal: false,
        coord: false,
    });
    const [confirmExpandido, setConfirmExpandido] = useState(false);

    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // ===========================================================================
    // SINCRONIZAR STATE AL ABRIR
    // ===========================================================================

    useEffect(() => {
        if (!abierto) return;

        // Sucursal por defecto:
        //  - Edición: la sucursal de la vacante (o la activa si no existe)
        //  - Creación + sucursal secundaria: la sucursal activa (forzada,
        //    sin opción de cambio porque el dropdown no se muestra)
        //  - Creación + Matriz: la primera sucursal de la lista
        const sucursalDefault = !esSucursalPrincipal && sucursalActivaId
            ? sucursalActivaId
            : sucursales[0]?.id ?? '';

        if (esEdicion && vacanteInicial) {
            const v = vacanteInicial;
            setSucursalId(v.sucursalId ?? sucursalDefault);
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
            // Sprint 9.3: modo CREAR — si hay borrador pendiente en
            // localStorage (namespaced por sucursal activa), pre-cargamos
            // los campos desde ahí. Si no, arrancamos con los defaults
            // limpios. El borrador de OTRA sucursal NO se ve aquí.
            const borrador = leerBorradorVacantes(sucursalActivaId);
            if (borrador) {
                // sucursalId: respetamos el del borrador si sigue siendo
                // válida en la lista actual de sucursales. Si la sucursal
                // ya no existe (fue eliminada, etc.), caemos al default.
                const sucursalValida = sucursales.some(
                    (s) => s.id === borrador.sucursalId,
                );
                setSucursalId(
                    sucursalValida ? borrador.sucursalId : sucursalDefault,
                );
                setTitulo(borrador.titulo);
                setDescripcion(borrador.descripcion);
                setTipoEmpleo(borrador.tipoEmpleo);
                setModalidad(borrador.modalidad);
                setAConvenir(borrador.aConvenir);
                setUnidad(borrador.unidad);
                setMontoMin(borrador.montoMin);
                setMontoMax(borrador.montoMax);
                setRequisitos(borrador.requisitos);
                setBeneficios(borrador.beneficios);
                setHorario(borrador.horario);
                setDias(borrador.dias as DiaSemanaCodigo[]);
            } else {
                setSucursalId(sucursalDefault);
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
            }
            // Confirmaciones legales SIEMPRE se piden frescas, aunque
            // haya borrador (decisión de cumplimiento — el usuario debe
            // releer y confirmar cada vez que publica).
            setConfirms({ real: false, legal: false, coord: false });
        }

        setReqInput('');
        setBenInput('');
        setConfirmExpandido(false);
        setPaso(1);
    }, [abierto, esEdicion, vacanteInicial, sucursales, esSucursalPrincipal, sucursalActivaId]);

    // ===========================================================================
    // EFECTOS — ESC + body scroll + focus inicial
    // ===========================================================================

    // Back nativo del celular / flecha del navegador → cierra el slideover (es
    // un overlay full-screen hecho a mano). Se monta siempre con la prop
    // `abierto`, así que el hook reacciona a ella. Se apila sobre el detalle
    // inline de la vacante (discriminador propio) → el back cierra capa por capa.
    useBackNativo({ abierto, onCerrar: onClose, discriminador: '_slideoverVacante' });

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

    // ===========================================================================
    // BORRADOR — auto-guardado con debounce 500ms (solo modo CREAR)
    // ===========================================================================
    //
    // Cada cambio en cualquier campo dispara un timer; si pasan 500ms sin
    // nuevos cambios, persiste el borrador en localStorage. Esto evita
    // escribir en cada tecla (~30 escrituras/seg al teclear rápido) y
    // mantiene la sincronía cuando el usuario hace pausa natural.
    //
    // No corre en modo edición — la edición de una vacante existente NO
    // usa borrador (Sprint 9.3: si en el futuro queremos preservar
    // cambios entre sesiones de edición, agregar namespace `edit-{id}`).
    //
    // Tampoco corre cuando el slideover está cerrado (`abierto === false`)
    // para evitar sobrescribir el borrador con datos stale tras un reset.
    //
    // Va DESPUÉS del useMemo de `precio` porque depende de él (declaración
    // antes de uso para evitar TDZ del block-scoped binding).
    useEffect(() => {
        if (!abierto || esEdicion) return;
        const timer = setTimeout(() => {
            guardarBorradorVacantes(sucursalActivaId, {
                sucursalId,
                titulo,
                descripcion,
                tipoEmpleo,
                modalidad,
                precio,
                aConvenir,
                unidad,
                montoMin,
                montoMax,
                requisitos,
                beneficios,
                horario,
                dias,
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [
        abierto,
        esEdicion,
        sucursalActivaId,
        sucursalId,
        titulo,
        descripcion,
        tipoEmpleo,
        modalidad,
        precio,
        aConvenir,
        unidad,
        montoMin,
        montoMax,
        requisitos,
        beneficios,
        horario,
        dias,
    ]);

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

    /** Errores que pertenecen a cada paso (para validación por paso). */
    const erroresPorPaso = useMemo<Record<PasoKey, (keyof ErroresVacante)[]>>(
        () => ({
            identidad: KEYS_POR_PASO.identidad.filter((k) => k in errores),
            compensa: KEYS_POR_PASO.compensa.filter((k) => k in errores),
            logistica: KEYS_POR_PASO.logistica.filter((k) => k in errores),
        }),
        [errores],
    );

    const pasoActualKey = PASOS[paso - 1].key;
    const pasoValido = erroresPorPaso[pasoActualKey].length === 0;

    // Errores que SÍ se renderizan bajo el campo: solo los de "contenido mal
    // formado" (rango inválido, texto corto, etc.). Para "campo vacío
    // requerido" usamos el banner inferior — no spammeamos el form con rojo
    // antes de que el usuario haya empezado a llenar.
    const erroresContenido: ErroresVacante = useMemo(() => {
        const e: ErroresVacante = {};
        const t = titulo.trim();
        if (t.length > 0 && t.length < 10) e.titulo = 'Mínimo 10 caracteres.';
        const d = descripcion.trim();
        if (d.length > 0 && d.length < 30) e.descripcion = 'Mínimo 30 caracteres.';
        if (requisitos.length > 0 && requisitos.length < 3) {
            const faltan = 3 - requisitos.length;
            e.requisitos = `Falta${faltan === 1 ? '' : 'n'} ${faltan} más (mínimo 3).`;
        }
        if (!aConvenir && unidad === 'mes-rango') {
            const min = Number(montoMin) || 0;
            const max = Number(montoMax) || 0;
            if (min > 0 && max > 0 && min >= max) {
                e.precio = 'El mínimo debe ser menor que el máximo.';
            }
        }
        return e;
    }, [titulo, descripcion, requisitos, aConvenir, unidad, montoMin, montoMax]);

    /** Faltantes user-friendly del paso actual, para el banner inferior. */
    const faltantesPasoActual = useMemo(
        () =>
            faltantesDelPaso({
                paso: pasoActualKey,
                errores,
                titulo,
                descripcion,
                aConvenir,
                precio,
                confirmacionesOk,
                esEdicion,
            }),
        [
            pasoActualKey,
            errores,
            titulo,
            descripcion,
            aConvenir,
            precio,
            confirmacionesOk,
            esEdicion,
        ],
    );

    const showMax = unidad === 'mes-rango' && !aConvenir;
    const labelMonto = showMax ? 'Mínimo' : 'Monto';
    const previewTexto = previewSalario(precio, unidad);

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const handleTipoEmpleo = (t: TipoEmpleo) => {
        setTipoEmpleo(t);
        if (!aConvenir) {
            setUnidad(unidadSugerida(t));
        }
    };

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

    const marcarConfirmaciones = () => {
        const next = !confirmacionesOk;
        setConfirms({ real: next, legal: next, coord: next });
    };

    const handleAtras = () => {
        if (paso > 1) setPaso(paso - 1);
    };

    const handleSiguiente = () => {
        if (!pasoValido) return;
        if (paso < 3) setPaso(paso + 1);
        else handlePublicar();
    };

    const handlePublicar = async () => {
        if (!valido || enviando) return;

        // El backend deriva ciudad/coords de la sucursal y sobreescribe estos valores;
        // son solo respaldo por si la sucursal no tuviera ubicación.
        const lat = FALLBACK_PENASCO.lat;
        const lng = FALLBACK_PENASCO.lng;
        const ciudad = FALLBACK_PENASCO.ciudad;

        // Sprint 9.3: si el usuario dejó el salario sin definir (rango 0/0
        // o monto 0), normalizamos el precio a `{kind: 'a-convenir'}` antes
        // de enviarlo al backend — el discriminated union del schema sí lo
        // acepta y se renderiza como "A convenir" en el card de la vacante.
        const precioNormalizado = normalizarPrecioVacanteParaPayload(precio);

        if (esEdicion && vacanteInicial) {
            const cambios: ActualizarVacanteInput = {
                sucursalId,
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                tipoEmpleo,
                modalidad,
                precio: precioNormalizado,
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
                precio: precioNormalizado,
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
            // Sprint 9.3: borrador descartado al publicar exitosamente.
            // El `await` resolvió sin throw → la mutación pasó la
            // validación del backend y la vacante se creó. Si el padre
            // (PaginaVacantes) decide no cerrar el slideover por alguna
            // razón, el auto-save lo escribiría de nuevo en 500ms — por
            // eso descartamos DESPUÉS del await, no antes.
            // Namespaced por sucursal: solo se borra el draft de la
            // sucursal activa actual (no afecta drafts de otras).
            descartarBorradorVacantes(sucursalActivaId);
        }
    };

    if (!abierto) return null;

    // El botón final del paso 3 publica/guarda; en pasos previos avanza.
    const esUltimoPaso = paso === 3;
    const siguienteDisabled = esUltimoPaso
        ? !valido || enviando
        : !pasoValido;
    const labelSiguiente = esUltimoPaso
        ? enviando
            ? esEdicion
                ? 'Guardando…'
                : 'Publicando…'
            : esEdicion
                ? 'Guardar cambios'
                : 'Publicar vacante'
        : 'Siguiente';

    // ===========================================================================
    // RENDER
    // ===========================================================================
    //
    // Renderizamos via `createPortal(..., document.body)` para que el slideover
    // escape al stacking context del `<main>` (z-20) y del layout BS. Sin esto,
    // por más z-index que pongamos al backdrop/panel, quedan limitados al z-20
    // de su contenedor padre y el Navbar (z-50) / sidebar (z-30) los tapan.

    return createPortal(
        <>
            {/* Backdrop con radial gradient oscuro — mismo patrón que el resto
                de modales del proyecto (Modal.tsx). El z-[100] lo sitúa por
                encima del Navbar (z-50), del sidebar (z-30) y de ChatYA (z-90)
                para que cubra TODA la pantalla. */}
            <div
                className="fixed inset-0 z-[100] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] animate-in fade-in duration-200"
                onClick={onClose}
                aria-hidden
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="slideover-vacante-title"
                className="fixed top-0 right-0 bottom-0 z-[101] w-full max-w-[720px] bg-white border-l border-slate-300 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
                data-testid="slideover-vacante"
            >
                {/* Header — items-center desde Sprint 9.3 (antes items-start).
                    El cambio se hizo cuando se eliminó el subtítulo descriptivo
                    debajo del título: con solo el título, el bloque del medio
                    es más bajo que el ícono 44×44 y se veía descentrado arriba.
                    Con items-center el título, el ícono y el botón X se
                    alinean verticalmente al centro del header. */}
                <header className="flex items-center gap-3.5 px-5 lg:px-7 py-5 border-b border-slate-300 shrink-0">
                    <div
                        className="w-11 h-11 rounded-xl text-white grid place-items-center shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, #0ea5e9, #2563eb, #1d4ed8)',
                            boxShadow: '0 6px 20px rgba(14,165,233,0.4)',
                        }}
                    >
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
                        {/* Subtítulo descriptivo eliminado Sprint 9.3 — el
                            paso del wizard ya comunica qué se está pidiendo
                            (Puesto / Descripción / Horarios), no hace falta
                            el texto extra del header. */}
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="w-9 h-9 rounded-lg border-2 border-slate-300 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                        data-testid="btn-cerrar-slideover"
                    >
                        <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                </header>

                {/* Progress bar */}
                <ProgressBar paso={paso} />

                {/* Body — Sprint 9.3:
                      - space-y-5 → flex flex-col gap-6 (mismo espaciado
                        que antes, pero como flex container para que
                        algunos pasos puedan empujar bloques al fondo
                        usando `flex-1` en un spacer).
                      - El paso 3 usa esto: el banner "Activa 30 días"
                        + el checkbox de políticas se separan del bloque
                        de horarios con un spacer flex-1, quedando
                        pegados al fondo del viewport disponible.
                      - Los pasos 1 y 2 no agregan spacer, así que su
                        contenido fluye natural arriba como antes. */}
                <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-6 flex flex-col gap-6">
                    <StepHeader
                        titulo={STEP_HEADER[pasoActualKey].titulo}
                        hint={STEP_HEADER[pasoActualKey].hint}
                        opcional={STEP_HEADER[pasoActualKey].opcional}
                    />

                    {paso === 1 && (
                        <PasoIdentidad
                            mostrarSelectorSucursal={mostrarSelectorSucursal}
                            sucursales={sucursales}
                            sucursalId={sucursalId}
                            setSucursalId={setSucursalId}
                            sucursalActivaNombre={sucursalActivaNombre}
                            titulo={titulo}
                            setTitulo={setTitulo}
                            tipoEmpleo={tipoEmpleo}
                            onTipoChange={handleTipoEmpleo}
                            modalidad={modalidad}
                            setModalidad={setModalidad}
                            erroresContenido={erroresContenido}
                            erroresSucursalId={errores.sucursalId}
                        />
                    )}
                    {paso === 2 && (
                        <PasoCompensacion
                            aConvenir={aConvenir}
                            setAConvenir={setAConvenir}
                            unidad={unidad}
                            setUnidad={setUnidad}
                            montoMin={montoMin}
                            setMontoMin={setMontoMin}
                            montoMax={montoMax}
                            setMontoMax={setMontoMax}
                            showMax={showMax}
                            labelMonto={labelMonto}
                            previewTexto={previewTexto}
                            descripcion={descripcion}
                            setDescripcion={setDescripcion}
                            requisitos={requisitos}
                            setRequisitos={setRequisitos}
                            reqInput={reqInput}
                            setReqInput={setReqInput}
                            agregarRequisito={agregarRequisito}
                            beneficios={beneficios}
                            setBeneficios={setBeneficios}
                            benInput={benInput}
                            setBenInput={setBenInput}
                            agregarBeneficio={agregarBeneficio}
                            erroresContenido={erroresContenido}
                            erroresBeneficios={errores.beneficios}
                        />
                    )}
                    {paso === 3 && (
                        <PasoLogistica
                            horario={horario}
                            setHorario={setHorario}
                            dias={dias}
                            setDias={setDias}
                            erroresHorario={errores.horario}
                            esEdicion={esEdicion}
                            confirmacionesOk={confirmacionesOk}
                            onToggleConfirmaciones={marcarConfirmaciones}
                            confirmExpandido={confirmExpandido}
                            onToggleExpandido={() =>
                                setConfirmExpandido((v) => !v)
                            }
                        />
                    )}
                </div>

                {/* Banner de campos faltantes del paso actual */}
                {!pasoValido && faltantesPasoActual.length > 0 && (
                    <div
                        className="flex items-start gap-2 px-5 lg:px-7 py-2.5 border-t border-amber-300 bg-amber-100 shrink-0"
                        role="status"
                        data-testid="banner-faltantes"
                    >
                        <AlertCircle
                            className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"
                            strokeWidth={2}
                        />
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-amber-800">
                            <span className="text-amber-700">
                                Para avanzar te falta:
                            </span>{' '}
                            {faltantesPasoActual.join(', ')}.
                        </p>
                    </div>
                )}

                {/* Footer — Atrás + Siguiente/Publicar */}
                <footer className="flex items-center justify-between gap-2.5 px-5 lg:px-7 py-4 border-t border-slate-300 bg-white shrink-0">
                    <button
                        type="button"
                        onClick={handleAtras}
                        disabled={paso === 1}
                        className="inline-flex items-center gap-2 h-11 lg:h-10 2xl:h-11 px-4 rounded-lg bg-white border-2 border-slate-300 text-slate-700 font-semibold text-base lg:text-sm 2xl:text-base lg:cursor-pointer hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        data-testid="btn-wizard-atras"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                        Atrás
                    </button>
                    <button
                        type="button"
                        onClick={handleSiguiente}
                        disabled={siguienteDisabled}
                        className="inline-flex items-center justify-center gap-2 h-11 lg:h-10 2xl:h-11 px-5 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white border-2 border-slate-800 lg:cursor-pointer disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
                        style={
                            !siguienteDisabled
                                ? {
                                    background:
                                        'linear-gradient(135deg, #1e293b, #334155)',
                                    boxShadow: '0 2px 8px rgba(30, 41, 59, 0.3)',
                                }
                                : undefined
                        }
                        data-testid={
                            esUltimoPaso ? 'btn-publicar-vacante' : 'btn-wizard-siguiente'
                        }
                    >
                        {labelSiguiente}
                        {!esUltimoPaso && (
                            <ArrowRight className="w-4 h-4" strokeWidth={2} />
                        )}
                    </button>
                </footer>
            </aside>
        </>,
        document.body,
    );
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

function ProgressBar({ paso }: { paso: number }) {
    return (
        <div
            className="px-5 lg:px-7 py-3.5 bg-slate-100 border-b border-slate-300 shrink-0"
            data-testid="wizard-progress"
        >
            <div className="flex items-center gap-2 mb-2">
                {PASOS.map((s, i) => {
                    const isDone = s.n < paso;
                    const isActive = s.n === paso;
                    return (
                        <Fragment key={s.n}>
                            <div className="flex items-center gap-2 shrink-0">
                                <span
                                    className={
                                        'w-7 h-7 rounded-full grid place-items-center text-sm font-bold border-2 shrink-0 ' +
                                        (isDone
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : isActive
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-white border-slate-300 text-slate-600')
                                    }
                                    data-testid={`wizard-step-${s.n}`}
                                >
                                    {isDone ? (
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : (
                                        s.n
                                    )}
                                </span>
                                <span
                                    className={
                                        'hidden lg:inline text-sm lg:text-[11px] 2xl:text-sm truncate ' +
                                        (isActive
                                            ? 'font-bold text-slate-900'
                                            : isDone
                                                ? 'font-semibold text-slate-700'
                                                : 'font-medium text-slate-600')
                                    }
                                >
                                    {s.label}
                                </span>
                            </div>
                            {i < PASOS.length - 1 && (
                                <span
                                    className={
                                        'flex-1 h-0.5 rounded-full ' +
                                        (isDone ? 'bg-emerald-500' : 'bg-slate-300')
                                    }
                                />
                            )}
                        </Fragment>
                    );
                })}
            </div>
            <div className="flex items-baseline justify-between lg:hidden">
                <span className="text-sm font-bold text-slate-900">
                    {PASOS[paso - 1].label}
                </span>
                <span className="text-sm lg:text-[11px] 2xl:text-sm uppercase tracking-wider font-semibold text-slate-600">
                    Paso {paso} de 3
                </span>
            </div>
        </div>
    );
}

// =============================================================================
// PASO 1 — IDENTIDAD
// =============================================================================

function PasoIdentidad({
    mostrarSelectorSucursal,
    sucursales,
    sucursalId,
    setSucursalId,
    sucursalActivaNombre,
    titulo,
    setTitulo,
    tipoEmpleo,
    onTipoChange,
    modalidad,
    setModalidad,
    erroresContenido,
    erroresSucursalId,
}: {
    mostrarSelectorSucursal: boolean;
    sucursales: SucursalOpcion[];
    sucursalId: string;
    setSucursalId: (v: string) => void;
    sucursalActivaNombre: string;
    titulo: string;
    setTitulo: (v: string) => void;
    tipoEmpleo: TipoEmpleo;
    onTipoChange: (t: TipoEmpleo) => void;
    modalidad: ModalidadServicio;
    setModalidad: (m: ModalidadServicio) => void;
    erroresContenido: ErroresVacante;
    erroresSucursalId?: string;
}) {
    return (
        <>
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
                    {erroresContenido.titulo && (
                        <ErrorText msg={erroresContenido.titulo} />
                    )}
                </Field>
                {mostrarSelectorSucursal ? (
                    <Field label="Sucursal" requerido>
                        <CustomSelect
                            value={sucursalId || null}
                            onChange={setSucursalId}
                            placeholder="Selecciona una sucursal"
                            options={sucursales.map((s) => ({
                                value: s.id,
                                label: s.nombre,
                                hint: s.esPrincipal ? 'Matriz' : undefined,
                            }))}
                            testId="select-sucursal"
                        />
                        {erroresSucursalId && (
                            <ErrorText msg={erroresSucursalId} />
                        )}
                    </Field>
                ) : (
                    // Sucursal secundaria: la vacante es para ESTA sucursal —
                    // display de solo lectura como chip informativo.
                    <Field label="Sucursal">
                        <div
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border-2 border-slate-300 rounded-lg"
                            data-testid="sucursal-fija"
                        >
                            <Check
                                className="w-4 h-4 text-emerald-600 shrink-0"
                                strokeWidth={2.5}
                            />
                            <span className="text-sm font-semibold text-slate-800">
                                Para {sucursalActivaNombre || 'esta sucursal'}
                            </span>
                        </div>
                    </Field>
                )}
            </div>

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
                            onClick={() => onTipoChange(t)}
                            testId={`chip-tipo-${t}`}
                        />
                    ))}
                </div>
            </Field>

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
        </>
    );
}

// =============================================================================
// PASO 2 — COMPENSACIÓN
// =============================================================================

function PasoCompensacion({
    aConvenir,
    setAConvenir,
    unidad,
    setUnidad,
    montoMin,
    setMontoMin,
    montoMax,
    setMontoMax,
    showMax,
    labelMonto,
    previewTexto,
    descripcion,
    setDescripcion,
    requisitos,
    setRequisitos,
    reqInput,
    setReqInput,
    agregarRequisito,
    beneficios,
    setBeneficios,
    benInput,
    setBenInput,
    agregarBeneficio,
    erroresContenido,
    erroresBeneficios,
}: {
    aConvenir: boolean;
    setAConvenir: (v: boolean | ((v: boolean) => boolean)) => void;
    unidad: UnidadSalario;
    setUnidad: (u: UnidadSalario) => void;
    montoMin: string;
    setMontoMin: (v: string) => void;
    montoMax: string;
    setMontoMax: (v: string) => void;
    showMax: boolean;
    labelMonto: string;
    previewTexto: string | null;
    descripcion: string;
    setDescripcion: (v: string) => void;
    requisitos: string[];
    setRequisitos: (r: string[] | ((r: string[]) => string[])) => void;
    reqInput: string;
    setReqInput: (v: string) => void;
    agregarRequisito: () => void;
    beneficios: string[];
    setBeneficios: (b: string[] | ((b: string[]) => string[])) => void;
    benInput: string;
    setBenInput: (v: string) => void;
    agregarBeneficio: () => void;
    erroresContenido: ErroresVacante;
    erroresBeneficios?: string;
}) {
    return (
        <>
            <Field label="Salario (MXN)">
                <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                    <Toggle
                        on={aConvenir}
                        onToggle={() => setAConvenir((v) => !v)}
                        testId="toggle-a-convenir"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                        Sueldo a tratar
                    </span>
                    {/* Sprint 9.3:
                         - Antes: "Dejar a convenir" + subtexto largo
                           "Sin monto público — los candidatos preguntan
                           por chat".
                         - Después: "Sueldo a tratar" (mismo término que
                           se renderiza en el card del feed cuando el
                           negocio activa este toggle — ver
                           `formatearPrecioServicio` en utils/servicios.ts).
                         Coherencia visual y reducción de texto. */}
                </div>
                {!aConvenir && (
                    <>
                        <div
                            className="grid items-end gap-2.5"
                            style={{
                                gridTemplateColumns: showMax
                                    ? '1fr 1fr 160px'
                                    : '1fr 160px',
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
                            <CustomSelect<UnidadSalario>
                                value={unidad}
                                onChange={setUnidad}
                                options={UNIDAD_OPCIONES}
                                testId="select-unidad-salario"
                            />
                        </div>
                        {previewTexto && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-full">
                                <Eye
                                    className="w-3.5 h-3.5 text-blue-600 shrink-0"
                                    strokeWidth={2}
                                />
                                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700">
                                    Verán:
                                </span>
                                <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-blue-900 tabular-nums">
                                    {previewTexto}
                                </span>
                            </div>
                        )}
                    </>
                )}
                {erroresContenido.precio && (
                    <ErrorText msg={erroresContenido.precio} />
                )}
            </Field>

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
                {erroresContenido.descripcion && (
                    <ErrorText msg={erroresContenido.descripcion} />
                )}
            </Field>

            <Field
                // Label simplificado Sprint 9.3: antes era "Requisitos ·
                // habilidades clave" — "habilidades clave" era redundante
                // (los requisitos YA son habilidades). Y el subtexto
                // "Agrega entre 3 y 20 elementos. Presiona Enter para
                // añadir" se eliminó: "entre 3 y 20" ya no aplica (es
                // opcional ahora) y "Presiona Enter" se descubre solo al
                // teclear (también está el botón "Agregar" al lado).
                label="Requisitos"
                contador={`${requisitos.length}/20`}
                hint="opcional"
            >
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
                        placeholder="Adobe Illustrator, Inglés avanzado…"
                        maxLength={200}
                        className={CLASES_INPUT}
                        data-testid="input-requisito"
                    />
                    <button
                        type="button"
                        onClick={agregarRequisito}
                        className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800"
                        data-testid="btn-agregar-requisito"
                    >
                        Agregar
                    </button>
                </div>
                {requisitos.length > 0 && (
                    <Tags
                        items={requisitos}
                        onRemove={(t) =>
                            setRequisitos((r) => r.filter((x) => x !== t))
                        }
                    />
                )}
                {erroresContenido.requisitos && (
                    <ErrorText msg={erroresContenido.requisitos} />
                )}
            </Field>

            <Field
                label="Beneficios"
                contador={`${beneficios.length}/8`}
                hint="opcional"
            >
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
                        placeholder="Aguinaldo, Home office, Bonos…"
                        maxLength={100}
                        className={CLASES_INPUT}
                        data-testid="input-beneficio"
                    />
                    <button
                        type="button"
                        onClick={agregarBeneficio}
                        className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm lg:cursor-pointer hover:bg-slate-800"
                        data-testid="btn-agregar-beneficio"
                    >
                        Agregar
                    </button>
                </div>
                {beneficios.length > 0 && (
                    <Tags
                        items={beneficios}
                        onRemove={(t) =>
                            setBeneficios((b) => b.filter((x) => x !== t))
                        }
                    />
                )}
                {erroresBeneficios && <ErrorText msg={erroresBeneficios} />}
            </Field>
        </>
    );
}

// =============================================================================
// PASO 3 — LOGÍSTICA
// =============================================================================

function PasoLogistica({
    horario,
    setHorario,
    dias,
    setDias,
    erroresHorario,
    esEdicion,
    confirmacionesOk,
    onToggleConfirmaciones,
    confirmExpandido,
    onToggleExpandido,
}: {
    horario: string;
    setHorario: (v: string) => void;
    dias: DiaSemanaCodigo[];
    setDias: (d: DiaSemanaCodigo[]) => void;
    erroresHorario?: string;
    esEdicion: boolean;
    confirmacionesOk: boolean;
    onToggleConfirmaciones: () => void;
    confirmExpandido: boolean;
    onToggleExpandido: () => void;
}) {
    return (
        <>
            {/* Sprint 9.3: se eliminó el <Field label="Horario y días"
                hint="opcional"> que envolvía esto. El "· Opcional" ahora
                vive inline al lado del título "Horarios" del StepHeader
                (sin label duplicado encima del componente). */}
            <div>
                <HorarioYDias
                    value={{ horario, dias }}
                    onChange={(v) => {
                        setHorario(v.horario);
                        setDias(v.dias);
                    }}
                />
                {erroresHorario && <ErrorText msg={erroresHorario} />}
            </div>

            {/* Spacer flex-1 — empuja el banner "Activa 30 días" y el
                checkbox de políticas al FONDO del body cuando hay altura
                sobrante. Si el contenido excede el viewport, este spacer
                se colapsa (flex-1 sin espacio = 0px) y todo apila normal
                con scroll. El body padre debe ser `flex flex-col` para
                que `flex-1` funcione aquí. */}
            <div className="flex-1 min-h-0" aria-hidden />

            <div className="flex items-start gap-2 px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium">
                <Clock
                    className="w-4 h-4 shrink-0 mt-0.5 text-slate-500"
                    strokeWidth={1.75}
                />
                <span>
                    Activa por{' '}
                    <b className="text-slate-900">30 días</b>. Al vencer se
                    auto-pausa y la puedes reactivar con un click.
                </span>
            </div>

            {!esEdicion && (
                <ConfirmacionConsolidada
                    checked={confirmacionesOk}
                    onToggle={onToggleConfirmaciones}
                    expandido={confirmExpandido}
                    onToggleExpandido={onToggleExpandido}
                />
            )}
        </>
    );
}

// =============================================================================
// SUBCOMPONENTES INTERNOS
// =============================================================================

const CLASES_INPUT =
    'w-full px-3.5 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-base lg:text-sm 2xl:text-base text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15 font-medium';

function StepHeader({
    titulo,
    hint,
    opcional,
}: {
    titulo: string;
    hint: string;
    /** Si true, agrega "· Opcional" inline al lado del título (mismo
     *  patrón visual que el sufijo del `Field`). Útil para pasos donde
     *  TODO el contenido es opcional (paso 3 Horarios, Sprint 9.3). */
    opcional?: boolean;
}) {
    return (
        <div>
            <h3 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900">
                {titulo}
                {opcional && (
                    <span className="ml-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-500 tracking-normal">
                        · Opcional
                    </span>
                )}
            </h3>
            {hint && (
                <p className="text-base lg:text-sm 2xl:text-base text-slate-600 mt-1 font-medium">
                    {hint}
                </p>
            )}
        </div>
    );
}

function Field({
    label,
    hint,
    contador,
    requerido,
    children,
}: {
    label: string;
    hint?: string;
    contador?: string;
    requerido?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-2 gap-2">
                <label className="block text-sm lg:text-[11px] 2xl:text-sm font-bold tracking-[0.12em] uppercase text-slate-600">
                    {label}
                    {requerido && <span className="text-rose-500 ml-1">*</span>}
                    {hint && (
                        <span className="ml-2 normal-case tracking-normal font-medium text-slate-600 lowercase">
                            · {hint}
                        </span>
                    )}
                </label>
                {contador && (
                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 tabular-nums">
                        {contador}
                    </span>
                )}
            </div>
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
                'text-left px-3 py-2 rounded-lg border-2 min-h-[58px] flex flex-col justify-center lg:cursor-pointer ' +
                (seleccionado
                    ? 'border-slate-900 bg-slate-100 shadow-sm'
                    : 'border-slate-300 bg-white hover:border-slate-500')
            }
            data-testid={testId}
        >
            <strong className="block text-sm font-bold text-slate-900 leading-tight">
                {titulo}
            </strong>
            <span className="block text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-0.5 font-medium leading-tight">
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
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 pointer-events-none">
                {prefijo}
            </span>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={valor}
                onChange={(ev) =>
                    onChange(ev.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder={placeholder}
                className={`${CLASES_INPUT} pl-9`}
                data-testid={testId}
            />
        </div>
    );
}

function Toggle({
    on,
    onToggle,
    testId,
}: {
    on: boolean;
    onToggle: () => void;
    testId?: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={on}
            className={
                'relative w-11 h-6 rounded-full shrink-0 lg:cursor-pointer ' +
                (on ? 'bg-slate-900' : 'bg-slate-300')
            }
            data-testid={testId}
        >
            <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                style={{
                    transform: on ? 'translateX(20px)' : 'translateX(0)',
                }}
            />
        </button>
    );
}

function Tags({
    items,
    onRemove,
}: {
    items: string[];
    onRemove: (t: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            {items.map((t) => (
                <span
                    key={t}
                    className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-blue-100 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700"
                >
                    {t}
                    <button
                        type="button"
                        onClick={() => onRemove(t)}
                        aria-label={`Quitar ${t}`}
                        className="w-[18px] h-[18px] rounded-full grid place-items-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 lg:cursor-pointer"
                    >
                        <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                </span>
            ))}
        </div>
    );
}

function ConfirmacionConsolidada({
    checked,
    onToggle,
    expandido,
    onToggleExpandido,
}: {
    checked: boolean;
    onToggle: () => void;
    expandido: boolean;
    onToggleExpandido: () => void;
}) {
    // Sprint 9.3 (iteración 2):
    //   - SIN card wrapper (inline puro).
    //   - SOLO el checkbox es clickeable (no toda la línea). El texto
    //     y el "Ver más" son botones independientes.
    //   - "Ver más" va INLINE al lado del texto del checkbox, no debajo.
    //     Si el ancho aprieta, flex-wrap mueve el "Ver más" a una segunda
    //     línea automáticamente.
    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2.5">
                {/* Checkbox aislado — único elemento clickeable para
                    marcar/desmarcar. Antes el botón abarcaba toda la
                    línea (checkbox + texto), pero generaba clicks
                    accidentales al leer y un target visual confuso. */}
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label="Confirmo las políticas de publicación"
                    data-testid="check-confirmacion-consolidada"
                    className={
                        'w-[22px] h-[22px] rounded-md grid place-items-center shrink-0 mt-px lg:cursor-pointer ' +
                        (checked
                            ? 'bg-slate-900 border-2 border-slate-900 text-white'
                            : 'border-2 border-slate-400 bg-white hover:border-slate-600')
                    }
                >
                    {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </button>

                {/* Texto NO clickeable + "Ver más" inline. Usan
                    `flex-wrap` para que en pantallas estrechas el "Ver más"
                    se pase a una segunda línea sin truncar el texto. */}
                <div className="flex-1 flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-sm text-slate-900 font-semibold leading-snug">
                        Confirmo las políticas de publicación
                    </span>
                    <button
                        type="button"
                        onClick={onToggleExpandido}
                        aria-expanded={expandido}
                        data-testid="btn-expandir-confirmacion"
                        className="inline-flex items-center gap-0.5 text-sm lg:text-[12px] 2xl:text-sm font-semibold text-slate-600 hover:text-slate-900 lg:cursor-pointer"
                    >
                        <span>{expandido ? 'Ver menos' : 'Ver más'}</span>
                        <ChevronDown
                            className={
                                'w-3.5 h-3.5 transition-transform ' +
                                (expandido ? 'rotate-180' : '')
                            }
                            strokeWidth={2}
                        />
                    </button>
                </div>
            </div>

            {/* Lista de puntos — solo cuando está expandido. Alineada con
                el texto del checkbox (ml-[34px] = 22px checkbox + gap-2.5)
                para crear una columna visual coherente. */}
            {expandido && (
                <ul className="ml-[34px] space-y-1 text-sm lg:text-[12px] 2xl:text-sm text-slate-600 font-medium list-disc list-inside">
                    <li>Esta vacante es real y vigente.</li>
                    <li>
                        El contenido cumple las leyes locales y los términos
                        de AnunciaYA.
                    </li>
                    <li>
                        El contacto con candidatos se coordina entre las partes;
                        AnunciaYA solo conecta.
                    </li>
                </ul>
            )}
        </div>
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
        <div className="flex justify-between items-center mt-1.5 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
            <span className={ok ? 'text-emerald-600 font-semibold' : ''}>
                {izquierda}
            </span>
            <span className="tabular-nums">{derecha}</span>
        </div>
    );
}

function ErrorText({ msg }: { msg: string }) {
    return (
        <div className="flex items-center gap-1.5 text-sm lg:text-[11px] 2xl:text-sm text-rose-600 mt-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            {msg}
        </div>
    );
}
