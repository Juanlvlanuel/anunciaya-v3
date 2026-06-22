/**
 * FichaAuditoria.tsx
 * ==================
 * Detalle de un registro de la bitácora de auditoría. Usa el ModalAdaptativo base del
 * Panel (centrado en escritorio, bottom-sheet en móvil, atrás nativo). SOLO LECTURA — la
 * auditoría es inmutable, no hay acciones.
 *
 * Muestra: quién + rol + correo · qué acción (legible) · sobre qué entidad · cuándo ·
 * motivo · y el DIFF de los snapshots (datos previos → datos nuevos).
 *
 * Ubicación: apps/admin/src/components/auditoria/FichaAuditoria.tsx
 */

import type { ReactNode } from 'react';
import { useDetalleAuditoria } from '../../hooks/queries/useAuditoriaAdmin';
import type { AuditoriaFila, AuditoriaDetalle } from '../../services/auditoriaService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { moduloDeAccion, etiquetaAccion, BadgeModulo, etiquetaEntidad, ENTIDAD_TIPO_LABEL } from './accionesAuditoria';

interface FichaAuditoriaProps {
  /** Fila que se abrió: placeholder para mostrar la ficha al instante. */
  previo: AuditoriaFila;
  onCerrar: () => void;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ROL_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Etiquetas HUMANAS para las claves de los snapshots (fallback: humanizar la clave). */
const ETIQUETA_CLAVE: Record<string, string> = {
  clave: 'Configuración',
  valor: 'Nuevo valor',
  nombre: 'Nombre',
  estado: 'Estado',
  activa: 'Activa',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  compensado: 'Cobrado de su deuda de efectivo',
  fechaPago: 'Fecha de pago',
  vendedor: 'Vendedor',
  comprobante: 'Comprobante',
  ciudades: 'Ciudades',
  creadas: 'Ciudades creadas',
  omitidas: 'Omitidas (ya existían)',
  precioMensual: 'Precio mensual',
  precioAnual: 'Precio anual',
  anualRecalculado: 'Precio anual recalculado',
  importancia: 'Importancia',
  lat: 'Latitud',
  lng: 'Longitud',
  meses: 'Meses cubiertos',
  mesesCubiertos: 'Meses cubiertos',
  concepto: 'Forma de pago',
  monto: 'Monto',
  bruto: 'Bruto',
  neto: 'Neto (pagado en dinero)',
  totalDevengado: 'Total devengado',
  metodo: 'Método',
  metodoCobro: 'Método de cobro',
  estadoAdmin: 'Estado',
  estadoMembresia: 'Membresía',
  embajadorEstado: 'Estado del vendedor',
  codigoReferido: 'Código de referido',
  telefono: 'Teléfono',
  hasta: 'Vigencia hasta',
  periodoHasta: 'Vigencia hasta',
  periodo: 'Periodo',
  nombreNegocio: 'Negocio',
  apellidos: 'Apellidos',
  correo: 'Correo',
  correos: 'Correos',
  rolEquipo: 'Rol',
  folio: 'Folio',
  correoEnviado: 'Correo enviado',
  omitidasPagadas: 'Omitidas (ya pagadas)',
  vigenciaTrasladada: 'Vigencia trasladada',
  pausarStripe: 'Pausar en Stripe',
  tieneClabe: 'Tiene CLABE',
  // Mantenimiento (crons / limpieza R2)
  ok: 'Ejecución correcta',
  resultado: 'Resultado',
  eliminadas: 'Archivos eliminados',
  fallidas: 'Fallidas',
  huerfanasDetectadas: 'Huérfanas detectadas',
  carpetas: 'Carpetas',
};

/** Valores enum técnicos → texto legible (estados, métodos, conceptos, roles). */
const VALOR_LEGIBLE: Record<string, string> = {
  al_corriente: 'Al corriente',
  en_gracia: 'En gracia',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
  activo: 'Activo',
  inactivo: 'Inactivo',
  archivado: 'Archivado',
  manual: 'Manual',
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cortesia: 'Cortesía',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  superadmin: 'Superadmin',
};

/** Claves cuyo valor es un MONTO en pesos (se muestran con $). */
const CLAVES_MONTO = new Set([
  'efectivo', 'transferencia', 'compensado', 'monto', 'montoBase', 'montoComision',
  'precioMensual', 'precioAnual', 'anualRecalculado', 'saldo', 'deuda', 'bruto', 'neto', 'abono',
  'totalDevengado',
]);

/** Claves técnicas o redundantes que no aportan al detalle (se ocultan). `nombreNegocio` ya va
 *  en "Sobre" para las acciones de negocio. */
const CLAVES_OCULTAS = new Set(['slug', 'modo', 'nombreNegocio', 'id']);

/** Nombres humanos para las CLAVES de configuración (el valor del campo 'clave'). */
const CONFIG_NOMBRE: Record<string, string> = {
  trial_duracion_dias: 'Días de prueba gratis',
  periodo_gracia_cobro_dias: 'Días de gracia tras vencer',
  comision_escalera: 'Escalera de comisiones',
  comision_alta_monto: 'Comisión por dar de alta',
  precio_membresia_mxn: 'Precio de membresía',
  dias_retencion_pago: 'Días de retención de pago',
};

/** Claves del snapshot que representan el NOMBRE de la entidad afectada — se usan para "Sobre"
 *  cuando la entidad no tiene id resoluble (p.ej. el vendedor en un pago) y luego se ocultan del
 *  detalle para no duplicarlas. (El backend resuelve `embajadorId` → la clave "Vendedor".) */
const CLAVES_NOMBRE_ENTIDAD = ['Vendedor', 'vendedor', 'nombreNegocio', 'nombre'];

/** Orden de presentación de los campos del detalle: montos juntos, luego concepto, fechas, flags.
 *  Las claves no listadas van al final, en su orden de aparición. */
const ORDEN_CLAVE = [
  // dinero / pago
  'transferencia', 'efectivo', 'compensado', 'monto', 'bruto', 'neto', 'totalDevengado',
  'montoComision', 'montoBase', 'precioMensual', 'precioAnual', 'anualRecalculado',
  'metodo', 'metodoCobro', 'concepto', 'meses', 'mesesCubiertos', 'folio',
  // configuración
  'clave', 'valor',
  // identidad / datos
  'nombre', 'nombreNegocio', 'apellidos', 'correo', 'telefono', 'codigoReferido', 'rolEquipo',
  // estado → lo creado → región → lo omitido
  'estado', 'estadoAdmin', 'estadoMembresia', 'embajadorEstado', 'activa',
  'ciudades', 'creadas',
  'Región', 'Región del vendedor', 'Ciudad', 'importancia',
  'omitidas', 'omitidasPagadas',
  // mantenimiento (crons / limpieza R2)
  'resultado', 'ok', 'eliminadas', 'fallidas', 'huerfanasDetectadas', 'carpetas',
  // fechas
  'periodo', 'fechaPago', 'periodoHasta', 'hasta',
  // flags
  'comprobante', 'correoEnviado', 'anulado', 'vigenciaTrasladada', 'pausarStripe', 'tieneClabe',
];
function pesoClave(k: string): number {
  const i = ORDEN_CLAVE.indexOf(k);
  return i === -1 ? 999 : i;
}

/** Fecha + hora legible es-MX. */
function fechaHora(valor: string | null): string {
  if (!valor) return '—';
  // Postgres entrega "2026-06-20 15:00:00+00" (espacio + offset sin minutos). Normaliza a ISO
  // válido: espacio→T y "+00"→"+00:00"; si no, new Date lo rechaza y se veía "—".
  const d = new Date(valor.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

/** Fecha sin hora: "19 Jun 2026". Parseo manual para evitar corrimientos por zona horaria. */
function fechaSola(valor: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!m) return valor;
  const [, y, mes, dia] = m;
  return `${dia} ${MESES[Number(mes) - 1] ?? mes} ${y}`;
}

/** Periodo "2026-06" → "Jun 2026". */
function mesAnio(valor: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!m) return valor;
  return `${MESES[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** camelCase / snake_case → "Texto legible". */
function humanizarClave(k: string): string {
  const s = k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Etiqueta humana de una clave de snapshot (diccionario; si no, se humaniza). */
function etiquetaClave(k: string): string {
  return ETIQUETA_CLAVE[k] ?? humanizarClave(k);
}

/** Valor de snapshot a texto legible SEGÚN la clave: montos con $, fechas con formato,
 *  arrays unidos por coma, booleanos Sí/No. */
function formatearValor(k: string, v: unknown): string {
  if (v == null || v === '') return '—';
  // El "valor" del campo 'clave'/'configuracion' es el nombre técnico de una config → humanizarlo.
  if ((k === 'clave' || k === 'configuracion') && typeof v === 'string') return CONFIG_NOMBRE[v] ?? humanizarClave(v);
  if (Array.isArray(v)) return v.length ? v.map((x) => formatearValor(k, x)).join(', ') : '—';
  if (CLAVES_MONTO.has(k)) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return FMT_MONTO.format(n);
  }
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}[T ]/.test(v)) return fechaHora(v);   // fecha + hora (T o espacio)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fechaSola(v);      // fecha sola
    if (/^\d{4}-\d{2}$/.test(v)) return mesAnio(v);              // periodo "2026-06"
    if (VALOR_LEGIBLE[v]) return VALOR_LEGIBLE[v];               // enum técnico → texto legible
    return v;
  }
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

/** Una fila de detalle: etiqueta humana + valor, o "antes → después" si cambió. */
function FilaDetalle({ clave, previos, nuevos }: { clave: string; previos: Record<string, unknown>; nuevos: Record<string, unknown> }) {
  const antes = previos[clave];
  const despues = nuevos[clave];
  const cambio = clave in previos && clave in nuevos && formatearValor(clave, antes) !== formatearValor(clave, despues);
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[13px] text-texto-3">{etiquetaClave(clave)}</span>
      <span className="min-w-0 text-right text-[13.5px] font-medium text-texto">
        {cambio ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <span className="text-texto-4 line-through">{formatearValor(clave, antes)}</span>
            <span className="text-texto-4">→</span>
            <span>{formatearValor(clave, despues)}</span>
          </span>
        ) : (
          formatearValor(clave, clave in nuevos ? despues : antes)
        )}
      </span>
    </div>
  );
}

/** Arma un detalle parcial con lo que ya trae la fila (el resto se rellena al llegar). */
function placeholderDesdeFila(f: AuditoriaFila): AuditoriaDetalle {
  return {
    id: f.id,
    fecha: f.fecha,
    actorId: f.actorId,
    actorNombre: f.actorNombre,
    actorCorreo: null,
    actorRol: f.actorRol,
    accion: f.accion,
    entidadTipo: f.entidadTipo,
    entidadId: f.entidadId,
    entidadNombre: f.entidadNombre,
    datosPrevios: null,
    datosNuevos: null,
    motivo: f.motivo,
  };
}

export function FichaAuditoria({ previo, onCerrar }: FichaAuditoriaProps) {
  const { data, isError } = useDetalleAuditoria(previo.id, placeholderDesdeFila(previo));
  const r = data ?? placeholderDesdeFila(previo);
  const meta = moduloDeAccion(r.accion);
  const IconoMod = meta.icono;
  const rolLegible = r.actorRol ? (ROL_LABEL[r.actorRol] ?? r.actorRol) : null;

  const previos = (r.datosPrevios ?? {}) as Record<string, unknown>;
  const nuevos = (r.datosNuevos ?? {}) as Record<string, unknown>;

  // "Sobre" = el nombre de la entidad afectada. Si no se resolvió por id (p.ej. un vendedor),
  // se toma del snapshot; esa clave se oculta del detalle para no repetir el dato.
  let entidad = etiquetaEntidad(r.entidadTipo, r.entidadNombre, !!r.entidadId);
  let claveSobre: string | null = null;
  let claveApellidos: string | null = null;
  if (!r.entidadNombre) {
    for (const k of CLAVES_NOMBRE_ENTIDAD) {
      const v = (nuevos as Record<string, unknown>)[k] ?? (previos as Record<string, unknown>)[k];
      if (typeof v === 'string' && v) {
        entidad = v;
        claveSobre = k;
        // Alta de persona: el nombre va con su apellido (que luego se oculta del detalle).
        if (k === 'nombre') {
          const ap = (nuevos as Record<string, unknown>).apellidos ?? (previos as Record<string, unknown>).apellidos;
          if (typeof ap === 'string' && ap) { entidad = `${v} ${ap}`.trim(); claveApellidos = 'apellidos'; }
        }
        break;
      }
    }
  }
  // La fila "Sobre" se etiqueta por el TIPO ("Negocio", "Usuario", "Vendedor"…) y solo se muestra
  // cuando hay un NOMBRE real; para entidades genéricas (config, comisiones) no aporta y se omite.
  const tieneNombreEntidad = !!r.entidadNombre || !!claveSobre;
  const etiquetaSobre = ENTIDAD_TIPO_LABEL[r.entidadTipo] ?? 'Sobre';

  // Detalle: unión de claves de previos + nuevos, sin las técnicas, sin la usada en "Sobre", sin la
  // fecha del pago si coincide con la fecha de la acción (no duplicar), y ordenado (montos juntos).
  const diaAccion = r.fecha ? r.fecha.slice(0, 10) : null;
  const claves = Array.from(new Set([...Object.keys(previos), ...Object.keys(nuevos)]))
    .filter((k) => {
      if (CLAVES_OCULTAS.has(k) || k === claveSobre || k === claveApellidos) return false;
      // 'nombre' que es el de la entidad recién creada (solo en nuevos, no un cambio) ya va en "Sobre".
      if (k === 'nombre' && r.entidadNombre && !(k in previos)) return false;
      if (k === 'fechaPago') {
        const v = (nuevos as Record<string, unknown>)[k] ?? (previos as Record<string, unknown>)[k];
        if (typeof v === 'string' && diaAccion && v.slice(0, 10) === diaAccion) return false;
      }
      return true;
    })
    .sort((a, b) => pesoClave(a) - pesoClave(b));

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Detalle de la acción"
      iconoTitulo={
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
          <IconoMod size={16} />
        </span>
      }
      ancho="lg"
      discriminador="ficha-auditoria"
    >
      <div className="flex flex-col gap-3 p-4" data-testid="ficha-auditoria">
        {isError && (
          <div className="rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
            No se pudo cargar el detalle completo.
          </div>
        )}

        {/* Encabezado: acción protagonista + módulo + autor */}
        <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
          <div className="border-b border-borde px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <BadgeModulo accion={r.accion} small />
            </div>
            <div className="text-[20px] font-semibold leading-tight tracking-tight text-texto">
              {etiquetaAccion(r.accion)}
            </div>
            <div className="mt-2 text-[12.5px] text-texto-3">
              por <span className="font-medium text-texto-2">{r.actorNombre ?? 'Sistema'}</span>
              {rolLegible ? ` · ${rolLegible}` : ''}
              {r.actorCorreo ? ` · ${r.actorCorreo}` : ''}
            </div>
          </div>

          <div className="px-4 py-1.5">
            {tieneNombreEntidad && <Dato etiqueta={etiquetaSobre} valor={entidad} />}
            {claves.map((k) => <FilaDetalle key={k} clave={k} previos={previos} nuevos={nuevos} />)}
            {r.motivo && <Dato etiqueta="Motivo" valor={r.motivo} />}
            <Dato etiqueta="Fecha y hora" valor={fechaHora(r.fecha)} />
          </div>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default FichaAuditoria;
