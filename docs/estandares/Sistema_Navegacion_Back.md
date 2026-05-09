# Sistema de Navegación Back — AnunciaYA

> Estándar obligatorio para todo botón "← regresar", manejo del back nativo del celular (Android), gesto swipe-back de iOS y flecha "atrás" del navegador desktop.

---

## El Principio Base

La app tiene una **jerarquía conceptual fija** que el back debe respetar SIEMPRE, sin importar cuántos saltos haya dado el usuario:

```
/inicio   (raíz/home, padre de todo)
  ├─ /negocios
  │    └─ /negocios/:sucursalId
  ├─ /marketplace
  │    ├─ /marketplace/articulo/:id
  │    └─ /marketplace/usuario/:id
  ├─ /ofertas
  ├─ /servicios
  ├─ /perfil
  ├─ /guardados
  ├─ /mis-publicaciones
  ├─ /cardya
  ├─ /mis-cupones
  └─ /business-studio
       ├─ /business-studio/dashboard
       ├─ /business-studio/clientes
       ├─ /business-studio/transacciones
       ├─ /business-studio/catalogo
       ├─ /business-studio/promociones (etc.)
```

**Reglas:**

1. Las **secciones top-level** son hermanas, NO anidadas. El back desde cualquiera regresa a `/inicio`, jamás a otra hermana.
2. Los **módulos de Business Studio** son hermanas entre sí. El back desde cualquier módulo regresa a `/inicio`.
3. Las **subrutas** (`/marketplace/articulo/:id`, `/negocios/:sucursalId`, etc.) sí mantienen historial: back regresa al listado padre.
4. Los **modales y overlays** se cierran con back nativo del celular antes de navegar.
5. El back nativo en `/inicio` **NUNCA** desloguea al usuario (Chrome puede minimizarse en Android, eso es OK del SO).

---

## Los 3 Hooks Centralizados

### 1. `useVolverAtras(fallback)`

**Para botones ← de header de página.**

```ts
// apps/web/src/hooks/useVolverAtras.ts
import { useVolverAtras } from '../../hooks/useVolverAtras';

function MiPagina() {
  const handleVolver = useVolverAtras('/marketplace'); // fallback explícito
  return <button onClick={handleVolver}>←</button>;
}
```

**Comportamiento:**

| Situación | Acción |
|---|---|
| `location.key !== 'default'` (hay historial interno) | `navigate(-1)` (idéntico a flecha nativa móvil) |
| `location.key === 'default'` (entrada directa por URL) | `navigate(fallback)` |

**Beneficios:**
- Funciona idéntico al back nativo Android / swipe iOS sin código extra.
- No saca al usuario del SPA si entró por URL compartida.
- Respeta el camino real del usuario (chat → notif → marketplace → ← regresa al chat, no al inicio).

**Aplicado en:**
- `PaginaArticuloMarketplace`, `PaginaPerfilVendedor` (fallback `/marketplace`)
- `PaginaMarketplace`, `PaginaResultadosMarketplace` (fallback `/marketplace`)
- `PaginaNegocios`, `PaginaPerfilNegocio` (fallback `/inicio` y `/negocios`)
- `PaginaCardYA`, `PaginaMisCupones`, `PaginaGuardados` (fallback `/inicio`)
- `HeaderOfertas` (fallback `/inicio`)

---

### 2. `useNavegarASeccion()`

**Para navegación entre secciones top-level y entre módulos de Business Studio.**

```ts
// apps/web/src/hooks/useNavegarASeccion.ts
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';

function MiMenu() {
  const navegar = useNavegarASeccion();
  return <button onClick={() => navegar('/negocios')}>Negocios</button>;
}
```

**Comportamiento (replace condicional):**

| Caso | Tipo | Push o Replace |
|---|---|---|
| `/inicio` → `/negocios` | top-level desde inicio | **push** (back natural a /inicio) |
| `/negocios` → `/ofertas` | top-level → top-level | **replace** (back va a /inicio) |
| `/negocios` → `/inicio` | top-level → /inicio | **replace** (back queda en /inicio) |
| `/marketplace/articulo/X` → `/cardya` | subruta → top-level | **replace** |
| `/business-studio/dashboard` → `/business-studio/clientes` | módulo BS → módulo BS | **replace** |
| `/marketplace` → `/marketplace/articulo/X` | top-level → subruta | **push** (anidación normal) |
| `/negocios` → `/negocios/:sucursalId` | top-level → subruta | **push** (anidación normal) |

**Reglas internas del hook:**

```ts
const debeReemplazar =
  // Caso 1: salto entre top-levels (excepto desde /inicio)
  (esRutaTopLevel(rutaDestino) && rutaActual !== '/inicio')
  // Caso 2: salto entre módulos hermanos de BS
  || (esModuloBS(rutaActual) && esModuloBS(rutaDestino) && rutaActual !== rutaDestino);
```

**Aplicado en:**
- `Navbar.tsx` — flechas de navegación BS, dropdown "Más" (Perfil, Mis Publicaciones, Guardados)
- `MobileHeader.tsx` — flechas de navegación BS móvil
- `MenuDrawer.tsx` — drawer móvil principal (todas las opciones del menú)
- `MenuBusinessStudio.tsx` — sidebar desktop de BS (clicks + Enter del teclado)
- `DrawerBusinessStudio.tsx` — drawer móvil de BS
- `useSwipeNavegacionBS.ts` — swipe horizontal entre módulos BS
- `ToggleModoUsuario.tsx` — redirección a /inicio al cambiar modo
- `WidgetCardYA.tsx` — botón "Ver mis billeteras"
- `CarouselCupones.tsx` — botón "Mis Cupones"
- `PaginaGuardados.tsx` — CTAs empty state ("Ver Ofertas", "Ver Negocios")
- `ModalDetalleCliente.tsx` — botón "Ver historial completo"

**Para `<Link>` y `<NavLink>` declarativos** (no se puede usar el hook):

```tsx
<Link to="/inicio" replace={location.pathname !== '/inicio'} ...>
<NavLink to={item.to} replace={location.pathname !== '/inicio'} ...>
```

Aplicado en:
- Logo del Navbar y MobileHeader (lleva a `/inicio`)
- Tabs del Navbar desktop (Negocios/Ofertas/Marketplace/Servicios)
- Items del BottomNav móvil

---

### 3. `useBackNativo({ abierto, onCerrar, discriminador })`

**Para que modales / overlays / drawers / paneles full-screen se cierren con el back nativo del celular.**

```ts
// apps/web/src/hooks/useBackNativo.ts
import { useBackNativo } from '../../hooks/useBackNativo';

function MiModal({ abierto, onCerrar }) {
  useBackNativo({
    abierto,
    onCerrar: handleCerrarConAnimacion,
    discriminador: '_miModal',
  });
  if (!abierto) return null;
  return <div>...</div>;
}
```

