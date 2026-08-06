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
    inicio: {
        ruta: '/inicio',
        descripcion: 'Home — "Pregúntale a tu ciudad", feed de preguntas de la comunidad',
    },
    mi_perfil: {
        ruta: '/perfil',
        descripcion: 'Datos personales: nombre, foto de perfil/avatar, teléfono, fecha de nacimiento, ciudad',
    },
    seguridad: {
        ruta: '/perfil?tab=seguridad',
        descripcion: 'Cambiar contraseña, verificación en dos pasos (2FA)',
    },
    membresia_pagos: {
        ruta: '/perfil?tab=pagos',
        descripcion: 'Ver membresía, recibos, cambiar método de pago (negocios)',
    },
    marketplace_crear_vendo: {
        ruta: '/marketplace?crear=vendo',
        descripcion: 'Formulario para vender un artículo en MarketPlace',
    },
    marketplace_crear_busco: {
        ruta: '/marketplace?crear=busco',
        descripcion: 'Formulario para publicar que se busca comprar un artículo',
    },
    negocios: {
        ruta: '/negocios',
        descripcion: 'Directorio de negocios locales',
    },
    marketplace: {
        ruta: '/marketplace',
        descripcion: 'Feed de compra-venta entre vecinos',
    },
    ofertas: {
        ruta: '/ofertas',
        descripcion: 'Feed público para DESCUBRIR promociones de los negocios (distinto de Mis Cupones, que es tu colección personal ya guardada)',
    },
    servicios: {
        ruta: '/servicios',
        descripcion: 'Oficios, servicios profesionales y vacantes de empleo',
    },
    cardya: {
        ruta: '/cardya',
        descripcion: 'Tarjeta de lealtad digital: puntos, billeteras y recompensas',
    },
    mis_cupones: {
        ruta: '/mis-cupones',
        descripcion: 'Cupones guardados de la sección Ofertas',
    },
    guardados: {
        ruta: '/guardados',
        descripcion: 'Negocios, ofertas, artículos o servicios guardados como favoritos',
    },
    mis_publicaciones: {
        ruta: '/mis-publicaciones',
        descripcion: 'Publicaciones propias en MarketPlace y Servicios',
    },
    ayuda: {
        ruta: '/ayuda',
        descripcion: 'Centro de Ayuda: tutoriales en video de cómo usar la app',
    },
    anunciate: {
        ruta: '/anunciate',
        descripcion: 'Dar de alta un negocio propio en AnunciaYA',
    },
    business_studio: {
        ruta: '/business-studio',
        descripcion: 'Panel de gestión del negocio (catálogo, promociones, puntos, empleados, reportes) — solo si ya tiene negocio',
    },
    business_studio_catalogo: {
        ruta: '/business-studio/catalogo',
        descripcion: 'Agregar o editar productos/servicios del catálogo del negocio — usa este destino cuando el comerciante pida crear/agregar un artículo o producto a SU catálogo (Coyo no puede armarle el borrador todavía, solo llevarlo ahí)',
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
            'Lleva al usuario a una sección puntual de SU CUENTA cuando pide ir, abrir o cambiar algo concreto — incluye tanto pedidos directos ("llévame a...", "abre...") COMO dudas de "cómo hago algo" cuando ese "algo" corresponde a un destino real (ej. "¿cómo cambio mi contraseña?", "¿dónde veo mi membresía?", "quiero vender algo" → llama la función, no solo expliques en texto). NO la uses para preguntas de "qué es"/"para qué sirve" (esas se responden en texto con la información de AnunciaYA) ni para buscar negocios/artículos reales (para eso usa buscar_informacion).',
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
        nombre: 'navegar_a_perfil_negocio',
        descripcion:
            'Lleva al usuario al perfil de UN NEGOCIO ESPECÍFICO por nombre (ej. "llévame al perfil de Taqueria El Guero", "abre la página de la Panadería Tijuana"). Distinta de navegar_a_destino (que es solo para secciones fijas de la cuenta del usuario, no negocios). El backend busca el negocio real por el nombre que des — si no lo encuentra, se lo dice al usuario.',
        parametros: [
            {
                nombre: 'nombreNegocio',
                tipo: 'string',
                descripcion: 'Nombre del negocio tal como lo dijo el usuario',
                obligatorio: true,
            },
        ],
    },
    {
        nombre: 'crear_publicacion_marketplace',
        descripcion:
            'Arma el borrador de una publicación de MarketPlace PERSONAL (vender o buscar un artículo entre vecinos) para que el usuario la revise y publique él mismo. Requiere el modo y una descripción de lo que quiere vender/buscar. NUNCA la ejecutes si falta el modo o no hay ninguna descripción del artículo — en ese caso pregunta primero. LÍMITE REAL (no la sobre-prometas): solo deja listo un TÍTULO corto y el precio si lo dieron — NUNCA puede agregar fotos ni escribir una descripción larga por su cuenta; eso lo completa el usuario en el formulario. NO la uses si el usuario pide agregar un producto a SU CATÁLOGO de negocio (Business Studio) — eso es otra cosa, usa navegar_a_destino(business_studio_catalogo).',
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
                descripcion: 'Lo que el usuario dijo que quiere vender o buscar, en pocas palabras — se usa como TÍTULO corto de la publicación, no como descripción larga',
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
            'Busca negocios, ofertas, artículos o servicios REALES ya publicados en la ciudad — el mismo buscador del Home ("Pregúntale a Peñasco"). Úsala SOLO para encontrar algo concreto que alguien publicó (ej. "hay tacos", "quién vende bicicletas", "necesito un plomero"). NO la uses para preguntas sobre qué es o cómo funciona AnunciaYA o alguna de sus secciones (CardYA, puntos, cupones, etc.) — esas se responden directo en texto con la información de la app.',
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
