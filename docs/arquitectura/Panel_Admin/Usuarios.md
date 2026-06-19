# Panel Admin · Módulo Usuarios 👤

> **En una frase:** es la pantalla del Panel donde el equipo de AnunciaYA **encuentra a
> cualquier persona, lee su expediente, diagnostica por qué no puede entrar y controla su
> acceso** a toda la app. Es la **mesa de ayuda + moderación** del lado de las *personas*
> (el gemelo de Negocios, pero para *cuentas* en vez de *membresías*).
>
> **Cómo leer este documento:** está en dos capas. La primera (§1 a §11) explica el módulo
> **en lenguaje de persona**, sin tecnicismos — sirve para cualquiera que llegue sin contexto.
> La segunda (el **Apéndice técnico** al final) es la referencia para quien va a tocar el
> código: archivos, endpoints, permisos y detalles internos.
>
> **Estado:** desplegado y en uso. Última actualización: 11 Junio 2026.
>
> Documento hermano: [`Panel_Admin.md`](Panel_Admin.md) describe el Panel **completo** (login,
> roles, regiones, las demás secciones). Este documento es solo de **Usuarios**.

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

En AnunciaYA hay dos grandes cosas que administrar: los **negocios** (que pagan membresía) y
las **personas** (que usan la app). El módulo Negocios cubre lo primero; **este módulo cubre
lo segundo.**

Las personas se registran **solas** en la app — aquí **no se dan de alta cuentas**. Lo que el
equipo hace en este módulo es:

- **Buscar a cualquier persona** y abrir su **expediente** (quién es, qué cuentas/roles tiene,
  si puede entrar o no).
- **Dar soporte de acceso:** cuando alguien dice *"no puedo entrar"*, aquí se diagnostica por
  qué y se le resuelve (desbloquearlo, darle un código para crear/restablecer su contraseña,
  corregirle un correo mal escrito).
- **Moderar:** suspender una cuenta (que deje de poder entrar a toda la app) o reactivarla.

Dicho simple: **es el "expediente" de cada persona y el panel de control de su acceso.**

> ⚠️ **Lo que NO hace:** no edita los datos personales (nombre, teléfono, foto — eso lo cambia
> cada quien desde su perfil), no borra cuentas (no hay "borrar": *suspender* es la baja), no
> gestiona los **roles de equipo** (eso es el módulo "Equipo y accesos"), ni toca negocios o
> membresías (eso es Negocios / Suscripciones).

---

## 2. ¿Quién lo usa? (y quién no)

A diferencia de Negocios —que lo usan los tres roles—, este módulo es **solo para dos**:

- **Superadmin** — la cabeza de AnunciaYA (hoy, Juan). **Ve a todas las personas** y puede
  hacer todo, incluido suspender/reactivar.

- **Gerente regional** — administra **una región**. Ve a **todos los clientes** de la app
  (que no tienen región), pero de la "gente de negocio" (dueños, encargados, vendedores) solo
  ve **la de su región**. Puede dar **soporte de acceso**, pero **no** puede suspender ni
  reactivar (eso es del superadmin). **Nunca** ve a otros gerentes ni al superadmin.

- **Vendedor** — **no entra a este módulo.** No le aparece en el menú y, si llamara la API
  directo, recibe un 403. (Los vendedores administran su cartera de negocios, no a las personas.)

Piénsalo como Negocios pero con un escalón menos: aquí el vendedor queda fuera.

---

## 3. Diccionario rápido

- **Cuenta / persona / usuario:** una fila en la tabla `usuarios`. Una misma persona puede
  tener **varios "sombreros" a la vez** (ser cliente *y* dueño *y* vendedor); ver §5.
- **Cliente:** una persona que usa la app como consumidor (compra, guarda, usa CardYA). Es el
  "Usuario" a secas, sin ningún rol especial. **No tiene región.**
- **Dueño:** una persona que es **dueña de un negocio** (su cuenta está ligada a un negocio).
- **Gerente de sucursal (o encargado):** un empleado con **acceso a una sucursal** de un
  negocio. Comparte el negocio con el dueño, pero **no es el dueño**.
- **Vendedor (o embajador):** la persona que vende membresías; tiene cartera y comisiones.
- **Cuenta de equipo:** una cuenta con **rol del Panel** (superadmin / gerente regional /
  vendedor). Se administra en "Equipo y accesos", **no** se modera desde aquí.
- **Diagnóstico de acceso:** el cuadro que dice de un vistazo **si la persona puede entrar** y,
  si no, **por qué** (ver §9).
