# 🗺️ AnunciaYA v3.0 - Roadmap

> **Última actualización:** 30 Enero 2026  
> **Progreso global:** 81% completado  
> **Fase actual:** 5.5 ScanYA (87.5%)

---

## 📊 Estado Global

| Bloque | Progreso | Tiempo Estimado |
|--------|----------|-----------------|
| **Fundamentos** (Fases 1-4) | ✅ 100% | - |
| **Backend + Negocios** (5.0-5.3) | ✅ 100% | - |
| **Business Studio** (5.4) | ⏳ 27% (4/15 módulos) | ~24 días |
| **ScanYA + PWA** (5.5) | ✅ 87.5% | Config pendiente |
| **Sistema Lealtad** (5.6-5.11) | ⏳ 0% | ~2-3 semanas |
| **Secciones Públicas + BS** (6.x) | ⏳ 0% | ~3-4 semanas |
| **Lanzamiento Beta** (7.x) | ⏳ 50% | ~1-2 semanas |

---

## 🎯 Q1-Q2 2026 Objetivos

**Q1 (Enero-Marzo):**
- [x] Sistema ScanYA completo
- [x] Migración cloud $0/mes
- [x] Business Studio Base (4/15 módulos)
- [ ] Business Studio 80% completo (12/15 módulos)
- [ ] Sistema CardYA completo
- [ ] ChatYA base operativo

**Q2 (Abril-Junio):**
- [ ] Business Studio 100% (15/15 módulos)
- [ ] Todas las secciones públicas activas
- [ ] Panel Admin funcional
- [ ] Beta 50 negocios exitosa
- [ ] Lanzamiento público
- [ ] 100+ negocios registrados

---

## 🚀 Próximos Sprints

### Sprint 1: BS > 5.6.- Puntos Config (~3 días) ⚠️ CRÍTICO

**Objetivo:** Permitir a dueños configurar sistema de puntos sin tocar código

**Features Core:**
- Configurar valor del punto (1 punto = $X pesos)
- Activar/desactivar niveles CardYA
- Configurar multiplicadores (Bronce/Plata/Oro)
- Simulador acumulación puntos
- Dashboard estadísticas puntos otorgados
- Modal QR instalación ScanYA para empleados

**Criterios de Éxito:**
- [ ] Configuración funciona sin código
- [ ] Simulador calcula correctamente
- [ ] Estadísticas visibles en tiempo real

**Razón Crítica:** Actualmente dueños NO pueden configurar sin tocar código

---

### Sprint 2: 5.7.- CardYA - Tarjeta de Lealtad Digital (~5 días)

**Objetivo:** Usuario puede ver sus puntos y generar QR para compras

**Features Core:**
- QR dinámico personal (expira 2 min)
- Ver puntos acumulados por negocio
- Sistema niveles: Bronce/Plata/Oro
- Historial de transacciones puntos
- PWA instalable (iOS/Android/Desktop)
- Modo offline (Service Worker)

**Criterios de Éxito:**
- [ ] QR genera y expira correctamente
- [ ] Puntos separados por negocio
- [ ] Nivel global calcula bien
- [ ] PWA instalable 3 plataformas

**Notas:** Puntos específicos por negocio, nivel global suma de todos

---

### Sprint 3: 5.8.- Clientes + Transacciones BS (~3 días)

**Objetivo:** Dueños ven su base de clientes y transacciones

**Features Core:**
- Lista clientes que han comprado
- Historial completo transacciones
- Filtros: fecha, sucursal, nivel CardYA
- Exportar reportes CSV
- Detalle por cliente (visitas, puntos, nivel)

**Criterios de Éxito:**
- [ ] Base de clientes visible
- [ ] Filtros operativos
- [ ] Export CSV funcional

---

### Sprint 4: 5.9.- Opiniones/Reseñas BS (~3 días)

**Objetivo:** Gestionar reseñas de clientes desde BS y ScanYA

