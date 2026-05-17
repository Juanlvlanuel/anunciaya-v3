# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 17 Mayo 2026
> **Progreso global:** Servicios v1.0 cerrado ✅ (Sprint 7 completo, 40 tests Vitest) — 3 de 4 secciones públicas listas
> **Fase actual:** Próximo bloque = Home con Pregúntale a Peñasco · BS Vacantes · Panel Admin
> **Visión que sustenta este roadmap:** `docs/VISION_ESTRATEGICA_AnunciaYA.md` (define las 4 secciones públicas y el alcance de v1)

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
| **Secciones Públicas** (6.x) | ✅ 100% (3/3 + Home) | ✅ Ofertas v1.4 (1 May 2026) · ✅ MarketPlace v1.6 (15 May 2026, probado E2E completo) · ✅ Servicios v1.0 (17 May 2026, Sprint 7 cerrado, 40 tests Vitest). Pendiente: Home con Pregúntale a Peñasco |
| **Home — Pregúntale a Peñasco** | ⏳ 0% | Feed conversacional + buscador hiperlocal + mascota. Ver `VISION_ESTRATEGICA_AnunciaYA.md` §4 |
| **Panel Admin** (6.7) | ⏳ 10% | Infra backend + sección Mantenimiento (reconcile R2) ✅. Pendiente: auth admin con roles (admin + vendedor), UI frontend, secciones Negocios/Usuarios/Reportes-Globales/Suscripciones/Auditoría/Vendedores-Comisiones (tabla `embajadores` ya existe) |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | Stripe LIVE, dominio, testing, beta 50 negocios |

---

## 🎯 Objetivos por Trimestre

**Q1 (Enero-Marzo) — Cierre:**
- ✅ ScanYA, CardYA, Socket.io, Notificaciones, Reseñas, ChatYA, Promociones
- ✅ Business Studio 8/13 módulos
- ⏳ BS 80% — no alcanzado, pasa a Q2 (BS hoy va 12/13 = 92%)

