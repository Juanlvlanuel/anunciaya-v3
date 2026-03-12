# 📋 AnunciaYA v3.0 - Visión General y Propuesta de Valor

**Versión:** 3.0 (Migración y Reorganización)  
**Fecha de Actualización:** 18 Diciembre 2024  
**Desarrollador:** Juan Manuel Valenzuela  
**Ubicación:** Puerto Peñasco, Sonora, México

---

## 1. ¿Qué es AnunciaYA?

AnunciaYA es una **super-app de comercio local para México** que funciona como un sistema de lealtad unificado para negocios locales. Un ecosistema completo que conecta comercios con su comunidad, permitiendo a los usuarios ganar recompensas por comprar en negocios de su ciudad.

### Analogía Simple

> **"Es como OXXO Premia, pero para TODOS los negocios locales de tu ciudad."**

Cada negocio tiene su propio sistema de puntos, pero todo se maneja desde una sola aplicación.

---

## 2. Propuesta de Valor Central

### Para Usuarios (Consumidores)

```
"Tus compras ahora valen más"
```

| Beneficio | Descripción |
|-----------|-------------|
| 💳 Una sola tarjeta | QR dinámico único para todos los negocios |
| 🎁 Gana recompensas | Puntos por cada compra en negocios participantes |
| 🎰 Participa en sorteos | Dinámicas y rifas de negocios locales |
| 📍 Descubre tu ciudad | Encuentra negocios, ofertas y servicios cerca de ti |
| 💬 Comunicación directa | Chat integrado con negocios |

### Para Comerciantes

```
"Fideliza clientes sin complicaciones"
```

| Beneficio | Descripción |
|-----------|-------------|
| 📊 Business Studio | Dashboard completo para gestionar tu negocio |
| 🎯 Sistema de puntos | Configura tu propio programa de lealtad |
| 📢 Promociones | Publica ofertas geolocalizadas |
| 👥 Conoce a tus clientes | Métricas y análisis de comportamiento |
| 💼 Bolsa de trabajo | Publica vacantes y encuentra empleados |

---

## 3. Estructura de la Aplicación

### 3.1 Secciones Públicas (Requieren Login)

> ⚠️ **IMPORTANTE:** Login obligatorio para acceder a CUALQUIER sección. Solo Landing, Login y Registro son públicos.

#### Navegación Principal (5 Tabs)

| # | Sección | Ruta | Icono | Descripción | Quién Publica |
|---|---------|------|-------|-------------|---------------|
| 1 | **Negocios** | `/negocios` | Store | Directorio de comercio local con geolocalización | Solo Comercial |
| 2 | **MarketPlace** | `/marketplace` | ShoppingCart | Compra-venta entre usuarios | Solo Personal |
| 3 | **Ofertas** | `/ofertas` | Tag | Cupones y promociones geolocalizadas | Comercial (Business Studio) |
| 4 | **Dinámicas** | `/dinamicas` | Gift | Sorteos, rifas y concursos | Todos |
| 5 | **Empleos** | `/empleos` | Briefcase | Vacantes y servicios profesionales | Personal (servicios) / Comercial (vacantes) |

#### Secciones Secundarias (Acceso desde menú)

| Sección | Ruta | Descripción |
|---------|------|-------------|
| **CardYA** | `/card` | Tarjeta de lealtad digital con QR dinámico |
| **ChatYA** | Overlay | Mensajería integrada (botón separado, no tiene ruta) |
| **Mi Perfil** | `/perfil` | Datos, publicaciones, configuración |

#### Herramientas Comerciales (Solo Cuentas Comerciales)

| Herramienta | Ruta | Descripción |
|-------------|------|-------------|
| **ScanYA** | `/scan` | Escanear QR de clientes, registrar ventas |
| **Business Studio** | `/business` | Dashboard completo del negocio |

---

## 4. Tipos de Cuenta

### 4.1 Cuenta Personal

Para consumidores que quieren:
- Acumular puntos en negocios
- Publicar en MarketPlace (vender cosas usadas)
- Participar en dinámicas
- Ofrecer servicios profesionales
- Chatear con negocios

### 4.2 Cuenta Comercial

Para dueños de negocios que quieren:
- Aparecer en el directorio de Negocios
- Dar puntos a sus clientes
- Crear ofertas y promociones
- Organizar sorteos
- Publicar vacantes
- Gestionar su negocio desde Business Studio

### Matriz de Permisos

