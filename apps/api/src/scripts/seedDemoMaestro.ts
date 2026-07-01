/**
 * seedDemoMaestro.ts
 * ==================
 * Siembra (idempotente) el DEMO MAESTRO de Business Studio: un negocio curado, marcado
 * demo_tipo='maestro' + es_demo=true (oculto del público), con catálogo, ofertas, recompensas,
 * puntos Y ~90 días de actividad simulada (clientes, ventas, canjes, reseñas) para que los 13
 * módulos de BS se vean con vida. Las COPIAS de cada vendedor se clonan de aquí.
 *
 * Ver docs/arquitectura/Demo_Business_Studio.md.
 *
 * EJECUTAR (lo corre Juan):  cd apps/api && pnpm exec tsx src/scripts/seedDemoMaestro.ts
 *
 * Idempotente: borra el maestro previo (si existe) y vuelve a sembrar. Los clientes sintéticos
 * (@demo.anunciaya.local) se reutilizan por correo. Las imágenes son placeholders públicos; pueden
 * reemplazarse por assets R2 en la carpeta `demo/` (protegida en imageRegistry.ts).
 */

import { config } from 'dotenv';
config();

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    negocios,
    negocioSucursales,
    negocioHorarios,
    negocioMetodosPago,
    negocioGaleria,
    asignacionSubcategorias,
    articulos,
    articuloSucursales,
    ofertas,
    recompensas,
    puntosConfiguracion,
    puntosBilletera,
    puntosTransacciones,
    vouchersCanje,
    resenas,
    metricasEntidad,
    usuarios,
    ciudades,
    subcategoriasNegocio,
} from '../db/schemas/schema.js';

const CORREO_DUENO = 'demo-maestro@demo.anunciaya.local';
const IMG = (semilla: string, w = 600, h = 400) => `https://picsum.photos/seed/${semilla}/${w}/${h}`;

