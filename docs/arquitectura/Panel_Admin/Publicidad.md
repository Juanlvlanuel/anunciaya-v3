# Publicidad — Panel Admin (módulo 7)

> **Estado:** ✅ **Construido de punta a punta** — Fases 0, 1 (VER) y 2 (ACTUAR) cerradas: lectura + **KPIs**
> (activos · ingresos · clics · por vencer) · acciones de estado + **editar** (sin tocar el cobro) · configuración
> económica (precios + tramos por ciudad + **periodos de meses**, editores dedicados) · **meses por adelantado**
> con descuento · alta manual + cortesía · **wizard self-service con Stripe** (pago único) · cron de expiración +
> aviso + limpieza de pendientes · recibo PDF + correo + módulo **Recibos** extendido. Las creatividades se
> **optimizan** (WebP) y no quedan **huérfanas** (reference count + recolector R2). Modales **horizontales** +
> acciones de la ficha en **íconos**. Verificado con harness + `tsc` en api/admin/web; VER verificado visualmente.
> **Cerrado** (Fase 3): committeado · **CORS R2 resuelto** · recibo/correo de publicidad con plantilla propia + periodo. Migraciones corridas.
>
> **Cambios 22-jun:** la pauta se vende y presenta **por tamaño** (no por nombre de carrusel): **Grande**
> (banner 4:5) y **Chico** (tarjeta 3:2) — el combo es de **2**, `Fundadores` salió del plan de pago (es regalo).
> Columna derecha **rediseñada** (un bloque inline "PUBLICIDAD", proporciones **fijas** iguales al wizard,
> lightbox por **portal** que tapa el header). El wizard **especifica la medida** de cada tamaño (Grande
> 1080×1350 · Chico 1080×720) y su **paso de ciudades es dinámico** (se oculta y auto-selecciona con 1 ciudad
> activa; reaparece al habilitar más). Y se **destrabó el guardado de Configuración**: faltaba `'publicidad'`
> en el CHECK de `categoria` y los tipos `tramos_ciudades`/`periodos_meses` en el CHECK de `tipo` de
> `configuracion_sistema` (2 migraciones, corridas en dev+prod).
>
> **Cambios 29-jun:** (1) **Precio de lanzamiento por tamaño** — dos claves nuevas opcionales
> (`publicidad_precio_lanzamiento_patrocinadores`/`_anuncios`); si valen `> 0` y menos que el precio base,
> se **cobra ese** y el base se muestra **tachado** (`~$299~ $199`) con chip "Lanzamiento" en el wizard y
> Resumen. Sin migración (categoría/tipo ya permitidos). El cobro de Stripe usa el efectivo (mismo
> `calcularPrecioPublicidad`), igual el alta manual y el recibo. (2) **Clics por anuncio** visibles en la
> **lista** (columna desktop + dato en card móvil; `listarPublicidad` suma `publicidad_piezas.clicks` por
> compra) y el **total** en la ficha (combo). Las **impresiones/"vistas" se retiraron de la UI**: el campo
> existe en BD pero **no hay tracking** que lo incremente (pendiente, ver "Ingresos / métricas"). (3) **Sello
> "Pago seguro con Stripe"** con el **wordmark oficial** (componente `LogoStripe`, color de marca #635BFF) en
> el wizard y en `PaginaRegistroExito`. (4) **Wizard `/anunciate` repintado a tokens AY** (paleta slate + dark
> gradient, sin acentos azules) y **limpieza de creatividades huérfanas reforzada** (ver "Creatividades (R2)").
> **Sección del menú:** Crecimiento. **Plantilla de oro:** Negocios.
> **Última actualización:** 29 Junio 2026.
>
> Este documento es la **verdad** del módulo (qué es y cómo funciona). El checklist vivo de lo
> que falta está en [`Publicidad_Pendientes.md`](Publicidad_Pendientes.md). El proceso de
> construcción, en el carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).

---

## Capa 1 — Qué es (lenguaje de persona)

