# ✅ Pendientes — Panel Admin

> Checklist de lo que falta para el Panel Admin y su sistema de vendedores/ventas.
> El **diseño** vive en `Panel_Admin.md`; aquí está **lo que falta hacer**.
> **Módulos con checklist propio** (su detalle ya NO vive aquí, solo el puntero): **Negocios** → `Negocios_Pendientes.md`. A medida que cada módulo se construya, tendrá el suyo y saldrá de este doc global.
> Última actualización: 10 Junio 2026.
>
> Leyenda: 🔴 bloqueante / base · 🟡 importante · 🟢 mejora · ✅ hecho

---

## 🏗️ Fase 0 — Cimientos (antes de construir el Panel)

- [x] ✅ **Atribución vendedor↔negocio (Camino A, tarjeta)** — `?ref=` por metadata Stripe → `embajadorId`/`referidoPor` (región deducida de la ciudad; `regionId` se quitó en el Paso 10). Probado en DEV.
- [x] ✅ **Estado de membresía** — 5 columnas en `negocios` + ciclo de 4 estados. Probado en DEV.
- [x] ✅ **Webhook de renovaciones + cron de gracia** — `invoice.*` + `subscription.*` + cron diario de suspensión. Probado en DEV.
- [x] ✅ **Ronda 3 — configs conectadas** — helper `obtenerConfig()` (3 funciones + cache 5min), clave nueva `periodo_gracia_cobro_dias=14`, trial 7→14, gracia 7→14. Probado en DEV (lee 14, fallback no truena). **Bloque de pagos COMPLETO.**
- [x] ✅ **Push de la Fase 0 a producción** — TODA la Fase 0 (bloque de pagos + rol/auth + enforcement) commiteada, pusheada y con **las migraciones ya corridas en producción** (estado de membresía, clave de gracia, rol_equipo+region_id). DEV y PROD alineados en código y schema.
- [x] ✅ **Superadmin sembrado en PRODUCCIÓN** — `admin@anunciaya.mx` registrada en prod + `rol_equipo='superadmin'` verificado en la tabla `usuarios` de prod (`adaxddsvzuzbycjojwoo`). **FASE 0 COMPLETA AL 100% (dev + producción).**
- [x] ✅ **Rol de equipo + auth del Panel** — `rol_equipo` + `region_id` en `usuarios`, rol en el JWT (login + refresh), middleware `requierePanel` que revalida contra BD, gate dual (`x-admin-secret` O superadmin), región una fuente por rol (gerente→`usuarios`, vendedor→`embajadores`). Probado en DEV: login normal intacto (49 usuarios con rol null), gate en 4 escenarios, superadmin revalidado en BD con token viejo. **Primer superadmin sembrado:** `admin@anunciaya.mx` (cuenta personal creada + UPDATE a superadmin, verificado).
- [x] ✅ **Enforcement de `usuarios.estado`** — login bloquea cuentas no-activas (403 con `CUENTA_SUSPENDIDA`/`CUENTA_INACTIVA`), `requierePanel` corta al instante (revalida BD), refresh ya cortaba sesiones vivas. Sin migración (el campo ya existía). `verificarToken` NO se tocó (hot path). Probado en DEV: 6 escenarios en verde, login de activos intacto. **← Fase 0 COMPLETA**

---

## 🖥️ Fase 1 — Motor (secciones del Panel)

