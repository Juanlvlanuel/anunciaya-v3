# Equipo y accesos — Pendientes (checklist del módulo)

> **Qué es este documento:** lo que **falta** por hacer en el módulo "Equipo y accesos" del Panel
> Admin, y la **Fase 0 (Definir)** del carril mientras se construye. Lo ya terminado (qué ES y cómo
> funciona) vivirá en el documento hermano **`Equipo_y_accesos.md`** (se escribe al cerrar, Fase 3).
>
> **Regla de oro:** cuando un pendiente se termina, se **borra de aquí** y, si cambió el
> comportamiento, se documenta en `Equipo_y_accesos.md`. Uno se vacía, el otro crece.
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantilla de oro: Negocios.**
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · ✅ hecho
>
> **Última actualización:** 16 Junio 2026 — **MÓDULO CERRADO (Fase 3).** Gestión completa de cuentas
> internas: alta de vendedor y de gerente · editar datos · reasignar región · revocar/reactivar
> (vendedores y gerentes) · revocados visibles · typeahead/autocompletado de cuentas · aviso de
> promoción. Verificado (harness lectura 12 + acciones 16) + builds en verde + verificación visual.
> Doc canónico [`Equipo_y_accesos.md`](Equipo_y_accesos.md). Territorio avanzado diferido a Vendedores y comisiones.

---

## Estado del módulo

**Cerrado y en uso (Fase 3 completa, 16 Jun 2026).** La definición y el funcionamiento completos están
en **[`Equipo_y_accesos.md`](Equipo_y_accesos.md)** (el "RR.HH./IT" del Panel). Quedan solo los V2 de
abajo (territorio avanzado del vendedor, en "Vendedores y comisiones").

> **Alcance v1 (16 Jun 2026): gestión completa de cuentas internas.** Arrancó "primero vendedores" y
> luego se sumó la **2ª pasada** (gerentes): crear gerente, editar datos, reasignar región y
> revocar/reactivar gerentes. La lectura muestra a todo el equipo (incluidos los revocados, que siguen
> visibles como "Sin acceso"). Lo único fuera de v1 es la **gestión de territorio** (cambiar/ampliar/
> mover ciudades), que se difirió a "Vendedores y comisiones" (ver §Diferido).

**Frontera con "Vendedores y comisiones" (decidida 16 Jun 2026):** el **alta del vendedor vive
aquí** — un wizard único crea la cuenta → asigna rol → si es vendedor, además crea su fila
`embajadores` + código de referido + cobertura `embajador_ciudades`. "Vendedores y comisiones"
NO vuelve a "crear" a nadie: se queda con la **operación** (cartera, escalera de comisiones,
cálculo mensual, cortes de caja, desempeño). Resumen: **Equipo = identidad/acceso · Vendedores =
nómina/CRM.**

---

## Fase 0 — Mini-spec

### Qué hace
- **Crear cuentas internas** (gerente, vendedor) y asignarles rol + alcance (región para el gerente,
  ciudades para el vendedor).
- **Listar el equipo** (las cuentas con `rol_equipo`), filtrable por rol y región.
- **Ficha del miembro:** quién es, rol, alcance, estado del acceso y **último acceso al Panel**
  (columna `ultimo_acceso_panel`, ya existe).
- **Alta del vendedor (flujo completo):** crea `usuarios` + `embajadores` (con código de referido) +
  `embajador_ciudades` (1+ ciudades de UNA misma región — lo garantiza el trigger) + `rol_equipo='vendedor'`.
- **Revocar / cambiar acceso:** quitar el rol de equipo (degrada a usuario normal de la app),
  cambiar la región de un gerente o las ciudades de un vendedor.
- **Resetear el acceso** del miembro (reenviar código para crear/restablecer contraseña — mismo
  mecanismo que el soporte de Usuarios).

### Qué NO hace (fronteras con otros módulos)
- **No modera personas** (suspender/reactivar la cuenta en toda la app) → eso es **Usuarios**.
- **No gestiona comisiones / cartera / cortes de caja** → eso es **Vendedores y comisiones** (aquí
  solo se crea y se da de baja al vendedor).
