# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 12 Febrero 2026  
> **Progreso global:** 87% completado  
> **Fase actual:** 5.8 Clientes + Transacciones BS (siguiente)

---

## 📊 Estado Global

| Bloque | Progreso | Tiempo Estimado |
|--------|----------|-----------------|
| **Fundamentos** (Fases 1-4) | ✅ 100% | - |
| **Backend + Negocios** (5.0-5.3) | ✅ 100% | - |
| **Business Studio** (5.4) | ⏳ 33% (5/15 módulos) | ~24 días |
| **ScanYA + PWA** (5.5) | ✅ 93.75% | Fase 14 pausada (ChatYA) |
| **Sistema Lealtad** (5.6-5.7) | ✅ 100% (Puntos + CardYA + Notificaciones) | - |
| **Secciones Públicas + BS** (6.x) | ⏳ 0% | ~3-4 semanas |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | ~1-2 semanas |

---

## 🎯 Q1-Q2 2026 Objetivos

**Q1 (Enero-Marzo):**
- [x] Sistema ScanYA completo
- [x] Migración cloud $0/mes
- [x] Business Studio Base (5/15 módulos)
- [ ] Business Studio 80% completo (12/15 módulos)
- [x] Sistema CardYA completo ✅ (12 Feb 2026)
- [x] Socket.io + Notificaciones tiempo real ✅ (12 Feb 2026)
- [x] Reseñas verificadas en PaginaPerfilNegocio ✅ (12 Feb 2026)
- [ ] ChatYA base operativo

**Q2 (Abril-Junio):**
- [ ] Business Studio 100% (15/15 módulos)
- [ ] Todas las secciones públicas activas
- [ ] Panel Admin funcional
- [ ] Beta 50 negocios exitosa
- [ ] Lanzamiento público
- [ ] 100+ negocios registrados

---

## 🚀 Próximos Sprints

### Sprint 1: BS > 5.6.- Puntos Config ✅ COMPLETADO (5 Feb 2026)

**Objetivo:** Permitir a dueños configurar sistema de puntos sin tocar código

**Implementado:**
- [x] Configurar valor del punto (1 punto = $X pesos)
- [x] Activar/desactivar niveles CardYA
- [x] Configurar multiplicadores (Bronce/Plata/Oro)
- [x] Configurar expiración de puntos y vouchers
- [x] CRUD completo de recompensas
- [x] Sistema de expiración en tiempo real (sin cron jobs)
- [x] Auto-reembolso de puntos en vouchers vencidos
- [x] Manejo correcto de zona horaria del negocio

**Pendiente para futuro sprint:**
- [ ] Simulador acumulación puntos
- [ ] Dashboard estadísticas puntos otorgados
- [ ] Modal QR instalación ScanYA para empleados

---

### Sprint 2: 5.7.- CardYA + Socket.io + Notificaciones ✅ COMPLETADO (12 Feb 2026)

**Objetivo:** Sistema de lealtad completo para clientes + Notificaciones tiempo real

**CardYA Implementado:**
- [x] 8 endpoints backend (billeteras, recompensas, vouchers, historial)
- [x] 10 componentes frontend (página con tabs, cards, modales, tablas)
- [x] Store Zustand + Service API con optimistic updates
- [x] Sistema de niveles Bronce/Plata/Oro por negocio
- [x] Canje de recompensas → genera voucher con QR
- [x] Historial de compras y canjes paginado
- [x] Widget CardYA en columna izquierda
- [x] Bug crítico corregido en cardya_controller.ts (obtenerUsuarioId)

**Socket.io + Notificaciones Implementado:**
- [x] Socket.io backend con rooms personales por usuario
- [x] 7 tipos de notificación activos (puntos, vouchers, ofertas, reseñas, stock)
- [x] Panel notificaciones con badge "9+" y deep linking
- [x] Navegación contextual desde notificaciones (sucursalId)
- [x] Efecto glow en recompensas destacadas

**Reseñas en PaginaPerfilNegocio:**
- [x] Backend completo (schema, service, controller, routes)
- [x] Verificación compra últimos 90 días para reseñar
- [x] Modal escribir reseña (estrellas 1-5 + texto 500 chars)
- [x] Métricas UPSERT (promedio + total)
- [x] Notificación al dueño cuando recibe reseña

**Contadores ScanYA:**
- [x] Polling 30s para vouchers pendientes (badge)
- [x] Fix parpadeo modal vouchers

---

