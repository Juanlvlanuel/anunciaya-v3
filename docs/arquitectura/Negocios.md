# 🏪 Negocios - Directorio Geolocalizado

**Última actualización:** 14 Mayo 2026
**Versión:** 3.2
**Estado:** ✅ 100% Operacional

## 🆕 v3.2 — Overlay de buscador con sugerencias en vivo (14 May 2026)

Replicación sobria del patrón canónico del MarketPlace (ver `docs/arquitectura/MarketPlace.md` §P5):

- **Sin endpoint backend nuevo.** El overlay filtra in-memory contra el array de `useNegociosLista()` por nombre del negocio, nombre de la sucursal, categoría padre, subcategorías, dirección y ciudad — mismo criterio que el filtro inline existente. React Query cachea esa lista entre el feed y el overlay, así que no hay doble fetch.
- **Frontend nuevo:** `OverlayBuscadorNegocios.tsx` con identidad azul — montado en `MainLayout.tsx` cuando `pathname.startsWith('/negocios')`. Estado vacío: solo "Búsquedas recientes" (helper `busquedasRecientes.ts` con clave por sección). Mientras escribe (≥2 caracteres): top 5 cards con logo + nombre + categoría padre + ciudad.
- **PaginaNegocios refactorizada:** la lupa móvil ahora escribe a `useSearchStore.query` (antes era estado local `busquedaLocal`). El debounce de 400ms ahora propaga `searchQuery → useFiltrosNegociosStore.busqueda` para que el backend siga filtrando — patrón equivalente al previo, solo que la fuente de verdad ahora es el store global.
- **Click en sugerencia:** `navigate('/negocios?seleccionado=:sucursalId')`. `PaginaNegocios` lee el param y dispara `handleSeleccionarNegocio` cuando los datos están cargados (centra el mapa, abre popup, scrollea card). El param se limpia tras seleccionar para no re-disparar al re-render.
- **Sin página de resultados dedicada** (a diferencia del MP). El feed in-page ya filtra por `useSearchStore.query` + `useFiltrosNegociosStore.busqueda`, por lo que "Ver todos los resultados" simplemente cierra el overlay.

## v3.1 — Header unificado + filtro "A domicilio" + toggle Mapa/Lista flotante (06 May 2026)

Cambios alineados al rediseño cross-secciones (MarketPlace, Ofertas, Negocios):

### Header

- Reorganizado a **una sola fila desktop** para igualar el alto de los headers
  de MarketPlace y Ofertas (`py-4 2xl:py-5` con logo `h-11 2xl:h-12`).
  Layout: Logo izquierda · spacer · chips de filtros · KPI dos líneas (a la
  derecha, alineados al patrón unificado).
- **KPI dos líneas**: número grande arriba (`text-3xl 2xl:text-[40px]`) +
  label en color de marca (`text-blue-400/80 uppercase tracking-wider`) abajo.
- **Eliminada la lógica de compresión por scroll** (`useScrollDirection`,
  state `comprimido`, useEffect de histéresis). El header ya es lo
  suficientemente delgado en su tamaño base, comprimirlo era redundante.
- Eliminado el subtítulo decorativo desktop *"Descubre en {ciudad} ·
  COMERCIOS CERCA DE TI"*.
- Eliminado el bloque sticky "radio km" que aparecía cuando `cercaDeMi` estaba
  activo — esa info ahora se ve directamente en el chip Ciudad como `5 km`.

### Tabs Mapa / Lista

- **Sacadas del header** y convertidas en un **toggle pill flotante**
  posicionado en `top-28 right-[17.5rem] 2xl:right-[21.5rem]` (offset
  pre-calculado para no quedar tapado por la `ColumnaDerecha` global).
- Renderizadas con `createPortal(..., document.body)` para evitar que el
  `overflow-hidden` del header dark recorte el `fixed`.
- En móvil siguen como tabs en una fila bajo el header.

### Filtros (ChipsFiltros)

- **"Mi ciudad"** → **"Ciudad"** (más corto).
- Chip **Subcategoría se oculta** completamente cuando no hay categoría
  activa o cuando la categoría no tiene subcategorías (antes se mostraba
  grisado).
- Nuevo chip combinado **"A domicilio"** que reemplaza "Envíos" + "Servicio
  a Domicilio". Es un toggle simple del flag `aDomicilio` con semántica
  **OR** en backend (muestra negocios con envío O servicio domicilio o ambos).
  - **Backend nuevo**: parámetro `aDomicilio` en `GET /api/negocios` →
    SQL agrega `AND (s.tiene_envio_domicilio = true OR s.tiene_servicio_domicilio = true)`.
  - **Frontend store**: nuevo `aDomicilio: boolean` + `toggleADomicilio()`
    en `useFiltrosNegociosStore`. Los flags individuales `conEnvio` y
    `conServicioDomicilio` quedaron como legacy (mantenidos por
    retrocompatibilidad pero sin UI que los toque).
  - El dueño del negocio sigue configurando los dos flags por separado
    en BS → Mi Perfil → TabOperacion (tienen semántica distinta:
    "envío de productos" vs "servicio a domicilio del cliente").
- **Chips ahora con `border-2`** (antes `border` 1px). Hover muestra tinte
  de marca (`border-blue-400/60`). Activo: `bg-blue-500 border-blue-400 shadow-blue-500/20`.

### Móvil

- **Eliminado el modal "Ajustar búsqueda"** completo (~140 líneas). Los
  filtros móviles ahora son **chips inline en una fila scroll horizontal**
  bajo los tabs (mismo patrón que MarketPlace y Ofertas). Eliminado el
  state `popupFiltrosMovil`, el botón con icono `SlidersHorizontal` y el
  import del icono.
- Header móvil con tamaño fijo (`pt-4 pb-2.5`, logo `w-9 h-9`, título
  `text-2xl`), sin transitions ni lógica de compresión.

### Archivos tocados (resumen)

**Backend (3):**
- `apps/api/src/services/negocios.service.ts` — campo `aDomicilio?: boolean` + filtro SQL OR
- `apps/api/src/controllers/negocios.controller.ts` — lee query param
- `apps/api/src/routes/negocios.routes.ts` — doc del endpoint actualizada

**Frontend (4):**
- `apps/web/src/stores/useFiltrosNegociosStore.ts` — `aDomicilio` + `toggleADomicilio`
- `apps/web/src/hooks/queries/useNegocios.ts` — pasa `aDomicilio` al endpoint
- `apps/web/src/components/negocios/ChipsFiltros.tsx` — chip combinado + estilos blue
- `apps/web/src/pages/private/negocios/PaginaNegocios.tsx` — header reorganizado, FAB Mapa/Lista, popup móvil eliminado, chips inline móvil

---


> **DATOS DEL SERVIDOR (React Query):**
> - Lista y perfil: `hooks/queries/useNegocios.ts` (React Query maneja caché)
> - Categorías y subcategorías: `usePerfilCategorias()` / `usePerfilSubcategorias()`
> - Pre-fetch de perfil/ofertas/catálogo con `queryClient.prefetchQuery`
> - Optimizaciones: React.memo en CardNegocio y ChipsFiltros, estilos CSS inyección única, autoplay interval estable

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura del sistema de Negocios**:
- ✅ Vista pública de directorio geolocalizado
- ✅ Sistema de likes y follows (votos)
- ✅ Perfil completo de negocios/sucursales
- ✅ Página "Mis Guardados" (favoritos)
- ✅ 19 endpoints verificados contra código real
- ✅ Sistema de modos (Personal vs Comercial)
- ✅ Base de datos (2 tablas principales, 1 tabla votos)
- ✅ Middleware y seguridad
- ✅ Decisiones arquitectónicas y justificación

**NO incluye:**
- ❌ Código fuente completo (consultar archivos en repositorio)
- ❌ Implementación detallada de funciones
- ❌ Validaciones Zod línea por línea

**Para implementación exacta:**
- Ver: `/apps/api/src/routes/negocios.routes.ts` (19 endpoints)
- Ver: `/apps/api/src/services/negocios.service.ts` (1,009 líneas)
- Ver: `/apps/api/src/controllers/negocios.controller.ts`
- Ver: `/apps/web/src/pages/public/negocios/`

---

## 📋 Índice

