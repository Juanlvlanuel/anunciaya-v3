# 🎟️ Dinámicas — Rifas y Concursos P2P entre Usuarios

> **Última actualización:** 10 Agosto 2026
> **Estado:** 🟡 En construcción — Fases 1-3 completas y en producción. Fase 4.1 (sala en vivo + motor de sorteo), **Fase 4.2 (tómbola 3D real + modos automático/manual)** y **Fase 4.3 completa (los 3 métodos de sorteo: `tombola`, `carta_unica`, `tabla_completa`)** construidas, migraciones corridas en DEV/PROD (`tabla_completa` no necesitó ninguna — mismo catálogo estático que `carta_unica`). Sala como **página completa** (`/marketplace/dinamica/:id/sala` y `/p/.../sala`), con el **Cuadro de Honor** ("Últimos Ganadores"). **Pendiente QA E2E en producción**. Fase 5 (tarjeta compartible) pendiente.
> **Versión:** 0.4.4 (Fase 4.3 completa — método `tabla_completa` de lotería mexicana)
> **Doc de planeación original:** `docs/kit-dinamicas/Contexto_Dinamicas.md` (decisiones de producto previas a construir; este documento es la referencia técnica viva de lo ya construido — se va actualizando fase por fase).

> **Identidad visual:** Ámbar (`#f59e0b → #d97706`) — distingue a Dinámicas de MarketPlace (teal) dentro del mismo módulo compartido.
> **Política de visibilidad:** Solo modo Personal (100% P2P, igual que MarketPlace).
> **Transacción 100% offline:** igual que MarketPlace, la app NO cobra, NO retiene dinero, NO entrega el premio. Solo conecta organizador y participantes; el pago del boleto y la entrega del premio se coordinan por ChatYA fuera de la app.

---

## 📋 Índice

