/**
 * demoBusinessStudio.service.ts
 * =============================
 * Demo de Business Studio para vendedores (ver docs/arquitectura/Demo_Business_Studio.md).
 *
 * Un "demo maestro" (negocio curado, demo_tipo='maestro') se CLONA a una "copia" privada por
 * vendedor (demo_tipo='copia'). El vendedor entra a BS impersonando al usuario-sombra dueño de su
 * copia (handoff token en Redis → /auth/demo/canjear-handoff). Nunca se toca el negocio_id real del
 * vendedor.
 *
 * - abrirDemo(vendedorId): crea-o-reutiliza la copia + genera handoff token.
 * - reiniciarDemo(vendedorId): borra la copia y la regenera fresca desde el maestro.
 * - obtenerEstadoDemo(vendedorId): ¿existe copia? ¿hay maestro sembrado?
 *
 * Notas de diseño:
 * - Los CLIENTES de la actividad simulada son usuarios sintéticos COMPARTIDOS (creados por el seed
 *   del maestro). Las copias crean sus propias billeteras/transacciones/vouchers/reseñas que
 *   referencian esos clientes + el negocio de la copia. Al borrar una copia NO se borran los
 *   clientes (son del maestro), solo la actividad de esa copia (por negocio_id).
 * - El borrado es EXPLÍCITO en orden inverso (no dependemos de ON DELETE CASCADE).
 * - El clonado usa INSERTS POR LOTE (un insert por tabla, no fila-por-fila) para no exceder el
 *   timeout del request contra la BD remota. El orden de RETURNING de un INSERT multi-fila conserva
 *   el orden de los VALUES (Postgres), así que remapeamos old→new por índice.
 * - Las imágenes R2 se COMPARTEN con el maestro (se copia la URL string, no el objeto).
 */

import { randomUUID } from 'node:crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { redis } from '../db/redis.js';
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
    recompensaProgreso,
    resenas,
    metricasEntidad,
    usuarios,
} from '../db/schemas/schema.js';

/** Ejecutor de BD: el `db` global o una transacción Drizzle. */
type EjecutorTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Error de negocio del demo, con un código estable para el controller. */
export class DemoError extends Error {
    constructor(public codigo: string, mensaje: string) {
        super(mensaje);
        this.name = 'DemoError';
    }
}

interface RefCopia {
    negocioId: string;
    usuarioSombraId: string;
    sucursalPrincipalId: string;
}

// ─── Handoff token (Redis, un solo uso, TTL corto) ────────────────────────────────
const PREFIX_HANDOFF = 'demo_handoff';
const TTL_HANDOFF = 120; // 2 minutos

export interface DatosHandoffDemo {
    /** Usuario-sombra dueño de la copia: el JWT de impersonación se firma con ESTE id. */
    usuarioSombraId: string;
    /** Vendedor real que abrió el demo (para auditoría). */
    vendedorRealId: string;
    negocioId: string;
    sucursalPrincipalId: string;
}

async function guardarHandoffDemo(token: string, datos: DatosHandoffDemo): Promise<void> {
    await redis.setex(`${PREFIX_HANDOFF}:${token}`, TTL_HANDOFF, JSON.stringify(datos));
}