**Q2 (Abril-Junio) — Meta:**
- [ ] Business Studio 100% (13/13 módulos) — falta: Vacantes
- [x] **Sección pública Ofertas** ✅ (1 May 2026 — feed editorial, multi-sucursal, swipe, analytics)
- [x] **Sección pública MarketPlace v1.6** ✅ (15 May 2026 — compra-venta P2P, moderación autónoma, buscador potenciado, página pública compartible, **Mis Publicaciones (panel del vendedor)**, **Q&A estilo Mercado Libre con privacidad de pendientes**, flujos E2E probados)
- [x] **Sección pública Servicios v1.0** ✅ (17 May 2026 — Sprint 7 cerrado: feed mezclado con widget de Clasificados, wizard 3 pasos para crear/editar, Mis Publicaciones, cron de expiración 30 días, reseñas, perfil del prestador con distribución de estrellas, moderación pasiva, 40 tests Vitest)
- [ ] Home con Pregúntale a Peñasco
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
| Sprint 10.5 | Audit React Query BS: ~30 invalidaciones cross-módulo + limpieza ScanYA legacy | 11 Abr 2026 |
| Sprint 11 | BS Reportes: 5 tabs, KPIs, funnels, cards, filtro fechas, XLSX | 12 Abr 2026 |
| Sprint 12 | BS Sucursales: CRUD multi-sucursal + gerentes + clonación auto + hard delete | 16 Abr 2026 |
| Sprint 12 ref | BS Sucursales refinamiento: validación correo 3 niveles, promoción cuentas existentes, emails rediseñados, blindajes Matriz, aislamiento por sucursal en Reportes, cupones cross-sucursal | 16 Abr 2026 |
| Sprint 13 | ScanYA Multi-Sucursal: selector cambio sucursal (dueño), Coherencia A (token = fuente verdad), aislamiento datos por sucursal, label Matriz cross-app, fix race-condition modales, exclusión mutua chat/modales, fix stats Empleados desde `puntos_transacciones` | 28 Abr 2026 |
| Sprint 14 | Calidad post-multi-sucursal: fix zona horaria por sucursal en Reportes (5 zonas MX), auto-cierre de turnos colgados con modal de aviso al login, rediseño profesional PanelInfoContacto + Regla 13 estética B2B, Mis Notas multi-sucursal en ChatYA, fix etiqueta "Matriz" en buscador | 28-29 Abr 2026 |
| Sprint 15 | **Sección Ofertas Públicas v1.4**: feed editorial (Hero rotativo + carruseles + ticker logos + lista densa), modelo de analytics estándar (vista/click/share con anti-inflación 1/usuario/día + insider rule), multi-sucursal en modal con lista de sucursales, vista expandida via chip "Todas", swipe drag-en-vivo + flechas desktop, fix interceptor sucursalId, distancia con MapPin, cálculo correcto "Vence en N días", header del negocio en modal con click → perfil, GPS opcional en destacada del día. **55 tests** (38 backend + 17 E2E) | 1 May 2026 |
| Sprint 16 | **MarketPlace Sprint 1 — Backend Base**: tabla `articulos_marketplace` con PostGIS (ubicación exacta privada + ubicación aproximada aleatorizada 500m con `r=R·√random()`), 10 endpoints CRUD con `requiereModoPersonal`, validaciones Zod, integración R2, 4 tests del helper de privacidad de ubicación | 3 May 2026 |
| Sprint 17 | **MarketPlace Sprint 2 — Feed Frontend**: `PaginaMarketplace.tsx` con header dark teal + carrusel Recién publicado + grid Cerca de ti, `CardArticulo` estilo B, `ModoPersonalEstrictoGuard` (bloqueo total sin auto-cambio), bug "hace NaN meses" cazado en QA (offset Postgres `+00` rompía `new Date()` en Safari iOS) | 3 May 2026 |
| Sprint 18 | **MarketPlace Sprint 3 — Detalle del Artículo**: `PaginaArticuloMarketplace.tsx` con galería + lightbox reusado, `CardVendedor`, `MapaUbicacion` con círculo 500m sin marker, `BarraContacto` con WhatsApp + Enviar mensaje vía ChatYA, vista solo NO-dueños + dedupe sessionStorage, 404 amigable | 4 May 2026 |
| Sprint 19 | **MarketPlace Sprint 4 — Wizard de Publicar + Moderación Autónoma**: wizard 3 pasos con auto-save sessionStorage + vista previa en vivo desktop, **Capa 1 de Moderación Autónoma** (`filtros.ts` con 5 categorías de palabras prohibidas + detección suave de servicios y búsquedas), 32 tests unitarios cubriendo edge cases (subastasta, barrifa, armario), 3 tests E2E con curl | 4 May 2026 |
| Sprint 20 | **MarketPlace Sprint 5 — Perfil del Vendedor**: `PaginaPerfilVendedor.tsx` SIN portada decorativa + SIN badge verificado (decisiones conscientes de Regla 13), KPIs reales (publicaciones activas, vendidos, tiempo de respuesta sin filtro `contexto_tipo`), botón Seguir vendedor con migración SQL para `votos_entity_type_check += 'usuario'`, tabs Publicaciones/Vendidos | 4 May 2026 |
| Sprint 21 | **MarketPlace Sprint 6 — Buscador Potenciado**: 3 endpoints (sugerencias FTS español + populares cache Redis 1h + buscar paginado), `OverlayBuscadorMarketplace` SIN input propio (anclado al `useSearchStore` global del Navbar), página de resultados con scroll infinito + URL state compartible, `FiltrosBuscador` (Distancia/Precio/Condición), privacidad: `usuario_id=NULL` siempre + sanitización del término | 4 May 2026 |
| Sprint 22 | **MarketPlace Sprint 7 — Polish + Crons + Página Pública (cierre v1)**: cron auto-pausa cada 6h + cron próxima expiración diario 09:00 UTC (notificaciones idempotentes), endpoint `/reactivar` extiende +30d, `PaginaArticuloMarketplacePublico` con OG tags + mensajes diferenciados por estado + SIN WhatsApp directo (privacidad), botón Reactivar reemplaza BarraContacto, tab "Artículos" en Mis Guardados activada, 4 tests E2E Playwright | 4 May 2026 |
| Sprint 23 | **MarketPlace v1.3 — Rediseño páginas públicas + Navbar glass + cards de contexto en ChatYA**: rediseño visual de páginas públicas P2/P3, Navbar glass, P3 con contactos reales, cards de contexto en ChatYA con preview en input + reuso de conversación + retiro de card "vienes del perfil" + filtro sucursal persona↔negocio | 8-11 May 2026 |
| Sprint 24 | **MarketPlace v1.4 — Buscador MP global + filtros en Mis Guardados + sucursalId en ofertas**: polish UI cross-app, filtros de estado en Mis Guardados, buscador MarketPlace global (anclado al `useSearchStore`), duplicación de sucursal en chats, retiro total de `vendedor_marketplace` legacy | 12 May 2026 |
| Sprint 25 | **MarketPlace v1.5 — Mis Publicaciones + Mis Guardados Marketplace funcional + wizard publicar rediseñado**: panel del vendedor `Mis Publicaciones` (filtros activas/pausadas/vendidas, acciones marcar como vendida/reactivar/eliminar), UI Servicios pre-cableada, Mis Guardados Marketplace 100% funcional con unificación visual de cards, wizard publicar rediseñado, P3 perfil ajustado, galería P2, cleanup R2, filtro permisivo de sucursal | 13 May 2026 |
| Sprint 26 | **MarketPlace v1.6 — Q&A estilo Mercado Libre + privacidad de pendientes + cierre E2E**: rediseño completo de Q&A en detalle y feed (agrupación por comprador, badge "Pendiente", conector "L" entre pregunta y respuesta, nombre+1er apellido en bubbles), responder/preguntar inline sin modal (elimina `ModalHacerPregunta`), pendientes ajenas privadas (filtro backend en `obtenerPreguntasPublicas` + `top_preguntas` del feed), helpers compartidos `agruparPorComprador<T>` + `obtenerNombreCorto` en `utils/marketplace.ts`, mejor copy de notificaciones (incluye título del artículo), fix backend vendedor devuelve apellidos+avatar completos, Tooltip "Guardar publicación" en feed, flujos E2E probados (comprador + vendedor + Mis Publicaciones) | 14-15 May 2026 |

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
| **Sección Ofertas Públicas v1.4** | ✅ 100% | 1 May 2026 | `docs/arquitectura/Ofertas.md` |
| **Sección MarketPlace v1.6** (P2P, moderación autónoma, buscador potenciado, Mis Publicaciones, Q&A estilo ML, flujos E2E probados) | ✅ 100% (11 sprints) | 15 May 2026 | `docs/arquitectura/MarketPlace.md` |

