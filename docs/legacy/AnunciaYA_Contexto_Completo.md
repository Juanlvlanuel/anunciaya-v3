# AnunciaYA — Contexto Completo del Producto

> Documento de referencia con toda la información sobre qué es AnunciaYA, hacia dónde va, y el estado actual del proyecto.
> Fecha: 18 Marzo 2026

---

## 1. ¿Qué es AnunciaYA?

Super-app para comercio local en México. Conecta negocios físicos con consumidores a través de un ecosistema de lealtad y puntos.

- **Developer:** Juan (solo developer)
- **Versión:** 3.0
- **Estado:** En desarrollo activo
- **Lanzamiento beta proyectado:** Abril-Mayo 2026

---

## 2. Modelo de Negocio

| Modo | Precio | Para quién |
|------|--------|------------|
| **Personal** | Gratis por siempre | Consumidores — descubren negocios, acumulan puntos, canjean recompensas |
| **Comercial** | $449 MXN/mes | Dueños de negocios — gestionan su comercio digital, otorgan puntos, fidelizan clientes |

- **Trial:** 7 días gratis para cuenta comercial
- **Pagos:** Stripe
- **Degradación automática:** Si la suscripción vence, el negocio se despublica pero los datos se preservan

---

## 3. Secciones de la App

### 5 Secciones Públicas

| Sección | Estado | Descripción |
|---------|--------|-------------|
| **Negocios** | ✅ Completada | Directorio geolocalizado de comercios con mapa, filtros, likes, follows, reseñas verificadas |
| **MarketPlace** | 🚧 Placeholder | Compra-venta P2P entre usuarios, 0 comisiones |
| **Ofertas** | 🚧 Placeholder | Cupones digitales, ofertas por tiempo limitado |
| **Dinámicas** | 🚧 Placeholder | Rifas y sorteos (con puntos, con dinero, offline) |
| **Empleos** | 🚧 Placeholder | Ofertas de empleo + ofertas de servicio bidireccional |

### 3 Secciones de Usuario

| Sección | Estado | Descripción |
|---------|--------|-------------|
| **CardYA** | ✅ 100% | Tarjeta de lealtad digital — una sola para todos los negocios. Acumula puntos, canjea recompensas, niveles Bronce/Plata/Oro |
| **ChatYA** | ✅ 96% | Mensajería 1:1 en tiempo real. Multimedia (imágenes, audio, docs, ubicación). Componente flotante, sin ruta dedicada |
| **Perfil** | ✅ Completada | Perfil de usuario con datos personales |

### 3 Secciones Comerciales

| Sección | Estado | Descripción |
|---------|--------|-------------|
| **Business Studio** | ⏳ 53% (8/15 módulos) | Panel de control completo para gestionar el negocio |
| **ScanYA** | ✅ 100% | POS con QR para registrar ventas y otorgar puntos. PWA con soporte offline |
| **Onboarding** | ✅ 100% | Wizard de 8 pasos para configurar el negocio |

---

## 4. Productos Principales

### CardYA — Sistema de Lealtad Digital
- **Qué es:** Tarjeta de puntos digital universal. Una sola tarjeta para todos los negocios
- **Cómo funciona:** El cliente escanea su QR en cada compra → acumula puntos automáticamente
- **Sistema de niveles:** Bronce → Plata → Oro (con multiplicadores de puntos)
- **Recompensas:** El negocio configura qué se puede canjear con puntos
- **Vouchers:** Al canjear, se genera un voucher que el negocio valida en tienda
- **Estado:** ✅ 100% Operacional (completado 12 Febrero 2026)

### ChatYA — Mensajería en Tiempo Real
- **Qué es:** Chat 1:1 entre cualquier usuario y negocio
- **Características:** Texto, imágenes, audio, documentos, ubicación, reacciones emoji
- **Indicadores:** "Escribiendo...", palomitas de entrega, estados de usuario (conectado/ausente/desconectado)
- **Integración:** Componente flotante en toda la app. Los empleados de ScanYA responden como el negocio
- **Tecnología:** Socket.io en tiempo real, archivos en Cloudflare R2
- **Estado:** ✅ 96% (falta Open Graph previews + E2E testing)

### ScanYA — Punto de Venta (POS)
- **Qué es:** App PWA para escanear QR de clientes y registrar ventas
- **Quién lo usa:** Empleados (con Nick+PIN) y dueños (con su cuenta)
- **Funciones:** Registrar ventas, otorgar puntos CardYA, validar cupones, gestionar turnos
- **Offline:** Funciona sin internet y sincroniza cuando hay conexión
- **Estado:** ✅ 100% Operativo (16/16 fases, completado 7 Marzo 2026)

