/**
 * ============================================================================
 * PÁGINA: Alta Rápida de MarketPlace
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/marketplace/PaginaAltaRapidaMarketplace.tsx
 *
 * PROPÓSITO:
 * Carga masiva de artículos personales en venta (solo modo='vendo') — Fase 2
 * de Alta Rápida (Fase 1 fue Business Studio, ver
 * docs/arquitectura/Alta_Rapida_Catalogo.md). Tres entradas convergen en la
 * misma tabla de revisión: fotos sueltas (Gemini las agrupa por objeto
 * físico), texto pegado y captura manual.
 *
 * DIFERENCIAS CLAVE vs Alta Rápida de Catálogo (BS):
 * - Las fotos NO son "un menú con varios artículos" — son fotos SUELTAS de
 *   objetos distintos, cada uno con 1+ ángulos. Gemini las agrupa por objeto
 *   físico (`sugerirLoteArticulosMarketplace`); si duda, separa en vez de
 *   fusionar. Si una foto quedó en la fila equivocada, quitarla desde el
 *   modal "Fotos del artículo" (`ModalFotosFila`) la manda al carrusel de
 *   "fotos sueltas" al pie de la tabla, reasignable a otra fila.
 * - La fila solo muestra 1 miniatura de portada — click abre `ModalFotosFila`
 *   para ver/agregar/quitar todas las fotos de ese artículo, mismo lenguaje
 *   visual que la galería de ComposerMarketplace.tsx.
 * - Checklist legal y ubicación se capturan UNA vez para todo el lote, no
 *   por fila (ver `crearArticulosLoteMarketplaceSchema` en el backend).
 * - Categoría/Condición usan `CustomSelect` (con `portal`) en vez de
 *   `<select>` nativo — no se recortan dentro del scroll de la tabla.
 * - La IA nunca sugiere precio a partir de una foto (rarísimo que una foto
 *   de un artículo personal traiga el precio visible) — sí lo hace desde
 *   texto pegado, cuando el vendedor ya lo escribió.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Camera,
    Check,
    ChevronDown,
    ChevronLeft,
    ClipboardPaste,
    FileText,
    ImagePlus,
    Loader2,
    Package,
    Plus,
    ShoppingBag,
    Trash2,
    X,
    Zap,
} from 'lucide-react';

import { Boton } from '@/components/ui/Boton';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { ModalImagenes } from '@/components/ui/ModalImagenes';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useScrollAppShell } from '@/hooks/useScrollAppShell';
import {
    useCategoriasMarketplace,
    useCrearArticulosMarketplaceLote,
    useEliminarFotoMarketplaceHuerfana,
    useSugerirArticulosMarketplaceLoteIA,
    useSugerirArticulosMarketplaceLoteTextoIA,
    type CrearArticulosLoteMarketplacePayload,
    type FilaArticuloLoteMarketplace,
    type SugerenciaArticuloLoteMarketplace,
    type SugerenciaArticuloTextoMarketplace,
} from '@/hooks/queries/useMarketplace';
import { useGpsStore } from '@/stores/useGpsStore';
import { api } from '@/services/api';
import { optimizarImagen } from '@/utils/optimizarImagen';
import { notificar } from '@/utils/notificaciones';
import { VERSION_CONFIRMACIONES_MP_COMPOSER } from '@/utils/composerMarketplacePayload';
import type { ArchivoFoto } from '@/types/archivoFoto';
import type { CondicionArticulo } from '@/types/marketplace';

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_FILAS = 100;
/** Mismo tope que `sugerirLoteArticulosIASchema` en el backend. */
const MAX_IMAGENES_FOTO = 24;
/** Mismo tope que `sugerirLoteArticulosTextoIASchema` en el backend. */
const TEXTO_MAX_CHARS = 5000;

const LIMITES = {
    tituloMin: 10,
    tituloMax: 80,
    descripcionMin: 20,
    descripcionMax: 1000,
    precioMax: 999999,
};

/** Sin entrada "Sin especificar" — `CustomSelect` maneja volver a `null` vía `onClear`. */
const OPCIONES_CONDICION: { value: CondicionArticulo; label: string }[] = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'seminuevo', label: 'Seminuevo' },
    { value: 'usado', label: 'Usado' },
    { value: 'para_reparar', label: 'Para reparar' },
];

const ESTILOS_CSS = `
  @keyframes alta-rapida-mp-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .alta-rapida-mp-icon-bounce {
    animation: alta-rapida-mp-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sube una foto a R2 (optimizada a WebP) y devuelve la URL pública, o `null`
 * si falla — standalone porque acá se suben varias fotos en paralelo, no una
 * sola con estado propio como `useFotosUploaderMarketplace`.
 */
async function subirFotoMarketplace(file: File): Promise<string | null> {
    try {
        const blob = await optimizarImagen(file, { maxWidth: 1600, quality: 0.85 });
        const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
        const respuesta = await api.post<{
            success: boolean;
            data?: { uploadUrl: string; publicUrl: string };
        }>('/marketplace/upload-imagen', { nombreArchivo, contentType: 'image/webp' });
        if (!respuesta.data.success || !respuesta.data.data) return null;
        const { uploadUrl, publicUrl } = respuesta.data.data;
        const putRespuesta = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/webp' },
        });
        return putRespuesta.ok ? publicUrl : null;
    } catch {
        return null;
    }
}

type OrigenFilaMP = 'manual' | 'ia_foto' | 'ia_texto';

interface FilaLoteMP {
    clientId: string;
    categoriaId: number | null;
    titulo: string;
    descripcion: string;
    precio: string;
    condicion: CondicionArticulo | null;
    fotos: ArchivoFoto[];
    origen: OrigenFilaMP;
}

function nuevoClientId(): string {
    return `fila-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crearFilaVacia(origen: OrigenFilaMP = 'manual', fotos: ArchivoFoto[] = []): FilaLoteMP {
    return {
        clientId: nuevoClientId(),
        categoriaId: null,
        titulo: '',
        descripcion: '',
        precio: '',
        condicion: null,
        fotos,
        origen,
    };
}

function filaDesdeSugerenciaFoto(grupo: SugerenciaArticuloLoteMarketplace, urls: string[]): FilaLoteMP {
    return {
        clientId: nuevoClientId(),
        categoriaId: grupo.categoriaId,
        titulo: grupo.titulo,
        descripcion: grupo.descripcion,
        precio: '',
        condicion: grupo.condicion,
        fotos: grupo.indicesFotos
            .filter((i) => i >= 0 && i < urls.length)
            .map((i) => ({ url: urls[i], tipo: 'imagen' as const })),
        origen: 'ia_foto',
    };
}

function filaDesdeSugerenciaTexto(item: SugerenciaArticuloTextoMarketplace): FilaLoteMP {
    return {
        clientId: nuevoClientId(),
        categoriaId: item.categoriaId,
        titulo: item.titulo,
        descripcion: item.descripcion,
        precio: item.precio !== null ? String(item.precio) : '',
        condicion: item.condicion,
        fotos: [],
        origen: 'ia_texto',
    };
}

