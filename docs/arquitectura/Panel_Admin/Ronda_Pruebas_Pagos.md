# Ronda de Pruebas — Pagos, Suscripciones y Publicidad (Stripe)

> **Qué es:** checklist **vivo** y **exhaustivo** de la validación de **todo lo que toca Stripe** en
> AnunciaYA (app web + Panel Admin) — membresías, upgrade, renovación, morosidad, cancelación, acciones del
> Panel, comisiones de vendedor, publicidad y robustez del webhook — con foco en **"Stripe respeta las
> configuraciones del Panel"**. Se actualiza conforme avanzamos.
>
> **Alcance derivado de auditoría de código (22 jun):** dos auditorías independientes barrieron (1) el webhook
> y sus event types + crons, y (2) **todas** las llamadas salientes a la SDK de Stripe (backend + frontend).
> Este doc cubre ese universo completo. Documentos hermanos: [`Sprint_Stripe_Pruebas.md`](Sprint_Stripe_Pruebas.md)
> (guion de las 3 Piezas) y [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) (backend).
>
> **Última actualización:** 22 Junio 2026.
>
> **Leyenda — Estado:** ⬜ pendiente · 🟡 en curso · ✅ verde · ⚠️ hallazgo/atención · ⛔ bloqueado · ❌ no implementado
> **Leyenda — Tipo:** 🤖 harness automatizado · 🌐 E2E navegador + Stripe · 📖 solo lectura · 🧩 decisión de producto
>
> **Qué significa "cerrado":** todos los casos de los bloques A–H en ✅ **y** una decisión explícita
> registrada para cada punto del bloque **Z** (no implementados). Sin lo segundo, solo está "cerrado para lo
> implementado".

---

## Cómo trabajamos

- **Claude:** corre scripts de **solo lectura/diagnóstico** y verifica BD + Stripe tras cada paso.
- **Juan:** ejecuta los flujos en **navegador + Stripe** y los cambios en el **Panel**; corre los harness
  que **escriben** datos (las escrituras a la BD las aplica Juan).
- Cada caso = **Juan ejecuta la acción → Claude verifica el resultado y confirma la coherencia.**

## Setup para los E2E (🌐)

1. Backend dev en `:4000` corriendo.
2. **`stripe listen --forward-to localhost:4000/api/pagos/webhook`** activo (crítico para webhooks).
3. `apps/web` + `apps/admin` corriendo.
4. Stripe en modo **TEST**; vendedor de prueba **JUAN01** sembrado.

**Datos de prueba:** tarjeta `4242 4242 4242 4242` (fecha futura, cualquier CVC) · registro con vendedor:
`…/registro?plan=comercial&ref=JUAN01`.

---

## Línea base (22 jun · solo lectura) 📖

| Verificación | Estado | Detalle |
|---|---|---|
| Fórmulas de precio de Publicidad (`probar-publicidad-precio.ts`) | ✅ | 17/17 OK: base + multiplicador por ciudades + combo −15% + descuentos por meses + validaciones. |
| Negocio de prueba "Maricos Las Plebes" (BD ↔ Stripe) | ✅ | Alineados: BD `al_corriente` / Stripe `trialing`, misma vigencia `2027-07-04`, tarjeta `****4242`. |
| Comisión de alta (`diagnostico-comision-alta.ts`) | ✅ | 1 correcta (\$400 pendiente) · **0 indebidas**. |
| Valores de config actuales del Panel | ✅ | `precio_membresia_mxn=849`, `precio_membresia_anual_mxn=8490` (=10×), ambos Price IDs (**anual activo**), `trial_duracion_dias=14`, `periodo_gracia_cobro_dias=14`, escalera `[0–5=$200, 6–10=$250, 11+=$300]`. |

### Hallazgos / puntos de atención

- ⚠️ **OBS-1 — Negocio de morosidad sin suscripción.** Recrearlo con `probar-ciclo-morosidad.ts` para validar B1.
- ⚠️ **OBS-2 — 4 negocios viejos con vendedor + pagos sin comisión de alta** (Bar La Palapa, Boutique Moda
  Playa, Contadora Fernanda, Estética Glamour), *"en riesgo a futuro"*. Hoy 0 daño; revisar que un pago
  futuro no dispare una alta tardía. Datos históricos.
- ⚠️ **OBS-3 — Config de Publicidad + `comision_alta_monto` NO persistidas** → corren con default de código
  (anuncios 300, patrocinadores 800, combo 15 %, alta \$400). Para probar coherencia E5/E6 hay que **editar
  primero en el Panel** (UPSERT) y luego verificar.
