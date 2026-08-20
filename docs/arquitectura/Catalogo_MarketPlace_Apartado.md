# Mi Catálogo (MarketPlace) + Apartar

> **Estado:** Backend completo, incluido el lock BD contra apartados simultáneos (migración corrida en DEV y PROD). Frontend: página pública + Apartar + gestión privada + configuración + Alta Rápida (carga masiva) completos. Pendiente: que Juan ejecute la QA de expiración por cron (ya tiene botón "Ejecutar ahora" en Panel Admin › Mantenimiento).
> **Rutas:** `/p/marketplace/usuario/:usuarioId` (pública) · `/marketplace/usuario/:usuarioId` (privada, sin cambios) · `/mis-publicaciones/alta-rapida` (Alta Rápida)
> Racional de producto: sesión de planeación 2026-08-12. Rediseño a modelo de 2 estados: sesión 2026-08-16. Chat directo automático al apartar: sesión 2026-08-17. Alta Rápida MarketPlace: sesión 2026-08-18. Lock BD + cron manual en Mantenimiento: sesión 2026-08-19.

---

## 1. Qué es

Le da a un vendedor P2P de MarketPlace un **link público compartible** (sin cuenta AnunciaYA) con todo su inventario en venta — pensado para gente que hace **lives de venta** (ej. en Facebook) y necesita que su audiencia pueda "apartar" una pieza sin tener que llevar el control manualmente por comentarios.

Flujo (2026-08-16, modelo de 2 estados): el vendedor comparte el link → el comprador (sin cuenta) ve el catálogo, da click en "Apartar" en la pieza que quiere, deja su nombre + WhatsApp → la solicitud **bloquea el artículo de inmediato** (nadie más puede apartarlo; el artículo sigue público con overlay "Apartado", no se oculta) → el vendedor ve la solicitud en su panel privado y decide: **"Rechazar"** (libera el bloqueo) o **"Vendido"** (despublica el artículo). Si nunca actúa, el bloqueo se libera solo al vencer el tiempo configurable.

AnunciaYA solo organiza el apartado — el pago y la entrega ocurren 100% fuera de la plataforma (mismo espíritu que Dinámicas/rifas). El medio de contacto depende de si el comprador tiene cuenta AY: **sin cuenta** (link público, nunca logueado) sigue siendo 100% WhatsApp manual; **con cuenta** (in-app, 2026-08-17) el medio principal pasa a ser un **chat directo de ChatYA creado y enviado automáticamente** al apartar (card del artículo + mensaje prellenado, ya confirmado, no un borrador) — WhatsApp queda como respaldo secundario. Ver §3.4.

---

## 2. Decisiones de arquitectura (sesión de planeación)

- **Reemplaza al "Perfil de Vendedor"**, no coexiste aparte — lo que vivía en Perfil (tus publicaciones de MarketPlace) es conceptualmente tu inventario/catálogo. La ruta **privada** (`/marketplace/usuario/:id`) sigue funcionando igual que antes (perfil neutral, KPIs, bloqueo, contactos, tab Dinámicas) — pero el grid de MarketPlace en modo "En venta" **también apartar** con la misma card/modal que la ruta pública, para el usuario que llega navegando DENTRO de la app (feed, comentarios) y no por el link externo. Solo el dueño del perfil (`esUnoMismo`) no ve el botón sobre sus propios artículos, y solo artículos `modo='vendo'` lo muestran (no `busco`). La ruta **pública** nueva es para gente SIN cuenta (ej. audiencia de un live).
- **Dinámicas NO aparece en la versión pública.** Una rifa no es inventario ni se "aparta" con nombre+WhatsApp — mezclarla en el link de un live confundiría a la audiencia.
- **Apartar SIEMPRE pide nombre + WhatsApp manual, con o sin cuenta** — el catálogo público (`/p/marketplace/...`) nunca pide login. Pero cuando el comprador SÍ llega logueado (in-app, `PerfilVendedorPrivado`), el backend detecta la cuenta por el JWT y encima del registro nombre+WhatsApp dispara el chat directo automático (§3.4) — no reemplaza el dato manual, lo complementa.
- **La solicitud bloquea de inmediato** (2026-08-16, reemplaza el diseño original de "el vendedor confirma/rechaza sin lock automático"). Se descartó el paso intermedio de "confirmar": fusionarlo con el bloqueo evita que 2+ compradores pidan la misma pieza a la vez, y el vendedor solo decide el desenlace (Rechazar/Vendido), no si vale la pena reservarla. El overlay "Apartado" (mismo patrón visual que "Vendido"/"Pausado" en Mis Publicaciones) comunica el bloqueo sin ocultar el artículo — quien tenga el link directo no se topa con un 404.
- **Tiempo de apartado configurable, pero único por vendedor** (no por artículo) — un solo número en `usuarios.marketplace_apartado_horas`, default 24h.
- **Sin etiqueta/código corto por artículo** — se descartó: como el apartado se hace dando click directo en la pieza dentro del catálogo (no escribiendo un código en el chat del live), no hace falta.
- **No se reintroduce carrito/checkout** — mismo principio que el catálogo de Negocios: solo un compositor de solicitud de contacto, sin pago dentro de la plataforma.

