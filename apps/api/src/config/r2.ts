/**
 * r2.ts
 * ======
 * Configuración del cliente S3 para Cloudflare R2
 * 
 * Ubicación: apps/api/src/config/r2.ts
 * 
 * Cloudflare R2 es compatible con la API de S3, por lo que usamos
 * el SDK oficial de AWS para conectarnos.
 */

import { S3Client } from '@aws-sdk/client-s3';

// =============================================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// =============================================================================

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Validar que todas las variables estén definidas
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.warn('⚠️  Variables de Cloudflare R2 no configuradas completamente');
    console.warn('   Requeridas: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME, R2_PUBLIC_URL');
}

// =============================================================================
// CLIENTE S3 PARA CLOUDFLARE R2
// =============================================================================

/**
 * Cliente S3 configurado para Cloudflare R2
 * 
 * Nota: R2 usa la API de S3, pero con endpoint personalizado
 */
export const r2Client = new S3Client({
    region: 'auto', // R2 usa 'auto' como región
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

// =============================================================================
// CONFIGURACIÓN EXPORTADA
// =============================================================================

export const r2Config = {
    bucketName: R2_BUCKET_NAME || 'anunciaya-tickets',
    publicUrl: R2_PUBLIC_URL || '',
    endpoint: R2_ENDPOINT || '',
};

// Log de confirmación (solo en desarrollo)
if (process.env.NODE_ENV !== 'production' && R2_ACCESS_KEY_ID) {
    console.log('✅ Cloudflare R2 configurado correctamente');
    console.log(`   Bucket: ${r2Config.bucketName}`);
    console.log(`   Public URL: ${r2Config.publicUrl}`);
}