- [x] ✅ **UI del Panel — esqueleto/shell** — app `apps/admin` (espejo de `apps/web`, puerto 3100). Login (`/`) contra `/auth/login` + validación de rol via `GET /api/admin/yo`; shell **responsive** (`/inicio`): escritorio (header negro + sidebar + panel flotante) y móvil (header + saludo/región + tab-bar con "Más" + cajón). Menú filtrado por rol, selector de región y bandeja de pendientes. Tema claro/oscuro, IBM Plex Sans, sesión aislada (`ayadmin_`). Verificado en DEV (type-check + build) y **pusheado a `main`**.
  - [x] ✅ **Cabos del shell cerrados** — **recuperar contraseña** (código de 6 dígitos por correo, reusa `/auth/olvide-contrasena` + `/auth/restablecer-contrasena`), **refresh token automático** en el axios del Panel (renueva con `/auth/refresh` ante 401, con cola), y **2FA del Panel** (TOTP en la puerta, **opcional para los 3 roles**, candado real vía claim `panel2fa` en el JWT + columnas `panel_2fa_*`; migración corrida en dev + prod). Pantalla **Seguridad** en el menú del avatar. Probado en DEV.
  - [x] ✅ **Nombres de región REALES en el header** — gerente/vendedor ven su región (vía `/api/admin/yo` → `regionNombre`); superadmin tiene selector de regiones reales (`GET /api/admin/regiones`). Se retiró `REGIONES_DEMO`.
  - [ ] 🟡 **Pendiente del shell:** **datos reales** de los **contadores del menú** y la **bandeja de pendientes** (siguen demo).
  - [ ] 🟡 **Despliegue del Panel** — proyecto Vercel propio (Root `apps/admin`) + subdominio `admin.anunciaya.mx` + sumar el origen al CORS de `apps/api` (prod).
- [x] ✅ **Sección Negocios** — construida y **en producción** (lista, ficha, sucursales, historial de pagos, las **6 acciones** [registrar pago · pausar · reactivar · reasignar · cancelar · editar correo] y el **alta manual**; alcance por rol con gerente por sucursal matriz; filtro global de región del superadmin).
  - 📋 **Sus pendientes y verificación tienen checklist propio** (este doc ya no los detalla, solo apunta): `docs/arquitectura/Panel_Admin/Negocios_Pendientes.md` — riesgos de las acciones con Stripe, regularización de tarjeta morosa, desfases doc↔código, contador del menú en demo y verificación a fondo. **Qué es y cómo funciona:** `docs/arquitectura/Panel_Admin/Negocios.md`.
- [ ] 🟡 **Sección Usuarios** — ficha, suspender/bloquear (solo SuperAdmin), promover/degradar cuenta.
- [ ] 🟡 **Sección Suscripciones** — precio, promos, meses gratis, historial, tiempos (gracia/trial). **Incluye: visibilidad del estado de membresía para el dueño en su página de cuenta/perfil** (NO en el BS — debe verse desde el **modo Personal**, porque al vencer la cuenta baja a personal; ver defensas del efectivo).
  - [ ] 🟡 **Bitácora de eventos de pago en el Panel** — centralizar TODO lo de pagos/suscripciones/membresías dentro del Panel para **no tener que salir a Stripe**. Diseño acordado (8 jun 2026):
    - **Tabla de log de eventos**: el webhook (`pago.service.ts`) registra CADA evento al procesarlo — cobro exitoso, cobro fallido, entró en gracia, suspendido, cancelado, fin de trial, reembolso, contracargo — con `negocio`, `monto`, `fecha`, `tipo` y `estado resultante`.
    - **Sección UI** (dentro de Suscripciones): listar/filtrar por **negocio, tipo de evento y fecha**; historial completo de membresía por negocio.
    - **Unificar con `admin_auditoria`** (acciones humanas: marcar pagado, pausar, cancelar) → foto completa: lo que hizo **Stripe** + lo que hicieron **admin/gerentes**.
    - **Sinergia con idempotencia**: la tabla con `event.id` como PK también sirve de guard anti-duplicados **persistente** (hoy el webhook lo hace con Redis, ver `procesarWebhook`) → dos pájaros de un tiro; migrar el dedup de Redis a esta tabla.
    - **Alcance**: guardar lo esencial de cada evento; para detalle fino (recibo PDF/metadata) un **link opcional** al recibo de Stripe, no como flujo principal.
