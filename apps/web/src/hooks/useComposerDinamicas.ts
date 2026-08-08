/**
 * useComposerDinamicas.ts
 * =========================
 * Estado del Composer de Dinámicas — calcado 1:1 del patrón de
 * `useComposerMarketplace.ts`/`useComposerServicios.ts`.
 *
 * Diferencias con MarketPlace:
 *   - Sin `modo` (Vendo/Busco) — Dinámicas no tiene doble sentido.
 *   - Campos propios del dominio: tipoPremio, metodoSorteo, numeroTotalBoletos,
 *     precioBoleto, fechaLimiteInscripcion, reglaDesempate (condicional a
 *     metodoSorteo==='tabla_completa', igual que el chip "Urgente" de
 *     Servicios depende de modo==='solicito').
 *   - Fotos obligatorias mínimo 1 (evidencia del premio) — igual que MP en
 *     modo 'vendo'.
 *   - Las confirmaciones legales NO se validan aquí como parte de "guardar
 *     borrador" — se capturan y validan en el paso separado de PUBLICAR
 *     (`confirmacionesCompletas`), porque un borrador a medias no debería
 *     forzar al organizador a aceptar términos todavía.
 *
 * Persistencia: localStorage `aya:composer:dinamicas:draft-{ns}`.
 *   - `ns='v1'` para creación (un solo borrador por usuario).
 *   - `ns='edit-{dinamicaId}'` para edición.
 *
 * Ubicación: apps/web/src/hooks/useComposerDinamicas.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArchivoFoto } from '../types/archivoFoto';
import type { TipoPremio, MetodoSorteo, ReglaDesempate } from '../types/dinamicas';

// =============================================================================
// CONSTANTES
// =============================================================================

const NAMESPACE_DEFAULT = 'v1';

function claveDraft(ns: string) {
    return `aya:composer:dinamicas:draft-${ns}`;
}

// Mismos límites que el backend (`validations/dinamicas.schema.ts`).
export const TITULO_MIN = 10;
export const TITULO_MAX = 80;
export const DESC_MIN = 20;
export const DESC_MAX = 1000;

// =============================================================================
// SHAPE DEL DRAFT
// =============================================================================

export interface ComposerDinamicasDraft {
    titulo: string;
    descripcion: string;

    fotosPremio: ArchivoFoto[];
    fotoPortadaIndex: number;

    tipoPremio: TipoPremio | null;
    metodoSorteo: MetodoSorteo | null;
    /** String para permitir input vacío; se convierte a number al publicar. */
    numeroTotalBoletos: string;
    /** Número con el que arranca la numeración — default '1' (mismo
     *  comportamiento histórico). El final se calcula solo, no se pide. */
    numeroBoletoInicial: string;
    precioBoleto: string;
    /** ISO datetime string, o '' si no se ha elegido. */
    fechaLimiteInscripcion: string;
    /** Solo relevante si metodoSorteo === 'tabla_completa'. */
    reglaDesempate: ReglaDesempate | null;
    /** K = cuántos lugares premiados hay — default '1' (mismo criterio que
     *  numeroBoletoInicial: casi siempre es 1, se pide solo si cambia). */
    numeroLugaresGanadores: string;
    /** N = a qué intento (bola sin reemplazo) sale cada lugar, en cascada
     *  — el intento N es el 1er lugar, N-1 el 2do, etc. Sin default: cada
     *  rifa tiene un total de boletos distinto. */
    numeroIntentosSorteo: string;

    // Ciudad — viene del GPS, se siembra automáticamente (mismo patrón que
    // MarketPlace/Servicios). Filtra el feed hiperlocal (Fase 3).
    ciudad: string | null;

    // Checklist legal — se envía solo al publicar, pero vive en el draft para
    // que el composer no lo pierda si el usuario cierra y reabre la Dinámica.
    confirmaciones: {
        premioReal: boolean;
        pagoFueraApp: boolean;
        resultadoHonesto: boolean;
    };
}

