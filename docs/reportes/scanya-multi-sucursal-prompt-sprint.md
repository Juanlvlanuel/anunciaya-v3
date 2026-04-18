# Prompt: Implementar Multi-Sucursal en ScanYA (para dueños)

> **Creado:** 16 Abril 2026
> **Última actualización del contexto:** 16 Abril 2026 (refinamiento post-Sprint 12)
> **Contexto:** descubierto durante pruebas del Sprint 12 (BS Sucursales). El backend ya tiene la infraestructura, solo falta la UI frontend.
> **Para:** retomar en una sesión independiente como sprint dedicado.
> **Tiempo estimado:** 1-2 días.

---

## Actualizaciones del contexto desde la creación del prompt

Cambios posteriores en BS Sucursales que impactan el alcance/diseño de este sprint (ver `docs/CHANGELOG.md`):

- **Revocación automática de sesiones ScanYA al desactivar/eliminar sucursal** — el helper `revocarEmpleadosDeSucursal(sucursalId, motivo)` en `negocioManagement.service.ts` cierra turnos ScanYA abiertos, marca timestamp de revocación en Redis por cada empleado y emite socket `scanya:sesion-revocada`. **Implicación para este sprint:** al cambiar de sucursal el dueño, si la sucursal destino fue recién desactivada por otro flujo, el token viejo debe invalidarse de forma consistente — revisar si se requiere bypass para el dueño en `scanya_revocado:{empleadoId}` (aplica a empleados, no al dueño, pero verificar).

- **Protección de historial al eliminar sucursal** — `eliminarSucursal` responde `409 TIENE_HISTORIAL` si hay `puntos_transacciones` registradas. **Implicación:** las ventas registradas desde ScanYA protegen automáticamente la sucursal de un borrado accidental. Desde la UI de BS se ofrece desactivación como alternativa. No hay cambios necesarios en ScanYA por este concepto, pero el comportamiento tranquiliza sobre la integridad del historial.

- **Cupones canjeables en cualquier sucursal del mismo negocio** — la validación en `validarCupon()` (`scanya.service.ts`) ya no restringe por `oferta.sucursalId === payload.sucursalId`. **Implicación:** al cambiar de sucursal el dueño, los cupones pendientes del negocio siguen canjeables sin importar dónde se emitieron originalmente. El `oferta_usos.sucursal_id` registra dónde ocurrió el canje real para reportes.

- **Dueño/gerente pueden ver sucursales desactivadas en `obtenerPerfilSucursal`** — la query tiene bypass del filtro `activa=true` para dueños y gerentes. **Implicación:** al listar sucursales disponibles para el selector de ScanYA (dueño), decidir si se muestran también las desactivadas con badge "Inactiva" (para que el dueño pueda operar con sucursal temporalmente apagada) o solo las activas. Recomendación: mostrar solo `activa = true` en el selector — una sucursal desactivada no debería recibir ventas nuevas.

- **Zona horaria por estado** — `crearSucursal` y `actualizarSucursal` derivan `zonaHoraria` del estado con `getZonaHorariaPorEstado()`. **Implicación:** al cambiar de sucursal en ScanYA, el cálculo de horarios (`esta_abierto`, `abrirTurno.fechaLocal`) usará la zona correcta de la nueva sucursal. El fix del default silencioso de Drizzle (ver `docs/estandares/LECCIONES_TECNICAS.md`) garantiza que cada sucursal tenga su zona real.

- **Clonado de ofertas al crear sucursal** — `crearSucursal` ahora clona ofertas públicas (no cupones) de Matriz a la sucursal nueva con imágenes R2 independientes. **Implicación:** una sucursal recién creada ya tiene ofertas operativas desde el primer día, lo que refuerza la utilidad de poder operar en ella desde ScanYA cuanto antes.

---

## Prompt para iniciar sesión

Copia y pega lo siguiente en una nueva sesión de Claude Code:

---

### Inicio del prompt

Vamos a implementar **multi-sucursal en ScanYA para dueños**. El backend ya tiene la infraestructura lista, solo falta la UI frontend. Este es el contexto completo:

### Contexto del sistema

AnunciaYA es una app de comercio local. Los negocios pueden tener múltiples sucursales. Roles:

- **Dueño** (`usuarios.sucursalAsignada = null`, `usuarios.negocioId != null`): acceso a todas sus sucursales
- **Gerente** (`usuarios.sucursalAsignada = UUID`): solo a su sucursal asignada
- **Empleado** (login aparte con nick/PIN): solo a la sucursal donde fue creado

ScanYA es el módulo operativo donde se registran ventas con QR/código de cliente. Los dueños pueden entrar a ScanYA con su cuenta de AnunciaYA (correo+contraseña) usando el endpoint `POST /api/scanya/login-dueno`.