- [ ] 🟡 **Sección Vendedores y comisiones** — alta/baja, regiones, escalera de comisiones, cortes de efectivo.
  - [ ] 🟡 **Rediseñar la tabla `embajadores`** — **quitar `porcentaje_primer_pago` y `porcentaje_recurrente`** (diseño viejo de %; la decisión es **monto fijo**). Revisar si `negocios_registrados` se guarda o se calcula. **`region_id` ya NO es la fuente de la región del vendedor** — eso ahora sale de `embajador_ciudades`; la columna `embajadores.region_id` se elimina en el **Paso 10** de la migración ciudad↔región. Mantener: `codigo_referido`, `estado`. Hacer junto con el módulo de comisiones.
- [ ] 🟡 **Sección Equipo y accesos** — crear/administrar cuentas internas (los 3 niveles).

---

## 🌆 Fase 1.5 — Operación

- [ ] 🟢 **Métricas globales** — lo medible hoy (la analítica de comportamiento es proyecto aparte).
- [ ] 🟢 **Resumen / inicio** — tablero con números gruesos.
- [ ] 🟡 **Ciudades — UI del Panel** — la migración a BD **ya está hecha** (tabla `ciudades` poblada; ver §Migración ciudad↔región). Falta: **UI** para habilitar/agrupar ciudades en regiones sin código, y que el buscador del onboarding lea de BD (hoy lee del catálogo + mapea a `ciudad_id` al guardar).
  - [ ] 🟡 **Consolidar el catálogo de ciudades (Camino B — cierre)** — el **Camino A ya se hizo**: `packages/shared/.../ciudadesPopulares.ts` se completó (= web, con Sonoyta + `estadosMexico` + `buscarEstados`) y el seed de ciudades lee de shared; el duplicado de `web` sigue vivo pero **sin descuadre**. **Falta el Camino B:** convertir `apps/web/.../ciudadesPopulares.ts` en re-export de `@anunciaya/shared` + alias `@anunciaya/shared` en `apps/web/vite.config.ts` + dep `workspace:*` en `apps/web/package.json` (los 8 importadores no cambian). Validar con `pnpm --filter @anunciaya/web build`. Riesgo bajo-medio (toca el bundler de web).
- [ ] 🟢 **Configuración** — UI para editar las configs (ya con el helper de la Ronda 3).
- [ ] 🟡 **Publicidad** — carruseles por ciudad, precios configurables, opción "todas las ciudades", métricas de ingresos.

---

## 🏙️ Migración ciudad↔región (cimiento del modelo de territorio)

> Separa **ciudad** (lugar concreto) de **región** (agrupador de ciudades). Modelo y reglas en `Panel_Admin.md` §Concepto de "región" y "ciudad". En producción (dev + prod alineados).

