# 📋 Reporte — Sección Negocios del Panel Admin (Entrega 1: VER)

**Fecha:** 5 Junio 2026
**Alcance:** solo lectura (VER) · **Estado:** terminado y compilando · **Sin commit** (todo en dev)
**Apps tocadas:** `apps/admin` (frontend del Panel) + `apps/api` (backend)

> Primera sección de contenido del Panel Admin. Diseño calcado de
> `Handoff/negocios_section`, escrito con los estándares del Panel (tokens
> propios, español, `lg:`/`2xl:`). La **Entrega 2 (ACTUAR)** —las 4 acciones,
> migraciones y Stripe— **no se tocó**.

---

## 1. Qué se construyó

Vista de administración sobre **todos los negocios** de la plataforma:

- **Tabla** (escritorio) / **tarjetas** (móvil) con buscador por nombre y filtros
  (estado de pago con conteos, vendedor, ciudad) + "Ordenar" + paginado de servidor.
- **Ficha administrativa** al hacer clic: datos del negocio, estado de membresía +
  fechas, dueño de la cuenta y vendedor atribuido. Sin métricas de actividad.
- **Componentes base reutilizables del Panel** (modal adaptativo + botón atrás
  nativo) que servirán a todas las secciones futuras.
- **Alcance por rol** aplicado en el backend: SuperAdmin = toda la plataforma;
  Gerente = su región; Vendedor = su cartera.

Todo es **solo lectura**: ninguna interacción modifica datos.

---

## 2. Backend (`apps/api`) — todo GET, solo lectura

**Nuevos:**
- `src/services/admin/negocios.service.ts`
- `src/controllers/admin/negocios.controller.ts`
- `src/routes/admin/negocios.routes.ts`

**Modificado:**
- `src/routes/admin/index.ts` — registra el router de negocios **antes** del gate
  global de superadmin (la sección la usan también gerente y vendedor; cada ruta
  trae su propio `requierePanel([roles])`).

**Endpoints:**

| Método | Ruta | Para qué | Roles |
|---|---|---|---|
| GET | `/api/admin/negocios` | Tabla paginada + conteos por estado | los 3 |
| GET | `/api/admin/negocios/vendedores` | Filtro "por vendedor" | superadmin, gerente |
| GET | `/api/admin/negocios/ciudades` | Filtro "por ciudad" | los 3 |
| GET | `/api/admin/negocios/:id` | Ficha administrativa | los 3 |

**Lógica:**
- **Alcance por rol** en el service (no se confía en el front): gerente filtra por
  `negocios.region_id`; vendedor por `negocios.embajador_id` (resuelto desde su
  usuario); superadmin sin restricción.
- **Ciudad** se toma de la **sucursal principal** (`negocio_sucursales`, join) y el
  **vendedor** de `embajadores → usuarios` (join). **Sin categoría** (por decisión).
- **Filtros:** nombre (ILIKE), estado de pago, vendedor (incluye "Sin asignar"),
  ciudad (incluye "Sin ciudad" = placeholder `'Por configurar'`).
- **Orden en servidor** (por el paginado): Nombre A–Z/Z–A, Alta recientes/antiguos,
  Próximo cobro, Estado de pago. Default **Nombre A–Z**.
- **Conteos en servidor:** los chips reflejan los filtros activos de
  ciudad/vendedor/búsqueda **excepto** el de estado, para que cada chip cuadre con
  lo que se ve.
- **Paginado simple** de servidor (20 por página).
- Datos que ya existían y solo se empezaron a mostrar: `fechaProximoCobro` y la
  fecha de alta (`createdAt`).

---

## 3. Frontend del Panel (`apps/admin`)

**Componentes base reutilizables (nuevos):**
- `src/hooks/useBackNativo.ts` — botón **atrás nativo** (Android/iOS/navegador)
  cierra primero el modal sin salir de la sección. Réplica del patrón de apps/web
  (no se importa: apps separadas).
- `src/components/ui/ModalAdaptativo.tsx` — modal **centrado en escritorio /
  bottom-sheet con arrastre en móvil**, con tokens del Panel, animaciones de
  entrada y atrás nativo.

**Componentes de Negocios (nuevos):**
- `src/components/negocios/SeccionNegocios.tsx` — toolbar + tabla + tarjetas + paginación.
- `src/components/negocios/FichaNegocio.tsx` — ficha (cabecera + cuerpo + footer de acciones).
- `src/components/negocios/estadoPago.tsx` — badge *pill* del estado de pago.
- `src/components/negocios/avatares.tsx` — avatares de negocio/vendedor (color por hash) + "sin asignar".
- `src/components/negocios/MenuFiltro.tsx` — dropdown reutilizable (botón + menú con check).

