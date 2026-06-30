# Mi Perfil — Cuenta del usuario (Modo Personal)

> **Estado:** ✅ **Los 3 tabs construidos.** `/perfil` (Modo Personal) está completo:
> - **Datos Personales** — avatar, nombre, apellidos, teléfono (lada editable), fecha de nacimiento, género y ciudad. Es el tab por defecto.
> - **Seguridad** — cambiar contraseña (con validación en vivo) + verificación en dos pasos (2FA).
> - **Membresía y Pagos** — vista de membresía + recibos, recuperar tarjeta (Customer Portal), pago manual con comprobante y cambio bidireccional de método de cobro. **Solo visible** si el usuario tiene negocio comercial o publicidad vigente.
>
> **Historia:**
> - **Membresía / Pagos** — construido + QA E2E cerrado **28 jun 2026** (commit `d6f8acb`). Era el último hueco funcional de cara a la beta. QA: cobro inmediato al activar tarjeta, vigencia futura, cambio bidireccional, no-duplicado, pago sin vendedor (sin comisión), datos de depósito vacíos, permisos de la cola (gerente/vendedor), descargar recibo y anti-huérfanas R2.
> - **Datos Personales + Seguridad** — construidos **29 jun 2026** (commits `23efa53` y `0738fbe`); UI refinada en `13736c3`. **QA E2E (Juan):** Datos Personales ✅ completo · Seguridad → solo **contraseña ✅** (faltan 2FA, vincular Google, cambiar correo, cerrar sesiones y eliminar cuenta).
>
> **Última actualización:** 29 Junio 2026.

---

## Qué es

La página de **cuenta/perfil del usuario** en su **Modo Personal** (`apps/web`, FUERA de Business Studio),
en la ruta `/perfil`. Header con el patrón de las demás secciones (CardYA, Mis Guardados) + tabs tipo chip:

- **Datos Personales** ✅ avatar, nombre, apellidos, teléfono, fecha de nacimiento, género y ciudad (correo solo-lectura). Es el tab **por defecto**.
- **Seguridad** ✅ cambiar contraseña + verificación en dos pasos (2FA).
- **Membresía y Pagos** ✅ funcional. **Solo se muestra** si el usuario tiene negocio comercial **o** publicidad pagada/vigente; un usuario puramente personal no lo ve.

> Antes de esto, `/perfil` renderizaba por error el perfil del **negocio** de Business Studio. Se cableó a
> la nueva `PaginaPerfilPersonal`. En móvil, `/perfil` se sumó a `esPaginaConHeaderPropio` en `MainLayout`
> (un solo header + el bottom nav se oculta con el scroll, como las demás secciones).

## Por qué va en Modo Personal (y NO en Business Studio)

Cuando un negocio se **suspende o cancela**, el dueño **baja a Modo Personal** y pierde acceso a Business
Studio. Si la página para pagar/regularizar viviera dentro de BS, un suspendido nunca podría llegar a ella.
Ponerla en la cuenta **Personal** es lo que permite que alguien suspendido se reactive. Reusa las columnas de
estado de membresía que ya existen en `negocios`.

---

## Sección Membresía / Pagos — alcance construido

