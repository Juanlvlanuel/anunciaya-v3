# Panel Admin — Tokens y Sistema de Diseño

> **Qué es:** el sistema de diseño del **Panel** (`apps/admin`) — colores, tipografía, radios,
> sombras, componentes base y reglas visuales. Es la **referencia única** para construir cualquier
> sección nueva del Panel con el mismo estilo.
>
> ⚠️ **NO confundir con la app pública.** `docs/estandares/TOKENS_GLOBALES.md` y
> `TOKENS_COMPONENTES.md` son de **`apps/web`** (la app de AnunciaYA). El Panel es una app aparte
> con su **propio** estilo y **no** los usa. Este documento es el equivalente, pero del Panel.
>
> **Referencia visual canónica:** el módulo **Negocios** (`apps/admin/src/components/negocios/`).
> Cualquier módulo nuevo se calca de él.
>
> **Fuente de verdad de los tokens:** `apps/admin/src/index.css` (bloque `@theme` + variables de
> tema). Si cambias un token, se cambia **ahí** y se actualiza esta tabla (misma regla de oro que
> los demás docs: el código manda, el doc lo refleja).
>
> **Última actualización:** 7 Julio 2026 (ronda de **consistencia visual** — ver §5: `TabsSegmento`
> unificado para los tabs de sección; badges de conteo en tabs, chips, dropdowns (`MenuFiltro` con
> punto+conteo) y en el **menú lateral**; barra de controles en **una sola línea**; **botón de creación
> primario único**; KPIs compactos en barra; conteos **"faceted"** en backend; botón "contador con
> círculo" reusado en Auditoría).

---

## 0. Cómo funcionan los tokens (Tailwind v4)

- Las utilidades de color se generan desde **`@theme inline`** en `index.css`, **no** desde
  `tailwind.config.js` (ese archivo solo acota el escaneo de clases). Cada token mapea a una
  variable de tema (`--panel-*`), así el color cambia solo al alternar claro/oscuro.
- **Tema claro/oscuro:** atributo **`data-tema`** en `<html>` (`claro` / `oscuro`). Las variables
  CSS cambian de valor; las utilidades no cambian de nombre.
- **Tipografía:** **IBM Plex Sans** (texto) e **IBM Plex Mono** (badges/código). Peso base **500**.

---

## 1. Color

Utilidades en español (Tailwind: `bg-`, `text-`, `border-` según corresponda) → variable → valor en
cada tema. Tomado de `index.css`.

| Utilidad | Para qué | Claro | Oscuro |
|---|---|---|---|
| `lienzo` | Fondo de la app (canvas) | `#e5f1ff` | `#06070b` |
| `superficie` | Tarjetas, modales, paneles | `#ffffff` | `#0d0e12` |
| `superficie-2` | Superficie alterna (zonas sutiles) | `#f7f9fc` | `#14151a` |
| `barra` | Header negro / barra superior | `#0e0f13` | `#0e0f13` (fija) |
| `borde` | Bordes (grosor 1.5px, ver §3) | `#d2d6df` | `#383c45` |
| `borde-fuerte` | Bordes marcados (botón secundario, paginación) | `#bdc2ce` | `#474c57` |
| `campo` | Fondo de inputs | `#f4f6fa` | `#1f232b` |
| `campo-borde` | Borde de inputs | `#c9ced9` | `#41454f` |
| `texto` | Texto principal | `#0a0a0b` | `#f2f3f5` |
| `texto-2` | Texto secundario | `#45454a` | `#a4a7af` |
| `texto-3` | Terciario / labels | `#5f6168` | `#9499a1` |
| `texto-4` | Placeholder / deshabilitado | `#82838b` | `#7d818a` |
| `marca` | Azul de marca (acento único) | `#2563eb` | `#5a8dff` |
| `marca-2` | Azul oscuro (gradiente/decorado) | `#1a36ad` | `#2f6bf0` |
| `marca-contraste` | Texto/ícono sobre fondo marca | `#ffffff` | `#0b1220` |
| `marca-suave` | Fondo hover/activo del acento | marca 11% | (recalcula con marca oscura) |
| `peligro` | Acción destructiva | `#e0322f` | `#ff6360` |
| `peligro-suave` | Fondo destructivo sutil | peligro 12% | (recalcula) |
| `ok` | Éxito / positivo | `#0e8a52` | `#34c77b` |
| `ok-suave` | Fondo positivo sutil (botones de acción en verde) | ok 13% | ok 18% |
| `etiqueta-grupo` | Encabezado de grupo de menú | `#0431b9` | `#0431b9` |

**Variables sin utilidad** (se usan con `var()` en clases arbitrarias, p. ej. focus de inputs):
- `--panel-hover` (marca 13%) → anillo de foco corto: `focus:[box-shadow:0_0_0_3px_var(--panel-hover)]`
- `--panel-ring` (marca 32%) → anillo de foco amplio: `focus:[box-shadow:0_0_0_4px_var(--panel-ring)]`
- `--panel-bg` (`#f5f6f8` / `#050506`) — fondo base alterno.
- `--panel-warn` (`#b7791f` / `#e0a020`) y `--panel-warn-weak` (warn 15% / 20%) — **ámbar de
  advertencia** (estado "lento" de salud, avisos no destructivos). Estrenado en Mantenimiento. Se usa
  inline: `style={{ color: 'var(--panel-warn)', background: 'var(--panel-warn-weak)' }}`.

> **Regla de acento:** neutro (lienzo/superficie/texto) + **un** acento (`marca`). Nada de paletas
> pastel saturadas. El `peligro` solo para destructivo; el `ok` solo para estados positivos; el
> `--panel-warn` (ámbar) solo para advertencias / estado intermedio (p. ej. un servicio "lento").

---

## 2. Tipografía

- **`font-sans`** → IBM Plex Sans · **`font-mono`** → IBM Plex Mono (badges, códigos, datos monoespaciados).
- **Peso base 500.** Jerarquía por **peso** (500 / 600 / 700), no por saltos grandes de tamaño.
- **Tamaños usados en Negocios** (densos, B2B): `text-sm` (14px) para cuerpo · `text-[13.5px]` /
  `text-[13px]` para tablas/fichas/diálogos · `text-[11px]` (mono) para badges/etiquetas pequeñas.
- **Vista móvil (táctil):** piso de **14px** para el texto y **12.5px** para badges/contadores
  (clase `.txt-badge`); íconos **+18%**. Solo `<1024px`, centralizado en `index.css` — ver **§9.1**.

---

## 3. Radios (`rounded`)

| Radio | Dónde se usa |
|---|---|
| `rounded-full` | Chips de estado, buscador, pills, contadores |
| `rounded-[12px]` | Contenedor de modal/diálogo, dropdowns |
| `rounded-[11px]` | Inputs (login) |
| `rounded-[10px]` | Inputs y botones de diálogo (lo más común) |
| `rounded-[9px]` | Botones de paginación, ítems de menú/dropdown |

> **Grosor de borde: 1.5px** — variable `--grosor-borde` en `index.css`, que sobrescribe (sin `@layer`,
> para ganar sobre Tailwind) las utilidades `border` / `border-t/b/l/r` / `border-x/y` y `lg:border-t`
> de **todo** el Panel desde un solo lugar. `border-2`+ se reserva para casos puntuales (ej. el input
> del código 2FA). Sin bordes gruesos tipo videojuego.

---

## 4. Sombras

- **`shadow-tarjeta-panel`** — tarjetas / superficies flotantes (panel "inset" del escritorio).
- **`shadow-pop-panel`** — dropdowns, menús, popovers.

---

## 5. Patrones de componente (calcados de Negocios)

**Botones**
- **Primario:** `bg-marca text-marca-contraste` (+ `hover:brightness-105`, `active:translate-y-px`).
- **Secundario:** `border border-borde-fuerte bg-superficie text-texto hover:bg-marca-suave`.
- **Peligro:** variante destructiva con `peligro`.
- **Deshabilitado:** `disabled:opacity-50 disabled:cursor-not-allowed` (en paginación se usa `opacity-45`).
- **Creación (primario con ícono) — patrón ÚNICO.** Todo botón que **da de alta** una entidad ("Nueva
  categoría", "Registrar", "Registrar negocio", "Crear región", "Dar de alta") comparte el MISMO estilo y
  tamaño para leerse como el mismo control en todas las secciones:
  `group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-marca px-3.5 py-2 text-[13px]`
  `font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03]`
  `hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95`. Ícono a la izquierda
  **16px** con rotación en hover (`<Plus size={16} className="… group-hover:rotate-90" />`; en alta de
  **persona** se usa `UserPlus 16` sin rotación). Va **al final** de la barra de controles (`ml-auto`).
  Referencia canónica: "Nueva categoría" en Categorías.

**Inputs**
```
border border-campo-borde bg-campo text-texto placeholder:text-texto-4
focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]
```
Variante de anillo amplio (login/seguridad): `focus:[box-shadow:0_0_0_4px_var(--panel-ring)]`.

**Header / barra negra:** vive sobre `bg-barra` (negro fijo) → usa **blancos translúcidos**
(`text-white/90`, `/70`, `/60`, `bg-white/10`, `border-white/15`), **no** los tokens de tema. El
menú que despliega sí vuelve a `superficie` clara. Es el caso típico de **variante móvil/desktop**.

**`data-testid` obligatorio** en todo elemento interactivo (igual que en la app).

**Vista de detalle (master-detail) vs. modal** — *cuándo cada uno*
- **Ficha en modal/drawer** (`ModalAdaptativo`): patrón por defecto para ver UNA entidad con datos
  **acotados** (Negocios, Usuarios, Suscripciones, Equipo).
- **Vista de detalle full-width** (master-detail): para entidades **data-heavy** cuyo detalle crece en
  secciones (cartera + comisiones + pagos + cortes). Al abrir una fila, una vista a pantalla completa
  **reemplaza la lista** (no un modal), con botón **"Volver"** ligado a `useBackNativo({ abierto: true, onCerrar })`.
  Da espacio real y en móvil es mejor que un bottom-sheet abarrotado. **Estrenado por "Vendedores y
  comisiones"** (`components/vendedores/DetalleVendedor.tsx`); el propio vendedor ve "Mis comisiones" con
  el **mismo cuerpo** a pantalla completa. Implementación: estado `entidadAbierta` en la sección → si
  `!= null`, `return <Detalle… />` en lugar de la lista; las listas internas (la cartera) **paginan**.
- **Los modales/diálogos NO desaparecen:** se reservan para **acciones puntuales** (registrar pago,
  confirmar entrega de efectivo, editar datos, confirmar) — también dentro de un módulo con vista de
  detalle. Regla simple: **modal para *actuar*, vista para *consultar a fondo*.**

**Acordeón de secciones (estrenado en Configuración)** — agrupa ajustes en secciones plegables con dos
modos según el ancho, en un solo componente (`components/configuracion/PanelAcordeon.tsx`). El padre
controla cuál sección está activa (una a la vez).
- **Horizontal en escritorio (≥1024px):** las secciones son franjas lado a lado. La **activa** es un
  panel de ancho acotado (~600px) con su contenido; las **inactivas** quedan como **tiras** (~132px)
  con ícono + título + resumen (texto horizontal, no rotado). El conjunto se centra (`justify-center`).
- **Vertical en móvil (<1024px):** barra que se despliega hacia abajo (acordeón clásico, chevron que
  rota); se puede colapsar la activa.
- **Dentro** van tarjetas-fila horizontales (ícono · identidad a la izquierda · valor + acción a la
  derecha), apiladas. Jerarquía de fondos que alterna: tarjeta-acordeón `superficie` → cuerpo
  `superficie-2` → tarjetas `superficie` → chips `superficie-2`.

**Tablero de inicio — KPIs + cola de pendientes (estrenado en Resumen)** — patrón de la pantalla de
inicio (`components/resumen/SeccionResumen.tsx`).
- **Encabezado:** saludo por hora + nombre (`h2` ~18px) y fecha de hoy (`texto-3`). No repite el título
  de la sección (ya vive en la barra negra).
- **Tarjeta KPI** (clicable → deep-link) — patrón **"cifra dominante"**: el **valor manda arriba**
  (`font-bold` 28/32/36px base/lg/2xl, `tabular-nums`) con **acento por color** (`ok` ingresos,
  `peligro` si fallidos>0) y un **ícono discreto** (18px, `texto-4` → `marca` en hover) en la esquina
  superior derecha — **sin** caja/círculo pastel (alinea con §10). Debajo: **etiqueta en sentence case**
  `text-[14px]` `texto` (no uppercase micro) y una línea de contexto `text-[13px]` `texto-3`.
  `shadow-tarjeta-panel`. **Responsive:** **móvil = tarjeta horizontal** a todo el ancho (cifra a la
  izquierda · etiqueta+contexto al lado · ícono al extremo, `relative` + ícono `ml-auto`) apiladas
  **una por fila** (`grid-cols-1`); **escritorio = vertical** (`lg:flex-col`, cifra arriba + ícono
  `lg:absolute` en la esquina + texto debajo, con `lg:truncate`). Grid `grid-cols-1 lg:grid-cols-4`
  (3 KPIs → `lg:grid-cols-3`).
- **Cola de pendientes:** dos `BloquePendiente` (`lg:grid-cols-2`), cada uno con header (ícono
  marca-suave + título + badge contador) y hasta **5 filas** (`FilaPendiente`: ícono + identidad +
  valor a la derecha). **"Ver todos →"** solo cuando hay más de las mostradas. **Estado vacío
  positivo:** check verde (`var(--panel-ok)`) + texto ("todo al día"), no un vacío gris.
- La **campana del shell** (`BandejaPendientes`) reusa la misma fuente de datos (un solo hook RQ),
  así su badge y la cola siempre cuadran.

**Gráficas / charts (estrenado en Métricas)** — `recharts` (mismo que `apps/web`); piezas en
`components/metricas/piezas.tsx`.
- **Contenedor:** `GraficaCard` (tarjeta `superficie` + borde + `shadow-tarjeta-panel`, título 14px +
  subtítulo `texto-3`) con `ResponsiveContainer`.
- **Paleta = tokens, no hex:** `var(--panel-brand)` (serie principal) · `--panel-brand-2` · `--panel-ok`
  · `--panel-danger` · `--panel-text-4` (gris "otro"). Grid sutil (`--panel-border`), eje **12px**,
  leyenda **12.5px**, sin línea de tick.
- **Barras:** llenan la banda (gap pequeño/0) y el **cursor de hover cubre la banda completa** (cursor
  custom del mismo ancho → coinciden, no una línea más angosta/ancha que la barra). **Apiladas** para
  desgloses (ingresos por concepto); **divergentes** (`stackOffset="sign"`, una serie en negativo) para
  altas vs. bajas. Eje mensual muestra **todas** las etiquetas (`interval=0`, **meses capitalizados**);
  el diario espacia con `minTickGap`.
- **Tooltip:** componente propio con tokens (no el default), label legible (mes/día), valores en `abs`.
- **Ranking / leaderboard:** filas con posición + (avatar real opcional, reusa `AvatarNegocio`) +
  etiqueta + valor, con **barra de fondo proporcional** por fila (no una línea suelta debajo).
- **KPI con variación** (`TarjetaKpi`/`TarjetaProgreso`): mismo patrón **"cifra dominante"** que el
  Resumen — valor 28/32/36 con chip `↑/↓ %` en baseline (verde/rojo por sentido; se **oculta** cuando el
  periodo anterior es 0), etiqueta en sentence case debajo (`text-[14px]`) e ícono discreto 18px en la
  esquina (sin caja pastel). **Móvil = tarjeta horizontal** a 1 columna (`grid-cols-1`) / **escritorio
  vertical** (`lg:flex-col`, `lg:grid-cols-3|4`). Sin línea de contexto bajo el número (ensucia).

**Mapa interactivo a pantalla (estrenado en Ciudades, ampliado en Territorios)** — secciones cuyo
lienzo principal es un mapa **MapLibre** (tiles OpenFreeMap). Detalle frágil completo en
[`Territorios.md`](Territorios.md) §"Patrones de UI móvil"; aquí lo **reusable**:
- **Mapa fijo al viewport (móvil vertical):** el mapa va `fixed inset-0 z-0` para que **no se
  redimensione** al colapsar header/nav (si el canvas se reajusta, destella beige). Encima, una hoja
  **peek** (`HojaMovil`, bottom-sheet de altura parcial expandible) y un overlay de controles con
  `pointer-events-none` + hijos `[&>*]:pointer-events-auto`. La tarjeta de detalle de un pin se monta
  por **portal a `body`** (`z-[60]`) porque el mapa `fixed` crea su propio *stacking context* y, si no,
  queda **bajo** la barra de ciudad. Tres layouts del mismo módulo: vertical (hoja peek) / horizontal
  (panel deslizable) / escritorio (sidebar).
- **Controles flotantes sobre el mapa:** zoom (`NavigationControl`) arriba-derecha + botón **centrar**;
  se **desplazan** hacia abajo cuando aparece la barra de herramientas de edición (no se empalman). El
  **FAB** redondo (~52px) abajo-derecha alterna **`+`/`×`** para abrir/cerrar el modo crear (en
  horizontal se corre según el panel esté abierto). Botones de herramienta ~52px, separados `gap-2`.
- **Cards inline en la hoja:** **filas** (no tarjetas con borde grueso) — `border-b` entre filas,
  identidad/input a la izquierda + **botones-ícono circulares** (`h-10 w-10`, ícono ~20px) a la
  derecha: **ver en el mapa** (color del estado/zona), **editar** (`marca`), **borrar** (`peligro`).
  Los círculos aquí son **botones de acción táctiles** de color contextual —no decoración pastel—, así
  que cumplen la regla de §10.
- **Pines = símbolos, no discos:** negocios = pin-gota con ícono de tienda; marcas = pin con punto de
  color por estado (`addImage` sobre canvas). Popups grandes con **offset por dirección** (`OFFSET_PIN`)
  para que no tapen el pin. En táctil, el arrastre de vértices usa eventos **`touch*`** (MapLibre no
  emite `mouse*` en táctil).

**Sub-navegación por pestañas — `TabsSegmento` (ronda de consistencia, jul 2026).** Los tabs de sección
DENTRO de una página usan un **segmented control** unificado (`components/ui/TabsSegmento.tsx`): botones
AGRUPADOS en un solo contenedor píldora `inline-flex rounded-full border border-borde bg-superficie-2
p-0.5`; el activo `bg-marca text-marca-contraste`, los inactivos `text-texto-2 hover:text-texto`
(`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold`). Cada tab acepta `icono?` (14px), `badge?`
(conteo) y `badgeAlerta?` (tiñe el badge de marca cuando >0 aunque el tab esté inactivo, p. ej. "Por
verificar"). Genérico `<T extends string>`. Sustituye los tabs con subrayado y los chips-tab sueltos; se
usa en Mapa·Ciudades·Regiones (Ciudades), Negocios·MarketPlace (Categorías), Métricas, Suscripciones,
Configuración, Mantenimiento y el filtro de audiencia de Ayuda. (**Equipo y accesos** no lo usa — no
tiene sub-secciones.)

**Badge de conteo dentro de un tab o toggle.** Un tab puede mostrar a su derecha el total de lo que
agrupa (Ciudades = nº ciudades, Regiones = nº regiones, Categorías Negocios/MarketPlace = nº categorías,
toggles de Ayuda = nº tutoriales con o sin video). Badge oval `txt-badge min-w-[18px] rounded-full px-1.5
text-[11px] font-semibold tabular-nums`: **sobre el tab activo** fondo blanco translúcido
(`rgba(255,255,255,0.22)`, texto blanco); **inactivo** gris (`color-mix(in srgb, var(--panel-text) 8%,
transparent)` + `text-3`). El conteo del tab "Todas" es el total **global**, no el del filtro activo.

**Barra de controles de una sección (una sola línea).** El encabezado de una lista alinea en UNA fila:
**buscador** + **chips de filtro** a la izquierda; **dropdowns de filtro** + **Ordenar** + **botón de
creación** empujados a la derecha con `ml-auto` (el botón de alta **al final del todo**). Contenedor
`flex flex-wrap items-center gap-x-3 gap-y-2` — el `flex-wrap` deja que baje en pantallas angostas sin
romperse. Se **eliminaron** los textos de conteo tipo "N miembros/negocios · filtrado · actualizando":
los reemplazan los badges de los chips/dropdowns y del menú lateral.

**Chips de filtro (estado) con punto de color + conteo.** Los chips que filtran por estado
(Todas/Activas/Inactivas, por rol…) llevan un **punto** de color a la izquierda (`h-[7px] w-[7px]`: `ok`
activas, `text-4` inactivas, `marca` "todas") y un **badge** oval de conteo a la derecha. Base
`inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1.5
text-[12.5px] font-semibold text-texto-2`; el **activo** tiñe fondo con `color-mix(in srgb, <color> 12%,
transparent)` y borde con 34%. El badge interno es `.txt-badge`; el chip en sí **no** (sube a 14px en
móvil como el resto). El conteo es dinámico y respeta los demás filtros.

**Opciones de dropdown con punto + conteo (`MenuFiltro`).** `OpcionMenu` acepta `color?` (punto) y
`conteo?` (badge), con el MISMO lenguaje visual de los chips sueltos pero **dentro** del dropdown (igual
en móvil y PC). El badge de la opción **seleccionada** se tiñe con su color semántico (o
`var(--panel-brand)` por defecto); las demás en gris. Se usa en los filtros de
estado/tamaño/origen/periodo/persona/ciudad de Publicidad, Suscripciones, Usuarios, Negocios, Ciudades,
Categorías y Auditoría.

**Conteos por faceta ("faceted counts") — regla de backend.** Cada badge de un filtro cuenta
**excluyendo su propio filtro** pero **respetando los demás** (abrir "Periodo" muestra cuántos hay en
cada ventana con los filtros de acción/persona ya aplicados). Se parten las condiciones por grupo + un
helper `armar(...conds)` que devuelve `and(...)` o `undefined`; cada faceta arma su `WHERE` sin su propia
condición. Las **ventanas de periodo** son acumulativas (hoy ≤ 7d ≤ 30d ≤ año ≤ todo) vía
`count(*) FILTER (WHERE …)`. Un **vaciado/borrado con filtros activos** debe reconstruir el MISMO `WHERE`
que la lista (nunca borrar ignorando los filtros).

**KPIs compactos en barra (etiqueta arriba / cifra abajo).** Aparte del KPI "cifra dominante" en tarjeta
(Resumen/Métricas), las secciones densas muestran sus KPIs como **tira sin tarjeta** en la barra
superior: grupo `flex items-stretch divide-x divide-borde`, cada ítem centrado con **etiqueta uppercase**
arriba (`txt-badge uppercase tracking-wide text-texto-4 lg:text-[11px]`) y **valor bold** abajo
(`text-[17px] font-bold lg:text-[22px] tabular-nums`, acento por color opcional). Estrenado en Categorías
y Ayuda; el valor puede reaccionar al **toggle de sección activo** (KPIs de Ayuda por audiencia).

**Botón "contador con círculo" (de Resumen, reusado en Auditoría).** Para destacar un total con una
acción al lado (Auditoría: "N acciones" + bote de basura de vaciar): pill `inline-flex items-center gap-2
rounded-full border border-marca/30 bg-marca-suave py-1 pl-1 pr-3 text-[12.5px] font-semibold text-marca`
con círculo interno `grid h-6 min-w-[24px] place-items-center rounded-full bg-marca px-1 text-[12px]
font-bold tabular-nums text-marca-contraste`. Es el mismo badge del header de la cola de pendientes del
Resumen; los botones de solo-ícono al lado usan el `Tooltip` del Panel (§6).

**Badges de conteo del menú lateral.** Cada ítem del menú puede mostrar un contador a la derecha
(Negocios, Usuarios, Equipo, Suscripciones, Recibos, Vendedores, Publicidad, Ciudades, **Auditoría**).
Los arma `PaginaPanel.tsx` desde hooks `useConteoX(puedeVer(id))` (gateados por acceso, conteos ligeros
con su propia queryKey) y los pinta `BarraLateral.tsx` leyendo `contadores?.[it.id]`. Para **agregar uno**:
endpoint `/conteo` ligero que respeta el alcance del rol → service → hook `useConteoX` → registrar
`c.<id>` en el `useMemo` de `contadores` de `PaginaPanel`.

---

## 6. Componentes base reutilizables (no reinventar)

Ya existen y se reusan en cada módulo. Viven en `apps/admin/src/components/ui/` (y `negocios/` los específicos):

| Componente | Archivo | Rol |
|---|---|---|
| `ModalAdaptativo` | `components/ui/ModalAdaptativo.tsx` | Centrado en `lg:`+ / bottom-sheet con drag en móvil. Prop `centrado` para diálogos sobre una ficha. Animación de entrada propia (telón + modal/sheet). |
| `DialogoConfirmar` | `components/ui/DialogoConfirmar.tsx` | Confirmación genérica con motivo **opcional u obligatorio**. |
| `Toaster` + `useToastPanel` | `components/ui/Toaster.tsx` · `stores/useToastPanel.ts` | Toast pill (arriba, centrado) con `toast.exito/error/advertencia/info`. Mismo espíritu que `notificar.*` de la app, con tokens del Panel. |
| `TabsSegmento` | `components/ui/TabsSegmento.tsx` | Segmented control para los **tabs de sección** (píldora agrupada). Soporta `icono`, `badge` de conteo y `badgeAlerta`. Ver §5. |
| `MenuFiltro` | `components/negocios/MenuFiltro.tsx` | Dropdown botón + menú con check (filtros). `OpcionMenu` acepta `color` (punto) y `conteo` (badge) — ver §5. |
| `avatares` | `components/negocios/avatares.tsx` | Avatar con color por hash del nombre. |
| `EstadoSeccion` | `components/ui/EstadoSeccion.tsx` | Estado de una lista: **cargando / error / vacío**. Ícono del módulo en cuadro sutil (`superficie-2` + borde) + título (semibold) + descripción + **acción opcional**. En vacío, distinguir *con-filtros* (título "Sin resultados" + botón "Limpiar filtros") de *vacío real* ("Aún no hay…", sin botón). Reemplazó los `EstadoMensaje` duplicados de Negocios/Usuarios/Suscripciones. |
| `Tooltip` | `components/ui/Tooltip.tsx` | Tooltip con **portal a `body`** (no lo recortan `overflow`/`transform` del padre), fondo **invertido** (`bg-texto`/`text-superficie`) que se adapta a claro/oscuro. **Solo en escritorio** (en móvil es no-op: sin hover). Props `text`, `position` (`top`/`bottom`/`left`/`right`), `className`. Úsalo en botones de **solo-ícono** en vez del `title` nativo; el `title` nativo se reserva para mostrar **texto largo completo** en spans truncados (una URL, un path), porque el Tooltip usa `nowrap`. |
| Ficha instantánea | (patrón) | La ficha abre con un **placeholder** armado de la fila + **prefetch en hover/touch**; React Query rellena al vuelo. Reusar en toda ficha del Panel. |

---

## 7. Tema claro/oscuro

- Atributo `data-tema` en `<html>` (`utils/tema.ts` lo alterna). Las variables CSS cambian; las
  utilidades no. El **autofill** del navegador se fuerza a respetar el tema (técnica de box-shadow inset).

---

## 8. Movimiento (animaciones)

- **`.animar-entrada`** — fade-in sutil 0.22s (dropdowns, popovers).
- **`ModalAdaptativo`** — keyframes propios de **entrada** (telón fade + modal scale/fade en
  escritorio, subir-sheet en móvil) y de **salida** (telón/modal fade-out; el bottom-sheet baja con
  `translateY(100%)` antes de desmontar, vía un estado `cerrando`). Paridad con apps/web.
- **`.entrada-login`** (0.42s) y **`.spinner-panel`** (spinner de marca).
- **`prefers-reduced-motion`** respetado en todas.

---

## 9. Responsive

- **Breakpoints:** `base` / `lg:` (1024px) / `2xl:` (1536px). Misma regla que la app: si usas `lg:`,
  **incluye `2xl:`** (sin él, la laptop afecta al monitor grande). No usar `sm:`/`md:`/`xl:` en código nuevo.
- **`cursor-pointer` solo en `≥1024px`** (manita en escritorio con mouse; en móvil táctil no aplica) —
  ya centralizado en `index.css`, no repetir por botón.
- **Variantes móvil/desktop** cuando el contenedor cambia de fondo por breakpoint (ej. barra negra
  translúcida en móvil vs. card clara en escritorio).

### 9.1 Ajustes globales en vista móvil (táctil)

Igual que el grosor de borde y el `cursor-pointer`, estos ajustes viven en **un solo lugar**
(`index.css`, reglas **sin `@layer`** para ganar sobre Tailwind) y aplican **solo en `<1024px`**;
en `≥1024px` todo queda a su tamaño original. Suben la legibilidad en táctil sin tocar componentes.

| Qué | Cómo | Variable |
|---|---|---|
| **Íconos +18%** | Todos los `svg.lucide` crecen con la propiedad individual **`scale`** (no `transform`, para que **componga** con `rotate`/`animate-spin` sin pisarlos). | `--escala-iconos-movil: 1.18` |
| **Piso de texto = 14px** | Todo texto bajo 14px sube a 14px (`= text-sm`). Override con **`:where(.text-[9px]….text-[13.5px])`** — especificidad **0** a propósito. | `--piso-texto-movil: 14px` |
| **Badges/contadores = 12.5px** | Se marcan con la clase **`.txt-badge`**; al tener especificidad 1, **gana** sobre el piso del `:where` sin `!important`. | `--texto-badge-movil: 12.5px` |

**Qué lleva `.txt-badge`** (estados + contadores — **no** los chips de filtro):
badges de estado (`BadgeEstadoPago` / `BadgeEstadoUsuario` / `BadgeTipoEvento` / `ChipOrigen`),
chips binarios/dato (`ChipBinario`, `ChipDato`, "Anulado", "Inactiva", "Matriz", estado 2FA) y
contadores numéricos (pendientes "9+", menú lateral/cajón, contadores de filtro, paso del wizard 2FA).

**Al crear algo nuevo:** un `text-[Npx]` <14px fuera de badge → añádelo a la lista del `:where`; un
badge/contador nuevo → ponle `.txt-badge`. Los **chips de filtro** seleccionables **no** son badge
(suben a 14px como el resto). Para mover un piso, cambia su variable en `index.css`.

**Pull-to-refresh / overscroll:** el Panel es una app de pantalla fija (el scroll vive en
contenedores internos), así que `index.css` pone `overscroll-behavior: none` en `html, body`. Eso
**bloquea el "tirar para recargar"** del navegador y el scroll-chaining. Su efecto se nota en táctil
(móvil); en PC es inocuo. Es una regla **global** (no va dentro de la media query de <1024px).

---

## 10. Estética (vale igual que en la app)

Herramienta **B2B profesional** (Linear / Stripe / Notion), **no** caricaturesca: listas densas
inline, íconos 14–16px **sin** círculos pastel, jerarquía por **peso** (no por tamaño), color neutro
+ **un** acento (`marca`). Nada de emojis como datos, ni gradientes/sombras exageradas.

---

## Referencias

- **Tokens (fuente):** `apps/admin/src/index.css` · escaneo: `apps/admin/tailwind.config.js`.
- **Referencia visual canónica:** componentes de **Negocios** (`SeccionNegocios`, `FichaNegocio`,
  `DialogoRegistrarNegocio`, `DialogoMarcarPagado`, `estadoPago`, etc.).
- **Documento hermano:** [`Panel_Admin.md`](Panel_Admin.md) (arquitectura del Panel).
- **NO** es esto: `docs/estandares/TOKENS_GLOBALES.md` / `TOKENS_COMPONENTES.md` → esos son de `apps/web`.
