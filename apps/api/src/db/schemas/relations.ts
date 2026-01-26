import { relations } from "drizzle-orm/relations";
import { embajadores, usuarios, usuarioCodigosRespaldo, negocios, negocioSucursales, regiones, categoriasNegocio, subcategoriasNegocio, asignacionSubcategorias, negocioHorarios, negocioModulos, negocioMetodosPago, negocioCitasConfig, negocioCitasFechasEspecificas, negocioGaleria, negocioPreferencias, articulos, articuloSucursales, articuloInventario, articuloVariantes, articuloVarianteOpciones, citas, empleados, empleadoHorarios, direccionesUsuario, pedidos, pedidoArticulos, carrito, cupones, ofertas, cuponGaleria, cuponUsos, cuponUsuarios, marketplace, categoriasMarketplace, planes, planReglas, bitacoraUso, votos, resenas, metricasUsuario, carritoArticulos, configuracionSistema, planesAnuncios, promocionesPagadas, promocionesTemporales, promocionesUsadas, embajadorComisiones, dinamicas, dinamicaPremios, dinamicaParticipaciones, bolsaTrabajo, puntosConfiguracion, puntosBilletera, recompensas, puntosTransacciones, transaccionesEvidencia, vouchersCanje, alertasSeguridad } from "./schema";

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
	citas: many(citas),
	direccionesUsuarios: many(direccionesUsuario),
	carritos: many(carrito),
	pedidos: many(pedidos),
	cuponUsos: many(cuponUsos),
	cuponUsuarios: many(cuponUsuarios),
	marketplaces: many(marketplace),
	planReglas: many(planReglas),
	bitacoraUsos: many(bitacoraUso),
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
	dinamicas: many(dinamicas),
	dinamicaParticipaciones: many(dinamicaParticipaciones),
	bolsaTrabajos: many(bolsaTrabajo),
	puntosBilleteras: many(puntosBilletera),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
}));

export const embajadoresRelations = relations(embajadores, ({ one, many }) => ({
	usuarios: many(usuarios, {
		relationName: "usuarios_referidoPor_embajadores_id"
	}),
	negocios: many(negocios),
	embajadorComisiones: many(embajadorComisiones),
	regione: one(regiones, {
		fields: [embajadores.regionId],
		references: [regiones.id]
	}),
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
	regione: one(regiones, {
		fields: [negocios.regionId],
		references: [regiones.id]
	}),
	usuario: one(usuarios, {
		fields: [negocios.usuarioId],
		references: [usuarios.id]
	}),
	sucursales: many(negocioSucursales),
	negocioModulos: many(negocioModulos),
	negocioMetodosPagos: many(negocioMetodosPago),
	negocioCitasConfigs: many(negocioCitasConfig),
	negocioCitasFechasEspecificas: many(negocioCitasFechasEspecificas),
	negocioGalerias: many(negocioGaleria),
	negocioPreferencias: many(negocioPreferencias),
	articulos: many(articulos),
	citas: many(citas),
	ofertas: many(ofertas),
	cupones: many(cupones),
	marketplaces: many(marketplace),
	bitacoraUsos: many(bitacoraUso),
	embajadorComisiones: many(embajadorComisiones),
	dinamicaPremios: many(dinamicaPremios),
	dinamicas: many(dinamicas),
	bolsaTrabajos: many(bolsaTrabajo),
	puntosConfiguracions: many(puntosConfiguracion),
	puntosBilleteras: many(puntosBilletera),
	recompensas: many(recompensas),
	puntosTransacciones: many(puntosTransacciones),
	vouchersCanjes: many(vouchersCanje),
	alertasSeguridads: many(alertasSeguridad),
	asignacionSubcategorias: many(asignacionSubcategorias),
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
	cupones: many(cupones),
	negocioGalerias: many(negocioGaleria),
	negocioMetodosPagos: many(negocioMetodosPago),
	bolsaTrabajos: many(bolsaTrabajo),
	dinamicas: many(dinamicas),
	articuloSucursales: many(articuloSucursales),
}));