### Problema actual

El dueño con múltiples sucursales queda **fijo a la Matriz** durante toda su sesión ScanYA. No puede cambiar de sucursal sin cerrar sesión y volver a entrar (y ni así porque tampoco hay selector).

### Estado actual del código

**Backend — ya implementado** ✅

- `apps/api/src/routes/scanya.routes.ts:49` — ruta `POST /login-dueno`
- `apps/api/src/services/scanya.service.ts:95-439` — función `loginDueno(correo, contrasena, sucursalId?)`:
  - Si recibe `sucursalId`, valida que pertenezca al negocio del dueño y usa esa sucursal
  - Si NO lo recibe, cae a la Matriz automáticamente (`esPrincipal=true`)
- Token JWT incluye `sucursalId` fijo + flag `puedeElegirSucursal: true` (línea 389-402)
- Tablas `scanya_turnos` (schema.ts:1579) y `puntos_transacciones` (schema.ts:1698) con `sucursal_id NOT NULL` — aislamiento por sucursal funciona
- `abrirTurno` (línea 866) y `otorgarPuntos` escriben `payload.sucursalId` del token correctamente
- Helper `revocarEmpleadosDeSucursal(sucursalId, motivo)` en `negocioManagement.service.ts` — cierra turnos ScanYA + revoca Redis + emite socket. Se usa al desactivar/eliminar sucursal. El endpoint de cambiar sucursal (a implementar) puede reutilizar los patrones: cerrar turno activo del dueño, re-emitir tokens, abrir nuevo turno
- `refrescarTokenScanYA` ya verifica revocación en Redis antes de emitir nuevo token (`estaTokenRevocado(empleadoId, iatPayload)`) — no aplica directamente al dueño pero muestra el patrón

**Frontend — NO implementado** ❌

- `apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx` — no tiene selector de sucursal. Nunca envía `sucursalId` al backend
- `apps/web/src/stores/useScanYAStore.ts` — no tiene acción `cambiarSucursal`
- `apps/web/src/components/scanya/HeaderScanYA.tsx:249-258` — muestra el nombre de sucursal como `<p>` estático (no clickeable)
- `grep puedeElegirSucursal` en `apps/web/src` → 0 resultados (el flag viaja en el token pero el frontend lo ignora)

### Alcance de implementación

**1. Selector de sucursal al hacer login**

En `PaginaLoginScanYA.tsx`:
- Después de que el dueño pone correo+contraseña y valida credenciales, si tiene múltiples sucursales activas, mostrar un **selector de sucursal** ANTES de enviar el login final
- O: hacer login preliminar, detectar `puedeElegirSucursal && sucursales.length > 1`, mostrar selector, re-enviar login con `sucursalId` elegido
- Si solo tiene 1 sucursal (o es Matriz única), el flujo actual sigue igual

**2. Chip de sucursal clickeable en el header de ScanYA**

En `HeaderScanYA.tsx:249-258`:
- Si el usuario es dueño Y tiene 2+ sucursales, convertir el `<p>` del nombre de sucursal en un botón clickeable
- Al click, abrir un modal tipo bottom-sheet con lista de sucursales disponibles
- Usar como referencia el `SelectorSucursalesInline` de Business Studio (`apps/web/src/components/ui/SelectorSucursalesInline.tsx`)

**3. Acción `cambiarSucursal` en `useScanYAStore`**

```typescript
cambiarSucursal: async (nuevaSucursalId: string) => {
  // 1. Validar que no hay transacciones pendientes en el turno actual
  // 2. Cerrar turno actual con endpoint existente
  // 3. Llamar endpoint POST /api/scanya/cambiar-sucursal (ver punto 4)
  // 4. Actualizar tokens en localStorage/store
  // 5. Abrir nuevo turno automáticamente en la nueva sucursal
  // 6. Recargar pantalla o limpiar estado local de la sucursal anterior
}
```

**4. Endpoint backend `POST /api/scanya/cambiar-sucursal`**

```typescript
// apps/api/src/routes/scanya.routes.ts
// Body: { sucursalId: string }
// Middleware: verificarTokenScanYA (requiere token de dueño existente)

// Service:
// - Validar que el usuario del token es dueño (tipo === 'dueno')
// - Validar que sucursalId pertenece a su negocio
// - Cerrar turno activo si existe (INSERT scanya_turnos.hora_fin = NOW())
// - Re-emitir tokens JWT con nuevo sucursalId
// - Abrir nuevo turno en la nueva sucursal
// - Retornar { accessToken, refreshToken, sucursalId, sucursalNombre }
```

