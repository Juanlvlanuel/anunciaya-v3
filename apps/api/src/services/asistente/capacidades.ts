/**
 * capacidades.ts — Catálogo de habilidades del Asistente Coyo (FAB global)
 * ==========================================================================
 * Registro de lo que Coyo puede EJECUTAR cuando actúa como asistente (no solo
 * responder preguntas). Cada fase del feature agrega entradas aquí — este
 * archivo es la única fuente de verdad de qué sabe hacer el asistente, tanto
 * para construir las `FunctionDeclaration` de Gemini (ver `coyoIA.service.ts`,
 * único archivo que conoce el shape del SDK) como para que el frontend/backend
 * sepan qué parámetros esperar de cada capacidad.
 *
 * Ubicación: apps/api/src/services/asistente/capacidades.ts
 */

// =============================================================================
// TIPOS
// =============================================================================

export interface ParametroCapacidad {
    nombre: string;
    tipo: 'string' | 'number' | 'boolean';
    descripcion: string;
    obligatorio: boolean;
    /** Si viene, el valor debe ser UNO de estos — evita que Gemini invente texto libre (ej. rutas). */
    enumValues?: string[];
}

export interface Capacidad {
    nombre: string;
    descripcion: string;
    parametros: ParametroCapacidad[];
}

// =============================================================================
// DESTINOS NAVEGABLES — lista cerrada, nunca URLs libres generadas por Gemini
// =============================================================================

export const DESTINOS_NAVEGABLES: Record<string, { ruta: string; descripcion: string }> = {
    mi_perfil: {
        ruta: '/perfil',
        descripcion: 'Datos personales: nombre, teléfono, fecha de nacimiento, ciudad',
    },
    seguridad: {
        ruta: '/perfil?tab=seguridad',
        descripcion: 'Cambiar contraseña, verificación en dos pasos (2FA)',
    },
    membresia_pagos: {
        ruta: '/perfil?tab=pagos',
        descripcion: 'Ver membresía, recibos, cambiar método de pago',
    },
    marketplace_crear_vendo: {
        ruta: '/marketplace?crear=vendo',
        descripcion: 'Formulario para vender un artículo en MarketPlace',
    },
    marketplace_crear_busco: {
        ruta: '/marketplace?crear=busco',
        descripcion: 'Formulario para publicar que se busca comprar un artículo',
    },
};

/**
 * Traduce un nombre semántico de destino (elegido por Gemini de la lista
 * cerrada) a la ruta real de la app. Devuelve `null` si el nombre no existe
 * en el catálogo — nunca se navega con un valor no reconocido.
 */
export function resolverDestino(nombreDestino: string): string | null {
    return DESTINOS_NAVEGABLES[nombreDestino]?.ruta ?? null;
}

// =============================================================================
// CATÁLOGO DE CAPACIDADES — Fase 1 (MarketPlace)
// =============================================================================

export const CAPACIDADES_ASISTENTE: Capacidad[] = [
    {
        nombre: 'navegar_a_destino',
        descripcion:
            'Lleva al usuario a una sección puntual de SU CUENTA cuando pide ir, abrir o cambiar algo concreto (ej. "cambiar mi contraseña", "ver mi membresía", "quiero vender algo"). NO la uses para preguntas de información — para eso usa buscar_informacion.',
        parametros: [
            {
                nombre: 'destino',
                tipo: 'string',
                descripcion: 'Nombre semántico del destino, de la lista cerrada disponible',
                obligatorio: true,
                enumValues: Object.keys(DESTINOS_NAVEGABLES),
            },
        ],
    },
    {
        nombre: 'crear_publicacion_marketplace',
        descripcion:
            'Arma el borrador de una publicación de MarketPlace (vender o buscar un artículo) para que el usuario la revise y publique él mismo. Requiere el modo y una descripción de lo que quiere vender/buscar. NUNCA la ejecutes si falta el modo o no hay ninguna descripción del artículo — en ese caso pregunta primero.',
        parametros: [
            {
                nombre: 'modo',
                tipo: 'string',
                descripcion: '"vendo" si el usuario ofrece un artículo, "busco" si quiere comprar algo',
                obligatorio: true,
                enumValues: ['vendo', 'busco'],
            },
            {
                nombre: 'descripcionArticulo',
                tipo: 'string',
                descripcion: 'Lo que el usuario dijo que quiere vender o buscar, en sus propias palabras',
                obligatorio: true,
            },
            {
                nombre: 'precio',
                tipo: 'number',
                descripcion: 'Precio en pesos mexicanos, solo si el usuario ya lo mencionó',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'buscar_informacion',
        descripcion:
            'Responde preguntas normales sobre negocios, ofertas, servicios o artículos de la ciudad — el mismo buscador del Home ("Pregúntale a Peñasco"). Úsala para cualquier pregunta que NO sea pedir crear algo ni navegar a una sección de la cuenta.',
        parametros: [
            {
                nombre: 'pregunta',
                tipo: 'string',
                descripcion: 'La pregunta del usuario, tal cual la hizo',
                obligatorio: true,
            },
        ],
    },
];