function validarFila(fila: FilaLoteMP): string[] {
    const errores: string[] = [];
    if (fila.categoriaId === null) errores.push('Categoría: selecciona una');
    const titulo = fila.titulo.trim();
    if (titulo.length < LIMITES.tituloMin || titulo.length > LIMITES.tituloMax) {
        errores.push(`Título: entre ${LIMITES.tituloMin} y ${LIMITES.tituloMax} caracteres`);
    }
    const descripcion = fila.descripcion.trim();
    if (descripcion.length < LIMITES.descripcionMin || descripcion.length > LIMITES.descripcionMax) {
        errores.push(`Descripción: entre ${LIMITES.descripcionMin} y ${LIMITES.descripcionMax} caracteres`);
    }
    const precio = Number(fila.precio);
    if (fila.precio.trim() === '' || Number.isNaN(precio) || precio <= 0) {
        errores.push('Precio: debe ser mayor a 0');
    } else if (precio > LIMITES.precioMax) {
        errores.push(`Precio: no puede exceder $${LIMITES.precioMax.toLocaleString('es-MX')}`);
    }
    if (fila.fotos.length === 0) errores.push('Fotos: agrega al menos 1');
    return errores;
}

/**
 * Rechazo por moderación (422) u otro error HTTP — mismo patrón que
 * `manejarErrorHttp` en ComposerMarketplace.tsx: axios solo resuelve 2xx, así
 * que el body con `erroresPorFila` viaja en `error.response.data`, no en el
 * valor resuelto de la mutación.
 */
function manejarErrorPublicarLote(
    error: unknown,
    filasListas: FilaLoteMP[],
    setErroresModeracionPorFila: (mapa: Map<string, string>) => void
) {
    const data = (error as { response?: { data?: { message?: string; erroresPorFila?: { indice: number; mensaje: string }[] } } })
        ?.response?.data;
    if (data?.erroresPorFila) {
        const mapa = new Map<string, string>();
        data.erroresPorFila.forEach((err) => {
            const fila = filasListas[err.indice];
            if (fila) mapa.set(fila.clientId, err.mensaje);
        });
        setErroresModeracionPorFila(mapa);
        notificar.error(data.message ?? 'Algunas filas no pasaron la revisión de contenido — revisa los campos en rojo');
        return;
    }
    notificar.error('No pudimos conectar con el servidor. Intenta de nuevo.');
}

// =============================================================================
// SUBCOMPONENTE: Tira de fotos sueltas sin asignar
// =============================================================================