**Cómo funciona:**

1. Al pasar `abierto: true` → push entrada al history con `{ [discriminador]: <id-único> }`.
2. Si el usuario hace back nativo → la entrada se consume → listener detecta `state.[discriminador] !== id` → llama `onCerrar`.
3. Si el modal se cierra por X / ESC / backdrop (`abierto: false`) → cleanup limpia el listener Y hace `history.back()` para limpiar la entrada.
4. **Si el padre desmonta el componente directamente** (patrón `{cond && <Modal/>}` con `cond=false`) → el cleanup function se ejecuta y limpia la entrada igual que en el caso (3). Esta ruta cubre el caso D8: modal cerrado con X custom que llama `onClose` del padre, donde el padre desmonta el modal sin pasar por el ciclo `abierto: false`.
5. **Guard contra race condition con `navigate(...)`** (clave): el `history.back()` del cleanup solo se ejecuta si la entrada propia SIGUE siendo la actual. Si entre el push y el cleanup alguien hizo `navigate(...)`, la entrada ya está enterrada y un back retrocedería la navegación posterior.
6. **Guard contra StrictMode dev**: el `history.back()` del cleanup se difiere con `setTimeout(0)`. En StrictMode el ciclo es mount → cleanup → remount; sin el delay, el back ejecuta antes del remount y cuando el remount pushea su propia entrada, el back encolado consume esa entrada nueva y dispara `onCerrar` instantáneamente (modal se cerraba al abrirlo). Con el delay, si hay remount, el state actual ya no es el del closure y el back se salta. En producción (sin StrictMode) o en desmontaje real, el state sigue siendo el propio y el back se ejecuta.

**Aplicado en:**
- `Modal.tsx` (wrapper base de modales centrados desktop) — discriminador `'_modalUI'`. Cubre TODOS los modales que usan `Modal` como base sin tocar consumidores.
- `ModalImagenes.tsx` — discriminador `'_modalImagenes'`. Antes tenía implementación manual con bug D8; migrado al hook para heredar fixes (D8 + StrictMode guard).
- `DropdownCompartir.tsx` — discriminador `'_dropdownCompartir'`. Permite anidar el dropdown sobre un Modal: el back consume primero el dropdown (entrada superior) y deja el modal abierto.
- `ModalBottom.tsx` (wrapper base de bottom-sheets móviles) — implementación propia con discriminador `'_modalBottom'` (precede al hook, mismo patrón).
- `ChatOverlay.tsx` — implementación propia con 4 capas (`chatyaOverlay`, `chatya`, `panelInfo`, `visorImagenes`). Ver detalle abajo en "ChatOverlay".
- `ModalArticuloDetalle.tsx`, `PanelInfoContacto.tsx`, `PanelPreviewNegocio.tsx`, modales de ScanYA — implementaciones propias previas al hook (probadas, sin bug D8 conocido).

---

## Componentes Clave del Sistema

### `RootLayout.tsx` — Buffer fantasma SPA en `/inicio`

Para que el back nativo del celular en `/inicio` NUNCA desloguee al usuario:

```ts
// useEffect 1: push 2 fantasmas al aterrizar en /inicio
useEffect(() => {
  if (esPreviewIframe || pathname !== '/inicio') return;
  const stateActual = window.history.state as { _anunciayaFantasma?: boolean } | null;
  if (!stateActual?._anunciayaFantasma) {
    window.history.pushState({ _anunciayaFantasma: true }, '');
    window.history.pushState({ _anunciayaFantasma: true }, '');
  }
}, [pathname, esPreviewIframe]);

// useEffect 2: listener popstate empuja otra fantasma cada vez que aterriza en una
useEffect(() => {
  const handler = () => {
    if (window.location.pathname !== '/inicio') return;
    const state = window.history.state as { _anunciayaFantasma?: boolean } | null;
    if (state?._anunciayaFantasma) {
      window.history.pushState({ _anunciayaFantasma: true }, '');
    }
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}, [esPreviewIframe]);
```

**Resultado:**
- En `/inicio`, el usuario puede dar back ilimitadas veces; siempre aterriza en una fantasma con la misma URL `/inicio` y el listener empuja otra encima.
- En el celular Android, eventualmente el OS minimiza Chrome (comportamiento normal del sistema, no del SPA).
- El usuario NO se desloguea ni sale del SPA por accidente.

**Solo aplica en `/inicio`.** En otras rutas el back funciona normal hacia la ruta padre.

---

### `useAuthStore.ts` — Sincronización segura entre pestañas

Cuando una pestaña hace login, el storage event llega a otras pestañas con tokens parcialmente escritos. La lógica antigua interpretaba "logout" y disparaba un ciclo destructivo.

```ts
// SOLO desloguear si esta pestaña YA tenía sesión activa
if (!nuevoAccessToken || !nuevoRefreshToken) {
  if (state.usuario || state.accessToken) {
    state.logout('sesion_expirada');
  }
  return;
}
```

Combinado con `PaginaLanding` que redirige a `/inicio` cuando detecta sesión activa (vía storage event o tras refresh), el flujo multi-pestaña funciona correctamente:

- Pestaña A login → tokens en localStorage.
- Pestaña B (sin sesión) recibe storage event → ignora porque no tenía sesión.
- Cuando llega el segundo storage event con ambos tokens → sincroniza state.
- Si pestaña B refresca → `useEffect` de PaginaLanding detecta autenticación → redirige a `/inicio`.

---

### `ChatOverlay.tsx` — Sistema de 4 capas con history manual

ChatYA NO usa `useBackNativo` directamente. Tiene su propio sistema de `pushState` + `popstate` con 4 capas independientes, una por nivel de profundidad. Cada capa pushea una entrada con su propio key de discriminador y tiene su listener que verifica la presencia del state propio antes de cerrar:

| Capa | State key | Acción al consumir entrada |
|------|-----------|----------------------------|
| 1. Overlay completo (lista) | `{chatyaOverlay: true}` | `cerrarChatYA()` (cierra el overlay completo) |
| 2. Conversación activa | `{chatya: true}` | `volverALista()` (sale del chat sin cerrar overlay) |
| 3. Visor de imágenes | `{visorImagenes: true}` | `setVisorAbierto(false)` |
| 4. Panel info contacto | `{panelInfo: true}` | `setPanelInfoAbierto(false)` |

Adicional en `PanelInfoContacto.tsx`: sub-vista perfil chat con state `{_vistaPerfilChat: id}`.

**Por qué tiene su propio sistema (y no migra a `useBackNativo`):**

