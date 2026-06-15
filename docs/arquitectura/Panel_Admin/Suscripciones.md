# Panel Admin · Módulo Suscripciones 💳

> **En una frase:** es la pantalla del Panel donde el equipo de AnunciaYA ve el **libro
> mayor de la membresía** — todos los movimientos de dinero de la plataforma (cobros,
> pagos manuales, cancelaciones) en un solo lugar, buscables y filtrables.
>
> **Cómo leer este documento:** está en dos capas. La primera (§1 a §7) explica el módulo
> **en lenguaje de persona**, sin tecnicismos. La segunda (el **Apéndice técnico** al final)
> es la referencia para quien va a tocar el código.
>
> **Estado:** desplegado y en uso. Última actualización: 15 Junio 2026 (el **superadmin** puede **borrar** físicamente un pago manual **anulado** desde el detalle — nuevo `DELETE /suscripciones/:id` + `suscripciones-acciones.service.ts`; en móvil los KPIs pasaron a una **tira inline**). 12 Junio 2026 (anular un pago en negocios con **tarjeta** ahora re-sincroniza el cobro de Stripe; ver `Pagos_Suscripciones.md` §9.2. Validado E2E en vivo). 11 Junio 2026: la bitácora ya permite **reenviar / corregir / anular** pagos manuales desde el detalle del movimiento.
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) (el Panel completo) ·
> [`Negocios.md`](Negocios.md) (donde se *registran* los pagos manuales) ·
> [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) (el backend de cobro que alimenta esta bitácora).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Cada negocio paga una **membresía de $449 al mes**. Ese dinero entra de varias formas: el
cobro automático de la tarjeta (Stripe), un pago en efectivo que registra un vendedor, una
cortesía, etc. Y a veces falla un cobro o se cancela una membresía.

Hasta ahora, **esos movimientos estaban dispersos**: el cobro automático de Stripe pasaba sin
quedar registrado en ningún lado, y los pagos manuales solo se veían dentro de la ficha de
*cada* negocio. No había forma de ver **todo el dinero de la plataforma junto**.

El **módulo Suscripciones** resuelve eso: es el **libro mayor** (la bitácora financiera) donde
quedan asentados **todos** los movimientos de membresía, vengan de donde vengan. Sirve para
responder preguntas como *"¿cuánto entró este mes?"*, *"¿cuántos cobros fallaron?"*, *"¿qué le
pasó al pago de este negocio?"*.

> Es una pantalla de **solo consulta**: aquí no se cobra ni se cancela nada. Las acciones
> (registrar un pago, pausar, cancelar) viven en el módulo **Negocios**; esta bitácora solo
> **refleja** lo que aquellas producen, más los cobros automáticos de Stripe.

---

## 2. ¿Quién lo usa?

- **Superadmin** — ve **toda** la bitácora financiera de la plataforma.
- **Gerente regional** — ve solo los movimientos de los negocios **de su región**.
- **Vendedor** — **no entra** a esta sección (en esta primera versión). Sus comisiones se
  verán en el módulo *Vendedores y comisiones*, no aquí.

---

## 3. Diccionario rápido

- **Bitácora / libro mayor:** la lista de todos los movimientos de dinero de la membresía,
  ordenados por fecha.
- **Evento (movimiento):** un renglón de la bitácora. Cada uno es **uno** de estos cuatro tipos:
  - **Cobro exitoso** — la tarjeta de un negocio pagó (cobro automático de Stripe).
  - **Cobro fallido** — Stripe intentó cobrar y la tarjeta falló (entra en morosidad).
  - **Pago manual** — alguien del equipo registró un pago en efectivo / transferencia / cortesía
    desde la ficha del negocio.
  - **Cancelación** — se dio de baja la membresía de un negocio.
- **Origen:** de dónde vino el evento. **Stripe** (automático) o **Manual** (lo registró una
  persona).
- **KPIs de cabecera:** los dos números grandes de arriba — **Ingresos** (suma de cobros
  exitosos + pagos manuales del periodo que estás viendo) y **Cobros fallidos** (cuántos
  fallaron). Reflejan los filtros activos.

---

## 4. ¿Qué veo en la pantalla?

### Arriba: los KPIs
Tres tarjetas con el resumen de lo que estás viendo: **Ingresos**, **Cobros fallidos** y
**Movimientos** (el total). Cambian según los filtros que apliques.

### La bitácora (la tabla)
Un renglón por movimiento, con el **logo del negocio**. Columnas: **negocio · monto · fecha · tipo**
(con su color). En celular se ven como tarjetas.

