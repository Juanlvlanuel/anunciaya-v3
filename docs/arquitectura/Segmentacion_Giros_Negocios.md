# Segmentación de Giros — Negocios (catálogo de membresía)

> **Qué es:** clasificación de cada categoría/subcategoría del catálogo de **Negocios**
> según si el modelo completo de membresía (puntos CardYA + ScanYA + cupones + Ofertas)
> le aplica de forma natural, o si su modelo real es de cita/consulta/proyecto — donde
> hoy no hay motor recurrente que justifique la venta activa de la membresía.
>
> **Criterio:** ¿el negocio vive de compra/consumo repetido con pago en el momento
> (aplica puntos+ScanYA+cupones+Ofertas), o vive de cita/consulta/proyecto donde el
> cliente no acumula puntos de forma natural (aplicaría un futuro **módulo de citas**,
> ver [[project_modulo_citas_futuro]])?
>
> **Fecha:** 23 julio 2026. Resultado de revisión giro por giro en sesión de limpieza
> del catálogo (ver también `Categorias.md` y `Categorias_Pendientes.md`).

---

## Lista 1 — Se quedan en Negocios (venta activa, aplica el stack completo)

### Comida (15)
Restaurantes, Cafeterías, Comida Rápida, Panaderías, Repostería y Pastelería,
Tortillerías, Pescaderías, Carnicerías, Pollerías, Neverías y Bebidas, Dulcerías y
Postres, Vinos y Licores, Mariscos, Antojitos y Botanas, Fruterías y Verdulerías.

### Salud (6)
Farmacias, Ópticas, Tiendas Naturistas, Gimnasios y Fitness, Medicina Estética,
Spas y Masajes.

### Belleza (5)
Barberías, Estéticas, Salones de Uñas, Maquillaje y Peinado, Depilación y
Tratamientos.

### Servicios (15)
Estudio Fotográfico, Diseño e Imprenta, Lavanderías, Sastrería y Costura, Renta de
Trajes y Vestidos, Renta de Mobiliario para Eventos, Carpintería, Herrería y
Soldadura, Cerrajería, Aire Acondicionado y Refrigeración, Reparación de
Electrodomésticos, Persianas y Cortinas, Extintores y Seguridad Industrial,
**Inmobiliarias**, **Agentes / Asesores Inmobiliarios**.

> Excepción al criterio estricto: Inmobiliarias y Agentes/Asesores Inmobiliarios no
> usan ScanYA/puntos, pero sí tienen motivo real de venta activa en Fase 1 —
> necesitan promover constantemente su inventario de propiedades (alta rotación de
> anuncios), que es exactamente el uso que da Business Studio + Ofertas sin depender
> de lealtad transaccional. Recomendación: no mandarlos a publicar gratis en
> Servicios (esa sección es para publicación ocasional de particulares, no para un
> profesional con inventario estructurado) — en vez de eso, invertir en mejorar el
> **catálogo de Business Studio** para que soporte bien listados de propiedades
> (campos específicos: recámaras, m², tipo de operación), igual que ya lo hace para
> catálogo de productos de un retailer.

### Comercios (18)
Abarrotes y Minisuper, Boutiques y Ropa, Celulares y Accesorios, Deportes,
Electrónica y Tecnología, Ferreterías, Florerías, Joyerías y Relojerías, Jugueterías,
Librerías y Papelerías, Materiales de Construcción, Mercerías / Tiendas de Telas,
Mueblerías y Decoración, Perfumerías y Cosméticos, Purificadoras de Agua, Regalos y
Souvenirs, Supermercados, Zapaterías.

### Diversión (9)
Actividades Recreativas, Antros y Discotecas, Balnearios y Albercas, Bares,
Billares, Centros de Juegos Infantiles, Karaoke, Parques y Ferias, Salones de
Fiestas.

### Movilidad (3)
Autolavados, Refaccionarias, Llantas y Alineación.

### Finanzas (2)
Casas de Empeño, Préstamos y Créditos.

### Educación (0)
Ninguna — ver Lista 2.

### Mascotas (3)
Alimentos Especializados, Tiendas y Accesorios, Estética y Grooming.

**Total Lista 1: 76 subcategorías.**

---

## Lista 2 — Pendientes (no aplica puntos/ScanYA hoy; candidatas a módulo de citas)

### Salud (5)
Dentistas, Hospitales, Laboratorios Clínicos, Fisioterapia y Rehabilitación,
Nutrición y Dietética.

### Servicios (4)
Fumigación, Eventos y Banquetes, Agencias de Viajes, Constructora.