| # | Pieza | Qué hace | Estado |
|---|---|---|:--:|
| 1 | **Vista de membresía** | Estado (al corriente / pago pendiente / suspendido / cancelado), método de cobro, próximo cobro o fecha límite de gracia, "Cliente desde", logo del negocio, e **historial de recibos descargables** (PDF). | ✅ |
| 2 | **Recuperar tarjeta** (Customer Portal) | Botón que abre `stripe.billingPortal.sessions.create` para actualizar la tarjeta y pagar la factura pendiente. Copy ramificado: "Actualizar tarjeta y reintentar pago" (urgente, dark gradient) / "Administrar tarjeta" (al corriente). | ✅ |
| 3 | **Pago manual** con comprobante | Datos de depósito (banco/CLABE/cuenta/**tarjeta OXXO**) + el dueño elige **meses completos** (el monto se autocalcula = meses × precio) + sube comprobante (R2) → crea una **solicitud** que un admin verifica en el Panel. | ✅ |
| 4 | **Cambio de método de cobro** | Bidireccional: **Cancelar cobro automático** (tarjeta → manual) y **Activar pago con tarjeta** (manual → tarjeta). Respeta la vigencia. | ✅ |

---

## Datos Personales y Seguridad — alcance construido (29 jun 2026)

Los otros dos tabs de `/perfil`, sobre la **cuenta del usuario** (no el negocio). No requirieron migración: todos los campos ya existían en `usuarios`.

### Tab "Datos Personales"

Edita avatar, nombre, apellidos, teléfono (**lada editable** + 10 dígitos, reusa `InputTelefono`; se guarda compacto `+{lada}{10 dígitos}`), fecha de nacimiento, género (`masculino/femenino/otro/no_especificado`) y ciudad. El **correo es solo-lectura** (cambiarlo exige re-verificación, fuera de alcance). El avatar usa `useR2Upload` con `maxWidth: 512` (un avatar no necesita más; se optimiza a WebP en el cliente antes de subir) y presigned a la carpeta R2 `avatares`, con anti-huérfanas: borra de R2 al desmontar si se subió sin guardar, **y al pulsar "Quitar" tras subir** (`reset()`); el backend borra el avatar viejo al reemplazarlo. La ciudad reusa `ModalUbicacion` (catálogo hidratado) y se ancla por texto → `ciudad_id`. Guarda solo los campos que cambiaron.

> **Limpieza de BD (29 jun):** se eliminaron del schema `usuarios` las columnas legado de Cloudinary `avatar_public_id` y `avatar_thumb_public_id` (con R2 se trabaja por URL/key, nunca se usaron). DROP en `docs/migraciones/2026-06-29-drop-usuarios-avatar-public-ids.sql` (correr en DEV+PROD **después** de desplegar este código).

### Tab "Seguridad"

- **Contraseña:** el tab decide entre **Crear** y **Cambiar** según `tieneContrasena` (campo nuevo del `UsuarioPublico` = `!!contrasena_hash`). Si la cuenta **no tiene contraseña** (típicamente **Google**), muestra el flujo de **crear** —sin pedir la actual, que no existe— vía `POST /auth/establecer-contrasena` (el service valida que no tenga ya una); la cuenta queda con **Google + contraseña** (conserva ambos métodos de login). Si ya tiene, es **cambiar** vía `PATCH /auth/cambiar-contrasena` (pide la actual). **Validación en vivo** de la *nueva* (checklist: 8+ / mayúscula / minúscula / número) y de *confirmar* (coincidencia), con el botón deshabilitado hasta que todo sea válido. La **contraseña actual** NO se valida en vivo contra el servidor (sería un oráculo de fuerza bruta): se marca el campo en rojo con error inline solo al intentar, si el backend la rechaza.
- **2FA:** reusa los endpoints existentes `POST /auth/2fa/generar` (devuelve el **QR ya en base64** + secreto), `POST /auth/2fa/activar` (devuelve los **códigos de respaldo**) y `DELETE /auth/2fa/desactivar`. El estado en la UI sale de `usuario.dobleFactorHabilitado`, que el builder `usuarioAPublico` ahora proyecta como **2FA confirmado** (`dobleFactorHabilitado && dobleFactorConfirmado`), no como "secreto generado".
- **Inicio de sesión con Google (vincular):** una cuenta de solo-contraseña puede **agregar Google** como método de login desde Seguridad — `useGoogleLogin` (flujo `auth-code`) → `POST /auth/google/vincular` (`vincularGoogle`), que **exige que el correo de Google coincida** con el de la cuenta (el login con Google se resuelve por correo). El estado (Vinculado/No vinculado) sale de `usuario.autenticadoPorGoogle`. **Por ahora solo vincular**: "Quitar Google" queda pendiente porque sería cosmético sin endurecer el login (hoy `loginConGoogle` busca por correo y **auto-vincula** en el primer acceso, así que bajar el flag no impediría volver a entrar con Google; desvincular de verdad exige que el login respete el flag y deje de auto-vincular — decisión de seguridad pendiente).
- **Cerrar sesión en todos los dispositivos:** botón (con confirmación) que invalida **todas** las sesiones reusando `POST /auth/logout-todos`; cierra también la de este dispositivo y redirige al login.
- **Cambiar correo (con verificación):** flujo de 2 pasos — `POST /auth/cambiar-correo/solicitar` envía un código de 6 dígitos al **nuevo** correo (en Redis, clave `cambio_correo:{usuarioId}`, 15 min, 5 intentos, valida que no esté en uso y que sea distinto del actual); `POST /auth/cambiar-correo/confirmar` aplica el correo y lo marca `correoVerificado=true`. Reusa `enviarCodigoVerificacion`. El correo dejó de ser solo-lectura en Datos Personales (su hint ahora apunta a Seguridad). El campo del **nuevo correo** reusa `InputCorreoValidado` (el mismo del registro): valida **formato** (regex) al instante y **unicidad en AnunciaYA** con debounce 400 ms (consulta a la BD), con indicador inline (✗ rojo / ✓ "Correo disponible" verde) y detección de typos de dominio; el botón "Enviar código" se habilita solo cuando el correo es válido y está libre, y se excluye el correo actual del usuario.
- **Eliminar cuenta (soft-delete):** `POST /auth/eliminar-cuenta`. Confirma con **contraseña** (o, en cuentas Google sin contraseña, escribiendo el correo exacto). **Bloquea** si el usuario es dueño de un negocio **en circulación** (debe cancelar la suscripción desde Membresía y Pagos primero) y si es cuenta de equipo (`rolEquipo`). Pone `estado='inactivo'` (el login ya rechaza estados ≠ `activo`) + cierra todas las sesiones. **Conserva los datos** (recuperable por soporte). Pendiente futuro: purga/anonimización definitiva tras N días (necesita columna `eliminado_at` + cron).

### Backend nuevo (solo Datos Personales)

| Endpoint | Rol |
|---|---|
| `PATCH /auth/perfil` | `actualizarPerfilUsuario` — update parcial de los datos del usuario; devuelve el `UsuarioPublico` actualizado. |
| `POST /auth/avatar/url-subida` | `generarUrlAvatar` — presigned R2 (carpeta `avatares`, jpeg/png/webp). |

`auth.schema.ts` → `actualizarPerfilSchema` (todos los campos opcionales). El front: `authService.actualizarPerfil` / `generarUrlAvatar`; componentes `pages/private/perfil/components/TabDatosPersonales.tsx` y `TabSeguridad.tsx`; tras guardar se llama `useAuthStore.recargarDatosUsuario()`.

**Tab "Membresía y Pagos" — contenido según el usuario:** `obtenerMiMembresia` (`membresia.service.ts`) devuelve el estado de la membresía (si tiene negocio) **y** la lista de campañas de publicidad del usuario (`publicidad: PublicidadCompra[]` — todas menos las `pendiente`, con sus carruseles y ciudades; helper `obtenerPublicidadDelUsuario` con 3 queries: compras + piezas + ciudades). También expone `tienePublicidad` (= tiene alguna activa y vigente). El tab se muestra si `tieneNegocio || publicidad.length > 0` (incluye historial de campañas vencidas, para ver recibos viejos). Contenido:
> - **Con negocio** → vista de membresía + (si además compró anuncios) la sección **"Tu publicidad"** debajo.
> - **Sin negocio pero con publicidad** → solo **"Tu publicidad"** (en vez del aviso "registra tu negocio").
> - **Sin nada** → el tab no aparece.
>
> El **nombre del tab** también es dinámico: **"Membresía y Pagos"** para cuentas con negocio comercial, y solo **"Pagos"** para cuentas personales que únicamente tienen publicidad (`tabsVisibles` reescribe el label cuando `!data.tieneNegocio`).
>
> `SeccionMiPublicidad.tsx` (`components/`) renderiza cada campaña: **tamaño** (Grande = `patrocinadores`, Chico = `anuncios`), **ciudades**, **vigencia** (Activa/Vencida según `expira_at`), **importe** (o "Cortesía") y **recibo** (PDF público en R2 — `recibo_url` se abre directo, sin endpoint), + botón "Anunciar más" → `/anunciate`.

**Caché entre cuentas:** `useMiMembresia` incluye el `usuarioId` en su query key (`queryKeys.membresia.mi(usuarioId)`) para que al **cambiar de cuenta** NO se sirva el caché del usuario anterior — de eso depende que el tab aparezca/desaparezca sin tener que refrescar. Como **blindaje global**, `useAuthStore` además llama `queryClient.clear()` en `logout` y al inicio de `loginExitoso`, así ninguna sección de la app sirve datos cacheados entre cuentas (cubre también el login directo sin logout previo). Detalle del patrón en [`PATRON_REACT_QUERY.md`](../estandares/PATRON_REACT_QUERY.md).

### Diseño / UI de los formularios (refinado 29 jun 2026)

Datos Personales y Seguridad comparten el mismo sistema visual de inputs:

- **Altura uniforme** de todos los campos: `h-11 lg:h-10 2xl:h-11` (fija, pixel-match) y **tamaño de texto** `text-base lg:text-sm 2xl:text-base`. Aplica a los 8 campos de Datos (nombre, apellidos, correo, lada, teléfono, fecha, género, ciudad) y a todos los de Seguridad (contraseñas, códigos 2FA/correo, nuevo correo, eliminar cuenta).
- **Highlight de foco** unificado `border-blue-600` + `ring-2 ring-blue-300` (con `transition-colors`). Para no afectar otros módulos, `InputTelefono` / `CustomSelect` / `InputCorreoValidado` recibieron props opcionales (`claseAlto`, `claseTexto`, `claseControl`, `claseActivo`) con default = comportamiento histórico. Ver [`TOKENS_COMPONENTES.md` §25](../estandares/TOKENS_COMPONENTES.md).
- **Fecha de nacimiento** usa el `DatePicker` de la app con `iconoIzquierda`, `centradoEnMovil` y `maxDate = hoy`. Navegación por niveles día→mes→año; el DatePicker se rediseñó (acento slate, tamaños fijos, ancho = input) y se corrigió un bug de "se cierra solo". Ver [`TOKENS_COMPONENTES.md` §24](../estandares/TOKENS_COMPONENTES.md).
- **Iconos de header** de cada tarjeta a `w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6`; el resto de iconos a tamaño responsive (más grandes en móvil). Tipografía: se eliminó todo `text-xs` puro (violaba el mínimo móvil) y todo texto sin peso recibió `font-medium`.

---

## Arquitectura

### Tabla nueva

`pagos_manuales_solicitudes` (cola de verificación del pago manual): `negocio_id`, `usuario_id`, `monto`,
`meses_declarados`, `referencia`, `nota`, `comprobante_url`, `estado` (pendiente/aprobado/rechazado),
`revisado_por`, `revisado_at`, `motivo_rechazo`, `pago_membresia_id` (FK al recibo generado al aprobar).
Migración `docs/migraciones/2026-06-27-pagos-manuales-solicitudes.sql`. `comprobante_url` está en el
`IMAGE_REGISTRY` (el Recolector R2 no la trata como huérfana).

### Configuración

- `datos_cobro_manual` (JSON en `configuracion_sistema`): `{ banco, titular, clabe, cuenta, tarjeta, instrucciones }`.
  Lo edita el super desde el Panel (Suscripciones → Datos de depósito); el dueño los ve en `/perfil`.
- `precio_membresia_mxn`: precio mensual usado para autocalcular el total del pago manual.

### Backend

| Archivo | Rol |
|---|---|
| `services/membresia.service.ts` | Lado del dueño: `obtenerMiMembresia` (estado + recibos), `descargarMiRecibo`, `crearSesionPortal`, `obtenerDatosCobroConPrecio`, `generarUrlComprobante` (presigned R2), `crearSolicitudPagoManual`, `cambiarAPagoManual`. |
| `services/pago.service.ts` | `crearCheckoutActivarTarjeta` (manual → tarjeta, con `trial_end` = vigencia) + `manejarActivacionTarjeta` (webhook `checkout.session.completed` tipo `activar_tarjeta`). |
| `services/admin/pagos-manuales-cola.service.ts` | Lado admin: `listarSolicitudesPendientes` (alcance por rol/región), `aprobarSolicitud` (reusa `marcarPagado`), `rechazarSolicitud`, `obtenerDatosCobroAdmin`, `guardarDatosCobro`. |
| `controllers/pago.controller.ts` · `routes/pago.routes.ts` | Endpoints del dueño (ver abajo). |
| `controllers/admin/pagos-manuales-cola.controller.ts` · `routes/admin/suscripciones.routes.ts` | Endpoints del Panel (cola + datos de cobro). |

### Frontend

- **Web (usuario):** `pages/private/perfil/PaginaPerfilPersonal.tsx` (orquesta los 3 tabs + header) +
  `components/`: `TabDatosPersonales.tsx`, `TabSeguridad.tsx`, `SeccionPagoManual.tsx`. Servicios:
  `services/membresiaService.ts` y `services/authService.ts` (`actualizarPerfil`, `generarUrlAvatar`,
  `cambiarContrasena`, `generar2FA`/`activar2FA`/`desactivar2FA`). Hook: `hooks/queries/useMiMembresia.ts`
  (key `queryKeys.membresia.mi(usuarioId)`). Reusa `CustomSelect`, `InputTelefono`, `ModalUbicacion`,
  `ModalImagenes` y `useR2Upload`.
- **Panel:** `components/suscripciones/SeccionSuscripciones.tsx` (3 pestañas: Bitácora · **Por verificar** ·
  **Datos de depósito**), `PestanaPorVerificar.tsx`, `PestanaDatosCobro.tsx`, `DialogoAprobarSolicitud.tsx`;
  `services/suscripcionesService.ts`; `hooks/queries/useSuscripcionesAdmin.ts`.

### Endpoints

**Dueño** (`/api/pagos`, auth):
`GET /mi-membresia` · `GET /mi-recibo/:id/descargar` · `POST /portal` · `GET /datos-cobro` ·
`POST /comprobante/url-subida` · `POST /solicitud-pago-manual` · `POST /cambiar-a-manual` · `POST /cambiar-a-tarjeta`.

**Panel** (`/api/admin/suscripciones`, super+gerente; PUT datos-cobro solo super):
`GET /solicitudes` · `POST /solicitudes/:id/aprobar` · `POST /solicitudes/:id/rechazar` · `GET|PUT /datos-cobro`.

---

## Reglas de negocio clave

- **Aprobar pago manual** reusa `marcarPagado` (`negocios-acciones.service.ts`): activa el negocio, **acumula**
  los meses sobre la vigencia vigente (no la reemplaza), genera el recibo PDF (folio continuo) y, si el negocio
  tiene tarjeta, **empuja el `trial_end`** de Stripe → la tarjeta retoma después. El monto/meses los confirma el admin.
- **Pago manual = meses completos**, no monto libre: el total = `meses × precio_membresia_mxn` (autocalculado en el front).
- **Cancelar cobro automático (tarjeta → manual):** se limpia `usuarios.stripe_subscription_id` **ANTES** de
  cancelar en Stripe, para que el webhook `subscription.deleted` no encuentre el negocio y **NO lo archive**
  (solo cancelar desde el Panel archiva). **No toca `fecha_vencimiento`** → respeta lo pagado. Al vencer, el cron
  `expirarManualesVencidos` aplica la **misma gracia** que tarjeta (`periodo_gracia_cobro_dias`).
- **Activar pago con tarjeta (manual → tarjeta):** Checkout con `trial_end = fecha_vencimiento` si es futura
  (no cobra ya; el primer cargo cae al vencer lo pagado); si está vencido/suspendido, **cobro inmediato**. El
  webhook `activar_tarjeta` asocia la suscripción al negocio existente (no crea negocio).
- **Anti-huérfanas R2:** el comprobante se borra de R2 al Cancelar/Quitar (`useR2Upload.reset`) y al **desmontar**
  el componente sin enviar (cleanup); el endpoint `DELETE /r2/imagen` valida reference-count antes de borrar.
- **Idempotencia del cobro (anti-doble-recibo):** `registrarCobroReal` usa el INSERT en `eventos_pago`
  (UNIQUE en `stripe_event_id`) como **candado atómico** — `registrarEventoPago` devuelve si insertó y, si no
  gana, se aborta antes de comisión/recibo. Esto evita que dos webhooks del mismo invoice entrando casi a la
  vez (`checkout.session.completed` + `invoice.payment_succeeded`, p. ej. al **activar tarjeta con cobro
  inmediato**) emitan **dos recibos**. Reemplazó al viejo guard SELECT-luego-INSERT (que tenía esa race).
  Ver [`Pagos_Suscripciones.md`](Pagos_Suscripciones.md).

---

## Pendientes / mejoras

- **QA E2E a mano — restante de Seguridad.** Ya probado por Juan: **Datos Personales** ✅ completo y **contraseña** ✅. **Faltan**: **2FA** (activar/desactivar con app autenticadora), **vincular Google**, **cambiar correo** (validación inline de formato/unicidad + código al nuevo), **cerrar sesión en todos los dispositivos** y **eliminar cuenta** (soft-delete, bloqueo si negocio en circulación). Validar también el cambio de cuenta (que el tab Membresía aparezca/desaparezca sin refrescar).
- **PROD (Pagos):** migraciones `2026-06-27-pagos-manuales-solicitudes.sql` y `2026-06-29-drop-usuarios-avatar-public-ids.sql` ✅ corridas. Falta configurar los **datos de depósito** en el Panel live y el **Customer Portal** en Stripe live.
- **Aviso por correo al dueño** cuando se **rechaza** un pago manual (hoy solo cambia el estado / aviso in-app).
- **Humanizar** en el módulo Auditoría las acciones nuevas (`pago_manual_aprobar/rechazar`, `datos_cobro_actualizar`).
- **Stripe Elements integrado** (post-beta): evitar el "X días gratis" del Checkout hosted al activar tarjeta con vigencia futura.

## Referencias

- [`Pagos_Suscripciones.md`](Pagos_Suscripciones.md) — webhook, estados, gracia, `marcarPagado`.
- [`Panel_Admin/Ronda_Pruebas_Pagos.md`](Panel_Admin/Ronda_Pruebas_Pagos.md) — de donde venían B2/Z3/Z4 (ya implementados aquí).
