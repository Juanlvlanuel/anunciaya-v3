# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 19 Junio 2026 (Sprint de Stripe · Piezas 2 y 3 construidas · consolidación ciudad → catálogo `ciudades` COMPLETA)
> **Progreso global:** Stack v1 cerrado (BS 13/13 + 4 secciones públicas + Home/Coyo Fase 2). **Frente activo: Panel Admin** (diseño 100%, Fase 0 completa, frontend shell+login en prod; **secciones Negocios y Usuarios en uso** — Negocios con sus acciones + alta manual sin Stripe (Camino B); Usuarios con visibilidad por jerarquía+región, soporte/moderación y expediente 360). **Cerrado en paralelo:** frente transversal "negocio fuera de circulación" (toda salida de circulación apaga `negocios.activo`; candados en ScanYA/CardYA/ChatYA/Notificaciones/modo comercial; en prod).
> **Fase actual:** Panel Admin **ANTES** de la beta (la beta necesita vendedores + cobros del Panel para operar).
> **Visión que sustenta este roadmap:** `docs/VISION_ESTRATEGICA_AnunciaYA.md` (4 secciones públicas) + `docs/arquitectura/Panel_Admin/Panel_Admin.md` (diseño completo del Panel: 3 niveles, motor de venta, comisiones, mapa v2).

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
| **Business Studio** (5.4) | ✅ 100% (13/13 módulos) | Dashboard, Mi Perfil, Catálogo, Promociones, Puntos, Transacciones, Clientes, Opiniones, Alertas, Empleados, Reportes, Sucursales, **Vacantes** ✅ |
| **Secciones Públicas** (6.x) | ✅ 100% (4/4) | ✅ Ofertas v1.4 (1 May 2026) · ✅ MarketPlace v1.6 (15 May 2026, probado E2E completo) · ✅ Servicios v1.1 (17 May 2026, Sprint 7 + Sprint 8 cerrados, 65 tests Vitest) · ✅ Home / Coyo Fase 1 + Cerebro IA + Fase 2 Comunidad + Polish UX (1 Jun 2026, ver `docs/arquitectura/Home_Coyo.md`) |
| **Home — Pregúntale a Peñasco / Coyo** | ✅ Fase 1 + Cerebro IA + Comunidad + Polish UX | Feed conversacional + hero "Coyo te habla" + asistente Gemini 2.5-flash + **respuestas de la comunidad** + **"yo también quiero saber"** + **control del autor** (cerrar/editar/marcar resuelta/borrar) + **notificaciones cross-rol** (autor, interesados, dueños de items recomendados) + **expiración pasiva 14 días** + **tarjetas clicables** + **Coyo mini animado en card** + **botón Reintentar** ante fallos de IA. Detalle: `docs/arquitectura/Home_Coyo.md`. |
| **Panel Admin** (6.7) | ⏳ ~80% · **diseño 100%** | Diseño completo en `docs/arquitectura/Panel_Admin/Panel_Admin.md` (3 niveles: SuperAdmin → Gerente Regional → Vendedor; motor de venta tarjeta/efectivo; comisiones monto-fijo + escalera; mapa de territorios v2). **Fase 0 (cimientos) ✅ COMPLETA (dev + producción):** atribución vendedor↔negocio, estado de membresía (5 columnas + ciclo 4 estados + cron de gracia), webhook de renovaciones, configs conectadas (helper `obtenerConfig`, trial/gracia 14d), rol de equipo + auth del Panel (`requierePanel`), enforcement de `usuarios.estado`; superadmin sembrado en prod. **Frontend del Panel ✅ (prod):** app `apps/admin` con login + shell responsive (escritorio/móvil) + `GET /api/admin/yo` + **cabos del shell cerrados** (recuperar contraseña, refresh token automático, **2FA del Panel TOTP en la puerta — opcional para los 3 roles**). **Sección Negocios ✅ (prod):** Entrega 1 (VER: tabla + ficha, solo lectura, alcance por rol, componentes base `ModalAdaptativo`+`useBackNativo`) + Entrega 2 **Parada 1** (acciones sin Stripe: suspender, reactivar, reasignar vendedor + migración `estado_admin`/`metodo_cobro`/`admin_auditoria` + auditoría + guard del webhook) + **Parada 2** (marcar pagado + cancelar con Stripe; cancelar solo SuperAdmin, marcar pagado también Gerente de su región desde 10 Jun), **migración ciudad↔región** (tabla `ciudades` + `embajador_ciudades` + `ciudad_id`; región deducida), alcance por matriz, **filtro global de región del superadmin** + nombre de región real en el header, y **sucursales** en tabla/ficha (modal de detalle, escritorio + móvil). **Alta manual sin Stripe (Camino B) ✅ (prod, 10 Jun):** `POST /alta-manual` + botón "Registrar negocio" (los 3 roles) que crea usuario+negocio+sucursal en transacción con el helper compartido `crearNegocioConDueno` (`metodo_cobro='manual'`, concepto efectivo/transferencia/cortesía); cuenta del dueño nace SIN contraseña (modelo C, 409 `CUENTA_SIN_CONTRASENA` + flujo "Crea tu contraseña" en `apps/web`); correo verificado=false hasta crear contraseña; validación de correo en vivo (`GET /existe-correo`); cron de expiración de manuales (`al_corriente`→`en_gracia` + notificación `membresia_en_gracia`); editar correo del dueño (`PATCH /:id/correo-dueno`); historial de pagos (`GET /:id/pagos`); catálogo de ciudades. **Despliegue ✅ (prod, 16 Jun):** `apps/admin` en su propio proyecto Vercel bajo `admin.anunciaya.mx` (CNAME) + app pública en `anunciaya.mx` (apex, registro A), ambos con SSL automático; CORS de `apps/api` apuntando a los dominios nuevos vía `FRONTEND_URL`/`PANEL_URL`. **Login con Google ✅ (prod, 16 Jun):** cliente OAuth nuevo publicado (En producción) con `anunciaya.mx` autorizado; credenciales actualizadas en Render y Vercel. **Secciones internas ✅ (prod):** **Usuarios** (mesa de ayuda + moderación), **Suscripciones** (bitácora financiera V1, solo lectura), **Equipo y accesos** (alta/edición/acceso de cuentas internas — vendedores/gerentes, reasignar región, revocar/reactivar; permiso partido super/gerente; doc `Equipo_y_accesos.md`), **Vendedores y comisiones** (módulo completo **A·B·C·E·D**: cartera master-detail + devengo recurrente por escalera + comisión de alta $400 al primer pago + liquidación con foto-comprobante + cortes de efectivo con neteo; doc `Vendedores_y_comisiones.md`) y **Configuración v1** (tablero económico: escalera de comisiones + trial + gracia, solo SuperAdmin; doc `Configuracion.md`). **Sprint de Stripe · Pieza 1 ✅ (18 Jun):** precio de membresía **editable desde el Panel** (botón que crea el Price en Stripe sin redeploy, ID en config) + **plan anual** + **cobro inmediato** con trial 0 + **comprobante en cobros de tarjeta** (recibo PDF con folio correlativo); de ahí nació el **módulo Recibos** (ver/buscar/descargar/reenviar comprobantes; doc `Recibos.md`). Validado E2E en Stripe TEST. **Piezas 2 y 3 ✅ (19 Jun):** cobro "día 1" para ventas por vendedor (sub sin trial + empuje +44d; alta manual con cortesía) y **comisión recurrente "al cobro"** (anti-doble-pago del prepago: anual = 10× una vez; foto mensual retirada). Harness verdes; falta validación E2E + migración prod. **En curso:** UI de Ciudades. |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | **Va DESPUÉS del Panel** (necesita vendedores + cobros). Stripe LIVE (config de reintentos/correos hecha en TEST; falta verificar empresa + replicar en producción), ~~dominio~~ ✅ (`anunciaya.mx` conectado 16 Jun), testing, beta 50 negocios |

