# ✅ Pendientes — Panel Admin

> Checklist de lo que falta para el Panel Admin y su sistema de vendedores/ventas.
> El **diseño** vive en `Panel_Admin.md`; aquí está **lo que falta hacer**.
> Última actualización: 4 Junio 2026.
>
> Leyenda: 🔴 bloqueante / base · 🟡 importante · 🟢 mejora · ✅ hecho

---

## 🏗️ Fase 0 — Cimientos (antes de construir el Panel)

- [x] ✅ **Atribución vendedor↔negocio (Camino A, tarjeta)** — `?ref=` por metadata Stripe → `embajadorId`/`regionId`/`referidoPor`. Probado en DEV. *(sin push a prod)*
- [x] ✅ **Estado de membresía** — 5 columnas en `negocios` + ciclo de 4 estados. Probado en DEV. *(sin push)*
- [x] ✅ **Webhook de renovaciones + cron de gracia** — `invoice.*` + `subscription.*` + cron diario de suspensión. Probado en DEV. *(sin push)*
- [x] ✅ **Ronda 3 — configs conectadas** — helper `obtenerConfig()` (3 funciones + cache 5min), clave nueva `periodo_gracia_cobro_dias=14`, trial 7→14, gracia 7→14. Probado en DEV (lee 14, fallback no truena). **Bloque de pagos COMPLETO.**
- [x] ✅ **Push de la Fase 0 a producción** — TODA la Fase 0 (bloque de pagos + rol/auth + enforcement) commiteada, pusheada y con **las migraciones ya corridas en producción** (estado de membresía, clave de gracia, rol_equipo+region_id). DEV y PROD alineados en código y schema.
- [x] ✅ **Superadmin sembrado en PRODUCCIÓN** — `admin@anunciaya.mx` registrada en prod + `rol_equipo='superadmin'` verificado en la tabla `usuarios` de prod (`adaxddsvzuzbycjojwoo`). **FASE 0 COMPLETA AL 100% (dev + producción).**
- [x] ✅ **Rol de equipo + auth del Panel** — `rol_equipo` + `region_id` en `usuarios`, rol en el JWT (login + refresh), middleware `requierePanel` que revalida contra BD, gate dual (`x-admin-secret` O superadmin), región una fuente por rol (gerente→`usuarios`, vendedor→`embajadores`). Probado en DEV: login normal intacto (49 usuarios con rol null), gate en 4 escenarios, superadmin revalidado en BD con token viejo. **Primer superadmin sembrado:** `admin@anunciaya.mx` (cuenta personal creada + UPDATE a superadmin, verificado). *(sin push)*
- [x] ✅ **Enforcement de `usuarios.estado`** — login bloquea cuentas no-activas (403 con `CUENTA_SUSPENDIDA`/`CUENTA_INACTIVA`), `requierePanel` corta al instante (revalida BD), refresh ya cortaba sesiones vivas. Sin migración (el campo ya existía). `verificarToken` NO se tocó (hot path). Probado en DEV: 6 escenarios en verde, login de activos intacto. *(sin push)* **← Fase 0 COMPLETA**

---

## 🖥️ Fase 1 — Motor (secciones del Panel)

- [x] ✅ **UI del Panel — esqueleto/shell** — app `apps/admin` (espejo de `apps/web`, puerto 3100). Login (`/`) contra `/auth/login` + validación de rol via `GET /api/admin/yo`; shell **responsive** (`/inicio`): escritorio (header negro + sidebar + panel flotante) y móvil (header + saludo/región + tab-bar con "Más" + cajón). Menú filtrado por rol, selector de región y bandeja de pendientes. Tema claro/oscuro, IBM Plex Sans, sesión aislada (`ayadmin_`). Verificado en DEV (type-check + build) y **pusheado a `main`**.
  - [x] ✅ **Cabos del shell cerrados** — **recuperar contraseña** (código de 6 dígitos por correo, reusa `/auth/olvide-contrasena` + `/auth/restablecer-contrasena`), **refresh token automático** en el axios del Panel (renueva con `/auth/refresh` ante 401, con cola), y **2FA del Panel** (TOTP en la puerta, **opcional para los 3 roles**, candado real vía claim `panel2fa` en el JWT + columnas `panel_2fa_*`; migración corrida en dev + prod). Pantalla **Seguridad** en el menú del avatar. Probado en DEV.
  - [ ] 🟡 **Pendiente del shell:** **datos reales** (nombres de región, contadores del menú y bandeja de pendientes hoy son demo).
  - [ ] 🟡 **Despliegue del Panel** — proyecto Vercel propio (Root `apps/admin`) + subdominio `admin.anunciaya.mx` + sumar el origen al CORS de `apps/api` (prod).