- ⚠️ **OBS-4 — OXXO/SPEI configurados pero no se cobran.** `metodos_pago_activos=["tarjeta","oxxo","spei"]`
  pero el Checkout **nunca setea `payment_method_types`** → solo tarjeta. **Resuelto como decisión de producto
  (ver Z4):** no se integran OXXO/SPEI de Stripe (OXXO no admite suscripción recurrente); en su lugar habrá
  **métodos de pago manual con comprobante** en *Mi Perfil – Modo Personal* (feature futuro).
- ⚠️ **OBS-5 — Sin Customer Portal.** El dueño no puede ver/reactivar/gestionar su pago; todo vive en el
  Panel (ver Z3 y `Pagos_Suscripciones.md §12`).
- ⚠️ **OBS-6 — Reembolsos y disputas no manejados.** `charge.refunded` y `charge.dispute.*` caen en el
  `default` del webhook (se ignoran) (ver Z1, Z2).
- ⚠️ **OBS-7 — Sin tests automatizados de `pago.service.ts`.** No hay `pago.test.ts` (otros módulos sí);
  la cobertura vive en los harness `scripts/probar-*.ts` (manuales).
- ⚠️ **OBS-8 — `probar-alta-manual.ts` obsoleto.** Su verificación final consulta `negocio_sucursales.ciudad`
  (columna DROPeada en la migración ciudad→catálogo) → crashea **después** de crear el negocio, sin limpiar →
  dejó 1 negocio de prueba huérfano en dev (`bf0c9f60…`). El alta en sí funciona. Fix: cambiar la query a
  `ciudad_id` (+ limpiar el huérfano). **No es de Stripe.**
- ✅ **OBS-9 — Publicidad: el rediseño por tamaño SÍ está; es RE-BRANDING de la UI (corregido 22 jun).** La UI de
  `/anunciate` y la columna venden por **TAMAÑO** — **Grande** (banner vertical 4:5, $299) y **Chico** (tarjeta
  horizontal 3:2, $99) — pero los **IDs internos del backend NO cambiaron**: siguen `CARRUSELES_VALIDOS=['anuncios',
  'patrocinadores']` (`publicidad-precio.service.ts:21`), con el mapeo en el front (`PaginaAnunciate.tsx:33`):
  **`patrocinadores`=Grande, `anuncios`=Chico**. Por eso los harness (que usan los IDs internos) funcionan: D1
  verde con `'anuncios'`. **D2 ✅ revalidado**: el fallo del 22 jun era datos/precio del harness (esperaba el 1100
  viejo y usaba `'fundadores'`, ya no vendible), no del modelo; ahora compara contra el precio REAL de config.
- ✅ **OBS-11 — Atribución del vendedor se perdía al cancelar el checkout. CORREGIDO (22 jun).** El `?ref=`
  solo vivía en la URL y el `cancel_url` de Stripe (`…/registro?cancelado=true`) no lo preservaba → al cancelar
  y reintentar, el negocio quedaba **sin vendedor** (comisión perdida). **Fix:** el `cancel_url` de
  `crearCheckoutSession` ahora conserva `&plan=comercial` + `&ref=<codigo>` (`pago.service.ts:249`); el front ya
  re-lee ambos de la URL al montar. `tsc` api verde. **Validado E2E 22 jun**: tras cancelar en Stripe, la URL
  conserva `&ref=JUAN01&plan=comercial` ✓. El upgrade (`/crear-negocio`) no trae atribución, no aplica.
- ✅ **OBS-12 — Datos del registro no se preservaban al volver de Stripe. CORREGIDO + EDITABLE (22 jun).** Al ir
  a Stripe se guardan los datos no sensibles en `sessionStorage` (**nunca la contraseña**). Al volver con
  `?cancelado=true` se reusa el **mismo `FormularioRegistro`** en **modo reanudar** (mismo diseño que el registro):
  prellenado y editable (negocio · nombre · apellidos · teléfono · plan), **correo fijo**, sin contraseña/términos/
  Google; botón "Continuar al pago" + "Empezar de nuevo". Al continuar, las correcciones se persisten en Redis vía
  **`POST /api/auth/actualizar-registro-pendiente`** (`tokenStore.actualizarRegistroPendiente`, **sin re-enviar
  código**) → el webhook crea el negocio con los datos nuevos (el webhook lee de Redis, no de Stripe); luego va a
  Stripe. `tsc` api+web verdes. **Pendiente:** validación E2E. Limitaciones: el flujo **Google** no usa el panel;
  si el TTL de Redis (15 min) expira, devuelve 410 → "Empezar de nuevo".
