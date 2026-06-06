# Sección Negocios — AnunciaYA

Código de **solo la sección Negocios** (tabla en escritorio, tarjetas en móvil y detalle como modal/bottom-sheet), en **claro/oscuro**. El shell (header, sidebar, tab bar) **NO** está incluido: montas estos componentes dentro de tu propio shell.

## Archivos

| Archivo | ¿Va a tu app? | Qué es |
|---|---|---|
| `negocios.jsx` | ✅ | Componentes: `NegociosTable`, `NegociosCards`, `Detail` (expuestos en `window.Negocios`). |
| `negocios.css` | ✅ | Todos los estilos de la sección (tabla, tarjetas, badges, filtros, modal y bottom-sheet). |
| `negocios-data.jsx` | ⚠️ reemplazar | Datos de muestra (21 negocios) + `STATUS` + helpers. Sustituye por tu API. |
| `icons.jsx` | ↔️ opcional | Set de íconos SVG (`window.Icon`). Si ya tienes una librería, mapea los nombres (ver abajo). |
| `negocios-tokens.css` | ❌ referencia | Variables de tema que la sección consume. En tu app ya existen; aquí están los valores exactos (light/dark). |
| `negocios-demo.css`, `negocios-demo.jsx`, `Negocios (demo).html` | ❌ | Harness solo para previsualizar. No forma parte de la sección. |

Para ver el demo: abre `Negocios (demo).html` con cualquier servidor estático (los `.jsx` se transpilan en el navegador). Conmuta Escritorio/Móvil y Claro/Oscuro arriba a la derecha.

---

## Cómo es por dentro

Estos son **prototipos de referencia** (React 18 + Babel standalone, componentes en `window.*`). En tu codebase, recréalos con tus patrones reales (imports/módulos, tu librería de íconos, tu fetch). La estructura y estilos son finales; tradúcelos, no los pegues literal.

### Componentes y props

```jsx
// Escritorio — tabla con toolbar (búsqueda, filtros de estado, vendedor, ciudad, orden) + paginación
<NegociosTable onOpen={(negocio) => setSeleccionado(negocio)} />

// Móvil — buscador, filtros (carrusel) y lista de tarjetas
<NegociosCards onOpen={(negocio) => setSeleccionado(negocio)} />

// Detalle — el MISMO componente sirve para ambos; cambia con `view`:
//   view="desktop" → modal centrado
//   view="mobile"  → bottom sheet (sube desde abajo)
{seleccionado && (
  <Detail biz={seleccionado} view={esMovil ? "mobile" : "desktop"} onClose={() => setSeleccionado(null)} />
)}
```

**Importante sobre `Detail` (overlay):** usa `position: absolute; inset: 0` sobre su **ancestro posicionado más cercano**.
- En escritorio, renderízalo dentro de tu **área de contenido** (con `position: relative`) para que el modal se centre ahí, o a nivel de página si lo quieres sobre todo.
- En móvil, renderízalo dentro del **contenedor de la pantalla del teléfono** (con `position: relative; overflow: hidden`) para que el bottom-sheet quede recortado correctamente abajo.

### Cuándo mostrar tabla vs tarjetas
Decide por breakpoint (sugerido **< 768px → móvil**): renderiza `NegociosCards` en móvil y `NegociosTable` en escritorio. Cada uno maneja sus propios filtros internamente.

---

## Datos (`negocios-data.jsx`)

`window.NegociosData` expone `STATUS`, `BUSINESSES`, `VENDEDORES`, `counts(list)`.

Forma de cada negocio (lo que consumen los componentes):

```js
{
  id: "b2",
  name: "Panadería Tijuana",
  initials: "PT",                 // calculado; o el tuyo
  accent: "#b07a16",              // color del avatar (por categoría)
  cat: "Panadería",
  city: "Puerto Peñasco",         // "—" = sin ciudad
  region: "Por configurar",
  status: "corriente",            // corriente | gracia | suspendido | cancelado
  vendedor: "Diego Salas",        // null = Sin asignar
  owner: { nombre, correo, tel }, // dueño de la cuenta
  dir, tel, web,                  // negocio (web "—" oculta el enlace "Abrir")
  alta, onboarding,               // strings fecha "10 feb 2026" / estado
  vence, proximo, primer,         // membresía (strings; "—" = sin dato)
  tags: ["Pan Dulce", "Birotes"], // chips
}
```

`STATUS` define etiqueta y colores de cada estado de pago:
```js
corriente  → "Al corriente" verde  (#0e8a52)
gracia     → "En gracia"   ámbar   (#d9920a)
suspendido → "Suspendido"  rojo    (#e0322f)
cancelado  → "Cancelado"   gris    (#9aa1ac)
```

Las fechas son **strings** (`"10 feb 2026"`); el orden las parsea con meses en español (`ene…dic`). Si usas `Date`/ISO, ajusta `dnum()` en `negocios.jsx`.

### Filtros y orden (ya implementados, del lado cliente)
- Búsqueda por nombre · estado de pago · vendedor (incl. "Sin asignar") · ciudad (incl. "Sin ciudad").
- Orden: Nombre A–Z/Z–A, Alta (recientes/antiguos), Próximo cobro, Estado de pago.
- Paginación: 20 por página (`PER_PAGE` en `negocios.jsx`).
En producción, mueve filtros/orden/paginación a tu backend si la lista es grande.

### Acciones del detalle
El footer trae **Marcar pagado · Reasignar · Suspender · Cancelar** (en móvil van en 2×2). Hoy son botones sin handler — conéctalos a tus mutaciones/confirmaciones.

---

## Tokens de tema requeridos (`negocios.css` los consume)

La sección no define colores propios: usa estas CSS variables, que deben existir en un ancestro con `data-theme`. Valores exactos en `negocios-tokens.css`:

`--surface`, `--surface-2`, `--border`, `--border-strong`, `--text`, `--text-2`, `--text-3`, `--text-4`, `--brand`, `--brand-contrast`, `--brand-weak`, `--hover`, `--ring`, `--shadow-pop`, `--danger`.

Claro/oscuro se conmuta poniendo `data-theme="light" | "dark"` en tu contenedor de tema (igual que el resto de tu shell). Los colores de **estado de pago** y de **avatares** vienen inline desde los datos, no de tokens.

Tipografía del prototipo: **IBM Plex Sans** (pesos 400–700). La sección hereda la fuente del contenedor; usa la de tu app.

---

## Íconos usados (mapea a tu librería)

`search`, `userSingle`, `userPlus`, `mapPin`, `chevronDown`, `chevronRight`, `check`, `sort`, `store`, `creditCard`, `externalLink`, `checkCircle`, `pauseCircle`, `ban`, `x`.

Si no usas `icons.jsx`, reemplaza `<Icon name="…" />` por tu componente equivalente.

---

## Scrollbars
Tabla, modal/sheet y listas usan el **scrollbar nativo** del navegador (sin estilos custom), para consistencia con el resto del panel.
