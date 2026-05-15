# Lecciones Técnicas — AnunciaYA

> Descubrimientos, bugs resueltos y decisiones técnicas aprendidas durante el desarrollo. Consultar antes de trabajar en áreas que ya tuvieron problemas.
> Organizado por módulo/área.

---

## General

### Axios y Manejo de Errores

- **Interceptor resolviendo 4xx/5xx como si fueran 2xx** — El interceptor de `api.ts` envuelve todas las respuestas en `{ success, data, error, message }` y **resuelve** la promesa aunque el backend responda 400/409/500. Consecuencia: `mutationFn` de React Query recibe el error como valor de éxito y dispara `onSuccess` con el toast verde. **Regla obligatoria en mutations:** verificar `if (!res.success) throw new Error(res.error ?? res.message ?? 'Error')`. Sin esto, una mutation puede mostrar "Empleado creado" aunque la BD rechazara el insert (ej. nick duplicado).
- **Interceptor duplicando `sucursalId`** — El interceptor agrega `sucursalId` automáticamente en `config.params` para todas las rutas. Si el service ya lo manda en la URL (ej: `/notificaciones?sucursalId=X`), termina duplicado en query string. Agregar la ruta a `RUTAS_SIN_SUCURSAL` en `api.ts` cuando el service arma el param manualmente (necesario para notificaciones porque la sucursal depende del contexto — BS vs fuera de BS — no de la sucursal activa del modo comercial).

### SQL y Base de Datos

- **Nunca hardcodear zona horaria en agregaciones SQL — usar la columna `zona_horaria` de la sucursal** — México tiene 5 zonas horarias (Tijuana UTC-8, Hermosillo UTC-7 sin DST, Mazatlán UTC-7 con DST, Cancún UTC-5, CDMX UTC-6). Asumir CDMX en queries con `EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')` falla silenciosamente para sucursales en otros estados — el bucket queda corrido por el delta de offset. **Caso real:** una venta a las `09:05` en Puerto Peñasco (Sonora, UTC-7) cae en bucket `10` de "Horarios pico" si la query usa CDMX (UTC-6, +1h). **Regla:** toda query que use `AT TIME ZONE`, `DATE_TRUNC` con TZ, o `EXTRACT(HOUR/DOW)` sobre `timestamptz` debe derivar la zona desde `negocio_sucursales.zona_horaria` (que ya existe con default `America/Mexico_City`). Helper compartido: `obtenerZonaHorariaSucursal(negocioId, sucursalId?)` en `apps/api/src/utils/zonaHoraria.ts` — devuelve la zona de la sucursal filtrada o de Matriz si no hay filtro. Uso: `const zonaHoraria = await obtenerZonaHorariaSucursal(negocioId, sucursalId);` y luego `sql\`AT TIME ZONE ${zonaHoraria}\`` (Drizzle parametriza el string como literal seguro). En vista global multi-sucursal se usa la zona de Matriz como compromiso pragmático; si en el futuro se reportan ventas de sucursales con zonas distintas en una misma vista, evaluar agregar por zona de cada `created_at`.
- **Orden del `CASE` importa cuando las condiciones no son mutuamente excluyentes** — Un `CASE` devuelve el primer `WHEN` que matchea. Si una oferta puede ser a la vez `agotada` (límite alcanzado) y `vencida` (fecha_fin pasó), el orden define qué estado ve el usuario. **Regla:** evaluar primero la causa-raíz del cierre. En `obtenerOfertas`: agotada > vencida (si se agotó, eso cerró la oferta; el vencimiento fue posterior e irrelevante). En `obtenerMisCupones`: revocado > usado > vencido > activo (la acción del usuario prevalece sobre el paso del tiempo).
- **`GREATEST(col - x, 0)` para deltas de puntos/contadores** — Restas directas (`puntos_canjeados_total - puntos_usados`) pueden violar check constraints `>= 0` cuando hay inconsistencia entre el total almacenado y las operaciones acumuladas. **Regla defensiva:** envolver toda resta de contadores con constraint `>= 0` en `GREATEST(..., 0)`. Caso típico en `cancelarVoucher` con billeteras donde `puntos_canjeados_total` es menor a la suma real de vouchers canjeados.
- **Estado en BD vs estado en UI** — Cuando el estado almacenado captura solo la última acción del usuario (`activo`/`usado`/`revocado`) pero el estado real depende también del tiempo (vencimiento) o de contadores globales (agotamiento), **calcular el estado en el query** con `CASE` en lugar de devolver el campo crudo. Evita depender de un job batch que actualice estados cada X minutos.
- **Estado por-entidad vs estado por-usuario — decidir acción por acción, no por entidad** — Cuando una entidad es consumida por múltiples usuarios (alertas del negocio, notificaciones compartidas, mensajes de grupo), cada tipo de acción puede tener naturaleza distinta dentro de la misma entidad. Regla: preguntar por cada acción "¿si un usuario hace esto debe afectar lo que ven los demás?". **Ejemplo — alertas:** `leída` = preferencia personal ("yo la vi") → por usuario. `resuelta` = estado del problema del negocio ("ya fue atendido") → **global** (con columna extra "resuelto por X" para auditoría). `ocultada` = preferencia de vista ("no la quiero ver") → por usuario. `borrado físico` = admin/cron. Implementar con tabla `<entidad>_lecturas(entidad_id, usuario_id, leida_at, ocultada_at, ...)` para lo por-usuario + columnas en la entidad para lo global. Trampa típica: poner TODO por usuario y dejar que cada usuario resuelva por su cuenta — si un gerente resuelve, el dueño no se entera. Ver `docs/arquitectura/Alertas.md` sección "Modelo de estados".

### Gestión de archivos (R2)

