# Panel Admin · Módulo Negocios 🏪

> **En una frase:** es la pantalla del Panel donde el equipo de AnunciaYA y sus
> vendedores **ven, administran y dan de alta** los negocios que pagan la membresía —
> ya sea que paguen con tarjeta o en efectivo.
>
> **Cómo leer este documento:** está en dos capas. La primera (§1 a §10) explica el
> módulo **en lenguaje de persona**, sin tecnicismos — sirve para cualquiera que llegue
> sin contexto. La segunda (el **Apéndice técnico** al final) es la referencia para quien
> va a tocar el código: archivos, endpoints, permisos y detalles internos.
>
> **Estado:** desplegado y en uso. Última actualización: 10 Junio 2026.
>
> Documento hermano: [`Panel_Admin.md`](Panel_Admin.md) describe el Panel **completo**
> (el "caparazón": login, roles, regiones, las demás secciones). Este documento es solo
> de **Negocios**.

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

AnunciaYA cobra a cada negocio una **membresía de $449 al mes**. A cambio, el negocio
aparece en la app, tiene su Business Studio, ScanYA, etc. Esa membresía se puede cobrar de
**dos maneras**:

- **Con tarjeta:** el dueño se registra solo desde la app y paga en línea (esto lo maneja
  Stripe, el sistema de cobros). No pasa por este módulo.
- **En efectivo o transferencia:** un vendedor de AnunciaYA va físicamente con el
  comerciante, le cobra, y lo **da de alta a mano** desde el Panel. Esto sí es de este
  módulo.

El **módulo Negocios** es el lugar donde el equipo:

- Ve **todos los negocios** y en qué situación está cada uno (si están al día con su pago,
  si deben, si fueron dados de baja…).
- **Registra negocios nuevos** cobrados en efectivo.
- **Administra la membresía** de cada negocio: registrarle un pago, pausarlo, reactivarlo,
  darlo de baja, cambiarle el vendedor o corregir el correo del dueño.

Dicho simple: **es el "expediente" de cada negocio y el panel de control de su membresía.**

> ⚠️ **Ojo, no confundir:** el "Panel" es una página web **aparte**, para el equipo de
> AnunciaYA — no es lo mismo que **Business Studio**, que es el panel que usa el dueño de
> *un solo* negocio para administrar lo suyo. Aquí se ven **todos** los negocios desde
> afuera; en Business Studio el dueño ve **el suyo** desde adentro.

---

## 2. ¿Quién lo usa? (las tres jerarquías)

Tres tipos de persona entran al Panel, y **cada uno ve y puede hacer cosas distintas**:

- **Superadmin** — es la cabeza de AnunciaYA (hoy, Juan). **Ve todos los negocios del
  país** y puede hacer absolutamente todo. Es el único que puede dar de baja un negocio.

- **Gerente regional** — administra **una región** (un conjunto de ciudades). Solo ve y
  toca **los negocios de su región**. Puede registrar pagos, pausar, reactivar, reasignar y
  dar de alta — pero siempre dentro de su territorio. No puede cancelar negocios.

- **Vendedor** (también llamado *embajador*) — es quien sale a la calle a vender
  membresías. Solo ve **su propia cartera**: los negocios que él mismo registró. Puede
  **dar de alta negocios nuevos**, pero **no** administra membresías ajenas (no pausa, no
  cancela, no registra pagos de otros). Su ficha es de solo lectura.

Piénsalo como una pirámide: el superadmin manda sobre todo, el gerente sobre su región, y
el vendedor sobre lo suyo.

---

## 3. Diccionario rápido

Antes de seguir, estos términos aparecen por todos lados. Vale la pena tenerlos claros:

- **Membresía:** la suscripción de $449/mes que paga el negocio para estar en AnunciaYA.
- **Estado de pago:** en qué situación está la membresía. Cuatro posibles:
  - **Al corriente** — está pagada y vigente.
  - **En gracia** — se venció y no ha pagado, pero está en el periodo de tolerancia (unos
    14 días) antes de que se le apague.
  - **Suspendido** — se le acabó la tolerancia (o un admin lo pausó); ya no aparece en la app.
  - **Cancelado** — se dio de baja.
