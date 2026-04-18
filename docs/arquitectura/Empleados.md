# Empleados — Arquitectura

> **Última actualización:** 17 Abril 2026
> **Estado:** ✅ Completo (incluye upload avatar desde ScanYA, CRUD por dueños y gerentes, validación live de nick + correo + teléfono)
> **Sprint:** 10 (inicial) / 12 (permisos gerente) / post-12 (validación live de inputs)

---

## Resumen

Módulo de gestión de empleados para Business Studio. Permite gestionar empleados con permisos granulares, horarios semanales, estadísticas de turnos ScanYA, y revocación remota de sesiones.

**Modelo de permisos:**
- **Dueño**: CRUD total sobre empleados de todas sus sucursales
- **Gerente**: CRUD sobre empleados SOLO de su sucursal asignada

---

## Tabla de Empleados (23 campos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | ID único |
| usuario_id | UUID FK | Dueño que creó al empleado |
| nombre | VARCHAR(200) | Nombre completo |
| nick | VARCHAR(30) UNIQUE | Login para ScanYA |
| pin_acceso | VARCHAR(4) | PIN 4 dígitos (sin hash) |
| sucursal_id | UUID FK | Sucursal asignada (CASCADE) |
| especialidad | VARCHAR(100) | Puesto/rol |
| telefono | VARCHAR(20) | Contacto |
| correo | VARCHAR(150) | Contacto |
| foto_url | TEXT | Avatar (Cloudflare R2, subido desde ScanYA) |
| notas_internas | TEXT | Notas privadas del dueño |
| activo | BOOLEAN | Estado del empleado |
| orden | INTEGER | Posición en listados |
| **puede_registrar_ventas** | BOOLEAN | Permiso ScanYA |
| **puede_procesar_canjes** | BOOLEAN | Permiso ScanYA |
| **puede_ver_historial** | BOOLEAN | Permiso ScanYA |
| **puede_responder_chat** | BOOLEAN | Permiso ChatYA |
| **puede_responder_resenas** | BOOLEAN | Permiso Reseñas |
| total_citas_atendidas | INTEGER | Contador |
| calificacion_promedio | NUMERIC(2,1) | Promedio rating |
| total_resenas | INTEGER | Contador |
| created_at | TIMESTAMP | Fecha creación |
| updated_at | TIMESTAMP | Última actualización |

**Relación con negocio:** `empleados.sucursal_id → negocio_sucursales.id → negocio_sucursales.negocio_id`. No hay `negocio_id` directo — todo empleado DEBE tener sucursal asignada.

### Tablas relacionadas

- **`empleado_horarios`** — dia_semana (0-6), hora_entrada, hora_salida. FK CASCADE.
- **`scanya_turnos`** — Registra turnos con empleado_id, transacciones, puntos_otorgados.

---

## 5 Permisos Granulares

| Permiso | Verificado en | Rutas protegidas |
|---------|---------------|------------------|
| `registrarVentas` | `scanya.routes.ts` | `/otorgar-puntos`, `/validar-codigo` |
| `procesarCanjes` | `scanya.routes.ts` | `/validar-voucher`, `/vouchers-pendientes`, `/vouchers`, `/buscar-cliente-vouchers` |
| `verHistorial` | `scanya.routes.ts` | `/historial` |
| `responderChat` | `chatya.routes.ts` | POST/PATCH/DELETE mensajes |
| `responderResenas` | `resenas.routes.ts` | `/negocio`, `/responder` |

**Verificación en BD en tiempo real:** El middleware `verificarPermiso` consulta la tabla `empleados` en cada request para obtener los permisos actuales, no los del token JWT. Esto permite que cambios de permisos surtan efecto inmediatamente sin cerrar sesión.

**Frontend (ScanYA):** `tienePermiso()` en `useScanYAStore` verifica permisos del token local. Cambios surten efecto al re-loguearse. Botones de ChatYA y Reseñas bloqueados con `notificar.error()` si no tiene permiso.

**Refresh token:** Al refrescar token ScanYA, los permisos se obtienen de la BD (no del token viejo). Incluye `negocioUsuarioId` para ChatYA.

---

## Política de permisos dueño vs gerente

El módulo de Empleados reconoce dos roles con permisos diferenciados:

