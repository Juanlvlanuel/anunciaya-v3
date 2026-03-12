# 🛠️ AnunciaYA v3.0 - Stack Tecnológico

**Fecha de Actualización:** 18 Diciembre 2024  
**Versión:** 3.0

---

## 1. Resumen del Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    STACK ANUNCIAYA v3.0                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND          BACKEND           BASES DE DATOS         │
│  ─────────         ───────           ──────────────         │
│  React 18          Node.js 24        PostgreSQL 16          │
│  TypeScript 5      Express 4         + PostGIS 3.4          │
│  Vite 6            TypeScript 5      MongoDB 7              │
│  Tailwind CSS 4    Socket.io 4       Redis 7                │
│  Zustand 5         Drizzle ORM                              │
│  React Router 7    Mongoose 8                               │
│                    ioredis 5                                │
│                                                             │
│  SERVICIOS         PAGOS             DESARROLLO             │
│  ─────────         ─────             ──────────             │
│  Cloudinary        Stripe            Docker                 │
│  Nodemailer        (webhooks)        pnpm workspaces        │
│  Google OAuth                        ESLint + Prettier      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

### 2.1 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react` | 18.3.x | Librería UI |
| `react-dom` | 18.3.x | Renderizado DOM |
| `typescript` | 5.x | Tipado estático |
| `vite` | 6.x | Build tool + dev server |
| `@vitejs/plugin-react` | 4.x | Plugin React para Vite |

### 2.2 Estilos y UI

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `tailwindcss` | 4.x | Framework CSS (nueva sintaxis nativa) |
| `framer-motion` | 11.x | Animaciones |
| `lucide-react` | 0.x | Iconos |
| `sweetalert2` | 11.x | Notificaciones toast |

### 2.3 Estado y Navegación

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `zustand` | 5.x | Estado global |
| `react-router-dom` | 7.x | Navegación SPA |
| `axios` | 1.x | Cliente HTTP |

### 2.4 Funcionalidades Específicas

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react-i18next` | 15.x | Internacionalización (ES/EN) |
| `i18next` | 24.x | Core i18n |
| `@react-oauth/google` | 0.12.x | Google Sign-In |
| `@stripe/stripe-js` | 4.x | Pagos Stripe frontend |
| `@stripe/react-stripe-js` | 3.x | Componentes Stripe |
| `socket.io-client` | 4.x | WebSockets cliente |
| `qrcode.react` | 4.x | Generación de QR codes |

### 2.5 Configuración Vite

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,  // Expone en red local
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
```

### 2.6 Configuración Tailwind CSS v4

```css
/* apps/web/src/index.css */
@import "tailwindcss";

/* Variables CSS personalizadas */
:root {
  --sat: env(safe-area-inset-top);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
  --sar: env(safe-area-inset-right);
}

/* Tailwind v4 usa sintaxis CSS nativa, no @tailwind directives */
```

---

## 3. Backend

### 3.1 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `express` | 4.x | Framework HTTP |
| `typescript` | 5.x | Tipado estático |
| `tsx` | 4.x | Ejecutar TypeScript directamente |
| `cors` | 2.x | Cross-Origin Resource Sharing |
| `helmet` | 8.x | Seguridad HTTP headers |
| `dotenv` | 16.x | Variables de entorno |

### 3.2 Base de Datos

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `drizzle-orm` | 0.45.x | ORM para PostgreSQL |
| `drizzle-kit` | 0.30.x | CLI de Drizzle (migraciones) |
| `postgres` | 3.x | Driver PostgreSQL |
| `mongoose` | 8.x | ODM para MongoDB |
| `ioredis` | 5.x | Cliente Redis |

### 3.3 Autenticación y Seguridad

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `jsonwebtoken` | 9.x | Tokens JWT |
| `bcrypt` | 5.x | Hash de contraseñas |
| `zod` | 3.x | Validación de datos |
| `google-auth-library` | 9.x | Verificar tokens Google |
| `otplib` | 12.x | 2FA TOTP |
| `qrcode` | 1.x | Generar QR para 2FA |
| `express-rate-limit` | 7.x | Rate limiting |

### 3.4 Comunicación

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `socket.io` | 4.x | WebSockets servidor |
| `nodemailer` | 6.x | Envío de emails |

### 3.5 Pagos

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `stripe` | 17.x | SDK de Stripe backend |

---

## 4. Bases de Datos

### 4.1 PostgreSQL + PostGIS

| Aspecto | Valor |
|---------|-------|
| **Versión** | PostgreSQL 16 |
| **Extensión** | PostGIS 3.4 |
| **Puerto** | 5432 |
| **Imagen Docker** | `postgis/postgis:16-3.4` |
| **ORM** | Drizzle ORM |

**Propósito:** Datos relacionales + geolocalización

**Schemas (9):**
- `usuarios` - Cuentas y autenticación
- `negocios` - Directorio comercial
- `publicaciones` - MarketPlace, ofertas, dinámicas
- `puntos` - Sistema de lealtad
- `pedidos` - Órdenes y carrito
- `citas` - Sistema de citas
- `empleados` - Staff de negocios
- `planes` - Suscripciones
- `embajadores` - Programa de afiliados