- **Código de acceso:** un código de un solo uso para que la persona **cree o restablezca su
  contraseña**. El Panel lo **genera, lo muestra en pantalla** (para dictarlo) y lo manda por
  correo. Es la red de rescate cuando el correo no llega (ver §8).
- **Cuenta sin contraseña ("Modelo C"):** cuando un negocio se da de alta en efectivo, la
  cuenta del dueño nace **sin contraseña** — la crea él la primera vez que entra. Hasta
  entonces, "no puede iniciar sesión" hasta crearla.
- **Suspender:** bloquear el **login** de una persona en toda la app (no entra a nada). Es
  reversible y **no borra nada** (puntos, reseñas, historial se conservan).
- **Lente de región ("Ámbito de la plataforma"):** el selector de arriba que **solo el
  superadmin** usa para "ver el Panel como si fuera el gerente de una región" (ver §6).
- **Última conexión vs. Último acceso al Panel:** dos métricas distintas — la primera mide la
  **app**, la segunda mide el **Panel**. No confundir (ver §10).

---

## 4. ¿Qué veo en la pantalla?

### La lista de usuarios

Lo primero al entrar. Una **tabla** (o tarjetas, en celular) con un renglón por persona. Cada
renglón muestra: **nombre y correo**, **Rol** (ver §5), **estado** (Activo / Suspendido /
Inactivo), **última conexión** y fecha de **registro**.

Arriba tienes herramientas:

- Un **buscador** por nombre, correo o teléfono.
- **Chips de estado** ("Todos / Activo / Suspendido / Inactivo") con un número que dice cuántos
  hay de cada uno (los conteos respetan los demás filtros, y respetan tu alcance: no cuentan
  cuentas que no puedes ver).
- Un **filtro por Rol** (Todos · Usuario · Dueño · Gerente de sucursal · Vendedor · *Gerente
  regional*). El gerente **no** ve la opción "Gerente regional" (no puede ver gerentes).
- Un **filtro por Ciudad** (cada opción del dropdown trae su conteo) y, en escritorio, una tira
  **"Por ciudad"** arriba de la tabla que muestra cuántos usuarios hay en cada ciudad; al hacer
  clic en un chip, filtra la lista por esa ciudad. Incluye el grupo **"Sin ciudad"** (los que aún
  no tienen ciudad registrada — ver §12). Es a la vez la **medición** y el **acceso rápido** al filtro.
- Un menú de **orden** (por nombre, registro, última conexión, estado).

La lista viene en **páginas de 20**. Arriba a la derecha, el **badge del menú** muestra el
total de tu alcance (se actualiza con los filtros).

### El expediente (al hacer clic en un renglón)

Se abre un modal con cuatro tarjetas. Es un **resumen de 360°**, no un explorador (no navegas
sus pedidos ni sus chats — eso es a propósito, para que el módulo no se infle):

- **Acceso a la app** — el corazón. Un banner verde/rojo de **"Puede / No puede iniciar
  sesión"** (con la lista de razones si no puede) y unos *chips* del estado de su acceso:
  con/sin contraseña, correo verificado, bloqueado por intentos, debe cambiar contraseña, y sus
  **métodos de login** (Google, 2FA).
- **Identidad** — nombre, **correo** (con botón de copiar), teléfono, ciudad, nacimiento.
- **Roles** — sus "sombreros" (Cliente / Dueño de negocio / Empleado / Vendedor / Rol de
  equipo), si tiene **modo comercial**, y el **ID de cuenta** (con botón de copiar, para cruzar
  con la BD/Stripe/auditoría).
- **Actividad** — **última conexión** (a la app), **último acceso al Panel** (solo en cuentas
  de equipo) y fecha de **registro**.

En el **encabezado**, los **íconos de acción** (con tooltip y colores temáticos: azul código de
acceso/desbloquear, ámbar corregir correo, rojo suspender, verde reactivar), que aparecen **solo si
tu rol puede actuar** (§7).

---

## 5. La taxonomía de roles (la columna "Rol")

Una misma persona puede ser varias cosas, pero en la lista se muestra **un rol principal**, con
esta **prioridad** (de mayor a menor):

