# Arquitectura — Sección Servicios

> Última actualización: 2026-05-22 (Sprint 9.3 — Q&A con notificaciones, perfil prestador rediseñado, fotos optimistas, TTL fin-de-día con zona horaria).
> Visión estratégica: [`docs/VISION_ESTRATEGICA_AnunciaYA.md`](../VISION_ESTRATEGICA_AnunciaYA.md) §3.2.

Servicios es la sección pública unificada para **servicios e intangibles** (incluye empleos).

---

## 1. Modos y tipos de publicación

| Modo (UI) | `tipo` (BD) | `subtipo` (BD) | Quién publica |
|---|---|---|---|
| **Ofrezco** | `servicio-persona` | `servicio-personal` | Usuario personal que ofrece un servicio |
| **Solicito** (no empleo) | `solicito` | `servicio-puntual` | Usuario personal que necesita un servicio |
| **Solicito** (empleo) | `solicito` | `busco-empleo` | Persona que busca trabajo (auto cuando `categoria='empleo'`) |
| **Vacante** | `vacante-empresa` | `vacante-empresa` | Negocio publica empleo (desde BS, no aquí) |

El composer maneja Ofrezco/Solicito. Las Vacantes se publican desde Business Studio (Sprint 8) y solo se visualizan en el feed.

Tipos en `apps/web/src/types/servicios.ts`.

---

## 2. Composer inline en el feed

Desde Sprint 9 las publicaciones se crean y editan con un **composer inline** que vive arriba del feed de Servicios — sin overlay, sin modal, sin ruta propia. Reemplazó al wizard de 3 pasos (`/servicios/publicar`, eliminado).

### 2.1 Arquitectura

```
<PaginaServicios />                       ← feed
  └─ <ComposerSection modoServiciosDefault={...} />
     ├─ Estado COLAPSADO  → <ComposerColapsado /> (pill clickeable)
     └─ Estado EXPANDIDO  → <ComposerServicios /> (formulario inline)
                            ├─ Header + X
                            ├─ Toggle Ofrezco/Solicito (sólo creación)
                            ├─ Input título + Textarea descripción
                            ├─ <ComposerHintModeracion>     (anti-venta inline)
                            ├─ Strip de thumbnails (si hay fotos)
                            ├─ Fila de íconos "Agregar a tu publicación"
                            ├─ Panel del ícono activo (acordeón)
                            ├─ Checkbox legal compactado
                            └─ Botón Publicar
```

### 2.2 Fila de íconos

Lista inspirada en Facebook ("Agregar a tu publicación"). 5 íconos en Ofrezco, 6 en Solicito:

| Ícono | Acción | Activo cuando |
|---|---|---|
| 📷 Camera | Abre file picker (no acordeón) — sube fotos a R2 | `fotos.length > 0` |
| 🏷️ Tags | Toggle panel Categoría (chip strip 6 categorías) | `categoria != null` |
| 🛠️ Wrench | Toggle panel Modalidad (Presencial/Remoto/Híbrido) | `modalidad != null` |
| 💰 DollarSign | Toggle panel Tarifa/Presupuesto (min-max MXN) | min o max llenos |
| 📍 MapPin | Toggle panel Zonas (chip input list, 1-10) | `zonasAproximadas.length > 0` |
| ⚡ Zap | Toggle panel Urgente (sólo en Solicito) | `urgente === true` |

Cada ícono activo muestra un dot verde arriba-derecha. Solo un panel puede estar abierto a la vez (click en otro ícono cierra el actual y abre el nuevo).

Si el usuario aprieta Publicar y hay errores en un campo dentro de un panel cerrado, el panel correspondiente se abre automáticamente.

### 2.3 Pill colapsada

| Variante | Cuando | Mensaje |
|---|---|---|
| Sin borrador | localStorage vacío | "¿Qué ofreces o necesitas hoy?" (varía según tab) |
| Con borrador | hay draft no publicado | "Continúa tu borrador: <título extraído>" + botones [Descartar] y [Continuar →] |