1. [¿Qué es Negocios?](#qué-es-negocios)
2. [Vista Híbrida (Mapa + Carrusel)](#vista-híbrida-mapa--carrusel)
3. [Sistema de Filtros](#sistema-de-filtros)
4. [Sistema de Likes y Follows](#sistema-de-likes-y-follows)
5. [Sistema de Votos - Arquitectura](#sistema-de-votos---arquitectura)
6. [Sistema de Modos (Personal vs Comercial)](#sistema-de-modos-personal-vs-comercial)
7. [Perfil de Negocio](#perfil-de-negocio)
8. [Página Mis Guardados](#página-mis-guardados)
9. [Sistema de Reseñas Verificadas](#sistema-de-reseñas-verificadas)
10. [Base de Datos](#base-de-datos)
11. [API Endpoints](#api-endpoints)
12. [Middleware y Seguridad](#middleware-y-seguridad)
13. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
14. [Archivos del Proyecto](#archivos-del-proyecto)
15. [Flujos de Usuario](#flujos-de-usuario)

---

## 🎯 ¿Qué es Negocios?

**Negocios** es el directorio principal de la aplicación donde los usuarios pueden descubrir negocios locales cercanos.

### Funcionalidades Principales

**Para Usuarios:**
- Ver negocios cercanos en mapa interactivo
- Scroll vertical de tarjetas (carrusel lateral)
- Filtrar por distancia, categoría,Subcategoria, CardYA, envío
- Dar like a negocios (❤️)
- Seguir negocios (🔔) para guardar en "Mis Guardados"
- Ver métricas públicas (likes, visitas, rating, distancia al negocio)
- Acceder al perfil completo del negocio
- Compartir negocios en redes sociales
- Escribir reseñas verificadas (requiere compra con CardYA)
- Contactar por ChatYA o WhatsApp

**Ruta:** `/negocios`

**Estado:** Fase 5.3 completada el 02/01/2026

---

## 🗺️ Vista Híbrida (Mapa + Carrusel)

### Estructura de la Página

```
┌──────────────────────────────────────────────┐
│ Header con Filtros                           │
│ [🔍 Buscar] [📍 5km] [🍴 Cat] [🏷️] [📦]    │
├────────────┬─────────────────────────────────┤
│            │                                 │
│  [Card 1]  │                                 │
│  [Card 2]  │      MAPA INTERACTIVO           │
│  [Card 3]  │   (Leaflet con marcadores)      │
│  [Card 4]  │                                 │
│     ↓      │        📍 📍 📍                  │
│   scroll   │                                 │
│  vertical  │        ~100% altura             │
│            │                                 │
│   ~30%     │          ~70% ancho             │
│   ancho    │                                 │
│            │                                 │
└────────────┴─────────────────────────────────┘
```

### Características Clave

**✅ Siempre visibles simultáneamente:**
- Carrusel vertical a la izquierda (~30% ancho)
- Mapa a la derecha (~70% ancho)
- NO hay toggle entre vistas
- Ambos componentes ocupan 100% de la altura disponible

**✅ Sincronización:**
- Click en marcador del mapa → resalta tarjeta correspondiente en el carrusel
- Click en tarjeta → centra mapa en ese negocio y abre popup
- Scroll suave entre tarjetas

**✅ Navegación:**
- Scroll vertical en el carrusel (rueda del mouse o touch)
- Click directo en tarjetas
- Marcadores interactivos en el mapa

---

### Tarjetas en el Carrusel

**Contenido por tarjeta:**
- Imagen principal (con carrusel interno si tiene múltiples fotos)
- Badge "● Abierto" o "Cerrado" (verde/rojo) en esquina superior izquierda
- Logo del negocio (circular, esquina inferior izquierda sobre la imagen)
- Nombre del negocio
- Categoría con rating (⭐ 4.0)
- Distancia (📍 1.5 km)
- Botón ❤️ Like (esquina superior derecha de la imagen)
- Botones de acción en footer:
  - 💬 ChatYA (icono rojo)
  - 📱 WhatsApp (icono verde)
  - "Ver Perfil →" (botón azul)

**Carrusel interno de imágenes:**
- Navegación con flechas < > si hay múltiples fotos
- Indicadores (dots) si hay múltiples fotos
- Transiciones suaves

**Layout:**
- Tarjetas apiladas verticalmente
- Scroll vertical suave
- Ancho fijo (ocupa ~30% del ancho disponible)
- Altura automática por tarjeta
- Espaciado consistente entre tarjetas

---

### Mapa Interactivo

**Tecnología:** Leaflet

**Funcionalidades:**
- Marcadores de negocios en ubicaciones exactas
- Click en marcador → popup con info básica
- Zoom con controles + / -
- Centrado automático según geolocalización usuario
- Actualización dinámica según filtros

**Información en Popup:**
- Logo del negocio
- Nombre
- Categoría
- Distancia
- Link "Ver perfil"

---

## 🔍 Sistema de Filtros

### Filtros Disponibles

**1. 🔍 Búsqueda por Texto**
- Input: "Buscar negocio..."
- Busca en nombre y descripción del negocio
- Actualiza resultados en tiempo real

**2. 📍 Distancia (Slider)**
- Rango: 1 - 50 km
- Valores rápidos: 1, 3, 5, 10, 25, 50
- Default: 5 km
- Muestra: "📍 5 km"

**3. 🍴 Categoría (Dropdown)**
- Opción: "Todas"
- 11 categorías disponibles:
  - Comida
  - Salud
  - Belleza
  - Servicios
  - Comercios
  - Diversión
  - Movilidad
  - (más categorías...)

**4. 🏷️ Subcategorías (Múltiple)**
- Permite seleccionar múltiples subcategorías
- Filtro: `subcategoriaIds` (array de IDs)
- Ejemplo: `[1, 5, 12]` → filtra negocios con cualquiera de esas subcategorías

**5. 💳 Métodos de Pago (Múltiple)**
- Filtro: `metodosPago` (array)
- Opciones: efectivo, tarjeta, transferencia
- Ejemplo: `["efectivo", "tarjeta"]`
- Nota: "tarjeta" se expande a tarjeta_debito + tarjeta_credito

**6. 🏷️ CardYA (Toggle)**
- Filtrar solo negocios que participan en CardYA
- Útil para usuarios que quieren acumular puntos

**7. 📦 Con Envío (Toggle)**
- Filtrar solo negocios con envío a domicilio
- Basado en flag `tiene_envio_domicilio`

**8. 🏠 Con Servicio a Domicilio (Toggle)**
- Filtrar negocios que van a tu casa (ej: plomero, electricista)
- Basado en flag `tiene_servicio_domicilio`
- **Diferencia:** 
  - `tiene_envio_domicilio` = envían productos
  - `tiene_servicio_domicilio` = van a dar el servicio

### Comportamiento de Filtros

**Aplicación:**
- Filtros se aplican automáticamente al cambiar
- Sin botón "Aplicar" (actualización instantánea)
- Resultados se actualizan en mapa y carrusel

**Persistencia:**
- Filtros se mantienen durante la sesión
- Store global: `useFiltrosNegociosStore.ts`

**Búsqueda Geoespacial:**
- Backend usa PostGIS para búsqueda por radio
- Índice GIST optimiza queries espaciales
- Ordenamiento por distancia (más cercano primero)

---

## 💖 Sistema de Likes y Follows

### DOS Botones Independientes

**Aclaración importante:** Son dos sistemas completamente separados con propósitos diferentes.

---

### 1. Botón LIKE (❤️)

**Ubicación:** Esquina superior derecha de tarjeta en carrusel

**¿Qué hace?**
- Incrementa contador público de "likes" del negocio
- Toggle on/off (puede dar y quitar like)
- NO guarda en ninguna lista personal
- Es una acción social/pública

**¿Para qué sirve?**
- Mostrar popularidad del negocio
- Feedback rápido sin compromiso
- Métrica visible para todos los usuarios

**Métricas asociadas:**
- Contador se muestra en perfil: "❤️ 3 likes"
- Se suma a las métricas públicas del negocio

**Campo en respuesta JSON:**
```json
{
  "liked": true,  // Usuario ya dio like
  "totalLikes": 150
}
```

---

### 2. Botón SEGUIR (🔔)

**Ubicación:** Header del perfil del negocio

**¿Qué hace?**
- Guarda el negocio en "Mis Guardados" (lista privada del usuario)
- Permite recibir notificaciones futuras
- Acceso rápido desde página "Guardados"

**¿Para qué sirve?**
- Crear colección personal de negocios favoritos
- Intención de volver/mantenerse informado
- Acceso rápido a negocios que le interesan

**Datos almacenados:**
- Tabla `votos` con `tipo_accion = 'follow'`
- Relación: usuario → negocio (sucursal específica)
- Fecha de guardado
- Privado (solo el usuario lo ve)

**Campo en respuesta JSON:**
```json
{
  "followed": true,  // Usuario ya lo sigue
  "totalFollows": 45  // Total de seguidores
}
```

---

### Diferencias Clave

| Aspecto | Like ❤️ | Follow 🔔 |
|---------|---------|-----------|
| **Acción** | Rápida, sin compromiso | Intención de volver |
| **Visibilidad** | Pública (contador) | Privada (solo usuario) |
| **Ubicación** | Tarjeta en carrusel | Header del perfil |
| **Guardado** | No guarda nada | Guarda en "Mis Guardados" |
| **Propósito** | Feedback social | Colección personal |
| **Notificaciones** | No | Sí (futuro) |
| **Campo BD** | `tipo_accion = 'like'` | `tipo_accion = 'follow'` |
| **Métrica** | `totalLikes` | `totalFollows` |

---

## 🗄️ Sistema de Votos - Arquitectura

### Tabla Unificada

**IMPORTANTE:** Todo el sistema usa UNA sola tabla `votos` con el campo `tipo_accion`:

```sql
CREATE TABLE votos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,  -- Nullable (puede ser NULL si usuario eliminado)
    entity_type VARCHAR(50) NOT NULL,  -- 'sucursal', 'articulo', etc.
    entity_id UUID NOT NULL,
    tipo_accion VARCHAR(10) NOT NULL CHECK (tipo_accion IN ('like', 'follow')),
    votante_sucursal_id UUID,  -- NULL = modo personal, UUID = modo comercial
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint único por modo
    UNIQUE (user_id, entity_type, entity_id, tipo_accion, COALESCE(votante_sucursal_id, '00000000-0000-0000-0000-000000000000'))
);
```

**NO existe tabla `guardados` separada** - todo está en `votos`.

---

### Triggers SQL Automáticos

**Sistema de sincronización automática con 5 triggers:**

#### 1. trigger_votos_insert
Incrementa contadores en `metricas_entidad` al crear voto:
```sql
total_likes = total_likes + 1  -- Si tipo_accion = 'like'
total_follows = total_follows + 1  -- Si tipo_accion = 'follow'
```

#### 2. trigger_votos_delete
Decrementa contadores al eliminar voto.

#### 3. trigger_sucursal_likes_insert
Sincroniza `negocio_sucursales.total_likes` cuando se da like.

#### 4. trigger_sucursal_likes_delete
Sincroniza cuando se quita like.

#### 5. trigger_eliminar_saves
Elimina follows huérfanos cuando se borra el usuario:
- **Likes:** Se mantienen como anónimos (`user_id = NULL`)
- **Follows:** Se eliminan automáticamente (sin sentido sin usuario)

---

### Tabla metricas_entidad

**Almacena contadores agregados:**

```sql
CREATE TABLE metricas_entidad (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    total_likes INTEGER DEFAULT 0,
    total_follows INTEGER DEFAULT 0,  -- NO total_saves
    total_views INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (entity_type, entity_id)
);
```

**Sincronización:**
- Los triggers actualizan estos contadores automáticamente
- No se requiere código adicional en la aplicación
- PostgreSQL garantiza consistencia

---

## 🔄 Sistema de Modos (Personal vs Comercial)

### ¿Qué es el Sistema de Modos?

AnunciaYA permite que usuarios con negocio puedan **interactuar de dos formas diferentes**:

1. **Modo Personal** (usuario normal)
2. **Modo Comercial** (representando su negocio)

### Campo votante_sucursal_id

**Este campo diferencia quién está votando:**

```typescript
votante_sucursal_id: UUID | NULL
```

- `NULL` = Usuario votó en **modo personal**
- `UUID` = Usuario votó en **modo comercial** (representando esa sucursal)

---

### Ejemplo Práctico

**Escenario:** Juan tiene un negocio "Tacos El Güero"

```
Juan en modo PERSONAL:
- Ve "Pizzería Roma"
- Da like ❤️
- Registro en BD: votante_sucursal_id = NULL

Juan cambia a modo COMERCIAL:
- Ve "Pizzería Roma" (su proveedor de queso)
- Da like ❤️ de nuevo
- Registro en BD: votante_sucursal_id = UUID de Tacos El Güero
```

**Resultado:** Juan puede dar like **dos veces** al mismo lugar:
1. Como persona (modo personal)
2. Como negocio (modo comercial)

---

### Constraint Único

```sql
UNIQUE (
    user_id, 
    entity_type, 
    entity_id, 
    tipo_accion, 
    COALESCE(votante_sucursal_id, '00000000-0000-0000-0000-000000000000')
)
```

**Previene:**
- ❌ Dar like 2 veces en modo personal
- ❌ Dar like 2 veces en modo comercial (misma sucursal)

**Permite:**
- ✅ Like en modo personal + Like en modo comercial
- ✅ Like comercial desde Sucursal A + Like comercial desde Sucursal B

---

### Interceptor Automático (Frontend)

**El frontend agrega automáticamente `votanteSucursalId` en modo comercial:**

```typescript
// apps/web/src/api/api.ts
api.interceptors.request.use((config) => {
  const { usuario } = useAuthStore.getState();

  if (usuario?.modoActivo === 'comercial') {
    const sucursalId = usuario.sucursalActiva || usuario.sucursalAsignada;
    
    if (sucursalId) {
      config.params = config.params || {};
      config.params.votanteSucursalId = sucursalId;
    }
  }

  return config;
});
```

**Resultado:** No necesitas código extra en componentes, el interceptor lo maneja.

---

### Filtrado en Backend

**Servicios filtran votos según modo:**

```typescript
// negocios.service.ts
EXISTS(
    SELECT 1 FROM votos v 
    WHERE v.entity_type = 'sucursal' 
      AND v.entity_id = s.id 
      AND v.user_id = ${userId}
      AND v.tipo_accion = 'like'
      AND ${votanteSucursalId
        ? sql`v.votante_sucursal_id = ${votanteSucursalId}`
        : sql`v.votante_sucursal_id IS NULL`}
) as liked
```

**Explicación:**
- Si `votanteSucursalId` viene en query → busca voto comercial
- Si `votanteSucursalId = NULL` → busca voto personal

---

### Casos de Uso

**1. Feed B2B (Business to Business)**
```
Modo Comercial → Ver negocios que Tacos El Güero sigue
- Proveedores
- Servicios (contador, limpieza)
- Aliados comerciales
```

**2. Analytics Separados**
```sql
-- Likes personales vs comerciales
SELECT 
  CASE 
    WHEN votante_sucursal_id IS NULL THEN 'Personal'
    ELSE 'Comercial'
  END as modo,
  COUNT(*) as total_likes
FROM votos
WHERE tipo_accion = 'like'
GROUP BY 1;
```

**3. Recomendaciones Contextuales**
```
Modo Personal  → "Negocios cerca de ti"
Modo Comercial → "Proveedores de tu giro"
```

---

## 📄 Perfil de Negocio

### Ruta

`/negocios/sucursal/:id`

### Estructura

**Scroll vertical** con secciones horizontales (carruseles)

```
┌──────────────────────────────────────────┐
│  [← Volver] [❤️] [🔔] [🔗]               │
├──────────────────────────────────────────┤
│         PORTADA GRANDE                   │
│           (banner)                       │
├──────────────────────────────────────────┤
│  [Foto     Pescadería Hernandez    📦   │
│   Perfil]  Tacos y mas...                │
│           ❤️ 3  👁️ 19  ⭐ 4.6  📍 3.3km  │
│           🔔 45 seguidores               │
│                                          │
│  📍 Callejon Nicolas Bravo...           │
├──────────────────────────────────────────┤
│  🏷️ Ofertas (3)                →        │
│  ◀ [Oferta1] [Oferta2] [Oferta3] ▶      │
├──────────────────────────────────────────┤
│  🛒 Catálogo (11)               →        │
│  ◀ [Prod1] [Prod2] [Prod3] ▶            │
├──────────────────────────────────────────┤
│  📸 Galería (5)                 →        │
│  ◀ [Foto1] [Foto2] [Foto3] ▶            │
├──────────────────────────────────────────┤
│  ⭐ Reseñas (5)                 →        │
│  [María: 5★] [Juan: 4★] [Ana: 5★]       │
│                                          │
│  [+ Escribir Reseña]                    │
├──────────────────────────────────────────┤
│  📋 SIDEBAR (fijo derecha - desktop)     │
│  ● Abierto - Cierra 6:00 PM             │
│  📍 UBICACIÓN (mapa mini)               │
│  📍 Cómo llegar                         │
│  📞 CONTACTO                            │
│  💬 ChatYA                              │
│  🌐 VISÍTANOS EN (redes)                │
│  💳 MÉTODOS DE PAGO                     │
└──────────────────────────────────────────┘
```

### Secciones del Perfil

**Header:**
- Botón volver
- Botón Like ❤️ (toggle)
- Botón Seguir 🔔 (toggle)
- Botón Compartir 🔗

**Info Principal:**
- Portada (imagen grande) - `portadaUrl`
- Foto de perfil (circular, superpuesta) - `fotoPerfilUrl`
  - **Nota:** Diferente del logo (negocio) - la foto perfil es de la sucursal
- Logo del negocio (pequeño, esquina) - `logoUrl`
- Nombre del negocio
- Badge "📦 Envío a domicilio" (si `tieneEnvioDomicilio = true`)
- Badge "🏠 Servicio a domicilio" (si `tieneServicioDomicilio = true`)
- Descripción breve
- Métricas: 
  - ❤️ `totalLikes` likes
  - 🔔 `totalFollows` seguidores
  - 👁️ `totalVisitas` visitas
  - ⭐ `calificacionPromedio` (reviews)
  - 📍 `distanciaKm` km
- Dirección completa
- Total de sucursales del negocio: `totalSucursales`

**1. Ofertas (Carrusel Horizontal)**
- Tarjetas de ofertas activas
- Badges: "HAPPY HOUR", "25% OFF", "$100"
- Contador de días restantes
- Click → abre modal con detalles

**2. Catálogo (Carrusel Horizontal)**
- Productos y servicios del negocio
- Imagen, nombre, precio
- Badge ⭐ si es destacado
- Click → modal con detalles

**3. Galería (Carrusel Horizontal)**
- Fotos del negocio (campo `galeria` - array)
- Click → modal lightbox con navegación
- Paginación: "Página 1 de 2"

**4. Reseñas**
- Lista de reseñas de clientes
- Avatar, nombre, estrellas, fecha, comentario
- Solo usuarios con compra verificada pueden escribir
- Botón "+ Escribir Reseña"

**Sidebar (Desktop):**

1. **Estado Actual**
   - "● Abierto - Cierra 6:00 PM" (calculado con `zonaHoraria`)
   - "Cerrado - Abre Martes 9:00 AM"
   - Click → abre ModalHorarios
   - Campo: `estaAbierto` (boolean)

2. **Ubicación**
   - Mapa mini con pin
   - Dirección completa
   - Botón "Cómo llegar" (Google Maps)
   - Campos: `latitud`, `longitud`, `direccion`, `ciudad`

3. **Contacto**
   - Teléfono (campo: `telefono`)
   - WhatsApp (campo: `whatsapp`)
   - Email (campo: `correo`)
   - Click en teléfono → call
   - Click en WhatsApp → abre chat

4. **ChatYA**
   - Botón "💬 Enviar mensaje" ✅ Implementado
   - Abre `ChatOverlay` directamente vía `abrirChatTemporal()` del store
   - Crea conversación con `contextoTipo = 'negocio'` y `sucursalId` de la sucursal vista
   - Requiere login — muestra `ModalAuthRequerido` si no está autenticado
   - Si ya existe una conversación con ese negocio/sucursal, la retoma (backend deduplicado)
   - No visible en modo comercial (un negocio no se contacta a sí mismo por chat)

5. **Redes Sociales**
   - Campo: `redesSociales` (JSONB)
   - Estructura:
     ```json
     {
       "facebook": "https://facebook.com/...",
       "instagram": "https://instagram.com/...",
       "tiktok": "https://tiktok.com/@...",
       "twitter": "https://twitter.com/..."
     }
     ```
   - Icons clickeables

6. **Métodos de Pago**
   - Icons: 💵 Efectivo, 💳 Tarjeta, 📱 Transferencia
   - Campo: `metodosPago` (array)
   - Ejemplo: `["efectivo", "tarjeta_debito", "tarjeta_credito", "transferencia"]`

---

### Respuesta Completa del Endpoint

```json
{
  "success": true,
  "data": {
    // Datos del negocio
    "negocioId": "uuid",
    "negocioNombre": "Pescadería Hernandez",
    "negocioDescripcion": "Los mejores mariscos de la región...",
    "logoUrl": "https://pub-xxxxx.r2.dev/...",
    "sitioWeb": "https://pescaderiahernandez.com",
    "aceptaCardya": true,
    "verificado": false,
    
    // Datos de la sucursal
    "sucursalId": "uuid",
    "sucursalNombre": "Pescadería Hernandez - Centro",
    "esPrincipal": true,
    "fotoPerfilUrl": "https://pub-xxxxx.r2.dev/...",  // ← Foto perfil sucursal
    "portadaUrl": "https://pub-xxxxx.r2.dev/...",
    "redesSociales": {  // ← JSONB
      "facebook": "https://facebook.com/...",
      "instagram": "https://instagram.com/..."
    },
    "direccion": "Callejon Nicolas Bravo 123",
    "ciudad": "Puerto Peñasco, Sonora",
    "telefono": "+526381234567",
    "whatsapp": "+526381234567",
    "correo": "contacto@pescaderia.com",
    "tieneEnvioDomicilio": true,
    "tieneServicioDomicilio": false,
    "latitud": 31.317956,
    "longitud": -113.5089739,
    "calificacionPromedio": "4.6",
    "totalCalificaciones": 28,
    "totalLikes": 150,
    "totalVisitas": 1250,
    "activa": true,
    "zonaHoraria": "America/Hermosillo",  // ← Zona horaria
    
    // Arrays anidados
    "categorias": [
      {
        "id": 15,
        "nombre": "Mariscos",
        "categoria": {
          "id": 1,
          "nombre": "Comida",
          "icono": "🍴"
        }
      }
    ],
    
    "horarios": [
      {
        "diaSemana": 0,  // Domingo
        "abierto": false,
        "horaApertura": null,
        "horaCierre": null,
        "tieneHorarioComida": false,
        "comidaInicio": null,
        "comidaFin": null
      },
      {
        "diaSemana": 1,  // Lunes
        "abierto": true,
        "horaApertura": "09:00:00",
        "horaCierre": "18:00:00",
        "tieneHorarioComida": true,
        "comidaInicio": "14:00:00",
        "comidaFin": "16:00:00"
      }
      // ... resto de días
    ],
    
    "metodosPago": [
      "efectivo",
      "tarjeta_debito",
      "tarjeta_credito",
      "transferencia"
    ],
    
    "galeria": [  // ← Array de imágenes
      {
        "id": 1,
        "url": "https://pub-xxxxx.r2.dev/...",
        "titulo": "Interior del local",
        "orden": 1
      },
      {
        "id": 2,
        "url": "https://pub-xxxxx.r2.dev/...",
        "titulo": "Pescado fresco",
        "orden": 2
      }
    ],
    
    "metricas": {
      "totalLikes": 150,
      "totalFollows": 45,  // ← FOLLOWS (no saves)
      "totalViews": 1250,
      "totalShares": 23,
      "totalClicks": 89,
      "totalMessages": 12
    },
    
    // Estado del usuario
    "liked": true,  // Usuario dio like
    "followed": true,  // Usuario lo sigue (está en sus guardados)
    "estaAbierto": true,  // Calculado según horario actual
    
    // Conteo de sucursales
    "totalSucursales": 3  // El negocio tiene 3 sucursales
  }
}
```

---

## 📑 Página Mis Guardados

### Ruta

`/guardados`

### ¿Qué es?

Página privada donde el usuario ve **todos los negocios que sigue** (marcó con 🔔).

**Auth:** ✅ Requerida (solo usuarios logueados)

---

### Estructura de la Página

```
┌─────────────────────────────────────────────┐
│  🔔 Mis Guardados                           │
├─────────────────────────────────────────────┤
│  [Negocios]  [Ofertas]  [Artículos]  ← Tabs│
├─────────────────────────────────────────────┤
│                                             │
│  Grid de Tarjetas (3 columnas desktop)     │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Negocio 1│  │ Negocio 2│  │ Negocio 3│ │
│  │ ● Abierto│  │ Cerrado  │  │ ● Abierto│ │
│  │ 📍 2.1 km│  │ 📍 5.3 km│  │ 📍 1.8 km│ │
│  │ [🔔 Seg] │  │ [🔔 Seg] │  │ [🔔 Seg] │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  ┌──────────┐  ┌──────────┐                │
│  │ Negocio 4│  │ Negocio 5│                │
│  └──────────┘  └──────────┘                │
│                                             │
│  [Cargar más...]  ← Paginación infinita    │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Funcionalidades

**1. Tabs:**
- **Negocios:** Sucursales que sigue
- **Ofertas:** Ofertas guardadas
- **Artículos:** Productos del marketplace guardados

**2. Tarjetas de Negocio:**
- Imagen (portada o foto perfil)
- Logo (esquina)
- Nombre
- Estado: ● Abierto / Cerrado
- Distancia
- Botón 🔔 "Siguiendo" (ya marcado, puede quitar)
- Click → abre perfil completo

**3. Paginación Infinita:**
- Muestra 20 por página
- Scroll → carga automática
- No hay botón "siguiente"

**4. Estados Vacíos:**
- "No tienes negocios guardados"
- "Explora el directorio y guarda tus favoritos"
- Botón "Explorar Negocios"

---

### Hook Frontend

```typescript
// apps/web/src/hooks/useGuardados.ts
const useGuardados = () => {
  const [guardados, setGuardados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  
  const cargarGuardados = async () => {
    const response = await api.get('/api/favoritos', {
      params: {
        entityType: 'sucursal',  // o 'oferta', 'articulo'
        pagina,
        limite: 20
      }
    });
    setGuardados(response.data.data.favoritos);
  };
  
  const toggleSeguir = async (sucursalId) => {
    // Optimistic update
    setGuardados(prev => prev.filter(g => g.entityId !== sucursalId));
    
    try {
      await api.delete(`/api/votos/sucursal/${sucursalId}/follow`);
    } catch (error) {
      // Rollback si falla
      cargarGuardados();
    }
  };
  
  return { guardados, loading, toggleSeguir, cargarMas };
};
```

---

## ⭐ Sistema de Reseñas Verificadas

> **Estado:** ✅ IMPLEMENTADO (12 Febrero 2026)

### ¿Qué es?

Sistema que permite a usuarios **escribir reseñas solo si han comprado** en el negocio usando CardYA.

**Objetivo:** Garantizar autenticidad de las reseñas.

---

### Backend Implementado

**Archivos:**
- `apps/api/src/validations/resenas.schema.ts` - Validación Zod
- `apps/api/src/services/resenas.service.ts` - Lógica de negocio
- `apps/api/src/controllers/resenas.controller.ts` - Controladores
- `apps/api/src/routes/resenas.routes.ts` - Endpoints

**Endpoints:**

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/resenas/sucursal/:sucursalId` | ❌ | Reseñas públicas de una sucursal |
| GET | `/api/resenas/sucursal/:sucursalId/promedio` | ❌ | Promedio y total de reseñas |
| GET | `/api/resenas/puede-resenar/:sucursalId` | ✅ | Verificar si usuario puede reseñar |
| POST | `/api/resenas` | ✅ | Crear nueva reseña |

**Funciones del Service:**
- `obtenerResenasSucursal(sucursalId)` - Lista con datos del autor
- `obtenerPromedioResenas(sucursalId)` - Promedio + total
- `verificarPuedeResenar(usuarioId, sucursalId)` - Validación compra 90 días
- `crearResena(autorId, datos)` - Inserta + métricas UPSERT + notifica dueño

---

### Validación de Compra Verificada

```sql
-- Validación backend (últimos 90 días)
SELECT COUNT(*) 
FROM puntos_transacciones
WHERE usuario_id = $1
  AND negocio_id = $2
  AND created_at >= NOW() - INTERVAL '90 days'
```

**Condiciones:**
- ✅ Usuario tiene transacción con CardYA
- ✅ En los últimos 90 días
- ❌ Si no cumple → modal explicativo

---

### Métricas Automáticas

Al crear una reseña, se actualiza automáticamente `metricas_entidad`:

```typescript
// UPSERT con conteo real (no incrementos)
await db.execute(`
  INSERT INTO metricas_entidad (entidad_tipo, entidad_id, total_resenas, calificacion_promedio)
  SELECT 'sucursal', $1, COUNT(*), AVG(calificacion)
  FROM resenas WHERE sucursal_id = $1
  ON CONFLICT (entidad_tipo, entidad_id) 
  DO UPDATE SET 
    total_resenas = EXCLUDED.total_resenas,
    calificacion_promedio = EXCLUDED.calificacion_promedio,
    updated_at = NOW()
`);
```

---

### Notificaciones

Al recibir una reseña, el dueño del negocio recibe notificación:
- **Tipo:** `nueva_resena`
- **Canal:** Socket.io (tiempo real)
- **Destino:** Dueño del negocio (no empleados)

---

### Frontend Implementado

**Componentes:**
- `ModalEscribirResena.tsx` - Modal con estrellas interactivas + textarea
- Integración en `PaginaPerfilNegocio.tsx`

**Flujo UI:**
1. Usuario en perfil del negocio
2. Click en "Escribir reseña"
3. Sistema verifica `GET /api/resenas/puede-resenar/:id`
4. Si puede → Modal de reseña
5. Si no puede → Modal explicativo

---

### Modal: Sin Compra Verificada

```
┌────────────────────────────────────┐
│  ⚠️ Compra Verificada Requerida   │
├────────────────────────────────────┤
│                                    │
│  Para garantizar reseñas          │
│  auténticas, necesitas haber      │
│  realizado una compra verificada  │
│  mostrando tu CardYA.             │
│                                    │
│  ¿CÓMO FUNCIONA?                  │
│  1. Visita el negocio             │
│  2. Muestra tu CardYA al pagar    │
│  3. ¡Podrás dejar tu reseña! ⭐   │
│                                    │
│  [Entendido]                      │
└────────────────────────────────────┘
```

---

### Modal: Escribir Reseña (Con Compra)

```
┌────────────────────────────────────┐
│  ⭐ Escribe tu Reseña              │
├────────────────────────────────────┤
│                                    │
│  Calificación:                     │
│  ☆ ☆ ☆ ☆ ☆  (click en estrellas) │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Cuéntanos tu experiencia...  │ │
│  │                              │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                    │
│  [Cancelar]  [Publicar Reseña]    │
└────────────────────────────────────┘
```

**Campos:**
- Rating: 1-5 estrellas (requerido)
- Comentario: Texto libre (opcional)

**Validación:**
- Mínimo 1 estrella
- Máximo 500 caracteres en comentario

---

## 🗄️ Base de Datos

### Tablas Principales

#### 1. negocios

```sql
CREATE TABLE negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(120),
    descripcion TEXT,
    sitio_web VARCHAR(200),
    logo_url TEXT,
    activo BOOLEAN DEFAULT true,
    es_borrador BOOLEAN DEFAULT false,
    verificado BOOLEAN DEFAULT false,
    onboarding_completado BOOLEAN NOT NULL DEFAULT false,
    participa_puntos BOOLEAN DEFAULT true,  -- CardYA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_negocios_usuario_id`
- `idx_negocios_activo`
- `idx_negocios_onboarding`

---

#### 2. negocio_sucursales

```sql
CREATE TABLE negocio_sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    es_principal BOOLEAN NOT NULL DEFAULT false,
    
    -- Imágenes
    foto_perfil TEXT,  -- Foto perfil sucursal (diferente del logo)
    portada_url TEXT,
    
    -- Ubicación
    direccion VARCHAR(250),
    ciudad VARCHAR(120),
    ubicacion GEOGRAPHY(Point, 4326),  -- PostGIS
    zona_horaria VARCHAR(50) NOT NULL DEFAULT 'America/Mexico_City',
    
    -- Contacto
    telefono VARCHAR(20),
    whatsapp VARCHAR(20),
    correo VARCHAR(100),
    redes_sociales JSONB,  -- {facebook, instagram, tiktok, twitter}
    
    -- Servicios
    tiene_envio_domicilio BOOLEAN DEFAULT false,
    tiene_servicio_domicilio BOOLEAN DEFAULT false,
    
    -- Métricas (sincronizadas con triggers)
    calificacion_promedio NUMERIC(2,1) DEFAULT 0,
    total_calificaciones INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_visitas INTEGER DEFAULT 0,
    
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Solo una sucursal principal por negocio
    UNIQUE (negocio_id, es_principal) WHERE es_principal = true
);
```

**Índices:**
- `idx_sucursales_ubicacion` (GIST) - PostGIS
- `idx_sucursales_negocio_id`
- `idx_sucursales_activa`
- `idx_sucursales_calificacion`
- `idx_sucursales_visitas`
- `idx_sucursales_redes_sociales` (GIN)

---

#### 3. votos

```sql
CREATE TABLE votos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- Nullable
    entity_type VARCHAR(50) NOT NULL,  -- 'sucursal', 'articulo', etc.
    entity_id UUID NOT NULL,
    tipo_accion VARCHAR(10) NOT NULL CHECK (tipo_accion IN ('like', 'follow')),
    votante_sucursal_id UUID REFERENCES negocio_sucursales(id) ON DELETE SET NULL,
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
- `idx_votos_user_entity`
- `idx_votos_entity`
- `idx_votos_tipo_accion`
- `idx_votos_votante_sucursal`

**Triggers:**
- `trigger_votos_insert` → actualizar_metricas_insert()
- `trigger_votos_delete` → actualizar_metricas_delete()
- `trigger_sucursal_likes_insert` → actualizar_sucursal_likes_insert()
- `trigger_sucursal_likes_delete` → actualizar_sucursal_likes_delete()
- `trigger_eliminar_saves` → eliminar_saves_huerfanos()

---

#### 4. metricas_entidad

```sql
CREATE TABLE metricas_entidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    total_likes INTEGER DEFAULT 0,
    total_follows INTEGER DEFAULT 0,  -- NO total_saves
    total_views INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (entity_type, entity_id)
);
```

**Índices:**
- `idx_metricas_entity`
- `idx_metricas_entity_type`

---

### Tablas Relacionadas

- `negocio_horarios` - Horarios por día de semana
- `negocio_metodos_pago` - Métodos de pago aceptados
- `negocio_galeria` - Galería de imágenes
- `asignacion_subcategorias` - Categorías del negocio
- `negocio_resenas` - Reseñas de clientes

---

## 🔌 API Endpoints

### Endpoints Públicos (Auth Opcional)

#### 1. GET /api/negocios/sucursal/:id

**Descripción:** Obtiene perfil completo de una sucursal

**Auth:** ✅ Opcional (funciona con o sin login)  
**Middleware:** `verificarTokenOpcional`

**Params:**
- `id` (path): UUID de la sucursal

**Query Params:**
- `votanteSucursalId` (opcional): UUID para filtrar votos por modo

**Response 200:** Ver sección "Respuesta Completa del Endpoint" arriba

**Uso:**
- Modal de detalle en app (usuarios logueados)
- Enlaces compartidos públicos (sin login)

**Comportamiento:**
- Si hay usuario → `liked/followed` personalizados
- Si NO hay usuario → `liked/followed = false`

---

### Endpoints Privados (Requieren Auth)

#### 2. GET /api/negocios

**Descripción:** Lista sucursales cercanas con filtros PostGIS

**Auth:** ✅ Requerida  
**Middleware:** `verificarToken`

**Query Params:**
```typescript
{
  latitud?: number,
  longitud?: number,
  distanciaMaxKm?: number = 50,  // Default: 50km
  categoriaId?: number,
  subcategoriaIds?: number[],  // Array: [1, 5, 12]
  metodosPago?: string[],  // Array: ["efectivo", "tarjeta"]
  aceptaCardYA?: boolean,
  tieneEnvio?: boolean,
  tieneServicio?: boolean,
  busqueda?: string,
  limite?: number = 20,
  offset?: number = 0,
  votanteSucursalId?: string  // Auto-agregado por interceptor
}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "negocioId": "uuid",
      "negocioNombre": "Imprenta Fin US",
      "galeria": [
        { "id": 1, "url": "https://...", "titulo": "Fachada", "orden": 1 }
      ],
      "logoUrl": "https://...",
      "aceptaCardya": true,
      "verificado": false,
      
      "sucursalId": "uuid",
      "sucursalNombre": "Sucursal Centro",
      "esPrincipal": false,
      "direccion": "Melchor Ocampo 123",
      "ciudad": "Puerto Peñasco, Sonora",
      "telefono": "+52 6381128286",
      "whatsapp": "+52 6381128286",
      "tieneEnvioDomicilio": false,
      "tieneServicioDomicilio": false,
      "calificacionPromedio": "0.0",
      "totalCalificaciones": 0,
      "totalLikes": 1,
      "totalVisitas": 0,
      "activa": true,

      "latitud": 31.317956,
      "longitud": -113.5089739,
      "distanciaKm": 0.0036,  // Calculado con PostGIS

      "categorias": [
        {
          "id": 45,
          "nombre": "Diseño e Imprenta",
          "categoria": {
            "id": 4,
            "nombre": "Servicios",
            "icono": "🔧"
          }
        }
      ],

      "metodosPago": ["efectivo", "tarjeta_debito"],

      "liked": true,
      "followed": true,
      "estaAbierto": false,
      "totalSucursales": 2  // Conteo de sucursales activas del negocio
    }
  ]
}
```

**Características:**
- ✅ Ordenamiento por distancia si hay latitud/longitud
- ✅ Ordenamiento por likes si NO hay coordenadas
- ✅ PostGIS `ST_DWithin` para búsqueda por radio
- ✅ Filtros combinables (todos opcionales)
- ✅ Estado `liked/followed` según usuario y modo
- ✅ Solo incluye sucursales con `activa = true` (las desactivadas no aparecen en el feed)

### Identificación de sucursal en `CardNegocio` y popups

El feed y el perfil público usan `esPrincipal` + `totalSucursales` para decidir cómo rotular cada card/popup bajo el nombre del negocio:

| `totalSucursales` | `esPrincipal` | Texto mostrado |
|-------------------|---------------|----------------|
| `1` | — | Categoría del negocio (ej: "Panaderías") |
| `> 1` | `true` | `"Matriz"` |
| `> 1` | `false` | `sucursalNombre` (ej: "Sucursal Centro") |

La regla se aplica de forma consistente en:
- `CardNegocio` (feed lista)
- `PaginaNegocios` (popup del mapa)
- `PaginaPerfilNegocio` en 5 puntos: header mobile, header desktop, popup del mapa dentro de `ModalMapa`, popup fullscreen en `ModalBottom` y popup compacto del sidebar

Negocios con una sola sucursal no muestran etiqueta adicional (la Matriz única se infiere del nombre del negocio). Negocios multi-sucursal siempre distinguen con "Matriz" o el nombre de sucursal.

### Control de visibilidad de sucursales desactivadas

La query aplica `WHERE s.activa = true`. Cuando un dueño desactiva una sucursal desde BS → Sucursales (ya sea por `toggleActivaSucursal` directo o a través del flujo de eliminación con historial), el feed público la oculta automáticamente.

El endpoint `GET /sucursal/:id` (perfil completo de una sucursal individual) tiene una excepción: devuelve la sucursal aunque esté desactivada si el `userId` del token pertenece al dueño del negocio o al gerente asignado. Esto permite que el dueño siga editando datos desde Mi Perfil mientras la sucursal está apagada, sin exponerla públicamente.

Cada mutation de sucursales (`useCrearSucursal`, `useToggleSucursalActiva`, `useEliminarSucursal`) invalida `queryKeys.negocios.all()` además de las keys de BS, para que el feed público refleje los cambios en tiempo real sin recargar la página.

---

#### 3. GET /api/negocios/sucursal/:id/horarios

**Descripción:** Obtiene solo horarios de una sucursal (lazy load)

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "diaSemana": 0,
      "abierto": false,
      "horaApertura": null,
      "horaCierre": null,
      "tieneHorarioComida": false,
      "comidaInicio": null,
      "comidaFin": null
    },
    {
      "diaSemana": 1,
      "abierto": true,
      "horaApertura": "09:00:00",
      "horaCierre": "21:00:00",
      "tieneHorarioComida": true,
      "comidaInicio": "14:00:00",
      "comidaFin": "16:00:00"
    }
  ]
}
```

**Uso:** Modal de horarios sin cargar perfil completo

---

#### 4. GET /api/negocios/:id

**Descripción:** Obtiene info básica del negocio

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Mi Negocio",
    "descripcion": "...",
    "logoUrl": "https://...",
    "portadaUrl": "https://...",  // De sucursal principal
    "sitioWeb": "https://...",
    "activo": true,
    "verificado": false,
    "sucursalId": "uuid"  // Sucursal principal
  }
}
```

---

#### 5. GET /api/negocios/:negocioId/sucursales

**Descripción:** Lista todas las sucursales de un negocio

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Sucursal Centro",
      "esPrincipal": true,
      "direccion": "Calle 123",
      "ciudad": "CDMX",
      "telefono": "5512345678",
      "activa": true
    },
    {
      "id": "uuid",
      "nombre": "Sucursal Norte",
      "esPrincipal": false,
      "direccion": "Av. Norte 456",
      "ciudad": "CDMX",
      "telefono": "5587654321",
      "activa": true
    }
  ]
}
```

**Uso:**
- Selector de sucursales en Business Studio
- Preview público (cuántas sucursales tiene)

---

#### 6. GET /api/negocios/:id/galeria

**Descripción:** Obtiene galería de imágenes del negocio

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://pub-xxxxx.r2.dev/...",
      "titulo": "Interior del local",
      "orden": 1
    }
  ]
}
```

---

### Endpoints de Votos

#### 7. POST /api/votos

**Descripción:** Crear like o follow

**Auth:** ✅ Requerida  
**Ruta Completa:** `/api/votos` (votos.routes.ts)

**Body:**
```json
{
  "entityType": "sucursal",
  "entityId": "uuid-de-la-sucursal",
  "tipoAccion": "like"  // o "follow"
}
```

**Query Params (auto-agregado por interceptor):**
- `votanteSucursalId` (opcional): UUID en modo comercial

**Response 201:**
```json
{
  "success": true,
  "message": "Like registrado correctamente",
  "data": {
    "id": "2",
    "userId": "uuid-usuario",
    "entityType": "sucursal",
    "entityId": "uuid-sucursal",
    "tipoAccion": "like",
    "createdAt": "2024-12-27T05:52:45.709211+00:00"
  }
}
```

**Errores:**
- 400: Ya diste like/follow a esta entidad
- 401: No autenticado

---

#### 8. DELETE /api/votos/:entityType/:entityId/:tipoAccion

**Descripción:** Eliminar like o follow

**Auth:** ✅ Requerida

**Params:**
- `entityType`: "sucursal", "articulo", etc.
- `entityId`: UUID de la entidad
- `tipoAccion`: "like" o "follow"

**Query Params (auto-agregado):**
- `votanteSucursalId` (opcional)

**Response 200:**
```json
{
  "success": true,
  "message": "Like eliminado correctamente"
}
```

---

#### 9. GET /api/favoritos

**Descripción:** Obtener favoritos guardados del usuario

**Auth:** ✅ Requerida

**Query Params:**
```typescript
{
  entityType?: 'sucursal' | 'oferta' | 'articulo',
  pagina?: number = 1,
  limite?: number = 20
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "favoritos": [
      {
        "id": "4",
        "entityType": "sucursal",
        "entityId": "uuid-sucursal",
        "createdAt": "2024-12-27T05:52:45.709211+00:00"
      }
    ],
    "total": 1,
    "pagina": 1,
    "limite": 20,
    "totalPaginas": 1
  }
}
```

**Uso:** Página "Mis Guardados"

---

#### 10. GET /api/votos/contadores/:entityType/:entityId

**Descripción:** Obtener contadores de likes y follows

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalLikes": 150,
    "totalFollows": 45  // NO totalSaves
  }
}
```

---

### Endpoints de Métricas

#### 11-16. POST /api/metricas/{view|share|click|message}

**Descripción:** Registrar métricas de interacción

**Auth:** ✅ Requerida (excepto public-view)

**Body:**
```json
{
  "entityType": "sucursal",
  "entityId": "uuid-sucursal"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Vista registrada"
}
```

**Endpoints:**
- POST `/api/metricas/view` - Registrar vista
- POST `/api/metricas/share` - Registrar compartido
- POST `/api/metricas/click` - Registrar click (teléfono, WhatsApp)
- POST `/api/metricas/message` - Registrar mensaje enviado
- POST `/api/metricas/public-view` - ❌ Sin auth (enlaces compartidos)

---

#### 17. GET /api/metricas/:entityType/:entityId

**Descripción:** Obtener métricas completas

**Auth:** ✅ Requerida

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalLikes": 150,
    "totalFollows": 45,
    "totalViews": 1250,
    "totalShares": 23,
    "totalClicks": 89,
    "totalMessages": 12,
    "updatedAt": "2024-12-27T05:52:45.709211+00:00"
  }
}
```

---

### Endpoints de Business Studio (Privados)

**Auth:** ✅ Requerida  
**Middleware:** `verificarNegocio`, `validarAccesoSucursal`

#### 18. PUT /api/negocios/:id/informacion

**Descripción:** Actualiza info general del negocio

**Permisos:** Solo dueños (gerentes reciben 403)

**Body:**
```json
{
  "nombre": "Mi Negocio Actualizado",
  "descripcion": "Nueva descripción...",
  "categoriaIds": [1, 5, 12],
  "aceptaCardya": true
}
```

---

#### 19. PUT /api/negocios/:id/contacto

**Descripción:** Actualiza datos de contacto

**Permisos:**
- Dueños: todos los campos
- Gerentes: solo campos de sucursal (NO sitioWeb)

**Query:** `?sucursalId=uuid`

**Body:**
```json
{
  "nombreSucursal": "Sucursal Centro",
  "telefono": "+526381234567",
  "whatsapp": "+526381234567",
  "correo": "contacto@negocio.com",
  "sitioWeb": "https://negocio.com",  // Solo dueños
  "redesSociales": {
    "facebook": "https://facebook.com/...",
    "instagram": "https://instagram.com/..."
  }
}
```

---

#### 20-23. PUT /api/negocios/:id/{ubicacion|horarios|imagenes|operacion}

**Descripción:** Actualizar otras secciones del negocio

**Permisos:** Todos pueden editar (dueños y gerentes)

**Query:** `?sucursalId=uuid`

Ver documentación de Business Studio para detalles.

---

### Endpoints de Imágenes

#### 24. POST /api/negocios/:id/logo

**Descripción:** Subir logo del negocio

**Body:** `{ "logoUrl": "https://..." }`

---

#### 25. POST /api/negocios/sucursal/:id/foto-perfil

**Descripción:** Subir foto de perfil de sucursal

**Body:** `{ "fotoPerfilUrl": "https://..." }`

---

#### 26. POST /api/negocios/:id/portada

**Descripción:** Subir portada de sucursal

**Query:** `?sucursalId=uuid`  
**Body:** `{ "portadaUrl": "https://..." }`

---

#### 27. POST /api/negocios/:id/galeria

**Descripción:** Agregar imágenes a galería

**Query:** `?sucursalId=uuid`

**Body:**
```json
{
  "imagenes": [
    {
      "url": "https://pub-xxxxx.r2.dev/..."
    }
  ]
}
```

---

#### 28-31. DELETE /api/negocios/...

**Descripción:** Eliminar imágenes

- DELETE `/api/negocios/:id/logo`
- DELETE `/api/negocios/sucursal/:id/foto-perfil`
- DELETE `/api/negocios/:id/portada`
- DELETE `/api/negocios/:negocioId/galeria/:imageId`

---

## 🔐 Middleware y Seguridad

### 1. verificarToken

**Archivo:** `apps/api/src/middleware/auth.ts`

**Propósito:** Verificar que el usuario está autenticado

**Comportamiento:**
- Extrae token de header `Authorization: Bearer {token}`
- Valida token con JWT
- Agrega `req.usuario` con datos del usuario
- Si falla → 401 Unauthorized

**Uso:**
```typescript
router.get('/api/negocios', verificarToken, listarSucursalesController);
```

---

### 2. verificarTokenOpcional

**Archivo:** `apps/api/src/middleware/authOpcional.middleware.ts`

**Propósito:** Permitir acceso con o sin login

**Comportamiento:**
- Si hay token → valida y agrega `req.usuario`
- Si NO hay token → `req.usuario = null` (no falla)
- Endpoint funciona en ambos casos

**Uso:**
```typescript
router.get('/api/negocios/sucursal/:id', verificarTokenOpcional, obtenerPerfilSucursalController);
```

**Ejemplo:**
```typescript
// En el controller
export async function obtenerPerfilSucursalController(req, res) {
  const userId = req.usuario?.usuarioId || null;  // Puede ser null
  
  // Service maneja ambos casos
  const perfil = await obtenerPerfilSucursal(sucursalId, userId);
  
  // Si userId = null → liked/followed = false
  // Si userId = UUID → consulta votos reales
}
```

---

### 3. verificarNegocio

**Archivo:** `apps/api/src/middleware/negocio.middleware.ts`

**Propósito:** Verificar que el usuario tiene un negocio asociado

**Comportamiento:**

```typescript
// Buscar negocio del usuario (dueño)
const [negocio] = await db
  .select({ id: negocios.id })
  .from(negocios)
  .where(eq(negocios.usuarioId, usuarioId))
  .limit(1);

if (negocio) {
  req.negocioId = negocio.id;  // Dueño
  return next();
}

// Si no es dueño, buscar en tabla usuarios (gerente/empleado)
const queryUsuario = await db.execute(sql`
  SELECT negocio_id 
  FROM usuarios 
  WHERE id = ${usuarioId}
`);

if (queryUsuario.rows.length === 0 || !queryUsuario.rows[0].negocio_id) {
  return res.status(403).json({
    success: false,
    message: 'No tienes un negocio asociado'
  });
}

req.negocioId = queryUsuario.rows[0].negocio_id;  // Gerente/Empleado
```

**Resultado:**
- ✅ Dueños acceden con su `negocioId` de tabla `negocios`
- ✅ Gerentes/Empleados acceden con `negocio_id` de tabla `usuarios`

---

### 4. validarAccesoSucursal

**Archivo:** `apps/api/src/middleware/sucursal.middleware.ts`

**Propósito:** Validar permisos por rol (dueño vs gerente)

**Comportamiento:**

```typescript
const sucursalId = req.query.sucursalId || req.params.id;

if (!sucursalId) {
  return next();  // Sin filtro de sucursal
}

// Obtener datos del usuario
const [usuario] = await db
  .select()
  .from(usuarios)
  .where(eq(usuarios.id, usuarioId))
  .limit(1);

// Si es GERENTE → validar que solo acceda a su sucursal asignada
if (usuario.sucursalAsignada) {
  if (usuario.sucursalAsignada !== sucursalId) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para acceder a esta sucursal'
    });
  }
}

