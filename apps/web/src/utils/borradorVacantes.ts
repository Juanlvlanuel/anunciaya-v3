/**
 * borradorVacantes.ts
 * =====================
 * Helpers para leer / guardar / descartar el borrador del wizard de
 * Vacantes de Business Studio. Vive en localStorage y está **namespaced
 * por sucursal activa** — cada sucursal/contexto tiene su propio
 * borrador independiente (no se cruzan entre Matriz y Sucursal Norte,
 * etc.).
 *
 * Clave: `aya:bs:vacantes:draft-v1:{sucursalActivaId}`
 *
 * Por qué namespacear por sucursal:
 *   - BS opera por contexto de sucursal: cuando Matriz está activa y
 *     empieza un borrador, ese borrador "pertenece" al contexto Matriz.
 *     Si el dueño cambia a Sucursal Norte, no debería ver el draft de
 *     Matriz como si fuera de Sucursal Norte (confuso e incorrecto).
 *   - Gerentes (sucursal fija) solo ven el draft de SU sucursal.
 *   - Si no hay sucursal activa (caso edge — no debería pasar en BS),
 *     las funciones son no-op para evitar contaminar el storage.
 *
 * Mismo patrón que `borradorComposerServicios.ts` pero adaptado al shape
 * del wizard de Vacantes:
 *   - Captura todos los campos editables (sucursal, puesto, tipo, modalidad,
 *     salario, descripción, requisitos, beneficios, horario, días).
 *   - NO captura las confirmaciones legales del paso 3 — esas se piden
 *     siempre frescas al publicar (decisión de cumplimiento).
 *   - NO captura el paso actual del wizard — al continuar el borrador
 *     el wizard arranca en paso 1 y el usuario navega libremente
 *     (los campos pre-cargados están todos disponibles desde ahí).
 *
 * Decisión: solo aplica al modo CREAR. La edición de una vacante
 * existente NO usa borrador — los cambios se persisten al pulsar
 * "Guardar" o se descartan al cerrar. Para sostener cambios entre
 * sesiones de edición habría que introducir un namespace
 * `edit-{vacanteId}` aparte (Sprint futuro si surge la necesidad).
 *
 * Ubicación: apps/web/src/utils/borradorVacantes.ts
 */

import type { PrecioServicio, TipoEmpleo, ModalidadServicio } from '../types/servicios';

/** Construye la clave de localStorage namespaced por sucursal. */
function claveDraft(sucursalActivaId: string): string {
    return `aya:bs:vacantes:draft-v1:${sucursalActivaId}`;
}

export interface BorradorVacante {
    sucursalId: string;
    titulo: string;
    descripcion: string;
    tipoEmpleo: TipoEmpleo;
    modalidad: ModalidadServicio;
    /** Precio en su forma cruda (discriminated union). Incluye
     *  rangos con 0/0 que el slideover normaliza a 'a-convenir' al
     *  enviar — para el borrador conservamos exactamente lo que el
     *  usuario tenía. */
    precio: PrecioServicio;
    /** Flag del toggle "Dejar a convenir" — separado de `precio`
     *  porque el toggle puede estar activo aunque haya valores en
     *  los inputs (UX pulida del slideover). */
    aConvenir: boolean;
    /** Sufijo de unidad seleccionado en el selector (mes-rango,
     *  mes-fijo, hora, proyecto). Se persiste para que al continuar
     *  el borrador el selector recupere la unidad exacta. */
    unidad: 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto';
    montoMin: string;
    montoMax: string;
    requisitos: string[];
    beneficios: string[];
    horario: string;
    /** Días marcados (L, M, X, J, V, S, D — strings del componente
     *  `HorarioYDias`). Si está vacío significa "sin restricción". */
    dias: string[];
}

/**
 * Detecta si un borrador está "intacto" — todos los campos vacíos
 * o con su valor default. Cuando el wizard se monta por primera vez
 * persiste un borrador con todos los defaults; no queremos que el
 * banner se dispare por eso. Solo aparece cuando hay AL MENOS un
 * cambio significativo del usuario.
 */
function estaIntacto(b: BorradorVacante): boolean {
    return (
        !b.titulo.trim() &&
        !b.descripcion.trim() &&
        !b.horario.trim() &&
        b.requisitos.length === 0 &&
        b.beneficios.length === 0 &&
        b.dias.length === 0 &&
        !b.montoMin.trim() &&
        !b.montoMax.trim() &&
        !b.aConvenir &&
        // sucursalId vacío indica que el usuario nunca entró al paso 1
        // y la sucursal aún no se inicializó desde el contexto.
        // Si tiene sucursalId pero nada más, también lo tratamos como
        // intacto (la sucursal se pre-llena automáticamente desde el
        // contexto del store, no es una acción del usuario).
        true
    );
}

/**
 * Lee el borrador de la sucursal activa. Devuelve null si:
 *   - no hay sucursalActivaId (caso edge — fuera de BS)
 *   - no hay borrador guardado para esa sucursal
 *   - el borrador está intacto (sin cambios significativos)
 */
export function leerBorradorVacantes(
    sucursalActivaId: string | null | undefined,
): BorradorVacante | null {
    if (typeof window === 'undefined') return null;
    if (!sucursalActivaId) return null;
    try {
        const raw = localStorage.getItem(claveDraft(sucursalActivaId));
        if (!raw) return null;
        const b = JSON.parse(raw) as BorradorVacante;
        if (estaIntacto(b)) return null;
        return b;
    } catch {
        return null;
    }
}

/**
 * Guarda el borrador asociado a la sucursal activa. Sobrescribe el
 * anterior si existía. No-op si no hay sucursalActivaId.
 */
export function guardarBorradorVacantes(
    sucursalActivaId: string | null | undefined,
    b: BorradorVacante,
): void {
    if (typeof window === 'undefined') return;
    if (!sucursalActivaId) return;
    try {
        localStorage.setItem(claveDraft(sucursalActivaId), JSON.stringify(b));
    } catch {
        /* noop: cuota de localStorage llena o navegador privado */
    }
}

/** Elimina el borrador de la sucursal activa. */
export function descartarBorradorVacantes(
    sucursalActivaId: string | null | undefined,
): void {
    if (typeof window === 'undefined') return;
    if (!sucursalActivaId) return;
    try {
        localStorage.removeItem(claveDraft(sucursalActivaId));
    } catch {
        /* noop */
    }
}

/**
 * Devuelve un resumen liviano para el banner detector — sin tener
 * que cargar el draft completo (que puede pesar varios KB cuando
 * hay muchos requisitos / beneficios). Lee solo `titulo` y `puesto`
 * para mostrar como preview.
 */
export interface BorradorVacanteResumen {
    titulo: string;
    descripcionPreview: string;
    tieneSalario: boolean;
    cantidadRequisitos: number;
    cantidadBeneficios: number;
}

export function resumenBorradorVacantes(
    sucursalActivaId: string | null | undefined,
): BorradorVacanteResumen | null {
    const b = leerBorradorVacantes(sucursalActivaId);
    if (!b) return null;
    return {
        titulo: b.titulo.trim(),
        descripcionPreview: b.descripcion.trim().slice(0, 80),
        tieneSalario:
            b.aConvenir ||
            !!b.montoMin.trim() ||
            !!b.montoMax.trim(),
        cantidadRequisitos: b.requisitos.length,
        cantidadBeneficios: b.beneficios.length,
    };
}
