# Lecciones Técnicas — AnunciaYA

> Descubrimientos, bugs resueltos y decisiones técnicas aprendidas durante el desarrollo. Consultar antes de trabajar en áreas que ya tuvieron problemas.
> Organizado por módulo/área.

---

## General

### Axios y Manejo de Errores

- **Interceptor resolviendo 4xx/5xx como si fueran 2xx** — El interceptor de `api.ts` envuelve todas las respuestas en `{ success, data, error, message }` y **resuelve** la promesa aunque el backend responda 400/409/500. Consecuencia: `mutationFn` de React Query recibe el error como valor de éxito y dispara `onSuccess` con el toast verde. **Regla obligatoria en mutations:** verificar `if (!res.success) throw new Error(res.error ?? res.message ?? 'Error')`. Descubierto en `useEmpleados.ts` (abril 2026) con nick duplicado: toast decía "Empleado creado" aunque la BD rechazara.
- **Interceptor duplicando `sucursalId`** — El interceptor agrega `sucursalId` automáticamente en `config.params` para todas las rutas. Si el service ya lo manda en la URL (ej: `/notificaciones?sucursalId=X`), termina duplicado en query string. Agregar la ruta a `RUTAS_SIN_SUCURSAL` en `api.ts` cuando el service arma el param manualmente (necesario para notificaciones porque la sucursal depende del contexto — BS vs fuera de BS — no de la sucursal activa del modo comercial).

### SQL y Base de Datos

- **Orden del `CASE` importa cuando las condiciones no son mutuamente excluyentes** — Un `CASE` devuelve el primer `WHEN` que matchea. Si una oferta puede ser a la vez `agotada` (límite alcanzado) y `vencida` (fecha_fin pasó), el orden define qué estado ve el usuario. **Regla:** evaluar primero la causa-raíz del cierre. En `obtenerOfertas`: agotada > vencida (si se agotó, eso cerró la oferta; el vencimiento fue posterior e irrelevante). En `obtenerMisCupones`: revocado > usado > vencido > activo (la acción del usuario prevalece sobre el paso del tiempo).
- **`GREATEST(col - x, 0)` para deltas de puntos/contadores** — Restas directas (`puntos_canjeados_total - puntos_usados`) pueden violar check constraints `>= 0` cuando hay inconsistencia legacy entre el total almacenado y las operaciones históricas. **Regla defensiva:** envolver toda resta de contadores con constraint `>= 0` en `GREATEST(..., 0)`. Descubierto en `cancelarVoucher` (abril 2026) — billeteras legacy con `puntos_canjeados_total` menor a la suma real de vouchers canjeados.
- **Estado en BD vs estado en UI** — Cuando el estado almacenado captura solo la última acción del usuario (`activo`/`usado`/`revocado`) pero el estado real depende también del tiempo (vencimiento) o de contadores globales (agotamiento), **calcular el estado en el query** con `CASE` en lugar de devolver el campo crudo. Evita depender de un job batch que actualice estados cada X minutos.

### Gestión de archivos (R2 / Cloudinary)

- **Reference count antes de borrar una imagen** — Si una URL de imagen puede ser compartida entre varias filas (típico con Cloudinary cuando el clonado no puede duplicar el archivo y cae al fallback), borrarla desde una fila rompe las otras. **Regla:** antes de `eliminarArchivo(url)` o `eliminarImagen(url)`, contar cuántas otras filas la usan (revisando todos los campos relevantes: `imagen_principal`, `imagenes_adicionales`, etc). Solo borrar si el count es 0. Aplica a `actualizarArticulo` (reemplazo), `eliminarArticulo`, `eliminarSucursal`, `actualizarOferta`, `eliminarOferta`, `eliminarImagenGaleria`, `actualizarRecompensa`, `eliminarRecompensa`, `actualizarLogoNegocio`, `actualizarPortadaSucursal`, `actualizarFotoPerfilSucursal` y cualquier otro flujo nuevo que limpie R2. Existe helper compartido `eliminarImagenSiHuerfana` exportado desde `negocioManagement.service.ts` que cubre 6 tablas (sucursales, artículos, negocios, galería, ofertas, recompensas).
- **Soft-delete de mensajes que sobrescribe `contenido` pierde referencia al archivo R2** — Descubierto en `eliminarMensaje` (chatya): el soft-delete pone `contenido = 'Se eliminó este mensaje'` para ocultar el mensaje al otro usuario, pero si el contenido era una URL (tipo imagen/audio/documento) o JSON con URL (tipo cupón), esa referencia se perdía de BD y el archivo quedaba huérfano. **Regla:** para cualquier soft-delete que sobrescriba un campo con URLs, capturar las URLs ANTES del UPDATE y limpiarlas de storage después.
- **No asumir que un campo tiene un formato fijo — usar regex para extraer URLs** — El campo `chat_mensajes.contenido` puede contener: URL directa, JSON con metadatos de imagen (`{"url": "...", "ancho": ..., "miniatura": "data:..."}`), o JSON de cupón (`{"imagen": "...", "ofertaId": ...}`). Asumir un formato concreto y parsearlo con `JSON.parse` o `esUrlR2()` directo genera bugs sutiles cuando el formato cambia. **Regla:** cuando extraigas URLs de un campo con formato variable, usa regex que matchee el dominio R2 y deduplica resultados. Mismo patrón en SQL (`text-scan-urls` con cast `::text`) y en JS (regex compilado con RegExp).
- **`duplicarArchivo` es solo para R2** — `duplicarImagenInteligente` detecta si la URL es R2 o Cloudinary. Cloudinary no se puede duplicar con el SDK del proyecto → el fallback es `nuevaUrl = urlOriginal`. Consecuencia: al clonar sucursales con catálogo Cloudinary, las URLs quedan compartidas. No es bug en sí, pero obliga al reference count al borrar (ver punto anterior).

