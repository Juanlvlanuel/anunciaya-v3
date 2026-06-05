# Handoff: Panel de Administración AnunciaYA — Shell + Login

## Overview
Este paquete documenta dos piezas de UI para el **Panel de Administración de AnunciaYA** (plataforma de anuncios/comunidad local en México):

1. **El shell (esqueleto) del panel** — header, navegación lateral, navegación móvil y el contenedor de contenido. Es el marco que envuelve todas las secciones internas (Resumen, Negocios, Usuarios, etc.). El contenido de cada sección **NO** es parte de este entregable; aquí solo se define la estructura navegable y su comportamiento por rol.
2. **La pantalla de Login** — acceso con correo + contraseña, 2FA solo para SuperAdmin, recuperación de contraseña y todos sus estados.

Ambas piezas son **responsive** (escritorio y móvil) y soportan **modo claro y oscuro**.

---

## About the Design Files
Los archivos `.html`, `.jsx` y `.css` de este bundle son **referencias de diseño construidas en HTML/React+Babel standalone** — prototipos que muestran el aspecto y el comportamiento deseados. **No son código de producción para copiar/pegar.**

La tarea es **recrear estos diseños dentro del entorno del codebase real de AnunciaYA**, usando sus patrones y librerías establecidos (React + Vite, Next.js, Vue, etc.). Si aún no existe un entorno, elige el framework más apropiado (recomendado: **React + TypeScript + Vite**, con CSS Modules o Tailwind) y reimpleméntalo ahí.

Cosas a "traducir", no a copiar literal:
- El prototipo usa **React 18 vía Babel standalone en el navegador** y comparte componentes vía `window.*`. En producción usa módulos/imports reales.
- Usa un **"harness"** (barra superior negra con selectores de Rol / Vista / Propuesta) y un **panel de Tweaks** — ambos son **herramientas de revisión del prototipo, NO parte del producto**. No los implementes. El rol real viene de la sesión autenticada; la vista (escritorio/móvil) la define el viewport; la "Propuesta" elegida es **Inset** (ver abajo) — implementa solo esa.
- Los íconos son SVG inline simples (`icons.jsx`). Sustitúyelos por la librería de íconos del codebase (Lucide, Heroicons, etc.) — los nombres están mapeados en la sección Assets.

---

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciados, radios e interacciones son finales. Recrea la UI con fidelidad de píxel usando las librerías del codebase. Los valores exactos están en *Design Tokens*.

Hay **dos propuestas** en el prototipo (`classic` e `inset`). **La aprobada y final es `inset`.** Toda esta documentación describe la variante **Inset**. Ignora `classic`.

---

## Concepto "Inset" (resumen visual)
- **Barra superior negra (`#0e0f13`)** que cruza todo el ancho. A la izquierda, sobre la columna del sidebar, va el **logo + divisor + "Panel de Administradores"** en blanco. Al centro, el **título de la sección activa** (ícono + texto). A la derecha, el **selector de región**, buscar, tema, **pendientes (bandeja)** y avatar.
- **Sidebar sin fondo** (transparente sobre el lienzo), con grupos de navegación.
- **Lienzo de la app** con un **tinte azul claro** (`--canvas`, por defecto `#e5f1ff`).
- **Panel de contenido flotante**: tarjeta blanca con borde redondeado y sombra suave, "inset" dentro del lienzo con márgenes.

---

## Roles y visibilidad (CRÍTICO)
El sistema tiene **3 roles**. El menú y el alcance de datos cambian por rol. Esta matriz es la fuente de verdad (de `data.jsx`):

