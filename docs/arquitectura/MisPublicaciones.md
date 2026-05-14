# 📦 Mis Publicaciones — Panel del Vendedor

> **Última actualización:** 13 Mayo 2026
> **Estado:** ✅ En producción para MarketPlace · UI pre-cableada para Servicios
> **Ruta:** `/mis-publicaciones`
> **Visibilidad:** Solo modo Personal (igual que MarketPlace)

> **DATOS DEL SERVIDOR (React Query):**
> - Hooks principales: `apps/web/src/hooks/queries/useMarketplace.ts`
> - `useMisArticulosMarketplace(estado, paginacion)` — listado por estado, `keepPreviousData` para evitar temblor al cambiar de tab
> - `useCambiarEstadoArticuloMarketplace()` — PATCH `/articulos/:id/estado`
> - `useReactivarArticulo()` — POST `/articulos/:id/reactivar` (acepta `pausada` y `vendida`)
> - `useEliminarArticuloMarketplace()` — DELETE `/articulos/:id`

> **Identidad visual:** Cyan — Header dark sticky con icono `Package`, glow `rgba(6,182,212,0.07)`, mismo patrón estandarizado que CardYA / Cupones / Guardados / MarketPlace.

---

## 📋 Índice

1. [¿Qué es Mis Publicaciones?](#qué-es-mis-publicaciones)
2. [Filosofía del módulo](#filosofía-del-módulo)
3. [Política de modo Personal estricto](#política-de-modo-personal-estricto)
4. [Tipos de publicación](#tipos-de-publicación)
5. [Estados por tipo](#estados-por-tipo)
6. [Anatomía de la página](#anatomía-de-la-página)
7. [Empty states por tab](#empty-states-por-tab)
8. [Acciones por estado](#acciones-por-estado)
9. [Auto-expiración y notificación al vendedor](#auto-expiración-y-notificación-al-vendedor)
10. [Detección de borrador en localStorage](#detección-de-borrador-en-localstorage)
11. [Contrato con el wizard de publicar](#contrato-con-el-wizard-de-publicar)
12. [Sincronización cross-vista](#sincronización-cross-vista)
13. [API y endpoints](#api-y-endpoints)
14. [Schema de BD relevante](#schema-de-bd-relevante)
15. [Hooks React Query](#hooks-react-query)
16. [Archivos del proyecto](#archivos-del-proyecto)
17. [Decisiones arquitectónicas](#decisiones-arquitectónicas)

---

## 🎯 ¿Qué es Mis Publicaciones?

**Mis Publicaciones** es el panel privado del vendedor donde gestiona el ciclo de vida de sus publicaciones de **MarketPlace** y, eventualmente, **Servicios**. Es una vista cross-módulo: un mismo panel sirve para administrar ambos tipos de contenido publicable, con tabs que cambian de contexto y comportamiento.

El vendedor entra al panel para responder preguntas operativas concretas:

- ¿Qué tengo publicado y activo?
- ¿Qué pausé y se me olvidó reactivar?
- ¿Qué he vendido (historial)?
- ¿Qué KPIs tiene cada publicación (vistas, mensajes, guardados, días para expirar)?
- ¿Puedo editar, pausar, marcar vendido, reactivar o eliminar desde aquí?

> NO es una vista de feed, ni de descubrimiento, ni de exploración. Es un panel de gestión denso, B2B, alineado a Regla 13 de `TOKENS_GLOBALES.md`.

### Lo que NO es

- ❌ NO es un canal de descubrimiento (eso es el feed público de cada sección).
- ❌ NO muestra publicaciones de otros vendedores.
- ❌ NO permite publicar desde aquí — abre el wizard (`/marketplace/publicar`) mediante FAB / CTA.
- ❌ NO tiene su propia API. Consume los endpoints existentes de MarketPlace (y eventualmente Servicios).

---

## 🌱 Filosofía del módulo

### Una sola cosa: gestionar lo mío

El panel sirve a un usuario que YA publicó. No se mezcla con flujos de descubrimiento ni con el wizard. Cualquier elemento que no sirva para gestionar lo propio queda fuera.

### Densidad sobre decoración

Los cards son densos: foto + título + precio + KPIs reales + menú de acciones. No hay descripciones largas, no hay Q&A inline (eso vive en el detalle público), no hay avatares de otros usuarios.

### Tipo top-level, estado secundario

La pregunta "¿qué tipo gestiono?" (MarketPlace o Servicios) es la decisión arquitectural más alta del panel, no un filtro lateral. Por eso el toggle de tipo vive en el header con la misma jerarquía visual que los tabs de estado.

### El borrador no se olvida

Si el vendedor abrió el wizard, escribió algo y se salió sin publicar, el panel detecta el borrador en `localStorage` y muestra un banner discreto "Tienes un borrador sin publicar". Sin interrumpir, sin modales — un click y retoma donde lo dejó.

---

## 🔒 Política de modo Personal estricto

El panel **solo existe en modo Personal**. En modo Comercial la ruta no aparece en el menú y los endpoints rechazan la petición con `403`.

### Por qué

MarketPlace es por definición P2P (Person-to-Person) — vecino vendiéndole a vecino. Cuando el usuario está en modo Comercial está actuando como dueño/empleado de un negocio, no como persona privada vendiendo algo suyo. Mezclar ambos modos diluiría el propósito del módulo:

- Un negocio que quiere vender su catálogo usa `Business Studio → Catálogo`, no MarketPlace.
- Un negocio que quiere publicar vacantes usará `Business Studio → Vacantes` (sprint futuro), no Servicios.

### Cómo se enforza

| Capa | Mecanismo |
|------|-----------|
| **Frontend** | El interceptor de Axios (`api.ts`) detecta el modo activo. En modo Comercial no se renderiza el ítem "Mis Publicaciones" del menú; la ruta tampoco aparece en el `BottomNav`. |
| **Backend** | Middleware `requiereModoPersonal` antes de todos los endpoints (`mis-articulos`, `:id/estado`, `:id/reactivar`, `:id`, además del wizard `POST /articulos`). Devuelve `403 Forbidden` si el token viene con `sucursalActiva ≠ null`. |
| **Schema** | `articulos_marketplace.usuario_id` apunta a `users.id` directamente; NO existe la columna `negocio_id` ni `sucursal_id` en la tabla. La relación es persona-a-artículo, no negocio-a-artículo. |

### Consecuencia para el panel

El panel asume que el `usuarioId` del JWT es el dueño de las publicaciones que lista. No hay sub-filtro por sucursal, no hay selector de "vendiendo como Mi Negocio vs Yo Personal", no hay lógica multi-tenant. Si en el futuro se decide permitir publicaciones desde modo Comercial, sería otro módulo (probablemente dentro de Business Studio) con su propia tabla y panel.

---

## 🔀 Tipos de publicación

El panel admite dos tipos top-level. Cambiar de tipo redefine completamente el contexto: tabs aplicables, queries que se ejecutan, ciclo de vida, color de identidad activo del toggle.

| Tipo | Estado del backend | Color del toggle | Tabs aplicables |
|------|---------------------|------------------|-----------------|
| **MarketPlace** | ✅ En producción | Gradient teal (`from-teal-500 to-teal-600`) | `Activas` · `Pausadas` · `Vendidas` |
| **Servicios** | ⏳ UI pre-cableada · backend pendiente | Gradient sky (`from-sky-600 to-sky-700`) | `Activas` · `Pausadas` |

> Cuando `tipoActivo === 'servicios'`, el body del panel muestra un empty state `Servicios — Próximamente` con paleta sky para diferenciarse del cyan de MarketPlace. Los tabs se renderizan pero no son funcionales hasta que llegue su sprint.

---

## 🔁 Estados por tipo

### MarketPlace — 3 estados

| Estado | Significado | Visible para otros |
|--------|-------------|--------------------|
| `activa` | Publicación visible en el feed público | Sí |
| `pausada` | Pausada por el vendedor o por el cron de auto-expiración (`expira_at < NOW()`) | No |
| `vendida` | El vendedor confirmó que vendió | No |
| `eliminada` | Soft delete (`deleted_at = NOW()`) — no aparece en ningún tab del panel | No |

### Servicios — 2 estados (cuando llegue su sprint)

| Estado | Significado |
|--------|-------------|
| `activa` | Servicio disponible, aceptando contactos |
| `pausada` | Temporalmente no disponible (vacaciones, agenda llena) |

> No replica el estado `vendida` del MarketPlace. Un servicio no se "vende y desaparece" — es recurrente. Cuando el vendedor ya no lo ofrece, lo elimina. Si en el futuro se integran empleos como sub-tipo, considerar agregar un tab `Cerradas` exclusivo para esa sub-categoría.

### Constante en código

```ts
const TABS_POR_TIPO: Record<TipoPublicacion, TabConfig[]> = {
    marketplace: [
        { id: 'activa',  label: 'Activas',  Icono: CheckCircle2 },
        { id: 'pausada', label: 'Pausadas', Icono: PauseCircle },
        { id: 'vendida', label: 'Vendidas', Icono: ShoppingBag },
    ],
    servicios: [
        { id: 'activa',  label: 'Activas',  Icono: CheckCircle2 },
        { id: 'pausada', label: 'Pausadas', Icono: PauseCircle },
    ],
};
```

Un `useEffect` autocorrige `tabActivo` cuando el tipo cambia y el tab actual no aplica al tipo nuevo (ej: estabas en `vendida` en MarketPlace y cambiaste a Servicios → resetea a `activa`).

---

## 🎨 Anatomía de la página

### Header dark sticky (cyan)

Patrón estandarizado replicado de CardYA / Cupones / Guardados con paleta cyan.

#### Móvil (`< lg`)

```
┌────────────────────────────────────────────┐
│ ← 📦 Mis Publicaciones        🔔 ☰         │
│ ─── Gestiona tus Publicaciones ───         │
│ [🛒] [💼] │ [Activas] [Pausadas] [Vendidas]│
└────────────────────────────────────────────┘
```

- **Fila 1:** `[Volver]` + logo (gradient cyan-500→cyan-700) + título "Mis **Publicaciones**" (cyan-400) + `[🔔 Notificaciones]` + `[☰ Menú]`.
- **Fila 2:** Subtítulo decorativo "Gestiona tus **Publicaciones**" con rayitas cyan a los lados (patrón estandarizado).
- **Fila 3 (híbrida):** Toggle tipo `[🛒] [💼]` icon-only (`h-9 w-9 border-2 rounded-full`) FIJO a la izquierda + divider vertical sutil (`h-7 w-px bg-white/20`) + tabs estado SCROLLABLES a la derecha (`overflow-x-auto`, scrollbar oculto).

#### Desktop (`≥ lg`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ← 📦 Mis Publicaciones    Gestiona tus Publicaciones                   │
│   [🛒 MarketPlace] [💼 Serv]  ── PANEL DEL VENDEDOR ──                 │
│                                    [Activas] [Pausadas] [Vendidas]     │
└────────────────────────────────────────────────────────────────────────┘
```

- **Bloque izquierda (flex-col):** fila superior con `[Volver]` + logo + título "Mis Publicaciones"; fila inferior con toggle MarketPlace/Servicios con texto + icono (mismo `border-2 rounded-full` que los tabs).
- **Bloque centro (flex-col):** fila superior con subtítulo h1 "Gestiona tus **Publicaciones**" + sub-subtítulo "PANEL DEL VENDEDOR" con rayitas cyan (`whitespace-nowrap` para garantizar 1 línea); fila inferior con tabs estado alineados con `self-end` (borde derecho del bloque centro).
- **Flex padre:** `items-end` para que toggles izquierda y tabs centro queden alineados al mismo nivel vertical.

#### Activo vs inactivo en pills

- **Tabs (estado):** activo `border-cyan-400 bg-cyan-500 text-white shadow-cyan-500/20`; inactivo `border-white/15 bg-white/5 text-slate-200`.
- **Toggle MarketPlace activo:** `border-teal-400 bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-teal-500/30`.
- **Toggle Servicios activo:** `border-sky-500 bg-linear-to-br from-sky-600 to-sky-700 text-white shadow-sky-700/30`.

Inactivo en ambos toggles: mismo estilo `border-white/15 bg-white/5` que los tabs inactivos — esto unifica visualmente la fila.

### Body

#### Banner de borrador (condicional)

Si existe contenido en `localStorage.wizard_marketplace_${usuarioId}_nuevo`, se renderiza arriba del listado un banner cyan clickeable:

```
┌──────────────────────────────────────────────┐
│ 📝  Tienes un borrador sin publicar          │
│     Retoma donde lo dejaste...           →   │
└──────────────────────────────────────────────┘
```

Al click navega a `/marketplace/publicar` (el wizard carga el borrador automáticamente).

#### Listado (grid)

- **Móvil:** `grid-cols-2 gap-2.5` (dos cards por fila, mosaic tipo Facebook Marketplace).
- **Laptop:** `lg:grid-cols-2 lg:gap-4`.
- **Desktop:** `2xl:grid-cols-3`.

#### `CardArticuloMio`

Card individual del vendedor. Estructura:

| Móvil | Desktop |
|-------|---------|
| Foto fullbleed arriba (`aspect-[4/3]`, `rounded-t-xl`) | Foto cuadrada izquierda (`lg:h-36 lg:w-36 lg:rounded-xl`) |
| Contenido abajo con `p-2.5 gap-1.5` | Contenido a la derecha con padding 0 |

**Contenido:**

1. Título (`text-sm lg:text-lg font-semibold`) — truncado a 1 línea.
2. Precio en `text-base lg:text-xl font-bold text-cyan-700` con `flex flex-wrap items-baseline gap-x-1.5` para que `unidadVenta` (ej "/kg") y `condicion` (ej "Seminuevo") bajen a otra línea si el precio es largo.
3. "Publicado hace X" (`text-sm font-medium text-slate-600`).
4. **KPIs en fila** (con `flex-wrap` para que bajen si no caben): vistas · mensajes · guardados · días para expirar (urgente en amber si `≤3`).

**Overlay sobre la foto** para estados no-activos:

- `vendida` → `bg-slate-900/55 backdrop-blur-[1px]` + icono `PackageX` + texto "VENDIDO" uppercase.
- `pausada` → mismo patrón + icono `PauseCircle` + texto "PAUSADO".
- `activa` → sin overlay (foto limpia).

**Click en card** → navega al detalle público `/marketplace/articulo/:id` (singular en frontend, plural en API — coincidencia histórica).

**Menú "⋯"** flotante sobre la foto (móvil) o en la esquina superior derecha del contenido (desktop). Dropdown contextual según estado (ver §Acciones por estado).

### FAB "+ Publicar"

Solo visible en modo MarketPlace (Servicios aún no tiene endpoint de publicar). Mismo patrón que el FAB del feed (`PaginaMarketplace`) pero con paleta cyan:

- Móvil: baja a `bottom-4` cuando el `BottomNav` se oculta al hacer scroll; sube a `bottom-20` cuando reaparece.
- Desktop: fijo en `bottom-6`, alineado a la izquierda de la `ColumnaDerecha`.
- Icono `Plus` con animación rotate-pulse cada 2.4s.

### Modales de confirmación

- **Marcar vendido** (`ModalAdaptativo` con `ancho="sm"`): texto contextualizado "¿Confirmas que vendiste 'X'?" + CTAs Cancelar / Sí, lo vendí.
- **Eliminar** (`ModalAdaptativo`): texto "¿Eliminar 'X'?" + advertencia "Esta acción no se puede deshacer" + CTAs Cancelar / Sí, eliminar (rojo).

---

## 🪹 Empty states por tab

Cuando la query del tab activo devuelve cero artículos, se renderiza `<EstadoVacio>` con copy distinto por tab. Replica el patrón estandarizado de empty states de Cupones / CardYA (`w-24 h-24` rounded full con ring + icono `text-cyan-400` + título + mensaje + CTA opcional).

| Tab | Título | Mensaje | CTA |
|-----|--------|---------|-----|
| `activa` | "Sin publicaciones activas" | "Publica una para empezar a vender." | ✅ "Publicar artículo" (botón cyan) |
| `pausada` | "Sin publicaciones pausadas" | "Aquí verás las que pauses o expiren." | ❌ Sin CTA |
| `vendida` | "Sin ventas registradas" | "Tu historial de ventas aparecerá aquí." | ❌ Sin CTA |

### Por qué solo `activa` tiene CTA

Pausadas y Vendidas son **estados derivados** de tener publicaciones — el usuario llega ahí pausando una activa o marcándola como vendida. Mostrar un CTA "Publicar artículo" en esos tabs sugeriría que la acción primaria es publicar para llenar esos tabs, lo cual confunde. En cambio, `activa` SÍ es el punto de entrada natural — si está vacío, lo primero que el usuario quiere hacer es publicar.

### Empty state especial: modo Servicios

Cuando `tipoActivo === 'servicios'`, el body no entra al flujo normal de tabs/empty states — muestra un empty `Servicios — Próximamente` con paleta **sky** (no cyan) y el icono `Briefcase`. Esto bypasa el tab activo y se queda fijo hasta que el sprint de Servicios cablee los queries reales.

---

## ⚙️ Acciones por estado

El menú "⋯" del card muestra acciones contextuales según el estado del artículo. Todas las acciones permanecen visibles arriba del separador; `Eliminar` siempre va abajo del separador, en rojo.

| Estado actual | Acciones disponibles |
|---------------|----------------------|
| `activa` | Editar · Pausar · Marcar vendido · Eliminar |
| `pausada` | Editar · Re-Activar · Marcar vendido · Eliminar |
| `vendida` | Re-Activar · Eliminar |

### Transiciones de estado

```
        publicar
   ─────────────────► activa
                       │
              pausar / cron auto-expira
                       ▼
                    pausada ◄─── reactivar ───── vendida
                       │           (+30 días)        ▲
                       │                             │
                       └── reactivar (+30 días) ─────┤
                                                     │
                                          marcar vendido
                                                     │
                                          activa ────┘
```

- **Pausar / Marcar vendido** usan `PATCH /articulos/:id/estado`.
- **Re-Activar** (desde `pausada` O `vendida`) usa `POST /articulos/:id/reactivar`. El endpoint extiende `expira_at = NOW() + 30 días`, resetea `vendida_at = NULL` (cubre el caso "marqué vendido por error") y devuelve un mensaje distinto según el estado origen.
- **Eliminar** usa `DELETE /articulos/:id` (soft delete + cleanup R2 con reference counting).
- **Editar** navega a `/marketplace/publicar/:id` (el wizard se reusa con el artículo precargado).

> Las métricas (`total_vistas`, `total_mensajes`, `total_guardados`) se MANTIENEN al reactivar — son historial real del artículo y no se reinician. Los chats y preguntas Q&A existentes también se conservan.

---

## ⏰ Auto-expiración y notificación al vendedor

El panel no se mantiene sincronizado solo por acciones manuales del vendedor — el cron de MarketPlace también modifica el estado de las publicaciones y dispara notificaciones que devuelven al vendedor al panel.

### Ciclo completo

```
       publicar (T=0)                      cron diario corre
            │                                     │
            ▼                                     ▼
         activa ──── 27 días después ────► notif "expira pronto"
            │                              (marketplace_proxima_expirar)
   30 días después                                │
            │                                     │
            ▼                                     ▼
   expira_at < NOW()                      vendedor entra al panel
            │                                  desde la notif
            ▼                                     │
   cron auto-pausa ──► notif "expiró" ─────────► tab Pausadas
                    (marketplace_expirada)        │
                                                  ▼
                                            Re-Activar (+30 días)
```

### Jobs cron involucrados

| Job | Frecuencia | Qué hace |
|-----|------------|----------|
| `autoPausarExpirados()` | Cada hora | `UPDATE articulos_marketplace SET estado='pausada' WHERE estado='activa' AND expira_at < NOW()`. Por cada artículo pausado, crea notificación idempotente `marketplace_expirada` para el vendedor. |
| `notificarProximaExpiracion()` | Cada hora | `SELECT` artículos con `expira_at BETWEEN NOW()+3d AND NOW()+4d`. Crea notificación idempotente `marketplace_proxima_expirar` con 1 día de ventana de tolerancia (para no perder el aviso si el cron salta un día). |

Ver detalle: `apps/api/src/services/marketplace/expiracion.ts` + `docs/arquitectura/MarketPlace.md` §Cron Jobs.

### Idempotencia (CRÍTICA)

Antes de insertar cualquier notificación, el service verifica que NO exista ya una del mismo `tipo` apuntando al mismo `articuloId`. Esto permite que el cron corra varias veces sin spamear al vendedor.

### Relación con el panel

- El vendedor recibe push/in-app notif `marketplace_expirada` o `marketplace_proxima_expirar`.
- Click en la notif → navega a `/mis-publicaciones` (o directo al detalle, según el flujo).
- Si llegó por `marketplace_expirada`, ve el artículo en tab **Pausadas** con overlay "PAUSADO" y badge urgente en KPI de días (`text-amber-700`).
- Click "Re-Activar" → `POST /articulos/:id/reactivar` → extiende `expira_at +30d`, vuelve a `activa`.

### Race condition manejado

Si el cron corre justo cuando el vendedor está reactivando, el `UPDATE` del cron afecta 0 filas (porque el artículo ya tiene `expira_at` futuro y no entra al `WHERE expira_at < NOW()`). Sin pérdida de datos ni inconsistencia.

---

## 💾 Detección de borrador en localStorage

El wizard guarda automáticamente cada cambio del usuario en `localStorage` bajo la clave:

```
wizard_marketplace_${usuarioId}_nuevo
```

> Las claves con `wizard_marketplace_${usuarioId}_${articuloId}` corresponden a borradores de EDICIÓN de artículos ya publicados — no se consideran borradores aquí (solo el de creación nueva, que es único por usuario).

Al montar el panel, un `useEffect` lee la clave y considera que hay borrador si `titulo` no está vacío O `fotos.length > 0`. Solo entonces renderiza el banner.

---

## 📝 Contrato con el wizard de publicar

El panel **no publica directamente** — toda creación / edición pasa por el wizard `/marketplace/publicar` (`PaginaPublicarArticulo.tsx`). El contrato entre ambos es:

### Puntos de entrada al wizard desde el panel

| Disparador | Ruta destino | Comportamiento del wizard |
|------------|--------------|---------------------------|
| FAB "+ Publicar" | `/marketplace/publicar` | Modo `crear`. Si existe borrador en `localStorage` lo hidrata; si no, arranca vacío. |
| Banner "Tienes un borrador sin publicar" | `/marketplace/publicar` | Idéntico al FAB — hidrata el borrador automáticamente. |
| Menú "⋯" → Editar (en card) | `/marketplace/publicar/:articuloId` | Modo `editar`. Carga el artículo desde la API e hidrata el wizard con sus campos. El borrador asociado vive en `wizard_marketplace_${usuarioId}_${articuloId}` (no en `_nuevo`). |

### Contrato de `localStorage`

Dos clases de claves coexisten:

| Clave | Contenido | Disparo del banner |
|-------|-----------|--------------------|
| `wizard_marketplace_${usuarioId}_nuevo` | Borrador de creación (único por usuario) | ✅ Sí — el panel muestra el banner cuando esta clave tiene `titulo` o `fotos`. |
| `wizard_marketplace_${usuarioId}_${articuloId}` | Borrador de edición de un artículo existente | ❌ No — el panel ignora estas claves. El wizard las hidrata cuando el usuario abre Editar. |

> Solo existe UN borrador de creación por usuario. Empezar un wizard nuevo sobreescribe el borrador anterior. Los borradores de edición tienen su propio espacio por `articuloId` y conviven sin pisarse.

### Limpieza del borrador

El wizard borra `wizard_marketplace_${usuarioId}_nuevo` cuando:

1. El usuario publica con éxito (`POST /articulos` devuelve 201).
2. El usuario presiona "Descartar borrador" en el wizard.

NO se borra cuando:

- El usuario cierra el wizard sin publicar (intencional — para poder retomar).
- El usuario vuelve atrás con el back del navegador.

### Vuelta del wizard al panel

Tras publicar con éxito, el wizard navega a `/mis-publicaciones?tab=activa` (o equivalente). Las queries `useMisArticulosMarketplace('activa')` se invalidan automáticamente y el nuevo artículo aparece en el grid sin recarga manual.

Si el wizard estaba en modo `editar`, al guardar invalida también `marketplace.articulo(articuloId)`, `feed-infinito` y `vendedor` para reflejar los cambios en todas las vistas.

### Confirmaciones legales firmadas en el wizard

El wizard pide al vendedor 4 confirmaciones legales antes de publicar (`licito`, `enPoder`, `honesto`, `seguro`). Se guardan en `articulos_marketplace.confirmaciones` como JSONB con la siguiente forma:

```json
{
  "licito": true,
  "enPoder": true,
  "honesto": true,
  "seguro": true,
  "version": "v1.0",
  "aceptadasAt": "2026-05-13T20:14:33.000Z"
}
```

- `version` apunta a `CHECKLIST_VERSION` (constante en frontend). Si los textos legales cambian, se bumpea — la auditoría futura puede saber exactamente qué texto firmó cada vendedor.
- `aceptadasAt` lo inyecta el backend (`NOW()`), no el cliente — evita manipulación.

El panel no muestra estas confirmaciones, pero forman parte del contrato que protege a la app legalmente.

---

## 🔄 Sincronización cross-vista

Cuando una acción del panel cambia el estado de un artículo, otras vistas que tengan ese artículo en cache (feed infinito, detalle público, perfil del vendedor, Mis Guardados) deben reflejar el cambio inmediatamente — sin esperar al próximo fetch.

### Mutaciones que invalidan queries

Los hooks `useCambiarEstadoArticuloMarketplace`, `useReactivarArticulo` y `useEliminarArticuloMarketplace` invalidan automáticamente:

- `['marketplace', 'mis-articulos']` — refresca todos los tabs del panel.
- `['marketplace', 'feed-infinito']` — refresca el feed público.
- `['marketplace', 'articulo', articuloId]` — refresca el detalle.
- `['marketplace', 'vendedor', usuarioId]` — refresca el perfil público del vendedor.

### Sincronización del flag `guardado`

`aplicarCambioGuardadoEnCache` (exportado desde `useGuardados.ts`) actualiza optimísticamente:

- Feed infinito (`pages.articulos[i].guardado` + `totalGuardados`).
- Detalle del artículo (`totalGuardados`).
- Publicaciones del vendedor (incluye `guardado: guardadoNuevo`, no solo el contador).

Esto cubre el caso "el usuario quita un guardado desde `PaginaGuardados` y al volver al perfil del vendedor el corazón sigue marcado" — sin la sincronización del flag, el cache stale generaba inconsistencia visual.

---

## 🌐 API y endpoints

Todos detrás de `verificarToken + requiereModoPersonal`.

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/marketplace/mis-articulos?estado=&limit=&offset=` | Lista las publicaciones del vendedor filtradas por estado |
| `PATCH` | `/api/marketplace/articulos/:id/estado` | Cambiar a `activa` / `pausada` / `vendida` |
| `POST` | `/api/marketplace/articulos/:id/reactivar` | Reactivar desde `pausada` O `vendida` con +30 días |
| `DELETE` | `/api/marketplace/articulos/:id` | Soft delete + cleanup R2 |

> El endpoint `GET /api/marketplace/mis-articulos` ya existía desde el Sprint 1 (Backend Base) del MarketPlace. El panel no requirió backend nuevo — toda la implementación fue frontend, salvo extensiones puntuales en services existentes para devolver `unidadVenta` y `guardado` en queries cross-vista.

---

## 🗄️ Schema de BD relevante

El panel lee/escribe principalmente sobre `articulos_marketplace`. Columnas que importan para entender el comportamiento del panel:

| Columna | Tipo | Nullable | Significado |
|---------|------|----------|-------------|
| `id` | UUID | NO | PK |
| `usuario_id` | UUID | NO | FK → `users.id`. Dueño de la publicación (siempre persona, nunca negocio). |
| `titulo` | VARCHAR(120) | NO | Validado en wizard (min 5 caracteres). |
| `descripcion` | TEXT | NO | Validado en wizard (min 20 caracteres). |
| `precio` | NUMERIC(10,2) | NO | En MXN. |
| `unidad_venta` | VARCHAR(30) | **SÍ** | Opcional: "kg", "lt", "hora", "pieza", etc. Si está `NULL`, la card no muestra sufijo de unidad. |
| `condicion` | VARCHAR(20) | **SÍ** | Opcional: `nuevo` / `seminuevo` / `usado` / `para_reparar`. Si está `NULL`, no se muestra etiqueta de condición. |
| `acepta_ofertas` | BOOLEAN | **SÍ** | Opcional. `TRUE` / `FALSE` / `NULL` (tristate UX en wizard — clickear el chip activo lo deselecciona). |
| `estado` | VARCHAR(20) | NO | Enum lógico: `activa` / `pausada` / `vendida`. Indexed para el filtro del panel. |
| `expira_at` | TIMESTAMP | NO | Cuándo se auto-pausará. `created_at + 30 días` al publicar; `NOW() + 30 días` al reactivar. |
| `vendida_at` | TIMESTAMP | SÍ | Cuándo se marcó vendido. Se setea con `NOW()` al pasar a `vendida` y resetea a `NULL` al reactivar. |
| `confirmaciones` | JSONB | SÍ | Evidencia legal firmada por el vendedor en el wizard. Ver §Contrato con el wizard. |
| `fotos` | JSONB (array) | NO | URLs de R2. Min 1, max 8. |
| `foto_portada_index` | SMALLINT | NO | Índice de la portada dentro de `fotos`. Default 0. |
| `total_vistas` | INTEGER | NO | KPI denormalizado. Incrementa con cada GET del detalle público. |
| `total_mensajes` | INTEGER | NO | KPI denormalizado. Incrementa cuando un comprador abre chat. |
| `total_guardados` | INTEGER | NO | KPI denormalizado. Incrementa/decrementa con `POST/DELETE /guardados`. |
| `created_at` | TIMESTAMP | NO | Para "Publicado hace X" del card. |
| `updated_at` | TIMESTAMP | NO | Refresca con cada UPDATE. |
| `deleted_at` | TIMESTAMP | SÍ | Soft delete. Todas las queries filtran con `WHERE deleted_at IS NULL`. |

### CHECK constraints relevantes

```sql
-- Condición permite NULL (relajado en migración 2026-05-13)
CHECK (condicion IS NULL OR condicion IN ('nuevo','seminuevo','usado','para_reparar'))

-- Estado siempre uno de los 3 lógicos
CHECK (estado IN ('activa','pausada','vendida'))
```

### Índices que aprovecha el panel

```sql
CREATE INDEX idx_articulos_marketplace_usuario_estado
  ON articulos_marketplace (usuario_id, estado)
  WHERE deleted_at IS NULL;
```

Soporta el query principal del panel: `SELECT ... WHERE usuario_id = $1 AND estado = $2 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $3 OFFSET $4`.

### Migraciones aplicadas para soportar el panel

| Migración | Propósito |
|-----------|-----------|
| `docs/migraciones/2026-05-13-marketplace-condicion-opcional-unidad-venta.sql` | Permite NULL en `condicion` y `acepta_ofertas`, agrega `unidad_venta VARCHAR(30)`. |
| `docs/migraciones/2026-05-13-marketplace-confirmaciones.sql` | Agrega `confirmaciones JSONB` para evidencia legal. |

Ambas son one-shot manuales (no automatizadas en deploy) — ver `docs/migraciones/` para el patrón general.

---

## 🪝 Hooks React Query

Definidos en `apps/web/src/hooks/queries/useMarketplace.ts`.

```ts
// Lectura — 3 queries en paralelo para mostrar conteos en badges de tabs sin esperar al click
useMisArticulosMarketplace('activa',  { limit: 50, offset: 0 });
useMisArticulosMarketplace('pausada', { limit: 50, offset: 0 });
useMisArticulosMarketplace('vendida', { limit: 50, offset: 0 });

// Mutaciones — invalidan automáticamente las queries afectadas
useCambiarEstadoArticuloMarketplace();  // { articuloId, estado }
useReactivarArticulo();                  // { articuloId }
useEliminarArticuloMarketplace();        // { articuloId }
```

`useMisArticulosMarketplace` usa `keepPreviousData: true` (Regla `PATRON_REACT_QUERY.md`) para evitar temblor visual al cambiar de tab.

### Query keys

Centralizadas en `apps/web/src/config/queryKeys.ts`:

```ts
queryKeys.marketplace.misArticulos(estado, paginacion)
// → ['marketplace', 'mis-articulos', estado, paginacion]
```

---

## 📂 Archivos del proyecto

### Página principal

| Archivo | Propósito |
|---------|-----------|
| `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` | Página completa con header + body + FAB + modales |
| `apps/web/src/components/marketplace/CardArticuloMio.tsx` | Card del vendedor (foto + overlay + KPIs + menú "⋯") |

### Hooks y configuración

| Archivo | Propósito |
|---------|-----------|
| `apps/web/src/hooks/queries/useMarketplace.ts` | `useMisArticulosMarketplace`, `useCambiarEstado…`, `useReactivar…`, `useEliminar…` |
| `apps/web/src/hooks/useGuardados.ts` | `aplicarCambioGuardadoEnCache` (sincronización cross-vista) |
| `apps/web/src/config/queryKeys.ts` | `marketplace.misArticulos(estado, paginacion)` |
| `apps/web/src/types/marketplace.ts` | `ArticuloMarketplace`, `EstadoArticulo`, `CondicionArticulo` |

### Backend reutilizado (sin código propio del panel)

| Archivo | Propósito |
|---------|-----------|
| `apps/api/src/routes/marketplace.routes.ts` | Endpoints `mis-articulos`, `:id/estado`, `:id/reactivar` |
| `apps/api/src/services/marketplace.service.ts` | `obtenerMisArticulos`, `cambiarEstado`, `eliminar` |
| `apps/api/src/services/marketplace/expiracion.ts` | `reactivarArticulo` (extiende +30 días, acepta `pausada` y `vendida`) |
| `apps/api/src/controllers/marketplace.controller.ts` | Controllers que llaman a los services |

### Hermanos (vistas relacionadas)

| Archivo | Relación |
|---------|----------|
| `apps/web/src/pages/private/marketplace/PaginaPublicarArticulo.tsx` | Wizard que invoca el panel desde FAB / banner borrador |
| `apps/web/src/pages/private/guardados/PaginaGuardados.tsx` | Llama a `aplicarCambioGuardadoEnCache` al eliminar guardados en batch |
| `apps/web/src/components/marketplace/CardArticuloFeed.tsx` | Card del comprador (feed público) — separada visualmente de `CardArticuloMio` |
| `apps/web/src/components/marketplace/CardArticulo.tsx` | Card en el perfil público del vendedor |

---

## 🧠 Decisiones arquitectónicas

### 1. Tipo top-level, no filtro lateral

MarketPlace y Servicios son ramas separadas del mismo árbol de gestión. Convertirlas en filtro lateral hubiera obligado a una jerarquía artificial; con el toggle top-level cada rama tiene su propio ciclo de vida, queries, conteos y estados.

### 2. UI de Servicios pre-cableada antes de que exista backend

El toggle `Servicios` y sus tabs `Activas` + `Pausadas` se renderizan aunque no haya endpoints — el body solo muestra "Próximamente". Razones:

- Consolida el patrón visual antes de que llegue el sprint de Servicios.
- Cuando el backend exista, solo hay que enchufar los queries (`useMisServicios`, equivalente al de marketplace) — la UI ya está.
- Evita rediseños de header cuando el módulo crezca.

### 3. Servicios sin estado `vendida`

Decisión arquitectural acordada: un servicio no se "vende y desaparece" — es recurrente. Cuando el vendedor ya no lo ofrece, lo elimina directamente. Esto evita la complejidad de un estado terminal que no aporta valor real.

### 4. `Reactivar` reutilizado para `vendida → activa`

Mismo endpoint que `pausada → activa`. La transacción del MarketPlace es 100% offline (la app no procesa pagos), así que reabrir una publicación marcada como vendida no afecta sistemas externos. Cubre dos casos reales: "marqué vendido por error" y "la venta se cayó porque el comprador no llegó".

### 5. Las métricas no se reinician al reactivar

`total_vistas`, `total_mensajes`, `total_guardados` son historial del artículo, no del ciclo de vida. Resetearlas al reactivar engañaría al vendedor sobre el desempeño real de la publicación. Los chats y Q&A también se conservan (viven en tablas separadas y no dependen del `estado`).

### 6. El borrador "nuevo" es único por usuario

Solo existe UN borrador de creación nueva por usuario (`localStorage.wizard_marketplace_${usuarioId}_nuevo`). Empezar un wizard nuevo sobreescribe el borrador anterior. Los borradores de edición usan claves con `articuloId` y conviven con el de creación, pero no se consideran "borradores pendientes" en este panel — solo el de creación nueva dispara el banner.

### 7. Sincronización del flag `guardado` (no solo el contador)

Al sincronizar el cache cross-vista, `aplicarCambioGuardadoEnCache` actualiza el flag `guardado` además del contador `totalGuardados` en las publicaciones del vendedor. Sin esto, el cache stale generaba que al navegar fuera del perfil del vendedor y regresar, el corazón seguía marcado aunque el usuario lo hubiera quitado desde otra vista.

### 8. Card del vendedor distinta a card del comprador

`CardArticuloMio` (panel) es una card distinta a `CardArticuloFeed` (feed público) y a `CardArticulo` (perfil del vendedor). Cada una optimiza para su contexto:

- `CardArticuloMio` → densidad, KPIs reales, menú de acciones, overlay de estado.
- `CardArticuloFeed` → descubrimiento, avatar del vendedor, Q&A inline.
- `CardArticulo` → perfil público, layout compacto para grids.

Intentar unificarlas con props condicionales generaría una explosión de variantes — preferimos cards separadas con responsabilidades claras.

---

## 🔗 Referencias

- `docs/arquitectura/MarketPlace.md` — módulo padre (filosofía, estados del artículo, ciclo de vida, página pública compartible).
- `docs/arquitectura/Guardados.md` — sistema cross-módulo de guardados (sincronización del flag).
- `docs/arquitectura/ChatYA.md` — sistema de mensajería que se invoca desde la card de detalle.
- `docs/estandares/TOKENS_GLOBALES.md` — reglas de diseño aplicadas (Regla 1 texto mínimo, Regla 6 bordes, Regla 13 estética B2B).
- `docs/estandares/PATRON_REACT_QUERY.md` — patrón de hooks usado en este panel.
- `docs/migraciones/2026-05-13-marketplace-condicion-opcional-unidad-venta.sql` — schema de soporte (opcionales en condición y unidad de venta).
- `docs/migraciones/2026-05-13-marketplace-confirmaciones.sql` — evidencia legal del wizard.