- **No edita datos personales** (nombre, teléfono, foto — los cambia cada quien en su perfil).
- **No crea / agrupa regiones ni ciudades** → eso es **Ciudades**.
- **No construye el demo de Business Studio** del vendedor → eso es el módulo Vendedores/demo; aquí
  el enganche al demo comercial **se difiere** (no bloquea el alta).

### Matriz de permisos por rol
Leyenda: **Total** = toda la plataforma · **Sus vendedores** = solo los de su región · **—** = sin acceso

| Acción | SuperAdmin | Gerente Regional | Vendedor |
|---|---|---|---|
| Ver el equipo | Total (super, gerentes, vendedores) | Solo **sus vendedores** | — |
| Crear gerente | ✅ | — | — |
| Crear vendedor | ✅ (cualquier región) | ✅ (solo en su región) | — |
| Cambiar región de un gerente | ✅ | — | — |
| Cambiar ciudades de un vendedor | ✅ | ✅ (sus vendedores) | — |
| Revocar acceso (quitar rol) | ✅ (cualquiera) | ✅ (sus vendedores · NO gerentes) | — |
| Resetear acceso (código de contraseña) | ✅ | ✅ (sus vendedores) | — |

> Coherente con la matriz maestra de `Panel_Admin.md` (Equipo: SuperAdmin **Total** · Gerente
> **Sus vendedores** · Vendedor **—**). Regla de fondo: nombrar gerentes y crear cuentas es del
> SuperAdmin; el gerente solo arma y mantiene **su** equipo de vendedores.

---

## Fase 0 — Decisiones de diseño (con recomendación)

| # | Decisión | Recomendación | Estado |
|---|---|---|---|
| **D1** | ¿Cómo nace la cuenta interna? | **Modelo C** (sin contraseña): nace con `contrasena_hash=NULL`; el miembro la crea en su primer ingreso con código por correo (login responde 409 `CUENTA_SIN_CONTRASENA`). Reusa lo ya construido en el alta manual de negocios. | ✅ resuelta |
| **D2** | ¿Correo que ya existe como usuario? | **Promover, no duplicar:** el alta busca por correo; si ya existe → asigna `rol_equipo` + alcance a esa cuenta (respeta "una persona = una cuenta"). Si ya tenía contraseña, **no** se resetea. Cubre "nombrar gerente a un usuario que ya usa la app". | ✅ resuelta |
| **D3** | ¿Qué es "dar de baja del equipo"? | **Quitar el rol, no suspender:** `rol_equipo=NULL` + `embajadores.estado='inactivo'` (deja de contar para comisiones y de poder registrar). **La atribución de sus negocios NO se borra** (de por vida). Suspender la *persona* es de Usuarios. **Garantía de corte:** `requierePanel` revalida `rol_equipo`/`estado` **contra la BD en cada petición** ([`panel.middleware.ts:84`](../../../apps/api/src/middleware/panel.middleware.ts)) → al poner el rol en NULL, la siguiente llamada al Panel responde 403 al instante, **aunque conserve su contraseña y un token vigente**. Su contraseña solo le sirve para la app de cliente. **No hace falta lista negra de tokens.** | ✅ resuelta |
| **D4** | ¿El vendedor nace comercial (demo BS)? | **No por ahora:** nace `perfil='personal'` + rol vendedor + embajador + ciudades (como los seeds actuales). El modo comercial/demo se engancha en el módulo Vendedores/demo. No bloquear el alta por el demo. | ✅ resuelta |
| **D5** | Código de referido del vendedor | **Autogenerar** uno único (derivado del nombre + sufijo), **editable** antes de guardar, con validación de unicidad. | ✅ resuelta |
| **D6** | ¿Cómo se sabe el gerente de un vendedor? | **Se deduce** (el gerente cuya `region_id` = la región de las ciudades del vendedor). Sin columna nueva. | ✅ resuelta |
| **D7** | ¿Se crean superadmins desde la UI? | **No en v1.** La UI crea (v1: solo vendedor; 2ª pasada: gerente). Un co-superadmin se siembra por SQL si algún día hace falta. | ✅ resuelta |
| **D8** | ¿Migración SQL? | **No hace falta.** Las columnas/tablas ya existen (`usuarios.rol_equipo`, `usuarios.region_id`, `embajadores`, `embajador_ciudades`, `ultimo_acceso_panel`). La limpieza de `embajadores.porcentaje_*` es del módulo Vendedores. | ✅ resuelta |
| **D9** | Auditoría | Toda alta / baja / cambio de rol o alcance → `registrarAuditoria` → `admin_auditoria`. Obligatorio por carril. | ✅ resuelta |

