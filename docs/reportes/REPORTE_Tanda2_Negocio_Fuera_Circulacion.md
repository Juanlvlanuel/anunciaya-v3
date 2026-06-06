# Reporte — Tanda 2: Negocio "fuera de circulación"

**Fecha:** 2026-06-05
**Alcance:** Tanda 2 del tema transversal "comportamiento de un negocio fuera de circulación".
**Estado:** Construido en DEV. Sin commit. Sin migración de esquema.

> **Contexto (Tanda 1, ya hecha y probada):** se estableció que `negocios.activo = false` es la
> ÚNICA verdad de visibilidad. Toda salida de circulación ahora apaga `activo` (impago vía cron,
> cancelación vía webhook, suspensión manual del Panel) y el pago exitoso vuelve a encenderlo
> respetando `estado_admin`. El MOTIVO sigue viviendo en `estado_membresia` y `estado_admin`.
>
> La **Tanda 2** cierra los rincones que sobrevivían porque NO miraban `activo`, más la capa visual.

---

## 1. Modelo de decisión (regla central)

Cómo se clasifica el estado de circulación de un negocio, centralizado en un helper para no
duplicar la regla:

- **Fuera de circulación** (base): `activo = false`.
- **CANCELADO** (definitivo): `estado_membresia = 'cancelado'` **OR** `estado_admin = 'archivado'`.
- **SUSPENDIDO** (temporal): fuera de circulación pero NO cancelado (suspensión manual o por impago).
- **NO** se usa `es_borrador` para distinguir (es ambiguo: también lo tienen los negocios en onboarding).

Helper nuevo: `apps/api/src/utils/estadoNegocio.ts`
- `clasificarCirculacion(negocio)` → `'en_circulacion' | 'suspendido' | 'cancelado'`
- `estaFueraDeCirculacion(negocio)`
- `MENSAJE_SCANYA_FUERA`, `mensajeNegocioNoDisponible(estado)`

---

## 2. Grupo 1 — Backend (dinero y puntos)

### 2.1 ScanYA — candado de `activo` en 4 puntos
Un negocio fuera de circulación no puede ENTRAR ni OPERAR en ScanYA, aunque tenga sesión abierta.

| Punto | Función | Efecto |
|---|---|---|
| Login dueño/gerente | `loginDueno` | bloquea ingreso si `activo=false` |
| Login empleado | `loginEmpleado` | bloquea ingreso si `activo=false` |
| Refresh de token | `refrescarTokenScanYA` | corta la sesión ya abierta al siguiente refresco |
| Otorgar puntos | `otorgarPuntos` | barrera dura: aunque siga la sesión, no acumula puntos |

Archivo: `apps/api/src/services/scanya.service.ts`. Mensaje: *"Tu negocio está temporalmente fuera de servicio."*

### 2.2 CardYA — puntos del cliente
Archivo: `apps/api/src/services/cardya.service.ts`.

- **`generarVoucher`** — barrera ANTES de descontar puntos: si el negocio está fuera, corta con
  mensaje según motivo (suspendido = "temporalmente no disponible"; cancelado = "ya no está disponible").
- **`obtenerRecompensasDisponibles`** — filtra el catálogo por `negocios.activo = true` (no ofrece
  canjes de negocios fuera).
- **`obtenerBilleterasPorUsuario`, `obtenerDetalleNegocioBilletera`, `obtenerVouchersPorUsuario`** —
  agregan el campo derivado `estadoCirculacion` (el saldo NUNCA se oculta).

### 2.3 Devolución de puntos al cancelar (la pieza compleja)
- **Función nueva** `revertirVouchersPendientesPorCancelacion(negocioId)` en
  `apps/api/src/services/puntos.service.ts`. Reutiliza el patrón probado de `expirarVouchersVencidos`,
  con dos refuerzos por tocar saldos reales:
  1. Transacción por voucher (voucher + billetera, atómico).
  2. `UPDATE ... WHERE estado='pendiente'` → anti-doble-conteo (si corre dos veces, no devuelve dos veces).
  Solo toca vouchers `pendiente`; los pasa a `cancelado` y reintegra `puntosUsados` a `puntos_disponibles`.
- **Disparo (PUSH)** en `apps/api/src/services/pago.service.ts` → `procesarCancelacionSuscripcion`,
  una llamada aislada en try/catch tras apagar el negocio (un fallo aquí no rompe la cancelación).
  Queda lista para la futura cancelación manual del Panel.

### Regla de oro respetada
Al cliente nunca se le quitan puntos a escondidas:
- **Suspendido** → el voucher pendiente se "congela" solo (el negocio no entra a ScanYA y no hay cron
  global que lo expire). Sigue visible.
- **Cancelado** → se le **devuelven** los puntos automáticamente.
- **Ver saldo/historial** → siempre disponible.

---

## 3. Capa visual — Parte 2A (CardYA, frontend)
El backend ya exponía `estadoCirculacion`; se pintó el aviso reutilizando componentes existentes
(sin inventar pantallas/estilos). El saldo siempre se muestra.

