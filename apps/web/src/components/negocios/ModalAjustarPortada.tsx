/**
 * ModalAjustarPortada.tsx
 * ========================
 * Ajusta el encuadre (posición) de la portada ya subida, arrastrando la
 * imagen dentro de dos marcos con la MISMA proporción y silueta que el hero
 * real del perfil público (escritorio y móvil) — WYSIWYG real, no un
 * recuadro genérico de editor. Ambos marcos comparten la misma posición:
 * arrastrar en cualquiera de los dos mueve los dos a la vez. Se confirma
 * con "Guardar posición"; "Cancelar" descarta el arrastre y no toca lo ya
 * guardado.
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalAjustarPortada.tsx
 */

import { useState } from 'react';
import { Move, Loader2, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useArrastrePortada, type PosicionPortada } from '../../hooks/useArrastrePortada';

interface ModalAjustarPortadaProps {
  abierto: boolean;
  onCerrar: () => void;
  src: string;
  posicionInicial: PosicionPortada;
  onGuardar: (posicion: PosicionPortada) => Promise<void>;
}

// Misma silueta que el hero real de PaginaPerfilNegocio.tsx: sin bordes,
// solo redondeo inferior, con velo oscuro encima de la imagen.
function MarcoPortada({
  src, posicion, arrastre, aspect, etiqueta, redondeo,
}: {
  src: string;
  posicion: PosicionPortada;
  arrastre: ReturnType<typeof useArrastrePortada>;
  aspect: string;
  etiqueta: string;
  redondeo: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{etiqueta}</span>
      <div className={`relative w-full ${aspect} ${redondeo} bg-slate-200 overflow-hidden shadow-md mx-auto`}>
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{
            objectPosition: `${posicion.x}% ${posicion.y}%`,
            cursor: arrastre.arrastrando ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={arrastre.onPointerDown}
          onPointerMove={arrastre.onPointerMove}
          onPointerUp={arrastre.onPointerUp}
          onPointerCancel={arrastre.onPointerUp}
        />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        <Move className="absolute top-2 left-2 w-4 h-4 text-white/80 pointer-events-none drop-shadow" />
      </div>
    </div>
  );
}

function ContenidoAjuste({
  src, posicionInicial, onGuardar, onCancelar,
}: {
  src: string;
  posicionInicial: PosicionPortada;
  onGuardar: (posicion: PosicionPortada) => Promise<void>;
  onCancelar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const arrastre = useArrastrePortada(posicionInicial);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await onGuardar(arrastre.posicion);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-4 lg:p-5 space-y-4">
      <p className="text-sm text-slate-600 font-medium">
        Arrastra la imagen para elegir qué parte se ve en el perfil del negocio.
        Los dos marcos se mueven juntos.
      </p>

      {/* Misma silueta que el hero real: rounded-b-3xl en móvil, rounded-br-[3rem] en escritorio */}
      <MarcoPortada src={src} posicion={arrastre.posicion} arrastre={arrastre}
        aspect="aspect-[9/2]" redondeo="rounded-br-[3rem]" etiqueta="Vista escritorio" />

      <MarcoPortada src={src} posicion={arrastre.posicion} arrastre={arrastre}
        aspect="aspect-[13/8] max-w-[220px]" redondeo="rounded-b-3xl" etiqueta="Vista móvil" />

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar} disabled={guardando}
          className="px-4 py-2 text-sm font-bold text-slate-600 border-2 border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          Cancelar
        </button>
        <button type="button" onClick={handleGuardar} disabled={guardando}
          className="px-4 py-2 flex items-center gap-2 text-sm font-bold text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {guardando ? 'Guardando...' : 'Guardar posición'}
        </button>
      </div>
    </div>
  );
}

export default function ModalAjustarPortada({
  abierto, onCerrar, src, posicionInicial, onGuardar,
}: ModalAjustarPortadaProps) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} ancho="wide" mostrarHeader={false} paddingContenido="none">
      {abierto && (
        <div className="flex flex-col">
          {/* Header oscuro — mismo patrón que las cards de BS (TabImagenes.tsx) */}
          <div className="flex items-center gap-2.5 px-4 lg:px-5 py-3 lg:py-3.5 rounded-t-2xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Move className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="flex-1 text-sm lg:text-base font-bold text-white">Ajustar posición de portada</span>
            <button type="button" onClick={onCerrar}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <ContenidoAjuste
            src={src}
            posicionInicial={posicionInicial}
            onGuardar={async (posicion) => {
              await onGuardar(posicion);
              onCerrar();
            }}
            onCancelar={onCerrar}
          />
        </div>
      )}
    </Modal>
  );
}