### Validación y Tipos

- **Zod runtime vs TypeScript compile-time** — Son independientes. Campos faltantes en schema Zod se eliminan silenciosamente sin error de TypeScript.
- **`z.string().uuid()` de Zod** — Rechaza UUIDs con variante no-estándar (ej: `c000...`). Usar regex `/^[0-9a-f]{8}-...$/i` para aceptar cualquier formato UUID.

### Layout y CSS

- **Leaflet stacking context** — Leaflet crea su propio stacking context. Requiere `z-[1000]` para overlays sobre mapas.
- **`translate-y` vs `margin-top`** — `translate-y` mueve elementos visualmente sin afectar box model. `margin-top` infla el contenedor padre.
- **`box-shadow: inset` en scroll containers** — NO se fija al viewport del scroll container, se mueve con el contenido. Para overlays fijos en carousels usar un wrapper con divs posicionados absolute.
- **Stacking context en drawers** — Drawers con `position: fixed` dentro de un padre con `z-index` + `position` quedan atrapados en su stacking context. Solución: `createPortal(jsx, document.body)` — ver TC-18.

### React y Renderizado

- **Flash de vista desktop en móvil** — `useState(false)` para detección móvil causa flash de vista desktop en primer render. Usar `useState(() => window.innerWidth < 1024)` como lazy initializer.
- **Scroll reset al navegar** — `MainLayout` usa `<main>` con `overflow-y-auto` (no `window`). El scroll se resetea con `useLayoutEffect` en `RootLayout` usando `document.querySelectorAll('main').forEach(el => el.scrollTo(0, 0))`. Usar `useLayoutEffect` (no `useEffect`) para evitar flash visual.
- **`RefreshCw` spinner atascado** — El SVG de `RefreshCw` de lucide-react tiene gaps que causan "atasco" visual durante `animate-spin`. Usar `Loader2` para estados de carga con spin continuo.
- **No definir componentes dentro de otros** — Causa pérdida de focus en inputs y remount en cada render. Descubierto en `TabContacto.tsx` (InputTelefono). Ver regla completa en `REGLAS_ESTILO_CODIGO.md` sección 12.

### Modales y Componentes

- **`ModalAdaptativo` obligatorio** — Renderiza `ModalBottom` (bottom sheet) en móvil y `Modal` (centrado) en desktop. Siempre usar `ModalAdaptativo` para modales de detalle — nunca `Modal` o `ModalBottom` directamente.
- **Elementos fijos en parte inferior** — Usar `bottom-4` o `pb-safe` (safe area configurada globalmente para notch/barra de navegación móvil).

### Gestos y Touch

- **Swipe horizontal vs carousels** — Al detectar swipe para navegación, excluir elementos con `overflow-x: auto/scroll` recorriendo el DOM hacia arriba desde el `touchstart` target. Ver TC-22.

### Drizzle ORM

