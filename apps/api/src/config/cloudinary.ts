/**
 * ============================================================================
 * CLOUDINARY CONFIG - Configuración del SDK
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/config/cloudinary.ts
 * 
 * PROPÓSITO:
 * Configurar el SDK oficial de Cloudinary para operaciones del lado del servidor.
 * Principalmente usado para ELIMINAR imágenes de forma segura.
 * 
 * POR QUÉ EN EL BACKEND:
 * La eliminación requiere el API Secret, que NUNCA debe exponerse en el frontend.
 * Solo el backend puede hacer operaciones destructivas de forma segura.
 * 
 * USO:
 * import { cloudinary } from '@/config/cloudinary';
 * await cloudinary.uploader.destroy(publicId);
 * ============================================================================
 */

import { v2 as cloudinary } from 'cloudinary';

// =============================================================================
// VALIDAR VARIABLES DE ENTORNO
// =============================================================================

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ ERROR: Faltan variables de entorno de Cloudinary');
  console.error('CLOUDINARY_CLOUD_NAME:', CLOUD_NAME);
  console.error('CLOUDINARY_API_KEY:', API_KEY);
  console.error('CLOUDINARY_API_SECRET:', API_SECRET ? '***' : 'MISSING');
  throw new Error('Configuración de Cloudinary incompleta');
}

// =============================================================================
// CONFIGURAR SDK
// =============================================================================

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true, // Siempre usar HTTPS
});

console.log('✅ Cloudinary SDK configurado correctamente');
console.log(`   Cloud Name: ${CLOUD_NAME}`);

// =============================================================================
// EXPORTS
// =============================================================================

export { cloudinary };
export default cloudinary;