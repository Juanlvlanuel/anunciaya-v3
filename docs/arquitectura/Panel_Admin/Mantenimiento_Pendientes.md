# Mantenimiento — Pendientes

> Checklist vivo del módulo. Lo **terminado** vive en [`Mantenimiento.md`](Mantenimiento.md); aquí solo lo
> que falta. Cuando un pendiente se cierra, sale de aquí y (si cambió el comportamiento) entra al doc canónico.
>
> **Estado del módulo:** ✅ construido y en uso (V1, las 4 acciones validadas con datos reales). El backlog
> de abajo es **mejora**, no bloquea.

---

## V1 — lo construido (referencia rápida)

- ✅ **Salud del sistema** — semáforos BD/Redis/R2/Stripe + latencia, autorefresh ~45 s.
- ✅ **Tareas programadas** — los 7 crons con cadencia + última corrida; **ejecutar ahora** con **preview**.
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
- ⬜ **Sumar el cron de Publicidad al catálogo.** El módulo Publicidad (en construcción en paralelo) agregó
  un **8º cron activo** (`cron/publicidad.cron.ts`, expira anuncios + avisa 3 días antes) que **aún no
  aparece** en `cronRegistry.ts`, no está instrumentado con `registrarEjecucionCron` y no tiene `contar*`
  para el preview. Al cerrar Publicidad: agregarlo a `CATALOGO_CRONS`, instrumentar su corrida y darle su
  conteo de candidatos. (Patrón: igual que los otros 7 — ver `Mantenimiento.md` §"Preview de crons".)
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

### Cuando se separen los buckets R2 por ambiente
- ⬜ Con buckets dev/prod separados, el **borrado desde producción dejaría de ser inseguro** → revisar si
  el guard cross-ambiente se relaja (hoy bloquea prod a propósito). Ver `Mantenimiento_R2.md` §"Migración futura".
