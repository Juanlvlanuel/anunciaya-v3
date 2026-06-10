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
- **En construcción ahora mismo:** ninguno.
- **Siguiente sugerido:** **Usuarios** (arrancar por la Fase 0 del carril).

---

## Los 11 módulos

| # | Módulo | Estado | Fase | Docs |
|---|---|---|---|---|
| 1 | Resumen / inicio | ⬜ | 0 | — |
| 2 | Métricas | ⬜ | 0 | — |
| 3 | **Negocios** | ✅ | ✔ Cerrado · pulido/verificación pendiente | `Negocios.md` · `Negocios_Pendientes.md` |
| 4 | Usuarios | ⬜ | 0 · *siguiente sugerido* | — |
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
  las acciones con Stripe, regularizar tarjeta morosa, vendedor-no-cortesía, editar concepto de un pago,
  contador del menú en demo, verificación a fondo.
- **4 · Usuarios** — ficha + suspender/bloquear (solo SuperAdmin) + promover/degradar cuenta. Hoy
  `usuarios` no tiene región → suspender = solo SuperAdmin hasta que exista ubicación en `usuarios`.
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