- **Estado administrativo:** la decisión **humana** sobre el negocio (activo / pausado a
  mano / archivado), aparte de lo que diga el pago. Sirve para que *"un pago no reviva algo
  que un admin apagó a propósito"*. Ver §7 y la FAQ.
- **Gracia:** el periodo de cortesía tras vencerse el pago, antes de cortar el servicio.
- **Cortesía:** un alta **gratis** — se le regala el tiempo de membresía sin cobrar nada
  (por ejemplo, a un negocio piloto). No lleva monto.
- **Vendedor / embajador:** la persona que vende membresías. A cada negocio se le
  **atribuye** un vendedor (para llevar la cuenta de sus comisiones).
- **Sucursal matriz (o principal):** la sede del negocio. De su ciudad se deduce a qué
  **región** pertenece el negocio (y por lo tanto, qué gerente lo administra).
- **Alta manual:** registrar un negocio a mano desde el Panel, cobrado en efectivo (sin
  tarjeta, sin Stripe).
- **Cuenta sin contraseña ("Modelo C"):** cuando se da de alta a un negocio en efectivo, la
  cuenta del dueño nace **sin contraseña**. El dueño la crea él mismo la primera vez que
  entra (ver §8). Así nadie teclea una contraseña por él.

---

## 4. ¿Qué veo en la pantalla?

### La lista de negocios

Es lo primero que ves al entrar a la sección. Una **tabla** (o tarjetas, en celular) con un
renglón por negocio. Cada renglón muestra: nombre del negocio y ciudad, vendedor atribuido,
estado de pago, fecha del próximo cobro, fecha de alta, y si tiene sucursales.

Arriba tienes herramientas para encontrar lo que buscas:

- Un **buscador** por nombre.
- **Chips de estado** ("Todos / Al corriente / En gracia / Suspendido / Cancelado") con un
  número al lado que te dice cuántos hay de cada uno.
- Filtros por **vendedor** y por **ciudad**.
- Un menú de **orden** (por nombre, por fecha de alta, por próximo cobro, etc.).

La lista viene en **páginas de 20** para que cargue rápido. Si un negocio tiene varias
sucursales, puedes **expandir** su renglón para verlas.

> Lo que ves está acotado a tu rol: el superadmin ve todos; el gerente, solo los de su
> región; el vendedor, solo su cartera. El vendedor, además, no ve la columna de "vendedor"
> (para qué, si todos son suyos).

### La ficha de un negocio

Si haces clic en un renglón, se abre la **ficha** — el expediente del negocio. Tiene:

- **Encabezado:** nombre y una etiqueta de color con su estado.
- **Membresía:** su estado de pago y las fechas relevantes. Aquí cambia un poco según cómo
  paga: si es de **efectivo** ves "Vigencia hasta" y un **historial de pagos** (los últimos 5
  con un "ver todos"; cada fila se puede corregir con el botón de editar); si es de **tarjeta**
  ves "Próximo cobro" y datos de su suscripción.
- **Vendedor atribuido:** quién lo registró.
- **Dueño de la cuenta:** nombre, correo y teléfono del dueño (con un botón para corregir
  el correo, si tienes permiso).
- **Negocio:** ubicación, dirección, sitio web, si terminó su onboarding.
- **Footer con las acciones** (registrar pago, pausar, etc.), que aparece **solo si tu rol
  puede actuar**. El vendedor no ve este footer: para él la ficha es de pura lectura.

---

## 5. ¿Qué puede hacer cada quién?

Esta es la tabla más importante del módulo. "Sí" significa que puede; cuando dice "su
región" o "su cartera", puede pero solo dentro de su territorio:

| Lo que quiere hacer | Superadmin | Gerente | Vendedor |
|---|:---:|:---:|:---:|
| Ver la lista de negocios | Todos | Su región | Su cartera |
| Abrir la ficha de un negocio | Sí | Su región | Su cartera |
| Ver sucursales e historial de pagos | Sí | Su región | Su cartera |
| Filtrar por vendedor | Sí | Su región | — |
| **Dar de alta un negocio (efectivo)** | Sí | Su región | Su región |
| **Registrar un pago** | Sí | Su región | — |
| **Corregir un pago** del historial | Sí | Su región | — |
| **Pausar** una membresía | Sí | Su región | — |
| **Reactivar** una membresía | Sí | Su región | — |
| **Reasignar** el vendedor | Sí | Su región | — |
| **Corregir el correo** del dueño | Sí | Su región | — |
| **Cancelar** (dar de baja) un negocio | **Solo él** | — | — |

En resumen: el **vendedor solo ve y da de alta**; el **gerente administra su región**; el
**superadmin hace todo**, y **cancelar es exclusivo del superadmin**.

---

## 6. Las acciones, una por una

Todas estas viven en el footer de la ficha. Cada acción queda **registrada** (quién la
hizo, cuándo y por qué) en una bitácora interna, por si después hay que auditar.

### Registrar pago
**Para qué:** dejar al negocio al corriente cuando pagó (en efectivo, transferencia, o como
cortesía). Eliges hasta qué fecha queda cubierto y el sistema actualiza su vigencia.

> *Ejemplo: Don Beto, dueño de una taquería, paga $449 por un mes más. El gerente abre su
> ficha, pulsa "Registrar pago", pone "efectivo, $449, 1 mes" y listo: el negocio queda al
> corriente y el pago aparece en su historial.*

Si el negocio paga con **tarjeta**, esta acción también le avisa a Stripe que ya está
cubierto hasta esa fecha. Pero si el negocio de tarjeta **debe dinero** (está en gracia o
suspendido), el sistema **no te deja** registrarle un pago adelantado — primero hay que
regularizar lo que debe en Stripe (el botón se ve apagado y te lo explica).

### Pausar la membresía
**Para qué:** esconder temporalmente un negocio de la app (deja de aparecer), sin darlo de
baja. Es reversible. **Pide un motivo obligatorio.** Si el negocio paga con tarjeta, también
se le **pausa el cobro** para no generarle deuda mientras está pausado.

### Reactivar la membresía
**Para qué:** deshacer una pausa. El negocio vuelve a aparecer en la app y, si es de
tarjeta, se le reanuda el cobro. Solo aplica a negocios que están pausados.

### Reasignar el vendedor
**Para qué:** cambiar (o quitar) el vendedor al que se le atribuye el negocio — por ejemplo,
si un vendedor se va y otro hereda su cartera. El gerente solo puede asignar vendedores que
trabajen en su región.

### Corregir el correo del dueño
**Para qué:** arreglar un correo mal tecleado. Es el típico rescate: en un alta en efectivo,
el vendedor escribió mal el correo y el dueño **nunca recibió** su mensaje para crear la
contraseña. Al corregirlo, el sistema **reenvía** ese mensaje al correo bueno y te dice si
salió o no, para que sepas si el dueño ya lo tiene.

### Cancelar el negocio (solo superadmin)
**Para qué:** dar de baja un negocio. Es una baja **recuperable** (no se borra nada): se
archiva el negocio, se corta su cobro, la cuenta del dueño **baja a cuenta personal** (no se
le expulsa: conserva su cuenta, sus puntos y su historial) y se le **devuelven los puntos**
de los premios que tuviera pendientes. **Pide un motivo obligatorio.**

---

## 7. ¿Por qué "pausado a mano" no se revive con un pago?

Hay un detalle fino que vale la pena entender. Un negocio tiene **dos cosas separadas**:

1. **Si pagó o no** (lo decide el cobro automático).
2. **Si un admin decidió apagarlo a mano** (lo decide una persona).

Esto se separa a propósito para que **un pago automático no "reviva" algo que un humano
apagó con intención**. Si el superadmin pausó un negocio porque tuvo un problema, y justo
entra un cobro de su tarjeta, el negocio **no** vuelve a aparecer solo: sigue pausado hasta
que una persona lo reactive. El pago se registra, pero la decisión humana manda.

En las etiquetas de color que ves en la lista, **la decisión humana gana**: un negocio
pausado a mano se muestra como "Suspendido" aunque su pago esté al corriente.

---