// Si es DUEÑO → validar que la sucursal pertenece a su negocio
else {
  const [sucursal] = await db
    .select()
    .from(negocioSucursales)
    .where(
      and(
        eq(negocioSucursales.id, sucursalId),
        eq(negocioSucursales.negocioId, req.negocioId)
      )
    )
    .limit(1);

  if (!sucursal) {
    return res.status(403).json({
      success: false,
      message: 'Sucursal no encontrada o no pertenece a tu negocio'
    });
  }
}

next();
```

**Resultado:**
- ✅ Dueños pueden editar cualquier sucursal de su negocio
- ✅ Gerentes solo pueden editar su sucursal asignada
- ❌ Gerentes reciben 403 si intentan acceder a otra sucursal

---

## 🎯 Decisiones Arquitectónicas

### 1. Votos a Sucursales (NO a Negocios)

**Decisión:** Votar a **sucursales específicas** (no negocios genéricos)

**Razón:** Un negocio puede tener múltiples sucursales con métricas independientes

**Ejemplo:**
```
"Tacos El Güero" (negocio)
├── Sucursal Roma: 150 likes, 4.5★
├── Sucursal Condesa: 89 likes, 4.2★
└── Sucursal Polanco: 200 likes, 4.8★
```

**Ventajas:**
- ✅ Más preciso (sabes qué sucursal específica le gustó)
- ✅ Mejor UX (usuarios guardan sucursales cercanas)
- ✅ Métricas útiles (comparar sucursales del mismo negocio)
- ✅ Escalable (funciona para cadenas con 100+ sucursales)

---

### 2. Tabla Votos Unificada (NO tabla guardados)

**Decisión:** UNA tabla `votos` con campo `tipo_accion`

**Razón:** Separación lógica, no física

**Ventajas:**
- ✅ Menos tablas en BD
- ✅ Triggers reutilizables
- ✅ Constraint único más simple
- ✅ Queries más eficientes (una tabla, un índice)
- ✅ Fácil agregar nuevos tipos (ej: "bookmark", "favorite")

**Alternativa rechazada:**
```
❌ Opción B: Tablas separadas
- tabla likes (tipo_accion siempre 'like')
- tabla follows (tipo_accion siempre 'follow')

