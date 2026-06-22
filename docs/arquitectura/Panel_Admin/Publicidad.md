# Publicidad — Panel Admin (módulo 7)

> **Estado:** ✅ **Construido de punta a punta** — Fases 0, 1 (VER) y 2 (ACTUAR) cerradas: lectura + **KPIs**
> (activos · ingresos · clics · por vencer) · acciones de estado + **editar** (sin tocar el cobro) · configuración
> económica (precios + tramos por ciudad + **periodos de meses**, editores dedicados) · **meses por adelantado**
> con descuento · alta manual + cortesía · **wizard self-service con Stripe** (pago único) · cron de expiración +
> aviso + limpieza de pendientes · recibo PDF + correo + módulo **Recibos** extendido. Las creatividades se
> **optimizan** (WebP) y no quedan **huérfanas** (reference count + recolector R2). Modales **horizontales** +
> acciones de la ficha en **íconos**. Verificado con harness + `tsc` en api/admin/web; VER verificado visualmente.
> **Pendiente:** commit (Fase 3) + sumar el origen del Panel/app al **CORS del bucket R2** (migraciones ya corridas).
> **Sección del menú:** Crecimiento. **Plantilla de oro:** Negocios.
> **Última actualización:** 21 Junio 2026.
>
> Este documento es la **verdad** del módulo (qué es y cómo funciona). El checklist vivo de lo
> que falta está en [`Publicidad_Pendientes.md`](Publicidad_Pendientes.md). El proceso de
> construcción, en el carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).

---

## Capa 1 — Qué es (lenguaje de persona)

**Publicidad es la segunda fuente de ingresos de AnunciaYA:** vende el **espacio** en los **3 carruseles
de la columna derecha** de la app — **Anuncios** (tarjeta chica), **Patrocinadores** (banner grande) y
**Fundadores** (logos) — a cualquier usuario que quiera más visibilidad. No es publicidad de terceros ni
venta de datos: el que pauta es un **usuario verificado** de la propia plataforma (un negocio o una
persona) que sube **su propia imagen**. AnunciaYA solo renta el espacio.

### Los 3 carruseles
Cada carrusel **cuesta distinto**, pero el **precio es igual en cualquier ciudad**. Hay además un **combo
de los 3 con descuento**. Los precios, el descuento y los umbrales los fija **solo el SuperAdmin**.

| Carrusel | Qué es | Formato de la imagen |
|---|---|---|
| **Anuncios** | Tarjeta chica que rota | horizontal pequeño |
| **Patrocinadores** | Banner grande con CTA | vertical grande |
| **Fundadores** | Logo circular | cuadrado / logo |

### Acotado por ciudades
El anunciante elige **hasta *X* ciudades** donde quiere aparecer. **Mientras más ciudades, más caro**, por
una **escalera de tramos** (no por cuál ciudad — todas valen igual). El límite *X* y los tramos los
configura el SuperAdmin desde **Configuración**. El anuncio se muestra a quien tenga como **ciudad activa**
una de las ciudades compradas.

### Meses por adelantado
El anunciante elige **cuántos meses paga por adelantado** (1 / 3 / 6 / 12 — configurable). Cada periodo da un
**% de descuento por volumen** y **extiende la vigencia**: `vigencia = meses × publicidad_duracion_dias`. El
cobro sigue siendo **pago único** (sin renovación automática). Los periodos y sus descuentos los fija el
SuperAdmin desde **Configuración** (clave `publicidad_periodos`). Total:
`total = (Σ precios_base) × factorCiudades × (combo) × meses × (1 − descuentoPeriodo%)`.

### Dónde se ve
En **todas las secciones** de la app que tengan la columna de carruseles, pero **solo en computadora
(desktop)** — en **móvil no hay publicidad**. El **clic** sobre un anuncio **solo agranda la imagen** (no
lleva a ningún lado).

### Cómo se compra (dos vías)
1. **Self-service (el propio usuario):** desde un **botón "Anúnciate aquí" en la misma columna de
   carruseles** (no desde Business Studio ni otro lugar). El usuario recorre la **página `/anunciate`**: elige
   carrusel(es) → ciudades → **meses** → sube su imagen → **paga con tarjeta** (Stripe). El anuncio nace en estado
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
de ciudades · periodos de meses) además de los numéricos:
- `publicidad_precio_anuncios` · `publicidad_precio_patrocinadores` · `publicidad_precio_fundadores` (MXN, base por carrusel).
- `publicidad_combo_descuento` (% del combo de los 3).
- `publicidad_tramos_ciudades` (JSON, escalera por # de ciudades → factor; tipo `tramos_ciudades`).
- `publicidad_limite_ciudades` (*X* máximo).
- `publicidad_duracion_dias` (vigencia base de **1 mes**; la total = meses × esta).
- `publicidad_aviso_dias` (días antes de vencer para avisar; default **3**).
- `publicidad_periodos` (JSON, meses pagables por adelantado → % descuento; tipo `periodos_meses`). Default: 1→0% · 3→10% · 6→15% · 12→25%.

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
asume `negocio_id NOT NULL` y aquí el anunciante puede no tener negocio). Engagement = `clicks`/`impresiones`
de `publicidad_piezas`.

