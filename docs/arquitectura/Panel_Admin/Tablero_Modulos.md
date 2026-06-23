# Panel Admin — Tablero de módulos

> **Qué es:** el estado de los **12 módulos del Panel de un vistazo**. Es el **índice maestro**:
> dice en qué fase está cada módulo y dónde están sus dos documentos. Para el detalle de pendientes,
> abre el `<Modulo>_Pendientes.md`; para el proceso, el carril.
>
> **Cómo retomar (sesión nueva):** lee este tablero → identifica el módulo activo y su fase → abre el
> carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) y los 2
> docs del módulo.
>
> **Mantener al día:** al **cerrar** cada sesión, actualiza la fila del módulo en que se trabajó (y la
> sección "Estado de hoy").
>
> **Leyenda — Estado:** ✅ en producción · 🟡 parcial · ⬜ sin empezar
> **Leyenda — Fase del carril:** 0 Definir · 1 VER · 2 ACTUAR · 3 Cerrar · ✔ Cerrado
>
> **Última actualización:** 23 Junio 2026.

---

## Estado de hoy

- **Cabos sueltos de Suscripciones cerrados (23 jun):** los 4 pendientes menores de la bitácora financiera
  (módulo 5) quedaron cerrados. **(1)** **Deep-link evento → Negocios**: el nombre del negocio en la ficha del
  movimiento (`FichaEvento.tsx`) es un botón que salta a la sección Negocios y resalta su fila (mismo patrón que
  Métricas → "Negocios en riesgo"; tooltip con el componente `Tooltip` del Panel, no el `title` nativo). **(2)**
  **Re-sync al editar pago**: ya estaba desde el 11 jun (commit `5ae71be`) — error documental. **(3)** **Backfill
  de gemelos huérfanos** aplicado: DEV 0, **PROD 1 cortesía reparada** (count=0); de paso se **corrigió un bug del
  backfill** (excluía mal los cobros de `tarjeta`, que ya tienen su evento `cobro_exitoso` de Stripe — los habría
  metido como `pago_manual` falsos y duplicado ingresos). **(4)** Migración `eventos_pago` **confirmada en prod**
  (12 columnas). `tsc -b` del Panel verde. **Committeado** (`f23e540`, push a main). **Suscripciones pasa a ✅
  (cerrado, módulo completo):** Juan descartó la V2 (promos/cupones, CSV, reembolsos-en-bitácora, dedup-Redis);
  el Sprint de Stripe ya cubrió precio/cobro/comisión/recibos y la membresía del dueño vive en `Mi_Perfil.md`
  (apps/web). Ver `Suscripciones_Pendientes.md` §Cierre de alcance.
- **Recién construido y ampliado (21 jun):** **Publicidad** (módulo 7) — el módulo **completo de punta a
  punta** (doc [`Publicidad.md`](Publicidad.md)): venta del **espacio** en los 3 carruseles de la columna
  derecha, acotada por ciudades. **Fases 0-2** completas: lectura (sección Panel + ficha + endpoint público +
  columna real) · **KPIs de cabecera** (activos · ingresos · clics · por vencer) · acciones de estado +
  **editar** (ciudades/carruseles/imágenes, sin tocar el cobro) · **configuración económica** (precios +
  multiplicador por ciudades + **periodos de meses**, editores dedicados) · **meses por adelantado** con
  descuento por volumen (pago único, extiende vigencia) · **alta manual + cortesía** · **wizard self-service
  con Stripe** (pago único + webhook + estado `pendiente`) · **cron** de expiración + aviso 3 días + limpieza
  de pendientes · **recibo PDF + correo** + módulo **Recibos** extendido (UNION membresía+publicidad). Las
  **creatividades** se optimizan (WebP, máx 1600px) y no quedan huérfanas (`descartarImagenesHuerfanas` por
  reference count + recolector R2 de respaldo). Modales **Registrar/Editar** horizontales (`2xl`, 2 columnas) +
  acciones de la ficha en **íconos**. 3 migraciones (corridas) + harness verdes + `tsc` api/admin/web.
  **Cerrado:** committeado · **CORS R2 resuelto** (el Panel ya estaba en la policy del bucket por Vendedores) · recibo/correo de publicidad con plantilla propia + periodo.