Click en cualquier parte de la pill → `<ComposerSection>` cambia estado a expandido.

### 2.4 Puntos de entrada externos

El composer NO es overlay global. Todos los triggers externos redirigen a `/servicios` con un query param:

| Trigger | Query | Comportamiento |
|---|---|---|
| FAB de PaginaServicios | `?crear=<modo>` (según tab) | El feed scrolea arriba + expande el composer con modo |
| FAB de PaginaMisPublicaciones (tab Servicios) | `?crear=ofrezco` | Redirige al feed y expande |
| Botón "Editar" en CardServicioMio | `?editar=<id>` | Redirige al feed, hidrata y expande |
| Empty state Mis Publicaciones Servicios | `?crear=ofrezco` | Redirige al feed y expande |
| Hint anti-venta "Llévame a MarketPlace" | navega a `/marketplace/publicar` | Colapsa el composer primero |

`<ComposerSection>` detecta los query params al cargar, expande el composer y limpia los params del URL con `replaceState`.

### 2.5 Persistencia de borradores

- Namespace localStorage: `aya:composer:servicios:draft-{ns}`.
- `ns = 'v3'` para creación (un solo borrador por usuario).
- `ns = 'edit-{publicacionId}'` para edición (uno por publicación).
- Auto-save en cada cambio. Sin `beforeunload` (patrón consolidado en MP).
- La pill colapsada lee con `leerBorradorServicios()` y refresca al colapsar/publicar (via `refreshKey` tick).

### 2.6 Validación

- Hook `useComposerServicios` devuelve `{ errores, valido, mensajeBoton }`.
- Errores se muestran inline bajo cada campo (rojo).
- Botón Publicar bloqueado mientras `!valido`. Mensaje contextual arriba.
- Click en Publicar con errores en panel cerrado → abre el panel.

Límites (sincronizados con Zod del backend):
- Título: 10–80 chars.
- Descripción: 30–500 chars.
- Fotos: máx 6 (opcionales).
- Zonas: 1–10.
- Presupuesto: `min <= max`.

### 2.7 Moderación pasiva

- **Frontend:** hint inline en `<ComposerHintModeracion>` con debounce 600ms. Detecta `vendo|venta|remato|cambio por` en título+descripción (`utils/deteccionVenta.ts`). Hint amarillo bajo la descripción con CTA "Llévame a MarketPlace".
- **Backend:** red de seguridad — sigue devolviendo `409 + { sugerencia: 'marketplace' }` (`servicios.service.ts → detectarSugerenciaSeccion`). El composer trata el 409 como advertencia genérica.

Mantener `utils/deteccionVenta.ts` sincronizado con el regex backend hasta centralizar en `packages/shared/` (pendiente cuando MP adopte detección bidireccional).

### 2.8 Confirmaciones legales

- Backend pide 3 confirmaciones con versión `v3-2026-05-20`.
- UI compactada en **1 checkbox** "Acepto las reglas de publicación de AnunciaYA" con link "Ver detalles" (acordeón inline con los 3 puntos).
- `useComposerServicios.setConfirmacionesUnificadas(v)` setea las 3 al mismo valor.

### 2.9 Fotos R2

- Subida: presigned URL → PUT directo del cliente a R2.
- Lógica encapsulada en `useFotosUploaderServicios` (hook que devuelve `inputProps`, `abrirSelector`, `eliminar`, `subiendo`, `previews`).
- El ícono cámara dispara `abrirSelector` directo (sin acordeón).
- Strip de thumbnails arriba del textarea (3-6 fotos horizontales, scroll si son varias). X para eliminar.
- Tracking huérfanas: `Set<string>` con URLs subidas en sesión. Al publicar se vacía sin disparar deletes. Al eliminar foto del strip sí dispara `useEliminarFotoServicioHuerfana`. Reconcile global limpia eventuales.