---

## Fase 0 — Criterios de aceptación (Definición de Terminado)

**Lectura (Gate 1 ✅ — verificado con harness + visual el 16 Jun 2026):**
- [x] **A1** — El superadmin ve a todo el equipo (super, gerentes, vendedores) con rol, alcance
  (región/ciudades), estado de acceso y último acceso al Panel.
- [x] **A2** — El gerente ve **solo a sus vendedores** (los de su región); no ve otros gerentes, ni
  vendedores de otra región, ni al superadmin. Una llamada directa a la API fuera de alcance → 403/filtrado.
- [x] **A3** — El vendedor no ve el módulo y la API le responde 403 (defensa en profundidad en el service).
- [x] **A4** — La lente de región del superadmin acota el listado a la región elegida. (Fix: invalidación
  de `equipo` en `useFiltroRegion` al cambiar la región.)

**Acción (Gate 2):**
- [x] **A5** — El superadmin crea un **gerente** (botón "Dar de alta" → Gerente) → cuenta con
  `rol_equipo='gerente'` + `region_id`, modelo C; el gerente crea su contraseña y entra. ✓ harness ([10]).
  Además: editar datos ([11]), reasignar región ([12]), revocar/reactivar gerente ([13][14]), y un gerente
  no puede crear gerentes ([15]).
- [x] **A6** — Super/gerente crea un **vendedor** (correo nuevo) → `usuarios` + `embajadores`
  (código único) + `embajador_ciudades` + `rol_equipo='vendedor'`; nace modelo C; región deducida. ✓ harness
- [x] **A7** — Alta con **correo existente** sin rol de equipo → promueve esa cuenta (sin duplicar);
  reactiva a un vendedor dado de baja conservando su código. Si ya es del equipo → 409. ✓ harness
- [x] **A8** — El gerente **no** puede crear vendedores fuera de su región → 403. ✓ harness (crear gerente: diferido)
- [x] **A9** — Revocar acceso → `rol_equipo=NULL` + `embajadores.estado='inactivo'`; corte inmediato;
  **atribución conservada** (la fila embajador persiste). El revocado **sigue visible** ("Sin acceso") y
  se **reactiva** de un clic (E4). ✓ harness
- [—] **A10** *(diferido a "Vendedores y comisiones")* — la gestión de territorio (ajustar/ampliar/mover
  ciudades) no vive en Equipo. La cobertura inicial se asigna en el alta (A6); el resto es del módulo 6.
- [x] **A11** — Toda alta/baja/cambio llama a `registrarAuditoria` → `admin_auditoria` (actor, acción, antes/después).
- [x] **A12** — El backend valida el alcance (no confía en la UI) · `tsc` backend ✅ · `tsc -b`+`vite build` del Panel ✅.

---

## ✅ Puntos confirmados con Juan (16 Jun 2026)

1. **D3 — baja del vendedor:** revocar acceso = `rol_equipo=NULL` + `embajadores.estado='inactivo'` +
   conservar atribución. El corte es **inmediato** porque `requierePanel` revalida el rol contra la BD
   en cada petición (la contraseña/token vigente no bastan para entrar al Panel). **Confirmado.**
2. **D4 — vendedor comercial:** nace **personal**; el demo de BS se difiere al módulo Vendedores. **OK.**
3. **D7 — superadmins:** la UI **no** crea superadmins en v1. **OK.**
4. **Alcance v1:** **primero vendedores** — la UI de alta en v1 crea solo vendedores; "crear gerente"
   queda para una 2ª pasada. La lectura sí muestra a todo el equipo. **Confirmado.**

---

## Fase 2 — Plan y decisiones (16 Jun 2026)

**Acciones v1 (cuentas internas: vendedores y gerentes):**
1. **Alta de vendedor** — crea/promueve la cuenta + `embajadores` (código) + `embajador_ciudades`
   (1+ ciudades de UNA región) + `rol_equipo='vendedor'`. Super (cualquier región) + gerente (la suya).
   **Aquí se asigna la cobertura inicial** del vendedor.