**Publicidad es la segunda fuente de ingresos de AnunciaYA:** vende el **espacio** del bloque
**"PUBLICIDAD"** de la columna derecha de la app — manejado **por tamaño**: **Grande** (banner) y **Chico**
(tarjeta) — a cualquier usuario que quiera más visibilidad. No es publicidad de terceros ni venta de datos:
el que pauta es un **usuario verificado** de la propia plataforma (un negocio o una persona) que sube **su
propia imagen**. AnunciaYA solo renta el espacio.

> **Por tamaño, no por nombre (22-jun):** antes los espacios se llamaban *Anuncios* / *Patrocinadores*;
> ahora se venden y presentan **por tamaño** — **Grande** (= dato interno `patrocinadores`) y **Chico**
> (= dato interno `anuncios`). Los IDs en BD no cambiaron (sin migración de datos); solo la presentación.

### Los espacios — 2 de pago + 1 de regalo
Hay **dos tamaños de pago** (rotan solos y se pausan al hover) y uno **de regalo**:

| Espacio | Qué es | Proporción / medida | Cómo se obtiene |
|---|---|---|---|
| **Grande** (`patrocinadores`) | Banner grande, arriba | **4:5** vertical · 1080×1350 px | **Pago** — precio base, igual en cualquier ciudad |
| **Chico** (`anuncios`) | Tarjeta chica, abajo | **3:2** horizontal · 1080×720 px | **Pago** — precio base |
| **Fundadores** (`fundadores`) | Logos circulares **flotando** (sin card ni título) | Cuadrado 1:1 | **Regalo** — a los primeros **50** negocios de cada ciudad; el admin lo marca desde la **ficha del negocio** y aparece su **logo** |

Los 2 de pago tienen un **combo con descuento** (los **2 tamaños** juntos). Precios, descuento y umbrales los
fija **solo el SuperAdmin**. **Fundadores NO se vende**: es un reconocimiento a los negocios pioneros —
`negocios.es_fundador` (toggle en la ficha), cupo **50 por ciudad** (la de su sucursal principal); el carrusel
público arma los fundadores desde esos negocios usando su `logo_url`. Las proporciones son **fijas e idénticas**
entre la columna y el wizard, para que el anunciante **diseñe a la medida** que se ocupa.

### Acotado por ciudades (paso dinámico)
El anunciante elige **hasta *X* ciudades** donde quiere aparecer. **Mientras más ciudades, más caro**, por
una **escalera de tramos** (no por cuál ciudad — todas valen igual). El límite *X* y los tramos los
configura el SuperAdmin desde **Configuración**. El anuncio se muestra a quien tenga como **ciudad activa**
una de las ciudades compradas.

El paso **"¿En qué ciudades?"** del wizard es **dinámico**: si hay **una sola ciudad activa** en el sistema
(tabla `ciudades` con `activa = true`, p. ej. el arranque en **Puerto Peñasco**), el paso **se oculta** y la
ciudad se **auto-selecciona** (se muestra un aviso "Tu anuncio se mostrará en …"). Al **habilitar más ciudades**
en el Panel → Ciudades, el selector **reaparece solo** (la app rehidrata el catálogo vía React Query, sin
redeploy). Nota: esto depende de **cuántas ciudades están activas**, no del *Máximo de ciudades* (que es el tope
**por anuncio**); para arrancar mono-ciudad se **desactivan** las demás en el Panel → Ciudades.

### Meses por adelantado
El anunciante elige **cuántos meses paga por adelantado** (1 / 3 / 6 / 12 — configurable). Cada periodo da un
**% de descuento por volumen** y **extiende la vigencia**: `vigencia = meses × publicidad_duracion_dias`. El
cobro sigue siendo **pago único** (sin renovación automática). Los periodos y sus descuentos los fija el
SuperAdmin desde **Configuración** (clave `publicidad_periodos`). Total:
`total = (Σ precios_efectivos) × factorCiudades × (combo) × meses × (1 − descuentoPeriodo%)`, donde
`precio_efectivo` = el de **lanzamiento** del tamaño si está activo, si no el base.