- **Reference count antes de borrar una imagen** — Una misma URL puede ser compartida entre varias filas (clonado de catálogo a múltiples sucursales). Borrarla desde una fila rompe las otras. **Regla:** antes de `eliminarArchivo(url)`, contar cuántas otras filas la usan (revisando todos los campos relevantes: `imagen_principal`, `imagenes_adicionales`, etc). Solo borrar si el count es 0. Aplica a `actualizarArticulo` (reemplazo), `eliminarArticulo`, `eliminarSucursal`, `actualizarOferta`, `eliminarOferta`, `eliminarImagenGaleria`, `actualizarRecompensa`, `eliminarRecompensa`, `actualizarLogoNegocio`, `actualizarPortadaSucursal`, `actualizarFotoPerfilSucursal` y cualquier otro flujo nuevo que limpie R2. Existe helper compartido `eliminarImagenSiHuerfana` exportado desde `negocioManagement.service.ts` que cubre 6 tablas (sucursales, artículos, negocios, galería, ofertas, recompensas).
- **Soft-delete de mensajes que sobrescribe `contenido` pierde referencia al archivo R2** — Descubierto en `eliminarMensaje` (chatya): el soft-delete pone `contenido = 'Se eliminó este mensaje'` para ocultar el mensaje al otro usuario, pero si el contenido era una URL (tipo imagen/audio/documento) o JSON con URL (tipo cupón), esa referencia se perdía de BD y el archivo quedaba huérfano. **Regla:** para cualquier soft-delete que sobrescriba un campo con URLs, capturar las URLs ANTES del UPDATE y limpiarlas de storage después.
- **No asumir que un campo tiene un formato fijo — usar regex para extraer URLs** — El campo `chat_mensajes.contenido` puede contener: URL directa, JSON con metadatos de imagen (`{"url": "...", "ancho": ..., "miniatura": "data:..."}`), o JSON de cupón (`{"imagen": "...", "ofertaId": ...}`). Asumir un formato concreto y parsearlo con `JSON.parse` o `esUrlR2()` directo genera bugs sutiles cuando el formato cambia. **Regla:** cuando extraigas URLs de un campo con formato variable, usa regex que matchee el dominio R2 y deduplica resultados. Mismo patrón en SQL (`text-scan-urls` con cast `::text`) y en JS (regex compilado con RegExp).

### Validación y Tipos

- **Zod runtime vs TypeScript compile-time** — Son independientes. Campos faltantes en schema Zod se eliminan silenciosamente sin error de TypeScript.
- **`z.string().uuid()` de Zod** — Rechaza UUIDs con variante no-estándar (ej: `c000...`). Usar regex `/^[0-9a-f]{8}-...$/i` para aceptar cualquier formato UUID.

### Layout y CSS

