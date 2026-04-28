# Sprint — ScanYA Multi-Sucursal (dueños, gerentes, empleados)

> **Estado:** ✅ **CERRADO** (27-28 abril 2026)
> **Última actualización:** 28 Abril 2026
> **Resumen:** 4 fases completas (UI selector + 3 roles validados + coherencia A en todos los modales + stats validadas en BS Empleados). Ver entrada completa en `docs/CHANGELOG.md` con fecha 27-28 abril 2026.

---

## ⚠️ Histórico — el contenido abajo es del prompt original cuando se planeó el sprint

Se conserva como referencia. Para el balance final consultar `docs/CHANGELOG.md` y `docs/arquitectura/ScanYA.md` v1.5.

---

## Cómo usar

1. Abre un chat nuevo de Claude Code en `E:\AnunciaYA\anunciaya`
2. Pega el bloque completo de la sección **Prompt** más abajo
3. El asistente te guía paso a paso por las 3 fases

---

## Contexto post-sprint BS (25 Abril 2026)

Antes de arrancar este sprint, cerramos el **sprint multi-sucursal de Business Studio**. Lo que quedó relevante para ScanYA:

- ✅ **Sprint BS cerrado al 100%** — Prueba 1 (vista dueño, 12 módulos) + Prueba 2 (vista gerente). Ver `docs/reportes/sprint-sucursales-pruebas-abril-2026.md`.
- ⏳ **Gap explícito heredado del módulo 9 (Empleados de BS)**: la "validación numérica" de las **Estadísticas ScanYA** (Turnos / Transacciones / Puntos del modal de detalle de empleado) se difirió a **este sprint**. La UI ya existe; falta confirmar que los números reflejan correctamente la sucursal-empleado cuando se generan transacciones reales con cada empleado en ScanYA.
- 🛡️ **Nuevo `MatrizGuard`** (`apps/web/src/router/guards/MatrizGuard.tsx`) creado para rutas exclusivas de Matriz en BS (Puntos, Sucursales). **No aplica a ScanYA** — ScanYA tiene sus propios mecanismos: token JWT con `sucursalId` fijo + login bloqueado cuando `activa=false`. No mezclar.
- 🐛 **Bug histórico mitigado** en query `mejorOferta` del reporte de Promociones BS — quedan ofertas legacy con `imagen=NULL` en BD que el fix neutraliza pero no limpia (no afecta a ScanYA).
- 🎨 **Refactor UI en Mi Perfil tab Imágenes** — botones azul/rojo migrados a `bg-slate-800` dark gradient (TC-7). Si tocas botones similares en ScanYA (login/header), seguir el mismo patrón.

---

## Backend — implementado ✅

- `apps/api/src/routes/scanya.routes.ts:49` — ruta `POST /login-dueno`
- `apps/api/src/services/scanya.service.ts:95-439` — función `loginDueno(correo, contrasena, sucursalId?)`:
  - Si recibe `sucursalId`, valida que pertenezca al negocio del dueño y usa esa sucursal
  - Si NO lo recibe, cae a la Matriz automáticamente (`esPrincipal=true`)
- Token JWT incluye `sucursalId` fijo + flag `puedeElegirSucursal: true` (línea 389-402)
- Tablas `scanya_turnos` (schema.ts:1579) y `puntos_transacciones` (schema.ts:1698) con `sucursal_id NOT NULL` — aislamiento por sucursal funciona
- `abrirTurno` (línea 866) y `otorgarPuntos` escriben `payload.sucursalId` del token correctamente
- Helper `revocarEmpleadosDeSucursal(sucursalId, motivo)` en `negocioManagement.service.ts` — cierra turnos ScanYA + revoca Redis + emite socket. Se usa al desactivar/eliminar sucursal. El endpoint de cambiar sucursal (a implementar) puede reutilizar los patrones: cerrar turno activo del dueño, re-emitir tokens, abrir nuevo turno
- `refrescarTokenScanYA` ya verifica revocación en Redis antes de emitir nuevo token (`estaTokenRevocado(empleadoId, iatPayload)`) — no aplica directamente al dueño pero muestra el patrón
- Bloqueo de login cuando `sucursal.activa = false` (3 paths)
- Cupones canjeables cross-sucursal (validado manualmente)
- Clonado de ofertas públicas al crear sucursal con imágenes R2 independientes
- Zona horaria por estado en `crearSucursal` y `actualizarSucursal` (`getZonaHorariaPorEstado`)
- Protección de historial al eliminar sucursal: `409 TIENE_HISTORIAL` si hay `puntos_transacciones`

