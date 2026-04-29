# Sucursales — Arquitectura

> **Última actualización:** 16 Abril 2026
> **Estado:** ✅ Completo (CRUD + selector de mapa + gerentes con creación o promoción + clonación automática incluyendo ofertas + eliminación protegida por historial + revocación automática de empleados)
> **Sprint:** 12

---

## Resumen

Módulo de gestión multi-sucursal para Business Studio. El módulo tiene **dos responsabilidades**:

1. **Gestión de sucursales**: listar, crear (con clonación automática desde Matriz), activar/desactivar, eliminar
2. **Gestión de gerentes**: el dueño crea una cuenta nueva O promueve una cuenta personal existente — no hay flujo de auto-registro

La **edición profunda** de cada sucursal (info, contacto, ubicación, horarios detallados, imágenes, operación) se delega a Mi Perfil (BS) — no se duplica.

---

## Modelo de roles (existente)

| Rol | Campo en `usuarios` | Acceso |
|-----|---------------------|--------|
| **Dueño** | `negocioId != null` y `sucursalAsignada = null` | Todas las sucursales, ve el módulo BS Sucursales |
| **Gerente** | `negocioId != null` y `sucursalAsignada = UUID` | Solo su sucursal, NO ve el módulo BS Sucursales |

- Máximo **1 gerente por sucursal**
- Gerentes NO ven el módulo Sucursales (guard frontend + 403 backend)

---

## Flujo de asignación de gerente

El dueño asigna un gerente desde BS Sucursales. **No hay registro independiente para gerentes**. Esto evita que alguien use invitaciones como puerta trasera para obtener cuentas comerciales gratuitas sin pasar por el trial/suscripción.

El flujo detecta automáticamente si el correo corresponde a una cuenta existente o nueva. El backend maneja ambos casos en la misma función `asignarGerenteSucursal()`:

### Caso A — Crear cuenta nueva (correo no existe)

1. Dueño abre detalle de sucursal → "Asignar gerente" → escribe el correo
2. Input valida en vivo: formato OK + no existe en BD → ✓ verde "Correo disponible — se creará una cuenta nueva"
3. Dueño llena nombre y apellidos
4. Dueño click en "Crear cuenta"
5. Backend crea usuario con:
   - `negocioId` = negocio del dueño
   - `sucursalAsignada` = UUID de la sucursal
   - `tieneModoComercial = true`, `modoActivo = 'comercial'`, `perfil = 'comercial'`
   - `contrasenaHash` = contraseña provisional generada (bcrypt 12 rondas)
   - `correoVerificado = false`
   - `requiereCambioContrasena = true`
6. Se envía email `enviarEmailGerenteCreado`: incluye la contraseña provisional
7. **Primer login**: el sistema detecta `requiereCambioContrasena = true` → muestra vista `VistaCambiarContrasena` para elegir contraseña definitiva

### Caso B — Promover cuenta personal existente (correo ya existe)

1. Dueño abre detalle de sucursal → "Asignar gerente" → escribe el correo
2. Input valida en vivo: formato OK + correo existe + cuenta elegible (sin negocio asignado) → ✓ verde con ícono `UserCheck` "Se promoverá cuenta existente de [Nombre Apellidos] a gerente"
3. Inputs de nombre y apellidos se **auto-llenan y deshabilitan** (se toman de la cuenta existente)
4. Dueño click en "Asignar gerente"
5. Backend actualiza el usuario existente (NO crea uno nuevo):
   - `negocioId` = negocio del dueño
   - `sucursalAsignada` = UUID de la sucursal
   - `tieneModoComercial = true`, `modoActivo = 'comercial'`, `perfil = 'comercial'`
   - `requiereCambioContrasena = false` (usa su contraseña personal actual)
   - `contrasenaHash` **NO se modifica** (conserva la del usuario)
6. Se envía email `enviarEmailGerenteAsignado`: notificación sin credenciales (el usuario ya tiene contraseña)
7. **Primer login**: entra directo con su contraseña habitual — no pasa por `VistaCambiarContrasena`

### Caso C — Cuenta existente NO elegible

Si el correo corresponde a una cuenta que ya tiene `negocioId` o `sucursalAsignada` (es dueño de otro negocio o gerente de otra sucursal):
- Frontend: input muestra ✗ roja "Este usuario ya tiene un negocio asignado en AnunciaYA"
- Backend: retorna 400 "Este usuario ya tiene un negocio asignado en AnunciaYA"

### Revocación (ambos casos)

Dueño click en "Revocar gerente" → `sucursalAsignada = null, negocioId = null, modoActivo = 'personal', tieneModoComercial = false, perfil = 'personal'`. La cuenta queda como usuario personal normal (no se elimina). Los datos históricos se conservan (FK `usuario_id`).

### Generación de contraseña provisional

Solo aplica en el **Caso A** (creación). La cuenta promovida mantiene su contraseña.

```typescript
// Reglas: mínimo 10 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número
// Mayúsculas: ABCDEFGHJKLMNPQRSTUVWXYZ (sin I/O para evitar ambigüedad)
// Minúsculas: abcdefghjkmnpqrstuvwxyz (sin i/l/o)
// Números: 23456789 (sin 0/1)
// Fisher-Yates shuffle para mezcla uniforme
// Usa crypto.randomInt (no Math.random)
```

---

## Validación inteligente de correo (`InputCorreoValidado`)

Al escribir el correo en "Asignar gerente", el componente reutilizable `InputCorreoValidado` aplica **4 niveles de validación**:

1. **Formato** (regex RFC 5322 simplificada) — inmediato
2. **Auto-exclusión** (no puede ser el correo del dueño) — inmediato
3. **Detección de typos de dominio** (distancia Levenshtein ≤ 2 contra lista de 13 dominios comunes MX como `gmail.com`, `hotmail.com`, `yahoo.com.mx`) — inmediato, con botón "Corregir"
4. **Disponibilidad contra BD** (vía `GET /auth/verificar-disponibilidad-correo`) — con debounce 400ms

