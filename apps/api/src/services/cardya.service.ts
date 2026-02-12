/**
 * cardya.service.ts
 * =================
 * Servicio principal del módulo CardYA (Cliente)
 * 
 * Ubicación: apps/api/src/services/cardya.service.ts
 */
import { emitirEvento } from '../socket.js';
import { db } from '../db/index.js';
import {
  puntosBilletera,
  puntosConfiguracion,
  puntosTransacciones,
  recompensas,
  vouchersCanje,
  negocios,
  negocioSucursales,
  empleados,
  scanyaTurnos,
  usuarios,
} from '../db/schemas/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import type {
  RespuestaServicio,
  BilleteraNegocio,
  DetalleNegocioBilletera,
  ProgresoNivel,
  TransaccionResumen,
  RecompensaDisponible,
  Voucher,
  HistorialCompra,
  HistorialCanje,
  FiltrosHistorialCompras,
  FiltrosHistorialCanjes,
  FiltrosRecompensas,
  FiltrosVouchers,
} from '../types/cardya.types.js';
import { crearNotificacion, obtenerSucursalPrincipal, notificarNegocioCompleto } from './notificaciones.service.js';

// =============================================================================
// BILLETERAS Y PUNTOS
// =============================================================================

export async function obtenerBilleterasPorUsuario(
  usuarioId: string
): Promise<RespuestaServicio<BilleteraNegocio[]>> {
  try {
    const billeteras = await db
      .select({
        negocioId: puntosBilletera.negocioId,
        puntosDisponibles: puntosBilletera.puntosDisponibles,
        puntosAcumuladosTotal: puntosBilletera.puntosAcumuladosTotal,
        puntosCanjeadosTotal: puntosBilletera.puntosCanjeadosTotal,
        nivelActual: puntosBilletera.nivelActual,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
        nivelesActivos: puntosConfiguracion.nivelesActivos,
        nivelBronceMin: puntosConfiguracion.nivelBronceMin,
        nivelBronceMax: puntosConfiguracion.nivelBronceMax,
        nivelBronceMultiplicador: puntosConfiguracion.nivelBronceMultiplicador,
        nivelPlataMin: puntosConfiguracion.nivelPlataMin,
        nivelPlataMax: puntosConfiguracion.nivelPlataMax,
        nivelPlataMultiplicador: puntosConfiguracion.nivelPlataMultiplicador,
        nivelOroMin: puntosConfiguracion.nivelOroMin,
        nivelOroMultiplicador: puntosConfiguracion.nivelOroMultiplicador,
      })
      .from(puntosBilletera)
      .innerJoin(negocios, eq(puntosBilletera.negocioId, negocios.id))
      .leftJoin(puntosConfiguracion, eq(puntosBilletera.negocioId, puntosConfiguracion.negocioId))
      .where(eq(puntosBilletera.usuarioId, usuarioId))
      .orderBy(desc(puntosBilletera.puntosDisponibles));

    const billeterasFormateadas: BilleteraNegocio[] = billeteras.map((b) => {
      const progreso = calcularProgresoNivel(
        b.puntosAcumuladosTotal,
        b.nivelActual ?? 'bronce',
        {
          bronce: {
            min: b.nivelBronceMin ?? 0,
            max: b.nivelBronceMax ?? 999,
            multiplicador: parseFloat(b.nivelBronceMultiplicador ?? '1.0'),
          },
          plata: {
            min: b.nivelPlataMin ?? 1000,
            max: b.nivelPlataMax ?? 4999,
            multiplicador: parseFloat(b.nivelPlataMultiplicador ?? '1.2'),
          },
          oro: {
            min: b.nivelOroMin ?? 5000,
            multiplicador: parseFloat(b.nivelOroMultiplicador ?? '1.5'),
          },
        }
      );

      let multiplicador = 1.0;
      if (b.nivelActual === 'bronce') multiplicador = parseFloat(b.nivelBronceMultiplicador ?? '1.0');
      else if (b.nivelActual === 'plata') multiplicador = parseFloat(b.nivelPlataMultiplicador ?? '1.2');
      else if (b.nivelActual === 'oro') multiplicador = parseFloat(b.nivelOroMultiplicador ?? '1.5');

      return {
        negocioId: b.negocioId,
        negocioNombre: b.negocioNombre,
        negocioLogo: b.negocioLogo,
        puntosDisponibles: b.puntosDisponibles,
        puntosAcumuladosTotal: b.puntosAcumuladosTotal,
        puntosCanjeadosTotal: b.puntosCanjeadosTotal,
        nivelActual: (b.nivelActual ?? 'bronce') as 'bronce' | 'plata' | 'oro',
        multiplicador,
        progreso,
      };
    });

    return {
      success: true,
      message: 'Billeteras obtenidas correctamente',
      data: billeterasFormateadas,
    };
  } catch (error) {
    console.error('Error en obtenerBilleterasPorUsuario:', error);
    return { success: false, message: 'Error al obtener billeteras', code: 500 };
  }
}