**Optimistic preview (Sprint 9.2):** Al seleccionar imágenes se generan blobs locales (`URL.createObjectURL`) que aparecen INSTANT en el strip con un overlay de spinner. Las subidas a R2 corren en paralelo con `Promise.allSettled`. Cuando una termina, su preview se reemplaza por la URL final de R2. Si falla, se quita la preview y se notifica al usuario sin bloquear el resto. Estado expuesto vía `previews: FotoPreviewLocal[]` (`{ id, blobUrl, file }`). Mismo patrón en `useFotosUploaderMarketplace`.

### 2.10 Modo Personal vs Comercial

- El composer **NO se monta** en modo Comercial. Los comerciantes publican Vacantes desde Business Studio → Vacantes (Sprint 8).
- La pill colapsada y el FAB de Servicios verifican `useAuthStore.usuario.modoActivo !== 'comercial'` antes de mostrarse.
- Feed y detalle de Servicios son visibles en ambos modos.

---

## 3. Páginas y vistas

| Ruta | Componente | Propósito |
|---|---|---|
| `/servicios` | `PaginaServicios` | Feed con tabs Todos/Servicios/Solicitudes/Vacantes + composer inline |
| `/servicios?crear=<modo>` | `PaginaServicios` | Feed + composer expandido en modo crear |
| `/servicios?editar=<id>` | `PaginaServicios` | Feed + composer expandido en modo editar |
| `/servicios/:id` | `PaginaServicio` | Detalle de publicación (servicio, solicitud o vacante) |
| `/servicios/usuario/:usuarioId` | `PaginaPerfilPrestador` | Perfil personal del prestador (no incluye vacantes — esas viven en `/negocios/:id`) |
| `/mis-publicaciones` | `PaginaMisPublicaciones` | Panel del autor — toggle MP/Servicios |

**Eliminadas en Sprint 9:**
- `/servicios/publicar`
- `/servicios/publicar/:publicacionId`

### 3.1 PaginaPerfilPrestador — vista personal

El perfil del prestador es un **espacio personal del usuario** (no del negocio). Solo muestra publicaciones donde el usuario está como persona física: `tipo IN ('servicio-persona', 'solicito')`. Las vacantes (`vacante-empresa`) se excluyen porque pertenecen al negocio del usuario y se ven en `/negocios/:negocioId` o en BS Vacantes — no en su perfil personal.

**HeroCard:**
- Avatar h-12 (sin ring decorativo — el usuario pidió "avatar simplificado").
- Nombre en 2 líneas con badge azul invertido (`fill-blue-500 text-white` estilo Twitter/X) si verificado.
- KPIs en grid `border-2 bg-slate-100 divide-x-2` (3-4 columnas según data): publicaciones activas, reseñas, calificación promedio, miembro desde.
- Sin ciudad (decisión UX: ubicación exacta del personal no se expone).

**Tabs:**
- 🔧 Wrench → Servicios y solicitudes activas (grid `auto-rows-fr [&>*]:h-full` con `CardServicio` universal).
- ⭐ Star → Reseñas.

**Hidratación backend:** `apps/api/src/services/servicios/perfilPrestador.ts` hace `LEFT JOIN` con `negocio_sucursales` y `negocios` por si en el futuro se mezclan publicaciones de negocio, pero el filtro actual mantiene la vista limpia de personal.

### 3.2 Sidebar "Sobre …" en detalle (PaginaServicio)

El componente `SidebarSobreNegocio` (desktop) y `OferenteCard` (móvil) comparten patrón con `CardVendedor` de MP (tema sky en lugar de amber):

- Avatar h-12 (personas) o logo de negocio (vacantes).
- Nombre + BadgeCheck invertido inline.
- Actividad relativa ("Activa hace 2 hrs") inline con dot.
- "Ver perfil" alineado a la derecha en el mismo renglón.
- **Título dinámico por tipo:**
  - `servicio-persona` → "Sobre el oferente"
  - `solicito` → "Sobre el solicitante"
  - `vacante-empresa` → "Sobre el negocio"
- **"Dejar reseña"** solo para `servicio-persona` (no en vacantes ni solicitudes — un solicitante no presta servicio).

### 3.3 Botones de contacto inline (BarraContactoServicio)