### Estados visuales del input

| Estado | Indicador | Mensaje |
|--------|-----------|---------|
| Idle / escribiendo | spinner | — |
| Formato inválido | `XCircle` rojo | "Formato de correo inválido" |
| Es correo del dueño | `XCircle` rojo | "No puedes asignarte como gerente de tu propia sucursal" |
| Typo detectado | `Lightbulb` ámbar | "¿Quisiste decir **[correo corregido]**?" + botón "Corregir" |
| Disponible (cuenta nueva) | `CheckCircle2` verde | "Correo disponible — se creará una cuenta nueva" |
| Disponible (cuenta elegible) | `UserCheck` verde | "Se promoverá cuenta existente de [Nombre] a gerente" |
| No elegible | `XCircle` rojo | "Este usuario ya tiene un negocio asignado en AnunciaYA" |

### Modos del componente

`InputCorreoValidado` acepta prop `modo: 'registro' | 'gerente'`:
- `'registro'` (default): correos existentes → error
- `'gerente'`: correos existentes **sin negocio** → válido (promoción); con negocio → error

### Callback al padre

`onValidezCambio: (resultado: { valido: boolean; tipo?: 'nuevo' | 'promocion'; existente?: { nombre, apellidos } })` permite al componente padre adaptar la UI (botón, campos de nombre/apellidos auto-llenados, etc.).

### Reutilización

El componente se diseña genérico y puede usarse en futuros flujos de registro, edición de correo en Mi Perfil, etc.

---

## Blindajes anti-fraude

- El gerente **no puede** remover su `sucursalAsignada` por su cuenta
- El gerente **no puede** iniciar onboarding ni crear su propio negocio mientras tenga `sucursalAsignada`
- El gerente **no puede** cambiar datos del negocio (solo de su sucursal asignada)
- El gerente **no puede** cambiar su correo ni su `sucursalAsignada` — sí puede editar nombre, avatar, contraseña
- Si se revoca → pierde modo comercial, tendría que pagar trial/suscripción para su propio negocio
- La cuenta del gerente NO cuenta como suscripción — depende del dueño
- El dueño **no puede** asignarse a sí mismo como gerente (validación: `correo del gerente !== correo del dueño`)
- Al promover cuenta existente → solo si es 100% personal (`negocioId IS NULL AND sucursalAsignada IS NULL`)

---

## Seguridad: revocación en tiempo real

El middleware `validarAccesoSucursal` consulta la BD en cada request (no lee del token JWT). Al revocar un gerente (`sucursalAsignada = null`), su siguiente request será rechazado automáticamente por el middleware, forzando re-login. **No se necesita blacklist de tokens en Redis.**

---

## Datos históricos post-revocación

Las transacciones, ventas ScanYA, respuestas de chat y demás registros del gerente tienen FK a `usuario_id`. Al revocar, solo se quita `negocio_id` y `sucursal_asignada` del usuario — **los datos históricos no se pierden**. El historial sigue mostrando "Registrado por: [nombre del ex-gerente]".

---

## Arquitectura Backend

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `validations/sucursales.schema.ts` | Zod schemas: `crearSucursalSchema`, `crearGerenteSchema`, `toggleActivaSchema` |
| `services/sucursales.service.ts` | KPIs + gerentes. Función principal `asignarGerenteSucursal()` que maneja creación y promoción en la misma lógica. Helper `generarContrasenaProvisional()` |
| `controllers/sucursales.controller.ts` | 9 controllers (5 CRUD + 4 gerentes) con validación de rol dueño |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `db/schemas/schema.ts` | Campo `requiereCambioContrasena BOOLEAN DEFAULT false` en tabla `usuarios` |
| `services/negocioManagement.service.ts` | 3 funciones: `crearSucursal` (con clonación), `toggleActivaSucursal`, `eliminarSucursal` (hard delete + limpieza R2) |
| `services/auth.service.ts` | Nueva función `verificarDisponibilidadCorreo(correo)` — retorna `{ disponible, existente? }` con info del usuario si aplica |
| `controllers/auth.controller.ts` | Nuevo controller `verificarDisponibilidadCorreoController` |
| `middleware/rateLimiter.ts` | Nuevo `limitadorVerificacionCorreo` (500/min dev, 30/min prod) |
| `routes/auth.routes.ts` | Nueva ruta `GET /auth/verificar-disponibilidad-correo` |
| `routes/negocios.routes.ts` | 9 rutas nuevas (5 CRUD + 4 gerentes) |
| `utils/email.ts` | 4 templates: `enviarEmailGerenteCreado`, `enviarEmailGerenteAsignado` (promoción), `enviarEmailCredencialesReenviadas`, `enviarEmailGerenteRevocado`. Plantilla base `plantillaGerenteBase` con header gradiente azul estilo ScanYA + logo AnunciaYA desde URL pública en R2 |

### Endpoints

```
BASE: /api/negocios
MIDDLEWARE: verificarToken, verificarNegocio
AUTORIZACIÓN: validarEsDueno() en todos los controllers (403 si gerente)

-- CRUD Sucursales (5) --
GET    /:negocioId/sucursales/kpis              → kpisSucursalesController
GET    /:negocioId/sucursales/lista             → listarSucursalesConGerenteController (LEFT JOIN con gerente)
POST   /:negocioId/sucursales                   → crearSucursalController (clona todo desde Matriz)
PATCH  /sucursal/:id/toggle-activa              → toggleActivaSucursalController (revoca gerente si se desactiva)
DELETE /sucursal/:id/eliminar                   → eliminarSucursalController (hard delete + limpieza R2)

-- Gerentes (4) --
GET    /sucursal/:id/gerente                    → obtenerGerenteSucursalController
POST   /sucursal/:id/crear-gerente              → crearGerenteController (crea cuenta O promueve + email según tipo)
POST   /sucursal/:id/reenviar-credenciales      → reenviarCredencialesController (regenera password + email)
DELETE /sucursal/:id/revocar-gerente            → revocarGerenteController (vuelve a modo personal + email)
```