| Sección (id)            | Grupo            | SuperAdmin | Gerente | Vendedor | Notas |
|-------------------------|------------------|:---------:|:-------:|:--------:|-------|
| Resumen (`resumen`)     | General          | ✅ | ✅ | ✅ | |
| Métricas (`metricas`)   | General          | ✅ | ✅ | ✅ | |
| Negocios (`negocios`)   | Operación        | ✅ | ✅ | ✅ | Vendedor lo ve como **"Mi cartera"**. Contador: super 248 / gerente 64 / vendedor 19 |
| Usuarios (`usuarios`)   | Operación        | ✅ | ❌ | ❌ | |
| Suscripciones (`suscripciones`) | Operación | ✅ | ✅ | ❌ | |
| Vendedores y comisiones (`comisiones`) | Red de ventas | ✅ | ✅ | ✅ | Vendedor lo ve como **"Mis comisiones"** |
| Publicidad (`publicidad`) | Crecimiento    | ✅ | ✅ | ❌ | |
| Ciudades (`ciudades`)   | Crecimiento      | ✅ | ❌ | ❌ | |
| Configuración (`configuracion`) | Administración | ✅ | ❌ | ❌ | |
| Equipo y accesos (`equipo`) | Administración | ✅ | ✅ | ❌ | |
| Sistema (`sistema`)     | Administración   | ✅ | ❌ | ❌ | |

Reglas:
- Un **grupo** se oculta por completo si el rol no ve ninguno de sus ítems.
- Etiquetas personalizadas por rol (`labelFor`): el Vendedor ve "Mi cartera" y "Mis comisiones".
- **Alcance de región por rol**:
  - **SuperAdmin**: selector de región interactivo en el header. Opciones: `Toda la plataforma` (default) + 6 regiones. Cambia el ámbito de datos.
  - **Gerente**: región **fija** (la suya), mostrada como texto + píldora "tu región". No puede cambiarla.
  - **Vendedor**: región **fija** (solo texto, sin píldora).
- **Realidad de dispositivo**: el Vendedor trabaja primordialmente en **móvil**; SuperAdmin y Gerente en **escritorio**. (En el prototipo, cambiar de rol cambia la vista automáticamente — eso es solo demo.)

### Regiones de ejemplo (datos de muestra)
`Toda la plataforma` (6 regiones · 38 ciudades), `Región Centro` (CDMX·Toluca·Pachuca), `Región Occidente` (Guadalajara·Morelia), `Región Norte` (Monterrey·Saltillo), `Región Bajío` (Querétaro·León), `Región Sureste` (Mérida·Cancún). Son placeholders — reemplazar con datos reales.

### Usuarios demo
- SuperAdmin: **Carlos Mendoza** (CM, `#2563eb`), región `Toda la plataforma`
- Gerente: **Laura Ríos** (LR, `#0e7c66`), región `Occidente`
- Vendedor: **Diego Salas** (DS, `#b3541e`), región `Occidente`

---

## Screens / Views

### 1) Shell — Escritorio (variante Inset)
**Propósito:** marco navegable del panel para SuperAdmin y Gerente.

**Layout (CSS Grid):**
```
grid-template-columns: 314px 1fr;
grid-template-rows: 60px 1fr;
grid-template-areas: "side head" "side main";
background: var(--canvas);
```
- **Header (área `head`)**: alto **60px**, fondo **negro `#0e0f13`**, sin borde inferior, `padding: 0 20px 0 24px`, `position: relative`. Cruza desde el final de la columna del sidebar hasta el borde derecho. (El bloque de marca vive en la columna `side`, también negro, formando una sola barra negra continua.)
  - **Marca (sobre la columna side, dentro de la barra negra):** logo (**altura 34px**) + **divisor vertical 1px** (`var(--border)`, alto 26px) + **"Panel de Administradores"** (13px, peso 600, blanco, `line-height 1.15`, `max-width 115px`, puede ir en 2 líneas). Usa el **logo para fondo oscuro** (con halo).
  - **Centro — título de sección (`.header-context`):** centrado horizontalmente con `flex:1; justify-content:center`. Ícono en cuadro `36×36`, `border-radius 10px`, fondo `rgba(255,255,255,.1)`, ícono 20px; + **título** (`.hc-title`, 19px, peso 600, blanco, `letter-spacing -.2px`). Es el nombre de la sección activa.
  - **Derecha (`.header-tools`, gap 8px):**
    - **Selector de región** (solo SuperAdmin): botón `border-radius 10px`, `padding 9px 14px`, fondo `rgba(255,255,255,.1)`, borde `rgba(255,255,255,.16)`, texto blanco 15px, ícono globo/pin + chevron a `rgba(255,255,255,.6)`. Hover `rgba(255,255,255,.17)`. Abre menú (ver Interactions). Gerente/Vendedor: texto fijo (ver Roles).
    - **Buscar** (icon-action), **Tema** (sol/luna), **Pendientes** (bandeja `inbox` con badge contador), **Avatar** (el chip de usuario completo se oculta en inset; el avatar va al pie del sidebar). icon-action: `40×40`, `border-radius 10px`, color `rgba(255,255,255,.72)`, hover fondo `rgba(255,255,255,.12)` + blanco. Badge: fondo `--danger`, borde 2px del color del header (`#0e0f13`).