- [x] ✅ **Paso 1** — tabla `ciudades` (nombre/estado/pais/`slug` único/coords/alias/importancia/activa/region_id).
- [x] ✅ **Paso 2** — `ciudades` poblada (70) desde `ciudadesPopulares` de `packages/shared`, por slug (`seed-ciudades.ts`).
- [x] ✅ **Paso 3** — tabla `embajador_ciudades` (PK compuesta) + trigger "una sola región".
- [x] ✅ **Paso 4** — `negocio_sucursales.ciudad_id` (FK → ciudades, nullable).
- [x] ✅ **Paso 5** — `regiones` adelgazada (sin `estado`/`pais`, `unique(nombre)`); 2 regiones de ejemplo (Sonora-Norte = Peñasco+Sonoyta, Sonora-Centro = Caborca); regiones-ciudad viejas borradas.
- [x] ✅ **Paso 6** — texto `negocio_sucursales.ciudad` → `ciudad_id` por slug (41/43; 2 quedan null por "Por configurar"/NULL).
- [x] ✅ **Paso 7** — `embajador_ciudades` poblada (Vendedor Prueba cubre Peñasco+Sonoyta).
- [x] ✅ **Paso 8** — alcance del Panel deducido por sucursal→ciudad→región (**visibilidad = mando**, por sucursal **matriz** `es_principal` — se afinó desde "cualquier sucursal"); atribución sin región (checkout/reasignar dejan de escribir `region_id`); región del vendedor deducida de `embajador_ciudades`.
- [x] ✅ **Paso 9** — onboarding/sucursales resuelven y guardan `ciudad_id` al guardar la ubicación (helper `resolverCiudadId` por slug). El texto `ciudad` se conserva y se mantiene en sincronía.
- [x] ✅ **Paso 10 — código** — quitadas `negocios.region_id` y `embajadores.region_id` de `schema.ts`/`relations.ts`/`middleware` + migrado el último uso (región del vendedor del Panel → `embajador_ciudades`). tsc/lint en verde; en producción.
- [x] ✅ **Paso 10 — SQL** — `DROP COLUMN` de `negocios.region_id` y `embajadores.region_id` ejecutado en **DEV y PROD** (verificado: solo queda `usuarios.region_id`). Tablas de respaldo `_backup_*_20260606` eliminadas en ambos. Comentarios del código pasados a tiempo pasado. **Migración ciudad↔región CERRADA (dev + prod).**
- [ ] 🟢 **Fase 2 (futuro)** — migrar las **lecturas** de `negocio_sucursales.ciudad` (texto) a `ciudad_id → ciudades.nombre` (feed público, perfil de sucursal, ScanYA, ofertas/servicios…) para algún día eliminar la columna de texto.
- [x] ✅ **Apoyo — gerentes de prueba en DEV** — `gerente.norte@test.com` / `gerente.centro@test.com` (`seed-gerentes-dev.ts`) para validar permisos.
- [x] ✅ **Apoyo — vendedor de prueba en DEV** — `vendedor.prueba@dev.local` / `Vendedor1234*` (`rol_equipo='vendedor'`, embajador `JUAN01`, cobertura Peñasco+Sonoyta → Sonora-Norte; `seed-vendedor-prueba.ts`). Atribución Camino A re-validada E2E el 7-jun: registro con `?ref=JUAN01` → negocio "Negocio de Prueba" con `embajador_id` apuntando a JUAN01, visible en su cartera del Panel (badge del menú aún DEMO=19).
- [x] ✅ **Apoyo — fix de pool de conexiones** — `db/index.ts` (`max:5` + `idleTimeoutMillis` + cierre del pool en SIGTERM/SIGINT) para que los reinicios del watcher en dev no agoten el pooler de Supabase (session mode, 15 conexiones).
- [x] ✅ **Apoyo — fix de caché del Panel entre sesiones** — `queryClient.clear()` en `cerrarSesion()`/`iniciarSesion()` del Panel (`useAuthPanelStore`), para no arrastrar datos del usuario previo al cambiar de sesión.

---

## 💵 Camino B — Pago en efectivo (atribución por efectivo)

