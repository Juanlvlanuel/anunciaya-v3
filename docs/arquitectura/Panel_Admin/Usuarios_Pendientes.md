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
> **Última actualización:** 11 Junio 2026 — **Fases 0/1/2 completas + doc canónico escrito.** El
> módulo está **en uso**; falta el pulido visual final (Fase 3) y los V2.

---

## Estado del módulo

**Construido y en uso.** VER + acciones (soporte + moderación) + visibilidad por jerarquía y
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

---

## Pendiente

### 🟡 Pulido visual final (Fase 3)
- [ ] Repaso de [`Tokens_Panel.md`](Tokens_Panel.md) (texto/tonos/bordes/sombras), responsive
      `lg`/`2xl`, variantes móvil/desktop, consistencia con Negocios.
- [ ] Verificación en UI aún no cerrada: login real de una cuenta **suspendida** (403
      `CUENTA_SUSPENDIDA`); confirmar que suspender al **dueño** de un negocio **no** oculta el
      negocio en la app (por diseño solo toca `usuarios.estado`).

### 🟢 Fuera de V1 (V2 consciente — anotado, no escondido)
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
### Módulo: USUARIOS   ·   Fase actual: 3 (Cerrar)

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