**Features Core:**
- Ver reseñas con calificación ⭐ 1-5
- Responder desde BS (web) y ScanYA (móvil)
- Dashboard métricas (promedio, total)
- Templates respuesta pre-escritos
- Validar compra antes de reseñar
- Badge "Compra verificada"

**Criterios de Éxito:**
- [ ] Validación compras operativa
- [ ] Respuestas desde ambos sistemas
- [ ] Templates funcionan

**Dependencia:** Requiere tabla `transacciones` de ScanYA

---

### Sprint 5: 5.10.- ChatYA Base (~4 días)

**Objetivo:** Sistema de mensajería tiempo real

**Features Core:**
- Mensajería tiempo real (Socket.io + MongoDB)
- Estados: enviado → entregado → leído
- Upload imágenes optimista (Cloudinary)
- Identidad por modo (Personal/Comercial)
- Contexto por sección (Negocios/MarketPlace/Ofertas)
- Lista conversaciones + chats fijados

**Criterios de Éxito:**
- [ ] Mensajes tiempo real operativos
- [ ] Upload imágenes funciona
- [ ] Identidad cambia según modo

**Nota:** Prerequisito para MarketPlace, Empleos, Dinámicas

---

### Sprint 6: 5.11.- Cupones Sistema (~3 días)

**Objetivo:** Sistema de cupones temporales con validación

**Features Core:**
- CRUD cupones en BS (%, $, 2x1)
- Vista pública `/p/cupon/:codigo`
- Validación en ScanYA con QR
- Cuponera usuario `/mis-cupones`
- Notificaciones expiración
- Filtros: Vigentes/Usados/Expirados

**Criterios de Éxito:**
- [ ] CRUD operativo
- [ ] Validación ScanYA funcional
- [ ] Notificaciones disparan

**Diferencia vs Ofertas:** Cupones son temporales, 1 uso, personales

---

## 📅 Backlog Priorizado

### Business Studio - Módulos Pendientes (11/15)

**Completados (4/15):**
- ✅ Dashboard
- ✅ Mi Perfil  
- ✅ Catálogo
- ✅ Ofertas

**Pendientes (11/15):**

| # | Módulo | Tiempo Estimado | Depende de | Descripción |
|---|--------|-----------------|------------|-------------|
| 2 | **Transacciones** | ~1 día | ScanYA ✅ | Historial completo de ventas con filtros |
| 3 | **Clientes** | ~2 días | ScanYA ✅ | Base de clientes, visitas, puntos, nivel |
| 4 | **Opiniones** | ~3 días | Transacciones + Clientes | Ver y responder reseñas desde BS y ScanYA |
| 5 | **Alertas** | ~1 día | - | Notificaciones configurables (ventas, cupones) |
| 8 | **Cupones** | ~3 días | ScanYA ✅ | CRUD cupones, validación, cuponera usuario |
| 9 | **Puntos** | ~3 días | CardYA | Configuración valores, simulador, estadísticas |
| 10 | **Rifas** | ~2 días | Dinámicas | Gestión rifas del negocio |
| 11 | **Empleados** | ~2 días | ScanYA ✅ | Gestión empleados, Nick+PIN, permisos |
| 12 | **Vacantes** | ~2 días | Empleos | Publicar/gestionar ofertas de empleo |
| 13 | **Reportes** | ~3 días | ScanYA ✅ | Ventas, productos top, horarios pico, export |
| 14 | **Sucursales** | ~2 días | - | Gestión multi-sucursal completa |

**Total estimado:** ~24 días (distribuidos en múltiples sprints)

---

### Secciones Públicas (Fase 6.0-6.3)

**6.0 Ofertas Públicas** (~2 días)
- Feed público con geolocalización
- Ya existe backend, solo falta vista pública

**6.1 MarketPlace** (~4 días)
- Compra-venta entre usuarios (modo Personal)
- Requiere ChatYA completado

**6.2 Dinámicas/Rifas** (~4 días)
- 3 tipos: con puntos, con dinero, offline
- Requiere ChatYA + Sistema Puntos

**6.3 Empleos** (~3 días)
- Bidireccional: Ofertas empleo + Ofertas servicio
- Requiere ChatYA completado

