# CLAUDE.md — AnunciaYA v3.0

> Claude Code debe leer este archivo al inicio de cada sesión.
> ⚠️ IDIOMA OBLIGATORIO: TODO en español — respuestas, razonamiento interno (thinking/extended thinking), análisis y comentarios. NUNCA pensar en inglés.

IMPORTANTE: Piensa y razona en español, no en inglés.

---

## Qué es AnunciaYA

Super-app para comercio local en México. Conecta negocios físicos con consumidores a través de un ecosistema de lealtad/puntos. Solo developer: Juan.

**Estado:** En desarrollo activo. Lanzamiento beta proyectado: Abril-Mayo 2026.

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind v4 + Zustand + TanStack Query v5
- **Backend:** Express 5 + Node >=18 + Socket.io
- **BD:** PostgreSQL + PostGIS (Supabase, 1 schema público, ~71 tablas) + Redis (Upstash, via ioredis)
- **Archivos:** Cloudinary + Cloudflare R2
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

**5 Públicas:** Negocios ✅, MarketPlace 🚧, Ofertas 🚧, Dinámicas 🚧, Empleos 🚧
**3 Secundarias:** CardYA ✅, ChatYA ✅ (componente flotante, sin ruta dedicada), Perfil ✅
**3 Comerciales:** Business Studio ✅, ScanYA ✅, Onboarding ✅

> 🚧 = Ruta existe en el router pero está como placeholder (sin implementar)

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

- `docs/estandares/TOKENS_GLOBALES.md` — 12 reglas globales obligatorias (texto, tonos, pesos, iconos, bordes, sombras, colores, z-index, transiciones)
- `docs/estandares/TOKENS_COMPONENTES.md` — 22 patrones de componentes (toggles, dropdowns, modales, tablas, cards, chips, drawers, carousels, listas, rounded, swipe)
- `docs/estandares/Guia_Responsive_Laptop_AnunciaYA.md` — tablas completas del patrón `base lg:laptop 2xl:desktop`

Consultar antes de modificar UI. Breakpoints: solo `lg:` y `2xl:`. SIEMPRE incluir `2xl:` — sin él, laptop afecta a PC.

---

## Documentación

```
docs/
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
│   ├── Guardados.md
│   └── Clientes_Transacciones.md
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
Scopes: `api`, `web`, `shared`, `chatya`, `auth`, `pagos`, `puntos`, `cardya`, `negocios`, `dashboard`, `scanya`, `docs`

---

## Estado Actual del Proyecto

### En Progreso

- **ChatYA** ✅ 100% — Sprint 7 completado (20 Mar 2026). 41 API tests + 10 E2E tests
- **Promociones** ✅ 100% — Ofertas + Cupones unificados (22 Mar 2026). 35 API tests + 7 E2E tests
- **Mis Cupones** ✅ 100% — Vista cliente con cards + modal revelar código (22 Mar 2026)
- **Business Studio** (71%) — 10/14 módulos completados
- **Migración React Query** ✅ completa — BS (10/10): Dashboard, Transacciones, Clientes, Opiniones, Alertas, Catálogo, Promociones, Puntos, Empleados, Mi Perfil. Públicas (4/4): Negocios, CardYA, Mis Cupones, Mis Guardados. Pendientes: ChatYA, ScanYA, Onboarding (evaluar caso por caso)

### BS Módulos Completados (10/14)

Dashboard ✅, Mi Perfil ✅, Catálogo ✅, Promociones ✅ (Ofertas + Cupones), Puntos ✅, Transacciones ✅, Clientes ✅, Opiniones ✅, Alertas ✅, Empleados ✅

### BS Módulos Pendientes (4/14)

Reportes, Sucursales, Rifas (bloqueado), Vacantes (bloqueado)

### Siguiente Sprint

BS Reportes

---

## Lecciones Técnicas

Ver `docs/estandares/LECCIONES_TECNICAS.md` — consultar antes de trabajar en áreas que ya tuvieron bugs o descubrimientos.