| Etiqueta | Qué es | De dónde sale |
|---|---|---|
| **SuperAdmin** | Cabeza del Panel | `rol_equipo = superadmin` |
| **Gerente regional** | Administra una región del Panel | `rol_equipo = gerente` |
| **Vendedor** | Equipo de ventas (vende membresías) | `rol_equipo = vendedor` |
| **Gerente de sucursal** | Encargado con acceso a una sucursal | `sucursal_asignada` ≠ null |
| **Dueño** | Dueño de un negocio | `negocio_id` ≠ null y `sucursal_asignada` = null |
| **Usuario** | Cliente de la app | sin nada de lo anterior |

> 🔎 **Dueño vs. Gerente de sucursal:** los dos comparten el **mismo negocio** (mismo
> `negocio_id`). Lo único que los distingue es `sucursal_asignada`: el **dueño** lo tiene en
> nulo (puede moverse entre sucursales); el **encargado** lo tiene fijo a una sucursal. Por eso
> el dueño sale "Dueño" y el encargado "Gerente de sucursal".

Los tres primeros (SuperAdmin / Gerente regional / Vendedor) son el **equipo del Panel**; los
tres últimos son **gente de la app**.

---

## 6. ¿Quién ve a quién? (visibilidad por jerarquía + región)

Esta es la regla más importante del módulo. **Lo que ves depende de tu rol y de la región.**

| Tipo de cuenta | Superadmin | Gerente regional |
|---|:---:|:---:|
| Cliente (Usuario) | Todos | **Todos** (no tienen región) |
| Dueño | Todos | Solo los de **su región** |
| Gerente de sucursal | Todos | Solo los de **su región** |
| Vendedor | Todos | Solo los de **su región** |
| Gerente regional | Todos | **Nunca** (ni a sí mismo) |
| SuperAdmin | Sí | **Nunca** |

**¿De dónde sale la "región" de cada quién?** De donde ya la saca el resto del Panel:
- **Dueño / encargado** → de la **sucursal matriz** de su negocio (su ciudad da la región).
- **Vendedor** → de las **ciudades que cubre** (su cartera).
- **Gerente regional** → de su `region_id` directo.
- **Cliente** → no tiene; por eso el gerente los ve a todos.

> ⚠️ **La ciudad del cliente NO restringe la visibilidad (aún).** Desde Jun 2026 el cliente puede
> tener `ciudad_id` (ver §12), de donde *se podría* deducir su región. Pero esa ciudad se usa **solo
> para medir y filtrar**, no para acotar quién lo ve: el gerente sigue viendo a **todos** los
> clientes. Acoplar la región del cliente a la visibilidad es una decisión consciente para V2.

### La lente del superadmin ("Ámbito de la plataforma")

El superadmin, con el selector de arriba, puede **acotar la vista a una región** —es "ver el
Panel como el gerente de esa región"—. Con una región elegida ve: el **gerente regional** de
esa región, sus **vendedores**, sus **dueños y encargados**, y **todos los clientes** (que no
tienen región). Con "Toda la plataforma" vuelve a ver todo.

> La lente es **solo de visualización**: las **acciones** del superadmin no se limitan por ella
> (igual que en Negocios). Y un **gerente nunca** puede usar la lente para espiar otra región —
> su alcance sale siempre de su token, ignora el selector.

---

## 7. ¿Qué puede hacer cada quién?

"Su alcance" = clientes de toda la plataforma + dueños/encargados/vendedores **de su región**;
nunca otros gerentes ni el superadmin.

| Lo que quiere hacer | Superadmin | Gerente regional | Vendedor |
|---|:---:|:---:|:---:|
| Ver la lista + expediente 360 | Todos | Su alcance | — *(no ve el módulo)* |
| Filtrar por Rol | Sí (incl. "Gerente regional") | Sí (sin "Gerente regional") | — |
| **Desbloquear intentos** | Sí | Su alcance | — |
| **Generar código de acceso** | Sí | Su alcance | — |
| **Corregir el correo** | Sí | Su alcance | — |
| **Suspender** una cuenta | **Solo él** | — | — |
| **Reactivar** una cuenta | **Solo él** | — | — |

**¿Por qué partido así?** El **soporte** (ayudar a entrar) es inocuo, frecuente y urgente → no
puede depender de una sola persona, por eso lo hace también el gerente. La **moderación**
(bloquear de toda la plataforma) es un acto de autoridad, raro y delicado → centralizado en el
superadmin. **Todo queda registrado** en una bitácora interna (§Apéndice F).

---

## 8. Las acciones, una por una

Todas viven como **íconos en el encabezado** del expediente (con tooltip). El gerente solo puede actuar dentro de su alcance (un
dueño/encargado/vendedor de otra región, o una cuenta de equipo, le devuelven 403).

