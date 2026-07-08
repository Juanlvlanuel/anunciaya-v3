# Despliegue a Producción — AnunciaYA

> Checklist vivo del paso a producción (go-live). Beta: Puerto Peñasco.
> Última actualización: **8 jul 2026**.
>
> **Método clave:** verificar el estado real con las credenciales del `.env` (BD, SES, Stripe se pueden sondear en solo lectura) en vez de asumir. Los logs del backend en prod (Panel → Mantenimiento → Logs, o Render → Logs) son el mejor detector de bugs latentes.
>
> **Config por ambiente (importante):** todo vive por ambiente y son independientes:
> - **DEV** = Panel local + BD Supabase dev + Stripe test → pruebas
> - **PROD** = admin.anunciaya.mx + BD Supabase prod + Stripe live → real
> - La config (precios, datos de cobro, etc.) se guarda en la **BD** por ambiente: el Panel local escribe en DEV, el Panel de prod escribe en PROD. Lo no editado usa el default del código (etiqueta "valor por defecto").

---

## ✅ CERRADO (1 jul 2026)

- [x] **Base de datos DEV↔PROD alineada**
  - 3 columnas `NOT NULL` que contradecían el código → `DROP NOT NULL` (recompensas.stock, vouchers_canje.sucursal_id, puntos_configuracion.dias_expiracion_puntos)
  - CHECK `chat_conv_contexto_tipo_check` desactualizado → recreado (agregado `articulo_negocio`, quitado `vendedor_marketplace`)
  - 2 bugs de columnas usadas por SQL crudo (destapados por logs de prod): `alerta_lecturas.ocultada_at` (era `resuelta_at`) y `alertas_seguridad.resuelta_por_usuario_id` (no existía) → RENAME + ADD COLUMN/FK/índice
  - Lección: auditar contra el **código real (incl. SQL crudo)**, no solo el ORM (`schema.ts`)
- [x] **Stripe Live**
  - Cuenta activada (persona física, Santander MXN, statement `ANUNCIAYA`, SaaS, Tax OFF por IVA incluido 8% frontera, 2FA ON)
  - Keys live en Render (`sk_live`/`pk_live`) + `pk_live` en Vercel
  - Webhook Live `AnunciaYA API - Producción` → `/api/pagos/webhook` (6 eventos) — sirve para membresía **y** publicidad (distingue por `metadata.tipo`)
  - Precio: mensual **$864** (`price_1ToVoz…`), anual **$8,640** (`price_1ToVpo…`); producto Live `prod_TcFY6kI9RIuCf1`
  - Customer Portal Live: Métodos de pago + Facturas ON; **Cancelaciones OFF** (se cancela por el botón propio de la app, no por el portal)
  - Datos de depósito (pago manual) configurados en PROD
  - **Humo real validado end-to-end:** compra de anuncio $99 → webhook → anuncio activo + recibo (confirmado por UI, BD y logs)
  - **Payout confirmado (8-jul):** la transferencia del humo llegó físicamente al banco — **91.39 MXN** ($99 − ~$7.61 comisión Stripe MX) a Santander …2861, estado "Pagado". Cerró el ciclo completo cobro→webhook→recibo→payout. La retención de 7 días es solo de la 1ª transferencia (cuenta nueva); las siguientes serán según el calendario "cobrar diariamente".
- [x] **Render (backend)** — plan **Starter $7/mes** (no duerme), env limpias, log `[PRODUCTION]`, métricas Memory/CPU sanas (~20-40% RAM en reposo)
- [x] **Config de publicidad** completa en PROD (precios + combo/duración/aviso sembrados)

## ✅ CERRADO (8 jul 2026)

- [x] **AWS SES — salir de sandbox** ✅ **APROBADO 8-jul** (caso 178293532700740, región us-east-2). Correo de AWS: *"Your new sending quota is 50,000 messages per day. Your maximum send rate is now 14 messages per second. We have also moved your account out of the Amazon SES sandbox."* Efecto inmediato en us-east-2. Dominio `anunciaya.mx` + DKIM ya verificados. **Este era el último bloqueador del go-live.**
  - **CAUSA RAÍZ del atraso (1→8 jul):** NO era AWS lento — la cuenta estaba atorada en verificación porque la tarjeta …3923 falló la autorización de verificación (correo "AWS Account Alert" del 1-jul: *"We received an error while confirming the payment method"*; banner "Método de pago no válido" + tarjeta "Sin verificar" en billing). Sin cuenta verificada, AWS no procesa production-access de SES ni deja abrir CloudShell.
  - **Solución (6-jul):** re-guardar la tarjeta en billing → botón "Verificar" → AWS reintentó y la …3923 quedó VERIFICADA (desapareció "Sin verificar" y el banner). Divisa ya en MXN (tarjeta mexicana = compatible; el aviso de "usar tarjeta internacional para USD" es genérico). Cadena: tarjeta verificada 6-jul → cuenta activada → SES aprobado 8-jul. El follow-up del 6-jul ayudó a empujar el caso.
  - **Lección:** si SES/CloudShell/cualquier servicio se "atora" en una cuenta nueva o recién convertida a estándar, revisar primero **billing → payment methods** por un método "Sin verificar" o correos "Account Alert" — la verificación de cuenta bloquea todo aguas abajo.