| Acción | Personal | Comercial |
|--------|----------|-----------|
| Ver todas las secciones | ✅ | ✅ |
| Publicar en Negocios | ❌ | ✅ |
| Publicar en MarketPlace | ✅ | ❌ |
| Crear Ofertas | ❌ | ✅ |
| Crear Dinámicas | ✅ | ✅ |
| Acumular puntos (CardYA) | ✅ | ❌ |
| Dar puntos (ScanYA) | ❌ | ✅ |
| Acceso a Business Studio | ❌ | ✅ |
| ChatYA - Mensajería | ✅ | ✅ |
| Bolsa de Trabajo - Publicar vacantes | ❌ | ✅ |
| Bolsa de Trabajo - Ofrecer servicios | ✅ | ❌ |
| Bolsa de Trabajo - Aplicar a vacantes | ✅ | ❌ |

---

## 5. Sistema de Puntos

### 5.1 Decisiones Clave

| Aspecto | Decisión | Razón |
|---------|----------|-------|
| ¿Puntos unificados o por negocio? | **Por Negocio (Cerrado)** | Evita conflictos de pago entre negocios |
| ¿Quién define recompensas? | **El comerciante** | Máxima flexibilidad |
| ¿Dónde se canjean? | **Físico + App** | Canjear en negocio o desde app |
| ¿Puntos = dinero? | **NO** | Solo se canjean por recompensas |
| ¿Puntos transferibles? | **Futuro (Dormido)** | Estructura preparada para "Red YA" |
| ¿Los puntos expiran? | **Sí, configurable** | Cada negocio define días de expiración |

### 5.2 Flujo de Puntos

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE PUNTOS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. COMPRA                                                  │
│     Cliente compra en negocio físico                        │
│     ↓                                                       │
│  2. ESCANEO                                                 │
│     Empleado escanea QR del cliente con ScanYA              │
│     ↓                                                       │
│  3. REGISTRO                                                │
│     Se registra monto + evidencia (foto ticket)             │
│     ↓                                                       │
│  4. CONFIRMACIÓN                                            │
│     Cliente confirma en su app (timeout 5 min)              │
│     ↓                                                       │
│  5. ACREDITACIÓN                                            │
│     Puntos se suman a billetera del cliente                 │
│     ↓                                                       │
│  6. CANJE                                                   │
│     Cliente canjea puntos por recompensas                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Tablas Involucradas

| Tabla | Propósito |
|-------|-----------|
| `puntos_configuracion` | Configuración por negocio (ratio, expiración) |
| `puntos_billetera` | Saldo de puntos por usuario en cada negocio |
| `recompensas` | Catálogo de premios de cada negocio |
| `puntos_transacciones` | Registro de compras |
| `transacciones_evidencia` | Fotos de tickets |
| `vouchers_canje` | Cupones generados al canjear |
| `alertas_seguridad` | Notificaciones de actividad sospechosa |

---

## 6. Planes y Membresías

### 6.1 Para Usuarios (Cuenta Personal)

| Plan | Costo | Características |
|------|-------|-----------------|
| **Gratis** | $0 | Publicaciones ilimitadas, chat ilimitado, acceso a todas las zonas |
| **PRO** | $99/mes | Todo lo de Gratis + **preferencia visual** en publicaciones |

> **Nota:** Ambos planes tienen los mismos beneficios base. La cuenta PRO destaca visualmente las publicaciones del usuario para mayor visibilidad.

### 6.2 Para Comerciantes (Cuenta Comercial)

| Plan | Costo | Características |
|------|-------|-----------------|
| **Plan Comercial** | $449/mes (IVA incluido) | Acceso completo a Business Studio, ScanYA, sistema de puntos, ofertas, dinámicas, bolsa de trabajo |

> **Nota:** El nombre del plan comercial está pendiente de definir.

---

## 7. Modelo de Negocio

### 7.1 Fuentes de Ingreso

| Fuente | Descripción |
|--------|-------------|
| **Suscripciones Comerciales** | Plan mensual $449 para comerciantes |
| **Cuenta PRO (Usuarios)** | $99/mes para preferencia visual |
| **Destacar en Marketplace** | Usuarios pagan por destacar publicaciones ($19-$79) |
| **Paquetes de Publicidad** | Negocios pagan por mayor visibilidad (precios por definir) |

### 7.2 Destacar en Marketplace (Usuarios)

| Opción | Duración | Precio | Beneficio |
|--------|----------|--------|-----------|
| **Express** | 24 horas | $19 | Aparece primero en su categoría |
| **Semanal** | 7 días | $49 | Primero + badge "Destacado" |
| **Premium** | 15 días | $79 | Primero + badge + aparece en inicio |