### Desbloquear intentos *(soporte)*
**Para qué:** cuando una cuenta se bloqueó por meter mal la contraseña varias veces. Limpia el
bloqueo y los intentos fallidos para que pueda reintentar de inmediato. El botón solo aparece
si la cuenta **está** bloqueada.

### Código de acceso *(soporte)*
**Para qué:** la pieza estrella del soporte. Genera un **código de un solo uso** para que la
persona **cree** su contraseña (si nunca la tuvo — modelo C) o la **restablezca** (si ya la
tenía). Lo distinto: el código se **muestra en pantalla** para que lo **dictes** por teléfono o
WhatsApp, *además* de enviarse por correo. Así el rescate **no depende de que el correo llegue**.

> *Ejemplo: a Doña Mary nunca le llegó el correo para crear su contraseña. El agente abre su
> ficha, pulsa "Código de acceso", lee el código en pantalla y se lo dicta por teléfono. Ella lo
> escribe en la app y crea su contraseña. Listo, sin esperar correos.*

> 🔒 El **código nunca se guarda** en la bitácora (solo queda registrado *que se generó*, para
> quién y cuándo). Es de un solo uso y expira.

### Corregir el correo *(soporte)*
**Para qué:** arreglar un correo mal tecleado. Al guardarlo, el correo nuevo nace **sin
verificar** y el sistema **reenvía** el código de acceso al correo bueno, diciéndote si salió o
no. (Es el mismo flujo que en Negocios para el correo del dueño.)

### Suspender *(moderación — solo superadmin)*
**Para qué:** bloquear el login de una persona en toda la app. **Pide un motivo obligatorio.**
No borra nada (puntos, reseñas, historial se conservan y se congelan); es 100% reversible.
**Guardas:** no puedes suspenderte a ti mismo, ni suspender una **cuenta de equipo** (esas se
gestionan en "Equipo y accesos").

> **Suspender a la persona ≠ apagar su negocio.** Si suspendes a un dueño, **su negocio sigue
> su propio estado** en la app pública (apagar el negocio es "Pausar" en el módulo Negocios). La
> ficha te avisa que es dueño de un negocio.

### Reactivar *(moderación — solo superadmin)*
**Para qué:** deshacer una suspensión. La cuenta vuelve a poder entrar. Motivo opcional.

---

## 9. Diagnóstico de acceso — ¿por qué no puede entrar?

El banner de "Acceso a la app" resume si la persona puede entrar y, si no, **por qué**. Son las
razones que el login realmente exige:

- **La cuenta no está activa** (suspendida o inactiva). → *Reactivar.*
- **Aún no ha creado su contraseña** (cuenta modelo C). → *Código de acceso.*
- **Está bloqueada por intentos fallidos.** → *Desbloquear intentos.*

Además, los chips muestran de un vistazo: si tiene contraseña, si su correo está verificado, si
debe cambiar la contraseña, y **cómo entra** (Google / Facebook / 2FA). Saber que una cuenta es
**solo-Google** explica el 90% de los *"no puedo entrar"* (no tiene contraseña porque entra con
Google).

---

## 10. Última conexión vs. Último acceso al Panel

Dos métricas que parecen lo mismo pero **no lo son**:

- **Última conexión** → mide la **app AnunciaYA**. Se registra cuando la persona se desconecta
  del tiempo real de la app (ChatYA / presencia). El Panel **no** la toca. Por eso una cuenta de
  **equipo** que solo usa el Panel casi siempre la tiene en "—".
- **Último acceso al Panel** → mide el **Panel**. Se registra cada vez que un miembro de equipo
  **abre el Panel**. Solo aparece en el expediente de **cuentas de equipo** (a un cliente no le
  aplica, no entra al Panel). Es la señal de *"este miembro del equipo está activo"*.

---

## 11. Preguntas frecuentes

**Soy gerente y no encuentro a un dueño que sé que existe.**
Probablemente su negocio está en una ciudad **fuera de tu región**. Ves a todos los *clientes*,
pero de la gente de negocio (dueños, encargados, vendedores) solo la de tu territorio.

**¿Por qué no veo el filtro "Gerente regional"?**
Porque eres gerente, y un gerente **no puede ver a otros gerentes** (ni a sí mismo). Ese filtro
solo le aparece al superadmin.

**Generé un código de acceso pero el correo "falló". ¿Sirve igual?**
Sí. El envío por correo es *best-effort*; el código que ves en pantalla es válido **lo dictes o
no llegue el correo**. (En pruebas, los correos `@test.com` fallan en el sandbox de AWS — es
esperado, no rompe nada.)

