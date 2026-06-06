# Handoff: User Menu Drawer (Personal / Comercial) — Desktop + Mobile

## Overview

A profile menu drawer that lets the user view their current identity, **switch between two account modes (Personal and Comercial)**, navigate to account-related screens, and sign out.

There are **two responsive variants** of this drawer — implement them as separate components sharing the same tokens/data layer:

| Variant | Trigger | Container | Width | Item count |
|---|---|---|---|---|
| **Desktop** | Click on header avatar (top-right) | Popover anchored to the avatar | `332px` fixed | 3 (Personal) / 2 (Comercial) |
| **Mobile** | Hamburger / avatar tap | Full-height side sheet from the right | `~88vw` (max 380px) | 6 (Personal) / 5 (Comercial) |

The signature interaction in both variants: **switching modes changes the whole chromatic identity** of the drawer (paper, accent, ink, icon tint) with a smooth cross-fade. Mobile additionally shows a top toast confirming the switch.

---

## About the Design Files

The files in `reference/` are **design references created in plain HTML/JSX for prototyping** — they show the intended look, motion, and behavior. They are **not production code to drop into the codebase**.

The task is to **recreate this design in the target codebase's existing environment** (TypeScript — most likely React + TS) using its established component patterns, styling solution (CSS Modules, Tailwind, styled-components, etc.), and design tokens. Translate the structure and values below into idiomatic code for that stack.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, and timings below are final. Recreate pixel-perfectly using the codebase's libraries.

---

## Shared model

```ts
type Mode = "personal" | "comercial";

interface Account {
  initial: string;        // "J", "F", etc. — single grapheme used for avatar
  name: string;
  email: string;
  isOnline: boolean;
}

interface DrawerItem {
  id: string;
  label: string;
  icon: IconName;
  route: string;
  tile?: string;          // hex — only used on mobile (colored icon tile)
}

interface MenuViewModel {
  mode: Mode;
  account: Account;
  items: DrawerItem[];
}
```

### State

- `mode` is the active account context, **persisted to `localStorage`** so the user lands in the same mode next session.
- Switching `mode` should propagate to the rest of the app (publications shown, profile data, etc.) — lift it to a higher-level store (Context / Redux / Zustand). The drawer is one consumer.
- `isOpen` is controlled by the trigger (avatar / hamburger). Close on: Esc, click outside (desktop) or tap scrim/close-X (mobile), route change.

---

# 🖥 Desktop variant

See `reference/DrawerDesktop.jsx` and the **"Dual Tabs v2 · Desktop"** section of `reference/preview.html`.

## Layout

- **Anchor:** top-right corner of the viewport, ~12px below the app header, ~16px from the right edge.
- **Width:** `332px` fixed.
- **Layers (top → bottom):**
  1. **Tabs row** — outside the card, sits on the dark backdrop. 2 tabs side-by-side, the active one visually merges into the card.
  2. **Card** — rounded `18px`, `overflow: hidden`. Contains:
     - Sliding **accent indicator** (3px bar) at the top edge.
     - **Identity block** — avatar (left) + name + email (right).
     - **List** of rows (3 in Personal, 2 in Comercial).
     - **Cerrar Sesión** button.

## Items

| Mode | Items |
|---|---|
| Personal | Mis Publicaciones (`box`), Mis Guardados (`bookmark`), Mi Perfil (`user`) |
| Comercial | Mis Guardados (`bookmark`), Mi Perfil (`user`) |

> *Mis Publicaciones* is intentionally hidden in Comercial mode on desktop — that matches the source app. Confirm with product if this should change.

## Components

### Tab

| Property | Value |
|---|---|
| Padding | `11px 12px 16px`, `margin-bottom: -10px` (tucks under card border) |
| Radius | `14px 14px 0 0` |
| Font | Inter 600 / 13px / -0.005em |
| Active background | `paper` of matching mode |
| Active text | `ink` of matching mode |
| Inactive background | `rgba(255, 255, 255, 0.08)` |
| Inactive text | `rgba(255, 255, 255, 0.60)` |
| Inactive border | `1px solid rgba(255, 255, 255, 0.12)` (no bottom border) |
| Active border | transparent |
| Hover (inactive) | bg `rgba(255, 255, 255, 0.14)`, text `rgba(255, 255, 255, 0.85)` |
| Icon | 14px stroke 1.9 — `person` (Personal) / `store` (Comercial) |

### Sliding indicator

