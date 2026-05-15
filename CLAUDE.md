# CLAUDE.md — AnunciaYA v3.0

> **Lectura obligatoria al inicio de cada sesión:**
> 1. Este archivo (`CLAUDE.md`) — cómo trabajar en el código.
> 2. `docs/VISION_ESTRATEGICA_AnunciaYA.md` — qué construir (norte estratégico, secciones definitivas).
>
> ⚠️ IDIOMA OBLIGATORIO: TODO en español — respuestas, razonamiento interno (thinking/extended thinking), análisis y comentarios. NUNCA pensar en inglés.

IMPORTANTE: Piensa y razona en español, no en inglés.

---

## Qué es AnunciaYA

App de **comercio local hiperlocal** para la ciudad seleccionada. El usuario la abre cuando piensa *"necesito comprar / contratar / encontrar algo cerca de mí"*. **NO es una red social** — no compite con Facebook/TikTok/Instagram en feed social, contenido viral, likes ni posts.

Las piezas únicas que la diferencian: **CardYA, ScanYA, ChatYA, geolocalización y onboarding verificado de negocios** — cubren lo que Facebook hace mal en comercio local (saber si un negocio está abierto, filtrar por proximidad real, precios y disponibilidad, reseñas confiables, contacto directo cliente-negocio).

**Modelo de negocio:** negocios pagan suscripción comercial $449 MXN/mes (Business Studio + ScanYA + presencia premium). Usuarios usan la app gratis. Sin publicidad invasiva ni venta de datos.

**Beta inicial:** Puerto Peñasco, Sonora — 50 negocios piloto.

**Solo developer:** Juan.

**Estado:** En desarrollo activo. Lanzamiento beta proyectado: Mayo-Junio 2026.

> Filosofía completa y secciones definitivas: `docs/VISION_ESTRATEGICA_AnunciaYA.md`.

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind v4 + Zustand + TanStack Query v5
- **Backend:** Express 5 + Node >=18 + Socket.io
- **BD:** PostgreSQL + PostGIS (Supabase, 1 schema público, ~71 tablas) + Redis (Upstash, via ioredis)
- **Archivos:** Cloudflare R2
- **Hosting:** Render (backend) + Vercel (frontend) + Supabase (BD) + Upstash (Redis)
- **ORM:** Drizzle ORM + Zod (validación runtime)
- **Pagos:** Stripe — suscripción comercial $449 MXN/mes

---

## Estructura del Monorepo

```
anunciaya/
├── apps/
│   ├── api/src/           → Backend Express + TypeScript
│   │   ├── config/        → env.ts (Zod schema)
│   │   ├── controllers/   → Solo llaman services
│   │   ├── db/            → Drizzle, Redis
│   │   ├── middleware/     → auth, negocio, sucursal, rateLimiter, cors, helmet, authOpcional, scanyaAuth, errorHandler
│   │   ├── routes/        → Endpoints
│   │   ├── services/      → Lógica de negocio centralizada
│   │   ├── types/         → Interfaces TypeScript
│   │   ├── utils/         → jwt, email, tokenStore
│   │   ├── validations/   → Schemas Zod
│   │   └── cron/          → Jobs programados
│   │
│   └── web/src/           → Frontend React + Vite
│       ├── components/    → UI compartida, chatya, layout, negocios, scanya
│       ├── config/        → Configuración frontend
│       ├── data/          → Datos estáticos
│       ├── hooks/         → Custom hooks
│       ├── locales/       → Internacionalización
│       ├── pages/         → public/ y private/
│       ├── router/        → React Router
│       ├── services/      → API calls (Axios)
│       ├── stores/        → Zustand stores
│       ├── types/         → Interfaces frontend
│       └── utils/         → Helpers
│
├── packages/shared/       → Tipos y schemas compartidos
├── docs/                  → Documentación (ver sección Documentación)
└── CLAUDE.md              → Este archivo
```

---

## Secciones de la App

**4 Públicas:** Negocios ✅, MarketPlace 🚧, Ofertas 🚧, Servicios 🚧
**Home:** Pregúntale a Peñasco 🚧 (feed conversacional + buscador hiperlocal, ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4)
**3 Secundarias:** CardYA ✅, ChatYA ✅ (componente flotante, sin ruta dedicada), Perfil ✅
**3 Comerciales:** Business Studio ✅, ScanYA ✅, Onboarding ✅
**Administración del Sistema:** Panel Admin 🚧 (infraestructura backend lista, UI pendiente)

> 🚧 = Ruta existe en el router pero está como placeholder (sin implementar) — o bien, sección decidida en visión estratégica pero aún sin construir.

