# Despliegue a Producción — AnunciaYA

> Checklist vivo del paso a producción (go-live). Beta: Puerto Peñasco.
> Última actualización: **1 jul 2026**.
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
- [x] **Render (backend)** — plan **Starter $7/mes** (no duerme), env limpias, log `[PRODUCTION]`, métricas Memory/CPU sanas (~20-40% RAM en reposo)
- [x] **Config de publicidad** completa en PROD (precios + combo/duración/aviso sembrados)

## 🟡 EN ESPERA
- [ ] **AWS SES — salir de sandbox** — solicitud enviada 1-jul, esperando aprobación AWS (~24h). Dominio `anunciaya.mx` + DKIM ya verificados. Verificar con GetSendQuota (sandbox = 200/día → prod ~50,000).

## ⏳ PENDIENTE (accionable)
- [ ] **Google OAuth** — agregar dominios de prod (anunciaya.mx / admin.anunciaya.mx) a Authorized JavaScript origins + redirect URIs en Google Cloud Console. Si falta, el login con Google falla en prod.
- [x] **Cloudflare R2** — SEPARADO dev/prod (1 jul). Bucket de prod propio `anunciaya-prod` (CORS con orígenes prod + Public URL). Render apunta a él (`R2_BUCKET_NAME=anunciaya-prod`, `R2_PUBLIC_URL=pub-84dd…r2.dev`); dev queda con `anunciaya-tickets`. Token de cuenta validado (acceso OK). R2 Paid $0/mo + uso (egress gratis). Pendientes no urgentes: (a) ajustar el reconcile para limpiar el bucket prod (hoy solo dev se auto-limpia, seguro); (b) reset de datos de prueba de prod antes del lanzamiento. Dominio propio del bucket = mejora futura opcional (el pub-…r2.dev basta para la beta; el logo de correos ya usa BRAND_ASSETS_URL de Vercel).
- [ ] **DMARC** — TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:no-responder@anunciaya.mx`
- [ ] **Páginas legales** — crear Términos de servicio + Aviso de Privacidad (obligatorio LFPDPPP en MX) y enlazarlos en web + Stripe (Public business info)
- [x] **Limpiar Cloudinary** (1 jul) — legado 100% muerto (sin referencias en código; ya migrado a R2). Quitadas las vars huérfanas: `apps/web/.env` (VITE_CLOUDINARY_*), `apps/api/.env` (CLOUDINARY_*), Vercel web (VITE_CLOUDINARY_CLOUD_NAME/UPLOAD_PRESET) y confirmado Render sin CLOUDINARY_*. Nota: el frontend NO tiene vars de R2 a propósito — usa presigned URLs firmadas por el backend (las llaves R2 viven solo en Render). Opcional pendiente: eliminar/rotar la cuenta Cloudinary si sigue activa (el API secret estaba en el .env).
- [ ] **Revisar secretos** — confirmar `JWT_SECRET` / `ADMIN_SECRET` en Render fuertes y distintos de dev
- [x] **Upstash Redis** — base de prod propia `anunciaya-redis-prod` (Fixed $10/mes, Oregon us-west-2, TLS, eviction ON, auto-upgrade ON), separada de dev (`emerging-woodcock`). `REDIS_URL` de prod puesta en Render. Fix de código: saneamiento defensivo de `REDIS_URL` en `apps/api/src/db/redis.ts` (comillas/espacios/esquema faltante + `tls:{}` explícito) tras `ENOENT`/`//default:` por pegado. Verificado: `✅ Redis conectado correctamente` (commit `ad49b27`).

## 🔧 MENORES / OPCIONALES
- [ ] Tarjeta OXXO física → completar en datos de depósito del Panel
- [ ] Reembolsar los $99 del humo de publicidad (Stripe → Payments → Refund)
- [ ] Vercel → confirmar dominios finales (web + admin ya funcionan)

## 🚀 VALIDACIÓN FINAL (antes de abrir la beta)
- [ ] Humo E2E en prod: registro→correo de verificación (requiere SES aprobado), login Google, alta de negocio, chat de producto, cobro de membresía real, ScanYA, subida de imagen
- [ ] Seguir revisando logs de PROD por bugs latentes

---

**Escalar Render:** subir a Standard ($25, 2 GB) cuando en Metrics la RAM viva >80% o haya reinicios por OOM. También vigilar límites de Supabase (pooler) y Upstash al crecer.