---

### Panel Admin (Fase 6.7)

**Tiempo estimado:** ~2 semanas  
**Prioridad:** MEDIA-BAJA (post-lanzamiento)

**Funcionalidad:**
- Sistema de vendedores (niveles 1-5)
- Dashboard métricas globales
- Gestión negocios y usuarios
- Suscripciones y pagos (Stripe)
- Configuración dinámica de plataforma
- Reportes financieros

**Nota:** Se implementará después del lanzamiento beta

---

## 🚀 Fase 7: Lanzamiento

### 7.1 Pre-Lanzamiento (~5 días)

**Testing:**
- [ ] Testing E2E flujos completos
- [ ] Performance y optimización
- [ ] SEO y metadatos
- [ ] Analytics (Google/Mixpanel)
- [ ] Sentry (error tracking)

**Infraestructura:**
- [x] Migración a producción ✅
- [x] Stack $0/mes operativo ✅
- [ ] Stripe modo LIVE
- [ ] Dominio personalizado + SSL
- [ ] AWS SES salir de sandbox
- [ ] Backups automáticos

---

### 7.2 Beta Privada (~3 semanas)

**Objetivo:** 50 negocios pilotos

**Semana 1: Onboarding (15 negocios)**
- Embajadores registran pilotos
- Trial 7 días modo comercial gratis
- Capacitación presencial/remota
- Grupo WhatsApp soporte

**Semana 2: Expansión (25 negocios)**
- Segundo grupo invitado
- Feedback sesiones grupales
- Iteración bugs críticos
- Documentación FAQ

**Semana 3: Escala (10 negocios finales)**
- Completar cuota 50 negocios
- Testing stress múltiples usuarios
- Optimizaciones performance
- Preparación lanzamiento público

**Métricas de Éxito:**
- [ ] 80% completan onboarding
- [ ] 60% usan ScanYA activamente
- [ ] <5% abandono primera semana
- [ ] 90% satisfacción (NPS >50)
- [ ] <10 bugs críticos reportados

---

### 7.3 Lanzamiento Público (Abril-Mayo 2026)

**Pre-requisitos:**
- [ ] Beta completada exitosamente
- [ ] Todas las fases 5-6 al 100%
- [ ] Panel Admin operativo
- [ ] Documentación completa

**Estrategia:**
- Anuncio redes sociales
- Landing page SEO
- Campaña Google Ads
- Influencers locales
- Eventos presenciales
- Programa referidos

---

## ⏱️ Estimación Tiempo Total

| Fase | Tiempo Estimado |
|------|-----------------|
| Sprint 1-6 (Sistema Lealtad + Chat) | ~20-25 días |
| Secciones Públicas (6.0-6.3) | ~10-13 días |
| BS Módulos Pendientes (11/15) | ~24 días |
| Pre-lanzamiento (7.1) | ~5 días |
| Beta (7.2) | ~21 días |
| **TOTAL OPTIMISTA** | **~12-14 semanas** |
| **TOTAL REALISTA** | **~14-16 semanas** |

**Fecha lanzamiento público proyectada:** Abril-Mayo 2026

---

## 📝 Dependencias Críticas

**ChatYA es bloqueante para:**
- MarketPlace (contactar vendedor)
- Empleos (aplicar/contratar)
- Dinámicas (organizar rifas)

**ScanYA es bloqueante para:**
- Opiniones (validar compras)
- Clientes + Transacciones (datos)
- Reportes (métricas)

---

## 🔄 Flexibilidad del Roadmap

Este roadmap es **adaptable** y se ajustará según:
- Feedback beta testers
- Demanda del mercado
- Recursos disponibles
- Bugs críticos emergentes

Los detalles técnicos de cada sprint se definen **durante el desarrollo**, no pre-desarrollo.

---

## 📅 Próxima Revisión

**Fecha:** 15 Febrero 2026  
**Alcance:** Re-evaluar después de Sprint 1-2

---

**Fin del Roadmap**
