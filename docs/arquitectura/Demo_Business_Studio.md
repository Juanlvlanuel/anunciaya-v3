# Demo de Business Studio para vendedores

> **Estado:** Construido y **funcionando E2E en DEV** (30 jun 2026). El vendedor abre "Demo BS" desde el
> Panel → overlay embebido → BS con datos, todos los módulos cargan, sesión aislada, sin expulsiones.
> **Bugs corregidos en QA:** constraints del seed (ofertas.tipo, código voucher), trigger de
> metricas_entidad (upsert en seed y clonado), rendimiento del clonado (inserts por lote, evita timeout),
> aislamiento de sesión (sessionStorage en demo), "Mi Perfil" (excepción del dueño en obtenerPerfilSucursal),
> inactividad desactivada en demo, y **la causa real del modal "Sesión expirada": `RutaPrivada.tsx` leía
> localStorage** (fix: storage activo + `esModoDemo()`).
> **QA en DEV 100% ✅** (validado por Juan): entrar · navegar módulos con datos · crear producto/oferta ·
> ofertas en el preview · aislamiento entre cuentas (cada quien su copia) · "Reiniciar demo" borra y
> vuelve limpio.
> **Pendiente (cierre):** en PROD correr seed (`pnpm exec tsx src/scripts/seedDemoMaestro.ts`) +
> configurar `VITE_WEB_URL` (Vercel del Panel) · **commit** de todo (incluir schema.ts; migración ya en
> prod). Antes del commit: revisar el árbol y stagear solo lo del demo [[feedback_verificar_alcance_commit]].
> **Progreso:** Fases 1–8 completas en DEV ✅.
> Migración `2026-06-30-demo-business-studio.sql` ya corrida en DEV+PROD. `schema.ts` editado pero
> **sin commitear aún** junto al resto (regla: no subir schema antes que su migración en prod).
>
> **Pasos que faltan (de Juan):**
> 1. Correr el seed del maestro: `cd apps/api && pnpm exec tsx src/scripts/seedDemoMaestro.ts` (en DEV;
>    y en PROD cuando se valide). Idempotente.
> 2. Configurar `VITE_WEB_URL` en `apps/admin` → la URL de la app web (DEV: `http://localhost:3000`;
>    PROD: el dominio real de la app, en las env vars de Vercel del proyecto del Panel).
> 3. QA E2E: abrir demo desde el Panel, recorrer los 13 módulos de BS, reiniciar, 2º vendedor.
>
> **Ajustes de diseño durante la construcción (vs. plan original):**
> - **Clientes sintéticos COMPARTIDOS** (no clonados por copia): los crea el seed (`@demo.anunciaya.local`);
>   cada copia genera su propia actividad (billeteras/transacciones/…) referenciando esos clientes + su
>   negocio. Más simple y el borrado de una copia no toca clientes. Cada copia ve "los mismos clientes"
>   con su propia actividad — aceptable para un demo.
> - **Helmet/CSP no requirió cambios:** la app web (Vercel) no envía `X-Frame-Options` ni
>   `frame-ancestors`, así que el iframe cross-origin del Panel funciona tal cual. Nota de robustez: si
>   en el futuro se añade CSP a la app web, incluir `frame-ancestors 'self' https://<panel>`.
> - **Seed en `apps/api/src/scripts/`** (no `scripts/`), para que lo cubra el typecheck.
> - **Borrado de copia explícito** (orden inverso por `negocio_id`), no por cascada.
> **Origen de la idea:** `docs/ROADMAP.md` línea 241 — *"Demo de Business Studio: demo maestro
> (cuenta comercial marcada, administrada por SuperAdmin con BS normal) + copia privada por
> sesión de vendedor (respeta el 1:1 negocio-dueño)."*

---

## 1. Qué problema resuelve

