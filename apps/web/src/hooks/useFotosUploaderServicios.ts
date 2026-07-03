/**
 * useFotosUploaderServicios.ts
 * ==============================
 * Hook que encapsula la lógica de subida de fotos del composer de
 * Servicios a R2 (presigned URL flow) + tracking de huérfanas.
 *
 * Reemplaza a `components/servicios/composer/ComposerFotos.tsx` cuando
 * el composer pasó a inline con íconos: el padre necesita el control
 * directo del input file y de las thumbnails, así que la lógica se
 * extrajo a un hook puro.
 *
 * ── UI OPTIMISTA (Sprint 9.3) ────────────────────────────────────────
 * Al seleccionar archivos, se generan PREVIEWS locales inmediatos con
 * `URL.createObjectURL(blob)` que aparecen YA en el grid del composer
 * mientras la subida real ocurre en paralelo en background. Cuando una
 * foto termina su upload a R2:
 *   - éxito: se quita del array de previews y se agrega a `draft.fotos`
 *     con su URL pública R2.
 *   - error: se quita del array de previews y se muestra una notificación.
 *
 * Las subidas paralelas (Promise.allSettled) evitan que una foto lenta
 * bloquee al resto, y el INSERT batched al final de `draft.fotos` evita
 * race conditions con `onCambioFotos` (que recibe el array completo).
 *
 * Devuelve:
 *   - `eliminar(idx)`       → quita una foto del array y dispara delete R2
 *   - `subiendo`            → flag de loading global (true mientras haya previews)
 *   - `previews`            → URLs locales (blob:) de fotos en curso de subida
 *   - `inputGaleriaProps`   → props para spread sobre un <input type="file" hidden />
 *   - `inputCamaraProps`    → props para spread con `capture="environment"`
 *                             (en móvil abre la cámara trasera nativa; en PC
 *                             cae al selector de archivos)
 *   - `abrirGaleria()`      → click programático sobre el input galería
 *   - `abrirCamara()`       → click programático sobre el input cámara
 *
 * El consumidor decide cuándo usar cuál — típicamente expone un menú
 * popup con dos opciones ("Tomar foto" / "Subir de galería") sobre el
 * botón cámara del composer.
 *
 * Ubicación: apps/web/src/hooks/useFotosUploaderServicios.ts
 */

import axios from 'axios';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
    useEliminarFotoServicioHuerfana,
    useUploadFotoServicio,
} from './queries/useServicios';
import { notificar } from '../utils/notificaciones';
import { optimizarImagen } from '../utils/optimizarImagen';

export const MAX_FOTOS_COMPOSER = 12;
const MAX_BYTES = 5 * 1024 * 1024;

const TIPOS_PERMITIDOS: Record<
    string,
    'image/jpeg' | 'image/png' | 'image/webp'
> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
};

/**
 * Preview local de una foto en curso de subida. La `url` es un
 * `blob:` URL generada con `URL.createObjectURL` — el caller la usa
 * como `src` de la `<img>` para mostrar la imagen al instante.
 */
export interface FotoPreviewLocal {
    tempId: string;
    url: string;
}

interface UseFotosUploaderOpts {
    fotos: string[];
    onCambioFotos: (fotos: string[]) => void;
    /** Ref que rastrea las URLs subidas en esta sesión del composer
     *  (para limpiarlas si se descarta el borrador). */
    urlsSubidasEnSesion: MutableRefObject<Set<string>>;
}