### Dueño (`sucursalAsignada = null`)

- CRUD total sobre empleados de **todas las sucursales** de su negocio
- Sin restricciones (el frontend ya filtra por sucursal activa vía interceptor axios, pero el backend NO restringe)

### Gerente (`sucursalAsignada = UUID`)

- CRUD sobre empleados **solo de su sucursal asignada**
- Si intenta operar sobre un empleado de otra sucursal → **403** "Este empleado no pertenece a tu sucursal"
- Al **crear**: el `sucursalId` del body se sobreescribe con su sucursal asignada (no puede elegir otra)
- Al **editar**: si intenta cambiar el `sucursalId`, se fuerza al suyo
- Al **ver detalle / toggle / eliminar / revocar sesión / editar horarios**: se valida que el empleado pertenezca a su sucursal antes de operar

### Helper clave

En `services/empleados.service.ts`:
```typescript
// Valida que un empleado pertenezca a una sucursal específica (no solo al negocio).
export async function empleadoPerteneceASucursal(
  empleadoId: string,
  sucursalId: string
): Promise<boolean>
```

En `controllers/empleados.controller.ts`:
```typescript
// Retorna true si el usuario es dueño (sucursalAsignada=null) o
// si es gerente Y el empleado pertenece a su sucursal.
async function gerentePuedeOperarSobreEmpleado(
  req: RequestConNegocio,
  empleadoId: string
): Promise<boolean>
```

### Frontend

- Botón "Nuevo empleado" visible para dueños y gerentes
- Botones "Revocar sesión ScanYA" y "Eliminar empleado" en `ModalDetalleEmpleado` visibles para ambos roles
- Modal de crear/editar NO tiene selector de sucursal — usa `usuario.sucursalActiva` (que para un gerente siempre es su asignada)

---

## Arquitectura Backend

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `types/empleados.types.ts` | Interfaces: EmpleadoResumen, EmpleadoDetalle, KPIs, Permisos, Horarios |
| `validations/empleados.schema.ts` | Zod schemas: crear, actualizar, horarios, toggle, filtros |
| `services/empleados.service.ts` | CRUD + horarios + estadísticas + revocación sesión. Helper `empleadoPerteneceASucursal()` |
| `controllers/empleados.controller.ts` | 10 controllers con permisos dueño/gerente. Helper `gerentePuedeOperarSobreEmpleado()` |
| `routes/empleados.routes.ts` | 10 endpoints bajo `/api/business/empleados` |
| `utils/tokenStoreScanYA.ts` | Revocación sesiones en Redis (timestamp) |

### Endpoints

```
BASE: /api/business/empleados
MIDDLEWARE: verificarToken, verificarNegocio

GET    /kpis                → KPIs (total, activos, inactivos, calificación)
GET    /verificar-nick      → Disponibilidad de nick + 3 sugerencias si está tomado
GET    /                    → Lista paginada con filtros
GET    /:id                 → Detalle completo (gerente solo su sucursal → 403)
POST   /                    → Crear empleado (gerente: sucursalId se fuerza al suyo)
PUT    /:id                 → Actualizar empleado (gerente: solo su sucursal → 403)
PATCH  /:id/activo          → Toggle activo/inactivo (gerente: solo su sucursal → 403)
DELETE /:id                 → Eliminar empleado (gerente: solo su sucursal → 403)
PUT    /:id/horarios        → Guardar horarios semanales (gerente: solo su sucursal → 403)
POST   /:id/revocar-sesion  → Revocar sesiones ScanYA (gerente: solo su sucursal → 403)
```

### Revocación remota de sesiones

**Flujo:**
1. Dueño o gerente presiona "Cerrar sesión en ScanYA" en ModalDetalleEmpleado
2. Backend: cierra turno activo (`scanya_turnos.hora_fin = NOW()`)
3. Backend: guarda timestamp de revocación en Redis (`scanya_revocado:{empleadoId}`)
4. Backend: emite `scanya:sesion-revocada` vía Socket.io con `empleadoId` en el payload
5. Middleware `verificarTokenScanYA`: compara `iat` del token con timestamp de revocación en cada request
6. Si `iat < revocación` → 401 "Sesión revocada por el administrador"
7. Endpoint `refrescarTokenScanYA`: también aplica el mismo check — impide que un refresh automático del cliente genere un token nuevo con `iat > revocación` que burlaría la verificación del middleware
8. Frontend ScanYA escucha el socket y filtra por `empleadoId` (todos los empleados del negocio están en el mismo room del dueño). Solo el empleado afectado dispara `logout('revocada_admin')`