### Endpoint auxiliar (compartido con otros flujos)

```
BASE: /api/auth
MIDDLEWARE: verificarToken, limitadorVerificacionCorreo

GET /auth/verificar-disponibilidad-correo?correo=xxx
  → { disponible: boolean, existente?: { nombre, apellidos, tieneNegocio } }
```

**Seguridad**: endpoint requiere autenticación para evitar enumeración pública de usuarios. Rate limit adicional mitiga abuso interno.

---

## Clonación automática al crear sucursal

Cuando se crea una nueva sucursal, el backend **clona automáticamente desde la sucursal Matriz** (esPrincipal=true) del mismo negocio. La sucursal nueva nace con los datos listos para operar sin que el dueño tenga que volver a configurar nada.

### Campos directos heredados de Matriz

Al crear la sucursal, además de los campos que ingresa el dueño, el service copia de Matriz:
- `tieneEnvioDomicilio`
- `tieneServicioDomicilio`

**No se hereda** `zonaHoraria` — se deriva del `estado` de la sucursal nueva (ver sección "Zona horaria").

### 1. Horarios (7 registros)
- Si Matriz tiene horarios → se clonan tal cual (incluyendo `tieneHorarioComida`, `comidaInicio`, `comidaFin`)
- Si Matriz no tiene horarios → se crean 7 horarios vacíos (`abierto: false`)

### 2. Métodos de pago
- Se clonan de Matriz (`tipo`, `activo`, `instrucciones`)

### 3. Catálogo (artículos completos duplicados)
Los artículos se duplican como **registros independientes**, no como asignaciones compartidas:

- Para cada artículo de Matriz:
  - Duplicar `imagenPrincipal` en R2 (carpeta `articulos/`) vía `CopyObjectCommand`
  - Duplicar cada URL de `imagenesAdicionales` en R2
  - INSERT nuevo registro en `articulos` con todas las propiedades (nombre, descripción, precio, categoría, SKU, tipo, requiereCita, duracionEstimada, etc.)
  - INSERT en `articulo_sucursales` enlazando con la nueva sucursal

**Razón de la arquitectura:** cada sucursal puede tener precios distintos, disponibilidad distinta, imágenes distintas. El catálogo es 100% independiente tras la creación.

### 4. Imágenes de sucursal (R2)
- **Foto de perfil** → `duplicarArchivo(url, 'perfiles')`
- **Portada** → `duplicarArchivo(url, 'portadas')` ⚠️ carpeta correcta (no `sucursales/`)
- **Galería completa** → por cada imagen, `duplicarArchivo(url, 'galeria')` + INSERT en `negocio_galeria` (las copias son archivos R2 independientes)

### 5. Ofertas públicas (con imágenes independientes)

Se clonan las ofertas con `visibilidad = 'publico'` de la sucursal Matriz. Los **cupones privados** (`visibilidad = 'privado'`) NO se clonan — son asignaciones individuales a usuarios específicos con `codigoPersonal` y no tienen sentido duplicarlas.

Por cada oferta pública de Matriz:
- Duplicar `imagen` en R2 con `duplicarArchivo(url, 'ofertas')` — URL independiente en el bucket
- INSERT en `ofertas` con la nueva `sucursalId`
- Se preserva: título, descripción, tipo, valor, fechas (inicio/fin), compra mínima, límites de uso, `activo`
- `usosActuales` se reinicia a `0` en la copia — la sucursal nueva tiene su propio contador de canjes

Tras la creación, las ofertas de cada sucursal son **independientes**: editar la imagen de la oferta de una sucursal no afecta a las demás, y al actualizar la imagen de una oferta existente la anterior se borra de R2 (ver sección "Promociones").

### Helper: `duplicarArchivo()` en `r2.service.ts`
Usa `CopyObjectCommand` del SDK de S3 — duplicación **server-side en R2** (el archivo no pasa por el backend). Mucho más eficiente que descargar y re-subir.

---

## Zona horaria (derivada del estado)

La zona horaria de cada sucursal se determina automáticamente a partir de su campo `estado`, usando el helper `getZonaHorariaPorEstado(estado)` en `apps/api/src/utils/zonaHoraria.ts`.

### Mapeo de estados → zonas IANA

| Estado(s) | Zona |
|-----------|------|
| Baja California | `America/Tijuana` (UTC-8, con DST) |
| Sonora | `America/Hermosillo` (UTC-7, SIN DST) |
| Baja California Sur, Sinaloa, Nayarit, Chihuahua | `America/Mazatlan` (UTC-7, con DST) |
| Quintana Roo | `America/Cancun` (UTC-5, SIN DST) |
| Resto del país (27 estados) | `America/Mexico_City` (UTC-6, con DST) |

### Dónde se aplica

- **`crearSucursal`** (BS → Sucursales → Nueva): zona derivada del `estado` ingresado por el dueño al momento de crear
- **`actualizarSucursal`** (Onboarding paso 2 o Mi Perfil → Ubicación): siempre recalcula desde el `estado` actual, ignorando el `zonaHoraria` que pueda venir del cliente

### Propósito

La query SQL del feed público usa `CURRENT_TIME AT TIME ZONE s.zona_horaria` para calcular el estado "Abierto/Cerrado". Derivar la zona del estado previene que una sucursal abierta en una zona horaria aparezca como cerrada porque el cálculo se hizo en otra zona.

Normalización del input: el helper hace `lowercase + NFD diacritics strip`, por lo que tolera "México", "mexico", "MÉXICO", "Mexíco" como equivalentes. Si el estado no está en el mapa, cae al fallback seguro `America/Mexico_City`.

---

## Eliminación de sucursal (con protección de historial)