---

## 3. Backend

### 3.1 Schema (`docs/migraciones/2026-08-12-marketplace-apartados.sql` + `2026-08-16-marketplace-apartados-2-estados.sql` + `2026-08-17-marketplace-apartados-comprador-usuario.sql` + `2026-08-18-marketplace-veces-vendido.sql`)

| Tabla/columna | Rol |
|---|---|
| `marketplace_apartados` | Una fila por SOLICITUD (historial completo). `estado`: `apartado` \| `vendido` \| `rechazado` \| `expirado` (2026-08-16, ya no hay `pendiente`/`confirmado` por separado). Siempre `nombre_comprador` + `whatsapp_comprador`. |
| `marketplace_apartados.comprador_usuario_id` | (2026-08-17) NULL = comprador sin cuenta AY. Presente = estaba logueado al apartar — dispara el chat directo automático (§3.4). FK a `usuarios`, `ON DELETE SET NULL`. |
| `articulos_marketplace.apartado_hasta` | El LOCK vigente del artículo (NULL = disponible). Se llena de inmediato al APARTAR (ya no espera confirmación) — lectura O(1) sin JOIN para pintar "Apartado" en el catálogo. Lo limpian "Rechazar", "Vendido" y el cron de expiración. |
| `articulos_marketplace.veces_vendido` | (2026-08-18) Contador histórico — se incrementa al marcar vendido (vía apartado o directo) y NUNCA se resetea al reactivar. Ver §3.6. |
| `usuarios.marketplace_apartado_horas` | Config única del vendedor, default 24. |

### 3.2 Endpoints (`marketplace.routes.ts`)

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| POST | `/articulos/:id/apartar` | Público (rate-limited, `limitadorApartarMarketplace`: 8/min prod) | Comprador solicita apartar — bloquea el artículo de inmediato (`estado='apartado'`, `apartado_hasta` calculado con las horas del vendedor) |
| PATCH | `/apartados/:id/vendido` | Privado, dueño del artículo | Marca la solicitud `vendido` y despublica el artículo (`estado='vendida'`) |
| PATCH | `/apartados/:id/rechazar` | Privado, dueño | Rechaza — libera `apartado_hasta` |
| GET | `/mis-apartados?estado=` | Privado | Panel de gestión — todas las solicitudes de todos mis artículos |
| GET/PATCH | `/mi-configuracion-apartado` | Privado | Horas de apartado del vendedor |
| GET | `/vendedor/:usuarioId/publicaciones?modo=vendo` | Público (`verificarTokenOpcional`, ya existía) | Extendido con filtro `modo` para Mi Catálogo |

Lógica en `services/marketplace.service.ts` (`apartarArticulo`, `marcarApartadoVendido`, `rechazarApartado`, `obtenerApartadosDeVendedor`, `obtenerConfiguracionApartado`, `actualizarConfiguracionApartado`, `liberarApartadosExpirados`).

### 3.3 Cron (`cron/marketplace-apartados-expiracion.cron.ts`)

Cada 30 min (mismo criterio que `dinamicas-expiracion.cron.ts`): un UPDATE atómico vía CTE marca `estado='expirado'` en las filas `apartado` con `expira_en` vencido, y limpia `apartado_hasta` en `articulos_marketplace`. A diferencia de Dinámicas (que borra el boleto), aquí se conserva el historial — el vendedor puede revisarlo en su panel.

### 3.4 Chat directo automático + notificación (2026-08-17)