Sustituyó botones genéricos por logos de marca inline:
- WhatsApp → SVG inline con color verde brand.
- ChatYA → imagen `/ChatYA.webp` inline.
- Agregar contacto → icono `UserPlus` con `Tooltip`.

Aplica en `OferenteCard`, `SidebarSobreNegocio` y `CardServicio`. Mismo patrón se reusa en MP (`CardVendedor`, sidebar de detalle, `CardArticulo`).

`useIniciarChatServicio` encapsula la lógica de iniciar conversación ChatYA reutilizable desde la card y el detalle.

---

## 4. Backend

### 4.1 Endpoints relevantes para el composer

| Método | Ruta | Uso |
|---|---|---|
| POST | `/servicios/publicaciones` | Crear (puede devolver 409 con `sugerencia`) |
| PUT | `/servicios/publicaciones/:id` | Editar (campos parciales) |
| GET | `/servicios/publicaciones/:id` | Detalle con oferente (hidratación edición) |
| POST | `/servicios/upload-imagen` | Presigned URL R2 |
| DELETE | `/servicios/foto-huerfana` | Reference count + borra de R2 |

### 4.2 Endpoints Q&A público

| Método | Ruta | Uso |
|---|---|---|
| GET | `/servicios/publicaciones/:id/preguntas` | Lista pública (respondidas + pendientes propias) |
| POST | `/servicios/publicaciones/:id/preguntas` | Crear pregunta (autor ≠ dueño) |
| PUT | `/servicios/preguntas/:id` | Editar pregunta propia si no tiene respuesta |
| PUT | `/servicios/preguntas/:id/respuesta` | Dueño responde |
| DELETE | `/servicios/preguntas/:id` | Soft delete (autor si pendiente, dueño cualquiera) |

Service: `apps/api/src/services/servicios/preguntas.ts`. Validación: `apps/api/src/validations/servicios.schema.ts`. `PREGUNTA_MIN` = 5 (frontend y Zod backend, Sprint 9.3 — antes 10 bloqueaba palabras de 7 letras como "Gracias").

### 4.3 Moderación pasiva

`apps/api/src/services/servicios/servicios.service.ts → detectarSugerenciaSeccion()` — regex simple sobre título+descripción. Si detecta venta, devuelve `{ code: 409, sugerencia: 'marketplace' }`.

### 4.4 TTL "fin del día" con zona horaria (Sprint 9.2)

Las publicaciones de Servicios (servicio, solicito, vacante) tienen `expira_at` calculado con `sqlExpiracionFinDeDia(ttlDias, zona)` (`apps/api/src/utils/expiracion.ts`).

- `TTL_DIAS_DEFAULT = 30` días.
- La expresión SQL usa `AT TIME ZONE` para devolver el último segundo (`23:59:59`) del día local de la ciudad, no la hora exacta de creación.
- La zona horaria se resuelve con `getZonaHorariaPorCiudad()` (`utils/zonaHoraria.ts`) — mapeo IANA por ciudad mexicana. Default `'America/Hermosillo'` para Puerto Peñasco.
- Antes del fix, una publicación creada a las 14:30 del día 1 expiraba a las 14:30 del día 31. Ahora expira a las 23:59:59 del día 31 en hora local.

Aplica también a `marketplace.service.ts`, `vacantes.service.ts`, `cardya.service.ts` (cupones/recompensas) y `marketplace/expiracion.ts`.

### 4.5 Q&A — Notificaciones

Las preguntas y respuestas detonan notificaciones (Sprint 9.3). Ver `docs/arquitectura/Notificaciones.md` sección "Servicios — Q&A".

| Evento | Tipo notificación | Destinatario | Mensaje |
|---|---|---|---|
| Usuario hace pregunta | `servicios_nueva_pregunta` | Dueño publicación | `Tienes una nueva pregunta` / `Te preguntaron sobre "{titulo}"` |
| Dueño responde | `servicios_pregunta_respondida` | Autor pregunta | `Tu pregunta fue respondida` / `Ya hay respuesta sobre "{titulo}"` |

