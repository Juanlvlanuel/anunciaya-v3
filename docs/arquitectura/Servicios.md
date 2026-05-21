# Arquitectura — Sección Servicios

> Última actualización: 2026-05-20 (Sprint 9 — composer inline en el feed, fila de íconos).
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
- Lógica encapsulada en `useFotosUploaderServicios` (hook que devuelve `inputProps`, `abrirSelector`, `eliminar`, `subiendo`).
- El ícono cámara dispara `abrirSelector` directo (sin acordeón).
- Strip de thumbnails arriba del textarea (3-6 fotos horizontales, scroll si son varias). X para eliminar.
- Tracking huérfanas: `Set<string>` con URLs subidas en sesión. Al publicar se vacía sin disparar deletes. Al eliminar foto del strip sí dispara `useEliminarFotoServicioHuerfana`. Reconcile global limpia eventuales.

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
| `/servicios/:id` | `PaginaServicio` | Detalle de publicación |
| `/servicios/usuario/:usuarioId` | `PaginaPerfilPrestador` | Perfil del prestador con reseñas |
| `/mis-publicaciones` | `PaginaMisPublicaciones` | Panel del autor — toggle MP/Servicios |

**Eliminadas en Sprint 9:**
- `/servicios/publicar`
- `/servicios/publicar/:publicacionId`

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

Validación con Zod en `apps/api/src/validations/servicios.schema.ts`.

### 4.2 Moderación pasiva

`apps/api/src/services/servicios/servicios.service.ts → detectarSugerenciaSeccion()` — regex simple sobre título+descripción. Si detecta venta, devuelve `{ code: 409, sugerencia: 'marketplace' }`.

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

## 7. Replicación a MarketPlace (futuro)

El composer fue diseñado **genérico desde el inicio** para que MP lo adopte. Para sumar MP al patrón:

1. Crear `useComposerMarketplace.ts` (hook draft con shape de MP: precio único, condición usado/nuevo, etc.).
2. Crear `components/marketplace/composer/ComposerMarketplace.tsx` + `ComposerSection.tsx` propio.
3. Replicar el patrón pill colapsada + expandido inline en `PaginaMarketplace`.
4. Wire-up externo via query params: `/marketplace?crear=...` o `?editar=...`.
5. Reutilizar piezas: `ChipInputList` (mover a `components/composer/` cuando se reuse), `useFotosUploaderServicios` (renombrar a `useFotosUploader` y parametrizar mutations), `ComposerHintModeracion` (centralizar regex en `packages/shared/`).

---

## 8. Archivos clave

```
apps/web/src/
├── hooks/
│   ├── useComposerServicios.ts                         ← draft + validación + auto-save
│   └── useFotosUploaderServicios.ts                    ← lógica subida R2 + tracking huérfanas
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
│   ├── PaginaServicio.tsx                              ← detalle
│   └── PaginaPerfilPrestador.tsx
└── components/servicios/
    ├── MisPublicacionesServiciosSection.tsx            ← navigate a /servicios?editar/?crear
    ├── ServiciosHeader.tsx, TabsServicios.tsx
    └── CardServicio.tsx, CardVacante.tsx, CardServicioMio.tsx, …

apps/api/src/services/servicios/                        ← lógica BD + moderación pasiva
apps/api/src/validations/servicios.schema.ts            ← Zod
```

---

## 9. Sprints relevantes

| Sprint | Resumen |
|---|---|
| 2–7 | Wizard de 3 pasos (eliminado en Sprint 9) |
| 5 | Perfil del prestador, reseñas, Q&A público |
| 7 | Mis Publicaciones, edición |
| 8 | BS Vacantes (cierre del módulo BS) |
| **9** | **Composer inline en el feed (sin overlay, sin ruta). Fila de íconos "Agregar a tu publicación" estilo Facebook. Triggers externos vía query params (`?crear=`, `?editar=`). Cámara compacta + strip de thumbnails. Hint inline anti-venta. Borradores discoverables.** |
