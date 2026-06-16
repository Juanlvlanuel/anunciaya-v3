import { relations } from "drizzle-orm/relations";
// Tablas dinamicas (dinamicas, dinamicaPremios, dinamicaParticipaciones)
// removidas en Fase D del cleanup (visión v3 — abril 2026).
import { embajadores, usuarios, usuarioCodigosRespaldo, negocios, negocioSucursales, categoriasNegocio, subcategoriasNegocio, asignacionSubcategorias, negocioHorarios, negocioMetodosPago, negocioGaleria, articulos, articuloSucursales, empleados, empleadoHorarios, pedidos, pedidoArticulos, ofertas, ofertaUsos, ofertaUsuarios, planes, planReglas, votos, resenas, metricasUsuario, configuracionSistema, planesAnuncios, promocionesPagadas, promocionesTemporales, promocionesUsadas, embajadorComisiones, puntosConfiguracion, puntosBilletera, recompensas, puntosTransacciones, transaccionesEvidencia, vouchersCanje, alertasSeguridad, alertasConfiguracion, notificaciones, chatConversaciones, chatMensajes, chatReacciones, chatMensajesFijados, chatContactos, chatBloqueados } from "./schema";

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
	embajadore: one(embajadores, {
		fields: [usuarios.referidoPor],
		references: [embajadores.id],
		relationName: "usuarios_referidoPor_embajadores_id"
	}),
	negocio: one(negocios, {
		fields: [usuarios.negocioId],
		references: [negocios.id]
	}),
	usuarioCodigosRespaldos: many(usuarioCodigosRespaldo),
	negocios: many(negocios),
	pedidos: many(pedidos),
	ofertaUsos: many(ofertaUsos),
	ofertaUsuarios: many(ofertaUsuarios),
	planReglas: many(planReglas),
	votos: many(votos),
	resenas: many(resenas),
	metricasUsuarios: many(metricasUsuario),
	configuracionSistemas: many(configuracionSistema),
	promocionesPagadas: many(promocionesPagadas),
	promocionesTemporales: many(promocionesTemporales),
	promocionesUsadas: many(promocionesUsadas),
	embajadores: many(embajadores, {
		relationName: "embajadores_usuarioId_usuarios_id"
	}),
	empleados: many(empleados),
	puntosBilleteras: many(puntosBilletera),
	puntosTransacciones: many(puntosTransacciones),
	transaccionesRevocadas: many(puntosTransacciones, {
		relationName: "transacciones_revocadoPor_usuarios_id"
	}),
	vouchersCanjes: many(vouchersCanje),
	notificaciones: many(notificaciones),
	// ChatYA
	chatConversacionesComoP1: many(chatConversaciones, { relationName: "chatConv_p1" }),
	chatConversacionesComoP2: many(chatConversaciones, { relationName: "chatConv_p2" }),
	chatMensajes: many(chatMensajes),
	chatReacciones: many(chatReacciones),
	chatContactos: many(chatContactos, { relationName: "chatContactos_usuario" }),
	chatBloqueados: many(chatBloqueados, { relationName: "chatBloqueados_usuario" }),
}));

export const embajadoresRelations = relations(embajadores, ({ one, many }) => ({
	usuarios: many(usuarios, {
		relationName: "usuarios_referidoPor_embajadores_id"
	}),
	negocios: many(negocios),
	embajadorComisiones: many(embajadorComisiones),
	usuario: one(usuarios, {
		fields: [embajadores.usuarioId],
		references: [usuarios.id],
		relationName: "embajadores_usuarioId_usuarios_id"
	}),
}));

export const usuarioCodigosRespaldoRelations = relations(usuarioCodigosRespaldo, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [usuarioCodigosRespaldo.usuarioId],
		references: [usuarios.id]
	}),
}));