> **Servicios** cubre servicios e intangibles con dos modos (Ofrezco / Solicito), incluye empleos. Ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §3.2.

> **Panel Admin ≠ Business Studio**: el Panel Admin es para el equipo interno de AnunciaYA **+ vendedores/embajadores externos** que venden membresías a comerciantes. Cross-negocio: aprobar/suspender negocios, mantenimiento, reportes globales, gestión de ventas y comisiones. BS es para dueños de UN negocio. Panel Admin tiene múltiples roles (admin, vendedor) con permisos distintos. Convención de carpetas: `controllers/admin/`, `services/admin/`, `routes/admin/` con `index.ts` agregador. Ver `docs/arquitectura/Panel_Admin.md`.

---

## Patrones de Arquitectura

### Backend: Controllers → Services

Controllers solo llaman services. NUNCA poner lógica de negocio en controllers.

```typescript
// ✅ Correcto
export const crearArticuloController = async (req, res) => {
  const resultado = await articulosService.crear(req.body);
  res.json(resultado);
};

// ❌ Incorrecto — lógica en controller
export const crearArticuloController = async (req, res) => {
  const articulo = await db.insert(articulos).values(req.body);
  res.json(articulo);
};
```

### Servicio Centralizado: negocioManagement.service.ts

20 funciones CRUD compartidas entre Onboarding y Business Studio. Onboarding y BS DEBEN usar este service. Nunca duplicar lógica entre módulos.

### Cadena de Middlewares

```typescript
router.post('/articulos',
  verificarToken,           // 1. Usuario autenticado
  verificarNegocio,         // 2. Tiene negocio
  validarAccesoSucursal,    // 3. Acceso a sucursal
  crearArticuloController   // 4. Lógica
);
```

### Interceptor Axios (frontend)

`api.ts` agrega `?sucursalId=` automáticamente en modo comercial. Frontend NO pasa sucursalId manual. Backend filtra con `WHERE sucursal_id = $sucursalId`.

### Gestión de Archivos (R2)

Los archivos (imágenes, audios, documentos) viven en Cloudflare R2. El proyecto tiene un **Recolector de Basura** operativo en `/api/admin/mantenimiento/r2-reconcile` que detecta y limpia archivos huérfanos usando mark-and-sweep + reference counting + multi-BD cross-ambiente.

**Reglas obligatorias cuando tu código borre o reemplace un archivo R2:**

1. **Usar el helper `eliminarImagenSiHuerfana(url, excluirId?)`** de `negocioManagement.service.ts` en lugar de `eliminarArchivo(url)` directo. El helper verifica reference count contra las tablas relevantes (sucursales, artículos, negocios, galería, ofertas, recompensas) antes de tocar storage.
2. **Agregar cualquier columna nueva con URL de imagen al `IMAGE_REGISTRY`** en `apps/api/src/utils/imageRegistry.ts`. Si no está ahí, el Recolector la tratará como huérfana y podría borrar archivos en uso.
3. **Soft-deletes que sobrescriban campos con URLs** (ej. chat): capturar URLs antes del UPDATE y limpiar storage después con reference count.

Ver detalle completo: `docs/arquitectura/Mantenimiento_R2.md` y `docs/arquitectura/Panel_Admin.md`.

### Multi-Sucursal

- Dueño (`sucursalAsignada=null`) puede cambiar entre sucursales
- Gerente (`sucursalAsignada=UUID`) tiene sucursal fija
- Cambiar sucursal = toda la app recarga con datos de esa sucursal

### Middleware snake_case → camelCase

Drizzle `casing: 'snake_case'` solo funciona para writes. Hay middleware global Express para transformar responses de snake_case a camelCase.

### React Query + Zustand — Separación de estado

**Regla fundamental:** estado de servidor va en React Query, estado de UI va en Zustand. NUNCA mezclar.

- **React Query** → KPIs, historial, listas, cualquier dato que viene de la API
- **Zustand** → tab activo, filtros seleccionados, dropdowns abiertos, cualquier estado visual

Configuración global en `apps/web/src/config/queryClient.ts` (staleTime 2min, gcTime 10min).
Query keys centralizadas en `apps/web/src/config/queryKeys.ts`.
Hooks por módulo en `apps/web/src/hooks/queries/`.

**Regla obligatoria:** toda query con filtros variables DEBE incluir `placeholderData: keepPreviousData` para evitar temblor visual al filtrar.

Ver guía completa: `docs/estandares/PATRON_REACT_QUERY.md`

---

## Convenciones de Código

### Nombres en Español

