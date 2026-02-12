/**
 * ModalVoucherGenerado.tsx
 * =========================
 * Modal que muestra el voucher generado exitosamente después de canjear.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalVoucherGenerado.tsx
 */

import { useState } from 'react';
import { X, Gift, Calendar, Store, CheckCircle, Copy, Check, Info } from 'lucide-react';
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
      className="lg:max-w-xs 2xl:max-w-md"
    >
      {/* ── Header dark con éxito ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 py-3.5 lg:py-2.5 2xl:py-3.5"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
          }}
        />
        {/* Glow amber */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)' }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5 lg:gap-2.5 2xl:gap-3.5">
            <div
              className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg lg:text-base 2xl:text-lg font-bold text-white">¡Canje Exitoso!</h2>
              <p className="text-sm lg:text-xs 2xl:text-sm text-amber-400/80 font-bold">Tu voucher está listo</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-6 h-6 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-4 lg:p-2.5 2xl:p-4 max-h-[75vh] overflow-y-auto">

        {/* QR + Código */}
        <div className="text-center mb-2 lg:mb-2 2xl:mb-4">
          <div
            className="w-32 h-32 lg:w-20 lg:h-20 2xl:w-32 2xl:h-32 mx-auto mb-3 lg:mb-1.5 2xl:mb-3 rounded-xl overflow-hidden bg-white flex items-center justify-center"
            style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
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
                <p className="text-[10px] text-slate-400">QR no disponible</p>
              </div>
            )}
          </div>

          {/* Código alfanumérico */}
          <div
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <span className="text-lg lg:text-sm 2xl:text-lg font-black text-slate-800 tracking-[0.15em] font-mono">{voucher.codigo}</span>
            <button
              onClick={copiarCodigo}
              className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-[13px] lg:text-[11px] 2xl:text-[13px] text-slate-500 font-semibold mt-2 lg:mt-1.5 2xl:mt-2">Muestra este código en el negocio</p>
        </div>

        {/* Recompensa */}
        <div
          className="rounded-lg p-2 lg:p-2 2xl:p-3 mb-3 lg:mb-1.5 2xl:mb-3"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}
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
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Store className="w-3 h-3 text-slate-400" strokeWidth={2.5} />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Válido en</span>
            </div>
            <p className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-slate-800 truncate">{voucher.negocioNombre}</p>
          </div>

          <div
            className="rounded-lg p-2 lg:p-2 2xl:p-3"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Calendar className="w-3 h-3 text-slate-400" strokeWidth={2.5} />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Expira</span>
            </div>
            <p className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-slate-800">{formatearFecha(voucher.expiraAt)}</p>
          </div>
        </div>

        {/* Instrucciones */}
        <div
          className="rounded-lg p-3 lg:p-2 2xl:p-3 mb-4 lg:mb-2 2xl:mb-4"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
            <h4 className="text-[13px] font-bold text-slate-600">Instrucciones</h4>
          </div>
          <ol className="space-y-1.5 lg:space-y-0.5 2xl:space-y-1.5 text-[13px] lg:text-[11px] 2xl:text-[13px] text-slate-600 leading-relaxed">
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
          className="w-full py-2.5 lg:py-1.5 2xl:py-2.5 rounded-lg font-bold text-[14px] lg:text-[13px] 2xl:text-[14px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#f8fafc',
            border: '1px solid #334155',
          }}
        >
          Entendido
        </button>
      </div>
    </ModalAdaptativo>
  );
}