/**
 * ModalDetalleCanjeBS.tsx
 * ========================
 * Modal de detalle de un voucher/canje para Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/transacciones/ModalDetalleCanjeBS.tsx
 *
 * PROPÓSITO:
 *   Muestra el detalle completo de un voucher canjeado por un cliente.
 *   Perspectiva del NEGOCIO: quién canjeó, qué recompensa, estado, fechas.
 *
 * FEATURES:
 *   - Header dark con gradiente según estado (azul=pendiente, verde=usado, rojo=vencido)
 *   - Imagen de recompensa si existe
 *   - Datos: cliente, recompensa, puntos, estado, fechas, sucursal, operador
 *   - Responsive: ModalBottom en móvil, Modal centrado en desktop
 *
 * PATRÓN: Réplica de ModalDetalleTransaccionBS.tsx (misma estructura visual)
 */

import {
  User,
  Gift,
  Star,
  Clock,
  MapPin,
  Hourglass,
  CheckCircle,
  AlertCircle,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { VoucherCanje } from '../../../../types/transacciones';

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCompleta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatearFechaCorta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatearTelefono = (tel: string): string => {
  const limpio = tel.replace(/\s+/g, '');
  if (limpio.startsWith('+52') && limpio.length === 13) {
    return `+52 ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  if (limpio.startsWith('+') && limpio.length > 4) {
    const codigo = limpio.slice(0, 3);
    const resto = limpio.slice(3);
    return `${codigo} ${resto.slice(0, 3)} ${resto.slice(3)}`;
  }
  return tel;
};

/** Calcula días restantes para expiración */
const calcularDiasRestantes = (fechaISO: string): { texto: string; urgente: boolean; vencido: boolean } => {
  const diffDias = Math.ceil((new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return { texto: `Venció hace ${Math.abs(diffDias)} día${Math.abs(diffDias) === 1 ? '' : 's'}`, urgente: false, vencido: true };
  if (diffDias === 0) return { texto: 'Vence hoy', urgente: true, vencido: false };
  if (diffDias === 1) return { texto: 'Vence mañana', urgente: true, vencido: false };
  if (diffDias <= 7) return { texto: `Vence en ${diffDias} días`, urgente: true, vencido: false };
  return { texto: `Vence en ${diffDias} días`, urgente: false, vencido: false };
};

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTES_ESTADO = {
  pendiente: { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(37,99,235,0.4)' },
  usado: { bg: 'linear-gradient(135deg, #064e3b, #065f46)', shadow: 'rgba(5,150,105,0.4)' },
  expirado: { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', shadow: 'rgba(220,38,38,0.4)' },
};

const ICONOS_ESTADO = {
  pendiente: <Hourglass className="w-5 h-5 text-blue-200" />,
  usado: <CheckCircle className="w-5 h-5 text-emerald-300" />,
  expirado: <AlertCircle className="w-5 h-5 text-red-300" />,
};

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente de canje',
  usado: 'Canjeado',
  expirado: 'Vencido',
};

// =============================================================================
// COMPONENTE: Fila de detalle (mismo patrón que ModalDetalleTransaccionBS)
// =============================================================================

function FilaDetalle({
  icono,
  etiqueta,
  valor,
  valorColor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string | React.ReactNode;
  valorColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">{etiqueta}</p>
        <p className={`text-sm lg:text-xs 2xl:text-sm font-semibold truncate ${valorColor || 'text-slate-800'}`}>
          {valor}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function ModalDetalleCanjeBS({
  abierto,
  onCerrar,
  canje,
}: {
  abierto: boolean;
  onCerrar: () => void;
  canje: VoucherCanje | null;
}) {
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const tieneSucursales = totalSucursales > 1;

  if (!abierto || !canje) return null;

  const gradiente = GRADIENTES_ESTADO[canje.estado];

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-sm 2xl:max-w-md"
    >
      {/* ── Header dark con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4"
        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base lg:text-sm 2xl:text-base">
              Detalle de Canje
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {ICONOS_ESTADO[canje.estado]}
              <span className="text-white/80 text-sm lg:text-xs 2xl:text-sm font-medium">
                {ETIQUETAS_ESTADO[canje.estado]}
              </span>
            </div>
          </div>
          {/* Puntos prominentes */}
          <div className="text-right shrink-0">
            <p className="text-white/60 text-xs font-medium">Puntos</p>
            <p className="text-white font-extrabold text-lg lg:text-base 2xl:text-lg">
              -{canje.puntosUsados.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Cuerpo con filas de detalle ── */}
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3">

        {/* Cliente + teléfono + ChatYA */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {canje.clienteAvatarUrl ? (
              <img src={canje.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
              {canje.clienteNombre || 'Sin nombre'}
            </p>
            {canje.clienteTelefono && (
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400">
                {formatearTelefono(canje.clienteTelefono)}
              </p>
            )}
          </div>
          {canje.clienteTelefono && (
            <button
              onClick={() => {/* TODO: integrar ChatYA cuando esté listo */}}
              className="shrink-0 cursor-pointer"
              title="Contactar cliente por ChatYA"
            >
              <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-7 lg:w-auto lg:h-6 2xl:h-7 2xl:w-auto" />
            </button>
          )}
        </div>

        {/* Recompensa con imagen */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
          <div className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            {canje.recompensaImagenUrl ? (
              <img src={canje.recompensaImagenUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Gift className="w-4 h-4 text-purple-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Recompensa canjeada</p>
            <p className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">
              {canje.recompensaNombre}
            </p>
            {canje.recompensaDescripcion && (
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-400 mt-0.5 line-clamp-2">
                {canje.recompensaDescripcion}
              </p>
            )}
          </div>
        </div>

        {/* Puntos usados */}
        <FilaDetalle
          icono={<Star className="w-4 h-4 text-amber-500" />}
          etiqueta="Puntos utilizados"
          valor={`-${canje.puntosUsados.toLocaleString()} pts`}
          valorColor="text-amber-600"
        />

        {/* Fecha de solicitud */}
        {canje.createdAt && (
          <FilaDetalle
            icono={<Calendar className="w-4 h-4 text-slate-400" />}
            etiqueta="Fecha de solicitud"
            valor={formatearFechaCompleta(canje.createdAt)}
          />
        )}

        {/* Expiración (solo si existe) */}
        {canje.expiraAt && (
          <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Expiración</p>
              <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">
                {formatearFechaCorta(canje.expiraAt)}
              </p>
              {/* Indicador de urgencia si está pendiente */}
              {canje.estado === 'pendiente' && (() => {
                const { texto, urgente } = calcularDiasRestantes(canje.expiraAt!);
                return (
                  <p className={`text-xs mt-0.5 font-medium ${urgente ? 'text-red-500' : 'text-slate-400'}`}>
                    {texto}
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* Operador + Sucursal (solo si fue usado) */}
        {canje.estado === 'usado' && (canje.usadoPorNombre || (tieneSucursales && canje.sucursalNombre)) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
            <div className={`flex-1 min-w-0 ${tieneSucursales && canje.sucursalNombre ? 'grid grid-cols-2 gap-x-3' : ''}`}>
              {canje.usadoPorNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Validó canje</p>
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{canje.usadoPorNombre}</p>
                  </div>
                </div>
              )}
              {tieneSucursales && canje.sucursalNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Sucursal</p>
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{canje.sucursalNombre}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fecha de uso (solo si fue usado) */}
        {canje.estado === 'usado' && canje.usadoAt && (
          <FilaDetalle
            icono={<CheckCircle className="w-4 h-4 text-emerald-500" />}
            etiqueta="Canjeado el"
            valor={formatearFechaCompleta(canje.usadoAt)}
            valorColor="text-emerald-600"
          />
        )}
      </div>

      {/* ── Mensaje informativo según estado ── */}
      <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4">
        {canje.estado === 'pendiente' && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-600 font-semibold">Voucher pendiente de canje</p>
            </div>
            <p className="text-[12px] text-blue-500 mt-1.5 ml-6">
              El cliente puede presentar este voucher en cualquier sucursal para reclamar su recompensa.
            </p>
          </div>
        )}

        {canje.estado === 'usado' && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-600 font-semibold">Voucher canjeado exitosamente</p>
            </div>
            <p className="text-[12px] text-emerald-500 mt-1.5 ml-6">
              La recompensa fue entregada al cliente.
            </p>
          </div>
        )}

        {canje.estado === 'expirado' && (
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-600 font-semibold">Voucher vencido</p>
            </div>
            <p className="text-[12px] text-red-500 mt-1.5 ml-6">
              Este voucher expiró sin ser canjeado. Los puntos fueron devueltos al saldo del cliente.
            </p>
          </div>
        )}
      </div>
    </ModalAdaptativo>
  );
}