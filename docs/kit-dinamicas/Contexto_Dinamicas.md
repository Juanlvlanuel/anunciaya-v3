# Contexto para brainstorm — Módulo "Dinámicas" (rifas/concursos)

> Este documento es para pegar en un chat nuevo de Claude y seguir explorando ideas. Resume lo ya decidido, incluyendo una sesión de continuación donde se cerraron varias decisiones pendientes, para que el chat nuevo parta de aquí en vez de reinventar lo ya platicado.

## Qué es AnunciaYA (para dar contexto al chat nuevo)

App de comercio local hiperlocal para Puerto Peñasco, Sonora (beta). El usuario la abre cuando piensa "necesito comprar/contratar/encontrar algo cerca de mí". NO es una red social — no compite con Facebook/TikTok en feed social ni contenido viral. 4 secciones públicas: Negocios, MarketPlace, Ofertas, Servicios. Modelo de negocio: negocios pagan suscripción comercial; usuarios usan la app gratis.

## Qué es "Dinámicas"

Un módulo nuevo para que **cualquier usuario** organice rifas/concursos dentro de la app. Antes se llamó "Rifas P2P" y se descartó en 2026 por riesgo legal (en México, SEGOB regula la actividad de rifar/sortear). Se retoma ahora bajo un modelo distinto: **el pago de boletos y la entrega del premio ocurren 100% fuera de la plataforma** — AnunciaYA solo organiza el registro de participantes y determina/anuncia al ganador, nunca cobra ni entrega nada. Esto reduce el riesgo legal pero no lo elimina del todo (SEGOB regula la actividad en sí, no solo el flujo de dinero) — antes de lanzar la parte de puro azar con boletos pagados conviene confirmar con un abogado.

Se llama "Dinámicas" (no "Rifas" ni "Sorteos") a propósito: esas palabras están en una lista negra que ya bloquea publicaciones en MarketPlace, y el nombre neutro evita el problema de la propia app "delatándose" en su UI. Legalmente lo que importa es la sustancia (¿hay pago? ¿depende de azar?), no el nombre — pero el nombre sí importa para el producto y la percepción. **Nombre confirmado como definitivo: "Dinámicas".**

## Decisiones de producto ya tomadas

- **Quién organiza**: cualquier usuario en modo personal (incluye comerciantes organizando desde su cuenta personal, no desde su negocio). No es una herramienta de "Business Studio" — es P2P, abierto a todos.
- **Dónde vive**: como **sub-sección dentro de MarketPlace**, no como una 5ª sección pública nueva ni como módulo aparte. Un switch/flecha cambia todo el modo de la página (header, feed y el formulario de publicar cambian de contexto) para que se sienta "una forma más de vender/promover algo dentro de MarketPlace", no algo desconectado.
- **Confianza mínima para organizar**: usuario con correo verificado (ya lo tienen todos los usuarios de AY desde el registro), obligado a subir evidencia (foto/video) del premio al crear la Dinámica. **Decisión: se acepta cualquier foto libre**, sin restricciones especiales sobre cómo debe verse ni requisitos distintos según el tipo de premio (físico o efectivo). La responsabilidad de que el premio sea real y se entregue es del organizador, no de AnunciaYA.
- **Transparencia**: lista pública de participantes/boletos visible ANTES del cierre de inscripción, para que cualquiera note si algo cambia sospechosamente. **Se descartó el botón de denuncia/reporte** por implicar carga operativa de moderación que no tienen forma de sostener sin equipo.
- **Boletos ponderados**: si el organizador vende boletos por fuera, reporta cuántos tiene cada participante — más boletos = más probabilidad proporcional (en los métodos de azar).

## Métodos para determinar al ganador — alcance limitado a 3

De los 7 métodos originalmente considerados, **se decidió limitar el alcance a solo 3** (se descartan por ahora mérito/competencia, lotería pública externa, live del organizador, y juego de revelar):

1. **Tómbola clásica animada** — bolitas numeradas girando, animación de sorteo.
2. **Lotería mexicana — carta única**: cada participante recibe una carta única de la baraja tradicional (El Gallo, La Dama, etc.) en vez de un número de boleto. Se van "cantando" cartas al azar hasta que sale la de algún inscrito.
3. **Lotería mexicana — tabla completa**: cada participante recibe una tabla de 16 imágenes. Las cartas se cantan EN VIVO cada pocos segundos (todos conectados ven lo mismo al mismo tiempo), marcando automáticamente cada tabla. Gana el primero en completar línea o tabla llena. Con boletos múltiples: 1 boleto = 1 tabla independiente. No hay límite práctico de tablas distintas que se puedan generar.