- ⚠️ **OBS-10 — Vigencia retrocede al forzar un cobro a mitad de cortesía.** En A3, al forzar `trial_end:'now'`
  sobre A2 (que tenía vigencia hasta 5 ago por el cobro día-1), el nuevo cobro recalculó la vigencia a **22 jul**
  (su periodo Stripe) → **retrocedió** ~2 semanas. El `comision_devengada_hasta` quedó bien en 5 ago (anti-doble-pago
  OK). Es un **escenario artificial** (forzar 2 cobros el mismo día; en prod la renovación cae en 5 ago avanzando
  la vigencia), pero sugiere revisar si el blindaje `GREATEST` debería cubrir también un cobro adelantado dentro de
  una cobertura vigente. Bajo riesgo; anotado para revisar.
- ✅ **OBS-14 — Vigencia de publicidad se calculaba como meses×30 (no calendario). CORREGIDO (22 jun).**
  `publicidad-checkout.service.ts` y `publicidad-alta.service.ts` ponían `expira_at = inicia + (meses×30) días`
  → 12 meses = 360 días, vencía ~5 días antes (el recibo decía 18 jun 2027 en vez del 23). **Fix:** `expira_at`
  ahora suma **meses de calendario** (`now() + interval 'N months'`); `duracion_dias` se conserva como meses×30
  (el recibo deriva los meses de ahí). Verificado en BD (12m: 18→23 jun 2027, +5d). La descripción del cobro en
  Stripe pasó de "360 días" a "N meses".
- ✅ **OBS-15 — Recibo con fecha adelantada un día por zona horaria. CORREGIDO (22 jun).** `reciboPdf.ts`
  formateaba en `timeZone:'UTC'` → un recibo emitido después de las 17:00 hora de Sonora saltaba al día siguiente
  (18:30 del 22 → "23"). **Fix:** nueva constante `ZONA_EMPRESA='America/Hermosillo'` (`zonaHoraria.ts`);
  `formatearFechaLarga` formatea en esa zona. Afecta **todos** los recibos (membresía+publicidad) y ambos campos
  (emisión + vigencia); seguro porque todos los valores son `timestamptz` (instantes reales).
  **OBS-15b (ampliación, 22 jun):** el CORREO tenía su PROPIA copia de `formatearFechaLarga` en `email.ts`
  también en `timeZone:'UTC'` → el comprobante mostraba la vigencia un día después que el PDF ("23 de Julio"
  vs "22 de Julio"). Corregido igual (importa `ZONA_EMPRESA`); afecta "Membresía activa hasta" y "Publicidad
  activa hasta". Detectado en el E2E de E3 (folio #00046).
- ✅ **OBS-16 — Campo "Espacios" del recibo decía "Publicidad Chico/Grande". CORREGIDO (22 jun).** Ahora dice
  **"Anuncio Chico"** · **"Anuncio Grande"** · **"Anuncios Grande y Chico"** (combo), sin la palabra "Publicidad".
  Texto armado una vez en `recibo-publicidad.service.ts` y reusado en el PDF (campo Espacios) y en el correo.
- ✅ **OBS-17 — Modal de detalles del negocio: "Primer pago" desfasado un día + "Inicio Trial" en trial=0. CORREGIDO (22 jun).**
  (a) `fecha_primer_pago` (columna `date`) se sellaba con `CURRENT_DATE` (×3 en `pago.service.ts` cobro real +
  renovación, `negocios-acciones` marcar pagado) y `new Date().toISOString().slice(0,10)` (`altaManualNegocio`) →
  capturaba la fecha **UTC** (mostraba 23 jun cuando el cobro fue el 22 a las 19:10 Sonora). Fix: los 4 setters
  usan `(now() AT TIME ZONE 'America/Hermosillo')::date`. Verificado en BD (CURRENT_DATE=23 vs Sonora=22). **Solo
  aplica a registros NUEVOS** (no migra los viejos). (b) `FichaNegocio.tsx` mostraba "Inicio Trial" aun en cobro
  inmediato (trial=0); ahora se oculta de forma DETERMINISTA: "Inicio Trial" solo se muestra mientras el negocio
  está EN su trial (sin primer pago); una vez que paga (día-1 o al terminar el trial) muestra "Primer pago" y
  oculta "Inicio Trial". La 1ª versión usaba un umbral de 3 días, descartado porque fallaba en negocios REVIVIDOS
  (created_at antiguo). (commit `dcfad75`)