- **Expresiones JS en `sql` template** — Drizzle no evalúa expresiones dentro de `${a + b}` o `${a - b}` en template literals. Pre-calcular en variable JS antes de interpolar: `const limite = min + 1; sql\`LIMIT ${limite}\``. Descubierto en `alertas-motor.service.ts` (LIMIT y resta de días).
- **Filtro sucursal + registros globales** — Cuando hay registros que pueden no tener `sucursal_id` (ej: alertas a nivel negocio), siempre usar `AND (sucursal_id = X OR sucursal_id IS NULL)` en vez de `AND sucursal_id = X`. Sin el `OR IS NULL` se pierden registros globales.
- **drizzle-kit no es Drizzle ORM** — El ORM en runtime solo necesita `schema.ts` y `relations.ts`. Los archivos de migracion (`0000_xxx.sql`), journal (`_journal.json`) y snapshots (`meta/`) son artefactos de `drizzle-kit`, una CLI separada para generar migraciones automaticas. Este proyecto no usa drizzle-kit — las migraciones se manejan manualmente con SQL en PGAdmin (dev) y Supabase (prod). Los artefactos fueron eliminados en Abril 2026 junto con la dependencia `drizzle-kit` de devDependencies.

- **Defaults del schema se aplican silenciosamente si no pasas el campo al insert** — Un campo con `.default('America/Mexico_City').notNull()` no da error al no incluirlo en `db.insert().values({...})` — se aplica el default sin warning. Descubierto en `crearSucursal`: cuando Matriz estaba en `America/Hermosillo` y la sucursal nueva no heredaba `zonaHoraria`, el registro quedaba con el default incorrecto y la query de `esta_abierto` calculaba la hora en la zona equivocada. Las consecuencias son invisibles en logs y se manifiestan como bugs funcionales (sucursal marcada "Cerrado" cuando estaba abierta). Regla: al insertar en una tabla con muchos campos opcionales con defaults, revisar si el default es seguro para ese flujo específico o si debes pasarlo explícito.

- **Columnas de BD vs campos del schema Drizzle** — Lo que existe en PostgreSQL no tiene por qué estar en `schema.ts`. La tabla `negocio_sucursales` tiene (o tuvo) columnas `latitud`/`longitud` numeric pero el schema Drizzle define solo `ubicacion` (PostGIS POINT serializado como text). Drizzle solo inserta los campos que conoce, así que intentar pasar `{ latitud: 31.3, longitud: -113.5 }` falla con "Object literal may only specify known properties". Las coordenadas se extraen en lectura con `ST_Y(ubicacion::geometry)` y `ST_X(ubicacion::geometry)`. Regla: si necesitas un campo que no aparece en el schema, no asumas que no existe en la BD — puede estar en BD pero fuera del modelo Drizzle.

### Stores y Caché

- **Skeleton solo en primera carga** — Usar `const esCargaInicial = datos === null` (o `.length === 0`) para decidir si mostrar spinner. Recargas posteriores muestran datos del caché al instante y actualizan silenciosamente. Patrón usado en Clientes, Transacciones, Alertas, Dashboard.
- **No limpiar store al desmontar** — Si quieres caché persistente entre navegaciones, no llamar `limpiar()` en el `return` del `useEffect`. El store conserva datos y la próxima visita los muestra al instante. Descubierto en `PaginaDashboard.tsx`.

### React Query — Invalidación Cruzada

- **Invalidar TODOS los módulos que muestran el mismo dato** — Una mutación que cambia datos en un módulo puede dejar cachés stale en otros módulos que consumen los mismos datos con query keys distintos. Ejemplo real: revocar transacción invalidaba `transacciones.kpis` pero no `dashboard.kpis` — el Dashboard mostraba totales incorrectos. Otro ejemplo: escribir reseña invalidaba la lista de reseñas pero no `negocios.detalle`, que contiene `calificacionPromedio` — el rating en el header no se actualizaba. Regla: antes de escribir `onSuccess`, preguntarse _"¿qué otros módulos muestran estos mismos datos?"_. Descubierto en auditoría de Abril 2026 — 7 bugs corregidos. Ver reporte completo en `docs/reportes/audit-react-query-completo-abril-2026.md`.

- **Escrituras fuera de `useMutation` también necesitan invalidar caché** — No todas las escrituras al backend pasan por `useMutation`. Componentes como `TabImagenes.tsx` (8 operaciones de imagen) y hooks como `useGuardados.ts` usaban `api.post/delete` directamente y actualizaban estado local, pero no invalidaban el caché de React Query. Resultado: al navegar fuera y volver, la UI mostraba datos viejos del caché. Regla: toda llamada `api.post/put/delete` exitosa debe ir seguida de `qc.invalidateQueries()` con los query keys afectados.