- **Leaflet stacking context** — Leaflet crea su propio stacking context. Requiere `z-[1000]` para overlays sobre mapas.
- **`translate-y` vs `margin-top`** — `translate-y` mueve elementos visualmente sin afectar box model. `margin-top` infla el contenedor padre.
- **`box-shadow: inset` en scroll containers** — NO se fija al viewport del scroll container, se mueve con el contenido. Para overlays fijos en carousels usar un wrapper con divs posicionados absolute.
- **Stacking context en drawers** — Drawers con `position: fixed` dentro de un padre con `z-index` + `position` quedan atrapados en su stacking context. Solución: `createPortal(jsx, document.body)` — ver TC-18.
- **Selectores DOM que excluyen elementos: usar `data-*` attributes, no atributos UX (`title`, `aria-label`, etc.)** — Cuando un listener global (ej: click-outside de un panel) necesita ignorar clicks en un botón específico, **NO usar `closest('button[title="X"]')` ni `[aria-label="X"]`**. Esos atributos son UX y pueden cambiar (limpiar tooltips, traducir labels, ajustar accesibilidad) — al cambiarlos, el selector se rompe **silenciosamente** y el listener empieza a procesar clicks que debía ignorar. **Caso típico:** un panel con click-outside que ignora su propio botón vía `closest('button[title="X"]')` deja de funcionar cuando alguien limpia el tooltip → el panel se cierra con `mousedown` y el `onClick` del botón lo reabre → "se pelea con sí mismo, abre y cierra al mismo tiempo". **Regla:** todo selector que identifique un elemento por **identidad funcional** (este botón abre el panel X, este input es el del módulo Y, este wrapper es el container del preview) debe usar `data-*` attributes específicos del proyecto. Naming sugerido: `data-<modulo>-<rol>` (ej: `data-notificaciones-boton`, `data-preview-target`, `data-buscador-clientes`). Nunca `data-testid` para esto — `data-testid` es para tests E2E (Playwright) y semánticamente significa "punto de prueba", no "identidad funcional permanente". **Trampa relacionada:** `class` también es inestable porque las clases pueden cambiar por refactor visual. Solo usar `class` para selectores CSS (estilos), nunca para selectores funcionales en JS. **Excepción:** dentro de un componente React aislado, `useRef` siempre es preferible a un selector DOM — el ref está vinculado al elemento por identidad de instancia, no por atributos.
- **Reset de filtros locales al cambiar de sucursal o de toggle/tab — patrón obligatorio en Business Studio** — **Jerarquía:** `sucursal activa > toggle activo > filtros`. Cuando cambia algo arriba en la jerarquía, todo lo de abajo se resetea. (1) Cambio de sucursal (navbar) → reset COMPLETO: toggle activo, períodos, búsquedas, dropdowns — todo a default. (2) Cambio de toggle dentro del mismo módulo (Productos↔Servicios, Ofertas↔Cupones, Ventas↔Cupones↔Canjes-Vouchers, etc.) → reset solo de los filtros específicos del toggle (búsqueda, dropdowns de tipo/estado, etc.). **Por qué:** cuando el comerciante cambia de sucursal o de toggle, los filtros previos pueden no aplicar (ej: filtraste por "Operador: Carlos" en Matriz, cambias a Norte donde Carlos no trabaja → tabla vacía sin que sea bug del backend). Los datos se refetchan automáticamente porque los queryKeys incluyen `sucursalId`, pero los `useState` o stores Zustand del frontend se quedan congelados con valores obsoletos hasta que el componente se desmonte (lo cual no pasa al cambiar sucursal). **Implementación obligatoria:** `const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva); useEffect(() => { setFiltros(VALORES_INICIALES); }, [sucursalActiva]);` en cada `Pagina*.tsx` con filtros locales. Si el módulo usa Zustand store, llamar al método `limpiar()` o equivalente del store. Para los toggles, los handlers que cambian el toggle también deben resetear los filtros en la misma callback: `setFiltros({ busqueda: '', tipo: 'todos', estado: 'todos', visibilidad: 'publico' })`. **No existe hook reutilizable** porque el patrón es trivial (3 líneas) y cada módulo tiene matices distintos. Aplicado en Catálogo, Transacciones, Promociones, Clientes, Opiniones, Alertas, Dashboard, Puntos, Empleados, Reportes. Mi Perfil/Sucursales/ChatYA no aplican porque no tienen filtros locales. **Trampa de los dropdowns hardcoded:** los dropdowns de filtro suelen construirse con listas hardcoded (todos los tipos posibles del enum). Si una opción no existe en la sucursal activa, el usuario puede seleccionarla y obtener tabla vacía. Calcular las opciones disponibles desde los datos actuales con un `useMemo([items])` y filtrar la lista hardcoded — también scoped por toggle si aplica. Ver `tiposDisponibles` y `estadosDisponibles` en `PaginaOfertas.tsx`. **Trampa con stores Zustand globales:** el state vive entre montajes del componente. Si un módulo solo aparece en una sucursal específica (ej: Puntos solo en Matriz), aún así hay que resetear al cambiar de sucursalActiva por consistencia: si el dueño configura `periodo: 'año'` en Puntos, sale a otro módulo, cambia a Norte (Puntos desaparece), vuelve a Matriz (Puntos vuelve), el `periodo` seguía siendo 'año'. Llamar `limpiar()` del store dentro del `useEffect([sucursalActiva])` cubre este caso.
- **Modales contenidos al preview vs fullscreen del viewport** — Cuando un modal vive dentro de un preview (ej: `PanelPreviewNegocio` en BS, `PanelInfoContacto` en ChatYA), su comportamiento default de `createPortal(jsx, document.body)` + `position: fixed inset-0` lo hace escapar al viewport completo del PC, rompiendo la metáfora "preview = celular virtual". **Regla:** todo modal del proyecto debe respetar un contexto `PortalTargetContext` (hook `usePortalTarget` en `apps/web/src/hooks/usePortalTarget.tsx`). Si un ancestro declara un target con `PortalTargetProvider`, el modal portea a ese elemento y usa `position: absolute inset-0` (contenido). Si no hay provider (comportamiento default), portea a `document.body` con `fixed inset-0` (fullscreen). **Implementación obligatoria en todo modal nuevo:** (1) importar `usePortalTarget`, (2) `const portalTarget = usePortalTarget(); const esContenido = portalTarget !== document.body;`, (3) usar `portalTarget` como segundo arg de `createPortal`, (4) clase base condicional `const claseBase = esContenido ? 'absolute' : 'fixed'` en el overlay root, (5) bloqueo de scroll del body **solo cuando `!esContenido`** — en modo contenido no debe tocarse `document.body.style` porque el scroll del documento principal es del usuario, no del modal. **Conectar provider en wrappers de preview:** usar `useState<HTMLElement | null>` + callback ref (`ref={setTarget}`) para capturar el div del panel, envolver el contenido con `<PortalTargetProvider target={targetEl}>`, y dar al wrapper `position: relative overflow-hidden` (el `absolute inset-0` del modal se posiciona contra ese padre relative). Aplicado en: `Modal.tsx`, `ModalBottom.tsx`, `ModalImagenes.tsx` (bases comunes) + `PanelPreviewNegocio` (tabs Card y Perfil) + `PanelInfoContacto` (vista negocio en ChatYA). Todos los modales del perfil (`ModalCatalogo`, `ModalOfertaDetalle`, `ModalDetalleItem`, `ModalHorarios`, `ModalResenas`, etc.) heredan el comportamiento automáticamente por consumir alguna de las bases. **Trade-off:** pierde ligera complejidad en cada modal base (~15 líneas). Gana consistencia visual en cualquier contexto embebido presente y futuro (dashboards admin, widgets, demos, etc.) sin tener que tocar cada modal individualmente. **Relación con otros patrones:** este contexto es ortogonal a `createPortal(jsx, document.body)` para z-index/stacking (otra lección de esta sección). El target del portal sigue siendo DOM-level — evita stacking context issues de igual forma, solo cambia de body a un elemento específico.
- **Carruseles con drag-to-scroll — patrón estándar para todo carrusel de la app (horizontal o vertical)** — Cuando un componente tiene scroll interno (overflow horizontal/vertical) que en desktop se ve "cortado" sin affordance claro, el patrón estándar del proyecto es combinar: `useDragScroll` (hook en `apps/web/src/hooks/useDragScroll.ts`) + `cursor-grab active:cursor-grabbing` + `[&_*]:cursor-grab` para forzar el cursor en descendientes con `cursor-pointer` propio + fade oscuro en el borde de la dirección de scroll (`bg-gradient-to-l from-black/90 via-black/50 to-transparent w-12` para horizontal-derecha, adaptar el `to-l`/`to-t` según el eje) con `z-index` suficiente para cubrir badges que se proyecten fuera del card (`z-50` si hay badges tipo "HAPPY HOUR"). **5 reglas no negociables al implementar drag-to-scroll:** (1) Threshold click vs drag de 3px — movimiento <3px pasa como click normal, ≥3px activa drag y cancela el siguiente click con `addEventListener('click', handler, { capture: true, once: true })`. Sin esto, arrastrar sobre un card lo abriría al soltar. (2) `document.body.style.cursor = 'grabbing'` durante drag real — los descendientes con `cursor-pointer` anulan el cursor del contenedor; CSS global sobre body es la única forma de forzar el feedback visual durante el arrastre. (3) Prevenir `dragstart` del HTML5 Drag & Drop API — las `<img>` tienen drag nativo activado por default (arrastrar imagen a escritorio/otra pestaña); ese drag muestra un "ghost/velo fantasma" y cambia el cursor a 🚫, interfiriendo con el drag-to-scroll. Solución: `el.addEventListener('dragstart', (e) => e.preventDefault())` en el container. Alternativas (`draggable={false}` en cada `<img>` o CSS `-webkit-user-drag: none`) son más frágiles porque no cubren hijos dinámicos. Trade-off aceptado: los usuarios pierden la capacidad de arrastrar imágenes del carrusel al escritorio — en la práctica es caso minoritario, click-derecho → "Guardar imagen como" sigue funcionando. Patrón estándar en Netflix/Spotify/Amazon/Mercado Libre. (4) `select-none` en el container — sin esto, al arrastrar se selecciona texto accidentalmente. (5) En mobile (touch), el hook no hace nada — el scroll nativo táctil sigue funcionando y es lo que queremos. No interferir. **Cuándo aplicarlo:** cualquier carrusel que pueda aparecer en contextos desktop con mouse (preview BS, ChatYA info negocio, vista pública, tablets). Actualmente aplicado en `SeccionCatalogo`, `SeccionOfertas`, galería inline de `PaginaPerfilNegocio`. **Extensión a eje vertical:** el hook actual solo maneja scroll horizontal (`scrollLeft` con `pageX`). Para vertical, extender el hook con parámetro `{ eje: 'x' | 'y' }` y usar `scrollTop`/`pageY`. Las 5 reglas anteriores aplican igual; solo cambia qué propiedad/eje se mueve. **Fade visual:** posicionarlo fuera del scroll container (en un wrapper `relative` padre) con `position: absolute` y `pointer-events-none` para no bloquear clicks. Altura/ancho acotado al item visible (ej: `top-0 bottom-2` si el scroll tiene `pb-2`) — sin esto, el fade abarca el padding del scroll container y se ve mal. Borde rectangular (sin `rounded-r-*`) para coincidir con el recorte de los cards. Ocultar en desktop real con `@5xl:hidden` cuando el carrusel pase a modo grid.
- **Container queries vs viewport queries — usar container queries cuando un componente se renderiza a anchos distintos del viewport** — Las clases responsive `lg:` / `2xl:` de Tailwind miden el viewport del navegador, **no** el ancho del contenedor. Un componente diseñado para renderizarse a ancho viewport (ej: `PaginaPerfilNegocio`) se ve roto cuando se embeba en un panel lateral estrecho (preview BS, ChatYA info de negocio): el viewport sigue siendo 1920px, las `lg:`/`2xl:` se disparan, y los grids de 3/4 columnas intentan caber en 540px. **Regla:** si un componente responsive puede aparecer en múltiples contextos con distintos anchos, usar container queries (`@5xl:`, `@[96rem]:`) y declarar `@container` en los **layouts** ancestros, no en el componente mismo. Cada layout define el "viewport virtual" que los componentes reciben. **Mapping Tailwind v4:** `lg:` (1024px viewport) ↔ `@5xl:` (1024px container, preset nativo). `2xl:` (1536px viewport) ↔ `@[96rem]:` (1536px container, arbitrary — no hay preset exacto). `sm:` (640px) ↔ `@[40rem]:` (arbitrary). **Trampa crítica:** NO sobrescribir `--container-lg`, `--container-2xl`, etc. con `@theme` para alinear con viewport — esas mismas variables controlan `max-w-sm`, `max-w-md`, `max-w-lg`, etc., y al subirlas todos los modales del sistema (`max-w-md` = 448px → 768px) se vuelven gigantes. Usar presets nativos (`@5xl:`) o arbitrary values (`@[96rem]:`) mantiene el namespace separado. **Ejemplo — preview de negocio en Business Studio:** el preview lateral usa `@5xl:grid-cols-3` con `@container` declarado en `LayoutPublico`, `MainLayout`, wrappers de `PanelPreviewNegocio` y `PanelInfoContacto`. En cada contexto el container responde al ancho real: 1920px en desktop (@5xl: y @[96rem]: activos → layout desktop completo), 540px en preview (ninguno activo → layout mobile). Sin iframe, sin bundle duplicado, caché React Query compartida. Alternativa descartada: iframe crea un viewport virtual pero duplica runtime React, separa la caché y agrega 300-800ms por apertura.

