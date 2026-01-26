# 🛠️ AnunciaYA v3.0 - Stack Tecnológico

**Última Actualización:** 26 Diciembre 2024  
**Versión del Documento:** 1.0

---

## 📋 Índice

1. [Resumen del Stack](#resumen-del-stack)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Bases de Datos](#bases-de-datos)
5. [Servicios Externos](#servicios-externos)
6. [Infraestructura](#infraestructura)
7. [Herramientas de Desarrollo](#herramientas-de-desarrollo)
8. [Justificación de Decisiones](#justificación-de-decisiones)

---

## Resumen del Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│         React 18 + TypeScript + Vite + Tailwind v4          │
│                      Vercel (hosting)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│           Node.js + Express + TypeScript                     │
│                    Railway (hosting)                         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │    MongoDB      │  │     Redis       │
│   + PostGIS     │  │    Atlas        │  │    Upstash      │
│   (Railway)     │  │   (Chat)        │  │  (Sessions)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Cloudinary    │  │     Stripe      │  │   Socket.io     │
│   (Imágenes)    │  │    (Pagos)      │  │   (Real-time)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Frontend

### Core

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.x | Librería UI |
| **TypeScript** | 5.x | Tipado estático |
| **Vite** | 5.x | Build tool y dev server |

### Estilos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Tailwind CSS** | 4.x | Framework CSS utility-first |
| **Lucide React** | Latest | Iconos SVG |
| **Framer Motion** | Latest | Animaciones |

### Estado y Routing

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Zustand** | Latest | Estado global (stores) |
| **React Router** | 6.x | Navegación SPA |
| **Axios** | Latest | Cliente HTTP |

### Formularios y Validación

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React Hook Form** | Latest | Manejo de formularios |
| **Zod** | Latest | Validación de schemas |

### UI Components

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **SweetAlert2** | Latest | Notificaciones toast |
| **React Leaflet** | Latest | Mapas interactivos |
| **React i18next** | Latest | Internacionalización |

### Estructura de Carpetas Frontend

```
apps/web/src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes base (Button, Input, etc.)
│   ├── layout/         # MainLayout, Navbar, Sidebar
│   └── auth/           # Componentes de autenticación
├── pages/              # Páginas de la aplicación
│   ├── public/         # Páginas sin login
│   └── private/        # Páginas con login
├── stores/             # Zustand stores
├── hooks/              # Custom hooks
├── services/           # Servicios API
├── utils/              # Utilidades
├── types/              # Tipos TypeScript
└── styles/             # Estilos globales
```

---

## Backend

### Core

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 20.x LTS | Runtime JavaScript |
| **Express** | 4.x | Framework HTTP |
| **TypeScript** | 5.x | Tipado estático |

### Base de Datos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Drizzle ORM** | Latest | ORM type-safe para PostgreSQL |
| **Mongoose** | Latest | ODM para MongoDB |

### Autenticación

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **jsonwebtoken** | Latest | JWT tokens |
| **bcryptjs** | Latest | Hash de contraseñas |
| **passport** | Latest | Estrategias OAuth |
| **passport-google-oauth20** | Latest | Login con Google |

### Validación

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Zod** | Latest | Validación de requests |

### Utilidades

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **cors** | Latest | Manejo de CORS |
| **helmet** | Latest | Seguridad HTTP headers |
| **morgan** | Latest | Logging de requests |
| **nodemailer** | Latest | Envío de emails |
| **cloudinary** | Latest | SDK de Cloudinary |
| **stripe** | Latest | SDK de Stripe |

### Real-time

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Socket.io** | Latest | WebSockets para chat |

### Estructura de Carpetas Backend

```
apps/api/src/
├── controllers/        # Lógica de endpoints
├── services/          # Lógica de negocio
├── routes/            # Definición de rutas
├── middlewares/       # Middlewares (auth, validation)
├── validations/       # Schemas Zod
├── db/
│   ├── schemas/       # Schemas Drizzle (PostgreSQL)
│   └── models/        # Modelos Mongoose (MongoDB)
├── config/            # Configuraciones
├── utils/             # Utilidades
└── types/             # Tipos TypeScript
```

---

## Bases de Datos

### PostgreSQL + PostGIS

**Propósito:** Base de datos principal (datos estructurados)

| Característica | Detalle |
|----------------|---------|
| **Hosting** | Railway |
| **ORM** | Drizzle ORM |
| **Extensión** | PostGIS (geolocalización) |
| **Schemas** | 9 schemas, 42 tablas |

**Schemas:**
| Schema | Tablas | Propósito |
|--------|--------|-----------|
| `auth` | usuarios, sesiones, tokens | Autenticación |
| `negocios` | negocios, sucursales, horarios | Datos de negocios |
| `catalogo` | categorias, subcategorias | Catálogo |
| `articulos` | articulos, articulo_imagenes | Productos/servicios |
| `puntos` | transacciones, niveles | Sistema CardYA |
| `ofertas` | ofertas, cupones | Promociones |
| `marketplace` | publicaciones | Compra-venta |
| `dinamicas` | rifas, participaciones | Sorteos |
| `empleos` | vacantes, postulaciones | Bolsa trabajo |

**Funciones PostGIS usadas:**
```sql
-- Búsqueda por radio (negocios cercanos)
ST_DWithin(ubicacion, ST_MakePoint(lng, lat)::geography, radio_metros)

-- Extraer coordenadas
ST_X(ubicacion::geometry)  -- Longitud
ST_Y(ubicacion::geometry)  -- Latitud

-- Crear punto geográfico
ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
```

### MongoDB Atlas

**Propósito:** Base de datos para chat (datos no estructurados)

| Característica | Detalle |
|----------------|---------|
| **Hosting** | MongoDB Atlas (M0 Free) |
| **ODM** | Mongoose |
| **Colecciones** | 4 |

**Colecciones:**
| Colección | Propósito |
|-----------|-----------|
| `conversaciones` | Metadatos de chats |
| `mensajes` | Mensajes individuales |
| `participantes` | Usuarios en cada chat |
| `archivos` | Referencias a archivos enviados |

### Redis (Upstash)

**Propósito:** Cache y sesiones

| Característica | Detalle |
|----------------|---------|
| **Hosting** | Upstash (serverless) |
| **Uso** | Refresh tokens, rate limiting, cache |

---

## Servicios Externos

### Cloudinary

**Propósito:** Almacenamiento y optimización de imágenes

| Característica | Detalle |
|----------------|---------|
| **Plan** | Free tier |
| **Uso** | Logos, portadas, galerías, productos |
| **Optimización** | Conversión automática a .webp |

**Carpetas en Cloudinary:**
```
anunciaya/
├── logos/        # Logos de negocios (500x500)
├── portadas/     # Portadas de negocios (1600x900)
├── galeria/      # Galerías de negocios (1200x1200)
└── productos/    # Imágenes de productos (800x800)
```

### Stripe

**Propósito:** Procesamiento de pagos y suscripciones

| Característica | Detalle |
|----------------|---------|
| **Modo** | Test (desarrollo) / Live (producción) |
| **Productos** | Suscripción mensual $449 MXN |
| **Webhooks** | Confirmación de pago, cancelación |

### Google OAuth

**Propósito:** Login social

| Característica | Detalle |
|----------------|---------|
| **Estrategia** | passport-google-oauth20 |
| **Scopes** | email, profile |

---

## Infraestructura

### Hosting

| Servicio | Componente | Plan | Costo Estimado |
|----------|------------|------|----------------|
| **Railway** | Backend + PostgreSQL | Hobby | ~$5-10/mes |
| **Vercel** | Frontend | Free | $0 |
| **MongoDB Atlas** | Chat DB | M0 Free | $0 |
| **Upstash** | Redis | Free tier | $0 |
| **Cloudinary** | Imágenes | Free tier | $0 |

**Costo Total Estimado:** ~$5-20 USD/mes

### Dominios y DNS

| Dominio | Uso |
|---------|-----|
| `anunciaya.online` | Producción |
| `*.vercel.app` | Frontend desarrollo |
| `*.railway.app` | Backend desarrollo |

### SSL/HTTPS

- ✅ Automático en Vercel
- ✅ Automático en Railway

---

## Herramientas de Desarrollo

### IDE y Extensiones

| Herramienta | Propósito |
|-------------|-----------|
| **VS Code** | Editor principal |
| **ESLint** | Linting JavaScript/TypeScript |
| **Prettier** | Formateo de código |
| **TypeScript** | Extensión oficial |
| **Tailwind CSS IntelliSense** | Autocompletado Tailwind |

### Gestión de Paquetes

| Herramienta | Propósito |
|-------------|-----------|
| **pnpm** | Package manager (monorepo) |
| **pnpm workspaces** | Gestión de monorepo |

### Testing y Debugging

| Herramienta | Propósito |
|-------------|-----------|
| **Postman** | Testing de APIs |
| **pgAdmin** | Gestión de PostgreSQL |
| **MongoDB Compass** | Gestión de MongoDB |
| **Stripe CLI** | Testing de webhooks |

### Control de Versiones

| Herramienta | Propósito |
|-------------|-----------|
| **Git** | Control de versiones |
| **GitHub** | Repositorio remoto |

---

## Justificación de Decisiones

### ¿Por qué React + Vite en lugar de Next.js?

| Criterio | Next.js | React + Vite |
|----------|---------|--------------|
| SSR/SSG | ✅ Incluido | ❌ No necesario |
| Complejidad | Mayor | Menor |
| Flexibilidad | Menor | Mayor |
| Curva aprendizaje | Mayor | Menor |

**Decisión:** AnunciaYA es una SPA, no necesita SEO server-side. Vite es más simple y rápido para desarrollo.

### ¿Por qué Zustand en lugar de Redux?

| Criterio | Redux | Zustand |
|----------|-------|---------|
| Boilerplate | Mucho | Mínimo |
| Curva aprendizaje | Alta | Baja |
| Performance | Buena | Excelente |
| Tamaño bundle | ~2kb | ~1kb |

**Decisión:** Zustand es más simple, menos código, mismo resultado.

### ¿Por qué PostgreSQL + MongoDB (híbrido)?

| Tipo de Dato | Base de Datos | Razón |
|--------------|---------------|-------|
| Datos estructurados (usuarios, negocios) | PostgreSQL | Relaciones, transacciones, integridad |
| Chat (mensajes, conversaciones) | MongoDB | Flexibilidad, escalabilidad, real-time |

**Decisión:** Cada base de datos para lo que hace mejor.

### ¿Por qué Drizzle ORM?

| Criterio | Prisma | Drizzle |
|----------|--------|---------|
| Type-safety | ✅ | ✅ |
| Performance | Buena | Mejor |
| SQL control | Abstracto | Directo |
| Migraciones | Automáticas | Manuales/controladas |

**Decisión:** Drizzle ofrece mejor control sobre SQL y performance.

### ¿Por qué Tailwind CSS v4?

| Criterio | CSS Modules | Tailwind |
|----------|-------------|----------|
| Velocidad desarrollo | Media | Alta |
| Consistencia | Manual | Automática |
| Bundle size | Variable | Optimizado |
| Responsive | Manual | Built-in |

**Decisión:** Desarrollo más rápido con utilidades predefinidas.

---

## Versiones Específicas

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "tailwindcss": "^4.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "express": "^4.x",
    "drizzle-orm": "^0.29.x",
    "mongoose": "^8.x",
    "jsonwebtoken": "^9.x",
    "zod": "^3.x",
    "socket.io": "^4.x",
    "cloudinary": "^2.x",
    "stripe": "^14.x"
  }
}
```

---

*Documento parte de la Documentación Técnica de AnunciaYA v3.0*