- **Recién cerrado (21 jun):** **Mantenimiento** (módulo 11 "Sistema", el otro medio junto a Auditoría) —
  doc [`Mantenimiento.md`](Mantenimiento.md): el **centro de operación técnica** del SuperAdmin en **4
  pestañas** — **Salud** (semáforos BD/Redis/R2/Stripe + latencia), **Tareas programadas** (los 7 crons con
  cadencia + última corrida + **ejecutar ahora** con **preview** de qué procesaría), **Logs del BE** (ventana
  en memoria con filtro/pausa + exportar/vaciar) y **Recolector R2** (analizar + histórico + **ejecutar
  limpieza blindada**: solo borra con acceso cross-ambiente/local, en prod queda bloqueado con aviso). Único
  módulo de "Sistema" que pasó por **Fase 2** (5 acciones, cada una con confirmación + auditoría). Estrenó los
  tokens `--panel-warn` (ámbar "lento") y `ok-suave` (verde de acción). Sin migración (todo lectura o estado
  en memoria). 7 crons instrumentados con telemetría; `tsc` api+admin verdes. **Committeado** (en prod).
- **Recién cerrado (21 jun):** **Auditoría** — la **UI de la bitácora** (`admin_auditoria`), el medio que
  faltaba del módulo 11 "Sistema" (doc [`Auditoria.md`](Auditoria.md)). Lista (tabla/cards) con filtros
  (acción · persona · periodo · orden) + paginación en servidor, **ficha** de detalle instantánea,
  **alcance por rol** (super = todo · gerente = su equipo · vendedor 403) + lente de región, y **borrado
  de limpieza** (papelera por fila + Vaciar, **solo super**, para staging). El valor del módulo es el
  **sistema de presentación**: traduce ~40 tipos de acción a lenguaje de persona **sin jerga ni UUIDs**
  (los ids se resuelven a nombres en el backend, sistémico) y **degrada con elegancia** ante acciones
  nuevas. La **escritura** ya existía como cimiento (`registrarAuditoria`). En el menú, "Sistema" se
  partió en dos entradas: **Auditoría** y **Mantenimiento**. Solo lectura (+ borrado super) → saltó Fase
  2. Sin migración. Harness `probar-auditoria-lectura.ts` verde + `tsc`/build. **Committeado** (en prod).
- **Recién cerrado (21 jun):** **Métricas** (módulo 2) — doc [`Metricas.md`](Metricas.md): la vista de
  **análisis** del Panel con **3 pestañas** (Crecimiento · Uso de la app · Usuarios) + **selector de
  periodo** (presets + rango por fechas, granularidad día/mes automática), todo scoped por rol y con
  lente de región. KPIs con variación, **gráficas recharts** (estrenadas en el Panel: barras divergentes
  altas/bajas, ingresos apilados por concepto, líneas de engagement, rankings con avatar/región/gerente),
  y deep-link **"Negocios en riesgo" → Negocios** con scroll + highlight. Solo lectura → saltó Fase 2.
  Sin migración. 3 harness verdes (`probar-metricas-{crecimiento,adopcion,usuarios}.ts`) + `tsc`/build.
  Estrenó el **patrón de gráficas** en `Tokens_Panel.md`. **Committeado** (en prod).
- **Recién cerrado (20 jun):** **Resumen / inicio** (módulo 1) — doc [`Resumen.md`](Resumen.md): tablero
  de inicio con **KPIs gruesos** (negocios activos · usuarios · ingresos del mes · cobros fallidos; el
  vendedor ve cartera/comisiones/efectivo) + **cola de pendientes accionable** (efectivo por entregar +
  negocios en gracia), scoped por rol y con **deep-link con filtro** (clic → sección que resuelve la
  tarea). La **campana** del shell pasó de demo a datos reales (mismo hook). Solo lectura → saltó Fase 2.
  Sin migración. Backend orquesta consultas de dominio (sin duplicar alcance); harness
  `probar-resumen-lectura.ts` verde + `tsc`/build. Estrenó patrón visual de **tablero KPI + cola** en
  `Tokens_Panel.md`. **Committeado** (en prod).