- **Sidebar (área `side`)**: ancho **314px**, **fondo transparente**, sin borde derecho.
  - **Grupos de navegación** con label (`.nav-group-label`): **12px, peso 600, color azul `#0431b9`**, `padding 4px 10px 7px`, sin uppercase. (Se pueden ocultar con un toggle; por defecto visibles.)
  - **Ítems (`.nav-item`)**: `padding 8px 10px`, `border-radius 9px`, `font-size 13.5px`, gap 11px, color `var(--text-2)`. Ícono **18px** color `var(--text-3)`. Texto en `var(--text)` tono casi-negro. Contador opcional (`.nav-count`) en píldora. Hover: fondo `var(--hover)` (tinte azul translúcido), texto `var(--text)`.
  - **Estado activo (variante elegida: "bar"):** fondo `color-mix(in srgb, var(--brand) 6%, transparent)`, texto e ícono `var(--brand)`, peso 600, y **barra de acento vertical** a la izquierda: `::before` `width:3px`, `border-radius 0 3px 3px 0`, `background var(--brand)`, `top/bottom:5px`, `left:0`.
  - **Pie del sidebar (`.side-foot`)**: borde superior 1px; en inset muestra el **usuario** (`.side-user`: avatar + nombre + rol, `padding 5px 8px`, `border-radius 10px`, hover `var(--hover)`).
- **Main (área `main`)**: el **panel de contenido flotante** = tarjeta `background: var(--surface)`, `border 1px var(--border)`, redondeada, sombra `0 1px 2px rgba(20,22,28,.03)`, con márgenes respecto al lienzo. En modo oscuro sin sombra. Aquí se montan las secciones (placeholder en el prototipo). La barra de acciones de contenido (`.content-head`) **se oculta** en inset porque el título ya vive en el header.

### 2) Shell — Móvil (variante Inset)
**Propósito:** marco del panel en teléfono; navegación principal del Vendedor.

- **Header negro** (`#0e0f13`): status bar + barra con **logo (altura 34px)**, spacer, botón **Pendientes** (ícono `inbox` **inline, sin contorno**, 40×40, ícono 28px, badge contador) y **avatar** (34px).
- **Sub-header** sobre fondo blanco: saludo grande **"Hola, {Nombre}"** (21px; nombre en peso 700) + **píldora de región** (`.m-region-pill`: fondo `var(--brand-weak)`, texto `var(--brand)`, `border-radius 999px`, `padding 7px 13px`, peso 600, ícono pin; chevron solo para SuperAdmin).
- **Cuerpo blanco** (`--surface`) donde se montan las secciones.
- **Navegación principal = Barra inferior (tab bar)**:
  - Fondo **gradiente azul corporativo**: `linear-gradient(125deg, #2f6bf0 0%, #1a36ad 100%)`.
  - `border-radius: 20px 20px 0 0`, sin borde superior, sombra `0 -6px 18px rgba(26,54,173,.22)`.
  - Tabs: ícono + label corto. Inactivo `rgba(255,255,255,.72)`; activo `#fff` con `tab-iconwrap` (píldora) fondo `rgba(255,255,255,.2)`.
  - Si hay >5 ítems: muestra 4 + un tab **"Más"** que abre el drawer.
  - Labels cortos: Resumen, Métricas, Cartera, Comisiones, Usuarios, Subs, Ads, Ciudades.