1. **Navegación externa** — al click en card de artículo dentro de un mensaje, ChatYA cierra el chat sin disparar `history.back()` (lo que revertiría el `navigate(...)`). Usa flag `navegandoExternoRef` que cada effect de history consulta para saltar el back. El hook genérico no soporta este caso.
2. **Exclusión mutua con ScanYA** — el listener del overlay verifica que `state.scanyaModal` no esté presente antes de cerrar, para no chocar con modales de ScanYA que tienen prioridad superior.
3. **Verificación de capa superior** — cada listener consulta TODOS los state keys de las capas superiores (`history.state?.visorImagenes || history.state?.panelInfo || ...`) antes de cerrar, para que el back se procese correctamente capa por capa sin saltarse niveles.

Si los tests de ChatYA siguen pasando, **no migrar a `useBackNativo`**. Si en el futuro se agrega una 5ª capa, mantener el patrón existente.

---

### `ChatOverlay.tsx` — Navegación externa sin flash visual

Cuando un componente dentro del chat (ej. card de artículo en un mensaje) navega a otra ruta, el overlay debe cerrarse sin que el usuario vea un flash de la ruta anterior.

```ts
// Evento custom: chatya:navegar-externo
useEffect(() => {
  const handler = (e: Event) => {
    const ruta = (e as CustomEvent<string>).detail;
    navegandoExternoRef.current = true;
    flushSync(() => {
      navigate(ruta);  // monta el destino sincrónicamente DEBAJO del overlay
    });
    setTimeout(() => {
      cerrarChatYA();  // overlay desaparece tras 200ms → revela destino ya pintado
      setTimeout(() => { navegandoExternoRef.current = false; }, 100);
    }, 200);
  };
  window.addEventListener('chatya:navegar-externo', handler);
  return () => window.removeEventListener('chatya:navegar-externo', handler);
}, [cerrarChatYA, navigate]);
```

El flag `navegandoExternoRef` se lee en los effects de history (overlay/chat) para evitar que ejecuten `history.back()` durante navegación externa, lo que revertiría el navigate.

---

### `ChatOverlay.tsx` — Modales de detalle SOBRE el chat (sin navegar)

Cuando se hace click en una card de mensaje sistema con subtipo `oferta_negocio` o `articulo_negocio` (chat iniciado desde un negocio), el comportamiento NO es navegar (como en marketplace) sino abrir el modal de detalle SOBRE el chat conservando la conversación abierta.

```ts
// BurbujaMensaje.tsx — handlers de los subtipos de negocio
window.dispatchEvent(
  new CustomEvent('chatya:abrir-detalle-oferta', { detail: { ofertaId } }),
);
// ...y para articulo_negocio:
window.dispatchEvent(
  new CustomEvent('chatya:abrir-detalle-articulo', { detail: { articuloId } }),
);

// ChatOverlay.tsx — listeners
useEffect(() => {
  const handler = async (e: Event) => {
    const ofertaId = (e as CustomEvent<{ ofertaId: string }>).detail?.ofertaId;
    const respuesta = await obtenerDetalleOferta(ofertaId);
    if (respuesta.success) setDetalleOferta(mapearDetalle(respuesta.data));
  };
  window.addEventListener('chatya:abrir-detalle-oferta', handler);
  return () => window.removeEventListener('chatya:abrir-detalle-oferta', handler);
}, []);
```

`ChatOverlay` mantiene state local `detalleOferta` / `detalleArticulo`. Al recibir el evento, hace fetch del detalle vía `obtenerDetalleOferta` / `obtenerDetalleArticulo` y renderiza el modal correspondiente (`ModalOfertaDetalle` / `ModalDetalleItem`) con su z-index (z-75) que tapa al chat (z-50 móvil / z-41 desktop).

**Cuando se abre el modal desde el chat se pasa `negocioUsuarioId={null}`** para que el botón "ChatYA" del modal se oculte (ya estás en una conversación con ese negocio, abrir otro chat sería redundante). El botón WhatsApp sí queda visible.

**Diferencia con marketplace:** la card `articulo_marketplace` SÍ navega (cierra el chat, va al detalle público) porque marketplace es un feed exploratorio. Las cards de negocio no — el usuario ya eligió un negocio específico y quiere conservar el contexto.

---

### `useUiStore.abrirChatYA` — Apertura del chat desde un modal

Caso típico: el usuario está dentro de un modal de detalle (oferta, artículo, item de catálogo) y presiona el botón "ChatYA". El chat debe abrirse encima, los modales abiertos (incluyendo bottom-sheets padre) deben cerrarse, y al cerrar el chat el usuario debe regresar a la ruta original sin pasar por pantallas "muertas" residuales.

#### Por qué es complicado

1. Cuando un modal está abierto, hay 1 entrada en el history con su marca (ej. `{_modalUI: m1}`).
2. Cuando un bottom-sheet contiene un modal anidado, hay 2 entradas: `{_modalBottom: b1}` y `{_modalBottom: b1, _modalUI: m1}` (heredada).
3. Si dejamos esas marcas y el chat se monta encima, el `cleanup` del `useBackNativo` del modal ejecuta `history.back()` al desmontarse, lo que retrocede al state del modal SIN la marca de chat → el listener del overlay interpreta "back genuino" y cierra el chat al instante.
4. Si solo cerramos el modal pero dejamos el bottom-sheet padre abierto, este queda visible TAPANDO el chat (en móvil ModalBottom es z-52 y ChatYA es z-50).
5. Si limpiamos las entradas con `replaceState` para evitar el back, dejamos "fantasmas silenciosos" en el stack que el usuario tiene que consumir con backs adicionales que no cambian la URL.

#### Solución

`abrirChatYA` hace tres cosas en orden:

```ts
abrirChatYA: () => {
  let cuentaMarcas = 0;
  if (typeof window !== 'undefined') {
    const estadoActual = (window.history.state ?? {}) as Record<string, unknown>;
    const llaves = ['_modalUI', '_modalBottom', '_modalImagenes', '_dropdownCompartir'] as const;
    for (const llave of llaves) {
      if (llave in estadoActual) cuentaMarcas++;
    }
    if (cuentaMarcas > 0) {
      // 1. Borrar marcas del state actual con replaceState — el cleanup
      //    del modal verá state.disc !== id y NO ejecutará history.back.
      const estadoLimpio = { ...estadoActual };
      for (const llave of llaves) delete estadoLimpio[llave];
      window.history.replaceState(estadoLimpio, '');
      // 2. Disparar evento para que TODOS los modales abiertos
      //    (incluido el bottom-sheet padre) se cierren.
      window.dispatchEvent(new CustomEvent('chatya:cerrar-modales'));
    }
  }
  // 3. Setear el flag y el conteo: ChatOverlay los usa al cerrar para
  //    saltar las N entradas residuales con history.go(-(1+N)).
  set({
    chatYAAbierto: true,
    chatYAMinimizado: false,
    chatAbiertoDesdeModal: cuentaMarcas > 0,
    fantasmasModalCount: cuentaMarcas,
  });
},
```

