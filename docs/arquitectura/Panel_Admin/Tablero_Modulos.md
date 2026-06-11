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
> **Última actualización:** 10 Junio 2026.

---

## Estado de hoy

- **Cimientos (transversal):** ✅ completos (rol + auth `requierePanel`, atribución, estado de
  membresía + webhook + cron de gracia, configs con `obtenerConfig`). **Shell + login del Panel:** ✅ en prod.
- **En construcción ahora mismo:** **Usuarios** — **Fase 0 (Definir) cerrada** (mini-spec,
  decisiones, criterios y alcance V1 acordados en `Usuarios_Pendientes.md`). Sin migración SQL.
- **Siguiente paso:** Usuarios **Fase 1 — VER** (backend de lectura → frontend de lectura → Gate 1).

---

## Los 11 módulos

| # | Módulo | Estado | Fase | Docs |
|---|---|---|---|---|
| 1 | Resumen / inicio | ⬜ | 0 | — |
| 2 | Métricas | ⬜ | 0 | — |
| 3 | **Negocios** | ✅ | ✔ Cerrado · pulido/verificación pendiente | `Negocios.md` · `Negocios_Pendientes.md` |
| 4 | **Usuarios** | 🟡 | 0 ✓ · **1 VER siguiente** | `Usuarios_Pendientes.md` |
| 5 | Suscripciones / membresías | ⬜ | 0 | — |
| 6 | Vendedores y comisiones | ⬜ | 0 | — |
| 7 | Publicidad | ⬜ | 0 | — |
| 8 | Ciudades | 🟡 | BD lista, falta UI (entra por Fase 1) | — |
| 9 | Configuración | 🟡 | backend lee (helper), falta UI | — |
| 10 | Equipo y accesos | ⬜ | 0 | — |
| 11 | Sistema (Mantenimiento + Auditoría) | 🟡 | Mantenimiento ✅ / Auditoría-UI ⬜ | `Mantenimiento_R2.md` |

---

## Notas por módulo (contexto para arrancar)

- **3 · Negocios** — en prod (VER + 6 acciones + alta manual). Pendientes en su checklist: riesgos de
  las acciones con Stripe, regularizar tarjeta morosa, paginar historial de pagos, verificación a fondo.
  (Cerrado: vendedor-no-cortesía, editar pago del historial y contador del menú real — 10 jun.)
- **4 · Usuarios** — **Fase 0 cerrada** (ver `Usuarios_Pendientes.md`). Mesa de ayuda + moderación de
  personas. **Permiso partido:** *soporte* (ver expediente + diagnóstico de acceso + rescates:
  desbloquear, reenviar verificación/contraseña, corregir correo) = **super + gerente** (cross-región,
  auditado); *moderación* (suspender/reactivar) = **solo super**. Vendedor fuera en V1. Expediente =
  tarjeta de resumen (no explorador). Sin migración. V2: denuncias, deep-link desde Negocios,
  promover/degradar, apretar cross-región cuando `usuarios` tenga región.
- **5 · Suscripciones** — precio/promos/meses gratis/historial + tiempos (gracia/trial) + **bitácora de
  eventos de pago** (Stripe + manuales, unificada) + visibilidad de membresía en el perfil del dueño.
  Aquí vive el historial financiero **completo** (el de la ficha de Negocios es solo un resumen manual).
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