### Consideraciones de diseño

- **Turno único por operador+sucursal**: `abrirTurno` valida esto. Al cambiar de sucursal debe cerrar el anterior primero
- **Datos en vuelo**: si el dueño tiene transacciones pendientes (vouchers sin canjear, borrador de venta), advertir antes de cambiar
- **UX del selector**: preferir modal inferior en móvil (es una app móvil-first) y dropdown/modal en desktop
- **Estado compartido con Business Studio**: usar `useAuthStore.sucursalActiva` o mantener separado en `useScanYAStore`? Revisar consistencia
- **Matriz vs otras**: mostrar la estrella ⭐ de la Matriz (consistente con Business Studio donde el selector muestra Matriz con estrella)
- **Filtrar sucursales desactivadas en el selector**: el dueño puede tener sucursales con `activa = false`. No tiene sentido operar ventas en una sucursal apagada. Filtrar por `activa = true` al listar las opciones del selector (el backend debe exponer una ruta o filtro explícito, aunque `obtenerSucursalesNegocio` ya no filtra y deja al frontend decidir)
- **Sucursal activa se desactiva por otro flujo mientras el dueño está en ScanYA**: si el dueño está operando en "Sucursal Centro" y desde BS (misma cuenta en otra pestaña o desde otro dispositivo) la desactivan, el siguiente request desde ScanYA debería detectar la incoherencia. Opciones: (a) escuchar el socket `sucursal:desactivada` y forzar cambio a Matriz; (b) dejar que la operación falle en el siguiente abrir turno/registrar venta y mostrar error claro
- **Cupones cross-sucursal**: el canje funciona en cualquier sucursal del mismo negocio. Al cambiar de sucursal, los cupones pendientes del negocio siguen siendo canjeables, solo cambia dónde se registra el canje (`oferta_usos.sucursal_id`)

### Archivos clave a modificar

**Backend:**
1. `apps/api/src/routes/scanya.routes.ts` — nueva ruta `cambiar-sucursal`
2. `apps/api/src/controllers/scanya.controller.ts` — nuevo controller
3. `apps/api/src/services/scanya.service.ts` — nueva función `cambiarSucursalDueno(usuarioId, sucursalId)`
4. `apps/api/src/validations/scanya.schema.ts` — schema Zod

**Frontend:**
1. `apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx` — selector post-login
2. `apps/web/src/components/scanya/HeaderScanYA.tsx` — chip clickeable
3. `apps/web/src/stores/useScanYAStore.ts` — acción `cambiarSucursal`
4. `apps/web/src/services/scanyaService.ts` — función `cambiarSucursal(sucursalId)`
5. Nuevo: `apps/web/src/components/scanya/ModalCambiarSucursalScanYA.tsx` — modal selector

### Criterios de aceptación

1. Dueño con 1 sucursal: flujo actual intacto, sin cambios visibles
2. Dueño con 2+ sucursales:
   - Al hacer login en ScanYA, puede elegir en qué sucursal quiere operar (o recuerda la última)
   - Una vez dentro, el nombre de sucursal en el header es clickeable
   - Al click abre modal con lista de sucursales (nombre + estrella en Matriz + badge si es la activa)
   - Al seleccionar otra sucursal: confirma cierre del turno actual → cierra → abre nuevo en la nueva sucursal
   - El contador de ventas/puntos del día se resetea al cambiar (porque es por sucursal)
3. Gerente: sin cambios (sigue viendo solo su sucursal asignada, sin selector)
4. Empleado: sin cambios (sigue entrando con nick+PIN a su sucursal asignada)

### Testing

- Probar con negocio que tenga 3 sucursales activas
- Probar login eligiendo cada una
- Probar cambio de sucursal durante la sesión
- Probar que si tiene transacciones pendientes, avisa antes de cambiar
- Verificar en BD que `scanya_turnos.sucursal_id` se llena correctamente al cambiar
- Verificar que las transacciones registradas después del cambio aparecen en la sucursal correcta en BS Transacciones

### Documentación a actualizar

Al terminar:
- `docs/arquitectura/ScanYA.md` — sección "Multi-sucursal para dueños"
- `docs/CHANGELOG.md` — entrada del sprint
- `docs/ROADMAP.md` — mover de "pendiente" a "completado"

---

### Fin del prompt

## Inicio recomendado de la sesión

1. Leer `docs/CLAUDE.md` para recordar estándares del proyecto
2. Leer `docs/arquitectura/ScanYA.md` para entender el módulo actual
3. Leer este archivo completo
4. Usar EnterPlanMode para diseñar el plan antes de implementar
5. Usar EnterWorktree si prefieres aislar los cambios en una rama
