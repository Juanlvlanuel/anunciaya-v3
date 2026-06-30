# Publicidad — Pendientes (checklist vivo)

> Lo que **falta** del módulo 7 (Publicidad). Lo que ya **es** vive en [`Publicidad.md`](Publicidad.md).
> Cuando un pendiente se termina, **sale** de aquí y, si cambió el comportamiento, **entra** al doc canónico.
>
> **Última actualización:** 29 Junio 2026.

## Estado: Fase 0-2 ✅ · **Módulo CERRADO de punta a punta** · committeado · CORS R2 resuelto · solo queda backlog

### Fase 0 — Definir ✅
- [x] Mini-spec (qué hace / qué no / matriz de permisos por rol) → en `Publicidad.md`.
- [x] Decisiones de diseño + migración SQL (modelo híbrido acotado por ciudades; 3 tablas).
- [x] Criterios de aceptación escritos (abajo).
- [x] Schema (`publicidad_compras` / `publicidad_piezas` / `publicidad_compra_ciudades`) en `schema.ts` + `relations.ts`.
- [x] Migración `2026-06-21-publicidad.sql` (crear) + `2026-06-21-drop-publicidad-dormida.sql` (jubilar `planes_anuncios`/`promociones_pagadas`).
- [x] **Correr ambas migraciones en DEV y PROD** ✅ (Juan, 21 jun — verificado con `verificar-publicidad.ts`: tablas creadas + dormidas jubiladas).

### Fase 1 — VER ✅ construida (typecheck verde)
- [x] Backend lectura: `routes/admin/publicidad.routes.ts → controllers/admin/publicidad.controller.ts → services/admin/publicidad.service.ts` (lista + ficha + conteo) con alcance por rol (super total · gerente por ciudades del anuncio en su región · vendedor 403). Montado antes del gate global.
- [x] Frontend Panel: `services/publicidadService.ts → hooks/queries/usePublicidadAdmin.ts` (RQ + `keepPreviousData` + prefetch) → `SeccionPublicidad` (tabla/cards + filtros estado/carrusel/origen/orden + paginación) + `FichaPublicidad` (modal con piezas/ciudades/pago) + `presentacionPublicidad.ts`. Montada en `PaginaPanel` + prefetch en hover. `data-testid` en todo lo interactivo. (El ítem "Publicidad" ya estaba en `menuPanel`.)
- [x] Endpoint público `GET /api/publicidad?ciudadId=` (`publicidadPublica.{service,controller,routes}.ts`, montado en `routes/index.ts`) — anuncios vigentes de la ciudad, agrupados por carrusel.
- [x] Conectar `apps/web/.../ColumnaDerecha.tsx` (antes mock) a datos reales (`usePublicidad` resuelve `ciudadId` del catálogo) + **lightbox** del clic (la imagen se agranda) + placeholder "Espacio disponible" + `/publicidad` en `RUTAS_SIN_SUCURSAL`.
- [x] **GATE 1: verificado con DATOS REALES** ✅ — seed `sembrar-publicidad-dev.ts` (2 anuncios en Puerto Peñasco) + harness `probar-publicidad-lectura.ts` **TODO VERDE**: super ve 2 · conteos cuadran · ficha combo (3 piezas + ciudad + folio 25, correlativo con membresías) · alcance del gerente por ciudades del anuncio (su región ve 2, otra región 0, sin región 0) · endpoint público (anuncios 2 / patrocinadores 1 / fundadores 1). Pendiente solo la verificación VISUAL opcional de la UI (Panel + columna en desktop).
- [x] Conteo de `clicks` desde la columna pública (POST de tracking) ✅ (hecho en Fase 2, ver abajo). _Impresiones: aún no._
- [ ] Búsqueda por anunciante en la sección del Panel (el backend ya la soporta; el front aún no la expone) → menor.

### Fase 2 — ACTUAR  *(acciones ✅ · configuración ✅ · alta manual ✅ · wizard+Stripe ✅ · cron+tracking ✅ — falta solo recibo PDF + Recibos)*

