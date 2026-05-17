/**
 * PaginaPublicarServicio.tsx
 * ===========================
 * Wizard de publicar/editar Servicios (3 pasos, handoff v2).
 *
 *   Paso 1 · Qué necesitas — categoría + título + descripción + urgente
 *   Paso 2 · Detalles      — fotos + modalidad + presupuesto + zonas
 *   Paso 3 · Revisa y publica — preview + 3 confirmaciones
 *
 * 2 modos según ruta:
 *   - `/servicios/publicar?modo=ofrezco|solicito` → CREAR
 *   - `/servicios/publicar/:publicacionId`        → EDITAR
 *
 * En modo CREAR: el FAB pasa el `modo` por query string; el draft vive en
 * localStorage namespace `'v2'`; al guardar hace POST y muestra modal de éxito.
 *
 * En modo EDITAR: la `:publicacionId` se usa para cargar la publicación,
 * hidratar el draft con los valores actuales (solo la primera vez), y al
 * guardar hace PUT (sin modal — redirige directo al detalle).
 *
 * El draft de edición vive en namespace `'edit-{id}'` para no colisionar
 * con el draft de creación.
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaPublicarServicio.tsx
 */

import { useEffect, useRef, useState } from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Sparkles } from 'lucide-react';
import { useGpsStore } from '../../../stores/useGpsStore';
import {
    parseEntero,
    subtipoPorCategoria,
    tipoPorModo,
    useWizardServicios,
    type WizardServiciosDraft,
} from '../../../hooks/useWizardServicios';
import {
    useCrearPublicacionServicio,
    useEditarPublicacionServicio,
    useEliminarFotoServicioHuerfana,
    usePublicacionServicio,
} from '../../../hooks/queries/useServicios';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import { WizardServiciosLayout } from '../../../components/servicios/wizard/WizardServiciosLayout';
import { Paso1QueNecesitas } from '../../../components/servicios/wizard/Paso1QueNecesitas';
import { Paso2Detalles } from '../../../components/servicios/wizard/Paso2Detalles';
import { Paso3Revisar } from '../../../components/servicios/wizard/Paso3Revisar';
import { ModalExitoPublicacion } from '../../../components/servicios/wizard/ModalExitoPublicacion';
import { ModalSugerenciaSeccion } from '../../../components/servicios/wizard/ModalSugerenciaSeccion';
import { Spinner } from '../../../components/ui/Spinner';
import type {
    ModoServicio,
    PrecioServicio,
    PublicacionDetalle,
} from '../../../types/servicios';
import { notificar } from '../../../utils/notificaciones';

/** Versión del checklist legal — se persiste en BD para auditoría. */
const VERSION_CONFIRMACIONES = 'v2-2026-05-16';

const NOMBRES_PASO: Record<1 | 2 | 3, string> = {
    1: 'Qué necesitas',
    2: 'Detalles',
    3: 'Revisa y publica',
};