**Suspendí a un dueño. ¿Se apagó su negocio?**
No. Suspender solo bloquea el **login** de la persona. Su negocio sigue su propio estado en la
app. Apagar el negocio es "Pausar", en el módulo Negocios.

**¿Puedo borrar una cuenta?**
No hay "borrar". La baja es **Suspender** (reversible, conserva todo). El borrado real de datos
(privacidad/LFPDPPP) es una mejora futura.

**El superadmin, ¿aparece dentro de una región con la lente?**
No. El superadmin no pertenece a ninguna región; solo se ve con "Toda la plataforma".

---

## 12. La ciudad del usuario — ¿de dónde sale?

Hasta Jun 2026 la ciudad de una persona casi no existía como dato: solo la tenían los **dueños** (se
les copia de su negocio); el **cliente** se registraba sin ciudad. Por eso muchos aparecen como
**"Sin ciudad"**.

Desde Jun 2026 la ciudad se **captura sola**: cuando una persona usa la app **con sesión iniciada**,
la ciudad que detecta su GPS / elige en el selector del header se **guarda en su cuenta** (sin pedirle
nada). Así el desglose "por ciudad" se va llenando con el uso.

- **Se normaliza:** la ciudad se guarda como enlace al **catálogo de ciudades** (`ciudad_id`),
  para que "Peñasco", "puerto peñasco" y "Puerto Peñasco" cuenten como **una sola** ciudad. El
  expediente y el filtro leen el **nombre** desde el catálogo (vía `ciudad_id`).
- **"Sin ciudad"** = la persona aún no ha abierto la app con sesión desde que esto existe (o su ciudad
  no está en el catálogo). No es un error; se corrige solo con el uso.
- **Privacidad:** se guarda la **ciudad** (grano grueso), no la ubicación exacta.

> Esto fue la **primera fase** (Expand) de una migración mayor —llevar todos los usos de "ciudad"
> texto al catálogo `ciudades`— que ya quedó **completada** (migrate + contract). Ver el Apéndice I.

---

---

# Capa 2 — Apéndice técnico

> A partir de aquí es referencia para quien va a tocar el código. El permiso real lo decide
> siempre el **backend**; el frontend solo refleja eso.

## A. Mapa de archivos

**Backend** (`apps/api/src/`):

| Archivo | Rol |
|---|---|
| `routes/admin/usuarios.routes.ts` | Endpoints, cada uno con su `requierePanel([roles])` |
| `middleware/panel.middleware.ts` | `requierePanel`: autoriza el rol + resuelve la región (revalida en BD) |
| `controllers/admin/usuarios.controller.ts` | Lee query/params/body, valida, llama al service; `regionDeConsulta(req)` |
| `services/admin/usuarios.service.ts` | **Lecturas** (lista + conteo + expediente) + `condicionVisibilidad` |
| `services/admin/usuarios-acciones.service.ts` | **Escrituras** (desbloquear / código / correo / suspender / reactivar) + `fueraDeAlcance` |
| `controllers/admin/sesion.controller.ts` | `GET /admin/yo`: además registra `ultimo_acceso_panel` (fire-and-forget) |
| `services/admin/auditoria.service.ts` | `registrarAuditoria` → tabla `admin_auditoria` |

**Frontend** (`apps/admin/src/components/usuarios/`): `SeccionUsuarios.tsx` (tabla/cards +
filtros + paginación + `rolPrincipal()` + filtro de rol acoplado al rol), `FichaUsuario.tsx`
(expediente + footer por rol + `DatoCopiable`), `DialogoCodigoAcceso.tsx` (muestra el código
para dictar), `estadoUsuario.tsx` (`BadgeEstadoUsuario` + `metaEstadoUsuario`),
`avataresUsuario.tsx`. Reusa `ui/ModalAdaptativo`, `ui/VisorImagen`, `ui/DialogoConfirmar`,
`negocios/DialogoEditarCorreo`, `negocios/MenuFiltro`, y los helpers `Seccion`/`Dato`/`fecha`
de `FichaNegocio`. Datos del servidor en React Query (`hooks/queries/useUsuariosAdmin.ts`); el
badge del menú vía `stores/useContadorPanel.ts`; la lente de región vía `stores/useFiltroRegion.ts`
(invalida `queryKeys.usuarios.all()` al cambiar de ámbito). El interceptor de `services/api.ts`
ya adjunta `?regionId` para el superadmin. La ficha abre instantánea con un placeholder de la
fila + prefetch en hover/touch.