`POST /articulos/:id/apartar` ahora usa `verificarTokenOpcional` (antes sin auth alguna) — puebla `req.usuario` si el comprador está logueado, sin rechazar la request si no lo está. El controller pasa `req.usuario?.usuarioId` (nunca del body, para que un comprador no pueda "apartar a nombre de" otro usuario) como `compradorUsuarioId` a `apartarArticulo`.

Dentro de `apartarArticulo` (`marketplace.service.ts`), después de insertar el lock:

1. **Siempre** (con o sin cuenta el comprador) — `crearNotificacion()` con el nuevo tipo `marketplace_articulo_apartado` (familia visual `pendiente`) — alimenta la campanita in-app del vendedor. Corregido 2026-08-17: originalmente vivía adentro del bloque de `compradorUsuarioId` y solo notificaba si el comprador tenía cuenta — dejaba sin avisar al vendedor en el caso más común (catálogo público de un live, comprador anónimo). `referenciaId` es el id de la SOLICITUD (`marketplace_apartados.id`, no el del artículo) — deep-link especial (2026-08-18) en `obtenerRutaDestino` (`PanelNotificaciones.tsx`, interceptado ANTES del `case 'marketplace':` genérico) a `/mis-publicaciones?tipo=marketplace&apartadoId={id}`: abre Mis Publicaciones, auto-abre `ModalGestionApartados` y hace scroll + resalta esa fila con un anillo ámbar 3.5s (mismo patrón que `?movId=` en Mi Perfil › Pagos).
2. **Solo si `compradorUsuarioId` viene presente** (y no es el propio vendedor) — chat directo automático: `crearObtenerConversacion()` (reusa la función de `chatya.service.ts`, ya soportaba `contextoTipo:'marketplace'` + `articuloMarketplaceId` desde el botón manual "Contactar" del feed) crea o reusa la conversación e inserta la card de contexto del artículo; `enviarMensaje()` — el comprador "envía" un mensaje prellenado (`Hola, aparté "X". Quedo pendiente para coordinar el pago y la entrega.`) YA CONFIRMADO, no como borrador. Como es el mismo `enviarMensaje` que usa el chat manual, hereda gratis: push notification si el vendedor no está conectado, y el pitido/sonido de `chatya:mensaje-nuevo` por socket si sí lo está — sin código nuevo de notificaciones push.

Cada bloque va en su propio `try/catch` no bloqueante: si el chat o la notificación fallan, el apartado en sí ya quedó confirmado arriba (no se revierte).

Frontend: `PanelApartar` (`PaginaPerfilVendedor.tsx`) cambia el copy de la pantalla de éxito cuando `esInApp` (deja de prometer solo WhatsApp) y agrega un botón "Ver conversación" que abre el chat recién creado vía `useIniciarChatDirectoPersona` (sin mandar `mensaje` — solo abre la conversación que el backend ya creó, no duplica el auto-mensaje). El catálogo público (sin cuenta) no cambia: sigue con el copy y flujo 100% WhatsApp de siempre.

Además, `rechazarApartado` y `marcarApartadoVendido` notifican in-app al comprador (si tenía cuenta) con los tipos `marketplace_apartado_rechazado` (familia `alerta`) y `marketplace_apartado_vendido` (familia `entregado`) — antes solo se enteraba si alguien le avisaba manualmente.

### 3.6 Contador histórico `veces_vendido` (2026-08-18)

Reactivar un artículo `vendida` (menú "Re-Activar" en `CardArticuloMio`, llama a `reactivarArticulo()` en `marketplace/expiracion.ts`) lo regresa a `estado='activa'` — sin nada más, el vendedor perdía todo rastro de que ese artículo YA se había vendido antes: "Vendidos" en Mis Publicaciones filtra por `estado` ACTUAL, así que en cuanto se reactivaba desaparecía de ahí sin dejar huella.

Se agregó `articulos_marketplace.veces_vendido` (entero, default 0) — se incrementa +1 en el mismo `UPDATE` cada vez que el artículo pasa a `estado='vendida'`, en los 2 lugares donde eso ocurre: `marcarApartadoVendido` (vía una solicitud de apartado) y `cambiarEstado` (marcar vendido directo desde el menú de Mis Publicaciones, sin apartado de por medio). Reactivar NUNCA lo toca — es estrictamente acumulativo, sobrevive cualquier cantidad de ciclos vendida→activa→vendida.

