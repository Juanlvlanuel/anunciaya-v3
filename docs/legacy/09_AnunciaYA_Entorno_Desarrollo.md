# 🔧 AnunciaYA v3.0 - Configuración del Entorno de Desarrollo

**Fecha de Actualización:** 18 Diciembre 2024

---

## 1. Requisitos del Sistema

### 1.1 Software Necesario

| Software | Versión | Instalación |
|----------|---------|-------------|
| **Node.js** | 24.x | https://nodejs.org/ |
| **pnpm** | 10.x | `npm install -g pnpm` |
| **Docker Desktop** | 29.x | https://docker.com/products/docker-desktop |
| **Git** | 2.x | https://git-scm.com/ |
| **VS Code** | Latest | https://code.visualstudio.com/ |

### 1.2 Extensiones VS Code Recomendadas

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker"
  ]
}
```

---

## 2. Estructura de Carpetas

```
E:\AnunciaYA\anunciaya\          ← Proyecto principal
├── apps/
│   ├── api/                     ← Backend (Puerto 4000)
│   └── web/                     ← Frontend (Puerto 3000)
├── packages/
│   └── shared/                  ← Tipos compartidos
├── docker-compose.yml           ← PostgreSQL + Redis
└── ...
```

---

## 3. Configuración Inicial (Primera Vez)

### 3.1 Clonar/Acceder al Proyecto

```bash
cd E:\AnunciaYA\anunciaya
```

### 3.2 Instalar Dependencias

```bash
pnpm install
```

### 3.3 Configurar Variables de Entorno

**Backend (apps/api/.env):**
```env
# Servidor
API_PORT=4000
NODE_ENV=development

# PostgreSQL (Docker local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=anunciaya
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anunciaya

# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://anunciaya_app_2025_08:fpfXFZSyvOsqOCO2@anunciaya-cluster.hx7dcf8.mongodb.net/anunciaya?retryWrites=true&w=majority&appName=AnunciaYA-Cluster

# Redis (Docker local)
REDIS_URL=redis://:anunciaya_dev_2024@localhost:6379

# JWT
JWT_SECRET=anunciaya_jwt_secret_dev_2024_super_seguro
JWT_REFRESH_SECRET=anunciaya_refresh_secret_dev_2024_seguro
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Google OAuth
GOOGLE_CLIENT_ID=298518442921-2jdlmg2he67mcjbq1093p9hmhocglh9j.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# Email SMTP (Zoho)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=admin@anunciaya.online
SMTP_PASS=MggZTBrd8JmN
EMAIL_FROM=admin@anunciaya.online

# Stripe (Test) - Plan Comercial AnunciaYA $449 MXN/mes (prod_TcFY6kI9RIuCf1)
STRIPE_SECRET_KEY=sk_test_51S9HijDbqVqWBiz7kGhzWtbUwZfCKvJHvlxMdnLmS8AZTR6M0hyQmv6LpO0NKYKLleDqCXcl59LtMaRLt7CQcCl3003vPPWgPD
STRIPE_PUBLISHABLE_KEY=pk_test_51S9HijDbqVqWBiz7vBTZ33dTgHcUm2gKm0WxKTuZnHGvO3ZHoIwoDhfwUGB4UfZ62hAiv2G2lgxL9BV1XOesIjie00YLAkxnkc
STRIPE_PRICE_COMERCIAL=price_1Sf12uDbqVqWBiz7MiS6oppo
STRIPE_WEBHOOK_SECRET=whsec_cb0be8a2dd9556a2b60e2e2668e0d64d7ec08f56b29ca6a600ddddc1cfb5b5a4

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Frontend (apps/web/.env):**
```env
# URL del Backend API
VITE_API_URL=/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=298518442921-2jdlmg2he67mcjbq1093p9hmhocglh9j.apps.googleusercontent.com

# Cloudinary (imágenes)
VITE_CLOUDINARY_CLOUD_NAME=dwrzdhrmg

# Stripe (Solo Publishable Key)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51S9HijDbqVqWBiz7vBTZ33dTgHcUm2gKm0WxKTuZnHGvO3ZHoIwoDhfwUGB4UfZ62hAiv2G2lgxL9BV1XOesIjie00YLAkxnkc
```

