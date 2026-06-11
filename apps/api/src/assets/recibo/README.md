# Plantilla del recibo de pago de membresía

Aquí va el diseño que alimenta el recibo PDF que se envía por correo cuando se
registra un pago de membresía (defensa Camino B — comprobante al negocio).

## Archivos esperados

| Archivo | Qué es | Obligatorio |
|---|---|---|
| `plantilla-recibo.pdf` | **El molde FINAL y LIMPIO.** Diseño completo (logo, marca de agua, etiquetas fijas, datos del emisor, pie) **con los espacios de los datos variables VACÍOS**. Es el fondo real sobre el que el código estampa los datos. | ✅ |
| `referencia-recibo.pdf` | El mismo diseño pero **con los `{{PLACEHOLDERS}}` visibles** en su posición/fuente final. Solo sirve de guía para clavar las coordenadas; NO se usa en producción. | ✅ (mientras se ajusta) |
| `fuente.ttf` / `fuente.otf` | Tipografía de marca para los datos variables (opcional; si no, se usa una estándar). | ⬜ |

## Regla de oro
- **Etiquetas fijas** ("Folio:", "Negocio:", "Total:", emisor, leyenda, pie) → se quedan en `plantilla-recibo.pdf`.
- **Valores variables** (`{{FOLIO}}`, `{{NOMBRE_NEGOCIO}}`, `{{TOTAL}}`, …) → se BORRAN de `plantilla-recibo.pdf` (espacio vacío) y solo aparecen en `referencia-recibo.pdf`.

El código (motor `pdf-lib`) carga `plantilla-recibo.pdf` como fondo y dibuja los
datos reales encima, en las posiciones que marca `referencia-recibo.pdf`.