La política del módulo distingue entre sucursales "desechables" (recién creadas por error, sin uso) y sucursales con historial real de operación. El borrado físico solo aplica a las primeras.

### Validaciones previas

- La sucursal no puede ser la principal (`esPrincipal = true` → 400 "La Matriz no se puede eliminar")
- La sucursal debe existir (404 si no)
- **Si tiene transacciones en `puntos_transacciones` → 409 `TIENE_HISTORIAL`** (bloquea el borrado físico)

### Rama A — Sin historial: borrado físico con limpieza R2

Aplica cuando `COUNT(puntos_transacciones WHERE sucursal_id = X) = 0`. Flujo en 5 pasos:

```
1. Revocar gerente si tiene
   └─ UPDATE usuarios SET sucursalAsignada=null, negocioId=null, modoActivo='personal'

1.1. Revocar sesiones ScanYA de los empleados (ANTES del CASCADE)
   ├─ Listar empleadoId + usuarioId de la sucursal
   ├─ UPDATE scanya_turnos SET hora_fin = NOW() para turnos abiertos
   ├─ Revocar cada empleadoId en Redis (timestamp para tokenStoreScanYA)
   └─ Emitir socket 'scanya:sesion-revocada' a los usuarios afectados

2. Recolectar TODAS las URLs de R2 (6 queries en paralelo)
   ├─ Sucursal: foto_perfil + portada_url
   ├─ Galería: negocio_galeria.url
   ├─ Ofertas/Cupones: ofertas.imagen
   ├─ Empleados: empleados.foto_url
   ├─ Bolsa de trabajo (Servicios): bolsa_trabajo.portafolio_url
   └─ Transacciones ScanYA: puntos_transacciones.foto_ticket_url + transacciones_evidencia.url_imagen

3. Artículos huérfanos
   ├─ DELETE articulo_sucursales WHERE sucursal_id = X
   ├─ Para cada artículo asignado: contar cuántas sucursales lo usan
   ├─ Si count=0 → es huérfano
   ├─ Recolectar imagenPrincipal + imagenesAdicionales de huérfanos
   └─ DELETE articulos WHERE id IN (huérfanos)

4. Eliminar TODAS las imágenes de R2 en paralelo
   └─ Promise.all(urls.map(url => eliminarArchivo(url)))
      └─ Filtra con esUrlR2() — solo elimina archivos de nuestro bucket

5. DELETE negocio_sucursales WHERE id = X
   └─ CASCADE elimina: horarios, métodos de pago, galería, ofertas, empleados, bolsa trabajo, transacciones

> Nota: las tablas `dinamicas`, `dinamica_premios` y `dinamica_participaciones`
> fueron eliminadas en Fase D del cleanup (visión v3 — abril 2026), por lo que
> ya no participan en este flujo de hard-delete.
```

### Rama B — Con historial: desactivación guiada desde el frontend

Cuando el backend responde `409 TIENE_HISTORIAL`, el hook `useEliminarSucursal` **suprime el toast genérico** para que no se dupliquen mensajes. El componente `handleEliminar` en `PaginaSucursales` detecta el `code` en la respuesta y abre un segundo confirm:

> *"'Sucursal Centro' tiene ventas registradas. Para conservar el historial no se puede eliminar. ¿Quieres desactivarla? El gerente asignado será revocado."*

Si el dueño acepta, se dispara `toggleActivaSucursal(false)` automáticamente (no requiere navegar a otra acción). La sucursal queda oculta del feed público, empleados revocados y gerente revocado, pero toda la BD permanece intacta: transacciones, reseñas, empleados como entidades, ofertas históricas, turnos ScanYA — todo conserva su trazabilidad.

### Revocación de empleados (helper compartido)

Tanto `toggleActivaSucursal(false)` como `eliminarSucursal` (rama A) invocan `revocarEmpleadosDeSucursal(sucursalId, motivo)`:
- Cierra turnos ScanYA abiertos con `notas_cierre = motivo`
- Marca timestamp de revocación en Redis por cada empleado
- Emite `scanya:sesion-revocada` al usuarioId del dueño (ScanYA filtra por `empleadoId` en cliente)

Los empleados **no** se marcan como inactivos en la tabla `empleados` — si la sucursal se reactiva, pueden volver a iniciar sesión con sus credenciales actuales.

### Imágenes NO eliminadas
- **ChatYA**: las imágenes de conversaciones NO se borran — pertenecen a mensajes de usuarios, se mantienen hasta que los usuarios borren sus mensajes/conversaciones
- **URLs no-R2**: solo se eliminan URLs de R2 (verificado con `esUrlR2()`); cualquier URL externa se ignora

### Performance
- Las 7 queries de recolección corren con `Promise.all` (paralelo)
- La eliminación de R2 también corre con `Promise.all` (paralelo) con `.catch()` individual para no bloquear por fallos puntuales
- Eliminar 20-50 archivos de R2 toma ~1-3 segundos en lugar de 10-30 segundos secuencial

---