export async function obtenerDetalleNegocioBilletera(
  usuarioId: string,
  negocioId: string
): Promise<RespuestaServicio<DetalleNegocioBilletera>> {
  try {
    const resultado = await db
      .select({
        puntosDisponibles: puntosBilletera.puntosDisponibles,
        puntosAcumuladosTotal: puntosBilletera.puntosAcumuladosTotal,
        puntosCanjeadosTotal: puntosBilletera.puntosCanjeadosTotal,
        nivelActual: puntosBilletera.nivelActual,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
        nivelesActivos: puntosConfiguracion.nivelesActivos,
        nivelBronceMin: puntosConfiguracion.nivelBronceMin,
        nivelBronceMax: puntosConfiguracion.nivelBronceMax,
        nivelBronceMultiplicador: puntosConfiguracion.nivelBronceMultiplicador,
        nivelPlataMin: puntosConfiguracion.nivelPlataMin,
        nivelPlataMax: puntosConfiguracion.nivelPlataMax,
        nivelPlataMultiplicador: puntosConfiguracion.nivelPlataMultiplicador,
        nivelOroMin: puntosConfiguracion.nivelOroMin,
        nivelOroMultiplicador: puntosConfiguracion.nivelOroMultiplicador,
      })
      .from(puntosBilletera)
      .innerJoin(negocios, eq(puntosBilletera.negocioId, negocios.id))
      .leftJoin(puntosConfiguracion, eq(puntosBilletera.negocioId, puntosConfiguracion.negocioId))
      .where(and(
        eq(puntosBilletera.usuarioId, usuarioId),
        eq(puntosBilletera.negocioId, negocioId)
      ))
      .limit(1);

    if (resultado.length === 0) {
      return { success: false, message: 'No tienes puntos en este negocio', code: 404 };
    }

    const billetera = resultado[0];

    const transaccionesCompras = await db
      .select({
        id: puntosTransacciones.id,
        montoCompra: puntosTransacciones.montoCompra,
        puntosOtorgados: puntosTransacciones.puntosOtorgados,
        createdAt: puntosTransacciones.createdAt,
      })
      .from(puntosTransacciones)
      .where(and(
        eq(puntosTransacciones.clienteId, usuarioId),
        eq(puntosTransacciones.negocioId, negocioId),
        eq(puntosTransacciones.estado, 'confirmado')
      ))
      .orderBy(desc(puntosTransacciones.createdAt))
      .limit(5);

    const transaccionesCanjes = await db
      .select({
        id: vouchersCanje.id,
        recompensaNombre: recompensas.nombre,
        puntosUsados: vouchersCanje.puntosUsados,
        createdAt: vouchersCanje.createdAt,
      })
      .from(vouchersCanje)
      .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
      .where(and(
        eq(vouchersCanje.usuarioId, usuarioId),
        eq(vouchersCanje.negocioId, negocioId),
        eq(vouchersCanje.estado, 'usado')
      ))
      .orderBy(desc(vouchersCanje.createdAt))
      .limit(5);

    const transaccionesResumen: TransaccionResumen[] = [
      ...transaccionesCompras.map((t) => ({
        id: t.id,
        tipo: 'compra' as const,
        monto: parseFloat(t.montoCompra),
        puntos: t.puntosOtorgados,
        createdAt: t.createdAt ?? new Date().toISOString(),
        descripcion: null,
      })),
      ...transaccionesCanjes.map((t) => ({
        id: t.id,
        tipo: 'canje' as const,
        monto: 0,
        puntos: -t.puntosUsados,
        createdAt: t.createdAt ?? new Date().toISOString(),
        descripcion: t.recompensaNombre,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const sucursalPrincipal = await db
      .select({
        telefono: negocioSucursales.telefono,
        whatsapp: negocioSucursales.whatsapp,
      })
      .from(negocioSucursales)
      .where(and(
        eq(negocioSucursales.negocioId, negocioId),
        eq(negocioSucursales.esPrincipal, true)
      ))
      .limit(1);

    const progreso = calcularProgresoNivel(
      billetera.puntosAcumuladosTotal,
      billetera.nivelActual ?? 'bronce',
      {
        bronce: {
          min: billetera.nivelBronceMin ?? 0,
          max: billetera.nivelBronceMax ?? 999,
          multiplicador: parseFloat(billetera.nivelBronceMultiplicador ?? '1.0'),
        },
        plata: {
          min: billetera.nivelPlataMin ?? 1000,
          max: billetera.nivelPlataMax ?? 4999,
          multiplicador: parseFloat(billetera.nivelPlataMultiplicador ?? '1.2'),
        },
        oro: {
          min: billetera.nivelOroMin ?? 5000,
          multiplicador: parseFloat(billetera.nivelOroMultiplicador ?? '1.5'),
        },
      }
    );

    let multiplicador = 1.0;
    if (billetera.nivelActual === 'bronce') multiplicador = parseFloat(billetera.nivelBronceMultiplicador ?? '1.0');
    else if (billetera.nivelActual === 'plata') multiplicador = parseFloat(billetera.nivelPlataMultiplicador ?? '1.2');
    else if (billetera.nivelActual === 'oro') multiplicador = parseFloat(billetera.nivelOroMultiplicador ?? '1.5');

    const beneficios: string[] = [];
    if (multiplicador > 1.0) beneficios.push(`Multiplicador x${multiplicador.toFixed(1)}`);

    const detalle: DetalleNegocioBilletera = {
      negocioId,
      negocioNombre: billetera.negocioNombre,
      negocioLogo: billetera.negocioLogo,
      puntosDisponibles: billetera.puntosDisponibles,
      puntosAcumuladosTotal: billetera.puntosAcumuladosTotal,
      puntosCanjeadosTotal: billetera.puntosCanjeadosTotal,
      nivelActual: (billetera.nivelActual ?? 'bronce') as 'bronce' | 'plata' | 'oro',
      multiplicador,
      progreso,
      beneficios,
      ultimasTransacciones: transaccionesResumen,
      telefonoContacto: sucursalPrincipal[0]?.telefono ?? null,
      whatsappContacto: sucursalPrincipal[0]?.whatsapp ?? null,
    };

    return { success: true, message: 'Detalle obtenido correctamente', data: detalle };
  } catch (error) {
    console.error('Error en obtenerDetalleNegocioBilletera:', error);
    return { success: false, message: 'Error al obtener detalle del negocio', code: 500 };
  }
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

export async function obtenerRecompensasDisponibles(
  usuarioId: string,
  filtros?: FiltrosRecompensas
): Promise<RespuestaServicio<RecompensaDisponible[]>> {
  try {
    let query = db
      .select({
        id: recompensas.id,
        negocioId: recompensas.negocioId,
        nombre: recompensas.nombre,
        descripcion: recompensas.descripcion,
        imagenUrl: recompensas.imagenUrl,
        puntosRequeridos: recompensas.puntosRequeridos,
        stock: recompensas.stock,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
        puntosDisponibles: puntosBilletera.puntosDisponibles,
      })
      .from(recompensas)
      .innerJoin(negocios, eq(recompensas.negocioId, negocios.id))
      .leftJoin(
        puntosBilletera,
        and(
          eq(puntosBilletera.negocioId, recompensas.negocioId),
          eq(puntosBilletera.usuarioId, usuarioId)
        )
      )
      .where(eq(recompensas.activa, true))
      .$dynamic();

    if (filtros?.negocioId) {
      query = query.where(eq(recompensas.negocioId, filtros.negocioId));
    }

    const resultados = await query.orderBy(recompensas.orden, recompensas.puntosRequeridos);

    const recompensasFormateadas: RecompensaDisponible[] = resultados
      .map((r) => {
        const puntosUsuario = r.puntosDisponibles ?? 0;
        const tienesPuntosSuficientes = puntosUsuario >= r.puntosRequeridos;
        const puntosFaltantes = tienesPuntosSuficientes ? 0 : r.puntosRequeridos - puntosUsuario;
        const estaAgotada = r.stock !== null && r.stock <= 0;

        return {
          id: r.id,
          negocioId: r.negocioId,
          negocioNombre: r.negocioNombre,
          negocioLogo: r.negocioLogo,
          nombre: r.nombre,
          descripcion: r.descripcion,
          imagenUrl: r.imagenUrl,
          puntosRequeridos: r.puntosRequeridos,
          stock: r.stock,
          tienesPuntosSuficientes,
          puntosFaltantes,
          estaAgotada,
        };
      })
      .filter((r) => {
        if (filtros?.soloDisponibles) {
          return !r.estaAgotada && r.tienesPuntosSuficientes;
        }
        return true;
      });

    return { success: true, message: 'Recompensas obtenidas correctamente', data: recompensasFormateadas };
  } catch (error) {
    console.error('Error en obtenerRecompensasDisponibles:', error);
    return { success: false, message: 'Error al obtener recompensas', code: 500 };
  }
}

// =============================================================================
// VOUCHERS
// =============================================================================

export async function generarVoucher(
  usuarioId: string,
  recompensaId: string
): Promise<RespuestaServicio<Voucher>> {
  try {
    const recompensa = await db
      .select()
      .from(recompensas)
      .where(eq(recompensas.id, recompensaId))
      .limit(1);

    if (recompensa.length === 0) {
      return { success: false, message: 'Recompensa no encontrada', code: 404 };
    }

    const recomp = recompensa[0];

    if (!recomp.activa) {
      return { success: false, message: 'Esta recompensa no está disponible', code: 400 };
    }

    if (recomp.stock !== null && recomp.stock <= 0) {
      return { success: false, message: 'Recompensa agotada', code: 400 };
    }

    const billetera = await db
      .select()
      .from(puntosBilletera)
      .where(and(
        eq(puntosBilletera.usuarioId, usuarioId),
        eq(puntosBilletera.negocioId, recomp.negocioId)
      ))
      .limit(1);

    if (billetera.length === 0) {
      return { success: false, message: 'No tienes puntos en este negocio', code: 400 };
    }

    const bill = billetera[0];

    if (bill.puntosDisponibles < recomp.puntosRequeridos) {
      return {
        success: false,
        message: `Te faltan ${recomp.puntosRequeridos - bill.puntosDisponibles} puntos`,
        code: 400
      };
    }

    const config = await db
      .select({ diasExpiracionVoucher: puntosConfiguracion.diasExpiracionVoucher })
      .from(puntosConfiguracion)
      .where(eq(puntosConfiguracion.negocioId, recomp.negocioId))
      .limit(1);

    const diasExpiracion = config[0]?.diasExpiracionVoucher ?? 30;
    const codigo = generarCodigoVoucher();
    const expiraAt = new Date();
    expiraAt.setDate(expiraAt.getDate() + diasExpiracion);

    const resultado = await db.transaction(async (tx) => {
      await tx
        .update(puntosBilletera)
        .set({
          puntosDisponibles: sql`${puntosBilletera.puntosDisponibles} - ${recomp.puntosRequeridos}`,
          puntosCanjeadosTotal: sql`${puntosBilletera.puntosCanjeadosTotal} + ${recomp.puntosRequeridos}`,
        })
        .where(eq(puntosBilletera.id, bill.id));

      if (recomp.stock !== null) {
        await tx
          .update(recompensas)
          .set({ stock: sql`${recompensas.stock} - 1` })
          .where(eq(recompensas.id, recompensaId));
      }

      const nuevoVoucher = await tx
        .insert(vouchersCanje)
        .values({
          billeteraId: bill.id,
          recompensaId: recompensaId,
          usuarioId: usuarioId,
          negocioId: recomp.negocioId,
          sucursalId: null, // ✅ NULL = voucher libre
          codigo: codigo,
          qrData: JSON.stringify({ codigo, recompensaId, usuarioId }),
          puntosUsados: recomp.puntosRequeridos,
          estado: 'pendiente',
          expiraAt: expiraAt.toISOString(),
        })
        .returning();

      return nuevoVoucher[0];
    });

    const negocio = await db
      .select({ nombre: negocios.nombre, logo: negocios.logoUrl })
      .from(negocios)
      .where(eq(negocios.id, recomp.negocioId))
      .limit(1);

    const voucherCompleto: Voucher = {
      id: resultado.id,
      codigo: resultado.codigo,
      qrData: resultado.qrData,
      recompensaId: recompensaId,
      recompensaNombre: recomp.nombre,
      recompensaImagen: recomp.imagenUrl,
      negocioId: recomp.negocioId,
      negocioNombre: negocio[0]?.nombre ?? '',
      negocioLogo: negocio[0]?.logo ?? null,
      canjeadoPorNombre: null,
      puntosUsados: resultado.puntosUsados,
      estado: resultado.estado as 'pendiente',
      expiraAt: resultado.expiraAt,
      usadoAt: resultado.usadoAt,
      createdAt: resultado.createdAt ?? new Date().toISOString(),
    };

    // Emitir stock actualizado a todos los clientes conectados
    if (recomp.stock !== null) {
      emitirEvento('recompensa:stock-actualizado', {
        recompensaId,
        nuevoStock: recomp.stock - 1,
      });
    }

    // Obtener sucursal principal para notificaciones
    const sucursalPrincipalId = await obtenerSucursalPrincipal(recomp.negocioId);

    // Notificar al dueño si el stock está bajo (menos de 5)
    if (recomp.stock !== null && recomp.stock - 1 <= 5 && recomp.stock - 1 > 0) {
      const [negocioDuenoStock] = await db
        .select({ usuarioId: negocios.usuarioId })
        .from(negocios)
        .where(eq(negocios.id, recomp.negocioId))
        .limit(1);

      if (negocioDuenoStock) {
        crearNotificacion({
          usuarioId: negocioDuenoStock.usuarioId,
          modo: 'comercial',
          tipo: 'stock_bajo',
          titulo: `¡Stock bajo! Quedan ${recomp.stock - 1}`,
          mensaje: `La recompensa "${recomp.nombre}" se está agotando`,
          negocioId: recomp.negocioId,
          sucursalId: sucursalPrincipalId ?? undefined,
          referenciaId: recompensaId,
          referenciaTipo: 'recompensa',
          icono: '⚠️',
        }).catch((err) => console.error('Error notificación stock bajo:', err));
      }
    }

    // Notificar si se agotó
    if (recomp.stock !== null && recomp.stock - 1 === 0) {
      const [negocioDuenoAgotado] = await db
        .select({ usuarioId: negocios.usuarioId })
        .from(negocios)
        .where(eq(negocios.id, recomp.negocioId))
        .limit(1);

      if (negocioDuenoAgotado) {
        crearNotificacion({
          usuarioId: negocioDuenoAgotado.usuarioId,
          modo: 'comercial',
          tipo: 'stock_bajo',
          titulo: '¡Recompensa agotada!',
          mensaje: `"${recomp.nombre}" ya no tiene stock disponible`,
          negocioId: recomp.negocioId,
          sucursalId: sucursalPrincipalId ?? undefined,
          referenciaId: recompensaId,
          referenciaTipo: 'recompensa',
          icono: '🚫',
        }).catch((err) => console.error('Error notificación agotada:', err));
      }
    }

    // Notificar al cliente (voucher generado)
    crearNotificacion({
      usuarioId,
      modo: 'personal',
      tipo: 'voucher_generado',
      titulo: '¡Recompensa canjeada!',
      mensaje: `Canjeaste: ${recomp.nombre} en ${negocio[0]?.nombre ?? 'un negocio'}`,
      negocioId: recomp.negocioId,
      sucursalId: sucursalPrincipalId ?? undefined,
      referenciaId: resultado.id,
      referenciaTipo: 'voucher',
      icono: '🎟️',
    }).catch((err) => console.error('Error notificación voucher generado:', err));

    // Notificar al dueño (voucher pendiente de entregar)
    const [negocioDueno] = await db
      .select({ usuarioId: negocios.usuarioId })
      .from(negocios)
      .where(eq(negocios.id, recomp.negocioId))
      .limit(1);

    if (negocioDueno) {
      crearNotificacion({
        usuarioId: negocioDueno.usuarioId,
        modo: 'comercial',
        tipo: 'voucher_pendiente',
        titulo: 'Nuevo voucher por entregar',
        mensaje: `Un cliente canjeó: ${recomp.nombre}`,
        negocioId: recomp.negocioId,
        sucursalId: sucursalPrincipalId ?? undefined,
        referenciaId: resultado.id,
        referenciaTipo: 'voucher',
        icono: '🎟️',
      }).catch((err) => console.error('Error notificación dueño voucher:', err));

      // Notificar a empleados de TODAS las sucursales (cualquiera puede entregar)
      notificarNegocioCompleto(recomp.negocioId, {
        modo: 'comercial',
        tipo: 'voucher_pendiente',
        titulo: 'Nuevo voucher por entregar',
        mensaje: `Un cliente canjeó: ${recomp.nombre}`,
        negocioId: recomp.negocioId,
        referenciaId: resultado.id,
        referenciaTipo: 'voucher',
        icono: '🎟️',
      }).catch((err) => console.error('Error notificación empleados voucher:', err));
    }

    return {
      success: true,
      message: '¡Recompensa canjeada! Muestra el código en el negocio',
      data: voucherCompleto
    };
  } catch (error) {
    console.error('Error en generarVoucher:', error);
    return { success: false, message: 'Error al canjear recompensa', code: 500 };
  }
}

export async function obtenerVouchersPorUsuario(
  usuarioId: string,
  filtros?: FiltrosVouchers
): Promise<RespuestaServicio<Voucher[]>> {
  try {
    let query = db
      .select({
        id: vouchersCanje.id,
        codigo: vouchersCanje.codigo,
        qrData: vouchersCanje.qrData,
        puntosUsados: vouchersCanje.puntosUsados,
        estado: vouchersCanje.estado,
        expiraAt: vouchersCanje.expiraAt,
        usadoAt: vouchersCanje.usadoAt,
        createdAt: vouchersCanje.createdAt,
        recompensaId: recompensas.id,
        recompensaNombre: recompensas.nombre,
        recompensaImagen: recompensas.imagenUrl,
        usadoPorEmpleadoId: vouchersCanje.usadoPorEmpleadoId,
        usadoPorUsuarioId: vouchersCanje.usadoPorUsuarioId,
        negocioId: negocios.id,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
      })
      .from(vouchersCanje)
      .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
      .innerJoin(negocios, eq(vouchersCanje.negocioId, negocios.id))
      .where(eq(vouchersCanje.usuarioId, usuarioId))
      .$dynamic();

    if (filtros?.estado) {
      query = query.where(eq(vouchersCanje.estado, filtros.estado));
    }

    const resultados = await query.orderBy(desc(vouchersCanje.createdAt));

    const vouchersFormateados: Voucher[] = await Promise.all(
      resultados.map(async (v) => {
        let canjeadoPorNombre: string | null = null;

        if (v.usadoPorEmpleadoId) {
          const [emp] = await db
            .select({ nombre: empleados.nombre })
            .from(empleados)
            .where(eq(empleados.id, v.usadoPorEmpleadoId))
            .limit(1);
          canjeadoPorNombre = emp?.nombre || null;
        } else if (v.usadoPorUsuarioId) {
          const [usr] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos })
            .from(usuarios)
            .where(eq(usuarios.id, v.usadoPorUsuarioId))
            .limit(1);
          if (usr) {
            const primerApellido = usr.apellidos?.split(/\s+/)[0] || '';
            canjeadoPorNombre = `${usr.nombre} ${primerApellido}`.trim();
          }
        }

        return {
          id: v.id,
          codigo: v.codigo,
          qrData: v.qrData,
          recompensaId: v.recompensaId,
          recompensaNombre: v.recompensaNombre,
          recompensaImagen: v.recompensaImagen,
          negocioId: v.negocioId,
          negocioNombre: v.negocioNombre,
          negocioLogo: v.negocioLogo,
          puntosUsados: v.puntosUsados,
          estado: v.estado as 'pendiente' | 'usado' | 'expirado' | 'cancelado',
          expiraAt: v.expiraAt,
          usadoAt: v.usadoAt,
          createdAt: v.createdAt ?? new Date().toISOString(),
          canjeadoPorNombre,
        };
      })
    );

    return { success: true, message: 'Vouchers obtenidos correctamente', data: vouchersFormateados };
  } catch (error) {
    console.error('Error en obtenerVouchersPorUsuario:', error);
    return { success: false, message: 'Error al obtener vouchers', code: 500 };
  }
}

export async function cancelarVoucher(
  voucherId: string,
  usuarioId: string
): Promise<RespuestaServicio<void>> {
  try {
    const voucher = await db
      .select()
      .from(vouchersCanje)
      .where(eq(vouchersCanje.id, voucherId))
      .limit(1);

    if (voucher.length === 0) {
      return { success: false, message: 'Voucher no encontrado', code: 404 };
    }

    const v = voucher[0];

    if (v.usuarioId !== usuarioId) {
      return { success: false, message: 'Este voucher no te pertenece', code: 403 };
    }

    if (v.estado !== 'pendiente') {
      return { success: false, message: 'Solo puedes cancelar vouchers pendientes', code: 400 };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(puntosBilletera)
        .set({
          puntosDisponibles: sql`${puntosBilletera.puntosDisponibles} + ${v.puntosUsados}`,
          puntosCanjeadosTotal: sql`${puntosBilletera.puntosCanjeadosTotal} - ${v.puntosUsados}`,
        })
        .where(eq(puntosBilletera.id, v.billeteraId));

      const recompensa = await tx
        .select({ stock: recompensas.stock })
        .from(recompensas)
        .where(eq(recompensas.id, v.recompensaId))
        .limit(1);

      if (recompensa[0]?.stock !== null) {
        await tx
          .update(recompensas)
          .set({ stock: sql`${recompensas.stock} + 1` })
          .where(eq(recompensas.id, v.recompensaId));
      }

      await tx
        .update(vouchersCanje)
        .set({ estado: 'cancelado', usadoAt: new Date().toISOString() })
        .where(eq(vouchersCanje.id, voucherId));
    });

    return { success: true, message: `Voucher cancelado. Puntos devueltos: +${v.puntosUsados}` };
  } catch (error) {
    console.error('Error en cancelarVoucher:', error);
    return { success: false, message: 'Error al cancelar voucher', code: 500 };
  }
}

// =============================================================================
// HISTORIAL
// =============================================================================

export async function obtenerHistorialCompras(
  usuarioId: string,
  filtros?: FiltrosHistorialCompras
): Promise<RespuestaServicio<HistorialCompra[]>> {
  try {
    const limit = filtros?.limit ?? 1000;
    const offset = filtros?.offset ?? 0;

    let query = db
      .select({
        id: puntosTransacciones.id,
        montoCompra: puntosTransacciones.montoCompra,
        puntosOtorgados: puntosTransacciones.puntosOtorgados,
        multiplicadorAplicado: puntosTransacciones.multiplicadorAplicado,
        createdAt: puntosTransacciones.createdAt,
        negocioId: negocios.id,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
        sucursalId: negocioSucursales.id,
        sucursalNombre: negocioSucursales.nombre,
        concepto: puntosTransacciones.concepto,
        empleadoNombre: sql<string>`
        CASE
          WHEN ${puntosTransacciones.empleadoId} IS NOT NULL THEN
            ${empleados.nombre}
          WHEN ${puntosTransacciones.turnoId} IS NOT NULL THEN
            concat(turno_usuario.nombre, ' ', split_part(COALESCE(turno_usuario.apellidos, ''), ' ', 1))
          ELSE NULL
        END
      `,
      })
      .from(puntosTransacciones)
      .innerJoin(negocios, eq(puntosTransacciones.negocioId, negocios.id))
      .leftJoin(negocioSucursales, eq(puntosTransacciones.sucursalId, negocioSucursales.id))
      .leftJoin(empleados, eq(puntosTransacciones.empleadoId, empleados.id))
      .leftJoin(scanyaTurnos, eq(puntosTransacciones.turnoId, scanyaTurnos.id))
      .leftJoin(
        sql`usuarios AS turno_usuario`,
        sql`${scanyaTurnos.usuarioId} = turno_usuario.id`
      )
      .where(and(
        eq(puntosTransacciones.clienteId, usuarioId),
        eq(puntosTransacciones.estado, 'confirmado')
      ))
      .$dynamic();

    if (filtros?.negocioId) {
      query = query.where(eq(puntosTransacciones.negocioId, filtros.negocioId));
    }

    const resultados = await query
      .orderBy(desc(puntosTransacciones.createdAt))
      .limit(limit)
      .offset(offset);

    // Contar sucursales por negocio para ocultar cuando solo hay 1
    const negocioIds = [...new Set(resultados.map((h) => h.negocioId))];

    // Guard: si no hay resultados, no ejecutar la query (IN() vacío es SQL inválido)
    const sucursalesPorNegocio = new Map<string, number>();

    if (negocioIds.length > 0) {
      const conteoSucursales = await db
        .select({
          negocioId: negocioSucursales.negocioId,
          total: sql<number>`count(*)::int`,
        })
        .from(negocioSucursales)
        .where(sql`${negocioSucursales.negocioId} IN (${sql.join(negocioIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(negocioSucursales.negocioId);

      conteoSucursales.forEach((c) => sucursalesPorNegocio.set(c.negocioId, c.total));
    }

    const historialFormateado: HistorialCompra[] = resultados.map((h) => ({
      id: h.id,
      negocioId: h.negocioId,
      negocioNombre: h.negocioNombre,
      negocioLogo: h.negocioLogo,
      sucursalId: h.sucursalId,
      sucursalNombre: (sucursalesPorNegocio.get(h.negocioId) ?? 1) > 1 ? h.sucursalNombre : null,
      montoCompra: parseFloat(h.montoCompra),
      puntosOtorgados: h.puntosOtorgados,
      multiplicadorAplicado: parseFloat(h.multiplicadorAplicado ?? '1.0'),
      concepto: h.concepto ?? null,
      empleadoNombre: h.empleadoNombre,
      createdAt: h.createdAt ?? new Date().toISOString(),
    }));

    return { success: true, message: 'Historial obtenido correctamente', data: historialFormateado };
  } catch (error) {
    console.error('Error en obtenerHistorialCompras:', error);
    return { success: false, message: 'Error al obtener historial de compras', code: 500 };
  }
}

export async function obtenerHistorialCanjes(
  usuarioId: string,
  filtros?: FiltrosHistorialCanjes
): Promise<RespuestaServicio<HistorialCanje[]>> {
  try {
    const limit = filtros?.limit ?? 1000;
    const offset = filtros?.offset ?? 0;

    let query = db
      .select({
        id: vouchersCanje.id,
        puntosUsados: vouchersCanje.puntosUsados,
        estado: vouchersCanje.estado,
        createdAt: vouchersCanje.createdAt,
        usadoAt: vouchersCanje.usadoAt,
        recompensaId: recompensas.id,
        recompensaNombre: recompensas.nombre,
        recompensaImagen: recompensas.imagenUrl,
        negocioId: negocios.id,
        negocioNombre: negocios.nombre,
        negocioLogo: negocios.logoUrl,
        usadoPorEmpleadoId: vouchersCanje.usadoPorEmpleadoId,
        usadoPorUsuarioId: vouchersCanje.usadoPorUsuarioId,
      })
      .from(vouchersCanje)
      .innerJoin(recompensas, eq(vouchersCanje.recompensaId, recompensas.id))
      .innerJoin(negocios, eq(vouchersCanje.negocioId, negocios.id))
      .where(and(
        eq(vouchersCanje.usuarioId, usuarioId),
        eq(vouchersCanje.estado, 'usado')
      ))
      .$dynamic();

    if (filtros?.negocioId) {
      query = query.where(eq(vouchersCanje.negocioId, filtros.negocioId));
    }

    if (filtros?.estado) {
      query = query.where(eq(vouchersCanje.estado, filtros.estado));
    }

    const resultados = await query
      .orderBy(desc(vouchersCanje.createdAt))
      .limit(limit)
      .offset(offset);

    const historialFormateado = await Promise.all(
      resultados.map(async (h) => {
        let canjeadoPorNombre: string | null = null;

        if (h.usadoPorEmpleadoId) {
          const [emp] = await db
            .select({ nombre: empleados.nombre })
            .from(empleados)
            .where(eq(empleados.id, h.usadoPorEmpleadoId))
            .limit(1);
          canjeadoPorNombre = emp?.nombre || null;
        } else if (h.usadoPorUsuarioId) {
          const [usr] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos })
            .from(usuarios)
            .where(eq(usuarios.id, h.usadoPorUsuarioId))
            .limit(1);
          if (usr) {
            const primerApellido = usr.apellidos?.split(/\s+/)[0] || '';
            canjeadoPorNombre = `${usr.nombre} ${primerApellido}`.trim();
          }
        }

        return {
          id: h.id,
          recompensaId: h.recompensaId,
          recompensaNombre: h.recompensaNombre,
          recompensaImagen: h.recompensaImagen,
          negocioId: h.negocioId,
          negocioNombre: h.negocioNombre,
          negocioLogo: h.negocioLogo,
          puntosUsados: h.puntosUsados,
          estado: h.estado as 'usado' | 'cancelado',
          createdAt: h.createdAt ?? new Date().toISOString(),
          usadoAt: h.usadoAt,
          canjeadoPorNombre,
        };
      })
    );

    return { success: true, message: 'Historial obtenido correctamente', data: historialFormateado };
  } catch (error) {
    console.error('Error en obtenerHistorialCanjes:', error);
    return { success: false, message: 'Error al obtener historial de canjes', code: 500 };
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function calcularProgresoNivel(
  puntosActuales: number,
  nivelActual: string,
  config: {
    bronce: { min: number; max: number; multiplicador: number };
    plata: { min: number; max: number; multiplicador: number };
    oro: { min: number; multiplicador: number };
  }
): ProgresoNivel {
  let puntosMinNivel: number;
  let puntosMaxNivel: number | null;
  let siguienteNivel: 'plata' | 'oro' | null;

  if (nivelActual === 'bronce') {
    puntosMinNivel = config.bronce.min;
    puntosMaxNivel = config.bronce.max;
    siguienteNivel = 'plata';
  } else if (nivelActual === 'plata') {
    puntosMinNivel = config.plata.min;
    puntosMaxNivel = config.plata.max;
    siguienteNivel = 'oro';
  } else {
    puntosMinNivel = config.oro.min;
    puntosMaxNivel = null;
    siguienteNivel = null;
  }

  let porcentaje = 100;
  let puntosFaltantes: number | null = null;

  if (puntosMaxNivel !== null) {
    const rango = puntosMaxNivel - puntosMinNivel;
    const progreso = puntosActuales - puntosMinNivel;
    porcentaje = Math.min(100, Math.max(0, (progreso / rango) * 100));
    puntosFaltantes = Math.max(0, puntosMaxNivel + 1 - puntosActuales);
  }

  return {
    puntosActuales,
    puntosMinNivel,
    puntosMaxNivel,
    porcentaje: Math.round(porcentaje),
    puntosFaltantes,
    siguienteNivel,
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