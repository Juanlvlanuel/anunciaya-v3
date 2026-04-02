/**
 * ModalVoucherGenerado.tsx
 * =========================
 * Modal que muestra el voucher generado exitosamente después de canjear.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalVoucherGenerado.tsx
 */

import { useState } from 'react';
import { Gift, Calendar, Store, CheckCircle, Copy, Check, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { Voucher } from '../../../../types/cardya';

export default function ModalVoucherGenerado({
  abierto,
  onCerrar,
  voucher,
}: {
  abierto: boolean;
  onCerrar: () => void;
  voucher: Voucher | null;
}) {
  const [copiado, setCopiado] = useState(false);

  if (!abierto || !voucher) return null;

  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(voucher.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
    }
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="sm"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle="rgba(255,255,255,0.45)"
      headerOscuro
      className="max-w-xs lg:max-w-sm 2xl:max-w-md"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

      {/* ── Header dark con éxito ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3.5 2xl:py-4 shrink-0 lg:rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3.5 lg:gap-2.5 2xl:gap-3.5">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">¡Canje Exitoso!</h2>
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-400/80 font-bold">Tu voucher está listo</p>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-2.5 2xl:p-4">

        {/* QR + Código */}
        <div className="text-center mb-2 lg:mb-2 2xl:mb-4">
          <div
            className="w-32 h-32 lg:w-20 lg:h-20 2xl:w-32 2xl:h-32 mx-auto mb-3 lg:mb-1.5 2xl:mb-3 rounded-xl overflow-hidden bg-white flex items-center justify-center"
            style={{ border: '2px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
          >
            {voucher.qrData ? (
              <QRCodeSVG
                value={voucher.qrData}
                size={112}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
                className="p-1.5"
              />
            ) : (
              <div className="text-slate-300 text-center p-3">
                <Gift className="w-10 h-10 mx-auto mb-1" />
                <p className="text-sm text-slate-600 font-medium">QR no disponible</p>
              </div>
            )}
          </div>

          {/* Código alfanumérico */}
          <div
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
          >
            <span className="text-lg lg:text-sm 2xl:text-lg font-black text-slate-800 tracking-[0.15em] font-mono">{voucher.codigo}</span>
            <button
              onClick={copiarCodigo}
              className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <Copy className="w-4 h-4 text-slate-600" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-2 lg:mt-1.5 2xl:mt-2">Muestra este código en el negocio</p>
        </div>

        {/* Recompensa */}
        <div
          className="rounded-lg p-2 lg:p-2 2xl:p-3 mb-3 lg:mb-1.5 2xl:mb-3"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '2px solid #fde68a' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Gift className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-amber-900 truncate">{voucher.recompensaNombre}</h3>
            </div>
          </div>
        </div>

        {/* Info: Negocio + Expiración */}
        <div className="grid grid-cols-2 gap-2.5 lg:gap-1.5 2xl:gap-2.5 mb-3 lg:mb-1.5 2xl:mb-3">
          <div
            className="rounded-lg p-2 lg:p-2 2xl:p-3"
            style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Store className="w-3 h-3 text-slate-600" strokeWidth={2.5} />
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-600 uppercase tracking-wide">Válido en</span>
            </div>
            <p className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-slate-800 truncate">{voucher.negocioNombre}</p>
          </div>

          <div
            className="rounded-lg p-2 lg:p-2 2xl:p-3"
            style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Calendar className="w-3 h-3 text-slate-600" strokeWidth={2.5} />
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-600 uppercase tracking-wide">Expira</span>
            </div>
            <p className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-slate-800">{formatearFecha(voucher.expiraAt)}</p>
          </div>
        </div>

        {/* Instrucciones */}
        <div
          className="rounded-lg p-3 lg:p-2 2xl:p-3 mb-4 lg:mb-2 2xl:mb-4"
          style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
            <h4 className="text-sm font-bold text-slate-600">Instrucciones</h4>
          </div>
          <ol className="space-y-1.5 lg:space-y-0.5 2xl:space-y-1.5 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium leading-relaxed">
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">1</span>
              <span>Muestra el código QR o alfanumérico al personal</span>
            </li>
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">2</span>
              <span>El negocio escaneará para validar tu voucher</span>
            </li>
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">3</span>
              <span>¡Disfruta tu recompensa!</span>
            </li>
          </ol>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          className="w-full py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#e2e8f0',
            border: '2px solid #334155',
          }}
        >
          Entendido
        </button>
      </div>
      </div>
    </ModalAdaptativo>
  );
}