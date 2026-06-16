# Panel Admin · Módulo Equipo y accesos 🛡️

> **En una frase:** es la pantalla del Panel donde se **dan de alta y se administran las cuentas
> internas** de AnunciaYA (gerentes regionales y vendedores) y su **acceso al Panel**. Es el
> **"RR.HH./IT"** del equipo — el gemelo de Usuarios, pero para *el equipo* en vez de *los clientes*.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§10) explica el módulo **en lenguaje de
> persona**, sin tecnicismos. La segunda (**Apéndice técnico**) es la referencia para tocar el código.
>
> **Estado:** desplegado y en uso. Última actualización: 16 Junio 2026.
>
> Documento hermano: [`Panel_Admin.md`](Panel_Admin.md) (el Panel completo) · pendientes y decisiones
> de construcción en [`Equipo_y_accesos_Pendientes.md`](Equipo_y_accesos_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

El equipo de AnunciaYA tiene tres niveles: **SuperAdmin** (Juan), **Gerentes Regionales** y
**Vendedores**. Antes esas cuentas internas solo se podían crear por SQL. Este módulo es donde se
**crean, se administran y se les controla el acceso** desde el Panel, sin tocar la base de datos.

Aquí se puede:

- **Dar de alta** un vendedor o un gerente (su cuenta nace lista para que la persona entre).
- **Corregir sus datos** (nombre, teléfono y —con candado— su correo).
- **Reasignar la región** de un gerente.
- **Revocar el acceso** de alguien que dejó el equipo, y **reactivarlo** si vuelve.

> ⚠️ **Lo que NO hace:** no gestiona la **cartera, comisiones ni el territorio** del vendedor (eso es
> "Vendedores y comisiones"; aquí solo se le asigna su **cobertura inicial** al darlo de alta), no
> modera clientes (eso es Usuarios), ni crea/agrupa ciudades o regiones (eso es Ciudades).

---

## 2. ¿Quién lo usa? (y quién no)

- **SuperAdmin** — ve a **todo el equipo** y puede todo: crear vendedores y **gerentes**, reasignar
  regiones, editar datos, revocar/reactivar a cualquiera.
- **Gerente Regional** — ve y administra **solo a sus vendedores** (los de su región): puede crearlos,
  editar sus datos y revocar/reactivar su acceso. **No** ve ni toca a otros gerentes ni al superadmin,
  **no** crea gerentes y **no** reasigna regiones.
- **Vendedor** — **no entra** a este módulo (no le aparece y la API le responde 403).

---

## 3. Diccionario rápido

- **Cuenta interna / miembro del equipo:** una fila de `usuarios` con **rol de equipo**
  (`superadmin` / `gerente` / `vendedor`). El rol es una **capa encima** del tipo de cuenta
  (`personal`/`comercial`), no lo reemplaza.
- **Alcance:** para el **gerente** = su región; para el **vendedor** = las ciudades que cubre; para el
  **superadmin** = toda la plataforma.
- **Modelo C (cuenta sin contraseña):** una cuenta nueva del equipo nace **sin contraseña**; la persona
  la crea en su primer ingreso con un código que recibe por correo. El correo trae un botón
  **"Activar mi cuenta"** que abre el **Panel** directo en el paso de **escribir el código** (no la app
  pública). Al crear la contraseña, **su correo queda verificado**.
- **Promover:** convertir una cuenta **ya existente** (cliente o dueño) en miembro del equipo,
  sumándole el rol sobre su misma cuenta (conserva su contraseña y todo lo suyo).
- **Acceso:** badge que dice si la persona puede entrar al Panel — **Activo**, **Pendiente de activar**
  (modelo C, aún sin contraseña) o **Sin acceso** (revocado / suspendido).
- **Revocar / Reactivar:** quitar el rol de equipo (corta el Panel al instante) / devolverlo. El
  revocado **sigue visible** en la lista como "Sin acceso".

---

## 4. Qué se ve

- **Lista** del equipo: Miembro (nombre + correo) · Rol · Alcance · Acceso · Último acceso al Panel.
  Con búsqueda, **chips por rol** (solo el super) y orden. El gerente solo ve a sus vendedores.
- **Ficha** de un miembro (abre al instante): acceso al Panel, identidad (correo/ID copiables), rol y
  alcance, y —para vendedores— su **link de registro** copiable, código, estado y nº de negocios
  atribuidos. Botón **⋯** con las acciones que correspondan al rol de quien mira.

---

## 5. Dar de alta (vendedor o gerente)

Botón **"Dar de alta"** (el super elige Vendedor o Gerente; el gerente solo Vendedor):

1. **Correo primero**, con **validación en vivo** (borde rojo si el formato es inválido) y un
   **typeahead**: al escribir, busca cuentas existentes; al elegir una, **autocompleta** nombre y
   teléfono (eso es una **promoción**). Las cuentas que ya son del equipo salen marcadas y no se eligen.
2. Datos de la persona (nombre, apellidos, teléfono opcional).
3. **Vendedor:** región + ciudades que cubre (de una misma región) + **código de referido**
   autogenerado y editable. · **Gerente:** la región a su cargo.

Si el correo es **nuevo**, la cuenta nace en **modelo C** y se le envía el código para crear su
contraseña; ese correo lleva un botón que **abre el Panel directo en el paso del código**. Si el correo
**ya existe** (no es del equipo), se **promueve** y recibe un correo de bienvenida (conserva su
contraseña). Si ya es del equipo, se rechaza.

---

## 6. Editar datos · reasignar región

- **Editar datos:** corrige nombre, apellidos y teléfono **siempre**. El **correo** solo se puede
  cambiar **mientras la cuenta no tiene contraseña** (modelo C — para arreglar un typo del alta; se
  reenvía el código al nuevo). Una vez verificado, el correo (la llave de acceso) queda **solo lectura**
  y lo cambia la persona desde su perfil.
- **Reasignar región** (solo super, sobre gerentes): cambia la región a cargo de un gerente.

---

## 7. Revocar y reactivar el acceso

- **Revocar:** quita el rol de equipo → la persona **deja de entrar al Panel al instante** (el gate
  revalida en la BD en cada petición; su contraseña ya no le sirve para el Panel). Para un vendedor,
  además su perfil de vendedor queda **inactivo** pero **conserva la atribución** de sus negocios. Para
  un gerente, **conserva su región** para poder reactivarlo. **Vendedor:** super o su gerente · **Gerente:** solo super.
- **Reactivar:** devuelve el acceso, conservando lo suyo (código y ciudades del vendedor, región del gerente).

El revocado **no desaparece**: sigue en la lista como "Sin acceso", listo para reactivar.

---

## 8. Tabla de permisos

| Acción | SuperAdmin | Gerente | Vendedor |
|---|---|---|---|
| Ver el equipo | Total | Solo sus vendedores | — |
| Crear vendedor | ✅ (cualquier región) | ✅ (su región) | — |
| Crear gerente | ✅ | — | — |
| Editar datos | ✅ (cualquiera) | ✅ (sus vendedores) | — |
| Reasignar región (gerente) | ✅ | — | — |
| Revocar / reactivar vendedor | ✅ | ✅ (su región) | — |
| Revocar / reactivar gerente | ✅ | — | — |

> La UI solo refleja; **el backend valida el alcance en cada acción** (no confía en el cliente).

---

## 9. Frontera con "Vendedores y comisiones"

**Equipo = identidad/acceso · Vendedores y comisiones = operación.** Aquí se crea y se da de baja al
vendedor y se le asigna su **cobertura inicial**. La **gestión del territorio** (ajustar/ampliar/mover
ciudades, cobertura multi-región, mover de región soltando la cartera) y las **comisiones/cortes** son
del módulo 6. Ese modelo de cobertura avanzado quedó **diseñado y diferido** — ver
[`Equipo_y_accesos_Pendientes.md`](Equipo_y_accesos_Pendientes.md) §Diferido.

---

## 10. Preguntas frecuentes

- **¿Una cuenta de cliente o dueño puede unirse al equipo?** Sí — al darla de alta con su correo se
  **promueve** (conserva su contraseña, su negocio si lo tiene). Si ya es del equipo, se rechaza.
- **¿Por qué un revocado sigue apareciendo?** Para no perderlo de vista y poder reactivarlo de un clic;
  su atribución/región se conservan.
- **¿Cómo activa su cuenta un gerente/vendedor nuevo?** Le llega un correo con el botón **"Activar mi
  cuenta"**; al darle clic se abre el **Panel** (no la app pública) ya en el paso de **escribir el código**
  (que viene en ese mismo correo) y poner su contraseña. El código **expira en 15 min**; si caduca, desde
  ahí mismo puede reenviarlo.
- **¿Por qué no puedo cambiar el correo de alguien que ya entró?** Porque es su llave de acceso ya
  verificada; lo cambia la persona desde su perfil. El admin solo lo corrige antes de que active la cuenta.
- **¿Se envían correos en desarrollo?** No a direcciones de prueba (SES en sandbox las rechaza); en
  producción salen normal. Todos los correos son **best-effort**: si fallan, la acción igual queda.

---

# Apéndice técnico

## A. Mapa de archivos

**Backend** (`apps/api/src/`)
- `services/admin/equipo.service.ts` — lecturas (lista + ficha + conteo), catálogo de ciudades,
  búsqueda de cuentas (typeahead). Alcance por rol (`condicionAlcance`), rol efectivo y `revocado`.
- `services/admin/equipo-acciones.service.ts` — escrituras: `altaVendedor`, `altaGerente`, `editarDatos`,
  `reasignarRegion`, `revocarAcceso`, `reactivarAcceso`, `sugerirCodigoReferido`. Auditoría + Modelo C.
- `controllers/admin/equipo.controller.ts` · `routes/admin/equipo.routes.ts` (montado antes del gate global).
- `validations/admin/equipo.schema.ts` — Zod (alta vendedor/gerente, editar datos, reasignar región).
- `utils/email.ts` → `enviarEmailBienvenidaEquipo` (aviso de promoción) y `enviarCodigoCrearContrasena(...,
  'panel')` → `plantillaCrearContrasena(... destino)` (correo de activación; `'panel'` enlaza al Panel,
  `'web'` a la app pública).
- `config/env.ts` (`PANEL_URL`) · `middleware/cors.ts` (suma `process.env.PANEL_URL`, normaliza barra final).
- `scripts/probar-equipo-acciones.ts` · `scripts/probar-equipo-lectura.ts` — harness (datos reales).

**Frontend** (`apps/admin/src/`)
- `services/equipoService.ts` · `hooks/queries/useEquipoAdmin.ts` (React Query + mutaciones con invalidación).
- `components/equipo/`: `SeccionEquipo`, `FichaMiembro`, `DialogoAltaVendedor`, `DialogoAltaGerente`,
  `DialogoEditarDatos`, `DialogoReasignarRegion`, `SelectorCobertura`, `CampoCorreoCuenta`, `estadoAcceso`.
- `pages/PaginaPanel.tsx` (engancha la sección + badge), `config/queryKeys.ts`, `stores/useContadorPanel.ts`.
- **Activación:** `pages/PaginaLogin.tsx` lee `?activarCuenta=<correo>` del enlace y abre
  `components/acceso/RecuperarContrasena.tsx` con `modoCrear` + `pasoInicial='codigo'` (copy de "crear", arranca en el código).

## B. Endpoints (`/api/admin/equipo`, `requierePanel(['superadmin','gerente'])`)

| Método · Ruta | Rol | Qué hace |
|---|---|---|
| `GET /` · `/conteo` · `/:id` | super + gerente | Lista (con alcance) · conteo (badge) · ficha |
| `GET /ciudades` · `/buscar-cuenta` · `/sugerir-codigo` | super + gerente | Catálogo de ciudades · typeahead de cuentas · código sugerido |
| `POST /vendedores` | super + gerente | Alta de vendedor (crear/promover) |
| `POST /gerentes` | **solo super** | Alta de gerente |
| `PATCH /:id/datos` | super + gerente | Editar nombre/apellidos/teléfono/correo (alcance + correo solo modelo C) |
| `PATCH /:id/region` | **solo super** | Reasignar región de un gerente |
| `POST /:id/revocar` · `/:id/reactivar` | super + gerente | Cortar / devolver acceso (gerentes solo super) |

## C. Detalles de implementación

- **Universo de la lista:** cuentas con `rol_equipo` **o** ex-miembros revocados (ex-vendedor con
  embajador, ex-gerente con `region_id`). El **rol efectivo** se deduce con `COALESCE` para mostrar al
  revocado con su rol; `revocado = rol_equipo IS NULL`.
- **Alcance por rol** (`condicionAlcance`): gerente → sus vendedores (por `embajador_ciudades`);
  super → todo, o la región de la **lente** `?regionId`. Sincronizado lectura ↔ escritura.
- **Modelo C:** cuenta nueva nace con `contrasena_hash=NULL`, `correo_verificado=false`; verifica al
  crear la contraseña (`auth.service` marca `correo_verificado=true`).
- **Sin migración SQL:** usa columnas/tablas existentes (`usuarios.rol_equipo`/`region_id`,
  `embajadores`, `embajador_ciudades`). El código de referido es **case-sensitive** (igual que el `?ref=`).
- **Auditoría:** toda acción → `registrarAuditoria` → `admin_auditoria`.
- **Activación al Panel (`PANEL_URL`):** el correo de modelo C del equipo enlaza al **Panel** (no a la
  app pública) directo en el paso del código. La env var `PANEL_URL` (en Render, sin barra final)
  gobierna de un solo golpe **el enlace del correo** y **el CORS** del Panel. Si falta, el enlace cae a
  `FRONTEND_URL` (no rompe). Los otros disparadores del mismo correo (usuarios/negocios/auth) siguen
  yendo a la web. **Despliegue:** el Panel es un proyecto Vercel aparte (`anunciaya-v3-admin`, Root
  `apps/admin`); el backend sigue en Render. Detalle: memoria `project_despliegue_panel`.

## D. Verificación

- `probar-equipo-lectura.ts` (12 bloques) — alcance por rol, lente, ficha, defensa en profundidad.
- `probar-equipo-acciones.ts` (16 casos) — alta vendedor/gerente, promover, editar datos, reasignar
  región, revocar/reactivar (vend. y gerente), typeahead, correo bloqueado con contraseña.
- `tsc` (api) + `tsc -b` + `vite build` (admin) en verde.
