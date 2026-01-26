# 📋 Templates de Documentación de Sesiones

Esta carpeta contiene plantillas reutilizables para documentar sesiones de trabajo en el proyecto AnunciaYA.

---

## 📄 Archivos en esta carpeta

### **TEMPLATE_Sesion.md**
Plantilla completa para documentar una sesión de trabajo al finalizarla.

**Incluye:**
- Objetivo de la sesión
- Archivos creados/modificados
- Decisiones técnicas tomadas
- Problemas encontrados y soluciones
- Testing realizado
- Pendientes para próxima sesión
- Aprendizajes
- Prompt de continuación

### **TEMPLATE_Checkpoints.md**
Plantilla para documentación incremental durante la sesión (cada 2-3 horas).

**Incluye:**
- Múltiples checkpoints (hasta 4)
- Progreso por checkpoint
- Archivos por checkpoint
- Decisiones por checkpoint
- Resumen consolidado
- Prompt de continuación actualizado

---

## 🔄 Cómo usar los templates

### **IMPORTANTE: NO modificar estos archivos**

Los templates son "formularios en blanco" que se usan cada vez que inicias una nueva sesión.

---

## ✨ MÉTODO RECOMENDADO (Subir template al chat)

### **Ventajas:**
- ✅ Claude actualiza el archivo automáticamente
- ✅ Solo descargas cuando quieras
- ✅ Sin copiar/pegar manual
- ✅ Sin errores de formato
- ✅ Más rápido y profesional

---

### **Workflow optimizado:**

#### **1. Al INICIAR sesión → Copiar template y subirlo al chat**

```bash
# Copiar template localmente
copy templates\TEMPLATE_Checkpoints.md sesiones\2026-01-11_Fase5.4_Ofertas_UI_Polish.md

# Abrir nuevo chat y SUBIR este archivo
```

**En el chat con Claude:**
```
📋 CHECKPOINTS ACTIVADOS

Adjunto template de checkpoints. 
Cuando diga "Claude, checkpoint #N", actualiza el template y preséntalo para descarga.

Ahora trabajemos en:
[Tu prompt de trabajo]
```

**Claude tiene el template cargado y listo para actualizar.**

---

#### **2. Durante la sesión → Actualizar checkpoints cada 2-3 horas**

**En el chat con Claude:**
```
Claude, checkpoint #1
```

**Claude responderá:**
- ✅ Actualizará el template automáticamente
- ✅ Llenará sección checkpoint #1 con:
  - Tareas completadas
  - Archivos creados/modificados
  - Decisiones tomadas
  - Próximo paso
- ✅ Presentará el archivo para descarga

**Tú solo descargas el archivo actualizado** (botón Download).

**Beneficio:**
- Si el chat se cierra inesperadamente, ya tienes el progreso documentado
- Máximo pierdes 2-3 horas de contexto (del último checkpoint)
- Sin trabajo manual de copiar/pegar

---

#### **3. Al FINALIZAR sesión → Consolidar y documento final**

**En el chat con Claude:**
```
Claude, checkpoint #3 y consolida todo el resumen
```

**Claude responderá:**
- ✅ Completará último checkpoint
- ✅ Llenará resumen consolidado
- ✅ Presentará archivo completo final

**Tú descargas la versión final completa.**

---

**Luego crear documento de sesión:**

```bash
# Copiar template de sesión
copy templates\TEMPLATE_Sesion.md sesiones\2026-01-11_Fase5.4_Ofertas_UI_Polish_SESION.md

# Subir al chat (o Claude puede generarlo sin subirlo)
```

**En el chat con Claude:**
```
Claude, genera documento de sesión final basándote en los checkpoints
```

**Claude llenará:**
- Toda la información consolidada
- Basado en los checkpoints completados
- Formato completo y profesional

---

## 📋 MÉTODO ALTERNATIVO (Copiar/pegar manual)

Si prefieres no subir archivos al chat:

**1. Durante la sesión:**
```
"Claude, checkpoint: dame resumen del progreso"
```

**2. Tú copias la respuesta a tu archivo local manualmente**

**3. Repites cada 2-3 horas**

**Desventaja:** Más trabajo manual, posibles errores al copiar

---

## 📝 Patrón de nombres

### **Para archivos en sesiones/:**

```
YYYY-MM-DD_FaseX.Y_Modulo_Tarea.md
```

**Componentes:**
- `YYYY-MM-DD` → Fecha (ej: 2026-01-11)
- `FaseX.Y` → Fase del RoadMap (ej: Fase5.4)
- `Modulo` → Sección del app (ej: Ofertas, MarketPlace, ChatYA)
- `Tarea` → Descripción breve 2-3 palabras (ej: UI_Polish, Backend_Setup)

**Ejemplos correctos:**
```
✅ 2026-01-10_Fase5.4_Ofertas_Imagenes_Implementacion.md
✅ 2026-01-11_Fase5.4_Ofertas_UI_Polish.md
✅ 2026-01-12_Fase5.4_Ofertas_Feed_Publico.md
✅ 2026-01-15_Fase5.5_MarketPlace_Backend_Setup.md
✅ 2026-01-20_Fase6_ChatYA_Arquitectura_MongoDB.md
```

**Ejemplos incorrectos:**
```
❌ sesion_hoy.md
❌ trabajo1.md
❌ ofertas.md
❌ 2026-01-10.md
```

---

## 🎯 Diferencia entre Checkpoints y Sesión

