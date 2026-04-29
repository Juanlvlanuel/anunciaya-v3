# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 29 Abril 2026
> **Progreso global:** Multi-sucursal cerrado en toda la app ✅
> **Fase actual:** Próximo bloque grande = Secciones Públicas (Ofertas, MarketPlace, Servicios) + Home con Pregúntale a Peñasco
> **Visión que sustenta este roadmap:** `docs/VISION_ESTRATEGICA_AnunciaYA.md` (sesión estratégica abril 2026 — define las 4 secciones públicas finales y los features descartados)

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
| **Business Studio** (5.4) | ⏳ 92% (12/13 módulos) | Vacantes (alimenta sección pública Servicios) |
| **Secciones Públicas** (6.x) | ⏳ 0% | Ofertas, MarketPlace, Servicios |
| **Home — Pregúntale a Peñasco** | ⏳ 0% | Feed conversacional + buscador hiperlocal + mascota. Ver `VISION_ESTRATEGICA_AnunciaYA.md` §4 |
| **Panel Admin** (6.7) | ⏳ 10% | Infra backend + sección Mantenimiento (reconcile R2) ✅. Pendiente: auth admin con roles (admin + vendedor), UI frontend, secciones Negocios/Usuarios/Reportes-Globales/Suscripciones/Auditoría/Vendedores-Comisiones (tabla `embajadores` ya existe) |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | Stripe LIVE, dominio, testing, beta 50 negocios |
| **Cleanup técnico Cloudinary** | ⏳ 0% | Servicio descontinuado. Pendiente: eliminar `cloudinary.service.ts`, variables env `CLOUDINARY_*`, dependencia npm `cloudinary`, helpers `eliminarImagenInteligente` y `duplicarImagenInteligente` (simplificar a solo R2). ~1-2h |
| **Cleanup visión v3** | ✅ 100% (28 Abr 2026) | 4 fases aplicadas: A docs · B UI · C backend · D BD (staging + producción). Drop de tablas `dinamicas`/`dinamica_premios`/`dinamica_participaciones`; renombrado `'empleo'`→`'servicio'` y `'bolsa'`→`'servicio'` en 8 CHECK constraints. Ver `CHANGELOG.md` y `docs/migraciones/2026-04-28-fase-d-vision-v3-cleanup.sql`. |

---

## 🎯 Objetivos por Trimestre

**Q1 (Enero-Marzo) — Cierre:**
- ✅ ScanYA, CardYA, Socket.io, Notificaciones, Reseñas, ChatYA, Promociones
- ✅ Business Studio 8/14 módulos *(meta histórica con base 14; la base actual es 13 tras la visión v3 de abril 2026)*
- ⏳ BS 80% (12/14) — no alcanzado, pasa a Q2 *(idem; BS hoy va 12/13 = 92%)*

**Q2 (Abril-Junio) — Meta:**
- [ ] Business Studio 100% (13/13 módulos) — falta: Vacantes
- [ ] Secciones públicas: Ofertas, MarketPlace, Servicios
- [ ] Home con Pregúntale a Peñasco
- [ ] Panel Admin funcional
- [ ] Beta privada: 50 negocios piloto
- [ ] Lanzamiento público
- [ ] Stripe modo LIVE + dominio + SSL

> **Removidos del alcance v1** (sesión estratégica abril 2026): Dinámicas/Rifas P2P, Live Sale, Pulse local. Ver `VISION_ESTRATEGICA_AnunciaYA.md` §5.

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
| Sprint 10.5 | Audit React Query BS: ~30 invalidaciones cross-módulo + limpieza ScanYA legacy | 11 Abr 2026 |
| Sprint 11 | BS Reportes: 5 tabs, KPIs, funnels, cards, filtro fechas, XLSX | 12 Abr 2026 |
| Sprint 12 | BS Sucursales: CRUD multi-sucursal + gerentes + clonación auto + hard delete | 16 Abr 2026 |
| Sprint 12 ref | BS Sucursales refinamiento: validación correo 3 niveles, promoción cuentas existentes, emails rediseñados, blindajes Matriz, aislamiento por sucursal en Reportes, cupones cross-sucursal | 16 Abr 2026 |
| Sprint 13 | ScanYA Multi-Sucursal: selector cambio sucursal (dueño), Coherencia A (token = fuente verdad), aislamiento datos por sucursal, label Matriz cross-app, fix race-condition modales, exclusión mutua chat/modales, fix stats Empleados desde `puntos_transacciones` | 28 Abr 2026 |
| Sprint 14 | Calidad post-multi-sucursal: fix zona horaria por sucursal en Reportes (5 zonas MX), auto-cierre de turnos colgados con modal de aviso al login, rediseño profesional PanelInfoContacto + Regla 13 estética B2B, Mis Notas multi-sucursal en ChatYA, fix etiqueta "Matriz" en buscador | 28-29 Abr 2026 |

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
- [x] ~~**ScanYA Multi-Sucursal para dueños**~~ (Sprint 13, 28 Abr 2026) — selector de cambio de sucursal en header (modal bottom-sheet móvil + dropdown desktop), endpoint `POST /api/scanya/cambiar-sucursal`, Coherencia A (token = fuente única de verdad para `sucursalId`), aislamiento de datos por sucursal en todos los modales, label "Matriz" cross-app vía flag `esSucursalPrincipal`. Detalle en `docs/reportes/prompt-sprint-scanya-multi-sucursal.md`.
- [ ] **Perfil Personal del usuario** (`/perfil`) — ruta existe pero sin contenido. Debe permitir al usuario editar su nombre, apellidos, foto de avatar, contraseña. Consideraciones:
  - Para **gerentes** (con `sucursalAsignada != null`): bloquear cambio de correo (es la identidad vinculada al negocio). Permitir editar nombre, avatar, contraseña.
  - Para **dueños** (con `negocioId != null, sucursalAsignada = null`): mismas reglas que gerentes, no cambio de correo mientras tengan negocio activo.
  - Para **usuarios personales** (sin negocio): todo editable incluido correo (con flujo de verificación).