Los tres comparten **un solo motor de sorteo auditable** (semilla criptográfica + snapshot de participantes al cerrar inscripción), del que cuelgan como "pieles" visuales distintas. En ninguno de los 3 el organizador interviene durante el sorteo — el sistema determina al ganador automáticamente; el organizador solo presiona un botón para correr la animación/resultado. Ninguno requiere transmisión en vivo por parte del organizador (la "tabla completa" tiene su propio tiempo real interno vía Socket.io, pero no depende de que el organizador transmita nada).

**Orden de desarrollo recomendado:**
1. **Tómbola clásica animada** — la más simple de construir, prueba el motor base primero.
2. **Carta única de lotería mexicana** — reutiliza el mismo motor (1 boleto = 1 resultado único), solo cambia la piel visual.
3. **Tabla completa de lotería** — al final, porque es la única que requiere sincronización en tiempo real (todos viendo las cartas cantarse simultáneamente), más carga técnica para un solo developer.

**Empates**: solo pueden pasar en la lotería con tabla (no en tómbola ni carta única, porque ahí cada boleto/carta es de una sola persona). El organizador elige la regla de desempate al crear la Dinámica: sorteo instantáneo entre empatados, repartir el premio (solo si es divisible/duplicable), ronda extra/muerte súbita, u orden de inscripción.

## Confianza del organizador — insignia de actividad

Se descartó una insignia de "verificación de identidad" (el correo ya se verifica desde el registro en AY, así que sería redundante). En su lugar: **insignia de actividad tipo MercadoLibre**, basada en cuántas Dinámicas ha **completado correctamente** el organizador (no cuenta las pospuestas ni las que quedaron a medias, para evitar que alguien infle el número creando Dinámicas sin intención de terminarlas).

Niveles propuestos:
- **Nuevo** (0 completadas) — sin insignia, no se penaliza
- **Organizador activo** (3+ completadas)
- **Organizador confiable** (10+ completadas)

## Participantes sin cuenta de AnunciaYA

El organizador puede **registrar manualmente** a personas que no usan o no tienen la app (ej. un adulto mayor sin celular/redes), sin que esto implique crearles una cuenta de AnunciaYA.

- Botón "Agregar participante manual" dentro de la Dinámica
- Datos capturados: nombre y teléfono (para poder contactarlo si gana)
- Aparece en la lista pública con la etiqueta **"Sin cuenta AY"** (se descartó "agregado por el organizador" porque podía interpretarse como que tuvo ventaja si ganaba)
- **Sin límite** de cuántos participantes de este tipo puede haber por Dinámica — la expectativa es que la mayoría siga siendo usuarios reales de AY, pero no se pone un tope numérico o porcentual

## Notificaciones

- **Solo para usuarios con cuenta AY** dentro de la app (push/in-app). Para participantes "Sin cuenta AY" no se implementa ningún mecanismo de notificación (SMS u otro) — si el organizador quiere avisarles, es su responsabilidad hacerlo por fuera.
- Momentos que notifican: cuando el organizador **pospone** la fecha, y cuando se **anuncia el resultado**.

## Posponer en vez de cancelar

Si no se venden los boletos esperados para la fecha límite, el organizador puede **posponer** la Dinámica (no hay cancelación automática por falta de participación). **Sin límite** en cuántas veces puede posponerla.

## Tarjeta compartible del resultado

Se agregará una tarjeta/imagen generada automáticamente con el ganador + sello de AnunciaYA, para que el organizador la comparta en sus redes — da promoción orgánica gratis a la plataforma.

## Subastas

Quedan **fuera del alcance actual**, como un feature aparte para más adelante — pero ya se decidió que también vivirán dentro de **Marketplace → Dinámicas** cuando se retomen.

## Ciclo de vida de una Dinámica

**Borrador** → **Activa** ⇄ **Pospuesta** → **En sorteo** → **Cerrada/completada**
(o **Cancelada**, posible desde Borrador, Activa o Pospuesta)

- **Borrador**: el organizador llena los datos pero aún no publica; nadie más la ve.
- **Activa**: publicada, visible en Marketplace → Dinámicas, acepta participantes hasta la fecha límite.
- **Pospuesta**: el organizador puede posponer la fecha **en cualquier momento**, sin límite de veces (no solo cuando ya se llegó a la fecha límite).
- **En sorteo**: estado momentáneo mientras corre la animación del resultado (ya calculado por el servidor).
- **Cerrada/completada**: sorteo realizado, ganador anunciado, tarjeta compartible generada. Cuenta para la insignia de actividad.
- **Cancelada**: el organizador la da de baja antes de sortear. **No es neutral**: se cuenta y se muestra junto a la insignia (ej. "3 completadas, 2 canceladas") para dar el panorama completo del organizador, no solo lo positivo.

