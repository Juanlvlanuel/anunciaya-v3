# Visión Estratégica de AnunciaYA

> **Propósito de este documento:** Capturar las decisiones de producto y la filosofía que define a AnunciaYA, para que cualquier sesión futura (Claude, colaboradores, o yo mismo en 6 meses) entienda el "por qué" detrás de la estructura de la app y no proponga features que ya fueron descartados con razón.
>
> **Este NO es un documento técnico.** Para arquitectura técnica, ver los archivos `ARQUITECTURA_*.md`. Este documento es el norte estratégico.

---

## 1. Filosofía del producto

**AnunciaYA NO es una red social.** No competimos con Facebook, TikTok, Instagram ni WhatsApp en su terreno (feed social, contenido viral, likes, posts). En esa pelea perdemos siempre.

**AnunciaYA es la app de comercio local hiperlocal de la ciudad seleccionada.** El usuario la abre cuando piensa: *"necesito comprar / contratar / encontrar algo cerca de mí"*. Punto.

### Lo que Facebook hace mal en comercio local (nuestra ventaja real)

- No sabe si un negocio está abierto ahorita.
- No filtra por proximidad real.
- No tiene precios ni disponibilidad de productos.
- Sus reseñas son fáciles de manipular y nadie las lee.
- No tiene contacto directo cliente-negocio sin intermediarios algorítmicos.

Cada uno de esos puntos es donde AnunciaYA gana, gracias a las piezas únicas que ya tenemos construidas: **CardYA, ScanYA, ChatYA, geolocalización y onboarding verificado de negocios.**

### Modelo de negocio (recordatorio)

- Negocios pagan suscripción comercial ($449 MXN/mes) por Business Studio + ScanYA + presencia premium.
- Usuarios usan la app gratis.
- La sostenibilidad viene de los negocios verificados, NO de publicidad invasiva ni venta de datos de usuarios.

---

## 2. Estructura final de la app

### Menú público (4 secciones)

1. **Negocios** — directorio geolocalizado verificado
2. **MarketPlace** — compra/venta de **objetos** entre usuarios (NO servicios)
3. **Ofertas** — promociones, cupones y descuentos de negocios
4. **Servicios** — sección unificada para servicios e intangibles (incluye empleos)

### Home / Landing pública

- **Feed central:** Pregúntale a Peñasco (ver sección 4)
- Accesos rápidos a las 4 secciones
- Posibles bloques destacados (negocios nuevos, ofertas top, etc.)

### Secciones secundarias (existentes, no en menú principal)

- CardYA · ChatYA · Perfil

### Comerciales (existentes)

- Business Studio · ScanYA · Onboarding

---

## 3. Decisiones por sección

### 3.1 MarketPlace

- **Exclusivo para objetos físicos** entre usuarios.
- **NO se permiten servicios** publicados aquí (van en Servicios).
- **NO se permiten rifas** publicadas aquí.
- Mantener limpio y enfocado en compra-venta de cosas tangibles.

### 3.2 Servicios

Sección unificada (NO se separa "Servicios" y "Empleos" porque en pueblos turísticos como Peñasco la línea es borrosa: "hago limpieza", "soy plomero", "cuido niños" pueden ser ambos).

**Nombre público:** `Servicios`

**Al entrar, dos modos visibles:**
- **Ofrezco** → publica quien tiene un servicio que dar o busca empleo.
- **Solicito** → publica el negocio que contrata o el usuario que necesita un servicio.

**Pendiente de decidir cuando se aterrice el diseño:**
- Si el toggle interno usa primera persona (Ofrezco/Solicito) o tercera persona (Ofrecidos/Solicitados).
- Si el botón "Publicar" pregunta primero el modo o si se hereda de la pestaña activa.

### 3.3 Ofertas

Cubre la idea de "cazador de ofertas" sin necesidad de gamificación adicional por ahora. Si en el futuro se quiere agregar capa de juego (insignias, mapa de calor, retos semanales), se puede sumar como mejora — no como sección nueva.

### 3.4 Negocios

Sin cambios respecto al diseño actual. Es el directorio geolocalizado, ya cubierto en `ARQUITECTURA_Negocios_-_Directorio_Geolocalizado.md`.

---

## 4. Pregúntale a Peñasco (corazón del Home)

Es el feed que reemplaza la idea original de feed social. **NO es una sección del menú** — vive en el Home como elemento central.

### Concepto

Un buscador hiperlocal + feed automático generado por las preguntas que hacen los usuarios. Cuando alguien pregunta algo, el sistema:

1. Publica la pregunta en el feed del Home.
2. Envía notificaciones push a negocios y usuarios cuyo perfil contenga las palabras clave de la pregunta.
3. Cualquier usuario (vecino o negocio) puede responder.
4. La pregunta y sus respuestas alimentan el contenido público del Home.

Esto crea contenido orgánico generado por la comunidad, sin tener que competir con Facebook en su terreno de feed social.

### Personalidad (decisión confirmada)

Tres pilares combinados para que NO parezca solo un buscador:

**Pilar 1 — Conversacional**
- Header con saludo cálido tipo *"¿En qué te ayuda Peñasco?"* o *"¿Qué andas buscando hoy, Juan?"*.
- Placeholder rotativo del input con preguntas reales: *"¿Algún plomero por la colonia centro?"*, *"¿Dónde venden mariposas vivas?"*, *"¿Quién tiene tortillas a domicilio?"*.
- Tono de vecino, NO de motor de búsqueda.

**Pilar 2 — Comunitario en vivo**
- Indicadores de actividad: *"12 vecinos preguntando hoy"*, *"María preguntó hace 2 minutos"*.
- Tarjetas conversacionales con foto de quien pregunta + número de respuestas + botón *"Yo también quiero saber"* para sumarse a una pregunta.
- Sensación de "el pueblo está aquí ahorita".

**Pilar 3 — Mascota / identidad visual**
- Un personaje ilustrado que aparece en header, estados vacíos, mensajes de bienvenida.
- Le da alma a la app y la hace memorable.
- Ejemplos del concepto: el mono de Mailchimp, el búho de Duolingo, el personaje de Mercado Libre.
- En Peñasco (pueblo costero/pesquero), podría ser un cangrejo, pelícano, almeja parlanchina, etc. — **a decidir cuando se aterrice el diseño.**

### Adaptación a otras ciudades

El nombre "Pregúntale a Peñasco" es para la versión inicial. La sección debe ser parametrizable para que en otras ciudades se llame "Pregúntale a [ciudad]" automáticamente.

### Pendientes para cuando se aterrice el diseño

- Definir la mascota (define la identidad visual de toda la app).
- Layout exacto del Home con la mascota, input conversacional y tarjetas de preguntas.
- Flujo de hacer una pregunta (modal, pantalla completa, campos mínimos).
- Sistema de keywords/matching para notificaciones push (qué algoritmo usar).
- Moderación de preguntas (reportes, filtros automáticos).
- Persistencia/expiración de preguntas (¿cuánto tiempo viven?).

---

## 5. Features descartados (NO proponer en futuras sesiones)

### 5.1 Dinámicas / Rifas P2P con venta de boletos entre usuarios

**Estado:** Descartado permanentemente para v1.

**Razones:**
- **Legal:** En México, sorteo con pago + azar = Ley Federal de Juegos y Sorteos, requiere permiso de SEGOB. Aunque AnunciaYA no cobre directamente, el simple hecho de tener un módulo dedicado a organizar sorteos nos coloca como facilitadores especializados, NO como intermediarios protegidos por safe harbor (a diferencia de Facebook/WhatsApp que sí lo están porque su plataforma es genérica).
- **Reputacional:** Estafas son inevitables (rifas fantasma, doble venta de boletos, ganadores cómplices). Una sola estafa viral en Peñasco daña la marca de AnunciaYA aunque no hayamos tocado el dinero. Las víctimas demandan a la plataforma, no a quien estafó.
- **Riesgo de lavado de dinero / fiscal:** Premios mayores generan obligaciones de retención de ISR; UIF puede investigar.

**Argumento "que paguen por fuera" NO funciona:** La ley no distingue entre facilitar el sorteo y facilitar el cobro. Si la plataforma es donde ocurre el sorteo, somos parte de la operación.

**Precedente:** Apps como Rifapp, Sortealo y similares en LATAM han intentado este modelo y la mayoría cerró tras quejas de SEGOB o pivotearon a solo rifas promocionales de negocios.

### 5.2 Rifas de dinero en efectivo

**Estado:** Descartado permanentemente, sin importar quién las organice.

**Razón:** Territorio de casinos y casas de apuesta. Regulación mucho más estricta. No vamos a entrar ahí en ningún escenario de v1, v2, ni v3.

### 5.3 Rifas P2P de vehículos por particulares

**Estado:** Descartado permanentemente.

**Razón:** Monto alto = riesgo regulatorio alto + lavado + obligaciones fiscales. No justifica el valor que aportaría.

### 5.4 Live Sale / streaming en vivo

**Estado:** Descartado para v1. Reconsiderable en v2 si hay tracción y modelo de monetización claro.

**Razones:**
- **Costo recurrente real:** Cloudflare Stream Live (la única opción técnicamente viable, ver siguiente punto) cuesta ~$200-1,100 USD/mes según volumen. AnunciaYA absorbería ese costo, no los comerciantes.
- **Los comerciantes NO están dispuestos a pagar por hacer lives** (lo conciben como gratis por costumbre de Facebook/TikTok). Por lo tanto el costo no se puede transferir directamente a ellos sin diseñar un modelo de monetización (membresía Pro, comisión por venta apartada, etc.) que aún no está validado.
- **YouTube como alternativa "gratis" NO funciona técnicamente:**
  - Requiere canal verificado (95% de comerciantes de Peñasco no lo tiene ni lo tramitará).
  - Latencia de 10-30 segundos mata la mecánica de "apartar en vivo".
  - No se puede embeber el botón "apartar" dentro del video.
  - Algoritmo empuja el contenido a audiencias globales irrelevantes.
  - Riesgo de copyright por música ambiental.

