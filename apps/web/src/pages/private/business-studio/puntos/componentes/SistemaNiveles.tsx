/**
 * SistemaNiveles.tsx
 * ===================
 * Card completa del Sistema de Niveles con cards verticales limpias.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/componentes/SistemaNiveles.tsx
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
 * DISEÑO:
 *   3 cards verticales lado a lado (Bronce | Plata | Oro)
 *   Badge con color tenue en el header de cada card
 *   Sin gradientes animados ni efectos metálicos — limpio y profesional
 *
 * RESPONSIVE (3 breakpoints):
 *   Mobile (default) → 3 cards en fila compactas
 *   Laptop (lg:)     → 3 cards en fila, sin textos justificativos
 *   Desktop (2xl:)   → 3 cards + textos justificativos visibles
 */

import { useState, useEffect } from 'react';
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
// ESTILOS DE CADA NIVEL
// =============================================================================

const NIVEL_ESTILOS = {
  bronce: {
    borderColor: '#d4a574',
    headerBg: 'linear-gradient(135deg, #f5e6d3, #e8cdb5, #d4a574)',
    headerColor: '#78350f',
  },
  plata: {
    borderColor: '#b0b8c4',
    headerBg: 'linear-gradient(135deg, #e8ecf1, #d1d8e0, #b0b8c4)',
    headerColor: '#1e293b',
  },
  oro: {
    borderColor: '#f0c040',
    headerBg: 'linear-gradient(135deg, #fef3c7, #fde68a, #fbbf24)',
    headerColor: '#78350f',
  },
} as const;

// =============================================================================
// COMPONENTES INTERNOS
// =============================================================================