const DRAFT_INICIAL: ComposerDinamicasDraft = {
    titulo: '',
    descripcion: '',
    fotosPremio: [],
    fotoPortadaIndex: 0,
    tipoPremio: null,
    metodoSorteo: null,
    numeroTotalBoletos: '',
    // Vacíos por default (no '1') — aunque casi siempre valen 1, un input
    // pre-llenado tapa el placeholder y no se entiende de qué se trata a
    // simple vista. Se quedan opcionales en la validación de abajo: vacío
    // = válido, el backend aplica su default de 1 igual.
    numeroBoletoInicial: '',
    precioBoleto: '',
    fechaLimiteInscripcion: '',
    reglaDesempate: null,
    numeroLugaresGanadores: '',
    numeroIntentosSorteo: '',
    ciudad: null,
    confirmaciones: {
        premioReal: false,
        pagoFueraApp: false,
        resultadoHonesto: false,
    },
};

// =============================================================================
// HELPERS
// =============================================================================

export function parseEnteroPositivo(v: string): number | null {
    const limpio = v.replace(/[^\d]/g, '');
    if (!limpio) return null;
    const n = parseInt(limpio, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseDecimalPositivo(v: string): number | null {
    const limpio = v.replace(/[^\d.]/g, '');
    if (!limpio) return null;
    const n = parseFloat(limpio);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// =============================================================================
// PERSISTENCIA
// =============================================================================

function cargarDraft(ns: string): ComposerDinamicasDraft {
    if (typeof window === 'undefined') return DRAFT_INICIAL;
    try {
        const raw = localStorage.getItem(claveDraft(ns));
        if (!raw) return DRAFT_INICIAL;
        const parsed = JSON.parse(raw) as Partial<ComposerDinamicasDraft>;
        return { ...DRAFT_INICIAL, ...parsed };
    } catch {
        return DRAFT_INICIAL;
    }
}

function guardarDraft(ns: string, d: ComposerDinamicasDraft) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveDraft(ns), JSON.stringify(d));
    } catch {
        /* noop */
    }
}

function limpiarDraftDinamicas(ns: string) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(claveDraft(ns));
    } catch {
        /* noop */
    }
}

/** Determina si un draft está vacío — mismo uso que en MP/Servicios (pill
 *  "borrador en progreso" y confirmación al cerrar). */
export function draftEstaIntacto(d: ComposerDinamicasDraft): boolean {
    return (
        d.titulo === '' &&
        d.descripcion === '' &&
        d.fotosPremio.length === 0 &&
        d.tipoPremio === null &&
        d.metodoSorteo === null &&
        d.numeroTotalBoletos === '' &&
        d.numeroBoletoInicial === '' &&
        d.precioBoleto === '' &&
        d.fechaLimiteInscripcion === '' &&
        d.reglaDesempate === null &&
        d.numeroLugaresGanadores === '' &&
        d.numeroIntentosSorteo === '' &&
        d.ciudad === null &&
        !d.confirmaciones.premioReal &&
        !d.confirmaciones.pagoFueraApp &&
        !d.confirmaciones.resultadoHonesto
    );
}

// =============================================================================
// VALIDACIÓN — guardar borrador (NO incluye confirmaciones legales)
// =============================================================================

export type CampoErrorComposerDinamica =
    | 'titulo'
    | 'descripcion'
    | 'fotosPremio'
    | 'tipoPremio'
    | 'metodoSorteo'
    | 'numeroTotalBoletos'
    | 'numeroBoletoInicial'
    | 'precioBoleto'
    | 'fechaLimiteInscripcion'
    | 'numeroLugaresGanadores'
    | 'numeroIntentosSorteo'
    | 'ciudad';

export type ErroresComposerDinamica = Partial<Record<CampoErrorComposerDinamica, string>>;

export interface ResultadoValidacionDinamica {
    errores: ErroresComposerDinamica;
    valido: boolean;
    mensajeBoton: string | null;
}

