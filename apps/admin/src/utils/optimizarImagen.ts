/**
 * optimizarImagen.ts
 * ==================
 * Reduce el peso de una imagen ANTES de subirla a R2: la redimensiona (máx. `maxLado` px del lado
 * largo) y la recomprime a WebP. Corre 100% en el navegador (canvas), sin librerías. Si el archivo no
 * es una imagen rasterizable, es un GIF (animación) o la conversión no ayuda, devuelve el original.
 *
 * Ubicación: apps/admin/src/utils/optimizarImagen.ts
 */

export async function optimizarImagen(file: File, maxLado = 1600, calidad = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
    if (!blob) return file;
    // Si no se redimensionó y el WebP no pesa menos, no vale la pena cambiar de formato.
    if (escala === 1 && blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nombre, { type: 'image/webp' });
  } finally {
    bitmap.close?.();
  }
}