---

## 🎯 Objetivos por Trimestre

**Q1 (Enero-Marzo) — Cierre:**
- ✅ ScanYA, CardYA, Socket.io, Notificaciones, Reseñas, ChatYA, Promociones
- ✅ Business Studio 8/13 módulos
- ⏳ BS 80% — no alcanzado, pasa a Q2 (BS hoy va 12/13 = 92%)

**Q2 (Abril-Junio) — Meta:**
- [x] **Business Studio 100% (13/13 módulos)** ✅ — todos los módulos cerrados, último: Vacantes (17 May 2026)
- [x] **Sección pública Ofertas** ✅ (1 May 2026 — feed editorial, multi-sucursal, swipe, analytics)
- [x] **Sección pública MarketPlace v1.6** ✅ (15 May 2026 — compra-venta P2P, moderación autónoma, buscador potenciado, página pública compartible, **Mis Publicaciones (panel del vendedor)**, **Q&A estilo Mercado Libre con privacidad de pendientes**, flujos E2E probados)
- [x] **Sección pública Servicios v1.1** ✅ (17 May 2026 — Sprints 7+8 cerrados: feed mezclado con widget de Clasificados, wizard 3 pasos para crear/editar, Mis Publicaciones, cron de expiración 30 días, reseñas, perfil del prestador con distribución de estrellas, moderación pasiva, **+ BS Vacantes (módulo en Business Studio para que negocios publiquen vacantes corporativas)**, 65 tests Vitest)
- [x] **Home con Pregúntale a Peñasco + Coyo (Fase 1 + Cerebro IA)** ✅ (24 May 2026 — feed conversacional con hero "Coyo te habla", asistente con Gemini 2.5-flash que interpreta la pregunta, busca en las 4 áreas vía buscador unificado y redacta respuesta cálida; modelo "publicar al instante + sondeo cada 2s" sin socket. Detalle: `docs/arquitectura/Home_Coyo.md`.)
- [x] **Home / Coyo — Fase 2 (Comunidad + Polish UX)** ✅ (1 Jun 2026 — el feed deja de ser solo "vecino → Coyo" y se vuelve "vecino → comunidad + Coyo". Respuestas de la comunidad en hilo plano, "Yo también quiero saber" con optimistic update, control del autor (cerrar/editar/marcar resuelta/borrar) con reglas estrictas, 3 tipos de notificación nuevos (al autor cuando responden, a interesados cuando responden, a dueños cuando Coyo recomienda su item con fallback gerente→dueño), expiración pasiva 14d sin cron, vista `/inicio/mis-preguntas`. Polish UX: tarjetas de Coyo clicables a su detalle + "Ver N más en X", Coyo Rive mini animado dentro de la card pensando, subtipos visuales `vaga` (ámbar) vs `no_local` (slate), empty state con 3 ejemplos, botón Reintentar ante fallos de IA. Detalle: `docs/arquitectura/Home_Coyo.md`.)
- [~] **Panel Admin** — diseño 100% (`Panel_Admin.md`); **Fase 0 completa (dev + prod)** + **frontend shell+login** (`apps/admin`) + `GET /api/admin/yo` + **sección Negocios en prod** (Entrega 1 VER + Parada 1 + Parada 2 + sucursales + filtro de región del superadmin + migración ciudad↔región + **alta manual sin Stripe / Camino B con sus 6 fases**, 10 Jun). Despliegue ✅ (16 Jun: `anunciaya.mx` + subdominio `admin.anunciaya.mx` + CORS + login Google en prod). Cerradas: Usuarios, Suscripciones (bitácora V1), Equipo y accesos, **Vendedores y comisiones (A·B·C·E·D)**, **Configuración v1** y **Recibos**; **Sprint de Stripe** ✅ las **3 piezas construidas** (P1 precio editable + plan anual + recibo de tarjeta, validada E2E; P2 cobro "día 1"; P3 comisión "al cobro") — falta la validación E2E de P2/P3. Falta: UI de Ciudades. **Va antes de la beta.**
- [x] **Frente transversal "negocio fuera de circulación"** ✅ (5 Jun 2026 — toda salida de circulación apaga `negocios.activo`; candados en ScanYA, CardYA con devolución de puntos al cancelar, ChatYA, reseñas/guardar, notificaciones operativas y modo comercial del dueño; en prod, migraciones corridas)
- [x] **Arreglos de seguridad** ✅ (4 Jun 2026 — onboarding + DELETE de imágenes, en producción)
- [ ] Beta privada: 50 negocios piloto (después del Panel)
- [ ] Lanzamiento público
- [ ] Stripe modo LIVE (config hecha en test; falta verificar empresa + replicar en producción)

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
| Sprint 27 | **Home / Coyo — Fase 2 Sprint 1 (Comunidad)**: 7 fases (A–G) en 8 commits. (A) migración SQL respuestas+interesados+resuelta_at + 2 índices, (B) backend respuestas con soft-delete + 5 conteos inline en el feed (`totalRespuestas`, `totalInteresados`, `yoTambienInteresado`, `resueltaAt`), (C) control del autor (cerrar/borrar/editar/marcar resuelta) — editar SOLO si totalRespuestas=0, edición resetea Coyo, (D) 2 tipos de notificación nuevos: `pregunta_comunidad_respondida` al autor + `coyo_recomendacion` al gerente con fallback dueño (negocios/ofertas/vacantes) o al usuario personal (marketplace/servicios), (E) **expiración pasiva 14d** sin cron Render — barrido inline al listar feed por ciudad usando `MAX(respuestas.created_at)` como referencia, (F1-F4) frontend completo: `BotonInteresComunidad` con optimistic update, `RespuestasComunidad` colapsable, `MenuAutorPregunta` con 3 modales de confirmación, `ModalEditarPregunta`, vista `/inicio/mis-preguntas`, mapeo de íconos en PanelNotificaciones (familia comunidad azul + coyo violeta), (G) doc Home_Coyo.md actualizada en presente. | 30 May - 1 Jun 2026 |
| Sprint 28 | **Home / Coyo — Fase 2 Sprint 2 (Polish UX)**: 4 sub-fases. (2.A) tarjetas de Coyo clicables al detalle (negocios/ofertas/marketplace/servicios) + "Ver N más en X" al pie de cada grupo que cablea `useSearchStore.setQuery(textoPregunta) + abrirBuscador() + navigate(seccion)`, (2.B) Coyo Rive mini animado dentro de la card "pensando" (nueva prop `align` en `CoyoAnimado`), + bonus: autor de pregunta no se autorresponde (frontend + 403 en backend), + 3er tipo de notificación `pregunta_comunidad_seguida_respondida` que avisa a los interesados ("yo también") cuando alguien responde (cumple la promesa "Te avisaremos" del botón), (2.C) polish: ocultar `⭐ 0.0` cuando totalReseñas=0, subtipos visuales para `no_aplica` ("Coyo sugiere" ámbar para preguntas vagas + "Coyo aclara" slate para no_local), empty state mejorado con 3 ejemplos, (2.D) botón "Reintentar" cuando Coyo cayó en `sin_respuesta` por errores transitorios de Gemini — solo visible al autor, reusa la pregunta sin crear una nueva. | 1 Jun 2026 |
| Seguridad 1 | **Onboarding: guard de propiedad** — `verificarPropietarioNegocio` en rutas `/:negocioId` + `finalizar` usa `usuarioId` del token. En producción (`df54bb8`). Detalle en CHANGELOG. | 4 Jun 2026 |
| Seguridad 2 | **DELETE de imágenes con guard** — logo (dueño), portada/foto-perfil (dueño o gerente), galería (cierre parcial). En producción (`c3d5951`). Detalle en CHANGELOG. | 4 Jun 2026 |
| Panel F0-A | **Atribución vendedor↔negocio (Camino A)** — `?ref=` vía metadata Stripe → llena `embajadorId`/`referidoPor` (región deducida de la ciudad; `regionId` se quitó en el Paso 10); ref inválido nunca bloquea la venta. En producción. Detalle en CHANGELOG. | 4 Jun 2026 |
| Panel F0-B | **Estado de membresía + webhook de renovaciones** — 5 columnas en `negocios` + ciclo de 4 estados + cron de gracia. En producción. Detalle en CHANGELOG. | 4 Jun 2026 |
| Panel F0-C | **Configs conectadas (Ronda 3)** — helper `obtenerConfig()` + clave `periodo_gracia_cobro_dias=14` + trial/gracia 7→14. Bloque de pagos completo. | 4 Jun 2026 |
| Panel F0-D | **Rol de equipo + auth del Panel + enforcement de `usuarios.estado`** — `rol_equipo`/`region_id`, rol en JWT, `requierePanel` (revalida BD + región), gate dual, login bloquea cuentas no-activas. **Fase 0 completa; pusheada a prod + migraciones corridas + superadmin sembrado.** | 4 Jun 2026 |
| Panel F1 | **Frontend del Panel: shell responsive + login** — app `apps/admin` (espejo de `apps/web`, puerto 3100), login real + `GET /api/admin/yo`, shell escritorio/móvil, tema claro/oscuro, sesión aislada (`ayadmin_`). En producción. Detalle en CHANGELOG. | 4 Jun 2026 |
| Panel F1.1 | **Cabos del shell** — recuperar contraseña (código 6 dígitos), refresh token automático, y **2FA del Panel TOTP en la puerta** (claim `panel2fa` + columnas `panel_2fa_*`, opcional para los 3 roles; migración corrida dev + prod). En producción. Detalle en CHANGELOG. | 4 Jun 2026 |
| Panel Neg-1 | **Sección Negocios — Entrega 1 (VER)** — tabla (nombre/ciudad/vendedor/estado de pago/próximo cobro/alta) + buscador + filtros (estado con conteos, vendedor, ciudad) + orden + paginado de servidor; ficha administrativa (modal/bottom-sheet) con alcance por rol; componentes base `ModalAdaptativo`+`useBackNativo`. Recalcada con diseño de Claude Design. En producción. Detalle en CHANGELOG + `docs/reportes/REPORTE_Negocios_Entrega1_VER.md`. | 5 Jun 2026 |
| Panel Neg-2.1 | **Sección Negocios — Entrega 2 Parada 1 (acciones sin Stripe)** — suspender (super+gerente; `estado_admin='suspendido'`+`activo=false`, motivo obligatorio), reactivar, reasignar vendedor; migración `negocios.metodo_cobro`+`estado_admin`+tabla `admin_auditoria`; guard en webhook (un pago no revive suspensión manual). En producción (migración corrida en prod). Detalle en CHANGELOG. | 5 Jun 2026 |
| Transversal | **Negocio "fuera de circulación" en toda la app** — `negocios.activo=false` como única verdad de visibilidad (helper `estadoNegocio.ts`). Raíz: impago y cancelación ahora apagan `activo`; el pago reaparece respetando `estado_admin`. Candados: ScanYA (4 puntos), CardYA (canje + catálogo + devolución de puntos al cancelar + capa visual), modo comercial del dueño (bloqueo + toast + notificación persistente), vacantes de empresa, ChatYA (ambos lados + chat nuevo), reseñas/guardar, notificaciones operativas. En producción (migraciones corridas). Pendiente: probar Grupos 2-4 en dev + caso cancelado visual. Detalle en CHANGELOG + `docs/reportes/REPORTE_Tanda2_Negocio_Fuera_Circulacion.md`. | 5 Jun 2026 |
| Panel Neg-2.2 | **Sección Negocios — Parada 2 + sucursales + región del superadmin + migración ciudad↔región** — marcar pagado + cancelar con Stripe (solo SuperAdmin), migración ciudad↔región (tabla `ciudades` + `embajador_ciudades` + `ciudad_id`; región deducida), alcance por matriz, filtro global de región del superadmin + nombre de región real en el header, sucursales en tabla/ficha (modal de detalle, escritorio + móvil). En producción. Detalle en CHANGELOG. | 7 Jun 2026 |
| Panel Neg-3 (Alta manual / Camino B) | **Alta manual de negocios sin Stripe (efectivo/transferencia/cortesía) — 6 fases + mejoras de onboarding.** En producción tras redeploy. Commits `f9b197a` · `494d739` · `6d5c16f` · `8c79ee8` · `908324e`. **(F1+F5) Alta manual:** `POST /api/admin/negocios/alta-manual` + botón "Registrar negocio" (los 3 roles) crea usuario+negocio+sucursal en transacción con el helper compartido `crearNegocioConDueno` (extraído del webhook de Stripe, sin regresión); `metodo_cobro='manual'`, sin Stripe; concepto efectivo/transferencia/cortesía (cortesía = gratis, monto NULL); atribución del vendedor (auto si rol vendedor, del body con candado de región si gerente/superadmin); catálogo de ciudades; Panel: `DialogoRegistrarNegocio`, ficha del método manual, historial de pagos (`GET /:id/pagos`). **(F2+F6) Auth modelo C:** cuenta del dueño nace SIN contraseña; login devuelve 409 `CUENTA_SIN_CONTRASENA`; `solicitarRecuperacion` elige plantilla "crear contraseña" vs "recuperar" según `contrasenaHash`; frontend público (`apps/web`) detecta el 409 → vista "Crea tu contraseña" + enlace "¿Primera vez?" (locales es/en). **(F3) Verificación de correo:** alta manual nace con `correoVerificado=false` (solo manual; tarjeta sigue true); se marca true al crear contraseña (prueba de posesión). **(F4-aviso) Validación en vivo:** `GET /api/admin/negocios/existe-correo` (booleano, 3 roles) + onBlur que avisa "correo ya registrado" y bloquea el botón (el 409 sigue como red de seguridad). **(F3-cron) Expiración de manuales:** `suscripciones-vencimientos-manuales.cron` → `expirarManualesVencidos` pasa manuales vencidos `al_corriente`→`en_gracia` (misma fórmula que el webhook); aviso al dueño con tipo de notificación NUEVO `membresia_en_gracia` (idempotente, se limpia al salir de gracia); la transición a suspendido la hereda el cron de gracia; migración SQL del CHECK aplicada en dev + prod. **(F4) Editar correo del dueño:** `PATCH /:id/correo-dueno` (super+gerente, alcance de región) corrige correo mal tecleado; el nuevo nace sin verificar, reenvía código y devuelve si el envío salió; unicidad (409); auditoría `negocio_cambiar_correo_dueno`; Panel: `DialogoEditarCorreo`. **(Onboarding UX) :** loaders de marca (fullscreen + `CargandoPaso`), header con pills Pausar/Cerrar Sesión, navegación full-rounded (prop `redondez` en `Boton`), último paso "Finalizar", gate de ScanYA en el menú (exige CardYA activa Y onboarding completo). | 10 Jun 2026 |
| Panel Neg-4 (Pulido + verificación) | **Sección Negocios — pulido final + verificada de punta a punta.** Cortesía solo gerente/super (el vendedor ya no la ve); **editar un pago del historial** (`PATCH /:id/pagos/:pagoId` — concepto/monto/meses + traslado de vigencia, con auditoría); diálogos de pago con monto autocalculado del precio de membresía (12 m = ×10) + meses chips+campo de enteros + scroll por décimas; **contador del menú con dato real** (`GET /:id/conteo` por alcance); **Cancelar transaccional** (degradar dueño + archivar en una `db.transaction`); **historial de pagos paginado** (últimos 5 + "ver todos"). **Verificación a fondo (§4):** acciones de tarjeta contra Stripe real (`probar-acciones-parada2`), riesgo "fecha vs webhook" descartado (`probar-fecha-vs-webhook`). En producción. Detalle en CHANGELOG. | 10 Jun 2026 |
| Panel Susc-1 (Bitácora financiera V1) | **Sección Suscripciones — bitácora financiera (V1, solo lectura).** El "libro mayor" de la membresía: tabla `eventos_pago` (migración) + persistencia **defensiva** en el webhook (cobro_exitoso/cobro_fallido/cancelacion, sin romper el cobro ni reintento) + gemelo `pago_manual` transaccional en `marcarPagado`; lectura `suscripciones.service/controller/routes` con alcance super (todo)/gerente (su región); frontend `apps/admin` (sección con KPIs ingresos/fallidos + tabla/cards + filtros tipo/origen/periodo + ficha de evento + invalidación cross-módulo al registrar pago). Verificada con harness `probar-bitacora-eventos.ts` (Gate 1 A–J en verde, datos reales). **Cabos cerrados (23 jun): deep-link a Negocios + re-sync al editar pago (ya estaba) + migración prod confirmada + backfill aplicado; módulo CERRADO sin V2.** Doc: `Suscripciones.md`. | 11 Jun 2026 |
| Panel Equipo-1 (Equipo y accesos) | **Módulo Equipo y accesos — gestión completa de cuentas internas (el "RR.HH./IT" del Panel).** VER (lista/ficha/lente por rol) + alta de **vendedor** y de **gerente** (typeahead + autocompletado + **promoción** de cuentas existentes con aviso por correo) + **editar datos** (el correo solo es editable en modelo C; verificado → solo lectura) + **reasignar región** + **revocar/reactivar** (vendedores y gerentes; los revocados siguen visibles como "Sin acceso"). Permisos: crear/mover/revocar gerentes = **solo super**; vendedores = super+gerente (su región). **Sin migración** (reusa `rol_equipo`/`region_id`/`embajadores`). Verificado con 2 harness (lectura 12 + acciones 16) + `tsc`/builds en verde. El **modelo de cobertura avanzado** del vendedor (multi-región, mover-con-reasignación) se difirió a "Vendedores y comisiones". Doc: `Equipo_y_accesos.md`. | 16 Jun 2026 |
| Panel Vend-1 (Vendedores y comisiones) | **Módulo Vendedores y comisiones — completo (A·B·C·E·D) + Configuración v1.** Cartera master-detail + devengo recurrente por escalera (# activos × monto del escalón) + comisión de alta ($400 al primer pago real) + liquidación v2 con abonos (parcial/dividido) y foto-comprobante + cortes de efectivo con neteo. **Configuración v1** (escalera + trial + gracia, solo SuperAdmin) lo alimenta; **trial dinámico** en la web. Migraciones en dev + prod; harness de devengo y neteo TODO VERDE. Docs: `Vendedores_y_comisiones.md`, `Configuracion.md`. | 17 Jun 2026 |
| Panel Stripe-P1 + Recibos | **Sprint de Stripe · Pieza 1 + módulo Recibos.** Precio de membresía **editable desde el Panel** (botón que crea el Price en Stripe sin redeploy; ID en config, no env) + **plan anual** (toggle, ≈10×) + **cobro inmediato** con trial 0 + **comprobante en cobros de tarjeta** (recibo PDF + correo, folio correlativo continuando la serie de los manuales). Nuevo **módulo Recibos** (ver/buscar/descargar/reenviar, alcance super/gerente/vendedor). **Validado E2E en Stripe TEST.** Migración `2026-06-18-concepto-tarjeta.sql`. Docs: `Sprint_Stripe.md`, `Recibos.md`, `Pagos_Suscripciones.md` (v1.5). | 18 Jun 2026 |
| Panel Stripe-P2/P3 | **Sprint de Stripe · Piezas 2 y 3.** **Cobro "día 1"** para ventas por vendedor (sub sin trial + empuje a +44d; alta manual con cortesía visible en el modal) + **comisión recurrente "al cobro"** (anti-doble-pago del prepago: anual = 10× una vez; escalón congelado; marcador `comision_devengada_hasta`; foto mensual retirada). 2 harness (Test Clock + datos reales) TODO VERDE. Migración `2026-06-19-comision-al-cobro.sql` (dev). Falta validación E2E + prod. Docs `Sprint_Stripe.md`, `Vendedores_y_comisiones.md`, `Pagos_Suscripciones.md` (v1.6). | 19 Jun 2026 |

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
| **Home — Pregúntale a Peñasco + Coyo (Fase 1 + Cerebro IA + Comunidad + Polish UX)** | ✅ Fase 1 + Fase 2 | 24 May - 1 Jun 2026 | `docs/arquitectura/Home_Coyo.md` |

### Pendientes menores

- [x] ~~Barra progreso N+1 en CardYA usuario~~ (Sprint 8, 1 Abr 2026)
- [ ] Tests E2E para CardYA/ScanYA (data-testid listos, falta crear specs)
- [x] ~~**ScanYA Multi-Sucursal para dueños**~~ (Sprint 13, 28 Abr 2026) — selector de cambio de sucursal en header (modal bottom-sheet móvil + dropdown desktop), endpoint `POST /api/scanya/cambiar-sucursal`, Coherencia A (token = fuente única de verdad para `sucursalId`), aislamiento de datos por sucursal en todos los modales, label "Matriz" cross-app vía flag `esSucursalPrincipal`. Detalle en `docs/reportes/prompt-sprint-scanya-multi-sucursal.md`.
- [ ] **Perfil Personal del usuario** (`/perfil`) — ruta existe pero sin contenido. Debe permitir al usuario editar su nombre, apellidos, foto de avatar, contraseña. Consideraciones:
  - Para **gerentes** (con `sucursalAsignada != null`): bloquear cambio de correo (es la identidad vinculada al negocio). Permitir editar nombre, avatar, contraseña.
  - Para **dueños** (con `negocioId != null, sucursalAsignada = null`): mismas reglas que gerentes, no cambio de correo mientras tengan negocio activo.
  - Para **usuarios personales** (sin negocio): todo editable incluido correo (con flujo de verificación).
  - **Nota (4 Jun 2026):** `usuarios` NO tiene columna de ciudad/región (confirmado). Por eso en el Panel, suspender/bloquear usuarios es **solo SuperAdmin** (los gerentes no pueden filtrar usuarios por región). Aquí, en esta página de perfil, es donde a futuro se capturaría la ciudad → de ahí saldría la región para poder delegar usuarios a gerentes. Es pre-requisito de esa delegación.
- [x] ~~**Tarjetas de resultados de Coyo clicables**~~ ✅ (1 Jun 2026 — Sprint 28 / Sprint 2.A del Home Fase 2). Cada tarjeta navega al detalle según tipo (`/negocios/:sucursalId`, `/ofertas?oferta=:id`, `/marketplace/articulo/:id`, `/servicios/:id`). Además se agregó "Ver N más en X" al pie de cada grupo cuando hay sobrantes del top 3 (cablea `useSearchStore` + navigate a la sección).
- [ ] **Coyo: respuesta sensible para auto-daño / crisis emocional** — hoy si alguien escribe *"quiero morirme"* o similar, cae en `no_local` y Coyo responde con el texto fijo de redirección. Mal. Debe detectar crisis emocional y mostrar respuesta empática + línea de ayuda (México: 800-290-0024 Línea de la Vida, 24/7 gratis). Requiere: (a) prompt cuidadoso para detectar crisis sin falsos positivos, (b) texto validado idealmente con un experto en salud mental, (c) tal vez un nuevo `tipo='crisis'` en `PreguntaInterpretada`. Anotar como tarea de mayor cuidado, NO meter sin validación adecuada.
- [x] ~~`coyo_respuesta_en_pregunta.sql` en producción~~ ✅ (24 May 2026, aplicada en Supabase)
- [x] ~~`GEMINI_API_KEY` en Render~~ ✅ (24 May 2026, agregada al dashboard, Render redeployó automático)
- [x] ~~3 migraciones SQL del Home Fase 2~~ ✅ (1 Jun 2026, aplicadas en local + Supabase prod): `2026-06-01-respuestas-interes-resuelta.sql`, `2026-06-01-notificaciones-coyo-comunidad.sql`, `2026-06-01-notif-pregunta-seguida.sql`.

---

## ⏭️ Sprint siguiente: Panel Admin (Fase 1 — secciones internas) → luego beta privada

> Orden actualizado (10 Jun 2026): el Panel Admin va **antes** de la beta. **Fase 0
> (cimientos) ✅ completa (dev + prod)**, el **frontend del Panel (shell + login) ✅
> en prod** (`apps/admin` + `GET /api/admin/yo`), y la **sección Negocios ✅ en prod**
> (Entrega 1 VER + Parada 1 + Parada 2 de acciones + sucursales + filtro de región del
> superadmin + **alta manual sin Stripe / Camino B con sus 6 fases**). Frente activo: el
> **resto de secciones internas** (Usuarios, Suscripciones, Vendedores + comisiones,
> Equipo y accesos…); el **despliegue ✅** ya está en prod (16 Jun: `anunciaya.mx` + `admin.anunciaya.mx` + CORS + login Google). Recién entonces la beta.

---

## 📅 Backlog Priorizado

### Business Studio — Módulos (13/13 ✅ completados)

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
- ✅ **Vacantes** (17 May 2026 — herramienta del comerciante para publicar
  vacantes que aparecen en el feed público de Servicios con
  `tipo='vacante-empresa'`. Cada sucursal gestiona sus propias vacantes
  desde su BS. Archivos: `apps/api/src/routes/vacantes.routes.ts`,
  `services/vacantes.service.ts`, `controllers/vacantes.controller.ts`;
  frontend en `pages/private/business-studio/vacantes/` con
  `PaginaVacantes.tsx` + componentes en `componentes/`.
  Tests: `__tests__/servicios-vacantes.test.ts`)

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

**6.2 Servicios v1.1** ✅ Cerrada 17 May 2026
- Sección unificada: servicios e intangibles, incluye empleos.
- Dos modos: **Ofrezco** / **Solicito**. Feed mezclado con widget de Clasificados, wizard 3 pasos para crear/editar, Mis Publicaciones, cron de expiración 30 días, reseñas, perfil del prestador con distribución de estrellas, moderación pasiva.
- Incluye **BS Vacantes** (módulo en Business Studio para que negocios publiquen vacantes corporativas que aparecen en el feed de Servicios).
- 65 tests Vitest. Sprints 7 + 8 cerrados.
- Requiere ChatYA ✅
- Detalle: `VISION_ESTRATEGICA_AnunciaYA.md` §3.2

**6.3 Home — Pregúntale a Peñasco / Coyo** ✅ Cerrada (Fase 1 + Fase 2), 24 May - 1 Jun 2026
- Feed conversacional + buscador hiperlocal (vive en Home, no es sección del menú).
- Asistente Coyo con Gemini 2.5-flash (interpreta la pregunta, busca en las 4 áreas, responde cálido; golden rule: solo datos reales, nunca inventa).
- Fase 2 (Comunidad + Polish UX): respuestas de la comunidad, "yo también quiero saber", control del autor (cerrar/editar/marcar resuelta/borrar), notificaciones cross-rol, expiración pasiva, tarjetas clicables, Coyo Rive animado, botón Reintentar.
- Parametrizable por ciudad ("Pregúntale a [ciudad]").
- Detalle completo: `docs/arquitectura/Home_Coyo.md`

---

### Panel Admin (Fase 6.7) — FRENTE ACTIVO

**Tiempo estimado:** por definir (varias rondas)
**Prioridad:** ALTA · **va ANTES de la beta** (la beta necesita vendedores y cobros del Panel)
**Diseño:** 100% completo → `docs/arquitectura/Panel_Admin/Panel_Admin.md` · UI brief → `Brief_Diseno_Panel_Admin.md`

**Estructura (3 niveles, jerarquía piramidal):**
- **SuperAdmin** (dueño) → todo + dinero + estructura
- **Gerente Regional** (= "Administrador") → su región + su equipo de vendedores
- **Vendedor** → su cartera, registrar negocios, sus comisiones
- Acceso: mismo login + rol decide el destino. Panel = web aparte en `admin.anunciaya.mx` (responsive: super/gerente escritorio, vendedor móvil).

**11 secciones:** Resumen · Métricas · Negocios · Usuarios · Suscripciones · Vendedores y comisiones · Publicidad (por ciudad, 2ª fuente de ingresos) · Ciudades (habilitar sin código) · Configuración · Equipo y accesos · Sistema.

**Motor de venta y comisiones:**
- Atribución por 2 caminos: link con `?ref=` (tarjeta) ✅ o registro del vendedor (efectivo/transferencia/cortesía) ✅ — el alta manual del Panel (`/alta-manual`) auto-atribuye al vendedor que registra (o toma el vendedor del body con candado de región si es gerente/superadmin).
- Comisiones: alta (al firmar) + recurrente **monto fijo** por negocio activo, escalera de escalones, recálculo mensual. "Activo" = membresía al corriente. Atribución de por vida, pago se gana mes a mes.
- Estados de membresía (4): al_corriente / en_gracia / suspendido / cancelado.

**Demo de Business Studio:** demo maestro (cuenta comercial marcada, administrada por SuperAdmin con BS normal) + copia privada por sesión de vendedor (respeta el 1:1 negocio-dueño).

**Vendedores v2 (diseñado, construcción diferida):** mapa de territorios — gerente dibuja zonas a mano, vendedor ve su cartera + prospectos, mini-CRM. PostGIS + MapLibre.

**Orden de construcción (fases):**
- **Fase 0 — Cimientos ✅ COMPLETA (dev + prod):** atribución · estado de membresía · webhook renovaciones + cron gracia · configs conectadas (helper `obtenerConfig`, trial/gracia 14d) · enforcement `usuarios.estado` · rol de equipo + auth del Panel (`requierePanel`). + **Frontend: shell + login (`apps/admin`) y `GET /api/admin/yo` ✅ (dev).**
- **Fase 1 — Motor:** **Negocios ✅ en prod y verificado de punta a punta (Entrega 1 VER + Parada 1 + Parada 2 de acciones + sucursales + filtro de región del superadmin + alta manual sin Stripe / Camino B con sus 6 fases + cron de expiración de manuales + editar correo del dueño + pulido: cortesía / editar pago / contador real / cancelar transaccional / paginar historial)** · **Usuarios ✅ (en uso — VER + soporte/moderación + visibilidad por jerarquía y región + lente del super + expediente 360; doc `Usuarios.md`)** · **Suscripciones ✅ (bitácora financiera V1 en uso — libro mayor de eventos de pago: cobros Stripe + pagos manuales + cancelaciones, solo lectura, KPIs, alcance por rol; doc `Suscripciones.md`)** · **Equipo y accesos ✅ (en uso — alta/edición/acceso de cuentas internas: vendedores y gerentes, reasignar región, revocar/reactivar; permiso partido super/gerente; doc `Equipo_y_accesos.md`)** · Vendedores+comisiones.
- **Fase 1.5 — Operación:** **Resumen ✅ (en uso — tablero de inicio: KPIs gruesos + cola de pendientes accionable con deep-link, scoped por rol, solo lectura; doc `Resumen.md`, 20 Jun 2026)** · **Métricas ✅ (vista de análisis: 3 pestañas Crecimiento/Uso de la app/Usuarios + selector de periodo + gráficas recharts, scoped por rol, solo lectura; doc `Metricas.md`, 21 Jun 2026)** · **Ciudades ✅ (migración ciudad hardcodeada → catálogo `ciudades` COMPLETA, 19 Jun 2026 — ver nota de deuda técnica)** · Configuración · Publicidad.
- **Fase 2 — Vendedores v2:** mapa de territorios.

**Deuda/pendientes técnicos detectados (inventario):**
- `configuracionSistema` es decorativa (nadie la lee) → crear helper `obtenerConfig()`.
- ~~Camino B de atribución (efectivo) — otra ronda.~~ ✅ Hecho (10 Jun 2026 — alta manual sin Stripe con efectivo/transferencia/cortesía, modelo C de cuenta sin contraseña, cron de expiración de manuales, editar correo del dueño).
- ~~Consolidación ciudad (texto hardcodeado) → catálogo `ciudades` (FK `ciudad_id`) en toda la app (patrón expand-migrate-contract).~~ ✅ Hecho (19 Jun 2026). Columnas texto migradas y DROPeadas en dev+prod en `negocio_sucursales` (Negocios/Ofertas/CardYA/ChatYA/BS/casi todo el Panel), `servicios_publicaciones` (Servicios + BS Vacantes), `articulos_marketplace` (MarketPlace) y `preguntas_comunidad` (Home/Coyo); `usuarios.ciudad` migrada y DROPeada en dev, **DROP en prod pendiente** (último paso operativo — Perfil, expediente del Panel Usuarios, ciudad del oferente/vendedor/prestador). Lecturas vía `LEFT JOIN ciudades` (alias de salida `ciudad`, el frontend no cambió); escrituras vía `resolverCiudadId(texto)` (`apps/api/src/utils/ciudades.ts`). Frontend = "catálogo hidratable": `useCiudades` (en RootLayout) hidrata `ciudadesPopulares.ts` desde `GET /api/ciudades`; el array hardcodeado quedó solo de semilla/fallback. El Panel de Ciudades da de alta ciudades nuevas (mapa MapLibre) disponibles en toda la app sin redeploy. Decisión: los logs de búsqueda (`marketplace_busquedas_log`, `servicios_busquedas_log`, `ofertas_busquedas_log`) se quedan como TEXTO analítico (NO se migran a FK). Migraciones: `docs/migraciones/2026-06-19-*-ciudad-*.sql` + `2026-06-06/16/18-*`.
- Seguridad: cron de galería (permitir gerente + validar `imageId ∈ sucursal`), POST gemelos foto-perfil/logo sin guard.
- **Infra del alta manual (no código):** SES fuera de sandbox + DKIM/DMARC + dominio propio R2 para el logo de los correos.

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
- [ ] **Stripe modo LIVE** — config de reintentos (4 intentos/2 semanas) + correos de recuperación HECHA en entorno de TEST. **Pendiente para producción:** (1) verificar la empresa en Stripe (RFC, identificación, cuenta bancaria), (2) replicar la misma config de reintentos y correos en la cuenta activa, (3) revisar que no queden links al dominio viejo `anunciaya.online` (ya migrado a `.mx`).
- [x] Dominio personalizado + SSL ✅ (16 Jun 2026: `anunciaya.mx` apex con registro A + subdominio `admin.anunciaya.mx` con CNAME, ambos con SSL automático de Vercel; DNS gestionado en Namecheap, correo Migadu/SES intacto)
- [ ] AWS SES salir de sandbox
- [ ] Backups automáticos

---

### 7.2 Beta Privada (~3 semanas)

**Objetivo:** 50 negocios pilotos

**Semana 1: Onboarding (15 negocios)**
- Embajadores registran pilotos (alta manual del Panel ✅ ya operativa: efectivo/transferencia/cortesía sin Stripe; el dueño crea su contraseña en el primer ingreso)
- Trial 14 días modo comercial gratis (configurable desde el Panel; hoy el código está en 7 hardcodeado → se corrige en Ronda 3 de cimientos)
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
| **Sección pública Servicios v1.1** | ✅ Completado (17 May 2026) |
| **Business Studio 13/13 (incluido Vacantes)** | ✅ Completado (17 May 2026) |
| **Home — Pregúntale a Peñasco / Coyo (Fase 1 + Fase 2)** | ✅ Completado (24 May - 1 Jun 2026) |
| Panel Admin (6.7) | ~14 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~4-6 semanas** (solo Panel Admin + lanzamiento) |
| **TOTAL REALISTA** | **~6-8 semanas** |

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

**Fecha:** Al cerrar las primeras secciones internas del Panel Admin.
**Alcance:** Stack v1 cerrado (BS 13/13 + 4 secciones públicas + Home/Coyo Fase 2). **Frente activo: Panel Admin, antes de la beta. Fase 0 (cimientos) ✅ completa (dev + prod) + frontend shell+login ✅ (en prod) + sección Negocios ✅ en prod (Entrega 1 VER + Parada 1 + Parada 2 de acciones + sucursales + filtro de región del superadmin + alta manual sin Stripe / Camino B con sus 6 fases + cron de expiración de manuales + editar correo del dueño)** (`apps/admin` + `GET /api/admin/yo`). Cerrado en paralelo: frente transversal "negocio fuera de circulación" (en prod). En curso: resto de secciones internas (Usuarios, Suscripciones, Vendedores+comisiones, Equipo y accesos). Después: beta privada en Puerto Peñasco (50 negocios) con vendedores ya operando.

---

**Fin del Roadmap**