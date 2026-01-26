# ⏱️ SISTEMA DE CHECKPOINTS - DOCUMENTACIÓN INCREMENTAL

**Fecha:** [YYYY-MM-DD]  
**Sesión:** [Nombre de la sesión]  
**Chat ID:** [si aplica]

---

## 📋 INSTRUCCIONES DE USO

Este documento se actualiza **cada 2-3 horas** o **cada feature completada**.

**Comando para Claude:**
```
"Claude, actualiza el checkpoint con lo que llevamos hasta ahora"
```

**Beneficio:**
- Si el chat se cierra inesperadamente, no pierdes todo el trabajo
- Tienes registro incremental del progreso
- Menos presión al final de la sesión

---

## 🎯 OBJETIVO DE LA SESIÓN

**Feature/Módulo:** [Nombre]  
**Alcance total:**
- [ ] Subtarea 1
- [ ] Subtarea 2
- [ ] Subtarea 3
- [ ] Subtarea 4

---

## ⏱️ CHECKPOINT #1

**Hora:** [HH:MM]  
**Duración acumulada:** [X minutos]

### **Completado:**
- ✅ [Tarea específica]
- ✅ [Tarea específica]

### **Archivos creados/modificados:**
1. `archivo1.tsx` - [Descripción breve]
2. `archivo2.ts` - [Descripción breve]

### **Decisiones tomadas:**
- **[Decisión 1]:** [Qué y por qué]

### **Estado:**
- Progreso estimado: [X%]
- Todo funciona: ✅ Sí / ⚠️ Con warnings / ❌ No

### **Próximo paso:**
[Lo que sigue después de este checkpoint]

---

## ⏱️ CHECKPOINT #2

**Hora:** [HH:MM]  
**Duración acumulada:** [X horas Y minutos]

### **Completado desde último checkpoint:**
- ✅ [Tarea específica]
- ✅ [Tarea específica]

### **Archivos creados/modificados:**
1. `archivo3.tsx` - [Descripción breve]
2. `archivo4.ts` - [Descripción breve]

### **Problemas encontrados:**
- **[Problema]:** [Solución aplicada]

### **Decisiones tomadas:**
- **[Decisión 2]:** [Qué y por qué]

### **Estado:**
- Progreso estimado: [X%]
- Todo funciona: ✅ Sí / ⚠️ Con warnings / ❌ No

### **Próximo paso:**
[Lo que sigue después de este checkpoint]

---

## ⏱️ CHECKPOINT #3

**Hora:** [HH:MM]  
**Duración acumulada:** [X horas Y minutos]

### **Completado desde último checkpoint:**
- ✅ [Tarea específica]
- ✅ [Tarea específica]

### **Archivos creados/modificados:**
1. `archivo5.tsx` - [Descripción breve]
2. `archivo6.ts` - [Descripción breve]

### **Problemas encontrados:**
- **[Problema]:** [Solución aplicada]

### **Decisiones tomadas:**
- **[Decisión 3]:** [Qué y por qué]

### **Estado:**
- Progreso estimado: [X%]
- Todo funciona: ✅ Sí / ⚠️ Con warnings / ❌ No

### **Próximo paso:**
[Lo que sigue después de este checkpoint]

---

## ⏱️ CHECKPOINT #4

**Hora:** [HH:MM]  
**Duración acumulada:** [X horas Y minutos]

### **Completado desde último checkpoint:**
- ✅ [Tarea específica]
- ✅ [Tarea específica]

### **Archivos creados/modificados:**
1. `archivo7.tsx` - [Descripción breve]

### **Problemas encontrados:**
- **[Problema]:** [Solución aplicada]

### **Estado:**
- Progreso estimado: [X%]
- Todo funciona: ✅ Sí / ⚠️ Con warnings / ❌ No

### **Próximo paso:**
[Lo que sigue después de este checkpoint]

---

## 📊 RESUMEN CONSOLIDADO

### **Archivos creados (total):**
| Archivo | Ubicación | Descripción | Estado |
|---------|-----------|-------------|--------|
| `ejemplo.tsx` | `apps/web/...` | Componente... | ✅ |
| `ejemplo.ts` | `apps/api/...` | Service... | ✅ |

### **Archivos modificados (total):**
| Archivo | Ubicación | Cambios | Estado |
|---------|-----------|---------|--------|
| `routes.ts` | `apps/api/...` | Agregada ruta... | ✅ |

### **Decisiones técnicas (consolidadas):**
1. **[Decisión 1]:** [Resumen]
2. **[Decisión 2]:** [Resumen]
3. **[Decisión 3]:** [Resumen]