### 3.4 Levantar Docker

```bash
docker-compose up -d
```

Verifica que estén corriendo:
```bash
docker ps
```

Resultado esperado:
```
CONTAINER ID   IMAGE                    STATUS    PORTS
abc123         postgis/postgis:16-3.4   Up        0.0.0.0:5432->5432/tcp
def456         redis:7-alpine           Up        0.0.0.0:6379->6379/tcp
```

### 3.5 Ejecutar Migraciones (Primera vez)

```bash
cd apps/api
pnpm drizzle-kit push
```

---

## 4. Desarrollo Diario

### 4.1 Iniciar Servicios

**Terminal 1 - Docker:**
```bash
docker-compose up -d
```

**Terminal 2 - Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 3 - Frontend:**
```bash
cd apps/web
pnpm dev
```

**Terminal 4 - Stripe Webhooks (opcional):**
```bash
stripe listen --forward-to localhost:4000/api/pagos/webhook
```

### 4.2 URLs de Acceso

| Servicio | URL Local | URL Red |
|----------|-----------|---------|
| Frontend | http://localhost:3000 | http://192.168.1.232:3000 |
| Backend | http://localhost:4000 | http://192.168.1.232:4000 |
| API Health | http://localhost:4000/api/health | - |

### 4.3 Comandos Frecuentes

```bash
# Desde raíz del proyecto
pnpm dev              # Ambos (api + web)
pnpm dev:api          # Solo backend
pnpm dev:web          # Solo frontend
pnpm lint             # Verificar código
pnpm format           # Formatear código

# Docker
docker-compose up -d   # Levantar
docker-compose down    # Detener
docker-compose logs -f postgres  # Ver logs
docker-compose restart # Reiniciar

# Base de datos
cd apps/api
pnpm drizzle-kit studio    # GUI de BD
pnpm drizzle-kit push      # Aplicar cambios
pnpm drizzle-kit introspect # Sincronizar desde BD
```

---

## 5. Configuración de Red Local

### 5.1 IP Estática (Windows)

Para acceder desde móvil en la misma red:

1. **Configuración → Red e Internet → Wi-Fi**
2. **Propiedades de la red "Cecys Home"**
3. **Asignación de IP → Editar → Manual**
4. Configurar:
   - IP: `192.168.1.232`
   - Máscara: `255.255.255.0`
   - Gateway: `192.168.1.1`
   - DNS: `8.8.8.8`

### 5.2 Firewall Windows

```powershell
# Permitir puerto 3000 (Frontend)
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=3000

# Permitir puerto 4000 (Backend)
netsh advfirewall firewall add rule name="Express Dev Server" dir=in action=allow protocol=TCP localport=4000
```

### 5.3 Perfil de Red

Cambiar a "Red Privada" para permitir conexiones:

1. **Configuración → Red e Internet → Wi-Fi**
2. **"Cecys Home" → Perfil de red**
3. **Seleccionar: Privada**

### 5.4 Antivirus (Avast)

Si tienes Avast:
1. **Protección → Cortafuegos**
2. **Habilitar: "Permitir el Modo de Conexión Compartida a internet"**

---

## 6. Testing en Móvil

### 6.1 Acceso desde Móvil

1. Conectar móvil a la misma red WiFi
2. Abrir navegador en móvil
3. Ir a: `http://192.168.1.232:3000`

### 6.2 Configuración de Vite

El archivo `vite.config.ts` ya está configurado:

```typescript
server: {
  port: 3000,
  host: true,  // Expone en todas las interfaces
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:4000',
      changeOrigin: true,
    },
  },
}
```

### 6.3 Variable de Entorno API

**IMPORTANTE:** Usar `/api` en lugar de URL absoluta:

