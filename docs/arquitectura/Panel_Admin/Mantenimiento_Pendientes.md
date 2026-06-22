# Mantenimiento — Pendientes

> Checklist vivo del módulo. Lo **terminado** vive en [`Mantenimiento.md`](Mantenimiento.md); aquí solo lo
> que falta. Cuando un pendiente se cierra, sale de aquí y (si cambió el comportamiento) entra al doc canónico.
>
> **Estado del módulo:** ✅ construido y en uso (V1, las 4 acciones validadas con datos reales). El backlog
> de abajo es **mejora**, no bloquea.

---

## V1 — lo construido (referencia rápida)

- ✅ **Salud del sistema** — semáforos BD/Redis/R2/Stripe + latencia, autorefresh ~45 s.
- ✅ **Tareas programadas** — los 8 crons con cadencia + última corrida; **ejecutar ahora** con **preview**.
- ✅ **Logs del BE** — ventana en memoria con filtro/pausa + **exportar** + **vaciar**.
- ✅ **Recolector R2** — analizar (dry-run) + histórico + **ejecutar limpieza** blindada (cross-ambiente).
- ✅ **Purgar caché** de configuración.
- ✅ Solo superadmin · cada acción audita · `tsc` api+admin verdes · sin migración.

---

## Backlog (mejoras, por prioridad sugerida)

### Persistencia (hoy todo es en memoria)
- ⬜ **Logs persistentes** — tabla `sistema_logs` + logger que escriba errores/eventos; filtrable por
  fecha/nivel/módulo; sobrevive redeploys. Hoy el buffer se pierde en cada despliegue (decisión consciente
  de la V1). Es el pendiente de mayor valor cuando haya tráfico real.
- ⬜ **Telemetría histórica de crons** — guardar cada corrida (no solo la última en memoria) para ver
  tendencias y fallos pasados.

### Tareas programadas
- ✅ **Sumar el cron de Publicidad al catálogo.** (HECHO 22 jun) El **8º cron** (`cron/publicidad.cron.ts`,
  cada 12 h: expira anuncios vencidos, limpia checkouts abandonados y avisa de vencimientos próximos) ya
  está en `CATALOGO_CRONS` (`cronRegistry.ts`, id `publicidad-mantenimiento`), ya **registra telemetría**
  (`registrarEjecucionCron`, que el cron ya llamaba) y tiene su **preview** (`contarMantenimientoPublicidad`
  en `publicidad-mantenimiento.service.ts` → `crons-preview.service.ts`, suma los 3 conjuntos disjuntos con
  las mismas condiciones que la ejecución). `tsc` api verde.
- ⬜ **Pausar / reanudar** un cron (hoy los intervalos son fijos en código; requiere un flag que el cron
  consulte antes de correr).
- ⬜ **Editar la cadencia** de un cron desde el Panel (reescribe la arquitectura de `setInterval` → cron
  expressions configurables). Baja prioridad.

### Recolector R2
- ⬜ **Resolver URLs rotas** desde el Panel (poner null / re-subir). Hoy solo se listan; resolverlas toca
  registros de negocio, requiere cuidado.
- ⬜ **Estadísticas de uso** de R2 (espacio por carpeta, totales).

### Nuevas herramientas (requieren backend nuevo)
- ⬜ **Tablero de migraciones SQL** — qué migración one-shot falta correr en prod (dado el flujo de
  migraciones manuales del proyecto).
- ⬜ **Visor de webhooks Stripe** — eventos recibidos/fallidos/reintentos (engancha con `WebhookReintentable`).
- ⬜ **Limpieza de tokens expirados** (`tokenStore`).

### Pulido (menor)
- ⬜ **Atribución del histórico R2.** El log de ejecuciones (`r2_reconcile_log.ejecutado_por`) muestra
  `admin-secret` aunque la limpieza se ejecute **desde el Panel** por un superadmin. El "quién" real sí
  queda en Auditoría (`registrarAuditoria` con el actor). Mejora: en `ejecutarLimpiezaR2Segura` pasar
  `ejecutadoPor` derivado del panel (nombre/correo del super) para que el histórico lo refleje.
- ⬜ **Acciones de Mantenimiento en el diccionario de Auditoría.** Las acciones nuevas
  (`mantenimiento_r2_limpiar`, `mantenimiento_cron_ejecutar`, `mantenimiento_cache_purgar`,
  `mantenimiento_logs_vaciar`) **se auditan**, pero el módulo Auditoría aún no las tiene en su diccionario
  de presentación (`accionesAuditoria.tsx`): hoy degradan a fallback legible. Agregarles etiqueta + badge
  "Sistema" para que se vean como el resto.

### Cuando se separen los buckets R2 por ambiente
- ⬜ Con buckets dev/prod separados, el **borrado desde producción dejaría de ser inseguro** → revisar si
  el guard cross-ambiente se relaja (hoy bloquea prod a propósito). Ver `Mantenimiento_R2.md` §"Migración futura".