**Redis:** `scanya_revocado:{empleadoId}` → timestamp (TTL 13h)

**Defensa en tres capas:**
- Middleware de autenticación — rechaza tokens con `iat < revocación`
- Endpoint de refresh — también consulta Redis antes de emitir nuevos tokens (evita bypass por ciclo de refresh automático del cliente)
- Socket.io — expulsa al empleado en tiempo real sin esperar a su próxima acción

**Socket:** el empleado no tiene cuenta de usuario AnunciaYA. ScanYA conecta el socket usando `negocioUsuarioId` (el ID del dueño) como identificador de room. Todos los empleados del negocio y el dueño comparten el mismo room `usuario:{negocioUsuarioId}`. Por eso el payload del evento incluye `empleadoId` — el frontend filtra para que solo el empleado revocado cierre su sesión.

### Verificación de propiedad

Todas las operaciones de escritura verifican que el empleado pertenece al negocio:
```sql
SELECT e.id FROM empleados e
INNER JOIN negocio_sucursales ns ON ns.id = e.sucursal_id
WHERE e.id = $empleadoId AND ns.negocio_id = $negocioId
```

---

## Arquitectura Frontend

### Archivos

| Archivo | Descripción |
|---------|-------------|
| `types/empleados.ts` | Tipos espejo + LABELS_PERMISOS + DIAS_SEMANA |
| `services/empleadosService.ts` | 9 funciones API + revocarSesion |
| `hooks/queries/useEmpleados.ts` | React Query: KPIs, lista infinite, detalle, 6 mutations optimistas |
| `pages/.../empleados/PaginaEmpleados.tsx` | Página principal (KPIs, filtros, tabla/cards) |
| `pages/.../empleados/ModalEmpleado.tsx` | Modal crear/editar con formulario + toggles |
| `pages/.../empleados/ModalDetalleEmpleado.tsx` | Modal detalle con permisos, stats, acciones |
| `pages/.../empleados/index.ts` | Re-export |

### Página principal

- Header con icono UserCog animado + KPIs en CarouselKPI (Total, Activos, Inactivos)
- Filtros: chips estado (Todos/Activos/Inactivos) + buscador + botón "+ Nuevo" (solo dueño)
- Vista dual: cards móvil (h-28, scroll infinito) / tabla desktop (dark header, "Cargar más")
- Contenedor `max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto`
- Caché inteligente: sin skeleton en recargas, sin reset al filtrar

### Modal detalle

- Header slate oscuro con avatar + nombre + nick + badge estado
- Info: iconos Phone/Mail/Briefcase sin cards
- Permisos: tabla cebra (`bg-slate-50`/`bg-slate-200`) con CheckCircle2/XCircle
- Estadísticas ScanYA: iconos centrados con separadores verticales degradados (3px)
- Botones: Editar (grande) + LogOut con Tooltip + Power con Tooltip + Trash con Tooltip

### Modal crear/editar

- ModalAdaptativo con formulario: nombre, nick, PIN, sucursal, especialidad, teléfono, correo, notas
- 5 toggles de permisos (patrón TabOperacion)
- Modo crear vs editar por prop `empleado`
- Altura fija: 78vh desktop, 90vh móvil

---

## Testing

### API Tests (188 total, empleados: 21)

`empleados.test.ts`:
- KPIs, crear, nick duplicado 409, PIN inválido 400
- Listar, filtrar búsqueda, filtrar activo
- Detalle completo, 404 inexistente
- Actualizar, nick duplicado al actualizar
- Toggle activo/inactivo
- Guardar horarios, verificar en detalle
- Revocar sesión
- Eliminar, 404 al re-eliminar

### E2E Tests (9)

`empleados.spec.ts`:
- Página, KPIs, filtros, botón crear
- Modal crear con inputs
- Tabla desktop
- Detalle al click
- Filtrar por estado, buscar

---

## Modificaciones a archivos existentes

