/**
 * conocimientoAnunciaYA.ts — Lo que Coyo sabe explicar de la app
 * ==================================================================
 * Snapshot CURADO A MANO de qué es y cómo funciona cada sección de
 * AnunciaYA, para que el Asistente Coyo responda preguntas tipo "¿para qué
 * sirve CardYA?" o "¿cómo canjeo un cupón?" sin necesitar ninguna función
 * (antes esas preguntas caían en `buscar_informacion`, el buscador de
 * negocios, que las rechazaba por no ser una búsqueda real).
 *
 * ⚠️ NO SE SINCRONIZA SOLO CON LOS DOCS. Este texto es una traducción a
 * lenguaje de cliente de lo que dicen `docs/arquitectura/*.md` — cada dato
 * de aquí se verificó contra el código real al momento de escribirlo (no
 * solo contra la prosa del doc). Si cambias una regla de negocio real
 * (precio, días de trial/gracia, cómo se canjea algo, etc.), ACTUALIZA
 * ESTE ARCHIVO A MANO — Coyo va a seguir diciendo lo viejo hasta que
 * alguien lo resincronice y se haga deploy.
 *
 * Ubicación: apps/api/src/services/coyo/conocimientoAnunciaYA.ts
 */

export const CONOCIMIENTO_ANUNCIAYA = `INFORMACIÓN DE ANUNCIAYA (para responder preguntas de "qué es"/"para qué sirve"/"cómo funciona" algo de la app — esto NO son búsquedas de negocios):

QUÉ ES: app de comercio local hiperlocal. Conecta vecinos con negocios de su ciudad. NO es red social.

SECCIONES PÚBLICAS:
- Negocios: directorio de negocios locales. Cada uno muestra rating, reseñas, distancia y si está abierto ahorita. Las reseñas solo las puede escribir quien YA le compró al negocio (compra validada con CardYA) — así son de compras reales, no cualquiera puede reseñar sin haber comprado.
- MarketPlace: compra-venta entre vecinos de artículos. Modo Vendo (ofreces algo — precio, condición y fotos son obligatorios) y modo Busco (buscas comprar algo y otros vecinos lo ven — presupuesto y fotos son opcionales, no pide condición).
- Ofertas: el feed PÚBLICO donde los negocios publican sus promociones (2x1, % de descuento, producto gratis, etc.) — aquí las descubres y navegas entre todas las de tu ciudad.
- Servicios: oficios, servicios profesionales y vacantes de empleo. Modo Ofrezco (tienes un servicio que dar, o buscas empleo tú) y modo Solicito (necesitas contratar un servicio, o un negocio busca contratar personal).
- Home ("Pregúntale a tu ciudad"): preguntas a Coyo o a la comunidad cualquier cosa de tu ciudad.

PUBLICAR: en cualquiera de las 4 secciones (MarketPlace, Servicios, Ofertas solo negocios, Negocios solo dueños) es gratis para cuentas personales y no requiere membresía — MarketPlace y Servicios los publica cualquier usuario personal.

CARDYA: tu tarjeta de lealtad digital. Acumulas puntos cuando compras en negocios afiliados (el negocio te los da al escanear tu CardYA en su caja, con su herramienta ScanYA) y los canjeas por recompensas que cada negocio configura (descuentos, productos gratis, etc.). Ahí ves tus "billeteras" (una por negocio donde tienes puntos) y tu historial.

SISTEMA DE PUNTOS: los ganas comprando en negocios afiliados (el negocio te escanea tu CardYA con ScanYA) y los canjeas por recompensas propias de cada negocio, dentro de CardYA. ¿Expiran? Depende del negocio: por default NO expiran; cada negocio decide si activar expiración por inactividad (si dejas de comprarle X días, se vence TODO tu saldo con ese negocio — no es por lote ni por fecha fija, y volver a comprar reinicia el conteo). Si activa expiración, te avisa 7 días antes de que venza.

SISTEMA DE NIVELES DE CARDYA (Bronce/Plata/Oro — SÍ EXISTE, no lo niegues): cada negocio puede activarlo (es opcional, algunos no lo usan). Tu nivel con ESE negocio sube según cuántos puntos le has ganado EN TOTAL de por vida (histórico, nunca en base al saldo que tengas disponible ahora) — rangos default: Bronce 0-999 pts, Plata 1,000-4,999 pts, Oro 5,000+ pts (el negocio puede ajustar estos rangos). Cada nivel da un multiplicador sobre los puntos que ganas en cada compra (default: Bronce x1, Plata x1.2, Oro x1.5 — entre más alto tu nivel, más puntos ganas por cada compra). El nivel SOLO sube, nunca baja por canjear una recompensa (se basa en lo acumulado histórico, no en tu saldo actual) — el negocio configura esto en Business Studio → Puntos y Recompensas.

MIS CUPONES (distinto de Ofertas Y de Mis Guardados — no confundir con ninguna de las dos): un cupón NO es algo que tú guardes o marques como favorito — es una promoción PRIVADA que el propio negocio crea y te ASIGNA directamente a ti (por ejemplo como cliente VIP, o en tu cumpleaños), con notificación + mensaje por ChatYA. Un cupón nunca aparece en el feed público de Ofertas (a diferencia de una oferta normal, que sí es pública para todos). Cada cupón trae un código personal único que revelas y enseñas en el negocio para canjearlo. Resumen de las 3 cosas para no confundir: OFERTAS = escaparate público de promociones (todas las ves). MIS GUARDADOS = tu lista de ofertas públicas que marcaste como favoritas con el 🔖 para no perderlas de vista. MIS CUPONES = promociones privadas que un negocio te asignó directo a ti, con código de canje — nunca las "guardas" tú, te las mandan.

MIS PUBLICACIONES: tus propias publicaciones activas en MarketPlace y Servicios (lo que estás vendiendo/buscando u ofreciendo/solicitando) — OJO: distinto del módulo "Publicaciones" de Business Studio (posts/anuncios del negocio); si el usuario venía hablando de Business Studio, probablemente se refiere a ese módulo, no a esto.

MIS GUARDADOS: negocios, ofertas, artículos o servicios que marcaste como favoritos.

CHATYA: chat integrado para hablar directo con un negocio o con otro vecino sobre una publicación. Puedes fijar, silenciar, archivar o bloquear una conversación desde el menú (⋮) de esa conversación.

SCANYA: la herramienta que usa EL NEGOCIO (empleados/gerentes/dueño — no el cliente) al atender tu compra: registra la venta, te da puntos de CardYA (solo si ese negocio participa en puntos — es opcional por negocio), valida cupones y vouchers que hayas canjeado, y sella tarjetas de sellos si el negocio las usa (compras N y la siguiente sale gratis, tipo tarjetita de sellos). Tú nunca abres ScanYA como cliente — solo presentas tu CardYA o tu código/voucher para que el negocio lo escanee.

MI PERFIL: datos personales (nombre, foto/avatar, teléfono, ciudad), Seguridad (contraseña, verificación en dos pasos) y, si tienes negocio, Membresía y Pagos.

PARA NEGOCIOS: se dan de alta en "Anúnciate" y pagan una membresía de $864 MXN/mes (14 días de prueba gratis) para publicar en Negocios/Ofertas, dar puntos por ScanYA, publicar vacantes, y usar Business Studio (panel para gestionar catálogo, promociones, empleados y reportes). El trial pide tarjeta al registrarte (checkout de Stripe) pero NO te cobra nada hasta que termine — si cancelas antes, no pagas. Si un cobro falla (tarjeta rechazada, etc.), hay 14 días de gracia para regularizarlo antes de que se suspenda la cuenta.

BUSINESS STUDIO: el panel donde el dueño (o su empleado con permiso) gestiona su negocio. 14 módulos: Dashboard (resumen general), Transacciones (ventas registradas por ScanYA), Clientes (quién le compra y cuánto), Opiniones (reseñas recibidas), Alertas (avisos de seguridad, ej. montos inusuales), Publicaciones (posts/anuncios propios del negocio — OJO: distinto de "Mis Publicaciones", que es la sección personal del cliente con sus artículos de MarketPlace/Servicios; si el contexto reciente es de Business Studio, "Publicaciones" casi siempre es este módulo), Catálogo (productos/servicios que vende), Promociones (ofertas y cupones), Puntos y Recompensas (configura el sistema de puntos de CardYA), Empleados (altas y permisos), Vacantes (publica empleos, aparecen en Servicios), Reportes, Sucursales (si tiene más de una), y Mi Perfil Comercial (datos del negocio).

CENTRO DE AYUDA: tutoriales en video de cómo usar cada parte de la app.

DUDAS FRECUENTES (usa esta redacción CASI TAL CUAL cuando la pregunta calce con alguna — solo suaviza el tono si hace falta, NO la reescribas libremente parafraseando: reescribir de más ya generó errores de español reales, ej. "no te preocupará nada" en vez de "no te cobra nada"):
- ¿Cuesta usar AnunciaYA como cliente? No, la cuenta personal es gratis siempre (MarketPlace, Servicios, Ofertas, CardYA, cupones, ChatYA).
- ¿Cuánto cuesta tener un negocio? $864 MXN/mes, con 14 días de prueba gratis. Si cancelas antes de que termine el trial, no pagas nada.
- ¿Necesito tarjeta para el trial de negocio? Sí, la pide al registrarte, pero no te cobra hasta que termine el periodo de prueba.
- ¿Qué pasa si me falla un cobro de la membresía? Tienes 14 días de gracia para arreglarlo antes de que se suspenda la cuenta.
- ¿Dónde cambio mi contraseña o activo la verificación en dos pasos? En Mi Perfil, pestaña Seguridad.
- ¿Dónde veo mis puntos y recompensas? En CardYA.
- ¿Cómo canjeo un cupón de Mis Cupones? Entra a Mis Cupones, abre el cupón que quieres usar y toca "revelar código" — te muestra un código personal que enseñas en el negocio para que te lo validen. El código NO se muestra automático, hay que revelarlo dentro del cupón.
- ¿Cómo canjeo mis puntos de CardYA? Entra a CardYA, elige la recompensa del negocio donde tienes puntos y canjéala — se genera un voucher con código QR que muestras en el negocio para reclamarlo.
- ¿Cómo publico algo en MarketPlace o Servicios? Con el botón "+ Publicar" de esa sección (o pídemelo a mí y te dejo un borrador con el título listo), llenas categoría, precio/presupuesto, agregas fotos (obligatorias si vendes) y publicas.
- ¿Cómo agrego un producto a mi catálogo de negocio? Eso es distinto a MarketPlace — es en Business Studio → Catálogo. Ahí sí te puedo llevar directo, pero todavía no puedo armarte el borrador del producto como sí hago con MarketPlace; lo llenas tú ahí mismo.`;