| Aspecto | Checkpoints | Sesión |
|---------|-------------|--------|
| **Cuándo** | Durante la sesión (cada 2-3h) | Al final (1 vez) |
| **Tiempo** | 3-5 min por checkpoint | 15-20 min total |
| **Propósito** | Proteger contexto incremental | Documentación completa |
| **Detalle** | Breve, al punto | Completo, profesional |
| **Uso** | Si chat se cierra | Referencia histórica |

---

## 💡 Comandos rápidos

### **Preparar template localmente:**
```bash
# Copiar checkpoints
copy templates\TEMPLATE_Checkpoints.md sesiones\YYYY-MM-DD_FaseX.Y_Modulo_Tarea.md

# Abrir nuevo chat y SUBIR este archivo
```

### **Durante sesión (cada 2-3 horas):**
```
Claude, checkpoint #1
Claude, checkpoint #2  
Claude, checkpoint #3
```

### **Al finalizar sesión:**
```
Claude, checkpoint #4 y consolida todo
Claude, genera documento de sesión final
```

### **Para revisar progreso:**
```
Claude, ¿cuál es el progreso acumulado?
Claude, muéstrame todos los archivos modificados
```

---

## ✅ Checklist de uso

**Al iniciar sesión:**
- [ ] Copiar TEMPLATE_Checkpoints.md a sesiones/
- [ ] Renombrar: YYYY-MM-DD_FaseX.Y_Modulo_Tarea.md
- [ ] Abrir nuevo chat
- [ ] Subir archivo al chat
- [ ] Instruir: "Checkpoints activados, actualiza cuando lo pida"
- [ ] Empezar a trabajar

**Durante sesión (cada 2-3 horas):**
- [ ] Decir: "Claude, checkpoint #N"
- [ ] Esperar a que Claude presente archivo actualizado
- [ ] Descargar versión actualizada
- [ ] Continuar trabajando

**Al finalizar sesión:**
- [ ] Decir: "Claude, checkpoint final y consolida"
- [ ] Descargar versión final completa
- [ ] (Opcional) Generar documento de sesión
- [ ] Hacer commit en Git
- [ ] Actualizar Chat Cerebro si aplica

---

## 🚨 Recordatorios importantes

### **1. Los templates NO se modifican**
- ❌ NO editar TEMPLATE_Sesion.md
- ❌ NO editar TEMPLATE_Checkpoints.md
- ✅ Solo copiarlos y llenar las copias

### **2. Los checkpoints salvan contexto**
- Si el chat se cierra inesperadamente
- Ya tienes todo documentado hasta el último checkpoint
- Máximo pierdes 2-3 horas de trabajo

### **3. Los documentos NO se llevan a otros chats**
- NO copiar documento completo a otro chat
- Solo usar el "Prompt de continuación" al final
- O un resumen de 3-4 líneas

---

## 📚 Recursos adicionales

**Ver ejemplos completos:**
- `sesiones/2026-01-10_Fase5.4_Ofertas_Imagenes_Implementacion.md`

**Documentación general:**
- `../01_Arquitectura/` - Cómo funciona el sistema
- `../02_Base_de_Datos/` - Schemas y BD
- `../03_API/` - Endpoints y APIs

**RoadMap del proyecto:**
- `../roadmap/ROADMAP.md`

---

## ❓ Preguntas frecuentes

### **P: ¿Cuántos checkpoints debo hacer?**
**R:** 1 checkpoint cada 2-3 horas de trabajo. Si la sesión dura 6 horas, haz 3 checkpoints.

### **P: ¿Debo subir el template al chat o trabajar localmente?**
**R:** Recomendamos SUBIR el template al chat. Claude lo actualiza automáticamente y solo descargas. Es más rápido y sin errores. El método de copiar/pegar manual es alternativo.

### **P: ¿Tengo que llenar TODO el template de sesión?**
**R:** No. Claude lo llena por ti basándose en los checkpoints. Tú solo ajustas si falta algo.

### **P: ¿Qué pasa si olvido hacer checkpoints?**
**R:** No pasa nada grave, pero si el chat se cierra perderás más contexto. Lo ideal es hacerlos cada 2-3 horas.

### **P: ¿Puedo modificar los templates?**
**R:** Sí, ajústalos a tu flujo. Pero guarda las modificaciones en los templates originales.

### **P: ¿Claude actualiza el archivo cada vez que pido checkpoint?**
**R:** Sí, si subiste el template al inicio. Claude lo actualiza y presenta para descarga automáticamente.

### **P: ¿Cada cuánto descargo el archivo?**
**R:** Puedes descargar después de cada checkpoint (recomendado) o solo al final. Lo importante es tener backups incrementales.

---

## 🎉 Beneficios del sistema

**Sin templates (antes):**
- ❌ Pierdes contexto si chat se cierra
- ❌ No recuerdas qué problemas resolviste
- ❌ No sabes qué decisiones tomaste
- ❌ Difícil continuar en otro chat

**Con templates - método copiar/pegar:**
- ✅ Contexto protegido cada 2-3 horas
- ⚠️ Pero requiere trabajo manual
- ⚠️ Posibles errores al copiar

**Con templates - método optimizado (subir archivo):**
- ✅ Contexto protegido cada 2-3 horas
- ✅ Claude actualiza automáticamente
- ✅ Solo descargas cuando quieras
- ✅ Cero trabajo manual de copiar/pegar
- ✅ Sin errores de formato
- ✅ Más rápido (30 seg vs 2 min por checkpoint)
- ✅ Experiencia profesional y fluida
- ✅ Historial completo del proyecto

---

**¡Sistema de documentación listo para usar!** 🚀

**Próxima sesión:** Solo copia los templates y empieza a trabajar.