> **Migraciones aplicadas (dev+prod):** las 3 de Publicidad ya corrieron, incluida `2026-06-21-publicidad-estado-pendiente.sql` (estado `pendiente` del wizard). La activación del anuncio pagado quedó verificada (folio correlativo, idempotente).
- [x] **Acciones de estado** (`publicidad-acciones.service.ts` + controllers + rutas): **pausar/reactivar** (super+gerente) y **cancelar** (solo super), con alcance por ciudades del anuncio + guards (409) + auditoría (`publicidad_pausar/_reactivar/_cancelar`). Frontend: footer por rol en la ficha + mutaciones RQ con invalidación + `DialogoConfirmar`. Verificado con harness `probar-publicidad-acciones.ts` **TODO VERDE** (guards + alcance super/gerente/región + auditoría). tsc api+admin verde.
- [x] **Alta manual + cortesía (solo super)** ✅ — `publicidad-alta.service.ts` (alcance super/gerente · cortesía solo super · folio de la secuencia global · transacción compra+piezas+ciudades · auditoría) + endpoint presigned R2 (`POST /publicidad/upload-imagen`) + endpoints `GET /publicidad/{precio,opciones}`. Frontend `DialogoAltaManual.tsx` (correo · carruseles+imágenes · ciudades · cobro · precio en vivo) + botón en la sección. Harness `probar-publicidad-alta.ts` **TODO VERDE**. ⚠️ **Operativo:** agregar el origen del Panel al CORS del bucket R2 para que la imagen suba desde el navegador.
- [x] **Wizard self-service + Stripe** ✅ — pago ÚNICO (`mode:'payment'`): `publicidad-checkout.service.ts` (crea anuncio `pendiente` + Checkout Session con `metadata.tipo='compra_publicidad'`) + branch en `manejarCheckoutCompletado` del webhook → `activarPublicidadPagada` (estado→activa + folio de la secuencia global + PaymentIntent, **idempotente** + recibo/correo) + `POST /publicidad/checkout`. Frontend **página dedicada** `pages/private/publicidad/PaginaAnunciate.tsx` (apps/web): carruseles + ciudades + **selector de meses** + desglose línea por línea; entrada desde el botón "Anúnciate aquí" de la columna. Harness `probar-publicidad-checkout.ts` **VERDE** + activación verificada (folio correlativo, idempotente). tsc api+web+admin verde.
- [x] **Claves de Configuración** ✅ — 9 claves de Publicidad en `CONFIG_EDITABLE` (categoría "Publicidad"): precios base ×3 · % combo · límite *X* · duración · días de aviso (numéricas) + **multiplicador por ciudades** (`tramos_ciudades`) + **periodos de meses** (`periodos_meses`). Editores **dedicados**: `DialogoTramosCiudades.tsx` (+`validarTramosCiudades`, empieza en 1 ciudad, valor = factor) y `DialogoPeriodos.tsx` (+`validarPeriodos`, exige opción de 1 mes, meses únicos, descuento 0–90 %) — ninguno toca la escalera de comisiones.
- [x] **Cálculo de precio + meses por adelantado** ✅ — `publicidad-precio.service.ts` (`calcularPrecioPublicidad(carruseles, ciudades, meses)`): `mensual = (Σ precios base) × factor(tramo) × (1−descuento si combo)`, `total = mensual × meses × (1−descuentoPeriodo)`. Cobro **pago único**; los meses extienden la vigencia (`meses × publicidad_duracion_dias`). Selector de meses en `/anunciate` y en el alta manual del Panel. Harness `probar-publicidad-precio.ts` **TODO VERDE** (9 cálculos + 9 validaciones).
- [x] **Recibo PDF + correo al pagar + extender Recibos** ✅ — `recibo-publicidad.service.ts` (reusa `generarReciboPagoPDF`, carpeta R2 `recibos`, folio de la secuencia global) + `enviarComprobantePublicidad`, integrado en el alta manual y en `activarPublicidadPagada` (wizard); cortesía = correo sin recibo. **Recibos del Panel extendido** (`recibos.service.ts` reescrito a UNION membresía+publicidad, alcance por rol —vendedor NO ve publicidad—, descargar/reenviar por `origen`). Harness `probar-recibos-publicidad.ts` **TODO VERDE** (2 pub + 14 mem, búsqueda por folio, alcance).
- [x] **Cron de expiración + aviso + limpieza de pendientes** ✅ — `publicidad-mantenimiento.service.ts` (expira `activa`+vencida → `expirada`; **`limpiarPendientesAbandonados`** borra los `pendiente` con >2 h —checkout rechazado/abandonado, cascade se lleva piezas+ciudades, R2 lo recoge el recolector—; avisa por correo 3 días antes con `aviso_vencimiento_enviado` anti-repetición) + `publicidad.cron.ts` (cada 12h, registrado en `index.ts`). Los `pendiente` además se **ocultan del listado/conteo del Panel** y la sesión de Stripe caduca en 1h (`expires_at`). Harness `probar-publicidad-mantenimiento.ts` **VERDE** (expiración).
- [x] **Subida a R2 + imageRegistry** ✅ — presigned (`/publicidad/upload-imagen`) + `publicidad_piezas.imagen_url` registrada en `imageRegistry.ts` (el recolector no la borra).
- [x] **Tracking de clics** ✅ — `POST /publicidad/pieza/:id/click` + la columna lo registra al ampliar la imagen.
- [x] **Editar anuncio + KPIs de cabecera** ✅ — **Editar** (`editarAnuncio` + `PATCH /admin/publicidad/:id`): cambia ciudades·carruseles·imágenes, **sin tocar el cobro** (monto/folio/recibo intactos; reconcilia piezas conservando clics; ciudades por reemplazo); alcance super+gerente (gerente solo ciudades de su región, igual que el alta); auditoría `publicidad_editar`. UI: `DialogoEditarAnuncio.tsx` + botón **Editar** en la ficha (estado activa/pausada). **KPIs** (`obtenerKpisPublicidad` + `GET /admin/publicidad/kpis`): activos · ingresos (cobrado, sin cortesía/pendiente) · clics · por vencer (≤7 días), respetando el alcance por rol; banda en `SeccionPublicidad`. Las acciones `publicidad_*` (incl. editar) se agregaron al catálogo de **auditoría** (`accionesAuditoria.tsx`). Harness `probar-publicidad-acciones.ts` **TODO VERDE** (editar conserva clics / no toca monto / alcance 403 + KPIs). tsc api+admin verde.
- [x] **Creatividades: optimización + sin huérfanas + UI horizontal** ✅ — las imágenes se **optimizan** en el navegador (WebP, máx 1600px — `optimizarImagen`, reusa el helper de ChatYA/BS en la app; uno propio en el Panel) antes de subir; como se suben al elegirlas, al cerrar/cancelar (alta/editar/wizard) el front manda las URLs de la sesión a `descartarImagenesHuerfanas` (`POST /publicidad/imagenes-descartadas`), que borra de R2 **solo las no referenciadas** (reference count vs `publicidad_piezas`, solo carpeta `publicidad/`); el recolector R2 queda de respaldo. **UI:** modales **Registrar** y **Editar** rediseñados horizontales (ancho `2xl` nuevo en `ModalAdaptativo` + 2 columnas) + acciones de la ficha como **íconos en el header** (`AccionesFicha`, como Usuarios) + KPIs inline en la fila de filtros. tsc api+admin+web verde.
- [x] **GATE 2 + pulido visual** ✅ — harness `probar-publicidad-*.ts` verdes (lectura · acciones+editar+KPIs · precio+meses · alta · checkout · mantenimiento · recibos) + `tsc` api/admin/web. Modales horizontales (lg:grid · `2xl`) + acciones en íconos + KPIs inline; responsive lg/2xl.