/** Lee y BORRA el handoff (un solo uso). Devuelve null si no existe o ya se consumió. */
export async function consumirHandoffDemo(token: string): Promise<DatosHandoffDemo | null> {
    const clave = `${PREFIX_HANDOFF}:${token}`;
    const crudo = await redis.get(clave);
    if (!crudo) return null;
    await redis.del(clave);
    try {
        return JSON.parse(crudo) as DatosHandoffDemo;
    } catch {
        return null;
    }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────────

async function obtenerMaestroId(): Promise<string | null> {
    const [m] = await db
        .select({ id: negocios.id })
        .from(negocios)
        .where(eq(negocios.demoTipo, 'maestro'))
        .limit(1);
    return m?.id ?? null;
}

async function buscarCopia(vendedorId: string): Promise<RefCopia | null> {
    const [copia] = await db
        .select({ negocioId: negocios.id, usuarioSombraId: negocios.usuarioId })
        .from(negocios)
        .where(and(eq(negocios.demoTipo, 'copia'), eq(negocios.demoVendedorId, vendedorId)))
        .limit(1);
    if (!copia) return null;
    const [suc] = await db
        .select({ id: negocioSucursales.id })
        .from(negocioSucursales)
        .where(and(eq(negocioSucursales.negocioId, copia.negocioId), eq(negocioSucursales.esPrincipal, true)))
        .limit(1);
    return {
        negocioId: copia.negocioId,
        usuarioSombraId: copia.usuarioSombraId,
        sucursalPrincipalId: suc?.id ?? '',
    };
}

function generarCodigoVoucher(): string {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
    return codigo;
}

/** Genera N códigos de voucher únicos (globalmente y entre sí), con pocos SELECTs. */
async function generarCodigosVoucherUnicos(tx: EjecutorTx, cantidad: number): Promise<string[]> {
    const generados = new Set<string>();
    while (generados.size < cantidad) {
        const codigo = generarCodigoVoucher();
        if (generados.has(codigo)) continue;
        const [existe] = await tx
            .select({ id: vouchersCanje.id })
            .from(vouchersCanje)
            .where(eq(vouchersCanje.codigo, codigo))
            .limit(1);
        if (!existe) generados.add(codigo);
    }
    return [...generados];
}

// ─── Clonado ────────────────────────────────────────────────────────────────────
/**
 * Clona el demo maestro completo a una copia nueva para `vendedorId`. TODO en una transacción, con
 * inserts POR LOTE. Devuelve las referencias de la copia. Asume que NO existe ya una copia del
 * vendedor (el caller la borra antes si es "reiniciar").
 */
async function clonarDesdeMaestro(tx: EjecutorTx, maestroId: string, vendedorId: string): Promise<RefCopia> {
    const [maestro] = await tx.select().from(negocios).where(eq(negocios.id, maestroId)).limit(1);
    if (!maestro) throw new DemoError('DEMO_MAESTRO_NO_CONFIGURADO', 'El demo maestro no existe');

    // 1) Usuario-sombra dueño de la copia (cuenta comercial sin login).
    const [sombra] = await tx
        .insert(usuarios)
        .values({
            nombre: 'Demo',
            apellidos: 'Business Studio',
            correo: `demo-vendedor-${vendedorId}@demo.anunciaya.local`,
            perfil: 'comercial',
            membresia: 1,
            contrasenaHash: null,
            correoVerificado: true,
            estado: 'activo',
            tieneModoComercial: true,
            modoActivo: 'comercial',
        })
        .returning();

    // 2) Negocio copia.
    const [copia] = await tx
        .insert(negocios)
        .values({
            usuarioId: sombra.id,
            nombre: maestro.nombre,
            descripcion: maestro.descripcion,
            sitioWeb: maestro.sitioWeb,
            logoUrl: maestro.logoUrl,
            activo: true,
            esBorrador: false,
            verificado: maestro.verificado,
            onboardingCompletado: true,
            participaPuntos: maestro.participaPuntos,
            estadoMembresia: 'al_corriente',
            estadoAdmin: 'activo',
            metodoCobro: 'manual',
            esDemo: true,
            demoTipo: 'copia',
            demoVendedorId: vendedorId,
            demoMaestroId: maestroId,
        })
        .returning();

    // 3) Enlazar usuario-sombra → negocio.
    await tx.update(usuarios).set({ negocioId: copia.id }).where(eq(usuarios.id, sombra.id));

    // 4) Sucursales (lote + mapa por índice).
    const sucs = await tx.select().from(negocioSucursales).where(eq(negocioSucursales.negocioId, maestroId));
    const mapSucursal = new Map<string, string>();
    let sucursalPrincipalId = '';
    if (sucs.length) {
        const nuevas = await tx
            .insert(negocioSucursales)
            .values(sucs.map((s) => ({
                negocioId: copia.id,
                nombre: s.nombre,
                esPrincipal: s.esPrincipal,
                direccion: s.direccion,
                ciudadId: s.ciudadId,
                estado: s.estado,
                ubicacion: s.ubicacion,
                telefono: s.telefono,
                whatsapp: s.whatsapp,
                activa: s.activa,
                correo: s.correo,
                fotoPerfil: s.fotoPerfil,
                portadaUrl: s.portadaUrl,
                redesSociales: s.redesSociales,
                tieneEnvioDomicilio: s.tieneEnvioDomicilio,
                tieneServicioDomicilio: s.tieneServicioDomicilio,
                calificacionPromedio: s.calificacionPromedio,
                totalCalificaciones: s.totalCalificaciones,
                totalLikes: s.totalLikes,
                totalVisitas: s.totalVisitas,
                zonaHoraria: s.zonaHoraria,
            })))
            .returning({ id: negocioSucursales.id });
        sucs.forEach((s, i) => {
            mapSucursal.set(s.id, nuevas[i].id);
            if (s.esPrincipal) sucursalPrincipalId = nuevas[i].id;
        });
        if (!sucursalPrincipalId) sucursalPrincipalId = nuevas[0].id;
    }
    const sucIdsMaestro = sucs.map((s) => s.id);

    // 5) Horarios (lote).
    if (sucIdsMaestro.length) {
        const horarios = await tx.select().from(negocioHorarios).where(inArray(negocioHorarios.sucursalId, sucIdsMaestro));
        const filas = horarios
            .filter((h) => mapSucursal.has(h.sucursalId))
            .map((h) => ({
                sucursalId: mapSucursal.get(h.sucursalId)!,
                diaSemana: h.diaSemana,
                abierto: h.abierto,
                horaApertura: h.horaApertura,
                horaCierre: h.horaCierre,
                comidaInicio: h.comidaInicio,
                comidaFin: h.comidaFin,
                tieneHorarioComida: h.tieneHorarioComida,
            }));
        if (filas.length) await tx.insert(negocioHorarios).values(filas);
    }

    // 6) Métodos de pago (lote).
    const metodos = await tx.select().from(negocioMetodosPago).where(eq(negocioMetodosPago.negocioId, maestroId));
    if (metodos.length) {
        await tx.insert(negocioMetodosPago).values(metodos.map((m) => ({
            negocioId: copia.id,
            sucursalId: m.sucursalId ? mapSucursal.get(m.sucursalId) ?? null : null,
            tipo: m.tipo,
            activo: m.activo,
            instrucciones: m.instrucciones,
        })));
    }

    // 7) Galería (lote).
    const galeria = await tx.select().from(negocioGaleria).where(eq(negocioGaleria.negocioId, maestroId));
    if (galeria.length) {
        await tx.insert(negocioGaleria).values(galeria.map((g) => ({
            negocioId: copia.id,
            sucursalId: g.sucursalId ? mapSucursal.get(g.sucursalId) ?? null : null,
            url: g.url,
            titulo: g.titulo,
            orden: g.orden,
        })));
    }

    // 8) Subcategorías (lote).
    const subcats = await tx.select().from(asignacionSubcategorias).where(eq(asignacionSubcategorias.negocioId, maestroId));
    if (subcats.length) {
        await tx.insert(asignacionSubcategorias).values(subcats.map((sc) => ({ negocioId: copia.id, subcategoriaId: sc.subcategoriaId })));
    }

    // 9) Artículos (lote + mapa por índice).
    const arts = await tx.select().from(articulos).where(eq(articulos.negocioId, maestroId));
    const mapArticulo = new Map<string, string>();
    if (arts.length) {
        const nuevos = await tx
            .insert(articulos)
            .values(arts.map((a) => ({
                negocioId: copia.id,
                tipo: a.tipo,
                nombre: a.nombre,
                descripcion: a.descripcion,
                categoria: a.categoria,
                sku: a.sku,
                precioBase: a.precioBase,
                precioDesde: a.precioDesde,
                imagenPrincipal: a.imagenPrincipal,
                imagenesAdicionales: a.imagenesAdicionales,
                requiereCita: a.requiereCita,
                duracionEstimada: a.duracionEstimada,
                disponible: a.disponible,
                destacado: a.destacado,
                orden: a.orden,
                totalVentas: a.totalVentas,
                totalReservas: a.totalReservas,
                totalVistas: a.totalVistas,
            })))
            .returning({ id: articulos.id });
        arts.forEach((a, i) => mapArticulo.set(a.id, nuevos[i].id));
    }

    // 10) Artículo↔sucursal (lote, remapeo doble).
    if (arts.length) {
        const artSucs = await tx.select().from(articuloSucursales).where(inArray(articuloSucursales.articuloId, arts.map((a) => a.id)));
        const filas = artSucs
            .map((as) => ({ articuloId: mapArticulo.get(as.articuloId), sucursalId: mapSucursal.get(as.sucursalId) }))
            .filter((f): f is { articuloId: string; sucursalId: string } => !!f.articuloId && !!f.sucursalId);
        if (filas.length) await tx.insert(articuloSucursales).values(filas);
    }

    // 11) Ofertas (lote).
    const ofs = await tx.select().from(ofertas).where(eq(ofertas.negocioId, maestroId));
    if (ofs.length) {
        await tx.insert(ofertas).values(ofs.map((o) => ({
            negocioId: copia.id,
            sucursalId: o.sucursalId ? mapSucursal.get(o.sucursalId) ?? null : null,
            articuloId: o.articuloId ? mapArticulo.get(o.articuloId) ?? null : null,
            titulo: o.titulo,
            descripcion: o.descripcion,
            imagen: o.imagen,
            tipo: o.tipo,
            valor: o.valor,
            compraMinima: o.compraMinima,
            fechaInicio: o.fechaInicio,
            fechaFin: o.fechaFin,
            limiteUsos: o.limiteUsos,
            usosActuales: o.usosActuales,
            activo: o.activo,
            visibilidad: o.visibilidad,
            limiteUsosPorUsuario: o.limiteUsosPorUsuario,
        })));
    }

    // 12) Recompensas (lote + mapa).
    const recs = await tx.select().from(recompensas).where(eq(recompensas.negocioId, maestroId));
    const mapRecompensa = new Map<string, string>();
    if (recs.length) {
        const nuevas = await tx
            .insert(recompensas)
            .values(recs.map((r) => ({
                negocioId: copia.id,
                nombre: r.nombre,
                descripcion: r.descripcion,
                puntosRequeridos: r.puntosRequeridos,
                imagenUrl: r.imagenUrl,
                stock: r.stock,
                requiereAprobacion: r.requiereAprobacion,
                activa: r.activa,
                orden: r.orden,
                tipo: r.tipo,
                numeroComprasRequeridas: r.numeroComprasRequeridas,
                requierePuntos: r.requierePuntos,
            })))
            .returning({ id: recompensas.id });
        recs.forEach((r, i) => mapRecompensa.set(r.id, nuevas[i].id));
    }

    // 13) Configuración de puntos (1:1).
    const [cfg] = await tx.select().from(puntosConfiguracion).where(eq(puntosConfiguracion.negocioId, maestroId)).limit(1);
    if (cfg) {
        await tx.insert(puntosConfiguracion).values({
            negocioId: copia.id,
            puntosPorPeso: cfg.puntosPorPeso,
            pesosOriginales: cfg.pesosOriginales,
            puntosOriginales: cfg.puntosOriginales,
            minimoCompra: cfg.minimoCompra,
            diasExpiracionPuntos: cfg.diasExpiracionPuntos,
            diasExpiracionVoucher: cfg.diasExpiracionVoucher,
            validarHorario: cfg.validarHorario,
            horarioInicio: cfg.horarioInicio,
            horarioFin: cfg.horarioFin,
            activo: cfg.activo,
            nivelesActivos: cfg.nivelesActivos,
            nivelBronceMin: cfg.nivelBronceMin,
            nivelBronceMax: cfg.nivelBronceMax,
            nivelBronceMultiplicador: cfg.nivelBronceMultiplicador,
            nivelBronceNombre: cfg.nivelBronceNombre,
            nivelPlataMin: cfg.nivelPlataMin,
            nivelPlataMax: cfg.nivelPlataMax,
            nivelPlataMultiplicador: cfg.nivelPlataMultiplicador,
            nivelPlataNombre: cfg.nivelPlataNombre,
            nivelOroMin: cfg.nivelOroMin,
            nivelOroMultiplicador: cfg.nivelOroMultiplicador,
            nivelOroNombre: cfg.nivelOroNombre,
        });
    }

    // 14) Billeteras (lote + mapa; clientes compartidos: usuario_id se conserva).
    const billeteras = await tx.select().from(puntosBilletera).where(eq(puntosBilletera.negocioId, maestroId));
    const mapBilletera = new Map<string, string>();
    if (billeteras.length) {
        const nuevas = await tx
            .insert(puntosBilletera)
            .values(billeteras.map((b) => ({
                usuarioId: b.usuarioId,
                negocioId: copia.id,
                puntosDisponibles: b.puntosDisponibles,
                puntosAcumuladosTotal: b.puntosAcumuladosTotal,
                puntosCanjeadosTotal: b.puntosCanjeadosTotal,
                puntosExpiradosTotal: b.puntosExpiradosTotal,
                ultimaActividad: b.ultimaActividad,
                nivelActual: b.nivelActual,
            })))
            .returning({ id: puntosBilletera.id });
        billeteras.forEach((b, i) => mapBilletera.set(b.id, nuevas[i].id));
    }

    // 15) Transacciones (lote + mapa; conservar created_at escalonado).
    const trans = await tx.select().from(puntosTransacciones).where(eq(puntosTransacciones.negocioId, maestroId));
    const mapTransaccion = new Map<string, string>();
    const filasTx: (typeof puntosTransacciones.$inferInsert)[] = [];
    const oldTxIds: string[] = [];
    for (const t of trans) {
        const nuevaBill = mapBilletera.get(t.billeteraId);
        const nuevaSuc = mapSucursal.get(t.sucursalId);
        if (!nuevaBill || !nuevaSuc) continue;
        filasTx.push({
            billeteraId: nuevaBill,
            negocioId: copia.id,
            empleadoId: null,
            sucursalId: nuevaSuc,
            clienteId: t.clienteId,
            montoCompra: t.montoCompra,
            puntosOtorgados: t.puntosOtorgados,
            numeroOrden: t.numeroOrden,
            tipo: t.tipo,
            estado: t.estado,
            confirmadoPorCliente: t.confirmadoPorCliente,
            createdAt: t.createdAt,
            montoEfectivo: t.montoEfectivo,
            montoTarjeta: t.montoTarjeta,
            montoTransferencia: t.montoTransferencia,
            turnoId: null,
            fotoTicketUrl: t.fotoTicketUrl,
            multiplicadorAplicado: t.multiplicadorAplicado,
            ofertaUsoId: null,
            nota: t.nota,
            concepto: t.concepto,
            recompensaSellosId: null,
        });
        oldTxIds.push(t.id);
    }
    if (filasTx.length) {
        const nuevas = await tx.insert(puntosTransacciones).values(filasTx).returning({ id: puntosTransacciones.id });
        nuevas.forEach((nt, i) => mapTransaccion.set(oldTxIds[i], nt.id));
    }

    // 16) Vouchers de canje (lote; regenerar códigos únicos + qrData).
    const vouchers = (await tx.select().from(vouchersCanje).where(eq(vouchersCanje.negocioId, maestroId)))
        .filter((v) => mapBilletera.has(v.billeteraId) && mapRecompensa.has(v.recompensaId));
    if (vouchers.length) {
        const codigos = await generarCodigosVoucherUnicos(tx, vouchers.length);
        await tx.insert(vouchersCanje).values(vouchers.map((v, i) => ({
            billeteraId: mapBilletera.get(v.billeteraId)!,
            recompensaId: mapRecompensa.get(v.recompensaId)!,
            usuarioId: v.usuarioId,
            negocioId: copia.id,
            codigo: codigos[i],
            qrData: JSON.stringify({ codigo: codigos[i] }),
            puntosUsados: v.puntosUsados,
            estado: v.estado,
            expiraAt: v.expiraAt,
            usadoAt: v.usadoAt,
            sucursalId: v.sucursalId ? mapSucursal.get(v.sucursalId) ?? null : null,
            createdAt: v.createdAt,
        })));
    }

    // 17) Progreso de recompensas (lote).
    const progresos = (await tx.select().from(recompensaProgreso).where(eq(recompensaProgreso.negocioId, maestroId)))
        .filter((p) => mapRecompensa.has(p.recompensaId));
    if (progresos.length) {
        await tx.insert(recompensaProgreso).values(progresos.map((p) => ({
            usuarioId: p.usuarioId,
            recompensaId: mapRecompensa.get(p.recompensaId)!,
            negocioId: copia.id,
            comprasAcumuladas: p.comprasAcumuladas,
            desbloqueada: p.desbloqueada,
            desbloqueadaAt: p.desbloqueadaAt,
            canjeada: p.canjeada,
            canjeadaAt: p.canjeadaAt,
        })));
    }

    // 18) Reseñas (lote; destino=copia; interacción remapeada).
    const opiniones = await tx
        .select()
        .from(resenas)
        .where(and(eq(resenas.destinoTipo, 'negocio'), eq(resenas.destinoId, maestroId)));
    if (opiniones.length) {
        await tx.insert(resenas).values(opiniones.map((op) => ({
            autorId: op.autorId,
            autorTipo: op.autorTipo,
            destinoTipo: 'negocio',
            destinoId: copia.id,
            rating: op.rating,
            texto: op.texto,
            interaccionTipo: op.interaccionTipo,
            interaccionId: (op.interaccionId && mapTransaccion.get(op.interaccionId)) || randomUUID(),
            sucursalId: op.sucursalId ? mapSucursal.get(op.sucursalId) ?? null : null,
            createdAt: op.createdAt,
        })));
    }

    // 19) Métricas por sucursal (upsert: un trigger ya crea la fila al insertar reseñas).
    if (sucIdsMaestro.length) {
        const mets = await tx
            .select()
            .from(metricasEntidad)
            .where(and(eq(metricasEntidad.entityType, 'sucursal'), inArray(metricasEntidad.entityId, sucIdsMaestro)));
        for (const me of mets) {
            const nuevaSuc = mapSucursal.get(me.entityId);
            if (!nuevaSuc) continue;
            await tx.insert(metricasEntidad).values({
                entityType: 'sucursal',
                entityId: nuevaSuc,
                totalLikes: me.totalLikes,
                promedioRating: me.promedioRating,
                totalResenas: me.totalResenas,
                totalViews: me.totalViews,
                totalClicks: me.totalClicks,
                totalShares: me.totalShares,
                totalMessages: me.totalMessages,
                totalFollows: me.totalFollows,
            }).onConflictDoUpdate({
                target: [metricasEntidad.entityType, metricasEntidad.entityId],
                set: {
                    totalLikes: me.totalLikes,
                    promedioRating: me.promedioRating,
                    totalResenas: me.totalResenas,
                    totalViews: me.totalViews,
                    totalClicks: me.totalClicks,
                    totalShares: me.totalShares,
                    totalMessages: me.totalMessages,
                    totalFollows: me.totalFollows,
                },
            });
        }
    }

    return { negocioId: copia.id, usuarioSombraId: sombra.id, sucursalPrincipalId };
}

// ─── Borrado de la copia (explícito, orden inverso) ───────────────────────────────
async function borrarCopiaDemo(tx: EjecutorTx, vendedorId: string): Promise<void> {
    const [copia] = await tx
        .select({ negocioId: negocios.id, usuarioSombraId: negocios.usuarioId })
        .from(negocios)
        .where(and(eq(negocios.demoTipo, 'copia'), eq(negocios.demoVendedorId, vendedorId)))
        .limit(1);
    if (!copia) return;

    const negocioId = copia.negocioId;
    const sucs = await tx
        .select({ id: negocioSucursales.id })
        .from(negocioSucursales)
        .where(eq(negocioSucursales.negocioId, negocioId));
    const sucIds = sucs.map((s) => s.id);
    const arts = await tx.select({ id: articulos.id }).from(articulos).where(eq(articulos.negocioId, negocioId));
    const artIds = arts.map((a) => a.id);

    // Actividad simulada (hojas primero).
    await tx.delete(vouchersCanje).where(eq(vouchersCanje.negocioId, negocioId));
    await tx.delete(puntosTransacciones).where(eq(puntosTransacciones.negocioId, negocioId));
    await tx.delete(recompensaProgreso).where(eq(recompensaProgreso.negocioId, negocioId));
    await tx.delete(puntosBilletera).where(eq(puntosBilletera.negocioId, negocioId));
    await tx.delete(resenas).where(and(eq(resenas.destinoTipo, 'negocio'), eq(resenas.destinoId, negocioId)));
    if (sucIds.length) {
        await tx.delete(metricasEntidad).where(and(eq(metricasEntidad.entityType, 'sucursal'), inArray(metricasEntidad.entityId, sucIds)));
        await tx.delete(negocioHorarios).where(inArray(negocioHorarios.sucursalId, sucIds));
    }

    // Catálogo / configuración.
    await tx.delete(ofertas).where(eq(ofertas.negocioId, negocioId));
    if (artIds.length) {
        await tx.delete(articuloSucursales).where(inArray(articuloSucursales.articuloId, artIds));
    }
    await tx.delete(articulos).where(eq(articulos.negocioId, negocioId));
    await tx.delete(recompensas).where(eq(recompensas.negocioId, negocioId));
    await tx.delete(puntosConfiguracion).where(eq(puntosConfiguracion.negocioId, negocioId));
    await tx.delete(negocioGaleria).where(eq(negocioGaleria.negocioId, negocioId));
    await tx.delete(negocioMetodosPago).where(eq(negocioMetodosPago.negocioId, negocioId));
    await tx.delete(asignacionSubcategorias).where(eq(asignacionSubcategorias.negocioId, negocioId));

    // Estructura raíz.
    await tx.delete(negocioSucursales).where(eq(negocioSucursales.negocioId, negocioId));
    await tx.update(usuarios).set({ negocioId: null }).where(eq(usuarios.id, copia.usuarioSombraId));
    await tx.delete(negocios).where(eq(negocios.id, negocioId));
    // Por último el usuario-sombra (los clientes sintéticos compartidos NO se tocan).
    await tx.delete(usuarios).where(eq(usuarios.id, copia.usuarioSombraId));
}

// ─── API pública del service ──────────────────────────────────────────────────────

export async function obtenerEstadoDemo(vendedorId: string): Promise<{
    existeCopia: boolean;
    creadaAt: string | null;
    hayMaestro: boolean;
}> {
    const maestroId = await obtenerMaestroId();
    const [copia] = await db
        .select({ creadaAt: negocios.createdAt })
        .from(negocios)
        .where(and(eq(negocios.demoTipo, 'copia'), eq(negocios.demoVendedorId, vendedorId)))
        .limit(1);
    return {
        existeCopia: !!copia,
        creadaAt: copia?.creadaAt ?? null,
        hayMaestro: !!maestroId,
    };
}

/** Crea-o-reutiliza la copia del vendedor y devuelve un handoff token para entrar a BS. */
export async function abrirDemo(vendedorId: string): Promise<RefCopia & { handoffToken: string }> {
    const maestroId = await obtenerMaestroId();
    if (!maestroId) {
        throw new DemoError('DEMO_MAESTRO_NO_CONFIGURADO', 'El demo maestro aún no está configurado');
    }
    let copia = await buscarCopia(vendedorId);
    if (!copia) {
        copia = await db.transaction((tx) => clonarDesdeMaestro(tx, maestroId, vendedorId));
    }
    const handoffToken = randomUUID();
    await guardarHandoffDemo(handoffToken, {
        usuarioSombraId: copia.usuarioSombraId,
        vendedorRealId: vendedorId,
        negocioId: copia.negocioId,
        sucursalPrincipalId: copia.sucursalPrincipalId,
    });
    return { ...copia, handoffToken };
}

/** Borra la copia del vendedor (si existe) y la regenera fresca desde el maestro. */
export async function reiniciarDemo(vendedorId: string): Promise<RefCopia & { handoffToken: string }> {
    const maestroId = await obtenerMaestroId();
    if (!maestroId) {
        throw new DemoError('DEMO_MAESTRO_NO_CONFIGURADO', 'El demo maestro aún no está configurado');
    }
    const copia = await db.transaction(async (tx) => {
        await borrarCopiaDemo(tx, vendedorId);
        return clonarDesdeMaestro(tx, maestroId, vendedorId);
    });
    const handoffToken = randomUUID();
    await guardarHandoffDemo(handoffToken, {
        usuarioSombraId: copia.usuarioSombraId,
        vendedorRealId: vendedorId,
        negocioId: copia.negocioId,
        sucursalPrincipalId: copia.sucursalPrincipalId,
    });
    return { ...copia, handoffToken };
}