## Arquitectura Frontend

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `types/sucursales.ts` | Interfaces: `SucursalResumen`, `GerenteResumen`, `KPIsSucursales`, `CrearSucursalInput`, `CrearGerenteInput`, `FiltrosSucursalesUI` |
| `services/sucursalesService.ts` | 10 funciones API (5 CRUD + 4 gerentes + detalle) |
| `hooks/queries/useSucursales.ts` | React Query: KPIs, lista, detalle, gerente + 6 mutations (crear, toggle, eliminar, crear gerente, revocar gerente, reenviar credenciales) |
| `hooks/queries/useVerificarCorreo.ts` | Hook reutilizable — verifica disponibilidad de correo contra BD (debounce aplicado por el componente) |
| `utils/validarCorreo.ts` | Funciones puras: `esFormatoValido()` (regex) y `detectarTypoDominio()` (Levenshtein contra 13 dominios comunes MX) |
| `components/ui/InputCorreoValidado.tsx` | Input reutilizable con 4 niveles de validación visual + modo `gerente`/`registro`. Debounce interno de 400ms |
| `pages/.../sucursales/PaginaSucursales.tsx` | Página principal (KPIs, filtros, tabla/cards) |
| `pages/.../sucursales/ModalCrearSucursal.tsx` | Modal crear con progreso animado de clonación |
| `pages/.../sucursales/ModalDetalleSucursal.tsx` | Modal detalle con sección gerente — usa `InputCorreoValidado` en modo gerente + botón "Crear cuenta" / "Asignar gerente" adaptativo |
| `pages/.../sucursales/index.ts` | Re-export |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `config/queryKeys.ts` | Sección `sucursales: { all, kpis, lista, detalle, gerente }` |
| `services/authService.ts` | Nueva función `verificarDisponibilidadCorreo(correo)` + tipos `RespuestaVerificarCorreo`, `UsuarioExistenteResumen` |
| `components/auth/vistas/VistaCambiarContrasena.tsx` | Simplificado — ya no pide contraseña provisional (solo nueva + confirmar). El `tokenTemporal` certifica la autenticación previa |
| `router/index.tsx` | Reemplazar placeholder con lazy import |
| `components/layout/Navbar.tsx` | Ocultar "Sucursales" del menú BS para gerentes |

### Página principal (`PaginaSucursales.tsx`)

- **Guard**: si gerente → estado vacío "Solo dueños pueden gestionar sucursales"
- **Header animado** con `Building2` icon (estilo `HeaderAnimado` BS)
- **KPIs** en `CarouselKPI` (Total, Activas, Inactivas) — 3 colores semánticos
- **Filtros**: chips estado (Todas/Activas/Inactivas) + buscador + botón "+Nueva Sucursal"
- **Vista dual**:
  - Móvil: cards con nombre, ciudad, gerente o "Sin gerente", badges (Principal, Activa/Inactiva)
  - Desktop: tabla (Nombre | Ciudad | Gerente | Estado | Principal | Acciones)
- **Acciones por fila**: Ver detalle, Toggle activa, Eliminar
- `placeholderData: keepPreviousData` en la lista para evitar temblor visual al filtrar

### Modal crear sucursal (`ModalCrearSucursal.tsx`)

Tiene **dos vistas**:

**Vista 1 — Formulario:**

Campos (todos visibles de una vez, con scroll interno si el viewport es pequeño):

- **Nombre de la sucursal** *(obligatorio)* — validado en vivo contra la lista de sucursales existentes del negocio. Si colisiona (comparación `trim().toLowerCase()`), el input se pone con `border-red-500`, aparece mensaje inline *"Ya existe una sucursal con ese nombre en este negocio"* y el botón "Crear sucursal" queda deshabilitado. El backend aplica la misma validación como defensa en profundidad (responde `409 NOMBRE_DUPLICADO`).
- **Ciudad** *(obligatorio)* — autocomplete con `buscarCiudades`. Al seleccionar, auto-llena Estado y dispara el centrado del mapa con las coordenadas de la ciudad.
- **Estado** — solo lectura, se llena automáticamente al seleccionar ciudad.
- **Dirección** — texto libre.
- **Teléfono** y **WhatsApp** — usan el componente reutilizable `InputTelefono` (ver sección "Componente `InputTelefono`") con lada `+52` por defecto y 10 dígitos.
- **Correo** — input type email.
- **Ubicación en el mapa** *(obligatorio)* — mapa Leaflet con marcador arrastrable que aparece al seleccionar ciudad. El dueño arrastra el marcador o toca el mapa para ajustar la ubicación exacta. Sin coordenadas fijadas, el botón "Crear sucursal" queda deshabilitado. Incluye botón flotante `Maximize2` para abrir el popup fullscreen del mapa.

Al pie del formulario aparece un **checklist visual** con `CheckCircle2` emerald listando lo que se clonará de Matriz:

> Se copiarán automáticamente de este Negocio:
> ✓ Horarios
> ✓ Métodos de pago
> ✓ Imágenes (perfil, portada, galería)
> ✓ Catálogo
> ✓ Ofertas

Header oscuro (`linear-gradient(135deg, #1e293b, #334155)`) con icono `Building2`.

**Vista 2 — Progreso animado:**

- Modal bloqueado (no se puede cerrar mientras procesa)
- Header oscuro igual al formulario (→ verde cuando completa)
- Barra de progreso con porcentaje en tiempo real
- 6 pasos con iconos + estados (pendiente → activo con spinner → completado con "Listo"):
  1. Creando sucursal (`Building2`, delay 0)
  2. Copiando horarios (`Clock`, delay 700ms)
  3. Copiando métodos de pago (`CreditCard`, delay 1400ms)
  4. Duplicando imágenes (`Image`, delay 2100ms)
  5. Copiando catálogo (`PackageOpen`, delay 2900ms)
  6. Copiando ofertas (`Tag`, delay 3700ms)
- Animación simulada por timers (los delays no son callbacks reales del backend) — sincronizada para que al terminar el request real se completen todos los pasos + cierre del modal
- Colores token: emerald para completado, slate-700 para activo, slate-200 para pendiente

### Popup fullscreen del mapa

El mapa pequeño del formulario tiene un ícono `Maximize2` flotante en la esquina superior derecha. Al click, se abre un overlay a pantalla completa con `createPortal(document.body)` y `z-[99999]` (para superar el stacking context del modal padre).

- Header oscuro con ícono `MapPin`, título "Ajustar ubicación" y botón `X` de cerrar
- Mapa con `zoom=16`, `scrollWheelZoom=true` y `zoomControl=true` para ajuste preciso
- Marcador arrastrable sincronizado con el state del modal — los cambios en el fullscreen se reflejan al cerrarlo en el mapa pequeño
- El mismo patrón está aplicado en `TabUbicacion` (Mi Perfil) y `PasoUbicacion` (Onboarding) para consistencia