Desventajas:
- Más tablas, más complejidad
- Triggers duplicados
- Más difícil agregar nuevos tipos
```

---

### 3. Triggers SQL Automáticos

**Decisión:** Usar triggers SQL en lugar de lógica en código

**Razón:** Garantiza consistencia de datos independiente del código

**Ventajas:**
- ✅ Sincronización 100% confiable
- ✅ Sin race conditions
- ✅ Funciona aunque falle el código
- ✅ No requiere transacciones manuales
- ✅ PostgreSQL garantiza ejecución

**Ejemplo:**
```
Usuario da like → INSERT en votos
                ↓
         Trigger automático actualiza:
         1. metricas_entidad.total_likes
         2. negocio_sucursales.total_likes
         
NO se requiere código adicional
```

---

### 4. Sistema de Modos con votante_sucursal_id

**Decisión:** Campo `votante_sucursal_id` para separar votos por modo

**Razón:** Usuarios pueden votar como persona Y como negocio

**Ventajas:**
- ✅ Permite B2B (negocios siguen a proveedores)
- ✅ Feed personalizado por modo
- ✅ Analytics separados (personal vs comercial)
- ✅ Un usuario puede dar like 2 veces (personal + comercial)

**Ejemplo de uso:**
```
Juan (modo personal) → Like a "Pizzería Roma"
votante_sucursal_id = NULL