**Datos (nuevos):**
- `src/services/negociosService.ts` — llamadas + tipos.
- `src/hooks/queries/useNegociosAdmin.ts` — hooks React Query (lista, detalle, vendedores, ciudades, prefetch).
- `src/config/queryKeys.ts` — claves centralizadas de React Query del Panel.

**Modificados:**
- `src/pages/PaginaPanel.tsx` — engancha la sección cuando la activa es "Negocios" (sin ruta nueva).
- `src/index.css` — tonos de texto tenue (`texto-3` / `texto-4`) más legibles.

---

## 4. Decisiones de producto aplicadas

- **Sin categoría** en toda la sección (se retoma en Métricas).
- **Paginado simple** de servidor (no scroll infinito).
- **Orden** por defecto Nombre A–Z; corre en servidor.
- **Conteos** que cuadran con los filtros activos (excepto estado).
- **"Sin ciudad"** = placeholder `'Por configurar'` del onboarding.
- **Avatar** coloreado por hash del nombre.
- En la ficha, el vendedor muestra su **código de referido** (dato real).
- Las **4 acciones** (Marcar pagado / Reasignar / Suspender / Cancelar) están como
  **UI deshabilitada** con tooltip "Disponible en la siguiente entrega".
- El **vendedor** (rol) no ve columna ni filtro de vendedor (su cartera es toda suya).

---

## 5. Ajustes de pulido (de las revisiones)

- **Animaciones de entrada** del diseño: telón con fade, modal con fade + scale
  (escritorio), bottom-sheet que sube (móvil).
- **Apertura instantánea de la ficha:** abre con los datos que ya trae la fila
  (*placeholder*) y rellena el resto al vuelo; además **prefetch al pasar el mouse
  / tocar** la fila → datos completos casi siempre ya en caché.
- **Quitada** la descripción de marketing de la ficha (no aporta a una vista admin).
- **Texto tenue más legible** en todo el Panel: `texto-3` y `texto-4` con más
  contraste (claro más oscuro, oscuro más claro).

---

## 6. Qué NO se tocó (a propósito)

- **Entrega 2 intacta:** acciones reales, migraciones de BD y Stripe.
- **CORS** sin tocar. **Sin commit.** Solo dev.
- **apps/web** no se modificó; los componentes se **replicaron**, no se importaron.

---

## 7. Verificación

- Backend: `tsc --noEmit` → sin errores.
- Panel: `tsc -b && vite build` → build OK.

---

## 8. Cómo probar en dev

1. Backend en :4000 + `pnpm --filter @anunciaya/admin dev` → http://localhost:3100.
2. Login con SuperAdmin → menú **Negocios**.
3. Probar: buscador, chips con conteos (cuadran al filtrar), dropdowns de
   vendedor/ciudad/orden, columnas Próximo cobro y Alta, clic en fila → ficha
   (animada, instantánea); en `<1024px`, bottom-sheet con arrastre + botón atrás.

---

## 9. Pendientes menores

- **Contador del menú** de Negocios sigue demo (248/64/19) — conectarlo toca el shell.
- **Selector de región** del header sigue demo.
- Opcional: dejar de enviar `descripcion` en el `SELECT` de la ficha (hoy viaja pero el front la ignora).

---

## 10. Entrega 2 (ACTUAR) — pendiente, decisiones ya cerradas

Las 4 acciones con su lógica (todas reusan el alcance por rol de la Entrega 1):

- **Marcar pagado / reactivar manual** — solo SuperAdmin. Revierte degradación, pone
  `al_corriente` con fecha/meses elegibles (default +1 mes), marca **cobro manual** y
  **pausa el cobro de Stripe** (`pause_collection`, NO cancela).
- **Suspender** — SuperAdmin + Gerente (su región). **Suspensión manual** que el
  webhook respeta (no revive sola con un pago).
- **Cancelar** — solo SuperAdmin. **Soft-delete** (expediente recuperable) + corta el
  cobro de Stripe + **degrada la cuenta a personal** (nunca expulsa a la persona).
- **Reasignar vendedor** — SuperAdmin (cualquiera) / Gerente (su región), con **auditoría**.

**Migraciones que pedirá (no se corren sin OK; dev y prod):** `negocios.metodo_cobro`
(tarjeta/manual), columnas de estado administrativo (suspensión manual + archivado),
tabla `admin_auditoria`.

> **No existe "aprobar"** (Modelo A: los negocios se publican solos al pagar + onboarding).