### Fase 3 — Cerrar
- [x] `Publicidad.md` (doc canónico) al día + este checklist actualizado.
- [x] Índices: tablero de módulos, `Panel_Admin.md`, memoria, CHANGELOG.
- [x] **Commit a `main`** ✅ (módulo completo + recibo/correo de publicidad + molde de PDF + periodo).
- [x] **CORS del bucket R2** ✅ — el origen del **Panel** (`admin.anunciaya.mx`/`localhost:3100`) ya está en la CORS Policy del bucket (Juan lo agregó para los comprobantes de Vendedores); la app (`anunciaya.mx`) ya subía imágenes de antes. La subida de creatividades funciona desde el Panel y el wizard.
- [x] **Recibo de publicidad** ✅ — **correo** con plantilla rica (banner + bloque-recibo) como membresía; **PDF** con molde propio `plantilla-recibo-publicidad.pdf` (seleccionable por `tipoRecibo`, con fallback) + el campo **Periodo** poblado (meses por adelantado derivados de la vigencia). El molde lo subió Juan a `apps/api/src/assets/recibo/`.
- [x] **Fundadores = regalo (fuera del plan de pago)** ✅ — el carrusel Fundadores **ya no se vende**: el combo pasa a **2** (Anuncios+Patrocinadores), se quitó de las opciones de compra (alta/editar/wizard) y de Configuración (`publicidad_precio_fundadores` fuera). Se otorga **manual** desde la **ficha del negocio** (toggle "Marcar Fundador" en `AccionesFicha`, super+gerente, cupo **50/ciudad**, exige `logo_url` + sucursal principal con ciudad) → `negocios.es_fundador` + `marcarDesmarcarFundador` + `POST /admin/negocios/:id/marcar-fundador` + auditoría (`negocio_marcar/quitar_fundador`). El carrusel **público** arma fundadores desde esos negocios (su logo, por la ciudad de su sucursal principal). En la app, los logos **flotan** sin card ni título (rotan solos, pausan al hover); la columna también quita su fondo (deja ver el de la app) y el CTA "Anúnciate aquí" quedó **grafito**. tsc api+admin+web verde + harness de precio (combo de 2).
- [x] **Migración `2026-06-22-negocios-fundador.sql`** ✅ (Juan, dev+prod) — `negocios.es_fundador` + índice parcial.