- **Barra de navegación nativa de Android se ve gris-pálido aunque `theme-color` sea `#000` — declarar `color-scheme: dark` para forzar scrim oscuro** — Chrome Android en modo browser regular (no PWA standalone) aplica un **scrim translúcido claro** encima del `theme-color` en la barra de navegación del sistema, para garantizar que sus íconos (`≡ ○ <`) sigan legibles. Resultado: aunque tengas `<meta name="theme-color" content="#000000">` y `body.style.background = '#000000'`, la barra del sistema se ve gris medio en lugar de negro puro. **Causa raíz:** Chrome decide el tipo de scrim según `color-scheme`. Si está implícito o `light`, aplica scrim claro (que aclara el negro a gris). Si es `dark`, aplica scrim oscuro (que respeta el negro). **Solución:** declararlo en dos lugares para máxima cobertura — (a) `<meta name="color-scheme" content="dark" />` en `apps/web/index.html` cerca del `<meta name="theme-color">`, y (b) `html { color-scheme: dark; }` en `apps/web/src/index.css`. Con eso la barra del sistema se ve negro puro como manda `theme-color`. No requiere PWA standalone — funciona en Chrome regular. **Trampa crítica:** el `<meta>` tag NO se actualiza por HMR; un cambio de `index.html` requiere full reload del navegador (cerrar pestaña y reabrir, o pull-to-refresh) para que se aplique. **Hallazgos colaterales útiles que descubrimos diagnosticando este bug:** (1) `env(safe-area-inset-bottom)` puede dar `0px` en algunos Android Chrome no-PWA aunque la barra de gestos exista — no asumir que `> 0`. (2) Con `viewport-fit=cover` activo, `window.innerHeight` (790px típico) incluye la zona donde el sistema pinta su barra pero `document.documentElement.clientHeight` (734px típico) NO — los ~56px de diferencia son la nav bar Android, y la app no puede pintar contenido ahí, solo influir en su color vía `theme-color` + `color-scheme`. (3) `theme-color` solo NO basta para controlar el color en browser regular: `color-scheme: dark` es lo que desactiva el scrim claro. (4) `@container` en Tailwind v4 NO crea containing block para `position: fixed` (verificado empíricamente con dos strips fijos, uno dentro y uno fuera del `@container`, ambos se anclaron al viewport igual). **Defensa adicional implementada:** un `useEffect` en `MainLayout.tsx` reasegura `document.body.style.background = '#000000'`, `document.documentElement.style.background = '#000000'`, el meta `theme-color = '#000000'`, el meta `color-scheme = 'dark'` (creándolo si no existe en el HTML cacheado) y `document.documentElement.style.colorScheme = 'dark'` al montar — solo aplica a rutas AnunciaYA (ScanYA tiene su propio layout con `colorBarra = '#001136'`). **ADENDUM (8 mayo 2026):** la conclusión "no requiere PWA standalone — funciona en Chrome regular" del párrafo anterior es **parcialmente incorrecta**. Tras más diagnóstico encontramos que `color-scheme: dark` por sí solo **NO garantiza** la barra negra en Chrome Android browser regular: Chrome decide aplicar (o no) el scrim según un **estado interno del browser** que se "calienta" al abrir una PWA standalone instalada del mismo origen y se "enfría" con el reinicio de Chrome o limpieza de datos. Comportamiento empírico observado en un Samsung Android: (a) Chrome recién abierto, sin PWA tocada → scrim claro aplicado, barra gris-medio aunque `cssScheme=dark`, `metaScheme=dark`, `theme=#000000` y `prefersDark=true` (todos verificados en runtime). (b) Después de abrir la PWA standalone instalada y volver a Chrome regular en el mismo origen → barra negra real, sin scrim. El estado persiste hasta reinicio del browser. **Conclusión revisada:** el código de fix sigue siendo necesario (sin él NUNCA se ve negro), pero **no es suficiente** — solo lo es en PWA standalone. Para garantizar la experiencia, la app debe empujar al usuario a instalar la PWA. La app nativa (planificada) tendrá control total sobre la nav bar. **Trampa de diagnóstico:** durante el debug del bug, una "captura donde se ve negra" puede ser engañosa si hay un strip de color brillante adyacente (ilusión óptica de contraste); medir el color real con un screenshot sin elementos contiguos brillantes.

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