- ✅ **OBS-18 — Upgrade self-service: faltaba plan anual + atribución a vendedor. IMPLEMENTADO (22 jun, `dcfad75`).**
  `PaginaCrearNegocio` (el componente REAL; `FormularioCrearNegocio.tsx` era código muerto) estrenó **toggle
  Mensual/Anual** (el backend ya soportaba el intervalo) e **input de código de vendedor con validación EN VIVO**
  (`GET /pagos/validar-referido` → `validarCodigoReferido`, case-sensitive; muestra el vendedor ✓/✗ y SOLO
  atribuye si valida → un código mal escrito no se cuela). El webhook `manejarUpgradeCompletado` setea
  `embajadorId` al crear y al revivir → la comisión de alta se devenga al 1er cobro. El upgrade usa input manual
  (excepción decidida al "código solo por link", ver [[project_codigo_referido_solo_link]]).
- ✅ **OBS-19 — El upgrade con trial=0 (cobro día-1) no registraba el cobro. CORREGIDO (22 jun, `dcfad75`).**
  `manejarUpgradeCompletado` creaba el negocio pero NO registraba el cobro inicial → dependía del
  `invoice.payment_succeeded`, que en la carrera del día-1 da 500 y el Stripe CLI local NO reintenta → sin
  recibo/correo/comisión. Fix: el upgrade registra el cobro día-1 **desde el checkout** (`registrarCobroReal`,
  idempotente por invoice.id), igual que el alta nueva, + empuje de cortesía del vendedor (+14d). El 500 del
  webhook queda como respaldo inofensivo (el checkout ya registró). **Validado E2E: recibo + correo llegaron.**
- ✅ **OBS-20 — Recibo de membresía (cobro tarjeta): "Periodo" y "Teléfono" vacíos. CORREGIDO (22 jun, `dcfad75`).**
  `registrarCobroReal` insertaba el pago con `mesesCubiertos: null` → "Periodo" vacío; fix: `meses = monto÷precio`
  (1 mensual, 10 anual). El recibo leía solo `s.telefono` (sucursal) → vacío en el negocio nuevo del upgrade; fix:
  `COALESCE(s.telefono, u.telefono)` (cae al teléfono del dueño). Solo afecta recibos NUEVOS.
- ✅ **OBS-21 — Doble notificación al cancelar un negocio. CORREGIDO (22 jun, `dcfad75`).**
  La cancelación deliberada la notificaban DOS emisores casi a la vez (el Panel `cancelarNegocio` + el webhook
  `customer.subscription.deleted` rama `cancellation_requested`); la idempotencia "borrar+crear" no es atómica →
  carrera → 2 avisos. Fix: el webhook ya no re-notifica la cancelación deliberada (hoy solo la origina el Panel,
  que ya notifica). La rama de IMPAGO del webhook sigue notificando (ahí es el único origen).

---

## Casos de prueba

### A · Membresías — alta y renovación

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 A1 | Alta tarjeta **sin** vendedor → trial 14d → cobra día 15 | 🌐 | ✅ | E2E 22 jun: negocio nuevo `al_corriente`, `embajador_id=null`, Stripe `trialing`, `trial_end`=hoy+14 (6 jul), factura hoy $0 |
| 🔴 A2 | Alta tarjeta **con** `?ref=JUAN01` → **cobro día 1** + próximo a +44d (Pieza 2) | 🌐 | ✅ | E2E 22 jun: cobró $849 al instante, `fecha_primer_pago`=hoy, próximo cobro 5 ago (+44d), atribuido a JUAN01, **comisión alta $400**, recibo folio #00035 + correo, bitácora `eventos_pago` ✓ |
| 🔴 A3 | Renovación recurrente (`invoice.payment_succeeded`) refresca vigencia sin retroceder (`GREATEST`) | 🌐🤖 | ✅ | E2E 22 jun (`forzar-fin-trial.ts`): cobro $849 → webhook → `cobro_exitoso` en bitácora, `al_corriente`. **Anti-doble-pago en vivo**: no duplicó comisión (cobro cae dentro de `comision_devengada_hasta`=5 ago). Ver OBS-10 |
| ⚪ A4 | Alta manual efectivo / transferencia / **cortesía** (sin Stripe) | 🤖 | ✅ | feature OK: super crea negocio con todos los campos, vendedor atribuye (`embajador_id`+`referido_por`); el script super crashea en una verificación obsoleta (OBS-8) sin afectar el alta (22 jun) |

