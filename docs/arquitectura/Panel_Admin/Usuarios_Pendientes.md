# Usuarios — Pendientes (checklist de la pantalla)

> **Qué es este documento:** lo que **falta** por hacer en la pantalla Usuarios del Panel Admin.
> Lo ya construido (qué ES y cómo funciona) vive en el documento hermano
> **[`Usuarios.md`](Usuarios.md)**.
>
> **Regla de oro:** cuando un pendiente se termina, se **borra de aquí** y, si cambió el
> comportamiento, se documenta en `Usuarios.md`. Uno se vacía, el otro crece. Nunca describen lo
> mismo a la vez.
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantilla de oro: Negocios.**
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · ✅ hecho
>
> **Última actualización:** 19 Junio 2026 — **migración global ciudad→catálogo cerrada**: `usuarios.ciudad_id`
> ya es la fuente (lecturas/escrituras vía catálogo) y la columna texto `usuarios.ciudad` se DROPeó en
> DEV; el **DROP en PROD es el único paso operativo restante** (ver "Pendiente" abajo y `Usuarios.md`
> §12). Antes (16 Jun 2026): módulo cerrado; se le **agregó medición/filtrado por ciudad** (`ciudad_id`
> + puente de ubicación + filtro y métrica "por ciudad"; ver `Usuarios.md` §12 / Apéndice I),
> **aplicado en DEV y PROD** (migración + seed del catálogo + backfills). De paso se completó la
> **campaña ciudad↔región en PROD** (faltaban datos: region_id en ciudades + backfill de sucursales).
> Pendiente solo los V2 de abajo.

---

## Estado del módulo

**Cerrado y en uso (Fase 3 completa, 15 Jun 2026).** VER + acciones (soporte + moderación) + visibilidad por jerarquía y
región + lente del superadmin + expediente 360 depurado, todo verificado con datos reales y
`tsc`/build en verde. La definición y el funcionamiento completos están en
[`Usuarios.md`](Usuarios.md).

Lo que el módulo ganó **más allá de la spec original de Fase 0** (que asumía gerente
*cross-región* y sin región en `usuarios`):

- **Taxonomía de roles** en la columna "Rol": SuperAdmin / Gerente regional / Vendedor / Dueño /
  Gerente de sucursal / Usuario (con el filtro acoplado al rol del que mira).
- **Visibilidad por jerarquía + región:** el gerente ya **no** es cross-región — ve clientes de
  toda la plataforma, pero dueños/encargados/vendedores **solo de su región** (deducida igual que
  en Negocios), y **nunca** otros gerentes ni el superadmin.
- **Lente de región del superadmin** ("Ámbito de la plataforma") ahora aplica en Usuarios.
- **Expediente depurado:** se quitaron campos de ruido (perfil, modo activo, reputación, reseñas,
  puntos); correo e ID **copiables**; login social/2FA movidos a "Acceso".
- **Métrica "último acceso al Panel"** (cuentas de equipo) — columna `ultimo_acceso_panel`,
  migración `usuarios_ultimo_acceso_panel.sql`.
- **Medición y filtrado por ciudad** (16 Jun 2026): columna `usuarios.ciudad_id` (FK al catálogo,
  gemela de `negocio_sucursales`), puente GPS→backend (`PATCH /auth/ubicacion`), filtro por ciudad +
  métrica "por ciudad" en la pantalla. La ciudad **no** altera la visibilidad por región (V2).
  Migración `2026-06-16-usuarios-ciudad-id.sql` + backfill `mapear-usuario-ciudad-id.ts`. **Migración
  global ciudad→catálogo cerrada (19 Jun 2026):** lecturas y escrituras ya van por `ciudad_id`
  (resolución vía `resolverCiudadId`) y la columna texto `usuarios.ciudad` quedó **DROPeada en DEV**;
  el **DROP en PROD es el único paso operativo restante**. Detalle: `Usuarios.md` §12 y Apéndice I.

---

## Pendiente

> **Fase 3 cerrada (15 Jun 2026):** pulido visual final ✅ (tokens/responsive/variantes
> móvil-desktop, consistencia con Negocios) y verificación de suspensión ✅ (login de cuenta
> suspendida → 403 `CUENTA_SUSPENDIDA`, no entra a AY; suspender al dueño **no** oculta su negocio).
> El módulo queda **cerrado**. Lo único que sigue son los V2 de abajo.

### 🟡 Operativo pendiente (migración ciudad→catálogo)
- 🟡 **DROP de `usuarios.ciudad` en PROD:** el código y DEV ya viven sin la columna texto (lecturas y
  escrituras por `ciudad_id`); falta correr el DROP en la BD de producción para cerrar la fase
  **contract** de la migración global ciudad→catálogo. Es el último paso operativo del módulo.

### 🟢 Fuera de V1 (V2 consciente — anotado, no escondido)
- 🟢 **Acoplar la región del cliente a la visibilidad:** hoy `ciudad_id` solo mide/filtra; el gerente
  ve a **todos** los clientes. Restringirlos por región (vía `ciudad_id → ciudades.region_id`) es V2.
- 🟢 **Canal de denuncias + bandeja de moderación** (reportar desde reseñas/MarketPlace/ChatYA →
  bandeja del Panel → acción). Hoy suspender es 100% reactivo: la *palanca* existe, la **señal**
  (cómo te enteras del abuso) es V2.
- 🟢 **Deep-link entre módulos:** botón "ver dueño / ver usuario" desde la ficha de Negocio → ficha
  de Usuario (la forma natural de llegar al módulo, sin buscar a mano).
- 🟢 **Promover / degradar perfil** personal↔comercial (con guard: no degradar a un dueño de
  negocio activo → remite a "Cancelar negocio").
- ⚪ **Comunicación** (enviar aviso/correo a un usuario desde el Panel).
- ⚪ **Privacidad** (exportar/borrar datos del usuario, LFPDPPP).

---

## Checklist del carril

```
### Módulo: USUARIOS   ·   Fase actual: ✔ Cerrado

Fase 0 — Definir ........ [x]  (la definición vigente vive en Usuarios.md)
Fase 1 — VER ............ [x]  (lista + expediente; harness con 52 usuarios reales, sin secretos)
Fase 2 — ACTUAR ......... [x]  (soporte super+gerente + moderación solo super + guards + auditoría)
Fase 3 — Cerrar
- [x] Doc canónico Usuarios.md (2 capas)
- [x] Índices del Panel: Tablero_Modulos.md + Panel_Admin.md actualizados
- [ ] ROADMAP / memoria / kit claude.ai
- [ ] Pulido visual final (ver arriba)
- [ ] Commit a main
```

---

## Referencias

- [`Usuarios.md`](Usuarios.md) — **qué ES y cómo funciona** (documento hermano canónico).
- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo · [`Tablero_Modulos.md`](Tablero_Modulos.md) — índice de módulos.
- [`Negocios.md`](Negocios.md) + [`Negocios_Pendientes.md`](Negocios_Pendientes.md) — plantilla de oro.
- `docs/migraciones/usuarios_ultimo_acceso_panel.sql` — la migración manual del módulo.
- `docs/reportes/PENDIENTES_PanelAdmin.md` — pendientes globales del Panel.