/** Texto justificativo — íconos + explicaciones (solo 2xl:+) */
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
        <h4 className="text-[13.5px] font-bold text-slate-800">{titulo}</h4>
        <p className="text-[12.5px] font-medium text-slate-600 mt-0.5 leading-relaxed" style={{ maxWidth: 190 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/** Campo numérico individual dentro de una card de nivel */
function CampoNivel({
  inputId,
  label,
  sufijo,
  valor,
  onCambio,
  disabled,
  step = 1,
  prefijo = false,
  error,
}: {
  inputId: string;
  label: string;
  sufijo: string;
  valor: number;
  onCambio: (v: number) => void;
  disabled: boolean;
  step?: number;
  prefijo?: boolean;
  error?: string;
}) {
  // Permitir campo vacío temporalmente para poder borrar con backspace
  const [textoLocal, setTextoLocal] = useState<string>(String(valor));

  // Sincronizar cuando el valor externo cambia (ej: reset)
  useEffect(() => {
    setTextoLocal(String(valor));
  }, [valor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Limitar a 2 decimales en campos decimales (multiplicador)
    if (step !== 1 && raw.includes('.')) {
      const decimal = raw.split('.')[1];
      if (decimal && decimal.length > 2) return; // No permitir más de 2 decimales
    }
    setTextoLocal(raw);
    if (raw !== '' && !isNaN(Number(raw))) {
      onCambio(Number(raw));
    }
  };

  // Bloquear punto y coma en campos enteros (step=1)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (step === 1 && (e.key === '.' || e.key === ',')) {
      e.preventDefault();
    }
  };

  // Bloquear pegado inválido
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pegado = e.clipboardData.getData('text');
    if (step === 1) {
      // Campos enteros: no permitir punto ni coma
      if (pegado.includes('.') || pegado.includes(',')) {
        e.preventDefault();
      }
    } else {
      // Campos decimales: no permitir más de 2 decimales
      if (pegado.includes('.')) {
        const decimal = pegado.split('.')[1];
        if (decimal && decimal.length > 2) e.preventDefault();
      }
    }
  };

  const handleBlur = () => {
    // Al perder foco, si está vacío, restaurar a 0
    if (textoLocal === '' || isNaN(Number(textoLocal))) {
      setTextoLocal('0');
      onCambio(0);
    }
  };

  return (
    <div className="flex flex-col gap-1 lg:gap-1 2xl:gap-1.5 min-w-0 flex-1 lg:flex-none">
      <label
        htmlFor={inputId}
        className="text-[11.5px] lg:text-[11px] 2xl:text-xs font-bold text-slate-500 tracking-wide"
      >
        {label}
      </label>
      <div
        className="flex items-center h-9 lg:h-8 2xl:h-9 bg-slate-50 rounded-lg px-2.5 lg:px-2.5 2xl:px-3"
        style={{ border: error ? '2px solid #ef4444' : '2px solid #e2e8f0' }}
      >
        {prefijo && (
          <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] font-bold text-slate-400 mr-1.5">
            {sufijo}
          </span>
        )}
        <input
          id={inputId}
          name={inputId}
          type="number"
          min={0}
          step={step}
          value={textoLocal}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-[15px] lg:text-sm 2xl:text-[15px] font-extrabold text-slate-800 w-10 disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
        />
        {!prefijo && (
          <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] font-bold text-slate-400 ml-1 shrink-0">
            {sufijo}
          </span>
        )}
      </div>
      {error && (
        <span className="text-[10px] lg:text-[9.5px] 2xl:text-[10px] font-semibold text-red-500 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}

/** Campo fijo (no editable) — muestra valor o símbolo como texto gris */
function CampoFijo({
  label,
  texto,
  sufijo,
}: {
  label: string;
  texto: string;
  sufijo?: string;
}) {
  return (
    <div className="flex flex-col gap-1 lg:gap-1 2xl:gap-1.5 min-w-0 flex-1 lg:flex-none">
      <span className="text-[11.5px] lg:text-[11px] 2xl:text-xs font-bold text-slate-500 tracking-wide">
        {label}
      </span>
      <div
        className="flex items-center h-9 lg:h-8 2xl:h-9 rounded-lg px-2.5 lg:px-2.5 2xl:px-3"
        style={{ background: '#f8fafc', border: '2px solid #e2e8f0' }}
      >
        <span className="text-[15px] lg:text-sm 2xl:text-[15px] font-extrabold text-slate-400">
          {texto}
        </span>
        {sufijo && (
          <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] font-bold text-slate-400 ml-1 shrink-0">
            {sufijo}
          </span>
        )}
      </div>
    </div>
  );
}

/** Card vertical individual de un nivel (Bronce / Plata / Oro) */
function CardNivel({
  nombre,
  medal,
  tipo,
  valores,
  mostrarMax,
  onCambio,
  disabled,
  errores = {},
}: {
  nombre: string;
  medal: string;
  tipo: keyof typeof NIVEL_ESTILOS;
  valores: NivelLocal;
  mostrarMax: boolean;
  onCambio: (campo: 'min' | 'max' | 'multiplicador', valor: number) => void;
  disabled: boolean;
  errores?: { max?: string; mult?: string };
}) {
  const s = NIVEL_ESTILOS[tipo];

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden flex flex-row lg:flex-col card-nivel-${tipo}`}
      style={{ border: `2px solid ${s.borderColor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      {/* Header con gradiente — lateral fijo en mobile, arriba en desktop */}
      <div
        className="flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-1.5 w-16 lg:w-auto py-2.5 lg:py-1.5 2xl:py-2 shrink-0"
        style={{
          background: s.headerBg,
          borderRight: `2px solid ${s.borderColor}`,
          borderBottom: 'none',
        }}
      >
        <span
          className="text-2xl lg:text-xs leading-none"
        >
          {medal}
        </span>
        <span
          className="text-[13px] lg:text-[13.5px] 2xl:text-[15px] font-extrabold whitespace-nowrap"
          style={{ color: s.headerColor }}
        >
          {nombre}
        </span>
      </div>
      {/* En lg+ el header usa borderBottom en vez de borderRight */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 1024px) {
          .card-nivel-${tipo} > div:first-child {
            border-right: none !important;
            border-bottom: 2px solid ${s.borderColor} !important;
            width: auto !important;
          }
        }
      `}} />

      {/* Campos — fila en mobile, columna en desktop */}
      <div className="p-2.5 lg:p-2 2xl:p-3 flex flex-row lg:flex-col gap-2 lg:gap-1.5 2xl:gap-2 flex-1 items-center lg:items-stretch justify-evenly lg:justify-center">
        {/* Mínimo — siempre fijo, auto-calculado */}
        <CampoFijo
          label="Mínimo"
          texto={String(valores.min)}
          sufijo="pts"
        />

        {/* Máximo — editable en Bronce/Plata, ∞ fijo en Oro */}
        {mostrarMax ? (
          <CampoNivel
            inputId={`pp-nivel-${tipo}-max`}
            label="Máximo"
            sufijo="pts"
            valor={valores.max ?? 0}
            onCambio={(v) => onCambio('max', v)}
            disabled={disabled}
            error={errores.max}
          />
        ) : (
          <CampoFijo label="Máximo" texto="∞" />
        )}

        <CampoNivel
          inputId={`pp-nivel-${tipo}-mult`}
          label="Multiplicador"
          sufijo="x"
          valor={valores.multiplicador}
          onCambio={(v) => onCambio('multiplicador', v)}
          disabled={disabled}
          step={0.1}
          prefijo
          error={errores.mult}
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
  errores = {},
  esGerente,
}: {
  niveles: { bronce: NivelLocal; plata: NivelLocal; oro: NivelLocal };
  nivelesActivos: boolean;
  onToggleNiveles: () => void;
  onCambioNivel: (nivel: 'bronce' | 'plata' | 'oro', campo: 'min' | 'max' | 'multiplicador', valor: number) => void;
  errores?: Record<string, string>;
  esGerente: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}
    >
      {/* Header con switch activo/inactivo */}
      <div
        className="flex items-center justify-between px-3 lg:px-4 2xl:px-5 py-2 lg:py-2 2xl:py-2.5"
        style={{ background: 'linear-gradient(135deg, #f8fafd, #f0f4f8)', borderBottom: '2.5px solid #e4e9f2' }}
      >
        <div className="flex items-center gap-2.5 lg:gap-3">
          <div
            className="w-9 h-9 lg:w-9 lg:h-9 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}
          >
            <Award className="w-4.5 h-4.5 lg:w-4.5 lg:h-4.5 text-amber-800" />
          </div>
          <h2 className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-900">Sistema de Niveles</h2>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[12px] lg:text-[10.5px] 2xl:text-[11px] font-bold px-2.5 lg:px-2.5 py-0.5 rounded-full border ${
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
            className={`relative w-10 h-5.5 lg:w-11 lg:h-6 2xl:w-11 2xl:h-6 rounded-full transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              nivelesActivos ? 'bg-blue-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5 bg-white rounded-full shadow transition-transform ${
                nivelesActivos ? 'translate-x-4 lg:translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Contenido de niveles */}
      {nivelesActivos ? (
        <div className="p-2.5 lg:p-3 2xl:p-4 flex-1">
          <div className="flex gap-3 2xl:gap-4">

            {/* Texto justificativo — oculto hasta desktop (2xl:+) */}
            <div className="hidden 2xl:flex 2xl:w-[26%] flex-col justify-evenly gap-3 shrink-0">
              <TextoJustificativo
                icono={<Star className="w-4 h-4 text-indigo-700" />}
                iconoBg="linear-gradient(135deg, #c7d2fe, #a5b4fc)"
                titulo="Mayor retención"
                desc="Los clientes en niveles superiores compran hasta 3x más frecuente."
              />
              <TextoJustificativo
                icono={<Award className="w-4 h-4 text-emerald-700" />}
                iconoBg="linear-gradient(135deg, #bbf7d0, #6ee7b7)"
                titulo="Multiplicadores de puntos"
                desc="Cada nivel otorga más puntos por compra, incentivando el gasto."
              />
              <TextoJustificativo
                icono={<Gift className="w-4 h-4 text-amber-800" />}
                iconoBg="linear-gradient(135deg, #fde68a, #fbbf24)"
                titulo="Compromiso emocional"
                desc="Los clientes valoran su estado y se esfuerzan por subir de nivel."
              />
            </div>

            {/* 3 Cards: 1 columna mobile, 3 columnas desktop */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2.5 lg:gap-2.5 2xl:gap-3">
              <CardNivel
                nombre="Bronce" medal="🥉" tipo="bronce"
                valores={niveles.bronce}
                mostrarMax
                onCambio={(campo, valor) => onCambioNivel('bronce', campo, valor)}
                disabled={esGerente}
                errores={{ max: errores.bronceMax, mult: errores.bronceMult }}
              />
              <CardNivel
                nombre="Plata" medal="🥈" tipo="plata"
                valores={niveles.plata}
                mostrarMax
                onCambio={(campo, valor) => onCambioNivel('plata', campo, valor)}
                disabled={esGerente}
                errores={{ max: errores.plataMax, mult: errores.plataMult }}
              />
              <CardNivel
                nombre="Oro" medal="🥇" tipo="oro"
                valores={niveles.oro}
                mostrarMax={false}
                onCambio={(campo, valor) => onCambioNivel('oro', campo, valor)}
                disabled={esGerente}
                errores={{ mult: errores.oroMult }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Estado vacío: niveles desactivados */
        <div className="py-10 lg:py-10 2xl:py-12 flex flex-col items-center text-center">
          <div className="w-12 h-12 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Award className="w-6 h-6 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-300" strokeWidth={1.5} />
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