### Pendientes menores

- [x] ~~Barra progreso N+1 en CardYA usuario~~ (Sprint 8, 1 Abr 2026)
- [ ] Tests E2E para CardYA/ScanYA (data-testid listos, falta crear specs)
- [x] ~~**ScanYA Multi-Sucursal para dueños**~~ (Sprint 13, 28 Abr 2026) — selector de cambio de sucursal en header (modal bottom-sheet móvil + dropdown desktop), endpoint `POST /api/scanya/cambiar-sucursal`, Coherencia A (token = fuente única de verdad para `sucursalId`), aislamiento de datos por sucursal en todos los modales, label "Matriz" cross-app vía flag `esSucursalPrincipal`. Detalle en `docs/reportes/prompt-sprint-scanya-multi-sucursal.md`.
- [ ] **Perfil Personal del usuario** (`/perfil`) — ruta existe pero sin contenido. Debe permitir al usuario editar su nombre, apellidos, foto de avatar, contraseña. Consideraciones:
  - Para **gerentes** (con `sucursalAsignada != null`): bloquear cambio de correo (es la identidad vinculada al negocio). Permitir editar nombre, avatar, contraseña.
  - Para **dueños** (con `negocioId != null, sucursalAsignada = null`): mismas reglas que gerentes, no cambio de correo mientras tengan negocio activo.
  - Para **usuarios personales** (sin negocio): todo editable incluido correo (con flujo de verificación).