Juan (modo comercial "Tacos El Güero") → Like a "Pizzería Roma"
votante_sucursal_id = UUID de Tacos El Güero

Resultado:
- 2 registros en tabla votos
- Ambos válidos
- Diferentes propósitos
```

---

### 5. Auth Opcional en Perfil Público

**Decisión:** Endpoint `/sucursal/:id` funciona con o sin login

**Razón:** Enlaces compartidos deben funcionar sin registro

**Ventajas:**
- ✅ Compartir en redes sociales funciona
- ✅ Enlaces de WhatsApp funcionan
- ✅ SEO-friendly (bots pueden indexar)
- ✅ Usuarios pueden explorar sin cuenta
- ✅ Aumenta conversión (ven contenido antes de registrarse)

**Comportamiento:**
```
Usuario SIN login:
- liked = false
- followed = false
- Puede ver todo el contenido
- Modal "Inicia sesión" al intentar dar like

Usuario CON login:
- liked = true/false (según su voto real)
- followed = true/false (según su voto real)
- Puede dar like/follow directamente
```

---

### 6. PostGIS para Geolocalización

**Decisión:** Usar PostGIS en lugar de cálculos manuales

**Razón:** PostgreSQL optimizado para queries espaciales

**Ventajas:**
- ✅ Índice GIST para queries rápidas
- ✅ Cálculo preciso de distancias (considera curvatura terrestre)
- ✅ Búsqueda por radio eficiente (`ST_DWithin`)
- ✅ Ordenamiento por distancia nativo
- ✅ Funciona con millones de registros

**Query ejemplo:**
```sql
SELECT *, 
  ST_Distance(
    s.ubicacion::geography,
    ST_SetSRID(ST_MakePoint(-113.509, 31.318), 4326)::geography
  ) / 1000 as distancia_km