*(Inmobiliarias y Agentes/Asesores Inmobiliarios se movieron a Lista 1 — ver
excepción arriba.)*

### Movilidad (4)
Talleres Mecánicos, Grúas y Auxilio Vial, Seguros para Autos, Escuelas de Manejo.

### Finanzas (1)
Seguros.

### Educación (4)
Cursos y Talleres, Escuela de Idiomas, Escuelas, Guarderías.

### Mascotas (3)
Veterinarias, Guarderías y Pensiones, Cremación y Servicios.

### Ya removidas del catálogo en esta misma sesión (mismo motivo, decisión previa)
Médicos y Clínicas, Abogados, Contadores, Asesores Financieros, Psicología y
Terapias, Funerarias.

**Total Lista 2: 27 subcategorías.**

### Segunda etapa de venta — candidatos a "tarjeta de sellos" (dentro de Lista 2)

La tarjeta de sellos (CardYA con `participa_puntos=false`, ver `CardYA.md` §"Negocios
sin CardYA") no necesita cálculo de puntos por peso gastado — solo necesita que el
cliente **vuelva más de una vez por el mismo servicio** para que un sello tenga
sentido ("compra 5, la 6ta gratis"). Sigue requiriendo ScanYA para registrar cada
visita. Con ese filtro, estos giros de Lista 2 sí tienen patrón de visita repetida y
podrían convencerse con sellos — **pero no se visitan en esta primera etapa de
venta**. Se retoman cuando exista el módulo de citas (ver
[[project_modulo_citas_futuro]]), que da el argumento adicional para cerrar la venta:

- Dentistas (limpieza cada 6 meses)
- Veterinarias (vacuna anual, consulta rutinaria)
- Fisioterapia y Rehabilitación (serie de sesiones)
- Nutrición y Dietética (seguimiento mensual)
- Laboratorios Clínicos (análisis periódicos)
- Fumigación (servicio trimestral)
- Guarderías y Pensiones — Mascotas (viajero frecuente)
- Agencias de Viajes (viajero frecuente)
- Talleres Mecánicos (mantenimiento recurrente)

El resto de Lista 2 (Hospitales, Escuelas de Manejo, Seguros, Seguros para Autos,
Cremación y Servicios, Grúas y Auxilio Vial, Eventos y Banquetes, Constructora,
Escuelas, Guarderías, Escuela de Idiomas, y las 6 ya removidas) no tiene patrón de
visita repetida por cliente — sellos tampoco les ayuda, solo el módulo de citas por
sí solo como argumento.

---

## Acción de Fase 1

Las 27 subcategorías de Lista 2 se **desactivan** (`activa=false`) en el Panel, **no
se borran físicamente**. A diferencia de Turismo/Bienes Raíces/oficios freelance
(removidos por completo esta misma sesión porque el comprador no encaja con la app),
Lista 2 sí tiene comprador residente real — lo que falta es el motor de producto
(módulo de citas) para que valga la pena vendérselas. Desactivar conserva el ID, la
disponibilidad por ciudad y cualquier negocio ya clasificado, así que reactivar en
Fase 2 es un toggle, no recrear desde cero.

## Checklist mínimo para reabrir Fase 2 (módulo de citas)

Antes de retomar la venta a Lista 2, el módulo de citas necesita al menos:
- [ ] Negocio puede definir servicios agendables (nombre, duración, precio) desde
      Business Studio.
- [ ] Negocio define horarios/disponibilidad por sucursal o por empleado.
- [ ] Cliente puede ver disponibilidad y agendar desde el perfil público del negocio
      (o vía ChatYA).
- [ ] Negocio ve su agenda del día/semana en Business Studio.
- [ ] Notificación de recordatorio de cita (para negocio y cliente).
- [ ] Integración con CardYA "tarjeta de sellos": cada cita completada puede
      registrar un sello (ver sección de sellos arriba) — no es requisito para el
      MVP del módulo, pero es el gancho de venta que lo justifica.

## Notas

- 76 + 27 = 103, el total de subcategorías activas del catálogo al momento de esta
  revisión.
- Ninguna acción de desactivación de estas 27 corrió aún contra DEV/PROD al momento
  de escribir este documento — falta decidir y ejecutar.
- Casos borderline marcados durante la revisión (juicio del negocio, no filtro
  automático): Eventos y Banquetes (si el pitch de paquetes de temporada compensa lo
  consultivo), Cursos y Talleres (si vende paquetes sueltos en vez de inscripción
  larga). Revisar caso por caso si se quiere mover de lista.
- Ver [[project_modulo_citas_futuro]] para la nota de producto sobre el módulo de
  citas que resolvería el problema de fondo de la Lista 2.