Arriba tienes con qué acotar:
- Un **buscador** por nombre de negocio.
- **Chips de tipo** ("Todos / Cobro exitoso / Cobro fallido / Pago manual / Cancelación") con
  un número que dice cuántos hay de cada uno.
- Filtros por **origen** (Stripe / Manual) y por **periodo** (hoy, últimos 7/30 días, último año).
- Un menú de **orden** (por fecha o por monto).

La lista viene en **páginas de 20**.

### El detalle de un movimiento
Si haces clic en un renglón, se abre una ficha de **solo lectura** con todo: el tipo, el
origen, el monto, la fecha, el negocio, quién lo registró (si fue manual), y los identificadores
técnicos de Stripe (para rastrear el cobro si hace falta).

---

## 5. ¿Qué puede hacer cada quién?

Es **sobre todo de consulta** (KPIs, lista, filtros). La excepción: al abrir el detalle de un
movimiento tipo **"Pago manual"**, el super/gerente puede **reenviar el comprobante, corregir o
anular** ese pago — las mismas acciones que en Negocios (reusan sus endpoints). Además, **solo el
superadmin** puede **borrar** un pago manual que ya esté **anulado** (eliminación física e
irreversible del registro — herramienta de limpieza). Los eventos automáticos de **Stripe** (cobros,
fallidos, cancelaciones) siguen siendo de solo lectura.

| Lo que quiere hacer | Superadmin | Gerente | Vendedor |
|---|:---:|:---:|:---:|
| Ver la bitácora + KPIs + filtros | **Toda** | **Su región** | — |
| Abrir el detalle de un movimiento | Sí | Su región | — |
| **Reenviar / corregir / anular** un pago manual (desde su detalle) | Sí | Su región | — |
| **Borrar** un pago manual **anulado** (físico, irreversible) | Sí | — | — |

---

## 6. ¿De dónde salen los movimientos?

La bitácora se alimenta de **dos orígenes**, que juntos dan la foto completa:

- **Cobros automáticos de Stripe** → cuando la tarjeta de un negocio paga (o falla, o se
  cancela), el sistema lo asienta solo en la bitácora. *(Antes esto se perdía.)*
- **Pagos manuales** → cuando alguien usa "Registrar pago" en la ficha de un negocio (efectivo,
  transferencia o cortesía), ese pago aparece **también** aquí, además de en el historial del
  negocio.

> Detalle fino: un **cobro fallido** se asienta en **cada** intento (Stripe reintenta varias
> veces), así que en la bitácora ves el historial completo de la morosidad de un negocio. Un
> **invoice de $0** (el de la prueba gratis) **no** ensucia la bitácora — solo se registran los
> cobros reales.

> 📧 **Comprobante al dueño:** cada **pago manual** además dispara, al instante, un **correo de
> comprobante** con un **recibo PDF descargable** (folio correlativo, datos fiscales, monto, vigencia)
> — es la **Defensa 1 del Camino B** contra el "robo invisible". Eso vive en **"Registrar pago"**
> (módulo Negocios), no en esta bitácora; aquí el pago solo **se refleja** como un evento más. Ver
> [`Negocios.md`](Negocios.md) §6 y [`Panel_Admin.md`](Panel_Admin.md) §Camino B.

---

## 7. Preguntas frecuentes

**Registré un pago en la ficha de un negocio. ¿Aparece aquí?**
Sí, al instante (tipo "Pago manual", origen "Manual"). Es el mismo pago que ves en el historial
de ese negocio, pero asentado en el libro mayor general.

**¿Por qué un cobro con tarjeta a veces tarda en aparecer?**
Los cobros, fallos y cancelaciones de tarjeta los avisa Stripe por su cuenta (webhook). Llegan
en segundos, pero son asíncronos: si justo cancelaste algo, su evento aparece cuando Stripe lo
confirma.

**Soy gerente y no veo el movimiento de un negocio que sé que existe.**
Probablemente la sede de ese negocio está en una ciudad **fuera de tu región**. Solo ves los
movimientos de los negocios de tu territorio.

**¿Puedo corregir o borrar un movimiento desde aquí?**
Los movimientos tipo **"Pago manual"** sí: al abrir su detalle puedes **reenviar el comprobante,
corregir** (concepto/monto/meses) o **anular** el pago (borrado lógico, recalcula vigencia, avisa al
dueño). Al anular en un negocio con **tarjeta**, la fecha de cobro de Stripe **se reajusta sola** (y
regresa a la original si era el último pago) — mismo comportamiento que en Negocios; ver
`Pagos_Suscripciones.md` §9.2. Los eventos automáticos de **Stripe** son de solo lectura. Las mismas
acciones existen en la ficha del negocio (Negocios).