## ⏳ PENDIENTE (accionable)
- [x] **Google OAuth** ✅ (Juan) — login/registro con Google ya funciona en prod (dominios de prod en Authorized JavaScript origins; el flujo es popup auth-code → solo requiere *origins*, NO redirect URIs; consent screen publicada). Gratis (OAuth básico openid/email/profile).
- [x] **Cloudflare R2** — SEPARADO dev/prod (1 jul). Bucket de prod propio `anunciaya-prod` (CORS con orígenes prod + Public URL). Render apunta a él (`R2_BUCKET_NAME=anunciaya-prod`, `R2_PUBLIC_URL=pub-84dd…r2.dev`); dev queda con `anunciaya-tickets`. Token de cuenta validado (acceso OK). R2 Paid $0/mo + uso (egress gratis). Pendientes no urgentes: (a) ajustar el reconcile para limpiar el bucket prod (hoy solo dev se auto-limpia, seguro); (b) reset de datos de prueba de prod antes del lanzamiento. Dominio propio del bucket = mejora futura opcional (el pub-…r2.dev basta para la beta; el logo de correos ya usa BRAND_ASSETS_URL de Vercel).
- [x] **DMARC** (2 jul) — TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:admin@anunciaya.mx` en Namecheap (DNS de anunciaya.mx). Verificado propagado (autoritativo + Google DNS). `p=none` = solo monitorea. Nota: SPF solo cubre Migadu, pero DMARC pasa vía DKIM de SES (alineado). Opcional futuro: agregar `include:amazonses.com` al SPF y endurecer a `p=quarantine`.
- [x] **Páginas legales** (2 jul) — Aviso de Privacidad (conforme LFPDPPP art. 16) + Términos y Condiciones (LFPC), aprobados por Juan. Borradores en `docs/legal/`. Páginas web `/privacidad` y `/terminos` (`apps/web/src/pages/public/`, LayoutPublico + card), enlazadas en el footer público y el checkbox de registro (que ya apuntaba ahí). Responsable: Juan Manuel Valenzuela Jabalera, domicilio Av. Sinaloa 27 Col. Centro CP 83550 Puerto Peñasco; canal ARCO/contacto admin@anunciaya.mx. Desplegadas en prod (Vercel, verificado HTTP 200) y **enlazadas en Stripe** (Live → Checkout → Políticas de la tienda: URLs de condiciones/privacidad guardadas en "Datos públicos" + toggle "Políticas legales" ON + "Mostrar aceptación de condiciones" ON). Pendiente OPCIONAL: cotejar el aviso con el Generador del INAI. No es asesoría legal formal — revisión de abogado ideal al crecer.
- [x] **Limpiar Cloudinary** (1 jul) — legado 100% muerto (sin referencias en código; ya migrado a R2). Quitadas las vars huérfanas: `apps/web/.env` (VITE_CLOUDINARY_*), `apps/api/.env` (CLOUDINARY_*), Vercel web (VITE_CLOUDINARY_CLOUD_NAME/UPLOAD_PRESET) y confirmado Render sin CLOUDINARY_*. Nota: el frontend NO tiene vars de R2 a propósito — usa presigned URLs firmadas por el backend (las llaves R2 viven solo en Render). Opcional pendiente: eliminar/rotar la cuenta Cloudinary si sigue activa (el API secret estaba en el .env).
- [x] **Secretos rotados** (2 jul) — `JWT_SECRET` y `JWT_REFRESH_SECRET` en Render regenerados aleatorios (48 bytes base64url) y distintos de dev (los de dev eran predecibles, empezaban con `anun…`). Verificado: re-login en el Panel de prod OK. `ADMIN_SECRET` NO se configura a propósito (gate del Panel es dual x-admin-secret/JWT; sin el secreto, el camino legacy queda cerrado = más seguro; el Panel entra por JWT). `.env` de dev sin tocar (debe quedar distinto de prod).
- [x] **Upstash Redis** — base de prod propia `anunciaya-redis-prod` (Fixed $10/mes, Oregon us-west-2, TLS, eviction ON, auto-upgrade ON), separada de dev (`emerging-woodcock`). `REDIS_URL` de prod puesta en Render. Fix de código: saneamiento defensivo de `REDIS_URL` en `apps/api/src/db/redis.ts` (comillas/espacios/esquema faltante + `tls:{}` explícito) tras `ENOENT`/`//default:` por pegado. Verificado: `✅ Redis conectado correctamente` (commit `ad49b27`).

## 🔧 MENORES / OPCIONALES
- [ ] Tarjeta OXXO física → completar en datos de depósito del Panel
- [ ] Reembolsar los $99 del humo de publicidad (Stripe → Payments → Refund)
- [x] Vercel → dominios finales OK (`anunciaya.mx` + `admin.anunciaya.mx` con SSL, funcionando)

## 🚀 VALIDACIÓN FINAL (antes de abrir la beta)
- [ ] Humo E2E en prod: registro→correo de verificación (requiere SES aprobado), login Google, alta de negocio, chat de producto, cobro de membresía real, ScanYA, subida de imagen
- [ ] Seguir revisando logs de PROD por bugs latentes

---

**Escalar Render:** subir a Standard ($25, 2 GB) cuando en Metrics la RAM viva >80% o haya reinicios por OOM. También vigilar límites de Supabase (pooler) y Upstash al crecer.