function diasAtras(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString();
}
function aleatorio(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function elegir<T>(arr: T[]): T {
    return arr[aleatorio(0, arr.length - 1)];
}

const NOMBRES = [
    ['María', 'González'], ['José', 'Hernández'], ['Guadalupe', 'Ramírez'], ['Juan', 'López'],
    ['Ana', 'Martínez'], ['Luis', 'Sánchez'], ['Rosa', 'Torres'], ['Carlos', 'Flores'],
    ['Laura', 'Rivera'], ['Miguel', 'Gómez'], ['Sofía', 'Díaz'], ['Jorge', 'Morales'],
];

const ARTICULOS = [
    { nombre: 'Tacos de Camarón (orden)', categoria: 'Tacos', precio: '85.00', desc: 'Tres tacos de camarón capeado con repollo y salsa de la casa.' },
    { nombre: 'Ceviche de Pescado', categoria: 'Mariscos', precio: '120.00', desc: 'Pescado fresco curado en limón con pepino, cebolla y cilantro.' },
    { nombre: 'Coctel de Camarón', categoria: 'Mariscos', precio: '150.00', desc: 'Camarón en salsa coctelera con aguacate y galletas saladas.' },
    { nombre: 'Tostada de Marlin', categoria: 'Tostadas', precio: '65.00', desc: 'Marlin ahumado preparado sobre tostada crujiente.' },
    { nombre: 'Aguachile Verde', categoria: 'Mariscos', precio: '160.00', desc: 'Camarón en salsa verde picante con pepino y cebolla morada.' },
    { nombre: 'Agua de Horchata (1L)', categoria: 'Bebidas', precio: '45.00', desc: 'Agua fresca de horchata preparada al día.' },
];

const RECOMPENSAS = [
    { nombre: 'Agua fresca gratis', puntos: 100, desc: 'Canjea por un agua fresca de 1L.' },
    { nombre: 'Orden de tacos gratis', puntos: 350, desc: 'Una orden de tacos de camarón de cortesía.' },
    { nombre: 'Coctel de camarón gratis', puntos: 600, desc: 'Un coctel de camarón a elegir.' },
];

async function main() {
    console.log('🌱 Sembrando demo maestro de Business Studio...');

    // Ciudad: preferimos Puerto Peñasco; si no, la primera activa.
    const ciudadesActivas = await db.select({ id: ciudades.id, nombre: ciudades.nombre }).from(ciudades).limit(200);
    if (!ciudadesActivas.length) {
        throw new Error('No hay ciudades en el catálogo. Siembra ciudades antes de correr este script.');
    }
    const ciudad = ciudadesActivas.find((c) => /pe.?asco/i.test(c.nombre)) ?? ciudadesActivas[0];

    // Subcategoría (opcional): la primera que exista.
    const [subcat] = await db.select({ id: subcategoriasNegocio.id }).from(subcategoriasNegocio).limit(1);

    await db.transaction(async (tx) => {
        // ── Limpiar maestro previo (idempotencia) ────────────────────────────────
        const [maestroViejo] = await tx
            .select({ negocioId: negocios.id, usuarioId: negocios.usuarioId })
            .from(negocios)
            .where(eq(negocios.demoTipo, 'maestro'))
            .limit(1);
        if (maestroViejo) {
            const nid = maestroViejo.negocioId;
            const sucs = await tx.select({ id: negocioSucursales.id }).from(negocioSucursales).where(eq(negocioSucursales.negocioId, nid));
            const sucIds = sucs.map((s) => s.id);
            const arts = await tx.select({ id: articulos.id }).from(articulos).where(eq(articulos.negocioId, nid));
            const artIds = arts.map((a) => a.id);
            await tx.delete(vouchersCanje).where(eq(vouchersCanje.negocioId, nid));
            await tx.delete(puntosTransacciones).where(eq(puntosTransacciones.negocioId, nid));
            await tx.delete(puntosBilletera).where(eq(puntosBilletera.negocioId, nid));
            await tx.delete(resenas).where(and(eq(resenas.destinoTipo, 'negocio'), eq(resenas.destinoId, nid)));
            if (sucIds.length) {
                await tx.delete(metricasEntidad).where(and(eq(metricasEntidad.entityType, 'sucursal'), inArray(metricasEntidad.entityId, sucIds)));
                await tx.delete(negocioHorarios).where(inArray(negocioHorarios.sucursalId, sucIds));
            }
            await tx.delete(ofertas).where(eq(ofertas.negocioId, nid));
            if (artIds.length) await tx.delete(articuloSucursales).where(inArray(articuloSucursales.articuloId, artIds));
            await tx.delete(articulos).where(eq(articulos.negocioId, nid));
            await tx.delete(recompensas).where(eq(recompensas.negocioId, nid));
            await tx.delete(puntosConfiguracion).where(eq(puntosConfiguracion.negocioId, nid));
            await tx.delete(negocioGaleria).where(eq(negocioGaleria.negocioId, nid));
            await tx.delete(negocioMetodosPago).where(eq(negocioMetodosPago.negocioId, nid));
            await tx.delete(asignacionSubcategorias).where(eq(asignacionSubcategorias.negocioId, nid));
            await tx.delete(negocioSucursales).where(eq(negocioSucursales.negocioId, nid));
            await tx.update(usuarios).set({ negocioId: null }).where(eq(usuarios.id, maestroViejo.usuarioId));
            await tx.delete(negocios).where(eq(negocios.id, nid));
            await tx.delete(usuarios).where(eq(usuarios.id, maestroViejo.usuarioId));
        }
        // Por si quedó suelto el dueño con ese correo.
        await tx.delete(usuarios).where(eq(usuarios.correo, CORREO_DUENO));

        // ── Dueño del maestro + negocio + sucursal principal ─────────────────────
        const [duenoMaestro] = await tx.insert(usuarios).values({
            nombre: 'Demo', apellidos: 'Maestro', correo: CORREO_DUENO,
            perfil: 'comercial', membresia: 1, contrasenaHash: null, correoVerificado: true,
            estado: 'activo', tieneModoComercial: true, modoActivo: 'comercial',
        }).returning();

        const [negocio] = await tx.insert(negocios).values({
            usuarioId: duenoMaestro.id,
            nombre: 'Mariscos El Capitán (DEMO)',
            descripcion: 'Mariscos frescos y tacos de camarón en Puerto Peñasco. Negocio de demostración de AnunciaYA.',
            sitioWeb: 'https://anunciaya.mx',
            logoUrl: IMG('anunciaya-demo-logo', 200, 200),
            activo: true, esBorrador: false, verificado: true, onboardingCompletado: true,
            participaPuntos: true, estadoMembresia: 'al_corriente', estadoAdmin: 'activo',
            metodoCobro: 'manual', esDemo: true, demoTipo: 'maestro',
        }).returning();

        await tx.update(usuarios).set({ negocioId: negocio.id }).where(eq(usuarios.id, duenoMaestro.id));

        const [sucursal] = await tx.insert(negocioSucursales).values({
            negocioId: negocio.id, nombre: 'Mariscos El Capitán (DEMO)', esPrincipal: true,
            direccion: 'Blvd. Benito Juárez 123, Centro', ciudadId: ciudad.id, estado: 'Sonora',
            telefono: '6383830000', whatsapp: '6383830000', activa: true, correo: CORREO_DUENO,
            fotoPerfil: IMG('anunciaya-demo-perfil', 400, 400), portadaUrl: IMG('anunciaya-demo-portada', 1200, 400),
        }).returning();
        const sucursalId = sucursal.id;

        // Horarios (lun-dom, 9:00-21:00).
        for (let dia = 0; dia < 7; dia++) {
            await tx.insert(negocioHorarios).values({
                sucursalId, diaSemana: dia, abierto: dia !== 0, horaApertura: '09:00:00', horaCierre: '21:00:00',
            });
        }

        // Métodos de pago.
        for (const tipo of ['efectivo', 'tarjeta_credito', 'transferencia']) {
            await tx.insert(negocioMetodosPago).values({ negocioId: negocio.id, sucursalId, tipo, activo: true });
        }

        // Galería.
        for (let i = 0; i < 4; i++) {
            await tx.insert(negocioGaleria).values({
                negocioId: negocio.id, sucursalId, url: IMG(`anunciaya-demo-galeria-${i}`, 600, 400),
                titulo: `Platillo ${i + 1}`, orden: i,
            });
        }

        // Subcategoría.
        if (subcat) {
            await tx.insert(asignacionSubcategorias).values({ negocioId: negocio.id, subcategoriaId: subcat.id });
        }

        // Catálogo (artículos + asignación a la sucursal).
        for (let i = 0; i < ARTICULOS.length; i++) {
            const a = ARTICULOS[i];
            const [art] = await tx.insert(articulos).values({
                negocioId: negocio.id, tipo: 'producto', nombre: a.nombre, descripcion: a.desc,
                categoria: a.categoria, precioBase: a.precio, imagenPrincipal: IMG(`anunciaya-demo-art-${i}`, 500, 500),
                disponible: true, destacado: i < 2, orden: i,
            }).returning();
            await tx.insert(articuloSucursales).values({ articuloId: art.id, sucursalId });
        }

        // Ofertas.
        await tx.insert(ofertas).values({
            negocioId: negocio.id, sucursalId, titulo: '2x1 en Tacos de Camarón', tipo: '2x1',
            descripcion: 'Todos los martes, 2x1 en órdenes de tacos de camarón.',
            imagen: IMG('anunciaya-demo-oferta-1', 600, 400),
            fechaInicio: diasAtras(15), fechaFin: diasAtras(-30), activo: true, visibilidad: 'publico',
        });
        await tx.insert(ofertas).values({
            negocioId: negocio.id, sucursalId, titulo: '$20 de descuento en Coctel', tipo: 'monto_fijo',
            descripcion: 'Presenta este cupón y obtén $20 de descuento en tu coctel de camarón.', valor: '20',
            imagen: IMG('anunciaya-demo-oferta-2', 600, 400),
            fechaInicio: diasAtras(10), fechaFin: diasAtras(-20), activo: true, visibilidad: 'publico',
        });

        // Configuración de puntos.
        await tx.insert(puntosConfiguracion).values({
            negocioId: negocio.id, puntosPorPeso: '1.0', minimoCompra: '50', diasExpiracionPuntos: 180,
            diasExpiracionVoucher: 30, validarHorario: false, horarioInicio: '09:00:00', horarioFin: '21:00:00',
            activo: true, nivelesActivos: true,
        });

        // Recompensas.
        const recIds: { id: string; puntos: number }[] = [];
        for (let i = 0; i < RECOMPENSAS.length; i++) {
            const r = RECOMPENSAS[i];
            const [rec] = await tx.insert(recompensas).values({
                negocioId: negocio.id, nombre: r.nombre, descripcion: r.desc, puntosRequeridos: r.puntos,
                imagenUrl: IMG(`anunciaya-demo-recompensa-${i}`, 400, 400), activa: true, orden: i, tipo: 'basica',
            }).returning();
            recIds.push({ id: rec.id, puntos: r.puntos });
        }

        // ── Clientes sintéticos + actividad (90 días) ────────────────────────────
        let totalResenas = 0;
        let sumaRatings = 0;
        let contadorVoucher = 0; // códigos únicos del maestro (el clonado los regenera de todas formas)
        for (let i = 0; i < NOMBRES.length; i++) {
            const [nombre, apellido] = NOMBRES[i];
            const correo = `demo-cliente-${i + 1}@demo.anunciaya.local`;

            // Crear-o-reutilizar el cliente por correo.
            let [cliente] = await tx.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, correo)).limit(1);
            if (!cliente) {
                [cliente] = await tx.insert(usuarios).values({
                    nombre, apellidos: apellido, correo, perfil: 'personal', membresia: 1,
                    contrasenaHash: null, correoVerificado: true, estado: 'activo',
                }).returning({ id: usuarios.id });
            }

            // Billetera (la del maestro viejo ya se borró arriba).
            const [billetera] = await tx.insert(puntosBilletera).values({
                usuarioId: cliente.id, negocioId: negocio.id, puntosDisponibles: 0,
                puntosAcumuladosTotal: 0, puntosCanjeadosTotal: 0, puntosExpiradosTotal: 0,
            }).returning();

            // Transacciones (2-4, escalonadas en 90 días).
            const numTx = aleatorio(2, 4);
            let acumulado = 0;
            let ultimaTxId = '';
            let ultimaFecha = diasAtras(90);
            for (let t = 0; t < numTx; t++) {
                const monto = aleatorio(80, 500);
                const puntos = monto; // 1 punto por peso
                acumulado += puntos;
                const fecha = diasAtras(aleatorio(1, 88));
                if (fecha > ultimaFecha) ultimaFecha = fecha;
                const [tx1] = await tx.insert(puntosTransacciones).values({
                    billeteraId: billetera.id, negocioId: negocio.id, sucursalId, clienteId: cliente.id,
                    montoCompra: monto.toFixed(2), puntosOtorgados: puntos, tipo: 'presencial', estado: 'confirmado',
                    confirmadoPorCliente: true, createdAt: fecha, montoEfectivo: monto.toFixed(2),
                    concepto: 'Compra en sucursal',
                }).returning({ id: puntosTransacciones.id });
                ultimaTxId = tx1.id;
            }

            // Canje (algunos clientes con puntos suficientes).
            let canjeado = 0;
            const recompensaCanjeable = recIds.filter((r) => r.puntos <= acumulado);
            if (recompensaCanjeable.length && i % 2 === 0) {
                const rec = elegir(recompensaCanjeable);
                canjeado = rec.puntos;
                const usado = i % 4 === 0;
                await tx.insert(vouchersCanje).values({
                    billeteraId: billetera.id, recompensaId: rec.id, usuarioId: cliente.id, negocioId: negocio.id,
                    codigo: `DM${String(contadorVoucher++).padStart(4, '0')}`, qrData: JSON.stringify({ demo: true }), puntosUsados: rec.puntos,
                    estado: usado ? 'usado' : 'pendiente', expiraAt: diasAtras(-25),
                    usadoAt: usado ? diasAtras(aleatorio(1, 20)) : null, sucursalId,
                });
            }

            // Actualizar saldos de la billetera (coherentes con los checks >= 0).
            const disponible = Math.max(0, acumulado - canjeado);
            const nivel = acumulado >= 5000 ? 'oro' : acumulado >= 1000 ? 'plata' : 'bronce';
            await tx.update(puntosBilletera).set({
                puntosDisponibles: disponible, puntosAcumuladosTotal: acumulado, puntosCanjeadosTotal: canjeado,
                ultimaActividad: ultimaFecha, nivelActual: nivel,
            }).where(eq(puntosBilletera.id, billetera.id));

            // Reseña (la mitad de los clientes).
            if (i % 2 === 0 && ultimaTxId) {
                const rating = aleatorio(4, 5);
                totalResenas++;
                sumaRatings += rating;
                await tx.insert(resenas).values({
                    autorId: cliente.id, autorTipo: 'cliente', destinoTipo: 'negocio', destinoId: negocio.id,
                    rating, texto: elegir([
                        '¡Excelentes mariscos, muy frescos!', 'Los tacos de camarón están increíbles.',
                        'Buen servicio y sazón. Volveré.', 'El aguachile pica rico, me encantó.',
                    ]),
                    interaccionTipo: 'scanya', interaccionId: ultimaTxId, sucursalId,
                });
            }
        }

        // Métricas de la sucursal (para Opiniones/KPIs). Un trigger ya crea la fila al insertar
        // reseñas (total_resenas/promedio_rating), así que hacemos upsert para sumar likes/views/follows.
        const metLikes = aleatorio(20, 60);
        const metViews = aleatorio(200, 800);
        const metFollows = aleatorio(10, 40);
        const metRating = totalResenas ? (sumaRatings / totalResenas).toFixed(1) : '0';
        await tx.insert(metricasEntidad).values({
            entityType: 'sucursal', entityId: sucursalId, totalLikes: metLikes,
            promedioRating: metRating, totalResenas, totalViews: metViews, totalFollows: metFollows,
        }).onConflictDoUpdate({
            target: [metricasEntidad.entityType, metricasEntidad.entityId],
            set: {
                totalLikes: metLikes, promedioRating: metRating, totalResenas,
                totalViews: metViews, totalFollows: metFollows, updatedAt: new Date().toISOString(),
            },
        });

        console.log(`✅ Demo maestro sembrado: negocio ${negocio.id} en ${ciudad.nombre}`);
        console.log(`   ${ARTICULOS.length} artículos · ${RECOMPENSAS.length} recompensas · ${NOMBRES.length} clientes · ${totalResenas} reseñas`);
    });

    console.log('🎉 Listo. Los vendedores ya pueden abrir su copia del demo desde el Panel.');
    process.exit(0);
}

main().catch((error) => {
    console.error('❌ Error sembrando el demo maestro:', error);
    process.exit(1);
});