- [x] ✅ **Alta de un negocio que paga en efectivo DESDE EL INICIO** (HECHO 10 jun 2026, commiteado y pusheado a main) — resuelto el hueco de fondo: antes **un negocio solo podía nacer pagando con tarjeta** (el alta colgaba del checkout de Stripe → el negocio se creaba dentro del webhook `checkout.session.completed`). Ahora existe **alta manual sin Stripe**: botón **"Registrar negocio"** en la toolbar de la sección Negocios del Panel, disponible para **SuperAdmin, Gerente (su región) y Vendedor (su región)** → diálogo `DialogoRegistrarNegocio.tsx`. Endpoint **`POST /api/admin/negocios/alta-manual`** (`altaManualNegocio.service.ts`) que en una transacción crea usuario+negocio+sucursal reusando el helper compartido **`crearNegocioConDueno`** (extraído del webhook, sin regresión), con **concepto efectivo / transferencia / CORTESÍA** (cortesía = alta gratis por X meses, monto NULL y sin `fecha_primer_pago`). El negocio nace con **`metodo_cobro='manual'`** (sin `stripeCustomerId`/`stripeSubscriptionId`, el webhook nunca le llega); la **cuenta del dueño nace SIN contraseña (modelo C)** que el dueño define en su **primer ingreso con código por correo** (`correoVerificado=true`). El pago se registra en **`pagos_membresia`**, con auditoría y correo de bienvenida (best-effort). Atribución del vendedor: el vendedor se auto-atribuye; gerente/superadmin lo eligen de una lista (candado de región para el gerente). En el Panel: **ficha adaptada al método manual** (muestra "Vigencia hasta", oculta lo de Stripe) + **historial de pagos** (`GET /admin/negocios/:id/pagos`, hook `usePagosNegocio`). Harnesses DEV con datos reales (`probar-alta-manual.ts`, `probar-alta-manual-vendedor.ts`, `probar-login-sin-contrasena.ts`, `probar-pagos-negocio.ts`, `probar-alta-tarjeta.ts`). Commits `f9b197a` (pagos) + `494d739` (onboarding).
- [x] ✅ **Fase 3 — cron para EXPIRAR negocios manuales al vencer** (HECHO 10 jun 2026, commit `6d5c16f`) — cron diario `suscripciones-vencimientos-manuales.cron` → `expirarManualesVencidos`: los negocios manuales (`metodo_cobro='manual'`, sin suscripción) con `fecha_vencimiento` vencida pasan de `al_corriente → en_gracia` con la **misma fórmula/config** que el webhook de Stripe (antes solo el webhook escribía `'en_gracia'`). La transición `en_gracia → suspendido` la hereda el cron de gracia existente. Al entrar en gracia se avisa al dueño con un **tipo de notificación NUEVO `'membresia_en_gracia'`** (idempotente; se limpia al salir de gracia). No degrada la cuenta del dueño ni toca `fecha_proximo_cobro`. Migración SQL del CHECK de notificaciones aplicada en **dev y prod**. Harness `probar-vencimiento-manual.ts`.
- [x] ✅ **Fase 4 — editar el correo del dueño desde el Panel** (HECHO 10 jun 2026, commit `8c79ee8`) — rescate del alta manual con correo mal tecleado (si el correo está mal, el dueño nunca recibe el código para crear su contraseña). **`PATCH /api/admin/negocios/:id/correo-dueno`** (SuperAdmin + Gerente, alcance de región): corrige el correo, el nuevo **nace SIN verificar** y se **reenvía el código**; el endpoint devuelve si el envío salió o no para que el Panel muestre toast distinto (enviado / falló). Unicidad (409) y auditoría `'negocio_cambiar_correo_dueno'`. Panel: `DialogoEditarCorreo` + botón "Editar correo" en la sección Dueño de la ficha. Harness `probar-cambiar-correo-dueno.ts`.
- [x] ✅ **Verificación de correo del modelo C** (HECHO 10 jun 2026) — refinamiento: el alta manual nace con **`correoVerificado=false`** (SOLO manual; la tarjeta sigue `true` vía parámetro en `crearNegocioConDueno`) y se marca **`true` al crear la contraseña** (`restablecerContrasena`). Coherente: el correo se verifica cuando el dueño usa el código (prueba de posesión).
- [x] ✅ **Cortesía restringida a gerente/superadmin en el alta manual** (HECHO 10 jun 2026) — una cortesía **regala** membresía, así que el **vendedor** ya no puede darla: candado real en `altaManualNegocio.service.ts` (concepto `cortesia` + rol `vendedor` → **403**) y, en el Panel, el chip "Cortesía" se **oculta** al vendedor (`DialogoRegistrarNegocio` recibe el `rol`). El schema Zod no cambia (un schema no conoce el rol; la autorización vive en el service). Doc en `Negocios.md` (FAQ + §E + tabla de endpoints).
- [x] ✅ **Contador del menú de Negocios con dato real** (HECHO 10 jun 2026) — `GET /admin/negocios/conteo` (`contarNegocios`, mismo predicado de alcance que la lista): total del rol (super=todos · gerente=su región por matriz · vendedor=su cartera), respeta el filtro global de región. Hook `useConteoNegocios` en `PaginaPanel` baja el total a `BarraLateral`/`CajonNavegacion`; se quitó el demo 248/64/19 de `menuPanel.ts`. Harness `probar-conteo-negocios.ts`.
- [x] ✅ **Editar un pago del historial** (HECHO 10 jun 2026) — `PATCH /admin/negocios/:id/pagos/:pagoId` (`editarPagoMembresia`, super + gerente su región, auditoría `negocio_editar_pago`): corrige **concepto/monto/meses** de una fila de `pagos_membresia`, respetando el CHECK cortesía⇒monto NULL. Al guardar **recalcula el periodo** del pago (`fecha_pago + meses`) y **traslada la vigencia** del negocio (`fecha_vencimiento`/`fecha_proximo_cobro`) si es su pago más reciente. UI: `DialogoEditarPago` (chips + campo de meses solo-enteros, monto autocalculado del precio de membresía `precioPorMeses` —12m = ×10— y editable con `step 0.1`) + botón lápiz por fila en `HistorialPagos`. Mismo patrón aplicado a `DialogoMarcarPagado`. Harness `probar-editar-pago.ts`. Doc en `Negocios.md`.
- [x] ✅ **Validación de correo EN VIVO al dar el alta** (HECHO 10 jun 2026) — aviso temprano de duplicado: **`GET /api/admin/negocios/existe-correo`** (solo booleano, `requierePanel` 3 roles, misma comparación que el 409 del alta). En el Panel, `onBlur` del campo de correo avisa "Este correo ya está registrado" y bloquea el botón mientras esté duplicado/verificando. Es solo aviso temprano; el 409 del alta sigue como red de seguridad. Harness `probar-existe-correo.ts`.
- [ ] 🟡 **Registro de cobro en efectivo desde el Panel del vendedor** — el negocio se **activa al instante** (no depende de confirmación).
- [ ] 🟡 **"Efectivo por entregar" + corte de caja por vendedor** — reportado vs. entregado vs. pendiente.
- [ ] 🟡 **Comisión condicionada a la entrega** — la comisión del vendedor se libera al confirmar entrega (SuperAdmin o Gerente de su región). El negocio nunca se ve afectado.
- [ ] 🔴 **Defensas contra el "robo invisible"** (vendedor cobra y nunca registra) — **decisión tomada, construir junto con el Camino B:**
  - [ ] **Comprobante automático al negocio** al registrar el cobro (recibo correo/SMS/in-app: "membresía activa hasta X").
  - [ ] **Visibilidad del estado de membresía en la página de cuenta/perfil del dueño** ("activo hasta X") — el negocio como auditor. **Va FUERA del BS, accesible desde el modo Personal** (al vencer, la cuenta baja a personal y el dueño debe poder ver/gestionar su pago). Reusa las 5 columnas de estado de membresía.
  - [ ] *(futuro v2)* Conciliación contra el mapa/cartera.
  - [x] ~~Pedir confirmación al negocio en cada pago~~ → **descartado** (le da trabajo que no hará).
