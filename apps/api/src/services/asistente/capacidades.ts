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

export interface DestinoNavegable {
    ruta: string;
    descripcion: string;
    /**
     * `true` si la ruta está bloqueada por completo en modo comercial
     * (`ModoPersonalEstrictoGuard.tsx` — política de negocio: MarketPlace y
     * Servicios son P2P, un negocio formal usa Catálogo/BS Vacantes en su
     * lugar). El guard NO auto-cambia de modo: si Coyo navega ahí estando
     * el usuario en modo comercial, el guard lo rebota a /inicio con un
     * toast — Coyo debe detectarlo ANTES de navegar y explicarlo, no dejar
     * que el usuario choque contra el guard sin saber por qué.
     */
    soloModoPersonal?: boolean;
}

export const DESTINOS_NAVEGABLES: Record<string, DestinoNavegable> = {
    inicio: {
        ruta: '/inicio',
        descripcion: 'Home — "Pregúntale a tu ciudad", feed de preguntas de la comunidad',
    },
    mi_perfil: {
        ruta: '/perfil',
        descripcion: 'El perfil PERSONAL DEL USUARIO (sus propios datos: nombre, foto/avatar, teléfono, fecha de nacimiento, ciudad). NUNCA uses este destino si el usuario menciona el nombre de un NEGOCIO — eso es navegar_a_perfil_negocio, una función distinta.',
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
        soloModoPersonal: true,
    },
    marketplace_crear_busco: {
        ruta: '/marketplace?crear=busco',
        descripcion: 'Formulario para publicar que se busca comprar un artículo',
        soloModoPersonal: true,
    },
    negocios: {
        ruta: '/negocios',
        descripcion: 'Directorio de negocios locales',
    },
    marketplace: {
        ruta: '/marketplace',
        descripcion: 'Feed de compra-venta entre vecinos',
        soloModoPersonal: true,
    },
    ofertas: {
        ruta: '/ofertas',
        descripcion: 'Feed público para DESCUBRIR promociones de los negocios (distinto de Mis Cupones, que es tu colección personal ya guardada)',
    },
    servicios: {
        ruta: '/servicios',
        descripcion: 'Oficios, servicios profesionales y vacantes de empleo',
        soloModoPersonal: true,
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

/**
 * `true` si el destino solo es accesible en modo Personal — `ModoPersonalEstrictoGuard`
 * lo bloquea por completo en modo comercial (redirige a /inicio + toast, SIN cambiar
 * de modo). Se usa para que Coyo lo detecte ANTES de navegar y lo explique, en vez
 * de anunciar "ahí te dejo" y que el guard rebote al usuario en silencio.
 */
export function destinoRequierePersonal(nombreDestino: string): boolean {
    return DESTINOS_NAVEGABLES[nombreDestino]?.soloModoPersonal === true;
}

// =============================================================================
// CATÁLOGO DE CAPACIDADES — Fase 1 (MarketPlace)
// =============================================================================

export const CAPACIDADES_ASISTENTE: Capacidad[] = [
    {
        nombre: 'navegar_a_destino',
        descripcion:
            'Lleva al usuario a una sección puntual de SU PROPIA CUENTA cuando pide ir, abrir o cambiar algo concreto — incluye tanto pedidos directos ("llévame a...", "abre...") COMO dudas de "cómo hago algo" cuando ese "algo" corresponde a un destino real (ej. "¿cómo cambio mi contraseña?", "¿dónde veo mi membresía?", "quiero vender algo" → llama la función, no solo expliques en texto). NO la uses para preguntas de "qué es"/"para qué sirve" (esas se responden en texto con la información de AnunciaYA), ni para buscar negocios/artículos reales (para eso usa buscar_informacion). IMPORTANTE — NO la confundas con navegar_a_perfil_negocio: si el usuario menciona el NOMBRE de un negocio (ej. "el perfil de Taquería El Güero", "la página de la Panadería Tijuana"), SIEMPRE es navegar_a_perfil_negocio, NUNCA destino=mi_perfil (ese es solo el perfil personal del propio usuario).',
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
            'Lleva al usuario al perfil de UN NEGOCIO ESPECÍFICO por nombre (ej. "llévame al perfil de Taqueria El Guero", "abre la página de la Panadería Tijuana", "quiero ver el perfil de [nombre]"). SIEMPRE que el usuario mencione el nombre propio de un negocio junto con "perfil"/"página"/"ficha", usa ESTA función — nunca navegar_a_destino(mi_perfil), que es solo el perfil PERSONAL del usuario que está hablando contigo, no de un negocio. El backend busca el negocio real por el nombre que des — si no lo encuentra, se lo dice al usuario.',
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
            'Arma el borrador de una publicación de MarketPlace PERSONAL (vender o buscar un artículo entre vecinos) para que el usuario la revise y publique él mismo. El formulario EXIGE título, descripción, categoría y (si modo="vendo") precio para poder publicar — LA CATEGORÍA ES OBLIGATORIA EN AMBOS MODOS ("vendo" Y "busco"), no la olvides cuando modo="busco" solo porque no hay foto que analizar (en "busco" nunca hay foto, el artículo aún no lo tiene el usuario — la categoría de todos modos se deduce del NOMBRE del artículo). ORDEN DE LAS PREGUNTAS (importante): primero necesitas saber QUÉ es el artículo — si el usuario todavía no lo dijo (ej. "quiero vender algo" / "busco algo"), pregúntale SOLO eso primero; nunca preguntes categoría ni nada más en ese mismo mensaje, sería prematuro. UNA VEZ que sepas qué es el artículo, la categoría CASI SIEMPRE es deducible por ti mismo sin preguntar, sea que lo vendan o lo busquen (ej. "mi iPhone 12" / "busco un iPhone" → Electrónica, "mi sofá" / "ando buscando un sofá" → Muebles, "mis tenis" / "busco tenis del 8" → Ropa) — complétala tú en silencio; pregúntala solo en el caso raro de que el artículo sea genuinamente ambiguo (ej. "un aparato", "una cosa"). Precio (si modo="vendo") sí pregúntalo siempre que falte. Además, si el usuario solo dio el nombre del artículo sin ninguna característica (estado, marca, motivo de venta, etc.), pregúntale AL MENOS un dato útil para escribir una buena descripción — MODO CONSULTOR, una pregunta a la vez, combinando lo que falte en la menor cantidad de preguntas posible. Con todo eso, redacta tú un título corto y atractivo (mejóralo, no repitas literal las palabras del usuario) y una descripción breve y natural — nunca inventes características que el usuario no mencionó. FOTOS: si el usuario adjuntó una foto con el botón de cámara del chat, verás en la conversación que ya se analizó automáticamente (título/descripción/categoría/condición detectados) — esa foto SÍ queda incluida en el borrador, no necesitas mencionarlo ni pedirla de nuevo. Si NO adjuntó ninguna, no prometas poder agregarla tú — puedes sugerirle usar el botón de cámara del chat, o subirla después en el formulario. NO la uses si el usuario pide agregar un producto a SU CATÁLOGO de negocio (Business Studio) — eso es otra cosa, usa navegar_a_destino(business_studio_catalogo).',
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
                descripcion: 'Título corto y atractivo para la publicación, redactado por ti (no una copia literal de lo que dijo el usuario) — máximo ~80 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción de 3-6 frases, redactada por ti EN TONO NATURAL Y HABLADO (como si el vecino la estuviera platicando, NUNCA en viñetas ni lenguaje de catálogo/publicidad) — junta TODO lo que sepas: si hay foto analizada, incluye marca/color/componentes visibles; combínalo con lo que el usuario contó en la conversación (estado, motivo de venta, para qué sirve, accesorios, etc.). Entre más detalle real tengas, más completa debe quedar — no te quedes corto si ya te dieron o detectaron varios datos. ES UNA DESCRIPCIÓN DE VENTA, NO UNA DESCRIPCIÓN DE FOTO: escribe como el dueño describiendo el artículo, nunca como quien narra una imagen — PROHIBIDO usar en cualquier parte del texto "se ve", "se ven", "se aprecia", "en la imagen/foto", "está servido/colocado en/sobre" o mencionar el fondo/plato/mesa/tabla usados solo para la foto. Nunca inventes ni agregues un dato que no viene de la foto analizada ni de lo que el usuario dijo.',
                obligatorio: false,
            },
            {
                nombre: 'categoria',
                tipo: 'string',
                descripcion: 'Nombre de la categoría del artículo tal como la dirías en español (ej. "Muebles", "Electrónica", "Ropa") — el backend la empareja contra el catálogo real de MarketPlace. Aplica IGUAL en modo="vendo" y modo="busco" — no la omitas en "busco" solo porque no hay foto, decídela por el nombre del artículo.',
                obligatorio: false,
            },
            {
                nombre: 'precio',
                tipo: 'number',
                descripcion: 'Precio en pesos mexicanos — obligatorio en la práctica si modo="vendo"',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_publicacion_servicio',
        descripcion:
            'Arma el borrador de una publicación de Servicios (Ofrezco un servicio/oficio o busco empleo, o Solicito contratar/necesito ayuda) para que el usuario la revise y publique él mismo. Requiere el modo y un título corto. ORDEN: primero necesitas saber QUÉ servicio es — si el usuario todavía no lo dijo (ej. "quiero ofrecer algo"), pregúntale SOLO eso, nada más en ese mismo mensaje. Ya sabiendo qué es, si falta algún detalle para una buena descripción (experiencia, zona donde atiende, horarios, qué incluye, etc.), pregúntale AL MENOS uno — MODO CONSULTOR, combinando lo que falte en la menor cantidad de preguntas posible; si ya te dio detalle suficiente, ejecuta directo. LÍMITE REAL (no la sobre-prometas): este flujo de Servicios NO tiene botón de cámara todavía — nunca prometas agregar una foto tú, siempre la sube el usuario en el formulario.',
        parametros: [
            {
                nombre: 'modo',
                tipo: 'string',
                descripcion: '"ofrezco" si el usuario tiene un servicio que dar o busca empleo, "solicito" si necesita contratar/le urge un servicio',
                obligatorio: true,
                enumValues: ['ofrezco', 'solicito'],
            },
            {
                nombre: 'descripcionServicio',
                tipo: 'string',
                descripcion: 'Título corto y atractivo para la publicación, redactado por ti (no una copia literal de lo que dijo el usuario) — máximo ~80 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción de 3-6 frases, redactada por ti EN TONO NATURAL Y HABLADO (como si el vecino la platicara, NUNCA en viñetas ni lenguaje de catálogo) a partir de lo que el usuario contó en la conversación (experiencia, zona, horarios, qué incluye, etc.) — entre más detalle real tengas, más completa debe quedar. Nunca inventes datos que no mencionó.',
                obligatorio: false,
            },
            {
                nombre: 'presupuesto',
                tipo: 'number',
                descripcion: 'Tarifa o presupuesto en pesos mexicanos, solo si el usuario ya lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'categoria',
                tipo: 'string',
                descripcion: 'SOLO aplica cuando modo="solicito" (Clasificados) — nunca la envíes si modo="ofrezco". Elígela de la lista cerrada según lo que el usuario necesita (ej. "necesito un plomero"/"se me descompuso el A/C" → hogar; "busco niñera"/"cuidador de mi abuela" → cuidados; "necesito fotógrafo para mi boda" → eventos; "busco estilista a domicilio" → belleza-bienestar; "busco trabajo"/"busco empleado" → empleo; si no calza claro en ninguna → otros). Es opcional para publicar — decídela tú sin preguntar, casi siempre es deducible; si de plano no calza en ninguna, usa "otros" en vez de preguntar.',
                obligatorio: false,
                enumValues: ['hogar', 'cuidados', 'eventos', 'belleza-bienestar', 'empleo', 'otros'],
            },
        ],
    },
    {
        nombre: 'buscar_informacion',
        descripcion:
            'Busca negocios, ofertas, artículos o servicios REALES ya publicados en la ciudad — el mismo buscador del Home ("Pregúntale a Peñasco"). Úsala SOLO para encontrar algo concreto que alguien publicó (ej. "hay tacos", "quién vende bicicletas", "necesito un plomero"). Los resultados se muestran automáticamente como tarjetas clicables debajo de tu respuesta — no hace falta que expliques cómo llegar a cada uno, ni que ofrezcas "llevar" al usuario a un resultado específico (no existe una función para eso): si pide abrir uno en particular, dile que toque la tarjeta. NO la uses para preguntas sobre qué es o cómo funciona AnunciaYA o alguna de sus secciones (CardYA, puntos, cupones, etc.) — esas se responden directo en texto con la información de la app.',
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