Una vez **anulado**, el **superadmin** (y solo él) puede además **borrarlo físicamente** de la BD
(evento + pago) con el icono de papelera del detalle. Es **irreversible** y solo aplica a pagos
manuales anulados: un pago **vigente** no se puede borrar — primero hay que anularlo (eso ya revirtió
su vigencia, así que borrarlo después no recalcula nada). Es una herramienta de limpieza, no parte
del flujo normal.

---

---

# Capa 2 — Apéndice técnico

> A partir de aquí es referencia para quien va a tocar el código. El permiso real lo decide
> siempre el **backend**; el frontend solo refleja eso.

## A. Mapa de archivos

**Backend** (`apps/api/src/`):

| Archivo | Rol |
|---|---|
| `db/schemas/schema.ts` → `eventosPago` | Tabla `eventos_pago` (el libro mayor) |
| `services/suscripciones/eventos-pago.ts` | Helper `registrarEventoPago` (INSERT **defensivo** + idempotente) |
| `services/pago.service.ts` | Webhook: persiste `cobro_exitoso` / `cobro_fallido` / `cancelacion` |
| `services/admin/negocios-acciones.service.ts` → `marcarPagado` | Inserta el gemelo `pago_manual` en la misma transacción |
| `services/admin/suscripciones.service.ts` | **Lecturas** (`listarEventos`, `obtenerDetalleEvento`) + alcance por rol |
| `services/admin/suscripciones-acciones.service.ts` | **Escritura**: `eliminarEventoPago` (borra evento + pago de un pago manual anulado, en transacción) |
| `controllers/admin/suscripciones.controller.ts` | Lee query/params, llama al service, responde |
| `routes/admin/suscripciones.routes.ts` | Endpoints GET (`super`+`gerente`) · DELETE (solo `super`) |
| `scripts/probar-bitacora-eventos.ts` | Harness de verificación (persistencia + lectura, sin Stripe) |

**Frontend** (`apps/admin/src/components/suscripciones/`): `SeccionSuscripciones.tsx` (KPIs +
tabla/cards + filtros + paginación; en móvil los KPIs son una **tira inline** con separadores, no
cards), `FichaEvento.tsx` (detalle + metadata + acciones en el header; el **superadmin** ve "Borrar"
en pagos manuales anulados), `estadoEvento.tsx` (`BadgeTipoEvento` + `ChipOrigen`). Datos del
servidor en React Query (`hooks/queries/useSuscripcionesAdmin.ts`, incl. `useEliminarEvento`), tipos
en `services/suscripcionesService.ts`. La ficha abre instantánea con placeholder de la fila +
prefetch en hover/touch.

## B. Endpoints y permisos

Las rutas de `/suscripciones` se montan **antes** del gate global de superadmin en
`routes/admin/index.ts` (la sección la usa también el gerente, acotado a su región).

| Endpoint | Método | Roles | Alcance en el service |
|---|---|---|---|
| `/suscripciones` | GET | super · gerente | super=todo · gerente=su región |
| `/suscripciones/:id` | GET | super · gerente | por alcance; fuera de alcance → 404 |
| `/suscripciones/:id` | DELETE | **solo super** | borra un pago manual **anulado** (400 si no es manual · 409 si está vigente · 404 si no existe) |

**Query de la lista:** `busqueda` (nombre de negocio), `tipo`, `origen`, `negocioId` (deep-link),
`desde`/`hasta` (rango), `orden` (`fecha_recientes`/`fecha_antiguos`/`monto_mayor`/`monto_menor`),
`pagina`, `porPagina` (default 20, máx 100).

## C. Alcance regional

`condicionAlcance(panel)`: superadmin sin condición (ve todo); gerente = `EXISTS` de una sucursal
`es_principal` del negocio del evento cuya ciudad cae en su región (**mismo predicado que
Negocios**, correlacionado sobre `eventos_pago.negocio_id`); vendedor u otro rol → `'vacio'`. Se
reusa `panelConFiltroRegion` (el superadmin puede pasar `?regionId=` para "ver como" un gerente;
solo afecta lecturas).

## D. Modelo de datos y persistencia

**Tabla `eventos_pago`** (migración `docs/migraciones/2026-06-11-eventos-pago.sql`):