Variables, funciones, componentes, interfaces — todo en español. Solo inglés para keywords de TypeScript, paquetes npm, métodos HTTP.

```typescript
// ✅ Correcto
const usuarioActivo = useAuthStore(s => s.usuario);
function calcularPuntosExpirados() { ... }
interface DatosCliente { ... }

// ❌ Incorrecto
const activeUser = useAuthStore(s => s.usuario);
function calculateExpiredPoints() { ... }
```

### TypeScript: NUNCA `any`

Siempre tipar con interfaces, types, o `unknown`. Ver `docs/estandares/REGLAS_ESTILO_CODIGO.md`.

### Tailwind v4

- Gradientes: `bg-linear-to-*` (NO `bg-gradient-to-*`)
  > ⚠️ Legado: `BrandingColumn.tsx` aún usa `bg-gradient-to-*` — pendiente de migrar
- Flexbox: `shrink-0` (NO `flex-shrink-0`)
- Breakpoints: solo `lg:` (1024px) y `2xl:` (1536px). NO usar `sm:`, `md:`, `xl:` en código nuevo
  > ⚠️ Legado: `PaginaLanding.tsx`, `Modal.tsx`, `Input.tsx`, `Boton.tsx` y otros usan `sm:`/`md:` — pendientes de migrar

### Notificaciones

Sistema custom en `apps/web/src/utils/notificaciones.tsx`. Métodos disponibles:
- `notificar.exito('mensaje')` — toast verde de confirmación
- `notificar.error('mensaje')` — toast rojo de error
- `notificar.info('mensaje')` — toast azul informativo
- `notificar.advertencia('mensaje')` — toast amarillo de advertencia

NO usar SweetAlert2 directo en componentes nuevos. Siempre usar `notificar.*`.

### ESLint

- Catch sin usar error: `catch { ... }` (no `catch (err)`)
- Variables no usadas: eliminar completamente
- `delete obj[key]` preferido sobre destructuring con `_`

### Testing — `data-testid` obligatorio

Todo componente interactivo DEBE incluir `data-testid` desde su creación. Esto permite E2E testing con Playwright sin depender de clases CSS o texto.

```tsx
// ✅ Correcto — testeable desde el inicio
<button data-testid="btn-guardar" onClick={guardar}>Guardar</button>
<input data-testid="input-nombre" placeholder="Nombre" />
<div data-testid={`item-${id}`} onClick={seleccionar}>...</div>

// ❌ Incorrecto — no testeable
<button onClick={guardar}>Guardar</button>
```

**Convención de nombres:** `data-testid="contexto-elemento"` o `data-testid="contexto-${id}"`.
Ejemplos: `chat-input`, `chat-enviar`, `conversacion-${id}`, `mensaje-${id}`, `menu-editar`.

**Infraestructura existente:**
- API tests: `apps/api/src/__tests__/` con Vitest (`cd apps/api && pnpm test`)
- E2E tests: `apps/web/e2e/` con Playwright (`cd apps/web && pnpm test:e2e`)
- Detalle completo: `docs/estandares/REGLAS_TESTING.md`
- Helpers reutilizables: tokens JWT, usuarios de prueba, HTTP requests

---

## Sistema de Diseño — Tokens

- `docs/estandares/TOKENS_GLOBALES.md` — 13 reglas globales obligatorias (texto, tonos, pesos, iconos, bordes, sombras, colores, z-index, transiciones, **estética profesional vs caricaturesca**)
  - ⚠️ **Regla 13 — Estética Profesional vs Caricaturesca:** AnunciaYA es herramienta B2B (Linear, Stripe, Notion). NO generar diseños tipo videojuego: nada de iconos en círculos pastel, emojis como datos (🥉🥈🥇), saltos tipográficos exagerados, bordes ≥2px, colores pastel saturados. Usar listas densas inline, iconos 14–16px sin círculo, jerarquía por peso (no tamaño), color neutro + 1 acento. Variantes móvil/desktop explícitas cuando el contenedor padre tenga fondos distintos por breakpoint (ej: glass translúcido sobre azul oscuro en móvil, card blanca sobre slate-100 en desktop).
- `docs/estandares/TOKENS_COMPONENTES.md` — 22 patrones de componentes (toggles, dropdowns, modales, tablas, cards, chips, drawers, carousels, listas, rounded, swipe)
- `docs/estandares/Guia_Responsive_Laptop_AnunciaYA.md` — tablas completas del patrón `base lg:laptop 2xl:desktop`
- `docs/estandares/SISTEMA_ICONOS.md` — íconos semánticos centralizados en `apps/web/src/config/iconos.ts` (Iconify) + utilitarios con lucide