2. **Alta de gerente** — crea/promueve la cuenta + `rol_equipo='gerente'` + `region_id`. **Solo superadmin.**

> **Correo por aviso (16 Jun):** al **promover** una cuenta existente, recibe un correo de bienvenida al
> equipo (`enviarEmailBienvenidaEquipo`, sin contraseña — ya tiene la suya). El **alta nueva** sigue con
> el código modelo C, que **verifica el correo** al crear la contraseña. El **typeahead** del alta busca
> cuentas por correo y autocompleta (correo como primer campo + validación de formato en vivo).
3. **Editar datos** — corrige nombre/apellidos/teléfono **siempre**; el **correo solo es editable
   mientras la cuenta no tiene contraseña** (modelo C — para arreglar un typo del alta; reenvía el
   código al nuevo, que verifica al crear la contraseña). Una vez con contraseña, el correo (la llave
   de acceso) queda **solo lectura**: lo cambia la persona desde su perfil (futuro), no el admin.
   Super (cualquiera) · gerente (sus vendedores).
4. **Reasignar región** — cambia la región a cargo de un gerente. **Solo superadmin.**
5. **Revocar acceso** — `rol_equipo=NULL`. Vendedor (super/gerente; + embajador `inactivo`) · gerente
   (solo super; conserva `region_id`). El revocado sigue visible como "Sin acceso".
6. **Reactivar acceso** — devuelve el acceso a un vendedor o gerente revocado (conserva código/ciudades o región).

> **"Cambiar ciudades" se quitó de Equipo (decisión 16 Jun).** La **gestión de territorio** (ajustar/
> ampliar/mover ciudades) vive en **"Vendedores y comisiones"**. En Equipo, la cobertura del vendedor
> solo se fija en el **alta**.

**E4 — revocados visibles (decisión 16 Jun, a partir de prueba de Juan):** un vendedor revocado **sigue
apareciendo en la lista** con badge **"Sin acceso"** (el universo de la lista incluye a los ex-vendedores:
cuentas con embajador aunque `rol_equipo` sea NULL) y su ficha ofrece **"Reactivar acceso"** de un clic
—mismo patrón que las cuentas suspendidas en Usuarios—. Antes desaparecía y solo se recuperaba dándolo de
alta de nuevo con el mismo correo (ese camino sigue funcionando).

**Decisiones confirmadas:**
- **E1 — correo existente:** **PROMOVER**. Si el correo ya tiene cuenta y NO es del equipo → se convierte
  en vendedor sobre su misma cuenta (conserva contraseña). Si ya es vendedor/gerente/super → 409 con mensaje claro.
- **E2 — activación (modelo C):** al crear una cuenta **nueva** se envía automáticamente el código para
  crear contraseña (best-effort, reusa el helper de Usuarios). Al promover una cuenta que ya tiene
  contraseña, no se envía nada.
- **E3 — código de referido:** **autogenerado editable** (derivado del nombre + sufijo, único en
  `embajadores.codigo_referido`); el admin puede ajustarlo; unicidad **case-sensitive** (coherente con la
  resolución del `?ref=`, ver [[project_codigo_referido_solo_link]]).

**Alcance sincronizado** lectura↔escritura: gerente solo crea/edita/revoca vendedores de SU región
(ciudades de su región); super en cualquier región. Toda acción → `admin_auditoria`. **Sin migración SQL**
(D8): usa `embajadores`, `embajador_ciudades`, `usuarios.rol_equipo`/`es_embajador`.

---

## Diferido a "Vendedores y comisiones" (módulo 6) — modelo de cobertura avanzado

Decisión de Juan (16 Jun 2026), a partir de probar "cambiar ciudades". El modelo de cobertura del
vendedor evolucionará, pero se construye en el **módulo 6** (donde viven la cartera y las comisiones
para razonarlo bien), NO en Equipo:

- **Cobertura multi-región PARCIAL:** un vendedor podrá cubrir ciudades de su región **+ ciudades
  sueltas de regiones vecinas** (no la región entera). Implica **quitar el trigger** "una sola región"
  de `embajador_ciudades`.