## Arquitectura de pantallas (a nivel producto, no técnico)

- **Pantallas completas** (rutas propias): feed de Dinámicas dentro de Marketplace, ficha de una Dinámica, pantalla de resultado/sorteo.
- **Composer de creación/edición**: sigue el mismo patrón que ya usan en Marketplace/Servicios/Negocios — vive inline en el feed, colapsado como pill y expandido a pantalla completa en móvil, activado por query params (crear/editar). No es un modal aparte.
- **Modales pequeños de detalle**: ver "cómo se calculó" (verificación del sorteo) y "agregar participante manual".

## Reglas de boletos

- **Sin mínimo ni máximo** de boletos por Dinámica.
- **El precio por boleto no puede ser $0** — una Dinámica gratuita no filtra participación real; el precio (aunque sea bajo) mantiene el compromiso de quien se anota.
- **Solo boletos confirmados como pagados participan en el sorteo** — un boleto reservado sin confirmar no entra al cálculo del ganador.
- **Chat automático al reservar boleto**: en cuanto un usuario selecciona un boleto, se abre/envía automáticamente un mensaje por ChatYA entre el participante y el organizador para iniciar la coordinación del pago, sin que ninguno tenga que romper el hielo manualmente.

## Fases de desarrollo del feature

El feature se construye en 5 fases, cada una entregable por separado con Claude Code:

1. **Estructura de datos y ciclo de vida** — capa base compartida por los 3 métodos (tablas, estados, motor de sorteo). Ya diagnosticada y definida, ver siguiente sección.
2. **Formulario/composer de creación** completo (los 8 campos, incluyendo selector de método y desempate condicional).
3. **Pantalla de participación** (grid de boletos, reservar, lista de participantes, "Sin cuenta AY") — prácticamente igual para los 3 métodos.
4. **Las 3 pantallas de resultado del sorteo** — tómbola, luego carta única, luego tabla completa (en ese orden, de lo más simple a lo más pesado técnicamente).
5. **Detalles finales** — tarjeta compartible, insignia de actividad, switch de contexto dentro de Marketplace.

Antes de iniciar cada fase, se le pide primero a Claude Code un reporte/diagnóstico de cómo está el código relacionado a esa fase, para decidir los detalles técnicos con información real y no con supuestos — así se evitó ya un desfase con `MarketPlace.md`/`Servicios.md` en la Fase 1.

## Fase 1 — Estructura de datos (diagnosticada y definida)

**Diagnóstico de Claude Code confirmó:**
- El patrón de composer inline de MP/Servicios sigue vigente tal como lo describen los docs, pero su "borrador" es 100% local (localStorage) — Dinámicas sí necesita un estado "Borrador" persistido en servidor, es un concepto nuevo.
- La lista negra de palabras (`filtros.ts`) bloquea hoy "rifa", "sorteo", "boleto" sin excepción, tanto en publicaciones como en comentarios de Marketplace.
- No existe ningún módulo con ciclo "pospuesta" — se diseña desde cero con el patrón `estado varchar + CHECK constraint`, usando `publicidad_compras.estado` como referencia más cercana.
- La tabla `votos` (el precedente más cercano a "usuario + acción sobre algo") **no usa UNIQUE INDEX**, solo valida con SELECT antes de INSERT — riesgo real de condición de carrera que Dinámicas debe evitar.
- El sistema de notificaciones (`notificaciones.service.ts`) es reutilizable tal cual; solo faltan agregar los tipos nuevos al catálogo.

**Estructura de datos definida:**

Tabla `dinamicas`: `organizador_usuario_id`, `titulo`, `descripcion`, `fotos_premio` (array, mismo patrón que `fotos` en Marketplace — varias fotos/video posibles, reutiliza el uploader existente), `tipo_premio`, `metodo_sorteo`, `numero_total_boletos`, `precio_boleto`, `fecha_limite_inscripcion`, `regla_desempate` (nullable), `estado` (`borrador|activa|pospuesta|en_sorteo|cerrada|cancelada`), `semilla_aleatoria`, `timestamp_sorteo`, `hash_verificacion`.