export const negociosRelations = relations(negocios, ({ one, many }) => ({
	embajadore: one(embajadores, {
		fields: [negocios.embajadorId],
		references: [embajadores.id]
	}),
	usuario: one(usuarios, {
		fields: [negocios.usuarioId],
		references: [usuarios.id]
	}),
	sucursales: many(negocioSucursales),
	negocioMetodosPagos: many(negocioMetodosPago),
	negocioGalerias: many(negocioGaleria),
	articulos: many(articulos),
	ofertas: many(ofertas),
	ofertaUsosList: many(ofertaUsos),
	embajadorComisiones: many(embajadorComisiones),
	puntosConfiguracions: many(puntosConfiguracion),
	puntosBilleteras: many(puntosBilletera),
	recompensas: many(recompensas),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
	alertasSeguridads: many(alertasSeguridad),
	alertasConfiguracions: many(alertasConfiguracion),
	asignacionSubcategorias: many(asignacionSubcategorias),
	notificaciones: many(notificaciones),
}));

export const negocioSucursalesRelations = relations(negocioSucursales, ({ one, many }) => ({
	negocio: one(negocios, {
		fields: [negocioSucursales.negocioId],
		references: [negocios.id]
	}),
	horarios: many(negocioHorarios),
	empleados: many(empleados),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
	// 🆕 AGREGAR ESTAS RELACIONES:
	pedidos: many(pedidos),
	resenas: many(resenas),
	ofertas: many(ofertas),
	ofertaUsosList: many(ofertaUsos),
	negocioGalerias: many(negocioGaleria),
	negocioMetodosPagos: many(negocioMetodosPago),
	articuloSucursales: many(articuloSucursales),
	alertasSeguridads: many(alertasSeguridad),
	// ChatYA
	chatConversacionesComoSucP1: many(chatConversaciones, { relationName: "chatConv_sucursalP1" }),
	chatConversacionesComoSucP2: many(chatConversaciones, { relationName: "chatConv_sucursalP2" }),
}));

export const categoriasNegocioRelations = relations(categoriasNegocio, ({ many }) => ({
	subcategorias: many(subcategoriasNegocio),
}));

export const subcategoriasNegocioRelations = relations(subcategoriasNegocio, ({ one, many }) => ({
	categoria: one(categoriasNegocio, {
		fields: [subcategoriasNegocio.categoriaId],
		references: [categoriasNegocio.id]
	}),
	asignaciones: many(asignacionSubcategorias),
}));