Los **vendedores** del Panel Admin necesitan **mostrar Business Studio** a comerciantes
prospecto durante una visita de ventas ("mira todo lo que puedes hacer con tu negocio aquí
adentro"). Hoy no pueden: el acceso a BS se resuelve por `usuarios.negocio_id`, y un vendedor
no tiene negocio propio. Aunque lo tuviera, no querríamos que arriesgara datos reales jugando
en una demo.

**La solución NO reconstruye Business Studio.** BS ya existe y está completo (13 módulos). Lo
que se construye es:

1. **Un negocio demo "con vida"** (catálogo, ofertas, y ~90 días de actividad simulada:
   clientes, ventas, opiniones, canjes) para que BS tenga algo que mostrar en cada pantalla.
2. **Una copia privada por vendedor** de ese negocio, para que cada quien juegue en su sandbox
   sin pisar a los demás; con botón **"Reiniciar demo"** para volver a foja cero.
3. **Un puente fluido** Panel → BS: BS se abre **embebido dentro del Panel** (no te redirige a
   otro lado), con una barrita **"← Salir"** que te regresa al Panel instantáneamente.

---

## 2. Decisiones de diseño (cerradas con Juan, 30 jun)

| Decisión | Elección | Por qué |
|---|---|---|
| **Modelo** | Demo maestro + copia privada por vendedor | Es la visión del ROADMAP; respeta el 1:1 negocio↔dueño |
| **Ciclo de vida de la copia** | Persistente (1 por vendedor) + botón "Reiniciar demo" | Predecible, sin basura por sesión; el vendedor decide cuándo limpiar |
| **Riqueza del demo** | Completo, con actividad simulada | Sin ventas/clientes/opiniones, Dashboard/Transacciones/Clientes/Opiniones se ven vacíos |
| **Entrada** | Botón en el shell del Panel | Descubrible siempre, no escondido en una ficha |
| **Transición Panel↔BS** | **BS embebido (overlay/iframe)** + barrita "Salir" | Fluido, sin redirección brusca; envejece bien con la app nativa (= WebView embebido) |
| **Dueño de la copia** | **Usuario-sombra** (cuenta comercial sin login, ligada al vendedor) | El vendedor NO debe quedar atado a un `negocio_id`; así los middlewares funcionan SIN cambios |
| **Plataforma** | Web hoy (beta); backend agnóstico al cliente | La app nativa no existe aún; el motor del puente sirve igual para web/PWA/nativo |

---

## 3. Hallazgo clave que condiciona la arquitectura

El "vendedor" **no es una entidad aparte**: es una fila de `usuarios` con `rol_equipo='vendedor'`.
El Panel (`apps/admin`) usa el **mismo** `/auth/login` y los **mismos JWT** que `apps/web` (solo
los guarda con prefijo `ayadmin_` en localStorage). Todo el acceso a BS se resuelve desde
`usuarios.negocio_id` (ver `verificarNegocio` en `apps/api/src/middleware/negocio.middleware.ts`,
busca `negocios.usuarioId = usuarioId` primero).

→ Por eso la copia tiene un **usuario-sombra dueño** y el vendedor entra por **impersonación
temporal**: nunca se toca su `negocio_id`, y `verificarNegocio` / `validarAccesoSucursal` /
`resolverNegocioUsuarioId` funcionan **sin modificarse**.

---

## 4. Esquema de datos nuevo

Columnas nuevas en `negocios` (schema en `apps/api/src/db/schemas/schema.ts`; migración SQL
en `docs/migraciones/2026-06-30-demo-business-studio.sql`, la corre Juan):

- `es_demo boolean NOT NULL DEFAULT false` — bandera de exclusión pública (maestro **y** copias).
- `demo_tipo varchar(10)` CHECK `('maestro','copia')`, nullable (null = negocio normal). Enum
  textual en vez de dos booleanos para evitar estados imposibles (no puede ser maestro y copia).
- `demo_vendedor_id uuid REFERENCES usuarios(id) ON DELETE CASCADE` — solo en copias: qué
  vendedor es dueño funcional. Unique parcial `WHERE demo_tipo='copia'` ⇒ **1 copia por vendedor**.
- `demo_maestro_id uuid REFERENCES negocios(id) ON DELETE SET NULL` — de qué maestro se clonó
  (trazabilidad; "Reiniciar" sabe el origen).

Índices: `idx_negocios_es_demo (es_demo) WHERE es_demo=true` y unique parcial por vendedor.

**Por qué un flag `es_demo` separado y no reusar `activo`:** el demo necesita `activo=true`,
`es_borrador=false`, `onboarding_completado=true` para que **los 13 módulos** de BS funcionen
completos — pero debe estar **oculto del público**. Reusar `activo=false` rompería BS. Por eso
flag aparte + excluir demos en TODAS las queries públicas.

---

## 5. Service de clonado — `apps/api/src/services/demoBusinessStudio.service.ts` (nuevo)

`crearCopiaDemo(vendedorId)` (todo en UNA transacción):

1. Crear **usuario-sombra dueño** (helper análogo a `crearNegocioConDueno`,
   `negocioManagement.service.ts` L1757, pero **sin** comisiones/emails/pagos):
   `usuarios(perfil='comercial', tieneModoComercial=true, modoActivo='comercial', estado='activo',
   contrasenaHash=null, correo sintético único)`.
2. Crear la copia: `negocios(es_demo=true, demo_tipo='copia', demo_vendedor_id=vendedorId,
   demo_maestro_id=maestro.id, es_borrador=false, onboarding_completado=true, participa_puntos=true,
   activo=true)`. El `usuario_id` de la copia es el usuario-sombra.
3. **NO** se toca `usuarios.negocio_id` del vendedor.

**Orden de inserts + remapeo de IDs** (mapas en memoria: sucursal, artículo, recompensa, billetera,
cliente). Clonar en este orden, remapeando los FK al ir avanzando:

`negocio_sucursales` → `negocio_horarios` → `negocio_metodos_pago` → `negocio_galeria` →
`asignacion_subcategorias` → `articulos` → `articulo_sucursales` (remapeo **doble**: artículo+sucursal)
→ `ofertas` (remapear `articulo_id` si no-null) → `recompensas` → `puntos_configuracion` (1:1) →
**clientes sintéticos** (usuarios) → `puntos_billetera` → `puntos_transacciones` (regenerar
`created_at` escalonado últimos 90 días) → `vouchers_canje` (**regenerar `codigo` 6-char y `qr_data`**,
no copiar por el UNIQUE) → `recompensa_progreso` → `resenas` → recalcular `metricas_entidad`.

**"Ya existe copia":**
- **Abrir demo:** si existe `demo_tipo='copia' AND demo_vendedor_id=$1` → reutilizar; si no → crear.
- **Reiniciar demo:** `borrarCopiaDemo` (borrar usuario-sombra ⇒ cascada borra el negocio y todo lo
  que cuelga; borrar clientes sintéticos de esa copia) y luego `crearCopiaDemo`. **NO** disparar
  limpieza R2 (las URLs son del maestro, siguen referenciadas).

**Tablas de actividad simulada (nombres reales del schema):** un "cliente" es un `usuario` con una
`puntos_billetera (usuario_id, negocio_id)` en ese negocio. Compras = `puntos_transacciones`
(`billetera_id, negocio_id, cliente_id, sucursal_id`). Canjes = `vouchers_canje` (`codigo` UNIQUE).
Sellos = `recompensa_progreso`. Opiniones = `resenas` (`destino_tipo='negocio'`, `destino_id`=negocio,
`autor_id`=cliente); agregados en `metricas_entidad`.

---

## 6. Endpoints (backend)

`apps/api/src/services/demoBusinessStudio.service.ts` + controller `controllers/admin/` + rutas
`routes/admin/demoBusinessStudio.routes.ts` (montadas en `routes/admin/index.ts`). Autorización
`requierePanel(['vendedor','gerente','superadmin'])`. El `vendedorId` efectivo = `req.usuarioPanel.usuarioId`
(cada quien su copia; un super probando genera la suya).

- `POST /api/admin/demo-bs/abrir` → crea-o-reutiliza copia; devuelve `{ negocioId, sucursalPrincipalId, handoffToken }`.
- `POST /api/admin/demo-bs/reiniciar` → borra + regenera.
- `GET  /api/admin/demo-bs/estado` → `{ existeCopia, creadaAt }` (para pintar "Abrir" vs "Reiniciar").
- Si no hay maestro sembrado → 409 "Demo maestro no configurado".

---

## 7. Puente fluido Panel → BS (embebido + impersonación)

**Backend (token de impersonación):**
1. `POST /demo-bs/abrir` genera un **handoffToken** (UUID en Redis, TTL ~2 min, un solo uso;
   reutiliza el patrón de `tokenTemporal`/2FA en `auth.service.ts`) asociado a
   `{ vendedorId, copiaNegocioId, usuarioDuenoId, sucursalPrincipalId }`.
2. Nuevo endpoint `POST /auth/demo/canjear-handoff` (en `auth.routes.ts`): valida el token y firma
   JWT de impersonación **apuntando al `usuarioDuenoId`** (no al vendedor), con `modoActivo='comercial'`,
   `sucursalAsignada=null`. Payload marca `esDemoImpersonacion=true` + `vendedorRealId` (auditoría).
   ⇒ `verificarNegocio` y `resolverNegocioUsuarioId` funcionan **sin cambios**.

**Frontend — BS embebido (la transición fluida que pidió Juan):**
1. Botón en el shell del Panel → `POST /demo-bs/abrir` → recibe `handoffToken`.
2. El Panel abre un **overlay a pantalla completa** con un `<iframe
   src="<web>/business-studio/demo-entrada?handoff=<token>">`. Visualmente **no sales del Panel**;
   BS aparece encima, con una barrita propia "← Salir".
3. Nueva ruta pública en `apps/web` `DemoEntrada.tsx`: al montar lee `?handoff`, llama
   `POST /auth/demo/canjear-handoff`, guarda los JWT en el localStorage de `apps/web` (vía
   `useAuthStore`), setea `usuario` con `modoActivo='comercial'` + `negocioId` de la copia, limpia el
   query param y `navigate('/business-studio')`. El `ModoGuard` ya deja pasar.
4. **"← Salir"** vive en la barrita del Panel (encima del iframe): cierra el overlay y vuelves al
   Panel **sin recargar**.

**Aislamiento de sesión (CRÍTICO):** el iframe corre en el MISMO origen que la app web, así que
comparte `localStorage`. Sin aislar, el demo (a) hereda la sesión real que ya haya en esa pestaña y
(b) la PISA. Solución en `useAuthStore.ts`: cuando la app arrancó en `/business-studio/demo-entrada`
(`esModoDemo()`), la persistencia va a **`sessionStorage`** (propio de cada iframe, no compartido, se
descarta al cerrar) en vez de `localStorage`. Además, en modo demo NO se conecta Socket.io ni se
cargan notificaciones/chat (leen la identidad real de `localStorage`); los datos de BS cargan por API
con el token del demo, así que se ve completo igual. Marca persistida en `sessionStorage['ay_demo_activo']`.

**Costo técnico del embebido:** la web de AnunciaYA hoy bloquea ser embebida (Helmet
`X-Frame-Options`/CSP `frame-ancestors`). Hay que **autorizar solo al dominio del Panel** para la(s)
ruta(s) del demo. Ajuste controlado y acotado.

**App nativa (futuro):** el overlay/iframe = una **pantalla WebView embebida** en la app del Panel,
con la misma barrita "Salir" y el mismo token. El backend del puente no cambia; solo se agrega un
deep link como variante de canje. Cero retrabajo de backend.

---

## 8. Botón en el shell del Panel + UI

`apps/admin/src/components/shell/EncabezadoEscritorio.tsx` (+ gemelo móvil) → componente nuevo
`apps/admin/src/components/demo/BotonDemoBS.tsx`. Estado vía React Query
(`hooks/queries/useDemoBS.ts` consumiendo `GET /demo-bs/estado`). Botón primario "Abrir demo de BS"
(abre el overlay); secundario "Reiniciar demo" (confirm modal). Service `services/demoBSService.ts`.

---

## 9. Siembra del demo maestro

**Script idempotente** `apps/api/src/scripts/seedDemoMaestro.ts` (lo corre Juan), NO alta manual a
mano: el maestro debe ser reproducible/re-sembrable, y decenas de transacciones/vouchers/reseñas con
fechas escalonadas son inviables a mano. Crea (o actualiza por `demo_tipo='maestro'`) el negocio +
contenido curado + actividad simulada (90 días). Imágenes del demo en carpeta R2 `demo/`, que se
añade a `CARPETAS_PROTEGIDAS` en `imageRegistry.ts` para que el recolector nunca las borre.

---

## 10. Fases de construcción

1. **Schema + migración** — 4 columnas en `negocios` + índices/uniques parciales.
2. **Ocultar de público** — `AND es_demo = false` en TODAS las queries públicas: `negocios.service.ts`
   (L401), `ofertas.service.ts`, `ofertas/buscador.ts`, `marketplace.service.ts`, `onboarding.service.ts`,
   `chatya.service.ts`. Auditar cada una.
   **Gotcha:** las queries de DETALLE que BS también reutiliza deben ocultar el demo del público PERO
   dejar que su dueño lo vea: `AND (n.es_demo = false OR n.usuario_id = ${userId})`. Ya corregidas así:
   `obtenerPerfilSucursal` (negocios.service.ts, "Mi Perfil" → daba "Sucursal no encontrada") y
   `obtenerFeedOfertas` (ofertas.service.ts L307, ofertas del perfil/preview con `?sucursalId` → no
   salían las ofertas). El catálogo (articulos.service.ts), reseñas, galería y horarios NO filtran
   es_demo, así que se ven bien. Los feeds/buscadores/destacados PUROS sí llevan `es_demo = false` a
   secas. Regla: si una query pública puede pedirla el dueño (perfil/preview con id), usar la excepción.
3. **Service de clonado** — `demoBusinessStudio.service.ts` (`crearCopiaDemo`/`borrarCopiaDemo`).
4. **Endpoints admin** — abrir / reiniciar / estado.
5. **Puente** — `/auth/demo/canjear-handoff` + token Redis + `DemoEntrada.tsx` + persistencia en
   `useAuthStore` + ajuste de embebido (Helmet/CSP).
6. **UI Panel** — `BotonDemoBS` (overlay/iframe + barrita "Salir") + service + hook.
7. **Seed maestro** — `seedDemoMaestro.ts` + carpeta R2 `demo/` protegida.
8. **QA** — 13 módulos con vida; reiniciar; 2º vendedor (aislamiento); imágenes compartidas no se
   borran al reiniciar; el demo no aparece en buscadores públicos.

---

## 11. Puntos de riesgo

- **R2 / reference counting:** las copias **comparten** las URLs del maestro (se copia el string,
  no el objeto). `borrarCopiaDemo` NO debe disparar `eliminarImagenSiHuerfana` sobre esas URLs
  (siguen referenciadas por el maestro). Carpeta `demo/` protegida. Probar en QA. Ver
  `docs/arquitectura/Mantenimiento_R2.md`.
- **Borrado en cascada:** el usuario-sombra y los clientes sintéticos NO cuelgan de `negocios` (cuelgan
  al revés: `negocios.usuario_id → usuarios ON DELETE cascade`). Borrar **primero el usuario-sombra**
  (cascada borra el negocio por `negocios_usuario_id_fkey`) y los clientes sintéticos; cuidar el orden
  para no dejar billeteras/transacciones huérfanas. Probar.
- **1:1 negocio↔dueño:** RESUELTO por diseño (usuario-sombra + impersonación; el `negocio_id` del
  vendedor nunca se toca).
- **Códigos únicos:** `vouchers_canje.codigo` (UNIQUE 6-char) y `qr_data` se **regeneran** al clonar.
- **Impersonación:** token de un solo uso, TTL corto, sin permitir flujos de pago/Stripe (el demo no
  tiene suscripción real). Auditar `vendedorRealId`.