## 8. Dar de alta un negocio en efectivo, paso a paso

Este es el flujo estrella del módulo. Lo construimos en **6 fases**; aquí está la historia
completa de qué pasa, de principio a fin.

> *Escenario: Marisol es vendedora en Puerto Peñasco. Visita "Tacos El Güero", el dueño
> acepta y le paga $449 en efectivo por su primer mes.*

**1. Marisol llena el formulario "Registrar negocio".** Captura: el nombre del negocio, su
ciudad (de una lista; solo le aparecen ciudades de su región), los datos del dueño (nombre,
apellidos, **correo dos veces** para evitar errores, teléfono), y el cobro (efectivo, $449,
1 mes). Mientras teclea el correo, el sistema le avisa al instante si ese correo **ya
estaba registrado** (para no chocar).

**2. El sistema crea todo de un jalón.** En una sola operación se crea: la cuenta del dueño,
el negocio y su sucursal, ya con su ciudad real. El negocio queda marcado como "cobro
manual" (nada de tarjeta) y se registra ese primer pago en su historial. El vencimiento se
calcula solito: hoy + los meses que se pagaron.

**3. La cuenta del dueño nace sin contraseña.** A propósito: nadie le inventa una contraseña
al dueño. En su lugar, le llega un **correo de bienvenida**.

**4. El dueño crea su propia contraseña la primera vez que entra.** Cuando intenta entrar a
la app, el sistema detecta que aún no tiene contraseña y lo manda a la pantalla **"Crea tu
contraseña"**: pide un código que le llega por correo, lo confirma, y de paso **su correo
queda verificado** (porque demostró que es suyo).

**5. Si Marisol escribió mal el correo…** el dueño nunca recibe nada. Para eso existe
**"Corregir el correo"** (§6): un admin pone el correo bueno y el sistema **reenvía** el
código. Es la red de rescate del alta manual.

**6. La vigencia se vigila sola.** Como este negocio no tiene tarjeta que lo cobre
automáticamente, hay un proceso que **revisa todos los días** los negocios de efectivo: en
cuanto se les vence el mes, los pasa a "en gracia" y le avisa al dueño que su membresía está
por caducar. Si no paga, sigue el camino normal hasta suspenderse.

Cuando el dueño quiera renovar, alguien del equipo le **registra otro pago** (§6) y su
vigencia se extiende.

---

## 9. Negocios de tarjeta vs. de efectivo: ¿cómo conviven?

Los dos tipos de negocio viven **mezclados en la misma lista y la misma ficha** — no hay dos
pantallas separadas. La diferencia es de **presentación y de plomería interna**:

| | Pagó en **efectivo** | Pagó con **tarjeta** |
|---|---|---|
| Quién lo dio de alta | Un vendedor, desde el Panel | El dueño solo, desde la app |
| Cómo se cobra | A mano, cada que renueva | Automático (Stripe) cada mes |
| En la ficha ves | "Vigencia hasta" + historial de pagos | "Próximo cobro" + datos de su suscripción |
| Quién vigila el vencimiento | Un proceso diario de AnunciaYA | El cobro automático de Stripe |

Lo importante: **el estado de pago (al corriente / gracia / etc.) significa lo mismo para los
dos.** Solo cambia quién lo mantiene al día.

---

## 10. Preguntas frecuentes

**¿Un vendedor puede ver los negocios de otro vendedor?**
No. Cada vendedor solo ve su propia cartera.

**¿El dueño nunca recibió el correo para crear su contraseña. ¿Qué hago?**
Usa "Corregir el correo" en su ficha (aunque el correo esté bien, al guardarlo se reenvía el
código). Si el correo estaba mal, lo corriges de paso.

**¿Puedo revivir un negocio que ya cancelé?**
No desde "Reactivar" (eso es solo para los *pausados*). Cancelar es una baja archivada; revivir
uno cancelado sería prácticamente darlo de alta de nuevo.