`Modal.tsx` y `ModalBottom.tsx` escuchan `chatya:cerrar-modales`:
- **Modal**: llama `handleCerrar` interno (con animación 200ms). El `replaceState` previo borró las marcas, así que el cleanup de `useBackNativo` no hará un back duplicado.
- **ModalBottom**: llama `onCerrar` del padre directo (SIN animación) y limpia `historyPushedRef` antes para no ejecutar `history.back` propio. La animación se omite porque el ModalBottom (z-52) tapa al ChatYA (z-50) durante los 300ms de cierre — instantáneo evita la superposición visual.

`ChatOverlay.tsx` consume las entradas fantasmas al cerrar el chat:

```ts
// Effect cleanup (X / programático)
const ui = useUiStore.getState();
if (ui.chatAbiertoDesdeModal) {
  history.go(-(1 + ui.fantasmasModalCount));
  useUiStore.setState({ chatAbiertoDesdeModal: false, fantasmasModalCount: 0 });
  // Defensivo: si tras el `go` quedó alguna marca residual (timing del
  // browser móvil o conteo corto), consumirla con un back extra.
  setTimeout(() => {
    const stateAhora = (history.state ?? {}) as Record<string, unknown>;
    if ('_modalUI' in stateAhora || '_modalBottom' in stateAhora ||
        '_modalImagenes' in stateAhora || '_dropdownCompartir' in stateAhora) {
      history.back();
    }
  }, 50);
}
```

```ts
// Listener popstate (back nativo)
// El back del usuario ya consumió overlay (1 entrada).
// Aquí consumimos las N restantes con go(-N), no go(-(1+N)).
if (ui.chatAbiertoDesdeModal && ui.fantasmasModalCount > 0) {
  history.go(-ui.fantasmasModalCount);
  useUiStore.setState({ chatAbiertoDesdeModal: false, fantasmasModalCount: 0 });
  // Mismo guard defensivo que arriba.
}
```

#### Reglas

- El reset de `chatAbiertoDesdeModal` y `fantasmasModalCount` lo hace ChatOverlay después de consumir las fantasmas, **no** `cerrarChatYA`. Si `cerrarChatYA` lo reseteara, el effect leería `false` siempre y no haría el `go(-N)`.
- `abrirChatYA` siempre RECALCULA el flag desde cero (true si hay marcas, false si no), así que arrancar con valores residuales del cierre anterior no causa problemas.
- `cerrarTodo` también NO resetea estos campos (mismo motivo).
- El `setTimeout(50)` defensivo cubre el caso edge de browsers móviles donde `history.go(-N)` puede no consumir todas las entradas que pidió.

---

## Recetas para Aplicar el Sistema

### Receta 1 — Nueva página top-level

```tsx
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../hooks/useVolverAtras';

function PaginaNueva() {
  const navigate = useNavigate();
  // Para el botón ← del header
  const handleVolver = useVolverAtras('/inicio');

  return (
    <div>
      <header>
        <button onClick={handleVolver} data-testid="btn-volver-nueva">
          <ChevronLeft />
        </button>
      </header>
      {/* ... */}
    </div>
  );
}
```

**Y agregar la ruta a `apps/web/src/hooks/useNavegarASeccion.ts`:**

```ts
const RUTAS_TOP_LEVEL = new Set<string>([
  '/inicio',
  // ... existentes
  '/nueva-seccion',  // ← agregar aquí
]);
```

---

### Receta 2 — Nuevo modal centrado desktop

```tsx
// Si usa Modal.tsx como base, NO necesitas hacer nada extra.
// El back nativo ya está cubierto automáticamente por useBackNativo
// que vive dentro de Modal.tsx.

import { Modal } from '../ui/Modal';

function MiModalNuevo({ abierto, onCerrar }) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="...">
      {/* contenido */}
    </Modal>
  );
}
```

**Si usas un overlay propio (no `Modal.tsx`):**

```tsx
import { useBackNativo } from '../../hooks/useBackNativo';

function MiOverlayCustom({ abierto, onCerrar }) {
  useBackNativo({
    abierto,
    onCerrar,
    discriminador: '_miOverlay',  // único para este overlay
  });

  if (!abierto) return null;
  return <div className="fixed inset-0 ...">...</div>;
}
```

---

### Receta 3 — Componente que navega entre secciones

```tsx
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';

function MiBoton() {
  const navegar = useNavegarASeccion();
  return <button onClick={() => navegar('/cardya')}>Ir a CardYA</button>;
}
```

**Si usas `<Link>` declarativo y necesitas replace condicional:**

```tsx
import { Link, useLocation } from 'react-router-dom';

function MiLink() {
  const location = useLocation();
  return (
    <Link
      to="/negocios"
      replace={location.pathname !== '/inicio'}
    >
      Negocios
    </Link>
  );
}
```

---

### Receta 4 — Botón dentro de modal que navega Y cierra modal

Este es el caso del botón "Ver historial completo" en `ModalDetalleCliente`. Necesita cerrar el modal Y navegar a otra ruta SIN que el back nativo regrese al modal cerrado.

```tsx
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';

function MiModal({ onCerrar }) {
  const navegarASeccion = useNavegarASeccion();

  const handleClickAccion = () => {
    onCerrar();  // cierra modal → cleanup hace history.back síncrono
    navegarASeccion('/destino');  // detecta replace si aplica
  };

  return <button onClick={handleClickAccion}>Acción</button>;
}
```

**Por qué funciona el orden:**
1. `onCerrar()` → `ModalBottom` (o `useBackNativo` de Modal) hace `history.back()` síncrono → limpia entrada del modal.
2. `navegarASeccion()` → calcula replace (si aplica) → reemplaza la entrada activa con el destino.
3. Stack final limpio: `[..., /inicio, /destino]`. Back → `/inicio`. ✅

---

### Receta 5 — Botón dentro de modal que abre ChatYA

Caso típico: botón "ChatYA" en modal de oferta/artículo/item de catálogo. El chat debe abrirse encima, los modales deben cerrarse, y el back posterior debe regresar a la ruta original.

```tsx
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useUiStore } from '../../stores/useUiStore';

function MiModalDetalle({ onClose, negocioUsuarioId, ... }) {
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatYA = () => {
    if (!negocioUsuarioId) return;

    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: { ... },
      datosCreacion: { ... },
    });
    abrirChatYA();  // ← orquesta TODO (replaceState, dispatchEvent, flag, count)
    onClose();      // cierra el propio modal (puede ser redundante con el dispatchEvent)
  };

  return <button onClick={handleChatYA}>ChatYA</button>;
}
```