- **`useAuthStore` es una cache paralela a React Query** — Navbar, ColumnaIzquierda, MenuDrawer y SelectorSucursalesInline leen datos del negocio/sucursal (`logoNegocio`, `fotoPerfilNegocio`, `nombreNegocio`, `nombreSucursalAsignada`, `correoNegocio`, `correoSucursalAsignada`) directamente del store de Zustand persistido al login, NO desde React Query. Invalidar queries no basta — hay que hacer `useAuthStore.getState().setUsuario({ ...actual, campo: valor })` también. Descubierto al cambiar logo en Mi Perfil: queries se actualizaban pero sidebar/header seguian con el logo viejo.

- **React Query NO sincroniza entre pestanas del navegador** — Cada tab tiene su propio `QueryClient` en memoria. `invalidateQueries` en Pestana A no toca la cache de Pestana B. Los fixes intra-pestana cubren el caso real del MVP (dueno en una sola tab). Para cross-tab hay 3 opciones futuras: (A) bajar staleTime a 30s; (B) `@tanstack/query-broadcast-client-experimental`; (C) WebSocket push.

- **Display bugs disfrazados de cache** — No todo "datos viejos" es un problema de invalidacion. Dos casos encontrados: (a) `PanelCampanas` aceptaba prop `totalActivas` pero no lo destructuraba — mostraba `campanasNoVencidas.length` (limitado a 5 por el endpoint, no el total real); (b) `ModalDetalleTransaccionBS` mostraba "Los puntos fueron devueltos al saldo del cliente" al revocar ventas, cuando ese texto solo aplica a vouchers. Regla: al investigar un bug de sincronizacion, verificar primero que el componente use las fuentes de verdad correctas antes de asumir que es un problema de invalidacion.

- **Invalidaciones granulares — prefix match** — Preferir keys parciales (`['modulo', 'subkey', sucursalId]`) sobre keys totales (`['modulo']`). React Query hace match posicional: `['dashboard', 'kpis', sucursalId]` invalida todas las variantes de periodo sin tocar `['dashboard', 'campanas']` ni `['dashboard', 'alertas']`. Usar `queryKeys.dashboard.all()` (`['dashboard']`) invalida TODO el modulo innecesariamente. Descubierto en `useRevocarTransaccion` que invalidaba campanas/interacciones/alertas cuando solo kpis y ventas cambiaban.

### Reglas de Negocio

- **Negocios solo físicos** — Eliminado tipo "Online". Todos requieren ubicación. `tiene_servicio_domicilio` y `tiene_envio_domicilio` en sucursales.
- **Login obligatorio** — Sin login solo accesible: landing, registro, login, OAuth.
- **Soft delete vs Hard delete** — Depende del contexto. Recompensas: hard delete (sin referencias críticas). Empleados: soft delete (`eliminado_at`) porque 10 tablas referencian al empleado (transacciones, turnos, reseñas). Hard delete perdería quién registró cada venta. Regla: si la entidad tiene FK en tablas de historial, usar soft delete.
- **Transacciones inmutables** — Las transacciones (ventas/canjes) no se eliminan. Son registros financieros. Si hubo un error, se crea una transacción de cancelación/reverso.

---

## Autenticación y Permisos

- **JWT con mismo secret = tokens intercambiables** — Si dos sistemas (AnunciaYA y ScanYA) usan el mismo `JWT_SECRET`, `jwt.verify()` acepta tokens de ambos sin distinguir. Solución: verificar campo `_tipo` en el payload para descartar tokens del sistema incorrecto. Descubierto en `verificarTokenChatYA`.
- **Permisos del token vs BD** — Los permisos en el JWT son una snapshot del momento del login. Si el dueño cambia permisos, el token viejo mantiene los permisos anteriores. Solución: `verificarPermiso` consulta la BD en cada request (no el token). El token se usa como fallback si la BD falla.
- **Refresh token debe actualizar permisos** — `refrescarTokenScanYA` reutilizaba permisos del token viejo. Debe consultar la BD para obtener permisos actuales al generar el nuevo token. Descubierto en empleados: cambiar permiso + refresh = permiso viejo.
- **Rutas sin middleware de permisos** — Las rutas de ScanYA no tenían `verificarPermiso` — los permisos existían en la BD pero nunca se verificaban. Al agregar el módulo de Empleados (que permite editarlos), se descubrió que no hacían nada.
- **Token expirado de otra sesión en localStorage** — `localStorage.getItem('ay_access_token') || localStorage.getItem('sy_access_token')` toma el primero que exista, aunque esté expirado. En contexto ScanYA, priorizar `sy_access_token`. El token viejo de AnunciaYA puede quedarse en localStorage indefinidamente.

