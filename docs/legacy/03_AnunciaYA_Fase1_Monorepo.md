# 📦 AnunciaYA v3.0 - Fase 1: Fundamentos del Monorepo

**Estado:** ✅ 100% Completado  
**Fecha de Finalización:** Diciembre 2024

---

## 1. Objetivo de la Fase

Establecer la estructura base del proyecto con:
- Arquitectura monorepo usando pnpm workspaces
- Configuración de TypeScript compartida
- Docker para servicios locales (PostgreSQL, Redis)
- Herramientas de calidad de código (ESLint, Prettier)

---

## 2. Estructura de Carpetas Creada

```
E:\AnunciaYA\anunciaya\
├── apps/
│   ├── api/                      ← Backend
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                      ← Frontend
│       ├── src/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   └── shared/                   ← Tipos compartidos
│       ├── src/
│       │   └── types/
│       │       └── index.ts
│       └── package.json
│
├── .env                          ← Variables de entorno
├── .env.example                  ← Plantilla de variables
├── .gitignore
├── .prettierignore
├── .prettierrc
├── docker-compose.yml            ← Servicios Docker
├── eslint.config.js
├── package.json                  ← Root del monorepo
├── pnpm-lock.yaml
├── pnpm-workspace.yaml           ← Configuración workspaces
└── tsconfig.base.json            ← TypeScript base
```

---

## 3. Archivos de Configuración

### 3.1 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Propósito:** Define qué carpetas son "workspaces" del monorepo.

### 3.2 package.json (Root)

```json
{
  "name": "anunciaya",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r dev",
    "dev:api": "pnpm --filter @anunciaya/api dev",
    "dev:web": "pnpm --filter @anunciaya/web dev",
    "build": "pnpm -r build",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "^22.x",
    "eslint": "^9.x",
    "prettier": "^3.x",
    "typescript": "^5.x",
    "typescript-eslint": "^8.x"
  }
}
```

### 3.3 tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**Propósito:** Configuración TypeScript base que heredan todos los packages.

### 3.4 apps/api/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.5 apps/web/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3.6 eslint.config.js

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

### 3.7 .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 3.8 .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Docker volumes
postgres_data/
redis_data/
```

---

## 4. Docker Compose

### 4.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL 16 con PostGIS para geolocalización
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

  # Redis 7 para cache, tokens y Socket.io
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

### 4.2 Por qué no hay MongoDB en Docker

MongoDB se usa a través de **MongoDB Atlas** (servicio en la nube) en lugar de una instancia local porque:

1. **Tier gratuito disponible** (M0 con 512 MB)
2. **Backups automáticos**
3. **Escalabilidad** sin configuración
4. **Menor carga** en máquina de desarrollo

---

## 5. Variables de Entorno

### 5.1 Archivos Creados

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `.env` | `apps/api/.env` | Variables reales (NO commitear) |
| `.env` | `apps/web/.env` | Variables frontend |
| `.env.example` | Raíz | Plantilla de referencia |

> **📋 Ver valores completos en:** [02_AnunciaYA_Stack_Tecnologico.md](./02_AnunciaYA_Stack_Tecnologico.md) → Sección 8

---

## 6. Dependencias Instaladas

### 6.1 Root (devDependencies)

| Paquete | Propósito |
|---------|-----------|
| `typescript` | Lenguaje principal |
| `@types/node` | Tipos de Node.js |
| `eslint` | Linter de código |
| `typescript-eslint` | ESLint para TypeScript |
| `prettier` | Formateo de código |

### 6.2 apps/api (dependencies)

| Paquete | Propósito |
|---------|-----------|
| `express` | Framework web |
| `cors` | Cross-Origin Resource Sharing |
| `helmet` | Seguridad HTTP |
| `dotenv` | Variables de entorno |
| `tsx` | Ejecutar TypeScript |

### 6.3 apps/web (dependencies)

| Paquete | Propósito |
|---------|-----------|
| `react` | Librería UI |
| `react-dom` | Renderizado |
| `react-router-dom` | Navegación |

---

## 7. Comandos de Desarrollo

### 7.1 Instalación Inicial

```bash
# Clonar o crear estructura
cd E:\AnunciaYA\anunciaya

# Instalar todas las dependencias
pnpm install

# Levantar Docker
docker-compose up -d
```

### 7.2 Desarrollo Diario

```bash
# Verificar Docker corriendo
docker ps

# Levantar backend
pnpm dev:api

# Levantar frontend (otra terminal)
pnpm dev:web

# O ambos juntos
pnpm dev
```

### 7.3 Verificación

```bash
# Lint
pnpm lint

# Formatear código
pnpm format
```

---

## 8. Verificación de Fase Completada

### Checklist ✅

- [x] Estructura de carpetas monorepo
- [x] pnpm workspaces configurado
- [x] TypeScript base configurado
- [x] ESLint + Prettier configurados
- [x] Docker Compose con PostgreSQL + Redis
- [x] Variables de entorno (.env)
- [x] .gitignore completo
- [x] Scripts de desarrollo funcionando
- [x] Frontend React básico arranca
- [x] Backend Express básico arranca

### Pruebas Realizadas

```bash
# Docker
docker-compose up -d     # ✅ Servicios levantan
docker ps                # ✅ postgres y redis running

# Backend
pnpm dev:api             # ✅ Server listening on port 4000

# Frontend
pnpm dev:web             # ✅ Vite server on port 3000

# Base de datos
psql -h localhost -U postgres -d anunciaya  # ✅ Conecta
```

---

## 9. Lecciones Aprendidas

### 9.1 pnpm vs npm/yarn

| Aspecto | pnpm |
|---------|------|
| **Velocidad** | Más rápido por hard links |
| **Espacio** | Menos duplicación |
| **Workspaces** | Soporte nativo excelente |
| **Lockfile** | `pnpm-lock.yaml` |

### 9.2 Monorepo Benefits

1. **Código compartido** - packages/shared para tipos
2. **Un solo comando** - `pnpm dev` levanta todo
3. **Versionado conjunto** - Todo en un repo
4. **Refactoring fácil** - Cambios globales simples

### 9.3 Docker en Desarrollo

- **Ventaja:** Entorno consistente
- **Ventaja:** No instalar PostgreSQL/Redis localmente
- **Consideración:** Requiere Docker Desktop en Windows

---

## 10. Próximos Pasos (Fase 2)

Con la estructura base lista, la Fase 2 implementará:

1. Schemas de PostgreSQL (Drizzle ORM)
2. Modelos de MongoDB (Mongoose)
3. Conexiones a bases de datos
4. Seeds iniciales

---

*Fase 1 completada: Diciembre 2024*