### Dónde se ve
En **todas las secciones** de la app que tengan la columna de carruseles, pero **solo en computadora
(desktop)** — en **móvil no hay publicidad**. El **clic** sobre un anuncio **solo agranda la imagen** (no
lleva a ningún lado).

### Cómo se compra (dos vías)
1. **Self-service (el propio usuario):** desde un **botón "Anúnciate aquí" en la misma columna de
   carruseles** (no desde Business Studio ni otro lugar). El usuario recorre la **página `/anunciate`**: elige
   **tamaño(s)** (Grande/Chico, con su medida a la vista) → **ciudades** (paso que se **oculta** si hay una sola
   ciudad activa) → **tiempo** (meses) → sube su imagen → **paga con tarjeta** (Stripe). El anuncio nace en estado
   `pendiente` y solo pasa a `activa` cuando el webhook confirma el pago; un pago **rechazado o abandonado** deja un
   `pendiente` que **no se muestra en el Panel** y lo **borra el cron** (la sesión de Stripe caduca en 1h).
2. **Alta manual (desde el Panel):** el SuperAdmin o el Gerente (en su región) registra el anuncio cobrado en
   **efectivo/transferencia**. Las **cortesías** (gratis) las otorga **solo el SuperAdmin**.

### Quién lo administra
**Solo SuperAdmin y Gerentes** ven esta sección; **el Vendedor no entra**. Cada **Gerente ve y controla solo
lo de su región** (los anuncios con al menos una ciudad en su región).

| Acción | SuperAdmin | Gerente (su región) | Vendedor |
|---|---|---|---|
| Ver la sección + métricas | Total | Su región | — |
| Alta manual (efectivo/transferencia) | Sí | Su región | — |
| Otorgar **cortesía** (gratis) | **Sí** | No | — |
| Pausar / editar / cancelar | Sí | Su región | — |
| Fijar precios base · tramos · límite *X* · % combo · periodos | **Sí** | No | — |
| Ver estos pagos en **Recibos** | Sí | Su región | **No** |

### Notificaciones por correo
- **Al pagar** (self-service o alta manual): el anunciante recibe un correo de **confirmación** con su
  **recibo PDF foliado** — mismo molde y **misma numeración** que los recibos de membresía. El recibo aparece
  también en la sección **Recibos** del Panel (super/gerente; el vendedor no ve estos pagos).
- **Por vencer:** **3 días antes** de expirar, un correo avisa al anunciante (un cron diario, no se repite).

### Qué NO hace
- No vende publicidad de terceros ni redes externas (respeta la visión: la pauta es de los negocios/usuarios
  verificados).
- No diseña la creatividad (el anunciante sube su imagen).
- No tiene punto de entrada al wizard fuera de la columna de carruseles.
- No muestra publicidad en **móvil**.
- El clic **no** lleva a ningún lado (solo zoom).
- El **vendedor** no entra ni ve estos pagos.

---

## Capa 2 — Apéndice técnico

### Modelo de datos (3 tablas nuevas — migración `2026-06-21-publicidad.sql`)
Reemplazan el schema **dormido** `planes_anuncios`/`promociones_pagadas` (jubilado en
`2026-06-21-drop-publicidad-dormida.sql`; eran de un diseño anterior sin dimensión ciudad).

- **`publicidad_compras`** — la compra/campaña. `usuario_id` (anunciante; **cualquier** usuario),
  `negocio_id` (opcional, si es comercial), `es_combo`, `estado` (activa/pausada/expirada/cancelada),
  `origen` (self/manual/cortesia), `metodo_cobro`, `monto` (NULL en cortesía), `folio` (recibo),
  `stripe_payment_intent_id`, `recibo_url`, `duracion_dias`, `inicia_at`/`expira_at`,
  `aviso_vencimiento_enviado`, `registrado_por`. CHECKs: estado/origen, monto ≥ 0, **cortesía ⇒ monto NULL**,
  `expira_at > inicia_at`.