### Sprint 3: 5.8.- Clientes + Transacciones BS (~3 días)

**Objetivo:** Dueños ven su base de clientes y transacciones

**Features Core:**
- Lista clientes que han comprado
- Historial completo transacciones
- Filtros: fecha, sucursal, nivel CardYA
- Exportar reportes CSV
- Detalle por cliente (visitas, puntos, nivel)

**Criterios de Éxito:**
- [ ] Base de clientes visible
- [ ] Filtros operativos
- [ ] Export CSV funcional

---

### Sprint 4: 5.9.- Opiniones/Reseñas BS (~2 días) - Backend ✅ Listo

**Objetivo:** Gestionar reseñas de clientes desde BS y ScanYA

**Ya Implementado (12 Feb 2026):**
- [x] Backend completo (schema, service, controller, routes)
- [x] Validación compra últimos 90 días ✅
- [x] Crear reseña desde PaginaPerfilNegocio ✅
- [x] Métricas UPSERT automático ✅
- [x] Notificación al dueño ✅

**Pendiente:**
- [ ] Ver reseñas con calificación ⭐ 1-5 en Business Studio
- [ ] Responder desde BS (web) y ScanYA (móvil)
- [ ] Dashboard métricas (promedio, total)
- [ ] Templates respuesta pre-escritos

**Criterios de Éxito:**
- [x] Validación compras operativa ✅
- [ ] Respuestas desde ambos sistemas

**Dependencia:** Requiere tabla `transacciones` de ScanYA

---

### Sprint 5: 5.10.- ChatYA Base (~4 días)

**Objetivo:** Sistema de mensajería tiempo real

**Features Core:**
- Mensajería tiempo real (Socket.io + MongoDB)
- Estados: enviado → entregado → leído
- Upload imágenes optimista (Cloudinary)
- Identidad por modo (Personal/Comercial)
- Contexto por sección (Negocios/MarketPlace/Ofertas)
- Lista conversaciones + chats fijados

**Criterios de Éxito:**
- [ ] Mensajes tiempo real operativos
- [ ] Upload imágenes funciona
- [ ] Identidad cambia según modo

**Nota:** Prerequisito para MarketPlace, Empleos, Dinámicas

---

### Sprint 6: 5.11.- Cupones Sistema (~3 días)

**Objetivo:** Sistema de cupones temporales con validación

**Features Core:**
- CRUD cupones en BS (%, $, 2x1)
- Vista pública `/p/cupon/:codigo`
- Validación en ScanYA con QR
- Cuponera usuario `/mis-cupones`
- Notificaciones expiración
- Filtros: Vigentes/Usados/Expirados

**Criterios de Éxito:**
- [ ] CRUD operativo
- [ ] Validación ScanYA funcional
- [ ] Notificaciones disparan

**Diferencia vs Ofertas:** Cupones son temporales, 1 uso, personales

---

## 📅 Backlog Priorizado

### Business Studio - Módulos Pendientes (10/15)

**Completados (5/15):**
- ✅ Dashboard
- ✅ Mi Perfil  
- ✅ Catálogo
- ✅ Ofertas
- ✅ Puntos (Config + Expiración + Recompensas)

**Pendientes (10/15):**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 2 | **Transacciones** | ~1 día | ScanYA ✅ | Historial completo de ventas con filtros |
| 3 | **Clientes** | ~2 días | ScanYA ✅ | Base de clientes, visitas, puntos, nivel |
| 4 | **Opiniones** | ~3 días | Transacciones + Clientes | Ver y responder reseñas desde BS y ScanYA |
| 5 | **Alertas** | ~1 día | - | Notificaciones configurables (ventas, cupones) |
| 8 | **Cupones** | ~3 días | ScanYA ✅ | CRUD cupones, validación, cuponera usuario |
| 9 | **Puntos** | ✅ Completado | - | Config base + expiración + recompensas (5 Feb 2026) |
| 10 | **Rifas** | ~2 días | Dinámicas | Gestión rifas del negocio |
| 11 | **Empleados** | ~2 días | ScanYA ✅ | Gestión empleados, Nick+PIN, permisos |
| 12 | **Vacantes** | ~2 días | Empleos | Publicar/gestionar ofertas de empleo |
| 13 | **Reportes** | ~3 días | ScanYA ✅ | Ventas, productos top, horarios pico, export |
| 14 | **Sucursales** | ~2 días | - | Gestión multi-sucursal completa |

**Total estimado:** ~24 días (distribuidos en múltiples sprints)

---

