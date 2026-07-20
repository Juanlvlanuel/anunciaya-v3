/**
 * useComposerNegocioPublicacion.ts
 * ===================================
 * Estado del Composer de publicaciones de Negocio. Mucho más simple que el
 * de MarketPlace/Servicios: sin modo, sin categoría estructurada, sin
 * confirmaciones legales — "todo tipo, libre" (texto + fotos + precio
 * opcional).
 *
 * Persistencia: localStorage `aya:composer:negocio-publicacion:draft-{ns}`.
 *   - `v1` para creación.
 *   - `edit-{publicacionId}` para edición.
 *
 * Ubicación: apps/web/src/hooks/useComposerNegocioPublicacion.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const NAMESPACE_DEFAULT = 'v1';

function claveDraft(ns: string) {
    return `aya:composer:negocio-publicacion:draft-${ns}`;
}

const TEXTO_MIN = 1;
const TEXTO_MAX = 2000;
const PRECIO_MAX = 999999;

export interface ComposerNegocioPublicacionDraft {
    texto: string;
    /** String para permitir input vacío; se convierte a number al publicar. */
    precio: string;
    fotos: string[];
    fotoPortadaIndex: number;
}

const DRAFT_INICIAL: ComposerNegocioPublicacionDraft = {
    texto: '',
    precio: '',
    fotos: [],
    fotoPortadaIndex: 0,
};

/** Parsea un string a número no-negativo, devuelve null si vacío o inválido. */
export function parsePrecioOpcional(v: string): number | null {
    const limpio = v.trim();
    if (!limpio) return null;
    const n = Number(limpio.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function cargarDraft(ns: string): ComposerNegocioPublicacionDraft {
    if (typeof window === 'undefined') return DRAFT_INICIAL;
    try {
        const raw = localStorage.getItem(claveDraft(ns));
        if (!raw) return DRAFT_INICIAL;
        const parsed = JSON.parse(raw) as Partial<ComposerNegocioPublicacionDraft>;
        return { ...DRAFT_INICIAL, ...parsed };
    } catch {
        return DRAFT_INICIAL;
    }
}

function guardarDraft(ns: string, d: ComposerNegocioPublicacionDraft) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(claveDraft(ns), JSON.stringify(d));
    } catch {
        /* noop */
    }
}

function limpiarDraftNegocioPublicacion(ns: string) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(claveDraft(ns));
    } catch {
        /* noop */
    }
}

export function draftEstaIntacto(d: ComposerNegocioPublicacionDraft): boolean {
    return d.texto === '' && d.precio === '' && d.fotos.length === 0;
}

/** Compara dos drafts campo a campo (usado para detectar cambios reales en
 *  modo edición, donde el draft nace prellenado y nunca está "vacío"). */
function draftsIguales(
    a: ComposerNegocioPublicacionDraft,
    b: ComposerNegocioPublicacionDraft,
): boolean {
    return (
        a.texto === b.texto &&
        a.precio === b.precio &&
        a.fotoPortadaIndex === b.fotoPortadaIndex &&
        a.fotos.length === b.fotos.length &&
        a.fotos.every((url, i) => url === b.fotos[i])
    );
}

export type CampoErrorComposerNegocio = 'texto' | 'precio';
export type ErroresComposerNegocio = Partial<Record<CampoErrorComposerNegocio, string>>;

export interface ResultadoValidacionComposerNegocio {
    errores: ErroresComposerNegocio;
    valido: boolean;
    mensajeBoton: string | null;
}

export function validarComposerNegocio(
    d: ComposerNegocioPublicacionDraft,
): ResultadoValidacionComposerNegocio {
    const errores: ErroresComposerNegocio = {};

    const len = d.texto.trim().length;
    if (len < TEXTO_MIN) {
        errores.texto = 'Escribe algo para tu publicación.';
    } else if (len > TEXTO_MAX) {
        errores.texto = `El texto no debe pasar de ${TEXTO_MAX} caracteres.`;
    }

    if (d.precio.trim() !== '') {
        const precio = parsePrecioOpcional(d.precio);
        if (precio === null) {
            errores.precio = 'El precio no es válido.';
        } else if (precio > PRECIO_MAX) {
            errores.precio = `El precio máximo es $${PRECIO_MAX.toLocaleString('es-MX')}.`;
        }
    }

    const orden: CampoErrorComposerNegocio[] = ['texto', 'precio'];
    let mensajeBoton: string | null = null;
    for (const k of orden) {
        if (errores[k]) {
            mensajeBoton = errores[k] ?? null;
            break;
        }
    }

    return {
        errores,
        valido: Object.keys(errores).length === 0,
        mensajeBoton,
    };
}

interface UseComposerNegocioPublicacionOpts {
    storageNamespace?: string;
}

export function useComposerNegocioPublicacion(opts: UseComposerNegocioPublicacionOpts = {}) {
    const ns = opts.storageNamespace ?? NAMESPACE_DEFAULT;

    const [draft, setDraft] = useState<ComposerNegocioPublicacionDraft>(() =>
        cargarDraft(ns),
    );

    // "Base de comparación" para detectar cambios reales: en creación es el
    // draft vacío (DRAFT_INICIAL); en edición, `hidratarDesdePublicacion` la
    // mueve al contenido original de la publicación — así el composer de
    // edición no confunde "llegó prellenado" con "el usuario cambió algo".
    const draftBaseRef = useRef<ComposerNegocioPublicacionDraft>(DRAFT_INICIAL);

    useEffect(() => {
        guardarDraft(ns, draft);
    }, [draft, ns]);

    const actualizar = useCallback(
        (
            cambio:
                | Partial<ComposerNegocioPublicacionDraft>
                | ((d: ComposerNegocioPublicacionDraft) => Partial<ComposerNegocioPublicacionDraft>),
        ) => {
            setDraft((d) => {
                const patch = typeof cambio === 'function' ? cambio(d) : cambio;
                return { ...d, ...patch };
            });
        },
        [],
    );

    const limpiar = useCallback(() => {
        limpiarDraftNegocioPublicacion(ns);
        setDraft(DRAFT_INICIAL);
    }, [ns]);

    const hidratarDesdePublicacion = useCallback(
        (d: Partial<ComposerNegocioPublicacionDraft>) => {
            setDraft((prev) => {
                const nuevo = { ...prev, ...d };
                draftBaseRef.current = nuevo;
                return nuevo;
            });
        },
        [],
    );

    const validacion = useMemo(() => validarComposerNegocio(draft), [draft]);

    return {
        draft,
        actualizar,
        limpiar,
        hidratarDesdePublicacion,
        errores: validacion.errores,
        valido: validacion.valido,
        mensajeBoton: validacion.mensajeBoton,
        estaIntacto: draftsIguales(draft, draftBaseRef.current),
    };
}

export default useComposerNegocioPublicacion;