### B · Morosidad y cancelación

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 B1 | Cobro fallido (`invoice.payment_failed`) → `en_gracia` → cron suspende al vencer | 🌐 | ✅ | E2E 22 jun (`probar-ciclo-morosidad.ts`): crear→`al_corriente`, fallar (tarjeta rebota)→`en_gracia` (gracia +14d, sigue activo), suspender (cron real)→`suspendido` (`activo=false`). Fix: el harness usaba el Price del env (archivado) → ahora lee `stripe_price_comercial_id` de config |
| ⚪ B2 | Recuperación: pagar factura / "Marcar pagado" → `al_corriente` | 🌐 | 🟡 | manual → "Marcar pagado" desde el Panel; **tarjeta** → falta el botón **"Actualizar tarjeta y reintentar pago"** del dueño en Mi Perfil – Pagos (decisión 22 jun: vía Customer Portal de Stripe, ver Z3). Hoy un moroso de tarjeta no se recupera solo |
| 🔴 B3 | **Cancelación deliberada** desde Panel (`subscription.deleted` motivo `cancellation_requested`) → degrada a personal + archiva + devuelve vouchers | 🌐🤖 | ✅ | E2E 22 jun (`probar-cancelar-vs-webhook.ts`): cancelar→archivado/activo=false/cancelado/subId limpio/dueño personal; consistente Panel↔webhook en cualquier orden (tardío inofensivo, carrera no revive). Fix Price env→config |
| 🔴 B4 | **Impago** que termina en `subscription.deleted` (sin motivo de cancelación) → **suspende** (recuperable), NO cancela | 🌐 | ✅ | 22 jun: `procesarCancelacionSuscripcion` con `reason='payment_failed'` → `suspendido`, dueño sigue comercial, `estado_admin` activo, subId conservado (NO degrada/archiva). Guard "el impago nunca queda cancelado" (pago.service.ts:1062) |

### C · Comisiones del vendedor

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 C1 | Comisión de **alta \$400** al primer pago real (idempotente) | 🤖 | ✅ | línea base: 1 correcta, 0 indebidas (22 jun) |
| 🔴 C2 | Comisión **recurrente "al cobro"**: anual = 10×, 1er cobro descuenta 1 mes por la alta = 9× (Pieza 3) | 🤖 | ✅ | `probar-comision-al-cobro.ts` TODO VERDE: 9×$200=$1800 con alta / 10×$200 sin alta / idempotente (22 jun) |
| ⚪ C3 | Escalón **congelado** al momento del cobro (no re-devenga si la escalera sube) | 🤖 | ✅ | negocio prepagado sigue activo para el escalón (esc. [4], 22 jun) |

### D · Publicidad

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 D1 | Self-service: Checkout `mode:payment` → `compra_publicidad` → anuncio `activa` + folio + recibo PDF | 🌐🤖 | ✅ | `probar-publicidad-checkout.ts` TODO OK + **E2E real 22 jun**: alta 12m por tarjeta → anuncio `activa`, folio #41, recibo PDF + correo, registros en el Panel. Detectó y se corrigió: vigencia 12×30→calendario (OBS-14), fecha por zona horaria (OBS-15), "Espacios"→"Anuncio Chico/Grande" (OBS-16) |
| ⚪ D2 | Alta manual + cortesía desde el Panel | 🤖 | ✅ | `probar-publicidad-alta.ts` TODO OK (22 jun): super efectivo (**monto = precio de config**: Grande+Chico 1 ciudad = $338.30 = 398×0.85), super cortesía (sin folio/monto), gerente de su región ($99 Chico), + rechazos (cortesía-gerente 403, ciudad ajena 403, correo 404, límite 400). Harness modernizado: compara contra el precio REAL de config (no el 1100 viejo) y usa carruseles vigentes ('fundadores' dejó de ser vendible) |
| ⚪ D3 | Cron expiración + aviso 3 días antes | 🤖 | ✅ | `probar-publicidad-mantenimiento.ts` TODO OK (22 jun) |