## B. Endpoints y permisos

`requierePanel([roles])` declara el permiso en la ruta; el service aplica la visibilidad fina.
Todas las rutas de `/usuarios` se montan **antes** del gate global de superadmin en
`routes/admin/index.ts`, porque la sección la usa también el gerente. **El vendedor recibe 403
en todas** (y el ítem "Usuarios" no aparece en su menú — `data/menuPanel.ts`).

| Endpoint | Método | Roles | Notas |
|---|---|---|---|
| `/usuarios` | GET | super · gerente | lista paginada + conteos por estado; alcance por `condicionVisibilidad`; filtros `?tipo`, `?estado`, **`?ciudadId`** (id del catálogo o `sin-ciudad`) |
| `/usuarios/conteo` | GET | super · gerente | total del alcance (badge del menú) |
| `/usuarios/por-ciudad` | GET | super · gerente | desglose `[{ciudadId, ciudad, estado, total}]` (respeta visibilidad); métrica + opciones del filtro; incluye grupo "Sin ciudad" |
| `/usuarios/:id` | GET | super · gerente | expediente 360; fuera de alcance → 404 |
| `/usuarios/:id/desbloquear` | POST | super · gerente | soporte; 409 si no está bloqueada |
| `/usuarios/:id/codigo-acceso` | POST | super · gerente | genera + **devuelve** el código (para dictarlo) |
| `/usuarios/:id/correo` | PATCH | super · gerente | corrige el correo + reenvía el código; unicidad → 409 |
| `/usuarios/:id/suspender` | POST | **solo super** | motivo obligatorio; no auto, no cuentas de equipo |
| `/usuarios/:id/reactivar` | POST | **solo super** | motivo opcional |

## C. Visibilidad por jerarquía + región

Una **sola función** decide qué se ve, y se inyecta en lista, conteos, badge y expediente, para
que nunca se desincronicen: `condicionVisibilidad(rolSolicitante, regionSolicitante)` en
`usuarios.service.ts`.

- **superadmin sin lente** → `undefined` (ve todo).
- **superadmin con lente** (`?regionId`) → esa región **completa**: dueños/encargados de
  negocios de la región (sucursal matriz → ciudad → región) + vendedores de la región
  (embajador_ciudades) + el **gerente regional** de la región + **clientes** (sin región) todos.
- **gerente** → clientes todos; dueños/encargados y vendedores **solo de su región**; **nunca**
  superadmin ni gerentes. Gerente sin región → solo clientes.

La **región efectiva** la calcula el controller con `regionDeConsulta(req)`: el **gerente** usa
**siempre** la región de su token (ignora `?regionId`, por seguridad); el **superadmin** usa la
lente `?regionId` si la mandó. El frontend manda `?regionId` solo para el superadmin (interceptor
de `api.ts`) y solo si la URL es `/admin/*`.

> ⚠️ **Subqueries correlacionadas:** dentro de un `sql` en el SELECT, Drizzle **no** prefija
> `${usuarios.id}` (lo deja como `"id"`) y choca con `embajadores.id`/`ciudades.id` (error 42702
> *"column reference is ambiguous"*). Por eso las referencias a la tabla externa van **literales
> y calificadas** (`usuarios.id`, `usuarios.negocio_id`) en `condicionVisibilidad` y en
> `cargarUsuario`. Si tocas una, revisa la otra.

## D. Detalles internos de las acciones

Las escrituras viven en `usuarios-acciones.service.ts`. Cada una carga la cuenta con
`cargarUsuario` y pasa por el guard `fueraDeAlcance(panel, target)` antes de actuar.

- **`fueraDeAlcance`** (guard de jerarquía/región): si el actor es **gerente**, bloquea (403)
  cuando el objetivo es superadmin/gerente, o un dueño/encargado/vendedor **de otra región**
  (región del negocio vía sucursal matriz; región del vendedor vía embajador_ciudades). El
  superadmin no tiene candado.
- **`desbloquearIntentos`**: limpia `bloqueado_hasta` + `intentos_fallidos`. 409 si no está
  bloqueada.
- **`generarCodigoAcceso`**: tipo `crear` (sin `contrasena_hash`) o `restablecer` (con); guarda
  el código en `tokenStore` (mismo flujo que el self-service), lo envía por correo (best-effort)
  y **devuelve** el código. **El código NO se audita** (solo `tipo` + `correoEnviado`).