**Total de tablas:** 58 (actualizado ETAPA 2)

### 4.2 MongoDB

| Aspecto | Valor |
|---------|-------|
| **Versión** | MongoDB 7 |
| **Puerto** | 27017 |
| **Hosting** | MongoDB Atlas M0 (Free) |
| **ODM** | Mongoose 8 |

**Propósito:** Chat en tiempo real (ChatYA)

**Colecciones (4):**

| Colección | Propósito |
|-----------|-----------|
| `chats` | Conversaciones entre usuarios |
| `mensajes` | Mensajes individuales |
| `contactos` | Lista de contactos por usuario |
| `interacciones` | Métricas de engagement |

### 4.3 Redis

| Aspecto | Valor |
|---------|-------|
| **Versión** | Redis 7 |
| **Puerto** | 6379 |
| **Imagen Docker** | `redis:7-alpine` |
| **Cliente** | ioredis |

**Propósito:** Cache, sesiones, tokens temporales

**Usos:**
- Sesiones de usuario (refresh tokens)
- Códigos de verificación (TTL 15 min)
- Registros pendientes de confirmación
- Cache de consultas frecuentes
- Adapter para Socket.io (escalabilidad)

---

## 5. Docker (Desarrollo Local)

### 5.1 docker-compose.yml

```yaml
services:
  # PostgreSQL 16 con PostGIS
  postgres:
    image: postgis/postgis:16-3.4
    container_name: anunciaya-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: anunciaya
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d anunciaya"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 7
  redis:
    image: redis:7-alpine
    container_name: anunciaya-redis
    restart: unless-stopped
    command: redis-server --requirepass anunciaya_dev_2024
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "anunciaya_dev_2024", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

> **Nota:** MongoDB no está en Docker porque se usa MongoDB Atlas (nube).

### 5.2 Comandos Docker

```bash
# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Detener
docker-compose down

# Reiniciar
docker-compose restart

# Eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v
```

---

## 6. Servicios Externos

### 6.1 MongoDB Atlas

| Aspecto | Valor |
|---------|-------|
| **Tier** | M0 (Free) |
| **Región** | AWS / us-east-1 |
| **Límites** | 512 MB storage |
| **Conexión** | URL en variable de entorno |

### 6.2 Cloudinary

| Aspecto | Valor |
|---------|-------|
| **Uso** | Almacenamiento de imágenes |
| **Tier** | Free (25 GB) |
| **SDK** | cloudinary (backend) |

### 6.3 Stripe

| Aspecto | Valor |
|---------|-------|
| **Modo** | Test (desarrollo) |
| **Webhooks** | Stripe CLI local |
| **Productos** | Planes de suscripción |

### 6.4 Zoho Mail (SMTP)

| Aspecto | Valor |
|---------|-------|
| **Uso** | Envío de emails transaccionales |
| **Puerto** | 587 (TLS) |
| **Emails** | Verificación, recuperación, notificaciones |

---

## 7. Hosting (Producción)

| Servicio | Proveedor | Costo | Estado |
|----------|-----------|-------|--------|
| Backend + PostgreSQL | Railway | $5-20/mes | ⏳ Pendiente |
| Frontend | Vercel | $0 | ⏳ Pendiente |
| MongoDB | Atlas M0 | $0 | ✅ Configurado |
| Redis | Upstash | $0 | ⏳ Pendiente |
| Imágenes | Cloudinary | $0 | ✅ Configurado |

**Costo total estimado:** ~$5-20 USD/mes

---

## 8. Variables de Entorno

### 8.1 Backend (apps/api/.env)

```env
# =============================================================================
# SERVIDOR
# =============================================================================
API_PORT=4000
NODE_ENV=development

# =============================================================================
# POSTGRESQL
# =============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=anunciaya
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anunciaya

# =============================================================================
# MONGODB ATLAS
# =============================================================================
MONGODB_URI=mongodb+srv://anunciaya_app_2025_08:fpfXFZSyvOsqOCO2@anunciaya-cluster.hx7dcf8.mongodb.net/anunciaya?retryWrites=true&w=majority&appName=AnunciaYA-Cluster

# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=redis://:anunciaya_dev_2024@localhost:6379

# =============================================================================
# JWT (AUTENTICACIÓN)
# =============================================================================
JWT_SECRET=anunciaya_jwt_secret_dev_2024_super_seguro
JWT_REFRESH_SECRET=anunciaya_refresh_secret_dev_2024_seguro
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# =============================================================================
# GOOGLE OAUTH
# =============================================================================
GOOGLE_CLIENT_ID=298518442921-2jdlmg2he67mcjbq1093p9hmhocglh9j.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# =============================================================================
# EMAIL (ZOHO SMTP)
# =============================================================================
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=admin@anunciaya.online
SMTP_PASS=MggZTBrd8JmN
EMAIL_FROM=admin@anunciaya.online