- **Drawer (menú lateral)** — usado por SuperAdmin/Gerente en móvil y como overflow "Más":
  - Encabezado: **título "Panel de Admins"** (16px, peso 700, sin logo) + botón cerrar (X). (Se quitó el logo y el divisor del drawer.)
  - Lista de grupos+ítems **compacta para que TODO quepa sin scroll vertical**: `nav-group margin-bottom 7px`; `nav-group-label margin 0 0 3px / padding 3px 10px 4px / 11px`; `nav-item padding 7px 10px / 13.5px`, ícono 19px. `overflow-x: hidden`.
  - Pie: botón de tema + **"Cerrar sesión"** (texto + ícono logout en color `var(--danger)`, borde 1px, `border-radius 10px`; hover fondo rojo translúcido). (Reemplaza al antiguo "Ayuda".)
  - Drawer: `width 80% / max 300px`, entra con `transform: translateX()` + scrim oscuro `rgba(8,9,12,.42)`.

### 3) Login — Escritorio
**Propósito:** autenticación. Un solo formulario correo+contraseña para los 3 roles (el sistema detecta el rol; **sin selector de rol visible** por seguridad). Sin registro público.

- **Fondo (`.login-stage`)**: lienzo `--canvas` (`#e5f1ff` claro), con ambiente decorativo: dos blobs radiales (uno con `--brand` arriba-derecha, otro con `--brand-2` abajo-izquierda) + una **rejilla** sutil (`46px`) enmascarada con gradiente radial. Todo opcional/decorativo.
- **Tarjeta centrada (`.login-card`)**: `max-width 416px`, fondo `--surface`, `border 1px --border`, `border-radius 20px`, sombra `--shadow-card` (`0 1px 3px rgba(16,18,26,.05), 0 18px 50px -18px rgba(16,24,55,.32)`), `padding 36px 36px 30px`.
  - **Logo** centrado, altura 40px (logo a color para fondo claro; logo con halo para oscuro).
  - **Título** "Inicia sesión" (22px, peso 700, `letter-spacing -.3px`) + subtítulo "Panel de administración de AnunciaYA" (13.5px, `--text-3`).
  - **Campo correo**: label 12.5px peso 600; input con ícono `mail` adelante (`left 13px`, 18px, `--text-3`), `padding 12px 14px 12px 40px`, fondo `--field`, borde `--field-border`, `border-radius 11px`, 14px. Focus: borde `--brand`, fondo `--surface`, `box-shadow 0 0 0 4px var(--ring)`.
  - **Campo contraseña**: igual + ícono `lock` adelante + **botón mostrar/ocultar** (`eye`/`eyeOff`) a la derecha (`.trail-btn` 32×32, hover fondo `--brand-weak` + `--brand`). Input con `padding-right 44px`.
  - **Fila**: checkbox **"Recordar mi sesión"** (custom 18px, `border-radius 6px`, marcado = fondo `--brand` + check blanco) + link **"¿Olvidaste tu contraseña?"** (13px, peso 600, `--brand`).
  - **Botón "Entrar"** (`.btn`): ancho completo, `padding 13px 16px`, `border-radius 12px`, fondo `--brand`, texto `--brand-contrast`, peso 600, 14.5px, sombra azul. Estados: hover brillo +5%; active `translateY(1px)`; disabled opacidad .85 + saturación reducida.
  - **Pie**: nota "Conexión segura · acceso solo para personal autorizado" con candado (12px, `--text-3`).
  - **Bajo la tarjeta**: "© 2026 AnunciaYA · Soporte · Privacidad".