---

## ⏭️ Sprint siguiente: Servicios + Home con Pregúntale a Peñasco

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

---

### Secciones Públicas (Fase 6.0-6.2) y Home

**6.0 Ofertas Públicas** ✅ Cerrada 1 May 2026
- Feed editorial completo con Hero rotativo, 3 carruseles, ticker de logos, lista densa.
- Modelo analytics estándar (vista / click / share) con anti-inflación 1/usuario/día.
- Multi-sucursal con lista de sucursales en modal.
- Swipe drag-en-vivo + flechas desktop en par superior.
- Insider rule (dueño/empleado no infla métricas propias).
- 55 tests pasando (38 backend + 17 E2E).
- Detalle: `docs/arquitectura/Ofertas.md` v1.4.

**6.1 MarketPlace v1.6** ✅ Cerrada 15 May 2026
- Compra-venta de **objetos físicos** entre usuarios (modo Personal), transacción 100% offline (sin pagos en la app).
- 11 sprints: backend base, feed, detalle, wizard publicar + moderación autónoma (5 categorías de palabras prohibidas + 32 tests), perfil del vendedor con KPIs reales, buscador potenciado (sugerencias FTS + populares + filtros + URL state), polish (crons auto-pausa + página pública compartible + tests E2E), rediseño páginas públicas + Navbar glass + cards de contexto ChatYA, buscador MP global + filtros Mis Guardados, **Mis Publicaciones (panel del vendedor)**, **Q&A estilo Mercado Libre con privacidad de pendientes y agrupación por comprador**.
- Filosofía: alternativa ordenada y profesional a Facebook Marketplace. Hiperlocal, división estricta entre objetos físicos (MarketPlace) y servicios. Sin subastas, sin rifas, sin servicios disfrazados.
- Decisiones clave: SIN sistema de reportes (moderación 100% autónoma), SIN portada en perfil del vendedor (estética profesional), SIN WhatsApp directo en página pública (privacidad de teléfonos), buscador anclado al Navbar global, Q&A pendientes privadas (autor + dueño, patrón ML), responder/preguntar inline sin modales.
- Flujos E2E probados: comprador (buscar, ver detalle, preguntar, guardar, contactar) + vendedor (publicar, gestionar publicaciones, responder, pausar/reactivar).
- Sprint pendiente para post-beta: Sistema de Niveles del Vendedor — los umbrales se ajustan mejor con data real de comportamiento.
- Detalle: `docs/arquitectura/MarketPlace.md` v1.6.

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
| **Sección MarketPlace v1.6** | ✅ Completado (15 May 2026, flujos E2E probados) |
| BS Módulos Pendientes (1/13: Vacantes) | ~2 días |
| Sección pública restante (6.2: Servicios) | ~4 días |
| Home — Pregúntale a Peñasco | por estimar (depende del diseño) |
| Panel Admin (6.7) | ~14 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~6-8 semanas** |
| **TOTAL REALISTA** | **~8-10 semanas** |

**Fecha lanzamiento público proyectada:** Mayo-Junio 2026

---

## 📝 Dependencias Críticas

**ChatYA ✅ habilita:**
- MarketPlace (contactar vendedor)
- Servicios (contactar oferente / contratante)
- Pregúntale a Peñasco (responder preguntas, sumarse a una pregunta)

**ScanYA ✅ habilita:**
- Opiniones (validar compras) — ✅ completado
- Clientes + Transacciones — ✅ completado
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

**Fecha:** Al completar Sección Servicios (6.2) + Home con Pregúntale a Peñasco
**Alcance:** Activación de BS Vacantes (alimenta Servicios) y arranque de Panel Admin

---

**Fin del Roadmap**