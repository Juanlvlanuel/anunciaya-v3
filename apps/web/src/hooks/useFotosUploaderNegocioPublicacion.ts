/**
 * useFotosUploaderNegocioPublicacion.ts
 * ========================================
 * Hook que encapsula la lógica de subida de fotos del composer de
 * publicaciones de Negocio a R2 (presigned URL flow) + tracking de
 * huérfanas. Réplica 1:1 de `useFotosUploaderMarketplace.ts`.
 *
 * Diferencia clave: `MAX_FOTOS_COMPOSER_NEGOCIO = 40` es un tope TÉCNICO de
 * seguridad anti-abuso (validado también en el backend), NO un límite de
 * producto — el negocio puede publicar tantas fotos como quiera hasta ahí.
 *
 * Ubicación: apps/web/src/hooks/useFotosUploaderNegocioPublicacion.ts
 */

import axios from 'axios';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
    useEliminarFotoNegocioPublicacionHuerfana,
    useUploadFotoNegocioPublicacion,
} from './queries/useNegocioPublicaciones';
import { notificar } from '../utils/notificaciones';
import { optimizarImagen } from '../utils/optimizarImagen';
import { procesarVideo, MAX_VIDEO_BYTES } from '../utils/procesarVideo';
import type { ArchivoFoto } from '../types/archivoFoto';

export const MAX_FOTOS_COMPOSER_NEGOCIO = 40;
const MAX_BYTES = 5 * 1024 * 1024;

const TIPOS_IMAGEN_PERMITIDOS: Record<
    string,
    'image/jpeg' | 'image/png' | 'image/webp'
> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
};

const TIPOS_VIDEO_PERMITIDOS = new Set(['video/mp4', 'video/webm']);

export interface FotoPreviewLocalNegocio {
    tempId: string;
    url: string;
    tipo: 'imagen' | 'video';
}

interface UseFotosUploaderNegocioOpts {
    fotos: ArchivoFoto[];
    onCambioFotos: (fotos: ArchivoFoto[]) => void;
    urlsSubidasEnSesion: MutableRefObject<Set<string>>;
}