### Componente `InputTelefono` (compartido)

`apps/web/src/components/ui/InputTelefono.tsx` expone:

- Componente con dos inputs: lada (máx 4 chars, default `+52`) + número de 10 dígitos
- Función `normalizarTelefono(tel)` que tolera formatos `"+52 6381234567"`, `"+526381234567"` y `"6381234567"` y devuelve `{ lada, numero }`
- Valor guardado: `"+52 6381234567"` (lada + espacio + 10 dígitos) — mismo formato que `TabContacto` de Mi Perfil
- Filtra caracteres no numéricos al vuelo: `replace(/\D/g, '')` en cada cambio, `maxLength={10}`, `inputMode="numeric"` (teclado numérico en móvil)

Zod schema del backend (`sucursales.schema.ts`) acepta los 3 formatos con regex `^\+\d{1,3}\s?\d{10}$` o `^\d{10}$` (retrocompatibilidad con datos viejos sin lada).

### Modal detalle sucursal (`ModalDetalleSucursal.tsx`)

- Header oscuro con `Building2` + nombre sucursal + badge estado
- Datos solo lectura: dirección, contacto, estado, si es principal
- **Sección Gerente**:
  - Sin gerente → botón "Asignar gerente" → formulario inline (nombre, apellidos, correo)
  - Con gerente → avatar + nombre + correo + botones "Revocar gerente" + "Reenviar credenciales"
- Botón "Editar en Mi Perfil" → redirige a Mi Perfil BS (edición profunda delegada)

---

## Tipos de datos

### Tabla `negocio_sucursales` (pre-existente)

Campos relevantes para Sucursales:
- `id` UUID PK
- `negocio_id` UUID FK
- `nombre`, `ciudad`, `estado`, `direccion`, `telefono`, `whatsapp`, `correo`
- `es_principal` BOOLEAN
- `activa` BOOLEAN
- `foto_perfil` TEXT (URL R2)
- `portada_url` TEXT (URL R2)
- Otros: `latitud`, `longitud`, `es_por_cita`, etc.

### Campo en `usuarios` relacionado con gerentes

```sql
requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT false
```

**Propósito:** marca cuentas de gerente recién creadas (o con credenciales reenviadas) para que el primer login fuerce cambio de contraseña.

---

## React Query — Invalidaciones cruzadas

El helper `useInvalidarSucursales` invalida 3 scopes cada vez que se modifica una sucursal:

- `queryKeys.sucursales.all()` — KPIs, lista, detalle de BS Sucursales
- `queryKeys.perfil.sucursales(negocioId)` — selector de sucursales del navbar y Mi Perfil
- `queryKeys.negocios.all()` — feed público de Negocios (lista + popup del mapa + perfil individual)

Esto garantiza que:
- Al crear una sucursal, el selector del Navbar se actualiza y la sucursal aparece en el feed público automáticamente
- Al activar/desactivar, el feed público refleja el cambio sin recargar (las sucursales desactivadas desaparecen del feed)
- Al eliminar o asignar/revocar gerente, el detalle muestra el estado actualizado

---

## Edge cases manejados

| Caso | Comportamiento |
|------|----------------|
| Correo no existe en BD | Frontend muestra ✓ "se creará cuenta nueva"; backend crea con contraseña provisional |
| Correo existe y es cuenta 100% personal | Frontend muestra ✓ "se promoverá cuenta existente de [Nombre]"; backend actualiza (NO toca contraseña) |
| Correo existe pero ya tiene negocio asignado | Frontend + backend rechazan: "Este usuario ya tiene un negocio asignado en AnunciaYA" |
| Correo del gerente = correo del dueño | Frontend + backend rechazan: "No puedes asignarte como gerente de tu propia sucursal" |
| Correo con typo de dominio (ej: `gmail.cof`) | Input muestra sugerencia 💡 ámbar "¿Quisiste decir **gmail.com**?" con botón "Corregir" |
| Sucursal ya tiene gerente al crear otro | Error 400 "Esta sucursal ya tiene un gerente asignado" |
| Eliminar sucursal con gerente | Se revoca gerente automáticamente antes del DELETE |
| Desactivar sucursal con gerente | Se revoca gerente automáticamente (vuelve a modo personal) |
| Desactivar sucursal con empleados | Se revocan sesiones ScanYA activas (Redis + socket) — los empleados siguen existiendo en BD |
| Login ScanYA contra sucursal desactivada | Bloqueado con 403 "La sucursal está desactivada" en los 3 flujos (`loginDueno` con sucursalId, `loginDueno` fallback Matriz, `loginDueno` como gerente, `loginEmpleado`). Ver `docs/arquitectura/ScanYA.md` sección "Bloqueo de login en sucursal desactivada" |
| Eliminar sucursal con transacciones | Bloqueado (`409 TIENE_HISTORIAL`) — frontend ofrece desactivar como alternativa |
| Eliminar sucursal con empleados | Se revocan sesiones ScanYA antes del DELETE; el CASCADE borra los registros de empleados pero `puntos_transacciones.empleado_id` queda en `NULL` por FK `SET NULL` |
| Desactivar Matriz | Bloqueado — UI con botón `disabled` (cursor not-allowed, tooltip "La Matriz no se puede desactivar") + backend 400 "La Matriz no se puede desactivar" |
| Eliminar Matriz | Bloqueado — UI con botón `disabled` + backend 400 "La Matriz no se puede eliminar" |
| Dueño accede a su sucursal desactivada | Permitido — `obtenerPerfilSucursal` hace bypass del filtro `activa=true` si el `userId` es el dueño del negocio o gerente de la sucursal. El feed público sigue sin mostrarla |
| Crear sucursal con nombre duplicado | Input con borde rojo, mensaje inline y botón deshabilitado. Si llega al backend (race condition), responde `409 NOMBRE_DUPLICADO` |
| Crear sucursal con teléfono/WhatsApp con letras | El input los filtra en `onChange` (solo dígitos), máx 10. Zod rechaza si llega algo fuera del formato `+lada número` |
| Editar imagen de oferta existente | La imagen anterior se elimina de R2 automáticamente en `actualizarOferta` (solo si era URL del bucket propio) |
| Gerente accede a BS Sucursales | Estado vacío frontend + 403 backend (double-guard) |
| Sucursal matriz sin datos (horarios/galería vacíos) | Crea horarios vacíos; omite clonación de catálogo/imágenes si no hay qué clonar |
| Artículo asignado a varias sucursales, eliminas una | NO se borra el artículo (sigue usado por otras); solo se borra la asignación |
| Artículo asignado solo a la sucursal eliminada | Es huérfano → se elimina registro + imágenes de R2 |
| Cuenta promovida cuyo `requiereCambioContrasena` quedó en `true` de un flujo anterior | La promoción lo fuerza a `false` (el usuario usa su contraseña personal actual) |