### Iteración 22-jun (presentación por tamaño + columna + wizard dinámico + fix de Configuración) ✅
- [x] **Presentación por TAMAÑO (Grande/Chico)** ✅ — la pauta se vende y muestra por **tamaño** en vez de por nombre de carrusel: **Grande**=`patrocinadores`, **Chico**=`anuncios` (sin migración de datos; centro en `presentacionPublicidad.CARRUSEL_LABEL`). Cubre wizard, alta, editar, filtro del Panel, Configuración ("Precios por tamaño", "Precio · Grande/Chico"), recibo (PDF+correo "Grande, Chico") y el orden de piezas. tsc api+admin+web verde.
- [x] **Columna derecha rediseñada** ✅ — un solo bloque inline **"PUBLICIDAD"** (sin cards): Grande (4:5) arriba + Chico (3:2) abajo con **proporciones fijas**, crossfade + pausa-al-hover + puntos flotantes; Fundadores en **marquee**; CTA grafito fijo abajo. **Lightbox por portal** (`document.body`, `z-[100]`) que tapa el header (`z-50`) y el toggle Mapa/Lista.
- [x] **Wizard: medida por tamaño + paso de ciudades dinámico** ✅ — cada tamaño publica su **medida** (Grande 1080×1350 4:5 · Chico 1080×720 3:2, mismo ancho base) y el preview toma la forma real. El paso **"¿En qué ciudades?"** se **oculta y auto-selecciona** cuando hay **1 sola ciudad activa** (vía `useCiudades`, React Query); reaparece al habilitar más, con numeración de pasos dinámica.
- [x] **CHECKs de `configuracion_sistema` ampliados** ✅ (2 migraciones, Juan dev+prod: `2026-06-22-configuracion-categoria-publicidad.sql` + `-tipo-publicidad.sql`) — `configuracion_categoria_check` acepta `publicidad`; `configuracion_tipo_check` acepta `tramos_ciudades`/`periodos_meses`. Sin ellos, guardar config de Publicidad por primera vez fallaba (error 23514). `schema.ts` al día.