export function PaginaPublicarServicio() {
    const navigate = useNavigate();
    const { publicacionId } = useParams<{ publicacionId?: string }>();
    const [searchParams] = useSearchParams();
    const modoInicial = parseModo(searchParams.get('modo'));

    const esEdicion = !!publicacionId;
    const storageNamespace = esEdicion ? `edit-${publicacionId}` : undefined;

    const ciudadGps = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const lat = useGpsStore((s) => s.latitud);
    const lng = useGpsStore((s) => s.longitud);

    // Si es edición, cargar la publicación. El modo inicial del wizard sale
    // de la publicación cargada (no del query string).
    const publicacionQuery = usePublicacionServicio(publicacionId);
    const publicacion = publicacionQuery.data ?? null;

    const {
        draft,
        paso,
        actualizar,
        pasoAnterior,
        siguientePaso,
        limpiar,
        pasoValido,
        nextHelp,
        totalPasos,
        hidratarDesdePublicacion,
    } = useWizardServicios({
        modoInicial: esEdicion ? null : modoInicial,
        storageNamespace,
    });

    // Hidratar el draft con la publicación al cargarla (solo una vez).
    const hidratadoRef = useRef(false);
    useEffect(() => {
        if (!esEdicion || !publicacion || hidratadoRef.current) return;
        hidratadoRef.current = true;
        hidratarDesdePublicacion(publicacionAlDraft(publicacion));
    }, [esEdicion, publicacion, hidratarDesdePublicacion]);

    const crearMutation = useCrearPublicacionServicio();
    const editarMutation = useEditarPublicacionServicio();
    const enviando = crearMutation.isPending || editarMutation.isPending;
    const [idCreado, setIdCreado] = useState<string | null>(null);
    // Sprint 7.7 — sugerencia de moderación pasiva (backend devuelve 409
    // con `sugerencia` si detecta señales de sección equivocada).
    const [sugerenciaModeracion, setSugerenciaModeracion] = useState<
        'marketplace' | null
    >(null);

    // Tracking de fotos subidas a R2 en esta sesión. Si el usuario cancela
    // o borra el borrador, las limpiamos de R2 para no dejar huérfanas.
    // Se inicializa con las fotos del draft (rescatadas de localStorage) para
    // que también se limpien si el usuario rescata y luego cancela.
    const urlsSubidasEnSesion = useRef<Set<string>>(
        new Set(draft.fotos ?? []),
    );
    const eliminarHuerfanaMutation = useEliminarFotoServicioHuerfana();

    /** Limpia de R2 todas las URLs trackeadas (fire-and-forget). El backend
     *  valida reference count, así que si una URL ya está en una publicación
     *  creada queda protegida. */
    function limpiarFotosHuerfanas() {
        const urls = Array.from(urlsSubidasEnSesion.current);
        urlsSubidasEnSesion.current.clear();
        for (const url of urls) {
            eliminarHuerfanaMutation.mutate(url);
        }
    }

    // Si no hay modo (ni del query string ni del draft), redirige. En edición
    // no aplica — el modo viene de la publicación cargada via hidratación.
    useEffect(() => {
        if (esEdicion) return;
        if (draft.modo === null && modoInicial === null) {
            notificar.info(
                'Elige primero qué quieres publicar (botón "+ Publicar" en Servicios).',
            );
            navigate('/servicios', { replace: true });
        }
    }, [esEdicion, draft.modo, modoInicial, navigate]);

    // Sembrar ubicación del GPS.
    useEffect(() => {
        if (
            draft.latitud === null &&
            draft.longitud === null &&
            lat !== null &&
            lng !== null
        ) {
            actualizar({
                latitud: lat,
                longitud: lng,
                ciudad: ciudadGps,
            });
        }
    }, [draft.latitud, draft.longitud, lat, lng, ciudadGps, actualizar]);

    async function manejarBack() {
        if (paso === 1) {
            const seguro = await notificar.confirmar(
                '¿Salir del wizard?',
                'Las fotos subidas y el borrador se eliminarán para no dejar archivos huérfanos.',
            );
            if (seguro) {
                limpiarFotosHuerfanas();
                limpiar();
                navigate('/servicios');
            }
            return;
        }
        pasoAnterior();
    }

    async function manejarBorrarBorrador() {
        const seguro = await notificar.confirmar(
            '¿Borrar el borrador?',
            'Vas a perder todo lo que escribiste y las fotos subidas se eliminarán.',
        );
        if (seguro) {
            limpiarFotosHuerfanas();
            limpiar();
            notificar.info('Borrador eliminado.');
        }
    }

    async function publicar() {
        if (!pasoValido || enviando) return;
        if (!draft.modo) {
            notificar.error('Faltan datos básicos del wizard.');
            return;
        }
        if (
            draft.latitud === null ||
            draft.longitud === null ||
            !draft.ciudad
        ) {
            notificar.error(
                'No detectamos tu ubicación. Activa el GPS y vuelve a intentar.',
            );
            return;
        }
        if (!draft.modalidad) {
            notificar.error('Selecciona una modalidad.');
            return;
        }

        if (esEdicion && publicacionId) {
            // ── Modo edición: PUT con payload de actualización ──────────
            const payload = construirPayloadEdicion(draft);
            try {
                const res = await editarMutation.mutateAsync({
                    publicacionId,
                    payload,
                });
                if (res.success) {
                    notificar.exito('¡Cambios guardados!');
                    limpiar();
                    navigate(`/servicios/${publicacionId}`, {
                        replace: true,
                    });
                    return;
                }
                const msg =
                    (res.errores && res.errores.length > 0
                        ? res.errores.join(' · ')
                        : res.message) ??
                    'No pudimos guardar los cambios.';
                notificar.error(msg);
            } catch {
                notificar.error(
                    'No pudimos conectar con el servidor. Intenta de nuevo.',
                );
            }
            return;
        }

        // ── Modo crear: POST con payload completo ──────────────────
        await publicarCrear(false);
    }

    /** Helper: ejecuta el POST de crear. `forzar=true` agrega
     *  `confirmadoPorUsuario` para saltar la moderación pasiva. */
    async function publicarCrear(forzar: boolean) {
        const payload = construirPayload(draft);
        if (forzar) payload.confirmadoPorUsuario = true;
        try {
            const res = (await crearMutation.mutateAsync(payload)) as {
                success: boolean;
                code?: number;
                data?: { id: string };
                message?: string;
                errores?: string[];
                sugerencia?: 'marketplace';
            };
            if (res.success && res.data?.id) {
                setIdCreado(res.data.id);
                return;
            }
            // 409 → sugerencia de moderación pasiva
            if (res.code === 409 && res.sugerencia) {
                setSugerenciaModeracion(res.sugerencia);
                return;
            }
            const msg =
                (res.errores && res.errores.length > 0
                    ? res.errores.join(' · ')
                    : res.message) ??
                'No pudimos crear la publicación.';
            notificar.error(msg);
        } catch (err: unknown) {
            // Axios lanza para status no-2xx. Detectar 409 en el error.
            const status = (err as { response?: { status?: number } })?.response
                ?.status;
            const data = (
                err as {
                    response?: {
                        data?: {
                            sugerencia?: 'marketplace';
                            message?: string;
                        };
                    };
                }
            )?.response?.data;
            if (status === 409 && data?.sugerencia) {
                setSugerenciaModeracion(data.sugerencia);
                return;
            }
            notificar.error(
                data?.message ??
                    'No pudimos conectar con el servidor. Intenta de nuevo.',
            );
        }
    }

    function manejarSiguiente() {
        if (!pasoValido) return;
        if (paso === totalPasos) {
            publicar();
            return;
        }
        siguientePaso();
    }

    function manejarVerAnuncio() {
        if (!idCreado) return;
        const id = idCreado;
        // Las URLs ahora están en la publicación creada → vacío el set
        // SIN disparar el delete (la BD las protege con reference count).
        urlsSubidasEnSesion.current.clear();
        limpiar();
        setIdCreado(null);
        navigate(`/servicios/${id}`, { replace: true });
    }

    function manejarPublicarOtro() {
        urlsSubidasEnSesion.current.clear();
        setIdCreado(null);
        limpiar();
    }

    // En edición, esperar a que la publicación cargue para hidratar el draft.
    if (esEdicion && publicacionQuery.isPending && !publicacion) {
        return (
            <>
                <ServiciosHeader
                    variante="pagina"
                    onBack={() => navigate(`/servicios/${publicacionId}`)}
                />
                <div className="min-h-full bg-transparent flex items-center justify-center py-20">
                    <Spinner tamanio="lg" />
                </div>
            </>
        );
    }

    if (esEdicion && (publicacionQuery.isError || !publicacion)) {
        return (
            <>
                <ServiciosHeader
                    variante="pagina"
                    onBack={() => navigate('/mis-publicaciones')}
                />
                <div className="min-h-full bg-transparent">
                    <div className="lg:mx-auto lg:max-w-3xl lg:px-6 2xl:px-8 px-4 py-12 text-center max-w-md mx-auto">
                        <h2 className="text-[18px] font-extrabold text-slate-900">
                            No encontramos esta publicación
                        </h2>
                        <p className="mt-2 text-[14px] text-slate-600">
                            Quizás se eliminó o no es tuya.
                        </p>
                        <button
                            onClick={() => navigate('/mis-publicaciones')}
                            className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer"
                        >
                            Volver a mis publicaciones
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <ServiciosHeader
                variante="pagina"
                onBack={manejarBack}
                breadcrumb={
                    <>
                        {esEdicion ? 'Editar anuncio' : 'Publicar anuncio'}
                        <span className="mx-2 text-white/40">·</span>
                        <span className="text-white">
                            Paso {paso} de {totalPasos}: {NOMBRES_PASO[paso]}
                        </span>
                    </>
                }
                slotDerecho={
                    <div className="hidden lg:flex items-center gap-3">
                        {paso > 1 && (
                            <button
                                type="button"
                                data-testid="wizard-btn-atras-desktop"
                                onClick={pasoAnterior}
                                disabled={enviando}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-lg text-white/80 hover:text-white border-[1.5px] border-white/20 hover:border-white/40 lg:cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                                Atrás
                            </button>
                        )}
                        {/* En edición, "Borrar borrador" no aplica — sería
                            confuso (no borras el draft, descartas cambios). */}
                        {!esEdicion && (
                            <button
                                type="button"
                                data-testid="wizard-borrar-borrador"
                                onClick={manejarBorrarBorrador}
                                className="inline-flex items-center px-3 py-2 text-[13px] font-semibold rounded-lg text-white/80 hover:text-white border-[1.5px] border-white/20 hover:border-white/40 lg:cursor-pointer transition-colors"
                            >
                                Borrar borrador
                            </button>
                        )}
                        <button
                            type="button"
                            data-testid="wizard-btn-siguiente-desktop"
                            disabled={!pasoValido || enviando}
                            onClick={manejarSiguiente}
                            className={
                                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[14px] lg:cursor-pointer transition-opacity ' +
                                (pasoValido && !enviando
                                    ? 'bg-linear-to-b from-sky-500 to-sky-700 text-white shadow-cta-sky'
                                    : 'bg-white/15 text-white/40 cursor-not-allowed border-[1.5px] border-white/15')
                            }
                        >
                            {enviando
                                ? esEdicion
                                    ? 'Guardando...'
                                    : 'Publicando...'
                                : paso === totalPasos
                                  ? esEdicion
                                      ? 'Guardar cambios'
                                      : 'Publicar'
                                  : 'Siguiente'}
                            {!enviando &&
                                (paso === totalPasos ? (
                                    esEdicion ? (
                                        <Save
                                            className="w-4 h-4"
                                            strokeWidth={2.5}
                                        />
                                    ) : (
                                        <Sparkles
                                            className="w-4 h-4"
                                            strokeWidth={2}
                                        />
                                    )
                                ) : (
                                    <ArrowRight
                                        className="w-4 h-4"
                                        strokeWidth={2.5}
                                    />
                                ))}
                        </button>
                    </div>
                }
                subtituloMobile={`Paso ${paso} de ${totalPasos}: ${NOMBRES_PASO[paso]}`}
            />

            <WizardServiciosLayout
                paso={paso}
                pasoValido={pasoValido}
                enviando={enviando}
                nextHelp={nextHelp}
                onSiguiente={manejarSiguiente}
                onAtras={pasoAnterior}
            >
                {paso === 1 && (
                    <Paso1QueNecesitas draft={draft} actualizar={actualizar} />
                )}
                {paso === 2 && (
                    <Paso2Detalles
                        draft={draft}
                        actualizar={actualizar}
                        urlsSubidasEnSesion={urlsSubidasEnSesion}
                    />
                )}
                {paso === 3 && (
                    <Paso3Revisar draft={draft} actualizar={actualizar} />
                )}
            </WizardServiciosLayout>

            {/* Modal de éxito solo en CREAR (en EDITAR redirige directo). */}
            {!esEdicion && (
                <ModalExitoPublicacion
                    open={!!idCreado}
                    onVerAnuncio={manejarVerAnuncio}
                    onPublicarOtro={manejarPublicarOtro}
                />
            )}

            {/* Sprint 7.7 — sugerencia de moderación pasiva. Se abre si el
                backend devuelve 409 con `sugerencia`. El usuario decide. */}
            <ModalSugerenciaSeccion
                open={!!sugerenciaModeracion}
                seccion={sugerenciaModeracion ?? 'marketplace'}
                onContinuarAqui={() => {
                    setSugerenciaModeracion(null);
                    publicarCrear(true); // reenvía con confirmadoPorUsuario=true
                }}
                onIrAOtraSeccion={() => {
                    setSugerenciaModeracion(null);
                    // Limpia el draft de servicios y manda al wizard de MP.
                    limpiarFotosHuerfanas();
                    limpiar();
                    navigate('/marketplace/publicar');
                }}
                onClose={() => setSugerenciaModeracion(null)}
            />
        </>
    );
}

// =============================================================================
// HELPERS
// =============================================================================

function parseModo(raw: string | null): ModoServicio | null {
    if (raw === 'ofrezco' || raw === 'solicito') return raw;
    return null;
}

/**
 * Convierte el draft del wizard al payload exacto que espera el backend
 * (`crearPublicacionSchema`). Reglas:
 *   - modo='solicito' → presupuesto={min,max} si ambos llenos, sino null.
 *     precio siempre {kind:'a-convenir'}.
 *   - modo='ofrezco'  → precio={kind:'rango', min, max} si ambos llenos.
 *     Si solo uno: {kind:'fijo', monto}. Si ninguno: {kind:'a-convenir'}.
 *     presupuesto siempre undefined.
 */
function construirPayload(d: WizardServiciosDraft): Record<string, unknown> {
    const esSolicito = d.modo === 'solicito';
    const min = parseEntero(d.budgetMin);
    const max = parseEntero(d.budgetMax);

    let precio: PrecioServicio;
    let presupuesto: { min: number; max: number } | undefined;

    if (esSolicito) {
        precio = { kind: 'a-convenir' };
        presupuesto =
            min !== null && max !== null
                ? { min, max }
                : undefined;
    } else {
        // Ofrezco — el budget va a `precio`.
        if (min !== null && max !== null) {
            precio =
                min === max
                    ? { kind: 'fijo', monto: min, moneda: 'MXN' }
                    : { kind: 'rango', min, max, moneda: 'MXN' };
        } else if (min !== null) {
            precio = { kind: 'fijo', monto: min, moneda: 'MXN' };
        } else if (max !== null) {
            precio = { kind: 'fijo', monto: max, moneda: 'MXN' };
        } else {
            precio = { kind: 'a-convenir' };
        }
        presupuesto = undefined;
    }

    return {
        modo: d.modo,
        tipo: tipoPorModo(d.modo),
        subtipo: subtipoPorCategoria(d.categoria, d.modo),
        titulo: d.titulo.trim(),
        descripcion: d.descripcion.trim(),
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        precio,
        modalidad: d.modalidad,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonasAproximadas: d.zonasAproximadas,
        skills: [],
        requisitos: [],
        horario: undefined,
        diasSemana: [],
        presupuesto,
        categoria: esSolicito ? (d.categoria ?? undefined) : undefined,
        urgente: esSolicito ? d.urgente : false,
        confirmaciones: {
            legal: d.confirmaciones.legal,
            verdadera: d.confirmaciones.verdadera,
            coordinacion: d.confirmaciones.coordinacion,
            version: VERSION_CONFIRMACIONES,
        },
    };
}

/**
 * Convierte una `PublicacionDetalle` (BD) al shape del draft del wizard
 * para hidratar en modo edición. Inverso del flujo de `construirPayload`.
 *
 * Mapea precio (5 variantes) y presupuesto a `budgetMin/Max` strings:
 *   - precio.kind='fijo'  → budgetMin=budgetMax=monto
 *   - precio.kind='hora'/'mensual' → budgetMin=monto, budgetMax=''
 *   - precio.kind='rango' → budgetMin=min, budgetMax=max
 *   - precio.kind='a-convenir' + presupuesto → budgetMin/Max del presupuesto
 *   - else → ambos vacíos
 */
function publicacionAlDraft(
    p: PublicacionDetalle,
): Partial<WizardServiciosDraft> {
    let budgetMin = '';
    let budgetMax = '';

    if (p.modo === 'solicito' && p.presupuesto) {
        budgetMin = String(p.presupuesto.min);
        budgetMax = String(p.presupuesto.max);
    } else if (p.modo === 'ofrezco' && p.precio) {
        const pr = p.precio;
        if (pr.kind === 'fijo' || pr.kind === 'hora' || pr.kind === 'mensual') {
            budgetMin = String(pr.monto);
            budgetMax = String(pr.monto);
        } else if (pr.kind === 'rango') {
            budgetMin = String(pr.min);
            budgetMax = String(pr.max);
        }
    }

    return {
        modo: p.modo,
        categoria: p.categoria,
        titulo: p.titulo,
        descripcion: p.descripcion,
        urgente: p.urgente,
        fotos: p.fotos,
        fotoPortadaIndex: p.fotoPortadaIndex,
        modalidad: p.modalidad,
        budgetMin,
        budgetMax,
        zonasAproximadas: p.zonasAproximadas,
        latitud: p.ubicacionAproximada.lat,
        longitud: p.ubicacionAproximada.lng,
        ciudad: p.ciudad,
        // En edición no se vuelven a aceptar las confirmaciones (ya están en
        // BD). El paso 3 las muestra todas marcadas para que el usuario pueda
        // avanzar, pero si cambia algo crítico TODO confirmar de nuevo (out
        // of scope este sprint).
        confirmaciones: {
            legal: true,
            verdadera: true,
            coordinacion: true,
        },
    };
}

/**
 * Construir payload de edición (PUT) — solo manda los campos editables
 * que NO requieren validación cruzada (modo/tipo/subtipo NO se editan).
 *
 * El backend valida con `actualizarPublicacionSchema` (Zod) que acepta
 * campos opcionales.
 */
function construirPayloadEdicion(
    d: WizardServiciosDraft,
): Record<string, unknown> {
    const esSolicito = d.modo === 'solicito';
    const min = parseEntero(d.budgetMin);
    const max = parseEntero(d.budgetMax);

    let precio: PrecioServicio;
    let presupuesto: { min: number; max: number } | null = null;

    if (esSolicito) {
        precio = { kind: 'a-convenir' };
        presupuesto = min !== null && max !== null ? { min, max } : null;
    } else {
        if (min !== null && max !== null) {
            precio =
                min === max
                    ? { kind: 'fijo', monto: min, moneda: 'MXN' }
                    : { kind: 'rango', min, max, moneda: 'MXN' };
        } else if (min !== null) {
            precio = { kind: 'fijo', monto: min, moneda: 'MXN' };
        } else if (max !== null) {
            precio = { kind: 'fijo', monto: max, moneda: 'MXN' };
        } else {
            precio = { kind: 'a-convenir' };
        }
    }

    return {
        titulo: d.titulo.trim(),
        descripcion: d.descripcion.trim(),
        fotos: d.fotos,
        fotoPortadaIndex: d.fotoPortadaIndex,
        precio,
        modalidad: d.modalidad,
        latitud: d.latitud!,
        longitud: d.longitud!,
        ciudad: d.ciudad!,
        zonasAproximadas: d.zonasAproximadas,
        presupuesto,
    };
}

export default PaginaPublicarServicio;