| Property | Value |
|---|---|
| Position | `absolute`, `top: 0`, `left: 0`, inside the card |
| Size | `width: 50%`, `height: 3px` |
| Background | current mode's `accent` |
| Transform | `translateX(0)` when Personal → `translateX(100%)` when Comercial |
| Transition | `transform 340ms cubic-bezier(0.4, 0, 0.2, 1)`, `background-color 280ms ease` |
| z-index | `3` |

### Avatar

| Property | Value |
|---|---|
| Size | `56 × 56px`, fully round |
| Background | current mode's `accent` |
| Initial | Instrument Serif 400 / 30px / -0.01em / white |
| Halo | `box-shadow: 0 0 0 4px {paper}, 0 0 0 5px {accentSoft}` |
| Online dot | `13px` circle, `#4CC777`, `2.5px solid {paper}` border, anchored `bottom-right (-2px, -2px)` |

### Identity text

- **Name** — Inter 600 / 16px / -0.015em / `ink`. Single line, ellipsis.
- **Email** — Inter 400 / 13px / `muted`. Single line, ellipsis.

### List row

| Property | Value |
|---|---|
| Layout | flex, `gap: 14px`, `padding: 13px 18px 13px 21px` |
| Icon | 18px stroke 1.7 / color `accent` |
| Label | Inter 500 / 14.5px / -0.005em / `ink` |
| Chevron | 16px stroke 1.8 / `rgba(0,0,0,0.25)` |
| Divider | `border-bottom: 1px solid {rule}` (none on last row) |
| Hover bg | `accentSoft` |
| Hover padding-left | `24px` (was 21) — animated 220ms |
| Hover chevron | `translateX(4px)` + recolor to `accent` |
| Left accent bar (hover) | absolute, `left: 0`, `top: 22%`, `bottom: 22%`, `width: 3px`, `background: accent`. `scaleY(0) → scaleY(1)` on hover, 240ms cubic-bezier(.4,0,.2,1) |

### Cerrar Sesión button

| Property | Value |
|---|---|
| Layout | full-width, centered, `gap: 10px`, `padding: 14px` |
| Background | transparent → `rgba(0,0,0,0.04)` on hover |
| Color | `ink` |
| Font | Inter 600 / 14px |
| Icon | `logout`, 16px stroke 1.7, `opacity: 0.6` (`1.0` on hover) |

## Behavior

### Entrance

```css
transform-origin: top right;
animation: pop 320ms cubic-bezier(0.2, 0.7, 0.35, 1) both;
@keyframes pop {
  from { opacity: 0; transform: translate(6px, -10px) scale(0.94); }
  to   { opacity: 1; transform: translate(0, 0) scale(1); }
}
```

### Exit / dismiss

Not in the prototype. Recommended: reverse the entrance over ~200ms on Esc / outside-click / route-change.

### Mode switch

- Click a tab → `setMode(next)`.
- Paper, accent, ink, muted, rule cross-fade in **~280ms** via CSS transitions on the elements consuming the CSS custom properties.
- Sliding indicator animates `translateX` in **340ms** cubic-bezier(0.4, 0, 0.2, 1).
- Content (identity + list + logout) re-fades on every mode change — re-key the wrapper by `mode` and apply 240ms opacity + 4px translateY.
- List rows stagger in (40ms step, 60ms initial offset, 320ms each).

---

# 📱 Mobile variant

See `reference/DrawerMobile.jsx` and the **"Dual Tabs v2 · Mobile"** section of `reference/preview.html`.

## Layout