---

## ChatYA

- **Módulo compartido entre dos sistemas de auth** — Cuando un módulo (ChatYA) debe funcionar desde dos orígenes de sesión distintos (`useAuthStore` y `useScanYAStore`), crear un adaptador centralizado (`useChatYASession`) en lugar de checks `if (authStore) ... else if (scanYAStore) ...` dispersos en cada archivo. Helpers no-React (`obtenerMiIdChatYA()`) para stores y callbacks.
- **Socket.io y sesión dual** — Si el socket se conecta con token de un sistema pero el `localStorage` tiene datos de otro, los IDs emitidos por el cliente pueden no coincidir con los del token. Solución: el backend asigna `socket.data.usuarioId` desde el token verificado y lo usa como fuente de verdad.
- **Socket.io timing: emit antes de connect** — Si un componente monta y emite un evento socket antes de que el socket se conecte, el evento se pierde silenciosamente (`socket?.connected` es false). Solución: `emitirCuandoConectado()` con retry automático cada 500ms.
- **`hidratarAuth` innecesario en rutas ajenas** — No llamar `hidratarAuth()` de AnunciaYA en rutas `/scanya/*`. El empleado no tiene cuenta AnunciaYA y genera 404 innecesarios.
- **Cursor-based pagination para feeds** — Para ChatYA y futuros feeds sociales: cursor-based pagination > offset-based. Endpoint "jump to message" es prioridad alta.

---

## ScanYA

### Navegación Móvil (Modales)

- **Modales fullscreen en móvil** — Los modales drawer de ScanYA usan `h-full rounded-none` en móvil (fullscreen) y `h-full w-[350px] rounded-none` en laptop (drawer lateral). El drag handle se eliminó porque fullscreen no necesita arrastre.

- **Back nativo del celular cierra modales** — Cada modal drawer usa `history.pushState` al abrir y escucha `popstate` para cerrarse con el botón back del sistema operativo. Patrón:
  ```typescript
  // Un solo handler por modal, registrado al abrir
  useEffect(() => {
    if (!abierto) return;
    history.pushState({ modal: 'nombre' }, '');
    const handlePopState = () => { onCloseRef.current(); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.go(-pushCountRef.current); // limpiar entries al cerrar con X
    };
  }, [abierto]);
  ```

- **Sub-niveles dentro de un modal** — Modales con detalle interno (ModalHistorial, ModalVouchers) usan `nivelRef` para lógica de navegación y `pushCountRef` para contar entries reales en el history. El handler principal decide según el nivel: nivel 2 → vuelve a lista, nivel 1 → cierra modal. NUNCA usar `history.pushState` dentro del handler de popstate (crea entries duplicadas).

- **Modales encadenados (Vouchers → Canjear)** — Cuando un modal abre otro (ModalVouchers → ModalCanjearVoucher), el modal padre debe ignorar popstate mientras el hijo está abierto. Usar `canjearAbiertoRef` actualizado desde prop del padre. El modal hijo maneja su propio pushState/popstate independientemente.

- **Comportamiento de los 3 iconos de cierre** — Regla UX obligatoria en modales ScanYA:
  - Flecha (ArrowLeft): `history.back()` — retrocede un nivel
  - X: `onClose()` o `onCerrarTodo()` — cierra todo directo al dashboard
  - Back nativo celular: popstate handler — retrocede un nivel (igual que flecha)

- **Hooks antes de early returns** — Los `useRef` y `useEffect` del history deben ir ANTES de cualquier `if (!abierto) return null`. Violar esto causa "Rendered more hooks than during the previous render" (descubierto en ModalCanjearVoucher).

- **Reset de estado al cerrar con X** — Al cerrar con X (`onClose`/`onCerrarTodo`), resetear estados internos como `voucherDetalle` o `transaccionDetalle` a null. Si no se resetean, al reabrir el modal se muestra el último sub-nivel visitado en vez de la lista principal.

### ScanYA y BS — Independencia de frontend