### Creatividades (R2): optimización + sin huérfanas
El anunciante sube su propia imagen por carrusel. Antes de subir, el navegador la **optimiza** (redimensiona a
máx. **1600px** y recomprime a **WebP ~80%** — `optimizarImagen`, el mismo helper de ChatYA/BS/MarketPlace en la
app; uno equivalente en el Panel). La subida usa una **presigned URL** a la carpeta `publicidad/` de R2.

Como la imagen se sube **al elegirla** (antes de guardar), al **cerrar/cancelar** el alta, la edición o el wizard
el front manda las URLs subidas en esa sesión y `descartarImagenesHuerfanas` (`POST /publicidad/imagenes-descartadas`)
**borra de R2 solo las que ningún anuncio referencia** (reference count contra `publicidad_piezas`) y solo de la
carpeta `publicidad/`. Así las guardadas nunca se tocan y las canceladas/reemplazadas se limpian al instante; el
**recolector R2** queda como red de seguridad (p. ej. si se cierra la pestaña a media subida).

### Superficie pública (apps/web)
Hoy `apps/web/src/components/layout/ColumnaDerecha.tsx` muestra los 3 carruseles con **datos mock**
hardcodeados, montada en `MainLayout` solo en **desktop** cuando no es Business Studio. Fase 1 conecta esos
carruseles a un **endpoint público** (`GET /api/publicidad?ciudadId=`) que sirve los anuncios vigentes de la
ciudad activa. El clic abre la imagen en grande (lightbox) y cuenta `clicks`.

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

### Plan de construcción (carril) — estado
1. **Schema + migraciones** ✅ (`2026-06-21-publicidad.sql` + `-drop-publicidad-dormida.sql` + `-estado-pendiente.sql`).
2. **Fase 1 — VER** ✅ — backend lectura + sección del Panel (lista/ficha) + endpoint público + columna desktop real.
3. **Fase 2 — ACTUAR** ✅ — acciones de estado (pausar/reactivar/cancelar/**editar**: ciudades·carruseles·imágenes sin tocar el cobro) · **KPIs de cabecera** (activos · ingresos · clics · por vencer, en el alcance del rol) · configuración económica (editores dedicados de tramos de ciudades
   y de **periodos de meses**) · **meses por adelantado con descuento por volumen** (precio + vigencia × meses, pago
   único) · alta manual + cortesía · wizard self-service con Stripe (pago único + webhook + estado `pendiente`) ·
   recibo PDF + correo · cron de expiración/aviso/**limpieza de pendientes abandonados** · tracking de clics · extender Recibos.
4. **Fase 3 — Cerrar** 🟡 — doc + checklist + tablero + memoria actualizados; **commit pendiente** (lo hace Juan).

### Archivos del módulo (mapa)
- **Backend:** `services/admin/publicidad.service.ts` (lectura + **KPIs** `obtenerKpisPublicidad`) · `publicidad-acciones.service.ts` (estado + **`editarAnuncio`**) · `publicidad-alta.service.ts` ·
  `recibo-publicidad.service.ts` · `services/publicidad-precio.service.ts` · `publicidad-checkout.service.ts` ·
  `publicidad-mantenimiento.service.ts` · `publicidadPublica.service.ts` · `controllers/admin/publicidad.controller.ts` ·
  `controllers/publicidadPublica.controller.ts` · `routes/admin/publicidad.routes.ts` · `routes/publicidadPublica.routes.ts` ·
  `cron/publicidad.cron.ts`. Config en `services/admin/configuracion*.service.ts` (claves + `validarTramosCiudades` + `validarPeriodos`);
  precio/periodos en `services/publicidad-precio.service.ts` (`calcularPrecioPublicidad(carruseles, ciudades, meses)` + `obtenerPeriodos`).
- **Panel (apps/admin):** `components/publicidad/{SeccionPublicidad (banda de KPIs),FichaPublicidad (acciones en íconos en el header, vía `AccionesFicha`),DialogoAltaManual,DialogoEditarAnuncio,presentacionPublicidad}`
  (el alta manual incluye **selector de periodo**) · acción `publicidad_editar` en `accionesAuditoria.tsx` · `components/configuracion/{DialogoTramosCiudades,DialogoPeriodos}.tsx` ·
  `services/publicidadService.ts` · `hooks/queries/usePublicidadAdmin.ts`.
- **App (apps/web):** `components/layout/ColumnaDerecha.tsx` (carruseles + botón "Anúnciate aquí" → navega a `/anunciate`) ·
  **`pages/private/publicidad/PaginaAnunciate.tsx`** (compra self-service en **página dedicada**: carruseles + ciudades +
  **selector de meses** y desglose de precio línea por línea; reemplazó el modal) · `services/publicidadService.ts` · `hooks/queries/usePublicidad.ts`.
- **Harness (apps/api/scripts):** `verificar-publicidad` · `sembrar-publicidad-dev` · `probar-publicidad-{lectura,acciones,precio,alta,checkout,mantenimiento}` · `probar-recibos-publicidad`.

---

## Referencias
- **Checklist vivo:** [`Publicidad_Pendientes.md`](Publicidad_Pendientes.md).
- **Diseño general del Panel:** [`Panel_Admin.md`](Panel_Admin.md) §7 · **Tokens:** [`Tokens_Panel.md`](Tokens_Panel.md).
- **Carril:** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
- **Superficie pública:** `apps/web/src/components/layout/ColumnaDerecha.tsx`.
