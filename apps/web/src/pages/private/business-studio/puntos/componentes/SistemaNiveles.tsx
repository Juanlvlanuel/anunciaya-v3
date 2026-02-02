/**
 * SistemaNiveles.tsx
 * ===================
 * Card completa del Sistema de Niveles con tiers metálicos animados.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/SistemaNiveles.tsx
 *
 * Exports:
 *   - NivelLocal (interface)    → usada por PaginaPuntos para tipear el estado de niveles
 *   - SistemaNiveles (default)  → componente card completa
 *
 * Props:
 *   niveles           → { bronce, plata, oro } con min/max/multiplicador
 *   nivelesActivos    → boolean que controla activo/inactivo
 *   onToggleNiveles   → callback al presionar el switch
 *   onCambioNivel     → callback cuando el usuario edita un campo de un tier
 *   esGerente         → deshabilita edición y switch
 *
 * ANIMACIONES (CSS keyframes internos, prefijo pp-):
 *   pp-metallic-shine   → rayo de luz que cruza la cabeza metálica
 *   pp-shimmer-bronce   → oscilación gradiente bronce (3.5s)
 *   pp-shimmer-plata    → oscilación gradiente plata  (3.5s)
 *   pp-shimmer-oro      → oscilación gradiente oro    (2.8s)
 */

import type { ReactNode } from 'react';
import { Star, Award, Gift } from 'lucide-react';

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export interface NivelLocal {
  min: number;
  max: number | null; // null → Oro (nivel superior, sin límite)
  multiplicador: number;
}

// =============================================================================
// CSS KEYFRAMES — solo los estilos del sistema de niveles
// Separados del icono del header (que vive en PaginaPuntos)
// =============================================================================

const ESTILOS_NIVELES = `
  @keyframes pp-metallic-shine {
    0%   { left: -100%; }
    100% { left: 200%; }
  }
  @keyframes pp-shimmer-bronce {
    0%, 100% { background: linear-gradient(160deg, #d4956a 0%, #a0522d 35%, #cd853f 55%, #8B4513 80%, #a0522d 100%); }
    50%      { background: linear-gradient(160deg, #e8a87c 0%, #cd853f 35%, #deb887 55%, #a0522d 80%, #cd853f 100%); }
  }
  @keyframes pp-shimmer-plata {
    0%, 100% { background: linear-gradient(160deg, #d1d5db 0%, #9ca3af 30%, #e5e7eb 50%, #9ca3af 70%, #d1d5db 100%); }
    50%      { background: linear-gradient(160deg, #e5e7eb 0%, #d1d5db 30%, #f3f4f6 50%, #d1d5db 70%, #e5e7eb 100%); }
  }
  @keyframes pp-shimmer-oro {
    0%, 100% { background: linear-gradient(160deg, #fcd34d 0%, #f59e0b 25%, #fbbf24 45%, #d97706 65%, #fbbf24 85%, #fcd34d 100%); }
    50%      { background: linear-gradient(160deg, #fde68a 0%, #fbbf24 25%, #fcd34d 45%, #f59e0b 65%, #fcd34d 85%, #fde68a 100%); }
  }

  /* Rayo de luz que cruza la cabeza metálica de cada tier */
  .pp-shine-head { position: relative; overflow: hidden; }
  .pp-shine-head::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 50%, transparent);
    animation: pp-metallic-shine 3.5s ease-in-out infinite;
    pointer-events: none;
  }

  /* Oscilación de gradiente por tier */
  .pp-shimmer-bronce { animation: pp-shimmer-bronce 3.5s ease-in-out infinite; }
  .pp-shimmer-plata  { animation: pp-shimmer-plata  3.5s ease-in-out infinite; }
  .pp-shimmer-oro    { animation: pp-shimmer-oro    2.8s ease-in-out infinite; }
`;

// =============================================================================
// COMPONENTES INTERNOS
// =============================================================================

/** Texto justificativo — íconos + explicaciones a la izquierda de los tiers (solo lg:+) */
function TextoJustificativo({
  icono,
  iconoBg,
  titulo,
  desc,
}: {
  icono: ReactNode;
  iconoBg: string;
  titulo: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconoBg, boxShadow: '0 3px 8px rgba(0,0,0,0.12)' }}
      >
        {icono}
      </div>
      <div>
        <h4 className="text-[12.5px] font-bold text-slate-800">{titulo}</h4>
        <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed" style={{ maxWidth: 160 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