export function validarComposerDinamica(d: ComposerDinamicasDraft): ResultadoValidacionDinamica {
    const errores: ErroresComposerDinamica = {};

    const titLen = d.titulo.trim().length;
    if (titLen < TITULO_MIN) {
        errores.titulo = titLen === 0 ? 'Escribe un título.' : `Faltan ${TITULO_MIN - titLen} caracteres en el título.`;
    } else if (titLen > TITULO_MAX) {
        errores.titulo = `El título no debe pasar de ${TITULO_MAX} caracteres.`;
    }

    const descLen = d.descripcion.trim().length;
    if (descLen < DESC_MIN) {
        errores.descripcion = descLen === 0 ? 'Escribe una descripción.' : `Faltan ${DESC_MIN - descLen} caracteres en la descripción.`;
    } else if (descLen > DESC_MAX) {
        errores.descripcion = `La descripción no debe pasar de ${DESC_MAX} caracteres.`;
    }

    if (d.fotosPremio.length < 1) {
        errores.fotosPremio = 'Agrega al menos 1 foto o video del premio.';
    }

    if (!d.tipoPremio) {
        errores.tipoPremio = 'Elige el tipo de premio.';
    }

    if (!d.metodoSorteo) {
        errores.metodoSorteo = 'Elige el método de sorteo.';
    }

    if (parseEnteroPositivo(d.numeroTotalBoletos) === null) {
        errores.numeroTotalBoletos = 'Escribe el número total de boletos.';
    }

    // Vacío = válido (el backend lo deja en su default de 1) — solo error
    // si el usuario escribió algo y no es un entero positivo.
    if (d.numeroBoletoInicial !== '' && parseEnteroPositivo(d.numeroBoletoInicial) === null) {
        errores.numeroBoletoInicial = 'El número inicial debe ser mayor a 0.';
    }

    if (parseDecimalPositivo(d.precioBoleto) === null) {
        errores.precioBoleto = 'Escribe el precio por boleto (no puede ser $0).';
    }

    if (!d.fechaLimiteInscripcion) {
        errores.fechaLimiteInscripcion = 'Elige la fecha límite de inscripción.';
    } else if (new Date(d.fechaLimiteInscripcion).getTime() <= Date.now()) {
        errores.fechaLimiteInscripcion = 'La fecha límite debe ser futura.';
    }

    // K/N del sorteo — cruzado contra numeroTotalBoletos, espejo de
    // `validarConfigSorteo` en `validations/dinamicas.schema.ts` (backend).
    // K (lugares) vacío = válido, el backend lo deja en su default de 1 —
    // se usa 1 aquí solo para las comparaciones cruzadas de abajo.
    const totalBoletos = parseEnteroPositivo(d.numeroTotalBoletos);
    const lugares = d.numeroLugaresGanadores === '' ? 1 : parseEnteroPositivo(d.numeroLugaresGanadores);
    const intentos = parseEnteroPositivo(d.numeroIntentosSorteo);

    if (lugares === null) {
        errores.numeroLugaresGanadores = 'El número de lugares premiados debe ser mayor a 0.';
    } else if (totalBoletos !== null && lugares > totalBoletos) {
        errores.numeroLugaresGanadores = 'No puede haber más lugares premiados que boletos totales.';
    }

    if (intentos === null) {
        errores.numeroIntentosSorteo = 'Escribe a qué intento sale el ganador.';
    } else {
        if (lugares !== null && intentos < lugares) {
            errores.numeroIntentosSorteo = 'El número de intentos no puede ser menor a los lugares premiados.';
        } else if (totalBoletos !== null && intentos > totalBoletos) {
            errores.numeroIntentosSorteo = 'El número de intentos no puede exceder el total de boletos.';
        }
    }

    if (!d.ciudad) {
        errores.ciudad = 'Activa tu ubicación para continuar.';
    }

    const orden: CampoErrorComposerDinamica[] = [
        'titulo',
        'descripcion',
        'fotosPremio',
        'tipoPremio',
        'metodoSorteo',
        'numeroTotalBoletos',
        'numeroBoletoInicial',
        'precioBoleto',
        'fechaLimiteInscripcion',
        'numeroLugaresGanadores',
        'numeroIntentosSorteo',
        'ciudad',
    ];
    let mensajeBoton: string | null = null;
    for (const k of orden) {
        if (errores[k]) {
            mensajeBoton = errores[k] ?? null;
            break;
        }
    }

    return { errores, valido: Object.keys(errores).length === 0, mensajeBoton };
}

/** Las 3 confirmaciones deben estar aceptadas antes de publicar — se valida
 *  aparte de `validarComposerDinamica` porque no aplica a guardar borrador. */
export function confirmacionesCompletas(d: ComposerDinamicasDraft): boolean {
    return d.confirmaciones.premioReal && d.confirmaciones.pagoFueraApp && d.confirmaciones.resultadoHonesto;
}

// =============================================================================
// VALIDACIÓN — guardar borrador (LAXA: solo título + ciudad)
// =============================================================================
//
// Espejo del `crearDinamicaSchema` laxo del backend. Antes "Guardar" exigía
// exactamente lo mismo que "Publicar" (`validarComposerDinamica` de arriba),
// lo que dejaba "borrador" sin diferencia real — había que terminar casi
// toda la Dinámica para poder guardar cualquier avance. Un borrador debe
// servir para "anotar el título y volver después".
export interface ResultadoValidacionGuardar {
    valido: boolean;
    mensajeBoton: string | null;
}