**Cuando se reconsidere en v2:**
- Validar primero con un MVP de "fotos en ráfaga" (Camino A: subir fotos en tiempo real durante un horario anunciado, sin video). Costo cercano a $0 sobre Cloudflare R2 (ya en uso para todo el storage de la app).
- Si el MVP de fotos funciona, evolucionar a video real con Cloudflare Stream Live + monetización a negocios (suscripción Pro o comisión por venta).
- NO usar YouTube como base.

### 5.5 Pulse local (feed de actividad de la app)

**Estado:** Descartado a favor de Pregúntale a Peñasco como feed central.

**Razón:** El feed del Home se llena mejor con preguntas y respuestas de la comunidad que con eventos automáticos del sistema. La gente engancha más con conversación que con telemetría.

---

## 6. Features considerados y pospuestos

Estos NO están descartados — son ideas válidas que pueden retomarse cuando haya tracción y datos. NO implementar en v1 sin validar el core primero.

### 6.1 Pedidos de grupo

Un usuario abre un pedido para traer algo de Phoenix/Tucson/Hermosillo, otros usuarios se suman compartiendo gastos de envío. Muy común informalmente en redes sociales de Peñasco. Posible feature de v1.5 o v2.

### 6.2 Encarguitos

Alguien va a hacer un mandado y ofrece llevar/traer algo a cambio de propina. Resuelve un problema diario real. Posible feature de v2.

### 6.3 Negocios verificados de la semana

Curaduría humana (no algorítmica) que destaca 3-5 negocios chicos cada semana. Da exposición orgánica sin pago. Crea narrativa de descubrimiento. Se puede sumar al Home cuando haya tracción.

### 6.4 Gamificación adicional en Ofertas

Insignias por probar negocios nuevos, multiplicadores de puntos CardYA, mapa de calor de visitas, retos semanales. Si Ofertas necesita más engagement en el futuro, esta es la dirección — NO crear sección nueva.

### 6.5 Streaming evolucionado

Ver sección 5.4. Reconsiderable en v2 con monetización clara.

---

## 7. Principios para futuras decisiones

Cuando se proponga un feature nuevo en futuras sesiones, validar contra estos principios:

1. **¿Fomenta comercio local real?** Si solo agrega entretenimiento o engagement vacío, NO va.
2. **¿Es algo que Facebook hace mal?** Si Facebook ya lo hace bien, NO compitas ahí.
3. **¿Aprovecha datos únicos que solo AnunciaYA tiene?** (ScanYA, CardYA, geolocalización verificada). Si sí, vale más la pena.
4. **¿Genera riesgo legal o reputacional desproporcionado al valor?** Si sí, descartar o diferir hasta resolver el marco.
5. **¿Tiene costo recurrente que necesita modelo de monetización?** Si sí, definir el modelo ANTES de construir.
6. **¿Es esencial para v1 o puede esperar?** Default: esperar. Lanzar el core sólido primero.

---

## 8. Estado actual del proyecto (referencia rápida)

Ver `ROADMAP.md` y `CHANGELOG.md` para detalle.

- **Beta objetivo:** Puerto Peñasco, Sonora.
- **Stack:** Monorepo TypeScript (pnpm) — React 19 + Vite + Tailwind v4 + Zustand + TanStack Query v5 · Express 5 + Socket.io · PostgreSQL + PostGIS (Supabase) · Redis (Upstash) · Cloudflare R2.
- **Hosting:** Render (BE) · Vercel (FE) · Supabase · Upstash.
- **Migración React Query:** completa en lo construido (BS y públicas hechas). Pendientes evaluar caso por caso: ChatYA, ScanYA, Onboarding. Zustand se queda solo para UI state.
- **Cleanup visión v3:** ✅ aplicado completo el 28 Abril 2026 — Fases A (docs), B (UI), C (backend), D (BD en staging y producción). Código y BD totalmente alineados con este documento.

---

## 9. Workflow de trabajo

- **Chat en claude.ai (Cerebro):** decisiones, planeación, diseño conceptual, generación de prompts.
- **Claude Code (Ejecutor):** cambios concretos en archivos del monorepo en `E:\AnunciaYA\anunciaya\`.
- **Juan:** verifica cada cambio en producción antes de hacer commit.
- **Idioma:** todo en español (incluyendo razonamiento de Claude Code, configurado en `CLAUDE.md`).

---

## 10. Decisiones pendientes de aterrizar

Lista viva de cosas que necesitan decisión cuando lleguemos a su momento:

- [ ] Mascota de Pregúntale a Peñasco (define identidad visual de toda la app).
- [ ] Diseño visual del Home con feed de Pregúntale a Peñasco.
- [ ] Flujo y formulario de hacer una pregunta.
- [ ] Algoritmo de matching keywords → notificaciones push a negocios/usuarios.
- [ ] Toggle interno de Servicios (Ofrezco/Solicito en primera o tercera persona).
- [ ] Layout y flujos internos de Servicios (modos Ofrezco / Solicito).
- [ ] Sistema de moderación de Pregúntale a Peñasco.
- [ ] Persistencia/expiración de preguntas en el feed.

---

**Última actualización:** abril 2026 (sesión de planeación estratégica).
