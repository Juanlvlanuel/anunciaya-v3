/**
 * ============================================================================
 * TIPOS - Artículos (Productos y Servicios)
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/types/articulos.types.ts
 * 
 * PROPÓSITO:
 * Definir tipos TypeScript para resultados de queries SQL relacionados con
 * artículos del catálogo, eliminando el uso de 'any' explícito
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD
 */

// =============================================================================
// INTERFACES PARA RESULTADOS DE QUERIES SQL
// =============================================================================

/**
 * Resultado de query SQL para listado de artículos
 * Representa una fila con datos básicos de un artículo
 */
export interface ArticuloCatalogoRow {
    id: string;
    negocio_id: string;
    tipo: 'producto' | 'servicio';
    nombre: string;
    descripcion: string | null;
    categoria: string;  // Default: 'General'
    precio_base: string;  // NUMERIC viene como string desde PostgreSQL
    precio_desde: boolean;
    imagen_principal: string | null;
    disponible: boolean;
    destacado: boolean;
    orden: number;
    total_ventas: number;
    total_vistas: number;
    created_at: string;
    updated_at: string;
}

/**
 * Resultado de query SQL para detalle completo de un artículo
 * Incluye información de sucursales donde está disponible
 */
export interface ArticuloDetalleRow extends ArticuloCatalogoRow {
    sucursales: Array<{
        id: string;
        nombre: string;
    }> | null;
}

/**
 * Resultado de query SQL para artículo público (compartir)
 * Incluye información básica del negocio
 */
export interface ArticuloPublicoRow extends ArticuloCatalogoRow {
    negocio_nombre: string;
    negocio_logo_url: string | null;
    sucursal_id: string | null;
    sucursal_nombre: string | null;
    ciudad: string | null;
    whatsapp: string | null;
}

// =============================================================================
// INTERFACES PARA INPUT DE DATOS
// =============================================================================

/**
 * Datos de entrada para crear un artículo
 * Viene desde el frontend (JSON)
 */
export interface CrearArticuloInput {
    tipo: 'producto' | 'servicio';
    nombre: string;
    descripcion?: string | null;
    categoria?: string;  // Default: 'General'
    precioBase: number;  // Frontend envía number, BD guarda como NUMERIC
    precioDesde?: boolean;
    imagenPrincipal?: string | null;
    disponible?: boolean;
    destacado?: boolean;
}

/**
 * Datos de entrada para actualizar un artículo
 * Todos los campos son opcionales (PATCH)
 */
export interface ActualizarArticuloInput {
    nombre?: string;
    descripcion?: string | null;
    categoria?: string;
    precioBase?: number;
    precioDesde?: boolean;
    imagenPrincipal?: string | null;
    disponible?: boolean;
    destacado?: boolean;
    orden?: number;
}

/**
 * Datos de entrada para duplicar artículo a otras sucursales
 * Solo DUEÑOS pueden usar esta función
 */
export interface DuplicarArticuloInput {
    sucursalesIds: string[];  // Array de UUIDs de sucursales destino
}