### Iteración 29-jun (precio de lanzamiento · clics por anuncio · sello Stripe · tokens · renovación) ✅
- [x] **Precio de lanzamiento por tamaño**, **clics por anuncio** (lista+ficha; vistas fuera de la UI), **sello Stripe** (wordmark), **wizard repintado a tokens** y **limpieza de huérfanas reforzada** — ver `Publicidad.md` (Cambios 29-jun). Committeado (`11f6516`).
- [x] **Renovar / extender un anuncio** desde Mi Perfil ✅ — migración `2026-06-29-publicidad-renovacion.sql` (`renovacion_de`, **corrida dev+prod**); `publicidad-renovacion.service.ts` (`crearCheckoutRenovacion` + `activarRenovacionPublicidad` + `obtenerAnuncioRenovable` + `reconciliarPiezasYCiudades`); webhook `renovacion_publicidad`; endpoints `GET /publicidad/mio/:id` + `POST /publicidad/renovar/:id`; filtros `renovacion_de IS NULL` (carrusel/Panel/KPIs/Mi Perfil), ingresos sí cuenta, Recibos sí lista; wizard `/anunciate` en **modo renovación** (precarga + extiende). **Nota de despliegue:** el botón "Renovar" vive en `SeccionMiPublicidad.tsx` y el filtro en `membresia.service.ts` (backend) — ambos comparten archivo con el feature **Mi Perfil** (sin commitear aún), así que el **punto de entrada sube con el commit de Mi Perfil**; el backend + el modo renovación del wizard se subieron aparte. `tsc` api/admin/web verde.
- [x] **Fix `es_combo`** ✅ — se calculaba con `=== 3` (combo viejo de 3 carruseles); ahora `=== 2` en `crearCheckoutPublicidad` y `editarAnuncio`. Backfill en BD corrido por Juan (compras con 2 piezas → `es_combo=true`).

---

## Criterios de aceptación (Definición de Terminado)
1. El SuperAdmin fija precio base de los **2 tamaños** (Grande/Chico) + tramos por #ciudades + límite *X* + % del combo; cambiarlos **no** afecta anuncios ya vendidos.
2. Un usuario compra un anuncio por el wizard (desde la columna), paga con tarjeta, sube imagen → se ve en sus ciudades, en toda la app **en desktop**, hasta expirar.
3. El Gerente da de alta manual un anuncio (efectivo) en su región; **no** puede dar cortesía; el SuperAdmin sí.
4. El Gerente solo ve/controla anuncios con ≥1 ciudad en su región; el SuperAdmin ve todo (con lente de región). El Vendedor recibe 403.
5. El carrusel público muestra solo anuncios **vigentes** cuya ciudad coincide con la del usuario; el clic agranda la imagen y suma un `click`.
6. Al pagar (self o manual) llega correo + **recibo PDF foliado** (numeración continua con membresías), visible en **Recibos** (super/gerente; vendedor no).
7. **3 días antes** de vencer, llega el correo de aviso (una sola vez).
8. Métricas: **KPIs de cabecera** (activos · ingresos · clics · por vencer ≤7d) en el alcance del rol. ✅

## Decisiones tomadas (con default, revisables)
- Anuncio que toca 2 regiones: ambos gerentes lo ven/gestionan; **cancelar = solo super**.
- **Cortesía** no genera recibo de pago (sin cobro), pero sí correo de "publicidad activa".
- Aviso por vencer = **solo correo** (sin campana por ahora).
- **Combo** = una compra/pago/recibo, mismas ciudades y periodo, **2 imágenes** (una por tamaño: Grande + Chico).