### 4) Login — Móvil
Misma tarjeta dentro de un phone frame; la tarjeta se vuelve "sheet" (full-width con padding 28px 22px 24px). Status bar arriba. Mismo contenido y estados.

### 5) Login — Estados / sub-pantallas
- **Error de credenciales**: alerta roja (`.alert`: fondo `--danger-weak`, borde `color-mix(--danger 30%)`, ícono `alert`) con "**No pudimos iniciar sesión.** Revisa tu correo y contraseña…". Los campos se marcan en rojo (`data-error`).
- **Carga**: botón deshabilitado con spinner + texto "Entrando…" (login) / "Verificando…" (2FA) / "Enviando…" (recuperar). Spinner: 17px, borde 2px, `border-top-color --brand-contrast`, `animation spin .65s linear infinite`.
- **2FA (solo SuperAdmin)**: tras login correcto de un SuperAdmin → pantalla con back-link "Volver", **emblema escudo** (`shieldCheck`, cuadro 56px `border-radius 16px`, fondo `--brand-weak`, `--brand`), título "Verificación en dos pasos", subtítulo con el correo, **6 casillas de código** (`.code-box` 48×56, 22px peso 700, foco con ring; clase `filled` al llenar), auto-avance entre casillas, **pegar** un código de 6 dígitos lo distribuye, botón "Verificar e ingresar", y "Reenviar código · disponible en 0:30".
- **Recuperar contraseña**: back-link, título "Recuperar contraseña" + ayuda, campo correo, botón "Enviar enlace de recuperación".
- **Recuperar — enviado**: emblema `mail` en verde (`--ok`), "Revisa tu correo", chip "Enviado a **{correo}**", botón "Volver a iniciar sesión", link "Reenviar enlace".
- **Éxito de login** → redirige al shell del panel.

---

## Interactions & Behavior
- **Selector de región (SuperAdmin)**: clic abre menú (ancho 268px, `border-radius 12px`, sombra pop). Lista con check en la opción seleccionada (fila seleccionada fondo `--canvas`). Separador tras la 1ª opción. Cierra al elegir o clic fuera. Cambiar región = cambia el ámbito de datos de toda la sección.
- **Pendientes (bandeja)**: clic abre dropdown con lista scoped por rol (ej. SuperAdmin: "23 negocios por aprobar", "Efectivo por confirmar · 8 vendedores · $42,300 MXN", "3 reportes del sistema"; contadores: super 12 / gerente 5 / vendedor 2). En móvil el ícono es inline (sin contorno) y abre un panel con scrim.
- **Navegación**: al seleccionar una sección, cambia el estado activo y el título del header. En el prototipo el contenido es un placeholder.
- **Drawer móvil**: hamburguesa / tab "Más" abre; scrim o X cierra; seleccionar un ítem cierra y navega. Cambiar de rol cierra el drawer.
- **Login submit (reglas demo, reemplazar por auth real):** vacío o contraseña que contenga "wrong"/"error" → estado error; correo de SuperAdmin → 2FA; otros → entra al shell. 2FA: código <6 dígitos o "000000" → error; si no, entra.
- **Mostrar/ocultar contraseña**, **recordar sesión**, **¿olvidaste?** → cambia a sub-pantalla recuperar.
- **Transiciones**: hover/cambios 0.12–0.15s; entrada de tarjetas `fadein .22s` (translateY 5px → 0; **no animar opacidad desde 0 en el reposo**). Respetar `prefers-reduced-motion`.

## Responsive behavior
- **Escritorio**: grid 314px + contenido; barra negra full-width; panel flotante.
- **Móvil**: header negro, sub-header con saludo+región, cuerpo blanco, **tab bar inferior con gradiente azul** (Vendedor) o **drawer** (SuperAdmin/Gerente). Breakpoint sugerido: < ~768px usa el layout móvil.
- Hit targets móviles ≥ 44px.

