# 📜 AnunciaYA v3.0 - Changelog

Todas las novedades notables del proyecto están documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Versionamiento Semántico](https://semver.org/lang/es/).

---

## [29 Enero - 5 Febrero 2026] - Sprint Config Puntos + Expiración

### ✨ Agregado

**Business Studio - Configuración de Puntos (Fase 15 ScanYA)**
- Página `PaginaPuntos.tsx` en Business Studio con layout de 3 secciones
- Métricas en header: Clientes, Otorgados, Canjeados, Disponibles
- **Configuración Base:**
  - Acumulación de puntos: "Por cada $X MXN gana Y pts"
  - Expiración de puntos: X días (con checkbox "No expiran")
  - Expiración de vouchers: X días
  - Textos aclaratorios sobre comportamiento de expiración
- **Sistema de Niveles:**
  - Toggle activo/inactivo
  - 3 niveles: Bronce (cafe), Plata (plata), Oro (amarillo)
  - Cada nivel con: Mínimo, Máximo, Multiplicador
  - Máximo de Oro = ∞ (infinito, fijo)
  - Validaciones: rangos ascendentes, multiplicadores ascendentes, sin decimales
  - Recálculo automático de niveles de todos los clientes al cambiar rangos
  - Beneficios explicados: Mayor retención, Multiplicadores de puntos, Compromiso emocional
- **Recompensas (CRUD):**
  - Crear/editar recompensa con: imagen, nombre, descripción, puntos requeridos
  - Stock disponible con checkbox "Ilimitado" (valor -1)
  - Toggle "Requiere aprobación" (canje necesita confirmación manual)
  - Toggle activo/inactivo por recompensa
  - Eliminar recompensa
  - Cards visuales con iconos de editar/eliminar

**Sistema de Expiración en Tiempo Real**
- Validación reactiva (sin cron jobs ni servicios externos)
- Expiración de puntos por inactividad al final del día local del negocio (23:59:59)
- Expiración de vouchers vencidos con auto-reembolso de puntos a billetera
- Función `expirarVouchersVencidos(negocioId)` masiva, reutilizable desde cualquier endpoint
- Función `expirarPuntosPorInactividad(usuarioId, negocioId)` individual por cliente
- Función `verificarExpiraciones()` combinada para endpoints de cliente específico
- Manejo correcto de zona horaria del negocio (`negocio_sucursales.zona_horaria`)

### 🐛 Corregido

**Bug: Paso 0 en obtenerVouchers no devolvía puntos**
- `obtenerVouchers` (ScanYA) marcaba vouchers como expirados pero NO devolvía puntos
- Reemplazado SQL inline por `expirarVouchersVencidos()` que incluye auto-reembolso
- Aplicado también en `obtenerVouchersPendientes`

**Bug: Desfase de zona horaria en expiración de puntos**
- Servidor en UTC causaba que puntos expiraran horas antes de lo esperado
- Implementada función `calcularFinDiaExpiracion()` que convierte a hora local del negocio
- Puntos ahora expiran al final del día local (23:59:59 zona horaria del negocio)

### 📝 Documentación
- Nueva sección #12 "Sistema de Expiración" en `ARQUITECTURA ScanYA.md`
- Fase 15 actualizada a completada en progreso del proyecto
- CHANGELOG y ROADMAP actualizados

---

## [17-29 Enero 2026] - Sprint ScanYA + Migración Cloud

### ✨ Agregado

**Arquitectura ScanYA - Diseño Previo (19 Enero 2026)**
- Día completo de diseño arquitectónico antes de implementar código (4 horas)
- Decisiones de roles: Dueño/Gerente/Empleado con permisos diferenciados
- Sistema de autenticación dual: Email+Password (dueños/gerentes) vs Nick+PIN (empleados)
- Arquitectura de tokens separados: `ay_*` (AnunciaYA) vs `sy_*` (ScanYA)
- Sesiones 100% independientes entre plataformas
- Separación de configuraciones: `puntos_configuracion` vs `scanya_configuracion`
- Documento generado: `PROMPT_SCANYA_COMPLETO.md` (50 páginas)

**16 Fases Internas de ScanYA:**

| Fase | Descripción | Estado | Fecha |
|------|-------------|--------|-------|
| 1-7 | Backend completo (23 endpoints) | ✅ 100% | 20-21 Ene |
| 8 | Login frontend | ✅ 100% | 20 Ene |
| 9 | Cloudflare R2 fotos tickets | ✅ 100% | 20 Ene |
| 10 | Dashboard + Sistema turnos | ✅ 100% | 21 Ene |
| 11 | Modal Registrar Venta (acordeón) | ✅ 100% | 21-22 Ene |
| 12 | Historial + Validar vouchers | ✅ 100% | 22 Ene |
| 13 | Recordatorios offline | ✅ 100% | 22-24 Ene |
| 14 | Chat + Reseñas | ⏸️ Pausada | Requiere ChatYA |
| 15 | BS > Puntos Config + Expiración | ✅ 100% | 29 Ene - 5 Feb |
| 16 | PWA Testing e instalación | ✅ 100% | 27-29 Ene |

**Estado final:** 15/16 fases = 93.75% completado

**Sistema ScanYA PWA (87.5% completado)**
- Autenticación dual: Email+Password (dueños/gerentes) / Nick+PIN (empleados)
- Sistema de turnos: Apertura/cierre con estadísticas (ventas, horas, puntos otorgados)
- Registrar ventas: Identificar cliente, validar cupones, otorgar puntos
- Sistema de puntos CardYA con niveles (Bronce/Plata/Oro)
- Multiplicadores de puntos: 1.0x / 1.2x / 1.5x según nivel
- Validación de cupones: Descuento % y $ aplicados automáticamente
- Vouchers: Listar pendientes entrega y validar canje
- Recordatorios offline: Guardar ventas sin conexión con auto-sincronización
- Sistema completo de permisos por rol (dueño/gerente/empleado)
- PWA instalable: iOS, Android y Desktop con Service Worker
- Sesiones independientes: Tokens `sy_*` separados de `ay_*`
- Upload directo a Cloudflare R2 para fotos de tickets
- Historial de transacciones filtrado por rol y periodo
- Dashboard con indicadores rápidos y resumen de turno
- 23 endpoints API REST backend
- 18 componentes React frontend
- 3 hooks personalizados (useOnlineStatus, useOfflineSync, useRedirectScanYAPWA)

**Sistema de Guardados (Favoritos) - Fase 5.3.3**
- Tabla separada `guardados` independiente de `votos`
- **Decisión arquitectónica:** Separación SRP (Single Responsibility Principle)
  - `votos` = calificaciones públicas (afectan métricas del negocio)
  - `guardados` = colección privada (solo para el usuario)
- Hook `useGuardados` con actualizaciones optimistas
- Tabs separados: Ofertas guardadas / Negocios guardados
- Endpoint `/api/guardados` con filtros por tipo
- Paginación infinita (20 items por carga)
- Eliminación optimista con reversión automática si falla

**Migración Infraestructura Cloud**
- Backend: Railway ($5/mes) → Render Free Tier ($0/mes)
- Base de datos: Railway PostgreSQL ($7/mes) → Supabase Free ($0/mes)
- Emails: Zoho ($3/mes) → AWS SES Sandbox ($0/mes)
- Fotos tickets: Cloudinary → Cloudflare R2 ($0/mes, 10GB gratis)
- Total stack: 9 servicios operando en free tier

### 🔄 Cambiado

- Base de datos: 42 tablas → **65 tablas** (+23 tablas nuevas para ScanYA)
- Agregados 17 campos a tablas existentes
- Creados 8 índices nuevos para optimización
- Service Worker: Estrategia cache-first para offline
- Sistema de roles: Ahora soporta Dueño/Gerente/Empleado
- Middleware de autenticación: 4 niveles de permisos implementados

### 🐛 Corregido

**Bug Crítico #1: Token Hydration Logout Fantasma**
- Síntoma: Logout automático al cargar la app en App.tsx
- Causa: `useEffect` con dependencia vacía ejecutaba logout antes de hidratación
- Solución: Mover `checkAuthStatus()` a Router raíz después de hidratación
- Líneas modificadas: 12 líneas en App.tsx

**Bug Crítico #2: Sync localStorage entre Pestañas**
- Síntoma: Logout en ScanYA cerraba sesión en AnunciaYA principal
- Causa: Event `storage` disparaba en TODAS las pestañas sin discriminar contexto
- Solución: Ignorar eventos `storage` si pathname empieza con `/scanya`
- Líneas modificadas: 4 líneas críticas en useAuthStore.ts

**Bug Crítico #3: Service Worker Redirección Innecesaria**
- Síntoma: PWA abría en `/` en lugar de `/scanya/login`
- Causa: SW interceptaba navegación y redirigía erróneamente
- Solución: Remover lógica redirección, solo cachear recursos
- Líneas modificadas: Completa reescritura sw-scanya.js

**Bug Crítico #4: Instalación PWA desde Ruta Incorrecta**
- Síntoma: Chrome ignoraba `start_url` del manifest si se instalaba desde `/inicio`
- Causa: Navegador toma URL actual como start_url si no es controlable
- Solución: Hook `useRedirectScanYAPWA` con 4 métodos de detección PWA
- Archivos creados: useRedirectScanYAPWA.ts (85 líneas)

**Bug Crítico #5: beforeinstallprompt No Disparaba**
- Síntoma: Banner instalación PWA no aparecía
- Causa: Manifest dinámico via JavaScript no funciona en Chrome
- Solución: Manifest estático permanente en `<head>` del index.html

**Bug #6: Sesiones NO Independientes**
- Síntoma: Tokens AnunciaYA y ScanYA compartidos causaban conflictos
- Solución: Arquitectura completa separación (prefijos `ay_*` vs `sy_*`)

### 📚 Documentación Técnica Generada

Durante este sprint se generaron **8 documentos técnicos** con ~27,420 líneas totales:

| Documento | Líneas | Propósito |
|-----------|--------|-----------|
| Fase 13 Recordatorios Offline | 1,772 | Sistema offline completo con Service Worker |
| Sistema PWA ScanYA | 2,019 | Roadmap PWA + instalación multiplataforma |
| Migración PostgreSQL → Supabase | 1,054 | Proceso completo de migración cloud |
| Inventario Credenciales | 2,905 | 9 servicios cloud configurados ($0/mes) |
| Modal Registrar Venta | 850 | Acordeón otorgar puntos con UX optimizada |
| Historial Transacciones | 720 | Historial completo + validación vouchers |
| Checklist ScanYA (13/16 fases) | 2,100 | Validación exhaustiva pre-producción |
| Bitácora Desarrollo Completa | ~15,000 | Log detallado 17-29 enero |
| **TOTAL** | **~27,420** | **8 documentos técnicos** |

**Nota:** Esta documentación se encuentra en la carpeta del proyecto para referencia técnica detallada.

### 📊 Métricas del Sprint

**Progreso:**
- Progreso global: 60% → 81% (+21 puntos porcentuales)
- Fases completadas: Fase 5.5 ScanYA (87.5%)

**Desarrollo:**
- Duración: 12 días calendario (17-29 enero)
- Horas activas: ~74 horas
- Promedio diario: ~6 horas/día

**Código:**
- Backend: ~4,850 líneas (8 archivos nuevos)
- Frontend: ~4,500 líneas (18 componentes + 3 hooks)
- Types/Utils: ~1,300 líneas (tipos + service)
- Total nuevo código: **~10,650 líneas**

**Testing:**
- Tests ejecutados: 99
- Tests pasados: 99 (100%)
- Endpoints testeados: 23/23 (100%)
- Bugs encontrados: 14
- Bugs resueltos: 14 (100%)
- Bugs críticos: 5 (todos resueltos)

**Infraestructura:**
- Costo mensual anterior: $15-20/mes
- Costo mensual nuevo: $0/mes
- Ahorro anual proyectado: **$180-240/año**

**PWA Testing:**
- Plataformas testeadas: 3 (Chrome Desktop, Safari iOS, Chrome Android)
- Tests de instalación: 13/13 pasados (100%)
- Service Worker: Operativo en todas las plataformas
- Detección PWA con 4 métodos de fallback
- Manifest estático permanente en `<head>`
- Estrategia cache-first para funcionamiento offline

---

## [07-16 Enero 2026] - Sprint Business Studio

### ✨ Agregado

**Dashboard (Fase 5.4)**
- KPIs principales y secundarios
- Gráfica de ventas
- Actividad reciente
- 7 endpoints backend

**CRUD Catálogo (Fase 5.4.1)**
- Lista de productos/servicios del negocio
- Modal crear/editar artículo (6 campos + imágenes)
- Upload múltiple de imágenes a Cloudinary
- Filtros: por tipo (producto/servicio) y categoría
- Toggle activo/inactivo con actualización optimista
- Vista previa pública `/p/articulo/:id`
- Selector de sucursales (asignación N:N)

**CRUD Ofertas (Fase 5.4.2)**
- Dashboard con 5 contadores de estado
- Lista de ofertas con filtros avanzados
- Modal crear/editar oferta con 6 tipos:
  - 2x1, 3x2, Descuento %, Descuento $, Envío gratis, Otro
- Configuración días y horarios de vigencia
- Función duplicar oferta existente
- Sistema de activación/desactivación optimista
- Vista previa pública `/p/oferta/:id`
- Métricas por oferta (vistas, compartidos)

**Mi Perfil - Business Studio (Fase 5.4)**
- Tab "Datos del Negocio" con panel CardYA integrado
- Tab "Contacto" (teléfono, WhatsApp, Facebook, Instagram)
- Tab "Ubicación" con mapa Leaflet interactivo
- Tab "Horarios" con soporte 24/7, cerrado y break/comida
- Tab "Imágenes" (logo, portada, galería hasta 10 fotos)
- Tab "Operación" (métodos pago, envío domicilio, servicio domicilio)

### 🔄 Cambiado

- Servicio `negocioManagement.service.ts`: Agregadas 15 funciones CRUD reutilizables
- Interceptor Axios: Ahora inyecta `sucursalId` automáticamente en modo comercial
- Tabla `articulos`: Agregado campo `subcategoria_id`
- Sistema de imágenes: Ahora soporta múltiples fotos por artículo

### 🐛 Corregido

- Toggle activo/inactivo ahora muestra estado correcto inmediatamente
- Upload de imágenes no duplica archivos en Cloudinary
- Filtros de catálogo preservan estado al cambiar de tab
- Validación horarios: No permite crear horarios superpuestos

### 📊 Métricas del Sprint

**Desarrollo:**
- Duración: 9 días (7-16 enero)
- Módulos BS completados: 4/15 (27%)
  - Dashboard ✅
  - Mi Perfil ✅
  - Catálogo ✅
  - Ofertas ✅

**Código:**
- Componentes nuevos: 12
- Endpoints API: 8
- Total líneas: ~3,500

**Funcionalidad:**
- Dashboard: 100% operativo
- Catálogo: 100% operativo
- Ofertas: 100% operativo
- Mi Perfil: 100% operativo

---

## [06 Enero 2026] - Decisiones Arquitectónicas

### 🔄 Cambiado

**Decisión Arquitectónica - Negocios Solo Físicos**
- Eliminado tipo de negocio "Online" del sistema
- Todos los negocios requieren ubicación física obligatoria
- Agregados campos `tiene_servicio_domicilio` y `tiene_envio_domicilio` en `negocio_sucursales`
- Eliminada columna `requiere_direccion` (redundante)
- Justificación: Usuarios sin local físico pueden usar Empleos/MarketPlace (gratis)
- CardYA requiere escaneo presencial en punto de venta físico
- Documentación generada: `Eliminación_de_Negocios_Online.md`

**Optimización de Imágenes Client-Side**
- Compresión automática antes de subir a Cloudinary
- Logo: 500px max, quality 0.85, formato WebP
- Portada: 1600px max, quality 0.85, formato WebP
- Galería: 1200px max, quality 0.85, formato WebP
- Productos: 800px max, quality 0.85, formato WebP
- Beneficios:
  - Reduce costos de almacenamiento Cloudinary
  - Acelera tiempo de carga en frontend
  - Mejora experiencia en conexiones lentas

**Upload Diferido (Optimista)**
- Preview instantáneo con `URL.createObjectURL()` sin esperar upload
- Upload a Cloudinary solo al confirmar paso/formulario
- Evita imágenes huérfanas en servidor
- UX optimista: interfaz "snappy" sin esperas

**Validación Flexible de Productos**
- Guardar borrador: Mínimo 1 producto
- Publicar negocio: Mínimo 3 productos completos
- Permite trabajo incremental sin forzar completitud prematura

### 📊 Métricas

**Decisiones implementadas:** 4  
**Archivos de documentación generados:** 1  
**Impacto:** Simplificación del sistema y mejora de UX

---

## [02-06 Enero 2026] - Sprint Negocios Directorio + Sistema Compartir

### ✨ Agregado

**Negocios Directorio (Fase 5.3)**
- Lista de negocios con geolocalización PostGIS
- Ordenamiento por distancia (cercanos primero)
- Filtros por categoría y subcategoría dinámica
- Búsqueda por nombre de negocio
- Vista mapa con marcadores Leaflet
- Perfil completo del negocio:
  - Galería de imágenes
  - Horarios de atención
  - Métodos de pago
  - Catálogo de productos/servicios
  - Información de contacto
- Sistema de "Seguir" (campanita) - Items seguidos se guardan en "Mis Guardados"
- Métricas de interacción (likes, visitas, rating)

**Sistema Compartir Base (Fase 5.3.1)**
- Componente `DropdownCompartir.tsx` reutilizable
- Banner registro para usuarios no logueados
- Layout público sin navbar principal
- Hook `useOpenGraph` para metadatos dinámicos
- Rutas públicas implementadas:
  - `/p/negocio/:id` - Perfil negocio
  - `/p/articulo/:id` - Detalle artículo
  - `/p/oferta/:id` - Detalle oferta

**Auth Opcional + ModalAuthRequerido (Fase 5.3.2)**
- Modal "Inicia sesión para continuar" con beneficios claros
- Sistema de redirección post-login a ruta original
- Contenido público visible sin login
- CTAs estratégicos para registro/descarga app

### 🔄 Cambiado

- Backend ahora calcula distancia en kilómetros (PostGIS)
- Filtros de negocios ahora son dinámicos (subcategorías por categoría)

### 🐛 Corregido

- PostGIS retornaba coordenadas en formato WKB binario → Usar `ST_X()/ST_Y()`
- Mapa Leaflet no centraba en ubicación correcta del negocio
- Botón "Seguir" permitía duplicados al hacer click rápido

### 📊 Métricas del Sprint

**Duración:** 5 días (2-6 enero)

**Código:**
- Componentes nuevos: 8
- Endpoints API: 5
- Total líneas: ~2,800

---

## [26 Diciembre 2024] - Fase 5.2 Toggle UI + Protección Rutas

### ✨ Agregado

**Sistema de Modos (Frontend)**
- Componente `ToggleModoUsuario.tsx` reutilizable (cambio directo sin modal)
- Modal `ModalCambiarModo.tsx` (solo cuando usuario accede a /business/* por URL directa estando en modo Personal)
- Guard `ModoGuard.tsx` para protección de rutas

**Componentes Dinámicos por Modo:**
- Navbar: Toggle + items dinámicos + avatar dinámico (personal/negocio)
- MenuDrawer: Toggle + secciones por modo
- ColumnaIzquierda: Contenido adaptado al modo activo
- BottomNav: Market ↔ Business según modo

**Backend:**
- Migración: Campo `foto_perfil` en `negocio_sucursales`
- Función `obtenerDatosNegocio()` en negocios service
- Datos del negocio incluidos en respuestas JWT
- Nuevo token generado al cambiar modo

### 🔄 Cambiado

- Store `useAuthStore`: Agregada función `cambiarModo()` + campos negocio
- Router: Guards aplicados en rutas `/business/*` y `/inicio/*`
- Login: Ahora respeta último modo usado por usuario

### 📊 Métricas

**Decisiones Arquitectónicas:**
- Multi-dispositivo: Sesiones independientes
- Notificaciones: Solo modo activo recibe
- Token JWT: Se renueva al cambiar modo

---

## [20-26 Diciembre 2024] - Fase 5.1 Onboarding Completo

### ✨ Agregado

**Frontend Onboarding (Fase 5.1.1)**
- Layout base con 8 pasos numerados
- Paso 1: Categorías (selección múltiple)
- Paso 2: Ubicación (mapa Leaflet + GPS)
- Paso 3: Contacto (lada editable internacional)
- Paso 4: Horarios (24/7, cerrado, break/comida)
- Paso 5: Imágenes (logo, portada, galería - Cloudinary)
- Paso 6: Métodos de Pago (efectivo, tarjeta, transferencia)
- Paso 7: Puntos CardYA (toggle activación)
- Paso 8: Productos/Servicios (CRUD completo)
- Sistema de finalización funcional
- Botón "Anterior" ahora guarda cambios

**Backend Onboarding (Fase 5.0 + 5.1)**
- 15 endpoints REST para onboarding
- Sistema de sucursales implementado
- Migración BD: Tablas reestructuradas para multi-sucursal
- Middleware `verificarNegocio` y `validarAccesoSucursal`

### 🐛 Corregido

**Bug #1:** PostGIS retornaba WKB binario → Usar `ST_X()/ST_Y()`  
**Bug #2:** Lada mostraba 3 dígitos → Función específica por país  
**Bug #3:** Imágenes huérfanas en Cloudinary → Upload diferido  
**Bug #4:** Error 400 snake_case → Usar camelCase en requests  
**Bug #5:** Duplicación productos → DELETE + INSERT en vez de UPDATE  
**Bug #6:** Finalizar no funcionaba → Lógica completa implementada  
**Bug #7:** `/auth/yo` devolvía false → Consultar tabla negocios  
**Bug #8:** Loop infinito redirección → Flag sessionStorage

### 📊 Métricas

**Duración:** 7 días (20-26 diciembre)

**Código:**
- Frontend: ~4,000 líneas
- Backend: ~1,000 líneas
- Total: **~5,000 líneas**

**Endpoints creados:** 8 nuevos

**Bugs resueltos:** 8 (todos críticos para onboarding)

---

## [21 Diciembre 2024] - Fase 5.1.0 Estandarización Nomenclatura

### 🔄 Cambiado

**Parte 1: Drizzle Snake Case**
- Configurado Drizzle con `casing: 'snake_case'`
- Conversión automática camelCase ↔ snake_case
- Base de datos permanece en snake_case
- TypeScript permanece en camelCase

**Parte 2: API Responses en Inglés**
- 439 cambios de español a inglés
- Estructura estandarizada: `{ success, data, message }`
- Mensajes de error en español (user-facing)
- Nombres de campos en inglés (machine-readable)

### 🐛 Corregido

- Rate Limiter ajustado: 1000 dev, 100 prod
- Redirección según `onboardingCompletado` corregida
- JWT ahora incluye `onboardingCompletado`

---

## [18-19 Diciembre 2024] - Cloudinary + GPS + BD

### ✨ Agregado

**Cloudinary Upload/Delete Optimista**
- Upload directo desde frontend
- Actualización optimista UI
- Reversión automática si falla
- Preset configurado: `anunciaya_uploads`

**GPS con Fallback**
- Prioridad 1: GPS nativo (alta precisión)
- Prioridad 2: WiFi triangulación
- Prioridad 3: IP geolocation
- Timeout 10 segundos

**Actualización Base de Datos**
- 42 tablas en 9 esquemas
- PostGIS para geolocalización
- Índices optimizados para búsquedas

---

## [Diciembre 2024] - Fase 4 Frontend Base + Auth

### ✅ Completado

**Infraestructura Frontend:**
- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Zustand para state management
- React Router v7
- Axios con interceptores

**Sistema de Autenticación:**
- Login/Registro con validación
- JWT con refresh tokens
- Protección de rutas
- Persistencia de sesión
- Multi-dispositivo

**Componentes Base:**
- Navbar responsive
- Sidebar/Drawer navegación
- BottomNav móvil
- Layout principal
- Sistema de notificaciones personalizado

---

## [Noviembre-Diciembre 2024] - Fases 1-3 Fundamentos

### ✅ Completado

**Fase 1: Monorepo**
- Estructura pnpm workspace
- Configuración TypeScript
- ESLint + Prettier
- Scripts de desarrollo

**Fase 2: Base de Datos**
- PostgreSQL con Drizzle ORM
- PostGIS para geolocalización
- MongoDB para ChatYA (preparado)
- Redis para caché/sesiones (preparado)
- 42 tablas iniciales diseñadas

**Fase 3: Backend Core + Auth**
- Express + TypeScript
- Sistema JWT completo
- Middleware de autenticación
- Rate limiting
- CORS configurado
- Endpoints auth base:
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`
  - GET `/api/auth/yo`
  - POST `/api/auth/recuperar-password`
  - POST `/api/auth/restablecer-password`
- Google OAuth implementado

---

## 📝 Notas de Versionamiento

### Formato de Fechas
- Se usa formato `[DD-DD Mes YYYY]` para sprints multi-día
- Se usa formato `[DD Mes YYYY]` para cambios de un solo día

### Secciones Utilizadas
- **✨ Agregado** - Para funcionalidades nuevas
- **🔄 Cambiado** - Para cambios en funcionalidad existente
- **🐛 Corregido** - Para corrección de bugs
- **📊 Métricas** - Para datos cuantitativos del sprint
- **📚 Documentación** - Para documentación técnica generada
- **🗑️ Eliminado** - Para features removidas (no usado aún)
- **⚠️ Deprecated** - Para features que se eliminarán (no usado aún)

### Principios de Documentación
- Orden cronológico inverso (más reciente primero)
- Lenguaje claro y ejecutivo
- Sin código técnico en changelog
- Métricas cuantificables cuando sea posible
- Bugs críticos documentados con solución
- Referencias a documentación técnica detallada en carpeta ARQUITECTURA

---

**Última actualización:** 5 Febrero 2026