## Backlog / futuro
- Que el clic lleve a un destino (perfil/oferta/link) en vez de solo zoom.
- Publicidad en móvil.
- Métricas avanzadas (CTR, por ciudad).
- Cobro automático de efectivo de la publicidad enganchado a la cartera del vendedor (si algún día el vendedor la vende).
- **Tope de inventario + tiempo visible configurables por carrusel** (ver "Inventario y rotación" abajo) — proteger el valor del espacio cuando escale. No urgente para la beta.
- **Conteo de impresiones/"vistas"** — la columna `publicidad_piezas.impresiones` existe pero nada la incrementa; las vistas se retiraron de la UI (29-jun). Para activarlas: contar al mostrar la pieza en `ColumnaDerecha` (endpoint + regla de conteo con throttle).
- **Limpieza de creatividades al cancelar/eliminar (R2)** — cada pago (inicial + renovaciones) conserva su imagen en `publicidad_piezas` para el historial visual de "Tu publicidad", así que esas imágenes **no se limpian** (nunca quedan huérfanas). Mejora: al **cancelar/archivar** un anuncio, borrar de R2 todas las imágenes de sus filas de pago (con reference count). No urgente para la beta (volumen mínimo).

---

## Inventario y rotación de la columna (análisis + mejora futura)

> Anotado el **29-jun** a partir de una conversación con Juan. **No construido** — decidido en papel para cuando escale.

### Estado actual (HOY): inventario ILIMITADO
Los carruseles de publicidad **crecen sin límite y muestran TODOS los anuncios** que se vendan:
- **Backend** ([`publicidadPublica.service.ts`](../../../apps/api/src/services/publicidadPublica.service.ts) → `listarPublicidadPublica`): la query trae **todas** las piezas vigentes de la ciudad para Grande (`patrocinadores`) y Chico (`anuncios`), ordenadas por `prioridad DESC, createdAt DESC`. **No hay `LIMIT`.**
- **Front** ([`ColumnaDerecha.tsx`](../../../apps/web/src/components/layout/ColumnaDerecha.tsx)): el carrusel rota sobre el arreglo completo (`useCarruselAuto(grandes.length, 6000)` · Chico `4500`ms), **sin `slice`/recorte**. Los puntos indicadores reflejan el total real.
- ⚠️ Nota: el `publicidad_limite_ciudades` ("Máximo de ciudades", config) es el tope de **ciudades por anuncio**, **NO** un tope de anuncios por carrusel. No existe ese segundo tope.

### El problema cuando escale: dilución 1/N
El espacio **visible es fijo** (siempre **1 Grande + 1 Chico a la vez**, rotando). Lo que crece es la cola de rotación, así que cada anuncio recibe una **cuota de pantalla de `1/N`** (N = anuncios de ese tamaño en la ciudad). Más ventas → cada anuncio se ve menos seguido → el espacio "premium" se devalúa solo, y no hay forma de cobrar la escasez.

### Las dos palancas (y por qué una NO sustituye a la otra)
1. **Tope de inventario** (máx. anuncios activos por **ciudad × tamaño**): arregla la **cuota** (garantiza un mínimo de pantalla por anuncio) y crea **escasez cobrable**. Al llegar al cupo: "agotado en esta ciudad" o lista de espera.
2. **Tiempo visible por anuncio** (hoy hardcoded 6s Grande / 4.5s Chico): mejora la **calidad** de cada aparición (más segundos de lectura) y el **ritmo**, pero **NO** arregla la dilución. Matemática: si cada anuncio dura `t` y hay `N`, cada uno se ve `t` seg pero vuelve cada `N×t` seg → cuota = `t/(N×t)` = **1/N**, **independiente de `t`**. El tiempo se cancela.

**Son complementarias:** el tope protege el valor; el tiempo afina la experiencia.

### Diseño propuesto (cuando se construya)
- Hacer **configurables desde el Panel** (Configuración → Publicidad) el **tiempo de rotación** por tamaño y un **tope de anuncios activos por ciudad×tamaño** (hoy ambos son constantes en el código).
- Idealmente **amarrar las dos** a una promesa de visibilidad: p. ej. *"el ciclo completo de un tamaño no debe pasar de ~30s"* → el tope sale solo: `N_max = ciclo_objetivo / t` (con 6s → máx 5; con 10s → máx 3).
- Backend: `LIMIT` / lógica de selección en `listarPublicidadPublica` + validación de cupo en el wizard/alta (`publicidad-checkout`/`publicidad-alta`). Front: leer el tiempo de config en `ColumnaDerecha`.