Tabla `dinamica_ganadores` (dinamica_id + boleto_id, uno o varios registros por Dinámica) — **reemplaza al campo `boleto_ganador_id` singular**, porque la regla de desempate "repartir el premio entre empatados" necesita soportar más de un ganador.

Tabla `dinamica_boletos`: `dinamica_id`, `numero_boleto` (**UNIQUE compuesto con `dinamica_id`**, para evitar la condición de carrera detectada en `votos`), `usuario_id` (nullable = "Sin cuenta AY"), `nombre_manual`, `telefono_manual`, `estado` (`reservado|pagado` — solo `pagado` participa en el sorteo), `reservado_en`, `reservado_expira_en` (24 horas desde la reserva — mismo patrón que `vouchers_canje.expiraAt`, libera el boleto automáticamente si nunca se confirma el pago, evita que quede "atorado" bloqueando a otros interesados), `pagado_en`.

**Nota sobre datos específicos de cada método**: los datos propios de carta única (carta asignada) y tabla completa (tabla de 16 imágenes) **no viven en estas tablas de Fase 1** — son tablas propias que se agregan cuando se construya cada método en la Fase 4. La Fase 1 es solo la capa compartida por los 3 métodos.

**Infraestructura adicional:**
- El endpoint de Dinámicas es un servicio separado del de Marketplace — no pasa por el filtro de lista negra (en vez de agregar excepciones dentro del filtro existente).
- Se agregan `'dinamica_pospuesta'` y `'dinamica_resultado'` al catálogo `TipoNotificacion` + su migración de CHECK constraint.
- La insignia de actividad (completadas/canceladas) se calcula al vuelo con COUNT sobre `dinamicas`, sin contador cacheado, salvo que rendimiento lo justifique después.
- Nombres de tabla confirmados: `dinamicas`, `dinamica_boletos`, `dinamica_ganadores`.

## Pendientes técnicos identificados

- **Lista negra de palabras**: confirmado que hoy bloquea "rifa", "sorteo", "boleto" sin excepción. **Resuelto a nivel de diseño**: el endpoint de Dinámicas es un servicio separado que no pasa por ese filtro — no requiere modificar `filtros.ts`.

## Pendiente — se retoma más adelante, no ahora

- **Ilustraciones de lotería mexicana**: para los métodos de carta única y tabla completa, se usarán personajes clásicos (El Gallo, La Dama, El Diablito, etc.) pero con **arte propio e ilustraciones originales** generadas vía prompt en Gemini (no la baraja tradicional de "Don Clemente", que tiene derechos de autor). Queda pendiente de trabajar cuando llegue el momento de esa fase — no es bloqueante para el resto del plan.

## Lo que quedó abierto

- **Detalle de implementación de cada uno de los 3 métodos** (Fase 4), a resolverse en el mismo orden en que se van a desarrollar: primero tómbola, luego carta única, luego tabla completa. Solo se detalló a fondo la de tómbola hasta ahora.
- Cualquier otra idea de producto/UX para este módulo que surja al bajar los métodos a pantallas concretas.
- Antes de iniciar cada fase de desarrollo con Claude Code, seguir pidiendo primero un reporte/diagnóstico de cómo está el código relacionado a esa fase específica.

## Fase 1 — COMPLETADA (backend, sin UI)

Implementada en código (sin ejecutar migraciones — Juan las corre manualmente en Supabase DEV primero). Detalle completo en el reporte de la sesión; resumen:

- 3 tablas nuevas (`dinamicas`, `dinamica_boletos`, `dinamica_ganadores`) en `schema.ts` + migración espejo en `docs/migraciones/2026-08-03-dinamicas-fase1-tablas.sql`.
- De paso se corrigió un drift real encontrado entre `schema.ts` y la BD de producción en `notificaciones_tipo_check` (le faltaban 3 valores de pagos que sí existían en la BD real) — migración aparte `docs/migraciones/2026-08-03-notificaciones-dinamicas.sql`.
- Ciclo de vida completo expuesto como endpoints (`/api/dinamicas`): crear, editar borrador, publicar, posponer, cancelar, listar propias (con insignia calculada al vuelo), detalle.
- Funciones internas de boletos (`reservarBoleto`, `confirmarPagoBoleto`, `contarBoletosPagados`) listas pero SIN endpoint público — eso es Fase 3.
- 35 tests unitarios (máquina de estados, traducción del error de boleto duplicado, validaciones Zod) — todos pasan. `tsc --noEmit` limpio.
- **Siguiente paso real**: Juan corre las 2 migraciones SQL en Supabase DEV, valida, y ahí arranca la Fase 2 (composer de creación).