function FotosSinAsignar({
    fotos,
    filas,
    onAsignar,
    onDescartar,
}: {
    fotos: ArchivoFoto[];
    filas: FilaLoteMP[];
    onAsignar: (foto: ArchivoFoto, destino: string) => void;
    onDescartar: (foto: ArchivoFoto) => void;
}) {
    if (fotos.length === 0) return null;
    return (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2" data-testid="fotos-sin-asignar">
            <p className="text-sm font-bold text-amber-800">
                {fotos.length} foto{fotos.length === 1 ? '' : 's'} sin asignar — dile a qué artículo pertenece(n)
            </p>
            <div className="flex flex-wrap gap-2">
                {fotos.map((foto) => (
                    <div key={foto.url} className="flex flex-col items-center gap-1">
                        <div className="relative">
                            <img src={foto.url} alt="" className="h-14 w-14 rounded-lg object-cover border-2 border-amber-300" />
                            <button
                                type="button"
                                onClick={() => onDescartar(foto)}
                                aria-label="Descartar foto"
                                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow cursor-pointer"
                            >
                                <X className="h-3 w-3" strokeWidth={3} />
                            </button>
                        </div>
                        <select
                            onChange={(e) => {
                                if (e.target.value) onAsignar(foto, e.target.value);
                                e.target.value = '';
                            }}
                            defaultValue=""
                            className="w-24 rounded-md border border-amber-300 bg-white text-[11px] font-medium text-slate-700 px-1 py-0.5 cursor-pointer"
                        >
                            <option value="" disabled>Asignar a…</option>
                            <option value="__nueva__">+ Nueva fila</option>
                            {filas.map((f, i) => (
                                <option key={f.clientId} value={f.clientId}>
                                    Fila {i + 1}{f.titulo ? `: ${f.titulo.slice(0, 18)}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Mismo tope que `campoFotos` en marketplace.schema.ts (backend). */
const MAX_FOTOS_POR_ARTICULO = 12;

// =============================================================================
// SUBCOMPONENTE: Modal "Fotos del artículo" — ver/agregar/quitar todas las
// fotos de UNA fila. Header con gradiente teal + ícono + círculos
// decorativos, mismo patrón "Modal de Detalle" (TC-6A) que
// `ModalGestionApartados.tsx` (Mi Catálogo, MarketPlace) — no el header
// blanco genérico de `Modal`/`ModalBottom`. El grid de fotos y el hover-zoom
// replican la galería de `ComposerMarketplace.tsx` (aspect-square, pill
// "Portada", Trash2 revelado con gradiente inferior); click en una foto abre
// `ModalImagenes` para verla a pantalla completa, igual que en Business
// Studio. Se monta UNA sola vez a nivel página, muestra la fila activa según
// `filaFotosAbiertaId`.
// =============================================================================

function ModalFotosFila({
    abierto,
    onCerrar,
    fotos,
    subiendo,
    onAgregarFotos,
    onEliminarFoto,
}: {
    abierto: boolean;
    onCerrar: () => void;
    fotos: ArchivoFoto[];
    subiendo: boolean;
    onAgregarFotos: () => void;
    onEliminarFoto: (foto: ArchivoFoto) => void;
}) {
    const [indiceImagenAbierta, setIndiceImagenAbierta] = useState<number | null>(null);
    const alTope = fotos.length >= MAX_FOTOS_POR_ARTICULO;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="lg"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            headerOscuro
            discriminador="_modalFotosFilaAltaRapidaMP"
        >
            <div className="flex flex-col min-h-[80vh] max-h-[93vh] lg:min-h-0 lg:max-h-[75vh]">
                {/* Header gradiente teal — mismo acento de marca que MarketPlace
                    usa en toda la app (ver ModalGestionApartados.tsx). */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #115e59, #0d9488)',
                        boxShadow: '0 4px 16px rgba(17,94,89,0.35)',
                    }}
                >
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <ImagePlus className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">Fotos del artículo</h3>
                            <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">Alta Rápida · MarketPlace</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">
                            {fotos.length}/{MAX_FOTOS_POR_ARTICULO}
                        </span>
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
                    <div className="grid grid-cols-3 gap-2">
                        {fotos.map((foto, i) => (
                            <div key={foto.url} className="relative aspect-square rounded-xl overflow-hidden group">
                                {i === 0 && (
                                    <span
                                        aria-hidden
                                        className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-teal-600/90 text-white text-[11px] font-semibold shadow pointer-events-none"
                                    >
                                        Portada
                                    </span>
                                )}
                                <img
                                    src={foto.url}
                                    alt=""
                                    onClick={() => setIndiceImagenAbierta(i)}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110 lg:cursor-pointer"
                                />
                                <div
                                    className="absolute bottom-0 inset-x-0 flex items-center justify-end py-1.5 px-1.5"
                                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onEliminarFoto(foto); }}
                                        aria-label="Quitar foto"
                                        data-testid={`btn-quitar-foto-modal-${i}`}
                                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!alTope && (
                            <button
                                type="button"
                                onClick={onAgregarFotos}
                                disabled={subiendo}
                                data-testid="btn-agregar-fotos-modal"
                                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-teal-400 hover:text-teal-600 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                            >
                                {subiendo ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <>
                                        <ImagePlus className="h-6 w-6" />
                                        <span className="text-xs font-semibold">Agregar</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    {alTope && (
                        <p className="mt-3 text-xs font-semibold text-slate-500">
                            Llegaste al máximo de {MAX_FOTOS_POR_ARTICULO} fotos por artículo.
                        </p>
                    )}
                </div>
            </div>

            <ModalImagenes
                images={fotos}
                initialIndex={indiceImagenAbierta ?? 0}
                isOpen={indiceImagenAbierta !== null}
                onClose={() => setIndiceImagenAbierta(null)}
            />
        </ModalAdaptativo>
    );
}

// =============================================================================
// SUBCOMPONENTE: Modal "Descripción del artículo" — editor de texto ampliado,
// se abre desde el ícono de Descripción (columna propia en desktop, junto al
// título en móvil). Se monta UNA sola vez a nivel página, muestra la fila
// activa según `filaDescripcionAbiertaId`.
// =============================================================================

function ModalDescripcionFila({
    abierto,
    onCerrar,
    descripcion,
    onCambiar,
}: {
    abierto: boolean;
    onCerrar: () => void;
    descripcion: string;
    onCambiar: (valor: string) => void;
}) {
    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="lg"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            headerOscuro
            discriminador="_modalDescripcionFilaAltaRapidaMP"
        >
            <div className="flex flex-col min-h-[80vh] max-h-[93vh] lg:min-h-0 lg:max-h-[70vh]">
                {/* Header gradiente teal — mismo acento de marca que ModalFotosFila. */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #115e59, #0d9488)',
                        boxShadow: '0 4px 16px rgba(17,94,89,0.35)',
                    }}
                >
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">Descripción del artículo</h3>
                            <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">Alta Rápida · MarketPlace</span>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white">
                            {descripcion.length}/{LIMITES.descripcionMax}
                        </span>
                    </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
                    <textarea
                        value={descripcion}
                        onChange={(e) => onCambiar(e.target.value)}
                        placeholder="Describe el artículo: estado, detalles, motivo de venta…"
                        maxLength={LIMITES.descripcionMax}
                        rows={8}
                        autoFocus
                        data-testid="textarea-descripcion-modal"
                        className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                        Mínimo {LIMITES.descripcionMin} caracteres.
                    </p>
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// SUBCOMPONENTE: Tarjeta de artículo (móvil, <lg) — desktop usa `FilaTablaMP`
// =============================================================================

function FilaCardMP({
    fila,
    errores,
    conError,
    mensajeModeracion,
    categorias,
    onActualizar,
    onEliminar,
    onAbrirFotos,
    onAbrirDescripcion,
}: {
    fila: FilaLoteMP;
    errores: string[];
    conError: boolean;
    mensajeModeracion: string | null;
    categorias: { id: number; nombre: string }[];
    onActualizar: (cambios: Partial<FilaLoteMP>) => void;
    onEliminar: () => void;
    onAbrirFotos: () => void;
    onAbrirDescripcion: () => void;
}) {
    const tieneError = conError || mensajeModeracion !== null;
    const descripcionCompleta = fila.descripcion.trim().length >= LIMITES.descripcionMin;
    return (
        <div
            className={`relative rounded-xl border-2 p-3 space-y-2.5 ${
                tieneError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
            }`}
            data-testid={`fila-alta-rapida-mp-${fila.clientId}`}
        >
            {fila.origen !== 'manual' && (
                <span
                    className="absolute -left-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-purple-500 z-10"
                    title="Sugerido por IA — revisa antes de publicar"
                />
            )}

            {/* Foto + Título + Descripción + Eliminar (misma línea) */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onAbrirFotos}
                    aria-label={fila.fotos.length > 0 ? 'Ver y gestionar fotos' : 'Agregar fotos'}
                    data-testid={`btn-fotos-fila-${fila.clientId}`}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600 cursor-pointer overflow-hidden"
                >
                    {fila.fotos.length > 0 ? (
                        <>
                            <img src={fila.fotos[0].url} alt="" className="h-full w-full object-cover" />
                            {fila.fotos.length > 1 && (
                                <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[9px] font-bold text-white">
                                    +{fila.fotos.length - 1}
                                </span>
                            )}
                        </>
                    ) : (
                        <ImagePlus className="h-4 w-4" />
                    )}
                </button>

                <input
                    type="text"
                    value={fila.titulo}
                    onChange={(e) => onActualizar({ titulo: e.target.value })}
                    placeholder="Título del artículo"
                    maxLength={LIMITES.tituloMax}
                    data-testid={`input-titulo-${fila.clientId}`}
                    className="flex-1 min-w-0 h-10 px-3 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                <button
                    type="button"
                    onClick={onAbrirDescripcion}
                    aria-label="Editar descripción"
                    data-testid={`btn-descripcion-fila-${fila.clientId}`}
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                        descripcionCompleta
                            ? 'border-teal-400 bg-teal-50 text-teal-600'
                            : 'border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600'
                    }`}
                >
                    <FileText className="h-4 w-4" />
                    {descripcionCompleta && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-600">
                            <Check className="h-2 w-2 text-white" strokeWidth={4} />
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onEliminar}
                    aria-label="Eliminar fila"
                    className="shrink-0 p-2 rounded-lg cursor-pointer text-red-600 hover:bg-red-100"
                    data-testid={`btn-eliminar-fila-${fila.clientId}`}
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>

            {/* Categoría + Condición (misma línea) + Precio (línea propia) */}
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <SelectCategoriaFila
                        categoriaId={fila.categoriaId}
                        categorias={categorias}
                        onCambio={(id) => onActualizar({ categoriaId: id })}
                        testId={`select-categoria-${fila.clientId}`}
                    />
                    <SelectCondicionFila
                        condicion={fila.condicion}
                        onCambio={(v) => onActualizar({ condicion: v })}
                        testId={`select-condicion-${fila.clientId}`}
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={fila.precio}
                        onChange={(e) => onActualizar({ precio: e.target.value })}
                        placeholder="0"
                        data-testid={`input-precio-${fila.clientId}`}
                        className="w-full h-10 pl-6 pr-2 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                </div>
            </div>

            {conError && <p className="text-xs font-semibold text-red-600">{errores.join(' · ')}</p>}
            {mensajeModeracion && <p className="text-xs font-semibold text-red-600">{mensajeModeracion}</p>}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES: Selects de Categoría / Condición — envuelven `CustomSelect`
// (componente ya existente en la app, `components/ui/CustomSelect.tsx`) con
// `portal` activado, así el menú no se recorta dentro del scroll de la tabla
// (ver docs — el dropdown hecho a mano antes de esto no tenía este soporte).
// =============================================================================

function SelectCategoriaFila({
    categoriaId,
    categorias,
    onCambio,
    testId,
}: {
    categoriaId: number | null;
    categorias: { id: number; nombre: string }[];
    onCambio: (id: number) => void;
    testId: string;
}) {
    return (
        <CustomSelect<string>
            value={categoriaId !== null ? String(categoriaId) : null}
            options={categorias.map((c) => ({ value: String(c.id), label: c.nombre }))}
            onChange={(v) => onCambio(Number(v))}
            placeholder="Categoría…"
            portal
            anchoMenu={240}
            testId={testId}
            claseControl="h-10 px-3"
            claseActivo="border-teal-500 ring-2 ring-teal-500/15"
        />
    );
}

function SelectCondicionFila({
    condicion,
    onCambio,
    testId,
}: {
    condicion: CondicionArticulo | null;
    onCambio: (v: CondicionArticulo | null) => void;
    testId: string;
}) {
    return (
        <CustomSelect<CondicionArticulo>
            value={condicion}
            options={OPCIONES_CONDICION}
            onChange={onCambio}
            onClear={() => onCambio(null)}
            placeholder="Sin especificar"
            portal
            anchoMenu={200}
            testId={testId}
            claseControl="h-10 px-3"
            claseActivo="border-teal-500 ring-2 ring-teal-500/15"
        />
    );
}

/** Columnas compartidas entre el header y las filas de la tabla desktop —
 *  un solo lugar para ajustar anchos sin que header y filas se desalineen. */
const GRID_TABLA_MP = 'grid-cols-[70px_minmax(170px,1fr)_60px_150px_130px_100px_80px]';

// =============================================================================
// SUBCOMPONENTE: Fila de la tabla desktop (≥lg) — mismo contenido que
// `FilaCardMP` pero en columnas de grid, mismo patrón visual (header oscuro +
// filas con scroll interno) que la tabla de Alta Rápida de Catálogo (BS).
// =============================================================================

function FilaTablaMP({
    fila,
    errores,
    conError,
    mensajeModeracion,
    categorias,
    onActualizar,
    onEliminar,
    onAbrirFotos,
    onAbrirDescripcion,
}: {
    fila: FilaLoteMP;
    errores: string[];
    conError: boolean;
    mensajeModeracion: string | null;
    categorias: { id: number; nombre: string }[];
    onActualizar: (cambios: Partial<FilaLoteMP>) => void;
    onEliminar: () => void;
    onAbrirFotos: () => void;
    onAbrirDescripcion: () => void;
}) {
    const tieneError = conError || mensajeModeracion !== null;
    const descripcionCompleta = fila.descripcion.trim().length >= LIMITES.descripcionMin;
    return (
        <div
            className={`grid ${GRID_TABLA_MP} gap-2 px-3 py-2.5 items-start border-t border-slate-200 ${
                tieneError ? 'bg-red-50' : 'bg-white'
            }`}
            data-testid={`fila-alta-rapida-mp-${fila.clientId}`}
        >
            {/* Fotos — 1 miniatura; click abre el modal de gestión (ver/agregar/quitar todas). */}
            <button
                type="button"
                onClick={onAbrirFotos}
                aria-label={fila.fotos.length > 0 ? 'Ver y gestionar fotos' : 'Agregar fotos'}
                data-testid={`btn-fotos-fila-${fila.clientId}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600 cursor-pointer overflow-hidden"
            >
                {fila.origen !== 'manual' && (
                    <span
                        className="absolute -left-1.5 -top-1.5 h-2 w-2 rounded-full bg-purple-500 z-10"
                        title="Sugerido por IA — revisa antes de publicar"
                    />
                )}
                {fila.fotos.length > 0 ? (
                    <>
                        <img src={fila.fotos[0].url} alt="" className="h-full w-full object-cover" />
                        {fila.fotos.length > 1 && (
                            <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[9px] font-bold text-white">
                                +{fila.fotos.length - 1}
                            </span>
                        )}
                    </>
                ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                )}
            </button>

            {/* Título */}
            <div>
                <input
                    type="text"
                    value={fila.titulo}
                    onChange={(e) => onActualizar({ titulo: e.target.value })}
                    placeholder="Título del artículo"
                    maxLength={LIMITES.tituloMax}
                    data-testid={`input-titulo-${fila.clientId}`}
                    className="w-full h-9 px-2.5 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {tieneError && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                        {[...errores, mensajeModeracion].filter(Boolean).join(' · ')}
                    </p>
                )}
            </div>

            {/* Descripción — ícono que abre el modal de edición. */}
            <button
                type="button"
                onClick={onAbrirDescripcion}
                aria-label="Editar descripción"
                data-testid={`btn-descripcion-fila-${fila.clientId}`}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                    descripcionCompleta
                        ? 'border-teal-400 bg-teal-50 text-teal-600'
                        : 'border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600'
                }`}
            >
                <FileText className="h-3.5 w-3.5" />
                {descripcionCompleta && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-600">
                        <Check className="h-2 w-2 text-white" strokeWidth={4} />
                    </span>
                )}
            </button>

            {/* Categoría */}
            <SelectCategoriaFila
                categoriaId={fila.categoriaId}
                categorias={categorias}
                onCambio={(id) => onActualizar({ categoriaId: id })}
                testId={`select-categoria-${fila.clientId}`}
            />

            {/* Condición */}
            <SelectCondicionFila
                condicion={fila.condicion}
                onCambio={(v) => onActualizar({ condicion: v })}
                testId={`select-condicion-${fila.clientId}`}
            />

            {/* Precio */}
            <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                    type="number"
                    min="0"
                    step="1"
                    value={fila.precio}
                    onChange={(e) => onActualizar({ precio: e.target.value })}
                    placeholder="0"
                    data-testid={`input-precio-${fila.clientId}`}
                    className="w-full h-10 pl-6 pr-2 bg-slate-50 border-2 border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-center">
                <button
                    type="button"
                    onClick={onEliminar}
                    aria-label="Eliminar fila"
                    className="p-1.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-100"
                    data-testid={`btn-eliminar-fila-${fila.clientId}`}
                >
                    <Trash2 className="h-4.5 w-4.5" />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaAltaRapidaMarketplace() {
    const navigate = useNavigate();
    // Registra el contenedor con scroll interno de la página en el store
    // global (mismo patrón "app-shell propio" que PaginaMisPublicaciones.tsx
    // — MainLayout renderiza esta ruta con el header FUERA del scroll y
    // espera que la propia página provea su contenedor scrolleable; sin
    // esto la página no tenía scroll vertical en móvil).
    const cuerpoRef = useScrollAppShell<HTMLDivElement>();
    const { data: categorias = [] } = useCategoriasMarketplace();
    const crearLoteMutation = useCrearArticulosMarketplaceLote();
    const sugerirFotoMutation = useSugerirArticulosMarketplaceLoteIA();
    const sugerirTextoMutation = useSugerirArticulosMarketplaceLoteTextoIA();
    const eliminarHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();
    const inputFotoRef = useRef<HTMLInputElement>(null);
    const inputFotoFilaRef = useRef<HTMLInputElement>(null);
    const filaObjetivoRef = useRef<string | null>(null);
    /**
     * Fotos subidas a R2 en esta sesión que aún no quedaron atadas a un
     * artículo publicado — mismo mecanismo que `urlsSubidasEnSesion` en
     * ComposerMarketplace.tsx, para no dejar huérfanas si se cancela el
     * proceso. Al desmontar la página (volver, cerrar, publicar y navegar)
     * se barre todo lo que quede aquí; el backend (`eliminarFotoMarketplaceSiHuerfana`)
     * solo borra de R2 si la URL no quedó referenciada en ningún artículo,
     * así que es seguro llamarlo incluso para fotos que sí se publicaron.
     */
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set());

    const lat = useGpsStore((s) => s.latitud);
    const lng = useGpsStore((s) => s.longitud);
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);

    const [filas, setFilas] = useState<FilaLoteMP[]>([]);
    const [fotosSinAsignar, setFotosSinAsignar] = useState<ArchivoFoto[]>([]);
    const [analizandoFoto, setAnalizandoFoto] = useState(false);
    const [panelTextoAbierto, setPanelTextoAbierto] = useState(false);
    const [textoPegado, setTextoPegado] = useState('');
    const [analizandoTexto, setAnalizandoTexto] = useState(false);
    const [filasConErrorRevelado, setFilasConErrorRevelado] = useState<Set<string>>(new Set());
    const [erroresModeracionPorFila, setErroresModeracionPorFila] = useState<Map<string, string>>(new Map());
    const [checklistAceptado, setChecklistAceptado] = useState(false);
    const [verDetallesChecklist, setVerDetallesChecklist] = useState(false);
    const [subiendoFotoFila, setSubiendoFotoFila] = useState(false);
    /** clientId de la fila cuyo modal "Fotos del artículo" está abierto — null = cerrado. */
    const [filaFotosAbiertaId, setFilaFotosAbiertaId] = useState<string | null>(null);
    /** clientId de la fila cuyo modal "Descripción del artículo" está abierto — null = cerrado. */
    const [filaDescripcionAbiertaId, setFilaDescripcionAbiertaId] = useState<string | null>(null);

    // Barrido al desmontar — cubre "Volver", cerrar la pestaña con back
    // nativo, y también el caso de éxito (Publicar navega y desmonta): las
    // URLs de las filas publicadas ya se quitan de `urlsSubidasEnSesion` en
    // `handlePublicar` antes de navegar, así que aquí solo quedan las
    // realmente huérfanas. Ref en el efecto (no `eliminarHuerfanaMutation`
    // en deps) porque solo debe correr una vez, al desmontar.
    useEffect(() => {
        return () => {
            urlsSubidasEnSesion.current.forEach((url) => eliminarHuerfanaMutation.mutate(url));
            urlsSubidasEnSesion.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const erroresPorFila = useMemo(() => {
        const mapa = new Map<string, string[]>();
        filas.forEach((fila) => mapa.set(fila.clientId, validarFila(fila)));
        return mapa;
    }, [filas]);

    const filasListas = filas.filter((f) => (erroresPorFila.get(f.clientId)?.length ?? 0) === 0);

    // ===========================================================================
    // HANDLERS — filas
    // ===========================================================================

    function agregarFila(origen: OrigenFilaMP = 'manual', fotos: ArchivoFoto[] = []) {
        if (filas.length >= MAX_FILAS) {
            notificar.advertencia(`No puedes cargar más de ${MAX_FILAS} artículos a la vez`);
            return;
        }
        setFilas((prev) => [...prev, crearFilaVacia(origen, fotos)]);
    }

    function actualizarFila(clientId: string, cambios: Partial<FilaLoteMP>) {
        setFilas((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...cambios } : f)));
        setErroresModeracionPorFila((prev) => {
            if (!prev.has(clientId)) return prev;
            const copia = new Map(prev);
            copia.delete(clientId);
            return copia;
        });
    }

    function eliminarFila(clientId: string) {
        // Igual que `fotosUploader.eliminar()` en ComposerMarketplace.tsx —
        // borrar la fila libera sus fotos de inmediato en vez de esperar al
        // barrido de desmontaje, para no dejarlas huérfanas en R2.
        const fila = filas.find((f) => f.clientId === clientId);
        fila?.fotos.forEach((foto) => {
            eliminarHuerfanaMutation.mutate(foto.url);
            urlsSubidasEnSesion.current.delete(foto.url);
        });
        setFilas((prev) => prev.filter((f) => f.clientId !== clientId));
    }

    // ===========================================================================
    // HANDLERS — fotos sueltas / reasignación
    // ===========================================================================

    /**
     * Borra una foto de una fila — usada desde `ModalFotosFila`. Borrado
     * REAL e inmediato (no la manda al carrusel de "sin asignar"): dentro
     * del modal, "eliminar" significa "ya no la quiero en este artículo",
     * no "reasignarla a otra fila" — ese carrusel es solo para las fotos
     * que la IA deja sueltas al agrupar el lote automáticamente.
     */
    function eliminarFotoDeFila(clientId: string, foto: ArchivoFoto) {
        setFilas((prev) =>
            prev.map((f) => (f.clientId === clientId ? { ...f, fotos: f.fotos.filter((x) => x.url !== foto.url) } : f))
        );
        eliminarHuerfanaMutation.mutate(foto.url);
        urlsSubidasEnSesion.current.delete(foto.url);
    }

    function asignarFotoSuelta(foto: ArchivoFoto, destino: string) {
        setFotosSinAsignar((prev) => prev.filter((f) => f.url !== foto.url));
        if (destino === '__nueva__') {
            agregarFila('manual', [foto]);
            return;
        }
        setFilas((prev) => prev.map((f) => (f.clientId === destino ? { ...f, fotos: [...f.fotos, foto] } : f)));
    }

    function descartarFotoSuelta(foto: ArchivoFoto) {
        eliminarHuerfanaMutation.mutate(foto.url);
        urlsSubidasEnSesion.current.delete(foto.url);
        setFotosSinAsignar((prev) => prev.filter((f) => f.url !== foto.url));
    }

    function abrirSelectorFotoParaFila(clientId: string) {
        filaObjetivoRef.current = clientId;
        inputFotoFilaRef.current?.click();
    }

    async function handleSeleccionFotoFila(e: React.ChangeEvent<HTMLInputElement>) {
        let archivos = Array.from(e.target.files ?? []);
        const clientId = filaObjetivoRef.current;
        e.target.value = '';
        filaObjetivoRef.current = null;
        if (archivos.length === 0 || !clientId) return;

        const fotosActuales = filas.find((f) => f.clientId === clientId)?.fotos.length ?? 0;
        const espacioDisponible = MAX_FOTOS_POR_ARTICULO - fotosActuales;
        if (archivos.length > espacioDisponible) {
            notificar.advertencia(`Solo puedes agregar ${espacioDisponible} foto${espacioDisponible === 1 ? '' : 's'} más (máximo ${MAX_FOTOS_POR_ARTICULO} por artículo)`);
            archivos = archivos.slice(0, Math.max(espacioDisponible, 0));
        }
        if (archivos.length === 0) return;

        setSubiendoFotoFila(true);
        try {
            const urls = (await Promise.all(archivos.map(subirFotoMarketplace))).filter(
                (url): url is string => url !== null
            );
            if (urls.length === 0) {
                notificar.error('No se pudo subir la foto, intenta de nuevo');
                return;
            }
            urls.forEach((url) => urlsSubidasEnSesion.current.add(url));
            const nuevasFotos = urls.map((url) => ({ url, tipo: 'imagen' as const }));
            setFilas((prev) =>
                prev.map((f) => (f.clientId === clientId ? { ...f, fotos: [...f.fotos, ...nuevasFotos] } : f))
            );
        } finally {
            setSubiendoFotoFila(false);
        }
    }

    // ===========================================================================
    // HANDLERS — entrada por foto (IA agrupa por objeto físico)
    // ===========================================================================

    async function handleSeleccionFotosLote(e: React.ChangeEvent<HTMLInputElement>) {
        const archivos = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (archivos.length === 0) return;

        let archivosAUsar = archivos;
        if (archivos.length > MAX_IMAGENES_FOTO) {
            notificar.advertencia(`Solo se analizan las primeras ${MAX_IMAGENES_FOTO} fotos`);
            archivosAUsar = archivos.slice(0, MAX_IMAGENES_FOTO);
        }

        setAnalizandoFoto(true);
        try {
            const urls = (await Promise.all(archivosAUsar.map(subirFotoMarketplace))).filter(
                (url): url is string => url !== null
            );
            if (urls.length === 0) {
                notificar.error('No se pudieron subir las fotos, intenta de nuevo');
                return;
            }
            urls.forEach((url) => urlsSubidasEnSesion.current.add(url));

            const resultado = await sugerirFotoMutation.mutateAsync(urls);

            if (!resultado.success || resultado.data.length === 0) {
                notificar.advertencia(
                    resultado.success
                        ? 'No se detectó ningún artículo vendible en las fotos.'
                        : 'No se pudo analizar las fotos por ahora. Agrégalas manualmente con "Agregar fila".'
                );
                setFotosSinAsignar((prev) => [...prev, ...urls.map((url) => ({ url, tipo: 'imagen' as const }))]);
                return;
            }

            const espacioDisponible = MAX_FILAS - filas.length;
            const grupos = resultado.data.slice(0, Math.max(espacioDisponible, 0));
            const nuevasFilas = grupos.map((grupo) => filaDesdeSugerenciaFoto(grupo, urls));
            setFilas((prev) => [...prev, ...nuevasFilas]);

            const indicesUsados = new Set(grupos.flatMap((g) => g.indicesFotos));
            const sinAsignar = urls
                .filter((_, i) => !indicesUsados.has(i))
                .map((url) => ({ url, tipo: 'imagen' as const }));
            if (sinAsignar.length > 0) setFotosSinAsignar((prev) => [...prev, ...sinAsignar]);

            notificar.exito(
                `${nuevasFilas.length} artículo${nuevasFilas.length === 1 ? '' : 's'} detectado${nuevasFilas.length === 1 ? '' : 's'} — revísalos antes de publicar`
            );
        } catch (error) {
            console.error('Error al analizar fotos en Alta Rápida MarketPlace:', error);
            notificar.error('Error al analizar las fotos');
        } finally {
            setAnalizandoFoto(false);
        }
    }

    // ===========================================================================
    // HANDLERS — entrada por texto
    // ===========================================================================

    async function handleAnalizarTexto() {
        const texto = textoPegado.trim();
        if (texto.length < 5) return;

        setAnalizandoTexto(true);
        try {
            const resultado = await sugerirTextoMutation.mutateAsync(texto);

            if (!resultado.success) {
                notificar.advertencia('No se pudo analizar el texto por ahora. Agrega los artículos manualmente.');
                return;
            }
            if (resultado.data.length === 0) {
                notificar.advertencia('No se detectaron artículos en el texto. Revisa el formato e intenta de nuevo.');
                return;
            }

            const espacioDisponible = MAX_FILAS - filas.length;
            const detectados = resultado.data.slice(0, Math.max(espacioDisponible, 0));
            setFilas((prev) => [...prev, ...detectados.map(filaDesdeSugerenciaTexto)]);
            notificar.exito(
                `${detectados.length} artículo${detectados.length === 1 ? '' : 's'} detectado${detectados.length === 1 ? '' : 's'} — falta agregarles foto antes de publicar`
            );
            setTextoPegado('');
            setPanelTextoAbierto(false);
        } catch (error) {
            console.error('Error al analizar texto en Alta Rápida MarketPlace:', error);
            notificar.error('Error al analizar el texto');
        } finally {
            setAnalizandoTexto(false);
        }
    }

    // ===========================================================================
    // HANDLER — publicar
    // ===========================================================================

    async function handlePublicar() {
        if (filas.length === 0) return;

        if (!checklistAceptado) {
            notificar.advertencia('Acepta las reglas de publicación para continuar');
            return;
        }
        if (lat === null || lng === null || !ciudad) {
            notificar.advertencia('Activa tu ubicación para publicar tus artículos');
            return;
        }

        const conError = filas.filter((f) => (erroresPorFila.get(f.clientId)?.length ?? 0) > 0);
        if (conError.length > 0) {
            setFilasConErrorRevelado(new Set(conError.map((f) => f.clientId)));
            notificar.error(
                `${conError.length} artículo${conError.length === 1 ? '' : 's'} con datos incompletos — revisa los campos en rojo`
            );
            return;
        }
        setFilasConErrorRevelado(new Set());

        const articulosPayload: FilaArticuloLoteMarketplace[] = filasListas.map((f) => ({
            categoriaId: f.categoriaId!,
            titulo: f.titulo.trim(),
            descripcion: f.descripcion.trim(),
            precio: Number(f.precio),
            condicion: f.condicion,
            fotos: f.fotos,
            fotoPortadaIndex: 0,
        }));

        const payload: CrearArticulosLoteMarketplacePayload = {
            confirmaciones: {
                licito: true,
                enPoder: true,
                honesto: true,
                seguro: true,
                version: VERSION_CONFIRMACIONES_MP_COMPOSER,
            },
            latitud: lat,
            longitud: lng,
            ciudad,
            zonaAproximada: '',
            articulos: articulosPayload,
        };

        try {
            const resultado = await crearLoteMutation.mutateAsync(payload);
            if (resultado.success) {
                // Las fotos de las filas publicadas ya quedaron atadas al
                // artículo — sacarlas del set evita que el barrido de
                // desmontaje les dispare un delete innecesario (el backend
                // lo hubiera ignorado igual por reference-count, pero así
                // no gastamos la llamada).
                articulosPayload.forEach((a) => a.fotos.forEach((f) => urlsSubidasEnSesion.current.delete(f.url)));
                navigate('/mis-publicaciones');
            }
            // Nunca llega aquí con success:false — un 422 de moderación lanza
            // (axios solo resuelve 2xx); se maneja en el catch de abajo.
        } catch (error) {
            manejarErrorPublicarLote(error, filasListas, setErroresModeracionPorFila);
        }
    }

    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <div className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full">
            <style dangerouslySetInnerHTML={{ __html: ESTILOS_CSS }} />

            {/* ════════════════════════════════════════════════════════════════
                HEADER — móvil: bloque oscuro fijo (shrink-0) FUERA del scroll,
                mismo patrón que PaginaMisPublicaciones.tsx (glow + grid +
                líneas de acento). Desktop: sin cambios (header claro original).
            ════════════════════════════════════════════════════════════════ */}
            <div className="shrink-0 z-20 lg:sticky lg:top-0">
                {/* ═══ MOBILE (< lg) — header temático oscuro ═══ */}
                <div className="relative overflow-hidden lg:hidden" style={{ background: '#000000' }}>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div
                            className="absolute inset-0"
                            style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(45,212,191,0.12) 0%, transparent 55%)' }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />
                        <div
                            className="absolute bottom-0 left-0 right-0 h-[3px] z-0"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />
                    </div>
                    <div className="relative z-10 flex items-center gap-3 px-3 pt-4 pb-4">
                        <button
                            type="button"
                            data-testid="btn-volver-alta-rapida-mp-movil"
                            onClick={() => navigate('/mis-publicaciones')}
                            aria-label="Volver"
                            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)' }}
                        >
                            <div className="alta-rapida-mp-icon-bounce">
                                <Zap className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-extrabold tracking-tight text-white">Alta Rápida de Productos</h1>
                            <p className="text-sm font-medium text-white/70">Publica varios artículos a la vez</p>
                        </div>
                    </div>
                </div>

                {/* Entradas — móvil, fila propia bajo el header oscuro (fondo claro). */}
                <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden">
                    <Boton
                        variante="secundario"
                        tamanio="md"
                        className="shrink-0"
                        data-testid="btn-subir-fotos-alta-rapida-mp-movil"
                        iconoIzquierda={analizandoFoto ? undefined : <Camera className="w-4 h-4" />}
                        cargando={analizandoFoto}
                        onClick={() => inputFotoRef.current?.click()}
                    >
                        {analizandoFoto ? 'Analizando…' : 'Subir foto(s)'}
                    </Boton>
                    <Boton
                        variante="secundario"
                        tamanio="md"
                        className="shrink-0"
                        data-testid="btn-pegar-texto-alta-rapida-mp-movil"
                        iconoIzquierda={<ClipboardPaste className="w-4 h-4" />}
                        onClick={() => setPanelTextoAbierto((prev) => !prev)}
                    >
                        Pegar texto
                    </Boton>
                    <Boton
                        variante="primario"
                        tamanio="md"
                        className="shrink-0"
                        data-testid="btn-agregar-fila-alta-rapida-mp-movil"
                        iconoIzquierda={<Plus className="w-4 h-4" />}
                        onClick={() => agregarFila('manual')}
                    >
                        Agregar fila
                    </Boton>
                </div>

                {/* ═══ DESKTOP (≥ lg) — header original, sin cambios ═══ */}
                <div className="hidden items-center justify-between gap-3 p-3 lg:flex lg:flex-wrap lg:py-1.5 lg:px-6 2xl:py-3 2xl:px-8">
                    <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                data-testid="btn-volver-alta-rapida-mp"
                                onClick={() => navigate('/mis-publicaciones')}
                                className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-600 shrink-0 cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                    width: 52, height: 52, borderRadius: 14,
                                    background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                                    boxShadow: '0 6px 20px rgba(8,145,178,0.4)',
                                }}
                            >
                                <div className="alta-rapida-mp-icon-bounce">
                                    <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">Alta Rápida de Productos</h1>
                                <p className="text-base text-slate-600 -mt-1 font-medium">Publica varios artículos a la vez</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <Boton
                                variante="secundario"
                                className="shrink-0"
                                data-testid="btn-subir-fotos-alta-rapida-mp"
                                iconoIzquierda={analizandoFoto ? undefined : <Camera className="w-4 h-4" />}
                                cargando={analizandoFoto}
                                onClick={() => inputFotoRef.current?.click()}
                            >
                                {analizandoFoto ? 'Analizando foto(s)…' : 'Subir foto(s)'}
                            </Boton>
                            <Boton
                                variante="secundario"
                                className="shrink-0"
                                data-testid="btn-pegar-texto-alta-rapida-mp"
                                iconoIzquierda={<ClipboardPaste className="w-4 h-4" />}
                                onClick={() => setPanelTextoAbierto((prev) => !prev)}
                            >
                                Pegar texto
                            </Boton>
                            <Boton
                                variante="primario"
                                className="shrink-0"
                                data-testid="btn-agregar-fila-alta-rapida-mp"
                                iconoIzquierda={<Plus className="w-4 h-4" />}
                                onClick={() => agregarFila('manual')}
                            >
                                Agregar fila
                            </Boton>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inputs de archivo compartidos (móvil + desktop) — ocultos. */}
            <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSeleccionFotosLote}
                className="hidden"
                data-testid="input-fotos-alta-rapida-mp"
            />
            <input
                ref={inputFotoFilaRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSeleccionFotoFila}
                className="hidden"
                data-testid="input-foto-fila-alta-rapida-mp"
            />

            {/* ════════════════════════════════════════════════════════════════
                BODY — scrolleable en móvil (flex-1 min-h-0 overflow-y-auto);
                en desktop vuelve a flujo normal, el scroll lo maneja MainLayout.
            ════════════════════════════════════════════════════════════════ */}
            <div
                ref={cuerpoRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 pb-24 lg:flex-none lg:overflow-visible lg:mx-auto lg:max-w-7xl lg:py-1.5 lg:px-6 2xl:py-3 2xl:px-8"
            >
            <div className="w-full max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

                {/* ============================================================= */}
                {/* PANEL: PEGAR TEXTO                                             */}
                {/* ============================================================= */}
                {panelTextoAbierto && (
                    <div className="rounded-xl border-2 border-slate-300 bg-white p-3 space-y-2">
                        <textarea
                            value={textoPegado}
                            onChange={(e) => setTextoPegado(e.target.value)}
                            placeholder={'Pega aquí tu lista tal cual la tienes en WhatsApp o Facebook, por ejemplo:\nBicicleta rodada 26, seminueva $1200\nSilla de oficina $800\nLicuadora nueva $450'}
                            maxLength={TEXTO_MAX_CHARS}
                            rows={6}
                            data-testid="textarea-pegar-texto-alta-rapida-mp"
                            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">{textoPegado.length}/{TEXTO_MAX_CHARS}</span>
                            <div className="flex gap-2">
                                <Boton
                                    variante="outlineGray"
                                    tamanio="sm"
                                    data-testid="btn-cancelar-texto-alta-rapida-mp"
                                    onClick={() => { setPanelTextoAbierto(false); setTextoPegado(''); }}
                                >
                                    Cancelar
                                </Boton>
                                <Boton
                                    variante="primario"
                                    tamanio="sm"
                                    disabled={textoPegado.trim().length < 5}
                                    cargando={analizandoTexto}
                                    data-testid="btn-analizar-texto-alta-rapida-mp"
                                    onClick={handleAnalizarTexto}
                                >
                                    Analizar texto
                                </Boton>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================= */}
                {/* FOTOS SUELTAS SIN ASIGNAR                                      */}
                {/* ============================================================= */}
                <FotosSinAsignar
                    fotos={fotosSinAsignar}
                    filas={filas}
                    onAsignar={asignarFotoSuelta}
                    onDescartar={descartarFotoSuelta}
                />

                {/* ============================================================= */}
                {/* CONTADOR                                                       */}
                {/* ============================================================= */}
                {filas.length > 0 && (
                    <div className="flex items-center justify-between px-1 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-600">
                        <span>
                            {filas.length} artículo{filas.length === 1 ? '' : 's'} · {filasListas.length} listo{filasListas.length === 1 ? '' : 's'}
                        </span>
                    </div>
                )}

                {/* ============================================================= */}
                {/* TABLA DE REVISIÓN                                              */}
                {/* ============================================================= */}
                {filas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-slate-300 text-center px-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                            <Package className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-lg font-bold text-slate-800">Aquí van a aparecer tus artículos</p>
                        <p className="text-base font-medium text-slate-500 mt-1 mb-4">Elige cómo capturar tus artículos</p>

                        <div className="flex flex-col gap-3.5 text-left w-full max-w-md">
                            <div className="flex items-start gap-3">
                                <Camera className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                                <p className="text-base text-slate-600">
                                    <span className="font-bold text-slate-800">Subir foto(s):</span> sube las fotos de tus artículos (una o varias por cada uno) — la IA los agrupa por objeto y escribe título, descripción y categoría por ti, tú solo revisas y publicas.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <ClipboardPaste className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                                <p className="text-base text-slate-600">
                                    <span className="font-bold text-slate-800">Pegar texto:</span> pega tu lista de WhatsApp o Facebook y la IA la estructura por ti.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Plus className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                                <p className="text-base text-slate-600">
                                    <span className="font-bold text-slate-800">Agregar fila:</span> captura tus artículos uno por uno, directo en la tabla.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ========================================================= */}
                        {/* Desktop (≥lg): tabla tipo hoja de cálculo — mismo patrón   */}
                        {/* visual que Alta Rápida de Catálogo (BS).                   */}
                        {/* ========================================================= */}
                        <div className="hidden lg:block min-w-0 rounded-xl border-2 border-slate-300 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div className="min-w-0">
                                <div className="w-full">
                                    <div
                                        className={`grid ${GRID_TABLA_MP} gap-2 px-3 py-2.5 lg:h-[40px] 2xl:h-12 items-center text-[11px] lg:text-[12px] 2xl:text-sm font-bold text-white uppercase tracking-wider`}
                                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                                    >
                                        <span>Fotos</span>
                                        <span>Artículo</span>
                                        <span>Desc.</span>
                                        <span>Categoría</span>
                                        <span>Condición</span>
                                        <span>Precio</span>
                                        <span className="text-center">Acciones</span>
                                    </div>

                                    {/* Alto fijo — mismo valor que Alta Rápida de Negocios (BS), así la
                                        caja no cambia de tamaño según cuántos artículos tenga la tabla. */}
                                    <div className="h-[480px] overflow-y-auto bg-white">
                                        {filas.map((fila) => {
                                            const errores = erroresPorFila.get(fila.clientId) ?? [];
                                            const conError = filasConErrorRevelado.has(fila.clientId) && errores.length > 0;
                                            return (
                                                <FilaTablaMP
                                                    key={fila.clientId}
                                                    fila={fila}
                                                    errores={errores}
                                                    conError={conError}
                                                    mensajeModeracion={erroresModeracionPorFila.get(fila.clientId) ?? null}
                                                    categorias={categorias}
                                                    onActualizar={(cambios) => actualizarFila(fila.clientId, cambios)}
                                                    onEliminar={() => eliminarFila(fila.clientId)}
                                                    onAbrirFotos={() => setFilaFotosAbiertaId(fila.clientId)}
                                                    onAbrirDescripcion={() => setFilaDescripcionAbiertaId(fila.clientId)}
                                                />
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => agregarFila('manual')}
                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                                        data-testid="btn-agregar-fila-footer-alta-rapida-mp"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar fila
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* Móvil (<lg): tarjetas apiladas                              */}
                        {/* ========================================================= */}
                        <div className="lg:hidden space-y-2.5">
                            {filas.map((fila) => {
                                const errores = erroresPorFila.get(fila.clientId) ?? [];
                                const conError = filasConErrorRevelado.has(fila.clientId) && errores.length > 0;
                                return (
                                    <FilaCardMP
                                        key={fila.clientId}
                                        fila={fila}
                                        errores={errores}
                                        conError={conError}
                                        mensajeModeracion={erroresModeracionPorFila.get(fila.clientId) ?? null}
                                        categorias={categorias}
                                        onActualizar={(cambios) => actualizarFila(fila.clientId, cambios)}
                                        onEliminar={() => eliminarFila(fila.clientId)}
                                        onAbrirFotos={() => setFilaFotosAbiertaId(fila.clientId)}
                                        onAbrirDescripcion={() => setFilaDescripcionAbiertaId(fila.clientId)}
                                    />
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => agregarFila('manual')}
                                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                data-testid="btn-agregar-fila-footer-alta-rapida-mp-movil"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar fila
                            </button>
                        </div>
                    </>
                )}

                {/* Modal de gestión de fotos — una sola instancia para toda la
                    página, muestra la fila activa según `filaFotosAbiertaId`. */}
                <ModalFotosFila
                    abierto={filaFotosAbiertaId !== null}
                    onCerrar={() => setFilaFotosAbiertaId(null)}
                    fotos={filas.find((f) => f.clientId === filaFotosAbiertaId)?.fotos ?? []}
                    subiendo={subiendoFotoFila}
                    onAgregarFotos={() => filaFotosAbiertaId && abrirSelectorFotoParaFila(filaFotosAbiertaId)}
                    onEliminarFoto={(foto) => filaFotosAbiertaId && eliminarFotoDeFila(filaFotosAbiertaId, foto)}
                />

                {/* Modal de edición de descripción — una sola instancia para toda
                    la página, muestra la fila activa según `filaDescripcionAbiertaId`. */}
                <ModalDescripcionFila
                    abierto={filaDescripcionAbiertaId !== null}
                    onCerrar={() => setFilaDescripcionAbiertaId(null)}
                    descripcion={filas.find((f) => f.clientId === filaDescripcionAbiertaId)?.descripcion ?? ''}
                    onCambiar={(valor) => filaDescripcionAbiertaId && actualizarFila(filaDescripcionAbiertaId, { descripcion: valor })}
                />

                {/* ============================================================= */}
                {/* CHECKLIST LEGAL — una vez para todo el lote                    */}
                {/* ============================================================= */}
                {filas.length > 0 && (
                    <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
                        <label className="inline-flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                data-testid="checklist-alta-rapida-mp"
                                checked={checklistAceptado}
                                onChange={(e) => setChecklistAceptado(e.target.checked)}
                                className="sr-only"
                            />
                            <span
                                aria-hidden
                                className={
                                    'w-5 h-5 shrink-0 mt-0.5 rounded-md border-2 flex items-center justify-center ' +
                                    (checklistAceptado ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300')
                                }
                            >
                                {checklistAceptado && <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                            <span className="text-sm font-medium text-slate-700">
                                Acepto las reglas de publicación de MarketPlace para todos los artículos de este lote
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={() => setVerDetallesChecklist((v) => !v)}
                            className="mt-1 ml-7 inline-flex items-center gap-0.5 text-sm text-teal-700 font-semibold cursor-pointer hover:text-teal-800"
                        >
                            {verDetallesChecklist ? 'ocultar' : 'ver detalles'}
                            <ChevronDown className={`w-4 h-4 transition-transform ${verDetallesChecklist ? 'rotate-180' : ''}`} strokeWidth={2.25} />
                        </button>
                        {verDetallesChecklist && (
                            <ul className="mt-2 ml-7 space-y-1 text-[13px] text-slate-600 font-medium leading-snug list-disc list-inside">
                                <li>Cada artículo es <strong>lícito</strong>: no infringe leyes, ni es producto robado, ilegal o restringido.</li>
                                <li>Los tengo <strong>en mi poder</strong> y disponibles para entregar.</li>
                                <li>La información es <strong>honesta</strong>: fotos, precio y descripción reflejan la realidad.</li>
                                <li>Acepto coordinar entregas <strong>seguras</strong> en lugares públicos.</li>
                            </ul>
                        )}
                    </div>
                )}

                {/* ============================================================= */}
                {/* PUBLICAR                                                       */}
                {/* ============================================================= */}
                {filas.length > 0 && (
                    <div className="flex items-center justify-end gap-3">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                            <ShoppingBag className="w-4 h-4" />
                            {filas.length} artículo{filas.length === 1 ? '' : 's'} a publicar
                        </span>
                        <Boton
                            variante="primario"
                            tamanio="md"
                            disabled={filas.length === 0}
                            cargando={crearLoteMutation.isPending}
                            onClick={handlePublicar}
                            data-testid="btn-publicar-lote-mp"
                        >
                            Publicar {filas.length} artículo{filas.length === 1 ? '' : 's'}
                        </Boton>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}

export default PaginaAltaRapidaMarketplace;
