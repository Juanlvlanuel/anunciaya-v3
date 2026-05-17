/**
 * Paso2Detalles.tsx
 * ===================
 * Paso 2 del wizard v2: fotos + modalidad + presupuesto (min/max) + zonas
 * + tarjeta informativa con la ubicación detectada del GPS.
 *
 * Fotos: 6 tiles. Click en una vacía dispara file picker → upload R2 vía
 * presigned URL. La primera es portada (badge "Portada"). Click en X
 * elimina del array.
 *
 * Presupuesto: 2 inputs numéricos. Vacío = "A convenir" en el preview.
 *
 * Zonas: chips removibles, Enter agrega, máximo 10.
 *
 * Ubicación: apps/web/src/components/servicios/wizard/Paso2Detalles.tsx
 */

import { Camera, Loader2, MapPin, X, Check } from 'lucide-react';
import { useRef, useState, type MutableRefObject } from 'react';
import axios from 'axios';
import type { WizardServiciosDraft } from '../../../hooks/useWizardServicios';
import {
    useEliminarFotoServicioHuerfana,
    useUploadFotoServicio,
} from '../../../hooks/queries/useServicios';
import { notificar } from '../../../utils/notificaciones';
import { optimizarImagen } from '../../../utils/optimizarImagen';
import type { ModalidadServicio } from '../../../types/servicios';
import { ChipInputList } from './ChipInputList';
import { WizardSeccionCard } from './WizardSeccionCard';

interface Paso2Props {
    draft: WizardServiciosDraft;
    actualizar: (
        cambio:
            | Partial<WizardServiciosDraft>
            | ((d: WizardServiciosDraft) => Partial<WizardServiciosDraft>),
    ) => void;
    /** Ref del padre que registra qué URLs fueron subidas durante la sesión
     *  activa del wizard. Al cancelar/borrar borrador, el padre las limpia
     *  de R2. Permite que las fotos no queden huérfanas. */
    urlsSubidasEnSesion: MutableRefObject<Set<string>>;
}

const MODALIDADES: { id: ModalidadServicio; label: string; desc: string }[] = [
    {
        id: 'presencial',
        label: 'Presencial',
        desc: 'El servicio se hace cara a cara, en un lugar físico.',
    },
    {
        id: 'remoto',
        label: 'Remoto',
        desc: 'Todo se coordina y entrega por internet, sin verse.',
    },
    {
        id: 'hibrido',
        label: 'Híbrido',
        desc: 'Algunas partes presenciales y otras a distancia.',
    },
];

const TIPOS_PERMITIDOS: Record<
    string,
    'image/jpeg' | 'image/png' | 'image/webp'
> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
};

const MAX_FOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;

