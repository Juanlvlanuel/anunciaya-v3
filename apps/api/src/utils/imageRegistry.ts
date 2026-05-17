/**
 * imageRegistry.ts
 * ================
 * Inventario ÚNICO Y CENTRAL de todos los campos de la BD que almacenan URLs
 * de imágenes. Es la fuente de verdad para herramientas de reconcile y limpieza
 * de R2.
 *
 * ⚠️ REGLA: si agregas una columna nueva que guarde una URL de imagen, DEBES
 * registrarla aquí. El reconcile de R2 depende de este archivo para saber
 * qué URLs están "en uso". Si una URL no aparece aquí, el sistema la considerará
 * huérfana y la puede borrar.
 *
 * Ubicación: apps/api/src/utils/imageRegistry.ts
 */

/**
 * Definición de un campo de imagen en la BD.
 */
export interface ImageField {
    /** Nombre de la tabla (SQL, no el nombre del export de Drizzle) */
    tabla: string;
    /** Nombre de la columna (SQL, snake_case) */
    columna: string;
    /** Tipo de almacenamiento:
     *  - `url`: string único con una URL
     *  - `array`: array de strings (text[])
     *  - `text-scan-urls`: campo texto o JSON string donde pueden aparecer URLs
     *    embebidas (ej. chat_mensajes.contenido). Se extraen con regex que
     *    matchea el dominio público R2 configurado en env.
     *  - `jsonb-array-url`: array JSON de strings/objetos con URL (pendiente v2)
     */
    tipo: 'url' | 'array' | 'text-scan-urls' | 'jsonb-array-url';
    /** Descripción opcional para logs */
    descripcion?: string;
}

/**
 * Carpetas (primer segmento del path en R2) que el reconcile NUNCA debe tocar.
 *
 * Estos archivos son gestionados fuera de BD (assets estáticos del equipo,
 * iconos de marca, plantillas de emails, etc.) y siempre se tratarán como
 * "en uso" independientemente de si alguna tabla los referencia.
 *
 * ⚠️ Toda carpeta nueva que contenga assets no-users debe listarse aquí.
 */
export const CARPETAS_PROTEGIDAS = new Set<string>([
    'brand',   // Logos y assets de la marca AnunciaYA (subidos por el equipo)
    // Agregar aquí según aparezcan: 'templates', 'static', 'email-assets', etc.
]);

/**
 * Registry exhaustivo de todos los campos que almacenan URLs de imágenes.
 * Revisado contra `apps/api/src/db/schemas/schema.ts` el 17 Abril 2026.
 */
export const IMAGE_REGISTRY: ImageField[] = [
    // ─── Usuarios ───
    { tabla: 'usuarios', columna: 'avatar_url', tipo: 'url', descripcion: 'Foto de perfil del usuario' },

    // ─── Negocios ───
    { tabla: 'negocios', columna: 'logo_url', tipo: 'url', descripcion: 'Logo del negocio' },

    // ─── Sucursales ───
    { tabla: 'negocio_sucursales', columna: 'foto_perfil', tipo: 'url', descripcion: 'Foto de perfil de la sucursal' },
    { tabla: 'negocio_sucursales', columna: 'portada_url', tipo: 'url', descripcion: 'Imagen de portada de la sucursal' },

    // ─── Galería ───
    { tabla: 'negocio_galeria', columna: 'url', tipo: 'url', descripcion: 'Imagen de galería de sucursal' },

    // ─── Catálogo ───
    { tabla: 'articulos', columna: 'imagen_principal', tipo: 'url', descripcion: 'Imagen principal del artículo' },
    { tabla: 'articulos', columna: 'imagenes_adicionales', tipo: 'array', descripcion: 'Imágenes adicionales del artículo' },

    // ─── Snapshot en pedidos ───
    { tabla: 'pedido_articulos', columna: 'imagen_url', tipo: 'url', descripcion: 'Snapshot de imagen del artículo al momento del pedido' },

    // ─── Ofertas y Cupones ───
    { tabla: 'ofertas', columna: 'imagen', tipo: 'url', descripcion: 'Imagen de oferta/cupón' },

    // ─── Recompensas (CardYA) ───
    { tabla: 'recompensas', columna: 'imagen_url', tipo: 'url', descripcion: 'Imagen de recompensa' },

    // (Dinámicas removidas en Fase D del cleanup — visión v3, abril 2026)

    // ─── Empleados (ScanYA) ───
    { tabla: 'empleados', columna: 'foto_url', tipo: 'url', descripcion: 'Avatar del empleado' },

    // ─── ScanYA transacciones ───
    { tabla: 'puntos_transacciones', columna: 'foto_ticket_url', tipo: 'url', descripcion: 'Foto del ticket adjunto a la venta' },

    // ─── Transacciones (legado) ───
    { tabla: 'transacciones_evidencia', columna: 'url_imagen', tipo: 'url', descripcion: 'Evidencia fotográfica de transacción' },

    // ─── Bolsa de trabajo ───
    { tabla: 'bolsa_trabajo', columna: 'portafolio_url', tipo: 'url', descripcion: 'URL de portafolio/imagen de candidato' },

    // ─── Notificaciones ───
    { tabla: 'notificaciones', columna: 'actor_imagen_url', tipo: 'url', descripcion: 'Imagen del actor que disparó la notificación (cliente, producto, etc.)' },

    // ─── ChatYA ───
    // El campo `contenido` varía según el tipo de mensaje:
    //   - imagen/audio/documento: URL directa de R2
    //   - cupon: JSON con campo `imagen` embebido
    //   - texto/sistema/contacto/ubicacion: no contiene URL (regex no captura nada)
    // Usamos `text-scan-urls` para extraer cualquier URL R2 que aparezca,
    // independiente del formato.
    { tabla: 'chat_mensajes', columna: 'contenido', tipo: 'text-scan-urls', descripcion: 'URLs R2 de imágenes/audios/documentos/cupones en mensajes' },

    // ─── Marketplace ───
    // Tabla `articulos_marketplace` (Sprint 1, Mayo 2026). Campo `fotos` es
    // JSONB (array de URLs en R2). `text-scan-urls` hace cast a text y extrae
    // con regex — cubre tanto array plano como array de objetos si en el
    // futuro la estructura crece.
    { tabla: 'articulos_marketplace', columna: 'fotos', tipo: 'text-scan-urls', descripcion: 'Fotos del artículo de MarketPlace (JSONB array de URLs)' },

    // ─── Servicios ───
    // Tabla `servicios_publicaciones` (Sprint 1 Servicios, 15-May-2026). Campo
    // `fotos` es JSONB array de URLs en R2 (max 6 fotos por publicación, 1 en
    // vacantes). Mismo patrón que marketplace.
    { tabla: 'servicios_publicaciones', columna: 'fotos', tipo: 'text-scan-urls', descripcion: 'Fotos de publicación de Servicios (JSONB array de URLs)' },
];

/**
 * Campos que aún NO están en el registry — revisar periódicamente si aparecen
 * leaks asociados. Actualmente todos los campos identificados en el schema están
 * cubiertos (17 Abril 2026, scan completo).
 */
export const CAMPOS_NO_SOPORTADOS_AUN: Array<{ tabla: string; columna: string; razon: string }> = [];