| Columna | Para qué |
|---|---|
| `tipo` | `cobro_exitoso` / `cobro_fallido` / `cancelacion` / `pago_manual` (CHECK) |
| `origen` | `stripe` / `manual` (CHECK) |
| `monto` | MXN; NULL si no aplica (fallido/cancelación/cortesía) |
| `fecha_evento` | cuándo ocurrió el movimiento |
| `actor_id` | admin que lo registró (NULL en eventos automáticos de Stripe) |
| `stripe_event_id` | `event.id` de Stripe → **idempotencia** (UNIQUE; NULL en manual) |
| `referencia_id` | FK suave → `pagos_membresia.id` (en `pago_manual`) |
| `metadata` | jsonb con extras (invoice/subscription/customer, concepto, reintento…) |

**Persistencia — dos caminos:**

1. **Webhook** (`pago.service.ts`): los handlers `manejarRenovacionPagada` (cobro real, monto>0),
   `manejarCobroFallido` (cada intento) y `procesarCancelacionSuscripcion` (solo baja deliberada)
   llaman `registrarEventoPago(...)`. El INSERT es **DEFENSIVO** (su propio `try/catch` en el
   helper): si falla, **no rompe el cobro ni provoca un reintento de Stripe** — la BD del ciclo de
   cobro es la fuente de verdad; la bitácora es secundaria. Idempotente vía `stripe_event_id`
   (`onConflictDoNothing`).
2. **Pago manual** (`marcarPagado`): inserta el gemelo `pago_manual` **en la misma transacción**
   que `pagos_membresia` (con `referencia_id` apuntándole). Aquí sí es transaccional (no defensivo):
   el registro contable y el del libro mayor van juntos o no van.

## E. Lectura (KPIs y conteos)

`listarEventos` arma una **BASE** (alcance + búsqueda + origen + negocio + rango, **sin** el filtro
de tipo) y sobre ella calcula: el total (con tipo, para paginar), los **conteos por tipo** (chips)
y los **KPIs** (`SUM(monto) FILTER (tipo IN cobro_exitoso, pago_manual)` = ingresos; `COUNT FILTER
(tipo = cobro_fallido)` = fallidos). Los conteos viajan como array `{tipo,total}` (no objeto: el
middleware snake→camel rompería claves como `cobro_exitoso`). La página une `negocios` (nombre) y
`usuarios` (actor). React Query con `keepPreviousData` para no temblar al filtrar/paginar.

> **Invalidación cross-módulo:** `useMarcarPagado` (en Negocios) invalida
> `queryKeys.suscripciones.all()` además de las de Negocios, para que un pago recién registrado
> aparezca en la bitácora **sin recargar**.

## F. Verificación (Gate 1)

Harness `scripts/probar-bitacora-eventos.ts` (NO requiere `stripe listen`): verifica persistencia
(pago_manual end-to-end en misma transacción + eventos de Stripe vía helper), idempotencia,
defensividad (FK inválida no lanza), el CHECK de tipo, y la lectura (lista + conteos + KPIs +
alcance del gerente). Verificado en verde el 11 Jun 2026. Diagnóstico ad-hoc:
`scripts/diagnostico-bitacora.ts` (cruza `pagos_membresia` con su gemelo).

## G. Fuera de V1 / pendientes menores

- **Deep-link a Negocios:** hoy se muestra el nombre del negocio; falta el salto a su ficha en el
  módulo Negocios (toca `PaginaPanel`).
- **Re-sincronizar al editar un pago:** corregir un pago en Negocios (`editarPagoMembresia`) no
  actualiza aún el evento gemelo en `eventos_pago` → el monto del libro mayor puede quedar viejo.
- **Eventos de Stripe son asíncronos:** la cancelación aparece cuando el webhook procesa
  `subscription.deleted` (no en el instante de la acción).
- **Config de precio/trial/gracia, promos/meses gratis, página de cuenta del dueño** → ver
  `Suscripciones_Pendientes.md` §Fuera de V1.
- **Migrar el dedup de idempotencia de Redis** a `eventos_pago` (sinergia con `stripe_event_id`).
- **Producción:** correr la migración `2026-06-11-eventos-pago.sql` en prod antes del deploy.

## H. Referencias

- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (login, roles, gate dual, regiones).
- [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) — el ciclo de cobro (webhook, estados, trial→gracia→suspensión).
- [`Negocios.md`](Negocios.md) — donde se *registran* los pagos manuales (plantilla de oro).
- `Suscripciones_Pendientes.md` — lo que falta (checklist + Fuera de V1).

---

*Última actualización: 11 Junio 2026 · nace con la bitácora financiera V1 (solo lectura): tabla `eventos_pago`, persistencia defensiva en el webhook + gemelo transaccional en "Registrar pago", lectura con alcance por rol + KPIs, verificada con harness (Gate 1).*