Solo viaja en `obtenerMisArticulos` (uso privado del dueño en Mis Publicaciones) — el resto de queries del catálogo no lo seleccionan, no es un dato para terceros. Frontend: `CardArticuloMio` muestra un chip teal ("Se vendió N veces antes") en la fila de KPIs, SOLO cuando el artículo NO está vendido ahora mismo (si lo está, el overlay "Vendido" ya lo comunica y el chip sería redundante) — es decir, se ve específicamente en el caso que motivó el fix: un artículo reactivado que ya se había vendido antes.

`cambiarEstado` también gana `emitirCatalogoEstado()` de paso (no lo tenía — mismo gap que `reactivarArticulo` antes de este fix): "Marcar vendido"/"Pausar"/"Reanudar" directo desde Mis Publicaciones ahora también sincroniza en vivo el catálogo público/privado, no solo las acciones de apartado.

### 3.5 Sync en vivo del catálogo (2026-08-17)

Room de Socket.io `catalogo:{vendedorUsuarioId}` (handlers `marketplace:catalogo:unirse`/`salir` en `socket.ts`, admite invitados sin token — mismo criterio que la sala en vivo de Dinámicas). `apartarArticulo`, `marcarApartadoVendido`, `rechazarApartado` y `liberarApartadosExpirados` (cron) emiten `marketplace:catalogo:estado` a ese room vía el helper `emitirCatalogoEstado()` cada vez que cambia el lock de un artículo.

Frontend: `PerfilVendedorPrivado` y `MiCatalogoPublico` (`PaginaPerfilVendedor.tsx`) se unen al room al montar — la privada reusa el socket ya conectado por la sesión; la pública (bare, sin garantía de sesión) llama `conectarSocket()`/`conectarSocketInvitado()` según haya `usuarioActual` o no, igual que `PaginaSalaDinamicaPublica.tsx`. Al recibir el evento, invalida `queryKeys.marketplace.vendedor(usuarioId)` (matchea por prefijo la query de `useVendedorPublicaciones`) — refetch, no parcheo manual del cache. Caso que resuelve: varias personas con el mismo catálogo abierto durante un live de Facebook ven el overlay "Apartado" actualizarse entre ellas sin recargar.

`PaginaMisPublicaciones.tsx` (panel de gestión del propio vendedor) se une al MISMO room con su propio `usuarioId` — sin esto, el badge del botón "Apartados" y el overlay de `CardArticuloMio` quedaban desactualizados si el vendedor tenía esa pantalla abierta mientras alguien apartaba/se liberaba un artículo en paralelo. Invalida `['marketplace','mis-articulos']` + `['marketplace','mis-apartados']` al recibir el evento.

`emitirCatalogoEstado()` se llama en 5 puntos del backend: `apartarArticulo`, `marcarApartadoVendido`, `rechazarApartado`, `liberarApartadosExpirados` (cron) — todos en `marketplace.service.ts` — y **`reactivarArticulo`** (`marketplace/expiracion.ts`, agregado 2026-08-18: reactivar desde "Vendidos" en Mis Publicaciones dejaba el catálogo público/privado y el propio Mis Publicaciones con el caché viejo mostrando el artículo como vendido hasta un refresh manual, mismo síntoma que los otros 4 puntos antes de tener el emit).

---

## 4. Frontend

