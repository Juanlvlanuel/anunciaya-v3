# 📖 Mis Guardados - Colección Personal

> **📌 Documento Complementario**  
> Este documento profundiza en las decisiones arquitectónicas de Mis Guardados.  
> Para el contexto general y flujos completos, ver: **[ARQUITECTURA_Negocios.md](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md)**

> **Tipo:** Documentación Técnica - Decisiones Arquitectónicas  
> **Audiencia:** Desarrolladores, arquitectos de software  
> **Prerequisito:** Familiaridad con sistema de Negocios y Votos

---

**Última actualización:** 08 Marzo 2026  
**Estado:** ✅ 100% Operacional

---

## 📋 Índice

1. [¿Qué es Mis Guardados?](#qué-es-mis-guardados)
2. [Tipos de Contenido](#tipos-de-contenido)
3. [Estructura de la Página](#estructura-de-la-página)
4. [Sistema de Tabs](#sistema-de-tabs)
5. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
6. [API y Endpoints](#api-y-endpoints)
7. [Archivos del Proyecto](#archivos-del-proyecto)
8. [Flujos de Usuario](#flujos-de-usuario)

---

## 🎯 ¿Qué es Mis Guardados?

**Mis Guardados** es una colección personal privada donde el usuario guarda sus negocios y ofertas favoritas para acceso rápido.

### Características Principales

**Privacidad:**
- Colección 100% privada (solo el usuario la ve)
- No visible para otros usuarios
- Sí afecta métricas del negocio — hay un trigger SQL que incrementa `metricas_entidad.total_follows` al seguir un negocio

**Funcionalidad:**
- Guardar negocios favoritos (botón 🔔 "Seguir")
- Guardar ofertas de interés
- Acceso rápido desde el menú principal
- Eliminar items de la colección
- Ver detalles completos con un click
- Contactar al negocio directamente vía ChatYA

**Comportamiento por Modo:**
- La página **sí filtra por modo activo** (Personal o Comercial)
- En modo Personal se muestran los negocios seguidos desde modo personal
- En modo Comercial se muestran los negocios seguidos desde modo comercial
- Esto es posible porque el interceptor de Axios agrega `votanteSucursalId` automáticamente en cada request según el modo activo

**Ruta:** `/guardados`

**Estado:** Fase 5.3.3 completada el 17-18/01/2026 (6 horas de implementación)

---

## 📦 Tipos de Contenido

### 1. Negocios Guardados

**¿Cómo se guardan?**
- Usuario hace click en botón 🔔 "Seguir" en el perfil del negocio
- Se guarda en tabla `votos` con `tipo_accion = 'follow'`
- Backend: `POST /api/votos` con body `{entityType: 'sucursal', entityId: 'uuid', tipoAccion: 'follow'}`

**Información mostrada en `CardNegocioDetallado`:**
- Imagen principal del negocio (primera de galería o logo)
- Nombre y categoría
- Badge Abierto/Cerrado (abre modal de horarios al hacer click)
- Distancia actual (si hay GPS disponible)
- Rating y total de calificaciones
- Botón "Ver Perfil" → navega al perfil del negocio
- Botón ChatYA → abre conversación directa con el negocio
- Botón "Dejar de seguir" → toca el bookmark (🔖) para activar modo selección múltiple y luego eliminar

**Nota de diseño:** El card completo no es clickeable. Solo actúan los botones explícitos.

---

### 2. Ofertas Guardadas

**¿Cómo se guardan?**
- Usuario hace click en botón 🔖 "Guardar" en el modal de detalle de la oferta
- Se guarda en tabla `guardados` propia (no en `votos`)
- Backend: `POST /api/guardados` con body `{entityType: 'oferta', entityId: 'uuid'}`

**Información mostrada:**
- Imagen de la oferta
- Título de la oferta
- Badge del tipo: "HAPPY HOUR" | "25% OFF" | "$100"
- Descripción
- Negocio que la ofrece
- Días restantes
- Estado (Activa/Vencida)
- Botón "Ver Oferta"
- Botón "Dejar de guardar" → toca el bookmark (🔖) para activar modo selección múltiple y luego eliminar

**Comportamiento de visibilidad dinámica:**

El registro de guardado se conserva siempre en la DB. Lo que cambia es si la oferta es visible o no al consultar `/guardados`:

| Acción del comerciante | Resultado en Mis Guardados |
|---|---|
| Oculta la oferta (`activo = false`) | Desaparece automáticamente |
| Reactiva la oferta (`activo = true`) | Reaparece automáticamente |
| La oferta vence (`fecha_fin < hoy`) | Desaparece automáticamente |
| Extiende la fecha de vencimiento | Reaparece automáticamente |
| Elimina la oferta completamente de BS | Desaparece permanentemente (registro en `guardados` también se elimina) |

El usuario **nunca pierde el guardado** por caducidad — si el comerciante reactiva o extiende la oferta, reaparece sola sin que el usuario deba guardarla de nuevo.

---

## 📱 Estructura de la Página

### Layout Principal

```
┌──────────────────────────────────────────────┐
│  Mis Guardados                               │
├──────────────────────────────────────────────┤
│                                              │
│  [Ofertas(5)] [Negocios(3)] [Empleos] [Art] │  ← 4 Tabs
│  ╚═══════════                                │
│                                              │
│  [Recientes] [Antiguos] [A-Z] [Z-A]         │  ← Ordenamiento
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔖  HAPPY HOUR                         │  │
│  │ 2x1 en bebidas · Bar El Rincón         │  │
│  │ Quedan 3 días                          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔖  25% OFF                            │  │
│  │ Descuento en menú · Restaurante Luna   │  │
│  │ Quedan 7 días                          │  │
│  └────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

### Estados Posibles

**Estado 1: Lista con items**
- Muestra tarjetas de items guardados (hasta 50, carga única al entrar)
- Ordenamiento local en memoria (sin nuevos requests)
- Botones de acción en cada tarjeta

**Estado 2: Lista vacía**
```
┌──────────────────────────────────────────────┐
│                                              │
│            🔔                                │
│                                              │
│     No tienes ofertas guardadas              │
│                                              │
│  Explora ofertas y guarda tus favoritas      │
│         para encontrarlas fácilmente         │
│                                              │
│     [Explorar Ofertas]                      │
│                                              │
└──────────────────────────────────────────────┘
```

**Estado 3: Cargando**
- Spinner/skeleton mientras carga datos

---

## 🗂️ Sistema de Tabs

La página tiene 4 tabs: **Ofertas**, **Negocios**, **Empleos**, **Artículos**. Los dos últimos muestran estado "Próximamente disponible" hasta que se implemente su funcionalidad.

### Tab 1: Ofertas

**Contador:** Muestra número total `Ofertas (5)`

**Contenido:**
- Lista de ofertas guardadas
- Ordenadas por fecha de guardado (más reciente primero)
- Soporta ordenamiento: Recientes | Antiguos | A-Z | Z-A

**Query backend:**
```typescript
GET /api/guardados?entityType=oferta&pagina=1&limite=50
```

**Acciones por tarjeta:**
- Click en card → Abre `ModalOfertaDetalle` con detalles completos
- Bookmark (🔖) → Activa modo selección múltiple
- Eliminar seleccionados → `DELETE /api/guardados/oferta/{entityId}` por cada uno

---

### Tab 2: Negocios

**Contador:** Muestra número total `Negocios (3)`

**Contenido:**
- Lista de negocios guardados del **modo activo** del usuario
- Soporta ordenamiento: A-Z | Z-A

**Query backend:**
```typescript
GET /api/seguidos?entityType=sucursal&pagina=1&limite=50&latitud={lat}&longitud={lng}
// votanteSucursalId lo agrega automáticamente el interceptor de Axios según modo activo
```

**Acciones por tarjeta:**
- Ver Perfil → Navega al perfil del negocio
- ChatYA → Abre conversación directa con el negocio
- Bookmark (🔖) → Activa modo selección múltiple
- Eliminar seleccionados → `DELETE /api/votos/sucursal/{sucursalId}/follow` por cada uno, con `votanteSucursalId` o `__skipVotante` según corresponda

---

### Tab 3: Empleos *(próximamente)*

Estado visual "Próximamente disponible". Sin funcionalidad activa.

---

### Tab 4: Artículos *(próximamente)*

Estado visual "Próximamente disponible". Sin funcionalidad activa.

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Tabla separada `guardados` vs reutilizar `votos`?

**Resultado: se usa ambas, según el tipo de contenido.**

---

#### Negocios seguidos → tabla `votos`

Los negocios que el usuario sigue se almacenan en la tabla `votos` con `tipo_accion = 'follow'`. Esto permite reutilizar el sistema existente de likes/follows, los triggers que actualizan métricas, y el campo `votante_sucursal_id` que distingue el modo en que se hizo el follow.

```sql
-- Registro de negocio seguido
INSERT INTO votos (user_id, entity_type, entity_id, tipo_accion, votante_sucursal_id)
VALUES ($userId, 'sucursal', $sucursalId, 'follow', $votanteSucursalId);
```

**Por qué votos para negocios:**
- ✅ Reutiliza triggers que sincronizan `metricas_entidad.total_follows`
- ✅ `votante_sucursal_id` permite filtrar por modo activo
- ✅ Un solo endpoint `POST /api/votos` para like y follow

---

#### Ofertas guardadas → tabla `guardados`

Las ofertas guardadas usan su propia tabla con un sistema separado (`/api/guardados`). Esto permite hacer JOIN directo con los datos completos de la oferta y del negocio asociado en una sola query, algo que sería más complejo desde la tabla `votos`.

**Por qué tabla propia para ofertas:**
- ✅ JOIN directo con oferta + negocio en una sola query
- ✅ Devuelve datos completos listos para renderizar (sin requests adicionales)
- ✅ Las ofertas no necesitan `votante_sucursal_id` (son colección personal independiente del modo)

---

#### Decisión Final

| Contenido | Sistema | Endpoint guardar | Endpoint eliminar |
|---|---|---|---|
| Negocios seguidos | tabla `votos` | `POST /api/votos` | `DELETE /api/votos/sucursal/{id}/follow` |
| Ofertas guardadas | tabla `guardados` | `POST /api/guardados` | `DELETE /api/guardados/oferta/{id}` |

---

### 2. ¿Por qué carga única vs paginación infinita?

**Decisión actual: Carga única de hasta 50 items.**

Se cargan todos los guardados al entrar a la página (límite 50). El ordenamiento (Recientes, Antiguos, A-Z, Z-A) se hace localmente en memoria sin nuevos requests al backend. Esto mantiene la interfaz instantánea y snappy al cambiar el orden.

---

### 3. ¿Mis Guardados filtra por modo activo o muestra todo?

**Decisión actual: Filtra por modo activo.**

La página muestra los negocios que el usuario siguió desde el modo en que se encuentra actualmente. Esto es consistente con el comportamiento del resto de la app: el interceptor de Axios agrega `votanteSucursalId` automáticamente a todos los requests según el modo activo, y el endpoint `/seguidos` lo usa para filtrar.

**¿Por qué no "mostrar todos los modos mezclados"?**

Hubo una implementación anterior que usaba `incluirTodosModos=true` en el request y la ruta `/seguidos/` estaba en la lista de exclusión del interceptor (para que no le agregara `votanteSucursalId`). Eso causaba que se mezclaran los seguidos de modo personal y comercial en la misma vista, lo cual generaba confusión y no era coherente con el sistema de modos del resto de la app.

**Implementación actual:**
- El fetch de negocios seguidos **no** envía `incluirTodosModos`
- La ruta `/seguidos/` fue **removida** de la lista de exclusión del interceptor
- El interceptor agrega `votanteSucursalId` automáticamente → el backend filtra por modo activo
- Al eliminar un follow, se envía el `votanteSucursalId` del registro original (no el del modo activo actual), para garantizar que se elimine exactamente el registro correcto

---

### 4. Visibilidad dinámica de ofertas guardadas

**Decisión: Filtrar en el JOIN, nunca borrar el guardado automáticamente.**

Cuando el backend consulta las ofertas guardadas de un usuario, aplica un filtro en el JOIN contra la tabla `ofertas`:

```typescript
// guardados_service.ts — obtenerGuardados()
.where(and(
    ...condiciones,                  // usuario + entityType
    eq(ofertas.activo, true),        // oferta debe estar activa
    sql`(${ofertas.fechaFin} IS NULL OR ${ofertas.fechaFin} >= CURRENT_DATE)`  // no vencida
))
```

**Por qué este enfoque:**
- ✅ El registro en `guardados` nunca se borra automáticamente por vencimiento
- ✅ Si el comerciante oculta → desaparece; reactiva → reaparece (automático)
- ✅ Si extiende fecha vencida → reaparece sin que el usuario haga nada
- ✅ DB consistente: el usuario no pierde su selección por algo fuera de su control

**Único caso donde sí se borra el guardado automáticamente:**

Cuando el comerciante **elimina la oferta completamente** desde Business Studio, el `ofertas_service.ts` ejecuta una limpieza manual antes del `DELETE`:

```typescript
// ofertas_service.ts — eliminarOferta()
// 1. Limpiar guardados (no hay FK CASCADE entre guardados y ofertas)
await tx.execute(sql`
    DELETE FROM guardados 
    WHERE entity_type = 'oferta' AND entity_id = ${ofertaId}
`);
// 2. Luego eliminar la oferta
await tx.delete(ofertas).where(eq(ofertas.id, ofertaId));
```

Esto es necesario porque la tabla `guardados` usa `entity_id` genérico (UUID sin FK tipada), por lo que PostgreSQL no puede aplicar CASCADE automático al eliminar una oferta.

---

### 5. ¿Por qué eliminación optimista?

**Razón:** Feedback instantáneo = mejor UX.

La eliminación usa modo selección múltiple. El usuario selecciona uno o más items y al confirmar, la UI los elimina inmediatamente. Los requests al backend van en paralelo (`Promise.all`). Si alguno falla, se hace rollback completo al estado anterior.

```typescript
// Optimista: eliminar de UI inmediatamente
setNegocios(negocios.filter(n => !idsSeleccionados.has(n.id)));

// Background: DELETE en paralelo
const promesas = idsAEliminar.map(id => api.delete(...));
await Promise.all(promesas);

// Si falla: rollback
setNegocios(negociosOriginales);
```

---

## 🔌 API y Endpoints

### Arquitectura de Endpoints

**Sistema:** Negocios y Ofertas usan sistemas de backend distintos.

**Negocios seguidos** → sistema de `votos` (tabla `votos` con `tipo_accion='follow'`)
**Ofertas guardadas** → sistema de `guardados` (tabla propia con JOIN a datos de oferta)

**Endpoints reales:**

---

#### 1. Guardar Negocio (Seguir)

```http
POST /api/votos
Authorization: Bearer {token}
Content-Type: application/json

{
  "entityType": "sucursal",
  "entityId": "uuid-de-la-sucursal",
  "tipoAccion": "follow"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Guardado en favoritos",
  "data": {
    "id": "123",
    "userId": "uuid-usuario",
    "entityType": "sucursal",
    "entityId": "uuid-sucursal",
    "tipoAccion": "follow",
    "createdAt": "2024-12-27T05:52:45.709211+00:00"
  }
}
```

**Errores:**
- 400: Ya sigues este negocio
- 401: No autenticado

---

#### 2. Guardar Oferta

```http
POST /api/guardados
Authorization: Bearer {token}
Content-Type: application/json

{
  "entityType": "oferta",
  "entityId": "uuid-de-la-oferta"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Oferta guardada"
}
```

**Errores:**
- 400: Ya tienes guardada esta oferta
- 401: No autenticado

---

#### 3. Obtener Negocios Seguidos

```http
GET /api/seguidos?entityType=sucursal&pagina=1&limite=50&latitud={lat}&longitud={lng}
Authorization: Bearer {token}
// votanteSucursalId lo agrega automáticamente el interceptor según modo activo
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "seguidos": [
      {
        "id": "123",
        "sucursalId": "uuid",
        "usuarioId": "uuid-usuario-negocio",
        "nombre": "Taquería El Norteño",
        "categoria": "Restaurantes",
        "imagenPerfil": "https://...",
        "galeria": [{"url": "...", "titulo": "..."}],
        "estaAbierto": null,
        "distanciaKm": 0.5,
        "calificacionPromedio": "4.5",
        "totalCalificaciones": 10,
        "votanteSucursalId": "uuid-o-null"
      }
    ],
    "total": 3,
    "pagina": 1,
    "limite": 50,
    "totalPaginas": 1
  }
}
```

---

#### 4. Obtener Ofertas Guardadas

```http
GET /api/guardados?entityType=oferta&pagina=1&limite=50
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "guardados": [
      {
        "id": "4",
        "entityType": "oferta",
        "entityId": "uuid-oferta",
        "createdAt": "2024-12-27T05:52:45.709211+00:00",
        "oferta": { ... },
        "negocio": {
          "nombre": "Bar El Rincón",
          "whatsapp": "+526381234567",
          "sucursalId": "uuid"
        }
      }
    ]
  }
}
```

---

#### 5. Eliminar Oferta Guardada

```http
DELETE /api/guardados/oferta/{entityId}
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Eliminado de guardados"
}
```

---

#### 6. Eliminar Negocio Seguido

```http
DELETE /api/votos/sucursal/{sucursalId}/follow?votanteSucursalId={uuid}
Authorization: Bearer {token}
```

**Lógica según modo en que fue seguido:**
- Seguido en **modo comercial** → se pasa `votanteSucursalId={uuid}` explícito en params
- Seguido en **modo personal** → se pasa `__skipVotante=true` para que el interceptor no agregue el sucursalId activo y se elimine el registro con `votante_sucursal_id IS NULL`

**Errores:**
- 404: No tienes guardado este item
- 401: No autenticado

---

### Sincronización con Métricas

**Trigger automático:**

```sql
-- Al crear follow
INSERT INTO votos (entity_type, entity_id, tipo_accion)
VALUES ('sucursal', $uuid, 'follow');

-- Trigger incrementa automáticamente
UPDATE metricas_entidad 
SET total_follows = total_follows + 1
WHERE entity_type = 'sucursal' AND entity_id = $uuid;
```

**No se requiere código adicional** - PostgreSQL mantiene todo sincronizado.

---

## 📂 Archivos del Proyecto

### Estructura Frontend Real

**Ubicación:** `apps/web/src/`

#### Página Principal

```
pages/private/guardados/
└── PaginaGuardados.tsx                (Página principal con tabs)
```

**`PaginaGuardados.tsx`:**
- Tipo `NegocioSeguido` incluye `usuarioId` del negocio (necesario para abrir ChatYA)
- Fetch de negocios usa `/seguidos` con coordenadas GPS y sin `incluirTodosModos` — el interceptor agrega `votanteSucursalId` automáticamente
- DELETE envía el `votanteSucursalId` almacenado en el registro original (no el del modo activo)
- Ambos fetches (negocios y ofertas) se ejecutan en paralelo al montar el componente

#### Componentes Reutilizados

```
components/negocios/
├── CardNegocioDetallado.tsx           (Card de negocio guardado)
├── ModalOfertaDetalle.tsx             (Modal detalle oferta)
└── OfertaCard.tsx                     (Card de oferta guardada)
```

**`CardNegocioDetallado.tsx`:**
- Diseño glassmorphism
- Muestra imagen, nombre, categoría, badge abierto/cerrado, distancia, rating
- Botón ChatYA funcional — requiere `usuarioId` del negocio para iniciar conversación
- El card completo no es clickeable, solo actúan los botones explícitos

#### Hooks relacionados

```
hooks/
├── useGuardados.ts    (Hook del sistema de guardados — ofertas)
└── useVotos.ts        (Hook para likes y follows — negocios)
```

**`useGuardados`** es usado en:
- `ModalOfertaDetalle.tsx` — botón guardar/quitar oferta con actualización optimista

**`useVotos`** es usado en:
- `CardNegocio.tsx` — botón like y seguir en la card de negocio
- `CardNegocioDetallado.tsx` — botón seguir en la card detallada (Mis Guardados)
- `PaginaPerfilNegocio.tsx` — botones like y seguir en el perfil del negocio

`PaginaGuardados.tsx` no usa estos hooks — tiene su propia lógica de eliminación inline porque necesita eliminar **múltiples items en paralelo** con rollback de toda la colección. Los hooks `useGuardados` y `useVotos` están diseñados para toggle de un solo item a la vez, lo cual no aplica aquí.

---

### Estructura Backend Real

**Ubicación:** `apps/api/src/`

#### Routes

```
routes/
├── votos.routes.ts      (POST /api/votos, DELETE /api/votos/:entityType/:entityId/:tipoAccion, GET /api/seguidos)
└── guardados.routes.ts  (POST /api/guardados, DELETE /api/guardados/:entityType/:entityId, GET /api/guardados)
```

#### Controllers

```
controllers/
├── votos.controller.ts      (crearVotoController, eliminarVotoController, obtenerSeguidosController)
└── guardados.controller.ts  (agregarGuardadoController, quitarGuardadoController, obtenerGuardadosController)
```

#### Services

```
services/
├── votos.service.ts      (crearVoto, eliminarVoto, obtenerSeguidos)
└── guardados.service.ts  (agregarGuardado, quitarGuardado, obtenerGuardados)
```

**`votos.service.ts` — `obtenerSeguidos()`:** Filtra por `tipo_accion = 'follow'` y por `votanteSucursalId` según modo activo. Incluye `usuario_id` en el SELECT para que el frontend pueda iniciar conversaciones en ChatYA. Acepta coordenadas GPS para calcular distancia.

**`guardados.service.ts` — `obtenerGuardados()`:** Hace JOIN con la tabla de ofertas para devolver los datos completos de cada oferta guardada, incluyendo datos del negocio asociado. **Aplica filtro de visibilidad dinámico:** solo retorna ofertas con `activo = true` y `fecha_fin >= CURRENT_DATE` (o sin fecha de fin). El registro de guardado se conserva en la DB aunque la oferta esté oculta o vencida — solo se filtra en la consulta.

**`ofertas.service.ts` — `eliminarOferta()`:** Antes de eliminar la oferta de la DB, ejecuta un `DELETE FROM guardados WHERE entity_type = 'oferta' AND entity_id = $ofertaId` para limpiar manualmente todos los guardados asociados. Esto es necesario porque la tabla `guardados` usa `entity_id` genérico sin FK tipada, por lo que PostgreSQL no puede aplicar CASCADE automático.

---

### Base de Datos

**Tabla:** `votos`

```sql
CREATE TABLE votos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    tipo_accion VARCHAR(10) NOT NULL CHECK (tipo_accion IN ('like', 'follow')),
    votante_sucursal_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint único por modo
    UNIQUE (
        user_id, 
        entity_type, 
        entity_id, 
        tipo_accion,
        COALESCE(votante_sucursal_id, '00000000-0000-0000-0000-000000000000')
    )
);
```

**Índices:**
- `idx_votos_user_entity` (user_id, entity_type, entity_id)
- `idx_votos_entity` (entity_type, entity_id)
- `idx_votos_tipo_accion` (tipo_accion)

**Triggers:**
- `trigger_votos_insert` → Incrementa métricas
- `trigger_votos_delete` → Decrementa métricas

---

## 🚶 Flujos de Usuario

### Flujo 1: Guardar Negocio

```
Usuario en perfil de negocio (/negocios/:id)
  ↓
Click en botón 🔔 "Seguir"
  ↓
Sistema:
  - Cambio optimista: botón → "Siguiendo" ✅
  - POST /api/votos
    body: {entityType: 'sucursal', entityId: 'uuid', tipoAccion: 'follow'}
  - Trigger SQL automático incrementa metricas_entidad.total_follows
  - Notificación: "Guardado en 'Mis Guardados'"
  ↓
Si falla:
  - Revertir botón a "Seguir"
  - Mostrar error
```

---

### Flujo 2: Ver Guardados

```
Usuario logueado (en cualquier modo: Personal o Comercial)
  ↓
Click en "Mis Guardados" (menú lateral)
  ↓
Navega a /guardados
  ↓
Sistema carga negocios:
  - GET /api/seguidos?entityType=sucursal&latitud=X&longitud=Y
  - El interceptor de Axios agrega votanteSucursalId automáticamente
    (null si modo personal, sucursalId si modo comercial)
  - Backend devuelve solo los negocios seguidos desde el modo activo actual
Sistema carga ofertas:
  - GET /api/guardados?entityType=oferta&pagina=1&limite=50
  ↓
Muestra tabs con contadores:
  - [Ofertas (5)] [Negocios (3)]
  ↓
Usuario puede:
  - Cambiar entre tabs
  - Ordenar items (Recientes, Antiguos, A-Z, Z-A)
  - Ver perfil del negocio
  - Iniciar chat con el negocio (ChatYA)
  - Eliminar items
```

---

### Flujo 3: Eliminar Items (Modo Selección)

```
Usuario en /guardados
  ↓
Click en bookmark de un item → Activa modo selección múltiple
  ↓
Usuario selecciona uno o más items
  ↓
Click en "Eliminar seleccionados"
  ↓
Sistema (optimista):
  - Items desaparecen INMEDIATAMENTE de la lista
  - Contador actualiza
  ↓
En background, por cada item:

  SI es OFERTA:
    DELETE /api/guardados/oferta/{entityId}

  SI es NEGOCIO seguido en modo COMERCIAL:
    DELETE /api/votos/sucursal/{sucursalId}/follow?votanteSucursalId={uuid}

  SI es NEGOCIO seguido en modo PERSONAL:
    DELETE /api/votos/sucursal/{sucursalId}/follow?__skipVotante=true
    (__skipVotante evita que el interceptor agregue el sucursalId activo)
  ↓
Si falla:
  - Items reaparecen (rollback completo)
  - Notificación error
```

---

### Flujo 4: Ordenamiento

```
Usuario en /guardados con items cargados
  ↓
Click en botón "Recientes" | "Antiguos" | "A-Z" | "Z-A"
  ↓
Ordenamiento local en memoria — NO hace nuevo request al backend
  ↓
Lista se reordena instantáneamente
```

**Nota:** No hay paginación infinita. Se cargan hasta 50 items en el fetch inicial y el ordenamiento es local.

---

## 📚 Referencias Cruzadas

### Para más información sobre:

**Sistema de Votos completo:**
→ Ver [ARQUITECTURA_Negocios.md - Sección "Sistema de Votos Unificado"](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md#sistema-de-votos-unificado)

**Diferencia Like vs Follow:**
→ Ver [ARQUITECTURA_Negocios.md - Sección "Sistema de Likes y Follows"](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md#sistema-de-likes-y-follows)

**Endpoints completos:**
→ Ver [ARQUITECTURA_Negocios.md - Sección "API Endpoints"](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md#api-endpoints)

**Sistema de Modos (Personal/Comercial):**
→ Ver [ARQUITECTURA_Negocios.md - Sección "Sistema de Modos"](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md#sistema-de-modos-personalcomercial)

**Flujos de usuario completos:**
→ Ver [ARQUITECTURA_Negocios.md - Sección "Flujos de Usuario"](./ARQUITECTURA_Negocios_v2.0_CORREGIDO.md#flujos-de-usuario)

---

## 📊 Estado del Proyecto

**Fase 5.3.3:** ✅ 100% Completado

**Archivos principales:**
- `PaginaGuardados.tsx` — página principal con tabs
- `CardNegocioDetallado.tsx` — card de negocio guardado (glassmorphism, ChatYA)
- `votos.service.ts` — lógica de follows con GPS y usuario_id
- `votos.controller.ts` — lógica de votanteSucursalId por modo
- `guardados.service.ts` — JOIN con filtro dinámico de visibilidad de ofertas
- `ofertas.service.ts` — limpieza manual de guardados al eliminar oferta
- `api.ts` — interceptor que agrega votanteSucursalId automáticamente

---

**Última actualización:** 08 Marzo 2026  
**Autor:** Equipo AnunciaYA

**Próximo hito:** Expansión a más tipos de contenido (Artículos, Dinámicas)