**Le cobré de más / de menos. ¿Puedo corregir el historial?**
Sí. Cada fila del historial tiene un botón de **editar** para corregir el **concepto**
(efectivo/transferencia/cortesía), el **monto** y los **meses cubiertos** de ese pago. Si cambias
los meses, la **"Vigencia hasta"** del negocio se recorre sola (cuando es su pago más reciente);
esa vigencia es real: el cron de manuales la usa para vencer → gracia → suspensión. Solo
SuperAdmin y Gerente (de su región), y queda en auditoría. *Anular/borrar* un pago sí sigue
siendo mejora futura.

**¿Qué es una "cortesía"?**
Un alta o renovación **gratis**: se regala el tiempo de membresía sin cobrar. No lleva monto.
Como **regala** ingreso, solo un **gerente o superadmin** puede darla: el vendedor no ve esa
opción en el formulario de alta, y si la forzara, el servidor la rechaza.

**¿Por qué a veces el botón "Registrar pago" está apagado?**
Porque ese negocio paga con tarjeta y **tiene un cobro pendiente** en Stripe. Primero hay que
regularizar lo que debe; registrar un pago adelantado podría chocar con ese cobro.

**Soy gerente y no veo un negocio que sé que existe.**
Probablemente su sucursal principal está en una ciudad **fuera de tu región**. Solo ves los
negocios cuya sede cae en tu territorio.

---

---

# Capa 2 — Apéndice técnico

> A partir de aquí es referencia para quien va a tocar el código. El permiso real lo decide
> siempre el **backend**; el frontend solo refleja eso.

## A. Mapa de archivos

**Backend** (`apps/api/src/`):

| Archivo | Rol |
|---|---|
| `routes/admin/negocios.routes.ts` | Endpoints, cada uno con su `requierePanel([roles])` |
| `middleware/panel.middleware.ts` | `requierePanel`: autoriza el rol + resuelve la región (revalida en BD) |
| `controllers/admin/negocios.controller.ts` | Lee query/params/body, valida, llama al service |
| `services/admin/negocios.service.ts` | **Lecturas** + cálculo de alcance (`condicionAlcance`, `panelConFiltroRegion`) |
| `services/admin/negocios-acciones.service.ts` | **Escrituras** (suspender/reactivar/reasignar/marcar pagado/cancelar/editar correo) + alcance de escritura (`cargarNegocioConAlcance`) |
| `services/admin/altaManualNegocio.service.ts` | Alta manual + catálogo de ciudades + chequeo de correo en vivo |
| `services/admin/auditoria.service.ts` | `registrarAuditoria` → tabla `admin_auditoria` |
| `validations/admin/altaManualNegocio.schema.ts` | Zod del body del alta |

Las acciones que tocan Stripe pasan por `services/suscripciones/acciones-stripe.ts` (helpers
defensivas: si Stripe falla, la BD manda y se devuelve `advertenciaStripe`). El "Modelo C"
(crear contraseña en el primer ingreso) vive en `auth`/`apps/web`. El cron de vencimientos de
manuales vive en `cron/` (`suscripciones-vencimientos-manuales.cron`).

**Frontend** (`apps/admin/src/components/negocios/`): `SeccionNegocios.tsx` (tabla/cards +
filtros + paginación), `FichaNegocio.tsx` (ficha + footer por rol), `DialogoRegistrarNegocio.tsx`
(alta), `DialogoMarcarPagado.tsx`, `DialogoEditarCorreo.tsx`, `DialogoReasignar.tsx`,
`FichaSucursal.tsx`, `estadoPago.tsx` (`estadoEfectivo()` + `BadgeEstadoPago`), `avatares.tsx`,
`MenuFiltro.tsx`. Datos del servidor en React Query (`hooks/queries/useNegociosAdmin.ts`); rol
del usuario en `stores/useAuthPanelStore.ts`. La ficha abre instantánea con un placeholder de la
fila + prefetch en hover/touch.

## B. Endpoints y permisos

`requierePanel([roles])` declara el permiso en la ruta; el service aplica el alcance fino. Todas
las rutas de `/negocios` se montan **antes** del gate global de superadmin en
`routes/admin/index.ts`, porque la sección la usan también gerente y vendedor.

