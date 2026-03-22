# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 20 Marzo 2026
> **Progreso global:** 95% completado
> **Fase actual:** ChatYA ✅ 100% completado — próximo: BS Alertas / Cupones

---

## 📊 Estado Global

| Bloque | Progreso | Tiempo Estimado |
|--------|----------|-----------------|
| **Fundamentos** (Fases 1-4) | ✅ 100% | - |
| **Backend + Negocios** (5.0-5.3) | ✅ 100% | - |
| **Business Studio** (5.4) | ⏳ 53% (8/15 módulos) | ~15 días |
| **ScanYA + PWA** (5.5) | ✅ 100% | Fase 14 completada (7 Mar 2026) |
| **ChatYA** (5.10) | ✅ 100% (Sprint 7 completado — 20 Mar 2026) | - |
| **Sistema Lealtad** (5.6-5.7) | ✅ 100% (Puntos + CardYA + Notificaciones) | - |
| **Secciones Públicas + BS** (6.x) | ⏳ 0% | ~3-4 semanas |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | ~1-2 semanas |

---

## 🎯 Q1-Q2 2026 Objetivos

**Q1 (Enero-Marzo):**
- [x] Sistema ScanYA completo
- [x] Migración cloud $0/mes
- [x] Business Studio Base (8/15 módulos) ✅ (7 Mar 2026)
- [ ] Business Studio 80% completo (12/15 módulos)
- [x] Sistema CardYA completo ✅ (12 Feb 2026)
- [x] Socket.io + Notificaciones tiempo real ✅ (12 Feb 2026)
- [x] Reseñas verificadas en PaginaPerfilNegocio ✅ (12 Feb 2026)
- [x] ChatYA base operativo ✅ (7 Mar 2026)

**Q2 (Abril-Junio):**
- [ ] Business Studio 100% (15/15 módulos)
- [ ] Todas las secciones públicas activas
- [ ] Panel Admin funcional
- [ ] Beta 50 negocios exitosa
- [ ] Lanzamiento público
- [ ] 100+ negocios registrados

---

## ✅ Sprints Completados

| Sprint | Descripción | Fecha |
|--------|-------------|-------|
| Sprint 1 | BS Puntos Config + Expiración + Recompensas | 5 Feb 2026 |
| Sprint 2 | CardYA + Socket.io + Notificaciones + Reseñas públicas | 12 Feb 2026 |
| Sprint 3 | BS Clientes + Transacciones + Opiniones | 7 Mar 2026 |
| Sprint 4 | Rediseño PanelNotificaciones + deep links + cleanup | 20 Mar 2026 |
| Sprint 5 | ChatYA Sprint 7: OG Previews + Testing E2E (51 tests) | 20 Mar 2026 |

> Detalle completo en el CHANGELOG.

---

## 🚀 En Progreso y Próximos Sprints

### ✅ Completado: 5.10.- ChatYA — 100% (20 Mar 2026)

**Sistema de mensajería tiempo real completo**

**7 Sprints internos completados (7/7):**
- [x] Sprint 1: Base de datos — 6 tablas PostgreSQL (13 Feb)
- [x] Sprint 2: Backend Core — 13 endpoints + 11 eventos Socket.io (15-17 Feb)
- [x] Sprint 3: Backend Complementario — contactos, bloqueo, reacciones, búsqueda full-text (18-19 Feb)
- [x] Sprint 4: Frontend Core — store, overlay, lista conversaciones, burbujas, tiempo real (20-22 Feb)
- [x] Sprint 5: Frontend Complementario — buscador, menú contextual, reacciones, contactos, archivados (23-25 Feb)
- [x] Sprint 6: Multimedia — imágenes, audio, documentos, ubicación, R2, rendimiento (26 Feb - 5 Mar)
- [x] Sprint 7: Pulido — escribiendo, palomitas, estados, sonido, OG previews, testing (5-20 Mar)

**Testing:**
- 41 API tests (Vitest) — endpoints, lógica de negocio
- 10 E2E tests (Playwright) — flujos de UI en navegador real
- Comando: `cd apps/api && npm test` + `cd apps/web && JWT_SECRET=<secret> npx playwright test`

**Integraciones:**
- [x] ScanYA — empleados responden como el negocio; badge no leídos en IndicadoresRapidos
- [x] PaginaPerfilNegocio — botón "Enviar mensaje" + perfil embebido en PanelInfoContacto

**Nota:** ChatYA usa PostgreSQL (no MongoDB). Prerequisito para MarketPlace, Empleos, Dinámicas — ✅ desbloqueado

---

### Sprint actual: BS Alertas + Cupones

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

### Business Studio - Módulos Pendientes (7/15)

**Completados (8/15):**
- ✅ Dashboard
- ✅ Mi Perfil
- ✅ Catálogo
- ✅ Ofertas
- ✅ Puntos (Config + Expiración + Recompensas)
- ✅ Transacciones (7 Mar 2026)
- ✅ Clientes (7 Mar 2026)
- ✅ Opiniones (7 Mar 2026)

**Pendientes (7/15):**

**🟢 Disponibles ahora:**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 1 | **Alertas** | ~1 día | - | Notificaciones configurables (ventas, cupones) |
| 2 | **Cupones** | ~3 días | ScanYA ✅ | CRUD cupones, validación, cuponera usuario |
| 3 | **Empleados** | ~2 días | ScanYA ✅ | Gestión empleados, Nick+PIN, permisos |
| 4 | **Reportes** | ~3 días | ScanYA ✅ | Ventas, productos top, horarios pico, export |
| 5 | **Sucursales** | ~2 días | - | Gestión multi-sucursal completa |

**🔴 Bloqueados (esperan otras secciones):**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 6 | **Rifas** | ~2 días | Dinámicas (pendiente) | Gestión rifas del negocio |
| 7 | **Vacantes** | ~2 días | Empleos (pendiente) | Publicar/gestionar ofertas de empleo |

**Total estimado:** ~15 días (distribuidos en múltiples sprints)

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
| Sprint 1-6 (Sistema Lealtad + Chat) | ✅ Completado |
| Secciones Públicas (6.0-6.3) | ~10-13 días |
| BS Módulos Pendientes (7/15) | ~15 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~6-8 semanas** |
| **TOTAL REALISTA** | **~8-10 semanas** |

**Fecha lanzamiento público proyectada:** Abril-Mayo 2026

---

## 📝 Dependencias Críticas

**ChatYA ✅ completado — ya no es bloqueante:**
- MarketPlace (contactar vendedor) — desbloqueado
- Empleos (aplicar/contratar) — desbloqueado
- Dinámicas (organizar rifas) — desbloqueado

**ScanYA ✅ completado — desbloqueó:**
- Opiniones (validar compras) — ✅ completado
- Clientes + Transacciones (datos) — ✅ completado
- Reportes (métricas) — pendiente

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

**Fecha:** 20 Marzo 2026  
**Alcance:** Re-evaluar después de completar ChatYA Sprint 7 (Open Graph + Testing) y definir siguiente módulo BS

---

**Fin del Roadmap**