## State Management
Estado del shell (en producción, derivar de sesión + router):
- `role`: 'super' | 'gerente' | 'vendedor' (de la sesión autenticada).
- `activeSection`: id de la sección (del router / URL).
- `regionId`: región activa (solo editable por SuperAdmin; fija para los demás).
- `theme`: 'light' | 'dark' (preferencia persistida).
- UI local: apertura de menú región, dropdown pendientes, drawer móvil.

Estado del login:
- `screen`: 'login' | 'twofa' | 'recover'; `error: boolean`; `loading: boolean`; `email`; `sent: boolean` (recuperar); `code[6]` (2FA); `remember`, `showPassword`.
- Data fetching: endpoints reales de login, verificación 2FA, envío de recuperación, y carga de menú/notificaciones/regiones por rol.

---

## Design Tokens

### Colores — Modo claro (`.stage` / `.login-stage`)
| Token | Valor |
|---|---|
| `--bg` | `#f5f6f8` |
| `--canvas` (lienzo inset / fondo login) | `#e5f1ff` (default; configurable) |
| `--surface` | `#ffffff` |
| `--surface-2` | `#fbfbfc` / login `#f7f9fc` |
| `--border` | `#e9eaee` / login `#e6e8ee` |
| `--border-strong` | `#dddfe4` / login `#d7dae2` |
| `--field` (login input) | `#f4f6fa` |
| `--field-border` (login) | `#dfe3ea` |
| `--text` | `#0a0a0b` |
| `--text-2` | `#45454a` |
| `--text-3` | `#84848a` |
| `--text-4` | `#a6a6ac` |
| `--brand` | `#2563eb` |
| `--brand-2` (gradientes) | `#1a36ad` |
| `--brand-contrast` | `#ffffff` |
| `--hover` | `color-mix(in srgb, var(--brand) 13%, transparent)` |
| `--hover-strong` | `color-mix(in srgb, var(--brand) 19%, transparent)` |
| `--brand-weak` | `color-mix(in srgb, var(--brand) 11%, transparent)` |
| `--brand-weak-2` | `color-mix(in srgb, var(--brand) 16%, transparent)` |
| `--danger` | `#e0322f` |
| `--ok` (login) | `#0e8a52` |
| `--ring` (focus) | `color-mix(in srgb, var(--brand) 30–35%, transparent)` |
| Azul de labels de grupo | `#0431b9` |
| Barra negra (header/nav) | `#0e0f13` |
| Gradiente tab bar móvil | `linear-gradient(125deg, #2f6bf0, #1a36ad)` |

### Colores — Modo oscuro
| Token | Valor |
|---|---|
| `--bg` | `#0c0c0e` |
| `--canvas` | `#090c14` (shell) / login `#0a0d16` |
| `--surface` | `#141416` / login `#16181d` |
| `--surface-2` | `#19191c` / login `#1c1f25` |
| `--border` | `#26262b` / login `#2a2d34` |
| `--border-strong` | `#313137` / login `#353941` |
| `--field` / `--field-border` (login) | `#1f232b` / `#353941` |
| `--text` | `#f2f3f5` |
| `--text-2` | `#a4a7af` |
| `--text-3` | `#74777f` / login `#777b83` |
| `--text-4` | `#5a5d65` |
| `--brand` | `#5a8dff` |
| `--brand-2` | `#2f6bf0` |
| `--brand-contrast` | `#0b1220` |
| `--danger` | `#ff5b58` / login `#ff6360` |
| `--ok` (login) | `#34c77b` |