---

## ⏭️ Sprint siguiente: Secciones Públicas (Ofertas, MarketPlace, Servicios) + Home con Pregúntale a Peñasco

---

## 📅 Backlog Priorizado

### Business Studio - Módulos Pendientes (1/13)

**Completados (12/13):**
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
- ✅ Reportes (5 tabs, KPIs, funnels, XLSX, 12 Abr 2026)
- ✅ Sucursales (CRUD multi-sucursal + gerentes + clonación auto, 16 Abr 2026)

**Pendientes (1/13):**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 1 | **Vacantes** | ~2 días | Sección pública Servicios | Herramienta del comerciante para publicar ofertas de servicio/empleo en la sección pública Servicios |

> **Rifas** ya no figura como módulo pendiente. Se removió del alcance de v1 al descartarse Dinámicas (sesión estratégica abril 2026). Ver `VISION_ESTRATEGICA_AnunciaYA.md` §5.1.

---

### Secciones Públicas (Fase 6.0-6.2) y Home

**6.0 Ofertas Públicas** (~2 días)
- Feed público con geolocalización
- Ya existe backend, solo falta vista pública

**6.1 MarketPlace** (~4 días)
- Compra-venta de **objetos** entre usuarios (modo Personal). NO se permiten servicios ni rifas aquí.
- Requiere ChatYA completado ✅

**6.2 Servicios** (~4 días)
- Sección unificada: servicios e intangibles, incluye empleos.
- Dos modos visibles: **Ofrezco** (publica quien tiene un servicio que dar o busca empleo) y **Solicito** (publica el negocio que contrata o el usuario que necesita un servicio).
- Pendientes de diseño: si el toggle es 1ª persona (Ofrezco/Solicito) o 3ª (Ofrecidos/Solicitados); flujo del botón "Publicar".
- Requiere ChatYA completado ✅
- Detalle: `VISION_ESTRATEGICA_AnunciaYA.md` §3.2

**6.3 Home — Pregúntale a Peñasco** (estimado pendiente)
- Feed conversacional + buscador hiperlocal (NO es sección del menú, vive en Home).
- Tres pilares: conversacional, comunitario en vivo, mascota/identidad visual.
- Parametrizable por ciudad (otras ciudades → "Pregúntale a [ciudad]").
- Pendientes de diseño: mascota, layout, flujo de pregunta, algoritmo de matching keywords→push, moderación, persistencia.
- Detalle: `VISION_ESTRATEGICA_AnunciaYA.md` §4

> **Removidas del roadmap de v1:** Dinámicas/Rifas (riesgo legal SEGOB), Empleos como sección separada (absorbida en Servicios), Pulse local (reemplazado por Pregúntale a Peñasco), Live Sale (costo recurrente sin monetización validada — reconsiderable en v2).

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

### 7.3 Lanzamiento Público (Mayo-Junio 2026)

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
| BS Módulos Pendientes (1/13: Vacantes) | ~2 días |
| Secciones Públicas (6.0-6.2: Ofertas, MarketPlace, Servicios) | ~10 días |
| Home — Pregúntale a Peñasco | por estimar (depende del diseño) |
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
- Servicios (contactar oferente / contratante) — desbloqueado
- Pregúntale a Peñasco (responder preguntas, sumarse a una pregunta) — desbloqueado

**ScanYA ✅ completado — desbloqueó:**
- Opiniones (validar compras) — ✅ completado
- Clientes + Transacciones (datos) — ✅ completado
- Reportes (métricas) — ✅ completado

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

**Fecha:** Al completar Secciones Públicas (6.0-6.2) + Home con Pregúntale a Peñasco
**Alcance:** Activación de BS Vacantes (ya con destino claro: alimenta Servicios) y arranque de Panel Admin

---

**Fin del Roadmap**