export function useFotosUploaderServicios({
    fotos,
    onCambioFotos,
    urlsSubidasEnSesion,
}: UseFotosUploaderOpts) {
    const inputGaleriaRef = useRef<HTMLInputElement>(null);
    const inputCamaraRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<FotoPreviewLocal[]>([]);
    const uploadMutation = useUploadFotoServicio();
    const eliminarHuerfanaMutation = useEliminarFotoServicioHuerfana();

    // Ref con la versión más reciente de `fotos` para evitar stale closures
    // en `manejarArchivos` (la prop puede cambiar mientras se suben fotos).
    const fotosRef = useRef(fotos);
    useEffect(() => {
        fotosRef.current = fotos;
    }, [fotos]);

    // Cleanup: revocar todas las URLs blob al desmontar para no
    // filtrar memoria si el composer se cierra con subidas en curso.
    useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Sube UN archivo a R2 con todo su pipeline (validación + optimización +
     * presigned + PUT). Devuelve la URL pública o lanza error con el mensaje
     * a notificar.
     */
    async function subirUno(archivo: File): Promise<string> {
        if (!TIPOS_PERMITIDOS[archivo.type.toLowerCase()]) {
            throw new Error(`${archivo.name}: tipo no permitido (JPG, PNG o WebP).`);
        }
        if (archivo.size > MAX_BYTES) {
            throw new Error(`${archivo.name}: pesa más de 5 MB.`);
        }
        let blob: Blob;
        try {
            blob = await optimizarImagen(archivo, {
                maxWidth: 1920,
                quality: 0.85,
            });
        } catch {
            throw new Error(`${archivo.name}: no se pudo procesar la imagen.`);
        }
        const res = await uploadMutation.mutateAsync({
            nombreArchivo: archivo.name.replace(/\.[^.]+$/, '.webp'),
            contentType: 'image/webp',
        });
        if (!res.success || !res.data) {
            throw new Error(`No se pudo preparar la subida de ${archivo.name}.`);
        }
        try {
            await axios.put(res.data.uploadUrl, blob, {
                headers: { 'Content-Type': 'image/webp' },
            });
        } catch {
            throw new Error(`Falló la subida de ${archivo.name}. Intenta de nuevo.`);
        }
        return res.data.publicUrl;
    }

    async function manejarArchivos(files: FileList | null) {
        if (!files || files.length === 0) return;
        // Validar espacios contando fotos confirmadas + previews en curso.
        const ocupados = fotosRef.current.length + previews.length;
        const espacios = MAX_FOTOS_COMPOSER - ocupados;
        if (espacios <= 0) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER} fotos por publicación.`,
            );
            return;
        }
        const archivos = Array.from(files).slice(0, espacios);

        // 1) Generar previews locales con blob URLs y mostrarlos YA en el
        //    grid. Cada item tiene un `tempId` único para poder removerlo
        //    cuando termine su upload (o falle).
        const items = archivos.map((archivo) => ({
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            url: URL.createObjectURL(archivo),
            archivo,
        }));
        setPreviews((prev) => [
            ...prev,
            ...items.map(({ tempId, url }) => ({ tempId, url })),
        ]);

        // Reset inputs para que el usuario pueda volver a elegir el mismo
        // archivo si lo necesita (sin esto, onChange no dispara con el mismo
        // archivo dos veces seguidas).
        if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
        if (inputCamaraRef.current) inputCamaraRef.current.value = '';

        // 2) Subir todas en paralelo. Promise.allSettled garantiza que
        //    una falla no aborta el resto.
        const resultados = await Promise.allSettled(
            items.map(async (item) => {
                const publicUrl = await subirUno(item.archivo);
                return { tempId: item.tempId, publicUrl };
            }),
        );

        // 3) Procesar resultados: éxitos van al draft, errores se notifican.
        const exitosas: string[] = [];
        resultados.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                exitosas.push(r.value.publicUrl);
                urlsSubidasEnSesion.current.add(r.value.publicUrl);
            } else {
                const msg = r.reason instanceof Error
                    ? r.reason.message
                    : `Falló la subida de ${items[i].archivo.name}.`;
                notificar.error(msg);
            }
        });

        // 4) Quitar TODOS los previews procesados (éxito o falla) y revocar
        //    sus blob URLs para liberar memoria. Usamos un Set para O(1) lookup.
        const tempIdsProcesados = new Set(items.map((i) => i.tempId));
        setPreviews((prev) =>
            prev.filter((p) => !tempIdsProcesados.has(p.tempId)),
        );
        items.forEach((i) => URL.revokeObjectURL(i.url));

        // 5) Emitir un único `onCambioFotos` con el array completo
        //    actualizado. Se hace al final para evitar race conditions
        //    entre subidas concurrentes (cada `onCambioFotos` debe
        //    recibir el snapshot completo, no parcial).
        if (exitosas.length > 0) {
            const combinadas = [...fotosRef.current, ...exitosas].slice(
                0,
                MAX_FOTOS_COMPOSER,
            );
            onCambioFotos(combinadas);
        }
    }

    function eliminar(idx: number) {
        const url = fotos[idx];
        const nuevas = fotos.filter((_, i) => i !== idx);
        onCambioFotos(nuevas);
        if (url) {
            urlsSubidasEnSesion.current.delete(url);
            eliminarHuerfanaMutation.mutate(url);
        }
    }

    function puedeAgregar(): boolean {
        const ocupados = fotos.length + previews.length;
        if (ocupados >= MAX_FOTOS_COMPOSER) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER} fotos por publicación.`,
            );
            return false;
        }
        return true;
    }

    function abrirGaleria() {
        if (!puedeAgregar()) return;
        inputGaleriaRef.current?.click();
    }

    function abrirCamara() {
        if (!puedeAgregar()) return;
        inputCamaraRef.current?.click();
    }

    return {
        // `subiendo` es true mientras haya AL MENOS un preview pendiente.
        // El consumidor lo usa para mostrar spinners globales o
        // deshabilitar el botón de publicar.
        subiendo: previews.length > 0,
        previews,
        eliminar,
        abrirGaleria,
        abrirCamara,
        inputGaleriaProps: {
            ref: inputGaleriaRef,
            type: 'file' as const,
            accept: 'image/jpeg,image/png,image/webp',
            multiple: true,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
        inputCamaraProps: {
            ref: inputCamaraRef,
            type: 'file' as const,
            accept: 'image/jpeg,image/png,image/webp',
            capture: 'environment' as const,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
    };
}
