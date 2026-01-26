# 📁 AnunciaYA v3.0 - Estructura de Carpetas

**Última Actualización:** 26 Diciembre 2024  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Visión General del Monorepo](#visión-general-del-monorepo)
2. [Estructura Raíz](#estructura-raíz)
3. [Backend (apps/api)](#backend-appsapi)
4. [Frontend (apps/web)](#frontend-appsweb)
5. [Paquetes Compartidos](#paquetes-compartidos)
6. [Archivos de Configuración](#archivos-de-configuración)
7. [Convenciones de Nombres](#convenciones-de-nombres)

---

## Visión General del Monorepo

AnunciaYA usa una arquitectura **monorepo** con **pnpm workspaces**:

```
anunciaya/
├── apps/                    # Aplicaciones
│   ├── api/                 # Backend (Express + TypeScript)
│   └── web/                 # Frontend (React + Vite)
├── packages/                # Paquetes compartidos
│   └── shared/              # Tipos, schemas, utilidades comunes
└── [archivos raíz]          # Configuración global
```

### Ventajas del Monorepo

| Ventaja | Descripción |
|---------|-------------|
| **Código compartido** | Tipos y schemas en un solo lugar |
| **Dependencias unificadas** | Una sola instalación con pnpm |
| **Desarrollo sincronizado** | Frontend y backend en el mismo repo |
| **Versionado conjunto** | Un solo historial de Git |

---

## Estructura Raíz

```
anunciaya/
├── .vscode/                 # Configuración VS Code
│   └── tasks.json           # Tareas de desarrollo
├── apps/                    # Aplicaciones principales
│   ├── api/                 # Backend
│   └── web/                 # Frontend
├── packages/                # Paquetes compartidos
│   └── shared/              # Código compartido
├── .env                     # Variables de entorno globales
├── .gitignore               # Archivos ignorados por Git
├── .prettierrc              # Configuración Prettier
├── .prettierignore          # Archivos ignorados por Prettier
├── docker-compose.yml       # Docker para desarrollo local
├── eslint.config.js         # Configuración ESLint
├── package.json             # Package principal del monorepo
├── pnpm-lock.yaml           # Lock file de pnpm
├── pnpm-workspace.yaml      # Configuración workspaces
└── tsconfig.base.json       # TypeScript base compartido
```

### Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `pnpm-workspace.yaml` | Define los workspaces (apps/*, packages/*) |
| `tsconfig.base.json` | Configuración TypeScript heredada por todos |
| `docker-compose.yml` | PostgreSQL + Redis para desarrollo local |
| `.env` | Variables globales (copiadas a cada app) |

---

## Backend (apps/api)

```
apps/api/
├── src/
│   ├── config/              # Configuraciones de servicios
│   │   ├── cloudinary.ts    # Configuración Cloudinary
│   │   ├── env.ts           # Variables de entorno tipadas
│   │   └── stripe.ts        # Configuración Stripe
│   │
│   ├── controllers/         # Controladores (lógica de endpoints)
│   │   ├── auth.controller.ts
│   │   ├── categorias.controller.ts
│   │   ├── cloudinary.controller.ts
│   │   ├── negocios.controller.ts
│   │   ├── onboarding.controller.ts
│   │   └── pago.controller.ts
│   │
│   ├── db/                  # Base de datos
│   │   ├── models/          # Modelos MongoDB (Mongoose)
│   │   │   ├── Chat.ts
│   │   │   ├── Contacto.ts
│   │   │   ├── Index.ts
│   │   │   ├── Interaccion.ts
│   │   │   ├── Mensaje.ts
│   │   │   └── PhoneOtp.ts
│   │   ├── schemas/         # Schemas PostgreSQL (Drizzle)
│   │   │   ├── meta/        # Metadata de migraciones
│   │   │   ├── relations.ts # Relaciones entre tablas
│   │   │   └── schema.ts    # Definición de tablas
│   │   ├── index.ts         # Conexión PostgreSQL
│   │   ├── mongo.ts         # Conexión MongoDB
│   │   └── redis.ts         # Conexión Redis
│   │
│   ├── middleware/          # Middlewares
│   │   ├── auth.ts          # Verificación JWT
│   │   ├── cors.ts          # Configuración CORS
│   │   ├── errorHandler.ts  # Manejo global de errores
│   │   ├── helmet.ts        # Headers de seguridad
│   │   ├── index.ts         # Export de middlewares
│   │   ├── negocio.middleware.ts  # Verificar propiedad negocio
│   │   ├── rateLimiter.ts   # Límite de requests
│   │   └── validarModo.ts   # Validar modo Personal/Comercial
│   │
│   ├── routes/              # Definición de rutas
│   │   ├── auth.routes.ts
│   │   ├── categorias.routes.ts
│   │   ├── cloudinary.routes.ts
│   │   ├── index.ts         # Registro de todas las rutas
│   │   ├── negocios.routes.ts
│   │   ├── onboarding.routes.ts
│   │   └── pago.routes.ts
│   │
│   ├── services/            # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── categorias.service.ts
│   │   ├── cloudinary.service.ts
│   │   ├── negocios.service.ts
│   │   ├── onboarding.service.ts
│   │   └── pago.service.ts
│   │
│   ├── utils/               # Utilidades
│   │   ├── email.ts         # Envío de emails
│   │   ├── jwt.ts           # Generación/verificación JWT
│   │   └── tokenStore.ts    # Almacén de tokens
│   │
│   ├── validations/         # Schemas de validación (Zod)
│   │   ├── auth.schema.ts
│   │   └── onboarding.schema.ts
│   │
│   ├── app.ts               # Configuración de Express
│   └── index.ts             # Punto de entrada
│
├── .env                     # Variables de entorno
├── drizzle.config.ts        # Configuración Drizzle ORM
├── package.json             # Dependencias del backend
└── tsconfig.json            # TypeScript config
```

### Flujo de una Request

```
Request HTTP
    ↓
routes/          → Define endpoint y método
    ↓
middleware/      → Auth, validación, rate limit
    ↓
controllers/     → Recibe request, llama service
    ↓
services/        → Lógica de negocio, acceso a BD
    ↓
db/              → Queries a PostgreSQL/MongoDB
    ↓
Response HTTP
```

---

## Frontend (apps/web)

```
apps/web/
├── public/                  # Archivos estáticos
│   ├── images/
│   │   ├── onboarding/      # Imágenes del wizard
│   │   │   ├── comunidad.webp
│   │   │   ├── marketplace.webp
│   │   │   ├── puntos.webp
│   │   │   ├── sorteos.webp
│   │   │   └── tarjeta.webp
│   │   └── secciones/       # Imágenes de secciones
│   │       ├── dinamicas.webp
│   │       ├── marketplace.webp
│   │       ├── negocios-locales.webp
│   │       └── ofertas.webp
│   ├── ChatYA.webp
│   ├── favicon.png
│   ├── logo-anunciaya-blanco.webp
│   ├── logo-anunciaya.webp
│   ├── og-image.webp        # Open Graph image
│   └── registro-hero.webp
│
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── auth/            # Componentes de autenticación
│   │   │   ├── registro/    # Componentes de registro
│   │   │   │   ├── BrandingColumn.tsx
│   │   │   │   ├── FormularioRegistro.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── ModalBienvenida.tsx
│   │   │   │   └── ModalVerificacionEmail.tsx
│   │   │   ├── vistas/      # Vistas del modal login
│   │   │   │   ├── Vista2FA.tsx
│   │   │   │   ├── VistaLogin.tsx
│   │   │   │   └── VistaRecuperar.tsx
│   │   │   ├── index.ts
│   │   │   ├── ModalInactividad.tsx
│   │   │   └── ModalLogin.tsx
│   │   │
│   │   ├── layout/          # Componentes de layout
│   │   │   ├── BottomNav.tsx        # Navegación móvil
│   │   │   ├── ChatOverlay.tsx      # Chat persistente
│   │   │   ├── ColumnaDerecha.tsx   # Sidebar derecho
│   │   │   ├── ColumnaIzquierda.tsx # Sidebar izquierdo
│   │   │   ├── index.ts
│   │   │   ├── MainLayout.tsx       # Layout principal
│   │   │   ├── MenuDrawer.tsx       # Menú móvil
│   │   │   ├── MobileHeader.tsx     # Header móvil
│   │   │   ├── ModalUbicacion.tsx   # Selector ubicación
│   │   │   ├── Navbar.tsx           # Barra superior
│   │   │   └── PanelNotificaciones.tsx
│   │   │
│   │   └── ui/              # Componentes UI base
│   │       ├── Boton.tsx
│   │       ├── index.ts
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── SelectorIdioma.tsx
│   │       └── Spinner.tsx
│   │
│   ├── config/              # Configuraciones
│   │   └── i18n.ts          # Internacionalización
│   │
│   ├── data/                # Datos estáticos
│   │   ├── ciudadesPopulares.ts
│   │   └── index.ts
│   │
│   ├── hooks/               # Custom hooks
│   │   └── useOptimisticUpload.ts
│   │
│   ├── locales/             # Traducciones
│   │   ├── en/              # Inglés
│   │   │   ├── auth.json
│   │   │   ├── common.json
│   │   │   └── landing.json
│   │   └── es/              # Español
│   │       ├── auth.json
│   │       ├── common.json
│   │       └── landing.json
│   │
│   ├── pages/               # Páginas de la aplicación
│   │   ├── private/         # Requieren autenticación
│   │   │   ├── business/    # Modo comercial
│   │   │   │   └── onboarding/
│   │   │   │       ├── componentes/
│   │   │   │       │   ├── BotonesNavegacion.tsx
│   │   │   │       │   ├── index.ts
│   │   │   │       │   ├── IndicadorPasos.tsx
│   │   │   │       │   ├── LayoutOnboarding.tsx
│   │   │   │       │   ├── ModalAgregarProducto.tsx
│   │   │   │       │   └── ModalPausar.tsx
│   │   │   │       ├── pasos/
│   │   │   │       │   ├── index.ts
│   │   │   │       │   ├── PasoCategoria.tsx
│   │   │   │       │   ├── PasoContacto.tsx
│   │   │   │       │   ├── PasoHorarios.tsx
│   │   │   │       │   ├── PasoImagenes.tsx
│   │   │   │       │   ├── PasoMetodosPago.tsx
│   │   │   │       │   ├── PasoProductos.tsx
│   │   │   │       │   ├── PasoPuntos.tsx
│   │   │   │       │   └── PasoUbicacion.tsx
│   │   │   │       └── PaginaOnboarding.tsx
│   │   │   ├── cupones/
│   │   │   │   └── PaginaMisCupones.tsx
│   │   │   ├── favoritos/
│   │   │   │   └── PaginaFavoritos.tsx
│   │   │   ├── publicaciones/
│   │   │   │   └── PaginaMisPublicaciones.tsx
│   │   │   └── PaginaInicio.tsx
│   │   │
│   │   └── public/          # Sin autenticación
│   │       ├── PaginaLanding.tsx
│   │       ├── PaginaRegistro.tsx
│   │       └── PaginaRegistroExito.tsx
│   │
│   ├── router/              # Configuración de rutas
│   │   ├── index.tsx        # Definición de rutas
│   │   ├── RootLayout.tsx   # Layout raíz
│   │   ├── RutaPrivada.tsx  # Guard de autenticación
│   │   └── RutaPublica.tsx  # Rutas sin auth
│   │
│   ├── services/            # Servicios API
│   │   ├── api.ts           # Instancia de Axios
│   │   ├── authService.ts   # Endpoints de auth
│   │   └── pagoService.ts   # Endpoints de pago
│   │
│   ├── stores/              # Estado global (Zustand)
│   │   ├── useAuthStore.ts          # Usuario y sesión
│   │   ├── useGpsStore.ts           # Ubicación
│   │   ├── useNotificacionesStore.ts
│   │   ├── useOnboardingStore.ts    # Wizard onboarding
│   │   └── useUiStore.ts            # Estado de UI
│   │
│   ├── utils/               # Utilidades
│   │   ├── cloudinary.ts    # Helpers de Cloudinary
│   │   ├── notificaciones.ts # Sistema de toasts
│   │   └── tokenUtils.ts    # Utilidades de tokens
│   │
│   ├── App.tsx              # Componente raíz
│   ├── index.css            # Estilos globales
│   ├── main.tsx             # Punto de entrada
│   └── vite-env.d.ts        # Tipos de Vite
│
├── .env                     # Variables de entorno
├── index.html               # HTML principal
├── package.json             # Dependencias
├── postcss.config.js        # Configuración PostCSS
├── tailwind.config.js       # Configuración Tailwind
├── tsconfig.json            # TypeScript config
└── vite.config.ts           # Configuración Vite
```

### Organización de Páginas

```
pages/
├── public/          # Sin login requerido
│   ├── Landing
│   ├── Registro
│   └── Verificación
│
└── private/         # Con login requerido
    ├── Inicio       # Dashboard personal
    ├── business/    # Modo comercial
    │   ├── onboarding/
    │   ├── studio/  (futuro)
    │   └── scan/    (futuro)
    ├── negocios/    (futuro)
    ├── marketplace/ (futuro)
    ├── ofertas/     (futuro)
    ├── dinamicas/   (futuro)
    └── chat/        (futuro)
```

---

## Paquetes Compartidos

```
packages/shared/
├── src/
│   ├── data/                # Datos compartidos
│   │   ├── ciudadesPopulares.ts
│   │   └── index.ts
│   ├── schemas/             # Schemas de validación
│   │   └── index.ts
│   ├── types/               # Tipos TypeScript
│   │   └── index.ts
│   └── index.ts             # Export principal
├── package.json
└── tsconfig.json
```

### Uso en Apps

```typescript
// En apps/api o apps/web
import { Usuario, Negocio } from '@anunciaya/shared';
```

---

## Archivos de Configuración

### TypeScript

| Archivo | Propósito |
|---------|-----------|
| `tsconfig.base.json` | Configuración base (heredada) |
| `apps/api/tsconfig.json` | Config específica backend |
| `apps/web/tsconfig.json` | Config específica frontend |

### pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    ports: ["5432:5432"]
    
  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

---

## Convenciones de Nombres

### Archivos

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes React | PascalCase | `ModalLogin.tsx` |
| Páginas | PascalCase con prefijo | `PaginaInicio.tsx` |
| Hooks | camelCase con prefijo | `useAuthStore.ts` |
| Services | camelCase | `authService.ts` |
| Utils | camelCase | `notificaciones.ts` |
| Types | PascalCase | `Usuario.ts` |

### Carpetas

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | lowercase | `components/auth/` |
| Páginas | lowercase | `pages/private/` |
| Features | lowercase | `business/onboarding/` |

### Código

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Variables | camelCase | `usuarioActivo` |
| Constantes | UPPER_SNAKE | `MAX_INTENTOS` |
| Funciones | camelCase | `obtenerUsuario()` |
| Clases | PascalCase | `AuthService` |
| Interfaces | PascalCase con I (opcional) | `Usuario` o `IUsuario` |
| Tipos | PascalCase | `TipoUsuario` |
| Enums | PascalCase | `EstadoNegocio` |

### Base de Datos

| Elemento | PostgreSQL | TypeScript |
|----------|------------|------------|
| Tablas | snake_case | camelCase |
| Columnas | snake_case | camelCase |
| Ejemplo | `negocio_id` | `negocioId` |

> Drizzle ORM transforma automáticamente entre snake_case (BD) y camelCase (código).

---

## Comandos Comunes

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev              # Ambas apps
pnpm --filter api dev # Solo backend
pnpm --filter web dev # Solo frontend

# Build
pnpm build            # Ambas apps
pnpm --filter api build
pnpm --filter web build

# Lint
pnpm lint

# Base de datos
pnpm --filter api db:generate  # Generar migraciones
pnpm --filter api db:push      # Aplicar cambios
pnpm --filter api db:studio    # Drizzle Studio
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