FROM negocio_sucursales s
WHERE ST_DWithin(
  s.ubicacion::geography,
  ST_SetSRID(ST_MakePoint(-113.509, 31.318), 4326)::geography,
  10000  -- 10km en metros
)
ORDER BY distancia_km ASC;
```

---

### 7. Zona Horaria por Sucursal

**Decisión:** Campo `zona_horaria` en cada sucursal

**Razón:** México tiene 4 zonas horarias diferentes

**Ventajas:**
- ✅ "Abierto/Cerrado" correcto según zona
- ✅ Soporta cadenas nacionales (ej: OXXO)
- ✅ Horarios precisos en cada región

**Zonas en México:**
- `America/Mexico_City` (Centro)
- `America/Hermosillo` (Sonora)
- `America/Chihuahua` (Chihuahua)
- `America/Tijuana` (Baja California)

**Cálculo:**
```sql
-- Hora actual en zona horaria de la sucursal
(CURRENT_TIME AT TIME ZONE s.zona_horaria)::time 
  BETWEEN nh.hora_apertura AND nh.hora_cierre
```

---

### 8. Middleware Modular

**Decisión:** Separar validaciones en middlewares específicos

**Razón:** Reutilización y separación de responsabilidades

**Ventajas:**
- ✅ Código más limpio
- ✅ Fácil de testear
- ✅ Reutilizable en diferentes endpoints
- ✅ Manejo de errores centralizado

**Stack de middlewares:**
```typescript
router.put(
  '/:id/contacto',
  verificarToken,        // 1. ¿Usuario logueado?
  verificarNegocio,      // 2. ¿Tiene negocio?
  validarAccesoSucursal, // 3. ¿Puede acceder a esta sucursal?
  actualizarContactoController
);
```

---

## 📂 Archivos del Proyecto

### Backend

```
apps/api/src/
├── routes/
│   ├── negocios.routes.ts         (19 endpoints)
│   ├── votos.routes.ts            (4 endpoints)
│   └── metricas.routes.ts         (6 endpoints)
│
├── controllers/
│   ├── negocios.controller.ts     (19 funciones)
│   ├── votos.controller.ts        (4 funciones)
│   └── metricas.controller.ts     (6 funciones)
│
├── services/
│   ├── negocios.service.ts        (1,009 líneas)
│   ├── votos.service.ts           (Lógica de likes/follows)
│   └── metricas.service.ts        (Lógica de métricas)
│
├── middleware/
│   ├── auth.ts                    (verificarToken)
│   ├── authOpcional.middleware.ts (verificarTokenOpcional)
│   ├── negocio.middleware.ts      (verificarNegocio)
│   └── sucursal.middleware.ts     (validarAccesoSucursal)
│
└── types/
    └── negocios.types.ts          (Interfaces TypeScript)