- **`publicidad_piezas`** — 1..3 creatividades por compra. `compra_id`, `carrusel`
  (anuncios/patrocinadores/fundadores), `imagen_url` (R2), `clicks` (el zoom), `impresiones`, `prioridad`.
  UNIQUE `(compra_id, carrusel)` (un carrusel no se compra dos veces en la misma compra). Compra simple = 1
  pieza · combo = 3 piezas.
- **`publicidad_compra_ciudades`** — N:M dónde se muestra. PK `(compra_id, ciudad_id)`; índice por
  `ciudad_id` (lo que pregunta el carrusel público).

### Económico — claves en `configuracion_sistema` (editables solo por SuperAdmin)
En el catálogo `CONFIG_EDITABLE` de Configuración, con **editores dedicados** para los valores JSON (tramos
de ciudades · periodos de meses) además de los numéricos. Se muestran como **"Precios por tamaño"**:
- `publicidad_precio_patrocinadores` (etiqueta **"Precio · Grande"**) · `publicidad_precio_anuncios` (etiqueta **"Precio · Chico"**) — MXN, base por tamaño. (`publicidad_precio_fundadores` **se retiró**: Fundadores ya no se vende.)
- `publicidad_precio_lanzamiento_patrocinadores` (**"Lanzamiento · Grande"**) · `publicidad_precio_lanzamiento_anuncios` (**"Lanzamiento · Chico"**) — MXN, **oferta opcional por tamaño**. `0` = sin oferta; si `> 0` y menor al precio base, se **cobra este** y el base se muestra **tachado**. En Configuración aparecen **emparejadas** con su precio base ("Precios por tamaño", rejilla de 2). Para el cálculo cuenta el **precio efectivo** (lanzamiento si aplica), sobre el que se aplican combo/ciudades/periodos.
- `publicidad_combo_descuento` (% del combo de los **2 tamaños**).
- `publicidad_tramos_ciudades` (JSON, escalera por # de ciudades → factor; tipo `tramos_ciudades`).
- `publicidad_limite_ciudades` (*X* máximo **por anuncio**).
- `publicidad_duracion_dias` (vigencia base de **1 mes**; la total = meses × esta).
- `publicidad_aviso_dias` (días antes de vencer para avisar; default **3**).
- `publicidad_periodos` (JSON, meses pagables por adelantado → % descuento; tipo `periodos_meses`). Default: 1→0% · 3→10% · 6→15% · 12→25%.

> **CHECKs de `configuracion_sistema` (22-jun):** guardar cualquier clave de publicidad por **primera vez**
> hace un `INSERT` que dispara dos CHECKs que **no contemplaban este módulo**. Se ampliaron (2 migraciones,
> corridas en dev+prod): `configuracion_categoria_check` ahora acepta **`publicidad`**, y
> `configuracion_tipo_check` acepta **`tramos_ciudades`** y **`periodos_meses`**. La escalera de comisiones no
> fallaba porque usa `tipo='json'` (ya permitido). Detalle en [`Configuracion.md`](Configuracion.md).

### Alcance por rol (sincronizado lectura ↔ escritura)
- **SuperAdmin:** todo (con lente de región del filtro global).
- **Gerente:** los anuncios con **≥1 ciudad en su región** (`EXISTS` sobre `publicidad_compra_ciudades` →
  `ciudades.region_id` = su `region_id`). Es **dónde se muestra**, no de quién es el negocio — coherente con
  que el anunciante puede ser una persona sin negocio.
- **Vendedor:** sin acceso (403), y **no ve** estos pagos en Recibos.
- Si un anuncio toca **2 regiones**, ambos gerentes lo ven/gestionan; **cancelar = solo SuperAdmin**.

### Recibos / folios
El `folio` de `publicidad_compras` se asigna desde la **secuencia global `pagos_membresia_folio_seq`** (la
misma de membresías) → folios **correlativos** entre publicidad y membresías. Lo asigna el **service** solo en
compras con cobro real; la **cortesía no consume folio** (queda NULL, sin recibo, pero sí correo de "publicidad
activa"). La sección **Recibos** del Panel se extiende para leer también estos recibos (Fase 2).

### Ingresos / métricas
Las métricas de ingresos del módulo se calculan desde `publicidad_compras` (no pasan por `eventos_pago`, que
asume `negocio_id NOT NULL` y aquí el anunciante puede no tener negocio). Engagement = `clicks` de
`publicidad_piezas` (el "ver grande"/zoom en la columna, vía `registrarClickPieza`).

**Clics por anuncio (29-jun):** además del KPI global de clics, `listarPublicidad` trae `clicksTotales` por
anuncio (subquery `SUM(publicidad_piezas.clicks)` por compra, dentro del alcance del rol) → se muestra como
**columna "Clics"** en la lista (desktop) y dato en la card (móvil). La **ficha** muestra el desglose por
pieza + el **total** (en combo).

> **`impresiones` no tiene tracking.** La columna `publicidad_piezas.impresiones` existe pero **ningún código
> la incrementa** (siempre 0), por eso las "vistas" se **quitaron de la UI** (29-jun). Para activarlas habría
> que contar la impresión al mostrar la pieza en `ColumnaDerecha` (endpoint nuevo + regla de conteo con
> throttle) — pendiente, no urgente para la beta.

### Creatividades (R2): medida, optimización + sin huérfanas
El anunciante sube su propia imagen **por tamaño**, con la **medida recomendada a la vista** en el wizard
(Grande **1080×1350 px** 4:5 · Chico **1080×720 px** 3:2 — mismo ancho base, coherente con que en la columna
ambos comparten ancho). El preview de subida toma la **forma real** del espacio (object-cover) para que vea
cómo quedará recortado. Antes de subir, el navegador la **optimiza** (redimensiona a máx. **1600px** y recomprime
a **WebP ~80%** — `optimizarImagen`, el mismo helper de ChatYA/BS/MarketPlace en la app; uno equivalente en el
Panel). La subida usa una **presigned URL** a la carpeta `publicidad/` de R2.

Como la imagen se sube **al elegirla** (antes de guardar), al **cerrar/cancelar** el alta, la edición o el wizard
el front manda las URLs subidas en esa sesión y `descartarImagenesHuerfanas` (`POST /publicidad/imagenes-descartadas`)
**borra de R2 solo las que ningún anuncio referencia** (reference count contra `publicidad_piezas`) y solo de la
carpeta `publicidad/`. Así las guardadas nunca se tocan y las canceladas/reemplazadas se limpian al instante; el
**recolector R2** queda como red de seguridad (p. ej. si se cierra la pestaña a media subida).

**Cobertura de cancelación del wizard `/anunciate` (29-jun).** Cada forma de salir limpia las creatividades
huérfanas: (a) **navegación SPA** (botón ← de la página, cambiar de ruta) → cleanup de React al desmontar →
`descartarImagenesPublicidad` (axios); (b) **refrescar / cerrar pestaña / URL externa** → evento `pagehide` +
`descartarImagenesPublicidadBeacon` (`fetch` con `keepalive`, que sobrevive a la descarga e incluye el token —
`sendBeacon` no se usa porque no permite headers de auth); (c) **red de seguridad** → las URLs se espejan en
`sessionStorage` y, al montar, se descarta lo que una visita anterior dejó pendiente (por si el `keepalive` no
alcanzó); (d) **reemplazar imagen / deseleccionar tamaño** → se descarta la anterior en el momento; (e) **al
pagar** se limpia el registro antes de redirigir (ya quedan ligadas; el reference count y el cron de pendientes
son el respaldo). El reference count hace todo esto **idempotente** (reintentar nunca borra algo ligado).

### Superficie pública (apps/web)
`apps/web/src/components/layout/ColumnaDerecha.tsx` muestra un **solo bloque inline "PUBLICIDAD"** (sin cards)
montado en `MainLayout` solo en **desktop** cuando no es Business Studio. Estructura: el tamaño **Grande**
(banner 4:5) arriba y el **Chico** (tarjeta 3:2) abajo, **proporciones fijas** idénticas a las del wizard;
ambos rotan solos (**crossfade**) y se **pausan al hover**, con puntos indicadores flotando sobre la imagen.
Debajo, los **Fundadores** en un **marquee** continuo de logos (regalo, sin card ni título). El CTA **"Anúnciate
aquí"** queda **fijo abajo** (grafito) y no genera scroll. Los datos vienen del **endpoint público**
`GET /api/publicidad?ciudadId=` (`usePublicidad`): Grande/Chico salen de `publicidad_piezas` vigentes; los
Fundadores se arman desde `negocios.es_fundador` (logo + ciudad de la sucursal principal). El **clic** abre la
imagen en grande (**lightbox**) y cuenta `clicks`; el lightbox se **portea a `document.body`** (`usePortalTarget`)
con `z-[100]` para escapar del stacking context de la columna (`z-30`) y **tapar el header** (`z-50`) y el toggle
Mapa/Lista — si no, su `fixed` quedaba atrapado debajo.

### Decisiones de diseño (Fase 0)
- **Modelo híbrido acotado por ciudades** (no el self-service-Stripe del schema dormido ni el "precio por
  ciudad" del diseño viejo): el precio depende del **carrusel** y del **número** de ciudades (por tramos), no
  de cuál ciudad.
- **Anunciante = cualquier usuario** (personal o comercial) → el anuncio se ata a `usuario_id`.
- **Se vende el espacio**, el anunciante sube su imagen; el clic solo hace zoom (sin destino).
- **Alcance del gerente por ciudades del anuncio** (no por matriz del negocio), para soportar al anunciante
  personal sin región.
- **Folio compartido con membresías**; cortesía sin recibo.
- **Solo desktop**; el wizard self-service vive **únicamente en la columna de carruseles**.

**Decisiones 22-jun (presentación por tamaño + arranque mono-ciudad):**
- **Se vende por TAMAÑO, no por nombre:** Grande (`patrocinadores`) y Chico (`anuncios`); combo de **2**. Sin
  migración de datos — los IDs internos no cambian, solo las etiquetas (centro en `CARRUSEL_LABEL`).
- **Fundadores salió del plan de pago** (es regalo): `CARRUSELES_VALIDOS` y la config de precios quedaron en 2.
- **Proporciones fijas e idénticas columna↔wizard** (Grande 4:5 · Chico 3:2) para que el anunciante diseñe a
  la medida; el wizard **publica la medida en px** de cada tamaño.
- **Paso de ciudades dinámico:** se basa en **cuántas ciudades están activas** (no en el límite por anuncio);
  con una sola se oculta y auto-selecciona. Para arrancar mono-ciudad se **desactivan** las demás en Ciudades.
- **Lightbox por portal** (`document.body`, `z-[100]`) para tapar el header y el toggle Mapa/Lista.

### Plan de construcción (carril) — estado
1. **Schema + migraciones** ✅ (`2026-06-21-publicidad.sql` + `-drop-publicidad-dormida.sql` + `-estado-pendiente.sql`).
2. **Fase 1 — VER** ✅ — backend lectura + sección del Panel (lista/ficha) + endpoint público + columna desktop real.
3. **Fase 2 — ACTUAR** ✅ — acciones de estado (pausar/reactivar/cancelar/**editar**: ciudades·carruseles·imágenes sin tocar el cobro) · **KPIs de cabecera** (activos · ingresos · clics · por vencer, en el alcance del rol) · configuración económica (editores dedicados de tramos de ciudades
   y de **periodos de meses**) · **meses por adelantado con descuento por volumen** (precio + vigencia × meses, pago
   único) · alta manual + cortesía · wizard self-service con Stripe (pago único + webhook + estado `pendiente`) ·
   recibo PDF + correo · cron de expiración/aviso/**limpieza de pendientes abandonados** · tracking de clics · extender Recibos.
4. **Fase 3 — Cerrar** ✅ — doc + checklist + tablero + memoria actualizados; **committeado**.

### Archivos del módulo (mapa)
- **Backend:** `services/admin/publicidad.service.ts` (lectura + **KPIs** `obtenerKpisPublicidad`) · `publicidad-acciones.service.ts` (estado + **`editarAnuncio`**) · `publicidad-alta.service.ts` ·
  `recibo-publicidad.service.ts` · `services/publicidad-precio.service.ts` · `publicidad-checkout.service.ts` ·
  `publicidad-mantenimiento.service.ts` · `publicidadPublica.service.ts` · `controllers/admin/publicidad.controller.ts` ·
  `controllers/publicidadPublica.controller.ts` · `routes/admin/publicidad.routes.ts` · `routes/publicidadPublica.routes.ts` ·
  `cron/publicidad.cron.ts`. Config en `services/admin/configuracion*.service.ts` (claves + `validarTramosCiudades` + `validarPeriodos`);
  precio/periodos en `services/publicidad-precio.service.ts` (`calcularPrecioPublicidad(carruseles, ciudades, meses)` + `obtenerPeriodos`).
- **Panel (apps/admin):** `components/publicidad/{SeccionPublicidad (banda de KPIs + filtro por tamaño),FichaPublicidad (acciones en íconos en el header, vía `AccionesFicha`),DialogoAltaManual,DialogoEditarAnuncio,presentacionPublicidad}`
  (`presentacionPublicidad.CARRUSEL_LABEL` es el **centro de las etiquetas por tamaño** → Grande/Chico; el alta manual incluye **selector de periodo**) · acción `publicidad_editar` en `accionesAuditoria.tsx` · `components/configuracion/{SeccionConfiguracion (pestañas Membresía/Publicidad, "Precios por tamaño"),DialogoTramosCiudades,DialogoPeriodos}.tsx` ·
  `services/publicidadService.ts` · `hooks/queries/usePublicidadAdmin.ts`. Etiquetas de config en `services/admin/configuracion.service.ts` ("Precio · Grande/Chico").
- **App (apps/web):** `components/layout/ColumnaDerecha.tsx` (bloque inline **"PUBLICIDAD"** Grande+Chico con proporciones fijas + Fundadores en marquee + lightbox por portal + botón "Anúnciate aquí" → navega a `/anunciate`) ·
  **`pages/private/publicidad/PaginaAnunciate.tsx`** (compra self-service en **página dedicada**: tamaños con **medida**, **paso de ciudades dinámico** vía `useCiudades`,
  **selector de meses** y desglose de precio línea por línea; reemplazó el modal; **precio de lanzamiento tachado**, **paleta slate/tokens AY**, **limpieza de huérfanas** vía `pagehide`/`keepalive` + `sessionStorage`) · `components/ui/LogoStripe.tsx` (wordmark oficial de Stripe, reutilizable; también en `pages/public/PaginaRegistroExito.tsx`) · `services/publicidadService.ts` (`descartarImagenesPublicidadBeacon`) · `hooks/queries/{usePublicidad,useCiudades}.ts`.
- **Harness (apps/api/scripts):** `verificar-publicidad` · `sembrar-publicidad-dev` · `probar-publicidad-{lectura,acciones,precio,alta,checkout,mantenimiento}` · `probar-recibos-publicidad`.

---

## Referencias
- **Checklist vivo:** [`Publicidad_Pendientes.md`](Publicidad_Pendientes.md).
- **Diseño general del Panel:** [`Panel_Admin.md`](Panel_Admin.md) §7 · **Tokens:** [`Tokens_Panel.md`](Tokens_Panel.md).
- **Carril:** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
- **Superficie pública:** `apps/web/src/components/layout/ColumnaDerecha.tsx`.
