# Prompt: ScanYA Multi-Sucursal — Dueños, Gerentes y Empleados

> **Creado:** 21 Abril 2026
> **Para:** retomar en una sesión independiente dedicada a completar el frontend multi-sucursal de ScanYA
> **Tiempo estimado:** 1-2 días
> **Prerequisito:** proyecto en `main` al día con el Recolector de Basura operativo

---

## Cómo usar

Copia y pega el bloque de abajo en una **nueva sesión de Claude Code**. Todo el contexto necesario viene incluido.

Este prompt se complementa con `docs/reportes/scanya-multi-sucursal-prompt-sprint.md` que contiene detalles técnicos adicionales del sprint original.

---

## Prompt

```
# Sprint dedicado — ScanYA Multi-Sucursal (dueños, gerentes, empleados)

Retomando el proyecto AnunciaYA. Este chat está dedicado a validar y 
completar el comportamiento multi-sucursal en ScanYA según los 3 roles: 
dueño, gerente y empleado.

## LEE PRIMERO (en este orden, NO releer todo el código)

1. `docs/reportes/scanya-multi-sucursal-prompt-sprint.md`
   → Prompt técnico previo que define el alcance exacto del sprint. 
   Incluye qué está implementado en backend y qué falta en frontend.

2. `docs/arquitectura/ScanYA.md` (v1.4)
   → Arquitectura del módulo. Presta atención a las secciones:
   - Bloqueo de login en sucursal desactivada (los 3 flujos)
   - Limpieza de notificaciones de voucher al canjearse
   - Revocación de sesión ScanYA (defensa en 3 capas)

3. `docs/arquitectura/Empleados.md`
   → Permisos granulares, política dueño vs gerente, revocación de sesión

4. `CLAUDE.md` (secciones: "Multi-Sucursal", "Reglas de Trabajo")

## CONTEXTO DE LO QUE YA ESTÁ HECHO

### Backend — implementado ✅

- `POST /api/scanya/login-dueno` acepta `sucursalId?` opcional
  - Con sucursalId → valida pertenencia al negocio y usa esa sucursal
  - Sin sucursalId → cae a Matriz automáticamente
- Token JWT incluye `sucursalId` fijo + flag `puedeElegirSucursal: true`
- `scanya_turnos` y `puntos_transacciones` con `sucursal_id NOT NULL`
- `abrirTurno` y `otorgarPuntos` escriben `payload.sucursalId` correctamente
- Helper `revocarEmpleadosDeSucursal` al desactivar/eliminar sucursal
- Bloqueo de login cuando sucursal.activa = false (3 paths)
- Cupones canjeables cross-sucursal (validado manualmente)

### Frontend — NO implementado ❌

- `PaginaLoginScanYA.tsx` no tiene selector de sucursal
- `useScanYAStore.ts` no tiene acción `cambiarSucursal`
- `HeaderScanYA.tsx` muestra sucursal como texto estático
- `grep puedeElegirSucursal` en `apps/web/src` → 0 resultados 
  (el flag viaja en el token pero el frontend lo ignora)

### Pruebas manuales ya validadas

- ✅ Empleado de Sucursal Norte canjeó voucher en su sucursal
- ✅ Gerente en Matriz canjeó voucher (Pizza Mediana)
- ✅ Revocación de sesión ScanYA (manual + al desactivar/eliminar sucursal)
- ✅ Notificación de voucher pendiente limpiada al canjear
- ✅ Login bloqueado en sucursal desactivada (3 paths)

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
- Si intenta forzar otra sucursal via API → 403

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

## SETUP NECESARIO

- Negocio con 2+ sucursales activas
- 1 dueño (sin sucursalAsignada)
- 1 gerente asignado a una sucursal específica
- 1 empleado creado en cada sucursal via BS (con nick + PIN)
- Servidor dev corriendo (pnpm dev en apps/api y apps/web)

## METODOLOGÍA

### Paso 1 — Revisar el estado actual del frontend
Investiga en `apps/web/src/pages/scanya/` y 
`apps/web/src/stores/useScanYAStore.ts` qué falta implementar.

### Paso 2 — Implementar en fase pequeñas
- Selector al login (frontend)
- Acción cambiarSucursal en el store
- UI del header con selector dropdown
- Cada cambio, probarlo antes de seguir

### Paso 3 — Validar los 3 roles en vivo
Para cada rol, correr el escenario completo y confirmar el comportamiento 
esperado.

### Paso 4 — Actualizar docs al terminar
- `docs/arquitectura/ScanYA.md` — versión 1.5 con multi-sucursal frontend
- `docs/CHANGELOG.md` — entrada con los cambios
- `docs/reportes/scanya-multi-sucursal-prompt-sprint.md` — marcar como 
  cerrado
- `docs/ROADMAP.md` — actualizar progreso ScanYA

## CRITERIOS DE ACEPTACIÓN

Para cerrar el sprint:
- [ ] Dueño con 2+ sucursales ve selector al hacer login
- [ ] Dueño puede cambiar de sucursal durante sesión sin relogin
- [ ] Gerente NO ve selector (flag respetado)
- [ ] Empleado va directo a su sucursal asignada
- [ ] Todos los datos mostrados corresponden SOLO a la sucursal activa
- [ ] Transacciones/ventas se registran en la sucursal correcta
- [ ] Sucursal desactivada bloquea login/opción en selector
- [ ] Sesión revocada expulsa al instante (ya probado)

## ARRANCAR

Empieza por leer los 4 archivos de la sección "LEE PRIMERO", después 
revisa el estado actual del frontend ScanYA en 
`apps/web/src/pages/scanya/` y me reportas qué falta implementar. 
No toques código hasta que acordemos el alcance exacto de la Fase 1.
```
