/**
 * accionesAuditoria.tsx
 * =====================
 * Diccionario que traduce las acciones técnicas de `admin_auditoria` (p.ej.
 * 'negocio_suspender') a lenguaje de persona ("Suspendió un negocio") + el MÓDULO al
 * que pertenecen (para el badge y el filtro). Calcado del patrón de `estadoEvento.tsx`:
 * estética sobria (Regla 13), sin pastel saturado — el módulo se distingue por ícono.
 *
 * Si aparece una acción nueva sin entrada aquí, cae a un fallback legible (no rompe).
 *
 * Ubicación: apps/admin/src/components/auditoria/accionesAuditoria.tsx
 */

import {
  Store,
  Users,
  MapPin,
  ShieldCheck,
  CircleDollarSign,
  SlidersHorizontal,
  CreditCard,
  Receipt,
  Megaphone,
  ScrollText,
  Wrench,
  Tags,
  type LucideIcon,
} from 'lucide-react';

export interface MetaModulo {
  etiqueta: string;
  icono: LucideIcon;
}

/** Módulo por PREFIJO de la acción (negocio_*, usuario_*, …). */
const MODULO_POR_PREFIJO: Record<string, MetaModulo> = {
  negocio: { etiqueta: 'Negocios', icono: Store },
  usuario: { etiqueta: 'Usuarios', icono: Users },
  ciudad: { etiqueta: 'Ciudades', icono: MapPin },
  region: { etiqueta: 'Ciudades', icono: MapPin },
  categoria: { etiqueta: 'Categorías', icono: Tags },
  subcategoria: { etiqueta: 'Categorías', icono: Tags },
  equipo: { etiqueta: 'Equipo', icono: ShieldCheck },
  vendedor: { etiqueta: 'Vendedores', icono: CircleDollarSign },
  config: { etiqueta: 'Configuración', icono: SlidersHorizontal },
  precio: { etiqueta: 'Membresía', icono: CreditCard },
  plan: { etiqueta: 'Membresía', icono: CreditCard },
  recibo: { etiqueta: 'Recibos', icono: Receipt },
  publicidad: { etiqueta: 'Publicidad', icono: Megaphone },
  mantenimiento: { etiqueta: 'Mantenimiento', icono: Wrench },
};

/** Etiqueta legible por acción (verbo en pasado, "quién hizo qué"). */
export const ACCION_LABEL: Record<string, string> = {
  // Negocios
  negocio_alta_manual: 'Registró un negocio',
  negocio_cambiar_correo_dueno: 'Cambió el correo del dueño',
  negocio_suspender: 'Suspendió un negocio',
  negocio_reactivar: 'Reactivó un negocio',
  negocio_reasignar_vendedor: 'Reasignó el vendedor',
  negocio_marcar_pagado: 'Registró un pago',
  negocio_cancelar: 'Canceló un negocio',
  negocio_editar_pago: 'Editó un pago',
  negocio_reenviar_recibo: 'Reenvió un comprobante',
  negocio_anular_pago: 'Anuló un pago',
  negocio_marcar_fundador: 'Marcó un negocio como Fundador',
  negocio_quitar_fundador: 'Quitó el Fundador de un negocio',
  // Usuarios
  usuario_desbloquear_intentos: 'Desbloqueó intentos de acceso',
  usuario_generar_codigo_acceso: 'Generó un código de acceso',
  usuario_enviar_acceso: 'Envió el acceso por correo',
  usuario_cambiar_correo: 'Cambió el correo de un usuario',
  usuario_suspender: 'Suspendió un usuario',
  usuario_reactivar: 'Reactivó un usuario',
  // Ciudades
  ciudad_crear: 'Dio de alta una ciudad',
  ciudad_crear_multiple: 'Dio de alta ciudades',
  ciudad_editar: 'Editó una ciudad',
  ciudad_activar: 'Activó una ciudad',
  ciudad_desactivar: 'Desactivó una ciudad',
  ciudad_asignar_region: 'Asignó una ciudad a una región',
  ciudad_asignar_region_multiple: 'Asignó varias ciudades a una región',
  region_crear: 'Creó una región',
  region_editar: 'Editó una región',
  // Categorías
  categoria_crear: 'Creó una categoría',
  categoria_editar: 'Editó una categoría',
  categoria_activar: 'Activó una categoría',
  categoria_desactivar: 'Desactivó una categoría',
  categoria_reordenar: 'Reordenó categorías',
  categoria_asignar_ciudades: 'Cambió las ciudades de una categoría',
  subcategoria_crear: 'Creó una subcategoría',
  subcategoria_editar: 'Editó una subcategoría',
  subcategoria_activar: 'Activó una subcategoría',
  subcategoria_desactivar: 'Desactivó una subcategoría',
  subcategoria_reordenar: 'Reordenó subcategorías',
  subcategoria_asignar_ciudades: 'Cambió las ciudades de una subcategoría',
  // Equipo
  equipo_alta_gerente: 'Dio de alta un gerente',
  equipo_promover_gerente: 'Promovió a gerente',
  equipo_alta_vendedor: 'Dio de alta un vendedor',
  equipo_promover_vendedor: 'Promovió a vendedor',
  equipo_cambiar_ciudades: 'Cambió las ciudades de cobertura',
  equipo_revocar_acceso: 'Revocó un acceso',
  equipo_reactivar_acceso: 'Reactivó un acceso',
  equipo_editar_datos: 'Editó datos de un miembro',
  equipo_reasignar_region: 'Reasignó la región de un miembro',
  // Vendedores
  vendedor_registrar_pago: 'Registró el pago a un vendedor',
  vendedor_datos_cobro: 'Actualizó datos de cobro',
  vendedor_efectivo_cobro: 'Registró cobro de efectivo',
  vendedor_efectivo_entrega: 'Registró entrega de efectivo',
  comisiones_recalcular: 'Recalculó comisiones',
  // Membresía (precio / plan)
  precio_mensual_cambiar: 'Cambió el precio mensual',
  plan_anual_activar: 'Activó el plan anual',
  plan_anual_desactivar: 'Desactivó el plan anual',
  // Configuración
  config_actualizar: 'Cambió una configuración',
  // Recibos
  recibo_reenviar: 'Reenvió un recibo',
  // Publicidad
  publicidad_alta_manual: 'Registró un anuncio',
  publicidad_editar: 'Editó un anuncio',
  publicidad_pausar: 'Pausó un anuncio',
  publicidad_reactivar: 'Reactivó un anuncio',
  publicidad_cancelar: 'Canceló un anuncio',
  // Mantenimiento (Sistema)
  mantenimiento_cron_ejecutar: 'Ejecutó una tarea programada',
  mantenimiento_r2_limpiar: 'Limpió archivos huérfanos',
  mantenimiento_cache_purgar: 'Purgó la caché de configuración',
  mantenimiento_logs_vaciar: 'Vació los registros del servidor',
};

