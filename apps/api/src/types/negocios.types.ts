/**
 * ============================================================================
 * TIPOS - Negocios y Sucursales
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/types/negocios.types.ts
 * 
 * PROPÓSITO:
 * Definir tipos TypeScript para resultados de queries SQL relacionados con
 * negocios y sucursales, eliminando el uso de 'any' explícito
 */

// =============================================================================
// INTERFACES PARA RESULTADOS DE QUERIES SQL
// =============================================================================

/**
 * Resultado de la query SQL en obtenerPerfilSucursal
 * Representa una fila con todos los datos de un negocio/sucursal
 */
export interface PerfilSucursalRow {
    // Datos del negocio
    negocio_id: string;
    negocio_nombre: string;
    negocio_descripcion: string | null;
    logo_url: string | null;
    sitio_web: string | null;
    acepta_cardya: boolean;
    verificado: boolean;

    // Datos de la sucursal
    sucursal_id: string;
    sucursal_nombre: string;
    es_principal: boolean;
    portada_url: string | null;
    foto_perfil: string | null;
    redes_sociales: Record<string, string> | null;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
    whatsapp: string | null;
    correo: string | null;
    tiene_envio_domicilio: boolean;
    tiene_servicio_domicilio: boolean;
    latitud: number | null;
    longitud: number | null;
    calificacion_promedio: number | null;
    total_calificaciones: number;
    total_likes: number;
    total_visitas: number;
    activa: boolean;
    zona_horaria: string;

    // Arrays anidados (vienen como JSON desde SQL)
    categorias: Array<{
        id: number;
        nombre: string;
        categoria: {
            id: number;
            nombre: string;
            icono: string;
        };
    }> | null;

    horarios: Array<{
        diaSemana: number;
        abierto: boolean;
        horaApertura: string | null;
        horaCierre: string | null;
        tieneHorarioComida: boolean;
        comidaInicio: string | null;
        comidaFin: string | null;
    }> | null;

    metodos_pago: string[] | null;

    galeria: Array<{
        id: number;
        url: string;
        titulo: string | null;
        orden: number;
    }> | null;

    metricas: {
        totalLikes: number;
        totalFollows: number;
        totalViews: number;
        totalShares: number;
        totalClicks: number;
        totalMessages: number;
    } | null;

    // Estado del usuario
    liked: boolean;
    followed: boolean;
    esta_abierto: boolean | null;

    // Conteo de sucursales
    total_sucursales: number;
}

/**
 * Resultado de la query SQL en listarSucursales (resumen)
 * Representa una fila con datos básicos para listados
 */
export interface SucursalResumenRow {
    // Datos del negocio
    negocio_id: string;
    negocio_nombre: string;
    logo_url: string | null;
    acepta_cardya: boolean;
    verificado: boolean;

    // Datos de la sucursal
    sucursal_id: string;
    sucursal_nombre: string;
    direccion: string | null;
    ciudad: string | null;
    telefono: string | null;
    whatsapp: string | null;
    portada_url: string | null;
    tiene_envio_domicilio: boolean;
    tiene_servicio_domicilio: boolean;
    activa: boolean;

    // Coordenadas de la sucursal
    latitud: number | null;
    longitud: number | null;

    // Métricas
    distancia_km: number | null;

    total_likes: number;
    total_calificaciones: number;
    total_visitas: number;
    calificacion_promedio: number | null;

    // Estado del usuario
    liked: boolean;
    followed: boolean;
    esta_abierto: boolean | null;

    // Arrays anidados
    categorias: Array<{
        id: number;
        nombre: string;
        categoria: {
            id: number;
            nombre: string;
            icono: string;
        };
    }> | null;

    metodos_pago: string[] | null;

    galeria: Array<{
        id: number;
        url: string;
        titulo: string | null;
        orden: number;
    }> | null;
}