- **`cambiarCorreoUsuario`**: cambia `usuarios.correo` (nace `correo_verificado=false`), valida
  unicidad (409), y reenvía el código al correo nuevo. Calco de `cambiarCorreoDueno` de Negocios.
- **`suspenderUsuario`** (solo super): `estado='suspendido'` + `fecha_cambio_estado` +
  `motivo_cambio_estado`. Guards: no auto-suspensión (409), no cuentas con `rol_equipo` (409), no
  si ya está suspendida (409). El login corta a las cuentas no-activas.
- **`reactivarUsuario`** (solo super): `estado='activo'` + `fecha_cambio_estado` + `motivo_cambio_estado`. 409 si ya activa. (El "cuándo" de la reactivación queda en `fecha_cambio_estado` y en la auditoría `usuario_reactivar`.)

**Estado de la cuenta** (`activo` / `suspendido` / `inactivo`): el badge usa
`metaEstadoUsuario`. `inactivo` se reserva para una baja voluntaria futura (no es un botón). La
única palanca hoy es Suspender ↔ Reactivar.

## E. El expediente — qué expone (sin secretos)

`obtenerExpediente` **nunca** devuelve secretos (`contrasena_hash`, `*_secreto`); solo
booleanos derivados (`tieneContrasena`, etc.). Trae:

- **Diagnóstico** (`DiagnosticoAcceso`): `correoVerificado`, `tieneContrasena`,
  `bloqueadoPorIntentos`, `bloqueadoHasta`, `intentosFallidos`, `requiereCambioContrasena`,
  `puedeIniciarSesion` (= `estado==='activo' && tieneContrasena && !bloqueado`).
- **Sombreros** (`SombrerosUsuario`): dueño/negocio, empleado (`total_empleos`), embajador
  (`codigo_referido`), `rol_equipo`, billeteras/saldo de puntos, total de reseñas — todo en
  contadores, **nunca** listados navegables.
- Identidad + verificaciones + métodos de auth + reputación + `ultimo_acceso_panel`. La **ciudad**
  se resuelve por `LEFT JOIN ciudades c ON c.id = usuarios.ciudad_id` (`c.nombre AS ciudad`); ya
  no se lee de una columna texto.

El modal (`FichaUsuario.tsx`) se depuró: muestra **Acceso** (diagnóstico + login social/2FA),
**Identidad** (sin género; correo copiable), **Roles** (sombreros + modo comercial + ID copiable)
y **Actividad** (última conexión + último acceso al Panel solo para equipo + registro). Se
quitaron del modal: perfil, modo activo, reputación, reseñas y puntos (ruido para el soporte).

## F. Auditoría

Toda acción llama `registrarAuditoria(panel, {...})` → `admin_auditoria` (actor, rol, acción,
entidad, snapshot antes/después, motivo). Nunca rompe la acción principal (si el insert falla, se
loggea y sigue). Acciones: `usuario_desbloquear_intentos`, `usuario_generar_codigo_acceso` (sin
el código), `usuario_cambiar_correo`, `usuario_suspender`, `usuario_reactivar`.

## G. Migraciones

One-shot manuales (el deploy no toca la BD):

- **`docs/migraciones/usuarios_ultimo_acceso_panel.sql`** — `ALTER TABLE usuarios ADD COLUMN
  ultimo_acceso_panel timestamptz`. Lo escribe `GET /admin/yo` (arranque del Panel) para cuentas
  de equipo. Distinto de `ultima_conexion` (app, vía Socket.io). Correr **antes** de desplegar.
- **`docs/migraciones/2026-06-16-usuarios-ciudad-id.sql`** — `ADD COLUMN ciudad_id uuid REFERENCES
  ciudades(id)` + índice. Backfill: **`apps/api/scripts/mapear-usuario-ciudad-id.ts`** (mapea el
  texto `usuarios.ciudad` → `ciudad_id` por slug; tolera datos legacy "Ciudad, Estado"). Orden en
  PROD: migración SQL primero, luego el backfill (`DB_ENVIRONMENT=production`). Ver Apéndice I.
- **DROP de `usuarios.ciudad` (texto)** — fase **contract** de la migración. Ya **corrida en DEV**;
  **pendiente en PROD** (último paso operativo, una vez validado el backfill). Tras el DROP, la
  ciudad vive solo en `ciudad_id` y se lee del catálogo.

El resto del módulo usa columnas que ya existían (`estado`, `negocio_id`, `sucursal_asignada`,
`rol_equipo`, `region_id`, `bloqueado_hasta`, `intentos_fallidos`, `correo_verificado`,
`contrasena_hash`, etc.).