**Qué hace `abrirChatYA` automáticamente:**
1. Detecta marcas de modal en el state actual (`_modalUI`, `_modalBottom`, `_modalImagenes`, `_dropdownCompartir`).
2. Cuenta cuántas hay → guarda en `fantasmasModalCount`.
3. Borra las marcas con `replaceState` → el cleanup de `useBackNativo` no ejecutará `history.back()`.
4. Dispara `chatya:cerrar-modales` → todos los modales/bottom-sheets abiertos se cierran.
5. Setea `chatYAAbierto: true` y `chatAbiertoDesdeModal: true`.
6. ChatOverlay pushea overlay + chat encima del state limpio.

**No necesitas:**
- ❌ Limpiar marcas manualmente con `history.replaceState`.
- ❌ Coordinar el cierre del bottom-sheet padre.
- ❌ Trackear cuántas entradas hay en el stack.
- ❌ Hacer `history.back()` antes o después.

Todo lo gestiona `abrirChatYA`. Solo llama `abrirChatTemporal` (para crear la conversación) + `abrirChatYA` (orquesta el resto) + `onClose` (cierra tu propio modal por si el `dispatchEvent` no fue suficiente).

---

## Lista Completa de Archivos del Sistema

### Hooks
- `apps/web/src/hooks/useVolverAtras.ts`
- `apps/web/src/hooks/useNavegarASeccion.ts`
- `apps/web/src/hooks/useBackNativo.ts`

### Infraestructura
- `apps/web/src/router/RootLayout.tsx` — buffer fantasma en `/inicio`
- `apps/web/src/stores/useAuthStore.ts` — sincronización segura entre pestañas
- `apps/web/src/pages/public/PaginaLanding.tsx` — redirect a `/inicio` si autenticado

### Headers de páginas (con flecha ← y `useVolverAtras`)

Móvil + desktop:
- `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`
- `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx`
- `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`
- `apps/web/src/pages/private/marketplace/PaginaResultadosMarketplace.tsx`
- `apps/web/src/pages/private/negocios/PaginaNegocios.tsx`
- `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx`
- `apps/web/src/pages/private/cardya/PaginaCardYA.tsx`
- `apps/web/src/pages/private/cupones/PaginaMisCupones.tsx`
- `apps/web/src/pages/private/guardados/PaginaGuardados.tsx`
- `apps/web/src/components/ofertas/HeaderOfertas.tsx`

### Componentes de navegación con `useNavegarASeccion`
- `apps/web/src/components/layout/Navbar.tsx` — tabs desktop, dropdown "Más", flechas BS
- `apps/web/src/components/layout/MobileHeader.tsx` — logo, flechas BS
- `apps/web/src/components/layout/BottomNav.tsx` — items móvil con NavLink replace
- `apps/web/src/components/layout/MenuDrawer.tsx` — drawer principal móvil
- `apps/web/src/components/layout/MenuBusinessStudio.tsx` — sidebar desktop BS
- `apps/web/src/components/layout/DrawerBusinessStudio.tsx` — drawer móvil BS
- `apps/web/src/components/layout/CarouselCupones.tsx` — botones a `/mis-cupones`
- `apps/web/src/components/layout/WidgetCardYA.tsx` — botón a `/cardya`
- `apps/web/src/components/ui/ToggleModoUsuario.tsx` — redirect a `/inicio`
- `apps/web/src/hooks/useSwipeNavegacionBS.ts` — swipe entre módulos BS
- `apps/web/src/pages/private/business-studio/clientes/ModalDetalleCliente.tsx` — botón "Ver historial"
- `apps/web/src/pages/private/guardados/PaginaGuardados.tsx` — CTAs empty state

### Modales con back nativo
- `apps/web/src/components/ui/Modal.tsx` — usa `useBackNativo` con discriminador `'_modalUI'`, cubre todos los modales centrados desktop que lo usen como base. Listener para `chatya:cerrar-modales` que llama `handleCerrar` con animación.
- `apps/web/src/components/ui/ModalImagenes.tsx` — usa `useBackNativo` con discriminador `'_modalImagenes'` (migrado del manual). Hereda fix D8 + StrictMode guard.
- `apps/web/src/components/compartir/DropdownCompartir.tsx` — usa `useBackNativo` con discriminador `'_dropdownCompartir'`, se anida correctamente sobre cualquier modal.
- `apps/web/src/components/ui/ModalBottom.tsx` — implementación propia con discriminador `'_modalBottom'`. Listener para `chatya:cerrar-modales` que llama `onCerrar` directo (sin animación) para no tapar al ChatYA en móvil.
- `apps/web/src/components/layout/ChatOverlay.tsx` — 4 capas con popstate manual (overlay, chat, panelInfo, visorImagenes). Implementa `chatAbiertoDesdeModal` + `fantasmasModalCount` para limpiar entradas residuales al cerrar.
- `apps/web/src/components/marketplace/ModalArticuloDetalle.tsx`, `apps/web/src/components/chatya/PanelInfoContacto.tsx`, `apps/web/src/components/layout/PanelPreviewNegocio.tsx` — implementaciones propias previas (probadas, sin bug D8 conocido).
- `apps/web/src/stores/useUiStore.ts` — orquesta `abrirChatYA`: limpia marcas con `replaceState`, dispara `chatya:cerrar-modales`, registra `chatAbiertoDesdeModal` y `fantasmasModalCount`.

---

## Reglas Obligatorias

### 1. Botones ← de header

> **Toda página top-level con flecha de regreso DEBE usar `useVolverAtras(fallback)`.**

❌ NO:
```tsx
const handleVolver = () => navigate('/marketplace');
const handleVolver = () => navigate(-1);  // sin fallback es peligroso
```

✅ SÍ:
```tsx
const handleVolver = useVolverAtras('/marketplace');
```

### 2. Navegación entre secciones top-level

> **Toda navegación a una sección top-level DEBE usar `useNavegarASeccion()` o `<Link replace={location.pathname !== '/inicio'}>`.**

❌ NO:
```tsx
navigate('/cardya');  // push siempre, contamina el historial
```

✅ SÍ:
```tsx
const navegar = useNavegarASeccion();
navegar('/cardya');  // replace automático cuando aplica
```

### 3. Modales y overlays full-screen

> **Todo modal/overlay/drawer DEBE soportar back nativo del celular.**

- Si usa `<Modal>` como base → automático.
- Si usa `<ModalBottom>` o `<ModalAdaptativo>` como base → automático.
- Si tiene implementación propia → debe usar `useBackNativo` con discriminador único.

### 4. Subrutas dentro de un módulo