- **Validado en PROD (20 jun):** verificadas con consulta de huellas (`information_schema`/`pg_constraint`)
  en el Supabase de producción — **aplicadas:** `2026-06-18-concepto-tarjeta`, `2026-06-17-comision-monto-pagado`
  (abonos), `2026-06-19-comision-al-cobro` (Pieza 3) y el **DROP de `usuarios.ciudad`** (cierre completo de la
  migración ciudad↔catálogo en dev+prod). **Ausente (opcional):** `sembrar_comision_escalera` — el módulo
  Configuración usa el default; la 1ª edición desde el Panel la siembra igual. **Hardcode "Puerto Peñasco" de
  Vacantes:** resuelto (commit `60106f0` deriva ciudad+coords de la sucursal; comentario obsoleto de
  `servicios.service.ts` corregido). **Stripe validado A–Z al 100% (23 jun):** las Piezas 2 y 3 quedaron validadas
  E2E por Juan en la **Ronda de Pruebas de Pagos** ([`Ronda_Pruebas_Pagos.md`](Ronda_Pruebas_Pagos.md) — bloques
  A–H + decisiones Z + las 22 OBS, todo cerrado); el refinamiento `WebhookReintentable` se validó como H4 (carrera
  del cobro día-1). **Sin pendientes operativos de Stripe.**
- **Cimientos (transversal):** ✅ completos (rol + auth `requierePanel`, atribución, estado de
  membresía + webhook + cron de gracia, configs con `obtenerConfig`). **Shell + login del Panel:** ✅ en prod.
- **Recién cerrado:** **Usuarios** — módulo completo (VER + acciones + visibilidad por jerarquía y
  región + lente del superadmin + expediente depurado + métrica "último acceso al Panel"). Doc
  canónico [`Usuarios.md`](Usuarios.md) escrito. Migración manual: `usuarios_ultimo_acceso_panel.sql`.
- **Recién cerrado (16 jun):** **Equipo y accesos** — el "RR.HH./IT" del Panel: VER + alta de
  vendedor y de gerente + editar datos + reasignar región + revocar/reactivar (vendedores y gerentes) +
  typeahead/autocompletado de cuentas + aviso de promoción. Sin migración SQL. Doc canónico
  [`Equipo_y_accesos.md`](Equipo_y_accesos.md). Verificado con 2 harness (lectura 12 + acciones 16) y builds en verde.
- **Recién cerrado (11 jun):** **Suscripciones — bitácora financiera V1** (libro mayor de eventos de
  pago: cobros Stripe + pagos manuales + cancelaciones, solo lectura, KPIs, alcance por rol). Fase 1
  completa + Gate 1 verde; Fase 2 se salta (solo lectura). Doc canónico [`Suscripciones.md`](Suscripciones.md).
- **Recién cerrado (17 jun):** **Vendedores y comisiones — A·B·C·E·D** completo y en uso (doc
  [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md)): cartera (master-detail) + **devengo** recurrente
  por escalera + **comisión de alta (C)** ($400 al primer pago real) + **liquidación** (registrar pago con
  foto-comprobante a R2 + datos de cobro + bitácora) + **cortes de efectivo con neteo (D)** (libro
  `efectivo_movimientos`; al pagar comisión se descuenta lo que el vendedor debe). Migraciones en **dev y prod**;
  builds + 2 harness (devengo + neteo) verdes. **Diferido:** cobro automático de efectivo.
- **Recién cerrado (17 jun):** **Configuración v1** — el **tablero económico** (doc [`Configuracion.md`](Configuracion.md)):
  editar **trial/gracia** + **escalera de comisiones** configurable (clave JSON `comision_escalera`), con editor de
  tramos (vista previa en vivo + rueda del mouse), validación dura (sin huecos/solapes), auditoría y reset de caché.
  Solo SuperAdmin. Verificado con 2 harness + builds verdes; persistencia validada en dev. **Migración prod pendiente**
  (idempotente, opcional). → **Desbloquea Vendedores Fase 2** (que lee la escalera para el devengo). El **precio de
  membresía** + promos de lanzamiento (Coupons de Stripe) siguen siendo sprint aparte en Suscripciones.