## H. Referencias

- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (login, roles, gate dual, 2FA, regiones).
- [`Negocios.md`](Negocios.md) — **plantilla de oro** (se calcó su código y estructura); de ahí
  salen las deducciones de región (sucursal matriz, embajador_ciudades).
- `docs/estandares/PATRON_REACT_QUERY.md` — el patrón de datos del servidor que usa el módulo.
- `Tokens_Panel.md` — sistema de diseño del Panel.

## I. Ubicación del usuario (ciudad) — dato, puente, filtro y métrica

Capacidad agregada el **16 Jun 2026** (sobre el módulo ya cerrado): **medir y filtrar usuarios por
ciudad**. Gemela de `negocio_sucursales.ciudad_id`. Forma parte de la migración global "ciudad texto
→ catálogo `ciudades`" (ver memoria de proyecto `project-migracion-ciudad-catalogo`), que para
`usuarios` ya quedó **completada** (expand → migrate → contract): el `ciudad_id` se pobló por backfill
y el texto `usuarios.ciudad` se **DROPeó en DEV** (DROP en PROD pendiente como último paso, ver Apéndice G).

**El dato.** Columna **`usuarios.ciudad_id` uuid** → FK a `ciudades` (nullable, `ON DELETE SET NULL`)
+ índice completo `idx_usuarios_ciudad_id`. Es la **única** fuente de la ciudad: el expediente, el
filtro y la métrica la resuelven por `JOIN` al catálogo (`c.nombre AS ciudad`). El texto
`usuarios.ciudad` ya **no se lee** (queda como columna a DROPear en PROD).

**El puente (app web).** El `useGpsStore` vive en el cliente y nunca mandaba la ciudad al backend.
Se agregó:
- `PATCH /api/auth/ubicacion` (`actualizarUbicacionUsuario` en `auth.service.ts`): recibe el **nombre**
  de la ciudad, lo resuelve a `ciudad_id` con `resolverCiudadId` (slug) y persiste **solo `ciudad_id`**.
  No toca `region_id`. Sin match en el catálogo → `ciudad_id` NULL.
- `reportarUbicacion()` en `apps/web/src/services/authService.ts` + un efecto en
  `apps/web/src/router/RootLayout.tsx` que lo dispara cuando hay sesión + ciudad fijada (clave
  `usuarioId:ciudad`, fire-and-forget). Manda **solo el nombre** (no "Ciudad, Estado").

**Backend del Panel** (`usuarios.service.ts`): `condicionCiudad(ciudadId)` (centinela `sin-ciudad` →
`ciudad_id IS NULL`) en la BASE de `listarUsuarios`; `usuariosPorCiudad()` agrupa por `ciudad_id`
(reusa `condicionVisibilidad`) y resuelve nombres con el catálogo (grupo "Sin ciudad" al final).

**Frontend del Panel** (`SeccionUsuarios.tsx`): `MenuFiltro` de ciudad (opciones con conteo, desde
`useUsuariosPorCiudad`) + `ResumenCiudades` (tira de chips clicables = métrica + drill-down, solo
escritorio). El estado `ciudad` (id o `sin-ciudad`) va en la BASE de filtros (afecta conteos por estado).

**Decisión de alcance:** `ciudad_id` se usa **solo para medir/filtrar**, NO para restringir la
visibilidad por región (ver §6). Acoplarlo a la visibilidad del cliente es V2.

---

*Última actualización: 19 Junio 2026 · migración ciudad→catálogo **completada** para `usuarios`
(expand→migrate→contract): la ciudad se lee solo del catálogo vía `ciudad_id` (expediente, filtro y
métrica); el texto `usuarios.ciudad` se DROPeó en DEV y el DROP en PROD queda como último paso (ver
§12, Apéndice G y Apéndice I). Antes (16 Jun 2026): agrega medición/filtrado por ciudad
(`usuarios.ciudad_id` + puente GPS→backend `PATCH /auth/ubicacion` + filtro y métrica "por ciudad" en
el Panel). Antes (11 Jun 2026): taxonomía de roles (SuperAdmin / Gerente regional / Vendedor /
Dueño / Gerente de sucursal / Usuario), filtro por rol acoplado al rol, visibilidad por jerarquía +
región del gerente (acotado, ya no cross-región), lente de región del superadmin, expediente depurado
(correo/ID copiables), y la métrica "último acceso al Panel".*
