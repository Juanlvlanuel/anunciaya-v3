# Panel Admin · Módulo Auditoría 🧾

> **En una frase:** la **bitácora de acciones del equipo** — quién hizo qué, sobre qué y cuándo, en
> lenguaje de persona. Es el registro de **responsabilidad** del Panel: toda acción sensible (suspender
> un negocio, registrar un pago, cambiar un precio, dar de alta un vendedor…) queda anotada y aquí se
> consulta. **Solo lectura.**
>
> **Cómo leer este documento:** dos capas. La primera (§1–§7) explica el módulo **en lenguaje de
> persona**. La segunda (**Apéndice técnico**) es la referencia para quien toca el código.
>
> **Estado:** construido y en uso. La **escritura** (que cada módulo registre sus acciones) ya existía
> como cimiento transversal (`registrarAuditoria` → `admin_auditoria`); lo que se construyó aquí es la
> **UI de lectura** + un borrado de limpieza (solo super, para staging). Como es esencialmente lectura,
> el carril pasa por 0 (Definir) → 1 (VER) → 3 (Cerrar). Backend verificado con harness contra datos
> reales; `tsc` api+admin y `vite build` verdes. **Sin migración SQL** (la tabla ya existía).
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) · [`Mantenimiento_R2.md`](Mantenimiento_R2.md)
> (el otro medio del módulo 11 "Sistema") · [`Negocios.md`](Negocios.md) (plantilla de oro) ·
> [`Tokens_Panel.md`](Tokens_Panel.md). Checklist: [`Auditoria_Pendientes.md`](Auditoria_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Es la **caja negra** del Panel. Cada vez que alguien del equipo (super, gerente o vendedor) hace una
acción que cambia algo importante —suspende un negocio, registra un pago, edita un precio, da de alta a
un vendedor, cambia un correo— el sistema lo anota automáticamente. Esta pantalla es donde se **consulta
ese historial**: para rendir cuentas, investigar un error ("¿quién canceló este negocio?"), o auditar
qué pasó y cuándo.

**No edita ni dispara nada.** Es un espejo del pasado. La única escritura que ofrece es **borrar**
registros, y solo el super, pensado para limpiar datos de prueba en staging (la auditoría es inmutable
por principio).

> **El reto de diseño no fue *mostrar* los datos, fue *traducirlos*.** En crudo, un registro de
> auditoría es jerga: `negocio_suspender`, `estadoAdmin: "suspendido"`, un `embajador_id` UUID. Este
> módulo convierte eso en una frase que cualquiera entiende: *"Gerente Centro suspendió el negocio
> Plomería Express · Falta de pago · 20 Jun 2026"*. Cómo se hace esa traducción —de forma **sistémica**,
> no acción por acción— es el §5 y el corazón del módulo.

## 2. ¿Quién lo usa? (alcance por rol)

El backend resuelve el alcance; no se confía en la UI. Respeta el **filtro global de región** del super.

| Rol | Qué ve |
|---|---|
| **Superadmin** | Toda la bitácora (o la región del filtro global). Puede **borrar** registros y **vaciar** todo. |
| **Gerente** | Solo las acciones de **su equipo** (las suyas + las de los vendedores de su región, y las acciones sobre entidades de su región). **No** puede borrar. |
| **Vendedor** | **No entra** (403). Un vendedor no audita al equipo. |

## 3. La pantalla (la lista)

Una tabla (escritorio) / cards (móvil), del más reciente al más antiguo, con 4 columnas:

- **Responsable** — avatar + nombre + rol de quien hizo la acción (mismo avatar que el resto del Panel).
- **Actividad** — la acción en lenguaje de persona ("Suspendió un negocio") + un **badge de módulo**
  (Negocios, Usuarios, Ciudades, Equipo, Vendedores, Configuración, Membresía, Recibos) con el acento
  azul de la marca.
- **Objeto** — sobre qué recayó la acción, **por su nombre** (el negocio "Plomería Express", el usuario
  "María García"), nunca un id.
- **Fecha y hora** — `20 Jun · 07:33`, formato del proyecto.

**Filtros** (arriba): por **acción**, por **persona** (actor), por **periodo** (hoy / 7 / 30 días / año)
y **orden** (recientes / antiguos). Todo corre en servidor, con paginación de 20. El menú de "acción"
tiene **scroll interno** (tope `min(62vh, 360px)`) porque el catálogo es largo.

## 4. El detalle de una acción (la ficha)

Clic en una fila abre la **ficha** (modal centrado en escritorio, bottom-sheet en móvil), instantánea
(placeholder de la fila + prefetch en hover). Todo el detalle vive en **una sola tarjeta**:

1. **Encabezado** — la acción como protagonista (título grande) + badge de módulo + "por *Fulano* ·
   *Rol* · *correo*".
2. **Sobre** — la entidad afectada, etiquetada por su tipo ("Negocio", "Usuario", "Vendedor"…) y con su
   **nombre real**. Se omite cuando no hay un nombre (config, comisiones).
3. **Los datos** — los campos del cambio, humanizados y ordenados (ver §5). Si un campo cambió, se ve
   **"antes → después"** (el antes tachado).
4. **Motivo** — si la acción lo llevaba (suspender, cancelar, anular).
5. **Fecha y hora** — al pie.

## 5. Las reglas de presentación *(el corazón del módulo)*

Hay **~40 tipos de acción**. La decisión clave fue **no** escribir 40 plantillas, sino **un sistema de
reglas** que aplica a todas por diccionarios — y que ante una acción nueva **degrada con elegancia**
(la humaniza) en vez de romper. Las reglas:

1. **Encabezado = quién · qué · sobre · cuándo.** Siempre una frase de persona, verbo en pasado. Nunca
   el nombre técnico de la acción.
2. **Cero jerga.** Ningún nombre técnico de campo (`estadoAdmin`, `mesesCubiertos`) ni valor enum
   (`al_corriente`, `efectivo`) crudo: todos pasan por un diccionario a texto humano.
3. **Ningún UUID, jamás.** Los ids dentro de los datos se **resuelven a nombres** en el backend (la
   región, la ciudad, el negocio, el vendedor) o se **ocultan**. Esto es **sistémico** (lo hace el
   service para cualquier clave id-like), no caso por caso.
4. **Nombres reales, no ids.** La entidad afectada se muestra por su nombre, resuelto por JOIN; si la
   acción no apunta a un id (p. ej. una alta, donde la entidad aún no "es" un id en la columna), el
   nombre se **deriva del snapshot**.
5. **Valores legibles.** Montos con **$** (`$849.00`), fechas con el formato del proyecto (**`20 Jun
   2026`**, mes capitalizado, sin corrimiento de zona), periodos `2026-06` → `Jun 2026`, arrays unidos
   por coma, booleanos **Sí/No**, claves de configuración por su nombre humano.
6. **Sin duplicados.** El dato que ya se muestra en "Sobre" no se repite abajo; la fecha de un pago que
   coincide con la fecha de la acción se omite.
7. **Agrupado y ordenado.** Todo en una tarjeta, con un orden lógico fijo: **dinero → forma de pago →
   identidad → estado → lo creado → región → lo omitido → fechas → banderas**. Las claves no listadas
   caen al final en su orden natural.

> **Regla maestra:** si mañana aparece una acción nueva sin entrada en los diccionarios, el módulo
> **no se rompe**: la acción cae a un fallback legible (se humaniza el nombre), los campos se humanizan
> (`camelCase`/`snake_case` → "Texto legible"), y los ids se siguen resolviendo/ocultando. La calidad
> baja un poco, pero nunca se ve jerga ni un UUID. Para subir la calidad de esa acción nueva, se agrega
> su entrada al diccionario correspondiente — sin tocar lógica.

## 6. Borrado (limpieza, solo super)

La auditoría es **inmutable por principio** — borrarla va contra su propósito. Pero para **depurar datos
de prueba en staging** se permite, **solo al super**:

- **Papelera por fila** (aparece al pasar el mouse) — borra un registro, con confirmación.
- **"Vaciar"** (botón en la barra) — borra **toda** la bitácora, con confirmación que dice cuántos.

El gerente no ve estos controles (ni el backend se lo permite: `DELETE` exige superadmin).

## 7. Preguntas frecuentes

- **¿Qué acciones se registran?** Las **sensibles** de cada módulo: altas/bajas/suspensiones de negocios
  y usuarios, pagos y su edición/anulación, cambios de precio y plan, alta/promoción/revocación de
  equipo, alta y agrupación de ciudades/regiones, cambios de configuración, reenvío de recibos, datos y
  entregas de efectivo de vendedores. El catálogo completo está en el apéndice.
- **¿Por qué una acción aparece hecha por un vendedor o un gerente, no por el super?** Porque la hizo esa
  persona. El sistema registra al **actor real** que ejecutó la acción. Cada acción la realiza el rol que
  le corresponde (un vendedor da de alta sus negocios y edita **sus** datos de cobro; un gerente
  suspende negocios de su región; el super maneja tesorería, catálogo y configuración).
- **¿Por qué un registro no muestra "Sobre"?** Porque la acción no recae sobre una entidad con nombre
  (p. ej. cambiar una configuración global). En ese caso el "qué" y los datos bastan.
- **¿Se puede editar un registro?** No. Solo leer (todos) o borrar (super, para limpieza). No hay forma
  de alterar lo que dice un registro — esa es la garantía de una bitácora.
- **¿Por qué el filtro de acciones lista opciones que no aparecen en los datos?** El filtro usa el
  **catálogo** de acciones conocidas (estático). Si seleccionas una que aún no ha ocurrido, la lista sale
  vacía. (Mejora futura: poblar el filtro solo con las acciones presentes — ver pendientes.)

---

# Apéndice técnico

## Mapa de archivos

**Backend** (`apps/api/src/`):

| Pieza | Archivo |
|---|---|
| Service de **lectura** (lista + detalle + actores + alcance + **resolución de ids/nombres**) | `services/admin/auditoria-consulta.service.ts` |
| Service de **borrado** (eliminar uno · vaciar) | `services/admin/auditoria-acciones.service.ts` |
| Controller | `controllers/admin/auditoria.controller.ts` |
| Rutas | `routes/admin/auditoria.routes.ts` (montadas en `routes/admin/index.ts` **antes** del gate global; lectura super+gerente, borrado solo super) |
| **Escritura** (cimiento transversal, ya existía) | `services/admin/auditoria.service.ts` (`registrarAuditoria`) — lo llaman los services de acciones de cada módulo |
| Harness | `scripts/probar-auditoria-lectura.ts` · seed de revisión (solo DEV): `scripts/sembrar-auditoria-muestra.ts` |

**Frontend** (`apps/admin/src/`):

| Pieza | Archivo |
|---|---|
| Service axios (lista/detalle/actores/eliminar/vaciar) + tipos | `services/auditoriaService.ts` |
| Hooks RQ (`keepPreviousData`) | `hooks/queries/useAuditoriaAdmin.ts` · keys en `config/queryKeys.ts` (`auditoria`) |
| Sección (tabla/cards + filtros + paginación + borrado) | `components/auditoria/SeccionAuditoria.tsx` |
| Ficha (detalle instantáneo) | `components/auditoria/FichaAuditoria.tsx` |
| **Diccionarios de presentación** (acción→texto, módulo, badge, tipo de entidad) | `components/auditoria/accionesAuditoria.tsx` |
| Avatar / dropdown / modal / diálogo reusados | `components/usuarios/avataresUsuario.tsx` · `components/negocios/MenuFiltro.tsx` · `components/ui/{ModalAdaptativo,DialogoConfirmar,EstadoSeccion}.tsx` |
| Cableado · invalidación por región | `pages/PaginaPanel.tsx` · `stores/useFiltroRegion.ts` |

## Endpoints (alcance por rol en el service)

| Método | Ruta | Roles | Qué hace |
|---|---|---|---|
| `GET` | `/api/admin/auditoria` | super · gerente | Bitácora paginada. Filtros: `accion`, `actorId`, `entidadTipo`, `entidadId`, `desde`, `hasta`, `orden`, `pagina`, `porPagina` (máx 100). |
| `GET` | `/api/admin/auditoria/actores` | super · gerente | Actores presentes en el alcance (para el filtro "persona"). |
| `GET` | `/api/admin/auditoria/:id` | super · gerente | Detalle de un registro (snapshots resueltos/enriquecidos). |
| `DELETE` | `/api/admin/auditoria/:id` | **solo super** | Borra un registro (limpieza de staging). |
| `DELETE` | `/api/admin/auditoria` | **solo super** | Vacía toda la bitácora. |

`?regionId=` lo añade el interceptor (lente del super); el gerente lo ignora (su token manda).
`/actores` se declara **antes** de `/:id` para que "actores" no caiga en el comodín.

## La tabla `admin_auditoria` (de dónde salen los datos)

Cada acción sensible la escribe `registrarAuditoria(...)` dentro del service de acciones del módulo
correspondiente (Negocios, Usuarios, Equipo, Ciudades, Configuración, Vendedores, Recibos):

| Columna | Qué guarda |
|---|---|
| `actor_id` / `actor_rol` | Quién la hizo (FK a `usuarios`) y con qué rol (`superadmin`/`gerente`/`vendedor`). |
| `accion` | Clave técnica (`negocio_suspender`, `config_actualizar`…). El diccionario la traduce. |
| `entidad_tipo` / `entidad_id` | Sobre qué tipo de entidad y su id (nullable: en altas aún no hay id). |
| `datos_previos` / `datos_nuevos` | **jsonb** — el snapshot antes/después. De aquí sale el "antes → después" y los campos. |
| `motivo` | Texto opcional (suspender/cancelar/anular). |
| `created_at` | Cuándo. |

## Resolución de ids y nombres (la pieza sistémica)

Lo que hace que **nunca** se vea un UUID, sin programar caso por caso, vive en
`auditoria-consulta.service.ts`:

- **`resolverEntidadNombre(fila)`** — por `entidad_tipo` + `entidad_id`, hace el JOIN a la tabla real y
  devuelve el nombre (negocio, usuario, ciudad, región, embajador).
- **`nombreDesdeSnapshot(datos)`** — cuando no hay `entidad_id` (altas), deriva el nombre del snapshot
  (`nombre`+`apellidos`, `nombreNegocio`, etc.) para la columna "Objeto".
- **`enriquecerSnapshot(datos)`** — recorre el jsonb y, para cada clave **id-like resoluble**
  (`regionId`, `ciudadId`, `negocioId`, `sucursalId`, `usuarioId`, `duenoId`, `embajadorId`,
  `regionComun`, `regionVendedor`, `ciudadIds[]`…), reemplaza el UUID por el **nombre** y re-etiqueta la
  clave (p. ej. `embajadorId` → "Vendedor: *Nombre*", `ciudadIds[]` → "Ciudades de cobertura: A, B, C").
  Oculta ids de Stripe y cualquier UUID crudo que sobre.
- El **frontend** (`FichaAuditoria.tsx`) toma esos datos ya limpios y solo aplica formato visual:
  etiquetas humanas (`ETIQUETA_CLAVE`), valores legibles (`VALOR_LEGIBLE`, `$`, fechas), orden
  (`ORDEN_CLAVE`), y oculta lo redundante (`CLAVES_OCULTAS`, lo que ya va en "Sobre").

> **División de responsabilidades:** el **backend** resuelve *identidad* (ids → nombres) porque solo él
> tiene la BD; el **frontend** resuelve *presentación* (formato, orden, etiquetas) porque es cosmético.
> Por eso la regla "ningún UUID" es sistémica: se aplica una vez en el service para todas las acciones.

## Catálogo de acciones (quién las realiza)

Las claves viven en `ACCION_LABEL` (`accionesAuditoria.tsx`) con su módulo por prefijo. El rol que
**típicamente** ejecuta cada grupo:

| Módulo | Acciones | Quién las hace |
|---|---|---|
| **Negocios** | alta_manual, marcar_pagado, reenviar_recibo | vendedor (su cartera) · super/gerente |
| **Negocios** | suspender, reactivar, cancelar, editar_pago, anular_pago, reasignar_vendedor, cambiar_correo_dueno | super · gerente (su región) — `cancelar` solo super |
| **Usuarios** | desbloquear_intentos, generar_codigo_acceso, cambiar_correo (soporte) | super · gerente (su región) |
| **Usuarios** | suspender, reactivar (moderación) | **solo super** |
| **Ciudades** | crear, crear_multiple, editar, activar, desactivar, asignar_region, asignar_region_multiple, region_crear, region_editar | **solo super** (catálogo de plataforma) |
| **Equipo** | alta_vendedor, promover_vendedor, editar_datos, revocar_acceso, reactivar_acceso | super · gerente (su región) |
| **Equipo** | alta_gerente, promover_gerente, reasignar_region | **solo super** |
| **Vendedores** | datos_cobro | **solo el vendedor** (anti-fraude: el super solo lo lee) |
| **Vendedores** | efectivo_entrega | super · gerente (recibe el efectivo) |
| **Vendedores** | registrar_pago (tesorería) | **solo super** |
| **Membresía** | precio_mensual_cambiar, plan_anual_activar, plan_anual_desactivar | **solo super** |
| **Configuración** | config_actualizar | **solo super** |
| **Recibos** | recibo_reenviar | super · gerente · vendedor |
| **Publicidad** | alta_manual, editar, pausar, reactivar | super · gerente (su región) |
| **Publicidad** | cancelar | **solo super** |

## Notas

- **Sin migración SQL.** `admin_auditoria` ya existía (cimiento transversal). Este módulo solo **lee** (y
  borra para limpieza).
- **Fechas de Postgres.** El backend entrega `created_at` como `"2026-06-20 15:00:00+00"` (espacio +
  offset sin minutos). `fechaHora()` lo normaliza a ISO válido (`espacio→T`, `+00`→`+00:00`) antes de
  `new Date`; sin eso se veía "—". Ver `LECCIONES_TECNICAS.md`.
- **Seed de revisión (solo DEV):** `sembrar-auditoria-muestra.ts` **vacía** la bitácora y siembra **1
  registro por cada tipo de acción real**, repartidos por el **rol que de verdad la hace**, apuntando a
  entidades reales — para revisar cómo se ve cada escenario, uno por uno. ⚠️ Borra todo: solo en dev.

## Pendientes / futuro

Ver [`Auditoria_Pendientes.md`](Auditoria_Pendientes.md). En corto: **deep-links** desde la ficha hacia
Negocios/Usuarios; filtro de acción **dinámico** (solo las presentes); export CSV; retención/archivado.
