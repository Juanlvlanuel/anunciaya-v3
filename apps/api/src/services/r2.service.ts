/**
 * r2.service.ts
 * ==============
 * Servicio para subir y eliminar archivos en Cloudflare R2
 * 
 * Ubicación: apps/api/src/services/r2.service.ts
 * 
 * Usado principalmente para fotos de tickets en ScanYA
 */

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Config } from '../config/r2.js';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TIPOS
// =============================================================================

interface RespuestaUpload {
    success: boolean;
    message: string;
    data?: {
        url: string;
        key: string;
    };
    code: number;
}

interface RespuestaPresignedUrl {
    success: boolean;
    message: string;
    data?: {
        uploadUrl: string;
        publicUrl: string;
        key: string;
        expiresIn: number;
    };
    code: number;
}

interface RespuestaDelete {
    success: boolean;
    message: string;
    code: number;
}

// =============================================================================
// FUNCIÓN 1: GENERAR PRESIGNED URL PARA UPLOAD
// =============================================================================

/**
 * Genera una URL pre-firmada para que el frontend suba directamente a R2.
 * Esto evita que el archivo pase por nuestro servidor.
 * 
 * @param carpeta - Carpeta dentro del bucket (ej: 'tickets', 'chat')
 * @param nombreArchivo - Nombre original del archivo
 * @param contentType - Tipo MIME del archivo (ej: 'image/jpeg')
 * @param expiresIn - Segundos de validez de la URL (default: 300 = 5 min)
 * @returns URL pre-firmada + URL pública final
 */
export async function generarPresignedUrl(
    carpeta: string,
    nombreArchivo: string,
    contentType: string,
    expiresIn: number = 300
): Promise<RespuestaPresignedUrl> {
    try {
        // Validar configuración
        if (!r2Config.bucketName || !r2Config.publicUrl) {
            return {
                success: false,
                message: 'Cloudflare R2 no está configurado correctamente',
                code: 500,
            };
        }

        // Validar tipo de contenido (solo imágenes)
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!tiposPermitidos.includes(contentType)) {
            return {
                success: false,
                message: `Tipo de archivo no permitido. Permitidos: ${tiposPermitidos.join(', ')}`,
                code: 400,
            };
        }

        // Generar key único para el archivo
        const extension = nombreArchivo.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const uniqueId = uuidv4().slice(0, 8);
        const key = `${carpeta}/${timestamp}-${uniqueId}.${extension}`;

        // Crear comando de upload
        const command = new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: key,
            ContentType: contentType,
        });

        // Generar URL pre-firmada
        const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn });

        // Construir URL pública
        const publicUrl = `${r2Config.publicUrl}/${key}`;

        return {
            success: true,
            message: 'URL de subida generada correctamente',
            data: {
                uploadUrl,
                publicUrl,
                key,
                expiresIn,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en generarPresignedUrl:', error);
        return {
            success: false,
            message: 'Error al generar URL de subida',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 2: SUBIR ARCHIVO DIRECTAMENTE (desde el backend)
// =============================================================================

/**
 * Sube un archivo directamente a R2 desde el backend.
 * Usar solo cuando el archivo ya está en el servidor (ej: procesamiento).
 * Para uploads del usuario, preferir presigned URLs.
 * 
 * @param buffer - Contenido del archivo como Buffer
 * @param carpeta - Carpeta dentro del bucket
 * @param nombreArchivo - Nombre original del archivo
 * @param contentType - Tipo MIME del archivo
 * @returns URL pública del archivo
 */
export async function subirArchivo(
    buffer: Buffer,
    carpeta: string,
    nombreArchivo: string,
    contentType: string
): Promise<RespuestaUpload> {
    try {
        // Validar configuración
        if (!r2Config.bucketName || !r2Config.publicUrl) {
            return {
                success: false,
                message: 'Cloudflare R2 no está configurado correctamente',
                code: 500,
            };
        }

        // Generar key único
        const extension = nombreArchivo.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const uniqueId = uuidv4().slice(0, 8);
        const key = `${carpeta}/${timestamp}-${uniqueId}.${extension}`;

        // Subir archivo
        const command = new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await r2Client.send(command);

        // Construir URL pública
        const url = `${r2Config.publicUrl}/${key}`;

        return {
            success: true,
            message: 'Archivo subido correctamente',
            data: {
                url,
                key,
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en subirArchivo:', error);
        return {
            success: false,
            message: 'Error al subir archivo',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 3: ELIMINAR ARCHIVO
// =============================================================================

/**
 * Elimina un archivo de R2.
 * 
 * @param key - Key del archivo (ej: 'tickets/1234567890-abc123.jpg')
 * @returns Resultado de la operación
 */
export async function eliminarArchivo(key: string): Promise<RespuestaDelete> {
    try {
        // Validar configuración
        if (!r2Config.bucketName) {
            return {
                success: false,
                message: 'Cloudflare R2 no está configurado correctamente',
                code: 500,
            };
        }

        // Si recibimos una URL completa, extraer el key
        let keyFinal = key;
        if (key.startsWith('http')) {
            const url = new URL(key);
            keyFinal = url.pathname.slice(1); // Quitar el '/' inicial
        }

        // Eliminar archivo
        const command = new DeleteObjectCommand({
            Bucket: r2Config.bucketName,
            Key: keyFinal,
        });

        await r2Client.send(command);

        return {
            success: true,
            message: 'Archivo eliminado correctamente',
            code: 200,
        };

    } catch (error) {
        console.error('Error en eliminarArchivo:', error);
        return {
            success: false,
            message: 'Error al eliminar archivo',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 4: EXTRAER KEY DE UNA URL
// =============================================================================

/**
 * Extrae el key de un archivo a partir de su URL pública.
 * 
 * @param url - URL pública del archivo
 * @returns Key del archivo o null si no es válida
 */
export function extraerKeyDeUrl(url: string): string | null {
    try {
        if (!url.startsWith(r2Config.publicUrl)) {
            return null;
        }
        
        const urlObj = new URL(url);
        return urlObj.pathname.slice(1); // Quitar el '/' inicial
    } catch {
        return null;
    }
}

// =============================================================================
// FUNCIÓN 5: VERIFICAR SI ES URL DE R2
// =============================================================================

/**
 * Verifica si una URL pertenece a nuestro bucket de R2.
 * 
 * @param url - URL a verificar
 * @returns true si es una URL de R2
 */
export function esUrlR2(url: string): boolean {
    return url.startsWith(r2Config.publicUrl);
}