// =============================================================================

const TIER_STYLES = {
  bronce: {
    borderColor: '#92400e',
    headClass: 'pp-shimmer-bronce pp-shine-head',
    bodyBg: 'linear-gradient(135deg, #fef3c7, #fde68a, #fef3c7)',
    valorColor: '#92400e',
    shadow: '0 3px 14px rgba(139,69,19,0.25)',
    textColor: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  plata: {
    borderColor: '#4b5563',
    headClass: 'pp-shimmer-plata pp-shine-head',
    bodyBg: 'linear-gradient(135deg, #f3f4f6, #e5e7eb, #f3f4f6)',
    valorColor: '#374151',
    shadow: '0 3px 14px rgba(75,85,99,0.2)',
    textColor: '#1f2937',
    textShadow: '0 1px 2px rgba(255,255,255,0.5)',
  },
  oro: {
    borderColor: '#b45309',
    headClass: 'pp-shimmer-oro pp-shine-head',
    bodyBg: 'linear-gradient(135deg, #fef9c3, #fde047, #fef9c3)',
    valorColor: '#92400e',
    shadow: '0 4px 18px rgba(234,179,8,0.35)',
    textColor: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
} as const;

/** Campo numérico individual dentro de un tier (Mín / Máx / Mult) */
function CampoTier({
  inputId,
  label,
  sufijo,
  valor,
  onCambio,
  valorColor,
  disabled,
  step = 1,
}: {
  inputId: string;
  label: string;
  sufijo: string;
  valor: number;
  onCambio: (v: number) => void;
  valorColor: string;
  disabled: boolean;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <label htmlFor={inputId} className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-0.5">
        <input
          id={inputId}
          name={inputId}
          type="number"
          min={0}
          step={step}
          value={valor}
          onChange={(e) => onCambio(Number(e.target.value))}
          disabled={disabled}
          className="w-14 text-center text-sm font-extrabold bg-white/60 border border-white/40 rounded-md outline-none focus:border-white disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
          style={{ color: valorColor }}
        />
        <span className="text-[9.5px] font-bold text-slate-500">{sufijo}</span>
      </div>
    </div>
  );
}

/** Fila horizontal de un tier: cabeza metálica animada + body con campos editables */
function TierMetalico({
  nombre,
  medal,
  tipo,
  valores,
  mostrarMax,
  onCambio,
  disabled,
}: {
  nombre: string;
  medal: string;
  tipo: keyof typeof TIER_STYLES;
  valores: NivelLocal;
  mostrarMax: boolean;
  onCambio: (campo: 'min' | 'max' | 'multiplicador', valor: number) => void;
  disabled: boolean;
}) {
  const s = TIER_STYLES[tipo];

  return (
    <div
      className="flex rounded-xl overflow-hidden"
      style={{ border: `3px solid ${s.borderColor}`, boxShadow: s.shadow }}
    >
      {/* Cabeza metálica con shimmer + rayo de luz */}
      <div
        className={`${s.headClass} flex items-center justify-center gap-1.5 px-3 shrink-0`}
        style={{
          minWidth: 100,
          color: s.textColor,
          textShadow: s.textShadow,
          fontSize: '12.5px',
          fontWeight: 800,
        }}
      >
        {medal} {nombre}
      </div>

      {/* Body: campos editables */}
      <div
        className="flex-1 flex items-center justify-around px-3 py-2.5"
        style={{ background: s.bodyBg }}
      >
        <CampoTier
          inputId={`pp-nivel-${tipo}-min`}
          label="Mín." sufijo="pts"
          valor={valores.min}
          onCambio={(v) => onCambio('min', v)}
          valorColor={s.valorColor} disabled={disabled}
        />

        {mostrarMax ? (
          <CampoTier
            inputId={`pp-nivel-${tipo}-max`}
            label="Máx." sufijo="pts"
            valor={valores.max ?? 0}
            onCambio={(v) => onCambio('max', v)}
            valorColor={s.valorColor} disabled={disabled}
          />
        ) : (
          /* Oro: máximo es infinito, no editable */
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Máx.</span>
            <span className="text-sm font-extrabold" style={{ color: s.valorColor }}>∞</span>
          </div>
        )}

        <CampoTier
          inputId={`pp-nivel-${tipo}-mult`}
          label="Mult." sufijo="x"
          valor={valores.multiplicador}
          onCambio={(v) => onCambio('multiplicador', v)}
          valorColor={s.valorColor} disabled={disabled} step={0.1}
        />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL — SistemaNiveles
// =============================================================================

export default function SistemaNiveles({
  niveles,
  nivelesActivos,
  onToggleNiveles,
  onCambioNivel,
  esGerente,
}: {
  niveles: { bronce: NivelLocal; plata: NivelLocal; oro: NivelLocal };
  nivelesActivos: boolean;
  onToggleNiveles: () => void;
  onCambioNivel: (nivel: 'bronce' | 'plata' | 'oro', campo: 'min' | 'max' | 'multiplicador', valor: number) => void;
  esGerente: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}
    >
      {/* Keyframes metálicos — scoped a este componente */}
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_NIVELES }} />

      {/* Header con switch activo/inactivo */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ background: 'linear-gradient(135deg, #f8fafd, #f0f4f8)', borderBottom: '2.5px solid #e4e9f2' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}
          >
            <Award className="w-4.5 h-4.5 text-amber-800" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Sistema de Niveles</h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              nivelesActivos
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {nivelesActivos ? '✓ Activo' : 'Inactivo'}
          </span>
          <button
            type="button"
            onClick={onToggleNiveles}
            disabled={esGerente}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-45 ${
              nivelesActivos ? 'bg-blue-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                nivelesActivos ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Contenido de niveles */}
      {nivelesActivos ? (
        <div className="p-5 flex-1">
          <div className="flex gap-5">

            {/* Texto justificativo — oculto en mobile, visible en lg:+ */}
            <div className="hidden lg:flex lg:w-[34%] flex-col justify-evenly gap-4 shrink-0">
              <TextoJustificativo
                icono={<Star className="w-4 h-4 text-indigo-700" />}
                iconoBg="linear-gradient(135deg, #c7d2fe, #a5b4fc)"
                titulo="Mayor retención"
                desc="Los clientes en niveles superiores compran hasta 3x más frecuente."
              />
              <TextoJustificativo
                icono={<Award className="w-4 h-4 text-emerald-700" />}
                iconoBg="linear-gradient(135deg, #bbf7d0, #6ee7b7)"
                titulo="Multipladores de puntos"
                desc="Cada nivel otorga más puntos por compra, incentivando el gasto."
              />
              <TextoJustificativo
                icono={<Gift className="w-4 h-4 text-amber-800" />}
                iconoBg="linear-gradient(135deg, #fde68a, #fbbf24)"
                titulo="Compromiso emocional"
                desc="Los clientes valoran su estado y se esfuerzan por subir de nivel."
              />
            </div>

            {/* Tiers metálicos: Bronce → Plata → Oro */}
            <div className="flex-1 flex flex-col gap-2.5">
              <TierMetalico
                nombre="Bronce" medal="🥉" tipo="bronce"
                valores={niveles.bronce}
                mostrarMax={true}
                onCambio={(campo, valor) => onCambioNivel('bronce', campo, valor)}
                disabled={esGerente}
              />
              <TierMetalico
                nombre="Plata" medal="🥈" tipo="plata"
                valores={niveles.plata}
                mostrarMax={true}
                onCambio={(campo, valor) => onCambioNivel('plata', campo, valor)}
                disabled={esGerente}
              />
              <TierMetalico
                nombre="Oro" medal="🥇" tipo="oro"
                valores={niveles.oro}
                mostrarMax={false}
                onCambio={(campo, valor) => onCambioNivel('oro', campo, valor)}
                disabled={esGerente}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Estado vacío: niveles desactivados */
        <div className="py-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3.5">
            <Award className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-slate-500">Sistema de niveles desactivado</p>
          <p className="text-xs text-slate-400 mt-1">
            Todos los clientes reciben puntos sin multiplicador adicional
          </p>
        </div>
      )}
    </div>
  );
}