# Panel Admin · Módulo Auditoría — Pendientes / checklist 🧾

> **Qué es:** el checklist vivo del módulo Auditoría (lo que FALTA). Lo **terminado** vive en el doc
> canónico [`Auditoria.md`](Auditoria.md). **Estado: construido y cerrado** (esencialmente lectura →
> saltó la Fase 2 de acciones; el único "actuar" es el borrado de limpieza del super).
>
> **Última actualización:** 21 Junio 2026 · **Fase:** ✔ Cerrado.

---

## Estado

UI de lectura de `admin_auditoria`: **lista** (tabla/cards) con filtros (acción · persona · periodo ·
orden) y paginación en servidor, **ficha** de detalle instantánea, **alcance por rol** (super = todo ·
gerente = su equipo · vendedor 403) + lente de región, y **borrado de limpieza** (papelera por fila +
vaciar, **solo super**, para staging). El valor del módulo es el **sistema de presentación** que traduce
~40 tipos de acción a lenguaje de persona sin jerga ni UUIDs (ver §5 del doc canónico), de forma
sistémica y con degradación elegante ante acciones nuevas. La **escritura** ya existía como cimiento
(`registrarAuditoria`). Verificado con harness (`probar-auditoria-lectura.ts`) + `tsc` api+admin y
`vite build` verdes. **Sin migración SQL.** **Qué es y cómo funciona:** [`Auditoria.md`](Auditoria.md).

## Checklist de fases

```
### Módulo: Auditoría   ·   ✔ CERRADO

Fase 0 — Definir       [x] mini-spec · alcance por rol (super todo / gerente su equipo / vendedor 403) · criterios
Fase 1 — VER           [x] Backend lectura (lista + detalle + actores + alcance + resolución de ids/nombres)
                       [x] Frontend lectura (sección + ficha instantánea + diccionarios de presentación)
                       [x] GATE 1: harness verde + revisión de Juan (seed 1×acción por rol real) + tsc/build ✅
Fase 2 — ACTUAR        → esencialmente SE SALTA (solo el borrado de limpieza del super)
                       [x] Backend borrado (eliminar uno / vaciar, gate solo superadmin)
                       [x] Frontend borrado (papelera por fila + Vaciar, con DialogoConfirmar)
Fase 3 — Cerrar        [x] Doc canónico Auditoria.md · [x] este checklist · [x] tablero
                       [x] ROADMAP/CHANGELOG · [x] memoria · [ ] commit (lo hace Juan)
```

## Backlog (mejoras menores, no bloquean)

- 🟢 **Deep-links desde la ficha:** "Sobre: Plomería Express" → abrir esa ficha en Negocios; el actor /
  el usuario afectado → su expediente en Usuarios. (Se difirió por colisión con el trabajo paralelo de
  Resumen/Métricas sobre `useNavegacionPanel`; el patrón de deep-link ya existe, replicarlo aquí.)
- 🟢 **Filtro de acción dinámico:** hoy el dropdown lista el **catálogo** estático (`ACCION_LABEL`); puede
  mostrar opciones que aún no han ocurrido (sale vacío al elegirlas). Mejora: poblarlo con un endpoint de
  `DISTINCT accion` presentes en el alcance.
- 🟢 **Limpiar etiquetas no emitidas** de `ACCION_LABEL`: quedan mapeadas algunas acciones que el código
  actual ya no emite (`usuario_enviar_acceso`, `equipo_cambiar_ciudades`, `vendedor_efectivo_cobro`,
  `comisiones_recalcular`). Se conservan para que **datos históricos** se vean legibles; revisar si hay
  registros viejos antes de borrarlas. (Ya se sacaron del seed de revisión.)
- 🟦 **Export CSV / rango grande:** exportar la bitácora filtrada (para auditorías externas).
- 🟦 **Retención / archivado:** política de purga automática (la tabla crece sin techo). Hoy se limpia a
  mano (super). Definir retención cuando haya volumen real.
- 🟦 **Búsqueda por entidad:** filtrar "todas las acciones sobre *este* negocio/usuario" (el backend ya
  acepta `entidadTipo`/`entidadId`; falta exponerlo en la UI, ideal junto a los deep-links).

## Referencias
- **Doc canónico:** [`Auditoria.md`](Auditoria.md) · **Carril:** [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
- **Diseño:** [`Tokens_Panel.md`](Tokens_Panel.md) · **Arquitectura:** [`Panel_Admin.md`](Panel_Admin.md) · **Otro medio del módulo 11:** [`Mantenimiento_R2.md`](Mantenimiento_R2.md)