| Endpoint | Método | Roles | Alcance en el service |
|---|---|---|---|
| `/negocios` | GET | super · gerente · vendedor | super=todo · gerente=su región · vendedor=su cartera |
| `/negocios/vendedores` | GET | super · gerente | gerente=vendedores de su región |
| `/negocios/ciudades` | GET | super · gerente · vendedor | por alcance del rol |
| `/negocios/catalogo-ciudades` | GET | super · gerente · vendedor | acotado a su región (selector del alta) |
| `/negocios/existe-correo` | GET | super · gerente · vendedor | solo booleano |
| `/negocios/:id` | GET | super · gerente · vendedor | por alcance; fuera de alcance → 404 |
| `/negocios/:id/sucursales[/:sucursalId]` | GET | super · gerente · vendedor | por alcance |
| `/negocios/:id/pagos` | GET | super · gerente · vendedor | por alcance; `?limite=N` → los N más recientes (paginación del historial) |
| `/negocios/:id/pagos/:pagoId` | PATCH | super · gerente | editar concepto/monto/meses; recalcula vigencia si es el pago más reciente |
| `/negocios/:id/marcar-pagado` | POST | super · gerente | gerente=su región |
| `/negocios/:id/suspender` | POST | super · gerente | gerente=su región · motivo obligatorio |
| `/negocios/:id/reactivar` | POST | super · gerente | motivo opcional |
| `/negocios/:id/reasignar-vendedor` | POST | super · gerente | gerente: el vendedor nuevo debe cubrir su región |
| `/negocios/:id/correo-dueno` | PATCH | super · gerente | gerente=su región |
| `/negocios/:id/cancelar` | POST | **solo super** | — |
| `/negocios/alta-manual` | POST | super · gerente · vendedor | vendedor se auto-atribuye; ciudad de su región; **cortesía solo super/gerente** |

## C. Cómo se calcula el alcance regional

**Resolución de región** (en `requierePanel`, revalidada en BD cada request):
- superadmin → `null` (ve todo).
- gerente → `usuarios.region_id` (columna directa).
- vendedor → región deducida de `embajador_ciudades → ciudades.region_id` (un trigger garantiza
  una sola región); su cartera se filtra por `negocios.embajador_id`.

**Lectura** (`condicionAlcance`): superadmin sin condición; gerente = `EXISTS` de una sucursal
`es_principal` cuya ciudad cae en su región ("visibilidad = mando"); vendedor =
`negocios.embajador_id = <su embajador>`. Sin región/embajador → `'vacio'` (devuelve vacío sin
tocar BD).

**Escritura** (`cargarNegocioConAlcance`): superadmin sin candado; gerente debe tener región y la
sucursal matriz del negocio debe caer en ella (mismo predicado que la lectura — deben mantenerse
sincronizados; hay un comentario recíproco en ambos archivos). 404 si no existe.

**Filtro global del superadmin** (`panelConFiltroRegion`): solo el superadmin puede pasar
`?regionId=X` para "ver el Panel como el gerente de esa región" (lente de visibilidad). Aplica
**solo a las lecturas**; las **mutaciones ignoran el filtro** y usan el panel del token, así que
el superadmin conserva poder total al actuar aunque esté "viendo" una región. Gerente/vendedor
ignoran el query siempre.

## D. Detalles internos de las acciones

- **Registrar pago** (`marcarPagado`): en una transacción pone `estado_admin='activo'`,
  `activo=true`, `estado_membresia='al_corriente'`, escribe `fecha_vencimiento`/`fecha_proximo_cobro`,
  limpia fechas de gracia, e inserta una fila en `pagos_membresia`. Con suscripción Stripe → empuja
  `trial_end` (la tarjeta retoma sola), `metodo_cobro='tarjeta'`, **guard**: solo si está
  `al_corriente` (si no → 409). Sin suscripción → solo BD, `metodo_cobro='manual'`. Concepto
  efectivo/transferencia (con monto) o cortesía (sin monto). Fecha futura ≤ 2 años. Un negocio
  archivado no se revive aquí (409).
- **Pausar** (`suspender`): `activo=false` + `estado_admin='suspendido'`; pausa el cobro en Stripe
  (`pause_collection 'void'`); notifica al dueño. Motivo obligatorio. 409 si ya está suspendido/archivado.