> **Las subrutas (`/marketplace/articulo/:id`, `/negocios/:sucursalId`, `/business-studio/<modulo>`) usan PUSH normal.**

El comportamiento natural del back es regresar al listado padre. NO usar replace aquí.

### 5. Agregar nueva sección top-level

> **Si se agrega una sección top-level nueva, actualizar `RUTAS_TOP_LEVEL` en `useNavegarASeccion.ts`.**

Sin esto, el hook NO detectará la nueva sección como hermana y no aplicará replace.

### 6. Cambios en módulos de Business Studio

> **Los módulos de BS (`/business-studio/*`) son detectados por prefix automáticamente.**

No hace falta listar cada módulo nuevo — basta con que la ruta empiece con `/business-studio/` para que `esModuloBS()` lo reconozca.

---

## Casos Cubiertos (Test Matrix)

### A. Flechas ← de headers
- ✅ A1. `/inicio` → back nativo varias veces → no desloguea (Chrome puede minimizarse).
- ✅ A2. `/inicio → /negocios → ←` → `/inicio`.
- ✅ A3-A12. Mismo patrón para todas las top-level.

### B. URL directa / link compartido
- ✅ B1. `/marketplace/articulo/X` directo → ← → fallback `/marketplace`.
- ✅ B2. `/marketplace/usuario/Y` directo → ← → fallback `/marketplace`.
- ✅ B3. F5 en cualquier ruta → ← respeta su fallback.
- ✅ B4. F5 en `/inicio` → back nativo → no desloguea.

### C. Flecha nativa móvil (Android back / swipe iOS)
- ✅ C1. Comportamiento idéntico al ← del header en TODOS los flujos.
- ✅ C2. Múltiples backs en `/inicio` → nunca desloguea.

### G. Navegación entre top-level con replace
- ✅ G1. `/inicio → /negocios → /ofertas → ←` → `/inicio` (no /negocios).
- ✅ G2. `/inicio → /marketplace → /cardya → ←` → `/inicio`.
- ✅ G3. `/inicio → /negocios → click logo → ←` → se queda en `/inicio`.
- ✅ G4-G11. Otras combinaciones — todas regresan a `/inicio`.

### BS. Business Studio
- ✅ BS-6. `/negocios → BS → módulo → ←` → `/inicio`.
- ✅ BS-8. `/inicio → BS/transacciones → tab Ofertas → ←` → `/inicio`.
- ✅ BS-9. Cadena intercalada de top-levels y módulos BS → ← → `/inicio`.
- ✅ BS-14. `/business-studio/transacciones` → modal detalle → back → cierra modal → otro back → `/inicio`.
- ✅ BS-15-20. Modales en BS, swipe entre módulos, drawer, sidebar, teclado.
- ✅ Caso especial: ModalDetalleCliente "Ver historial completo" → `/business-studio/transacciones` → ← → `/inicio` (no a clientes).

### D. Modales con back nativo
- ✅ D1-D7. Modales del feed público (oferta, artículo, imagen, ubicación, perfil contacto, etc.) cierran con back nativo / flecha del navegador.
- ✅ D8. Modal cerrado con **X custom** del componente o **click en backdrop** → padre desmonta el modal directamente con `{cond && <Modal/>}` → el cleanup de `useBackNativo` limpia la entrada del history. El siguiente back nativo respeta correctamente la jerarquía. **Fix**: mover `history.back()` al cleanup function del effect (antes vivía en la rama `if (!abierto)`, que no se ejecuta en desmontaje directo). Diferido con `setTimeout(0)` para sobrevivir el ciclo mount → cleanup → remount de StrictMode dev.
- ✅ D9a. Modal de oferta → click en logo del negocio → navega a `/negocios/<id>` (cierra modal). Back nativo → vuelve a `/ofertas`.
- ✅ D9b. Modal de oferta → botón Compartir abre `DropdownCompartir`. Back nativo cierra solo el dropdown (manteniendo el modal abierto). Otro back cierra el modal. **Fix**: agregar `useBackNativo` con discriminador propio `'_dropdownCompartir'` distinto del `'_modalUI'` del Modal.
- ✅ D9c. Modales anidados reales (ej. modal de catálogo en perfil de negocio → modal de detalle de artículo encima). Back nativo cierra capa por capa hasta volver a la página.
- ✅ D10. `ModalImagenes` (visor de imágenes) cerrado con X o backdrop → back nativo respeta jerarquía. **Fix**: refactorizado de implementación manual de `pushState`/`popstate` al hook `useBackNativo` con discriminador `'_modalImagenes'`. Antes sufría el mismo bug D8 al desmontarse directamente.
- ✅ D11. **Tooltips solo en PC** (regla UX, no bug de back). En móvil `<Tooltip>` retorna `<>{children}</>` sin handlers ni portal porque (a) no hay hover táctil, (b) los tooltips por touch quedan colgados tapando controles del modal. Implementado con guard `if (esMobile) return <>{children}</>` en `Tooltip.tsx`.

### E. ChatYA — jerarquía interna
- ✅ E1. ChatYA cerrado en `/inicio` → abre ChatYA → back nativo → cierra ChatYA, queda en `/inicio`.
- ✅ E2. ChatYA en lista → entra a una conversación → back nativo → vuelve a la lista (NO cierra ChatYA). Otro back → cierra ChatYA.
- ✅ E3. Conversación → tap header del contacto → abre Panel info. Back nativo → cierra panel, vuelve a la conversación. Cadena completa con backs sucesivos hasta cerrar ChatYA.
- ✅ E4. Conversación con imágenes → tap imagen → abre Visor. Back nativo → cierra visor, vuelve a la conversación. Cadena completa con backs sucesivos hasta cerrar ChatYA.
- ✅ E5. Cadena completa: lista → conversación → panel info → visor → 4 backs → cierra capa por capa hasta volver a la ruta donde se abrió el chat.