| Pieza | Archivo | Nota |
|---|---|---|
| Página pública | `pages/private/marketplace/PaginaPerfilVendedor.tsx` → `MiCatalogoPublico()` | Mismo archivo que la ruta privada; detecta `/p/marketplace` por `location.pathname` y renderiza un componente completamente distinto (sin bloqueo/contactos/Dinámicas). Ruta bare, sin MainLayout — igual que `/p/negocio/...` |
| Card seleccionable | Mismo archivo — `CardCatalogoVendedor` | Interacción de dos zonas (calca "+Agregar" vs click-en-card de `PaginaCatalogoNegocio.tsx`): el círculo (esquina superior derecha de la imagen) es el ÚNICO elemento que alterna selección (`onToggleSeleccion`, con `stopPropagation`); el resto de la card (imagen+texto, envueltos en un `<button>`) abre `ModalDetalleArticuloMarketplace` (`onVerDetalle`) |
| Modal de detalle | Mismo archivo — `ModalDetalleArticuloMarketplace` (2026-08-15) | Calca el estilo visual de `components/negocios/ModalDetalleItem.tsx` (hero+gradiente, compartir/cerrar flotantes, badge Disponible/Apartado, título+categoría sobre la imagen, franja divisora, precio+contacto, descripción) pero adaptado a MarketPlace: contacta al vendedor vía `useIniciarChatDirectoPersona`/`useAbrirWhatsApp` en vez del chat de negocio; sin botón de apartar adentro (eso vive solo en el círculo de la card). Usa `Modal` (no `ModalAdaptativo`), igual que su referencia. |
| Panel Apartar (sidebar) | Mismo archivo — `PanelApartar` (2026-08-15, reemplaza al `ModalApartar` centrado) | Calca el patrón "Tu pedido" de `PaginaCatalogoNegocio.tsx`: sidebar `fixed` en desktop + `ModalBottom` con header oscuro en móvil (FAB "Apartar · N" para abrirlo). Selección múltiple: se eligen varias piezas y se manda UN solo formulario nombre+WhatsApp (una solicitud por artículo internamente). Usado en **ambas** vistas — público (`usuarioActual=null`, siempre pide nombre+WhatsApp manual) y privado in-app (`usuarioActual` del store: nombre se autocompleta del perfil sin pedirlo, WhatsApp se precarga de `usuario.telefono` si existe — sigue siendo obligatorio tener 10 dígitos válidos al enviar, el precargado es lo que lo vuelve "opcional" en la práctica). WhatsApp usa `InputTelefono` (mismo componente validado de Mi Perfil/Sucursales — solo dígitos, 10 exactos) en vez de un `<input type="tel">` libre. **Porteado a `document.body`** vía `createPortal`+`usePortalTarget` — dentro de AY, `PerfilVendedorPrivado` vive bajo el `<main>` de `MainLayout`, que crea su propio stacking context; un `fixed` renderizado ahí queda atrapado debajo del `<aside>` de publicidad (z-30) sin importar el z-index — portear al body lo saca de ese árbol (mismo patrón que ya usan `Modal`/`ModalBottom`). **Alineado al header vía grid, no vía offsets fijos** (2026-08-15, versión final): los intentos con `translate-x`/`max-width` reducido para "hacerle hueco" quedaban desalineados del header (que vive en su propio wrapper `max-w-7xl`, ver comentario en `PerfilVendedorPrivado`). La solución real: `PanelApartar` acepta `variante: 'flotante' | 'grid'`. En `'grid'` (usada por `PerfilVendedorPrivado`) el desktop NO se portea — se renderiza como columna `sticky` normal dentro del `grid-cols-[1fr_320px]` que `PerfilVendedorPrivado` arma en su propio wrapper de contenido (que además, mientras hay selección, adopta el MISMO `max-w-7xl`/padding que el header en vez del `max-w-[920px]` de siempre) — así el borde derecho del sidebar coincide con el borde derecho del header, y el contenido con su borde izquierdo, por construcción de CSS (mismo `mx-auto max-w-7xl`), sin medir nada por JS ni depender del ancho de la columna de publicidad. `'flotante'` (usada por `MiCatalogoPublico`, sin header con el que alinear ni columna de publicidad) conserva el comportamiento original: `fixed right-4`, porteado a `document.body`. El móvil (FAB + `ModalBottom`) es igual en ambas variantes, siempre porteado. |
| Gestión privada + config | `components/marketplace/ModalGestionApartados.tsx` | Modal rediseñado (2026-08-16) con header gradiente teal (patrón "Modal de Detalle", TC-6A) + filtros Apartados/Vendidos + botones "Rechazar"/"Vendido" (con texto, no solo ícono) + ajuste de horas, todo en un solo componente. Alto FIJO (`h-[85vh] lg:h-[75vh]`, no `max-h-`) para que no cambie de tamaño entre tabs. |
| Entrada | `pages/private/publicaciones/PaginaMisPublicaciones.tsx` | Botón con badge (cuenta `estado='apartado'`) + `Tooltip`/dropdown, presente en los headers Laptop, PC y móvil (móvil agregado 2026-08-18: la fila de chips de estado se convirtió en dropdown para liberar espacio). |
| Hooks | `hooks/queries/useMarketplace.ts` | `useApartarArticulo`, `useMisApartados`, `useMarcarApartadoVendido`, `useRechazarApartado`, `useMiConfiguracionApartado`, `useActualizarConfiguracionApartado` |