- **Reactivar**: revierte (`activo=true` + `estado_admin='activo'`); reanuda Stripe; limpia el aviso.
  Solo si está `suspendido`.
- **Reasignar vendedor**: cambia/quita `embajador_id`; el vendedor debe estar activo; el gerente
  solo puede asignar uno que cubra su región. 409 si no hay cambio real.
- **Editar correo** (`cambiarCorreoDueno`): cambia `usuarios.correo` (nace sin verificar), reenvía el
  código (plantilla "crear contraseña" o "recuperar" según exista `contrasena_hash`) y devuelve si el
  envío salió. Unicidad → 409.
- **Cancelar**: corta la suscripción en Stripe; **en una transacción** degrada al dueño a personal
  (`tiene_modo_comercial=false`, `modo_activo='personal'`) y archiva el negocio (`estado_admin='archivado'`
  + `activo=false` + `estado_membresia='cancelado'`) —ambos van juntos o no van—; luego devuelve puntos de
  vales pendientes (idempotente), notifica, y limpia `stripe_subscription_id` al final. Motivo obligatorio.

**Estado efectivo** (chips/badge): el eje administrativo manda sobre el de pago — `archivado→cancelado`,
`suspendido(admin)→suspendido`; si está activo, vale `estado_membresia`. Vive en SQL (`ESTADO_EFECTIVO`)
y en el front (`estadoEfectivo()`). Los conteos de chips reflejan todos los filtros **menos** el de
estado, y viajan como array `{estado,total}` (no objeto: el middleware snake→camel rompería claves como
`al_corriente`).

## E. Alta manual — detalle del flujo

`POST /negocios/alta-manual` (los 3 roles). El service: (0) si el concepto es **cortesía** y el rol es
**vendedor**, corta con 403 (regalar membresía es de gerente/superadmin); (1) rechaza correo duplicado (409);
(2) valida la ciudad (existe/activa/de su región para gerente y vendedor); (3) resuelve el vendedor (auto si rol
vendedor; del body con candado de región si gerente/superadmin); (4) calcula vencimiento = hoy + N meses;
(5) en **una transacción** crea usuario+negocio+sucursal vía `crearNegocioConDueno` (`metodo_cobro='manual'`,
sin Stripe, `contrasena_hash=null`, `correo_verificado=false`, sucursal con `ciudad_id` real) y registra el
primer pago; (6) auditoría + correo de bienvenida (best-effort). Apoyos: `catalogo-ciudades` (selector) y
`existe-correo` (aviso en vivo). El cron `expirarManualesVencidos` pasa los manuales vencidos a `en_gracia`
y notifica (`membresia_en_gracia`); de ahí, el cron de gracia los suspende.

## F. Auditoría

Toda acción sensible llama `registrarAuditoria(panel, {...})` → `admin_auditoria` (actor, rol, acción,
entidad, snapshot antes/después, motivo). Nunca rompe la acción principal (si el insert falla, se loggea y
sigue). Acciones: `negocio_marcar_pagado`, `negocio_suspender`, `negocio_reactivar`,
`negocio_reasignar_vendedor`, `negocio_cancelar`, `negocio_cambiar_correo_dueno`, `negocio_alta_manual`,
`negocio_editar_pago`.

## G. Referencias

- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (login, roles, gate dual, 2FA, regiones, demás secciones).
- `docs/arquitectura/Pagos_Suscripciones.md` — membresía $449/mes, Stripe, los dos ejes de estado, "Registrar pago" Opción A.
- `docs/arquitectura/Negocios.md` — módulo **público** de Negocios (apps/web). **No** confundir con este.
- `docs/arquitectura/Sucursales.md` — sucursales (matriz vs secundarias), de donde sale la ciudad/región.

---

*Última actualización: 10 Junio 2026 · refleja el estado del código tras el alta manual (6 fases), la ampliación de "Registrar pago" a gerentes, la restricción de cortesía a gerente/superadmin, la edición de pagos del historial (concepto/monto/meses + traslado de vigencia), la cancelación transaccional y la paginación del historial de pagos.*