- **Sección Negocios** — se construye por entregas:
  - [x] ✅ **Entrega 1 (VER, solo lectura)** — tabla (nombre/ciudad/vendedor/estado de pago/próximo cobro/alta) con buscador + filtros (estado con conteos, vendedor, ciudad) + orden + paginado de servidor; **ficha administrativa** (modal en escritorio / bottom-sheet en móvil) con alcance por rol. Componentes base reutilizables del Panel creados (`ModalAdaptativo` + `useBackNativo`). 5 Jun 2026, dev, **sin push**. Detalle: `docs/reportes/REPORTE_Negocios_Entrega1_VER.md`.
  - [ ] 🟡 **Entrega 2 (ACTUAR)** — las 4 acciones con su lógica: **marcar pagado / reactivar manual** (solo SuperAdmin; pausa el cobro de Stripe con `pause_collection`), **suspender** (SuperAdmin + Gerente su región; suspensión manual que el webhook respeta), **cancelar** (solo SuperAdmin; soft-delete recuperable + corta Stripe + degrada la cuenta a personal), **reasignar vendedor** (SuperAdmin / Gerente su región, con auditoría). Requiere migraciones: `negocios.metodo_cobro`, marca de suspensión/archivado, tabla `admin_auditoria`. **NO existe "aprobar"** (Modelo A: publicación automática al pagar + onboarding).
- [ ] 🟡 **Sección Usuarios** — ficha, suspender/bloquear (solo SuperAdmin), promover/degradar cuenta.
- [ ] 🟡 **Sección Suscripciones** — precio, promos, meses gratis, historial, tiempos (gracia/trial). **Incluye: visibilidad del estado de membresía en el BS del negocio** (ver defensas del efectivo).
- [ ] 🟡 **Sección Vendedores y comisiones** — alta/baja, regiones, escalera de comisiones, cortes de efectivo.
  - [ ] 🟡 **Rediseñar la tabla `embajadores`** (hoy vacía, seguro modificar) — **quitar `porcentaje_primer_pago` y `porcentaje_recurrente`** (son del diseño viejo de %; la decisión es **monto fijo**). Revisar si `negocios_registrados` se guarda o se calcula (los contadores guardados se desincronizan). Mantener: `region_id` (= fuente de la región del vendedor), `codigo_referido`, `estado`. Hacer junto con el módulo de comisiones.
- [ ] 🟡 **Sección Equipo y accesos** — crear/administrar cuentas internas (los 3 niveles).

---

## 🌆 Fase 1.5 — Operación

- [ ] 🟢 **Métricas globales** — lo medible hoy (la analítica de comportamiento es proyecto aparte).
- [ ] 🟢 **Resumen / inicio** — tablero con números gruesos.
- [ ] 🟡 **Ciudades** — migrar la lista hardcodeada (`data/ciudadesPopulares`) a BD + UI para habilitar ciudades sin código + que el buscador lea de BD.
- [ ] 🟢 **Configuración** — UI para editar las configs (ya con el helper de la Ronda 3).
- [ ] 🟡 **Publicidad** — carruseles por ciudad, precios configurables, opción "todas las ciudades", métricas de ingresos.

---

## 💵 Camino B — Pago en efectivo (atribución por efectivo)

- [ ] 🟡 **Registro de cobro en efectivo desde el Panel del vendedor** — el negocio se **activa al instante** (no depende de confirmación).
- [ ] 🟡 **"Efectivo por entregar" + corte de caja por vendedor** — reportado vs. entregado vs. pendiente.
- [ ] 🟡 **Comisión condicionada a la entrega** — la comisión del vendedor se libera al confirmar entrega (SuperAdmin o Gerente de su región). El negocio nunca se ve afectado.
- [ ] 🔴 **Defensas contra el "robo invisible"** (vendedor cobra y nunca registra) — **decisión tomada, construir junto con el Camino B:**
  - [ ] **Comprobante automático al negocio** al registrar el cobro (recibo correo/SMS/in-app: "membresía activa hasta X").
  - [ ] **Visibilidad del estado de membresía en el BS del negocio** ("activo hasta X") — el negocio como auditor. Reusa las 5 columnas de estado de membresía.
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

- [ ] 🟡 **Página de perfil del usuario** (`/perfil`) — no existe. Necesaria para capturar ciudad/región del usuario → desbloquearía delegar la gestión de usuarios a gerentes por región (hoy suspender usuarios = solo SuperAdmin porque `usuarios` no tiene región).

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