- **Carruseles rotativos con cards complejas — usar Embla Carousel, no hand-rolled** — El gesto "swipe" en móvil tiene un enemigo invisible: el browser corre su propia detección de scroll-vs-drag durante los primeros ~10–15 px de cada touch. Mientras decide, los `touchmove` llegan con `cancelable:false` y `preventDefault()` deja de servir. Esa es la sensación de "rigidez": hay que mover el dedo con fuerza para que el browser ceda el gesto al JS. Resolverlo a mano implica un engine que separe pointer input del rendering, mantenga velocity entre frames, y use el snap como objetivo asintótico (no como condición binaria con umbral). **Después de 9 iteraciones de hand-rolled (Pointer/Touch Events, rAF batching, click guards, DOM directo, etc.) en `useCarruselRotativo` el problema persistía.** Solución: migrar a `embla-carousel-react` + `embla-carousel-autoplay` (~4 KB gz combinadas, MIT). Patrón de referencia en `apps/web/src/hooks/useCarruselRotativo.ts` y el componente local `CarruselRotativoSwipe` en `apps/web/src/pages/private/ofertas/PaginaOfertas.tsx`. **Para nuevos carruseles touch-fluidos con cards complejas (MarketPlace, Home, Servicios) reusar este hook o el patrón Embla — no volver al hand-rolled.** Distinto de `useDragScroll`: ese sirve para listas horizontales con scroll libre desktop; Embla es para carruseles con snap a slide.

- **Embla — `useEmblaCarousel` reinitializa si options/plugins cambian de referencia** — Pasar `useEmblaCarousel({ loop: true, ... }, [autoplayPlugin])` con literals inline crea referencias nuevas en cada render del componente que use el hook → Embla detecta "options cambiaron" → reinicializa el carrusel. **Síntoma observado en producción:** al soltar el dedo a medio camino de un swipe, el snap ya animándose se cancelaba por el reInit y la card "saltaba" al slide final sin transición. El usuario lo describió como "se queda pegada un momento y luego cambia de golpe". **Regla obligatoria:** envolver options y plugins en `useMemo`:
  ```ts
  const emblaOptions = useMemo(() => ({ loop: total > 1, duration: 30, ... }), [total]);
  const emblaPlugins = useMemo(() => [autoplayPlugin], [autoplayPlugin]);
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, emblaPlugins);
  ```

- **Embla — `setIndex` en `select` rompe el snap si el árbol consumidor es pesado; `settle` lo arregla pero rezaga los dots — desacoplar con `emblaApi`** — `select` se dispara cuando Embla decide a qué slide ir (al inicio del snap), `settle` cuando termina la animación. Si haces `setIndex(emblaApi.selectedScrollSnap())` en `select` y el componente que usa el hook está dentro de un árbol pesado (PaginaOfertas tiene varios carruseles auto, mapas, listas), el re-render mid-animación bloquea el thread y el rAF interno de Embla pierde frames → snap se siente "trabado". Cambiar a `settle` lo resuelve, pero entonces los **dots indicadores** quedan rezagados ~300 ms (lo que dura la animación). **Patrón ganador:** el hook usa `settle` para su `setIndex` interno (carrusel fluido) **y expone `emblaApi`** para que satélites ligeros (dots, contadores) se suscriban a `select` con su propio `useState` local. El re-render del satélite queda contenido en sí mismo y no toca el árbol del carrusel pesado. Implementado en `IndicadoresRotacion` de `PaginaOfertas.tsx` — recibe `emblaApi` directo en lugar de `actual`. La animación de Embla corre en rAF sobre el transform, no en CSS transitions, así que un re-render del satélite ligero no la interrumpe.

