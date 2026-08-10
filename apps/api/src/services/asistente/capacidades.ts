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
        descripcion: 'Catálogo del negocio (productos/servicios que vende). NO uses este destino si el comerciante pide AYUDA para crear/agregar un producto — para eso usa la capacidad crear_producto_catalogo, que arma el borrador por conversación. Usa este destino solo si quiere ver/gestionar el catálogo en general, sin pedir ayuda a crear algo puntual.',
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
            'Arma el borrador de una publicación de MarketPlace PERSONAL (vender o buscar un artículo entre vecinos) para que el usuario la revise y publique él mismo. El formulario EXIGE título, descripción, categoría y (si modo="vendo") precio para poder publicar — LA CATEGORÍA ES OBLIGATORIA EN AMBOS MODOS ("vendo" Y "busco"), no la olvides cuando modo="busco" solo porque no hay foto que analizar (en "busco" nunca hay foto, el artículo aún no lo tiene el usuario — la categoría de todos modos se deduce del NOMBRE del artículo). ORDEN DE LAS PREGUNTAS (importante): primero necesitas saber QUÉ es el artículo — si el usuario todavía no lo dijo (ej. "quiero vender algo" / "busco algo"), pregúntale SOLO eso primero; nunca preguntes categoría ni nada más en ese mismo mensaje, sería prematuro. UNA VEZ que sepas qué es el artículo, la categoría CASI SIEMPRE es deducible por ti mismo sin preguntar, sea que lo vendan o lo busquen (ej. "mi iPhone 12" / "busco un iPhone" → Electrónica, "mi sofá" / "ando buscando un sofá" → Muebles, "mis tenis" / "busco tenis del 8" → Ropa) — complétala tú en silencio; pregúntala solo en el caso raro de que el artículo sea genuinamente ambiguo (ej. "un aparato", "una cosa"). Precio (si modo="vendo") sí pregúntalo siempre que falte. Además, si el usuario solo dio el nombre del artículo sin ninguna característica (estado, marca, motivo de venta, etc.), pregúntale AL MENOS un dato útil para escribir una buena descripción — MODO CONSULTOR, una pregunta a la vez, combinando lo que falte en la menor cantidad de preguntas posible. Con todo eso, redacta tú un título corto y atractivo (mejóralo, no repitas literal las palabras del usuario) y una descripción breve y natural — nunca inventes características que el usuario no mencionó. FOTOS: si el usuario adjuntó una foto con el botón de cámara del chat, verás en la conversación que ya se analizó automáticamente (título/descripción/categoría/condición detectados) — esa foto SÍ queda incluida en el borrador, no necesitas mencionarlo ni pedirla de nuevo. Si NO adjuntó ninguna, no prometas poder agregarla tú — puedes sugerirle usar el botón de cámara del chat, o subirla después en el formulario. NO la uses si el usuario pide agregar un producto a SU CATÁLOGO de negocio (Business Studio) — eso es otra cosa, usa crear_producto_catalogo.',
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
        nombre: 'crear_producto_catalogo',
        descripcion:
            'SOLO EN MODO COMERCIAL (Business Studio) — arma el borrador de un producto/servicio para el CATÁLOGO PROPIO del negocio (lo que el negocio vende a sus clientes — nada que ver con MarketPlace/Servicios, que son P2P entre vecinos en modo Personal). Úsala cuando el comerciante pida ayuda para agregar/crear un producto o servicio a SU catálogo. El formulario exige nombre, tipo (producto o servicio) y precio — trátalos como obligatorios en la práctica, pregúntalos si faltan (ORDEN: primero qué es, sin preguntar nada más en ese mismo mensaje). La categoría es texto libre y OPCIONAL — si no es obvia, no preguntes, se deja "General" por default. Descripción también opcional pero recomendable: si el comerciante da algún detalle (qué incluye, ingredientes, duración, etc.) redáctala tú en tono natural (2-4 frases, nunca viñetas); si no da nada, dilo sin descripción, no inventes. LÍMITE REAL: NUNCA puedes agregar fotos — el comerciante las sube después en el formulario. NO se necesita foto para crear el producto (a diferencia de MarketPlace, aquí no es obligatoria).',
        parametros: [
            {
                nombre: 'tipo',
                tipo: 'string',
                descripcion: '"producto" si es un artículo/mercancía física, "servicio" si es un servicio que presta el negocio',
                obligatorio: true,
                enumValues: ['producto', 'servicio'],
            },
            {
                nombre: 'nombre',
                tipo: 'string',
                descripcion: 'Nombre corto y claro del producto/servicio, redactado por ti (no una copia literal de lo que dijo el comerciante) — 2 a 150 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'precioBase',
                tipo: 'number',
                descripcion: 'Precio en pesos mexicanos — obligatorio en la práctica, el formulario no deja guardar sin él',
                obligatorio: false,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción de 2-4 frases en tono natural y hablado (NUNCA viñetas ni lenguaje de catálogo publicitario) — SIEMPRE redáctala, incluso si el comerciante no dio detalle extra: arma el texto con lo que ya sabes (nombre, tipo, precio). Si SÍ dio más contexto (ingredientes, características, para qué sirve), inclúyelo. Nunca inventes datos que no vengan de ahí.',
                obligatorio: false,
            },
            {
                nombre: 'categoria',
                tipo: 'string',
                descripcion: 'Categoría en texto libre (ej. "Bebidas", "Cortes de cabello", "Postres") — solo si el comerciante la mencionó o es obviamente deducible del nombre; si no, omítela (el backend usa "General" por default) — nunca la preguntes, no es obligatoria.',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_publicacion_negocio',
        descripcion:
            'SOLO EN MODO COMERCIAL — arma el borrador de un POST/ANUNCIO del negocio para su feed de Publicaciones (contenido libre tipo Facebook/Instagram: novedades, promos anunciadas en texto, avisos — NO confundir con MarketPlace/Servicios ni con el Catálogo de productos). Úsala cuando el comerciante pida ayuda para publicar algo en su feed. Solo requiere el texto de la publicación — pregúntale de qué quiere hablar si no lo dijo. El precio es opcional (solo si menciona uno, ej. "una promo de $150"). Redacta TÚ el texto final en tono natural, cálido y hablado, como el negocio comunicándose con sus clientes — combina lo que te haya contado, sin inventar. LÍMITE REAL: NUNCA puedes agregar fotos — el comerciante las sube después en el formulario; no son obligatorias.',
        parametros: [
            {
                nombre: 'texto',
                tipo: 'string',
                descripcion: 'Texto final de la publicación (1-2000 caracteres), redactado por ti en tono natural a partir de lo que el comerciante contó — nunca inventes datos que no mencionó.',
                obligatorio: true,
            },
            {
                nombre: 'precio',
                tipo: 'number',
                descripcion: 'Precio en pesos mexicanos, solo si el comerciante lo mencionó explícitamente',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_vacante',
        descripcion:
            'SOLO EN MODO COMERCIAL — arma el borrador de una VACANTE de empleo que el negocio publica (aparece en la sección pública Servicios). Úsala cuando el comerciante pida ayuda para publicar una vacante/buscar personal. Requiere puesto, tipo de empleo y modalidad — pregúntalos si faltan (ORDEN: primero qué puesto es, sin preguntar nada más en ese mismo mensaje; luego, si hace falta, combina tipo de empleo + modalidad en la menor cantidad de preguntas posible). El salario es OPCIONAL — si no lo da, queda como "A convenir", no lo preguntes de más si el comerciante no lo menciona espontáneo. Redacta tú una descripción breve del puesto (2-4 frases, tono natural) a partir de lo que te cuente — nunca inventes requisitos ni funciones que no mencionó. LÍMITE REAL: deja listo lo esencial; requisitos, beneficios, horario y días de la semana los agrega el comerciante él mismo en el formulario (no se los preguntes).',
        parametros: [
            {
                nombre: 'titulo',
                tipo: 'string',
                descripcion: 'Nombre del puesto, redactado por ti (no copia literal) — 10 a 80 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción del puesto en 2-4 frases, tono natural y hablado — redactada por ti a partir de lo que el comerciante contó (funciones, para qué se necesita, etc.). Mínimo ~30 caracteres. Nunca inventes.',
                obligatorio: true,
            },
            {
                nombre: 'tipoEmpleo',
                tipo: 'string',
                descripcion: 'Tipo de contratación',
                obligatorio: true,
                enumValues: ['tiempo-completo', 'medio-tiempo', 'por-proyecto', 'eventual'],
            },
            {
                nombre: 'modalidad',
                tipo: 'string',
                descripcion: 'Dónde se desempeña el puesto',
                obligatorio: true,
                enumValues: ['presencial', 'remoto', 'hibrido'],
            },
            {
                nombre: 'salario',
                tipo: 'number',
                descripcion: 'Salario mensual en pesos mexicanos, solo si el comerciante lo mencionó — si no, se deja "A convenir"',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_recompensa_cardya',
        descripcion:
            'SOLO EN MODO COMERCIAL — arma el borrador de una RECOMPENSA canjeable por puntos de CardYA (lo que sus clientes pueden canjear cuando junten puntos — ej. "café gratis", "10% de descuento" — NO confundir con Ofertas/Cupones, que son promociones, ni con el Catálogo). Úsala cuando el comerciante pida ayuda para agregar una recompensa. Requiere nombre y cuántos puntos cuesta — pregúntalos si faltan (ORDEN: primero qué recompensa es, sin preguntar nada más en ese mismo mensaje). La descripción es opcional: si el comerciante da detalle (qué incluye, restricciones) redáctala tú en tono natural; si no, déjala vacía, no inventes. LÍMITE REAL: NUNCA puedes agregar imagen — el comerciante la sube después en el formulario, no es obligatoria.',
        parametros: [
            {
                nombre: 'nombre',
                tipo: 'string',
                descripcion: 'Nombre corto y claro de la recompensa, redactado por ti (no copia literal) — máximo 200 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'puntosRequeridos',
                tipo: 'number',
                descripcion: 'Cuántos puntos de CardYA cuesta canjearla — entero positivo, obligatorio en la práctica',
                obligatorio: false,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción breve (1-3 frases, tono natural) — SIEMPRE redáctala, incluso si el comerciante no dio detalle extra: arma el texto con lo que ya sabes (nombre de la recompensa, puntos que cuesta). Si SÍ dio más contexto (qué incluye, restricciones), inclúyelo. Nunca inventes datos que no vengan de ahí.',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'editar_config_puntos_cardya',
        descripcion:
            'SOLO EN MODO COMERCIAL — precarga la CONFIGURACIÓN BASE del sistema de puntos de CardYA (tasa de puntos por compra, días de expiración) en el formulario, que ya está siempre visible en la pantalla — no hay borrador ni modal, el comerciante revisa lo que dejaste y da "Guardar" él mismo con el botón que ya usa siempre. Úsala cuando el comerciante pida cambiar cuántos puntos da por compra, o cada cuánto expiran los puntos/vouchers. Todo es opcional — solo llena lo que el comerciante mencionó explícitamente, deja el resto sin tocar. Si menciona la tasa (ej. "cada $10 = 1 punto", "que $1 = 2 puntos"), manda AMBOS pesosPor y puntosGanados juntos (nunca uno solo). LÍMITE REAL: NUNCA toques el Sistema de Niveles (Bronce/Plata/Oro, sus rangos o multiplicadores) — esa configuración tiene validaciones cruzadas delicadas, dile al comerciante que la ajuste él mismo en esta misma pantalla, más abajo.',
        parametros: [
            {
                nombre: 'pesosPor',
                tipo: 'number',
                descripcion: 'Cuántos pesos MXN forman la unidad de compra para la tasa (ej. en "cada $10 = 1 punto", pesosPor=10). Manda siempre junto con puntosGanados.',
                obligatorio: false,
            },
            {
                nombre: 'puntosGanados',
                tipo: 'number',
                descripcion: 'Cuántos puntos se ganan por esa unidad de pesosPor (ej. en "cada $10 = 1 punto", puntosGanados=1). Manda siempre junto con pesosPor.',
                obligatorio: false,
            },
            {
                nombre: 'diasExpiracionPuntos',
                tipo: 'number',
                descripcion: 'Días de inactividad del cliente antes de que expire TODO su saldo de puntos con este negocio. Solo si el comerciante lo mencionó.',
                obligatorio: false,
            },
            {
                nombre: 'puntosNuncaExpiran',
                tipo: 'boolean',
                descripcion: 'true si el comerciante pidió explícitamente que los puntos nunca expiren (desactiva diasExpiracionPuntos)',
                obligatorio: false,
            },
            {
                nombre: 'diasExpiracionVoucher',
                tipo: 'number',
                descripcion: 'Días que el cliente tiene para recoger un voucher ya canjeado antes de que expire. Solo si el comerciante lo mencionó.',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_sucursal',
        descripcion:
            'SOLO EN MODO COMERCIAL — precarga el formulario de una NUEVA SUCURSAL en Business Studio (una ubicación más del mismo negocio, que clona horarios/catálogo/ofertas de la Matriz automáticamente). Úsala cuando el comerciante pida ayuda para agregar una sucursal/ubicación nueva. Requiere nombre y ciudad — pregúntalos si faltan (ORDEN: primero cómo se llama la sucursal, sin preguntar nada más en ese mismo mensaje; luego, si hace falta, la ciudad). El estado y las coordenadas del mapa se resuelven automáticamente a partir de la ciudad — nunca los preguntes ni los inventes. Dirección y teléfono son opcionales, solo si el comerciante los menciona. LÍMITE REAL: la ubicación exacta en el mapa se aproxima al centro de la ciudad — SIEMPRE dile al comerciante que ajuste el marcador arrastrándolo a la dirección exacta antes de guardar, porque tú no puedes hacer eso por él.',
        parametros: [
            {
                nombre: 'nombre',
                tipo: 'string',
                descripcion: 'Nombre de la sucursal (ej. "Sucursal Centro", "Sucursal Norte") — 3 a 100 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'ciudad',
                tipo: 'string',
                descripcion: 'Ciudad donde está la sucursal, tal como la dijo el comerciante — el backend la resuelve contra el catálogo real de ciudades de la app (no inventes el estado ni coordenadas)',
                obligatorio: true,
            },
            {
                nombre: 'direccion',
                tipo: 'string',
                descripcion: 'Calle y número, solo si el comerciante la mencionó',
                obligatorio: false,
            },
            {
                nombre: 'telefono',
                tipo: 'string',
                descripcion: 'Teléfono de contacto de la sucursal, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_empleado',
        descripcion:
            'SOLO EN MODO COMERCIAL — precarga el formulario de un NUEVO EMPLEADO en Business Studio (quien opera ScanYA en la sucursal — cajeros, meseros, etc.). Úsala cuando el comerciante pida ayuda para dar de alta un empleado. Requiere nombre y nick — pregunta el nombre primero, sin preguntar nada más en ese mismo mensaje. Si el comerciante no da un nick explícito, TÚ generas uno a partir del nombre (solo minúsculas, sin acentos ni espacios, letras/números/guión bajo — ej. "Juan Pérez" → "juanperez") en vez de preguntarlo, salvo que el nombre no alcance para armar algo razonable. Especialidad y teléfono son opcionales. Los 5 permisos (registrar ventas, procesar canjes, ver historial, responder chat, responder reseñas) son todos true por default en el sistema — solo manda alguno en false si el comerciante pidió explícitamente restringir a ese empleado, nunca los preguntes de más. LÍMITE REAL DE SEGURIDAD: NUNCA generes ni preguntes el PIN de acceso — ese campo se queda en blanco a propósito, el comerciante lo captura él mismo a mano en el formulario por ser información sensible de acceso a caja.',
        parametros: [
            {
                nombre: 'nombre',
                tipo: 'string',
                descripcion: 'Nombre completo del empleado — 2 a 200 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'nick',
                tipo: 'string',
                descripcion: 'Nick único para entrar a ScanYA — solo minúsculas, sin acentos ni espacios, letras/números/guión bajo. Si el comerciante no dio uno, TÚ lo generas a partir del nombre.',
                obligatorio: true,
            },
            {
                nombre: 'especialidad',
                tipo: 'string',
                descripcion: 'Puesto o rol del empleado (ej. "Cajero", "Mesero"), solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'telefono',
                tipo: 'string',
                descripcion: 'Teléfono de contacto del empleado, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'puedeRegistrarVentas',
                tipo: 'boolean',
                descripcion: 'false SOLO si el comerciante pidió explícitamente que este empleado no pueda registrar ventas',
                obligatorio: false,
            },
            {
                nombre: 'puedeProcesarCanjes',
                tipo: 'boolean',
                descripcion: 'false SOLO si el comerciante pidió explícitamente que este empleado no pueda procesar canjes de puntos/recompensas',
                obligatorio: false,
            },
            {
                nombre: 'puedeVerHistorial',
                tipo: 'boolean',
                descripcion: 'false SOLO si el comerciante pidió explícitamente que este empleado no pueda ver el historial de transacciones',
                obligatorio: false,
            },
            {
                nombre: 'puedeResponderChat',
                tipo: 'boolean',
                descripcion: 'false SOLO si el comerciante pidió explícitamente que este empleado no pueda responder ChatYA',
                obligatorio: false,
            },
            {
                nombre: 'puedeResponderResenas',
                tipo: 'boolean',
                descripcion: 'false SOLO si el comerciante pidió explícitamente que este empleado no pueda responder reseñas',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'editar_perfil_comercial',
        descripcion:
            'SOLO EN MODO COMERCIAL — precarga campos de MI PERFIL COMERCIAL (la ficha pública del negocio/sucursal: descripción, contacto, ubicación, formas de pago y entrega) en el formulario, que ya está siempre visible en la pantalla — no hay borrador ni modal, el comerciante revisa lo que dejaste y da "Guardar" él mismo con el botón que ya usa siempre (el mismo botón guarda cualquier tab que hayas tocado, sin importar cuál esté abierto). Úsala cuando el comerciante pida cambiar la descripción de su negocio, su teléfono/whatsapp/correo/sitio web, su dirección/ciudad, o sus métodos de pago/si tiene envío o servicio a domicilio. Todo es opcional — solo llena lo que el comerciante mencionó explícitamente, deja el resto sin tocar. Si menciona una ciudad, mándala tal cual la dijo (el backend la resuelve contra el catálogo real, no inventes estado ni coordenadas). LÍMITE REAL: NUNCA toques el NOMBRE del negocio ni su CATEGORÍA/SUBCATEGORÍAS (cambios sensibles que el comerciante debe revisar con calma en la pantalla), NUNCA los HORARIOS (validación día por día delicada — dile que los ajuste él mismo en la pestaña de Horarios), y NUNCA imágenes/logo/portada/galería (no puedes subir fotos) — para cualquiera de esos casos, dile que lo haga él mismo en la pestaña correspondiente de Mi Perfil.',
        parametros: [
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción del negocio, redactada por ti en tono natural a partir de lo que el comerciante contó — solo si pidió cambiarla, nunca inventes',
                obligatorio: false,
            },
            {
                nombre: 'telefono',
                tipo: 'string',
                descripcion: 'Teléfono de contacto, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'whatsapp',
                tipo: 'string',
                descripcion: 'WhatsApp de contacto, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'correo',
                tipo: 'string',
                descripcion: 'Correo de contacto, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'sitioWeb',
                tipo: 'string',
                descripcion: 'Sitio web del negocio, solo si el comerciante lo mencionó',
                obligatorio: false,
            },
            {
                nombre: 'direccion',
                tipo: 'string',
                descripcion: 'Calle y número, solo si el comerciante la mencionó',
                obligatorio: false,
            },
            {
                nombre: 'ciudad',
                tipo: 'string',
                descripcion: 'Ciudad, tal como la dijo el comerciante — el backend la resuelve contra el catálogo real (no inventes el estado)',
                obligatorio: false,
            },
            {
                nombre: 'metodoPagoEfectivo',
                tipo: 'boolean',
                descripcion: 'true/false SOLO si el comerciante mencionó explícitamente si acepta o no efectivo',
                obligatorio: false,
            },
            {
                nombre: 'metodoPagoTarjeta',
                tipo: 'boolean',
                descripcion: 'true/false SOLO si el comerciante mencionó explícitamente si acepta o no tarjeta',
                obligatorio: false,
            },
            {
                nombre: 'metodoPagoTransferencia',
                tipo: 'boolean',
                descripcion: 'true/false SOLO si el comerciante mencionó explícitamente si acepta o no transferencia',
                obligatorio: false,
            },
            {
                nombre: 'tieneEnvio',
                tipo: 'boolean',
                descripcion: 'true/false SOLO si el comerciante mencionó explícitamente si ofrece envío a domicilio',
                obligatorio: false,
            },
            {
                nombre: 'tieneServicio',
                tipo: 'boolean',
                descripcion: 'true/false SOLO si el comerciante mencionó explícitamente si ofrece servicio a domicilio',
                obligatorio: false,
            },
        ],
    },
    {
        nombre: 'crear_oferta',
        descripcion:
            'SOLO EN MODO COMERCIAL — arma el borrador de una OFERTA PÚBLICA (promoción que aparece en el feed público de "Promociones" — descuento por porcentaje, monto fijo, 2x1, 3x2, envío gratis, u otra cosa). Úsala cuando el comerciante pida ayuda para crear una oferta/promoción/descuento. Requiere: título (qué se promociona), tipo de descuento, y fechas de inicio y fin — pregúntalos si faltan (ORDEN: primero qué se promociona, sin preguntar nada más en ese mismo mensaje; luego el tipo; luego las fechas — combina lo que puedas en la menor cantidad de preguntas). SIEMPRE redacta también una descripción corta (ver parámetro `descripcion`) — no la dejes vacía solo porque el comerciante no dio detalle extra, arma un texto natural con lo que ya tienes (qué se promociona + tipo + valor + vigencia). Para calcular fechaInicio/fechaFin usa SIEMPRE la fecha de HOY del "Contexto" (ver regla de FECHAS RELATIVAS) — nunca inventes una fecha si no la puedes calcular con certeza, mejor pregunta. Si el tipo es "porcentaje" o "monto_fijo", el valor numérico es obligatorio en la práctica — pregúntalo si falta. Si es "2x1", "3x2" o "envio_gratis", NO preguntes valor (no aplica). Si es "otro", pregunta en qué consiste. LÍMITE REAL: esta función SOLO crea ofertas PÚBLICAS (visibles para todos en el feed) — NUNCA puede crear un CUPÓN PRIVADO asignado a clientes específicos (eso requiere elegir personas reales una por una); si el comerciante pide un cupón privado/exclusivo para ciertos clientes, dile que lo arme él mismo en Promociones → toggle "Cupones". Tampoco puedes agregar una imagen — el comerciante la sube después en el formulario.',
        parametros: [
            {
                nombre: 'titulo',
                tipo: 'string',
                descripcion: 'Qué se promociona, redactado por ti de forma corta y clara (ej. "Tacos de asada 2x1") — mínimo 3 caracteres',
                obligatorio: true,
            },
            {
                nombre: 'tipoOferta',
                tipo: 'string',
                descripcion: 'Tipo de descuento/promoción',
                obligatorio: true,
                enumValues: ['porcentaje', 'monto_fijo', '2x1', '3x2', 'envio_gratis', 'otro'],
            },
            {
                nombre: 'valor',
                tipo: 'string',
                descripcion: 'Para "porcentaje" o "monto_fijo": el número tal cual, sin signos (ej. "20" o "50") — obligatorio en la práctica para esos dos tipos. Para "otro": el concepto en texto. NO mandes este parámetro si tipoOferta es "2x1", "3x2" o "envio_gratis".',
                obligatorio: false,
            },
            {
                nombre: 'fechaInicio',
                tipo: 'string',
                descripcion: 'Fecha de inicio en formato YYYY-MM-DD, calculada por ti a partir de la fecha de HOY del Contexto y lo que dijo el comerciante (ej. "hoy", "mañana", "el 15")',
                obligatorio: true,
            },
            {
                nombre: 'fechaFin',
                tipo: 'string',
                descripcion: 'Fecha de fin en formato YYYY-MM-DD, calculada igual que fechaInicio (ej. "fin de mes", "en una semana", "el 30")',
                obligatorio: true,
            },
            {
                nombre: 'descripcion',
                tipo: 'string',
                descripcion: 'Descripción corta (1-2 frases, tono natural y cálido, como el negocio hablándole a sus clientes) — SIEMPRE redáctala, incluso si el comerciante no dio detalle extra: arma el texto con lo que ya sabes (qué se promociona, tipo de descuento/valor, vigencia). Si el comerciante SÍ dio más contexto (ingredientes, motivo, restricciones), inclúyelo. Nunca inventes datos que no vengan de ahí.',
                obligatorio: false,
            },
            {
                nombre: 'compraMinima',
                tipo: 'number',
                descripcion: 'Compra mínima en pesos para que aplique la promoción, solo si el comerciante lo mencionó',
                obligatorio: false,
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