```env
# ✅ CORRECTO - Funciona en PC y móvil
VITE_API_URL=/api

# ❌ INCORRECTO - Falla en móvil
VITE_API_URL=http://localhost:4000/api
```

---

## 7. Stripe CLI

### 7.1 Instalación (Windows)

1. Descargar desde: https://github.com/stripe/stripe-cli/releases
2. Extraer a `C:\stripe-cli\`
3. Agregar al PATH:

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\stripe-cli", "Machine")
```

4. Reiniciar terminal

### 7.2 Autenticación

```bash
stripe login
```

### 7.3 Escuchar Webhooks

```bash
stripe listen --forward-to localhost:4000/api/pagos/webhook
```

Copiar el `whsec_xxxxx` mostrado a `STRIPE_WEBHOOK_SECRET` en `.env`.

### 7.4 Probar Eventos

```bash
stripe trigger checkout.session.completed
```

---

## 8. Base de Datos

### 8.1 Acceso a PostgreSQL

**Desde terminal:**
```bash
docker exec -it anunciaya-postgres psql -U postgres -d anunciaya
```

**Comandos útiles:**
```sql
\dt                    -- Listar tablas
\d usuarios            -- Describir tabla
SELECT * FROM usuarios LIMIT 5;
\q                     -- Salir
```

### 8.2 Drizzle Studio (GUI)

```bash
cd apps/api
pnpm drizzle-kit studio
```

Abre: http://localhost:4983

### 8.3 Acceso a Redis

```bash
docker exec -it anunciaya-redis redis-cli -a anunciaya_dev_2024
```

**Comandos útiles:**
```
KEYS *                 # Ver todas las keys
GET session:xxx        # Ver valor
TTL session:xxx        # Ver tiempo restante
FLUSHALL              # Borrar todo (¡cuidado!)
```

---

## 9. Problemas Comunes

### 9.1 Puerto Ocupado

```bash
# Ver qué usa el puerto 3000
netstat -ano | findstr :3000

# Matar proceso
taskkill /PID <numero> /F
```

### 9.2 Docker No Conecta

```bash
# Reiniciar Docker Desktop
# O reiniciar servicios:
docker-compose down
docker-compose up -d
```

### 9.3 Login Falla en Móvil

Verificar:
1. `VITE_API_URL=/api` (no URL absoluta)
2. Firewall permite puerto 3000
3. Red en modo "Privada"
4. Misma red WiFi

### 9.4 Migraciones Fallan

```bash
# Sincronizar schema desde BD existente
cd apps/api
pnpm drizzle-kit introspect
```

### 9.5 Redis Connection Refused

Verificar que Docker esté corriendo:
```bash
docker ps | grep redis
```

Si no aparece:
```bash
docker-compose up -d redis
```

---

## 10. Checklist de Desarrollo

### Antes de Comenzar

- [ ] Docker Desktop corriendo
- [ ] `docker-compose up -d` ejecutado
- [ ] Terminal backend: `pnpm dev` en apps/api
- [ ] Terminal frontend: `pnpm dev` en apps/web
- [ ] (Si pagos) Terminal Stripe: `stripe listen...`

### Antes de Commit

- [ ] `pnpm lint` sin errores
- [ ] `pnpm format` ejecutado
- [ ] Probar en navegador
- [ ] Probar en móvil (si aplica)

### Antes de Deploy

- [ ] Variables de entorno de producción
- [ ] Webhook de Stripe configurado
- [ ] MongoDB Atlas whitelist
- [ ] Build sin errores: `pnpm build`

---

## 11. Información del Entorno Actual

| Aspecto | Valor |
|---------|-------|
| **Ruta del proyecto** | `E:\AnunciaYA\anunciaya` |
| **IP del PC** | 192.168.1.232 |
| **Red WiFi** | Cecys Home |
| **Node.js** | 24.11.1 |
| **pnpm** | 10.24.0 |
| **Docker** | 29.0.1 |

---

*Documento actualizado: 18 Diciembre 2024*