---

## 5. Pendiente

- ~~**Alta Rápida MarketPlace** — entrada de carga masiva (foto/texto/manual → tabla editable → publicar en lote), calcando el patrón de `docs/arquitectura/Alta_Rapida_Catalogo.md` pero para MarketPlace en modo `vendo`.~~ ✅ Resuelto 2026-08-18 — ver `docs/arquitectura/Alta_Rapida_Catalogo.md` §7. NO reemplaza el alta uno-por-uno que ya existe (entry point unificado vía menú en el botón "Publicar").
- ~~Botón "Solicitudes de apartado" en `PaginaMisPublicaciones.tsx` solo existe en los headers Laptop y PC.~~ ✅ Resuelto 2026-08-18 — agregado también al header móvil.
- ~~Correr la migración `docs/migraciones/2026-08-16-marketplace-apartados-2-estados.sql` en DEV y PROD.~~ ✅ Corrida en ambos entornos (16 ago 2026).
- ~~Falta notificación en tiempo real al vendedor cuando llega una solicitud de apartado.~~ ✅ Resuelto 2026-08-17/18: chat directo automático + push/pitido para compradores CON cuenta (§3.4); notificación in-app SIEMPRE al vendedor, con o sin cuenta el comprador (corregido 2026-08-18, vivía atada por error a `compradorUsuarioId`).
- ~~Correr la migración `docs/migraciones/2026-08-17-marketplace-apartados-comprador-usuario.sql` en DEV y PROD.~~ ✅ Corrida en ambos entornos (17 ago 2026).
- ~~El overlay "Apartado" del catálogo (público y privado) se quedaba desactualizado si alguien más lo tenía abierto al mismo tiempo (varios visitantes en un live).~~ ✅ Resuelto 2026-08-17/18: sync en vivo por Socket.io (§3.5) + fix de reconexión (el join al room se perdía en cada restart/reconexión del socket, no solo al montar).
- ~~Correr la migración `docs/migraciones/2026-08-18-notificaciones-tipos-apartado.sql` en DEV y PROD.~~ ✅ Corrida en ambos entornos (18 ago 2026).
- ~~Falta un lock a nivel BD contra la carrera "2 solicitudes casi simultáneas para el mismo artículo" (hoy es check-then-insert en el service, sin constraint que lo blindee).~~ ✅ Resuelto 2026-08-19: `apartarArticulo` (`marketplace.service.ts`) ahora reclama el artículo con un `UPDATE` condicional DENTRO de la transacción (`WHERE apartado_hasta IS NULL OR apartado_hasta < NOW()`) — Postgres serializa la carrera vía el row-lock del propio UPDATE, así que solo 1 de 2 solicitudes concurrentes puede reclamarlo; la otra recibe 409 limpio. Más el índice único parcial `uniq_marketplace_apartados_articulo_activo` (`articulo_id` único mientras `estado='apartado'`) como defensa de último nivel a nivel BD. Migración `docs/migraciones/2026-08-19-marketplace-apartados-lock-bd.sql` corrida en DEV y PROD (19 ago 2026).
- QA de la expiración automática por cron (nadie actúa, se libera solo al vencer el tiempo) — nunca se probó. El cron (`marketplace-apartados-expiracion.cron.ts`, cada 30 min) ya corría solo pero no tenía botón manual en el Panel; se agregó 2026-08-19 a `cronRegistry.ts` + `mantenimiento-acciones.service.ts`, así que ahora aparece en **Panel Admin › Mantenimiento › Tareas programadas** ("Expiración de Apartados de MarketPlace") con botón "Ejecutar ahora", igual que los demás crons. Para probarlo de punta a punta: apartar un artículo real, adelantar su `expira_en` a un valor pasado (`UPDATE marketplace_apartados SET expira_en = NOW() - INTERVAL '1 minute' WHERE id = '<id de la solicitud>';`) y darle "Ejecutar ahora" — debe pasar a `estado='expirado'` y liberar `apartado_hasta` del artículo.
- ~~Correr la migración `docs/migraciones/2026-08-12-marketplace-apartados.sql` en DEV y PROD.~~ ✅ Corrida en ambos entornos (16 ago 2026).