- **Container:** full-height side sheet, anchored to the right edge of the viewport.
- **Width:** `min(88vw, 380px)`. Test at 360, 375, 390, 414 logical widths.
- **Above the drawer:** an animated **scrim** (`rgba(8,20,55,0.42)` + 3px blur) tapping which closes the drawer.
- **Stack (top → bottom inside the drawer):**
  1. Status-bar safe-area pad (`padding-top: 56px` to clear iOS notch / Android status bar).
  2. **Tabs row** — same physical-tab pattern as desktop but at the top of the drawer; inactive tab's background is the dark scrim showing through.
  3. **Card** — `border-radius: 22px 0 0 0` (top-left only, since drawer hugs the right edge), flex column, fills the rest of the height.
     - Sliding indicator (3px) at the top edge.
     - **Identity block — CENTERED** (avatar at top, name + email below). Different from desktop.
     - **List** of rows — each with a **colored tile icon** (36×36 rounded square, `border-radius: 11px`, item's `tile` color, white glyph).
     - **Sticky bottom**: Cerrar Sesión inside its own bottom bar with safe-area padding.
- **Floating X close** — top-right of the drawer area (`top: 16px, right: 16px`), `34px` circle, `rgba(255,255,255,0.85)` with blur, dark glyph. Closes the drawer.

## Items

| Mode | Items (in order) | Tile colors |
|---|---|---|
| Personal | Puerto Peñasco (`pin`) · CardYA (`card`) · Mis Cupones (`ticket`) · Mis Publicaciones (`box`) · Mis Guardados (`bookmark`) · Mi Perfil (`user`) | `#2244C8` · `#F58220` · `#2D9C5F` · `#2244C8` · `#DC3545` · `#475569` |
| Comercial | Puerto Peñasco (`pin`) · ScanYA (`scan`) · Business Studio (`chart`) · Mis Guardados (`bookmark`) · Mi Perfil (`user`) | `#2244C8` · `#1F2937` · `#0EA5E9` · `#DC3545` · `#475569` |

> The tile colors above are stand-ins matching brand intuition. **If the existing app has its own sub-app icons/logos for CardYA, ScanYA, Business Studio, etc., use those instead** — drop them into the tile slot at the same 36×36 size.

> *Puerto Peñasco* is shown as a navigation item — clarify with product if this is a location/area selector or just a static label.

## Components

### Tabs (mobile)

Same structure as desktop. Differences:

| Property | Mobile value |
|---|---|
| Font size | 14px (was 13) |
| Padding | `12px 12px 18px` |
| Icon | 15px (was 14) |

### Identity (mobile — centered)

| Property | Value |
|---|---|
| Container | flex column, `align-items: center`, `padding: 26px 22px 20px`, `text-align: center` |
| Avatar size | `64 × 64px` (bigger than desktop's 56) |
| Avatar font size | 34px |
| Name | Inter 600 / 17px / -0.015em, `max-width: 260px`, ellipsis |
| Email | Inter 400 / 13.5px / `muted` |

### List row (mobile)

| Property | Value |
|---|---|
| Layout | flex, `gap: 14px`, `padding: 11px 14px 11px 18px`, `margin: 2px 0`, `border-radius: 12px` |
| Tile | `36 × 36px`, `border-radius: 11px`, `background: item.tile`, white glyph, soft inset shadow |
| Glyph inside tile | 17px stroke 1.85, color `#fff` |
| Label | Inter 500 / 15px / -0.005em |
| Chevron | 16px stroke 1.8 / `rgba(0,0,0,0.28)` |
| Hover/active bg | `accentSoft` |
| Hover chevron | `translateX(3px)`, recolor to `accent` |
| Left accent bar (hover) | absolute, `left: 4px`, `top: 22%`, `bottom: 22%`, 3px wide, `scaleY(0) → scaleY(1)` |

> Mobile rows do **not** have between-row dividers (cleaner with the tiles already providing visual rhythm). Tile color does the row distinction.

### Cerrar Sesión button (mobile)

| Property | Value |
|---|---|
| Container | sticky bottom bar, `padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 24px))`, top border `1px solid {rule}`, bg `{paper}` |
| Button | full-width, padding 14px, centered, `gap: 10px`, `border-radius: 14px` |
| Color | `#C53D3D` |
| Border | `1.4px solid rgba(197,61,61,0.4)` |
| Background | `rgba(197,61,61,0.02)` → `rgba(197,61,61,0.08)` on hover/press |
| Press | `transform: scale(0.985)` |
| Font | Inter 600 / 14.5px |

### Floating X close

| Property | Value |
|---|---|
| Position | absolute, `top: 16px, right: 16px`, `z-index: 50` |
| Size | `34 × 34px`, fully round |
| Background | `rgba(255,255,255,0.85)` + `backdrop-filter: blur(8px)` |
| Shadow | `0 2px 8px rgba(0,0,0,0.18)` |
| Glyph | `close`, 16px stroke 2, `#1F2937` |
| Press | `scale(0.92)` |
| Hover | `scale(1.05)` |

### Scrim

| Property | Value |
|---|---|
| Background | `rgba(8, 20, 55, 0.42)` |
| Backdrop filter | `blur(3px) saturate(180%)` |
| Animation | `opacity 0 → 1` over 320ms |
| Tap | closes the drawer |

### Toast — "Cambiaste a modo X"

Shown each time the user successfully switches mode. Auto-dismisses after **2.4s**.

| Property | Value |
|---|---|
| Position | `top: 60px`, `left: 16px`, `right: 70px` (clears the X button) |
| Layout | flex row, `gap: 10px`, `padding: 12px 16px 12px 14px` |
| Background | `rgba(255,255,255,0.92)` + `blur(14px) saturate(180%)` |
| Radius | `999px` (pill) |
| Shadow | `0 10px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)` |
| Text | Inter 500 / 14px / `#1F2937` |
| Check icon | 22px circle, bg `#2D9C5F`, white check inside (13px stroke 2.4) |
| Animation | translateY(-12px) + scale(.96) + opacity 0 → 1, 360ms cubic-bezier(.2,.8,.3,1) |

## Behavior

### Entrance

```css
.drawer { animation: slide 380ms cubic-bezier(0.2, 0.7, 0.35, 1) both; }
@keyframes slide {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.scrim { animation: scrim 320ms ease both; }
@keyframes scrim {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

### Exit

Reverse `slide` and `scrim` over **300ms** when dismissing.

### Mode switch

- Same cross-fade as desktop (280ms on color tokens).
- Sliding indicator (340ms).
- Content re-keyed by `mode` → 240ms fade.
- Row stagger (35ms step, 80ms initial offset, 320ms each).
- **Toast** appears once the new mode is committed (see above).

### Dismiss

- Tap scrim, X button, or system back gesture → exit animation.
- Routing to another screen → instant dismiss.

---

## Design Tokens (shared)

### Colors — Personal mode

| Token | Hex / value |
|---|---|
| `personal.paper` | `#F5F7FE` |
| `personal.ink` | `#0E1F5C` |
| `personal.muted` | `rgba(14, 31, 92, 0.55)` |
| `personal.accent` | `#2244C8` |
| `personal.accentSoft` | `rgba(34, 68, 200, 0.10)` |
| `personal.rule` | `rgba(14, 31, 92, 0.08)` |

### Colors — Comercial mode

| Token | Hex / value |
|---|---|
| `comercial.paper` | `#FEF6EC` |
| `comercial.ink` | `#4D2308` |
| `comercial.muted` | `rgba(77, 35, 8, 0.55)` |
| `comercial.accent` | `#F58220` |
| `comercial.accentSoft` | `rgba(245, 130, 32, 0.13)` |
| `comercial.rule` | `rgba(77, 35, 8, 0.09)` |

### Colors — Shared

| Token | Hex / value |
|---|---|
| `brand.header` | `#1E3FAB` |
| `status.online` | `#4CC777` |
| `status.success` | `#2D9C5F` |
| `avatar.text` | `#FFFFFF` |
| `chevron.idle` | `rgba(0, 0, 0, 0.25)` |
| `signout.red` | `#C53D3D` |
| `tab.inactive.bg` | `rgba(255, 255, 255, 0.08)` |
| `tab.inactive.fg` | `rgba(255, 255, 255, 0.60)` |
| `tab.inactive.border` | `rgba(255, 255, 255, 0.12)` |
| `tab.inactive.hover.bg` | `rgba(255, 255, 255, 0.14)` |
| `tab.inactive.hover.fg` | `rgba(255, 255, 255, 0.85)` |

> **Implementation tip:** Set CSS custom properties on a root `.drawer` (`--paper`, `--ink`, `--accent`, `--accent-soft`, `--rule`, `--muted`). Update them based on `mode`. Add `transition: background-color 280ms ease, color 280ms ease, border-color 280ms ease` on the elements consuming them — the browser will transition the resolved values even though it cannot transition custom-prop values directly.

### Typography

| Family | Source |
|---|---|
| Body / UI | **Inter** (400, 500, 600) — Google Fonts |
| Display (avatar initial only) | **Instrument Serif** 400 — Google Fonts |

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif&display=swap" rel="stylesheet" />
```

### Shadows

| Use | Value |
|---|---|
| Desktop card | `0 30px 70px -20px rgba(10, 30, 90, 0.45), 0 6px 16px rgba(10, 30, 90, 0.15)` |
| Mobile tile | `0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18)` |
| Mobile X close | `0 2px 8px rgba(0,0,0,0.18)` |
| Mobile toast | `0 10px 28px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)` |
| Avatar halo (Personal) | `0 0 0 4px #F5F7FE, 0 0 0 5px rgba(34, 68, 200, 0.10)` |
| Avatar halo (Comercial) | `0 0 0 4px #FEF6EC, 0 0 0 5px rgba(245, 130, 32, 0.13)` |