### Business Studio — Panel de Administración
- **Qué es:** Centro de control completo para dueños de negocios
- **15 módulos:**

| # | Módulo | Estado | Descripción |
|---|--------|--------|-------------|
| 1 | Dashboard | ✅ | Métricas, ventas, clientes |
| 2 | Mi Perfil | ✅ | Datos del negocio, logo, portada, galería |
| 3 | Catálogo | ✅ | CRUD artículos, categorías |
| 4 | Ofertas | ✅ | Descuentos, promociones |
| 5 | Puntos | ✅ | Configuración CardYA, recompensas, expiración |
| 6 | Transacciones | ✅ | Historial de ventas desde ScanYA |
| 7 | Clientes | ✅ | Base de clientes con historial de compras |
| 8 | Opiniones | ✅ | Reseñas verificadas de clientes |
| 9 | Alertas | 🚧 | Notificaciones configurables |
| 10 | Cupones | 🚧 | CRUD cupones (%, $, 2x1), validación QR, cuponera usuario |
| 11 | Empleados | 🚧 | Gestión empleados, Nick+PIN, permisos |
| 12 | Reportes | 🚧 | Ventas, productos top, horarios pico, exportar |
| 13 | Sucursales | 🚧 | Gestión multi-sucursal |
| 14 | Rifas | 🔴 Bloqueado | Espera sección Dinámicas |
| 15 | Vacantes | 🔴 Bloqueado | Espera sección Empleos |

---

## 5. Características Técnicas Clave

### Geolocalización Global
- Auto-detección de ciudad (GPS → IP/WiFi)
- Todas las secciones filtran por ciudad del usuario
- PostGIS con `ST_DWithin` para búsquedas por radio
- Cambio manual de ciudad refresca todo instantáneamente

### Negocios Solo Físicos
- Todos los negocios requieren ubicación física (mapa obligatorio en onboarding)
- Opciones adicionales: servicio a domicilio, envío a domicilio

### Sistema de Modos
- 1 correo = 1 cuenta = 2 modos (Personal + Comercial)
- Toggle para alternar entre modos
- Comercial requiere pago ($449/mes) + onboarding completado

### Notificaciones en Tiempo Real
- Socket.io con rooms por usuario
- 14 tipos de notificación (puntos ganados, voucher generado, nueva oferta, nuevo cliente, stock bajo, nueva reseña, etc.)

### Upload de Imágenes
- Cloudinary: logo, portada, galería del negocio
- Cloudflare R2: artículos, ofertas, multimedia de chat
- Upload optimista con preview instantáneo
- Compresión client-side a WebP

---

## 6. Stack Técnico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19 + Vite + Tailwind v4 + Zustand |
| **Backend** | Express 5 + Node >=18 + Socket.io |
| **Base de datos** | PostgreSQL + PostGIS (Supabase, ~71 tablas) |
| **Cache** | Redis (Upstash, via ioredis) |
| **ORM** | Drizzle ORM + Zod (validación runtime) |
| **Imágenes** | Cloudinary + Cloudflare R2 |
| **Pagos** | Stripe |
| **Emails** | AWS SES |
| **Chat storage** | PostgreSQL (6 tablas) + Cloudflare R2 (multimedia) |

### Infraestructura — $0/mes

| Servicio | Proveedor | Tier |
|----------|-----------|------|
| Backend | Render | Free |
| Frontend | Vercel | Free |
| PostgreSQL | Supabase | Free (500 MB) |
| Redis | Upstash | Free (10K cmds/día) |
| Emails | AWS SES | Sandbox (200/día) |
| Imágenes perfil | Cloudinary | Free (25 GB/mes) |
| Multimedia | Cloudflare R2 | Free (10 GB, egress ilimitado) |
| Pagos | Stripe | Test mode |

---

## 7. Roadmap y Estado Actual

### Progreso Global: 93%

| Bloque | Progreso |
|--------|----------|
| Fundamentos (Fases 1-4) | ✅ 100% |
| Backend + Negocios (5.0-5.3) | ✅ 100% |
| ScanYA + PWA (5.5) | ✅ 100% |
| Sistema Lealtad (5.6-5.7) | ✅ 100% |
| ChatYA (5.10) | ⏳ 96% |
| Business Studio (5.4) | ⏳ 53% (8/15 módulos) |
| Secciones Públicas (6.x) | ⏳ 0% |
| Lanzamiento Beta (7.x) | ⏳ 50% |

