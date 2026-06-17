# Panel Admin — Tablero de módulos

> **Qué es:** el estado de los **11 módulos del Panel de un vistazo**. Es el **índice maestro**:
> dice en qué fase está cada módulo y dónde están sus dos documentos. Para el detalle de pendientes,
> abre el `<Modulo>_Pendientes.md`; para el proceso, el carril.
>
> **Cómo retomar (sesión nueva):** lee este tablero → identifica el módulo activo y su fase → abre el
> carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) y los 2
> docs del módulo.
>
> **Mantener al día:** al **cerrar** cada sesión, actualiza la fila del módulo en que se trabajó (y la
> sección "Estado de hoy").
>
> **Leyenda — Estado:** ✅ en producción · 🟡 parcial · ⬜ sin empezar
> **Leyenda — Fase del carril:** 0 Definir · 1 VER · 2 ACTUAR · 3 Cerrar · ✔ Cerrado
>
> **Última actualización:** 17 Junio 2026.

---

## Estado de hoy

- **Cimientos (transversal):** ✅ completos (rol + auth `requierePanel`, atribución, estado de
  membresía + webhook + cron de gracia, configs con `obtenerConfig`). **Shell + login del Panel:** ✅ en prod.
- **Recién cerrado:** **Usuarios** — módulo completo (VER + acciones + visibilidad por jerarquía y
  región + lente del superadmin + expediente depurado + métrica "último acceso al Panel"). Doc
  canónico [`Usuarios.md`](Usuarios.md) escrito. Migración manual: `usuarios_ultimo_acceso_panel.sql`.
- **Recién cerrado (16 jun):** **Equipo y accesos** — el "RR.HH./IT" del Panel: VER + alta de
  vendedor y de gerente + editar datos + reasignar región + revocar/reactivar (vendedores y gerentes) +
  typeahead/autocompletado de cuentas + aviso de promoción. Sin migración SQL. Doc canónico
  [`Equipo_y_accesos.md`](Equipo_y_accesos.md). Verificado con 2 harness (lectura 12 + acciones 16) y builds en verde.
- **Recién cerrado (11 jun):** **Suscripciones — bitácora financiera V1** (libro mayor de eventos de
  pago: cobros Stripe + pagos manuales + cancelaciones, solo lectura, KPIs, alcance por rol). Fase 1
  completa + Gate 1 verde; Fase 2 se salta (solo lectura). Doc canónico [`Suscripciones.md`](Suscripciones.md).
- **Recién avanzado (17 jun):** **Vendedores y comisiones — Fase 1 (VER), pieza A "Cartera"** construida y
  verificada (GATE 1 con harness de datos reales). Vista de **detalle master-detail** del vendedor (perfil +
  cartera) para super/gerente. El vendedor ve su cartera en "Mi cartera" (Negocios) y aquí solo sus comisiones
  (Fase 2) — sin duplicar (D14). Tokens del Panel aplicados. Doc [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md).
- **Recién cerrado (17 jun):** **Configuración v1** — el **tablero económico** (doc [`Configuracion.md`](Configuracion.md)):
  editar **trial/gracia** + **escalera de comisiones** configurable (clave JSON `comision_escalera`), con editor de
  tramos (vista previa en vivo + rueda del mouse), validación dura (sin huecos/solapes), auditoría y reset de caché.
  Solo SuperAdmin. Verificado con 2 harness + builds verdes; persistencia validada en dev. **Migración prod pendiente**
  (idempotente, opcional). → **Desbloquea Vendedores Fase 2** (que lee la escalera para el devengo). El **precio de
  membresía** + promos de lanzamiento (Coupons de Stripe) siguen siendo sprint aparte en Suscripciones.
- **Siguiente:** **Vendedores Fase 2** (devengo/liquidación de comisiones, ya con la escalera configurable).

---

## Los 11 módulos

| # | Módulo | Estado | Fase | Docs |
|---|---|---|---|---|
| 1 | Resumen / inicio | ⬜ | 0 | — |
| 2 | Métricas | ⬜ | 0 | — |
| 3 | **Negocios** | ✅ | ✔ Cerrado · backlog menor | `Negocios.md` · `Negocios_Pendientes.md` |
| 4 | **Usuarios** | ✅ | ✔ Cerrado | `Usuarios.md` · `Usuarios_Pendientes.md` |
| 5 | **Suscripciones** | 🟡 | Bitácora V1 ✔ cerrada (solo lectura) · resto del módulo pendiente | `Suscripciones.md` · `Suscripciones_Pendientes.md` |
| 6 | **Vendedores y comisiones** | 🟡 | Fase 1 · Cartera (VER) ✅ · resto Fase 2 | `Vendedores_y_comisiones_Pendientes.md` |
| 7 | Publicidad | ⬜ | 0 | — |
| 8 | Ciudades | 🟡 | BD lista, falta UI (entra por Fase 1) | — |
| 9 | **Configuración** | 🟡 | v1 ✔ (VER+ACTUAR+cierre) · backlog: migración prod + claves futuras | `Configuracion.md` · `Configuracion_Pendientes.md` |
| 10 | **Equipo y accesos** | ✅ | ✔ Cerrado | `Equipo_y_accesos.md` · `Equipo_y_accesos_Pendientes.md` |
| 11 | Sistema (Mantenimiento + Auditoría) | 🟡 | Mantenimiento ✅ / Auditoría-UI ⬜ | `Mantenimiento_R2.md` |