### Motion

| Animation | Duration | Easing |
|---|---|---|
| Desktop entrance pop | 320ms | `cubic-bezier(0.2, 0.7, 0.35, 1)` |
| Mobile drawer slide-in | 380ms | `cubic-bezier(0.2, 0.7, 0.35, 1)` |
| Mobile scrim fade-in | 320ms | `ease` |
| Mode cross-fade (color) | 280ms | `ease` |
| Indicator slide | 340ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Content re-fade on mode change | 240ms | `ease` |
| Row stagger — desktop | 320ms each, 40ms step, 60ms offset | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Row stagger — mobile | 320ms each, 35ms step, 80ms offset | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Row hover (bg, padding, chevron, side-bar) | 200–240ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Toast in | 360ms | `cubic-bezier(0.2, 0.8, 0.3, 1)` |

> **Reduced motion** — wrap all of the above in `@media (prefers-reduced-motion: reduce)` and short-circuit to instant transitions / fades only.

---

## Assets / Icons

All iconography is inline SVG, single path / line, stroke-based (`currentColor`, `stroke-linecap: round`, `stroke-linejoin: round`). Source paths are in `reference/Icons.jsx`.

Glyphs needed:

| Name | Used in | Notes |
|---|---|---|
| `person` | Personal tab | head circle + shoulders arc |
| `store` | Comercial tab | storefront |
| `box` | Mis Publicaciones | isometric 3D box |
| `bookmark` | Mis Guardados | bookmark shape |
| `user` | Mi Perfil | head + shoulders |
| `chevron` | row affordance | right chevron |
| `logout` | Cerrar Sesión | door + outward arrow |
| `pin` | Puerto Peñasco (mobile) | location pin |
| `card` | CardYA (mobile) | card / wallet |
| `scan` | ScanYA (mobile) | 4 corner brackets + center line |
| `chart` | Business Studio (mobile) | 3 bar chart |
| `ticket` | Mis Cupones (mobile) | ticket with notches |
| `close` | Mobile X close | crossed lines |
| `check` | Mobile toast | check mark |