export function Paso2Detalles({
    draft,
    actualizar,
    urlsSubidasEnSesion,
}: Paso2Props) {
    return (
        <div className="space-y-3 lg:space-y-4 max-w-3xl mx-auto">
            <WizardSeccionCard>
                <SeccionFotos
                    draft={draft}
                    actualizar={actualizar}
                    urlsSubidasEnSesion={urlsSubidasEnSesion}
                />
            </WizardSeccionCard>

            {/* ── Modalidad ────────────────────────────────────────────── */}
            <WizardSeccionCard>
                <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-2.5 lg:mb-3">
                    Modalidad
                </span>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-2.5">
                    {MODALIDADES.map((m) => {
                        const activa = draft.modalidad === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                data-testid={`wizard-modalidad-${m.id}`}
                                onClick={() =>
                                    actualizar({ modalidad: m.id })
                                }
                                aria-pressed={activa}
                                className={
                                    'relative rounded-[12px] lg:rounded-[14px] p-3 lg:p-4 text-left lg:cursor-pointer transition-shadow ' +
                                    (activa
                                        ? 'border-[1.5px] border-sky-500 bg-sky-50 ring-4 ring-sky-100'
                                        : 'border-[1.5px] border-slate-300 bg-white hover:border-sky-400 hover:shadow-sm')
                                }
                            >
                                <div
                                    className={
                                        'text-[15px] lg:text-[15px] 2xl:text-base font-bold leading-tight ' +
                                        (activa
                                            ? 'text-sky-900'
                                            : 'text-slate-900')
                                    }
                                >
                                    {m.label}
                                </div>
                                <p
                                    className={
                                        'mt-0.5 lg:mt-1 text-[13px] lg:text-[12px] 2xl:text-sm font-medium leading-snug ' +
                                        (activa
                                            ? 'text-sky-800'
                                            : 'text-slate-600')
                                    }
                                >
                                    {m.desc}
                                </p>
                                {activa && (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-sky-500 text-white grid place-items-center shadow-sm">
                                        <Check
                                            className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                                            strokeWidth={2.6}
                                        />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </WizardSeccionCard>

            {/* ── Presupuesto ──────────────────────────────────────────── */}
            <WizardSeccionCard>
                <SeccionPresupuesto draft={draft} actualizar={actualizar} />
            </WizardSeccionCard>

            {/* ── Zonas ────────────────────────────────────────────────── */}
            <WizardSeccionCard>
                <ChipInputList
                    label="Zonas donde aplica"
                    helper="Mínimo 1, máximo 10. Las colonias donde puedes dar/recibir el servicio."
                    placeholder="Ej: Centro, Las Conchas, Cholla"
                    items={draft.zonasAproximadas}
                    max={10}
                    onChange={(zonas) =>
                        actualizar({ zonasAproximadas: zonas })
                    }
                    testid="zonas"
                />
            </WizardSeccionCard>

            {/* ── Info ubicación detectada (mantiene look azul especial) ─ */}
            <div className="rounded-2xl bg-blue-50 border-[1.5px] border-blue-200 p-3 lg:p-4 flex items-start gap-2.5 lg:gap-3">
                <div className="shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-blue-100 text-blue-700 grid place-items-center">
                    <MapPin className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-blue-800">
                        Ubicación detectada
                    </div>
                    <h4 className="text-[15px] lg:text-[15px] 2xl:text-base font-bold text-slate-900 mt-0.5">
                        {draft.ciudad ?? '— sin ciudad —'}
                    </h4>
                    <p className="text-[13px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium leading-snug mt-0.5 lg:mt-1">
                        Tu coordenada exacta no se publica. El feed mostrará
                        una zona aproximada con un offset de unos cientos de
                        metros.
                    </p>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SeccionFotos — 6 tiles, upload R2 vía presigned URL
// =============================================================================

function SeccionFotos({
    draft,
    actualizar,
    urlsSubidasEnSesion,
}: Paso2Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [subiendo, setSubiendo] = useState(false);
    const uploadMutation = useUploadFotoServicio();
    const eliminarHuerfanaMutation = useEliminarFotoServicioHuerfana();

    async function manejarArchivos(files: FileList | null) {
        if (!files || files.length === 0) return;
        const espacios = MAX_FOTOS - draft.fotos.length;
        if (espacios <= 0) {
            notificar.advertencia(`Máximo ${MAX_FOTOS} fotos por publicación.`);
            return;
        }
        const archivos = Array.from(files).slice(0, espacios);
        setSubiendo(true);
        try {
            for (const archivo of archivos) {
                if (!TIPOS_PERMITIDOS[archivo.type.toLowerCase()]) {
                    notificar.error(
                        `${archivo.name}: tipo no permitido (solo JPG, PNG o WebP).`,
                    );
                    continue;
                }
                if (archivo.size > MAX_BYTES) {
                    notificar.error(`${archivo.name}: pesa más de 5 MB.`);
                    continue;
                }
                // 1) Optimizar: resize a 1920px máx + WebP calidad 0.85.
                //    Reduce 70-90% el peso. Mismo helper que MarketPlace.
                let blob: Blob;
                try {
                    blob = await optimizarImagen(archivo, {
                        maxWidth: 1920,
                        quality: 0.85,
                    });
                } catch {
                    notificar.error(
                        `${archivo.name}: no se pudo procesar la imagen.`,
                    );
                    continue;
                }
                // 2) Pedir presigned URL para WebP (independiente del tipo original).
                const res = await uploadMutation.mutateAsync({
                    nombreArchivo: archivo.name.replace(/\.[^.]+$/, '.webp'),
                    contentType: 'image/webp',
                });
                if (!res.success || !res.data) {
                    notificar.error(
                        `No se pudo preparar la subida de ${archivo.name}.`,
                    );
                    continue;
                }
                // 3) PUT directo a R2 con el blob optimizado.
                try {
                    await axios.put(res.data.uploadUrl, blob, {
                        headers: { 'Content-Type': 'image/webp' },
                    });
                } catch {
                    notificar.error(
                        `Falló la subida de ${archivo.name}. Intenta de nuevo.`,
                    );
                    continue;
                }
                const publicUrl = res.data.publicUrl;
                // 4) Registrar como "subida en esta sesión" para que el padre
                //    la limpie de R2 si el usuario cancela o borra borrador.
                urlsSubidasEnSesion.current.add(publicUrl);
                actualizar((d) => ({
                    fotos: [...d.fotos, publicUrl].slice(0, MAX_FOTOS),
                }));
            }
        } finally {
            setSubiendo(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    function eliminarFoto(idx: number) {
        const url = draft.fotos[idx];
        const nuevas = draft.fotos.filter((_, i) => i !== idx);
        actualizar({
            fotos: nuevas,
            fotoPortadaIndex: Math.min(
                draft.fotoPortadaIndex,
                Math.max(0, nuevas.length - 1),
            ),
        });
        if (url) {
            // Fire-and-forget. El backend hace reference count antes de
            // borrar, así que si la URL ya está en una publicación creada
            // (improbable pero posible si el usuario reabrió un draft viejo)
            // no se elimina realmente.
            urlsSubidasEnSesion.current.delete(url);
            eliminarHuerfanaMutation.mutate(url);
        }
    }

    return (
        <div>
            <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-2.5 lg:mb-3">
                Fotos{' '}
                <span className="normal-case text-slate-500 font-medium">
                    (opcional · máx {MAX_FOTOS})
                </span>
            </span>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 lg:gap-2.5">
                {Array.from({ length: MAX_FOTOS }).map((_, i) => {
                    const url = draft.fotos[i];
                    const llena = !!url;
                    const esPortada = i === 0 && llena;
                    return (
                        <div
                            key={i}
                            data-testid={`wizard-foto-tile-${i}`}
                            className={
                                'relative aspect-[4/3] lg:aspect-square rounded-lg lg:rounded-xl overflow-hidden lg:cursor-pointer transition-shadow ' +
                                (llena
                                    ? 'border-[1.5px] border-slate-300'
                                    : 'border-[1.5px] border-dashed border-slate-300 bg-slate-100 hover:bg-blue-50 hover:border-blue-400')
                            }
                            onClick={() => {
                                if (llena) return;
                                if (!subiendo) inputRef.current?.click();
                            }}
                        >
                            {llena ? (
                                <>
                                    <img
                                        src={url}
                                        alt={`Foto ${i + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {esPortada && (
                                        <span className="absolute top-1 left-1 lg:top-1.5 lg:left-1.5 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
                                            Portada
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        data-testid={`wizard-foto-eliminar-${i}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            eliminarFoto(i);
                                        }}
                                        aria-label="Eliminar foto"
                                        className="absolute top-1 right-1 lg:top-1.5 lg:right-1.5 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-black/60 text-white grid place-items-center lg:cursor-pointer hover:bg-black/80"
                                    >
                                        <X
                                            className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                                            strokeWidth={2.5}
                                        />
                                    </button>
                                </>
                            ) : (
                                <div className="absolute inset-0 grid place-items-center text-slate-500">
                                    {subiendo && i === draft.fotos.length ? (
                                        <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-0.5 lg:gap-1">
                                            <Camera
                                                className="w-5 h-5 lg:w-6 lg:h-6"
                                                strokeWidth={1.8}
                                            />
                                            {i === 0 &&
                                                draft.fotos.length === 0 && (
                                                    <span className="text-[11px] font-semibold">
                                                        Agregar
                                                    </span>
                                                )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(e) => manejarArchivos(e.target.files)}
            />
            <p className="mt-2 lg:mt-2.5 text-[12px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                JPG, PNG o WebP · máx 5 MB c/u · la primera es portada.
            </p>
        </div>
    );
}

// =============================================================================
// SeccionPresupuesto — min/max en MXN
// =============================================================================

function SeccionPresupuesto({
    draft,
    actualizar,
}: Omit<Paso2Props, 'urlsSubidasEnSesion'>) {
    const min = Number(draft.budgetMin) || 0;
    const max = Number(draft.budgetMax) || 0;
    const error = min > 0 && max > 0 && min > max;

    function onChangeMin(v: string) {
        actualizar({ budgetMin: v.replace(/[^\d]/g, '') });
    }
    function onChangeMax(v: string) {
        actualizar({ budgetMax: v.replace(/[^\d]/g, '') });
    }

    return (
        <div>
            <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-1.5">
                Presupuesto (MXN)
            </span>
            <p className="text-[13px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium mb-2.5 lg:mb-3 leading-snug">
                {draft.modo === 'ofrezco'
                    ? 'Rango aproximado por el que cobras. Déjalo vacío para "a convenir".'
                    : 'Cuánto estás dispuesto a pagar. Déjalo vacío para "a convenir".'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                <InputMonto
                    label="Mínimo"
                    value={draft.budgetMin}
                    onChange={onChangeMin}
                    testid="presupuesto-min"
                />
                <InputMonto
                    label="Máximo"
                    value={draft.budgetMax}
                    onChange={onChangeMax}
                    testid="presupuesto-max"
                />
            </div>
            {error && (
                <p className="mt-1.5 text-[13px] lg:text-[13px] 2xl:text-sm text-red-600 font-semibold">
                    El mínimo debe ser menor o igual al máximo.
                </p>
            )}
        </div>
    );
}

interface InputMontoProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    testid: string;
}

function InputMonto({ label, value, onChange, testid }: InputMontoProps) {
    return (
        <div>
            <label className="block text-[13px] lg:text-[13px] 2xl:text-sm font-semibold text-slate-700 mb-1 lg:mb-1.5">
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-3.5 lg:left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                    $
                </span>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-testid={`wizard-${testid}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border-[1.5px] border-slate-300 bg-white pl-[34px] lg:pl-[38px] pr-3 lg:pr-4 py-2.5 lg:py-3 text-base lg:text-[15px] 2xl:text-base text-slate-900 placeholder:text-slate-500 font-semibold outline-none focus:border-sky-500 tabular-nums"
                />
            </div>
        </div>
    );
}

export default Paso2Detalles;