> Nota: el **acento** y el **tinte del lienzo** son configurables (en el prototipo vía Tweaks). Trátalos como tokens de tema. Acento por defecto `#2563eb`; opciones probadas: `#2f80ed`, `#1c5bd6`, `#0e7c86`. Lienzo por defecto `#e5f1ff`; opciones: `#eef0f4`, `#e9f1ec`, `#f3eee8`, `#ece9f6`. **El tinte de lienzo solo aplica en modo claro**; el oscuro mantiene su fondo oscuro.

### Tipografía
- Familia: **"IBM Plex Sans"**, fallback `system-ui, -apple-system, sans-serif`. Pesos usados: 400, 500, 600, 700. Peso base del body: **500**.
- (Mono para detalles/placeholders: "IBM Plex Mono".)
- Escala clave: título login 22/700; título sección header 19/600; nombres 13–15/600; ítems nav 13.5/500–600; labels de grupo 12/600; labels de campo 12.5/600; subtítulos/ayuda 12–13.5/`--text-3`; saludo móvil 21 (nombre 700); código 2FA 22/700.

### Espaciado / radios / sombras
- Header alto **60px**; sidebar **314px**; icon-action **40px**; avatar 30–34px.
- Radios: inputs/botones login 11–12px; tarjetas 14–22px (login 20px); ítems nav 9px; chips/píldoras 999px; cuadros de ícono 10–16px; tab bar superior 20px.
- Sombras: `--shadow-pop` (menús) `0 1px 2px rgba(20,22,28,.04), 0 8px 24px -8px rgba(20,22,28,.18)`; `--shadow-card` (login) `0 1px 3px rgba(16,18,26,.05), 0 18px 50px -18px rgba(16,24,55,.32)`; panel flotante shell `0 1px 2px rgba(20,22,28,.03)`; tab bar móvil `0 -6px 18px rgba(26,54,173,.22)`.
- Transiciones estándar: `.12s`–`.15s` en color/fondo/borde; entrada `fadein .22s ease`.

---

## Assets
Carpeta `assets/` incluida en este bundle:
- `logo-blanco.webp` — **logo a color con tagline "Tu Comunidad Local…"**, fondo transparente. **Usar sobre fondos CLAROS** (tarjeta de login en modo claro). *(El nombre "blanco" se refiere al fondo destino, no al color del logo.)*
- `logo-azul.webp` — **logo con halo/contorno claro**, pensado para **fondos OSCUROS** (barra negra del header, modo oscuro).
- `logo-icon.png` — solo el ícono (apretón de manos en globo rojo). Útil como favicon / marca compacta / avatar de app.

**Íconos (line icons, 24×24, stroke 1.6):** en el prototipo están en `icons.jsx`. Mapea a tu librería:
`resumen` (dashboard/grid), `metricas` (bar chart), `negocios` (storefront/bag), `usuarios` (users), `suscripciones` (card), `comisiones` (coin/$ circle), `publicidad` (megaphone/speaker), `ciudades` (map pin), `configuracion` (sliders), `equipo` (shield-people), `sistema` (server), `bell`, `inbox` (pendientes), `chevronDown/chevronRight`, `menu`, `x`, `search`, `sun`, `moon`, `check`, `monitor`, `smartphone`, `pin`, `globe`, `help`, `layers`, `dot`, `logout`, `mail`, `lock`, `eye`, `eyeOff`, `alert`, `arrowLeft`, `shieldCheck`.

> Si el codebase ya tiene un sistema de marca AnunciaYA, usa sus assets oficiales en lugar de estos.

---

## Screenshots (referencia visual)
Carpeta `screenshots/` — capturas en alta resolución de los estados finales (variante **Inset**). El recuadro negro superior en cada captura es el **harness de revisión del prototipo**, NO parte del producto; ignóralo.