---

## Notas por módulo (contexto para arrancar)

- **3 · Negocios** — en prod (VER + 6 acciones + alta manual), **verificado de punta a punta**
  (acciones de tarjeta contra Stripe real). El **vendedor ya registra pagos en efectivo de sus
  negocios manuales** (su cartera, sin tarjeta ni cortesía). Pendientes menores (backlog): regularizar
  tarjeta morosa · lock anti doble-click · monto read-only (bloqueado por precio configurable).
  (Cerrados: cortesía, editar pago, contador real, cancelar transaccional, paginar historial,
  verificación §4, fecha/consistencia descartadas, pago del vendedor.)
- **4 · Usuarios** — **en uso** (doc canónico [`Usuarios.md`](Usuarios.md)). Mesa de ayuda + moderación
  de personas. **Permiso partido:** *soporte* (desbloquear, código de acceso, corregir correo) =
  **super + gerente**; *moderación* (suspender/reactivar) = **solo super**. **Gerente acotado por
  región** (clientes todos; dueños/encargados/vendedores de su región; nunca otros gerentes) +
  **lente de región** del superadmin. Taxonomía de roles en la columna Rol; expediente = tarjeta de
  resumen depurada (correo/ID copiables). Migración: `usuarios_ultimo_acceso_panel.sql`. **Cerrado** (Fase 3 completa, 15 jun: pulido
  visual + verificación de suspensión). V2: denuncias, deep-link desde Negocios, promover/degradar.
- **5 · Suscripciones** — **bitácora financiera V1 construida y en uso** (doc [`Suscripciones.md`](Suscripciones.md)):
  el libro mayor de eventos de pago (`eventos_pago`) — cobros Stripe + pagos manuales + cancelaciones, solo
  lectura, con KPIs y alcance por rol. Aquí vive el historial financiero **completo** (el de la ficha de
  Negocios es solo un resumen). **Resto del módulo pendiente:** precio/promos/meses gratis + tiempos
  configurables (gracia/trial) + visibilidad de membresía en el perfil del dueño. Pendientes menores de la
  bitácora: deep-link a Negocios, re-sync al editar pago, migración en prod.
- **6 · Vendedores y comisiones** — **Fase 1 (VER) · pieza A "Cartera" ✅ y en uso** (detalle master-detail del
  vendedor; doc [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md)). **Falta Fase 2:**
  devengo (escalera monto fijo + recurrente), liquidación (datos de cobro + pagos + bitácora de egresos `pagos_vendedor`),
  cortes de efectivo; rediseñar `embajadores`/`embajador_comisiones` (migración la corre Juan). **Cobertura avanzada
  DIFERIDA** (multi-región parcial / multi-gerente / mover-con-reasignación, §Diferido de `Equipo_y_accesos_Pendientes.md`):
  reescribe el alcance que hoy asume "vendedor de UNA región" en `panel.middleware` + Negocios/Usuarios/Suscripciones/Equipo.
- **8 · Ciudades** — tabla `ciudades` poblada; falta la **UI** para habilitar/agrupar ciudades en regiones.
- **9 · Configuración** — **v1 construido y en uso** (doc [`Configuracion.md`](Configuracion.md)): el tablero
  económico (escalera de comisiones + trial + gracia), solo SuperAdmin, con auditoría y reset de caché. Backlog:
  correr la migración en prod (idempotente), y sumar claves nuevas cuando una sección futura tenga una palanca
  económica real. El **precio de membresía** queda para el sprint de Suscripciones (Stripe + Coupons).
- **10 · Equipo y accesos** — **cerrado y en uso** (doc [`Equipo_y_accesos.md`](Equipo_y_accesos.md)). El
  "RR.HH./IT": alta de vendedor/gerente, editar datos, reasignar región, revocar/reactivar (vend. y
  gerente), revocados visibles, typeahead de cuentas + promoción con aviso. **Sin migración.** Permisos:
  crear/mover/revocar gerentes = solo super; alta/edición de vendedor = super + gerente (su región). El
  **territorio avanzado** (multi-región parcial, mover-con-reasignación de cartera) se difirió al módulo 6.
- **11 · Sistema** — Mantenimiento R2 operativo (`Mantenimiento_R2.md`); falta la **UI** para ver `admin_auditoria`.

---

## Referencias

- **Proceso (cómo se construye un módulo):** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
- **Arquitectura del Panel:** [`Panel_Admin.md`](Panel_Admin.md) · **Diseño:** [`Tokens_Panel.md`](Tokens_Panel.md).
- **Pendientes globales** (módulos aún sin checklist propio): `docs/reportes/PENDIENTES_PanelAdmin.md`.