export const negocioHorariosRelations = relations(negocioHorarios, ({ one }) => ({
	sucursal: one(negocioSucursales, {
		fields: [negocioHorarios.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const negocioMetodosPagoRelations = relations(negocioMetodosPago, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioMetodosPago.negocioId],
		references: [negocios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [negocioMetodosPago.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const negocioGaleriaRelations = relations(negocioGaleria, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioGaleria.negocioId],
		references: [negocios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [negocioGaleria.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const articulosRelations = relations(articulos, ({ one, many }) => ({
	negocio: one(negocios, {
		fields: [articulos.negocioId],
		references: [negocios.id]
	}),
	ofertas: many(ofertas),
	articuloSucursales: many(articuloSucursales),
}));

export const articuloSucursalesRelations = relations(articuloSucursales, ({ one }) => ({
	articulo: one(articulos, {
		fields: [articuloSucursales.articuloId],
		references: [articulos.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [articuloSucursales.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const empleadosRelations = relations(empleados, ({ one, many }) => ({
	empleadoHorarios: many(empleadoHorarios),
	usuario: one(usuarios, {
		fields: [empleados.usuarioId],
		references: [usuarios.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [empleados.sucursalId],
		references: [negocioSucursales.id]
	}),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
	alertasSeguridads: many(alertasSeguridad),
	chatMensajes: many(chatMensajes),
}));

export const empleadoHorariosRelations = relations(empleadoHorarios, ({ one }) => ({
	empleado: one(empleados, {
		fields: [empleadoHorarios.empleadoId],
		references: [empleados.id]
	}),
}));

export const pedidoArticulosRelations = relations(pedidoArticulos, ({ one }) => ({
	pedido: one(pedidos, {
		fields: [pedidoArticulos.pedidoId],
		references: [pedidos.id]
	}),
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
	pedidoArticulos: many(pedidoArticulos),
	oferta: one(ofertas, {
		fields: [pedidos.ofertaId],
		references: [ofertas.id]
	}),
	usuario: one(usuarios, {
		fields: [pedidos.compradorId],
		references: [usuarios.id]
	}),
	// 🆕 AGREGAR ESTAS 2 RELACIONES:
	sucursal: one(negocioSucursales, {
		fields: [pedidos.sucursalId],
		references: [negocioSucursales.id]
	}),
	negocio: one(negocios, {
		fields: [pedidos.negocioId],
		references: [negocios.id]
	}),
}));

export const ofertasRelations = relations(ofertas, ({ one }) => ({
	articulo: one(articulos, {
		fields: [ofertas.articuloId],
		references: [articulos.id]
	}),
	negocio: one(negocios, {
		fields: [ofertas.negocioId],
		references: [negocios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [ofertas.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const ofertaUsosRelations = relations(ofertaUsos, ({ one }) => ({
	oferta: one(ofertas, {
		fields: [ofertaUsos.ofertaId],
		references: [ofertas.id]
	}),
	usuario: one(usuarios, {
		fields: [ofertaUsos.usuarioId],
		references: [usuarios.id]
	}),
}));

export const ofertaUsuariosRelations = relations(ofertaUsuarios, ({ one }) => ({
	oferta: one(ofertas, {
		fields: [ofertaUsuarios.ofertaId],
		references: [ofertas.id]
	}),
	usuario: one(usuarios, {
		fields: [ofertaUsuarios.usuarioId],
		references: [usuarios.id]
	}),
}));

export const planReglasRelations = relations(planReglas, ({ one }) => ({
	plane: one(planes, {
		fields: [planReglas.planId],
		references: [planes.id]
	}),
	usuario: one(usuarios, {
		fields: [planReglas.updatedBy],
		references: [usuarios.id]
	}),
}));

export const planesRelations = relations(planes, ({ many }) => ({
	planReglas: many(planReglas),
}));

export const votosRelations = relations(votos, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [votos.userId],
		references: [usuarios.id]
	}),
}));

export const resenasRelations = relations(resenas, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [resenas.autorId],
		references: [usuarios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [resenas.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

export const metricasUsuarioRelations = relations(metricasUsuario, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [metricasUsuario.userId],
		references: [usuarios.id]
	}),
}));

export const configuracionSistemaRelations = relations(configuracionSistema, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [configuracionSistema.actualizadoPor],
		references: [usuarios.id]
	}),
}));

export const promocionesPagadasRelations = relations(promocionesPagadas, ({ one }) => ({
	planesAnuncio: one(planesAnuncios, {
		fields: [promocionesPagadas.planAnuncioId],
		references: [planesAnuncios.id]
	}),
	usuario: one(usuarios, {
		fields: [promocionesPagadas.usuarioId],
		references: [usuarios.id]
	}),
}));

export const planesAnunciosRelations = relations(planesAnuncios, ({ many }) => ({
	promocionesPagadas: many(promocionesPagadas),
}));

export const promocionesTemporalesRelations = relations(promocionesTemporales, ({ one, many }) => ({
	usuario: one(usuarios, {
		fields: [promocionesTemporales.creadoPor],
		references: [usuarios.id]
	}),
	promocionesUsadas: many(promocionesUsadas),
}));

export const promocionesUsadasRelations = relations(promocionesUsadas, ({ one }) => ({
	promocionesTemporale: one(promocionesTemporales, {
		fields: [promocionesUsadas.promocionId],
		references: [promocionesTemporales.id]
	}),
	usuario: one(usuarios, {
		fields: [promocionesUsadas.usuarioId],
		references: [usuarios.id]
	}),
}));

export const embajadorComisionesRelations = relations(embajadorComisiones, ({ one }) => ({
	embajadore: one(embajadores, {
		fields: [embajadorComisiones.embajadorId],
		references: [embajadores.id]
	}),
	negocio: one(negocios, {
		fields: [embajadorComisiones.negocioId],
		references: [negocios.id]
	}),
}));

// dinamicaPremiosRelations / dinamicasRelations / dinamicaParticipacionesRelations
// removidas en Fase D del cleanup (visión v3 — abril 2026).

export const puntosConfiguracionRelations = relations(puntosConfiguracion, ({ one }) => ({
	negocio: one(negocios, {
		fields: [puntosConfiguracion.negocioId],
		references: [negocios.id]
	}),
}));

export const puntosBilleteraRelations = relations(puntosBilletera, ({ one, many }) => ({
	negocio: one(negocios, {
		fields: [puntosBilletera.negocioId],
		references: [negocios.id]
	}),
	usuario: one(usuarios, {
		fields: [puntosBilletera.usuarioId],
		references: [usuarios.id]
	}),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
}));

export const recompensasRelations = relations(recompensas, ({ one, many }) => ({
	negocio: one(negocios, {
		fields: [recompensas.negocioId],
		references: [negocios.id]
	}),
	vouchersCanjes: many(vouchersCanje),
}));

export const puntosTransaccionesRelations = relations(puntosTransacciones, ({ one, many }) => ({
	puntosBilletera: one(puntosBilletera, {
		fields: [puntosTransacciones.billeteraId],
		references: [puntosBilletera.id]
	}),
	usuario: one(usuarios, {
		fields: [puntosTransacciones.clienteId],
		references: [usuarios.id]
	}),
	empleado: one(empleados, {
		fields: [puntosTransacciones.empleadoId],
		references: [empleados.id]
	}),
	negocio: one(negocios, {
		fields: [puntosTransacciones.negocioId],
		references: [negocios.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [puntosTransacciones.sucursalId],
		references: [negocioSucursales.id]
	}),
	revocadoPorUsuario: one(usuarios, {
		fields: [puntosTransacciones.revocadoPor],
		references: [usuarios.id],
		relationName: "transacciones_revocadoPor_usuarios_id"
	}),
	transaccionesEvidencias: many(transaccionesEvidencia),
	alertasSeguridads: many(alertasSeguridad),
}));

export const transaccionesEvidenciaRelations = relations(transaccionesEvidencia, ({ one }) => ({
	puntosTransaccione: one(puntosTransacciones, {
		fields: [transaccionesEvidencia.transaccionId],
		references: [puntosTransacciones.id]
	}),
}));

export const vouchersCanjeRelations = relations(vouchersCanje, ({ one }) => ({
	puntosBilletera: one(puntosBilletera, {
		fields: [vouchersCanje.billeteraId],
		references: [puntosBilletera.id]
	}),
	empleado: one(empleados, {
		fields: [vouchersCanje.usadoPorEmpleadoId],
		references: [empleados.id]
	}),
	negocio: one(negocios, {
		fields: [vouchersCanje.negocioId],
		references: [negocios.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [vouchersCanje.sucursalId],
		references: [negocioSucursales.id]
	}),
	recompensa: one(recompensas, {
		fields: [vouchersCanje.recompensaId],
		references: [recompensas.id]
	}),
	usuario: one(usuarios, {
		fields: [vouchersCanje.usuarioId],
		references: [usuarios.id]
	}),
}));

export const alertasSeguridadRelations = relations(alertasSeguridad, ({ one }) => ({
	empleado: one(empleados, {
		fields: [alertasSeguridad.empleadoId],
		references: [empleados.id]
	}),
	negocio: one(negocios, {
		fields: [alertasSeguridad.negocioId],
		references: [negocios.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [alertasSeguridad.sucursalId],
		references: [negocioSucursales.id]
	}),
	puntosTransaccione: one(puntosTransacciones, {
		fields: [alertasSeguridad.transaccionId],
		references: [puntosTransacciones.id]
	}),
}));

export const alertasConfiguracionRelations = relations(alertasConfiguracion, ({ one }) => ({
	negocio: one(negocios, {
		fields: [alertasConfiguracion.negocioId],
		references: [negocios.id]
	}),
}));

export const asignacionSubcategoriasRelations = relations(asignacionSubcategorias, ({ one }) => ({
	negocio: one(negocios, {
		fields: [asignacionSubcategorias.negocioId],
		references: [negocios.id]
	}),
	subcategoria: one(subcategoriasNegocio, {
		fields: [asignacionSubcategorias.subcategoriaId],
		references: [subcategoriasNegocio.id]
	}),
}));

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [notificaciones.usuarioId],
		references: [usuarios.id],
	}),
	negocio: one(negocios, {
		fields: [notificaciones.negocioId],
		references: [negocios.id],
	}),
}));


// --- Conversaciones ---

export const chatConversacionesRelations = relations(chatConversaciones, ({ one, many }) => ({
	participante1: one(usuarios, {
		fields: [chatConversaciones.participante1Id],
		references: [usuarios.id],
		relationName: "chatConv_p1"
	}),
	participante2: one(usuarios, {
		fields: [chatConversaciones.participante2Id],
		references: [usuarios.id],
		relationName: "chatConv_p2"
	}),
	sucursalP1: one(negocioSucursales, {
		fields: [chatConversaciones.participante1SucursalId],
		references: [negocioSucursales.id],
		relationName: "chatConv_sucursalP1"
	}),
	sucursalP2: one(negocioSucursales, {
		fields: [chatConversaciones.participante2SucursalId],
		references: [negocioSucursales.id],
		relationName: "chatConv_sucursalP2"
	}),
	mensajes: many(chatMensajes),
	mensajesFijados: many(chatMensajesFijados),
}));

// --- Mensajes ---

export const chatMensajesRelations = relations(chatMensajes, ({ one, many }) => ({
	conversacion: one(chatConversaciones, {
		fields: [chatMensajes.conversacionId],
		references: [chatConversaciones.id]
	}),
	emisor: one(usuarios, {
		fields: [chatMensajes.emisorId],
		references: [usuarios.id]
	}),
	sucursal: one(negocioSucursales, {
		fields: [chatMensajes.emisorSucursalId],
		references: [negocioSucursales.id]
	}),
	empleado: one(empleados, {
		fields: [chatMensajes.empleadoId],
		references: [empleados.id]
	}),
	respuestaA: one(chatMensajes, {
		fields: [chatMensajes.respuestaAId],
		references: [chatMensajes.id],
		relationName: "chatMsg_respuesta"
	}),
	reenviadoDe: one(chatMensajes, {
		fields: [chatMensajes.reenviadoDeId],
		references: [chatMensajes.id],
		relationName: "chatMsg_reenviado"
	}),
	reacciones: many(chatReacciones),
}));

// --- Reacciones ---

export const chatReaccionesRelations = relations(chatReacciones, ({ one }) => ({
	mensaje: one(chatMensajes, {
		fields: [chatReacciones.mensajeId],
		references: [chatMensajes.id]
	}),
	usuario: one(usuarios, {
		fields: [chatReacciones.usuarioId],
		references: [usuarios.id]
	}),
}));

// --- Mensajes fijados ---

export const chatMensajesFijadosRelations = relations(chatMensajesFijados, ({ one }) => ({
	conversacion: one(chatConversaciones, {
		fields: [chatMensajesFijados.conversacionId],
		references: [chatConversaciones.id]
	}),
	mensaje: one(chatMensajes, {
		fields: [chatMensajesFijados.mensajeId],
		references: [chatMensajes.id]
	}),
	usuario: one(usuarios, {
		fields: [chatMensajesFijados.fijadoPor],
		references: [usuarios.id]
	}),
}));

// --- Contactos ---

export const chatContactosRelations = relations(chatContactos, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [chatContactos.usuarioId],
		references: [usuarios.id],
		relationName: "chatContactos_usuario"
	}),
	contacto: one(usuarios, {
		fields: [chatContactos.contactoId],
		references: [usuarios.id],
		relationName: "chatContactos_contacto"
	}),
	negocio: one(negocios, {
		fields: [chatContactos.negocioId],
		references: [negocios.id]
	}),
}));

// --- Bloqueados ---

export const chatBloqueadosRelations = relations(chatBloqueados, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [chatBloqueados.usuarioId],
		references: [usuarios.id],
		relationName: "chatBloqueados_usuario"
	}),
	bloqueado: one(usuarios, {
		fields: [chatBloqueados.bloqueadoId],
		references: [usuarios.id],
		relationName: "chatBloqueados_bloqueado"
	}),
}));