- [ ] 🟡 **Revisar `dias_retencion_pago`** (config existente, hoy decorativa) — decidir si sirve para el flujo de efectivo, se ajusta o se descarta.

---

## 🗺️ Fase 2 — Vendedores v2 (diferido, ya diseñado)

- [ ] 🟢 **Mapa de territorios** — gerente dibuja zonas a mano, asigna a vendedores (PostGIS + MapLibre).
- [ ] 🟢 **Vista del vendedor en el mapa** — cartera (negocios registrados) + prospectos.
- [ ] 🟢 **Prospectos / mini-CRM** — soltar pin de un toque, enriquecer después, marcar estado (ya pasé / falta / lo piensa / dijo que no), convertir a venta.
- [ ] 🟢 **Demo de Business Studio** — demo maestro (cuenta comercial marcada, admin por SuperAdmin) + copia privada por sesión de vendedor (respeta el 1:1 negocio-dueño).

---

## ⚙️ Configuración externa (manual, fuera del código)

- [ ] 🔴 **Stripe en PRODUCCIÓN** — todo lo siguiente se hizo en el entorno de TEST; falta replicar en la cuenta activa:
  - [ ] Verificar la empresa en Stripe (RFC, identificación, cuenta bancaria). *(bloquea todo lo demás de Stripe prod)*
  - [ ] Replicar política de reintentos (4 intentos / 2 semanas).
  - [ ] Replicar correos de recuperación (pago fallido + tarjeta por vencer).
  - [ ] Revisar que no queden links al dominio viejo `anunciaya.online` (ya migrado a `.mx`).
  - [ ] Cuadrar el periodo de gracia (14 días, Ronda 3) con los reintentos de Stripe (2 semanas).