### Siguiente Sprint
BS Alertas + Cupones

### Lo que falta para lanzar

| Fase | Tiempo estimado |
|------|-----------------|
| Secciones Públicas (Ofertas, MarketPlace, Dinámicas, Empleos) | ~10-13 días |
| BS Módulos Pendientes (7/15) | ~15 días |
| Pre-lanzamiento (testing, SEO, analytics, Stripe LIVE) | ~5 días |
| Beta privada (50 negocios pilotos) | ~21 días |
| **Total optimista** | **~6-8 semanas** |
| **Total realista** | **~8-10 semanas** |

---

## 8. Plan de Lanzamiento

### Beta Privada — 50 negocios pilotos

**Semana 1 (15 negocios):**
- Embajadores registran pilotos
- Trial 7 días gratis
- Capacitación presencial/remota
- Grupo WhatsApp soporte

**Semana 2 (25 negocios):**
- Segundo grupo
- Feedback sesiones grupales
- Iteración bugs críticos

**Semana 3 (10 negocios finales):**
- Completar cuota 50
- Testing stress
- Preparación lanzamiento público

**Métricas de éxito:**
- 80% completan onboarding
- 60% usan ScanYA activamente
- <5% abandono primera semana
- NPS >50

### Lanzamiento Público — Abril-Mayo 2026

**Estrategia:**
- Landing page SEO
- Campaña Google Ads
- Influencers locales
- Eventos presenciales
- Programa de referidos

---

## 9. El Flujo del Usuario

### Como Consumidor (Modo Personal — Gratis)
```
Registro → Descubre negocios cerca → Visita y compra →
Escanea CardYA en cada compra → Acumula puntos →
Canjea por recompensas → Participa en sorteos →
Chatea con negocios → Publica en Marketplace
```

### Como Comerciante (Modo Comercial — $449/mes)
```
Registro → Pago Stripe → Onboarding 8 pasos →
Negocio publicado en directorio → Clientes escanean QR →
Puntos se otorgan automáticamente → Gestiona todo desde Business Studio →
Ve reportes, clientes, transacciones → Crea ofertas y cupones →
Chatea con clientes por ChatYA
```

---

## 10. Onboarding Comercial — Los 8 Pasos

1. **Datos básicos** — Nombre, descripción del negocio
2. **Categoría** — Categoría y subcategoría
3. **Ubicación** — Mapa interactivo (obligatorio, solo negocios físicos)
4. **Horarios** — Días y horas de operación
5. **Fotos** — Logo, portada, galería
6. **Datos bancarios** — Para recibir pagos
7. **Términos** — Aceptación de políticas
8. **Resumen** — Revisión y publicación

---

## 11. Redes Sociales y Contacto

- **Facebook:** facebook.com/anunciaya
- **WhatsApp:** wa.me/526381234567

---

## 12. Imágenes Disponibles

| Archivo | Descripción |
|---------|-------------|
| `/logo-anunciaya.webp` | Logo principal (fondo transparente) |
| `/logo-anunciaya-azul.webp` | Logo variante azul |
| `/logo-anunciaya-blanco.webp` | Logo variante blanca |
| `/CardYA.webp` | Imagen CardYA |
| `/CardYABlanco.webp` | CardYA variante blanca |
| `/ChatYA.webp` | Imagen ChatYA |
| `/ScanYA.webp` | Imagen ScanYA |
| `/ScanYA-Blanco.webp` | ScanYA variante blanca |
| `/BusinessStudio.webp` | Imagen Business Studio |
| `/images/secciones/negocios-locales.webp` | Foto sección Negocios |
| `/images/secciones/marketplace.webp` | Foto sección Marketplace |
| `/images/secciones/ofertas.webp` | Foto sección Ofertas |
| `/images/secciones/dinamicas.webp` | Foto sección Dinámicas |
| `/images/onboarding/comunidad.webp` | Onboarding — comunidad |
| `/images/onboarding/marketplace.webp` | Onboarding — marketplace |
| `/images/onboarding/puntos.webp` | Onboarding — puntos |
| `/images/onboarding/sorteos.webp` | Onboarding — sorteos |
| `/images/onboarding/tarjeta.webp` | Onboarding — tarjeta |
| `/images/registro-hero.webp` | Hero de registro |