# =============================================================================
# STRIPE (MODO TEST)
# Producto: Plan Comercial AnunciaYA - $449 MXN/mes (prod_TcFY6kI9RIuCf1)
# =============================================================================
STRIPE_SECRET_KEY=sk_test_51S9HijDbqVqWBiz7kGhzWtbUwZfCKvJHvlxMdnLmS8AZTR6M0hyQmv6LpO0NKYKLleDqCXcl59LtMaRLt7CQcCl3003vPPWgPD
STRIPE_PUBLISHABLE_KEY=pk_test_51S9HijDbqVqWBiz7vBTZ33dTgHcUm2gKm0WxKTuZnHGvO3ZHoIwoDhfwUGB4UfZ62hAiv2G2lgxL9BV1XOesIjie00YLAkxnkc
STRIPE_PRICE_COMERCIAL=price_1Sf12uDbqVqWBiz7MiS6oppo
STRIPE_WEBHOOK_SECRET=whsec_cb0be8a2dd9556a2b60e2e2668e0d64d7ec08f56b29ca6a600ddddc1cfb5b5a4

# =============================================================================
# FRONTEND URL (CORS)
# =============================================================================
FRONTEND_URL=http://localhost:3000
```

### 8.2 Frontend (apps/web/.env)

```env
# =============================================================================
# AnunciaYA Frontend - Variables de Entorno
# =============================================================================

# URL del Backend API
VITE_API_URL=/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=298518442921-2jdlmg2he67mcjbq1093p9hmhocglh9j.apps.googleusercontent.com

# Cloudinary (imágenes)
VITE_CLOUDINARY_CLOUD_NAME=dwrzdhrmg

# Stripe (Solo Publishable Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51S9HijDbqVqWBiz7vBTZ33dTgHcUm2gKm0WxKTuZnHGvO3ZHoIwoDhfwUGB4UfZ62hAiv2G2lgxL9BV1XOesIjie00YLAkxnkc
```

---

## 9. Estructura del Monorepo

```
E:\AnunciaYA\anunciaya\
├── apps/
│   ├── api/                    # Backend Node + Express
│   │   ├── src/
│   │   │   ├── config/         # Configuración (env.ts)
│   │   │   ├── controllers/    # Controladores HTTP
│   │   │   ├── db/             # Conexiones BD
│   │   │   │   ├── schemas/    # Drizzle schemas
│   │   │   │   └── models/     # Mongoose models
│   │   │   ├── middleware/     # Auth, rate limit
│   │   │   ├── routes/         # Definición de rutas
│   │   │   ├── services/       # Lógica de negocio
│   │   │   ├── utils/          # Helpers (jwt, email)
│   │   │   ├── validations/    # Zod schemas
│   │   │   └── index.ts        # Entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                    # Frontend React + Vite
│       ├── src/
│       │   ├── components/     # Componentes React
│       │   │   ├── layout/     # MainLayout, Navbar, etc.
│       │   │   ├── auth/       # Login, Register
│       │   │   ├── modals/     # Modales
│       │   │   └── ui/         # Componentes base
│       │   ├── pages/          # Páginas/Vistas
│       │   │   ├── publicas/   # Landing, Auth
│       │   │   └── privadas/   # Dashboard, etc.
│       │   ├── stores/         # Zustand stores
│       │   ├── services/       # API calls
│       │   ├── hooks/          # Custom hooks
│       │   ├── locales/        # Traducciones i18n
│       │   ├── data/           # Datos estáticos
│       │   ├── App.tsx
│       │   ├── AppRoutes.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # Tipos compartidos
│       ├── src/
│       │   └── types/
│       └── package.json
│
├── docker-compose.yml
├── package.json                # Root del monorepo
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
└── .prettierrc
```

---

## 10. Scripts de Desarrollo

### 10.1 Root (package.json)

```json
{
  "scripts": {
    "dev": "pnpm -r dev",
    "dev:api": "pnpm --filter @anunciaya/api dev",
    "dev:web": "pnpm --filter @anunciaya/web dev",
    "build": "pnpm -r build",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

### 10.2 Comandos Frecuentes

```bash
# Instalar dependencias
pnpm install

# Desarrollo (ambos)
pnpm dev

# Solo backend
pnpm dev:api

# Solo frontend
pnpm dev:web

# Base de datos
docker-compose up -d

# Stripe webhooks (terminal separada)
stripe listen --forward-to localhost:4000/api/pagos/webhook
```

---

## 11. Versiones de Node y Herramientas

| Herramienta | Versión |
|-------------|---------|
| Node.js | 24.11.1 |
| pnpm | 10.24.0 |
| Docker | 29.0.1 |
| Docker Compose | 2.x |
| Git | 2.x |

---

## 12. Entorno de Desarrollo

| Aspecto | Valor |
|---------|-------|
| **SO** | Windows 10/11 |
| **IDE** | VS Code |
| **Terminal** | PowerShell / CMD |
| **Ruta Proyecto** | `E:\AnunciaYA\anunciaya` |
| **IP Local** | 192.168.1.232 (estática) |
| **Red** | Cecys Home |

---

*Documento actualizado: 18 Diciembre 2024*