1. [¿Qué es Dinámicas?](#qué-es-dinámicas)
2. [Reglas no negociables](#reglas-no-negociables)
3. [Ciclo de vida de una Dinámica](#ciclo-de-vida-de-una-dinámica)
4. [Boletos y participación](#boletos-y-participación)
5. [Moderación](#moderación)
6. [Identidad visual](#identidad-visual)
7. [Pantallas y componentes](#pantallas-y-componentes)
   - [Página pública para compartir](#página-pública-para-compartir)
   - [Chat con contexto — ChatYA](#chat-con-contexto--chatya)
8. [Backend — Endpoints](#backend--endpoints)
9. [Base de Datos](#base-de-datos)
10. [Notificaciones](#-notificaciones)
11. [Cron Jobs](#cron-jobs)
12. [Sala en vivo y motor de sorteo (Fase 4.1)](#-sala-en-vivo-y-motor-de-sorteo-fase-41)
13. [Assets — Cartas de lotería mexicana](#assets--cartas-de-lotería-mexicana)
14. [Estado por fase](#estado-por-fase)
15. [Decisiones y pendientes abiertos](#decisiones-y-pendientes-abiertos)

---

## 🎯 ¿Qué es Dinámicas?

**Dinámicas** es la sub-sección de MarketPlace donde un usuario en modo Personal organiza una **rifa o concurso** entre vecinos: vende boletos numerados por un premio (físico o en efectivo) y, cuando cierra la inscripción, se sortea un ganador.

Vive **dentro de MarketPlace** (no es una sección nueva del BottomNav): en `/marketplace`, un switch de contexto en el header alterna entre "MarketPlace" (artículos) y "Dinámicas" (rifas), compartiendo header, ciudad, notificaciones y FAB de publicar.

### Por qué vive aquí y no en MarketPlace normal

MarketPlace prohíbe explícitamente rifas/sorteos/venta de boletos (ver `docs/arquitectura/MarketPlace.md` §Lo que NO permitimos — riesgo legal SEGOB). Dinámicas es el espacio construido a propósito para esa necesidad, con sus propias reglas legales (checklist de confirmaciones al publicar) y su propio ciclo de vida — no un hueco en las reglas de MarketPlace.

### Lo que NO es Dinámicas

- ❌ NO es una lotería operada por la app — la app nunca cobra, nunca entrega el premio, nunca participa en el pago.
- ❌ NO tiene motor de sorteo todavía (Fase 4, pendiente) — hoy solo cubre publicar la rifa y vender boletos.
- ❌ NO permite premios ilegales, de esquema piramidal ni contenido para adultos (mismo filtro reducido, ver §Moderación).

---

## 🔒 Reglas no negociables

1. **El pago del boleto es offline.** El organizador coordina el cobro por ChatYA/WhatsApp fuera de la app. La app solo registra qué número reservó quién y si el organizador ya marcó ese boleto como pagado.
2. **El sorteo debe ser auditable.** Aunque el motor (Fase 4) no está construido, el schema ya reserva `semilla_aleatoria`, `timestamp_sorteo` y `hash_verificacion` en `dinamicas` para que el resultado sea verificable, no solo "confía en el organizador".
3. **Transparencia de participantes.** La lista de boletos de una Dinámica es pública (sin teléfono) — cualquiera que la vea puede confirmar que el sorteo no está arreglado. Ver `GET /api/dinamicas/:id/boletos`.
4. **El checklist legal se acepta al publicar, no al crear el borrador.** Mismo criterio que MarketPlace: un borrador solo exige título + ciudad; las 3 confirmaciones (premio real, pago fuera de la app, resultado honesto) se guardan como snapshot inmutable (`confirmaciones` JSONB) justo al publicar.

---

## 🔄 Ciclo de vida de una Dinámica

**Módulo puro y testeable:** `apps/api/src/services/dinamicas/estados.ts`

```
borrador → activa ⇄ pospuesta → en_sorteo → cerrada
                ↓         ↓
            cancelada  cancelada
```

| Transición | Disparador | Notas |
|---|---|---|
| `borrador → activa` | Publicar | Exige todos los campos completos (ver abajo) + checklist de 3 confirmaciones |
| `activa → pospuesta` | Posponer | Extiende `fecha_limite_inscripcion`. También `pospuesta → pospuesta` (posponer de nuevo, sin límite de veces) |
| `activa/pospuesta → en_sorteo` | (Fase 4, no expuesto todavía) | Arranca el motor de sorteo |
| `en_sorteo → cerrada` | (Fase 4) | Resultado final, terminal |
| `borrador/activa/pospuesta → cancelada` | Cancelar | Terminal. **NO** se puede cancelar desde `en_sorteo` (el sorteo ya arrancó) |

Un borrador solo exige **título + ciudad** (mismo patrón "borrador parcial" que MarketPlace). Para poder **publicar**, `camposFaltantesParaPublicar()` (`dinamicas.service.ts`) exige: descripción (≥20 caracteres), ≥1 foto del premio, tipo de premio, método de sorteo, número de boletos, precio de boleto, fecha límite de inscripción, ciudad.

---

## 🎫 Boletos y participación

**Tabla:** `dinamica_boletos` — un boleto = un número dentro de la Dinámica.

### Estados del boleto

| Estado | Significado | TTL |
|---|---|---|
| `reservado` | Alguien apartó el número, pendiente de pago | 24h — se libera automáticamente si nadie confirma el pago (cron, ver §Cron Jobs) |
| `pagado` | El organizador confirmó que ya cobró (fuera de la app) | Permanente |

### 2 formas de entrar un participante

1. **Reserva propia** (`POST /:id/boletos/reservar`) — cualquier usuario logueado (que **no** sea el organizador — 403 si lo es, ver abajo) reserva un número disponible. Dispara automáticamente un mensaje de ChatYA al organizador (best-effort, `contextoTipo: 'directo'` — no se agregó un tipo nuevo al catálogo de conversaciones para esto); el mensaje incluye número de boleto y precio, no solo el título de la Dinámica (ago-2026).
2. **Alta manual del organizador** (`POST /:id/boletos/manual`) — para participantes "Sin cuenta AY". Requiere `nombreManual` + `telefonoManual` + `numeroBoleto`, y un **dropdown de estado** (`CustomSelect`, ago-2026): **Pagado** (default — el organizador ya cobró por fuera antes de registrarlo, entra directo con `pagadoEn`) o **Reservado** (alguien ya apartó el número pero no ha pagado — entra con la misma ventana de 24h que una reserva normal, el cron la libera igual si nadie confirma). El aviso contextual del modal cambia de texto según la opción elegida.

**El organizador no puede reservarse un boleto a sí mismo** (`reservarBoletoPublico` rechaza con 403 — no tendría sentido "cobrarse" por su propia rifa). En el grid de boletos de la ficha, si quien mira es el organizador, hacer click en un número disponible **no** abre el modal de reserva — abre directo "Agregar Participante" con ese número pre-llenado (ago-2026), porque para el organizador la única forma válida de llenar un boleto es la alta manual.

**Validación en vivo del número de boleto** (ago-2026) — tanto "Agregar Participante" como "Editar participante"/"Reasignar boleto" reciben `numerosOcupados` (un `Set<number>` derivado de los boletos ya cargados) y marcan el campo en rojo ("Ese número ya está ocupado") mientras se escribe, sin esperar el rechazo del backend. En `PaginaDinamica.tsx` los boletos ya están cargados de por sí; en `PaginaMisPublicaciones.tsx` (que no los tenía) se agregó un `useBoletosDinamica(dinamicaId)` propio, activado solo mientras el modal está abierto.

La condición de carrera (dos personas reservando el mismo número al mismo tiempo) la resuelve el `UNIQUE (dinamica_id, numero_boleto)` de la tabla, no un lock aplicativo — `esErrorBoletoDuplicado()` (`dinamicas/errores.ts`) traduce el código Postgres `23505` a un mensaje de dominio legible.

### Gestión de un boleto ya asignado (organizador)

Desde la lista de participantes (`ModalListaParticipantes`), cada fila expone acciones distintas según si el boleto tiene cuenta AnunciaYA o es manual:

| Acción | Endpoint | Aplica a | Qué hace |
|---|---|---|---|
| **Editar participante** | `PUT /:id/boletos/:boletoId` | Solo boletos manuales (`!usuarioId`) | Corrige nombre, teléfono **y** número de boleto en un solo paso — antes solo tocaba nombre/teléfono; el número se sumó para no obligar a pasar por "Liberar" + "Agregar" cuando solo hay que corregir el número. |
| **Reasignar boleto** | `POST /:id/boletos/:boletoId/reasignar` | Solo boletos CON cuenta AY (`usuarioId` presente) | Cambia únicamente el número — nombre/teléfono son del usuario, no se tocan desde aquí. Avisa al participante por notificación (`dinamica_boleto_reasignado`, ver `Notificaciones.md`). |
| **Liberar boleto** | `POST /:id/boletos/:boletoId/liberar` | Cualquier boleto (`reservado` o `pagado`, con o sin cuenta) | Borra la fila — el número vuelve a estar disponible de inmediato, sin esperar el cron de 24h. Cubre: participante se arrepintió, error al registrar, o se quiere reasignar el número a alguien más. |
| **Confirmar pago** | `POST /:id/boletos/:boletoId/confirmar-pago` | Boletos `reservado` | Marca `pagado`. Si el boleto tiene `usuarioId`, avisa al participante por notificación (`dinamica_pago_confirmado`). |

Los 3 primeros son mutuamente excluyentes por fila (nunca se muestran "Editar" y "Reasignar" a la vez — dependen de si `boleto.usuario` existe); "Liberar" y "Confirmar pago" pueden convivir con cualquiera de los dos. Los 4 iconos son icon-only con `Tooltip` (componente compartido, `apps/web/src/components/ui/Tooltip.tsx`) — sin texto visible, para que la fila quepa en móvil.

**Reasignar ≠ Liberar+Agregar:** antes de esto, mover a alguien de cuenta AY del boleto #15 al #26 exigía liberar el #15 y volver a capturarlo con "Agregar Participante" — pero esa acción es solo para manuales. "Reasignar" es la que cubre ese caso para gente con cuenta.

---

## 🛡️ Moderación

**Implementación:** `apps/api/src/services/dinamicas/filtros.ts` — copia **reducida** de `marketplace/filtros.ts` (mismo motor: normalización NFD + sustitución leet-speak + regex con boundary), pero con **solo 3 de las 5 categorías** de MarketPlace:

| Categoría | Incluida | Motivo |
|---|:---:|---|
| Rifas/sorteos/boletos | ❌ | Es vocabulario **normal** de este módulo — MarketPlace la bloquea, Dinámicas la permite |
| Subastas | ❌ | Excluida a propósito (ver `Contexto_Dinamicas.md`) |
| Esquemas (multinivel, cripto, "gana dinero rápido") | ✅ | Rechazo duro |
| Adultos | ✅ | Rechazo duro |
| Ilegal (armas, drogas, fauna protegida) | ✅ | Rechazo duro |

**Sin "sugerencia suave"** (a diferencia de MarketPlace, que sugiere "esto parece un servicio"): si `detectarPalabraProhibidaDinamica` encuentra algo, es rechazo 422 directo, sin modal intermedio — las 3 categorías que quedan ya eran rechazo duro sin excepción en MarketPlace.

---

## 🎨 Identidad visual

| Uso | Valor |
|---|---|
| Gradiente principal | `linear-gradient(135deg, #f59e0b 0%, #d97706 100%)` |
| Acento (badges, iconos) | `amber-600` / `amber-700` |
| Icono | `Ticket` (lucide) |
| Header (glow, líneas de acento, subtítulo del feed) | **Dinámico** — comparte el mismo header que MarketPlace y cambia entre teal/ámbar según el contexto activo (`colorAcento` en `PaginaMarketplace.tsx`) |

Cumple las mismas reglas heredadas que MarketPlace (`TOKENS_GLOBALES.md` Regla 13): sin pastel, sin iconos en círculo, bordes `border-2 border-slate-300` en cards, un solo color de acento (ámbar) + neutro slate.

---

## 📱 Pantallas y componentes

### Feed — dentro de `/marketplace`

**Switch de contexto:** `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx` — 2 íconos fijos (carrito=Artículos, boleto=Dinámicas) + flecha de intercambio animada con `framer-motion` (`layout` + reorder de `order` CSS). El activo queda pegado al título; cambia también el título ("MarketPlace" / "Dinámicas"), las líneas de acento del header y el conteo de publicaciones mostrado.

- `?dinamicas=1` en la URL selecciona el contexto inicial (usado por el botón "Organizar" del FAB/menú).
- Montaje perezoso: Artículos se monta siempre (vista default), Dinámicas se monta la primera vez que se activa y de ahí en adelante queda vivo, alternando con `hidden` CSS (no ternario que desmonta) — conserva scroll/estado al ir y volver.

**Sección de feed:** `apps/web/src/components/dinamicas/SeccionFeedDinamicas.tsx` — scroll infinito (`IntersectionObserver`), filtrado por ciudad, dueña también del composer inline (`ComposerSectionDinamicas`).

**Hook:** `useFeedInfinitoDinamicas({ ciudad })` (`hooks/queries/useDinamicas.ts`) — mismo patrón offset-based que `useFeedInfinitoMarketplace` (`pagina/limite/hayMas`).

### Card del feed — `CardDinamica.tsx`

`apps/web/src/components/dinamicas/CardDinamica.tsx` — card grande del feed principal. **Vertical en todos los breakpoints** (foto arriba, contenido abajo; se probó una variante horizontal solo-`lg:` en ago-2026 y se revirtió — no quedaba bien):

- Foto de portada `aspect-2/1` (panorámica, más ancha que el `aspect-video` 16:9 original — se sentía "cuadrada" en la card angosta).
- Header del organizador (avatar, nombre + flecha animada tipo MP, botón ChatYA con logo oficial).
- Título + descripción (line-clamp-2).
- **Panel de KPIs** (fondo `slate-50`, sin pastel): precio por boleto (icono `Ticket` ámbar), boletos vendidos (icono `Users` teal), cuenta regresiva "para cerrar" (icono `Clock` rosa) + barra de progreso.
- Pill de estado (Activa/Pospuesta/En sorteo/Cerrada/Cancelada) superpuesto en la esquina de la foto.
- Ancho: `lg:max-w-md` (laptop, 1 columna en el grid — ver más abajo) / `2xl:max-w-[94%]` (Full HD, 2 columnas).

**Grid del feed** (`SeccionFeedDinamicas.tsx`): `grid-cols-1` hasta `lg:` (con la columna fija del Cuadro de Honor a la izquierda, el ancho que le queda al feed en laptop no alcanza para 2 cards sin apretarlas) y recién `2xl:grid-cols-2` en Full HD.

### Card compacta — `CardDinamicaCompacta.tsx`

`apps/web/src/components/dinamicas/CardDinamicaCompacta.tsx` — para grillas densas (perfil de usuario). Mismas proporciones tipográficas que `CardArticulo.tsx` variant="compacta" (título `text-base`, precio `text-lg`, meta `text-xs`) para que ambos tipos de card convivan en armonía visual. Sin avatar/nombre del organizador (redundante cuando ya se está parado en su perfil). Countdown en su propia línea con texto ("3h **para cerrar**"), no solo el número suelto.

### Card de gestión — `CardDinamicaMio.tsx`

`apps/web/src/components/dinamicas/CardDinamicaMio.tsx` — usada en "Mis Publicaciones". Mismo cuerpo visual que la compacta, más un menú "⋯" (mismo patrón que `CardArticuloMio.tsx` de MarketPlace) con:

- **Editar**, **Posponer** y **Cancelar** — solo si `estado IN ('activa', 'pospuesta')`. El botón "⋯" ni se muestra si la Dinámica está en `en_sorteo`/`cerrada`/`cancelada` (nada que gestionar).
- **"Editar" es limitado post-publicación** (ago-2026) — modal propio `ModalEditarDinamica` (mismo archivo `ModalesAccionDinamica.tsx`), NO el composer completo. Solo permite tocar título, descripción y fotos del premio; boletos/precio/método de sorteo/regla de desempate/fecha límite quedan bloqueados por el backend (409) una vez publicada — cambiarlos sería injusto para quienes ya se inscribieron con esas reglas (la fecha límite tiene su propio flujo, "Posponer").
- **Sin "Eliminar"** — no hay endpoint DELETE (no aplica; se cancela, no se borra).

### Ficha de detalle — `PaginaDinamica.tsx`

**Ruta:** `/marketplace/dinamica/:dinamicaId`
**Archivo:** `apps/web/src/pages/private/marketplace/PaginaDinamica.tsx`

Rediseñada (ago-2026) para calcar el patrón de `PaginaArticuloMarketplace.tsx` (P2 de MarketPlace) — header dark sticky ancho completo + hero de 2 columnas en desktop, ancho `max-w-7xl`/`2xl:max-w-[920px]` en ambas. Usa el patrón **app-shell propio** (`useScrollAppShell` + contenedor `flex-1 min-h-0 overflow-y-auto`, header como hermano `shrink-0`) — sin esto el scroll vertical no funciona en móvil, porque la ruta cae en `esAppShellPropio` de `MainLayout.tsx`.

- **Header dark sticky:** ícono+"Detalle"+título truncado, botones **Compartir** (`DropdownCompartir`, apunta a la página pública `/p/dinamica/:id`) y **Guardar** (bookmark) a la derecha.
- **Hero 2 columnas** (`lg:grid-cols-[3fr_2fr]`): galería (`GaleriaArticulo` con `ajusteImagen="cover"` — rellena el área sin importar la relación de aspecto) a la izquierda; columna derecha con 3 cards apiladas (`sticky`, no scrollean con el resto):
  1. Card de info: título, precio del boleto, datos clave en **filas separadas por línea divisoria** (tipo de premio / método de sorteo / fecha límite) — ago-2026, reemplazó los tags apilados en 2 tonos (slate+amber) del diseño anterior por una lista densa: ícono neutro (`Gift`/`Shuffle`, gris) + texto para los datos descriptivos, acento ámbar (`Calendar`) reservado solo para la fecha (el dato accionable). La fecha muestra el valor **exacto** ("15 ago, 10:00 a.m.") en vez de cuenta regresiva relativa ("Cierra en 7 días") — más fácil de recordar/anotar que un conteo que cambia solo.
  2. **Card del organizador** — mismo patrón que `CardVendedor` (MP) / `OferenteCard` (Servicios): avatar con ring, nombre en 2 líneas + `BadgeCheck`, insignia + ícono de ChatYA (solo ícono, sin fondo) en el mismo renglón, actividad ("Activa hace X") + "Ver perfil →" (a `/marketplace/usuario/:id?tab=dinamicas`) en el renglón de abajo.
  3. Trust box "Cómo funciona" (ámbar).
- **Menú "⋯" del organizador** (kebab, esquina superior derecha de la card de info — solo si `esOrganizador`): "Editar borrador" (compose completo) si `estado='borrador'`; si `estado IN ('activa','pospuesta')`, en vez de eso muestra "Editar" (ámbar, abre `ModalEditarDinamica` inline — limitado a título/descripción/fotos), "Agregar Part." (azul), "Posponer" (ámbar), "Cancelar Dinámica" (rojo). Mismas 2 variantes de "Editar" que en "Mis Publicaciones" (ago-2026). Reemplazó los botones inline que había antes.
- **Descripción** — su header ahora es una fila `justify-between` (ago-2026): "Descripción" (ícono+título) a la izquierda como siempre, y a la derecha el mismo patrón ícono+título pero para "Fecha" (`Calendar` ámbar), con el valor exacto justo debajo alineado a la derecha — la fecha límite queda visible en 2 lugares de la ficha (aquí y en la card de info) a propósito, es el dato que más se pregunta.
- **Grid de boletos** — ya NO es un grid que crece verticalmente: es un carrusel horizontal (`grid-flow-col grid-rows-[repeat(5,3.5rem)] auto-cols-[3.5rem]`, 5 filas fijas, columnas nuevas hacia la derecha) navegado con flechas `ChevronLeft`/`ChevronRight`, 3 estados visuales (disponible/reservado/pagado). Click en uno disponible: participante normal → modal "Reservar boleto"; organizador → modal "Agregar Participante" con el número pre-llenado (ver §Boletos y participación).
- **Participantes** (ago-2026, rediseñado varias veces) — ya no hay preview inline de filas: toda la sección es un solo botón ("Participantes (N) →") que abre `ModalListaParticipantes` (fullscreen en móvil, centrado en desktop `max-w-lg`/`2xl:max-w-xl`, header con gradiente igual al resto de modales de acción) con la lista completa. Cada fila: número + nombre (o "{nombre} · Sin cuenta AnunciaYA" en azul `blue-700`) **con el ícono de ChatYA pegado al nombre** (no en el cluster de acciones a la derecha — solo visible para el organizador, con `Tooltip`), badge de estado (oculta si el organizador ve un boleto `reservado` — el botón "Confirmar pago" ya comunica eso), y a la derecha un cluster de botones **icon-only con `Tooltip`** (sin texto, para que la fila quepa en móvil): "Editar" (manual) / "Reasignar" (con cuenta) / "Liberar" (cualquiera) / "Confirmar pago" (`reservado`) — ver tabla completa en §Gestión de un boleto ya asignado.
- **Modales unificados** — `apps/web/src/components/dinamicas/ModalesAccionDinamica.tsx`: `ModalAgregarParticipanteDinamica`, `ModalPosponerDinamica`, `ModalCancelarDinamica`, `ModalEditarDinamica`, `ModalLiberarBoleto`, `ModalEditarParticipante`, `ModalReasignarBoleto`, más el modal "Reservar boleto" (dentro de `PaginaDinamica.tsx`) y `ModalListaParticipantes`, todos con el mismo header con gradiente color-coded por acción + ícono en círculo (patrón `ModalConfirmarCanje.tsx` de CardYA). Antes cada acción tenía su propia copia con estilos distintos, una incluso usaba `window.confirm()` nativo. El campo de teléfono de "Agregar participante"/"Editar participante" usa `InputTelefono` (lada `+52` editable + formato visual `(638) 113 2658`). `ModalEditarDinamica` reusa `useFotosUploaderDinamicas` para las fotos y las constantes `TITULO_MIN/MAX`, `DESC_MIN/MAX` de `useComposerDinamicas.ts` para la validación — sin el resto del composer (sin checklist legal, sin flujo borrador→publicar). `ModalEditarParticipante` y `ModalReasignarBoleto` comparten la tonalidad azul de `ModalAgregarParticipanteDinamica` (mismo tipo de acción — dar de alta/corregir un registro, no destructiva); `ModalLiberarBoleto` usa rojo (destructiva). `ModalPosponerDinamica` (ago-2026) muestra la fecha límite actual como referencia y bloquea con `min` + validación en vivo cualquier fecha ya pasada (mismo criterio que el backend, que la rechaza con 400).

### Sala en vivo — página completa (Fase 4.1)

**Rutas:** `/marketplace/dinamica/:dinamicaId/sala` (privada) y `/p/dinamica/:dinamicaId/sala` (pública, sin auth).
**Archivos:** `PaginaSalaDinamica.tsx` / `PaginaSalaDinamicaPublica.tsx` (`apps/web/src/pages/private/marketplace/` y `.../public/`).

**Nació como modal (`SalaDinamica.tsx`) y se convirtió a página completa** (ago-2026, a pedido del usuario) — layout tipo detalle: header dark sticky (ícono Radio, título) + grid `lg:grid-cols-[3fr_2fr]` (60/40: escenario del evento a la izquierda, chat+moderación a la derecha), apilado en móvil. `SalaDinamica.tsx` fue eliminado.

**Punto de entrada único:** `BotonSalaEnVivo.tsx` — pill sticky debajo del header (estilo "EN VIVO" de YouTube/Twitch: negro + rojo, ícono `Radio` con blink), montado en `PaginaDinamica.tsx`/`PaginaDinamicaPublica.tsx`. Solo visible una vez publicada la Dinámica y (para quien no es el organizador) hasta que la sala está programada. Texto cambia según estado: "Sala en vivo" (invitación) / cuenta regresiva compacta / "En vivo ahora" (pulsando) / "Ver resultado" (cerrada, ícono trofeo).

**Columna izquierda (escenario), en orden mutuamente excluyente:**
1. "Configura el sorteo antes de programar la sala" (solo organizador, solo si `numeroIntentosSorteo === null` — cubre rifas publicadas antes de que existiera la sala, sin otro camino en la UI para fijar K/N).
2. "Programar sala" (organizador, K/N ya configurados, sin fecha aún).
3. `CronometroSala` + botones **"Automático"**/**"Manual"** (organizador, habilitados al llegar la hora — ver §12 para la diferencia entre modos).
4. `TombolaSorteo` (tómbola 3D real + banner de ronda + revelación) — mientras `estado='en_sorteo'`, debajo aparece **"Siguiente bola"** (modo manual) o **"Pausar"/"Reanudar"** (modo automático), solo para el organizador.
5. `GanadoresSala` (lista ordenada por lugar, `estado='cerrada'`, nombres vía `GET /:id/sala`) — la tómbola con el historial completo de bolas se queda visible arriba como evidencia, no se reemplaza por el card de ganadores.

**Columna derecha:** `PanelModeracionSala` (solo organizador, con punto de presencia verde/gris por participante) + `ChatSala` (rediseñado ago-2026 para calcar `ComentarioItem.tsx` de MarketPlace: avatar clickeable → `ModalImagenes`, nombre visible, menú ⋮ con "Contactar" por ChatYA — antes era burbujas estilo WhatsApp izq/der).

Estado en vivo vía `useSalaDinamica(dinamicaId)` (hook) → `useSalaDinamicaStore.ts` (store) → eventos `dinamica:sala:*` de Socket.io. Ambas páginas calculan `esOrganizador`/`estado`/`salaProgramadaPara` con fallback síncrono al dato ya cargado por HTTP (no esperan el snapshot del socket) para que la UI no se sienta "atrasada" un instante al entrar.

### Cuadro de Honor — "Últimos Ganadores"

**Archivo:** `apps/web/src/components/dinamicas/CuadroHonorDinamicas.tsx` — resumen público agregado de rifas **cerradas** de la ciudad + sus ganadores (avatar/nombre real si tiene cuenta AY, genérico si el organizador lo agregó a mano). Antes el único lugar donde se veían resultados era entrando a la sala de cada Dinámica una por una.

- **Fuente:** `GET /api/dinamicas/salon-fama?ciudad=` (`listarSalonFamaDinamicas` en `dinamicas.service.ts`) — filtra `estado='cerrada'` + join a `dinamica_ganadores`; descarta defensivamente cualquier `cerrada` sin ganadores persistidos.
- **Escritorio (`lg:`):** columna **fija por JS** (`position:fixed`, no `sticky`) a la izquierda del feed — mismo patrón que "Recién publicado" de `SeccionFeedArticulos.tsx` (`headerBottom` medido del header sticky + `cardsLeft` medido de un placeholder). El `top` se alinea contra el **primer card real del feed** (no contra el encabezado) midiendo la distancia encabezado→primer card, para que ambas columnas arranquen a la misma altura.
- **Móvil:** reel horizontal con scroll nativo + snap (`overflow-x-auto snap-x`), card de ancho fijo `w-44` — mismo tamaño y estilo que `CardArticuloReel.tsx` (MP) / `CardNegocioReel.tsx` (Negocios), para sentirse del mismo módulo visual.
- Click en cualquier card → la sala de esa Dinámica (resultado completo + hash de verificación).
- Encabezado "Últimos Ganadores" (`text-sm font-bold uppercase tracking-wide text-slate-600`) — mismo estilo que "Recién publicado".

### Composer — crear/editar

**Orquestador:** `apps/web/src/components/dinamicas/composer/ComposerSectionDinamicas.tsx` — calcado 1:1 del composer de MarketPlace. Activado por query params:

- `?dinamicas=1&crearDinamica=1` → modo creación.
- `?dinamicas=1&editarDinamica=<id>` → modo edición (solo mientras `estado='borrador'`).

Móvil: página completa estilo "Nueva publicación" de Instagram/Facebook. Desktop: `ModalAdaptativo` de tamaño fijo. Guarda borrador automáticamente en localStorage mientras el usuario escribe (mismo patrón que MarketPlace).

**Chips "Boletos" y "Reglas" separados** (ago-2026) — antes los campos del sorteo (K/N) vivían dentro del panel "Boletos"; ahora tienen su propio chip "Reglas" (ícono `Trophy`), cada uno valida/abre independiente. En "Boletos", "Empieza en" pasó a llamarse "Boleto Inicial"; en móvil los 3 campos van en grid 2+1 (Boleto Inicial + Total arriba, Precio abajo ocupando el ancho completo), en `lg:` los 3 caben en una sola fila. El campo antes "Sale en el intento #" ahora dice "Intentos por lugar" (refleja el algoritmo por rondas, ver §12) — **oculto cuando `metodoSorteo==='tabla_completa'`** (ese método no usa N, solo K).

**`tabla_completa` bloquea "Boleto Inicial" (fijo en 1) y renombra "Total de Boletos" a "Total de Tablas"** — el número de boleto es puramente interno para este método (el participante elige por tabla, visualmente, no por número — decisión de producto confirmada), así que preguntarle al organizador dónde "empieza" la numeración no tiene sentido; el campo queda deshabilitado igual que en `carta_unica` (mismo patrón visual), pero el total SÍ sigue editable (hasta el tope de 150) porque ahí sí decide cuántas tablas vender. La confirmación "Boletos del #X al #Y" NO se muestra para este método (no aporta nada, el número es invisible para el participante). **Validación del tope de 150 en vivo** (no espera a `intentoEnvio` como el resto de errores del composer): en cuanto el organizador escribe más de 150 en "Total de Tablas", el input se marca en rojo y aparece "Máximo 150 tablas — el catálogo no tiene más" de inmediato, sin necesidad de intentar Guardar/Publicar primero — el chip "Boletos" también se pinta de error en ese momento.

### Integración — Perfil público del organizador

`apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx` (compartida con MarketPlace) — 2 tabs de nivel superior: **MarketPlace** y **Dinámicas** (cada una solo aparece si la persona tiene actividad en ella). Dentro de MarketPlace, sub-filtro "En venta"/"Vendidas". La tab Dinámicas usa `useDinamicasDeOrganizador(usuarioId)` (sin `incluirCanceladas` — perfil público, no muestra canceladas) y renderiza `CardDinamicaCompacta` en el mismo grid `2/3/4` columnas que Publicaciones/Vendidos. KPI del HeroCard (Completadas/Canceladas) cambia dinámicamente según la tab activa.

### Integración — Mis Publicaciones (gestión del organizador)

`apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` — 3er tipo de publicación (**MarketPlace / Servicios / Dinámicas**) en el selector top-level (icon-pill ámbar). 2 chips de estado propios (no los 3 de MarketPlace, que no calzan con el ciclo de Dinámicas):

- **Activas** — agrupa `activa`, `pospuesta`, `en_sorteo`.
- **Cerradas** — agrupa `cerrada`, `cancelada`.

Usa `useDinamicasDeOrganizador(usuarioId, { incluirCanceladas: true })` — a diferencia del perfil público, aquí SÍ se ven las canceladas (es el propio organizador gestionando lo suyo). Renderiza `CardDinamicaMio` con su menú "⋯" (Editar / Agregar Part. / Posponer / Cancelar, mismo componente `ModalesAccionDinamica.tsx` que la ficha de detalle). FAB dice "Organizar" en vez de "Publicar" y enruta a `/marketplace?dinamicas=1&crearDinamica=1` (crear una Dinámica nueva sigue usando el composer completo en `/marketplace`; solo "Editar" de una ya publicada quedó inline en "Mis Publicaciones" vía `ModalEditarDinamica`, sin sacar al usuario del panel — igual que "Editar" de MarketPlace y Servicios, ago-2026).

### Página pública para compartir

**Ruta:** `/p/dinamica/:dinamicaId`
**Archivo:** `apps/web/src/pages/public/PaginaDinamicaPublica.tsx`

Versión accesible sin sesión del detalle, para los links compartidos (WhatsApp/redes). Sigue el mismo patrón que `PaginaArticuloMarketplacePublico.tsx` (su par de MarketPlace, plantilla de este archivo):

- Mismo diseño aprobado del detalle privado (galería, hero 2 columnas, boletos, participantes, "Cómo funciona"), pero con el chrome de auth intercambiado: `HeaderPublico`/`FooterPublico` en vez del header dark del módulo; sin menú de acciones del organizador (100% privadas); reservar boleto y "Contactar" abren `ModalAuthRequerido` (nuevo tipo `'dinamica'`, ícono `Ticket`, tema ámbar) en vez de la acción real.
- OG tags vía `useOpenGraph` para que el preview en WhatsApp/FB se vea bien.
- El botón "Compartir" de la ficha privada apunta aquí (antes apuntaba a la ruta privada como placeholder).
- **Importante:** las columnas del hero (`lg:grid-cols-[3fr_2fr]`) necesitan `min-w-0` en ambos hijos — sin eso, el carrusel de boletos (ancho intrínseco de cientos de px) expande la columna del grid y desborda toda la página horizontalmente. La ficha privada ya lo tenía; la pública lo copió después de un bug real.

### Chat con contexto — ChatYA

El botón "Contactar" (organizador, desde el card del feed o la ficha) abre ChatYA con una card de contexto pre-cargada (foto + título + precio por boleto) + mensaje pre-llenado, igual que ya existe en MarketPlace/Servicios/Ofertas. Piezas:

- **Nuevo `contextoTipo: 'dinamica'`** en `chat_conversaciones` — migración `docs/migraciones/2026-08-05-chat-contexto-tipo-dinamica.sql` (amplía el `CHECK`). Reusa la columna genérica `contexto_referencia_id` (mismo patrón que `oferta`/`articulo_negocio`) — **no** tiene columna FK dedicada como `articulo_marketplace_id`, así que no hizo falta agregar columna nueva.
- **Backend:** `insertarMensajeContextoDinamica()` en `chatya.service.ts`, cableado en `crearObtenerConversacion()` tanto para conversación nueva como existente.
- **Frontend:** `apps/web/src/hooks/useIniciarChatDinamica.ts` (calca `useIniciarChatMarketplace.ts`) — acepta un tipo estructural mínimo (`{id, titulo, precioBoleto, fotosPremio, organizador}`) que satisfacen tanto `DinamicaFeedItem` como `DinamicaDetallePublico`, así lo puede usar tanto `CardDinamica.tsx` (feed) como `PaginaDinamica.tsx` (detalle) sin acoplarse a un solo shape.
- **Render de la card:** `PreviewContextoInput.tsx` (antes de enviar) y `BurbujaMensaje.tsx` (persistida) — nuevo caso `subtipo: 'dinamica'`, eyebrow ámbar "Dinámicas", navega a `/marketplace/dinamica/:id` al hacer click.
- El "Contactar" de un **participante** (no el organizador) en la lista de la ficha sigue usando el chat directo simple (`useIniciarChatDirectoPersona`), sin card — son personas, no el recurso.

---

## 🔌 Backend — Endpoints

**Archivo:** `apps/api/src/routes/dinamicas.routes.ts`

### Privados (`verificarToken` + `requiereModoPersonal`)

| Método | Ruta | Función |
|---|---|---|
| GET | `/mias` | Mis Dinámicas (todas, sin filtro de estado — usado por composer/legacy) |
| POST | `/` | Crear borrador |
| PUT | `/:id` | Editar — completo si `estado='borrador'`; limitado a título/descripción/fotosPremio si `estado IN ('activa','pospuesta')` (409 si se manda otro campo); rechazado (409) en `en_sorteo`/`cerrada`/`cancelada` |
| POST | `/upload-imagen` | Presigned URL R2 para fotos del premio |
| DELETE | `/foto-huerfana` | Limpieza R2 con reference count |
| POST | `/:id/publicar` | Publicar (borrador → activa) + checklist de confirmaciones |
| POST | `/:id/posponer` | Posponer (nueva `fechaLimiteInscripcion`) |
| POST | `/:id/cancelar` | Cancelar |
| POST | `/:id/boletos/reservar` | Reservar boleto propio |
| POST | `/:id/boletos/manual` | Alta manual (solo organizador) — body incluye `estado: 'reservado'\|'pagado'` |
| PUT | `/:id/boletos/:boletoId` | Editar participante manual — nombre/teléfono/número (solo organizador, solo boletos sin `usuarioId`) |
| POST | `/:id/boletos/:boletoId/reasignar` | Reasignar número de un boleto CON cuenta AY (solo organizador) — dispara `dinamica_boleto_reasignado` |
| POST | `/:id/boletos/:boletoId/liberar` | Liberar boleto — borra la fila, el número vuelve a disponible (solo organizador) |
| POST | `/:id/boletos/:boletoId/confirmar-pago` | Confirmar pago (solo organizador) — si el boleto tiene `usuarioId`, dispara `dinamica_pago_confirmado` |
| POST | `/:id/sala/activar` | Programa la sala (`salaProgramadaPara`) — solo organizador (Fase 4.1) |

### Públicos (`verificarTokenOpcional`)

| Método | Ruta | Función |
|---|---|---|
| GET | `/` | Feed público filtrado por ciudad (`?ciudad=&pagina=&limite=`) — `estado IN ('activa','pospuesta','en_sorteo')`. `en_sorteo` se agregó ago-2026 (bug real: sin esto, la rifa desaparecía del feed justo cuando el organizador iniciaba el sorteo y nadie podía encontrarla para entrar a la sala en vivo). `cerrada` se queda fuera a propósito — esas migran al Cuadro de Honor. |
| GET | `/salon-fama` | Cuadro de Honor — rifas cerradas + ganadores de la ciudad (`?ciudad=&pagina=&limite=`), para el resumen agregado del feed (Fase 4.1) |
| GET | `/organizador/:usuarioId` | Dinámicas de un organizador + insignia (`?incluirCanceladas=1` solo si el requester es ese mismo usuario autenticado) |
| GET | `/:id` | Ficha enriquecida (organizador + boletos + insignia) |
| GET | `/:id/boletos` | Lista pública de participantes (sin teléfono) |
| GET | `/:id/sala` | Carga inicial de la sala — estado, mensajes recientes, ganadores si ya cerró (Fase 4.1) |

**Unirse/chat/moderar/iniciar sorteo son eventos de Socket.io** (`dinamica:sala:*` en `apps/api/src/socket.ts`), no rutas HTTP — ver §12.

---

## 🗄️ Base de Datos

**Archivo:** `apps/api/src/db/schemas/schema.ts`

### `dinamicas`

Campos obligatorios solo para publicar (nullable en borrador): `descripcion`, `fotos_premio`, `tipo_premio` (`fisico`|`efectivo`), `metodo_sorteo` (`tombola`|`carta_unica`|`tabla_completa`), `numero_total_boletos`, `precio_boleto`, `ciudad_id`, `fecha_limite_inscripcion`. `regla_desempate` solo aplica a `tabla_completa`. `confirmaciones` (JSONB, checklist legal) se llena al publicar. `semilla_aleatoria`/`timestamp_sorteo`/`hash_verificacion` se llenan al **iniciar el sorteo** (Fase 4.1, antes siempre NULL).

**Fase 4.1 agrega:** `sala_programada_para` (timestamptz, nullable — su sola presencia es "sala configurada"), `numero_lugares_ganadores` (K, default 1), `numero_intentos_sorteo` (N, nullable, `CHECK >= numero_lugares_ganadores`) — K/N se capturan en el composer al crear/editar (no en vivo, por transparencia/auditoría). **El estado de la sala NO es columna nueva** — reusa `estado` (`activa`/`pospuesta` con `sala_programada_para` fijada → `en_sorteo` → `cerrada`).

### `dinamica_boletos`

`UNIQUE (dinamica_id, numero_boleto)` — la defensa real contra doble-reserva. `CHECK`: o tiene `usuario_id`, o tiene `nombre_manual` + `telefono_manual` (no puede quedar sin dueño). `reservado_expira_en` = `reservado_en` + 24h, usado por el cron de liberación.

### `dinamica_ganadores`

Tabla creada en Fase 1, **en uso desde Fase 4.1**: `lugar` (smallint, 1ro/2do/...) y `numero_intento` (a qué bola salió) se llenan al iniciar el sorteo. `UNIQUE (dinamica_id, boleto_id)` y `UNIQUE (dinamica_id, lugar)`. Solo se persisten los K ganadores — las bolas "no ganó" no se guardan, son recomputables desde `semilla_aleatoria` + el algoritmo documentado (§12), verificables contra `hash_verificacion`.

### `dinamica_sala_mensajes` (Fase 4.1)

Chat en vivo de la sala — broadcast N:N sin destinatario, por eso es tabla propia y NO reusa `chat_conversaciones`/`chat_mensajes` (ese modelo es 1:1/negocio con estado de lectura por destinatario). `usuario_id` NOT NULL — los visitantes anónimos nunca insertan, solo leen. `tipo` (`texto`|`sistema`, este último para avisos de moderación). `contenido` `CHECK` 1-500 caracteres. `eliminado` (soft-delete).

### `dinamica_sala_moderacion` (Fase 4.1)

Moderación **efímera**, por evento — silenciar/expulsar solo aplica a esa Dinámica, se borra sola con ella (`ON DELETE CASCADE`). `tipo` (`silenciado`|`expulsado`), `UNIQUE (dinamica_id, usuario_id, tipo)`. Levantar la sanción = `DELETE` de la fila. El bloqueo **permanente** NO tiene tabla aquí — reusa `chat_bloqueados` tal cual, vía `bloquearUsuario()`/`desbloquearUsuario()` de `chatya.service.ts` (aplica a todas las Dinámicas futuras del organizador y a ChatYA directo).

**Migraciones:** `2026-08-07-dinamicas-sala-columnas.sql` (columnas de `dinamicas`/`dinamica_ganadores`), `2026-08-07-dinamica-sala-mensajes-moderacion.sql` (las 2 tablas nuevas) — ✅ corridas en DEV/PROD (9-ago).

---

## 🔔 Notificaciones

Catálogo completo, iconos/colores y patrón general en `docs/arquitectura/Notificaciones.md`. Todos los tipos de Dinámicas son `modo: 'personal'`, `referenciaTipo: 'dinamica'`, `referenciaId: dinamicaId` (deep-link a `/marketplace/dinamica/:id`), y todas las funciones que las disparan viven en `dinamicas.service.ts` junto a la acción que las origina, en modo best-effort (`.catch(() => undefined)` — nunca rompen el flujo principal).

| Tipo | A quién | Cuándo | Función |
|---|---|---|---|
| `dinamica_pospuesta` | Al **organizador** | Al posponer, sobre su propia acción | `notificarDinamicaPospuesta()` |
| `dinamica_pospuesta` | A **cada participante con cuenta AY** (`usuarioId` en su boleto) | Al posponer — antes (bug, corregido ago-2026) solo le llegaba al organizador, nunca a quienes ya tenían boleto | `notificarParticipantesDinamicaPospuesta()` — consulta todos los `usuarioId` distintos de `dinamica_boletos` para esa Dinámica y llama `notificarDinamicaPospuesta()` por cada uno en paralelo |
| `dinamica_pago_confirmado` | Al participante (solo si tiene `usuarioId`) | El organizador confirma su pago (`confirmar-pago`) | `notificarPagoBoletoConfirmado()` — los participantes "Sin cuenta AY" no tienen usuario al que notificar dentro de la app |
| `dinamica_boleto_reasignado` | Al participante (solo si tiene `usuarioId`) | El organizador reasigna su número (`reasignar`) | `notificarBoletoReasignado()` — incluye número anterior y nuevo en el mensaje |
| `dinamica_resultado` | A cada participante con cuenta AY (boleto `pagado`) | La sala cierra tras el sorteo (`cerrarSala()`) — mensaje distinto si ganó ("¡Ganaste! lugar #N") o no | `cerrarSala()` en `services/dinamicas/sala.service.ts` (Fase 4.1) |

**Migraciones del CHECK `notificaciones_tipo_check`:** `2026-08-03-notificaciones-dinamicas.sql` (agrega `dinamica_pospuesta`/`dinamica_resultado`), `2026-08-07-notificaciones-dinamica-pago-confirmado.sql`, `2026-08-07-notificaciones-dinamica-boleto-reasignado.sql`.

---

## ⏰ Cron Jobs

**Archivo:** `apps/api/src/cron/dinamicas-expiracion.cron.ts`

- **Frecuencia:** cada 30 minutos (vs 6h/1x-día de MarketPlace — TTL corto de 24h en vez de 30 días).
- **Qué hace:** `DELETE FROM dinamica_boletos WHERE estado='reservado' AND reservado_expira_en < NOW()`. El número simplemente vuelve a estar disponible — no hay estado "expirado" intermedio.

---

## 🎲 Sala en vivo y motor de sorteo (Fase 4.1 + 4.2 + 4.3)

El organizador programa la sala con anticipación (`salaProgramadaPara`), todos ven una cuenta regresiva y se unen a una sala con chat en vivo — visitantes sin cuenta AY pueden entrar en modo lectura desde el link público, escribir/participar pide login. El organizador conduce el evento a mano: transición manual, no un cron automático (el cron/timer solo maneja la cuenta regresiva visual y habilita los botones "Automático"/"Manual").

**Máquina de estados reusada** — no hay columna "estado de sala" nueva: `dinamicas.estado` mapea 1:1 (`activa`/`pospuesta` con `salaProgramadaPara` fijada → `en_sorteo` → `cerrada`), reusando el guard `puedeTransicionar()` de `dinamicas/estados.ts` que ya declaraba esos valores desde Fase 1 sin nada que transicionara a ellos.

**Motor de sorteo — determinista y auditable** (`apps/api/src/services/dinamicas/sorteo.ts`, módulo puro sin BD):
- Al iniciar, se genera una `semillaAleatoria` con `crypto.randomBytes(32)` — nadie la elige, nadie puede predecirla.
- **Por RONDAS**: cada lugar premiado corre su propia ronda de N bolas — las primeras N-1 de esa ronda "no ganan", la N-ésima es la ganadora de ESE lugar. Las rondas se revelan en orden de lugar **descendente** (K, K-1, ..., 1), así que el premio mayor (lugar #1) es siempre la última bola de TODO el sorteo.
- Sin reemplazo a lo largo de todo el sorteo (no solo dentro de cada ronda): cada bola usa `SHA256(semilla:intentoGlobal) % restante.length` como índice sobre el pool de `pagado` que va quedando. Total de bolas del sorteo = **K × N**.
- Solo los K ganadores se persisten en `dinamica_ganadores`; los intentos "no ganó" no se guardan — cualquiera puede recomputarlos desde la `semillaAleatoria` pública + el algoritmo, y verificar el resultado contra `hashVerificacion` (`SHA256(dinamicaId|semilla|secuencia)`). Este mismo principio es lo que permite `historialCompleto` (ver abajo) sin agregar ninguna columna nueva.
- `iniciarSorteo()` calcula TODO el resultado de una vez (fairness: la secuencia debe quedar fija antes de revelar nada) y lo persiste junto con la transición a `en_sorteo`. La revelación gradual es responsabilidad de `socket.ts`, que al terminar llama `cerrarSala()` (transición `en_sorteo → cerrada` + notificaciones `dinamica_resultado`) — compartido entre el modo automático y el manual (`cerrarSalaYAnunciar()`).

**Modo automático vs manual (Fase 4.2)** — al llegar la hora, el organizador elige cómo se revela:
- **Automático** (`revelarSorteoEnVivo()`): cascada temporizada, ~2s entre cada bola (`dinamica:sala:intento`), igual que Fase 4.1. El organizador puede **pausar/reanudar** a mitad de la cascada (`dinamica:sala:pausar-sorteo`/`reanudar-sorteo`) — no cancela nada, solo detiene el avance a la siguiente bola; se revisa la bandera de pausa antes de emitir cada una.
- **Manual**: el organizador revela una bola a la vez con el botón "Siguiente bola" (`dinamica:sala:revelar-siguiente-bola`) — mismo resultado ya calculado, solo cambia el ritmo de revelación.
- Ambos modos guardan su progreso **en memoria** del proceso de Node (`sorteosAutomaticosPausables`/`sorteosManualesPendientes` en `socket.ts`, keyed por `dinamicaId`) — **no** en BD. Esto tiene una consecuencia real: si el servidor de la API se reinicia a mitad de un sorteo (deploy, crash, health-check), ese progreso se pierde y la Dinámica queda **atorada en `en_sorteo`** para siempre (nadie puede volver a "Iniciar sorteo" porque la transición `en_sorteo → en_sorteo` es inválida). Ver §Decisiones y pendientes abiertos.

**Catch-up en vivo** — si alguien se une (o recarga la página) DESPUÉS de que el sorteo ya empezó, se perdió los eventos `dinamica:sala:intento` anteriores (solo se emiten una vez). El servidor manda, dentro del MISMO evento `dinamica:sala:estado-inicial` (no uno aparte, para evitar el parpadeo de "esperando la primera bola" antes de que llegue el segundo evento):
- `intentosEnCurso` — las bolas ya reveladas hasta ahora, tomadas del progreso en memoria (`.slice(0, cursor/progreso)`).
- `modoSorteoActual` — 'automatico'/'manual', para que el botón correcto ("Siguiente bola" o "Pausar/Reanudar") aparezca. Necesario porque `dinamica:sala:estado-cambio` (que normalmente manda `modoSorteo`) solo se emite UNA vez, al iniciar — quien se une después nunca lo recibe.

**`historialCompleto` para salas cerradas** — al pedir `GET /:id/sala` de una Dinámica ya `cerrada`, el backend **recomputa** el sorteo completo (`ejecutarSorteo()` con el pool de boletos `pagado` + la `semillaAleatoria` ya persistida) para devolver TODAS las bolas (ganadoras y "no ganó"), no solo los K ganadores — sin necesidad de una tabla/columna nueva, mismo principio de verificabilidad pública. El frontend muestra la tómbola con este historial completo como "evidencia" junto al card de ganadores, en vez de reemplazarlo.

**Método `carta_unica` — lotería mexicana, carta única (Fase 4.3)** — el segundo de los 3 métodos, según el orden ya acordado (tómbola → carta única → tabla completa). Reutiliza el motor **sin ningún cambio**: mismo pool (boletos `pagado`), mismo `ejecutarSorteo()`, misma persistencia en `dinamica_ganadores.boleto_id`, mismo evento `dinamica:sala:intento` — la carta asignada a cada boleto es una **función pura y determinista de `numeroBoleto`** (`obtenerCartaPorBoleto()` en `apps/web/src/data/cartasLoteria.ts`), calculada en el frontend, sin tabla ni columna nueva en BD. `numeroTotalBoletos`/`numeroBoletoInicial` quedan **FIJOS en 54/1** cuando `metodoSorteo==='carta_unica'` (no es un tope editable — siempre se usa la baraja completa, como en la lotería real): el composer los autocompleta y bloquea los inputs en cuanto se elige el método, y `dinamicas.schema.ts` (backend)/`useComposerDinamicas.ts` (frontend) rechazan cualquier otro valor como defensa del lado del servidor. Sin esto, quedaría ambiguo qué "El Gallo" cantó en la sala en vivo si dos boletos compartieran carta. La pantalla de resultado usa `CartaSorteo.tsx` (componente hermano de `TombolaSorteo.tsx`, mismo shape de props y misma lógica de banner/guardia de animación/historial, deliberadamente duplicado en vez de compartido para no arriesgar el componente de tómbola ya cerrado) en vez del canvas 3D — sin `Suspense`/lazy-load, los webp de `apps/web/public/loteria/` ya están bundleados. `GanadoresSala.tsx` recibe `metodoSorteo` opcional y agrega la miniatura de la carta junto a "Boleto #N" cuando aplica. La pantalla de **reserva de boletos** (grid de números) no cambia para este método — sigue siendo por número, igual que tómbola.

**Método `tabla_completa` — lotería mexicana, tabla completa (Fase 4.3, tercer y último método)** — a diferencia de tómbola/carta única, este método necesita un **motor de sorteo propio** (`ejecutarSorteoTablaCompleta()` en `sorteo.ts`, junto a `ejecutarSorteo()`, sin tocarla): no hay "K lugares × N intentos fijos" conocidos de antemano — se cantan cartas de la baraja (54, sin reemplazo, mismo `indiceDeterministico()` ya usado en el resto del motor) y, después de cada una, se revisa si alguna tabla **activa** (16 cartas asignadas por boleto) ya quedó completa. El primero en completar gana el **lugar #1 de inmediato** (al revés de tómbola/carta única, donde el premio mayor sale al final) — se sigue cantando entre las tablas restantes para el 2do, 3er lugar, etc., hasta llegar a K lugares o agotar el mazo de 54.

- **Catálogo de 150 tablas pre-generadas** — mismo criterio que carta única: función pura determinista, **sin tabla ni columna en BD**. Cada tabla es un arreglo de 16 índices de carta (1-54), generado una sola vez (script desechable, no en tiempo real) garantizando que ninguna COMBINACIÓN de 16 cartas se repita dentro del catálogo (el orden de acomodo sí varía entre tablas, para que se vean distintas visualmente — solo el conjunto debe ser único). `obtenerTablaPorBoleto(numeroBoleto)` resuelve la tabla de un boleto, mismo patrón que `obtenerCartaPorBoleto()`. **Duplicado, no compartido:** el catálogo vive en 2 archivos idénticos — `apps/api/src/services/dinamicas/tablasLoteria.ts` (motor) y `apps/web/src/data/tablasLoteria.ts` (UI, resuelve a `CartaLoteria` para pintar) — decisión deliberada de no introducir `packages/shared/` por primera vez en el repo (confirmado 0 usos existentes) para una sola pieza, prefiriendo la constante duplicada de bajo riesgo. Si se regenera el catálogo algún día, hay que actualizar los 2 archivos por igual.
- **`numeroTotalBoletos` topado a 150** (no fijo como carta única — el organizador sí elige cuántos boletos vender, hasta el máximo del catálogo, una tabla por boleto) — validado en `dinamicas.schema.ts` (`validarTopeTablaCompleta`) y `useComposerDinamicas.ts`.
- **N (`numeroIntentosSorteo`) NO aplica a este método** — el composer oculta el campo "Intentos por lugar" cuando `metodoSorteo==='tabla_completa'` (solo pide K, "Lugares premiados"); `validarConfigSorteo` (backend) y su espejo en `useComposerDinamicas.ts` exentan a este método del cruce K×N≤total. `activarSala()`/`iniciarSorteo()` (`sala.service.ts`) y el gate de "¿Cuándo se hace el sorteo?" en las páginas de sala tampoco exigen N configurado para este método — antes de este ajuste, cualquier Dinámica `tabla_completa` se quedaba **atorada** sin poder programar sala nunca (el gate original exigía `numeroIntentosSorteo !== null`, que para este método siempre es NULL).
- **Empates — la única situación real donde `reglaDesempate` hace algo** (el campo existe en el schema desde Fase 1 pero nunca se usó hasta ahora): 2+ tablas pueden completarse con la misma carta.
  - `sorteo_instantaneo` / `ronda_extra`: un solo ganador determinista (mismo hash-index que el resto del motor) se lleva el lugar; los demás siguen activos para el siguiente. `ronda_extra` no tiene forma real de "extender" el sorteo (el mazo son 54 cartas fijas sin reemplazo) — para esta primera versión se comporta igual que `sorteo_instantaneo`, simplificación documentada.
  - `repartir_premio`: TODOS los empatados se llevan lugares **consecutivos** de una vez (sin tocar el schema — evita que 2 ganadores compartan la misma fila `lugar`, que violaría el `UNIQUE (dinamica_id, lugar)` de `dinamica_ganadores`).
  - `orden_inscripcion`: gana quien pagó primero (`dinamica_boletos.pagado_en` más antiguo).
- **Socket.io propio, en paralelo** — evento `dinamica:sala:carta-cantada` (payload `{numeroIntento, cartaIndice, ganadores}`) y sus propios mapas de pacing en memoria (`sorteosManualesPendientesTablaCompleta`/`sorteosAutomaticosPausablesTablaCompleta` en `socket.ts`), en vez de reusar `dinamica:sala:intento`/los mapas de tómbola — mismo `MS_ENTRE_INTENTOS` (~2s), mismo mecanismo de pausa/reanudar/catch-up (`cartasEnCurso` en el evento `estado-inicial`), pero iterando `cartas` en vez de `intentos`.
- **`historialCartas`** — equivalente a `historialCompleto` para salas cerradas de este método: `GET /:id/sala` recompone las 54 cartas cantadas desde `semillaAleatoria` + `ejecutarSorteoTablaCompleta()`, mismo principio de verificabilidad pública, sin columna nueva.
- **Pantalla de resultado — `TablaCompletaSorteo.tsx`** (nuevo, hermano de `CartaSorteo.tsx`/`TombolaSorteo.tsx`, mismo lenguaje visual de reverso oscuro + zoom `bolaZoomCamara` + tira de historial para la carta que se va cantando) agrega una pieza propia de este método: **"Tu tabla"** — el 4×4 del/los boleto(s) pagado(s) del usuario actual en esta Dinámica, marcado en vivo según se van cantando las cartas (como un bingo real), resaltado cuando se completa.
- **Pantalla de reserva de boletos** — a diferencia de tómbola/carta única, aquí SÍ cambia: cada boleto muestra un 4×4 de miniaturas de su tabla completa (no un número ni una sola carta), para que el participante **elija visualmente** la tabla que más le guste antes de pagar (decisión de producto confirmada: las 150 tablas del catálogo son navegables/públicas, la numeración interna no importa al usuario). Grid de escritorio en 3 columnas (en vez de 5, cada tarjeta es más ancha); móvil, carrusel Embla 1 tabla por slide (en vez de pares).

**Moderación en 2 capas:**
1. **Efímera, por evento** — silenciar/expulsar en `dinamica_sala_moderacion`, se borra con la Dinámica.
2. **Permanente** — bloquear reusa `chat_bloqueados` tal cual (mismas funciones que ChatYA), aplica a todas las Dinámicas futuras del organizador y a ChatYA directo.

**El chat cierra junto con la sala** — `enviarMensajeSala()` rechaza (409, "El chat de esta sala ya no está disponible") si `estado` no es `activa`/`pospuesta`/`en_sorteo`. El frontend refleja esto deshabilitando el input con el mensaje "Esta sala ya cerró" en vez de dejarlo escribible y que el envío rebote con error.

**Socket.io** (`apps/api/src/socket.ts`):
- El middleware de auth ahora **admite conexión anónima** (`socket.data.usuarioId = null`) — antes rechazaba cualquier conexión sin token. Cambio de infraestructura compartida (afecta TODOS los sockets, no solo Dinámicas), aditivo y sin bajar la seguridad de ChatYA.
- Room `sala-dinamica:<dinamicaId>` (mismo mecanismo `socket.join`/`io.to().emit()` que ya usa `usuario:<id>`).
- Cliente→servidor: `dinamica:sala:unirse`, `dinamica:sala:mensaje`, `dinamica:sala:salir`, `dinamica:sala:moderar`, `dinamica:sala:iniciar-sorteo` (payload con `modo: 'automatico'|'manual'`), `dinamica:sala:revelar-siguiente-bola`, `dinamica:sala:pausar-sorteo`, `dinamica:sala:reanudar-sorteo` — mismos eventos para los 3 métodos, el servidor decide internamente qué mapa de pacing usar según `metodoSorteo`.
- Servidor→cliente: `dinamica:sala:estado-inicial` (incluye `intentosEnCurso`/`cartasEnCurso`/`modoSorteoActual` si aplica), `dinamica:sala:mensaje`, `dinamica:sala:sistema`, `dinamica:sala:moderacion-actualizada`, `dinamica:sala:expulsado`, `dinamica:sala:estado-cambio` (incluye `modoSorteo` al iniciar), `dinamica:sala:pausa-cambio`, `dinamica:sala:intento` (tómbola/carta única), **`dinamica:sala:carta-cantada`** (tabla completa, payload `{numeroIntento, cartaIndice, ganadores}`), `dinamica:sala:sorteo-cerrado`, `dinamica:sala:error`.

**Frontend:**
- `apps/web/src/stores/useSalaDinamicaStore.ts` — store Zustand propio (no reutiliza `useChatYAStore.ts`), mismo patrón de listeners a nivel de módulo. Campos `modoSorteo`/`pausadoSorteo`; acciones `iniciarSorteo(modo)`/`revelarSiguienteBola()`/`pausarSorteo()`/`reanudarSorteo()`.
- `apps/web/src/hooks/useSalaDinamica.ts` — orquesta unirse/salir + refresca la carga HTTP cuando el estado pasa a `cerrada` (el evento de socket no trae nombres de ganadores, esos vienen de `GET /:id/sala`).
- `apps/web/src/pages/private/marketplace/PaginaSalaDinamica.tsx` / `apps/web/src/pages/public/PaginaSalaDinamicaPublica.tsx` — páginas completas de la sala (ver arriba, ya no es modal).
- `apps/web/src/components/dinamicas/sala/`:
  - `BotonSalaEnVivo.tsx` — pill de entrada.
  - `CronometroSala.tsx` — cuenta regresiva, estilo "premium dark".
  - `TombolaSorteo.tsx` (Fase 4.2, YA NO es stub) — orquesta el banner de ronda ("Sorteando el Lugar N"/"Premio mayor", derivado de N/K sin pedir nada al backend), la escena 3D, la revelación (debajo de la escena, no como overlay encima — se probó y se sentía mal) y el historial en tira horizontal tipo "talón de boleto".
  - `EscenarioTombola3D.tsx` (nuevo, Fase 4.2) — canvas 3D real vía `@react-three/fiber`/`three`, mismo diseño en escritorio y móvil (antes había una versión CSS aparte solo para móvil, se eliminó): jaula tipo geodésica sostenida por 2 postes laterales que giran sobre ese eje, 24 bolas decorativas numeradas (texturas `CanvasTexture` renderizadas como `<sprite>` — billboard, siempre miran a cámara; el sprite necesita `depthTest={false}` porque si no, la esfera opaca de la bola tapa su propio número), en reposo amontonadas por capas (acotadas al corte real de la esfera) y repartidas por el volumen al girar. La bola activa viaja con una estela de bolas que se desvanecen (`meshBasicMaterial`, sin luz — deliberado: los materiales metálicos/vidrio sin reflejos de ambiente se veían mal, negro o plano, así que se evitan). Sin `drei`, sin HDRI/Environment, sin post-processing (mismo criterio que `SISTEMA_ICONOS.md`, nada de fetch de assets en runtime).
  - `GanadoresSala.tsx` — lista ordenada por lugar (ya no "podio"): cada fila separa el badge del lugar, avatar, nombre y "Boleto #N" como piezas visuales distintas (antes un texto combinado "Lugar #2 · #55" se leía repetido con el nombre "Competidor 055"). 1er lugar con fondo ámbar sutil y trofeo, sin colores de medalla por puesto (Regla 13). Prop opcional `metodoSorteo` agrega la miniatura de carta cuando es `carta_unica` (Fase 4.3).
  - `CartaSorteo.tsx` (nuevo, Fase 4.3) — pantalla de resultado del método `carta_unica`, hermano de `TombolaSorteo.tsx` (mismo shape de props, misma lógica de banner/guardia de animación/historial, sin abstracción compartida a propósito). Carta grande centrada + historial de miniaturas, sin canvas 3D.
  - `TablaCompletaSorteo.tsx` (nuevo, Fase 4.3) — pantalla de resultado del método `tabla_completa`, mismo lenguaje visual que `CartaSorteo.tsx` para la carta que se va cantando, más la pieza propia "Tu tabla" (4×4 marcado en vivo).
  - `PanelModeracionSala.tsx` (solo organizador).
- `apps/web/src/data/cartasLoteria.ts` (nuevo, Fase 4.3) — las 54 cartas (`{numero, slug, nombre, archivo}`, orden fijo calcado de los nombres de archivo reales) + `obtenerCartaPorBoleto(numeroBoleto)` (función pura, sin BD) + `MAXIMO_BOLETOS_CARTA_UNICA` (54, compartida con la validación del composer).
- `apps/web/src/data/tablasLoteria.ts` (nuevo, Fase 4.3) — catálogo de 150 tablas (16 cartas c/u) + `obtenerTablaPorBoleto(numeroBoleto)` + `MAXIMO_BOLETOS_TABLA_COMPLETA` (150). Espejo exacto de `apps/api/src/services/dinamicas/tablasLoteria.ts` (backend, usado por el motor) — ver nota de duplicación arriba.
- `services/socketService.ts` ganó `conectarSocketInvitado()` — conecta sin exigir token, para visitantes anónimos de la ficha pública (`conectarSocket()` existente sigue exigiendo sesión, sin tocar).
- Entrada: pill `BotonSalaEnVivo` en `PaginaDinamica.tsx`/`PaginaDinamicaPublica.tsx`, que navega a la ruta de la sala — visible en cuanto la Dinámica se publica.

**Explícitamente fuera de estas fases (4.1 + 4.2 + 4.3):** recordatorio de "la sala está por empezar", rate-limiting de chat más allá de lo básico, persistir el progreso del sorteo en BD (hoy vive en memoria — ver §Decisiones y pendientes abiertos sobre el riesgo de reinicio del servidor a mitad de sorteo), "ganar por línea" en `tabla_completa` (solo tabla llena, decisión de producto confirmada), `ronda_extra` como mecanismo real distinto de `sorteo_instantaneo` (documentado arriba como simplificación conocida), mover el catálogo de cartas/tablas a `packages/shared/`.

---

## 🎴 Assets — Cartas de lotería mexicana

Las 54 cartas necesarias para los métodos de sorteo `carta_unica`/`tabla_completa` (Fase 4) ya están generadas — arte original vía prompt en Gemini, **no** la baraja de "Don Clemente" (derechos de autor). Cableadas en la UI para `carta_unica` (vía `data/cartasLoteria.ts`) y para `tabla_completa` (vía `data/tablasLoteria.ts`, que resuelve cada uno de los 150 catálogos de 16 índices a estas mismas 54 imágenes).

- **Ubicación:** `apps/web/public/loteria/` (asset estático, no pasa por R2).
- **Formato:** WebP, 800×1200px, nombradas `carta-{NN}-{slug-personaje}.webp` (ej. `carta-01-el-gallo.webp` … `carta-54-la-rana.webp`).
- **Diseño fijo en las 54:** marco azul de marca `#1D4ED8` con esquinas redondeadas (horneadas en el pixel — no envolver con `rounded-xl`/`border` de CSS al usarlas), panel crema interior, título+número arriba, ilustración con colores naturales del personaje, franja azul inferior con mini-cabeza + título en blanco.
- El mazo es fijo y reusable: armar una "tabla" de 16 para un participante es solo elegir 16 al azar sin repetir y referenciar los archivos existentes — no se genera nada en tiempo real.

Detalle completo (incluye el prompt maestro usado, por si hace falta regenerar/agregar una carta) en la memoria de sesión del proyecto.

---

## 📦 Estado por fase

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1** | Backend: ciclo de vida, CRUD de borrador, transiciones de estado, boletos (funciones internas sin endpoint) | ✅ Completa |
| **Fase 2** | Moderación de texto reducida, checklist legal al publicar, fotos de evidencia del premio en R2, composer de creación/edición | ✅ Completa |
| **Fase 3** | Feed público, ficha de detalle, reservar/confirmar boletos, alta manual, chat automático por ChatYA, cron de expiración de reservas, integración en Perfil y Mis Publicaciones, **página pública para compartir**, **chat con contexto (card+mensaje pre-llenado) al Contactar**, **modales unificados**, **guardar en "Mis Guardados"**, **gestión avanzada de boletos** (liberar / editar participante manual / reasignar boleto con cuenta AY, cada uno con su notificación) | ✅ Completa |
| **Fase 4.1** | Sala en vivo (chat, moderación, cuenta regresiva) + motor de sorteo (tómbola) determinista/auditable por rondas (K×N) | ✅ Backend y frontend construidos (7-ago), migraciones corridas en DEV/PROD (9-ago) — **pendiente QA E2E** |
| **Fase 4.2** | Tómbola 3D real (Three.js), modo automático (con pausar/reanudar) y manual, catch-up en vivo para quien se une a mitad del sorteo, historial completo recomputado para salas cerradas | ✅ Construida (9-ago) — **pendiente QA E2E en producción** |
| **Fase 4.3** | Los 3 métodos de sorteo — `tombola` (Fase 4.1/4.2), `carta_unica` (mismo motor, piel de 54 cartas) y `tabla_completa` (motor propio `ejecutarSorteoTablaCompleta`, catálogo de 150 tablas, empates vía `reglaDesempate`, evento `carta-cantada`) | ✅ Completa (10-ago), sin migraciones nuevas — **pendiente QA E2E**. |
| **Fase 5** | Tarjeta compartible (imagen de resultado para redes sociales) | 🔜 Pendiente |

---

## 🧭 Decisiones y pendientes abiertos

- **Guardar en "Mis Guardados"** (ago-2026) — `'dinamica'` es `entityType` del sistema genérico `guardados` (`/api/guardados`), igual que oferta/servicio/articulo_marketplace. Bookmark disponible en `PaginaDinamica.tsx` (header, ícono `Bookmark`) y en `CardDinamica.tsx` (feed, corazón sobre la portada, oculto si `esMio`). Tab propio "Dinámicas" en `PaginaGuardados.tsx` (`ContenidoDinamicas`, reusa `CardDinamicaCompacta` + `BookmarkGlass`). Solo muestra Dinámicas `activa`/`pospuesta` (mismo criterio que el feed); requirió migración `docs/migraciones/2026-08-06-guardados-dinamicas.sql` (columna `dinamicas.total_guardados` + CHECK de `guardados.entity_type`). Ver `docs/arquitectura/Guardados.md` §Tab 4.
- **`pospuesta → activa` no existe como transición explícita.** Posponer es idempotente desde `activa` o `pospuesta`; siempre aterriza en `pospuesta` con la nueva fecha. Si se quiere una acción "reactivar" separada más adelante, es un cambio de alcance a discutir.
- **El feed de "Mis Dinámicas" (`GET /mias`)** no filtra por estado (trae todo) — a diferencia de `listarDinamicasDeOrganizador` (usado en Perfil/Mis Publicaciones), que sí agrupa. Verificar si `GET /mias` sigue en uso real o quedó obsoleto tras la integración a Mis Publicaciones.
- **Detalle de implementación de los 3 métodos de sorteo** — tómbola ya construida (Fase 4.1, motor genérico sobre un pool de boletos). Carta única y tabla completa (Fase 4.3) reusan el mismo motor, solo cambia la piel visual; tabla completa es la única que además necesita resolver empates (`reglaDesempate`).
- **Sala en vivo siempre obligatoria** (confirmado con el usuario) — no existe un atajo "sortear sin evento". Cualquier Dinámica con método `tombola` necesita `numeroIntentosSorteo` configurado (composer) y la sala programada antes de poder sortear.
- **Rondas independientes por lugar, no una sola cascada de N** (rediseñado ago-2026 tras probarlo en vivo — el diseño original de "un solo N para todos los K lugares" no era lo que el usuario esperaba) — cada lugar premiado corre su propia ronda de N bolas; el total del sorteo es K × N, y el premio mayor siempre sale en la última bola de todas, para sostener el suspenso.
- **Conexión anónima de Socket.io es un cambio de infraestructura compartida** (Fase 4.1) — antes cualquier socket sin token era rechazado; ahora conecta como invitado (`usuarioId: null`). Vale la pena tenerlo presente al tocar `socket.ts` para cualquier otro módulo (ChatYA, notificaciones, etc.).
- **Riesgo conocido: progreso del sorteo en memoria** — si el servidor de la API se reinicia (deploy, crash, health-check) mientras una Dinámica está `en_sorteo`, el progreso guardado en memoria (`socket.ts`) se pierde y la Dinámica queda atorada en `en_sorteo` para siempre (la transición `en_sorteo → en_sorteo` es inválida, nadie puede reiniciar el sorteo desde la UI). El único remedio hoy es un UPDATE manual en BD (resetear `estado`, `semillaAleatoria`, `hashVerificacion`, `timestampSorteo` a NULL/`activa`, y borrar los `dinamica_ganadores` de esa corrida abortada). Aceptable mientras la beta tenga pocas rifas simultáneas; si se vuelve un problema real, la solución es persistir el progreso (cursor de revelación) en la tabla `dinamicas` en vez de memoria.
- **Overlay de revelación probado y descartado** — se intentó que el resultado de cada bola apareciera como un overlay cubriendo la escena 3D (más "cinematográfico"), pero tapar la tómbola mientras gira se sintió mal; quedó como card debajo de la escena, sin overlap.
- **Material del conducto probado y descartado dos veces** — primero "vidrio" (`meshPhysicalMaterial` + `clearcoat`), luego metal cromado (`metalness` alto): ambos se ven mal (plano/gris o negro) sin reflejos de ambiente, que se evitan a propósito (sin HDRI, ver `EscenarioTombola3D.tsx`). Se quitó el tubo físico por completo — la bola activa viaja con una estela de "ecos" que se desvanecen (`meshBasicMaterial`, sin luz), sin necesidad de ninguna geometría de conducto.
- **Columnas fijas con `position:fixed` + JS, no `sticky`** (Cuadro de Honor y "Recién publicado" de MP) — con `sticky` el elemento solo se despega dentro del alto de SU contenedor padre; en escritorio estas secciones viven dentro de un contenedor con `lg:overflow-visible` (el scroll real ocurre en el `<main>` compartido de `MainLayout`), así que `fixed` es lo único que garantiza que la columna quede clavada en viewport. Igualar este patrón si se agrega otra columna fija en el futuro, no inventar uno con `sticky`.
- **Sala como página, no modal** (revertido de la decisión original de Fase 4.1) — el usuario pidió explícitamente una página completa con layout 60/40 (evento/chat) calcado del patrón de ficha de detalle, en vez del modal inicial. `SalaDinamica.tsx` fue eliminado.
- **Grid de reserva de `tabla_completa` sin optimizar para 150 boletos** — cada botón pinta 16 `<img>` (su tabla completa) para que el participante elija visualmente; con el tope de 150 boletos eso es hasta 2400 nodos `<img>` en el DOM (aunque solo 54 URLs únicas, cacheadas por el navegador tras el primer render). Aceptable para la beta (rifas P2P normalmente no llegan a 150 boletos) — si se vuelve un problema real de rendimiento, la solución es virtualizar el grid, no bajar la calidad visual de la elección.
- Ver `docs/kit-dinamicas/Contexto_Dinamicas.md` para el razonamiento de producto detrás de estas decisiones (por qué solo 3 métodos de los 7 originalmente considerados, por qué el filtro de moderación es reducido, etc.).