- [ ] 🟡 **Subdominio `admin.anunciaya.mx`** — configurar en Namecheap + Vercel cuando se despliegue el Panel.

---

## 👤 Dependencias de otras partes de la app

- [ ] 🟡 **Página de cuenta/perfil del usuario** (`/perfil` o `/configuracion`) — no existe. Página dedicada **accesible desde el modo Personal**, donde el usuario gestiona: cambiar contraseña, activar **2FA**, teléfono, dirección, género, ciudad, avatar **y su SUSCRIPCIÓN** (estado "activo hasta X" + botón **reactivar/gestionar pago** vía Customer Portal de Stripe). **Debe vivir en Personal** porque al vencer la cuenta baja a personal y el dueño tiene que poder ver y reactivar su pago **sin** depender del Business Studio (comercial). Además, capturar ciudad/región aquí desbloquea delegar la gestión de usuarios a gerentes por región (hoy suspender usuarios = solo SuperAdmin porque `usuarios` no tiene región).

---

## 🔒 Fuera del Panel pero anotados (seguridad pendiente)

> No son del Panel, son de la app general. Aquí solo para no perderlos.

- [ ] 🟡 **Galería — ronda dedicada** — permitir gerente (hoy solo dueño) + validar `imageId ∈ sucursal` en `eliminarImagenGaleria`.
- [x] ✅ **Log de "Red local" con IP vieja** — actualizada a la IP de la máquina actual (`192.168.1.83`) en el banner de arranque de `apps/api`. Sigue hardcodeada (autodetección queda como mejora menor opcional). Pusheado a `main`.
- [ ] 🟡 **POST gemelos sin guard** — `POST /sucursal/:id/foto-perfil` y `POST /:id/logo` (subir) usan `req.params.id` sin guard de propiedad. Mismo hueco que ya se cerró en los DELETE.

---

## ✅ Cerrado en la sesión del 4 Jun 2026

- [x] Diseño completo del Panel (3 niveles, motor de venta, comisiones, mapa v2) → `Panel_Admin.md`
- [x] Brief de diseño del esqueleto → `Brief_Diseno_Panel_Admin.md`
- [x] Roadmap y CHANGELOG actualizados
- [x] Arreglos de seguridad (onboarding + DELETE imágenes) → en producción
- [x] Configuración de Stripe en entorno de TEST (reintentos + correos)
- [x] **Bloque de pagos completo (Rondas 1-3)** en DEV — atribución + estado de membresía + webhook de renovaciones + cron de gracia + configs conectadas (helper `obtenerConfig`). Commit local pedido; push a prod pendiente.
- [x] Decisiones cerradas: efectivo no afecta al negocio + defensas anti robo invisible; región una fuente por rol (sin replicar); rol de equipo como columna en `usuarios`; primer superadmin sembrado a mano.
- [x] **App `apps/admin` (frontend del Panel)** — andamiaje espejo de `apps/web` + login + shell responsive (escritorio + móvil), tema claro/oscuro, sesión aislada `ayadmin_`. Verificado (type-check + build) y pusheado a `main`.
- [x] **`GET /api/admin/yo`** — endpoint de identidad del Panel (reusa `requierePanel`, responde a los 3 roles). Pusheado a `main`.

---

## ✅ Cerrado en la sesión del 10 Jun 2026

