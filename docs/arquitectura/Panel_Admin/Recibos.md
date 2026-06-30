# Panel Admin · Módulo Recibos 🧾

> **En una frase:** la pantalla del Panel donde el equipo ve **todos los recibos de pago** —de
> **membresía** (suscripción comercial) y de **publicidad**— ya foliados, los **busca por folio**, los
> **filtra por origen**, los **descarga** en PDF y los **reenvía por correo** a uno o varios destinatarios.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§6) explica el módulo **en lenguaje de
> persona**. La segunda (**Apéndice técnico**) es la referencia para quien toca el código.
>
> **Estado:** desplegado y en uso. Construido el **18 Junio 2026** (commit `feat(admin): módulo
> Recibos del Panel`); extendido a **publicidad** (UNION) con el módulo Publicidad; **filtro por origen
> (tabs) + columna "Tipo"** el **29 Junio 2026**. `tsc` api+admin verdes.
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) (el Panel completo) ·
> [`Suscripciones.md`](Suscripciones.md) (la bitácora de **movimientos**; Recibos es la lista de
> **recibos/comprobantes**) · [`Negocios.md`](Negocios.md) §6 y Ap. D (el **generador del recibo PDF**) ·
> [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) §10 (cuándo se emite el comprobante).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Cada vez que un negocio paga su membresía —en **efectivo/transferencia/cortesía** (lo registra una
persona) o por **tarjeta** (cobro automático de Stripe)— el sistema genera un **recibo con folio
correlativo** (#00001, #00002…) y le manda al dueño un correo con el **PDF de marca**.

Hasta ahora esos recibos solo se veían **dentro de la ficha de cada negocio**. El **módulo Recibos**
los junta **todos en una sola pantalla**: para encontrar uno por su folio, **descargarlo** de nuevo, o
**reenviarlo** por correo (al dueño o a quien sea — un contador, otra sucursal, etc.).

> Es una pantalla de **consulta + reenvío**. No edita ni anula recibos (eso vive en la ficha del
> negocio, y solo para pagos manuales), ni emite **facturas fiscales (CFDI)** — el recibo es un
> **comprobante**, no un CFDI.

## 2. ¿Quién lo usa? (alcance por rol)

- **Superadmin** — ve **todos** los recibos de la plataforma.
- **Gerente regional** — solo los de los negocios **de su región**.
- **Vendedor** — solo los de **sus negocios atribuidos** (su cartera). En su menú aparece como
  **"Mis recibos"**.

El alcance lo resuelve el **backend** (no se confía en la UI): mismo predicado regional que
Negocios/Suscripciones, más el del vendedor por `embajador_id`.

## 3. Diccionario rápido

- **Recibo:** un comprobante de pago de membresía, con **folio** correlativo. Vive en la tabla
  `pagos_membresia` (manuales **y** de tarjeta comparten la misma serie de folios).
- **Forma de pago:** Efectivo · Transferencia · Cortesía (manuales) · **Tarjeta** (cobro de Stripe).
- **Anulado:** un recibo manual cancelado desde la ficha del negocio. Aquí se ve **etiquetado** y
  **no se puede reenviar** (ya no es válido). Los de tarjeta no se anulan desde el Panel.

## 4. ¿Qué veo en la pantalla?

Arriba, **tabs de origen** — **Todos · Suscripciones · Publicidad** — para ver uno u otro tipo (o ambos).
Debajo, un **buscador** (por folio o nombre de negocio/anunciante) y una **lista** (tabla en escritorio,
tarjetas en móvil) con: **folio · negocio · _tipo_ · forma de pago · monto · fecha**. La columna **"Tipo"**
muestra un chip **Suscripción** (azul de marca) o **Publicidad** (ámbar) para distinguirlos de un vistazo
en la vista "Todos". Los recibos anulados salen tachados y con la etiqueta "Anulado". Paginada.

## 5. ¿Qué puedo hacer? (acciones)

- **Descargar PDF** — regenera el recibo (con los datos actuales) y lo abre. Mientras genera, **solo
  ese botón** muestra un spinner.
- **Reenviar por correo** — abre un diálogo con el **correo del negocio precargado**; puedes
  **cambiarlo**, **agregar otros** (botón "Agregar otro correo", hasta 10) y enviar a todos a la vez.
  Cada reenvío queda en **auditoría**. (No disponible en recibos anulados.)

## 6. Preguntas frecuentes

- **¿Por qué un recibo de tarjeta tiene folio igual que uno manual?** Porque comparten **una sola
  serie** (sin huecos): el cobro de tarjeta también se registra como recibo. Así la numeración es
  continua para el negocio.
- **¿Esto es una factura para el SAT?** No. Es un **comprobante** de AnunciaYA. El **CFDI** (si un
  negocio lo pide) lo emite AnunciaYA aparte, con un PAC — no Stripe, no este módulo.
- **¿Puedo reenviar a un correo que no es el del negocio?** Sí: el del negocio va por defecto, pero lo
  cambias o agregas otros.

---

# Apéndice técnico

## Mapa de archivos

**Backend** (`apps/api/src/`):
| Pieza | Archivo |
|---|---|
| Lecturas + acciones | `services/admin/recibos.service.ts` (`listarRecibos`, `reciboEnAlcance`, `descargarRecibo`, `reenviarRecibo`) |
| Controllers | `controllers/admin/recibos.controller.ts` |
| Validación reenvío | `validations/admin/recibos.schema.ts` (`reenviarReciboSchema`: `correos[]` email, 1–10) |
| Rutas | `routes/admin/recibos.routes.ts` (montadas en `routes/admin/index.ts` **antes** del gate global) |
| Generador PDF (reuso) | `services/admin/recibo-pago.service.ts` (`prepararReciboPago`) + `utils/reciboPdf.ts` |
| Envío de correo (reuso) | `utils/email.ts` (`enviarComprobantePagoMembresia`) |

**Frontend** (`apps/admin/src/`):
| Pieza | Archivo |
|---|---|
| Service axios | `services/recibosService.ts` |
| Hooks RQ | `hooks/queries/useRecibosAdmin.ts` (`useRecibos`, `useDescargarRecibo`, `useReenviarRecibo`) |
| Sección | `components/recibos/SeccionRecibos.tsx` (tabla/cards + buscador + modal reenvío) |
| Menú · icono · router · keys | `data/menuPanel.ts` · `config/iconosPanel.tsx` (Receipt) · `pages/PaginaPanel.tsx` · `config/queryKeys.ts` |

## Endpoints (los 3 roles, alcance por rol en el service)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/recibos` | Lista paginada. Filtros: `busqueda` (folio o negocio/anunciante), `negocioId`, `desde`, `hasta`, **`origen`** (`membresia`/`publicidad`; ausente = ambos — filtra cada rama del UNION), `orden` (`folio_desc`/`folio_asc`/`fecha_recientes`/`fecha_antiguos`), `pagina`, `porPagina`. |
| `GET` | `/api/admin/recibos/:id/pdf` | Verifica alcance → `prepararReciboPago` → `{ reciboUrl }` (R2). |
| `POST` | `/api/admin/recibos/:id/reenviar` | Body `{ correos: string[] }` → regenera + envía a cada correo → audita (`recibo_reenviar`). |

## Alcance por rol (`condicionAlcance`)

- **superadmin** → sin condición (todo). Respeta el filtro global de región del super (`panelConFiltroRegion`).
- **gerente** → `EXISTS` sucursal **matriz** → ciudad → región (mismo predicado que Negocios/Suscripciones).
- **vendedor** → `EXISTS negocios n WHERE n.id = pago.negocio_id AND n.embajador_id = <su embajador>`
  (`resolverEmbajadorId`). El que Suscripciones no tenía.

## Notas

- **Dos fuentes en UNION:** `pagos_membresia` (suscripción: manuales + tarjeta) **+** `publicidad_compras`
  con folio (anuncios pagados: alta manual, wizard self-service y **renovaciones**). Cada fila lleva
  `origen` (`'membresia'`/`'publicidad'`); la query filtra cada rama según el tab elegido. El recibo de
  **tarjeta** de membresía lo inserta el webhook `invoice.payment_succeeded` con concepto `'tarjeta'`. Todo
  comparte la **misma serie de folios** (`pagos_membresia_folio_seq`), así la numeración es continua entre
  membresía y publicidad.
- **Descargar** regenera el PDF on-demand (no se persiste una URL fija en BD).
- **Reenvío** es best-effort por destinatario; devuelve cuántos se enviaron (0 → 502).
- **Solo lectura + reenvío:** editar/anular un pago vive en la ficha de Negocios (y los de tarjeta
  están bloqueados ahí). El módulo Recibos no escribe en `pagos_membresia`.

## Pendientes / futuro

- Filtros visibles de **fecha** y de **forma de pago** en la UI (el backend ya acepta `desde`/`hasta`).
- **Exportar CSV** del periodo filtrado.
- **CFDI / facturación fiscal** (PAC) — proyecto aparte, no este módulo.