```

---

### Frontend

```
apps/web/src/
├── pages/
│   ├── public/
│   │   └── negocios/
│   │       ├── PaginaNegocios.tsx        (Directorio principal)
│   │       └── PaginaPerfilNegocio.tsx   (Perfil completo)
│   │                                           Props opcionales: `sucursalIdOverride` (sin router),
│   │                                           `modoPreviewOverride` (modo lectura embebido en ChatYA)
│   │
│   └── private/
│       └── guardados/
│           └── PaginaGuardados.tsx       (Mis Guardados)
│
├── components/
│   └── negocios/
│       ├── TarjetaNegocio.tsx           (Card en carrusel)
│       ├── MapaNegocios.tsx             (Mapa Leaflet)
│       ├── PanelFiltros.tsx             (Filtros)
│       ├── ModalDetalleItem.tsx         (Modal producto)
│       └── ModalHorarios.tsx            (Modal horarios)
│
├── hooks/
│   ├── queries/useNegocios.ts           (React Query: lista, perfil, ofertas, catálogo, reseñas, prefetch)
│   ├── useGuardados.ts                  (Mis guardados)
│   └── useVotos.ts                      (Likes/follows)
│
└── services/
    ├── negociosService.ts               (API calls)
    └── votosService.ts                  (API calls votos)
```

---

## 🚶 Flujos de Usuario

### Flujo 1: Descubrir Negocios (Usuario No Logueado)

```
Usuario abre /negocios
  ↓
Sistema detecta: Usuario NO logueado
  ↓
Muestra vista completa:
  - Mapa con negocios cercanos (usa ubicación aproximada o default)
  - Carrusel con tarjetas
  - Filtros funcionales
  ↓
Usuario puede:
  - Ver todos los negocios
  - Filtrar por categoría/distancia
  - Click en tarjeta → ver perfil completo
  - Ver ofertas, catálogo, galería
  ↓
Usuario intenta dar LIKE ❤️
  ↓
Sistema muestra ModalAuthRequerido:
  "Inicia sesión para dar like"
  [Botón: Iniciar sesión]
```

---

### Flujo 2: Dar Like (Usuario Logueado)

```
Usuario logueado en /negocios
  ↓
Ve tarjeta de negocio en carrusel
  ↓
Click en botón ❤️ (esquina superior)
  ↓
Sistema:
  - POST /api/votos
    body: { entityType: 'sucursal', entityId, tipoAccion: 'like' }
    query: { votanteSucursalId } (auto-agregado por interceptor)
  - Guarda en tabla `votos`
  - Trigger incrementa metricas_entidad.total_likes
  - Trigger incrementa negocio_sucursales.total_likes
  - Cambia estado visual del botón (filled)
  - Notificación: "Te gusta Pescadería Hernandez"
  ↓
Usuario puede volver a hacer click para QUITAR like
  ↓
Sistema:
  - DELETE /api/votos/sucursal/{id}/like
  - Trigger decrementa contadores
  - Restaura estado visual del botón (outline)
```

---

### Flujo 3: Seguir Negocio

```
Usuario logueado en perfil de negocio
  ↓
Ve botón 🔔 en header
  ↓
Click en botón Seguir
  ↓
Sistema:
  - POST /api/votos
    body: { entityType: 'sucursal', entityId, tipoAccion: 'follow' }
  - Guarda en tabla `votos`
  - Trigger incrementa metricas_entidad.total_follows
  - Cambia botón a "Siguiendo" (filled)
  - Notificación: "Guardado en 'Mis Guardados'"
  ↓
Negocio ahora aparece en página /guardados
  ↓
Usuario puede hacer click de nuevo para DEJAR DE SEGUIR
  ↓
Sistema:
  - DELETE /api/votos/sucursal/{id}/follow
  - Trigger decrementa metricas_entidad.total_follows
  - Restaura botón a "Seguir" (outline)
  - Notificación: "Eliminado de guardados"
```

---

### Flujo 4: Contactar Negocio por ChatYA

```
Usuario logueado en perfil de negocio
  ↓
Click en botón 💬 Enviar mensaje (sidebar desktop / botón mobile)
  ↓
Si NO está logueado:
  → Muestra ModalAuthRequerido

Si está logueado:
  → abrirChatTemporal({ participante2Id, participante2Modo, sucursalId, contextoTipo: 'negocio' })
  → ChatOverlay se abre con chat temporal
  ↓
Usuario escribe y envía primer mensaje
  ↓
Sistema:
  - POST /api/chatya/conversaciones (crea o retoma existente)
  - backend verifica si ya existe conversación con esa sucursal
  - Si existe → retorna la existente
  - Si no → crea nueva con contextoTipo = 'negocio'
  ↓
Chat activo — el negocio recibe notificación en tiempo real vía Socket.io
  ↓
En VentanaChat del negocio:
  - Header muestra "Desde: Tu perfil" (contexto de origen)
  - Solo visible al receptor (el negocio), no a quien inició
```

---

### Flujo 5: Ver Perfil de Negocio Embebido desde ChatYA

```
Usuario en ChatYA → conversación con un negocio
  ↓
Click en header del chat (avatar/nombre del negocio)
  ↓
PanelInfoContacto se abre (Vista 2: Usuario → Negocio)
  ↓
Click en botón "Ver perfil"
  ↓
PaginaPerfilNegocio se monta como componente directo dentro del panel
  - Props: sucursalIdOverride={sucursalId}, modoPreviewOverride=true
  - BreakpointOverride fuerza vista mobile dentro del panel estrecho
  - Sin iframe, misma instancia React
  ↓
Desktop: panel se expande a 500px
Mobile: sub-vista fullscreen con botón ← atrás
  ↓
Botón atrás nativo cierra la vista perfil (history.pushState)
```

---

### Flujo 6: Filtrar Negocios

```
Usuario en /negocios
  ↓
Click en filtro "📍 5 km"
  ↓
Abre dropdown con slider:
  [1] [3] [5] [10] [25] [50]
  ━━━●━━━━━━━━━━━━━━
  ↓
Mueve slider a 10 km
  ↓
Sistema actualiza:
  - Store: setDistanciaMax(10)
  - URL: /negocios?distancia=10
  - GET /api/negocios?distanciaMaxKm=10
  - Mapa actualiza marcadores (PostGIS ST_DWithin con 10km)
  - Carrusel actualiza tarjetas
  - Sin recargar página completa (React)
```

---

### Flujo 7: Ver Perfil Completo

```
Usuario en carrusel de /negocios
  ↓
Click en "Ver Perfil →" en tarjeta
  ↓
Navega a /negocios/sucursal/:id
  ↓
Sistema carga:
  - GET /api/negocios/sucursal/:id
    (verificarTokenOpcional permite con o sin login)
  - Info básica del negocio
  - Ofertas activas (carrusel)
  - Catálogo (carrusel)
  - Galería (carrusel)
  - Reseñas (lista)
  - Horarios
  - Datos de contacto
  - Métricas
  ↓
Sistema incrementa contador de visitas:
  - POST /api/metricas/view
    body: { entityType: 'sucursal', entityId }
  ↓
Usuario hace scroll vertical para ver todo
```

---

### Flujo 8: Escribir Reseña (Con Compra Verificada)

```
Usuario logueado en perfil de negocio
  ↓
Scroll hasta sección Reseñas
  ↓
Click en "+ Escribir Reseña"
  ↓
Sistema verifica:
  Query: ¿Usuario tiene transacción con CardYA en este negocio?
  
  SELECT COUNT(*) 
  FROM negocio_transacciones
  WHERE usuario_id = $1
    AND negocio_id = $2
    AND estado = 'completado'
  ↓
SÍ tiene compra verificada ✅
  ↓
Abre modal escribir reseña:
  - Selector estrellas (1-5)
  - Área de texto
  - Botones: Cancelar | Publicar
  ↓
Usuario escribe y da 5 estrellas
  ↓
Click "Publicar Reseña"
  ↓