### E · Coherencia: Stripe respeta el Panel ← *foco principal*

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 E1 | Cambiar **precio membresía** → crea Price nuevo → siguiente checkout cobra el nuevo monto; **vigentes NO migran** | 🌐 | ✅ | **Validado E2E a lo largo de la ronda (22 jun):** Juan cambió el precio en Configuración del Panel varias veces y cada alta/checkout posterior cobró el precio configurado (Stripe respetó el Panel). `cambiarPrecioMensual` crea el Price nuevo + archiva el viejo + reapunta `stripe_price_comercial_id`; las suscripciones vigentes no migran (Stripe las deja en su Price anterior) |
| 🔴 E2 | Toggle **plan anual** ON → Price anual = 10× → registro ofrece anual; elegir anual usa el Price correcto | 🌐 | ✅ | E2E 22 jun: registro anual con vendedor cobró **$8,490** (folio #37, `cobro_exitoso`), vigencia ~1 año + 14d cortesía |
| 🔴 E3 | Cambiar **días de trial** → checkout usa `trial_period_days` nuevo (0 = cobra ya) | 🌐 | ✅ | **E2E 22 jun:** config trial=0 + alta SIN vendedor → Stripe cobró $849 **al instante** (sin `trialing`), negocio `al_corriente`, recibo folio #00046 + correo. Junto con A1 (trial=14 → `trial_end` +14d) confirma que el checkout respeta el valor de config. Detectó OBS-15b (desfase de fecha en el correo) |
| 🔴 E4 | Cambiar **días de gracia** → suspensión al día configurado | 🤖 | ✅ | `probar-gracia-dinamica.ts` TODO VERDE (22 jun): editar `periodo_gracia_cobro_dias` vía `actualizarConfig` a 7 → `fecha_limite_gracia` = ahora+7.000d; cambio dinámico a 3 → ahora+3.000d (sin caché viejo); gracia restaurada (14d). Vía ruta manual `expirarManualesVencidos` (misma config que el webhook de tarjeta), sin Stripe |
| 🔴 E5 | Cambiar **escalera de comisiones** → próximo cobro usa el nuevo escalón (congelado) | 🤖 | ✅ | `probar-escalera-dinamica.ts` TODO VERDE (22 jun): editar la escalera vía `actualizarConfig` (función REAL del Panel) a \$777 → el devengo usó \$777; cambio dinámico a \$111 → el siguiente cobro usó \$111 (sin caché viejo); escalera **restaurada** (\$200/activo). Confirma que el escalón se lee de config en cada cobro |
| 🔴 E6 | **Precio de publicidad**: base + multiplicador ciudades + combo + descuento meses → total wizard = cobro Stripe | 🤖 | ✅ | `probar-publicidad-precio.ts` 17/17 (22 jun) |
| ⚪ E7 | **Recibos foliados continuos** (membresía + publicidad comparten secuencia) | 🤖 | ✅ | `probar-recibos-publicidad.ts` TODO OK: folios + alcance super/gerente/vendedor (22 jun) |

### F · Upgrade personal → comercial

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 F1 | Usuario personal existente paga upgrade (`crearCheckoutUpgrade` → `upgrade_comercial`) → modo comercial + negocio nuevo | 🌐 | ✅ | **E2E 22 jun (commit `dcfad75`):** upgrade desde `/crear-negocio` → usuario `comercial` + negocio nuevo. Estrenó **toggle anual + input de código de vendedor con validación en vivo** (OBS-18) y disparó los fixes del cobro día-1 (OBS-19/20/21) |
| ⚪ F2 | Upgrade que **revive un negocio archivado** (soft-delete recovery) en vez de crear uno | 🌐 | ✅ | **E2E 22 jun:** cancelar desde el Panel → personal → upgrade → revive el **MISMO** negocio (mismo id), no crea otro; el webhook lo busca por `usuario_id` y lo reactiva (visible si ya tenía onboarding) |

### G · Acciones del Panel que mueven Stripe (Parada 2)

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 G1 | **Suspender** negocio → `pause_collection:{behavior:'void'}` en Stripe + `activo=false` | 🌐🤖 | ⬜ | `probar-acciones-parada2.ts` |
| 🔴 G2 | **Reactivar** → `pause_collection:''` (reanuda cobro) | 🌐🤖 | ⬜ | |
| 🔴 G3 | **Marcar pagado con tarjeta** → empuja `trial_end`; la fecha manual **sobrevive** al webhook | 🌐🤖 | ⬜ | `probar-fecha-vs-webhook.ts`, `probar-marcar-pagado.ts` (tocan Stripe TEST → Tanda 2) |
| 🔴 G4 | **Cancelar** negocio (solo super) → `subscriptions.cancel` + degrada + archiva + vouchers | 🌐🤖 | ⬜ | transaccional (toca Stripe TEST → Tanda 2) |
| ⚪ G5 | **Anular** pago adelantado → restaura `trial_end` original (`cobro_previo`) | 🤖 | ⬜ | `probar-anular-pago.ts` (toca Stripe TEST → Tanda 2) |
| ⚪ G6 | **Editar** pago manual (concepto/monto/meses) — rechaza editar pago de tarjeta | 🤖 | ✅ | `probar-editar-pago.ts` TODO OK: corregir/cortesía/404/403/recalcular vigencia (22 jun) |

### H · Webhook & robustez

| # | Caso | Tipo | Estado | Notas |
|---|---|---|:--:|---|
| 🔴 H1 | `customer.subscription.updated` → refresca fechas sin cambiar estado | 🌐 | ⬜ | |
| ⚪ H2 | `customer.subscription.trial_will_end` → aviso al dueño; **suprimido si hay cortesía** manual | 🌐🤖 | ⬜ | `probar-aviso-trial.ts` |
| 🔴 H3 | **Idempotencia**: evento reentregado (mismo `event.id`) no duplica (Redis 72h + UNIQUE `stripe_event_id`) | 🌐 | ⬜ | reenviar evento con `stripe events resend` |
| 🔴 H4 | **`WebhookReintentable`**: carrera cobro día-1 (`invoice.payment_succeeded` antes que `checkout.session.completed`) → 500 → Stripe reintenta → se resuelve | 🌐 | ⬜ | commit suelto `WebhookReintentable` |
| ⚪ H5 | Firma del webhook (`constructEvent`) rechaza payload no firmado / con secreto malo | 🤖 | ⬜ | |

---

## Z · Decisiones para poder CERRAR (no implementado en código) 🧩

> Estos flujos **no existen** hoy. No son bugs automáticamente: algunos son decisiones de producto. Para
> dar el tema por cerrado, cada uno necesita una **resolución explícita**: *(a) se deja fuera a propósito y
> se documenta*, o *(b) es un pendiente real* → entra al backlog/roadmap.

| # | Tema | Estado actual | Decisión | Resuelto |
|---|---|---|:--:|:--:|
| Z1 | **Reembolsos** (`charge.refunded`) | Se ignora (default del webhook) | ⬜ ¿documentar "a mano en Stripe" o manejar? | ⬜ |
| Z2 | **Disputas / contracargos** (`charge.dispute.*`) | Se ignora | ⬜ ¿documentar o suspender+notificar? | ⬜ |
| Z3 | **Customer Portal** (dueño gestiona/recupera su pago de tarjeta) | No existe; todo por Panel | ✅ **Decidido (22 jun):** SÍ se usa, pero **solo para tarjeta** — botón "Actualizar tarjeta y reintentar pago" en Mi Perfil – Pagos (recupera a un moroso de tarjeta, resuelve B2). Los métodos **manuales** (depósito/transferencia) NO usan Portal (comprobante + verificación). Feature futuro. | ✅ |
| Z4 | **OXXO / SPEI** | Configurados pero el Checkout solo cobra tarjeta | ✅ **Decidido (22 jun):** NO integrar OXXO/SPEI de Stripe (OXXO no admite suscripción recurrente). En su lugar → **feature futuro**: métodos de **pago manual con comprobante** (depósito a tarjeta de AY · transferencia bancaria) en **Mi Perfil – Modo Personal**, con verificación del admin (reusa `registrarPagoManual`). Datos de cobro configurables desde el Panel. | ✅ |
| Z5 | **Cupones de lanzamiento** | `allow_promotion_codes:true` (Stripe los gestiona), sin registro en BD | ⬜ ¿suficiente para la beta? | ⬜ |

---

## Bitácora de avance

- **22 jun** — **Bloque B (morosidad/cancelación) E2E:** B1 ✅ (`probar-ciclo-morosidad.ts`: crear→fallar(tarjeta
  rebota)→`en_gracia`→suspender(cron)→`suspendido`), B3 ✅ (`probar-cancelar-vs-webhook.ts`: cancelación deliberada
  → archivado/personal, consistente Panel↔webhook), B4 ✅ (impago `reason='payment_failed'` → `suspendido`, dueño
  sigue comercial, NO degrada — guard pago.service.ts:1062). B2 🟡 (recuperación: tarjeta vía Customer Portal,
  feature futuro, ver Z3). **Fix de 2 harness:** usaban `STRIPE_PRICE_COMERCIAL` del env (archivado al cambiar el
  precio) → ahora leen `stripe_price_comercial_id` de config.
- **22 jun** — Línea base (solo lectura) **completa**: E6 ✅, negocio de prueba coherente BD↔Stripe, comisión
  de alta sin indebidas, config leída (849 / anual 8490 / trial 14 / gracia 14 / escalera 200·250·300).
  Hallazgos OBS-1..OBS-3.
- **22 jun** — **Auditoría de exhaustividad** (2 barridos de código): inventariado el universo completo de
  Stripe (6 event types del webhook, 3 subtipos de checkout, acciones del Panel, helpers, crons, frontend).
  Checklist **expandido** con los bloques **F** (upgrade), **G** (acciones del Panel), **H** (webhook/robustez)
  y **Z** (decisiones para cerrar). Hallazgos nuevos OBS-4..OBS-7.
- **22 jun** — **Registro ANUAL con vendedor (E2E, vía reanudar):** cobró **$8,490** día-1 (folio #37), atribuido a
  JUAN01. **Modelo de comisión validado en vivo (la regla de Juan):** comisión **alta $400 + recurrente $2,250
  (9 meses × $250)** devengada **toda en junio** (`periodo 2026-06`, el mes del cobro), no goteando. El escalón
  fue **$250** (tramo 6–10, porque JUAN01 tiene 8 activos) → usa la escalera real. Carrera del cobro día-1
  (`WebhookReintentable`) se autorresolvió. **Confirmado en el Panel Vendedores** (historial: "Pago de Anualidad"
  $2,250 + "Comisión de alta" $400) + **recibo PDF #00037** ($8,490) + **correo de comprobante**. Valida E2
  (anual) + C1/C2 E2E + OBS-11 (atribución en reanudar) + OBS-12 (el nombre del panel llegó al negocio).
- **22 jun** — **Login post-pago día-1 CORREGIDO + validado E2E (OBS-13).** Bug: el axios del front tenía
  `TIMEOUT=10s` pero `verificarSession` del backend hace polling hasta ~30s esperando los tokens del webhook;
  en el cobro día-1 la carrera del `WebhookReintentable` los retrasa >10s → el front cortaba y mandaba a
  `/registro` con la cuenta YA creada (por eso A1 sin vendedor sí logueaba y A2/A3 día-1 no). **Fix:**
  `pagoService.verificarSession` pasa `{ timeout: 40000 }` (> polling del backend). Probado E2E: registro día-1
  → entra al modal de bienvenida.
- **22 jun** — **Tanda 2 E2E (en curso):** A1 ✅ (alta sin vendedor → trial 14d, sin cobro hoy, `embajador_id=null`,
  Stripe `trialing` `trial_end`=hoy+14; confirma base de E3). A2 ✅ (alta con `?ref=JUAN01` → **cobro día-1 $849**,
  próximo cobro 5 ago (+44d), atribución JUAN01, **comisión alta $400**, recibo folio #00035 + correo, bitácora
  `eventos_pago`; reconfirma C1 E2E + recibos foliados). El alias `multivideosjj+aN@gmail.com` funciona (correo
  real entregado). A3 ✅ (`forzar-fin-trial.ts`): renovación $849 → `cobro_exitoso` en bitácora, `al_corriente`;
  **anti-doble-pago de comisión confirmado en vivo** (no duplicó); detectado OBS-10 (retroceso de vigencia en
  cobro forzado, escenario artificial). Siguiente: coherencia E1–E3 (precio / anual / trial).
- **22 jun** — **Tanda 1 de harness (sin navegador):** C1/C2/C3 ✅ (comisión al cobro, escalera real 200),
  A4 ✅ (alta manual: feature OK), G6 ✅ (editar pago), D3 ✅ (cron publicidad), E7 ✅ (recibos). Hallazgos
  OBS-8 (script alta-manual obsoleto) y OBS-9 (Publicidad en rediseño → D2 🟡). E5 🟡 (falta cambio dinámico).
  Los harness que tocan Stripe TEST (G3/G4/G5 + Tanda 2 E2E) quedan para cuando se levante `stripe listen`.
- **22 jun** — **Z4 resuelto.** Decisión de producto: NO integrar OXXO/SPEI de Stripe (OXXO no es recurrente).
  En su lugar, **métodos de pago manual con comprobante** (depósito a tarjeta de AY · transferencia) en
  **Mi Perfil – Modo Personal** (feature futuro, no se construye en esta ronda; documentado en
  `PENDIENTES_PanelAdmin.md` §Página de cuenta del usuario). No bloquea el cierre de las pruebas de Stripe.