### F. Casos cruzados
- ✅ F1. `/negocios` → abre ChatYA → entra a conversación con card de artículo → click en card → `flushSync(navigate)` + delay 200ms → cierra ChatYA + navega a `/marketplace/articulo/X` sin flash visual. Back nativo → vuelve a `/negocios` (NO al chat, porque la entrada del chat se limpió).
- ✅ F2. `/negocios` con toggle Mapa/Lista (state local, NO sincronizado con history) → cambia toggle → abre ChatYA encima → back 1 cierra ChatYA (sigue en `/negocios` con el toggle actual) → back 2 vuelve a `/inicio`. Al re-entrar a `/negocios`, el `useState` se reinicia al default — el toggle no persiste entre desmontajes (comportamiento esperado).
- ✅ F3. **Abrir ChatYA desde un modal** (`/negocios/<id>` → modal de oferta → click "ChatYA" en el modal). El chat se abre con la conversación activa. `abrirChatYA` detecta la marca `_modalUI` en el state, hace `replaceState` para borrarla, dispara `chatya:cerrar-modales` para cerrar visualmente el modal, y registra `chatAbiertoDesdeModal=true` con `fantasmasModalCount=1`. Al cerrar el chat, ChatOverlay hace `history.go(-(1+1))` para saltar overlay + 1 fantasma → regresa directo a `/negocios/<id>`.
- ✅ F4. **Abrir ChatYA desde modal anidado en bottom-sheet** (`/negocios/<id>` → bottom-sheet de catálogo/ofertas → modal de detalle encima → click "ChatYA"). Mismo flujo que F3 pero con `fantasmasModalCount=2` (`_modalBottom` + `_modalUI` heredados). El listener en `Modal` cierra el modal con animación; el listener en `ModalBottom` cierra sin animación (z-52 vs z-50 evita tapar al ChatYA durante los 300ms). Al cerrar, ChatOverlay hace `history.go(-(1+2))` saltando overlay + 2 fantasmas. Guard `setTimeout(50)` defensivo verifica si quedó marca residual y consume con back extra.
- ✅ F5. **Cerrar ChatYA con X intermedia tras abrirlo desde modal** — el reset de `chatAbiertoDesdeModal` y `fantasmasModalCount` se hace en `ChatOverlay` después de consumir las fantasmas, NO en `cerrarChatYA`. Si se reseteara antes, el effect de cierre leería `false` y haría `history.back()` simple en lugar de `go(-(1+N))`, dejando al usuario en pantalla muerta.
- ✅ F6. **Click en card de oferta/artículo dentro del chat** (subtipos `oferta_negocio` y `articulo_negocio`) — despacha evento `chatya:abrir-detalle-oferta` o `chatya:abrir-detalle-articulo`. `ChatOverlay` hace fetch del detalle y monta el modal correspondiente SOBRE el chat (z-75 vs z-50). El chat sigue activo, no se cambia de ruta. Al cerrar el modal con X/backdrop/back nativo, el chat queda en la misma conversación. Marketplace mantiene navegación al detalle público (caso F1).
- ✅ F7. **Reuso de conversación persona ↔ negocio** — abrir ChatYA desde 2 ofertas/artículos de **distintas sucursales** del mismo negocio reusa la misma conversación. Backend `crearObtenerConversacion` ignora `participante2SucursalId` cuando es chat persona↔comercial (manteniendo el filtro estricto en chats inter-sucursal `comercial↔comercial`). Documentado en `ChatYA.md` §4.13.1.
- ✅ F8. **Sonido de notificación NO se reproduce en mensajes `tipo='sistema'`** — los 4 subtipos (cards de marketplace, oferta_negocio, articulo_negocio, contacto_perfil) se emiten por Socket.io a ambos participantes al crear conversación. `useChatYAStore` filtra con `mensaje.tipo === 'sistema'` antes de llamar `reproducirSonidoNotificacion`. Consistente con que tampoco generan badge.

### Multi-pestaña + login
- ✅ 2 pestañas en `/` → login en una → ambas autenticadas (la otra redirige a `/inicio` al refresh).
- ✅ Logout en una pestaña → la otra detecta y desloguea correctamente.
- ✅ NO se dispara ciclo destructivo de logout entre pestañas.

### ChatYA — navegación externa
- ✅ Click en card de artículo dentro del chat → cierra chat con `flushSync(navigate)` + delay 200ms → no flash visual.

---

## Anti-patrones (lo que NO hacer)

### ❌ Manipular `history` directamente para navegar entre rutas

```tsx
// MAL — React Router pierde sincronización con la URL
window.history.replaceState({}, '', '/inicio');
```

✅ Usar `navigate(...)` o los hooks centralizados.

### ❌ Llamar `navigate(-1)` sin fallback

```tsx
// MAL — saca al usuario fuera del SPA si entró por URL directa
const handleVolver = () => navigate(-1);
```

✅ Usar `useVolverAtras(fallback)`.

### ❌ Cerrar modal Y navegar en orden inverso

```tsx
// MAL — el cleanup del modal hace history.back DESPUÉS del navigate
// y reverte la navegación
const handle = () => {
  navigate('/destino');
  onCerrar();
};
```

✅ Cerrar primero, navegar después. El cleanup limpia su entrada antes del navigate.

### ❌ Modal sin discriminador único en `useBackNativo`

```tsx
// MAL — modales anidados se confunden entre sí
useBackNativo({ abierto, onCerrar });  // discriminador default '_back_modal'
useBackNativo({ abierto, onCerrar });  // mismo discriminador → conflicto
```

✅ Cada modal debe pasar un discriminador específico cuando puedan anidarse:
```tsx
useBackNativo({ abierto, onCerrar, discriminador: '_modalArticulo' });
useBackNativo({ abierto, onCerrar, discriminador: '_modalUbicacion' });
```

### ❌ Usar push para navegar entre top-levels

```tsx
// MAL — back desde la nueva sección regresa a la anterior, no a /inicio
const handle = () => navigate('/ofertas');
```

✅ Usar `useNavegarASeccion` o `<Link replace>`.

### ❌ Olvidar agregar nueva sección top-level a la lista del hook

```ts
// useNavegarASeccion.ts
const RUTAS_TOP_LEVEL = new Set<string>([
  '/inicio',
  '/negocios',
  // ... olvidaste agregar /vacantes
]);
```

Resultado: la sección nueva no se trata como hermana y el back no respeta la jerarquía.

### ❌ Resetear flags de history en `cerrarChatYA` o `cerrarTodo`

```ts
// MAL — el effect de cierre leerá el flag como `false` y no hará go(-N)
cerrarChatYA: () => {
  set({ chatYAAbierto: false, chatAbiertoDesdeModal: false });
},
```

✅ Dejar el reset al consumidor que SÍ ejecuta el `go(-N)`:

```ts
cerrarChatYA: () => {
  set({ chatYAAbierto: false });  // sin tocar flags de history
},
// ChatOverlay.tsx después del go(-N):
useUiStore.setState({ chatAbiertoDesdeModal: false, fantasmasModalCount: 0 });
```

### ❌ Ignorar bottom-sheets padre al abrir overlays superiores

```ts
// MAL — el bottom-sheet (z-52) tapa al ChatYA (z-50) en móvil
abrirChatYA: () => {
  set({ chatYAAbierto: true });
  // bottom-sheet sigue visible encima del chat
},
```

✅ Disparar evento `chatya:cerrar-modales` y dejar que cada modal/bottom-sheet escuche y se cierre:

```ts
abrirChatYA: () => {
  window.dispatchEvent(new CustomEvent('chatya:cerrar-modales'));
  set({ chatYAAbierto: true });
},
// ModalBottom.tsx: cerrar SIN animación (z-52 vs z-50)
useEffect(() => {
  if (!abierto) return;
  const handler = () => {
    historyPushedRef.current = false;
    if (popStateHandlerRef.current) {
      window.removeEventListener('popstate', popStateHandlerRef.current);
    }
    onCerrar();  // padre desmonta directo
  };
  window.addEventListener('chatya:cerrar-modales', handler);
  return () => window.removeEventListener('chatya:cerrar-modales', handler);
}, [abierto, onCerrar]);
```

---

## Decisiones Arquitectónicas

### Por qué buffer fantasma SOLO en `/inicio`

Push 2 fantasmas en cada navegación causaría:
- Stack hinchado con muchas entradas residuales.
- El back legítimo (ej. de `/marketplace` a `/inicio`) requeriría dar back varias veces para superar las fantasmas.

Solo aplicar fantasma en `/inicio` cubre el caso crítico (no perder sesión por back accidental) sin interferir con el resto de la navegación.

### Por qué replace en lugar de push para top-levels hermanos

El historial real del navegador **representa la jerarquía conceptual de la app**, no el orden cronológico de clicks del usuario. Si el usuario navega por 5 secciones top-level, espera que el back lo lleve "afuera" (al inicio), no al recorrido completo en reversa.

### Por qué `flushSync` + `setTimeout` en `chatya:navegar-externo`

Sin `flushSync`, el cambio de location de React Router puede no estar pintado cuando el overlay se cierra → flash de la ruta anterior. Con `flushSync(navigate)` el componente destino se monta **debajo del overlay** sincrónicamente, y el `setTimeout(200ms)` da tiempo al paint del browser antes de revelarlo.

### Por qué el guard `state.usuario || state.accessToken` en el handler de storage

Sin esa guarda, una pestaña sin sesión interpreta cualquier escritura parcial de tokens como "logout" y dispara su propio logout que borra los tokens recién escritos en otra pestaña. Resultado: ciclo destructivo donde nadie queda autenticado.

### Por qué `replaceState` + conteo de marcas + `go(-(1+N))` en lugar de `history.back()` síncrono

Cuando se abre ChatYA desde un modal, hay 3 alternativas para coordinar el history:

1. **Hacer `history.back()` por cada modal abierto antes de abrir el chat.** Problema: el back es asíncrono. Si el ChatOverlay effect pushea `overlay` y `chat` antes de que se procesen los backs, el browser termina saltando entradas equivocadas (potencialmente cierra el chat recién abierto). Timing impredecible, race conditions.

2. **Limpiar marcas con `replaceState` y dejar las entradas fantasma.** Estable y predecible: el state actual queda sin marcas → el cleanup del modal no ejecuta `back()` duplicado. Pero deja N entradas residuales en el stack que el usuario tiene que consumir con backs adicionales que no cambian la URL ("pantallas muertas").

3. **Combinación: `replaceState` + tracker (flag + count) + `go(-(1+N))` al cerrar.** Mejor de los dos mundos: estable al abrir (sin race conditions del back asíncrono) y al cerrar el chat saltamos overlay + N fantasmas en un solo brinco para dejar al usuario directo en la ruta original. Esta es la opción que usa el sistema.

### Por qué `setTimeout(50)` defensivo después de `go(-N)`

Algunos navegadores móviles (Android Chrome en particular) pueden no consumir todas las entradas que pide `history.go(-N)` cuando hay listeners intermedios o pushes pendientes en el mismo tick. La verificación con `setTimeout(50)` lee el state actual y, si quedó alguna marca de modal, ejecuta un `history.back()` extra para consumirla:

```ts
setTimeout(() => {
  const stateAhora = (history.state ?? {}) as Record<string, unknown>;
  if ('_modalUI' in stateAhora || '_modalBottom' in stateAhora ||
      '_modalImagenes' in stateAhora || '_dropdownCompartir' in stateAhora) {
    history.back();
  }
}, 50);
```

Es un guard idempotente: si el `go(-N)` consumió todo correctamente (caso ideal), no encuentra marca y no hace nada. Si quedó residual (caso edge móvil), lo limpia. Sin sobre-consumir en los casos que ya funcionan.

### Por qué el listener `chatya:cerrar-modales` cierra `Modal` con animación pero `ModalBottom` sin animación

- **`Modal` (centrado desktop)**: usa `z-50` o similar. El ChatYA en móvil usa `z-50` también, pero los modales centrados no son fullscreen — la animación de cierre (200ms fade+scale) no tapa al chat. Mantener animación es mejor UX.
- **`ModalBottom` (bottom-sheet móvil)**: usa `z-52`. El ChatYA en móvil usa `z-50`. Si el bottom-sheet animara su cierre durante 300ms, taparía al chat completo durante ese tiempo (overlay oscuro + sheet visible). Cerrar instantáneamente con `onCerrar` directo del padre evita la superposición visual: el bottom-sheet desaparece y el chat queda visible al instante.

### Por qué `Tooltip` es no-op en móvil

En táctil no existe `mouseenter`/`mouseleave`, solo `touchstart`. Si el tooltip se activa con touch, queda "colgado" hasta que el usuario haga tap fuera, lo que en modales es molesto y tapa controles cercanos (botones de WhatsApp, ChatYA, etc.). La regla global es: **tooltips solo en >= 1024px**. El componente usa `useBreakpoint()` y retorna `<>{children}</>` sin handlers ni portal cuando `esMobile` es true, sin necesidad de breakpoint manual en el caller.

---

## Pendientes / Backlog

Ninguno conocido. Todos los flujos críticos (A-G + BS + D + E + F) están cubiertos en la matriz de tests. Si surge un nuevo escenario, agregarlo a la sección correspondiente y mantener el patrón:
- Modales nuevos → usar `useBackNativo` con discriminador propio si pueden anidarse sobre otros.
- Componentes con sub-vistas (dropdowns, popovers) que tapen al padre → también deben usar `useBackNativo` para que el back consuma capa por capa.
- ChatYA: si se agrega una 5ª capa, mantener el patrón manual del `ChatOverlay.tsx` (no migrar a `useBackNativo` por los casos especiales documentados).

---

## Referencias

- Implementación: commit `7bcd4d4` (`feat(web,api): sistema unificado de navegación back + fix sincronización auth multi-pestaña`).
- Relacionado: `docs/estandares/LECCIONES_TECNICAS.md` (lección "Patrón navegar atrás con fallback explícito" + "Navegación desde un overlay sin flash visual").
- Tokens y consideraciones de UI: `docs/estandares/TOKENS_GLOBALES.md` (z-index del ChatOverlay vs. toggles flotantes).