Consultar antes de modificar UI. Breakpoints: solo `lg:` y `2xl:`. SIEMPRE incluir `2xl:` — sin él, laptop afecta a PC.

**Íconos:** Los íconos con "personalidad de marca" (Guardar, Like, Rating, Ubicación, etc. — 27 conceptos) viven en `apps/web/src/config/iconos.ts`. Cambiar un ícono en TODA la app = editar 1 línea ahí. Utilitarios (X, Check, Chevron, Loader) siguen con `lucide-react` directo. Ver `docs/estandares/SISTEMA_ICONOS.md`.

---

## Documentación

```
docs/
├── VISION_ESTRATEGICA_AnunciaYA.md → Norte estratégico: filosofía y secciones definitivas (LEER antes de proponer features)
├── CHANGELOG.md                → Historial de cambios
├── ROADMAP.md                  → Plan y progreso
├── estandares/                 → Reglas obligatorias
│   ├── TOKENS_GLOBALES.md
│   ├── TOKENS_COMPONENTES.md
│   ├── Guia_Responsive_Laptop_AnunciaYA.md
│   ├── REGLAS_ESTILO_CODIGO.md
│   ├── REGLAS_MANEJO_ARCHIVOS.md
│   ├── REGLAS_TESTING.md
│   ├── Criterios_de_Uso_de_Modales.md
│   ├── Patron_Scroll_Lateral.md
│   ├── Sistema_Transformacion_snake_camelCase.md
│   ├── PATRON_REACT_QUERY.md      ← estándar para datos del servidor
│   ├── PATRON_BUSCADOR_SECCION.md ← buscadores con overlay por sección (MP, Ofertas, Negocios)
│   ├── Sistema_Navegacion_Back.md ← hooks de back/regresar y jerarquía de navegación
│   ├── SISTEMA_ICONOS.md          ← íconos semánticos (Iconify) + utilitarios (lucide)
│   └── LECCIONES_TECNICAS.md
├── arquitectura/               → Referencia técnica por módulo
│   ├── Sistema.md
│   ├── Base_de_Datos.md
│   ├── Autenticacion.md
│   ├── Business_Studio.md
│   ├── CardYA.md
│   ├── ChatYA.md
│   ├── Negocios.md
│   ├── Onboarding.md
│   ├── ScanYA.md
│   ├── Sucursales.md
│   ├── Empleados.md
│   ├── Promociones.md
│   ├── Notificaciones.md       ← backend (Socket.io + BD)
│   ├── PanelNotificaciones.md  ← componente UI (popover desktop + side sheet móvil)
│   ├── Alertas.md
│   ├── Reportes.md
│   ├── Clientes_Transacciones.md
│   ├── Guardados.md
│   ├── MenuDrawer.md           ← drawer de perfil del usuario (desktop + móvil) + adaptaciones del handoff
│   ├── Panel_Admin.md          ← infraestructura admin del sistema
│   └── Mantenimiento_R2.md     ← reconcile de imágenes huérfanas (sub-sección Mantenimiento del Panel Admin)
├── migraciones/                → SQL one-shot que debe ejecutarse manualmente (ej. tabla r2_reconcile_log)
├── legacy/                     → Documentos históricos
└── reportes/                   → Reportes de auditorías UX y tokens por módulo
```

**Regla:** Antes de trabajar en un módulo, leer su documento de arquitectura y los estándares que apliquen.

---

## Reglas de Trabajo

### 1. Paso a Paso

No adelantarse. Guiar paso por paso, confirmando antes de proceder.

### 2. Archivos >100 líneas

SIEMPRE preguntar si el archivo ya existe antes de generar. Si existe → pedir archivo actual y usar `str_replace`. Ver `docs/estandares/REGLAS_MANEJO_ARCHIVOS.md`.

### 3. str_replace Primero

Mínimo 3 intentos de str_replace antes de considerar reescribir. Preservar código existente al máximo.

### 4. No Inventar

- NO crear archivos no solicitados
- NO borrar código de archivos compartidos
- NO proponer rutas o nombres sin confirmar primero
- **Antes de proponer un feature nuevo, validar contra los principios de `docs/VISION_ESTRATEGICA_AnunciaYA.md`.** Si dudas si algo cabe en la visión, pregunta antes de implementar.

### 5. Verificación

Al terminar cualquier tarea, hacer un segundo pase de verificación: buscar si quedó alguna violación sin corregir y reportarla.

### 6. Tokens de Diseño

Antes de modificar UI, leer `docs/estandares/TOKENS_GLOBALES.md`. Para componentes específicos, consultar también `docs/estandares/TOKENS_COMPONENTES.md`. Aplicar las reglas globales a todo código que se toque.