| Archivo | Cambio |
|---------|--------|
| `routes/index.ts` | Registrar empleadosRoutes |
| `routes/scanya.routes.ts` | Agregar `verificarPermiso` a 7 rutas |
| `routes/chatya.routes.ts` | Agregar `verificarPermisoChat` a rutas de escritura |
| `middleware/scanyaAuth.middleware.ts` | verificarPermiso consulta BD, verificación revocación Redis |
| `middleware/auth.ts` | verificarTokenChatYA async, fallback negocioUsuarioId desde BD |
| `services/scanya.service.ts` | Refresh token obtiene permisos actualizados de BD |
| `services/chatya.service.ts` | obtenerOCrearMisNotas con SQL raw para compatibilidad |
| `pages/.../scanya/PaginaScanYA.tsx` | Bloqueo frontend ChatYA/Reseñas sin permiso |
| `router/index.tsx` | Reemplazar placeholder empleados |

---

## Validación live de inputs en ModalEmpleado

> **Agregado:** 17 Abril 2026

El modal de crear/editar empleado valida en vivo tres campos críticos con feedback inmediato: **nick**, **correo** y **teléfono**.

### Nick — disponibilidad en tiempo real

**Endpoint:** `GET /api/business/empleados/verificar-nick?nick=juan&excluirEmpleadoId=<uuid?>`

- Consulta `empleados` filtrando por `negocio_id` del usuario autenticado (la unicidad es por negocio, no global)
- En modo edición recibe `excluirEmpleadoId` para no marcar como duplicado al propio empleado que se está editando
- Si el nick está tomado, genera **3 sugerencias** en base al nick solicitado (sufijos numéricos y variantes cortas) para que el dueño pueda elegir con un click (chips)
- Debounce de 400ms en el input antes de disparar la query
- Indicadores visuales: spinner (validando) / CheckCircle2 verde (disponible) / XCircle rojo (tomado) + chips de sugerencias

**Archivos:**
- `services/empleados.service.ts` → `verificarDisponibilidadNick(nick, excluirEmpleadoId?)`
- `controllers/empleados.controller.ts` → `verificarNickController`
- `routes/empleados.routes.ts` → `GET /verificar-nick`

### Correo — formato + typo detection (modo `contacto`)

Usa el componente `InputCorreoValidado` en modo `contacto`:

- Valida formato RFC 5322 (regex)
- Detecta typos en dominios comunes con distancia Levenshtein (`gmail.cof` → sugerencia `gmail.com`)
- **NO consulta** la BD de usuarios AnunciaYA (a diferencia del modo `registro`): el correo del empleado es un dato de contacto, no una cuenta de usuario. Un empleado no se registra en AnunciaYA por tener correo aquí
- Botón "Corregir" aplica la sugerencia con un click
- X clickeable para limpiar el input en caso de error

El mismo modo `contacto` se usa en `ModalCrearSucursal` para el correo de la sucursal.

### Teléfono — formato MX

Componente `InputTelefono` con máscara y validación de 10 dígitos.

---

## Bugs corregidos durante desarrollo

- **`verificarPermiso` no se usaba** — Las rutas de ScanYA no tenían middleware de permisos. Agregado a 7 rutas.
- **Permisos del token vs BD** — `verificarPermiso` ahora consulta BD en tiempo real, no el token JWT.
- **Refresh token no actualizaba permisos** — `refrescarTokenScanYA` reutilizaba permisos del token viejo. Ahora consulta BD.
- **`negocioUsuarioId` faltante** — Tokens de empleado no incluían `negocioUsuarioId` en refresh. ChatYA fallaba con usuarioId vacío.
- **ChatYA mis-notas 500** — Drizzle ORM con `casing: 'snake_case'` no encontraba registros. Solucionado con SQL raw.
- **`fuera_horario` spam** — Anti-duplicado por `tx.id` generaba 1 alerta por transacción. Cambiado a `sucursalId` (1 por día).
- **UUID validation Zod** — `z.string().uuid()` rechaza UUIDs con variante no-estándar. Cambiado a regex.
- **Import Redis** — `tokenStoreScanYA.ts` importaba `redis` como default en vez de named export.
- **Mutations de React Query resolvían incluso con 4xx** — El interceptor Axios envolvía todas las respuestas en `{ success, data, error, message }` y resolvía la promesa aunque el backend respondiera 400/409. Las 6 mutations de `hooks/queries/useEmpleados.ts` (Crear, Actualizar, ToggleActivo, Eliminar, ActualizarHorarios, RevocarSesion) mostraban toast de éxito aunque el backend rechazara la operación (ej: nick duplicado → "Empleado creado" falsamente). **Fix:** todas las mutations ahora verifican `res.success` y hacen `throw new Error(res.error ?? res.message)` para que `onError` dispare correctamente.