| Archivo | Cambio |
|---|---|
| `apps/web/src/types/cardya.ts` | tipo `EstadoCirculacion` + campo en `BilleteraNegocio` y `Voucher` |
| `.../cardya/componentes/CardBilletera.tsx` | badge esquina (rojo "Ya no disponible" / dark "No disponible"), patrón de `CardRecompensaCliente` |
| `.../cardya/componentes/ModalDetalleBilletera.tsx` | banner de aviso amber/rojo, sin ocultar saldo |
| `.../cardya/componentes/ModalDetalleVoucher.tsx` | aviso amber para voucher pendiente de negocio suspendido (el cancelado ya mostraba "Se te devolvieron X puntos") |
| `.../cardya/componentes/TablaHistorialVouchers.tsx` | voucher pendiente de negocio suspendido se muestra como chip "No disponible" |

---

## 4. Capa visual — Parte 2B (Cupones / "Mis Cupones")
Aquí faltaba el dato en backend (a diferencia de CardYA). **Decisión Opción 3:** suspendido = marca;
cancelado = marca + bloquea revelar.

**Backend** — `apps/api/src/services/ofertas.service.ts` (reutiliza el helper central):
- `obtenerMisCupones` — trae el estado del negocio y deriva `estadoCirculacion` (borra los campos crudos).
- `revelarCodigoCupon` — rechaza con 409 solo si el negocio está **cancelado** (suspendido sí revela).

**Frontend:**
| Archivo | Cambio |
|---|---|
| `apps/web/src/services/misCuponesService.ts` | campo `estadoCirculacion` en `CuponCliente` |
| `.../cupones/componentes/CardCupon.tsx` | chip de aviso (amber/rojo) en la metadata, patrón de `getBadgeEstado` |
| `.../cupones/componentes/ModalDetalleCupon.tsx` | banner de aviso + oculta "Revelar código" si está cancelado |

---

## 5. Decisiones tomadas (con el usuario)
1. **Distinción suspendido/cancelado:** `estado_membresia='cancelado' OR estado_admin='archivado'` = cancelado; resto con `activo=false` = suspendido. No usar `es_borrador`.
2. **Sesiones ScanYA:** candado en los 3 puntos (login + refresh + otorgar), no solo login.
3. **Devolución de puntos:** PUSH en el webhook de cancelación (determinista, no depende del cliente).
4. **"Congelar el reloj"** (extender `expiraAt` por el tiempo suspendido): **SEPARADO** a sub-paso futuro. El comportamiento por defecto ya respeta la regla de oro (si vence durante la suspensión, al reactivar se devuelven los puntos).
5. **Cupones:** Opción 3 (suspendido marca / cancelado marca + bloquea revelar).

---

## 6. Pruebas en DEV
- **Bloque 4 (devolución de puntos al cancelar)** — probado de extremo a extremo con un negocio y
  cliente de mentira:
  - Antes: 70 pts disponibles, voucher `pendiente`.
  - Tras cancelar (webhook real): **100 pts** (se devolvieron los 30), voucher `cancelado`. ✅
  - Anti-doble: segunda cancelación → sigue en **100** (no 130). ✅
- Se usó un script de prueba temporal (`apps/api/scripts/probar-ciclo-visibilidad.ts`) que firma el
  webhook localmente sin Stripe CLI. **Ya fue borrado.**
- Bloques 1/2/3 (ScanYA bloqueado, canje bloqueado, ver saldo) y la verificación visual de la capa
  de UI quedan para correr con las queries documentadas.

### Verificación de compilación
- `apps/api`: `tsc --noEmit` → **exit 0**.
- `apps/web`: `tsc -b` → **exit 0** en los archivos tocados. (Nota: existen 5 errores `implicit any`
  pre-existentes en 4 archivos ajenos —`BottomNav`, `Navbar`, `GraficaVentas`, `PaginaNegocios`— que
  NO forman parte de este trabajo.)

---

## 7. Archivos

**Creado:**
- `apps/api/src/utils/estadoNegocio.ts`

**Modificados (backend):**
- `apps/api/src/services/scanya.service.ts`
- `apps/api/src/services/cardya.service.ts`
- `apps/api/src/services/puntos.service.ts`
- `apps/api/src/services/pago.service.ts`
- `apps/api/src/services/ofertas.service.ts`

**Modificados (frontend):**
- `apps/web/src/types/cardya.ts`
- `apps/web/src/pages/private/cardya/componentes/CardBilletera.tsx`
- `apps/web/src/pages/private/cardya/componentes/ModalDetalleBilletera.tsx`
- `apps/web/src/pages/private/cardya/componentes/ModalDetalleVoucher.tsx`
- `apps/web/src/pages/private/cardya/componentes/TablaHistorialVouchers.tsx`
- `apps/web/src/services/misCuponesService.ts`
- `apps/web/src/pages/private/cupones/componentes/CardCupon.tsx`
- `apps/web/src/pages/private/cupones/componentes/ModalDetalleCupon.tsx`

**Temporal (creado y borrado):**
- `apps/api/scripts/probar-ciclo-visibilidad.ts`

---

## 8. Pendientes (anotados, NO tocados)
- **Grupos 2/3/4** del mapa: oferta por código, vacantes/servicios, chat ya abierto, reseñas/guardar,
  notificaciones, aviso de cupones por otras vías.
- **Sub-paso "congelar el reloj":** extender `expiraAt` de vouchers por el tiempo suspendido (requiere
  decidir cuántos días).
- **Verificación visual** de la capa de UI (CardYA + Cupones) en el navegador.
- **Documentación de arquitectura:** actualizar `docs/arquitectura/CardYA.md` y
  `docs/arquitectura/Promociones.md` con el comportamiento de "negocio fuera de circulación".
- **Sin commit** todavía.
