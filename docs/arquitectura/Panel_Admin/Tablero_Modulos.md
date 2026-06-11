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
> **Última actualización:** 11 Junio 2026.

---

## Estado de hoy

- **Cimientos (transversal):** ✅ completos (rol + auth `requierePanel`, atribución, estado de
  membresía + webhook + cron de gracia, configs con `obtenerConfig`). **Shell + login del Panel:** ✅ en prod.
- **Recién cerrado:** **Usuarios** — módulo completo (VER + acciones + visibilidad por jerarquía y
  región + lente del superadmin + expediente depurado + métrica "último acceso al Panel"). Doc
  canónico [`Usuarios.md`](Usuarios.md) escrito. Migración manual: `usuarios_ultimo_acceso_panel.sql`.
- **Recién cerrado (11 jun):** **Suscripciones — bitácora financiera V1** (libro mayor de eventos de
  pago: cobros Stripe + pagos manuales + cancelaciones, solo lectura, KPIs, alcance por rol). Fase 1
  completa + Gate 1 verde; Fase 2 se salta (solo lectura). Doc canónico [`Suscripciones.md`](Suscripciones.md).
- **Siguiente sugerido:** Vendedores y comisiones, o los *quick-wins* Ciudades / Configuración (backend listo, falta UI).

---

## Los 11 módulos

| # | Módulo | Estado | Fase | Docs |
|---|---|---|---|---|
| 1 | Resumen / inicio | ⬜ | 0 | — |
| 2 | Métricas | ⬜ | 0 | — |
| 3 | **Negocios** | ✅ | ✔ Cerrado · pulido/verificación pendiente | `Negocios.md` · `Negocios_Pendientes.md` |
| 4 | **Usuarios** | ✅ | ✔ Cerrado · pulido/verificación pendiente | `Usuarios.md` · `Usuarios_Pendientes.md` |
| 5 | **Suscripciones** | 🟡 | Bitácora V1 ✔ cerrada (solo lectura) · resto del módulo pendiente | `Suscripciones.md` · `Suscripciones_Pendientes.md` |
| 6 | Vendedores y comisiones | ⬜ | 0 | — |
| 7 | Publicidad | ⬜ | 0 | — |
| 8 | Ciudades | 🟡 | BD lista, falta UI (entra por Fase 1) | — |
| 9 | Configuración | 🟡 | backend lee (helper), falta UI | — |
| 10 | Equipo y accesos | ⬜ | 0 | — |
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
  resumen depurada (correo/ID copiables). Migración: `usuarios_ultimo_acceso_panel.sql`. Pendiente:
  pulido visual final. V2: denuncias, deep-link desde Negocios, promover/degradar.
- **5 · Suscripciones** — **bitácora financiera V1 construida y en uso** (doc [`Suscripciones.md`](Suscripciones.md)):
  el libro mayor de eventos de pago (`eventos_pago`) — cobros Stripe + pagos manuales + cancelaciones, solo
  lectura, con KPIs y alcance por rol. Aquí vive el historial financiero **completo** (el de la ficha de
  Negocios es solo un resumen). **Resto del módulo pendiente:** precio/promos/meses gratis + tiempos
  configurables (gracia/trial) + visibilidad de membresía en el perfil del dueño. Pendientes menores de la
  bitácora: deep-link a Negocios, re-sync al editar pago, migración en prod.
- **6 · Vendedores y comisiones** — alta/baja, escalera de comisiones (monto fijo), corte de efectivo;
  rediseñar tabla `embajadores` (quitar porcentajes viejos).
- **8 · Ciudades** — tabla `ciudades` poblada; falta la **UI** para habilitar/agrupar ciudades en regiones.
- **9 · Configuración** — `configuracionSistema` + helper `obtenerConfig()` ya leen; falta la **UI** de edición.
- **11 · Sistema** — Mantenimiento R2 operativo (`Mantenimiento_R2.md`); falta la **UI** para ver `admin_auditoria`.

---

## Referencias

- **Proceso (cómo se construye un módulo):** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md).
- **Arquitectura del Panel:** [`Panel_Admin.md`](Panel_Admin.md) · **Diseño:** [`Tokens_Panel.md`](Tokens_Panel.md).
- **Pendientes globales** (módulos aún sin checklist propio): `docs/reportes/PENDIENTES_PanelAdmin.md`.