export const regionesRelations = relations(regiones, ({ many }) => ({
	negocios: many(negocios),
	embajadores: many(embajadores),
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

export const negocioModulosRelations = relations(negocioModulos, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioModulos.negocioId],
		references: [negocios.id]
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

export const negocioCitasConfigRelations = relations(negocioCitasConfig, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioCitasConfig.negocioId],
		references: [negocios.id]
	}),
}));

export const negocioCitasFechasEspecificasRelations = relations(negocioCitasFechasEspecificas, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioCitasFechasEspecificas.negocioId],
		references: [negocios.id]
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

export const negocioPreferenciasRelations = relations(negocioPreferencias, ({ one }) => ({
	negocio: one(negocios, {
		fields: [negocioPreferencias.negocioId],
		references: [negocios.id]
	}),
}));

export const articulosRelations = relations(articulos, ({ one, many }) => ({
	negocio: one(negocios, {
		fields: [articulos.negocioId],
		references: [negocios.id]
	}),
	articuloInventarios: many(articuloInventario),
	articuloVariantes: many(articuloVariantes),
	citas: many(citas),
	ofertas: many(ofertas),
	carritoArticulos: many(carritoArticulos),
	articuloSucursales: many(articuloSucursales),
}));

export const articuloInventarioRelations = relations(articuloInventario, ({ one }) => ({
	articulo: one(articulos, {
		fields: [articuloInventario.articuloId],
		references: [articulos.id]
	}),
}));

export const articuloVariantesRelations = relations(articuloVariantes, ({ one, many }) => ({
	articulo: one(articulos, {
		fields: [articuloVariantes.articuloId],
		references: [articulos.id]
	}),
	articuloVarianteOpciones: many(articuloVarianteOpciones),
}));

export const articuloVarianteOpcionesRelations = relations(articuloVarianteOpciones, ({ one }) => ({
	articuloVariante: one(articuloVariantes, {
		fields: [articuloVarianteOpciones.varianteId],
		references: [articuloVariantes.id]
	}),
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

export const citasRelations = relations(citas, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [citas.clienteId],
		references: [usuarios.id]
	}),
	empleado: one(empleados, {
		fields: [citas.empleadoId],
		references: [empleados.id]
	}),
	negocio: one(negocios, {
		fields: [citas.negocioId],
		references: [negocios.id]
	}),
	articulo: one(articulos, {
		fields: [citas.servicioId],
		references: [articulos.id]
	}),
}));

export const empleadosRelations = relations(empleados, ({ one, many }) => ({
	citas: many(citas),
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
}));

export const empleadoHorariosRelations = relations(empleadoHorarios, ({ one }) => ({
	empleado: one(empleados, {
		fields: [empleadoHorarios.empleadoId],
		references: [empleados.id]
	}),
}));