Sistema:
  - POST /api/resenas
  - Guarda en tabla `negocio_resenas`
  - Actualiza calificacion_promedio del negocio
  - Actualiza total_calificaciones
  - Cierra modal
  - Reseña aparece en la lista
  - Notificación: "Reseña publicada"
```

---

### Flujo 9: Escribir Reseña (Sin Compra)

```
Usuario logueado en perfil de negocio
  ↓
Click en "+ Escribir Reseña"
  ↓
Sistema verifica:
  Query: ¿Usuario tiene transacción con CardYA?
  ↓
NO tiene compra ❌
  ↓
Modal informativo:
  
  "¡Compra verificada requerida!"
  
  Para garantizar reseñas auténticas, necesitas 
  haber realizado una compra verificada mostrando 
  tu CardYA en este negocio.
  
  ¿CÓMO FUNCIONA?
  1. Visita el negocio y realiza tu compra
  2. Muestra tu CardYA para que el negocio la escanee
  3. ¡Listo! Podrás dejar tu reseña verificada
  
  [Botón: Entendido]
  ↓
Usuario cierra modal
  ↓
NO puede escribir reseña hasta tener compra verificada
```

---

### Flujo 10: Compartir Negocio

```
Usuario en perfil de negocio
  ↓
Click en botón 🔗 Compartir (header)
  ↓
Abre dropdown con opciones:
  - 📱 WhatsApp
  - 📘 Facebook
  - 𝕏 Twitter
  - 📋 Copiar enlace
  ↓
Usuario selecciona "WhatsApp"
  ↓
Sistema:
  - Genera URL: https://anunciaya.com/negocios/sucursal/:id
  - Registra métrica: POST /api/metricas/share
  - Abre WhatsApp con texto pre-formateado:
    "¡Mira este negocio en AnunciaYA! 
     Pescadería Hernandez
     https://anunciaya.com/negocios/sucursal/uuid"
  ↓
Amigo recibe link en WhatsApp
  ↓
Click en link → abre perfil público (sin login requerido)
  ↓
Sistema registra: POST /api/metricas/public-view
```

---

### Flujo 11: Ver Horarios

```
Usuario en perfil de negocio
  ↓
Ve estado: "● Abierto - Cierra 6:00 PM"
  ↓
Click en el estado
  ↓
GET /api/negocios/sucursal/:id/horarios (lazy load)
  ↓
Abre ModalHorarios con:
  
  Lunes       -
  Martes      9:00 AM - 6:00 PM
  Miércoles   9:00 AM - 6:00 PM
  Jueves      9:00 AM - 6:00 PM
  Viernes (Hoy) 9:00 AM - 6:00 PM ← Resaltado
    └─ Comida: 2:00 PM - 4:00 PM
  Sábado      9:00 AM - 2:00 PM
  Domingo     Cerrado
  
  Footer: "● Abierto - Cierra a las 6:00 PM"
  ↓
Usuario cierra modal (click fuera o botón X)
```

---

### Flujo 12: Acceder a Mis Guardados

```
Usuario logueado
  ↓
Click en "🔔 Mis Guardados" (sidebar o menú)
  ↓
Navega a /guardados
  ↓
GET /api/favoritos?entityType=sucursal&pagina=1&limite=20
  ↓
Sistema carga:
  - Lista de sucursales seguidas
  - Calcula distancia desde ubicación actual
  - Muestra estado "Abierto/Cerrado" según horario
  ↓
Usuario ve grid de tarjetas:
  - 3 columnas (desktop)
  - 1 columna (móvil)
  ↓
Usuario hace scroll → paginación infinita
  - Al llegar al final → carga siguiente página
  ↓
Usuario puede:
  - Click en tarjeta → abre perfil
  - Click en 🔔 "Siguiendo" → quita de guardados
```

---

## 📊 Estado del Proyecto

**Fase 5.3:** ✅ 100% Completado (02/01/2026)

**Sub-fases:**
- ✅ 5.3 Negocios Directorio (02/01/2026)
- ✅ 5.3.1 Sistema Universal Compartir (02/01/2026)
- ✅ 5.3.2 Auth Opcional + ModalAuthRequerido (16/01/2026)
- ✅ 5.3.3 Sistema Guardados/Favoritos (17-18/01/2026)

**Componentes implementados:**
- ✅ Vista híbrida mapa + carrusel
- ✅ Sistema de filtros (8 filtros)
- ✅ PostGIS búsqueda geoespacial
- ✅ Sistema likes (tabla votos con tipo_accion='like')
- ✅ Sistema follows (tabla votos con tipo_accion='follow')
- ✅ Sistema de modos (campo votante_sucursal_id)
- ✅ Perfil completo con carruseles
- ✅ Reseñas verificadas con CardYA
- ✅ Sistema compartir universal
- ✅ Auth opcional (vista pública sin login)
- ✅ Página "Mis Guardados"
- ✅ Modales para ofertas, catálogo, reseñas, horarios

**Tiempo de implementación:**
- Fase 5.3: ~5 días
- Fase 5.3.3: ~6 horas (Sistema Guardados)

**Métricas:**
- 19 endpoints backend
- 1,009 líneas en negocios.service.ts
- 5 triggers SQL
- 2 tablas principales
- 1 tabla votos unificada

---

## 📚 Referencias

### Documentos relacionados en el proyecto:

- `AnunciaYA_-_RoadMap_29-01-2026.md` → Información completa de implementación
- `PostgreSQL_NegociosLocales.html` → Estructura de tablas
- `BACKEND_NEGOCIOS___VOTOS___MÉTRICAS.md` → Documentación técnica completa
- `Sistema_Universal_Compartir.md` → Sistema de compartir
- `Auth_Opcional_Sistema_Universal_de_Compartir.md` → Auth opcional
- `Sistema_Separacion_Por_Modo_AnunciaYA.md` → Sistema de modos

### Código fuente verificado:

**Backend:**
- `apps/api/src/routes/negocios.routes.ts` (19 endpoints)
- `apps/api/src/services/negocios.service.ts` (1,009 líneas)
- `apps/api/src/controllers/negocios.controller.ts`
- `apps/api/src/middleware/authOpcional.middleware.ts`
- `apps/api/src/middleware/negocio.middleware.ts`
- `apps/api/src/middleware/sucursal.middleware.ts`

**Frontend:**
- `apps/web/src/pages/public/negocios/`
- `apps/web/src/pages/private/guardados/`
- `apps/web/src/hooks/useGuardados.ts`
- `apps/web/src/services/negociosService.ts`

---

## ✅ Verificación

**Última verificación:** 30 Enero 2026

### Archivos Backend Verificados

| Archivo | Líneas | Endpoints/Funciones | Verificado |
|---------|--------|---------------------|------------|
| `negocios.routes.ts` | ~400 | 19 endpoints | ✅ |
| `negocios.service.ts` | 1,009 | 8 funciones principales | ✅ |
| `negocios.controller.ts` | ~600 | 19 funciones | ✅ |
| `votos.routes.ts` | ~100 | 4 endpoints | ✅ |
| `metricas.routes.ts` | ~150 | 6 endpoints | ✅ |

**Total líneas verificadas:** ~2,259 líneas de código TypeScript ✅

---

### Tablas de Base de Datos Verificadas

| Tabla | Campos | Índices | Triggers | Verificado |
|-------|--------|---------|----------|------------|
| `negocios` | 15 | 6 | 1 | ✅ |
| `negocio_sucursales` | 24 | 7 | 1 | ✅ |
| `votos` | 6 | 4 | 5 | ✅ |
| `metricas_entidad` | 11 | 2 | 0 | ✅ |

**Total campos verificados:** 56 campos ✅  
**Total índices:** 19 índices ✅  
**Total triggers:** 7 triggers ✅

---

### Endpoints Verificados

| Categoría | Cantidad | Verificado |
|-----------|----------|------------|
| Negocios (públicos) | 6 | ✅ |
| Negocios (privados) | 13 | ✅ |
| Votos | 4 | ✅ |
| Métricas | 6 | ✅ |
| Reseñas | 4 | ✅ |
| **TOTAL** | **33** | **✅** |

---

### Cambios Aplicados en v2.0

**Correcciones críticas (8):**
1. ✅ "SAVE" → "FOLLOW" (todo el documento)
2. ✅ "saved" → "followed" (respuestas JSON)
3. ✅ "totalSaves" → "totalFollows" (métricas)
4. ✅ Aclarado: NO existe tabla `guardados` separada
5. ✅ Agregada sección "Sistema de Votos - Arquitectura"
6. ✅ Agregada sección "Sistema de Modos (Personal vs Comercial)"
7. ✅ Agregada sección "API Endpoints" completa
8. ✅ Agregada sección "Middleware y Seguridad"

**Información agregada (5 secciones):**
9. ✅ Sección "Página Mis Guardados"
10. ✅ Endpoint GET /api/favoritos documentado
11. ✅ Campos `foto_perfil`, `zona_horaria`, `redes_sociales`
12. ✅ Diferencia `tiene_envio_domicilio` vs `tiene_servicio_domicilio`
13. ✅ Filtros avanzados (`subcategoriaIds`, `metodosPago`)

**Correcciones menores (12):**
14-25. ✅ Formato fechas, nombres exactos de middleware, estructura JSONB, etc.

---

### Cambios Aplicados en v2.2 (12 Febrero 2026)

**Actualización UI - Carrusel Vertical:**
1. ✅ Vista híbrida actualizada: Carrusel vertical (izquierda) + Mapa (derecha)
2. ✅ Carrusel ocupa ~30% ancho, Mapa ~70% ancho
3. ✅ Eliminado auto-scroll y flechas de navegación horizontal
4. ✅ Scroll vertical en carrusel de tarjetas
5. ✅ Tarjetas apiladas verticalmente con altura automática
6. ✅ Actualizado diagrama ASCII de la estructura
7. ✅ Actualizado comportamiento de sincronización mapa-tarjetas
8. ✅ Actualizado layout de botones en tarjetas (ChatYA + WhatsApp + Ver Perfil)

---

### Cambios Aplicados en v2.1 (12 Febrero 2026)

**Sistema de Reseñas Verificadas - IMPLEMENTADO:**
1. ✅ Backend completo: schema, service, controller, routes
2. ✅ 4 endpoints REST para reseñas
3. ✅ Validación de compra últimos 90 días
4. ✅ Métricas UPSERT automático (promedio + total)
5. ✅ Notificación Socket.io al dueño
6. ✅ Frontend: ModalEscribirResena + integración PaginaPerfilNegocio

**Sección completada al 100%:**
- ✅ ChatYA implementado en `PaginaPerfilNegocio` — botón abre ChatOverlay con contexto del negocio

---

**Última actualización:** 7 Abril 2026  
**Autor:** Equipo AnunciaYA  
**Versión:** 2.3 (ChatYA integrado en perfil de negocio)

**Progreso:** Fase 5.3 completada (100%) + Reseñas implementadas + UI actualizada + ChatYA integrado