# 📚 AnunciaYA — Documentación Histórica (Legacy)

> ⚠️ **AVISO: Esta carpeta contiene documentos de fases tempranas del proyecto** (Diciembre 2024 – principios 2026). Los documentos aquí reflejan **decisiones, estructura, stack y secciones que pueden NO corresponder a la realidad actual del proyecto**.
>
> Ejemplos de desfase conocido respecto a la **visión v3 de abril 2026**:
> - Listan secciones públicas que ya no existen (Dinámicas, Empleos como sección separada, Live Sale, Pulse local).
> - Mencionan stack que cambió: Cloudinary (descontinuado), MongoDB para chat (migrado a PostgreSQL), Railway (migrado a Render).
> - Describen estructura de schemas que se consolidó (8 schemas → 1 schema público).
>
> **Para entender el estado actual del proyecto, consultar:**
> - `docs/VISION_ESTRATEGICA_AnunciaYA.md` — norte estratégico, secciones definitivas, features descartados
> - `docs/ROADMAP.md` — plan y progreso vigentes
> - `docs/arquitectura/*.md` — referencia técnica por módulo (vigente)
> - `CLAUDE.md` — convenciones de código vigentes
>
> Estos documentos se conservan como referencia histórica. **NO usar como fuente de verdad para decisiones de producto o arquitectura.**

---

**Versión histórica:** 3.0
**Última actualización:** 26 Diciembre 2024
**Estado original:** En desarrollo

---

## 🎯 ¿Qué es este documento?

Documentación técnica completa del proyecto AnunciaYA, diseñada para:

- ✅ Retomar el proyecto después de tiempo sin trabajar en él
- ✅ Incorporar nuevos desarrolladores al equipo
- ✅ Entender la estructura completa del sistema
- ✅ Mantener independencia de herramientas externas

---

## 📁 Índice de Documentación

### 1. Arquitectura
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Vision_General.md](01_Arquitectura/01_Vision_General.md) | Qué es AnunciaYA, objetivos, modelo de negocio | ✅ |
| [02_Stack_Tecnologico.md](01_Arquitectura/02_Stack_Tecnologico.md) | Tecnologías usadas y justificación | ✅ |
| [03_Estructura_Carpetas.md](01_Arquitectura/03_Estructura_Carpetas.md) | Organización del monorepo | ✅ |
| [04_Decisiones_Arquitectonicas.md](01_Arquitectura/04_Decisiones_Arquitectonicas.md) | Decisiones técnicas y su razón | ✅ |

### 2. Base de Datos
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Arquitectura_Datos.md](02_Base_de_Datos/01_Arquitectura_Datos.md) | Arquitectura híbrida, diagrama de relaciones | ✅ |
| [02_Schemas_PostgreSQL.md](02_Base_de_Datos/02_Schemas_PostgreSQL.md) | 58 tablas, campos, relaciones | ✅ |
| [03_Schemas_MongoDB.md](02_Base_de_Datos/03_Schemas_MongoDB.md) | Colecciones ChatYA, estructura | ✅ |
| [04_Redis_y_Queries.md](02_Base_de_Datos/04_Redis_y_Queries.md) | Redis, queries comunes | ✅ |

### 3. API (Endpoints)
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Autenticacion.md](03_API/01_Autenticacion.md) | Login, registro, tokens, OAuth | ⏳ |
| [02_Usuarios.md](03_API/02_Usuarios.md) | CRUD usuarios, perfil | ⏳ |
| [03_Negocios.md](03_API/03_Negocios.md) | CRUD negocios, sucursales | ⏳ |
| [04_Onboarding.md](03_API/04_Onboarding.md) | Wizard de registro comercial | ⏳ |
| [05_Articulos.md](03_API/05_Articulos.md) | Productos y servicios | ⏳ |
| [06_Imagenes.md](03_API/06_Imagenes.md) | Upload, Cloudinary | ⏳ |

### 4. Guía de Desarrollo
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Setup_Local.md](04_Guia_Desarrollo/01_Setup_Local.md) | Instalación y configuración | ⏳ |
| [02_Convenciones_Codigo.md](04_Guia_Desarrollo/02_Convenciones_Codigo.md) | Estándares y estilo | ⏳ |
| [03_Git_Workflow.md](04_Guia_Desarrollo/03_Git_Workflow.md) | Ramas, commits, PRs | ⏳ |
| [04_Testing.md](04_Guia_Desarrollo/04_Testing.md) | Pruebas y QA | ⏳ |

### 5. Operaciones (DevOps)
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Variables_Entorno.md](05_Operaciones/01_Variables_Entorno.md) | Todas las env vars necesarias | ⏳ |
| [02_Deploy_Railway.md](05_Operaciones/02_Deploy_Railway.md) | Deploy del backend | ⏳ |
| [03_Deploy_Vercel.md](05_Operaciones/03_Deploy_Vercel.md) | Deploy del frontend | ⏳ |
| [04_Cloudinary.md](05_Operaciones/04_Cloudinary.md) | Configuración de imágenes | ⏳ |
| [05_Stripe.md](05_Operaciones/05_Stripe.md) | Pagos y suscripciones | ⏳ |
| [06_MongoDB_Atlas.md](05_Operaciones/06_MongoDB_Atlas.md) | Base de datos chat | ⏳ |

### 6. Manual de Usuario
| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [01_Guia_Usuario_Personal.md](06_Manual_Usuario/01_Guia_Usuario_Personal.md) | Para usuarios finales | ⏳ |
| [02_Guia_Usuario_Comercial.md](06_Manual_Usuario/02_Guia_Usuario_Comercial.md) | Para dueños de negocios | ⏳ |

---

## 🔗 Documentos Relacionados

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| Roadmap Maestro | `/project/AnunciaYA_Roadmap_Maestro.md` | Planificación y estado del proyecto |
| Schemas PostgreSQL | `/project/PostgreSQL_*.html` | Detalle de tablas |
| Modelos MongoDB | `/project/MODELOS_MONGODB_CHATYA.md` | Colecciones de chat |
| Integración Stripe | `/project/Integracion_Stripe.md` | Guía de pagos |

---

## 📊 Estado de la Documentación

| Sección | Progreso |
|---------|----------|
| Arquitectura | ✅ 100% |
| Base de Datos | ✅ 100% |
| API | ⚪ 0% |
| Guía Desarrollo | ⚪ 0% |
| Operaciones | ⚪ 0% |
| Manual Usuario | ⚪ 0% |

---

## ✏️ Cómo Contribuir

1. Los documentos están en formato **Markdown (.md)**
2. Seguir la estructura de carpetas existente
3. Actualizar este índice al agregar nuevos documentos
4. Incluir fecha de última actualización en cada documento

---

*Documentación generada para AnunciaYA v3.0*