# Panel Admin · Módulo Mantenimiento 🧹

> **En una frase:** el **centro de operación técnica** del SuperAdmin — de un vistazo ve si el sistema
> está sano (BD, Redis, R2, Stripe), qué hacen las tareas programadas, qué pasó en el backend (logs), y
> tiene a la mano las herramientas para **actuar**: forzar una tarea, purgar caché, vaciar logs y limpiar
> archivos huérfanos de R2.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§7) explica el módulo **en lenguaje de
> persona**. La segunda (**Apéndice técnico**) es la referencia para quien toca el código.
>
> **Estado:** construido y en uso. Es el otro medio del **módulo 11 "Sistema"** (su hermano es
> [`Auditoria.md`](Auditoria.md)). Nació con el carril completo: 0 (Definir) → 1 (VER) → 2 (ACTUAR) → 3
> (Cerrar). **Sin migración SQL** (todo es lectura de tablas existentes o estado en memoria). `tsc`
> api+admin verdes.
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) · [`Auditoria.md`](Auditoria.md) (el otro medio
> de "Sistema") · [`Mantenimiento_R2.md`](../Mantenimiento_R2.md) (**deep-dive** del Recolector de basura
> R2) · [`Negocios.md`](Negocios.md) (plantilla de oro) · [`Tokens_Panel.md`](Tokens_Panel.md). Checklist:
> [`Mantenimiento_Pendientes.md`](Mantenimiento_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Es el **tablero técnico** del sistema. Mientras los demás módulos del Panel son del **negocio** (negocios,
usuarios, cobros, comisiones), este es de la **máquina**: ¿están arriba la base de datos, Redis, el
almacenamiento y Stripe? ¿corrieron las tareas automáticas? ¿qué tronó en el servidor? ¿hay basura
acumulada en el almacenamiento?

Sirve para responder esas preguntas **sin entrar a Render, a Supabase ni a una terminal** — y para
ejecutar las tareas de mantenimiento más comunes desde un botón. Es la diferencia entre "tengo que abrir
5 paneles de proveedores para saber si algo falla" y "abro Mantenimiento y veo todo verde".

> **Hermano de Auditoría.** Juntos forman el módulo "Sistema": **Auditoría** responde *"¿quién hizo
> qué?"* (acciones de personas); **Mantenimiento** responde *"¿cómo está el sistema y qué tareas técnicas
> ejecuto?"* (salud de la infraestructura + herramientas).

## 2. ¿Quién lo usa? (alcance por rol)

**Solo el SuperAdmin.** Es infraestructura técnica **global** (no acotable por región), así que ni el
gerente ni el vendedor lo ven en el menú, y el backend los rechaza (403). No hay "lente de región" aquí:
la salud de Redis o los logs del servidor son del sistema entero.

## 3. La pantalla (4 pestañas)

Una sola sección con **pestañas** (para no generar scroll infinito); solo la pestaña abierta carga sus
datos (no se pinguea Stripe ni se refrescan logs en segundo plano si no los estás viendo):

- **Salud** — cuatro semáforos: **Base de datos · Redis · Almacenamiento R2 · Stripe**. Cada uno con su
  estado (🟢 Operativo · 🟡 Lento · 🔴 Caído) y su **latencia en ms**. Se refresca solo cada ~45 s. Al pie,
  la acción **Purgar caché** (ver §4).
- **Tareas programadas** — los **8 crons activos** del backend, cada uno con su **cadencia** (cada 6 h,
  diario…), su **última corrida** (hace cuánto + duración + ✅/❌) y un botón **▶ para ejecutarlo ahora**.
- **Logs** — la **ventana de logs recientes del backend** (los últimos ~500 `console.*`), con filtro por
  nivel (Todos / Info / Avisos / Errores), **auto-refresh** con pausa, y acciones **Exportar** y **Vaciar**.
- **Recolector R2** — el detector de **archivos huérfanos** en el almacenamiento: botón **Analizar** (un
  escaneo que reporta sin borrar), el **histórico** de ejecuciones, y —cuando es seguro— el botón
  **Ejecutar limpieza** (ver §5).

## 4. Lo que puedes *hacer* (acciones)

A diferencia de Auditoría (solo lectura), Mantenimiento **actúa**. Cada acción registra su huella en la
**Auditoría** (`registrarAuditoria`):

| Acción | Dónde | Qué hace |
|---|---|---|
| **Ejecutar tarea ahora** ▶ | Tareas | Fuerza la corrida de un cron sin esperar su horario. Antes de confirmar, muestra un **preview** de qué procesaría ("Suspenderá 3 negocios…", "No hay nada que procesar"). |
| **Purgar caché** | Salud | Borra la copia en memoria de la configuración del sistema (trial, gracia, comisiones, precio…) para que el backend la relea fresca de la BD. Útil tras tocar config por fuera del Panel o al depurar. |
| **Vaciar logs** | Logs | Limpia el buffer de logs en memoria (para reproducir un escenario desde cero). |
| **Exportar logs** | Logs | Descarga los logs actuales a un archivo `.txt`. |
| **Ejecutar limpieza R2** | Recolector | Borra los archivos huérfanos detectados — **solo cuando es seguro** (ver §5). |

> **El preview de las tareas** es el detalle de UX clave: antes de ejecutar un cron, ves **exactamente
> cuántos registros tocará y qué les hará**, calculado con la **misma condición** que la ejecución real
> (no se desincroniza) y **sin actuar** (solo cuenta). Así nunca disparas a ciegas.

## 5. El blindaje del Recolector R2 *(seguridad)*

El bucket R2 es **compartido entre desarrollo y producción** (mismas credenciales). Eso hace que **borrar
desde producción sea peligroso**: el backend de prod solo ve la base de datos de prod, así que trataría
como "huérfanos" todos los archivos que solo existen en dev — y al borrarlos, **rompería dev**.

Por eso el borrado está **blindado**: solo se permite cuando el backend tiene acceso **cross-ambiente**
(ve las dos bases de datos), que es el caso de tu **backend local**. En el Panel:

- **Local** (con la BD secundaria configurada) → aparece el botón rojo **Ejecutar limpieza**, con doble
  confirmación. El borrado es real pero seguro.
- **Producción** (o cualquier entorno sin la segunda BD) → en su lugar sale un **aviso ámbar**: *"La
  limpieza está deshabilitada aquí… solo corre desde local"*. Aunque alguien tenga el botón, el backend
  **rechaza** la ejecución (409).

El **análisis** (escaneo dry-run) y el **histórico** sí están disponibles en cualquier entorno: solo
**leen**. Detalle completo del algoritmo (mark-and-sweep, reference counting, multi-BD) en
[`Mantenimiento_R2.md`](../Mantenimiento_R2.md).

## 6. Los logs son volátiles (a propósito)

La ventana de logs y la última corrida de los crons viven **en memoria del proceso**: se **pierden en
cada despliegue/reinicio** y solo reflejan la instancia actual. Es una decisión consciente de esta primera
versión — barata y suficiente para staging/beta. La persistencia (una tabla `sistema_logs`,
telemetría histórica de crons) queda como backlog (ver pendientes).

## 7. Preguntas frecuentes

- **¿Por qué un cron dice "Aún no ha corrido"?** Porque su telemetría arranca vacía en cada despliegue y
  ese cron todavía no ha corrido en esta instancia (los diarios corren de madrugada; los de intervalo a
  los 30–90 s del arranque). No significa que esté roto.
- **¿Ejecutar una tarea "ahora" es peligroso?** No: corre **la misma lógica** que dispararía sola en su
  horario, y son **idempotentes** (a lo mucho adelantas algo que pasaría igual). Por eso basta con la
  confirmación + el preview, sin un dry-run aparte como el de R2.
- **¿"Purgar caché" borra datos?** No. Solo descarta una copia temporal en memoria; los valores siguen en
  la BD. Lo único que provoca es que el sistema los relea (cosa que de todos modos haría a los 5 min).
- **¿Por qué Salud no se actualiza solo cada segundo?** Para no abusar de la API de Stripe: la salud se
  refresca cada ~45 s (los logs sí cada ~8 s, porque son memoria). Hay botón de refrescar manual.
- **¿Por qué no veo el botón de limpieza R2 en producción?** Por seguridad (§5). En prod se ejecuta por
  cURL desde local o no se ejecuta. Es el guard funcionando.

---

# Apéndice técnico

## Mapa de archivos

**Backend** (`apps/api/src/`):

| Pieza | Archivo |
|---|---|
| **Salud** (ping BD/Redis/R2/Stripe con timeout) | `services/admin/salud.service.ts` |
| **Captura de logs** (ring buffer + monkey-patch de `console.*`) | `utils/logBuffer.ts` (activado en `index.ts` al arranque) |
| **Registro de crons** (catálogo + telemetría en memoria) | `utils/cronRegistry.ts` (cada cron llama `registrarEjecucionCron`) |
| **Acciones** (limpieza R2 blindada, ejecutar cron, purgar caché, vaciar logs) + auditoría | `services/admin/mantenimiento-acciones.service.ts` |
| **Preview de crons** (conteo de candidatos + descripción) | `services/admin/crons-preview.service.ts` |
| **Recolector R2** (reporte/ejecutar/log, ya existía) | `services/admin/mantenimiento.service.ts` |
| Controller | `controllers/admin/mantenimiento.controller.ts` |
| Rutas | `routes/admin/mantenimiento.routes.ts` (montadas **después** del gate global `requierePanel(['superadmin'])`) |
| Conteos de candidatos (reutilizan la condición de cada cron) | `services/suscripciones/{gracia,vencimientos-manuales}.ts` · `services/{servicios,marketplace}/expiracion.ts` · `services/scanya-cierre-auto.service.ts` · `cron/chatya.cron.ts` · `obtenerNegociosActivos` (alertas) |

**Frontend** (`apps/admin/src/`):

| Pieza | Archivo |
|---|---|
| Service axios (salud/logs/crons/reconcile + acciones + preview) + tipos | `services/mantenimientoService.ts` |
| Hooks RQ (queries con autorefresh + mutaciones con invalidación + preview) | `hooks/queries/useMantenimiento.ts` · keys en `config/queryKeys.ts` (`mantenimiento`) |
| Sección (4 pestañas + los 4 bloques + diálogos) | `components/mantenimiento/SeccionMantenimiento.tsx` |
| Diálogo / toasts reusados | `components/ui/DialogoConfirmar.tsx` · `stores/useToastPanel.ts` |
| Cableado · ítem de menú | `pages/PaginaPanel.tsx` · `data/menuPanel.ts` (`mantenimiento`, solo superadmin) |

## Endpoints (todos solo superadmin)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/mantenimiento/salud` | Estado + latencia de BD, Redis, R2, Stripe (ping en paralelo con timeout). |
| `GET` | `/api/admin/mantenimiento/logs?nivel=` | Ventana de logs recientes (en memoria), filtrable por nivel. |
| `POST` | `/api/admin/mantenimiento/logs/vaciar` | Vacía el buffer de logs. |
| `GET` | `/api/admin/mantenimiento/crons` | Catálogo de los 8 crons + telemetría de su última corrida. |
| `GET` | `/api/admin/mantenimiento/crons/:id/preview` | Conteo + descripción de qué haría el cron ahora (sin actuar). |
| `POST` | `/api/admin/mantenimiento/crons/:id/ejecutar` | Fuerza la corrida del cron. Audita. |
| `POST` | `/api/admin/mantenimiento/cache/purgar` | Purga el caché de configuración. Audita. |
| `GET` | `/api/admin/mantenimiento/r2-reconcile` | Reporte (dry-run) del recolector + flag `puedeEjecutar`. |
| `GET` | `/api/admin/mantenimiento/r2-reconcile/log` | Histórico de ejecuciones del recolector. |
| `POST` | `/api/admin/mantenimiento/r2-reconcile/ejecutar` | Limpieza real — **409** si el entorno no es cross-ambiente. Audita. |

## Piezas clave

- **`logBuffer.ts`** — al arranque, `inicializarCapturaLogs()` envuelve `console.log/info/warn/error` para
  empujar cada mensaje a un buffer circular (500) y seguir logueando a stdout. Volátil (memoria, 1 instancia
  en Render). `vaciarLogs()` lo limpia; `obtenerLogs({nivel})` lo lee (recientes primero).
- **`cronRegistry.ts`** — catálogo estático de los **8 crons activos** (el de comisiones se retiró, no
  aparece) + un `Map` de telemetría. Cada cron, en su camino feliz y en su catch, llama
  `registrarEjecucionCron(id, {ok, duracionMs, resultado})`. `obtenerEstadoCrons()` une catálogo +
  telemetría y estima la próxima corrida para los de intervalo fijo. El 8º es **`publicidad-mantenimiento`**
  (cada 12 h: expira anuncios vencidos, limpia checkouts abandonados y avisa de vencimientos próximos).
- **`salud.service.ts`** — `obtenerSaludSistema()` corre 4 pings en paralelo con timeout (5 s) y umbral de
  "lento" (1.5 s): BD `SELECT 1` · Redis `PING` · R2 `ListObjectsV2(MaxKeys:1)` · Stripe `balance.retrieve`.
- **Guard cross-ambiente** — `puedeEjecutarLimpiezaR2()` = `obtenerConexionesReconcile().length > 1` (tiene
  la BD secundaria). El controller del reporte expone ese flag como `puedeEjecutar`; el de ejecución lanza
  `LimpiezaBloqueadaError` (→ 409) si es falso.
- **Preview de crons** — `crons-preview.service.ts` mapea cada id a `{contar, describir}`. El `contar()`
  reutiliza la **misma condición** que la ejecución (funciones `contar*` agregadas a cada service de
  dominio, junto a su `UPDATE`), así el número es exacto y no se desincroniza. `scanya` reutiliza
  `obtenerTurnosAbiertosCandidatos` + `calcularLimiteHoras` sin cerrar; `alertas` cuenta `obtenerNegociosActivos`;
  `publicidad-mantenimiento` suma sus 3 conjuntos disjuntos (por expirar + pendientes por limpiar + avisos por
  enviar) en una sola query (`contarMantenimientoPublicidad`).

## Notas

- **Sin migración SQL.** Todo es lectura de tablas existentes (`r2_reconcile_log` ya existía con su
  migración) o estado en memoria (logs, telemetría de crons).
- **Tokens nuevos** estrenados aquí (ver `Tokens_Panel.md`): `--panel-warn` / `--panel-warn-weak` (ámbar
  para el estado "lento" de salud y avisos) y `--color-ok-suave` (verde suave para los botones de acción).
- **Solo lectura ⊄.** A diferencia de Métricas/Resumen/Auditoría, este módulo **sí** pasó por Fase 2: tiene
  acciones de escritura, cada una con confirmación + auditoría.

## Pendientes / futuro

Ver [`Mantenimiento_Pendientes.md`](Mantenimiento_Pendientes.md). En corto: **logs persistentes** (tabla
`sistema_logs`), **telemetría histórica de crons**, **pausar/editar cadencia** de un cron, tablero de
**migraciones pendientes**, **visor de webhooks Stripe**, estadísticas de uso de R2.