- **Multi-gerente:** un vendedor con ciudades en 2 regiones queda bajo el **mando de los 2 gerentes**.
  Hay que rehacer el alcance que hoy asume "vendedor de UNA región": `panel.middleware` (deduce la
  región con `LIMIT 1`) y las condiciones de alcance de Negocios/Usuarios/Suscripciones/Equipo.
- **Mover de región = soltar cartera:** si mueven a un vendedor de región, **ya no atenderá** esos
  negocios → esa cartera **sale de la suya** (se reasigna a otro vendedor / queda sin vendedor),
  coherente con "la comisión recurrente se gana **atendiendo**". El movimiento administrativo rompe la
  atención y, con ella, la comisión (matiza el "de por vida": no es pasivo).
- **Dos operaciones distintas:** (a) **agregar/quitar ciudades puntuales** (ajuste fino, incl. de
  regiones vecinas) y (b) **mover de región** (con reasignación de cartera).

> En **Equipo y accesos (v1)**, "cambiar ciudades" solo hace (a) **dentro de la región actual**. Todo
> lo demás (multi-región, multi-gerente, mover-con-reasignación) es trabajo del módulo 6.

---

## Checklist del carril

```
### Módulo: EQUIPO Y ACCESOS   ·   Fase actual: ✔ Cerrado

Fase 0 — Definir ✅
- [x] Mini-spec (qué hace / qué no / matriz de permisos por rol)
- [x] Decisiones de diseño (D1–D9, todas resueltas) + sin migración SQL (D8)
- [x] Criterios de aceptación escritos (A1–A12; A5 diferido a 2ª pasada)
- [x] Puntos a confirmar resueltos con Juan (alcance v1: solo vendedores)

Fase 1 — VER ✅
- [x] Backend lectura (routes → controller → service, alcance por rol) · harness probar-equipo-lectura.ts (12 bloques ✓ datos reales) + tsc ✅
- [x] Frontend lectura (equipoService → useEquipoAdmin → SeccionEquipo + FichaMiembro + badge del menú, diseño base) · build ✅
- [x] GATE 1: datos reales ✓ + tsc/build ✅ + verificación visual ✓ (filtro de región, card móvil, link de referido) + A1–A4 ✓

Fase 2 — ACTUAR
- [x] Backend acciones — vendedores (alta/revocar/reactivar) **y** gerentes (alta/editar datos/reasignar región/revocar/reactivar) + alcance por rol + auditoría + Modelo C + sin migración · tsc ✅
- [x] GATE 2 backend: harness `probar-equipo-acciones.ts` **TODO VERDE** con datos reales (16 Jun, casos [1]–[16]: alta vend/gerente, promover, editar datos, reasignar región, revocar/reactivar, typeahead, correo bloqueado con contraseña)
- [x] Frontend acciones (wizard de alta vendedor/gerente + diálogos editar datos/reasignar región + revocar/reactivar en la ficha + botón "Dar de alta" con menú por rol) · `tsc -b`+`build` ✅
- [x] GATE 2: backend datos reales ✓ + tsc/build ✅ + A5–A12 ✓ + verificación visual ✓ (typeahead, correo bloqueado, promoción)
- [x] PULIDO VISUAL del módulo completo (sin violaciones de tokens; componentes calcados de Negocios/Usuarios)

Fase 3 — Cerrar ✅
- [x] Doc canónico Equipo_y_accesos.md (2 capas)
- [x] Vaciar este checklist + estado del módulo cerrado
- [x] Índices (tablero, Panel_Admin.md, ROADMAP, memoria)
- [ ] Commit a main (pendiente del OK de Juan)
```

---

## Referencias

- `Equipo_y_accesos.md` — **qué ES y cómo funciona** (documento hermano canónico, se escribe en Fase 3).
- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (§Las 11 secciones · §Los 3 niveles · §Comisiones).
- [`Tablero_Modulos.md`](Tablero_Modulos.md) — índice de módulos.
- [`Negocios.md`](Negocios.md) + [`Negocios_Pendientes.md`](Negocios_Pendientes.md) — plantilla de oro.
- [`Usuarios.md`](Usuarios.md) — módulo hermano (la frontera Usuarios↔Equipo: aquí los roles, allá la moderación).
- `apps/api/scripts/seed-gerentes-dev.ts` · `seed-vendedor-prueba.ts` — cómo nacen hoy las cuentas internas (a reemplazar por UI).
```