### Secciones Públicas (Fase 6.0-6.3)

**6.0 Ofertas Públicas** (~2 días)
- Feed público con geolocalización
- Ya existe backend, solo falta vista pública

**6.1 MarketPlace** (~4 días)
- Compra-venta entre usuarios (modo Personal)
- Requiere ChatYA completado

**6.2 Dinámicas/Rifas** (~4 días)
- 3 tipos: con puntos, con dinero, offline
- Requiere ChatYA + Sistema Puntos

**6.3 Empleos** (~3 días)
- Bidireccional: Ofertas empleo + Ofertas servicio
- Requiere ChatYA completado

---

### Panel Admin (Fase 6.7)

**Tiempo estimado:** ~2 semanas  
**Prioridad:** MEDIA-BAJA (post-lanzamiento)

**Funcionalidad:**
- Sistema de vendedores (niveles 1-5)
- Dashboard métricas globales
- Gestión negocios y usuarios
- Suscripciones y pagos (Stripe)
- Configuración dinámica de plataforma
- Reportes financieros

**Nota:** Se implementará después del lanzamiento beta

---

## 🚀 Fase 7: Lanzamiento

### 7.1 Pre-Lanzamiento (~5 días)

**Testing:**
- [ ] Testing E2E flujos completos
- [ ] Performance y optimización
- [ ] SEO y metadatos
- [ ] Analytics (Google/Mixpanel)
- [ ] Sentry (error tracking)

**Infraestructura:**
- [x] Migración a producción ✅
- [x] Stack $0/mes operativo ✅
- [ ] Stripe modo LIVE
- [ ] Dominio personalizado + SSL
- [ ] AWS SES salir de sandbox
- [ ] Backups automáticos

---

### 7.2 Beta Privada (~3 semanas)

**Objetivo:** 50 negocios pilotos

**Semana 1: Onboarding (15 negocios)**
- Embajadores registran pilotos
- Trial 7 días modo comercial gratis
- Capacitación presencial/remota
- Grupo WhatsApp soporte

**Semana 2: Expansión (25 negocios)**
- Segundo grupo invitado
- Feedback sesiones grupales
- Iteración bugs críticos
- Documentación FAQ

**Semana 3: Escala (10 negocios finales)**
- Completar cuota 50 negocios
- Testing stress múltiples usuarios
- Optimizaciones performance
- Preparación lanzamiento público

**Métricas de Éxito:**
- [ ] 80% completan onboarding
- [ ] 60% usan ScanYA activamente
- [ ] <5% abandono primera semana
- [ ] 90% satisfacción (NPS >50)
- [ ] <10 bugs críticos reportados

---

### 7.3 Lanzamiento Público (Abril-Mayo 2026)

**Pre-requisitos:**
- [ ] Beta completada exitosamente
- [ ] Todas las fases 5-6 al 100%
- [ ] Panel Admin operativo
- [ ] Documentación completa

**Estrategia:**
- Anuncio redes sociales
- Landing page SEO
- Campaña Google Ads
- Influencers locales
- Eventos presenciales
- Programa referidos

---

## ⏱️ Estimación Tiempo Total

| Fase | Tiempo Estimado |
|------|-----------------|
| Sprint 1-6 (Sistema Lealtad + Chat) | ~20-25 días |
| Secciones Públicas (6.0-6.3) | ~10-13 días |
| BS Módulos Pendientes (10/15) | ~24 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~12-14 semanas** |
| **TOTAL REALISTA** | **~14-16 semanas** |

**Fecha lanzamiento público proyectada:** Abril-Mayo 2026

---

## 📝 Dependencias Críticas

**ChatYA es bloqueante para:**
- MarketPlace (contactar vendedor)
- Empleos (aplicar/contratar)
- Dinámicas (organizar rifas)

**ScanYA es bloqueante para:**
- Opiniones (validar compras)
- Clientes + Transacciones (datos)
- Reportes (métricas)

---

## 🔄 Flexibilidad del Roadmap

Este roadmap es **adaptable** y se ajustará según:
- Feedback beta testers
- Demanda del mercado
- Recursos disponibles
- Bugs críticos emergentes

Los detalles técnicos de cada sprint se definen **durante el desarrollo**, no pre-desarrollo.

---

## 📅 Próxima Revisión

**Fecha:** 20 Febrero 2026  
**Alcance:** Re-evaluar después de Sprint 3-4 (Clientes/Transacciones + Opiniones BS)

---

**Fin del Roadmap**