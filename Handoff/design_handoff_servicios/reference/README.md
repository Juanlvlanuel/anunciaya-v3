# Referencia visual

Estos archivos son los **prototipos originales** en HTML + JSX (Babel runtime, no TypeScript).
**Son la fuente canónica de verdad visual** — si algo no cuadra al reimplementar en TS,
abre `index.html` localmente y compara.

```bash
# Servir localmente:
npx serve .
# o
python3 -m http.server 8000
```

Luego abre `http://localhost:8000/` para ver el design canvas con las 6 secciones.

## Mapeo prototipo → TSX

| Prototipo (.jsx)     | Componentes TSX equivalentes en `../components/` y `../screens/`             |
| -------------------- | ---------------------------------------------------------------------------- |
| `shared.jsx`         | `icons.tsx` · `ServiciosHeader.tsx` · `OfreceToggle.tsx` · `Chip.tsx` · `FAB.tsx` · `ContactBar.tsx` · `cards/*` |
| `feed.jsx`           | `screens/FeedScreen.tsx`                                                     |
| `detalle.jsx`        | `screens/DetalleScreen.tsx`                                                  |
| `wizard.jsx`         | `screens/PublicarScreen.tsx`                                                 |
| `perfil.jsx`         | `screens/PerfilScreen.tsx`                                                   |
| `buscador.jsx`       | `screens/BuscarScreen.tsx` (BuscadorOverlay + ResultadosScreen)              |
| `cards.jsx`          | (página de documentación visual, no se traduce a producción)                 |

## Notas

- Los prototipos usan **lucide-style SVG inline**. En producción TSX usamos `lucide-react`
  (ver `../components/icons.tsx`).
- El **navbar global** que aparece en los prototipos (con location pill, search, tabs de
  sección y avatar) **ya existe en producción** — no lo reimplementes.
- Los prototipos usan **Tailwind CDN**. Tu codebase usa Tailwind compilado (ver
  `../tailwind.config.snippet.ts`).