---

## UX del modal de asignación de gerente

El modal de detalle de sucursal contiene dos vistas que se intercambian con el estado `mostrarFormGerente`:

### Header del modal

El header cambia según la vista activa:

| Vista | Icono | Título | Subtítulo |
|-------|-------|--------|-----------|
| Detalle de sucursal | `Building2` | Nombre de la sucursal (con ⭐ si es Matriz) | "Activa" / "Inactiva" |
| Sub-flujo de asignar gerente | `UserPlus` | "Asignar gerente" | Nombre de la sucursal (como referencia) |

### Footer del modal

- En la vista de detalle: muestra "Cerrar" y "Editar en Mi Perfil"
- En el sub-flujo de asignar gerente: el footer se oculta. Solo quedan visibles los botones del sub-flujo ("Cancelar" y "Crear cuenta" / "Asignar gerente"). Esto previene clicks accidentales en botones que navegarían fuera del formulario y perderían lo escrito.

### Formulario de asignación

Orden de campos: **Correo → Nombre → Apellidos**. El correo se valida primero porque determina si la operación será creación o promoción:

- Si la validación detecta cuenta personal existente: los inputs de Nombre y Apellidos se auto-llenan con los datos del usuario (leídos desde BD) y quedan deshabilitados
- Si la cuenta no existe: el dueño ingresa manualmente Nombre y Apellidos

### Texto descriptivo debajo del formulario

Solo aparece cuando el correo es ✓ válido (formato, no excluido, disponible o elegible para promoción). Personalizado con el primer nombre del gerente (sin apellidos):

- **Promoción**: "{Nombre} recibirá una invitación por correo."
- **Creación**: "{Nombre} recibirá sus credenciales de acceso por correo."

### Mensaje del input de correo

El mensaje verde bajo el input describe la acción que se tomará con la cuenta (sin repetir el nombre, que ya aparece en el texto descriptivo):

- **Promoción**: "Cuenta existente — se promoverá a modo comercial"
- **Creación**: "Correo disponible — se creará una cuenta nueva"

### Botón principal del sub-flujo

Adapta su texto e icono según el tipo de operación:

- **Creación**: "Crear cuenta" (gradiente slate estándar de la app)
- **Promoción**: "Asignar gerente" con icono `UserCheck`

### Botones del gerente asignado

La card del gerente muestra botones diferentes según el estado de activación de la cuenta:

- **Cuenta pendiente** (`requiereCambioContrasena = true`): dos botones lado a lado (`flex-1`) con `border-2`: "Reenviar credenciales" (indigo) y "Revocar gerente" (rojo)
- **Cuenta activada** (`requiereCambioContrasena = false`): solo "Revocar gerente" en estilo ghost compacto, alineado a la derecha, sin borde, con hover en fondo rojo suave. "Reenviar credenciales" no se muestra

### Protección contra reenvío en cuentas activadas

El botón "Reenviar credenciales" se oculta cuando la cuenta ya está activada para evitar que el dueño sobrescriba accidentalmente la contraseña definitiva del gerente con una provisional nueva.

El backend también rechaza la operación como defensa adicional. En `reenviarCredenciales()` de `sucursales.service.ts`:

```typescript
if (!gerente.requiereCambioContrasena) {
  throw new Error('El gerente ya activó su cuenta. No es posible reenviar credenciales. Si perdió el acceso, puede usar "Olvidé mi contraseña" desde el login.');
}
```

---

## Acceso restringido para gerentes

La página `/business-studio/sucursales` no es accesible para gerentes. Al intentar entrar, `PaginaSucursales.tsx` detecta `esGerente` y renderiza una card centrada con:

- Icono `Lock` en círculo con gradiente slate oscuro `linear-gradient(135deg, #334155, #475569)` y `shadow-md`
- Título "Acceso restringido" en slate-900 bold
- Mensaje: "La gestión de sucursales es **exclusiva del dueño** del negocio. Si necesitas hacer cambios, contacta con el propietario."
- Card contenedora con `border-2 border-slate-200`, `rounded-2xl`, `shadow-lg`, `max-w-md`, centrada con `min-h-[70vh]`

Como defensa adicional, cada controller del backend de sucursales invoca `validarEsDueno()` que retorna 403 si la petición proviene de un gerente.

## Bloqueo del onboarding para gerentes

`PaginaOnboarding.tsx` (ruta `/business/onboarding`) rechaza a usuarios con `sucursalAsignada != null` mediante tres capas:

- `useEffect` con `useRef` que dispara el toast "Los gerentes no pueden crear negocios" una sola vez (idempotente ante StrictMode)
- `useEffect` de inicialización del store con early return si el usuario es gerente — evita llamadas innecesarias al backend
- Render: `if (esGerente) return null;` al inicio del componente — el redirect a `/inicio` ocurre sin renderizar el contenido del onboarding

---

## Flujo primer login del gerente