---

## Frontend — NO implementado ❌

- `apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx` — no tiene selector de sucursal. Nunca envía `sucursalId` al backend
- `apps/web/src/stores/useScanYAStore.ts` — no tiene acción `cambiarSucursal`
- `apps/web/src/components/scanya/HeaderScanYA.tsx:249-258` — muestra el nombre de sucursal como `<p>` estático (no clickeable)
- `grep puedeElegirSucursal` en `apps/web/src` → 0 resultados (el flag viaja en el token pero el frontend lo ignora)

---

## Pruebas manuales ya validadas

- ✅ Empleado de Sucursal Norte canjeó voucher en su sucursal
- ✅ Gerente en Matriz canjeó voucher (Pizza Mediana)
- ✅ Revocación de sesión ScanYA (manual + al desactivar/eliminar sucursal)
- ✅ Notificación de voucher pendiente limpiada al canjear
- ✅ Login bloqueado en sucursal desactivada (3 paths)

---

## Prompt

```
# Sprint dedicado — ScanYA Multi-Sucursal (dueños, gerentes, empleados)

Retomando el proyecto AnunciaYA. Este chat está dedicado a validar y
completar el comportamiento multi-sucursal en ScanYA según los 3 roles:
dueño, gerente y empleado.

## LEE PRIMERO (en este orden, NO releer todo el código)

1. `docs/reportes/prompt-sprint-scanya-multi-sucursal.md`
   → Este mismo documento. Tiene el contexto técnico completo:
   backend implementado, frontend pendiente, pruebas validadas,
   contexto post-sprint BS y notas de diseño.

2. `docs/arquitectura/ScanYA.md` (v1.4)
   → Arquitectura del módulo. Presta atención a las secciones:
   - Bloqueo de login en sucursal desactivada (los 3 flujos)
   - Limpieza de notificaciones de voucher al canjearse
   - Revocación de sesión ScanYA (defensa en 3 capas)

3. `docs/arquitectura/Empleados.md`
   → Permisos granulares, política dueño vs gerente, revocación de sesión

4. `CLAUDE.md` (secciones: "Multi-Sucursal", "Reglas de Trabajo")

## CONTEXTO RÁPIDO

AnunciaYA es una super-app de comercio local. Los negocios pueden
tener múltiples sucursales. Roles:

- **Dueño** (`usuarios.sucursalAsignada = null`, `usuarios.negocioId != null`):
  acceso a todas sus sucursales
- **Gerente** (`usuarios.sucursalAsignada = UUID`): solo a su sucursal
  asignada
- **Empleado** (login aparte con nick/PIN): solo a la sucursal donde
  fue creado

ScanYA es el módulo operativo donde se registran ventas con QR/código
de cliente. Los dueños pueden entrar a ScanYA con su cuenta de AnunciaYA
(correo+contraseña) usando el endpoint `POST /api/scanya/login-dueno`.

## PROBLEMA ACTUAL

El dueño con múltiples sucursales queda **fijo a la Matriz** durante
toda su sesión ScanYA. No puede cambiar de sucursal sin cerrar sesión
y volver a entrar (y ni así porque tampoco hay selector).

## QUÉ VAMOS A HACER EN ESTE SPRINT

### Fase 1 — Implementar UI frontend del selector (backend ya está)

Objetivo: que el dueño con múltiples sucursales pueda:
1. Elegir sucursal al hacer login ScanYA
2. Cambiar de sucursal durante su sesión sin cerrar sesión

Cambios esperados en código:

- `PaginaLoginScanYA.tsx`: selector de sucursal si
  `puedeElegirSucursal && sucursales.length > 1`
- `useScanYAStore.ts`: acción `cambiarSucursal(sucursalId)` que:
  - Cierra el turno actual (si hay)
  - Re-autentica contra backend para obtener nuevo token con sucursalId
  - Abre nuevo turno en la nueva sucursal
  - Actualiza el store local
- `HeaderScanYA.tsx`: mostrar sucursal como elemento clickeable con
  selector dropdown (solo si `puedeElegirSucursal`)
- Nuevo: `apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx`
  — modal selector tipo bottom-sheet en móvil

Backend a implementar:
- `POST /api/scanya/cambiar-sucursal` — body `{ sucursalId }`
- Service `cambiarSucursalDueno(usuarioId, sucursalId)`:
  - Validar que el usuario del token es dueño (`tipo === 'dueno'`)
  - Validar que sucursalId pertenece a su negocio
  - Cerrar turno activo si existe (UPDATE `scanya_turnos.hora_fin = NOW()`)
  - Re-emitir tokens JWT con nuevo sucursalId
  - Abrir nuevo turno en la nueva sucursal
  - Retornar `{ accessToken, refreshToken, sucursalId, sucursalNombre }`

### Fase 2 — Validar comportamiento por rol (3 escenarios)

#### Rol 1: DUEÑO
- Login sin sucursalId → cae a Matriz (comportamiento actual)
- Login con selector → puede elegir cualquier sucursal de su negocio
- Durante sesión → puede cambiar (cierra turno A, abre turno B)
- Las ventas/canjes quedan registrados en la sucursal activa
- Ve datos solo de la sucursal activa (ventas, vouchers pendientes, etc.)

#### Rol 2: GERENTE
- Login → directo a su sucursalAsignada (sin opción de elegir)
- NO ve selector de sucursal
- Flag `puedeElegirSucursal = false` en su token
- Si intenta forzar otra sucursal vía API → 403

#### Rol 3: EMPLEADO
- Login con nick + PIN → va a la sucursal donde fue creado (tabla empleados)
- NO puede cambiar de sucursal
- Si su sucursal fue desactivada → login bloqueado con mensaje claro
- Si su sesión fue revocada → expulsión inmediata (Redis + socket)

### Fase 3 — Aislamiento de datos por sucursal

Para cada rol, validar que ScanYA muestra SOLO datos de su sucursal activa:
- Ventas del turno (solo las de esta sucursal)
- Vouchers pendientes de canjear (filtrar `WHERE sucursal_id = X OR sucursal_id IS NULL`)
- Historial de transacciones recientes
- Estadísticas del turno (totales, contadores)

### Fase 4 — Validación numérica de stats ScanYA en BS Empleados

Heredado del sprint BS (módulo 9). Después de generar transacciones
reales con cada empleado:

- Abrir el modal de detalle del empleado en BS Empleados
- Confirmar que los números de "Estadísticas ScanYA" (Turnos /
  Transacciones / Puntos) corresponden ÚNICAMENTE a las operaciones
  hechas por ese empleado en SU sucursal asignada
- No deben aparecer transacciones de otros empleados ni de otras sucursales

## CONSIDERACIONES DE DISEÑO

- **Turno único por operador+sucursal**: `abrirTurno` valida esto.
  Al cambiar de sucursal debe cerrar el anterior primero
- **Datos en vuelo**: si el dueño tiene transacciones pendientes
  (vouchers sin canjear, borrador de venta), advertir antes de cambiar
- **UX del selector**: preferir modal inferior en móvil (es una app
  móvil-first) y dropdown/modal en desktop
- **Estado compartido con Business Studio**: usar `useAuthStore.sucursalActiva`
  o mantener separado en `useScanYAStore`? Revisar consistencia
- **Matriz vs otras**: mostrar la estrella ⭐ de la Matriz (consistente
  con Business Studio donde el selector muestra Matriz con estrella)
- **Filtrar sucursales desactivadas en el selector**: el dueño puede
  tener sucursales con `activa = false`. No tiene sentido operar
  ventas en una sucursal apagada. Filtrar por `activa = true` al
  listar las opciones del selector
- **Sucursal activa se desactiva mientras el dueño está en ScanYA**:
  si desde BS (otra pestaña/dispositivo) la desactivan, el siguiente
  request desde ScanYA debería detectar la incoherencia. Opciones:
  (a) escuchar el socket `sucursal:desactivada` y forzar cambio a
  Matriz; (b) dejar que la operación falle en el siguiente abrir
  turno/registrar venta y mostrar error claro
- **Cupones cross-sucursal**: el canje funciona en cualquier sucursal
  del mismo negocio. Al cambiar de sucursal, los cupones pendientes
  del negocio siguen siendo canjeables, solo cambia dónde se registra
  el canje (`oferta_usos.sucursal_id`)
- **Botones UI**: si tocas botones primarios en ScanYA, usar dark
  gradient TC-7 (`linear-gradient(135deg, #1e293b, #334155)`).
  Secundarios `bg-white border-slate-300` con tinte rojo en hover si
  es destructivo. NO usar `bg-blue-100`/`bg-red-50` (eso ya se migró
  en BS Mi Perfil tab Imágenes — ver CHANGELOG 25 Abril)

## ARCHIVOS CLAVE A MODIFICAR

**Backend:**
1. `apps/api/src/routes/scanya.routes.ts` — nueva ruta `cambiar-sucursal`
2. `apps/api/src/controllers/scanya.controller.ts` — nuevo controller
3. `apps/api/src/services/scanya.service.ts` — nueva función
   `cambiarSucursalDueno(usuarioId, sucursalId)`
4. `apps/api/src/validations/scanya.schema.ts` — schema Zod

**Frontend:**
1. `apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx` —
   selector post-login
2. `apps/web/src/components/scanya/HeaderScanYA.tsx` — chip clickeable
3. `apps/web/src/stores/useScanYAStore.ts` — acción `cambiarSucursal`
4. `apps/web/src/services/scanyaService.ts` — función
   `cambiarSucursal(sucursalId)`
5. Nuevo: `apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx`

## SETUP NECESARIO

- Negocio con 2+ sucursales activas (Imprenta FindUS ya tiene Matriz +
  Sucursal Norte v2 en dev)
- 1 dueño (sin sucursalAsignada) — `vj.juan.24@gmail.com`
- 1 gerente asignado a una sucursal específica (María / Jazmín)
- 1 empleado creado en cada sucursal vía BS (con nick + PIN)
- Servidor dev corriendo (`pnpm dev` en `apps/api` y `apps/web`)

## CRITERIOS DE ACEPTACIÓN

Para cerrar el sprint:
- [ ] Dueño con 2+ sucursales ve selector al hacer login
- [ ] Dueño puede cambiar de sucursal durante sesión sin relogin
- [ ] Gerente NO ve selector (flag `puedeElegirSucursal=false` respetado)
- [ ] Empleado va directo a su sucursal asignada
- [ ] Todos los datos mostrados corresponden SOLO a la sucursal activa
- [ ] Transacciones/ventas se registran en la sucursal correcta
- [ ] Sucursal desactivada bloquea login/opción en selector
- [ ] Sesión revocada expulsa al instante (ya probado)
- [ ] Stats ScanYA del modal de detalle de empleado en BS muestran
      números correctos por sucursal-empleado (Fase 4)

## TESTING

- Probar con negocio que tenga 3 sucursales activas
- Probar login eligiendo cada una
- Probar cambio de sucursal durante la sesión
- Probar que si tiene transacciones pendientes, avisa antes de cambiar
- Verificar en BD que `scanya_turnos.sucursal_id` se llena correctamente
  al cambiar
- Verificar que las transacciones registradas después del cambio
  aparecen en la sucursal correcta en BS Transacciones
- Validar Estadísticas ScanYA en BS Empleados después de operar con
  cada empleado

## METODOLOGÍA

### Paso 1 — Revisar el estado actual del frontend
Investiga en `apps/web/src/pages/private/scanya/` y
`apps/web/src/stores/useScanYAStore.ts` qué falta implementar.

### Paso 2 — Implementar en fases pequeñas
- Selector al login (frontend + endpoint backend cambiar-sucursal)
- Acción `cambiarSucursal` en el store
- UI del header con selector dropdown
- Cada cambio, probarlo antes de seguir

### Paso 3 — Validar los 3 roles en vivo
Para cada rol, correr el escenario completo y confirmar el
comportamiento esperado.

### Paso 4 — Validar Estadísticas ScanYA en BS Empleados
Generar transacciones reales y confirmar números por empleado-sucursal.

### Paso 5 — Actualizar docs al terminar
- `docs/arquitectura/ScanYA.md` — versión 1.5 con multi-sucursal frontend
- `docs/arquitectura/Empleados.md` — sección de stats validada
- `docs/CHANGELOG.md` — entrada con los cambios
- `docs/reportes/prompt-sprint-scanya-multi-sucursal.md` — marcar como
  cerrado
- `docs/ROADMAP.md` — actualizar progreso ScanYA

## REGLAS DE TRABAJO (recordatorio de CLAUDE.md)

- Español en respuestas, razonamiento, comentarios
- Paso a paso, no adelantarse
- Preguntar antes de crear archivos >100 líneas o cambiar contratos
- Usar `str_replace` antes de reescribir
- Al tocar UI, consultar `docs/estandares/TOKENS_GLOBALES.md` y
  `docs/estandares/TOKENS_COMPONENTES.md`
- Actualizar docs tras migrar o refactorizar
- NO iniciar preview automáticamente — solo cuando el usuario lo pida

## ARRANCAR

Empieza por leer los 4 archivos de la sección "LEE PRIMERO", después
revisa el estado actual del frontend ScanYA en
`apps/web/src/pages/private/scanya/` y `apps/web/src/stores/useScanYAStore.ts`
y me reportas qué falta implementar.

NO toques código hasta que acordemos el alcance exacto de la Fase 1.

Yo reporto lo que veo y avanzamos juntos.
```

---

## Archivos relevantes si surgen dudas

- `apps/api/src/routes/scanya.routes.ts` — rutas ScanYA actuales
- `apps/api/src/services/scanya.service.ts` — `loginDueno`, `abrirTurno`, `otorgarPuntos`
- `apps/api/src/services/negocioManagement.service.ts` — `revocarEmpleadosDeSucursal` (patrón a reutilizar)
- `apps/api/src/utils/redisHelpers.ts` — `estaTokenRevocado` (patrón Redis)
- `apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx` — formulario login actual
- `apps/web/src/components/scanya/HeaderScanYA.tsx` — header con nombre estático de sucursal
- `apps/web/src/stores/useScanYAStore.ts` — store actual de ScanYA
- `apps/web/src/components/ui/SelectorSucursalesInline.tsx` — referencia del selector que usa BS (reutilizable)
- `apps/web/src/router/guards/MatrizGuard.tsx` — referencia del patrón de guard (no usar directamente, ScanYA tiene sus propios)
- `docs/arquitectura/ScanYA.md` — arquitectura del módulo
- `docs/arquitectura/Empleados.md` — política de roles y revocación
