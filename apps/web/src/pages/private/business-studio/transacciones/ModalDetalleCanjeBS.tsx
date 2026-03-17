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
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';
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
  colorFondo = 'bg-slate-200',
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string | React.ReactNode;
  valorColor?: string;
  colorFondo?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300 last:border-0">
      <div className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg ${colorFondo} flex items-center justify-center shrink-0`}>
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{etiqueta}</p>
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
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  if (!abierto || !canje) return null;

  const handleChatYA = () => {
    const datos = {
      id: canje.clienteId,
      nombre: canje.clienteNombre || 'Cliente',
      avatarUrl: canje.clienteAvatarUrl ?? null,
    };

    // Limpiar entrada huérfana de ModalBottom en el historial
    if (history.state?._modalBottom) {
      const estado = { ...history.state };
      delete estado._modalBottom;
      history.replaceState(estado, '');
    }

    onCerrar();
    setTimeout(() => {
      abrirChatTemporal({
        id: `temp_${Date.now()}`,
        otroParticipante: {
          id: datos.id,
          nombre: datos.nombre,
          apellidos: '',
          avatarUrl: datos.avatarUrl,
        },
        datosCreacion: {
          participante2Id: datos.id,
          participante2Modo: 'personal',
          contextoTipo: 'directo',
        },
      });
      abrirChatYA();
    }, 300);
  };

  const gradiente = GRADIENTES_ESTADO[canje.estado];

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      className={`lg:max-w-sm 2xl:max-w-md max-lg:[background:linear-gradient(180deg,${canje.estado === 'pendiente' ? '#1e40af' : canje.estado === 'usado' ? '#064e3b' : '#7f1d1d'}_2.5rem,rgb(248,250,252)_2.5rem)]`}
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">
      {/* ── Header dark con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-2">
          {/* Textos */}
          <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-white shrink-0" />
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                {canje.clienteNombre || 'Sin nombre'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-white shrink-0" />
              <span className="text-base lg:text-sm 2xl:text-base text-white font-semibold truncate">
                {canje.recompensaNombre}
              </span>
            </div>
          </div>
          {/* ChatYA — centrado verticalmente */}
          {canje.clienteId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleChatYA(); }}
              className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity p-2 -m-2"
            >
              <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-10 lg:h-8 2xl:h-10" />
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo con scroll ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-2">

        {/* Recompensa con imagen */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
          <div className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
            {canje.recompensaImagenUrl ? (
              <img src={canje.recompensaImagenUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Gift className="w-4 h-4 text-purple-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Recompensa canjeada</p>
            <p className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">
              {canje.recompensaNombre}
            </p>
            {canje.recompensaDescripcion && (
              <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-0.5 line-clamp-2">
                {canje.recompensaDescripcion}
              </p>
            )}
          </div>
        </div>

        {/* Puntos usados */}
        <FilaDetalle
          icono={<Star className="w-4 h-4 text-amber-600" />}
          etiqueta="Puntos utilizados"
          valor={`-${canje.puntosUsados.toLocaleString()} pts`}
          valorColor="text-amber-600"
          colorFondo="bg-amber-100"
        />

        {/* Fecha de solicitud */}
        {canje.createdAt && (
          <FilaDetalle
            icono={<Calendar className="w-4 h-4 text-slate-600" />}
            etiqueta="Fecha de solicitud"
            valor={formatearFechaCompleta(canje.createdAt)}
          />
        )}

        {/* Expiración (solo si existe) */}
        {canje.expiraAt && (
          <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Expiración</p>
              <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">
                {formatearFechaCorta(canje.expiraAt)}
              </p>
              {/* Indicador de urgencia si está pendiente */}
              {canje.estado === 'pendiente' && (() => {
                const { texto, urgente } = calcularDiasRestantes(canje.expiraAt!);
                return (
                  <p className={`text-sm mt-0.5 font-medium ${urgente ? 'text-red-600' : 'text-slate-600'}`}>
                    {texto}
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* Operador + Sucursal (solo si fue usado) */}
        {canje.estado === 'usado' && (canje.usadoPorNombre || (tieneSucursales && canje.sucursalNombre)) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className={`flex-1 min-w-0 ${tieneSucursales && canje.sucursalNombre ? 'grid grid-cols-2 gap-x-3' : ''}`}>
              {canje.usadoPorNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Validó canje</p>
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{canje.usadoPorNombre}</p>
                  </div>
                </div>
              )}
              {tieneSucursales && canje.sucursalNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Sucursal</p>
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
            icono={<CheckCircle className="w-4 h-4 text-emerald-600" />}
            etiqueta="Canjeado el"
            valor={formatearFechaCompleta(canje.usadoAt)}
            valorColor="text-emerald-600"
            colorFondo="bg-emerald-100"
          />
        )}
      </div>

      {/* ── Mensaje informativo según estado ── */}
      <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4">
        {canje.estado === 'pendiente' && (
          <div className="rounded-lg bg-blue-100 border-2 border-blue-300 p-3">
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-600 font-semibold">Estado: {ETIQUETAS_ESTADO[canje.estado]}</p>
            </div>
            <p className="text-sm text-blue-600 font-medium mt-1.5 ml-6">
              El cliente puede presentar este voucher en cualquier sucursal para reclamar su recompensa.
            </p>
          </div>
        )}

        {canje.estado === 'usado' && (
          <div className="rounded-lg bg-emerald-100 border-2 border-emerald-300 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-600 font-semibold">Estado: {ETIQUETAS_ESTADO[canje.estado]}</p>
            </div>
            <p className="text-sm text-emerald-600 font-medium mt-1.5 ml-6">
              La recompensa fue entregada al cliente.
            </p>
          </div>
        )}

        {canje.estado === 'expirado' && (
          <div className="rounded-lg bg-red-100 border-2 border-red-300 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-600 font-semibold">Estado: {ETIQUETAS_ESTADO[canje.estado]}</p>
            </div>
            <p className="text-sm text-red-600 font-medium mt-1.5 ml-6">
              Este voucher expiró sin ser canjeado. Los puntos fueron devueltos al saldo del cliente.
            </p>
          </div>
        )}
      </div>
      </div>
      </div>
    </ModalAdaptativo>
  );
}