### Drizzle ORM

- **Expresiones JS en `sql` template** — Drizzle no evalúa expresiones dentro de `${a + b}` o `${a - b}` en template literals. Pre-calcular en variable JS antes de interpolar: `const limite = min + 1; sql\`LIMIT ${limite}\``. Descubierto en `alertas-motor.service.ts` (LIMIT y resta de días).
- **Filtro sucursal + registros globales** — Cuando hay registros que pueden no tener `sucursal_id` (ej: alertas a nivel negocio), siempre usar `AND (sucursal_id = X OR sucursal_id IS NULL)` en vez de `AND sucursal_id = X`. Sin el `OR IS NULL` se pierden registros globales.
- **drizzle-kit no es Drizzle ORM** — El ORM en runtime solo necesita `schema.ts` y `relations.ts`. Los archivos de migracion (`0000_xxx.sql`), journal (`_journal.json`) y snapshots (`meta/`) son artefactos de `drizzle-kit`, una CLI separada para generar migraciones automaticas. Este proyecto no usa drizzle-kit — las migraciones se manejan manualmente con SQL en PGAdmin (dev) y Supabase (prod).

- **Defaults del schema se aplican silenciosamente si no pasas el campo al insert** — Un campo con `.default('America/Mexico_City').notNull()` no da error al no incluirlo en `db.insert().values({...})` — se aplica el default sin warning. Descubierto en `crearSucursal`: cuando Matriz estaba en `America/Hermosillo` y la sucursal nueva no heredaba `zonaHoraria`, el registro quedaba con el default incorrecto y la query de `esta_abierto` calculaba la hora en la zona equivocada. Las consecuencias son invisibles en logs y se manifiestan como bugs funcionales (sucursal marcada "Cerrado" cuando estaba abierta). Regla: al insertar en una tabla con muchos campos opcionales con defaults, revisar si el default es seguro para ese flujo específico o si debes pasarlo explícito.

- **Columnas de BD vs campos del schema Drizzle** — Lo que existe en PostgreSQL no tiene por qué estar en `schema.ts`. La tabla `negocio_sucursales` tiene (o tuvo) columnas `latitud`/`longitud` numeric pero el schema Drizzle define solo `ubicacion` (PostGIS POINT serializado como text). Drizzle solo inserta los campos que conoce, así que intentar pasar `{ latitud: 31.3, longitud: -113.5 }` falla con "Object literal may only specify known properties". Las coordenadas se extraen en lectura con `ST_Y(ubicacion::geometry)` y `ST_X(ubicacion::geometry)`. Regla: si necesitas un campo que no aparece en el schema, no asumas que no existe en la BD — puede estar en BD pero fuera del modelo Drizzle.

### Buscadores y FTS

> Patrón completo en `docs/estandares/PATRON_BUSCADOR_SECCION.md`. Lecciones puntuales:

- **`plainto_tsquery` español NO hace prefix matching** — el tokenizer trabaja por palabra completa con stemming. `to_tsvector('spanish', 'bicicleta vintage') @@ plainto_tsquery('spanish', 'bici')` devuelve `false` aunque "bici" sea prefijo natural. Síntoma observado: el usuario teclea incrementalmente "bici" y no ve resultados hasta que escribe "bicicleta" entera. **Solución:** combinar FTS con OR `ILIKE` substring para cubrir prefix sin perder el ranking del FTS:
  ```sql
  WHERE (
      to_tsvector('spanish', unaccent(...)) @@ plainto_tsquery('spanish', unaccent(${q}))
      OR unaccent(titulo) ILIKE unaccent(${'%' + q + '%'})
      OR unaccent(descripcion) ILIKE unaccent(${'%' + q + '%'})
  )
  ```
  El FTS sigue rankeando con `ts_rank` (las filas que matchean por FTS rankean primero); el ILIKE solo amplía cobertura.

- **`unaccent()` es extensión de Postgres, no built-in — y necesita estar a ambos lados** — La extensión `unaccent` viene en PostgreSQL contrib (Supabase la tiene disponible) pero hay que activarla con `CREATE EXTENSION IF NOT EXISTS unaccent;`. Sin ella, `ILIKE '%panaderia%'` NO matchea "Panadería" porque ILIKE es solo case-insensitive, no accent-insensitive. **Regla:** aplicar a ambos lados — `unaccent(col) ILIKE unaccent(patron)` — sino el match falla cuando el usuario sí escribe acentos. Migración aplicada: `docs/migraciones/2026-05-14-extension-unaccent.sql`. **Trampa de performance:** el GIN index original sobre la columna sin `unaccent` deja de servir y el planner cae a sequential scan. Aceptable para datasets de decenas a pocos miles. Si crece, recrear index con `CREATE INDEX ... USING gin (unaccent(col) gin_trgm_ops)` (requiere `pg_trgm` también).

- **JS `normalize('NFD') + \p{Diacritic}` para el equivalente frontend de `unaccent`** — Para filtros in-memory donde no hay backend en el flujo (ej. `OverlayBuscadorNegocios` filtra contra el array ya cargado por `useNegociosLista`):
  ```ts
  texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  ```
  La ñ se preserva porque NO es un combining mark — se considera letra propia en español. Helper compartido en `apps/web/src/utils/normalizarTexto.ts`. Aplicar a ambos lados (texto fuente Y query del usuario) en cada comparación.

- **Frontend in-memory NO compensa al backend que ya recortó** — Bug típico: el backend filtra `?busqueda=panaderia` solo contra `negocio.nombre` con ILIKE simple → devuelve 0 negocios → el frontend in-memory tiene cobertura accent-insensitive sobre 6 campos pero opera contra `[]` y no encuentra nada. **Regla:** el backend debe ser el filtro de verdad. El frontend solo afina (slice top 5, dedup, formato) — no agrega resultados nuevos.