---

## Soft Delete

Los empleados NO se borran de la BD. Al "eliminar" desde la UI:

1. `eliminado_at = NOW()` + `activo = false` (UPDATE, no DELETE)
2. El empleado desaparece de la lista en BS (`WHERE eliminado_at IS NULL`)
3. No puede hacer login en ScanYA (`WHERE eliminado_at IS NULL` en login)
4. Las 10 tablas con FK a empleados **conservan la referencia intacta**:
   - `puntos_transacciones`, `scanya_turnos`, `alertas_seguridad`, `vouchers_canje`
   - `chat_mensajes`, `resenas`, `oferta_usos`, `scanya_recordatorios`
   - `citas`, `empleado_horarios`
5. El nombre del empleado sigue visible en transacciones, turnos y reseñas históricas

**Columna:** `eliminado_at TIMESTAMPTZ DEFAULT NULL` (agregada al schema)

**Restaurar:** `UPDATE empleados SET eliminado_at = NULL, activo = true WHERE id = X`

---

## Avatar de Empleado (Upload desde ScanYA)

> **Agregado:** 5 Abril 2026

El empleado puede subir/cambiar su propia foto de avatar desde ScanYA. El dueño NO elige la foto.

### Flujo

1. Empleado hace login → recibe `fotoUrl` si ya tiene avatar
2. En el header de ScanYA aparece su avatar (o inicial si no tiene)
3. Click en avatar del header → selector de imagen
4. Imagen se comprime a 500x500 WebP (quality 0.8) via canvas
5. `POST /api/scanya/upload-avatar-empleado` → presigned URL para R2
6. Upload directo a R2 con PUT (carpeta: `empleados/{empleadoId}/`)
7. `PUT /api/scanya/empleado/avatar` → confirma en BD + elimina foto anterior de R2
8. Store actualizado → se refleja en header y ResumenTurno

### Endpoints

```
POST /api/scanya/upload-avatar-empleado   ← Presigned URL (verificarTokenScanYA)
PUT  /api/scanya/empleado/avatar          ← Confirmar avatar en BD
```

### Seguridad

- Solo el propio empleado puede subir SU foto (`payload.empleadoId`)
- Dueño/gerente no pueden subir avatar vía estos endpoints (403)
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`
- Foto anterior se elimina de R2 automáticamente al cambiar

### Archivos involucrados

| Archivo | Cambio |
|---------|--------|
| `services/scanya.service.ts` | `generarUrlUploadAvatarEmpleado()`, `actualizarAvatarEmpleado()` |
| `controllers/scanya.controller.ts` | `uploadAvatarEmpleadoController`, `actualizarAvatarEmpleadoController` |
| `routes/scanya.routes.ts` | 2 rutas nuevas |
| `components/scanya/AvatarEmpleadoScanYA.tsx` | Componente con useR2Upload + Tooltip |
| `components/scanya/HeaderScanYA.tsx` | Integra AvatarEmpleadoScanYA |
| `components/scanya/ResumenTurno.tsx` | Muestra avatar con ModalImagenes |
| `stores/useScanYAStore.ts` | `actualizarFotoUrl()` |
| `types/scanya.ts` | `empleadoId`, `fotoUrl` en UsuarioScanYA |
| `services/scanyaService.ts` | `obtenerUrlSubidaAvatarEmpleado()`, `actualizarAvatarEmpleado()` |

### Visibilidad cruzada

- **ScanYA:** Avatar visible en header y ResumenTurno
- **Business Studio:** ModalDetalleEmpleado ya lee `empleado.fotoUrl` — se ve automáticamente sin cambios
- **Login dueño/gerente:** También devuelve `fotoUrl` (desde `usuarios.avatar_url`)