Ambas usan `modo: 'personal'` (llegan al perfil personal del receptor sin importar contexto BS), `referenciaTipo: 'servicio'`, `referenciaId: publicacionId`. Click → `/servicios/{publicacionId}`. La llamada a `crearNotificacion` está envuelta en `.catch()` silencioso — la notificación no es crítica al flujo Q&A.

El check constraint de la BD (`notificaciones_tipo_check`) fue actualizado para incluir `servicios_nueva_pregunta` y `servicios_pregunta_respondida` (migración manual, ver `apps/api/src/db/schemas/schema.ts`).

Mismo patrón aplica a MP (`marketplace_nueva_pregunta`, `marketplace_pregunta_respondida`).

---

## 5. Estado y datos

### 5.1 React Query

`apps/web/src/hooks/queries/useServicios.ts`. Cumple [`PATRON_REACT_QUERY.md`](../estandares/PATRON_REACT_QUERY.md): query keys centralizadas, `staleTime` 2 min, `placeholderData: keepPreviousData` en filtros.

### 5.2 Estado local (sin Zustand)

A diferencia de la primera iteración del composer (que usaba un store global), el inline NO necesita store global. `<ComposerSection>` maneja su estado expandido/colapsado con `useState` local. Los triggers externos pasan intención vía URL query params, no via store.

`useComposerServicios` (hook React) sigue manejando el draft + validación + auto-save localStorage.

---

## 6. Tipos clave

`apps/web/src/types/servicios.ts`:
- `ModoServicio = 'ofrezco' | 'solicito'`
- `TipoPublicacion = 'servicio-persona' | 'vacante-empresa' | 'solicito'`
- `SubtipoPublicacion = 'servicio-personal' | 'busco-empleo' | 'servicio-puntual' | 'vacante-empresa'`
- `ModalidadServicio = 'presencial' | 'remoto' | 'hibrido'`
- `CategoriaClasificado = 'hogar' | 'cuidados' | 'eventos' | 'belleza-bienestar' | 'empleo' | 'otros'`
- `PrecioServicio` (discriminated union: fijo, hora, mensual, rango, a-convenir)
- `PublicacionServicio`, `PublicacionDetalle`

---

## 7. Composer compartido MarketPlace ↔ Servicios

El composer se diseñó genérico desde Sprint 9 y se replicó a MP en Sprint 9.1. Hoy ambas secciones tienen su propio composer inline siguiendo el mismo patrón visual + arquitectural:

| Pieza | Servicios | MarketPlace |
|---|---|---|
| Hook draft | `useComposerServicios.ts` | `useComposerMarketplace.ts` |
| Hook fotos | `useFotosUploaderServicios.ts` | `useFotosUploaderMarketplace.ts` |
| Composer UI | `components/servicios/composer/ComposerServicios.tsx` | `components/marketplace/composer/ComposerMarketplace.tsx` |
| Triggers externos | `/servicios?crear=&editar=` | `/marketplace?crear=&editar=` |
| Layout | inline + pill colapsada | inline + pill colapsada (`max-w-[920px]` con `min-w-0`) |

**Piezas aún no centralizadas (oportunidad de refactor):**
- `ChipInputList` (vive en `components/servicios/composer/` pero MP no la usa todavía)
- Hooks de uploader (podrían unificarse en uno parametrizado por mutations)
- `ComposerHintModeracion` y `deteccionVenta.ts` (regex duplicada en ambos — centralizar en `packages/shared/`)

---

## 8. Archivos clave