- **`useDeferredValue` para filtros pesados in-memory que respaldan un input controlled** — Sin él, cada keystroke recalcula el filtro contra el array completo y re-renderiza todo lo que dependa (mapa + popups + cards). Al borrar (la lista crece) se siente "en cámara lenta". `useDeferredValue` (React 18 native, sin dependencias) mantiene el input prioritario y deja el filtro pesado para cuando React tiene tiempo libre — el input se siente fluido, los resultados aparecen ~1 frame después. Aplicado en `PaginaNegocios.tsx`. Trade-off: por 1 frame puedes ver la lista anterior mientras los resultados nuevos se calculan. Aceptable.

- **Debounce manual del query antes de armar el queryKey de React Query** — Sin debounce, cada keystroke cambia el queryKey y RQ refetcha al backend cada tecla. No solo carga al backend; también dispara loading state perceptible para el usuario. Patrón:
  ```ts
  const [busqueda, setBusqueda] = useState(busquedaRaw);
  useEffect(() => {
      const t = setTimeout(() => setBusqueda(busquedaRaw), 250);
      return () => clearTimeout(t);
  }, [busquedaRaw]);
  // ...usar `busqueda` en queryKey, no `busquedaRaw`
  ```
  El input visual sigue instantáneo (escribe directo al store); solo se debouncea el fetch. Diferente del debounce 300ms del hook de sugerencias del overlay (ahí se debouncea ANTES de armar el queryKey del hook de sugerencias en sí).

- **Overlay de buscador se monta en MainLayout, NO en cada página** — Para que funcione en cualquier sub-ruta de la sección (`/marketplace/articulo/:id`, `/negocios/:sucursalId`, etc.) sin estar atado al montaje de la página principal. El overlay se auto-oculta cuando `buscadorAbierto=false` Y `query=''`, así que no estorba inactivo. El switch por sección vive en `MainLayout.tsx` con `detectarSeccion(location.pathname) === '<seccion>'`.

- **Búsquedas recientes en localStorage por sección, no compartidas** — Una "panadería" buscada en Negocios no debe aparecer como reciente al abrir Ofertas. Helper `busquedasRecientes.ts` con clave por sección (`<seccion>_busquedas_recientes`). Click en chip reciente o popular **rellena el query** (dispara las sugerencias) **sin cerrar el overlay** — el usuario decide cuál sugerencia abrir.

- **Ruta `/buscar/sugerencias` antes de las paramétricas en el router de Express** — Si declaras `router.get('/:id', ...)` antes que `router.get('/buscar/sugerencias', ...)`, Express interpreta `buscar` como `:id` y nunca llega al handler de sugerencias. Verificar siempre el orden cuando agregues una ruta nueva con paths relativos a un router que ya tiene paramétricas.

### Stores y Caché

- **Skeleton solo en primera carga** — Usar `const esCargaInicial = datos === null` (o `.length === 0`) para decidir si mostrar spinner. Recargas posteriores muestran datos del caché al instante y actualizan silenciosamente. Patrón usado en Clientes, Transacciones, Alertas, Dashboard.
- **No limpiar store al desmontar** — Si quieres caché persistente entre navegaciones, no llamar `limpiar()` en el `return` del `useEffect`. El store conserva datos y la próxima visita los muestra al instante. Descubierto en `PaginaDashboard.tsx`.

### React Query — Invalidación Cruzada

- **Invalidar TODOS los módulos que muestran el mismo dato** — Una mutación que cambia datos en un módulo puede dejar cachés stale en otros módulos que consumen los mismos datos con query keys distintos. Ejemplo: revocar transacción debe invalidar `transacciones.kpis` y `dashboard.kpis` (ambos muestran totales). Otro ejemplo: escribir reseña debe invalidar la lista de reseñas y `negocios.detalle` (que contiene `calificacionPromedio`). Regla: antes de escribir `onSuccess`, preguntarse _"¿qué otros módulos muestran estos mismos datos?"_.

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
- **Optimistic UI que cambia un claim del JWT = race condition con requests inmediatos** — Actualizar un campo del usuario (ej: `modoActivo`) en el store ANTES de llamar al backend parece responsive, pero si hay `useEffect` que observa ese campo y dispara fetches, los requests salen con el token **viejo** (claims anteriores). Si el middleware decide identidad/permisos usando claims del token en lugar de query params, el backend responde con la identidad vieja — inconsistencia persistente, no parpadeo. Para flujos donde cambiar el estado implica renovar el JWT, hacer backend PRIMERO y `set({ usuario, accessToken, refreshToken })` atómicamente DESPUÉS; los useEffects reactivos se disparan con token correcto. Descubierto en `useAuthStore.cambiarModo` con gerentes ChatYA: al cambiar a modo personal, el optimistic disparaba `cargarConversaciones` con un token que aún decía `modoActivo: comercial`; el middleware sustituía `usuarioId = negocioUsuarioId` (dueño) y el backend devolvía los chats personales del dueño. Ver detalle completo en `docs/arquitectura/ChatYA.md` §17 ítem 80.

---

## ChatYA

- **Módulo compartido entre dos sistemas de auth** — Cuando un módulo (ChatYA) debe funcionar desde dos orígenes de sesión distintos (`useAuthStore` y `useScanYAStore`), crear un adaptador centralizado (`useChatYASession`) en lugar de checks `if (authStore) ... else if (scanYAStore) ...` dispersos en cada archivo. Helpers no-React (`obtenerMiIdChatYA()`) para stores y callbacks.
- **Socket.io y sesión dual** — Si el socket se conecta con token de un sistema pero el `localStorage` tiene datos de otro, los IDs emitidos por el cliente pueden no coincidir con los del token. Solución: el backend asigna `socket.data.usuarioId` desde el token verificado y lo usa como fuente de verdad.
- **Socket.io timing: emit antes de connect** — Si un componente monta y emite un evento socket antes de que el socket se conecte, el evento se pierde silenciosamente (`socket?.connected` es false). Solución: `emitirCuandoConectado()` con retry automático cada 500ms.
- **`hidratarAuth` innecesario en rutas ajenas** — No llamar `hidratarAuth()` de AnunciaYA en rutas `/scanya/*`. El empleado no tiene cuenta AnunciaYA y genera 404 innecesarios.
- **Cursor-based pagination para feeds** — Para ChatYA y futuros feeds sociales: cursor-based pagination > offset-based. Endpoint "jump to message" es prioridad alta.