Cuando durante una conversación se defina o modifique un patrón visual (tamaños, colores, rounded, animaciones, comportamientos), **recordar al usuario** que se debe actualizar la documentación de tokens antes de terminar.

### 7. Igualar Patrones Existentes

Antes de implementar UI, paginación, caché, o cualquier patrón nuevo, **revisar cómo está implementado en los otros módulos del mismo contexto** (BS, ScanYA, etc.) e igualar. No inventar patrones propios si ya existe uno establecido.

Para datos del servidor, el patrón establecido es React Query — ver `docs/estandares/PATRON_REACT_QUERY.md` y tomar como referencia `hooks/queries/useDashboard.ts` y `hooks/queries/useTransacciones.ts`.

### 7.1 Actualizar Documentación tras Migrar

Al terminar la migración de cualquier módulo o sección (ej: migrar de Zustand+caché manual a React Query), **actualizar inmediatamente el documento de arquitectura correspondiente** en `docs/arquitectura/`. Específicamente:

- Reemplazar diagramas o descripciones que muestren el patrón anterior
- Actualizar la tabla de archivos (agregar hooks nuevos, describir stores reducidos)
- Actualizar secciones de "Caché" o "Estado" para reflejar React Query
- Actualizar checklist de implementación si existe
- Actualizar la fecha y versión del documento

### 8. Testing con Datos Reales

Para probar funcionalidad nueva, crear datos reales en la BD que detonen la funcionalidad (no insertar resultados manualmente). Las pruebas deben validar el flujo completo: dato real → lógica → resultado.

### 9. Ritmo del Usuario

No apurarse al siguiente paso ni preguntar "¿hacemos commit?" después de cada cambio. El usuario lleva el ritmo y decide cuándo avanzar.

### 10. UX desde Perspectiva del Comerciante

Cuestionar textos, botones y flujos pensando como el usuario final. Si un texto puede confundir (ej: "Resolver" suena a que el sistema lo resuelve solo), proponer alternativas claras.

### 11. Commits

Formato: `tipo(scope): descripción en español`

Tipos: `feat`, `fix`, `chore`, `ci`, `test`, `docs`
Scopes: `api`, `web`, `shared`, `chatya`, `auth`, `pagos`, `puntos`, `cardya`, `negocios`, `dashboard`, `scanya`, `marketplace`, `servicios`, `ofertas`, `home`, `admin`, `docs`

**Rama de destino:** todo `commit + push` va SIEMPRE a `main`. No usar feature branches ni PRs intermedios — Juan trabaja directo sobre main porque es solo developer y necesita que Vercel/Render redeployeen automático con cada cambio. Si estás en un worktree con otra rama (ej. `claude/...-...`), antes de pushear hay que mergear/rebasear sobre main y subir a `origin/main`.

---

## Estado Actual del Proyecto

### En Progreso

- **ChatYA** ✅ 100% — Sprint 7 completado (20 Mar 2026). 41 API tests + 10 E2E tests
- **Promociones** ✅ 100% — Ofertas + Cupones unificados (22 Mar 2026). 35 API tests + 7 E2E tests
- **Mis Cupones** ✅ 100% — Vista cliente con cards + modal revelar código (22 Mar 2026)
- **Business Studio** (92%) — 12/13 módulos completados
- **React Query** activo en BS (12/12: Dashboard, Transacciones, Clientes, Opiniones, Alertas, Catálogo, Promociones, Puntos, Empleados, Mi Perfil, Reportes, Sucursales) y públicas (4/4: Negocios, CardYA, Mis Cupones, Mis Guardados). Vacantes nace con React Query. ChatYA, ScanYA, Onboarding: evaluar caso por caso.

### BS Módulos Completados (12/13)

Dashboard ✅, Mi Perfil ✅, Catálogo ✅, Promociones ✅ (Ofertas + Cupones), Puntos ✅, Transacciones ✅, Clientes ✅, Opiniones ✅, Alertas ✅, Empleados ✅, Reportes ✅, Sucursales ✅

### BS Módulos Pendientes (1/13)

**Vacantes 🚧** — herramienta del comerciante para publicar ofertas de servicio/empleo en la sección pública Servicios.

### Siguiente Sprint

Secciones Públicas (Ofertas, MarketPlace, Servicios) y Home con Pregúntale a Peñasco. Panel Admin sigue como opción alternativa post-públicas.

---

## Lecciones Técnicas

Ver `docs/estandares/LECCIONES_TECNICAS.md` — consultar antes de trabajar en áreas que ya tuvieron bugs o descubrimientos.