### 7.3 Paquetes de Publicidad (Negocios)

> ⚠️ **Pendiente de definir:** Precios y beneficios exactos por acordar.

| Paquete | Precio tentativo | Beneficios propuestos |
|---------|------------------|----------------------|
| **Impulso** | ~$499/mes | Banner rotativo, destacado en búsquedas |
| **Crecimiento** | ~$999/mes | 2 banners fijos, destacado, push notifications |
| **Dominante** | ~$1,999/mes | Todos los espacios, prioridad total, más push notifications |

### 7.4 Sistema de Embajadores

Personas que reclutan negocios y ganan comisión:

| Concepto | Porcentaje |
|----------|------------|
| **Comisión inicial** (por registro) | 30% |
| **Comisión recurrente** (mensual) | 15% |

> El embajador gana mientras el negocio que reclutó permanezca activo.

---

## 8. Decisiones de Negocio

### 8.1 Catálogo de Negocios

| Decisión | Opción Elegida |
|----------|----------------|
| ¿Los negocios tienen catálogo? | Sí, básico informativo |
| ¿Qué incluye? | Nombre, descripción, precio (solo información) |
| ¿Se puede comprar directo? | No, solo informativo |
| ¿Sistema de citas? | Futuro (Post-MVP) |

### 8.2 Gestión de Empleados

| Decisión | Opción Elegida |
|----------|----------------|
| ¿Cómo se gestionan empleados? | Registrados por el dueño |
| ¿Dónde se registran? | Business Studio → "Mis Empleados" |
| ¿Cada empleado tiene su login? | Sí, acceso individual a ScanYA |
| ¿El dueño puede ver transacciones por empleado? | Sí, en reportes y alertas |

---

## 9. Geolocalización

### 8.1 Estrategia Global

**Toda la app es sensible a la ubicación del usuario.**

| Sección | Comportamiento |
|---------|----------------|
| **Negocios** | Mostrar negocios cercanos primero |
| **MarketPlace** | Publicaciones de usuarios en tu zona |
| **Ofertas** | Cupones de negocios cercanos |
| **Dinámicas** | Sorteos locales primero, luego nacionales |
| **Bolsa de Trabajo** | Vacantes y servicios en tu zona |

### 8.2 Tecnología

- **Backend:** PostgreSQL + PostGIS para cálculos geográficos
- **Frontend:** Geolocation API con fallback GPS → IP/WiFi
- **Almacenamiento:** Coordenadas en Zustand + localStorage

---

## 10. Seguridad y Privacidad

### 9.1 Autenticación

| Método | Estado |
|--------|--------|
| Email + Contraseña | ✅ Implementado |
| Google OAuth | ✅ Implementado |
| 2FA (TOTP) | ✅ Implementado |
| Códigos de respaldo | ✅ Implementado |

### 9.2 Protección de Datos

| Medida | Implementación |
|--------|----------------|
| Contraseñas | bcrypt con salt rounds = 12 |
| Tokens JWT | Access (15 min) + Refresh (7 días) |
| Sesiones | Multi-dispositivo en Redis |
| Comunicación | HTTPS en producción |

---

## 11. Visión a Futuro

### Fase Actual (v3.0)
- Sistema de puntos por negocio (cerrado)
- App web responsiva

### Futuro Cercano
- App móvil nativa (React Native o Flutter)
- Pagos in-app
- Delivery/Pedidos

### Futuro Lejano
- "Red YA" - Puntos transferibles entre negocios aliados
- Expansión a otras ciudades de México
- Marketplace con comisiones

---

## 12. Diferenciadores

| vs Competencia | AnunciaYA |
|----------------|-----------|
| Apps de un solo negocio | Una app para todos los negocios |
| Groupon/Cupones | Sistema de lealtad + comunidad |
| Facebook Marketplace | Enfoque local + sistema de puntos |
| Google My Business | Interacción bidireccional + fidelización |

---

## 13. Métricas de Éxito

### Para la Plataforma
- Número de negocios registrados
- Usuarios activos mensuales
- Transacciones de puntos
- Retención de comerciantes

### Para Comerciantes
- Clientes recurrentes
- Puntos otorgados/canjeados
- Engagement con ofertas
- ROI del programa de lealtad

---

*Documento actualizado: 18 Diciembre 2024*
*Proyecto: AnunciaYA v3.0*