Aplica únicamente a gerentes del Caso A (cuentas creadas desde cero con contraseña provisional). Los gerentes del Caso B (promoción) entran directo con su contraseña personal sin pasar por este flujo.

Cuando el gerente inicia sesión con la contraseña provisional:

1. **Login** (`POST /api/auth/login`):
   - `auth.service.ts` valida el correo y la contraseña provisional con `bcrypt.compare`
   - Detecta `usuario.requiereCambioContrasena === true`
   - Excepción en verificación de correo: si `!correoVerificado && requiereCambioContrasena` se permite el login (la cuenta es recién creada y el correo se verifica al cambiar la contraseña)
   - Genera `tokenTemporal = crypto.randomUUID()` y lo guarda en Redis con TTL 5 minutos (reusa `guardarTokenTemporal2FA`)
   - Retorna `{ success: true, data: { usuario, accessToken: '', refreshToken: '', requiereCambioContrasena: true, tokenTemporal } }`
   - No emite `accessToken` ni `refreshToken` — el gerente no accede a ninguna ruta autenticada hasta cambiar su contraseña

2. **Frontend intercepta**:
   - `authService.ts` detecta `requiereCambioContrasena=true` en la respuesta del login
   - Redirige a `VistaCambiarContrasena.tsx` con el `tokenTemporal`
   - La vista pide solo nueva contraseña y confirmación. El `tokenTemporal` certifica que la provisional ya fue validada en el login — no se solicita de nuevo

3. **Cambio de contraseña** (`POST /api/auth/cambiar-contrasena-provisional`):
   - Recibe `{ tokenTemporal, nuevaContrasena }`
   - Valida el token contra Redis
   - Aplica reglas de contraseña: 8+ caracteres, 1 mayúscula, 1 minúscula, 1 número
   - Valida con `bcrypt.compare` que la nueva contraseña sea diferente de la provisional almacenada
   - `UPDATE usuarios SET contrasena_hash=<nuevo>, requiere_cambio_contrasena=false, correo_verificado=true, correo_verificado_at=NOW()`
   - Invalida el token temporal en Redis
   - Frontend redirige al login normal para obtener `accessToken` y `refreshToken` reales

4. **Sesión normal**: la cuenta queda verificada y el gerente puede operar.

## Pendientes

- **Testing E2E**: specs Playwright para flujo completo (crear sucursal, asignar gerente, primer login forzoso, revocar, eliminar)
- **Testing API**: tests Vitest para endpoints del módulo
- **Decisión: Cambiar principal**: evaluar si se implementa desde BS Sucursales o queda en Mi Perfil. Actualmente el módulo solo permite toggle activa + eliminar.

---

## Decisiones de diseño

- **Dueño crea cuenta del gerente** (no registro independiente): evita puerta trasera para cuentas comerciales gratuitas sin pasar por trial/suscripción
- **Promoción de cuentas personales existentes**: permite que un usuario que ya usa AnunciaYA (como personal) pase a ser gerente sin tener que crearse una segunda cuenta. Solo se permite si es 100% personal (sin negocio asignado)
- **Promoción NO toca la contraseña**: el usuario mantiene su contraseña personal. Sobrescribir sería agresivo y romper expectativas del usuario
- **Creación sí genera contraseña provisional**: en el caso de cuenta nueva, el gerente recibe una contraseña por email y debe cambiarla al primer login
- **Cambio contraseña provisional NO pide provisional de nuevo**: el `tokenTemporal` del login ya certifica que la provisional fue validada. Pedirla de nuevo en el modal sería mala UX
- **Validación de correo en 4 niveles**: formato + exclusión + typos + disponibilidad. Evita crear cuentas con correos mal escritos (`gmail.cof`) que luego rebotan al enviar credenciales
- **Componente `InputCorreoValidado` reutilizable**: diseñado genérico para otros flujos (registro, Mi Perfil, etc.)
- **Endpoint de verificación autenticado**: `GET /auth/verificar-disponibilidad-correo` requiere token para evitar enumeración pública de usuarios
- **`useQuery` simple (no InfiniteQuery)**: bajo volumen esperado (<50 sucursales por negocio)
- **Edición redirige a Mi Perfil**: evita duplicar 6 tabs de formularios complejos
- **Hard delete para sucursales**: con limpieza exhaustiva de R2. Las sucursales se borran completamente (no soft delete) porque FK con CASCADE maneja toda la cadena de eliminación (horarios, métodos, galería, etc.)
- **Artículos duplicados como registros independientes**: permite que cada sucursal tenga precios, disponibilidad e imágenes distintas desde el primer día
- **Revocación → modo personal** (no eliminación): la cuenta del ex-gerente puede seguir usando AnunciaYA como usuario personal. Si quiere comerciante, debe pagar
- **Campo `requiereCambioContrasena`**: más limpio que tokens temporales, se persiste en BD
- **Galería copiada como archivos R2 independientes**: cada sucursal nueva recibe su propia copia en R2, sin compartir referencia con la matriz
- **Logo de emails en R2 (no base64)**: Gmail bloquea data URIs desde 2013. URL pública + formato PNG para compatibilidad universal
- **Emails con estilo ScanYA**: header con gradiente azul `linear-gradient(135deg, #02143D 10%, #001E70 50%, #034AE3 100%)` y logo blanco, para que visualmente se reconozca como comunicación oficial de AnunciaYA

---

## Referencias

- **Business Studio (doc general):** `docs/arquitectura/Business_Studio.md`
- **Middleware sucursal:** `apps/api/src/middleware/sucursal.middleware.ts`
- **R2 Service (duplicar/eliminar):** `apps/api/src/services/r2.service.ts`
- **Negocio Management Service:** `apps/api/src/services/negocioManagement.service.ts`
- **Patrón React Query:** `docs/estandares/PATRON_REACT_QUERY.md`
- **Tokens UI:** `docs/estandares/TOKENS_GLOBALES.md`, `docs/estandares/TOKENS_COMPONENTES.md`
