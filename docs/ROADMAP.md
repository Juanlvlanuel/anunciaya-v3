# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 5 Abril 2026
> **Progreso global:** 98% completado
> **Fase actual:** BS Empleados ✅ — próximo: BS Reportes

---

## 📊 Estado Global

| Bloque | Progreso | Pendiente |
|--------|----------|-----------|
| **Landing Page** | ✅ 100% | - |
| **Autenticación** (registro, login, recuperación) | ✅ 100% | - |
| **Onboarding** (crear negocio) | ✅ 100% | - |
| **Backend + Negocios** (5.0-5.3) | ✅ 100% | - |
| **ScanYA + PWA** (5.5) | ✅ 100% | - |
| **ChatYA** (5.10) | ✅ 100% | - |
| **Sistema Lealtad + CardYA** (5.6-5.7) | ✅ 100% | - |
| **Promociones** (Ofertas + Cupones) | ✅ 100% | - |
| **Mis Cupones + Guardados** (UI) | ✅ 100% | - |
| **Business Studio** (5.4) | ⏳ 71% (10/14 módulos) | Reportes, Sucursales, Rifas, Vacantes |
| **Secciones Públicas** (6.x) | ⏳ 0% | Ofertas, MarketPlace, Dinámicas, Empleos |
| **Panel Admin** (6.7) | ⏳ 0% | ~2 semanas. Vendedores, métricas, gestión negocios/usuarios, Stripe, reportes |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | Stripe LIVE, dominio, testing, beta 50 negocios |

---

## 🎯 Objetivos por Trimestre

**Q1 (Enero-Marzo) — Cierre:**
- ✅ ScanYA, CardYA, Socket.io, Notificaciones, Reseñas, ChatYA, Promociones
- ✅ Business Studio 8/14 módulos
- ⏳ BS 80% (12/14) — no alcanzado, pasa a Q2

**Q2 (Abril-Junio) — Meta:**
- [ ] Business Studio 100% (14/14 módulos) — faltan: Reportes, Sucursales, Rifas, Vacantes
- [ ] Secciones públicas: Ofertas, MarketPlace, Dinámicas, Empleos
- [ ] Panel Admin funcional
- [ ] Beta privada: 50 negocios piloto
- [ ] Lanzamiento público
- [ ] Stripe modo LIVE + dominio + SSL

---

## ✅ Sprints Completados

| Sprint | Descripción | Fecha |
|--------|-------------|-------|
| Sprint 1 | BS Puntos Config + Expiración + Recompensas | 5 Feb 2026 |
| Sprint 2 | CardYA + Socket.io + Notificaciones + Reseñas públicas | 12 Feb 2026 |
| Sprint 3 | BS Clientes + Transacciones + Opiniones | 7 Mar 2026 |
| Sprint 4 | Rediseño PanelNotificaciones + deep links + cleanup | 20 Mar 2026 |
| Sprint 5 | ChatYA Sprint 7: OG Previews + Testing E2E (51 tests) | 20 Mar 2026 |
| Sprint 6 | Promociones: Ofertas + Cupones unificados + N+1 | 22 Mar 2026 |
| Sprint 7 | Rediseño Cupones/Guardados + ChatYA Cupones + Revocar/Reactivar | 23 Mar 2026 |
| Sprint 8 | Auditoría Recompensas/Sellos + Niveles condicional + Notificaciones | 1 Abr 2026 |
| Sprint 9 | BS Alertas: 16 tipos, motor detección, configuración, testing | 3 Abr 2026 |
| Sprint 10 | BS Empleados: CRUD, 5 permisos, revocación sesiones, testing | 5 Abr 2026 |

> Detalle completo en el CHANGELOG.

---

## 🚀 Módulos Completados (resumen)

> Detalle de cada sprint en CHANGELOG.md y docs de arquitectura correspondientes.

| Módulo | Estado | Fecha | Doc de referencia |
|--------|--------|-------|-------------------|
| ChatYA | ✅ 100% (7 sprints) | 20 Mar 2026 | `docs/arquitectura/ChatYA.md` |
| Promociones (Ofertas + Cupones) | ✅ 100% | 22 Mar 2026 | `docs/arquitectura/Promociones.md` |
| Cupones: ChatYA + Revocar/Reactivar + Rediseño | ✅ 100% | 23 Mar 2026 | `docs/arquitectura/Promociones.md` |
| Mis Guardados: Rediseño estilo CardYA (rose) | ✅ 100% | 23 Mar 2026 | `docs/arquitectura/Guardados.md` |

### Pendientes menores

- [x] ~~Barra progreso N+1 en CardYA usuario~~ (Sprint 8, 1 Abr 2026)
- [ ] Tests E2E para CardYA/ScanYA (data-testid listos, falta crear specs)

---

## ⏭️ Sprint siguiente: BS Alertas

---

## 📅 Backlog Priorizado

### Business Studio - Módulos Pendientes (4/14)

**Completados (10/14):**
- ✅ Dashboard
- ✅ Mi Perfil
- ✅ Catálogo
- ✅ Promociones (Ofertas + Cupones unificados, 22 Mar 2026)
- ✅ Puntos (Config + Expiración + Recompensas + N+1)
- ✅ Transacciones (7 Mar 2026)
- ✅ Clientes (7 Mar 2026)
- ✅ Opiniones (7 Mar 2026)
- ✅ Alertas (16 tipos, motor detección, configuración, 3 Abr 2026)
- ✅ Empleados (CRUD, 5 permisos, revocación sesiones, 5 Abr 2026)

**Pendientes (4/14):**

**🟢 Disponibles ahora:**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 1 | **Reportes** | ~3 días | ScanYA ✅ | Ventas, productos top, horarios pico, export |
| 2 | **Sucursales** | ~2 días | - | Gestión multi-sucursal completa |

**🔴 Bloqueados (esperan otras secciones):**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 3 | **Rifas** | ~2 días | Dinámicas (pendiente) | Gestión rifas del negocio |
| 4 | **Vacantes** | ~2 días | Empleos (pendiente) | Publicar/gestionar ofertas de empleo |

**Total estimado:** ~11 días (distribuidos en múltiples sprints)

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
| Sistema Lealtad + ChatYA + Promociones | ✅ Completado |
| BS Módulos Pendientes (6/14) | ~12 días |
| Secciones Públicas (6.0-6.3) | ~10-13 días |
| Panel Admin (6.7) | ~14 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~8-10 semanas** |
| **TOTAL REALISTA** | **~10-12 semanas** |

**Fecha lanzamiento público proyectada:** Mayo-Junio 2026

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

**Fecha:** Al completar BS Alertas
**Alcance:** Definir siguiente módulo BS (Empleados o Reportes) y evaluar inicio de secciones públicas

---

**Fin del Roadmap**