### Navegación desde un overlay sin flash visual (mayo 2026)

Cuando un overlay full-screen (ChatYA, modales, paneles) navega a otra ruta al cerrarse, hay un riesgo de "flash" donde el usuario ve la ruta donde tenía el overlay abierto antes de ver la ruta destino. Patrón validado en `ChatOverlay.tsx` para resolverlo:

- **Síntoma del flash** — Click en algo dentro del overlay → el overlay se cierra → se ve por un instante la ruta anterior (`/negocios`, `/ofertas`, etc.) → finalmente se renderiza la ruta destino. Causa: React batch ambos setStates (cerrar overlay + cambiar location) en el mismo render, pero el browser puede pintar primero el cierre del overlay y solo después el cambio de ruta.

- **Por qué fallan los enfoques "obvios"**:
  - `cerrarChatYA()` antes de `navigate(ruta)` → flash garantizado.
  - `navigate(ruta)` antes de `cerrarChatYA()` en el mismo tick → React batchea, puede haber flash igual.
  - `requestAnimationFrame` (RAF) o doble RAF → se sincroniza con el paint del navegador, no con el commit de React: insuficiente.
  - `flushSync(() => navigate(ruta))` solo → React commitea el cambio sincrónicamente pero NO garantiza que el browser ya pintó.

- **Patrón validado** — combinación `flushSync` + `setTimeout(200ms)`:

  ```tsx
  const handler = (e: Event) => {
    const ruta = (e as CustomEvent<string>).detail;
    navegandoExternoRef.current = true;
    flushSync(() => {
      navigate(ruta);  // React monta el destino DEBAJO del overlay (que sigue visible)
    });
    setTimeout(() => {
      cerrarChatYA();  // overlay desaparece y revela el destino YA pintado
      setTimeout(() => { navegandoExternoRef.current = false; }, 100);
    }, 200);
  };
  ```

  Los 200ms le dan tiempo al navegador a completar el paint del componente destino antes de que el `display:none` del overlay lo revele. **100ms NO es suficiente** (testeado), 200ms es el mínimo verificado.

- **Riesgo paralelo: `history.back()` que revierte el navigate** — Si el overlay tiene `useEffect` que hacen `history.pushState` al abrir y `history.back()` al cerrar (patrón típico para que la flecha nativa del celular cierre el overlay), esos backs reviertirán el navigate. Solución: usar un flag (`navegandoExternoRef`) que esos effects lean para skip el `history.back()` durante la navegación externa:

  ```tsx
  useEffect(() => {
    if (!chatYAAbierto) {
      if (overlayHistoryRef.current) {
        // ... cleanup ...
        if (!navegandoExternoRef.current && /* otros checks */) {
          history.back();
        }
      }
      return;
    }
    // ...
  }, [chatYAAbierto, ...]);
  ```

- **Evento custom como API** — Para que un componente arbitrario (ej. `BurbujaMensaje` dentro del chat) pueda disparar este patrón sin acoplarse al ChatOverlay, usar un evento `window.dispatchEvent(new CustomEvent('chatya:navegar-externo', { detail: ruta }))` que el ChatOverlay escucha. El consumidor solo conoce la ruta, no la mecánica de cierre.

- **Cuándo aplica** — overlays full-screen que tienen contenido clickeable que navega: ChatYA (cards de artículos, links de mensajes), modales con CTAs que llevan a otra página, paneles laterales con accesos directos. NO aplica a popovers/tooltips que no tapan visualmente la ruta de fondo.

### Patrón "navegar atrás" con fallback explícito (mayo 2026)

Para botones "← regresar" en páginas que pueden abrirse por flujo natural O por URL directa (compartir, recargar, abrir nueva pestaña). Validado en P2 `PaginaArticuloMarketplace` y P3 `PaginaPerfilVendedor`:

- **`navigate(-1)` solo** falla en entrada directa: `history.length === 1` puede sacar al usuario fuera del sitio o quedar congelado.
- **`navigate('/marketplace')` siempre** ignora el historial real — si vienes del feed → detalle → perfil, la flecha del perfil NO debería sacarte al feed, debería volverte al detalle.

**Patrón con `location.key`** — `react-router-dom` v6 expone `location.key`. La primera location de la sesión tiene `key: 'default'`; las navegaciones internas posteriores generan keys únicos. Esto detecta si hay historial interno SIN tocar `history.length` (que cuenta entradas de otros dominios y no es confiable):

```tsx
const navigate = useNavigate();
const location = useLocation();

const handleVolver = () => {
  if (location.key !== 'default') {
    navigate(-1);  // hay historial interno → equivalente a flecha nativa móvil
  } else {
    navigate('/marketplace');  // entrada directa → fallback explícito
  }
};
```

**Beneficios:**
- Flecha de la app y flecha nativa del celular se comportan idénticamente cuando hay historial.
- Funciona con gesto swipe iOS y botón atrás Android sin código extra.
- Fallback solo se activa cuando es realmente necesario (URL directa).
- No requiere pasar `state.volverA` al navegar — la jerarquía surge naturalmente del historial.

**Aplicar siempre que:** una página pueda recibir tráfico desde links compartidos, OG previews, o ser un destino de recarga manual.

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

- **ScanYA y BS estan unidos por el backend, no por el frontend** — ScanYA usa service directo + state local + callback. BS usa React Query + Zustand. No comparten cache de frontend — el backend es la fuente de verdad. Cuando ScanYA registra una venta, BS se entera al hacer su proximo fetch (maximo 2 min por staleTime). Esto es aceptable porque ScanYA corre en el dispositivo del operador y BS en el dispositivo del dueno. No tiene sentido agregar `invalidateQueries` a ScanYA porque cada tab/dispositivo tiene su propio `QueryClient` en memoria.

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
