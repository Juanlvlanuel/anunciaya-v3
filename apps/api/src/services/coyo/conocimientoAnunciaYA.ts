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

MIS CUPONES (distinto de Ofertas — no confundir): tu colección PERSONAL de los cupones que ya guardaste desde Ofertas. Ofertas es el escaparate público donde descubres promociones; Mis Cupones es tu bolsa privada con las que ya guardaste, cada una con su código para canjear en el negocio.

MIS PUBLICACIONES: tus propias publicaciones activas en MarketPlace y Servicios (lo que estás vendiendo/buscando u ofreciendo/solicitando).

MIS GUARDADOS: negocios, ofertas, artículos o servicios que marcaste como favoritos.

CHATYA: chat integrado para hablar directo con un negocio o con otro vecino sobre una publicación. Puedes fijar, silenciar, archivar o bloquear una conversación desde el menú (⋮) de esa conversación.

SCANYA: la herramienta que usa EL NEGOCIO (empleados/gerentes/dueño — no el cliente) al atender tu compra: registra la venta, te da puntos de CardYA (solo si ese negocio participa en puntos — es opcional por negocio), valida cupones y vouchers que hayas canjeado, y sella tarjetas de sellos si el negocio las usa (compras N y la siguiente sale gratis, tipo tarjetita de sellos). Tú nunca abres ScanYA como cliente — solo presentas tu CardYA o tu código/voucher para que el negocio lo escanee.

MI PERFIL: datos personales (nombre, foto/avatar, teléfono, ciudad), Seguridad (contraseña, verificación en dos pasos) y, si tienes negocio, Membresía y Pagos.

PARA NEGOCIOS: se dan de alta en "Anúnciate" y pagan una membresía de $864 MXN/mes (14 días de prueba gratis) para publicar en Negocios/Ofertas, dar puntos por ScanYA, publicar vacantes, y usar Business Studio (panel para gestionar catálogo, promociones, empleados y reportes). El trial pide tarjeta al registrarte (checkout de Stripe) pero NO te cobra nada hasta que termine — si cancelas antes, no pagas. Si un cobro falla (tarjeta rechazada, etc.), hay 14 días de gracia para regularizarlo antes de que se suspenda la cuenta.

BUSINESS STUDIO: el panel donde el dueño (o su empleado con permiso) gestiona su negocio. 14 módulos: Dashboard (resumen general), Transacciones (ventas registradas por ScanYA), Clientes (quién le compra y cuánto), Opiniones (reseñas recibidas), Alertas (avisos de seguridad, ej. montos inusuales), Publicaciones (posts/anuncios propios del negocio), Catálogo (productos/servicios que vende), Promociones (ofertas y cupones), Puntos y Recompensas (configura el sistema de puntos de CardYA), Empleados (altas y permisos), Vacantes (publica empleos, aparecen en Servicios), Reportes, Sucursales (si tiene más de una), y Mi Perfil Comercial (datos del negocio).

CENTRO DE AYUDA: tutoriales en video de cómo usar cada parte de la app.

DUDAS FRECUENTES:
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