export function validarParaGuardar(d: ComposerDinamicasDraft): ResultadoValidacionGuardar {
    const titLen = d.titulo.trim().length;
    if (titLen === 0) {
        return { valido: false, mensajeBoton: 'Escribe un título.' };
    }
    if (titLen < TITULO_MIN) {
        return { valido: false, mensajeBoton: `Faltan ${TITULO_MIN - titLen} caracteres en el título.` };
    }
    if (titLen > TITULO_MAX) {
        return { valido: false, mensajeBoton: `El título no debe pasar de ${TITULO_MAX} caracteres.` };
    }
    if (!d.ciudad) {
        return { valido: false, mensajeBoton: 'Activa tu ubicación para continuar.' };
    }
    return { valido: true, mensajeBoton: null };
}

// =============================================================================
// HOOK
// =============================================================================

interface UseComposerDinamicasOpts {
    /** Namespace para localStorage. Default `'v1'` (CREAR). Para EDITAR usar
     *  `'edit-{dinamicaId}'` para no mezclar borradores. */
    storageNamespace?: string;
}

export function useComposerDinamicas(opts: UseComposerDinamicasOpts = {}) {
    const ns = opts.storageNamespace ?? NAMESPACE_DEFAULT;

    const [draft, setDraft] = useState<ComposerDinamicasDraft>(() => cargarDraft(ns));
    const draftBaseRef = useRef<ComposerDinamicasDraft>(draft);

    useEffect(() => {
        guardarDraft(ns, draft);
    }, [draft, ns]);

    const actualizar = useCallback(
        (
            cambio:
                | Partial<ComposerDinamicasDraft>
                | ((d: ComposerDinamicasDraft) => Partial<ComposerDinamicasDraft>),
        ) => {
            setDraft((d) => {
                const patch = typeof cambio === 'function' ? cambio(d) : cambio;
                return { ...d, ...patch };
            });
        },
        [],
    );

    const setConfirmacionesUnificadas = useCallback((acepta: boolean) => {
        setDraft((d) => ({
            ...d,
            confirmaciones: {
                premioReal: acepta,
                pagoFueraApp: acepta,
                resultadoHonesto: acepta,
            },
        }));
    }, []);

    const limpiar = useCallback(() => {
        limpiarDraftDinamicas(ns);
        setDraft(DRAFT_INICIAL);
    }, [ns]);

    /** Sembrado automático de ciudad (GPS) — NO es una edición del usuario,
     *  así que también actualiza la base de comparación para que
     *  `estaIntacto` no se dispare solo por esto (mismo patrón que MP). */
    const sembrarUbicacion = useCallback((ciudad: string | null) => {
        setDraft((prev) => {
            const nuevo = { ...prev, ciudad };
            draftBaseRef.current = { ...draftBaseRef.current, ciudad };
            return nuevo;
        });
    }, []);

    /** Hidrata el draft con valores de una Dinámica existente (modo edición).
     *  Llamar UNA SOLA VEZ cuando la Dinámica se carga (ref-guard). */
    const hidratarDesdeDinamica = useCallback((d: Partial<ComposerDinamicasDraft>) => {
        setDraft((prev) => {
            const nuevo = { ...prev, ...d };
            draftBaseRef.current = nuevo;
            return nuevo;
        });
    }, []);

    const validacion = useMemo(() => validarComposerDinamica(draft), [draft]);
    const validacionGuardar = useMemo(() => validarParaGuardar(draft), [draft]);

    return {
        draft,
        actualizar,
        setConfirmacionesUnificadas,
        sembrarUbicacion,
        limpiar,
        hidratarDesdeDinamica,
        // Validación LAXA (botón "Guardar" — solo título + ciudad)
        validoGuardar: validacionGuardar.valido,
        mensajeBotonGuardar: validacionGuardar.mensajeBoton,
        // Validación ESTRICTA (botón "Publicar" — todo el formulario)
        errores: validacion.errores,
        valido: validacion.valido,
        mensajeBoton: validacion.mensajeBoton,
        confirmacionesCompletas: confirmacionesCompletas(draft),
        // Utilidades
        estaIntacto: JSON.stringify(draft) === JSON.stringify(draftBaseRef.current),
    };
}

export default useComposerDinamicas;