**Shell:**
- `01-shell-escritorio-superadmin-claro.png` — escritorio, SuperAdmin, modo claro. Menú completo, selector de región "Toda la plataforma", título de sección al centro del header negro, panel flotante.
- `02-shell-escritorio-superadmin-oscuro.png` — lo mismo en modo oscuro.
- `03-shell-escritorio-gerente-claro.png` — escritorio, Gerente. Menú reducido (sin Usuarios/Ciudades/Configuración/Sistema), región **fija** con píldora "tu región", usuario Laura Ríos al pie.
- `04-shell-movil-vendedor-claro.png` — móvil, Vendedor. Header negro, saludo "Hola, Diego", píldora de región, **tab bar inferior con gradiente azul** (Resumen/Métricas/Cartera/Comisiones).
- `05-shell-movil-pendientes.png` — dropdown de **Pendientes por resolver** (bandeja) en móvil.
- `06-shell-movil-drawer.png` — **drawer** abierto ("Panel de Admins", grupos, **Cerrar sesión** en rojo + toggle de tema).

**Login:**
- `07-login-escritorio-claro.png` — acceso, modo claro.
- `08-login-escritorio-oscuro.png` — acceso, modo oscuro (logo con halo).
- `09-login-2fa.png` — verificación en dos pasos (solo SuperAdmin): emblema escudo + 6 casillas.
- `10-login-recuperar.png` — recuperar contraseña.
- `11-login-error.png` — error de credenciales (alerta roja + campos marcados).
- `12-login-movil.png` — login en móvil (phone frame).

---

## Files (referencias de diseño en este bundle)
- `Panel Admin AnunciaYA.html` — entry del shell (carga React+Babel y los jsx).
- `Login AnunciaYA.html` — entry del login.
- `styles.css` — todos los estilos del shell (incluye harness de revisión, variantes classic/inset, claro/oscuro, móvil). **Implementa solo lo de la variante `inset`.**
- `login.css` — estilos del login.
- `app.jsx` — ensamblado del shell + harness + Tweaks (harness y Tweaks = solo revisión, no producto).
- `desktop.jsx` — shell de escritorio (header, sidebar, menú región, pendientes).
- `mobile.jsx` — shell móvil (header, sub-header, tab bar, drawer, pendientes).
- `data.jsx` — **fuente de verdad** de menú, visibilidad por rol, etiquetas por rol, contadores, regiones, usuarios, notificaciones.
- `icons.jsx` — set de íconos SVG (sustituir por librería del codebase).
- `login.jsx` — flujo de login (form, 2FA, recuperar, estados).
- `tweaks-panel.jsx` — panel de Tweaks del prototipo (**NO** es parte del producto; ignorar).

### Cómo correr el prototipo localmente
Servir la carpeta con cualquier servidor estático (los `.jsx` se transpilan en el navegador vía Babel standalone) y abrir los `.html`. No requiere build.

---

## Checklist de implementación (sugerido)
- [ ] Tokens de tema (claro/oscuro) como CSS variables o equivalente del codebase.
- [ ] Tipografía IBM Plex Sans (pesos 400–700).
- [ ] Layout shell escritorio (grid 314px, barra negra, panel flotante).
- [ ] Sidebar con grupos, estado activo "bar", labels azul `#0431b9`.
- [ ] Header: marca, título de sección al centro, región (por rol), buscar, tema, pendientes, avatar.
- [ ] Menú de región (SuperAdmin) + dropdown de pendientes (scoped por rol).
- [ ] Visibilidad de menú **por rol** y etiquetas por rol (tabla de Roles).
- [ ] Shell móvil: header negro, sub-header saludo+región, tab bar gradiente, drawer, cerrar sesión.
- [ ] Login: form, recordar, mostrar/ocultar, recuperar, **2FA solo SuperAdmin**, estados error/carga.
- [ ] Modo claro/oscuro en ambas piezas, logo correcto por fondo.
- [ ] Reemplazar reglas demo por autenticación real y carga de datos por rol/región.
- [ ] Reemplazar íconos inline por la librería del codebase.
- [ ] Accesibilidad: focus rings, labels, `aria-*`, contraste, `prefers-reduced-motion`, hit targets ≥44px.