The codebase likely has its own icon set — **prefer the existing icons** if they match. The glyphs above are placeholders; the only constraints are size + stroke weight + color (white inside tiles, `currentColor` elsewhere).

---

## Accessibility

Apply to both variants:

- Tabs: `role="tablist"` / `role="tab"` with `aria-selected`. Arrow keys move focus between tabs.
- Items: `<button>` or `<a>` with visible focus rings (use `accent`, 2px outline, 2px offset).
- Drawer container: `role="menu"` (desktop) or `role="dialog"` + `aria-modal="true"` (mobile). Trap focus while open.
- `Esc` closes both variants.
- Online dot needs an accessible label (e.g., `aria-label="Disponible"`).
- Toast: `role="status"` + `aria-live="polite"`.
- Color contrast: paper vs ink, accent vs paper, and accent vs white inside tiles all clear WCAG AA. Verify with your accessibility tooling.

---

## Open questions for product

1. **Comercial tab when the user has no Comercial account** — should open an onboarding flow. Not designed.
2. **Puerto Peñasco** as a menu item — is it a location selector, area filter, or static label? Drives whether tapping it opens a picker or navigates.
3. **Item count parity** — desktop hides Mis Publicaciones from Comercial; mobile shows different sub-app shortcuts entirely. Confirm the intended difference vs treat as a bug.
4. **Sub-app icons** for CardYA, ScanYA, Business Studio — provide branded icons or keep the generic stand-ins.

---

## Files

In `reference/`:

| File | What it is |
|---|---|
| `preview.html` | Full prototype — open in a browser to see both variants live |
| `DrawerDesktop.jsx` | Desktop drawer reference component (`DualTabsV2`) |
| `DrawerMobile.jsx` | Mobile drawer reference component (`DualTabsMobile`) |
| `Icons.jsx` | All inline SVG icons used (`Icon` component, `name` prop) |
| `data.js` | Sample account data and item lists per platform |

To inspect the final design, open `preview.html` in a browser. The top two sections are the ones to implement:

1. **"Dual Tabs v2 · Mobile"** — the mobile variant in both modes.
2. **"Dual Tabs v2 · Desktop (Azul & Naranja)"** — the desktop variant in both modes.

The remaining sections (Quiet Lux, Studio Dark, Aurora Glass, Dual Tabs v1) are earlier exploration kept for context — **do not implement those**.