- [x] **Alta manual de negocios sin Stripe (efectivo / transferencia / CORTESÍA)** — backend (`POST /api/admin/negocios/alta-manual`, `altaManualNegocio.service.ts`, schema Zod, `pagos_membresia`, catálogo de ciudades) + Panel (`DialogoRegistrarNegocio.tsx`, botón "Registrar negocio", ficha del método manual). Disponible para SuperAdmin, Gerente y Vendedor con candado de región; atribución del vendedor (auto o por lista). El negocio nace con `metodo_cobro='manual'`, fuera de Stripe.
- [x] **Crear contraseña en primer ingreso (modelo C)** — la cuenta del dueño nace sin contraseña (`correoVerificado=true`); el login web detecta `CUENTA_SIN_CONTRASENA` (409) y abre la vista "Crea tu contraseña" con código por correo + enlace **"¿Primera vez?"** debajo del botón Iniciar Sesión. `auth.service.ts` (login + `solicitarRecuperacion`), plantilla `enviarCodigoCrearContrasena`, copy "crear" vs "recuperar" en `VistaLogin`/`VistaRecuperar`/`ModalLogin` + locales `es/en`.
- [x] **Helper `crearNegocioConDueno` extraído del webhook** — `negocioManagement.service.ts`; lo usan AMBOS flujos (alta con tarjeta vía webhook `checkout.session.completed` + alta manual), sin regresión (validada por harness).
- [x] **Tabla `pagos_membresia` + historial de pagos en la ficha** — registra cada pago manual (`monto`, `concepto`, `meses_cubiertos`, `periodo_hasta`, `registrado_por`, `fecha_pago`; CHECK monto NULL en cortesía); `GET /admin/negocios/:id/pagos` + sub-componente `HistorialPagos` con hook `usePagosNegocio`.
- [x] **Fase 3 — cron de expiración de manuales** — `suscripciones-vencimientos-manuales.cron` → `expirarManualesVencidos` mueve los negocios manuales vencidos `al_corriente → en_gracia` (misma fórmula/config que el webhook); la transición a `suspendido` la hereda el cron de gracia. Aviso al dueño con tipo de notificación NUEVO `'membresia_en_gracia'` (idempotente). Migración del CHECK aplicada en dev + prod. Harness `probar-vencimiento-manual.ts`.
- [x] **Fase 4 — editar el correo del dueño** — `PATCH /admin/negocios/:id/correo-dueno` (super + gerente, alcance de región): corrige el correo, nace sin verificar, reenvía el código y devuelve si el envío salió o no (toast distinto). Unicidad (409) + auditoría `'negocio_cambiar_correo_dueno'`. Panel: `DialogoEditarCorreo` + botón "Editar correo". Harness `probar-cambiar-correo-dueno.ts`.
- [x] **Verificación de correo del modelo C** — el alta manual nace con `correoVerificado=false` (solo manual; tarjeta sigue `true`) y se marca `true` al crear la contraseña (`restablecerContrasena`): el correo se verifica al usar el código.
- [x] **Validación de correo EN VIVO** — `GET /admin/negocios/existe-correo` (booleano, 3 roles) + `onBlur` en el alta que avisa duplicado y bloquea el botón; el 409 del alta queda como red de seguridad. Harness `probar-existe-correo.ts`.
- [x] **Mejoras de onboarding (UX)** — loaders de marca (fullscreen con logo animado + shimmer; loader de paso centralizado en `CargandoPaso`, antes duplicado en los 8 pasos); header con icono en el título + botones Pausar/Cerrar Sesión como pills full-rounded; botones de navegación full-rounded (nueva prop `redondez` en `Boton`); último paso "Finalizar"; gate de ScanYA en el menú (`ColumnaIzquierda` + `MenuDrawer`) que exige CardYA activa Y onboarding completo, alineado al backend.
- [x] **Todo commiteado y pusheado a `main`** — commits `f9b197a` (`feat(pagos)`: alta manual + crear contraseña) + `494d739` (`feat(onboarding)`) + `6d5c16f` (`feat(pagos)`: cron Fase 3) + `8c79ee8` (`feat(admin)`: correo del dueño) + `908324e` (`docs`).