- **ScanYA y BS estan unidos por el backend, no por el frontend** — ScanYA usa el patron viejo (service directo + state local + callback). BS usa React Query + Zustand. No comparten cache de frontend — el backend es la fuente de verdad. Cuando ScanYA registra una venta, BS se entera al hacer su proximo fetch (maximo 2 min por staleTime). Esto es aceptable porque ScanYA corre en el dispositivo del operador y BS en el dispositivo del dueno. No tiene sentido agregar `invalidateQueries` a ScanYA porque cada tab/dispositivo tiene su propio `QueryClient` en memoria. Decision tomada en Abril 2026: no migrar ScanYA a React Query.

### Codigo legacy encontrado

- **`alertaMontoAlto` y `alertaTransaccionesHora` en `scanya_configuracion`** — Dos columnas legacy que existian en BD, schema, tipos, validadores y service, pero nunca fueron usados por el motor de alertas real (`alertas-motor.service.ts` lee de `alertas_configuracion`, no de `scanya_configuracion`). Fueron reemplazados por el sistema centralizado de Alertas BS con umbrales dinamicos (multiplicador del promedio vs valores fijos). Eliminados en Abril 2026. Los campos utiles de la misma tabla (`fotoTicket`, `requiereNumeroOrden`) se conservaron — tienen logica activa en ScanYA pero no tienen UI de configuracion aun.

---

## Sucursales

### Protección de historial al eliminar

- **Eliminar sucursal con CASCADE destruye trazabilidad** — Los FK de `empleados.sucursal_id` y `puntos_transacciones.sucursal_id` tienen `onDelete: cascade`. Si se permite el borrado físico de una sucursal con historial, se pierden empleados y ventas registradas. Solución aplicada en `eliminarSucursal`: cuenta `puntos_transacciones` de la sucursal; si `> 0` lanza `TIENE_HISTORIAL` (→ `409`) y el frontend ofrece desactivar como alternativa. El borrado físico solo procede en sucursales sin uso (creadas por error). Las transacciones son registros financieros inmutables — no pueden desaparecer por accidente.

- **Orden importa al revocar empleados ScanYA en eliminación** — El CASCADE de `empleados.sucursal_id` borra los registros de empleados cuando se elimina la sucursal. Si intentas revocar sesiones ScanYA después del DELETE, ya no existen los empleadoId/usuarioId para emitir el socket ni escribir en Redis. Regla: listar los empleados + revocar Redis + emitir socket **antes** del `DELETE negocio_sucursales`. Descubierto durante la implementación del helper `revocarEmpleadosDeSucursal`.

### Acceso del dueño/gerente a sucursales desactivadas

- **Un mismo endpoint sirve al feed público y al panel del dueño — filtros distintos** — `GET /sucursal/:id` (→ `obtenerPerfilSucursal`) lo consumen `PaginaPerfilNegocio` (público) y `usePerfilSucursal` de Business Studio (dueño/gerente editando Mi Perfil). El filtro `s.activa = true` correcto para el público rompía el panel del dueño: al desactivar su propia sucursal, Mi Perfil respondía 404 y no podía editarla. Solución: query con `WHERE activa = true OR (userId es dueño/gerente)`. Los anónimos siguen sin verla, el dueño puede seguir editando. Regla: antes de añadir un filtro en un service compartido, verificar quién lo consume.

### Invalidación cruzada con el feed público

- **Mutaciones de BS deben invalidar `queryKeys.negocios.all()`** — El feed público (`PaginaNegocios`, `PaginaPerfilNegocio`) se alimenta de queries bajo el scope `negocios` mientras BS usa `sucursales` y `perfil`. Invalidar solo los scopes de BS deja al feed mostrando datos viejos (sucursales desactivadas siguen apareciendo hasta que el usuario recarga). `useInvalidarSucursales` invalida los 3 scopes: `sucursales.all`, `perfil.sucursales(negocioId)` y `negocios.all`. Regla: cuando una mutación afecta datos visibles al público, listar explícitamente todos los scopes de query keys que leen esos datos.

### Navegación con flechas del header BS

- **`Navbar.tsx` (PC) y `MobileHeader.tsx` (móvil) duplican la lista `MODULOS_BS`** — Ambos componentes mantienen su propia copia del array de módulos para las flechas `<` `>`. Al agregar la lógica de filtrado para gerentes, es fácil olvidar uno de los dos. `MobileHeader` ya tenía el filtro `vistaComoGerente` pero `Navbar` no — resultado: en PC el gerente podía navegar a "Puntos" y "Sucursales" donde encuentra pantalla de acceso restringido. Al modificar esta lista o sus filtros, tocar ambos archivos. Considerar extraer a un hook compartido `useModulosBS()` cuando haya una tercera instancia.