- **Recién hecho (17 jun):** **Trial dinámico en la web** — endpoint público `/api/configuracion-publica` +
  hook `useConfigPublica` conectan landing/registro/upgrade al valor real del trial (antes "7 días" hardcodeado en
  ~8 lugares + i18n es/en). Stripe ya lo respetaba.
- **Recién hecho (18 jun):** **Sprint de Stripe · Pieza 1** — precio de membresía **editable desde el Panel**
  (botón que crea el Price en Stripe sin redeploy, Price ID en config) + **plan anual** (toggle ON/OFF) + **cobro
  inmediato** con trial=0 + **comprobante en cobros de tarjeta** (recibo PDF con folio correlativo). **Validado
  E2E en TEST** (cobro real → webhook → negocio + bitácora). Doc [`Sprint_Stripe.md`](Sprint_Stripe.md). Pendiente:
  correr `2026-06-18-concepto-tarjeta.sql` en dev+prod; Piezas 2 (cobro día-1) y 3 (comisión "al cobro").
- **Recién cerrado (18 jun):** **Recibos** — módulo nuevo: ver/buscar (por folio)/descargar/reenviar (multi-correo)
  los comprobantes de membresía, con alcance super/gerente/**vendedor**. Doc [`Recibos.md`](Recibos.md).
- **Recién hecho (19 jun):** **Sprint de Stripe · Piezas 2 y 3** — **cobro "día 1"** para ventas por vendedor (sub
  sin trial + empuje a +44d; alta manual con cortesía visible en el modal) y **comisión recurrente "al cobro"**
  (anti-doble-pago del prepago: un anual = 10× una vez; foto mensual retirada). Harness verdes (`probar-cobro-dia1`,
  `probar-comision-al-cobro`) **+ validado E2E por Juan (Ronda de Pagos, 22-23 jun)**; la migración
  `2026-06-19-comision-al-cobro.sql` ya está aplicada en prod (20 jun). Docs
  [`Sprint_Stripe.md`](Sprint_Stripe.md), [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md),
  [`Ronda_Pruebas_Pagos.md`](Ronda_Pruebas_Pagos.md).
- **Recién cerrado (18 jun):** **Ciudades** (módulo 8) — doc [`Ciudades.md`](Ciudades.md): mapa interactivo de
  México (MapLibre + OpenFreeMap, 4,563 ciudades INEGI) para dar de alta ciudades nuevas y agruparlas en
  regiones; pestañas Ciudades/Regiones con acciones; **endpoint público `GET /api/ciudades`** + la app web lee
  del catálogo (catálogo hidratable con fallback). Incluyó la **fase contract**: retirar
  `negocio_sucursales.ciudad` de las lecturas/escrituras de **13 servicios** + sacarla del ORM (migración de
  DROP lista). Verificado con 3 harness (lectura, acciones, contract-runtime de 18 funciones) + tsc/builds.
  Solo SuperAdmin. Decisión: unificar mapas en
  MapLibre (`apps/web` migra de Leaflet después, ver `Migracion_MapLibre.md`).
- **Recién cerrado (19 jun):** **Migración ciudad → catálogo `ciudades` (FK `ciudad_id`)** completa
  (expand-migrate-contract). Migradas y columna texto DROPeada en dev+prod: `negocio_sucursales.ciudad`
  (Negocios, Ofertas, CardYA, ChatYA, Business Studio, casi todo el Panel), `servicios_publicaciones.ciudad`
  (Servicios + Vacantes), `articulos_marketplace.ciudad` (MarketPlace) y `preguntas_comunidad.ciudad`
  (Home / Pregúntale a la ciudad / Coyo). `usuarios.ciudad` migrada; DROP corrido en DEV, **DROP en PROD
  pendiente** (último paso operativo). Lecturas vía `LEFT JOIN ciudades` (alias `ciudad` conservado, front
  intacto); escrituras vía `resolverCiudadId(texto)` persistiendo solo `ciudad_id`. Logs de búsqueda quedan
  como texto analítico por decisión. Migraciones one-shot en `docs/migraciones/2026-06-19-*-ciudad-*.sql`.
- **Stripe CERRADO (23 jun):** la **Ronda de Pruebas de Pagos** validó E2E todo lo que toca Stripe (bloques A–H +
  decisiones Z + las 22 OBS) → [`Ronda_Pruebas_Pagos.md`](Ronda_Pruebas_Pagos.md). Migraciones de schema en prod ✅
  y hardcodes "Puerto Peñasco" de Vacantes ✅ ya resueltos (20 jun). **Único feature futuro (no bloquea):** la
  sección **Mi Perfil – Pagos** (Customer Portal para recuperar tarjeta + pago manual con comprobante) →
  [`../Mi_Perfil.md`](../Mi_Perfil.md). Vendedores · cobro automático de efectivo = backlog.

---

## Los módulos (en el orden del menú del Panel)

> **La agrupación y el orden = el menú lateral del Panel** (las 5 secciones: General · Operación · Red de
> ventas · Crecimiento · Administración). El **#** es el orden de **construcción** (la referencia que usa
> el resto de la doc: "módulo 6", "módulo 11"…); por eso no es correlativo aquí. El **módulo 11 (Sistema)**
> aparece como sus **dos entradas reales** del menú: Auditoría y Mantenimiento.

| # | Módulo | Estado | Fase | Docs |
|---|---|---|---|---|
| | **· General ·** | | | |
| 1 | **Resumen / inicio** | ✅ | Construido (VER · solo lectura, salta Fase 2) | `Resumen.md` · `Resumen_Pendientes.md` |
| 2 | **Métricas** | ✅ | ✔ Cerrado (VER · solo lectura, salta Fase 2) | `Metricas.md` · `Metricas_Pendientes.md` |
| | **· Operación ·** | | | |
| 3 | **Negocios** | ✅ | ✔ Cerrado · backlog menor | `Negocios.md` · `Negocios_Pendientes.md` |
| 4 | **Usuarios** | ✅ | ✔ Cerrado | `Usuarios.md` · `Usuarios_Pendientes.md` |
| 5 | **Suscripciones** | ✅ | ✔ Cerrado (módulo completo = bitácora financiera; **sin V2**, alcance cerrado 23 jun) | `Suscripciones.md` · `Suscripciones_Pendientes.md` |
| 12 | **Recibos** | ✅ | ✔ Cerrado | `Recibos.md` |
| | **· Red de ventas ·** | | | |
| 6 | **Vendedores y comisiones** | ✅ | ✔ Cerrado (A·B·C·E·D + Liquidación v2 abonos + comisión "al cobro"/Stripe Pieza 3 ✅ validada en la ronda) · backlog: **F** (cobertura avanzada: agregar/quitar ciudades a un vendedor, incl. de otra región) + **G** (mapa de territorios: gerente zonifica la ciudad/asigna · vendedor deja marcas "ya pasé") | `Vendedores_y_comisiones.md` · `Vendedores_y_comisiones_Pendientes.md` |
| | **· Crecimiento ·** | | | |
| 7 | **Publicidad** | ✅ | ✔ Cerrado (Fases 0-2: lectura+KPIs · acciones+editar · config económica+meses · alta manual+cortesía · wizard self-service+Stripe · cron · recibo/correo propios+periodo · creatividades optimizadas/sin huérfanas) · committeado · CORS R2 ✓ | `Publicidad.md` · `Publicidad_Pendientes.md` |
| 8 | **Ciudades** | ✅ | Construido (mapa interactivo + alta/agrupar + app web desde BD) · migración ciudad→catálogo cerrada (DROP dev+prod completo, incl. `usuarios.ciudad`, validado 20 jun) | `Ciudades.md` · `Ciudades_Pendientes.md` |
| | **· Administración ·** | | | |
| 10 | **Equipo y accesos** | ✅ | ✔ Cerrado | `Equipo_y_accesos.md` · `Equipo_y_accesos_Pendientes.md` |
| 9 | **Configuración** | 🟡 | v1 ✔ (VER+ACTUAR+cierre) · backlog: `sembrar_comision_escalera` en prod (opcional, usa default) + claves futuras | `Configuracion.md` · `Configuracion_Pendientes.md` |
| 11 | **Auditoría** *(módulo 11 "Sistema")* | ✅ | ✔ Cerrado (UI de la bitácora) | `Auditoria.md` · `Auditoria_Pendientes.md` |
| 11 | **Mantenimiento** *(módulo 11 "Sistema")* | ✅ | ✔ Cerrado (Salud · Crons · Logs · Recolector R2 + 5 acciones) | `Mantenimiento.md` · `Mantenimiento_Pendientes.md` |

---

## Notas por módulo (contexto para arrancar)

- **3 · Negocios** — en prod (VER + 6 acciones + alta manual), **verificado de punta a punta**
  (acciones de tarjeta contra Stripe real). El **vendedor ya registra pagos en efectivo de sus
  negocios manuales** (su cartera, sin tarjeta ni cortesía). Pendientes menores (backlog): regularizar
  tarjeta morosa · lock anti doble-click · monto read-only (bloqueado por precio configurable).
  (Cerrados: cortesía, editar pago, contador real, cancelar transaccional, paginar historial,
  verificación §4, fecha/consistencia descartadas, pago del vendedor.)
- **4 · Usuarios** — **en uso** (doc canónico [`Usuarios.md`](Usuarios.md)). Mesa de ayuda + moderación
  de personas. **Permiso partido:** *soporte* (desbloquear, código de acceso, corregir correo) =
  **super + gerente**; *moderación* (suspender/reactivar) = **solo super**. **Gerente acotado por
  región** (clientes todos; dueños/encargados/vendedores de su región; nunca otros gerentes) +
  **lente de región** del superadmin. Taxonomía de roles en la columna Rol; expediente = tarjeta de
  resumen depurada (correo/ID copiables). Migración: `usuarios_ultimo_acceso_panel.sql`. **Cerrado** (Fase 3 completa, 15 jun: pulido
  visual + verificación de suspensión). V2: denuncias, deep-link desde Negocios, promover/degradar.
- **5 · Suscripciones** — **CERRADO, módulo completo** (doc [`Suscripciones.md`](Suscripciones.md)): el módulo
  *es* el libro mayor de eventos de pago (`eventos_pago`) — cobros Stripe + pagos manuales + cancelaciones, solo
  lectura, con KPIs, filtros, deep-link a Negocios y alcance por rol. Aquí vive el historial financiero
  **completo** (el de la ficha de Negocios es solo un resumen). **No hay V2** (decisión Juan, 23 jun): precio
  editable/cobro día-1/comisión al cobro/recibos = **hechos** en el Sprint de Stripe; promos/cupones, CSV,
  reembolsos-en-bitácora y dedup-Redis = **descartados** (la cortesía manual cubre fundadores; Stripe acepta
  promotion codes a mano); membresía del **dueño** vive en `Mi_Perfil.md` (apps/web), no en el Panel. Cabos
  sueltos cerrados y committeados (23 jun, `f23e540`). Detalle: `Suscripciones_Pendientes.md` §Cierre de alcance.
- **6 · Vendedores y comisiones** — **cerrado y en uso (A·B·C·E·D)** (doc [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md)):
  cartera (master-detail), devengo recurrente por escalera, **comisión de alta** ($400 al primer pago real),
  liquidación (registrar pago con comprobante R2 + datos de cobro + bitácora) y **cortes de efectivo con neteo**
  (libro `efectivo_movimientos`; al pagar comisión se descuenta lo que el vendedor debe). Migraciones en dev+prod;
  2 harness verdes (devengo + neteo). **Backlog:** cobro automático de efectivo (engancharlo en alta manual/marcar
  pagado), datos de cobro por el propio vendedor. **Cobertura avanzada (F) DIFERIDA** (multi-región/multi-gerente/
  mover-con-reasignación): reescribe el alcance "vendedor de UNA región" en `panel.middleware` + módulos cerrados.
- **8 · Ciudades** — **construido** (doc [`Ciudades.md`](Ciudades.md)). Mapa interactivo de México (MapLibre,
  4,563 ciudades de INEGI) para **dar de alta ciudades nuevas** (clic en gris) y **agruparlas en regiones**
  (clic en azul); pestañas Ciudades/Regiones con acciones por fila; endpoint público `GET /api/ciudades` + la
  app web consume el catálogo de la BD (antes leía un array hardcodeado). La **migración ciudad → catálogo
  `ciudades` (FK `ciudad_id`)** quedó **cerrada** (expand-migrate-contract): `negocio_sucursales.ciudad`,
  `servicios_publicaciones.ciudad`, `articulos_marketplace.ciudad` y `preguntas_comunidad.ciudad` migradas y
  DROPeadas en dev+prod; `usuarios.ciudad` migrada y **DROPeada en dev+prod** (validado 20 jun). Lecturas vía
  `LEFT JOIN ciudades` (alias `ciudad`); escrituras vía `resolverCiudadId(texto)`. Solo SuperAdmin.
  **Pendiente:** verificación visual E2E. Los hardcodes "Puerto Peñasco" de Vacantes ya se resolvieron
  (commit `60106f0` deriva la ubicación de la sucursal; el comentario obsoleto de `servicios.service.ts` quedó corregido).
- **9 · Configuración** — **v1 construido y en uso** (doc [`Configuracion.md`](Configuracion.md)): el tablero
  económico (escalera de comisiones + trial + gracia), solo SuperAdmin, con auditoría y reset de caché. Backlog:
  sembrar `comision_escalera` en prod (idempotente, **opcional** — al 20 jun sigue ausente; el módulo usa el
  default y la 1ª edición desde el Panel la fija igual), y sumar claves nuevas cuando una sección futura tenga una
  palanca económica real. El **precio de membresía** queda para el sprint de Suscripciones (Stripe + Coupons).
- **10 · Equipo y accesos** — **cerrado y en uso** (doc [`Equipo_y_accesos.md`](Equipo_y_accesos.md)). El
  "RR.HH./IT": alta de vendedor/gerente, editar datos, reasignar región, revocar/reactivar (vend. y
  gerente), revocados visibles, typeahead de cuentas + promoción con aviso. **Sin migración.** Permisos:
  crear/mover/revocar gerentes = solo super; alta/edición de vendedor = super + gerente (su región). El
  **territorio avanzado** (multi-región parcial, mover-con-reasignación de cartera) se difirió al módulo 6.
- **11 · Sistema** — los **dos medios cerrados**. **Auditoría-UI** (doc [`Auditoria.md`](Auditoria.md)):
  lectura de `admin_auditoria` con lista + ficha, alcance por rol (super todo / gerente su equipo / vendedor
  403), borrado de limpieza (solo super) y un **sistema de presentación** que traduce ~40 acciones a lenguaje
  de persona sin jerga ni UUIDs (resolución de ids→nombres en el backend, división backend=identidad /
  frontend=formato). **Mantenimiento** (doc [`Mantenimiento.md`](Mantenimiento.md)): centro de operación
  técnica en 4 pestañas (Salud · Tareas programadas · Logs del BE · Recolector R2) con 5 acciones auditadas
  (ejecutar cron con preview, purgar caché, vaciar/exportar logs, limpiar R2 blindado por cross-ambiente);
  todo lectura/memoria, sin migración. En el menú son **dos entradas separadas**: Auditoría y Mantenimiento.
  **Backlog Auditoría:** deep-links ficha→Negocios/Usuarios, filtro de acción dinámico, export CSV,
  retención/archivado. **Backlog Mantenimiento:** logs persistentes, telemetría histórica de crons,
  pausar/editar crons, migraciones pendientes, webhooks Stripe (ver `Mantenimiento_Pendientes.md`).
- **12 · Recibos** — **construido y en uso** (doc [`Recibos.md`](Recibos.md)): lista global de recibos de membresía
  (manuales + tarjeta, foliados), buscar por folio, descargar PDF, reenviar a 1+ correos. Alcance super/gerente/
  vendedor (lo que Suscripciones no tenía). Reusa el generador de recibo + el envío de correo. Migración asociada:
  `2026-06-18-concepto-tarjeta.sql`.

---

## Referencias

- **Proceso (cómo se construye un módulo):** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
- **Arquitectura del Panel:** [`Panel_Admin.md`](Panel_Admin.md) · **Diseño:** [`Tokens_Panel.md`](Tokens_Panel.md).
- **Pendientes globales** (módulos aún sin checklist propio): `docs/reportes/PENDIENTES_PanelAdmin.md`.