/** Etiqueta legible del TIPO de entidad (fallback cuando no hay un nombre resuelto). */
export const ENTIDAD_TIPO_LABEL: Record<string, string> = {
  negocio: 'Negocio',
  usuario: 'Usuario',
  ciudad: 'Ciudad',
  region: 'Región',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  embajador: 'Vendedor',
  configuracion: 'Configuración',
  comisiones: 'Comisiones',
  publicidad: 'Anuncio',
  cron: 'Tarea programada',
  mantenimiento: 'Mantenimiento',
};

/**
 * Texto de la entidad afectada: el nombre real si lo hay; si no, la etiqueta del tipo. Nunca el id.
 * Si tenía id pero ya no existe (entidad borrada), lo marca "(eliminado)" para que se entienda.
 */
export function etiquetaEntidad(tipo: string, nombre: string | null, tieneId = false): string {
  if (nombre) return nombre;
  const base = ENTIDAD_TIPO_LABEL[tipo] ?? tipo;
  return tieneId ? `${base} (eliminado)` : base;
}

/** Metadatos del módulo de una acción (por su prefijo). */
export function moduloDeAccion(accion: string): MetaModulo {
  const prefijo = accion.split('_')[0];
  return MODULO_POR_PREFIJO[prefijo] ?? { etiqueta: 'Otro', icono: ScrollText };
}

/** Etiqueta legible de una acción; fallback al valor técnico si no está mapeada. */
export function etiquetaAccion(accion: string): string {
  return ACCION_LABEL[accion] ?? accion;
}

/** Opciones para el filtro "Acción" — todas las acciones conocidas, ordenadas por
 *  módulo y luego por etiqueta. La opción "Todas" la agrega el componente. */
export const OPCIONES_ACCION: { valor: string; etiqueta: string }[] = Object.keys(ACCION_LABEL)
  .map((valor) => ({ valor, etiqueta: etiquetaAccion(valor), modulo: moduloDeAccion(valor).etiqueta }))
  .sort((a, b) => (a.modulo === b.modulo ? a.etiqueta.localeCompare(b.etiqueta, 'es') : a.modulo.localeCompare(b.modulo, 'es')))
  .map(({ valor, etiqueta }) => ({ valor, etiqueta }));

/** Badge del módulo: ícono + etiqueta con el acento de la marca (azul). `shrink-0` para que
 *  NO se estire dentro de un contenedor flex. Sobrio (1 acento, Regla 13), pero con presencia. */
export function BadgeModulo({ accion, small }: { accion: string; small?: boolean }) {
  const meta = moduloDeAccion(accion);
  const Icono = meta.icono;
  return (
    <span
      className={`txt-badge inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
      }`}
      style={{ background: 'var(--panel-brand-weak)', color: 'var(--panel-brand)' }}
    >
      <Icono size={small ? 12 : 13} className="shrink-0" />
      {meta.etiqueta}
    </span>
  );
}
