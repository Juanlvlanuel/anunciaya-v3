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

- **Frontend:** React 19 + Vite + Tailwind v4 + Zustand
- **Backend:** Express 5 + Node >=18 + Socket.io
- **BD:** PostgreSQL + PostGIS (Supabase, 1 schema público, ~71 tablas) + Redis (Upstash, via ioredis)
- **Archivos:** Cloudinary + Cloudflare R2
- **Hosting:** Render (backend) + Vercel (frontend) + Supabase (BD) + Upstash (Redis)
- **ORM:** Drizzle ORM + Zod (validación runtime)

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

Sistema custom: `notificar.exito()`, `notificar.error()`. NO SweetAlert2 directo en componentes nuevos.

### ESLint

- Catch sin usar error: `catch { ... }` (no `catch (err)`)
- Variables no usadas: eliminar completamente
- `delete obj[key]` preferido sobre destructuring con `_`

---

## Sistema de Diseño — Tokens

**Documento:** `docs/estandares/SISTEMA_TOKENS_DISENO.md`

### Tamaños Mínimos de Texto

| Dispositivo | Breakpoint | Mínimo |
|-------------|------------|--------|
| Móvil | base | `text-sm` (14px) |
| Laptop | lg: | `text-[11px]` (11px) |
| Desktop | 2xl: | `text-sm` (14px) |

Excepción: contadores en badges circulares ("9+").

### Tonos — Nada Pálido

- Texto mínimo: `text-slate-600`
- Bordes mínimo: `border-slate-300`
- Hovers mínimo: variante `-100` (nunca `-50`)

### Pesos Tipográficos

Mínimo: `font-medium` (500). Prohibidos: `font-normal`, `font-light`, `font-thin`.

### Iconos Mínimos

Items de lista: `w-4 h-4` (icono) / `w-7 h-7` (cuadro). Laptop puede reducir pero nunca por debajo del mínimo.

### Responsive — Patrón de 3 niveles

```
base lg:laptop 2xl:desktop
```

Laptop reduce ~30% vs móvil. Desktop restaura valores originales. SIEMPRE incluir `2xl:` — sin él, laptop afecta a PC.

Ver `docs/estandares/Guia_Responsive_Laptop_AnunciaYA.md` para tablas completas.

---

## Documentación

```
docs/
├── CHANGELOG.md                → Historial de cambios
├── ROADMAP.md                  → Plan y progreso
├── estandares/                 → Reglas obligatorias
│   ├── SISTEMA_TOKENS_DISENO.md
│   ├── Guia_Responsive_Laptop_AnunciaYA.md
│   ├── REGLAS_ESTILO_CODIGO.md
│   ├── REGLAS_MANEJO_ARCHIVOS.md
│   ├── Criterios_de_Uso_de_Modales.md
│   ├── Patron_Scroll_Lateral.md
│   └── Sistema_Transformacion_snake_camelCase.md
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
└── legacy/                     → Documentos históricos
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

Antes de modificar UI, leer `docs/estandares/SISTEMA_TOKENS_DISENO.md`. Aplicar las 7 reglas validadas a todo código que se toque.

### 7. Commits

Formato: `tipo(scope): descripción en español`

Tipos: `feat`, `fix`, `chore`, `ci`, `test`, `docs`
Scopes: `api`, `web`, `shared`, `chatya`, `auth`, `pagos`, `puntos`, `cardya`, `negocios`, `dashboard`, `scanya`, `docs`

---

## Estado Actual del Proyecto

### En Progreso

- **ChatYA Sprint 7** (96%) — Falta: Open Graph previews + E2E testing
- **Business Studio** (53%) — 8/15 módulos completados

### BS Módulos Completados (8/15)

Dashboard ✅, Mi Perfil ✅, Catálogo ✅, Ofertas ✅, Puntos ✅, Transacciones ✅, Clientes ✅, Opiniones ✅

### BS Módulos Pendientes (7/15)

Alertas, Cupones, Empleados, Reportes, Sucursales, Rifas (bloqueado), Vacantes (bloqueado)

### Siguiente Sprint

BS Alertas + Cupones

---

## Lecciones Técnicas Importantes

- Zod runtime validation es independiente de TypeScript compile-time — campos faltantes en schema Zod se eliminan silenciosamente
- Leaflet crea su propio stacking context — requiere `z-[1000]` para overlays sobre mapas
- `translate-y` mueve elementos visualmente sin afectar box model (vs `margin-top` que infla contenedor)
- Para ChatYA a escala: cursor-based pagination > offset-based; endpoint "jump to message" es prioridad alta
- Negocios solo físicos — eliminado tipo "Online". Todos requieren ubicación. `tiene_servicio_domicilio` y `tiene_envio_domicilio` en sucursales
- Login obligatorio — sin login solo accesible: landing, registro, login, OAuth
- Scroll reset al navegar: `MainLayout` usa `<main>` con `overflow-y-auto` (no `window`). El scroll se resetea con `useLayoutEffect` en `RootLayout` usando `document.querySelectorAll('main').forEach(el => el.scrollTo(0, 0))`. Usar `useLayoutEffect` (no `useEffect`) para evitar flash visual
- `useState(false)` para detección móvil causa flash de vista desktop en primer render. Usar `useState(() => window.innerWidth < 1024)` como lazy initializer