```
apps/web/src/
├── hooks/
│   ├── useComposerServicios.ts                         ← draft + validación + auto-save
│   ├── useFotosUploaderServicios.ts                    ← lógica subida R2 + tracking huérfanas + previews optimistas
│   └── useIniciarChatServicio.ts                       ← reusable desde card y detalle (botón ChatYA)
├── components/servicios/composer/
│   ├── ComposerSection.tsx                             ← orquestador (colapsado ↔ expandido + query params)
│   ├── ComposerColapsado.tsx                           ← pill del feed (2 variantes)
│   ├── ComposerServicios.tsx                           ← formulario inline (header + textarea + fila íconos + paneles)
│   ├── ComposerHintModeracion.tsx                      ← hint inline anti-venta
│   └── ChipInputList.tsx                               ← input + chips reusable
├── utils/
│   ├── composerServiciosPayload.ts                     ← construir payload crear/editar
│   ├── borradorComposerServicios.ts                    ← leer/descartar borrador
│   └── deteccionVenta.ts                               ← regex anti-venta (sync con backend)
├── pages/private/servicios/
│   ├── PaginaServicios.tsx                             ← feed (monta <ComposerSection>)
│   ├── PaginaServicio.tsx                              ← detalle (incluye <SidebarSobreNegocio>)
│   └── PaginaPerfilPrestador.tsx                       ← perfil personal (sin vacantes)
└── components/servicios/
    ├── MisPublicacionesServiciosSection.tsx            ← navigate a /servicios?editar/?crear
    ├── ServiciosHeader.tsx, TabsServicios.tsx
    ├── OferenteCard.tsx                                ← variante móvil del sidebar (personas + empresa)
    ├── SeccionPreguntasServicio.tsx                    ← Q&A público con copy por tipo
    ├── BarraContactoServicio.tsx                       ← WhatsApp SVG + ChatYA.webp + UserPlus + Tooltip
    └── CardServicio.tsx, CardVacante.tsx, CardServicioMio.tsx, …

apps/api/src/services/servicios/
├── servicios.service.ts                                ← CRUD + moderación pasiva
├── preguntas.ts                                        ← Q&A + crearNotificacion (2 tipos)
└── perfilPrestador.ts                                  ← perfil + filtro tipo IN ('servicio-persona','solicito')
apps/api/src/validations/servicios.schema.ts            ← Zod (PREGUNTA_MIN=5)
apps/api/src/utils/expiracion.ts                        ← sqlExpiracionFinDeDia (TTL fin-de-día)
apps/api/src/utils/zonaHoraria.ts                       ← getZonaHorariaPorCiudad (mapeo IANA)
```

---

## 9. Sprints relevantes

| Sprint | Resumen |
|---|---|
| 2–7 | Wizard de 3 pasos (eliminado en Sprint 9) |
| 5 | Perfil del prestador, reseñas, Q&A público |
| 7 | Mis Publicaciones, edición |
| 8 | BS Vacantes (cierre del módulo BS) |
| **9** | Composer inline en el feed (sin overlay, sin ruta). Fila de íconos "Agregar a tu publicación" estilo Facebook. Triggers externos vía query params (`?crear=`, `?editar=`). Cámara compacta + strip de thumbnails. Hint inline anti-venta. Borradores discoverables. |
| **9.1** | Composer MP inline + layout 920px (`min-w-0` para respetar `max-w-[920px]`). Replicación del composer Servicios. |
| **9.2** | TTL "fin del día" con zona horaria (`sqlExpiracionFinDeDia` + `getZonaHorariaPorCiudad`). Fotos optimistas (blob previews + `Promise.allSettled`). Rediseño detalle Servicios (ChatYA inline). BS Vacantes visibles para todo el equipo de la sucursal (antes solo el creador — se quitó el filtro `usuario_id`). |
| **9.3** | **Perfil prestador rediseñado** (HeroCard con avatar simplificado, KPIs grid con `auto-rows-fr [&>*]:h-full`, BadgeCheck invertido, sin ciudad). Perfil personal excluye vacantes con filtro `tipo IN ('servicio-persona', 'solicito')`. SidebarSobreNegocio + OferenteCard + CardVendedor con mismo patrón sky/amber. Q&A personalizado por tipo (`textosSeccionPreguntas`), `PREGUNTA_MIN: 10 → 5`. **Notificaciones Q&A:** `servicios_nueva_pregunta` + `servicios_pregunta_respondida` (mismo patrón que MP), deep-link al detalle vía `referenciaTipo: 'servicio'`. Botones contacto inline con logos de marca (WhatsApp SVG + ChatYA.webp + UserPlus). |