### **Problemas resueltos (consolidados):**
1. **[Problema 1]:** [Solución]
2. **[Problema 2]:** [Solución]

---

## 🎯 PROGRESO GENERAL

```
Alcance total: [N tareas]
Completadas:   [X tareas] ████████░░ [X%]
Pendientes:    [Y tareas]
```

**Tareas completadas:**
- ✅ [Tarea 1]
- ✅ [Tarea 2]
- ✅ [Tarea 3]

**Tareas pendientes:**
- ⏳ [Tarea 4]
- ⏳ [Tarea 5]

---

## 🚨 RECUPERACIÓN DE EMERGENCIA

**Si el chat se cierra AHORA, tienes:**
- ✅ Archivos creados hasta checkpoint #[N]
- ✅ Decisiones documentadas
- ✅ Problemas y soluciones registrados
- ✅ [X%] del trabajo protegido

**Para continuar:**
1. Usar los archivos generados hasta el último checkpoint
2. Revisar "Próximo paso" del último checkpoint
3. Revisar "Tareas pendientes"
4. Continuar desde ahí

---

## 📝 PROMPT DE CONTINUACIÓN (actualizado)

**Si necesitas continuar en otro chat AHORA:**

```markdown
# CONTINUACIÓN: [Nombre de la sesión]

## Contexto
Estaba trabajando en [feature/módulo]. Progreso: [X%]

## Lo que ya funciona
[Listar features completadas hasta último checkpoint]

## Archivos creados
[Lista de archivos del resumen consolidado]

## Decisiones tomadas
[Lista de decisiones del resumen consolidado]

## Próximo paso
[Copiar "Próximo paso" del último checkpoint]

## Archivos que necesitarás ver
[Lista de archivos relevantes para continuar]
```

---

## ⚡ COMANDOS RÁPIDOS

### **Para actualizar checkpoint:**
```
"Claude, checkpoint #[N]: actualiza con lo completado"
```

### **Para ver estado general:**
```
"Claude, muéstrame el progreso acumulado"
```

### **Para generar prompt de continuación:**
```
"Claude, genera prompt de continuación con el estado actual"
```

### **Para consolidar en documento final:**
```
"Claude, convierte estos checkpoints en el documento de sesión final"
```

---

## 🎓 MEJORES PRÁCTICAS

### **Cuándo hacer checkpoint:**
- ✅ Cada 2-3 horas de trabajo
- ✅ Después de completar una feature importante
- ✅ Antes de hacer cambios arriesgados
- ✅ Cuando el chat empieza a sentirse lento
- ✅ Antes de tomar un descanso largo

### **Qué incluir en cada checkpoint:**
- ✅ Archivos creados/modificados (nombres y ubicaciones)
- ✅ Decisiones tomadas (breves)
- ✅ Problemas encontrados y soluciones
- ✅ Estado actual (funciona/no funciona)
- ✅ Próximo paso claro

### **Qué NO hacer:**
- ❌ Esperar al final para documentar todo
- ❌ Checkpoints muy largos (mantén brevedad)
- ❌ Olvidar actualizar progreso general
- ❌ No probar antes de hacer checkpoint

---

## 🔄 AUTOMATIZACIÓN

### **Workflow ideal:**

```
[Inicias sesión]
    ↓
Creas documento checkpoint.md
    ↓
[Trabajas 2-3 horas]
    ↓
"Claude, checkpoint #1"
    ↓
[Trabajas 2-3 horas más]
    ↓
"Claude, checkpoint #2"
    ↓
[Repites hasta completar]
    ↓
"Claude, consolida checkpoints en documento final"
    ↓
[Documento de sesión completo listo]
```

---

## ✅ CHECKLIST DE CHECKPOINT

Cada checkpoint debe tener:

- [ ] Hora registrada
- [ ] Tareas completadas listadas
- [ ] Archivos mencionados (nombres + ubicaciones)
- [ ] Al menos 1 decisión o problema documentado
- [ ] Estado actual (funciona/no funciona)
- [ ] Próximo paso definido
- [ ] Progreso % actualizado

---

## 💾 BACKUP AUTOMÁTICO

**Guardar este archivo:**
- En tu proyecto local cada checkpoint
- En Dropbox/Drive automático (si usas)
- Commit en Git cada 2-3 checkpoints

**Nombres sugeridos:**
- `checkpoint-ofertas-2026-01-10.md`
- `checkpoint-sesion-actual.md`
- `checkpoint-[feature]-[fecha].md`

---

**Última actualización:** [Timestamp del último checkpoint]  
**Próximo checkpoint estimado:** [Hora estimada]