export function useFotosUploaderNegocioPublicacion({
    fotos,
    onCambioFotos,
    urlsSubidasEnSesion,
}: UseFotosUploaderNegocioOpts) {
    const inputGaleriaRef = useRef<HTMLInputElement>(null);
    const inputCamaraRef = useRef<HTMLInputElement>(null);
    const inputCamaraVideoRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<FotoPreviewLocalNegocio[]>([]);
    const uploadMutation = useUploadFotoNegocioPublicacion();
    const eliminarHuerfanaMutation = useEliminarFotoNegocioPublicacionHuerfana();

    const fotosRef = useRef(fotos);
    useEffect(() => {
        fotosRef.current = fotos;
    }, [fotos]);

    useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function subirImagen(archivo: File): Promise<ArchivoFoto> {
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
        return { url: res.data.publicUrl, tipo: 'imagen' };
    }

    async function subirVideo(archivo: File): Promise<ArchivoFoto> {
        let procesado: Awaited<ReturnType<typeof procesarVideo>>;
        try {
            procesado = await procesarVideo(archivo);
        } catch (err) {
            throw new Error(
                err instanceof Error ? err.message : `${archivo.name}: no se pudo procesar el video.`,
            );
        }

        const resPoster = await uploadMutation.mutateAsync({
            nombreArchivo: archivo.name.replace(/\.[^.]+$/, '-poster.webp'),
            contentType: 'image/webp',
        });
        if (!resPoster.success || !resPoster.data) {
            throw new Error(`No se pudo preparar el poster de ${archivo.name}.`);
        }
        try {
            await axios.put(resPoster.data.uploadUrl, procesado.poster, {
                headers: { 'Content-Type': 'image/webp' },
            });
        } catch {
            throw new Error(`Falló la subida del poster de ${archivo.name}. Intenta de nuevo.`);
        }

        const contentType = archivo.type.toLowerCase() as 'video/mp4' | 'video/webm';
        const resVideo = await uploadMutation.mutateAsync({
            nombreArchivo: archivo.name,
            contentType,
        });
        if (!resVideo.success || !resVideo.data) {
            throw new Error(`No se pudo preparar la subida de ${archivo.name}.`);
        }
        try {
            await axios.put(resVideo.data.uploadUrl, archivo, {
                headers: { 'Content-Type': contentType },
            });
        } catch {
            throw new Error(`Falló la subida de ${archivo.name}. Intenta de nuevo.`);
        }

        return { url: resVideo.data.publicUrl, tipo: 'video', posterUrl: resPoster.data.publicUrl };
    }

    async function subirUno(archivo: File): Promise<ArchivoFoto> {
        const tipo = archivo.type.toLowerCase();
        if (TIPOS_VIDEO_PERMITIDOS.has(tipo)) {
            if (archivo.size > MAX_VIDEO_BYTES) {
                throw new Error(`${archivo.name}: pesa más de 50 MB.`);
            }
            return subirVideo(archivo);
        }
        if (!TIPOS_IMAGEN_PERMITIDOS[tipo]) {
            throw new Error(`${archivo.name}: tipo no permitido (JPG, PNG, WebP, MP4 o WebM).`);
        }
        if (archivo.size > MAX_BYTES) {
            throw new Error(`${archivo.name}: pesa más de 5 MB.`);
        }
        return subirImagen(archivo);
    }

    async function manejarArchivos(files: FileList | null) {
        if (!files || files.length === 0) return;
        const ocupados = fotosRef.current.length + previews.length;
        const espacios = MAX_FOTOS_COMPOSER_NEGOCIO - ocupados;
        if (espacios <= 0) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER_NEGOCIO} fotos por publicación.`,
            );
            return;
        }
        const archivos = Array.from(files).slice(0, espacios);

        const items = archivos.map((archivo) => ({
            tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            url: URL.createObjectURL(archivo),
            tipo: (TIPOS_VIDEO_PERMITIDOS.has(archivo.type.toLowerCase()) ? 'video' : 'imagen') as
                | 'imagen'
                | 'video',
            archivo,
        }));
        setPreviews((prev) => [
            ...prev,
            ...items.map(({ tempId, url, tipo }) => ({ tempId, url, tipo })),
        ]);

        if (inputGaleriaRef.current) inputGaleriaRef.current.value = '';
        if (inputCamaraRef.current) inputCamaraRef.current.value = '';
        if (inputCamaraVideoRef.current) inputCamaraVideoRef.current.value = '';

        const resultados = await Promise.allSettled(
            items.map(async (item) => {
                const archivoFoto = await subirUno(item.archivo);
                return { tempId: item.tempId, archivoFoto };
            }),
        );

        const exitosas: ArchivoFoto[] = [];
        resultados.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                exitosas.push(r.value.archivoFoto);
                urlsSubidasEnSesion.current.add(r.value.archivoFoto.url);
                if (r.value.archivoFoto.posterUrl) {
                    urlsSubidasEnSesion.current.add(r.value.archivoFoto.posterUrl);
                }
            } else {
                const msg = r.reason instanceof Error
                    ? r.reason.message
                    : `Falló la subida de ${items[i].archivo.name}.`;
                notificar.error(msg);
            }
        });

        const tempIdsProcesados = new Set(items.map((i) => i.tempId));
        setPreviews((prev) =>
            prev.filter((p) => !tempIdsProcesados.has(p.tempId)),
        );
        items.forEach((i) => URL.revokeObjectURL(i.url));

        if (exitosas.length > 0) {
            const combinadas = [...fotosRef.current, ...exitosas].slice(
                0,
                MAX_FOTOS_COMPOSER_NEGOCIO,
            );
            onCambioFotos(combinadas);
        }
    }

    function eliminar(idx: number) {
        const foto = fotos[idx];
        const nuevas = fotos.filter((_, i) => i !== idx);
        onCambioFotos(nuevas);
        if (foto) {
            urlsSubidasEnSesion.current.delete(foto.url);
            eliminarHuerfanaMutation.mutate(foto.url);
            if (foto.tipo === 'video' && foto.posterUrl) {
                urlsSubidasEnSesion.current.delete(foto.posterUrl);
                eliminarHuerfanaMutation.mutate(foto.posterUrl);
            }
        }
    }

    function puedeAgregar(): boolean {
        const ocupados = fotos.length + previews.length;
        if (ocupados >= MAX_FOTOS_COMPOSER_NEGOCIO) {
            notificar.advertencia(
                `Máximo ${MAX_FOTOS_COMPOSER_NEGOCIO} fotos por publicación.`,
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

    function abrirCamaraVideo() {
        if (!puedeAgregar()) return;
        inputCamaraVideoRef.current?.click();
    }

    return {
        subiendo: previews.length > 0,
        previews,
        eliminar,
        abrirGaleria,
        abrirCamara,
        abrirCamaraVideo,
        inputGaleriaProps: {
            ref: inputGaleriaRef,
            type: 'file' as const,
            accept: 'image/jpeg,image/png,image/webp,video/mp4,video/webm',
            multiple: true,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
        inputCamaraProps: {
            ref: inputCamaraRef,
            type: 'file' as const,
            // Solo imagen: mezclar image/*+video/* en accept rompe el salto
            // directo a la cámara nativa (capture) en Android/Chrome — el
            // navegador cae al selector genérico. El consumidor decide entre
            // este input (foto) y `inputCamaraVideoProps` (video) vía un
            // popup "Tomar foto" / "Grabar video" sobre el chip Cámara.
            accept: 'image/jpeg,image/png,image/webp',
            capture: 'environment' as const,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
        inputCamaraVideoProps: {
            ref: inputCamaraVideoRef,
            type: 'file' as const,
            accept: 'video/mp4,video/webm',
            capture: 'environment' as const,
            hidden: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                manejarArchivos(e.target.files),
        },
    };
}