export const direccionesUsuarioRelations = relations(direccionesUsuario, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [direccionesUsuario.usuarioId],
		references: [usuarios.id]
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
	cupone: one(cupones, {
		fields: [pedidos.cuponId],
		references: [cupones.id]
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

export const carritoRelations = relations(carrito, ({ one, many }) => ({
	usuario: one(usuarios, {
		fields: [carrito.usuarioId],
		references: [usuarios.id]
	}),
	carritoArticulos: many(carritoArticulos),
}));

export const cuponesRelations = relations(cupones, ({ one, many }) => ({
	pedidos: many(pedidos),
	cuponGalerias: many(cuponGaleria),
	cuponUsos: many(cuponUsos),
	cuponUsuarios: many(cuponUsuarios),
	negocio: one(negocios, {
		fields: [cupones.negocioId],
		references: [negocios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [cupones.sucursalId],
		references: [negocioSucursales.id]
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

export const cuponGaleriaRelations = relations(cuponGaleria, ({ one }) => ({
	cupone: one(cupones, {
		fields: [cuponGaleria.cuponId],
		references: [cupones.id]
	}),
}));

export const cuponUsosRelations = relations(cuponUsos, ({ one }) => ({
	cupone: one(cupones, {
		fields: [cuponUsos.cuponId],
		references: [cupones.id]
	}),
	usuario: one(usuarios, {
		fields: [cuponUsos.usuarioId],
		references: [usuarios.id]
	}),
}));

export const cuponUsuariosRelations = relations(cuponUsuarios, ({ one }) => ({
	cupone: one(cupones, {
		fields: [cuponUsuarios.cuponId],
		references: [cupones.id]
	}),
	usuario: one(usuarios, {
		fields: [cuponUsuarios.usuarioId],
		references: [usuarios.id]
	}),
}));

export const marketplaceRelations = relations(marketplace, ({ one }) => ({
	usuario: one(usuarios, {
		fields: [marketplace.autorId],
		references: [usuarios.id]
	}),
	categoriasMarketplace: one(categoriasMarketplace, {
		fields: [marketplace.categoriaId],
		references: [categoriasMarketplace.id]
	}),
	negocio: one(negocios, {
		fields: [marketplace.negocioId],
		references: [negocios.id]
	}),
}));

export const categoriasMarketplaceRelations = relations(categoriasMarketplace, ({ many }) => ({
	marketplaces: many(marketplace),
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

export const bitacoraUsoRelations = relations(bitacoraUso, ({ one }) => ({
	negocio: one(negocios, {
		fields: [bitacoraUso.negocioId],
		references: [negocios.id]
	}),
	usuario: one(usuarios, {
		fields: [bitacoraUso.usuarioId],
		references: [usuarios.id]
	}),
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

export const carritoArticulosRelations = relations(carritoArticulos, ({ one }) => ({
	articulo: one(articulos, {
		fields: [carritoArticulos.articuloId],
		references: [articulos.id]
	}),
	carrito: one(carrito, {
		fields: [carritoArticulos.carritoId],
		references: [carrito.id]
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

export const dinamicaPremiosRelations = relations(dinamicaPremios, ({ one }) => ({
	dinamica: one(dinamicas, {
		fields: [dinamicaPremios.dinamicaId],
		references: [dinamicas.id]
	}),
	negocio: one(negocios, {
		fields: [dinamicaPremios.proveedorNegocioId],
		references: [negocios.id]
	}),
}));

export const dinamicasRelations = relations(dinamicas, ({ one, many }) => ({
	dinamicaPremios: many(dinamicaPremios),
	usuario: one(usuarios, {
		fields: [dinamicas.creadoPor],
		references: [usuarios.id]
	}),
	negocio: one(negocios, {
		fields: [dinamicas.negocioId],
		references: [negocios.id]
	}),
	dinamicaParticipaciones: many(dinamicaParticipaciones),
}));

export const dinamicaParticipacionesRelations = relations(dinamicaParticipaciones, ({ one }) => ({
	dinamica: one(dinamicas, {
		fields: [dinamicaParticipaciones.dinamicaId],
		references: [dinamicas.id]
	}),
	usuario: one(usuarios, {
		fields: [dinamicaParticipaciones.usuarioId],
		references: [usuarios.id]
	}),
}));

export const bolsaTrabajoRelations = relations(bolsaTrabajo, ({ one }) => ({
	negocio: one(negocios, {
		fields: [bolsaTrabajo.negocioId],
		references: [negocios.id]
	}),
	usuario: one(usuarios, {
		fields: [bolsaTrabajo.usuarioId],
		references: [usuarios.id]
	}),
	// 🆕 AGREGAR ESTA RELACIÓN:
	sucursal: one(negocioSucursales, {
		fields: [bolsaTrabajo.sucursalId],
		references: [negocioSucursales.id]
	}),
}));

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
	puntosTransaccione: one(puntosTransacciones, {
		fields: [alertasSeguridad.transaccionId],
		references: [puntosTransacciones.id]
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