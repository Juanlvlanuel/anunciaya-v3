# Usuarios — Pendientes (checklist único de la pantalla)

> **Qué es este documento:** la **única fuente de verdad** de lo que falta por hacer en la
> **pantalla Usuarios** del Panel Admin. Es el mapa de trabajo del módulo mientras se construye.
>
> **Documento hermano (aún no existe):** `Usuarios.md` describirá **qué ES y cómo funciona**
> (lo ya construido). Nace en la **Fase 3 (Cerrar)**. Hasta entonces, la definición del módulo
> vive aquí abajo (§Definición — Fase 0).
>
> **Regla de oro (para que no se desfasen):** cuando un pendiente de aquí se termina, se
> **borra de este checklist** y, si cambió el comportamiento, se documenta en `Usuarios.md`.
> Uno se vacía, el otro crece. Nunca describen lo mismo a la vez.
>
> **Proceso:** se construye con el carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (Fase 0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantilla de oro: Negocios** (se calca su código).
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · 🟡 a medias · ✅ hecho
>
> **Última actualización:** 10 Junio 2026 — **Fase 0 (Definir) cerrada**. Siguiente: Fase 1 (VER).

---

## Estado del módulo

**Fase 1 (VER) completada.** Backend + frontend de lectura construidos (calcados de Negocios),
`tsc`/build en verde y verificados con datos reales (harness de backend con 52 usuarios + revisión
visual del gerente: tabla, filtros, ficha). Ajustes de la revisión: se quitó el card "Moderación"
del expediente (dato de relleno + estado redundante con el badge), avatar con fallback `onError` y
visor de imagen a pantalla completa reutilizable (`components/ui/VisorImagen.tsx`). **Sin migración SQL.**
Siguiente paso: **Fase 2 — ACTUAR** (soporte: rescates de acceso · moderación: suspender/reactivar).

---

# Definición — Fase 0

## Mini-spec

**Qué hace (una carilla):** la pantalla del Panel donde el equipo **encuentra a cualquier
persona, lee su expediente, diagnostica por qué no puede entrar, y controla su acceso a toda
la app.** Es la mesa de ayuda + moderación del lado de las personas (gemelo de Negocios, pero
para *cuentas* en vez de *membresías*). Tres piezas:

1. **Lista** de todos los usuarios — buscar (nombre/correo/teléfono), filtrar (estado, tipo),
   ordenar, paginar 20, chips con conteos por estado.
2. **Expediente 360** (solo lectura) — identidad, verificaciones, métodos de auth, sus
   "sombreros" (dueño/empleado/vendedor/equipo), puntos y actividad **en resumen**, última
   conexión, y el **diagnóstico de acceso**.
3. **Acciones** — *soporte* (rescates de acceso) y *moderación* (suspender/reactivar).

**Qué NO hace:**
- No edita datos personales (nombre, teléfono, avatar — eso es del propio usuario).
- No borra cuentas (no hay hard-delete; suspender es la baja).
- **No gestiona `rol_equipo`** (superadmin/gerente/vendedor) → módulo #10 "Equipo y accesos".
- No toca membresías ni negocios → módulos Negocios / Suscripciones.
- **Sin** canal de denuncias ni bandeja de moderación (V2 — ver §Fuera de V1).
- **Sin** promover/degradar perfil personal↔comercial (V2 — ver §Fuera de V1).

### Una persona usa varios "sombreros" a la vez (de aquí salen los datos del expediente)

| Sombrero | De dónde sale | Por qué importa |
|---|---|---|
| Cliente | pedidos, citas, ofertaUsos, guardados, carrito | Actividad de compra/uso (en resumen) |
| Dueño de negocio | `usuarios.negocioId` → negocios | Suspenderlo ≠ apagar su negocio (ojo) |
| Empleado | empleados | Opera ScanYA de un negocio ajeno |
| Vendedor/embajador | `esEmbajador` / embajadores | Tiene cartera y comisiones |
| Cuenta de equipo | `rolEquipo` | Es admin/gerente/vendedor del Panel |
| Cardholder (CardYA) | puntosBilletera, vouchersCanje | Sus puntos NO se borran al suspender |
| Autor de contenido | resenas, marketplace, servicios | Lo moderable (V2) |
| ChatYA | chatMensajes, chatBloqueados | A quién bloqueó / quién lo bloqueó |

### Diagnóstico de acceso — las 5 razones por las que una cuenta no entra (todas en `usuarios`)

`estado≠activo` (suspendido/inactivo) · `correoVerificado=false` · `contrasenaHash=null`
(alta manual modelo C, nunca creó contraseña) · `bloqueadoHasta` (intentos fallidos) ·
`requiereCambioContrasena`. El expediente las muestra de un vistazo y ofrece el rescate de cada una.

## Matriz de permisos — dos planos separados por riesgo

| Acción | SuperAdmin | Gerente | Vendedor |
|---|:---:|:---:|:---:|
| Ver lista + expediente 360 + diagnóstico de acceso | Todos | Todos | — |
| **Soporte:** desbloquear intentos · reenviar verificación · reenviar "crear contraseña" · corregir correo | Todos | Todos | — |
| **Moderación:** suspender / reactivar | **Solo él** | — | — |

> **Por qué partido:** *soporte* = ayudar a entrar (inocuo, frecuente, urgente → no puede
> ser cuello de botella de una sola persona). *Moderación* = bloquear de toda la plataforma
> (acto de autoridad, raro, delicado → centralizado). El gerente da soporte **cross-región**
> (sin filtro) porque los usuarios no tienen región hoy; **todo queda en `admin_auditoria`**.
> Cuando `usuarios` tenga ciudad/región, se podrá apretar el alcance del gerente sin reconstruir.

## Decisiones de diseño (Fase 0)

1. **Una sola palanca de estado:** Suspender (`activo→suspendido`) ↔ Reactivar
   (`suspendido→activo`). `inactivo` se reserva para baja voluntaria futura, no es un botón.
2. **Suspender la persona ≠ apagar su negocio.** Ejes separados: suspender bloquea el *login*
   (no entra a la app ni a su BS), pero su negocio sigue su propio estado en la app pública.
   La ficha avisa "es dueño de un negocio activo". Apagar el negocio es "Pausar" en Negocios.
3. **Nada se borra al suspender.** Puntos, reseñas, historial: se conservan y se congelan. 100% reversible.
4. **Auto-protección:** no puedes suspenderte a ti mismo (409).
5. **Cuentas de equipo intocables desde aquí (moderación):** suspender/reactivar solo aplica a
   cuentas **sin** `rol_equipo`. Si la cuenta es de equipo, el botón se ve desactivado con nota
   "gestiónalo en Equipo y accesos". El *soporte* (rescates) sí se permite sobre ellas.
6. **Rescates en V1 reusan flujos que ya existen** en `auth`/Negocios (corregir correo ya vive
   en Negocios como `cambiarCorreoDueno`). **Apretón:** en el **primer commit de Fase 1** se
   **verifica que cada rescate exista como operación reutilizable** (desbloquear, reenviar
   verificación, reenviar crear-contraseña); si alguno no existe como acción admin, se decide
   ahí si se extrae o se pospone — **no se promete a ciegas**.
7. **Permiso partido (ver matriz):** soporte = super + gerente (cross-región, auditado);
   moderación = solo super. Vendedor fuera de Usuarios en V1.

**Apretón de altura — el expediente es una TARJETA DE RESUMEN, no un explorador.** De un
usuario cuelgan ~25 tablas. El expediente V1 muestra **sombreros + contadores + diagnóstico**
(*"dueño de 1 negocio · 340 puntos en 2 billeteras · 5 reseñas · última conexión hace 3 días"*),
**nunca** listados navegables de cada cosa. Ver sus pedidos / sus chats / sus reseñas en detalle
es V2 o nunca. Esto es lo que evita que el módulo se infle y no cierre.

**¿Migración SQL?** **Ninguna.** Columnas ya existentes: `estado`, `motivoCambioEstado`,
`fechaCambioEstado`, `fechaReactivacion`, `bloqueadoHasta`, `intentosFallidos`,
`correoVerificado`, `contrasenaHash`, `perfil`, `tieneModoComercial`, `modoActivo`.

## Criterios de aceptación (Definición de Terminado)

**VER (Gate 1):**
- [ ] ⬜ El SuperAdmin **y el Gerente** ven la lista paginada de todos los usuarios con conteos por estado.
- [ ] ⬜ Buscar (nombre/correo/teléfono) y filtrar (estado, tipo) funciona con `keepPreviousData` (sin temblor).
- [ ] ⬜ La ficha muestra el expediente 360 **en resumen** con los sombreros reales del usuario, con datos reales.
- [ ] ⬜ El diagnóstico de acceso indica correctamente por qué una cuenta no entra — probado con: suspendida, correo no verificado, sin contraseña (modelo C), bloqueada por intentos.
- [ ] ⬜ **Vendedor recibe 403** en todos los endpoints `/usuarios`.
- [ ] ⬜ `tsc --noEmit` + build verdes.

**ACTUAR (Gate 2):**
- [ ] ⬜ **Suspender** (solo super) una cuenta activa → `suspendido` + motivo/fecha + fila en `admin_auditoria`, y la cuenta **ya no hace login** (403 `CUENTA_SUSPENDIDA`) — verificado con login real.
- [ ] ⬜ **Reactivar** (solo super) → `activo` + fecha de reactivación + auditoría, y la cuenta **vuelve a entrar**.
- [ ] ⬜ Suspender exige motivo (rechaza sin motivo); no permite auto-suspensión (409); no permite cuentas con `rol_equipo` (409 / botón desactivado).
- [ ] ⬜ **Gerente:** puede ejecutar los rescates (verificado), **no** puede suspender/reactivar (403).
- [ ] ⬜ Suspender al dueño de un negocio **no** cambia la visibilidad del negocio en la app — verificado.
- [ ] ⬜ **Desbloquear intentos** limpia `bloqueadoHasta`/`intentosFallidos` y la cuenta puede reintentar.
- [ ] ⬜ **Reenviar verificación / crear-contraseña / corregir-correo** disparan el correo y devuelven si salió; corregir-correo respeta unicidad (409).
- [ ] ⬜ Cada acción (super o gerente) deja fila en `admin_auditoria` con su actor. Verificado con harness de datos reales.

---

## Checklist del carril (las 4 fases)

```
### Módulo: USUARIOS   ·   Fase actual: 2 (ACTUAR)

Fase 0 — Definir
- [x] Mini-spec (qué hace / qué no / matriz de permisos por rol)
- [x] Decisiones de diseño + ¿migración SQL? → ninguna
- [x] Criterios de aceptación escritos (la Definición de Terminado)

Fase 1 — VER
- [x] Backend lectura (service+controller+routes+montaje; super+gerente; tsc verde; verificado con
      harness `scripts/probar-usuarios-lectura.ts` — 52 usuarios reales, seguridad sin secretos ✓)
- [x] Frontend lectura (usuariosService + useUsuariosAdmin + SeccionUsuarios + FichaUsuario +
      estadoUsuario + avataresUsuario + routing en PaginaPanel + menú abierto a gerente; tsc + build verde)
- [x] GATE 1: VER verificado — backend con harness (52 usuarios reales, sin secretos) + revisión visual
      del gerente (tabla, filtros, ficha) + tsc/build verde. Pendiente menor: ejercitar el diagnóstico con
      cuentas suspendidas/bloqueadas (no hay en dev → se cubre en Fase 2) y el 403 de vendedor.

Fase 2 — ACTUAR
- [ ] Backend acciones (soporte super+gerente + moderación solo super + auditoría + guards + auth reusado)
- [ ] Frontend acciones (diálogos base + mutaciones con invalidación + acciones por rol)
- [ ] GATE 2: verificado con datos reales + tsc/build ✅ + criterios de acción marcados
- [ ] PULIDO VISUAL (Tokens_Panel.md, responsive lg/2xl, variantes, consistencia)

Fase 3 — Cerrar
- [ ] Doc canónico Usuarios.md (2 capas)
- [ ] Vaciar este checklist + sacar del PENDIENTES global (puntero)
- [ ] Índices (tablero, Panel_Admin.md, ROADMAP, memoria, kit claude.ai)
- [ ] Commit a main
```

**Notas técnicas para Fase 1:**
- Rutas de **lectura + soporte** de `/usuarios` se montan **antes** del gate global de
  superadmin en `routes/admin/index.ts`, cada una con `requierePanel(['superadmin','gerente'])`
  (la sección la usa también el gerente). Las de **suspender/reactivar** con
  `requierePanel(['superadmin'])`. Como el gerente ve "todos", **no hace falta predicado de
  alcance regional** (a diferencia de Negocios) → más simple.
- Se **calca de Negocios:** `routes/controllers/services/admin/negocios*` + `apps/admin/src/components/negocios/`.

---

## Fuera de V1 (V2 consciente — anotado, no escondido)

- 🟢 **Canal de denuncias + bandeja de moderación** (reportar desde reseñas/MarketPlace/ChatYA →
  bandeja del Panel → acción → resolución). Sin esto, suspender es **100% reactivo**. La *palanca*
  (suspender) está en V1; la *señal* (cómo te enteras del abuso) es V2.
- 🟢 **Deep-link entre módulos:** botón "ver dueño / ver usuario" desde la ficha de Negocio (y
  futuras quejas/transacciones) → ficha de Usuario. Es la forma natural de llegar al módulo (no
  se entra a buscar a mano).
- 🟢 **Promover / degradar perfil** personal↔comercial (con guard: no degradar a un dueño de
  negocio activo → remite a "Cancelar negocio").
- 🟢 **Apretar el cross-región del gerente** a "su región" cuando `usuarios` tenga ciudad/región
  (pendiente 🟦 ya anotado en `Panel_Admin.md` §Cimientos).
- ⚪ **Comunicación** (enviar aviso/correo a un usuario desde el Panel).
- ⚪ **Privacidad** (exportar/borrar datos del usuario, LFPDPPP).

---

## Referencias

- `Usuarios.md` — qué ES y cómo funciona (documento hermano, nace en Fase 3).
- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (caparazón, roles, regiones) · §4 define Usuarios.
- [`Negocios.md`](Negocios.md) + [`Negocios_Pendientes.md`](Negocios_Pendientes.md) — **plantilla de oro** (se calca).
- [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) — el carril (proceso de 4 fases).
- `docs/reportes/PENDIENTES_PanelAdmin.md` — pendientes globales del Panel.
